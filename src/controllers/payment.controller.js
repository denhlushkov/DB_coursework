const prisma = require('../config/database');

const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, invoice_id, method, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (invoice_id) where.invoice_id = parseInt(invoice_id);
    if (method) where.method = method;
    if (startDate && endDate) {
      where.payment_date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          invoice: {
            include: {
              session: {
                include: {
                  patient: true,
                  procedure: true
                }
              }
            }
          }
        },
        orderBy: { payment_date: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      data: payments,
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

const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { payment_id: parseInt(id) },
      include: {
        invoice: {
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
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Платіж не знайдено'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const { invoice_id, amount, payment_date, method } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id: parseInt(invoice_id) },
      include: { payments: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Рахунок не знайдено'
      });
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = parseFloat(invoice.amount) - totalPaid;
    const paymentAmount = parseFloat(amount);

    if (paymentAmount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Сума платежу перевищує залишок. Залишок: ${remaining.toFixed(2)}`
      });
    }

    const payment = await prisma.payment.create({
      data: {
        invoice_id: parseInt(invoice_id),
        amount: paymentAmount,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        method: method || 'Cash'
      },
      include: {
        invoice: {
          include: {
            session: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Платіж успішно створено',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, method } = req.body;

    const updateData = {};
    if (amount) updateData.amount = parseFloat(amount);
    if (payment_date) updateData.payment_date = new Date(payment_date);
    if (method) updateData.method = method;

    const payment = await prisma.payment.update({
      where: { payment_id: parseInt(id) },
      data: updateData,
      include: {
        invoice: true
      }
    });

    res.json({
      success: true,
      message: 'Платіж успішно оновлено',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.payment.delete({
      where: { payment_id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Платіж успішно видалено'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};

