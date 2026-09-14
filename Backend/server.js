require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const contactRoutes = require('./routes/contactRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

const PORT = process.env.PORT || 5000;

// Mode produksi "satu server": Express juga menyajikan hasil build Frontend.
// Atur SERVE_FRONTEND ke folder dist, mis. "../Frontend/dist".
const frontendDist = process.env.SERVE_FRONTEND
  ? path.resolve(__dirname, process.env.SERVE_FRONTEND)
  : '';
const serveFrontend = Boolean(frontendDist) && fs.existsSync(frontendDist);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes); // register/login/me + buku alamat pelanggan
app.use('/api/shipping-options', shippingRoutes); // opsi kurir
app.use('/api/vouchers', voucherRoutes); // voucher/diskon
app.use('/api/contact', contactRoutes); // form kontak publik + pesan masuk admin
app.use('/api/uploads', uploadRoutes); // unggah gambar produk (admin)
app.use('/api', paymentRoutes); // POST /api/charge, POST /api/payment/notification
app.use('/api', statsRoutes); // GET /api/stats

// Gambar hasil unggah admin (dibuat saat runtime oleh uploadRoutes).
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Test API
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Indonesia Ingredients API is running'
  });
});

// ============================================================
// Static serving Frontend (mode satu server, opsional)
// ============================================================
if (serveFrontend) {
  console.log(`Serving Frontend dari: ${frontendDist}`);

  // File statis apa adanya (gambar, css, js hasil build Astro)
  app.use(express.static(frontendDist, { index: false }));

  // Clean URL ala Astro: /admin/products → /admin/products/index.html
  // Hanya untuk GET non-API. Dilindungi dari path traversal.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }

    const candidates = [
      req.path,
      path.join(req.path, 'index.html'),
      `${req.path}.html`
    ];

    for (const candidate of candidates) {
      const file = path.normalize(path.join(frontendDist, candidate));
      const isInside =
        file === frontendDist || file.startsWith(frontendDist + path.sep);

      if (isInside && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return res.sendFile(file);
      }
    }

    next();
  });
}

// 404 handler (JSON)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
