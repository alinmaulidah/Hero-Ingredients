const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getJwtSecret } = require('../middleware/authMiddleware');

const signCustomerToken = (customer) =>
  jwt.sign(
    { id: customer.id, email: customer.email, role: 'customer' },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || null
});

/**
 * POST /api/customers/register — daftar akun pelanggan storefront.
 * Langsung login setelah daftar (token ikut dikembalikan).
 */
const register = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().substring(0, 100);
    const email = String(req.body?.email || '').trim().toLowerCase().substring(0, 150);
    const phone = String(req.body?.phone || '').trim().substring(0, 30) || null;
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }

    const [existing] = await db.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar. Silakan masuk.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone, passwordHash]
    );

    const customer = { id: result.insertId, name, email, phone };
    return res.json({
      success: true,
      data: { token: signCustomerToken(customer), user: publicUser(customer) }
    });
  } catch (error) {
    console.error('Customer register error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun' });
  }
};

/**
 * POST /api/customers/login — masuk akun pelanggan.
 * Terpisah dari /api/auth/login (admin) supaya token & role tidak tertukar.
 */
const login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    const [rows] = await db.query(
      'SELECT id, name, email, phone, password_hash FROM customers WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    const customer = rows[0];
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    return res.json({
      success: true,
      data: {
        token: signCustomerToken(customer),
        user: publicUser(customer)
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({ success: false, message: 'Gagal proses login' });
  }
};

/** GET /api/customers/me — data pelanggan saat ini. */
const me = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone FROM customers WHERE id = ?',
      [req.customer.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }

    return res.json({ success: true, data: publicUser(rows[0]) });
  } catch (error) {
    console.error('Get customer error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data akun' });
  }
};

/**
 * POST /api/customers/google — masuk/daftar dengan Google.
 *
 * Frontend (Google Identity Services) mengirim `id_token` hasil login Google;
 * token diverifikasi tandanya di sini (audience harus cocok dengan
 * GOOGLE_CLIENT_ID). Email hasil verifikasi dipakai untuk mencari akun:
 * sudah ada → login; belum ada → akun dibuat otomatis (password acak,
 * jadi akun Google ini login-nya lewat Google).
 */
const googleLogin = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      success: false,
      message: 'Login Google belum dikonfigurasi di server. Hubungi admin.'
    });
  }

  const idToken = String(req.body?.idToken || '').trim();
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'Token Google tidak ditemukan'
    });
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    const email = String(payload?.email || '').trim().toLowerCase().substring(0, 150);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Akun Google tidak memiliki email'
      });
    }

    const name = String(payload?.name || '').trim().substring(0, 100) ||
      email.split('@')[0] || 'Pelanggan';

    const [rows] = await db.query(
      'SELECT id, name, email, phone FROM customers WHERE email = ?',
      [email]
    );

    let customer;
    let isNew = false;

    if (rows.length > 0) {
      customer = rows[0];
      // Lengkapi nama bila akun Google lebih lengkap dari akun lama.
      if (!customer.name || customer.name === email.split('@')[0]) {
        await db.query('UPDATE customers SET name = ? WHERE id = ?', [name, customer.id]);
        customer.name = name;
      }
    } else {
      // Akun baru: password acak tak bisa dipakai login manual — via Google saja.
      const randomPassword = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const [result] = await db.query(
        'INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, NULL, ?)',
        [name, email, passwordHash]
      );
      customer = { id: result.insertId, name, email, phone: null };
      isNew = true;
    }

    return res.json({
      success: true,
      data: {
        token: signCustomerToken(customer),
        user: publicUser(customer),
        isNew
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(401).json({
      success: false,
      message: 'Gagal verifikasi akun Google. Silakan coba lagi.'
    });
  }
};

module.exports = { register, login, me, googleLogin };
