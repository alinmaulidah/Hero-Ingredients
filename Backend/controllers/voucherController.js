const db = require('../config/database');
const { validateVoucherFor } = require('../utils/voucher');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const toIntOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
};

const toMysqlDatetime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NaN;

  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

/** '2026-09-30 23:59:00' → '2026-09-30T23:59' agar cocok input datetime-local. */
const toInputDatetime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const mapVoucherRow = (row) => ({
  id: row.id,
  code: row.code,
  description: row.description,
  type: row.type,
  value: row.value,
  minSubtotal: row.min_subtotal,
  maxUses: row.max_uses,
  usedCount: row.used_count,
  validUntil: toInputDatetime(row.valid_until),
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const sanitizeVoucherPayload = (body) => {
  const code = String(body?.code || '').trim().toUpperCase().substring(0, 50);
  const type = String(body?.type || 'percent');
  const value = toIntOrNull(body?.value);
  const minSubtotal = toIntOrNull(body?.minSubtotal);
  const maxUses = toIntOrNull(body?.maxUses);
  const validUntil = toMysqlDatetime(body?.validUntil);

  if (!code) {
    const error = new Error('Kode voucher wajib diisi');
    error.status = 400;
    throw error;
  }
  if (!['percent', 'nominal'].includes(type)) {
    const error = new Error('Tipe voucher tidak valid');
    error.status = 400;
    throw error;
  }
  if (value === null || Number.isNaN(value) || value < 0) {
    const error = new Error('Nilai voucher harus angka 0 atau lebih');
    error.status = 400;
    throw error;
  }
  if (type === 'percent' && value > 100) {
    const error = new Error('Persentase voucher maksimal 100');
    error.status = 400;
    throw error;
  }
  if (Number.isNaN(minSubtotal) || Number.isNaN(maxUses)) {
    const error = new Error('Format angka tidak valid');
    error.status = 400;
    throw error;
  }
  if (Number.isNaN(validUntil)) {
    const error = new Error('Format tanggal berlaku-sampai tidak valid');
    error.status = 400;
    throw error;
  }

  return {
    code,
    description: String(body?.description || '').trim().substring(0, 255) || null,
    type,
    value,
    minSubtotal,
    maxUses,
    validUntil,
    isActive: body?.isActive === undefined ? true : Boolean(body.isActive)
  };
};

/** GET /api/vouchers — daftar voucher (admin). */
const listVouchers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vouchers ORDER BY id DESC');
    return res.json({ success: true, data: rows.map(mapVoucherRow) });
  } catch (error) {
    console.error('List vouchers error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar voucher' });
  }
};

/** POST /api/vouchers — tambah voucher (admin). */
const createVoucher = async (req, res) => {
  let payload;
  try {
    payload = sanitizeVoucherPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO vouchers
         (code, description, type, value, min_subtotal, max_uses, valid_until, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.code,
        payload.description,
        payload.type,
        payload.value,
        payload.minSubtotal,
        payload.maxUses,
        payload.validUntil,
        payload.isActive ? 1 : 0
      ]
    );

    const [rows] = await db.query('SELECT * FROM vouchers WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: mapVoucherRow(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode voucher sudah dipakai' });
    }
    console.error('Create voucher error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan voucher' });
  }
};

/** PUT /api/vouchers/:id — ubah voucher (admin). */
const updateVoucher = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID voucher tidak valid' });
  }

  let payload;
  try {
    payload = sanitizeVoucherPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  try {
    const [result] = await db.query(
      `UPDATE vouchers
          SET code = ?, description = ?, type = ?, value = ?,
              min_subtotal = ?, max_uses = ?, valid_until = ?, is_active = ?
        WHERE id = ?`,
      [
        payload.code,
        payload.description,
        payload.type,
        payload.value,
        payload.minSubtotal,
        payload.maxUses,
        payload.validUntil,
        payload.isActive ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan' });
    }

    const [rows] = await db.query('SELECT * FROM vouchers WHERE id = ?', [id]);
    return res.json({ success: true, data: mapVoucherRow(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode voucher sudah dipakai' });
    }
    console.error('Update voucher error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui voucher' });
  }
};

/** DELETE /api/vouchers/:id — hapus voucher (admin). */
const deleteVoucher = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID voucher tidak valid' });
  }

  try {
    const [result] = await db.query('DELETE FROM vouchers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Voucher tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Voucher dihapus' });
  } catch (error) {
    console.error('Delete voucher error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus voucher' });
  }
};

/**
 * POST /api/vouchers/validate — cek kode voucher sebelum bayar (pelanggan).
 * Hanya perhitungan; used_count tidak bertambah di sini (baru saat charge).
 */
const validateVoucher = async (req, res) => {
  try {
    const subtotal = Math.round(Number(req.body?.subtotal));
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({ success: false, message: 'Subtotal tidak valid' });
    }

    const { voucher, discount } = await validateVoucherFor({
      code: req.body?.code,
      subtotal
    });

    return res.json({
      success: true,
      data: {
        code: voucher.code,
        description: voucher.description,
        type: voucher.type,
        discount
      }
    });
  } catch (error) {
    return res
      .status(error.status || 400)
      .json({ success: false, message: error.message || 'Voucher tidak valid' });
  }
};

module.exports = {
  listVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher
};
