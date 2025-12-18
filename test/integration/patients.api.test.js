const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../../src/config/database');
const { startTestServer } = require('./helpers');

test('Patients API (safe): create -> get -> list(search) -> stats -> delete', async (t) => {
  const srv = await startTestServer();
  t.after(async () => {
    await srv.close();
  });

  const name = `IT Patient ${Date.now()}`;
  const phone = `+380${String(Date.now()).slice(-9)}`;
  let createdId;
  let medicalRecId;

  try {
    // create
    {
      const r = await srv.request('/api/patients', {
        method: 'POST',
        body: { name, birth_date: '2000-01-02', phone, notes: 'it', photo: null }
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.name, name);
      assert.equal(r.data.data.phone, phone);
      createdId = r.data.data.patient_id;
      medicalRecId = r.data.data.medical_rec_id;
      assert.ok(Number.isInteger(createdId));
      assert.ok(Number.isInteger(medicalRecId));
    }

    // get by id
    {
      const r = await srv.request(`/api/patients/${createdId}`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.patient_id, createdId);
      assert.equal(r.data.data.name, name);
    }

    // list: search
    {
      const r = await srv.request(`/api/patients?search=${encodeURIComponent(phone)}&limit=50`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.ok(Array.isArray(r.data.data));
      assert.ok(r.data.data.some((p) => p.patient_id === createdId));
    }

    // stats (should be zero sessions/spent)
    {
      const r = await srv.request(`/api/patients/${createdId}/stats`);
      assert.equal(r.status, 200);
      assert.equal(r.data.success, true);
      assert.equal(r.data.data.patient.patient_id, createdId);
      assert.equal(r.data.data.totalSessions, 0);
      assert.equal(r.data.data.totalSpent, 0);
    }

    // delete patient
    {
      const r = await srv.request(`/api/patients/${createdId}`, { method: 'DELETE' });
      assert.equal(r.status, 200);
      assert.deepEqual(r.data, { success: true, message: 'Пацієнта успішно видалено' });
    }
  } finally {
    if (createdId) {
      await prisma.patient.deleteMany({ where: { patient_id: createdId } });
    }
    if (medicalRecId) {
      // cleanup orphaned medical record created by controller
      await prisma.medicalRecord.deleteMany({ where: { medical_rec_id: medicalRecId } });
    }
  }
});


