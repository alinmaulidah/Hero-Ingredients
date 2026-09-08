const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const { login, me } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

router.get('/me', protect, me);

module.exports = router;
