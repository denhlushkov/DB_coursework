const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../../src/config/database');
const { startTestServer } = require('./helpers');

test('Procedures API (safe): create -> get -> list(search/minCost/maxCost) -> delete', async (t) => {
  const srv = await startTestServer();
  t.after(async () => {
    await srv.close();
  });

  const title = `IT Procedure ${Date.now()}`;
  let createdId;

  try {
    // create
    {
      const r = await srv.request('/api/procedures', {
        method: 'POST',
        body: { title, cost: '99.50', duration_minutes: '45' }
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.title, title);
      createdId = r.data.data.procedure_id;
      assert.ok(Number.isInteger(createdId));
    }

    // get by id
    {
      const r = await srv.request(`/api/procedures/${createdId}`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.procedure_id, createdId);
      assert.equal(r.data.data.title, title);
    }

    // list: search + cost bounds
    {
      const r = await srv.request(
        `/api/procedures?search=${encodeURIComponent(title)}&minCost=50&maxCost=150&limit=50`
      );
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.ok(Array.isArray(r.data.data));
      assert.ok(r.data.data.some((p) => p.procedure_id === createdId));
    }

    // delete
    {
      const r = await srv.request(`/api/procedures/${createdId}`, { method: 'DELETE' });
      assert.equal(r.status, 200);
      assert.deepEqual(r.data, { success: true, message: 'Процедуру успішно видалено' });
    }
  } finally {
    if (createdId) {
      await prisma.procedure.deleteMany({ where: { procedure_id: createdId } });
    }
  }
});


