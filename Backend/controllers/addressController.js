const db = require('../config/database');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const cleanText = (value, max) =>
  value ? String(value).trim().substring(0, max) : '';

const mapAddressRow = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  label: row.label,
  recipientName: row.recipient_name,
  phone: row.phone,
  addressLine: row.address_line,
  city: row.city,
  province: row.province,
  postalCode: row.postal_code,
  country: row.country,
  isDefault: Boolean(row.is_default)
});

const ADDRESS_FIELDS = [
  'recipient_name',
  'phone',
  'address_line',
  'city',
  'province',
  'postal_code'
];

/** Validasi & normalisasi input alamat (nama field camelCase). */
const sanitizeAddressPayload = (body) => {
  const payload = {
    label: cleanText(body?.label, 50) || null,
    recipient_name: cleanText(body?.recipientName, 150),
    phone: cleanText(body?.phone, 30),
    address_line: cleanText(body?.addressLine, 255),
    city: cleanText(body?.city, 100),
    province: cleanText(body?.province, 100),
    postal_code: cleanText(body?.postalCode, 20),
    country: cleanText(body?.country, 100) || 'Indonesia',
    is_default: Boolean(body?.isDefault)
  };

  // Pastikan semua field wajib terisi (snake_case sudah terbentuk di payload).
  for (const field of ADDRESS_FIELDS) {
    if (!payload[field]) {
      const error = new Error(`Field ${field} wajib diisi`);
      error.status = 400;
      throw error;
    }
  }

  return payload;
};

/** Pastikan alamat milik pelanggan ini (hindari akses alamat orang lain). */
const findOwnedAddress = async (customerId, addressId) => {
  const [rows] = await db.query(
    'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?',
    [addressId, customerId]
  );
  return rows[0] || null;
};

/** Set is_default = 0 untuk semua alamat pelanggan (dipakai sebelum menetapkan default baru). */
const clearDefaultFlag = (conn, customerId) =>
  conn.query(
    'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
    [customerId]
  );

/** GET /api/customers/addresses — daftar buku alamat pelanggan. */
const listAddresses = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM customer_addresses
        WHERE customer_id = ?
        ORDER BY is_default DESC, id DESC`,
      [req.customer.id]
    );

    return res.json({
      success: true,
      data: rows.map(mapAddressRow)
    });
  } catch (error) {
    console.error('List addresses error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar alamat' });
  }
};

/** POST /api/customers/addresses — tambah alamat baru. */
const createAddress = async (req, res) => {
  let payload;
  try {
    payload = sanitizeAddressPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Alamat pertama otomatis jadi default bila flag tidak dinyatakan.
    const [[{ total }]] = await conn.query(
      'SELECT COUNT(*) AS total FROM customer_addresses WHERE customer_id = ?',
      [req.customer.id]
    );
    const makeDefault = payload.is_default || total === 0;
    if (makeDefault) {
      await clearDefaultFlag(conn, req.customer.id);
    }

    const [result] = await conn.query(
      `INSERT INTO customer_addresses
         (customer_id, label, recipient_name, phone, address_line,
          city, province, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.customer.id,
        payload.label,
        payload.recipient_name,
        payload.phone,
        payload.address_line,
        payload.city,
        payload.province,
        payload.postal_code,
        payload.country,
        makeDefault ? 1 : 0
      ]
    );

    await conn.commit();

    const created = await findOwnedAddress(req.customer.id, result.insertId);
    return res.status(201).json({ success: true, data: mapAddressRow(created) });
  } catch (error) {
    await conn.rollback();
    console.error('Create address error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan alamat' });
  } finally {
    conn.release();
  }
};

/** PUT /api/customers/addresses/:id — ubah alamat milik pelanggan. */
const updateAddress = async (req, res) => {
  const addressId = parseId(req.params.id);
  if (!addressId) {
    return res.status(400).json({ success: false, message: 'ID alamat tidak valid' });
  }

  let payload;
  try {
    payload = sanitizeAddressPayload(req.body);
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const existing = await findOwnedAddress(req.customer.id, addressId);
    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    }

    if (payload.is_default) {
      await clearDefaultFlag(conn, req.customer.id);
    }

    await conn.query(
      `UPDATE customer_addresses
          SET label = ?, recipient_name = ?, phone = ?, address_line = ?,
              city = ?, province = ?, postal_code = ?, country = ?,
              is_default = ?
        WHERE id = ? AND customer_id = ?`,
      [
        payload.label,
        payload.recipient_name,
        payload.phone,
        payload.address_line,
        payload.city,
        payload.province,
        payload.postal_code,
        payload.country,
        payload.is_default ? 1 : 0,
        addressId,
        req.customer.id
      ]
    );

    await conn.commit();

    const updated = await findOwnedAddress(req.customer.id, addressId);
    return res.json({ success: true, data: mapAddressRow(updated) });
  } catch (error) {
    await conn.rollback();
    console.error('Update address error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui alamat' });
  } finally {
    conn.release();
  }
};

/** DELETE /api/customers/addresses/:id — hapus alamat milik pelanggan. */
const deleteAddress = async (req, res) => {
  const addressId = parseId(req.params.id);
  if (!addressId) {
    return res.status(400).json({ success: false, message: 'ID alamat tidak valid' });
  }

  try {
    const [result] = await db.query(
      'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?',
      [addressId, req.customer.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Alamat tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Alamat dihapus' });
  } catch (error) {
    console.error('Delete address error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus alamat' });
  }
};

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };
