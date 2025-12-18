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
  const controllerPath = require.resolve('../procedure.controller');
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

test('getAllProcedures: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const procedures = [{ procedure_id: 1, title: 'Massage' }];
  const prismaMock = {
    procedure: {
      findMany: async () => procedures,
      count: async () => 21
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.procedure.findMany = async (args) => {
    findManyArgs = args;
    return procedures;
  };
  prismaMock.procedure.count = async (args) => {
    countArgs = args;
    return 21;
  };

  const { getAllProcedures } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    query: {
      page: '2',
      limit: '5',
      search: 'mass',
      minCost: '10.5',
      maxCost: '50'
    }
  };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllProcedures(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, procedures);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 21, pages: 5 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.deepEqual(findManyArgs.where, {
    title: { contains: 'mass', mode: 'insensitive' },
    cost: { gte: 10.5, lte: 50 }
  });
  assert.deepEqual(findManyArgs.include, {
    _count: { select: { sessions: true } }
  });
  assert.deepEqual(findManyArgs.orderBy, { procedure_id: 'desc' });
  assert.deepEqual(countArgs, {
    where: {
      title: { contains: 'mass', mode: 'insensitive' },
      cost: { gte: 10.5, lte: 50 }
    }
  });
});

test('getAllProcedures: only sets cost.gte or cost.lte when one bound is provided', async () => {
  const prismaMock = {
    procedure: {
      findMany: async () => [],
      count: async () => 0
    }
  };

  let findManyArgs;
  prismaMock.procedure.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };

  const { getAllProcedures } = loadControllerWithMockedPrisma(prismaMock);
  await getAllProcedures({ query: { minCost: '5' } }, createRes(), () => {});
  assert.deepEqual(findManyArgs.where, { cost: { gte: 5 } });

  await getAllProcedures({ query: { maxCost: '7.5' } }, createRes(), () => {});
  assert.deepEqual(findManyArgs.where, { cost: { lte: 7.5 } });
});

test('getProcedureById: returns 404 when procedure is not found', async () => {
  const prismaMock = {
    procedure: {
      findUnique: async () => null
    }
  };

  let findUniqueArgs;
  prismaMock.procedure.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getProcedureById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getProcedureById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Процедуру не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { procedure_id: 123 },
    include: {
      sessions: {
        take: 10,
        orderBy: { date: 'desc' },
        include: { patient: true, therapist: true }
      }
    }
  });
});

test('getProcedureById: returns procedure when found', async () => {
  const procedure = { procedure_id: 1, title: 'P' };
  const prismaMock = {
    procedure: {
      findUnique: async () => procedure
    }
  };

  const { getProcedureById } = loadControllerWithMockedPrisma(prismaMock);
  const res = createRes();
  await getProcedureById({ params: { id: '1' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: procedure });
});

test('createProcedure: parses cost/duration_minutes and returns 201 with message', async () => {
  const created = { procedure_id: 9 };
  const prismaMock = {
    procedure: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.procedure.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createProcedure } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { title: 'T', cost: '10.25', duration_minutes: '45' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createProcedure(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Процедуру успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.deepEqual(createArgs, {
    data: { title: 'T', cost: 10.25, duration_minutes: 45 }
  });
});

test('updateProcedure: builds updateData from provided fields and returns success message', async () => {
  const updated = { procedure_id: 3 };
  const prismaMock = {
    procedure: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.procedure.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updateProcedure } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '3' }, body: { title: 'New', cost: '5', duration_minutes: '30' } };
  const res = createRes();

  await updateProcedure(req, res, () => {});

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Процедуру успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs, {
    where: { procedure_id: 3 },
    data: { title: 'New', cost: 5, duration_minutes: 30 }
  });
});

test('deleteProcedure: deletes by id and returns success message', async () => {
  const prismaMock = {
    procedure: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.procedure.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deleteProcedure } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '12' } };
  const res = createRes();

  await deleteProcedure(req, res, () => {});

  assert.deepEqual(deleteArgs, { where: { procedure_id: 12 } });
  assert.deepEqual(res.body, { success: true, message: 'Процедуру успішно видалено' });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    procedure: {
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
  await c.getAllProcedures({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getProcedureById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createProcedure({ body: { title: 't', cost: '1', duration_minutes: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateProcedure({ params: { id: '1' }, body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteProcedure({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


