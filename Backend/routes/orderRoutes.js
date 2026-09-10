const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
const {
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.get('/', protectAdmin, getOrders);
router.get('/:id', protectAdmin, getOrderById);
router.patch('/:id/status', protectAdmin, updateOrderStatus);

module.exports = router;
