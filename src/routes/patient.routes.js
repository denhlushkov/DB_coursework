const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const patientController = require('../controllers/patient.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createPatientValidation = [
  body('name').trim().notEmpty().withMessage('Ім\'я обов\'язкове'),
  body('birth_date').isISO8601().withMessage('Невірний формат дати'),
  body('phone').trim().notEmpty().withMessage('Телефон обов\'язковий'),
  handleValidationErrors
];

const updatePatientValidation = [
  body('name').optional().trim().notEmpty().withMessage('Ім\'я не може бути порожнім'),
  body('birth_date').optional().isISO8601().withMessage('Невірний формат дати'),
  body('phone').optional().trim().notEmpty().withMessage('Телефон не може бути порожнім'),
  handleValidationErrors
];

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.get('/:id/stats', patientController.getPatientStats);
router.post('/', createPatientValidation, patientController.createPatient);
router.put('/:id', updatePatientValidation, patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;

