const prisma = require('../config/database');

const getAllSchedules = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, is_available } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (date) where.date = new Date(date);
    if (is_available !== undefined) where.is_available = is_available === 'true';

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          therapists: true
        },
        orderBy: [
          { date: 'asc' },
          { start_time: 'asc' }
        ]
      }),
      prisma.schedule.count({ where })
    ]);

    res.json({
      success: true,
      data: schedules,
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

const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { schedule_id: parseInt(id) },
      include: {
        therapists: true
      }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Слот розкладу не знайдено'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

const createSchedule = async (req, res, next) => {
  try {
    const { date, start_time, end_time, is_available } = req.body;

    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(date),
        start_time: start_time,
        end_time: end_time,
        is_available: is_available !== undefined ? is_available : true
      },
      include: {
        therapists: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Слот розкладу успішно створено',
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, is_available } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (is_available !== undefined) updateData.is_available = is_available;

    const schedule = await prisma.schedule.update({
      where: { schedule_id: parseInt(id) },
      data: updateData,
      include: {
        therapists: true
      }
    });

    res.json({
      success: true,
      message: 'Слот розкладу успішно оновлено',
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.schedule.delete({
      where: { schedule_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Слот розкладу успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Параметр date обов\'язковий'
      });
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        date: new Date(date),
        is_available: true
      },
      include: {
        therapists: true
      },
      orderBy: { start_time: 'asc' }
    });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailableSlots
};

