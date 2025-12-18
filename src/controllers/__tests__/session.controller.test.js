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
  const controllerPath = require.resolve('../session.controller');
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

test('getAllSessions: passes query params to prisma.findMany and returns pagination', async () => {
  const sessions = [{ session_id: 1, start_time: '10:00' }];
  const prismaMock = {
    session: {
      findMany: async () => sessions,
      count: async () => 3
    }
  };

  let findManyArgs;
  prismaMock.session.findMany = async (args) => {
    findManyArgs = args;
    return sessions;
  };
  prismaMock.session.count = async (args) => 3;

  const { getAllSessions } = loadControllerWithMockedPrisma(prismaMock);

  const req = { query: { page: '1', limit: '2', status: 'Scheduled', patient_id: '5', therapist_id: '7', date: '2025-01-02' } };
  const res = createRes();
  const next = () => {};

  await getAllSessions(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, sessions);
  assert.deepEqual(res.body.pagination, { page: 1, limit: 2, total: 3, pages: 2 });

  assert.equal(findManyArgs.skip, 0);
  assert.equal(findManyArgs.take, 2);
  assert.deepEqual(findManyArgs.where, {
    status: 'Scheduled',
    patient_id: 5,
    therapist_id: 7,
    date: new Date('2025-01-02')
  });
  assert.ok(findManyArgs.include.patient);
  assert.ok(findManyArgs.orderBy);
});

test('getSessionById: returns 404 when not found', async () => {
  const prismaMock = { session: { findUnique: async () => null } };

  let findUniqueArgs;
  prismaMock.session.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getSessionById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await getSessionById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Сеанс не знайдено' });

  assert.deepEqual(findUniqueArgs.where, { session_id: 123 });
});

test('getSessionById: returns session when found', async () => {
  const session = { session_id: 1, start_time: '09:00' };
  const prismaMock = { session: { findUnique: async () => session } };

  const { getSessionById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '1' } };
  const res = createRes();
  const next = () => {};

  await getSessionById(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: session });
});

test('createSession: returns 409 when therapist has conflicting session', async () => {
  const existing = [{ start_time: '09:30', duration_minutes: 60 }];
  const prismaMock = {
    session: {
      findMany: async () => existing
    }
  };

  prismaMock.session.findMany = async (args) => {
    return existing;
  };

  const { createSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { procedure_id: '1', patient_id: '2', therapist_id: '3', date: '2025-01-02', start_time: '10:00', duration_minutes: '30' } };
  const res = createRes();
  const next = () => {};

  await createSession(req, res, next);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Терапевт вже зайнятий на цей час');
});

test('createSession: creates session when no conflict', async () => {
  const created = { session_id: 5 };
  const prismaMock = {
    session: {
      findMany: async () => [],
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.session.create = async (args) => { createArgs = args; return created; };

  const { createSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { procedure_id: '2', patient_id: '3', therapist_id: '4', date: '2025-02-03', start_time: '11:00', duration_minutes: '45', room_number: '101' } };
  const res = createRes();
  const next = () => {};

  await createSession(req, res, next);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Сеанс успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.equal(createArgs.data.procedure_id, 2);
  assert.equal(createArgs.data.patient_id, 3);
  assert.equal(createArgs.data.therapist_id, 4);
  assert.ok(createArgs.data.date instanceof Date);
  assert.equal(createArgs.data.start_time, '11:00');
  assert.equal(createArgs.data.duration_minutes, 45);
  assert.equal(createArgs.data.room_number, '101');
});

test('updateSession: updates provided fields', async () => {
  const updated = { session_id: 6 };
  const prismaMock = { session: { update: async () => updated } };

  let updateArgs;
  prismaMock.session.update = async (args) => { updateArgs = args; return updated; };

  const { updateSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '6' }, body: { status: 'Cancelled', room_number: '' } };
  const res = createRes();
  const next = () => {};

  await updateSession(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Сеанс успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { session_id: 6 });
  assert.equal(updateArgs.data.status, 'Cancelled');
  assert.equal(updateArgs.data.room_number, null);
});

test('deleteSession: deletes by id and returns success message', async () => {
  const prismaMock = { session: { delete: async () => undefined } };

  let deleteArgs;
  prismaMock.session.delete = async (args) => { deleteArgs = args; return undefined; };

  const { deleteSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '9' } };
  const res = createRes();
  const next = () => {};

  await deleteSession(req, res, next);

  assert.deepEqual(deleteArgs, { where: { session_id: 9 } });
  assert.deepEqual(res.body, { success: true, message: 'Сеанс успішно видалено' });
});

test('completeSession: returns 404 when session not found', async () => {
  const prismaMock = { session: { findUnique: async () => null } };

  const { completeSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '10' } };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await completeSession(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Сеанс не знайдено' });
});

test('completeSession: creates invoice when missing and marks session Completed', async () => {
  const session = { session_id: 11, status: 'Scheduled', procedure: { cost: 120 }, invoice: null };
  const updated = { session_id: 11, status: 'Completed' };
  const invoice = { invoice_id: 3, amount: 120, payments: [] };

  const prismaMock = {
    session: {
      findUnique: async () => session,
      update: async () => updated
    },
    invoice: {
      create: async () => invoice
    }
  };

  let invoiceCreateArgs;
  prismaMock.invoice.create = async (args) => { invoiceCreateArgs = args; return invoice; };

  const { completeSession } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '11' } };
  const res = createRes();
  const next = () => {};

  await completeSession(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Сеанс завершено, рахунок створено');
  assert.deepEqual(res.body.data.invoice, invoice);
  assert.deepEqual(res.body.data.session, updated);

  assert.equal(invoiceCreateArgs.data.session_id, 11);
  assert.equal(invoiceCreateArgs.data.amount, 120);
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    session: {
      findMany: async () => {
        throw boom;
      },
      count: async () => {
        throw boom;
      }
    }
  };

  const { getAllSessions } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: {} };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await getAllSessions(req, res, next);
  assert.equal(nextErr, boom);
});
