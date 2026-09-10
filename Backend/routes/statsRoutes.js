const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
const { getStats } = require('../controllers/statsController');

const router = express.Router();

router.get('/stats', protectAdmin, getStats);

module.exports = router;
