const errorHandler = (err, req, res, next) => {
  console.error('Помилка:', err);

  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Помилка валідації',
      errors: err.errors
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Запис з такими даними вже існує',
      field: err.meta?.target
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Запис не знайдено'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Помилка зовнішнього ключа: пов\'язаний запис не існує'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Внутрішня помилка сервера';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

