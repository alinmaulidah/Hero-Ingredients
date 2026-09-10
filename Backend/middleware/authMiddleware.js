const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET belum diatur di Backend/.env');
  }
  return secret;
};

/** Melindungi route: wajib header `Authorization: Bearer <token>`. */
const protect = (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: token tidak ditemukan'
    });
  }

  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret());
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kedaluwarsa'
    });
  }
};

/** Wajib token dengan role `admin` (panel admin). */
const protectAdmin = (req, res, next) => {
  protect(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: bukan akun admin'
      });
    }
    next();
  });
};

/** Wajib token dengan role `customer` (storefront). */
const protectCustomer = (req, res, next) => {
  protect(req, res, () => {
    if (req.user?.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: silakan masuk sebagai pelanggan'
      });
    }
    req.customer = { id: req.user.id, email: req.user.email };
    next();
  });
};

module.exports = { protect, protectAdmin, protectCustomer, getJwtSecret };
