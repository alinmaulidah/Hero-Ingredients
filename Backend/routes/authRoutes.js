const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
const { login, me } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

router.get('/me', protectAdmin, me);

module.exports = router;
