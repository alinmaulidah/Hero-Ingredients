const express = require('express');

const {
  createCharge,
  handleNotification
} = require('../controllers/paymentController');

const router = express.Router();

// Dipanggil storefront saat checkout (public — diproteksi validasi payload).
router.post('/charge', createCharge);

// Webhook status pembayaran dari dashboard Midtrans (public — diverifikasi signature).
router.post('/payment/notification', handleNotification);

module.exports = router;
