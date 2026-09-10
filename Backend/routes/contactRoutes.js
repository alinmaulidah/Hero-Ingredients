const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
const {
  sendMessage,
  listMessages,
  markMessageRead,
  deleteMessage
} = require('../controllers/contactController');

const router = express.Router();

// Formulir kontak publik (tanpa login)
router.post('/', sendMessage);

// Kelola pesan masuk (admin)
router.get('/', protectAdmin, listMessages);
router.patch('/:id', protectAdmin, markMessageRead);
router.delete('/:id', protectAdmin, deleteMessage);

module.exports = router;
