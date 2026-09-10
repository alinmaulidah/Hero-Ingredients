const express = require('express');

const { protectAdmin, protectCustomer } = require('../middleware/authMiddleware');
const {
  listVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher
} = require('../controllers/voucherController');

const router = express.Router();

// Pelanggan: cek kode voucher saat checkout
router.post('/validate', protectCustomer, validateVoucher);

// Admin: kelola voucher
router.get('/', protectAdmin, listVouchers);
router.post('/', protectAdmin, createVoucher);
router.put('/:id', protectAdmin, updateVoucher);
router.delete('/:id', protectAdmin, deleteVoucher);

module.exports = router;
