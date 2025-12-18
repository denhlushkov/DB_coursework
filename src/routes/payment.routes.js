const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createPaymentValidation = [
  body('invoice_id').isInt().withMessage('ID рахунку має бути числом'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Сума має бути додатнім числом'),
  body('method').optional().isIn(['Cash', 'Card', 'BankTransfer']).withMessage('Невірний метод оплати'),
  body('payment_date').optional().isISO8601().withMessage('Невірний формат дати'),
  handleValidationErrors
];

const updatePaymentValidation = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Сума має бути додатнім числом'),
  body('method').optional().isIn(['Cash', 'Card', 'BankTransfer']).withMessage('Невірний метод оплати'),
  body('payment_date').optional().isISO8601().withMessage('Невірний формат дати'),
  handleValidationErrors
];

router.get('/', paymentController.getAllPayments);
router.get('/:id', paymentController.getPaymentById);
router.post('/', createPaymentValidation, paymentController.createPayment);
router.put('/:id', updatePaymentValidation, paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

module.exports = router;

