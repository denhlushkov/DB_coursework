const test = require('node:test');
const assert = require('node:assert/strict');

function createRes() {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload) => {
    res.body = payload;
    return res;
  };

  return res;
}

function loadControllerWithMockedPrisma(prismaMock) {
  const controllerPath = require.resolve('../medicalRecord.controller');
  const dbPath = require.resolve('../../config/database');

  delete require.cache[controllerPath];
  delete require.cache[dbPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: prismaMock
  };

  return require(controllerPath);
}

test('getAllMedicalRecords: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const records = [{ medical_rec_id: 1, date: new Date('2025-12-10T00:00:00.000Z') }];
  const prismaMock = {
    medicalRecord: {
      findMany: async () => records,
      count: async () => 21
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.medicalRecord.findMany = async (args) => {
    findManyArgs = args;
    return records;
  };
  prismaMock.medicalRecord.count = async (args) => {
    countArgs = args;
    return 21;
  };

  const { getAllMedicalRecords } = loadControllerWithMockedPrisma(prismaMock);

  const req = {
    query: {
      page: '2',
      limit: '5',
      startDate: '2025-12-01',
      endDate: '2025-12-31'
    }
  };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllMedicalRecords(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, records);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 21, pages: 5 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.deepEqual(findManyArgs.where, {
    date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-31') }
  });
  assert.deepEqual(findManyArgs.include, {
    patient: { include: { diagnosis: true } }
  });
  assert.deepEqual(findManyArgs.orderBy, { date: 'desc' });
  assert.deepEqual(countArgs, {
    where: { date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-31') } }
  });
});

test('getMedicalRecordById: returns 404 when record is not found', async () => {
  const prismaMock = {
    medicalRecord: {
      findUnique: async () => null
    }
  };

  let findUniqueArgs;
  prismaMock.medicalRecord.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getMedicalRecordById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getMedicalRecordById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Медичний запис не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { medical_rec_id: 123 },
    include: {
      patient: {
        include: {
          diagnosis: true,
          sessions: {
            take: 10,
            orderBy: { date: 'desc' },
            include: { procedure: true, therapist: true }
          }
        }
      }
    }
  });
});

test('getMedicalRecordById: returns record when found', async () => {
  const record = { medical_rec_id: 1, notes: 'ok' };
  const prismaMock = {
    medicalRecord: {
      findUnique: async () => record
    }
  };

  const { getMedicalRecordById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '1' } };
  const res = createRes();
  const next = () => {};

  await getMedicalRecordById(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: record });
});

test('createMedicalRecord: uses provided date, notes/photo default to null', async () => {
  const created = { medical_rec_id: 1 };
  const prismaMock = {
    medicalRecord: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.medicalRecord.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createMedicalRecord } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { date: '2025-12-15', notes: '', photo: undefined } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createMedicalRecord(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Медичний запис успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.ok(createArgs.data.date instanceof Date);
  assert.equal(createArgs.data.date.toISOString().slice(0, 10), '2025-12-15');
  assert.equal(createArgs.data.notes, null);
  assert.equal(createArgs.data.photo, null);
  assert.deepEqual(createArgs.include, { patient: true });
});

test('createMedicalRecord: defaults date to now when date is not provided', async () => {
  const created = { medical_rec_id: 2 };
  const prismaMock = {
    medicalRecord: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.medicalRecord.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createMedicalRecord } = loadControllerWithMockedPrisma(prismaMock);
  const before = Date.now();
  const req = { body: { notes: 'n', photo: 'p' } };
  const res = createRes();
  const next = () => {};

  await createMedicalRecord(req, res, next);
  const after = Date.now();

  assert.ok(createArgs.data.date instanceof Date);
  const ts = createArgs.data.date.getTime();
  assert.ok(ts >= before && ts <= after);
});

test('updateMedicalRecord: builds updateData correctly (date, notes/photo nulling)', async () => {
  const updated = { medical_rec_id: 5 };
  const prismaMock = {
    medicalRecord: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.medicalRecord.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updateMedicalRecord } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '5' }, body: { date: '2025-12-16', notes: '', photo: '' } };
  const res = createRes();
  const next = () => {};

  await updateMedicalRecord(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Медичний запис успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { medical_rec_id: 5 });
  assert.ok(updateArgs.data.date instanceof Date);
  assert.equal(updateArgs.data.date.toISOString().slice(0, 10), '2025-12-16');
  assert.equal(updateArgs.data.notes, null);
  assert.equal(updateArgs.data.photo, null);
  assert.deepEqual(updateArgs.include, { patient: true });
});

test('deleteMedicalRecord: deletes by id and returns success message', async () => {
  const prismaMock = {
    medicalRecord: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.medicalRecord.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deleteMedicalRecord } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '9' } };
  const res = createRes();
  const next = () => {};

  await deleteMedicalRecord(req, res, next);

  assert.deepEqual(deleteArgs, { where: { medical_rec_id: 9 } });
  assert.deepEqual(res.body, { success: true, message: 'Медичний запис успішно видалено' });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    medicalRecord: {
      findMany: async () => {
        throw boom;
      },
      count: async () => 0,
      findUnique: async () => {
        throw boom;
      },
      create: async () => {
        throw boom;
      },
      update: async () => {
        throw boom;
      },
      delete: async () => {
        throw boom;
      }
    }
  };

  const c = loadControllerWithMockedPrisma(prismaMock);

  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  nextErr = undefined;
  await c.getAllMedicalRecords({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getMedicalRecordById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createMedicalRecord({ body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateMedicalRecord({ params: { id: '1' }, body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteMedicalRecord({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


