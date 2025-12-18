const prisma = require('../config/database');

const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, patient_id, paid, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (patient_id) {
      where.session = { patient_id: parseInt(patient_id) };
    }
    if (startDate && endDate) {
      where.issue_date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          session: {
            include: {
              patient: true,
              therapist: true,
              procedure: true
            }
          },
          payments: true
        },
        orderBy: { issue_date: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    let filteredInvoices = invoices;
    if (paid !== undefined) {
      filteredInvoices = invoices.filter(invoice => {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const isPaid = totalPaid >= parseFloat(invoice.amount);
        return paid === 'true' ? isPaid : !isPaid;
      });
    }

    res.json({
      success: true,
      data: filteredInvoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: paid !== undefined ? filteredInvoices.length : total,
        pages: Math.ceil((paid !== undefined ? filteredInvoices.length : total) / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id: parseInt(id) },
      include: {
        session: {
          include: {
            patient: true,
            therapist: true,
            procedure: true
          }
        },
        payments: {
          orderBy: { payment_date: 'desc' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Рахунок не знайдено'
      });
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = parseFloat(invoice.amount) - totalPaid;

    res.json({
      success: true,
      data: {
        ...invoice,
        totalPaid,
        remaining,
        isPaid: remaining <= 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { session_id, amount } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { session_id: parseInt(session_id) }
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: 'Рахунок для цього сеансу вже існує'
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        session_id: parseInt(session_id),
        amount: amount ? parseFloat(amount) : undefined
      },
      include: {
        session: {
          include: {
            patient: true,
            therapist: true,
            procedure: true
          }
        },
        payments: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Рахунок успішно створено',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const invoice = await prisma.invoice.update({
      where: { invoice_id: parseInt(id) },
      data: {
        amount: amount ? parseFloat(amount) : undefined
      },
      include: {
        session: true,
        payments: true
      }
    });

    res.json({
      success: true,
      message: 'Рахунок успішно оновлено',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.invoice.delete({
      where: { invoice_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Рахунок успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};

