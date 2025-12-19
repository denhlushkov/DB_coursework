const prisma = require('../config/database');

const getAllPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: {
          diagnosis: true,
          medical_record: true,
          sessions: {
            take: 5,
            orderBy: { date: 'desc' },
            include: { procedure: true, therapist: true }
          }
        },
        orderBy: { patient_id: 'desc' }
      }),
      prisma.patient.count({ where })
    ]);

    return res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const createPatient = async (req, res, next) => {
  try {
    const { name, birth_date, phone, diagnosis_id, notes, photo } = req.body;
    
    const patientData = {
      name: name,
      birth_date: new Date(birth_date),
      phone: phone,
      ...(diagnosis_id ? {
        diagnosis: { connect: { diagnosis_id: parseInt(diagnosis_id) } }
      } : {}),
      medical_record: {
        create: {
          notes: notes || null,
          photo: photo || null
        }
      }
    };
    
    const newPatient = await prisma.patient.create({
      data: patientData,
      include: {
        diagnosis: true,
        medical_record: true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Пацієнт створений',
      data: newPatient
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);
    const { name, birth_date, phone, diagnosis_id } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (birth_date) updates.birth_date = new Date(birth_date);
    if (phone) updates.phone = phone;
    if (diagnosis_id !== undefined) {
      updates.diagnosis = diagnosis_id
        ? { connect: { diagnosis_id: parseInt(diagnosis_id) } }
        : { disconnect: true };
    }
    
    const updatedPatient = await prisma.patient.update({
      where: { patient_id: patientId },
      data: updates,
      include: {
        diagnosis: true,
        medical_record: true
      }
    });
    
    res.json({
      success: true,
      message: 'Пацієнт успішно оновлений',
      data: updatedPatient
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);
    
    const patient = await prisma.patient.findUnique({
      where: { patient_id: patientId },
      include: {
        diagnosis: true,
        medical_record: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Пацієнт не знайдений'
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);

    await prisma.patient.delete({
      where: { patient_id: patientId }
    });

    res.json({
      success: true,
      message: 'Пацієнт успішно видалений'
    });
  } catch (error) {
    next(error);
  }
};

const getPatientStats = async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id);

    const patient = await prisma.patient.findUnique({
      where: { patient_id: patientId },
      include: { diagnosis: true }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Пацієнта не знайдено' });
    }

    const totalSessions = await prisma.session.count({ where: { patient_id: patientId } });

    const paymentsAgg = await prisma.payment.aggregate({
      where: { invoice: { session: { patient_id: patientId } } },
      _sum: { amount: true }
    });

    const totalSpent = paymentsAgg._sum.amount || 0;

    res.json({ success: true, data: { patient, totalSessions, totalSpent } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientStats
};