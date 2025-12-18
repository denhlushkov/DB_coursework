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
  const controllerPath = require.resolve('../payment.controller');
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

test('getAllPayments: passes where/skip/take/include/orderBy and returns pagination', async () => {
  const payments = [{ payment_id: 1, amount: '10' }];
  const prismaMock = {
    payment: {
      findMany: async () => payments,
      count: async () => 21
    }
  };

  let findManyArgs;
  let countArgs;
  prismaMock.payment.findMany = async (args) => {
    findManyArgs = args;
    return payments;
  };
  prismaMock.payment.count = async (args) => {
    countArgs = args;
    return 21;
  };

  const { getAllPayments } = loadControllerWithMockedPrisma(prismaMock);
  const req = {
    query: {
      page: '2',
      limit: '5',
      invoice_id: '7',
      method: 'Cash',
      startDate: '2025-12-01',
      endDate: '2025-12-31'
    }
  };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getAllPayments(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, payments);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 21, pages: 5 });

  assert.equal(findManyArgs.skip, 5);
  assert.equal(findManyArgs.take, 5);
  assert.deepEqual(findManyArgs.where, {
    invoice_id: 7,
    method: 'Cash',
    payment_date: {
      gte: new Date('2025-12-01'),
      lte: new Date('2025-12-31')
    }
  });
  assert.deepEqual(findManyArgs.include, {
    invoice: {
      include: {
        session: {
          include: {
            patient: true,
            procedure: true
          }
        }
      }
    }
  });
  assert.deepEqual(findManyArgs.orderBy, { payment_date: 'desc' });
  assert.deepEqual(countArgs, {
    where: {
      invoice_id: 7,
      method: 'Cash',
      payment_date: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31')
      }
    }
  });
});

test('getAllPayments: builds empty where when no filters are provided', async () => {
  const prismaMock = {
    payment: {
      findMany: async () => [],
      count: async () => 0
    }
  };

  let findManyArgs;
  prismaMock.payment.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };

  const { getAllPayments } = loadControllerWithMockedPrisma(prismaMock);
  await getAllPayments({ query: {} }, createRes(), () => {});

  assert.deepEqual(findManyArgs.where, {});
});

test('getPaymentById: returns 404 when payment is not found', async () => {
  const prismaMock = {
    payment: {
      findUnique: async () => null
    }
  };

  let findUniqueArgs;
  prismaMock.payment.findUnique = async (args) => {
    findUniqueArgs = args;
    return null;
  };

  const { getPaymentById } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '123' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await getPaymentById(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Платіж не знайдено' });

  assert.deepEqual(findUniqueArgs, {
    where: { payment_id: 123 },
    include: {
      invoice: {
        include: {
          session: {
            include: {
              patient: true,
              therapist: true,
              procedure: true
            }
          },
          payments: true
        }
      }
    }
  });
});

test('getPaymentById: returns payment when found', async () => {
  const payment = { payment_id: 1, amount: '10' };
  const prismaMock = {
    payment: {
      findUnique: async () => payment
    }
  };

  const { getPaymentById } = loadControllerWithMockedPrisma(prismaMock);
  const res = createRes();
  await getPaymentById({ params: { id: '1' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: payment });
});

test('createPayment: returns 404 when invoice is not found', async () => {
  const prismaMock = {
    invoice: { findUnique: async () => null },
    payment: {
      create: async () => {
        throw new Error('should not be called');
      }
    }
  };

  const { createPayment } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { invoice_id: '5', amount: '10' } };
  const res = createRes();
  let nextErr;
  const next = (e) => {
    nextErr = e;
  };

  await createPayment(req, res, next);

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Рахунок не знайдено' });
});

test('createPayment: returns 400 when trying to pay more than remaining', async () => {
  const prismaMock = {
    invoice: {
      findUnique: async () => ({
        invoice_id: 7,
        amount: '100',
        payments: [{ amount: '80' }]
      })
    },
    payment: {
      create: async () => {
        throw new Error('should not be called');
      }
    }
  };

  const { createPayment } = loadControllerWithMockedPrisma(prismaMock);
  const req = { body: { invoice_id: '7', amount: '25' } };
  const res = createRes();
  const next = () => {};

  await createPayment(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Сума платежу перевищує залишок. Залишок: 20.00'
  });
});

test('createPayment: creates payment, parses floats, defaults method/payment_date', async () => {
  const created = { payment_id: 1 };
  const prismaMock = {
    invoice: {
      findUnique: async () => ({
        invoice_id: 7,
        amount: '100',
        payments: [{ amount: '40' }]
      })
    },
    payment: {
      create: async () => created
    }
  };

  let createArgs;
  prismaMock.payment.create = async (args) => {
    createArgs = args;
    return created;
  };

  const { createPayment } = loadControllerWithMockedPrisma(prismaMock);
  const before = Date.now();
  const req = { body: { invoice_id: '7', amount: '25.5' } };
  const res = createRes();
  const next = () => {};

  await createPayment(req, res, next);
  const after = Date.now();

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Платіж успішно створено');
  assert.deepEqual(res.body.data, created);

  assert.equal(createArgs.data.invoice_id, 7);
  assert.equal(createArgs.data.amount, 25.5);
  assert.equal(createArgs.data.method, 'Cash');
  assert.ok(createArgs.data.payment_date instanceof Date);
  const ts = createArgs.data.payment_date.getTime();
  assert.ok(ts >= before && ts <= after);

  assert.deepEqual(createArgs.include, {
    invoice: { include: { session: { include: { patient: true } } } }
  });
});

test('updatePayment: builds updateData correctly and returns updated entity', async () => {
  const updated = { payment_id: 3, amount: '200' };
  const prismaMock = {
    payment: {
      update: async () => updated
    }
  };

  let updateArgs;
  prismaMock.payment.update = async (args) => {
    updateArgs = args;
    return updated;
  };

  const { updatePayment } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '3' }, body: { amount: '200.5', method: 'Card', payment_date: '2025-12-15' } };
  const res = createRes();

  await updatePayment(req, res, () => {});

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Платіж успішно оновлено');
  assert.deepEqual(res.body.data, updated);

  assert.deepEqual(updateArgs.where, { payment_id: 3 });
  assert.equal(updateArgs.data.amount, 200.5);
  assert.equal(updateArgs.data.method, 'Card');
  assert.ok(updateArgs.data.payment_date instanceof Date);
  assert.equal(updateArgs.data.payment_date.toISOString().slice(0, 10), '2025-12-15');
  assert.deepEqual(updateArgs.include, { invoice: true });
});

test('deletePayment: deletes by id and returns success message', async () => {
  const prismaMock = {
    payment: {
      delete: async () => undefined
    }
  };

  let deleteArgs;
  prismaMock.payment.delete = async (args) => {
    deleteArgs = args;
    return undefined;
  };

  const { deletePayment } = loadControllerWithMockedPrisma(prismaMock);
  const req = { params: { id: '12' } };
  const res = createRes();

  await deletePayment(req, res, () => {});

  assert.deepEqual(deleteArgs, { where: { payment_id: 12 } });
  assert.deepEqual(res.body, { success: true, message: 'Платіж успішно видалено' });
});

test('handlers: forward Prisma errors to next(error)', async () => {
  const boom = new Error('boom');
  const prismaMock = {
    payment: {
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
    invoice: {
      findUnique: async () => {
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
  await c.getAllPayments({ query: {} }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.getPaymentById({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.createPayment({ body: { invoice_id: '1', amount: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.updatePayment({ params: { id: '1' }, body: { amount: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);

  nextErr = undefined;
  await c.deletePayment({ params: { id: '1' } }, createRes(), next);
  assert.equal(nextErr, boom);
});


