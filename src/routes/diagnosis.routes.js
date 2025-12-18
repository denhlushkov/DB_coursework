const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const diagnosisController = require('../controllers/diagnosis.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createDiagnosisValidation = [
  body('title').trim().notEmpty().withMessage('Назва діагнозу обов\'язкова'),
  body('severity_level').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Невірний рівень тяжкості'),
  handleValidationErrors
];

const updateDiagnosisValidation = [
  body('title').optional().trim().notEmpty().withMessage('Назва діагнозу не може бути порожньою'),
  body('severity_level').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Невірний рівень тяжкості'),
  handleValidationErrors
];

router.get('/', diagnosisController.getAllDiagnoses);
router.get('/:id', diagnosisController.getDiagnosisById);
router.post('/', createDiagnosisValidation, diagnosisController.createDiagnosis);
router.put('/:id', updateDiagnosisValidation, diagnosisController.updateDiagnosis);
router.delete('/:id', diagnosisController.deleteDiagnosis);

module.exports = router;

