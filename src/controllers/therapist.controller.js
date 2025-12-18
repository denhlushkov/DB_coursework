const prisma = require('../config/database');

const getAllTherapists = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, specialization } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }
    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' };
    }

    const [therapists, total] = await Promise.all([
      prisma.therapist.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          schedule: true,
          sessions: {
            take: 5,
            orderBy: { date: 'desc' },
            include: {
              patient: true,
              procedure: true
            }
          }
        },
        orderBy: { therapist_id: 'desc' }
      }),
      prisma.therapist.count({ where })
    ]);

    res.json({
      success: true,
      data: therapists,
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

const getTherapistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const therapist = await prisma.therapist.findUnique({
      where: { therapist_id: parseInt(id) },
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

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Терапевта не знайдено'
      });
    }

    res.json({
      success: true,
      data: therapist
    });
  } catch (error) {
    next(error);
  }
};

const createTherapist = async (req, res, next) => {
  try {
    const { name, phone, specialization, photo, schedule_id } = req.body;

    const therapist = await prisma.therapist.create({
      data: {
        name,
        phone: phone || null,
        specialization: specialization || null,
        photo: photo || null,
        schedule_id: schedule_id ? parseInt(schedule_id) : null
      },
      include: {
        schedule: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Терапевта успішно створено',
      data: therapist
    });
  } catch (error) {
    next(error);
  }
};

const updateTherapist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, specialization, photo, schedule_id } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (specialization !== undefined) updateData.specialization = specialization || null;
    if (photo !== undefined) updateData.photo = photo || null;
    if (schedule_id !== undefined) updateData.schedule_id = schedule_id ? parseInt(schedule_id) : null;

    const therapist = await prisma.therapist.update({
      where: { therapist_id: parseInt(id) },
      data: updateData,
      include: {
        schedule: true
      }
    });

    res.json({
      success: true,
      message: 'Терапевта успішно оновлено',
      data: therapist
    });
  } catch (error) {
    next(error);
  }
};

const deleteTherapist = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.therapist.delete({
      where: { therapist_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Терапевта успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

const getTherapistSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const where = {
      therapist_id: parseInt(id)
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        patient: true,
        procedure: true,
        invoice: true
      },
      orderBy: [
        { date: 'asc' },
        { start_time: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTherapists,
  getTherapistById,
  createTherapist,
  updateTherapist,
  deleteTherapist,
  getTherapistSchedule
};

