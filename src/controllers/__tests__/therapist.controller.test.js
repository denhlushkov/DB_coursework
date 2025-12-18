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
  const controllerPath = require.resolve('../therapist.controller');
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

test('getAllTherapists: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const therapists = [{ therapist_id: 1, name: 'Alice' }];
  const prismaMock = {
    therapist: {
      findMany: async () => therapists,
      count: async () => 17
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.therapist.findMany = async (args) => {
    findManyArgs = args;
    return therapists;
  };
  prismaMock.therapist.count = async (args) => {
    countArgs = args;
    return 17;
  };

  const { getAllTherapists } = loadControllerWithMockedPrisma(prismaMock);
  const req = { query: { page: '2', limit: '5', search: 'Ann', specialization: 'Neuro' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllTherapists(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, therapists);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 17, pages: 4 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.deepEqual(findManyArgs.where, {
    OR: [
      { name: { contains: 'Ann', mode: 'insensitive' } },
      { phone: { contains: 'Ann' } }
    ],
    specialization: { contains: 'Neuro', mode: 'insensitive' }
  });
  assert.deepEqual(findManyArgs.include, {
    schedule: true,
    sessions: {
      take: 5,
      orderBy: { date: 'desc' },
      include: { patient: true, procedure: true }
    }
  });
  assert.deepEqual(findManyArgs.orderBy, { therapist_id: 'desc' });
  assert.deepEqual(countArgs, {
    where: {
      OR: [
        { name: { contains: 'Ann', mode: 'insensitive' } },
        { phone: { contains: 'Ann' } }
      ],
      specialization: { contains: 'Neuro', mode: 'insensitive' }
    }
  });
});

test('getAllTherapists: uses empty where when no filters provided', async () => {
  const prismaMock = {
    therapist: {
      findMany: async () => [],
      count: async () => 0
    }
  };

  let findManyArgs;
  prismaMock.therapist.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };

  const { getAllTherapists } = loadControllerWithMockedPrisma(prismaMock);
  await getAllTherapists({ query: {} }, createRes(), () => {});

  assert.deepEqual(findManyArgs.where, {});
});

test('getTherapistById: returns 404 when therapist is not found', async () => {
  const prismaMock = { therapist: { findUnique: async () => null } };

  let findUniqueArgs;
  prismaMock.therapist.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getTherapistById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getTherapistById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Терапевта не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { therapist_id: 123 },
    include: {
      schedule: true,
      sessions: {
        include: {
          patient: true,
          procedure: true,
          invoice: true
        },
        orderBy: { date: 'desc' }
      }
    }
  });
});

test('getTherapistById: returns therapist when found', async () => {
  const therapist = { therapist_id: 1, name: 'Bob' };
  const prismaMock = { therapist: { findUnique: async () => therapist } };

  const { getTherapistById } = loadControllerWithMockedPrisma(prismaMock);
  const res = createRes();
  await getTherapistById({ params: { id: '1' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: therapist });
});

test('createTherapist: defaults optional fields to null and parses schedule_id', async () => {
  const created = { therapist_id: 10 };
  const prismaMock = { therapist: { create: async () => created } };

  let createArgs;
  prismaMock.therapist.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createTherapist } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { name: 'T', phone: '', specialization: undefined, photo: undefined, schedule_id: '5' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createTherapist(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Терапевта успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.deepEqual(createArgs, {
    data: {
      name: 'T',
      phone: null,
      specialization: null,
      photo: null,
      schedule_id: 5
    },
    include: { schedule: true }
  });
});

test('updateTherapist: builds updateData correctly (nulling optionals)', async () => {
  const updated = { therapist_id: 2, name: 'New' };
  const prismaMock = { therapist: { update: async () => updated } };

  let updateArgs;
  prismaMock.therapist.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updateTherapist } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    params: { id: '2' },
    body: { name: 'New', phone: '', specialization: '', photo: '', schedule_id: '' }
  };
  const res = createRes();

  await updateTherapist(req, res, () => {});

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Терапевта успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { therapist_id: 2 });
  assert.deepEqual(updateArgs.data, {
    name: 'New',
    phone: null,
    specialization: null,
    photo: null,
    schedule_id: null
  });
  assert.deepEqual(updateArgs.include, { schedule: true });
});

test('deleteTherapist: deletes by id and returns success message', async () => {
  const prismaMock = { therapist: { delete: async () => undefined } };

  let deleteArgs;
  prismaMock.therapist.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deleteTherapist } = loadControllerWithMockedPrisma(prismaMock);
  const res = createRes();
  await deleteTherapist({ params: { id: '9' } }, res, () => {});

  assert.deepEqual(deleteArgs, { where: { therapist_id: 9 } });
  assert.deepEqual(res.body, { success: true, message: 'Терапевта успішно видалено' });
});

test('getTherapistSchedule: queries sessions by therapist_id and date range, with correct include/orderBy', async () => {
  const sessions = [{ session_id: 1 }];
  const prismaMock = { session: { findMany: async () => sessions } };

  let findManyArgs;
  prismaMock.session.findMany = async (args) => {
    findManyArgs = args;
    return sessions;
  };

  const { getTherapistSchedule } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '7' }, query: { startDate: '2025-12-01', endDate: '2025-12-31' } };
  const res = createRes();

  await getTherapistSchedule(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, sessions);

  assert.deepEqual(findManyArgs.where, {
    therapist_id: 7,
    date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-31') }
  });
  assert.deepEqual(findManyArgs.include, { patient: true, procedure: true, invoice: true });
  assert.deepEqual(findManyArgs.orderBy, [{ date: 'asc' }, { start_time: 'asc' }]);
});

test('getTherapistSchedule: omits date filter when startDate/endDate not provided', async () => {
  const prismaMock = { session: { findMany: async () => [] } };

  let findManyArgs;
  prismaMock.session.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };

  const { getTherapistSchedule } = loadControllerWithMockedPrisma(prismaMock);
  await getTherapistSchedule({ params: { id: '7' }, query: {} }, createRes(), () => {});

  assert.deepEqual(findManyArgs.where, { therapist_id: 7 });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    therapist: {
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
      findMany: async () => {
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
  await c.getAllTherapists({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getTherapistById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createTherapist({ body: { name: 't' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateTherapist({ params: { id: '1' }, body: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteTherapist({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getTherapistSchedule({ params: { id: '1' }, query: {} }, createRes(), next);
  assert.equal(nextErr, boom);
});


