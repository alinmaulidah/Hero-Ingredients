const db = require('../config/database');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const mapMessageRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  market: row.market,
  message: row.message,
  isRead: Boolean(row.is_read),
  createdAt: row.created_at
});

/**
 * POST /api/contact — formulir "Kirim Pesan" di halaman kontak publik.
 * Pesan disimpan ke tabel contact_messages untuk dibaca admin.
 */
const sendMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().substring(0, 150);
    const email = String(req.body?.email || '').trim().toLowerCase().substring(0, 150);
    const phone = String(req.body?.phone || '').trim().substring(0, 30) || null;
    const market = String(req.body?.market || 'Lokal').trim();
    const message = String(req.body?.message || '').trim().substring(0, 2500);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama wajib diisi' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: 'Pesan wajib diisi' });
    }
    const finalMarket = market === 'Export' ? 'Export' : 'Lokal';

    const [result] = await db.query(
      `INSERT INTO contact_messages (name, email, phone, market, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, finalMarket, message]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Pesan berhasil dikirim. Terima kasih!'
    });
  } catch (error) {
    console.error('Contact send error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengirim pesan' });
  }
};

/** GET /api/contact — daftar pesan masuk (admin). */
const listMessages = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM contact_messages
        ORDER BY is_read ASC, created_at DESC
        LIMIT 300`
    );
    return res.json({ success: true, data: rows.map(mapMessageRow) });
  } catch (error) {
    console.error('List contact messages error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil pesan masuk' });
  }
};

/** PATCH /api/contact/:id — tandai dibaca / belum dibaca (admin). */
const markMessageRead = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID pesan tidak valid' });
  }

  const isRead = Boolean(req.body?.isRead);

  try {
    const [result] = await db.query(
      'UPDATE contact_messages SET is_read = ? WHERE id = ?',
      [isRead ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
    }

    const [rows] = await db.query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    return res.json({ success: true, data: mapMessageRow(rows[0]) });
  } catch (error) {
    console.error('Mark contact message error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pesan' });
  }
};

/** DELETE /api/contact/:id — hapus pesan (admin). */
const deleteMessage = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID pesan tidak valid' });
  }

  try {
    const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Pesan dihapus' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pesan' });
  }
};

module.exports = { sendMessage, listMessages, markMessageRead, deleteMessage };
