const express = require('express');

const { protectCustomer } = require('../middleware/authMiddleware');
const { register, login, me, googleLogin } = require('../controllers/customerAuthController');
const {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/addressController');

const router = express.Router();

// Auth pelanggan (public untuk daftar/masuk)
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

// Data akun (wajib token pelanggan)
router.get('/me', protectCustomer, me);

// Buku alamat (wajib token pelanggan)
router.get('/addresses', protectCustomer, listAddresses);
router.post('/addresses', protectCustomer, createAddress);
router.put('/addresses/:id', protectCustomer, updateAddress);
router.delete('/addresses/:id', protectCustomer, deleteAddress);

module.exports = router;
