require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const patientRoutes = require('./routes/patient.routes');
const therapistRoutes = require('./routes/therapist.routes');
const sessionRoutes = require('./routes/session.routes');
const diagnosisRoutes = require('./routes/diagnosis.routes');
const procedureRoutes = require('./routes/procedure.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const medicalRecordRoutes = require('./routes/medicalRecord.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Реабілітаційний центр API працює',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/patients', patientRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/procedures', procedureRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/medical-records', medicalRecordRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не знайдено'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`API доступне за адресою: http://localhost:${PORT}/api`);
});

module.exports = app;

