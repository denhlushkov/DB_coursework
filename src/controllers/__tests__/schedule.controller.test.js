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
  const controllerPath = require.resolve('../schedule.controller');
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

test('getAllSchedules: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const schedules = [{ schedule_id: 1, date: new Date() }];
  const prismaMock = {
    schedule: {
      findMany: async () => schedules,
      count: async () => 12
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.schedule.findMany = async (args) => {
    findManyArgs = args;
    return schedules;
  };
  prismaMock.schedule.count = async (args) => {
    countArgs = args;
    return 12;
  };

  const { getAllSchedules } = loadControllerWithMockedPrisma(prismaMock);

  const req = { query: { page: '2', limit: '5', date: '2025-12-18', is_available: 'true' } };
  const res = createRes();
  const next = () => {};

  await getAllSchedules(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, schedules);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 12, pages: 3 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.ok(findManyArgs.where.date instanceof Date);
  assert.equal(findManyArgs.where.date.toISOString().slice(0, 10), '2025-12-18');
  assert.equal(findManyArgs.where.is_available, true);
  assert.deepEqual(findManyArgs.include, { therapists: true });
  assert.deepEqual(findManyArgs.orderBy, [ { date: 'asc' }, { start_time: 'asc' } ]);
  assert.deepEqual(countArgs, { where: findManyArgs.where });
});

test('getScheduleById: returns 404 when not found', async () => {
  const prismaMock = { schedule: { findUnique: async () => null } };

  let findUniqueArgs;
  prismaMock.schedule.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getScheduleById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await getScheduleById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Слот розкладу не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { schedule_id: 123 },
    include: { therapists: true }
  });
});

test('getScheduleById: returns schedule when found', async () => {
  const schedule = { schedule_id: 1, date: new Date() };
  const prismaMock = { schedule: { findUnique: async () => schedule } };

  const { getScheduleById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '1' } };
  const res = createRes();
  const next = () => {};

  await getScheduleById(req, res, next);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: schedule });
});

test('createSchedule: parses date and sets default is_available true', async () => {
  const created = { schedule_id: 10 };
  const prismaMock = { schedule: { create: async () => created } };

  let createArgs;
  prismaMock.schedule.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createSchedule } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { date: '2025-12-20', start_time: '09:00', end_time: '10:00' } };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await createSchedule(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Слот розкладу успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.ok(createArgs.data.date instanceof Date);
  assert.equal(createArgs.data.date.toISOString().slice(0, 10), '2025-12-20');
  assert.equal(createArgs.data.start_time, '09:00');
  assert.equal(createArgs.data.end_time, '10:00');
  assert.equal(createArgs.data.is_available, true);
  assert.deepEqual(createArgs.include, { therapists: true });
});

test('updateSchedule: builds updateData only from provided fields', async () => {
  const updated = { schedule_id: 2, start_time: '10:00' };
  const prismaMock = { schedule: { update: async () => updated } };

  let updateArgs;
  prismaMock.schedule.update = async (args) => { updateArgs = args; return updated; };

  const { updateSchedule } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '2' }, body: { start_time: '10:00', is_available: false } };
  const res = createRes();
  const next = () => {};

  await updateSchedule(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Слот розкладу успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { schedule_id: 2 });
  assert.deepEqual(updateArgs.data, { start_time: '10:00', is_available: false });
  assert.deepEqual(updateArgs.include, { therapists: true });
});

test('deleteSchedule: deletes by id and returns success message', async () => {
  const prismaMock = { schedule: { delete: async () => undefined } };

  let deleteArgs;
  prismaMock.schedule.delete = async (args) => { deleteArgs = args; return undefined; };

  const { deleteSchedule } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '9' } };
  const res = createRes();
  const next = () => {};

  await deleteSchedule(req, res, next);

  assert.deepEqual(deleteArgs, { where: { schedule_id: 9 } });
  assert.deepEqual(res.body, { success: true, message: 'Слот розкладу успішно видалено' });
});

test('getAvailableSlots: returns 400 when date is missing', async () => {
  const prismaMock = { schedule: { findMany: async () => [] } };
  const { getAvailableSlots } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: {} };
  const res = createRes();
  let nextErr;
  const next = (e) => { nextErr = e; };

  await getAvailableSlots(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, message: "Параметр date обов'язковий" });
});

test('getAvailableSlots: queries by date and is_available true', async () => {
  const schedules = [{ schedule_id: 3 }];
  let findManyArgs;
  const prismaMock = { schedule: { findMany: async (args) => { findManyArgs = args; return schedules; } } };

  const { getAvailableSlots } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: { date: '2025-12-21' } };
  const res = createRes();
  const next = () => {};

  await getAvailableSlots(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, schedules);

  assert.ok(findManyArgs.where.date instanceof Date);
  assert.equal(findManyArgs.where.date.toISOString().slice(0, 10), '2025-12-21');
  assert.equal(findManyArgs.where.is_available, true);
  assert.deepEqual(findManyArgs.include, { therapists: true });
  assert.deepEqual(findManyArgs.orderBy, { start_time: 'asc' });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    schedule: {
      findMany: async () => { throw boom; },
      count: async () => { throw boom; },
      findUnique: async () => { throw boom; },
      create: async () => { throw boom; },
      update: async () => { throw boom; },
      delete: async () => { throw boom; }
    }
  };

  const c = loadControllerWithMockedPrisma(prismaMock);

  let nextErr;
  const next = (e) => { nextErr = e; };

  nextErr = undefined;
  await c.getAllSchedules({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getScheduleById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createSchedule({ body: { date: '2025-01-01', start_time: 'a', end_time: 'b' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateSchedule({ params: { id: '1' }, body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteSchedule({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getAvailableSlots({ query: { date: '2025-01-01' } }, createRes(), next);
  assert.equal(nextErr, boom);
});
