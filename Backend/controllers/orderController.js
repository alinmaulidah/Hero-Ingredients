const db = require('../config/database');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const ORDER_STATUSES = ['pending', 'processed', 'shipped', 'completed', 'cancelled'];

const mapOrderRow = (row) => ({
  id: row.id,
  orderId: row.order_id,
  grossAmount: row.gross_amount,
  currency: row.currency,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  transactionStatus: row.transaction_status,
  orderStatus: row.order_status,
  paymentType: row.payment_type,
  createdAt: row.created_at
});

const mapItemRow = (row) => ({
  id: row.id,
  name: row.name,
  unitPrice: row.unit_price,
  quantity: row.quantity
});

/** Tempel daftar items ke masing-masing order (1 query tambahan, tanpa N+1). */
const attachItems = async (orders) => {
  if (orders.length === 0) return;

  const ids = orders.map((order) => order.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [items] = await db.query(
    `SELECT id, order_id_fk, name, unit_price, quantity
       FROM order_items
      WHERE order_id_fk IN (${placeholders})
      ORDER BY id ASC`,
    ids
  );

  const itemsByOrder = new Map();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id_fk) || [];
    list.push(mapItemRow(item));
    itemsByOrder.set(item.order_id_fk, list);
  }

  for (const order of orders) {
    order.items = itemsByOrder.get(order.id) || [];
  }
};

const getOrders = async (req, res) => {
  try {
    const { status, payment } = req.query;
    const clauses = [];
    const params = [];

    if (status) {
      clauses.push('o.order_status = ?');
      params.push(String(status));
    }
    if (payment) {
      clauses.push('o.transaction_status = ?');
      params.push(String(payment));
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT o.id, o.order_id, o.gross_amount, o.currency,
              o.customer_name, o.customer_email, o.customer_phone,
              o.transaction_status, o.order_status, o.payment_type, o.created_at
         FROM orders o
        ${where}
        ORDER BY o.created_at DESC
        LIMIT 200`,
      params
    );

    const data = rows.map(mapOrderRow);
    await attachItems(data);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar order' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID order tidak valid' });
    }

    const [rows] = await db.query(
      `SELECT id, order_id, gross_amount, currency,
              customer_name, customer_email, customer_phone,
              transaction_status, order_status, payment_type, created_at
         FROM orders WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    const data = mapOrderRow(rows[0]);
    await attachItems([data]);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil order' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID order tidak valid' });
    }

    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid. Pilihan: ${ORDER_STATUSES.join(', ')}`
      });
    }

    await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);

    const [rows] = await db.query(
      `SELECT id, order_id, gross_amount, currency,
              customer_name, customer_email, customer_phone,
              transaction_status, order_status, payment_type, created_at
         FROM orders WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    res.json({ success: true, data: mapOrderRow(rows[0]) });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status order' });
  }
};

module.exports = { getOrders, getOrderById, updateOrderStatus };
