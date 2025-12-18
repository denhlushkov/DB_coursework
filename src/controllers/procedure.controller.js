const prisma = require('../config/database');

const getAllProcedures = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, minCost, maxCost } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (minCost || maxCost) {
      where.cost = {};
      if (minCost) where.cost.gte = parseFloat(minCost);
      if (maxCost) where.cost.lte = parseFloat(maxCost);
    }

    const [procedures, total] = await Promise.all([
      prisma.procedure.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: { sessions: true }
          }
        },
        orderBy: { procedure_id: 'desc' }
      }),
      prisma.procedure.count({ where })
    ]);

    res.json({
      success: true,
      data: procedures,
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

const getProcedureById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const procedure = await prisma.procedure.findUnique({
      where: { procedure_id: parseInt(id) },
      include: {
        sessions: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            patient: true,
            therapist: true
          }
        }
      }
    });

    if (!procedure) {
      return res.status(404).json({
        success: false,
        message: 'Процедуру не знайдено'
      });
    }

    res.json({
      success: true,
      data: procedure
    });
  } catch (error) {
    next(error);
  }
};

const createProcedure = async (req, res, next) => {
  try {
    const { title, cost, duration_minutes } = req.body;

    const procedure = await prisma.procedure.create({
      data: {
        title,
        cost: parseFloat(cost),
        duration_minutes: parseInt(duration_minutes)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Процедуру успішно створено',
      data: procedure
    });
  } catch (error) {
    next(error);
  }
};

const updateProcedure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, cost, duration_minutes } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (cost) updateData.cost = parseFloat(cost);
    if (duration_minutes) updateData.duration_minutes = parseInt(duration_minutes);

    const procedure = await prisma.procedure.update({
      where: { procedure_id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Процедуру успішно оновлено',
      data: procedure
    });
  } catch (error) {
    next(error);
  }
};

const deleteProcedure = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.procedure.delete({
      where: { procedure_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Процедуру успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProcedures,
  getProcedureById,
  createProcedure,
  updateProcedure,
  deleteProcedure
};

