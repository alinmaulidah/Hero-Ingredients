const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Tipe gambar yang diizinkan → ekstensi file yang dipakai.
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg']
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Nama file dibuat sendiri (acak) agar tidak bisa menimpa/menembus path.
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES.get(file.mimetype) || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Format gambar tidak didukung (gunakan JPG, PNG, WEBP, GIF, atau SVG).'));
  }
});

// POST /api/uploads/image — unggah satu gambar produk (admin).
router.post('/image', protectAdmin, (req, res) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran gambar maksimal 5 MB.'
          : error.message || 'Gagal mengunggah gambar.';
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
    }

    res.status(201).json({
      success: true,
      data: { url: `/uploads/${req.file.filename}` }
    });
  });
});

module.exports = router;
