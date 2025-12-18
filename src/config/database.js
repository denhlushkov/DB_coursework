const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$connect()
  .then(() => {
    console.log('Підключено до бази даних');
  })
  .catch((error) => {
    console.error('Помилка підключення до бази даних:', error);
    process.exit(1);
  });

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;

