const prisma = require('../config/database');

const getAllMedicalRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          patient: {
            include: {
              diagnosis: true
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.medicalRecord.count({ where })
    ]);

    res.json({
      success: true,
      data: records,
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

const getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await prisma.medicalRecord.findUnique({
      where: { medical_rec_id: parseInt(id) },
      include: {
        patient: {
          include: {
            diagnosis: true,
            sessions: {
              take: 10,
              orderBy: { date: 'desc' },
              include: {
                procedure: true,
                therapist: true
              }
            }
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Медичний запис не знайдено'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const createMedicalRecord = async (req, res, next) => {
  try {
    const { date, notes, photo } = req.body;

    const record = await prisma.medicalRecord.create({
      data: {
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        photo: photo || null
      },
      include: {
        patient: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Медичний запис успішно створено',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, notes, photo } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes || null;
    if (photo !== undefined) updateData.photo = photo || null;

    const record = await prisma.medicalRecord.update({
      where: { medical_rec_id: parseInt(id) },
      data: updateData,
      include: {
        patient: true
      }
    });

    res.json({
      success: true,
      message: 'Медичний запис успішно оновлено',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const deleteMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.medicalRecord.delete({
      where: { medical_rec_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Медичний запис успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord
};

