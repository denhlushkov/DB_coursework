const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../../src/config/database');
const { startTestServer } = require('./helpers');

test('Diagnoses API (safe): create -> get -> list -> delete', async (t) => {
  const srv = await startTestServer();
  t.after(async () => {
    await srv.close();
  });

  const title = `IT Diagnosis ${Date.now()}`;
  let createdId;

  try {
    // create
    {
      const r = await srv.request('/api/diagnoses', {
        method: 'POST',
        body: { title, description: 'integration', severity_level: 'Low' }
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.title, title);
      createdId = r.data.data.diagnosis_id;
      assert.ok(Number.isInteger(createdId));
    }

    // get by id
    {
      const r = await srv.request(`/api/diagnoses/${createdId}`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.diagnosis_id, createdId);
      assert.equal(r.data.data.title, title);
    }

    // list (search)
    {
      const r = await srv.request(`/api/diagnoses?search=${encodeURIComponent(title)}&limit=50`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.ok(Array.isArray(r.data.data));
      assert.ok(r.data.data.some((d) => d.diagnosis_id === createdId));
    }

    // delete
    {
      const r = await srv.request(`/api/diagnoses/${createdId}`, { method: 'DELETE' });
      assert.equal(r.status, 200);
      assert.deepEqual(r.data, { success: true, message: 'Діагноз успішно видалено' });
    }
  } finally {
    // extra safety cleanup if something failed mid-test
    if (createdId) {
      await prisma.diagnosis.deleteMany({ where: { diagnosis_id: createdId } });
    }
  }
});


