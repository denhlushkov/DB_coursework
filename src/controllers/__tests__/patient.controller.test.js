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
  const controllerPath = require.resolve('../patient.controller');
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

test('getAllPatients: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const patients = [{ patient_id: 1, name: 'Alice' }];
  const prismaMock = {
    patient: {
      findMany: async () => patients,
      count: async () => 17
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.patient.findMany = async (args) => {
    findManyArgs = args;
    return patients;
  };
  prismaMock.patient.count = async (args) => {
    countArgs = args;
    return 17;
  };

  const { getAllPatients } = loadControllerWithMockedPrisma(prismaMock);

  const req = { query: { page: '2', limit: '5', search: 'Ann' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllPatients(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, patients);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 17, pages: 4 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.deepEqual(findManyArgs.where, {
    OR: [
      { name: { contains: 'Ann', mode: 'insensitive' } },
      { phone: { contains: 'Ann' } }
    ]
  });
  assert.deepEqual(findManyArgs.include, {
    diagnosis: true,
    medical_record: true,
    sessions: {
      take: 5,
      orderBy: { date: 'desc' },
      include: { procedure: true, therapist: true }
    }
  });
  assert.deepEqual(findManyArgs.orderBy, { patient_id: 'desc' });
  assert.deepEqual(countArgs, {
    where: {
      OR: [
        { name: { contains: 'Ann', mode: 'insensitive' } },
        { phone: { contains: 'Ann' } }
      ]
    }
  });
});

test('getAllPatients: uses empty where when search is not provided', async () => {
  const prismaMock = {
    patient: {
      findMany: async () => [],
      count: async () => 0
    }
  };

  let findManyArgs;
  prismaMock.patient.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };

  const { getAllPatients } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: {} };
  const res = createRes();
  const next = () => {};

  await getAllPatients(req, res, next);
  assert.deepEqual(findManyArgs.where, {});
});

test('getPatientById: returns 404 when patient is not found', async () => {
  const prismaMock = {
    patient: {
      findUnique: async () => null
    }
  };

  let findUniqueArgs;
  prismaMock.patient.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getPatientById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getPatientById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Пацієнта не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { patient_id: 123 },
    include: {
      diagnosis: true,
      medical_record: true,
      sessions: {
        include: {
          procedure: true,
          therapist: true,
          invoice: { include: { payments: true } }
        },
        orderBy: { date: 'desc' }
      }
    }
  });
});

test('getPatientById: returns patient when found', async () => {
  const patient = { patient_id: 1, name: 'Bob' };
  const prismaMock = {
    patient: {
      findUnique: async () => patient
    }
  };

  const { getPatientById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '1' } };
  const res = createRes();
  const next = () => {};

  await getPatientById(req, res, next);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: patient });
});

test('createPatient: parses birth_date/diagnosis_id and creates nested medical_record with null defaults', async () => {
  const created = { patient_id: 10 };
  const prismaMock = {
    patient: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.patient.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createPatient } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    body: {
      name: 'Ann',
      birth_date: '2000-01-02',
      phone: '123',
      diagnosis_id: '5',
      notes: '',
      photo: undefined
    }
  };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createPatient(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Пацієнта успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.equal(createArgs.data.name, 'Ann');
  assert.ok(createArgs.data.birth_date instanceof Date);
  assert.equal(createArgs.data.birth_date.toISOString().slice(0, 10), '2000-01-02');
  assert.equal(createArgs.data.phone, '123');
  assert.equal(createArgs.data.diagnosis_id, 5);
  assert.deepEqual(createArgs.data.medical_record, {
    create: { notes: null, photo: null }
  });
  assert.deepEqual(createArgs.include, { diagnosis: true, medical_record: true });
});

test('createPatient: sets diagnosis_id to null when missing/empty', async () => {
  const created = { patient_id: 11 };
  const prismaMock = {
    patient: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.patient.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createPatient } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    body: {
      name: 'NoDx',
      birth_date: '2001-01-01',
      phone: '999',
      diagnosis_id: '',
      notes: 'n',
      photo: 'p'
    }
  };
  const res = createRes();
  const next = () => {};

  await createPatient(req, res, next);
  assert.equal(createArgs.data.diagnosis_id, null);
});

test('updatePatient: builds updateData only from provided fields', async () => {
  const updated = { patient_id: 2, name: 'New' };
  const prismaMock = {
    patient: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.patient.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updatePatient } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    params: { id: '2' },
    body: { name: 'New', diagnosis_id: '' }
  };
  const res = createRes();
  const next = () => {};

  await updatePatient(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Пацієнта успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { patient_id: 2 });
  assert.deepEqual(updateArgs.data, { name: 'New', diagnosis_id: null });
  assert.deepEqual(updateArgs.include, { diagnosis: true, medical_record: true });
});

test('deletePatient: deletes by id and returns success message', async () => {
  const prismaMock = {
    patient: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.patient.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deletePatient } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '9' } };
  const res = createRes();
  const next = () => {};

  await deletePatient(req, res, next);

  assert.deepEqual(deleteArgs, { where: { patient_id: 9 } });
  assert.deepEqual(res.body, { success: true, message: 'Пацієнта успішно видалено' });
});

test('getPatientStats: returns 404 when patient is not found', async () => {
  const prismaMock = {
    patient: { findUnique: async () => null },
    session: { count: async () => 0 },
    payment: { aggregate: async () => ({ _sum: { amount: 0 } }) }
  };

  const { getPatientStats } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '7' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getPatientStats(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Пацієнта не знайдено' });
});

test('getPatientStats: returns patient, totalSessions, and totalSpent (defaults to 0)', async () => {
  const patient = { patient_id: 7, name: 'Stat', diagnosis: { diagnosis_id: 1 } };
  const prismaMock = {
    patient: { findUnique: async () => patient },
    session: { count: async () => 12 },
    payment: { aggregate: async () => ({ _sum: { amount: null } }) }
  };

  let findUniqueArgs;
  let sessionCountArgs;
  let paymentAggArgs;
  prismaMock.patient.findUnique = async (args) => {
    findUniqueArgs = args;
    return patient;
  };
  prismaMock.session.count = async (args) => {
    sessionCountArgs = args;
    return 12;
  };
  prismaMock.payment.aggregate = async (args) => {
    paymentAggArgs = args;
    return { _sum: { amount: null } };
  };

  const { getPatientStats } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '7' } };
  const res = createRes();
  const next = () => {};

  await getPatientStats(req, res, next);

  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, {
    patient,
    totalSessions: 12,
    totalSpent: 0
  });

  assert.deepEqual(findUniqueArgs, {
    where: { patient_id: 7 },
    include: { diagnosis: true }
  });
  assert.deepEqual(sessionCountArgs, { where: { patient_id: 7 } });
  assert.deepEqual(paymentAggArgs, {
    where: { invoice: { session: { patient_id: 7 } } },
    _sum: { amount: true }
  });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    patient: {
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
    },
    session: {
      count: async () => {
        throw boom;
      }
    },
    payment: {
      aggregate: async () => {
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
  await c.getAllPatients({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getPatientById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createPatient(
    { body: { name: 'n', birth_date: '2000-01-01', phone: 'p' } },
    createRes(),
    next
  );
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updatePatient({ params: { id: '1' }, body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deletePatient({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getPatientStats({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


