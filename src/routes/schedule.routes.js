const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const scheduleController = require('../controllers/schedule.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createScheduleValidation = [
  body('date').isISO8601().withMessage('Невірний формат дати'),
  body('start_time').notEmpty().withMessage('Час початку обов\'язковий'),
  body('end_time').notEmpty().withMessage('Час закінчення обов\'язковий'),
  handleValidationErrors
];

const updateScheduleValidation = [
  body('date').optional().isISO8601().withMessage('Невірний формат дати'),
  body('start_time').optional().notEmpty().withMessage('Час початку не може бути порожнім'),
  body('end_time').optional().notEmpty().withMessage('Час закінчення не може бути порожнім'),
  handleValidationErrors
];

router.get('/', scheduleController.getAllSchedules);
router.get('/available', scheduleController.getAvailableSlots);
router.get('/:id', scheduleController.getScheduleById);
router.post('/', createScheduleValidation, scheduleController.createSchedule);
router.put('/:id', updateScheduleValidation, scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

module.exports = router;

