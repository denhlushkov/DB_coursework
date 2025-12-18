require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
    console.log(`API доступне за адресою: http://localhost:${PORT}/api`);
  });
}

module.exports = app;

