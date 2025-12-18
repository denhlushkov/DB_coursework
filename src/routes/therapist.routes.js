const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const therapistController = require('../controllers/therapist.controller');
const { handleValidationErrors } = require('../middleware/validation');

const createTherapistValidation = [
  body('name').trim().notEmpty().withMessage('Ім\'я обов\'язкове'),
  handleValidationErrors
];

const updateTherapistValidation = [
  body('name').optional().trim().notEmpty().withMessage('Ім\'я не може бути порожнім'),
  handleValidationErrors
];

router.get('/', therapistController.getAllTherapists);
router.get('/:id', therapistController.getTherapistById);
router.get('/:id/schedule', therapistController.getTherapistSchedule);
router.post('/', createTherapistValidation, therapistController.createTherapist);
router.put('/:id', updateTherapistValidation, therapistController.updateTherapist);
router.delete('/:id', therapistController.deleteTherapist);

module.exports = router;

