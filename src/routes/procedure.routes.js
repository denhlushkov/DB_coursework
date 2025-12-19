const express = require('express');
const router = express.Router();
const controller = require('../controllers/procedure.controller');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const createValidation = [
    body('title').notEmpty().withMessage('Назва процедури обов\'язкова'),
    body('cost').isFloat({ min: 0.01 }).withMessage('Ціна має бути числом більше 0'),
    body('duration_minutes').isInt({ min: 1 }).withMessage('Тривалість має бути цілим числом хвилин'),
    handleValidationErrors 
];

const updateValidation = [
    body('title').optional().notEmpty().withMessage('Назва не може бути пустою'),
    body('cost').optional().isFloat({ min: 0.01 }).withMessage('Ціна має бути числом'),
    body('duration_minutes').optional().isInt({ min: 1 }).withMessage('Тривалість має бути цілим числом'),
    handleValidationErrors
];

router.get('/analytics', controller.getAnalytics);
router.get('/', controller.getAll);
router.post('/', createValidation, controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', updateValidation, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

