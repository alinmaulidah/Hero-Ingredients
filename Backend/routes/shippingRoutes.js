const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
const {
  listPublic,
  listAll,
  createShippingOption,
  updateShippingOption,
  deleteShippingOption
} = require('../controllers/shippingController');

const router = express.Router();

// Publik: kurir aktif untuk checkout storefront
router.get('/', listPublic);

// Admin: semua kurir
router.get('/all', protectAdmin, listAll);
router.post('/', protectAdmin, createShippingOption);
router.put('/:id', protectAdmin, updateShippingOption);
router.delete('/:id', protectAdmin, deleteShippingOption);

module.exports = router;
