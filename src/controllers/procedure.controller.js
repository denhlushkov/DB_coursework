const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
    try {
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit
      let where = {}
      
      if (req.query.min_cost) where.cost = { gte: parseFloat(req.query.min_cost) }
      if (req.query.max_cost) {
        if (!where.cost) where.cost = {}
        where.cost.lte = parseFloat(req.query.max_cost)
      }
      if (req.query.search) {
        where.title = { contains: req.query.search, mode: 'insensitive' }
      }

      const [data, total] = await prisma.$transaction([
          prisma.procedure.findMany({
              where: where,
              skip: offset,
              take: parseInt(limit),
              orderBy: { cost: 'desc' },
              include: { _count: { select: { sessions: true } } }
          }),
          prisma.procedure.count({ where: where })
      ])

      res.json({
          success: true,
          data: data,
          pagination: {
             page: parseInt(page),
             limit: parseInt(limit),
             total: total,
             pages: Math.ceil(total / limit)
          }
      })
    } catch (e) {
        next(e)
    }
}

const getOne = async (req, res, next) => {
  try {
    let id = parseInt(req.params.id)
    const item = await prisma.procedure.findUnique({
      where: { procedure_id: id },
      include: {
        sessions: {
          take: 5, orderBy: { date: 'desc' },
          include: {
            patient: { select: { name: true, phone: true } },
            therapist: { select: { name: true } }
          }
        }
      }
    })

    if (!item) return res.status(404).json({ success: false, message: 'Not found' })
    
    res.json({ success: true, data: item })
  } catch (e) { next(e) }
}

const create = async (req, res, next) => {
  try {
    let body = req.body
    
    const newProc = await prisma.$transaction(async (tx) => {
        let check = await tx.procedure.findFirst({
            where: { title: body.title }
        })

        if (check) {
            throw new Error('Procedure already exists')
        }

        return await tx.procedure.create({
            data: {
              title: body.title,
              cost: parseFloat(body.cost),
              duration_minutes: parseInt(body.duration_minutes),
              description: body.description
            }
        })
    })

    res.status(201).json({ success: true, message: 'Created', data: newProc })
  } catch (error) {
    if (error.message === 'Procedure already exists') {
        return res.status(409).json({ success: false, message: error.message })
    }
    next(error)
  }
}

const update = async (req, res, next) => {
    try {
        let id = parseInt(req.params.id)
        let data = req.body
        if (data.cost) data.cost = parseFloat(data.cost)
        if (data.duration_minutes) data.duration_minutes = parseInt(data.duration_minutes)

        const updated = await prisma.procedure.update({
            where: { procedure_id: id },
            data: data
        })

        res.json({ success: true, message: 'Updated', data: updated })
    } catch (e) {
        next(e)
    }
}

const remove = async (req, res, next) => {
  try {
    let id = parseInt(req.params.id)
    
    await prisma.$transaction(async (tx) => {
        let checkSessions = await tx.session.count({
            where: { procedure_id: id, status: 'Scheduled' }
        })

        if (checkSessions > 0) {
            throw new Error('Cannot delete, sessions scheduled')
        }

        let history = await tx.session.count({ where: { procedure_id: id } })
        if (history > 0) {
            throw new Error('Cannot delete procedure with history')
        }

        await tx.procedure.delete({ where: { procedure_id: id } })
    })

    res.json({ success: true, message: 'Deleted' })
  } catch (e) {
    if (e.message === 'Cannot delete, sessions scheduled' || e.message === 'Cannot delete procedure with history') {
        return res.status(400).json({ message: e.message })
    }
    next(e)
  }
}

const getAnalytics = async (req, res, next) => {
    try {
        const sql = `SELECT    
                        p.title, 
                        COUNT(s.session_id)::int as usage_count, 
                        SUM(i.amount)::float as total_revenue 
                    FROM "Procedure" p 
                    JOIN "Session" s ON p.procedure_id = s.procedure_id 
                    JOIN "Invoice" i ON s.session_id = i.session_id 
                    GROUP BY p.title 
                    ORDER BY total_revenue DESC 
                    LIMIT 5`
        
        const result = await prisma.$queryRawUnsafe(sql)
        
        res.json({
            success: true,
            data: result
        })
    } catch (e) {
        next(e)
    }
}

module.exports = {
    getAll,
    getOne,
    create,
    update,
    remove,
    getAnalytics
}