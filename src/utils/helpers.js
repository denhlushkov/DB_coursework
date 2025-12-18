// Допоміжні функції

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

const formatTime = (time) => {
  if (!time) return null;
  return typeof time === 'string' ? time : time.toISOString().split('T')[1].slice(0, 5);
};

const calculateInvoiceRemaining = (invoice) => {
  if (!invoice || !invoice.payments) return 0;
  const totalPaid = invoice.payments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount || 0);
  }, 0);
  return Math.max(0, parseFloat(invoice.amount || 0) - totalPaid);
};

const isInvoicePaid = (invoice) => {
  return calculateInvoiceRemaining(invoice) <= 0;
};

const validatePhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^(\+?380|0)\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  return phone.replace(/\s/g, '').replace(/^\+?380/, '0');
};

const calculateTotalPayments = (payments) => {
  if (!payments || !Array.isArray(payments)) return 0;
  return payments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount || 0);
  }, 0);
};

const checkTimeConflict = (start1, end1, start2, end2) => {
  const s1 = new Date(`1970-01-01T${start1}`);
  const e1 = new Date(`1970-01-01T${end1}`);
  const s2 = new Date(`1970-01-01T${start2}`);
  const e2 = new Date(`1970-01-01T${end2}`);

  return (s1 < e2 && s2 < e1);
};

module.exports = {
  formatDate,
  formatTime,
  calculateInvoiceRemaining,
  isInvoicePaid,
  validatePhone,
  normalizePhone,
  calculateTotalPayments,
  checkTimeConflict
};

