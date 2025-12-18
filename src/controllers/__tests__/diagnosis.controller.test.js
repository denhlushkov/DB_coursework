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
  const controllerPath = require.resolve('../diagnosis.controller');
  const dbPath = require.resolve('../../config/database');

  // Ensure a clean import each time so the controller picks up our mocked prisma.
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

test('getAllDiagnoses: returns paginated diagnoses and passes correct Prisma query', async () => {
  const prismaMock = {
    diagnosis: {
      findMany: async () => [{ diagnosis_id: 1, title: 'A' }],
      count: async () => 17
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.diagnosis.findMany = async (args) => {
    findManyArgs = args;
    return [{ diagnosis_id: 1, title: 'A' }];
  };
  prismaMock.diagnosis.count = async (args) => {
    countArgs = args;
    return 17;
  };

  const { getAllDiagnoses } = loadControllerWithMockedPrisma(prismaMock);

  const req = {
    query: { page: '2', limit: '5', severity_level: 'High', search: 'pain' }
  };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await getAllDiagnoses(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, [{ diagnosis_id: 1, title: 'A' }]);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 17, pages: 4 });

  assert.deepEqual(findManyArgs, {
    where: {
      severity_level: 'High',
      OR: [
        { title: { contains: 'pain', mode: 'insensitive' } },
        { description: { contains: 'pain', mode: 'insensitive' } }
      ]
    },
    skip: 5,
    take: 5,
    include: { _count: { select: { patients: true } } },
    orderBy: { diagnosis_id: 'desc' }
  });
  assert.deepEqual(countArgs, {
    where: {
      severity_level: 'High',
      OR: [
        { title: { contains: 'pain', mode: 'insensitive' } },
        { description: { contains: 'pain', mode: 'insensitive' } }
      ]
    }
  });
});

test('getAllDiagnoses: forwards errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    diagnosis: {
      findMany: async () => {
        throw boom;
      },
      count: async () => 0
    }
  };

  const { getAllDiagnoses } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: {} };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await getAllDiagnoses(req, res, next);
  assert.equal(nextCalledWith, boom);
});

test('getDiagnosisById: returns 404 when diagnosis is not found', async () => {
  const prismaMock = {
    diagnosis: {
      findUnique: async () => null
    }
  };

  let findUniqueArgs;
  prismaMock.diagnosis.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getDiagnosisById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await getDiagnosisById(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Діагноз не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { diagnosis_id: 123 },
    include: {
      patients: {
        include: {
          sessions: {
            take: 5,
            orderBy: { date: 'desc' }
          }
        }
      }
    }
  });
});

test('getDiagnosisById: returns diagnosis when found', async () => {
  const diagnosis = { diagnosis_id: 7, title: 'Dx' };
  const prismaMock = {
    diagnosis: {
      findUnique: async () => diagnosis
    }
  };

  const { getDiagnosisById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '7' } };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await getDiagnosisById(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: diagnosis });
});

test('createDiagnosis: defaults description to null and severity_level to Low', async () => {
  const created = { diagnosis_id: 1, title: 'T', description: null, severity_level: 'Low' };
  const prismaMock = {
    diagnosis: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.diagnosis.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createDiagnosis } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { title: 'T', description: '', severity_level: undefined } };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await createDiagnosis(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Діагноз успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.deepEqual(createArgs, {
    data: { title: 'T', description: null, severity_level: 'Low' }
  });
});

test('updateDiagnosis: builds updateData correctly and returns updated entity', async () => {
  const updated = { diagnosis_id: 10, title: 'New', description: null, severity_level: 'High' };
  const prismaMock = {
    diagnosis: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.diagnosis.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updateDiagnosis } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    params: { id: '10' },
    body: { title: 'New', description: '', severity_level: 'High' }
  };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await updateDiagnosis(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Діагноз успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs, {
    where: { diagnosis_id: 10 },
    data: { title: 'New', description: null, severity_level: 'High' }
  });
});

test('deleteDiagnosis: deletes by id and returns success message', async () => {
  const prismaMock = {
    diagnosis: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.diagnosis.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deleteDiagnosis } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '55' } };
  const res = createRes();
  let nextCalledWith;
  const next = (err) => {
    nextCalledWith = err;
  };

  await deleteDiagnosis(req, res, next);

  assert.equal(nextCalledWith, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, message: 'Діагноз успішно видалено' });
  assert.deepEqual(deleteArgs, { where: { diagnosis_id: 55 } });
});

test('all handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('db down');
  const prismaMock = {
    diagnosis: {
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
      },
      findMany: async () => [],
      count: async () => 0
    }
  };

  const c = loadControllerWithMockedPrisma(prismaMock);

  const res = createRes();
  let nextErr;
  const next = (err) => {
    nextErr = err;
  };

  nextErr = undefined;
  await c.getDiagnosisById({ params: { id: '1' } }, res, next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createDiagnosis({ body: { title: 'T' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateDiagnosis({ params: { id: '1' }, body: { title: 'T' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteDiagnosis({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


