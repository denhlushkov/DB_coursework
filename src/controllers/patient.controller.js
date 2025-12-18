const prisma = require('../config/database');

const getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } }
          ]
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          diagnosis: true,
          medical_record: true,
          sessions: {
            take: 5,
            orderBy: { date: 'desc' },
            include: {
              procedure: true,
              therapist: true
            }
          }
        },
        orderBy: { patient_id: 'desc' }
      }),
      prisma.patient.count({ where })
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { patient_id: parseInt(id) },
      include: {
        diagnosis: true,
        medical_record: true,
        sessions: {
          include: {
            procedure: true,
            therapist: true,
            invoice: {
              include: {
                payments: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Пацієнта не знайдено'
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

const createPatient = async (req, res, next) => {
  try {
    const { name, birth_date, phone, diagnosis_id, notes, photo } = req.body;

    const patient = await prisma.patient.create({
      data: {
        name,
        birth_date: new Date(birth_date),
        phone,
        ...(diagnosis_id
          ? { diagnosis: { connect: { diagnosis_id: parseInt(diagnosis_id) } } }
          : {}),
        medical_record: {
          create: {
            notes: notes || null,
            photo: photo || null
          }
        }
      },
      include: {
        diagnosis: true,
        medical_record: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Пацієнта успішно створено',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, birth_date, phone, diagnosis_id } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (birth_date) updateData.birth_date = new Date(birth_date);
    if (phone) updateData.phone = phone;
    if (diagnosis_id !== undefined) {
      updateData.diagnosis = diagnosis_id
        ? { connect: { diagnosis_id: parseInt(diagnosis_id) } }
        : { disconnect: true };
    }

    const patient = await prisma.patient.update({
      where: { patient_id: parseInt(id) },
      data: updateData,
      include: {
        diagnosis: true,
        medical_record: true
      }
    });

    res.json({
      success: true,
      message: 'Пацієнта успішно оновлено',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.patient.delete({
      where: { patient_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Пацієнта успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

const getPatientStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [patient, sessions, totalSpent] = await Promise.all([
      prisma.patient.findUnique({
        where: { patient_id: parseInt(id) },
        include: { diagnosis: true }
      }),
      prisma.session.count({
        where: { patient_id: parseInt(id) }
      }),
      prisma.payment.aggregate({
        where: {
          invoice: {
            session: {
              patient_id: parseInt(id)
            }
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Пацієнта не знайдено'
      });
    }

    res.json({
      success: true,
      data: {
        patient,
        totalSessions: sessions,
        totalSpent: totalSpent._sum.amount || 0
      }
    });
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

