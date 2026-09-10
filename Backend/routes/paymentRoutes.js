const express = require('express');

const { protect, protectCustomer } = require('../middleware/authMiddleware');
const {
  createCharge,
  handleNotification,
  syncPaymentStatus
} = require('../controllers/paymentController');

const router = express.Router();

// Checkout storefront — wajib login pelanggan (token role customer).
router.post('/charge', protectCustomer, createCharge);

// Webhook status pembayaran dari dashboard Midtrans (public — diverifikasi signature).
router.post('/payment/notification', handleNotification);

// Sinkron status langsung dari Midtrans (admin atau pelanggan pemilik order).
router.post('/payment/sync', protect, syncPaymentStatus);

module.exports = router;
