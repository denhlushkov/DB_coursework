const prisma = require('../config/database');

const getAllSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, patient_id, therapist_id, date } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (patient_id) where.patient_id = parseInt(patient_id);
    if (therapist_id) where.therapist_id = parseInt(therapist_id);
    if (date) where.date = new Date(date);

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          patient: {
            include: {
              diagnosis: true
            }
          },
          therapist: true,
          procedure: true,
          invoice: {
            include: {
              payments: true
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { start_time: 'desc' }
        ]
      }),
      prisma.session.count({ where })
    ]);

    res.json({
      success: true,
      data: sessions,
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

const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(id) },
      include: {
        patient: {
          include: {
            diagnosis: true,
            medical_record: true
          }
        },
        therapist: true,
        procedure: true,
        invoice: {
          include: {
            payments: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не знайдено'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

const createSession = async (req, res, next) => {
  try {
    const {
      procedure_id,
      patient_id,
      therapist_id,
      date,
      start_time,
      duration_minutes,
      room_number
    } = req.body;

    const existingSessions = await prisma.session.findMany({
      where: {
        therapist_id: parseInt(therapist_id),
        date: new Date(date),
        status: { not: 'Cancelled' }
      }
    });

    const newStartTime = new Date(`1970-01-01T${start_time}`);
    const newEndTime = new Date(newStartTime.getTime() + parseInt(duration_minutes) * 60000);

    const hasConflict = existingSessions.some(session => {
      const existingStart = new Date(`1970-01-01T${session.start_time}`);
      const existingEnd = new Date(existingStart.getTime() + session.duration_minutes * 60000);

      return (newStartTime < existingEnd && newEndTime > existingStart);
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Терапевт вже зайнятий на цей час'
      });
    }

    const session = await prisma.session.create({
      data: {
        procedure_id: parseInt(procedure_id),
        patient_id: parseInt(patient_id),
        therapist_id: parseInt(therapist_id),
        date: new Date(date),
        start_time: start_time,
        duration_minutes: parseInt(duration_minutes),
        room_number: room_number || null,
        status: 'Scheduled'
      },
      include: {
        patient: true,
        therapist: true,
        procedure: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Сеанс успішно створено',
      data: session
    });
  } catch (error) {
    next(error);
  }
};

const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      procedure_id,
      patient_id,
      therapist_id,
      date,
      start_time,
      duration_minutes,
      status,
      room_number
    } = req.body;

    const updateData = {};
    if (procedure_id) updateData.procedure_id = parseInt(procedure_id);
    if (patient_id) updateData.patient_id = parseInt(patient_id);
    if (therapist_id) updateData.therapist_id = parseInt(therapist_id);
    if (date) updateData.date = new Date(date);
    if (start_time) updateData.start_time = start_time;
    if (duration_minutes) updateData.duration_minutes = parseInt(duration_minutes);
    if (status) updateData.status = status;
    if (room_number !== undefined) updateData.room_number = room_number || null;

    const session = await prisma.session.update({
      where: { session_id: parseInt(id) },
      data: updateData,
      include: {
        patient: true,
        therapist: true,
        procedure: true
      }
    });

    res.json({
      success: true,
      message: 'Сеанс успішно оновлено',
      data: session
    });
  } catch (error) {
    next(error);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.session.delete({
      where: { session_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Сеанс успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

const completeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { session_id: parseInt(id) },
      include: {
        procedure: true,
        invoice: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не знайдено'
      });
    }

    if (session.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Сеанс вже завершено'
      });
    }

    const updatedSession = await prisma.session.update({
      where: { session_id: parseInt(id) },
      data: { status: 'Completed' },
      include: {
        patient: true,
        therapist: true,
        procedure: true
      }
    });

    let invoice = session.invoice;
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          session_id: parseInt(id),
          amount: session.procedure.cost
        },
        include: {
          payments: true
        }
      });
    }

    res.json({
      success: true,
      message: 'Сеанс завершено, рахунок створено',
      data: {
        session: updatedSession,
        invoice
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  completeSession
};

