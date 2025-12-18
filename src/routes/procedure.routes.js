const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const procedureController = require('../controllers/procedure.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createProcedureValidation = [
  body('title').trim().notEmpty().withMessage('Назва процедури обов\'язкова'),
  body('cost').isFloat({ min: 0 }).withMessage('Вартість має бути додатнім числом'),
  body('duration_minutes').isInt({ min: 1 }).withMessage('Тривалість має бути додатнім числом'),
  handleValidationErrors
];

const updateProcedureValidation = [
  body('title').optional().trim().notEmpty().withMessage('Назва процедури не може бути порожньою'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Вартість має бути додатнім числом'),
  body('duration_minutes').optional().isInt({ min: 1 }).withMessage('Тривалість має бути додатнім числом'),
  handleValidationErrors
];

router.get('/', procedureController.getAllProcedures);
router.get('/:id', procedureController.getProcedureById);
router.post('/', createProcedureValidation, procedureController.createProcedure);
router.put('/:id', updateProcedureValidation, procedureController.updateProcedure);
router.delete('/:id', procedureController.deleteProcedure);

module.exports = router;

