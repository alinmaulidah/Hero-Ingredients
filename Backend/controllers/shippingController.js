const db = require('../config/database');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const mapShippingRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  priceIdr: row.price_idr,
  isActive: Boolean(row.is_active),
  sortOrder: row.sort_order
});

const sanitizeShippingPayload = (body) => {
  const payload = {
    name: String(body?.name || '').trim().substring(0, 100),
    description: String(body?.description || '').trim().substring(0, 255) || null,
    priceIdr: Math.round(Number(body?.priceIdr)),
    isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
    sortOrder: Math.round(Number(body?.sortOrder) || 0)
  };

  if (!payload.name) {
    const error = new Error('Nama kurir wajib diisi');
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(payload.priceIdr) || payload.priceIdr < 0) {
    const error = new Error('Ongkir (priceIdr) harus angka 0 atau lebih');
    error.status = 400;
    throw error;
  }

  return payload;
};

/** GET /api/shipping-options — kurir aktif untuk checkout (publik). */
const listPublic = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM shipping_options
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC`
    );

    return res.json({ success: true, data: rows.map(mapShippingRow) });
  } catch (error) {
    console.error('List shipping options error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar kurir' });
  }
};

/** GET /api/shipping-options/all — semua kurir (admin). */
const listAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM shipping_options ORDER BY sort_order ASC, id ASC'
    );

    return res.json({ success: true, data: rows.map(mapShippingRow) });
  } catch (error) {
    console.error('List all shipping options error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar kurir' });
  }
};

/** POST /api/shipping-options — tambah kurir (admin). */
const createShippingOption = async (req, res) => {
  let payload;
  try {
    payload = sanitizeShippingPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO shipping_options (name, description, price_idr, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [payload.name, payload.description, payload.priceIdr, payload.isActive ? 1 : 0, payload.sortOrder]
    );

    const [rows] = await db.query('SELECT * FROM shipping_options WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: mapShippingRow(rows[0]) });
  } catch (error) {
    console.error('Create shipping option error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan kurir' });
  }
};

/** PUT /api/shipping-options/:id — ubah kurir (admin). */
const updateShippingOption = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID kurir tidak valid' });
  }

  let payload;
  try {
    payload = sanitizeShippingPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  try {
    const [result] = await db.query(
      `UPDATE shipping_options
          SET name = ?, description = ?, price_idr = ?, is_active = ?, sort_order = ?
        WHERE id = ?`,
      [payload.name, payload.description, payload.priceIdr, payload.isActive ? 1 : 0, payload.sortOrder, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kurir tidak ditemukan' });
    }

    const [rows] = await db.query('SELECT * FROM shipping_options WHERE id = ?', [id]);
    return res.json({ success: true, data: mapShippingRow(rows[0]) });
  } catch (error) {
    console.error('Update shipping option error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui kurir' });
  }
};

/** DELETE /api/shipping-options/:id — hapus kurir (admin). */
const deleteShippingOption = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID kurir tidak valid' });
  }

  try {
    const [result] = await db.query('DELETE FROM shipping_options WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kurir tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Kurir dihapus' });
  } catch (error) {
    console.error('Delete shipping option error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus kurir' });
  }
};

module.exports = {
  listPublic,
  listAll,
  createShippingOption,
  updateShippingOption,
  deleteShippingOption
};
