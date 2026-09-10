const db = require('../config/database');

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Validasi voucher & hitung potongannya untuk subtotal tertentu.
 *
 * Dipakai di dua tempat: endpoint POST /api/vouchers/validate (baca saja)
 * dan saat membuat charge (dalam transaksi + FOR UPDATE agar pemakaian
 * tidak dobel). Error dilempar dengan pesan ramah untuk ditampilkan ke buyer.
 *
 * @param {object} options
 * @param {string} options.code   Kode voucher
 * @param {number} options.subtotal  Subtotal produk (Rupiah)
 * @param {object} [options.conn]    Koneksi transaksi (opsional; default pool)
 * @param {boolean} [options.lock]   TRUE saat charge — kunci baris voucher
 */
const validateVoucherFor = async ({ code, subtotal, conn, lock = false }) => {
  const normalized = String(code || '').trim().toUpperCase();
  const runner = conn || db;

  if (!normalized) {
    throw httpError('Masukkan kode voucher terlebih dahulu');
  }

  const [rows] = await runner.query(
    `SELECT * FROM vouchers WHERE code = ?${lock ? ' FOR UPDATE' : ''}`,
    [normalized]
  );

  const voucher = rows[0];
  if (!voucher || !voucher.is_active) {
    throw httpError('Kode voucher tidak ditemukan atau sudah tidak aktif');
  }

  const now = Date.now();
  if (voucher.valid_until && new Date(voucher.valid_until).getTime() < now) {
    throw httpError('Kode voucher sudah kedaluwarsa');
  }

  if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
    throw httpError('Kode voucher sudah habis dipakai');
  }

  if (voucher.min_subtotal && subtotal < voucher.min_subtotal) {
    const shortfall = voucher.min_subtotal - subtotal;
    throw httpError(
      `Minimal belanja Rp ${voucher.min_subtotal.toLocaleString('id-ID')} untuk memakai voucher ini` +
        (shortfall > 0 ? ` (kurang Rp ${shortfall.toLocaleString('id-ID')})` : '')
    );
  }

  let discount =
    voucher.type === 'percent'
      ? Math.round((subtotal * voucher.value) / 100)
      : voucher.value;

  // Potongan tidak boleh melebihi subtotal.
  discount = Math.min(discount, subtotal);

  return { voucher, discount };
};

module.exports = { validateVoucherFor };
