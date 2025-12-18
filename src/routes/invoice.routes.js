const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const invoiceController = require('../controllers/invoice.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createInvoiceValidation = [
  body('session_id').isInt().withMessage('ID сеансу має бути числом'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Сума має бути додатнім числом'),
  handleValidationErrors
];

const updateInvoiceValidation = [
  body('amount').optional().isFloat({ min: 0 }).withMessage('Сума має бути додатнім числом'),
  handleValidationErrors
];

router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', createInvoiceValidation, invoiceController.createInvoice);
router.put('/:id', updateInvoiceValidation, invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;

