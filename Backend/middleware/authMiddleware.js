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

module.exports = { protect, getJwtSecret };
