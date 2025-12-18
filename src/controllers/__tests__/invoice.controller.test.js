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
  const controllerPath = require.resolve('../invoice.controller');
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

test('getAllInvoices: passes correct where/skip/take/include/orderBy and returns pagination', async () => {
  const invoices = [
    { invoice_id: 1, amount: '100', payments: [{ amount: '40' }] }
  ];

  const prismaMock = {
    invoice: {
      findMany: async () => invoices,
      count: async () => 123
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.invoice.findMany = async (args) => {
    findManyArgs = args;
    return invoices;
  };
  prismaMock.invoice.count = async (args) => {
    countArgs = args;
    return 123;
  };

  const { getAllInvoices } = loadControllerWithMockedPrisma(prismaMock);

  const req = {
    query: {
      page: '3',
      limit: '10',
      patient_id: '77',
      startDate: '2025-12-01',
      endDate: '2025-12-31'
    }
  };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllInvoices(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, invoices);
  assert.deepEqual(res.body.pagination, { page: 3, limit: 10, total: 123, pages: 13 });

  assert.equal(findManyArgs.skip, 20);
  assert.equal(findManyArgs.take, 10);
  assert.deepEqual(findManyArgs.where, {
    session: { patient_id: 77 },
    issue_date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-31') }
  });
  assert.deepEqual(countArgs, {
    where: {
      session: { patient_id: 77 },
      issue_date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-31') }
    }
  });
});

test('getAllInvoices: filters paid=true correctly and sets pagination.total to filtered length', async () => {
  const invoices = [
    // paid: 100 >= 100
    { invoice_id: 1, amount: '100', payments: [{ amount: '60' }, { amount: '40' }] },
    // unpaid: 20 < 100
    { invoice_id: 2, amount: '100', payments: [{ amount: '20' }] }
  ];

  const prismaMock = {
    invoice: {
      findMany: async () => invoices,
      count: async () => 2
    }
  };

  const { getAllInvoices } = loadControllerWithMockedPrisma(prismaMock);

  const req = { query: { paid: 'true' } };
  const res = createRes();
  const next = () => {};

  await getAllInvoices(req, res, next);

  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, [invoices[0]]);
  assert.equal(res.body.pagination.total, 1);
});

test('getAllInvoices: filters paid=false correctly', async () => {
  const invoices = [
    { invoice_id: 1, amount: '100', payments: [{ amount: '100' }] },
    { invoice_id: 2, amount: '100', payments: [{ amount: '20' }] }
  ];

  const prismaMock = {
    invoice: {
      findMany: async () => invoices,
      count: async () => 2
    }
  };

  const { getAllInvoices } = loadControllerWithMockedPrisma(prismaMock);

  const req = { query: { paid: 'false' } };
  const res = createRes();
  const next = () => {};

  await getAllInvoices(req, res, next);
  assert.deepEqual(res.body.data, [invoices[1]]);
});

test('getInvoiceById: returns 404 when not found', async () => {
  const prismaMock = {
    invoice: {
      findUnique: async () => null
    }
  };

  const { getInvoiceById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '9' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getInvoiceById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Рахунок не знайдено' });
});

test('getInvoiceById: computes totalPaid, remaining, isPaid', async () => {
  const invoice = {
    invoice_id: 1,
    amount: '100',
    payments: [{ amount: '25.5' }, { amount: '74.5' }]
  };

  const prismaMock = {
    invoice: {
      findUnique: async () => invoice
    }
  };

  const { getInvoiceById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '1' } };
  const res = createRes();
  const next = () => {};

  await getInvoiceById(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.data.totalPaid, 100);
  assert.equal(res.body.data.remaining, 0);
  assert.equal(res.body.data.isPaid, true);
});

test('createInvoice: returns 409 if invoice for session already exists', async () => {
  const prismaMock = {
    invoice: {
      findUnique: async () => ({ invoice_id: 1 }),
      create: async () => {
        throw new Error('should not be called');
      }
    }
  };

  const { createInvoice } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { session_id: '5', amount: '100' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createInvoice(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { success: false, message: 'Рахунок для цього сеансу вже існує' });
});

test('createInvoice: creates invoice and parses numeric fields', async () => {
  const created = { invoice_id: 2 };
  const prismaMock = {
    invoice: {
      findUnique: async () => null,
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.invoice.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createInvoice } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { session_id: '5', amount: '100.25' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createInvoice(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Рахунок успішно створено');
  assert.deepEqual(res.body.data, created);
  assert.deepEqual(createArgs.data, { session_id: 5, amount: 100.25 });
});

test('updateInvoice: updates amount and returns updated invoice', async () => {
  const updated = { invoice_id: 3, amount: '200' };
  const prismaMock = {
    invoice: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.invoice.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updateInvoice } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '3' }, body: { amount: '200.5' } };
  const res = createRes();
  const next = () => {};

  await updateInvoice(req, res, next);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Рахунок успішно оновлено');
  assert.deepEqual(updateArgs, {
    where: { invoice_id: 3 },
    data: { amount: 200.5 },
    include: { session: true, payments: true }
  });
});

test('deleteInvoice: deletes by id and returns success message', async () => {
  const prismaMock = {
    invoice: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.invoice.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deleteInvoice } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '12' } };
  const res = createRes();
  const next = () => {};

  await deleteInvoice(req, res, next);

  assert.deepEqual(deleteArgs, { where: { invoice_id: 12 } });
  assert.deepEqual(res.body, { success: true, message: 'Рахунок успішно видалено' });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    invoice: {
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
  await c.getAllInvoices({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getInvoiceById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createInvoice({ body: { session_id: '1', amount: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updateInvoice({ params: { id: '1' }, body: { amount: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deleteInvoice({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


