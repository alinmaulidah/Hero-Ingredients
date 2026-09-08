const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { getStats } = require('../controllers/statsController');

const router = express.Router();

router.get('/stats', protect, getStats);

module.exports = router;
