const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const sessionController = require('../controllers/session.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createSessionValidation = [
  body('procedure_id').isInt().withMessage('ID процедури має бути числом'),
  body('patient_id').isInt().withMessage('ID пацієнта має бути числом'),
  body('therapist_id').isInt().withMessage('ID терапевта має бути числом'),
  body('date').isISO8601().withMessage('Невірний формат дати'),
  body('start_time').notEmpty().withMessage('Час початку обов\'язковий'),
  body('duration_minutes').isInt({ min: 1 }).withMessage('Тривалість має бути додатнім числом'),
  handleValidationErrors
];

const updateSessionValidation = [
  body('procedure_id').optional().isInt().withMessage('ID процедури має бути числом'),
  body('patient_id').optional().isInt().withMessage('ID пацієнта має бути числом'),
  body('therapist_id').optional().isInt().withMessage('ID терапевта має бути числом'),
  body('date').optional().isISO8601().withMessage('Невірний формат дати'),
  body('duration_minutes').optional().isInt({ min: 1 }).withMessage('Тривалість має бути додатнім числом'),
  body('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled']).withMessage('Невірний статус'),
  handleValidationErrors
];

router.get('/', sessionController.getAllSessions);
router.get('/:id', sessionController.getSessionById);
router.post('/', createSessionValidation, sessionController.createSession);
router.put('/:id', updateSessionValidation, sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);
router.post('/:id/complete', sessionController.completeSession);

module.exports = router;

