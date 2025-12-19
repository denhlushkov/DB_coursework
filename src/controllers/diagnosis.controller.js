const prisma = require('../config/database');

// Додав 3 транзакції: 2 для атомарності(delete, create) та 1 для консистентності(getAll)
// Транзакції для update та getById непотрібні, бо виконується тільки одна операція

const getAllDiagnoses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, severity_level, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (severity_level) where.severity_level = severity_level;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [diagnoses, total] = await prisma.$transaction(async (tx) => {
      return await Promise.all([
        tx.diagnosis.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            _count: {
              select: { patients: true }
            }
          },
          orderBy: { diagnosis_id: 'desc' }
        }),
        tx.diagnosis.count({ where })
      ]);
    });

    res.json({
      success: true,
      data: diagnoses,
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

const getDiagnosisById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { diagnosis_id: parseInt(id) },
      include: {
        patients: {
          include: {
            sessions: {
              take: 5,
              orderBy: { date: 'desc' }
            }
          }
        }
      }
    });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Діагноз не знайдено'
      });
    }

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    next(error);
  }
};

const createDiagnosis = async (req, res, next) => {
  try {
    const { title, description, severity_level } = req.body;

    const diagnosis = await prisma.$transaction(async (tx) => {
      const existingDiagnosis = await tx.diagnosis.findUnique({
        where: { title }
      });

      if (existingDiagnosis) {
        throw {
          code: 'P2002',
          meta: { target: ['title'] }
        };
      }

      const newDiagnosis = await tx.diagnosis.create({
        data: {
          title,
          description: description || null,
          severity_level: severity_level || 'Low'
        }
      });

      return newDiagnosis;
    });

    res.status(201).json({
      success: true,
      message: 'Діагноз успішно створено',
      data: diagnosis
    });

  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('title')) {
      return res.status(409).json({
        success: false,
        message: 'Діагноз з такою назвою вже існує'
      });
    }
    next(error);
  }
};

const updateDiagnosis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, severity_level } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (severity_level) updateData.severity_level = severity_level;

    const diagnosis = await prisma.diagnosis.update({
      where: { diagnosis_id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Діагноз успішно оновлено',
      data: diagnosis
    });
  } catch (error) {
    next(error);
  }
};

const deleteDiagnosis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const diagnosisId = parseInt(id);

    const diagnosis = await prisma.diagnosis.findUnique({
      where: { diagnosis_id: diagnosisId },
      include: {
        _count: {
          select: { patients: true }
        }
      }
    });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Діагноз не знайдено'
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.patient.updateMany({
        where: { diagnosis_id: diagnosisId },
        data: { diagnosis_id: null }
      });

      await tx.diagnosis.delete({
        where: { diagnosis_id: diagnosisId }
      });
    });

    res.json({
      success: true,
      message: 'Діагноз успішно видалено',
      data: {
        deletedDiagnosisId: diagnosisId,
        affectedPatients: diagnosis._count.patients
      }
    });
  } 
    catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDiagnoses,
  getDiagnosisById,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis
};

