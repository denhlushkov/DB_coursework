const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const medicalRecordController = require('../controllers/medicalRecord.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createMedicalRecordValidation = [
  body('date').optional().isISO8601().withMessage('Невірний формат дати'),
  handleValidationErrors
];

const updateMedicalRecordValidation = [
  body('date').optional().isISO8601().withMessage('Невірний формат дати'),
  handleValidationErrors
];

router.get('/', medicalRecordController.getAllMedicalRecords);
router.get('/:id', medicalRecordController.getMedicalRecordById);
router.post('/', createMedicalRecordValidation, medicalRecordController.createMedicalRecord);
router.put('/:id', updateMedicalRecordValidation, medicalRecordController.updateMedicalRecord);
router.delete('/:id', medicalRecordController.deleteMedicalRecord);

module.exports = router;

