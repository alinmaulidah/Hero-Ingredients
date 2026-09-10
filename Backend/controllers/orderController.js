const db = require('../config/database');
const { sendTelegramMessage } = require('../utils/telegram');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const ORDER_STATUSES = ['pending', 'processed', 'shipped', 'completed', 'cancelled'];

const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  processed: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
};

const mapOrderRow = (row) => ({
  id: row.id,
  orderId: row.order_id,
  grossAmount: row.gross_amount,
  currency: row.currency,
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  shippingName: row.shipping_name,
  shippingPhone: row.shipping_phone,
  shippingAddress: row.shipping_address,
  shippingCity: row.shipping_city,
  shippingProvince: row.shipping_province,
  shippingPostalCode: row.shipping_postal_code,
  shippingCountry: row.shipping_country,
  courierName: row.courier_name,
  shippingCost: row.shipping_cost,
  voucherCode: row.voucher_code,
  discountAmount: row.discount_amount,
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
              o.customer_id, o.customer_name, o.customer_email, o.customer_phone,
              o.shipping_name, o.shipping_phone, o.shipping_address,
              o.shipping_city, o.shipping_province, o.shipping_postal_code,
              o.shipping_country, o.courier_name, o.shipping_cost,
              o.voucher_code, o.discount_amount,
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
              customer_id, customer_name, customer_email, customer_phone,
              shipping_name, shipping_phone, shipping_address,
              shipping_city, shipping_province, shipping_postal_code,
              shipping_country, courier_name, shipping_cost,
              voucher_code, discount_amount,
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
              customer_id, customer_name, customer_email, customer_phone,
              shipping_name, shipping_phone, shipping_address,
              shipping_city, shipping_province, shipping_postal_code,
              shipping_country, courier_name, shipping_cost,
              voucher_code, discount_amount,
              transaction_status, order_status, payment_type, created_at
         FROM orders WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    const order = rows[0];

    // Notifikasi Telegram: status pesanan berubah (dari panel admin).
    try {
      await sendTelegramMessage(
        [
          '🔄 STATUS PESANAN DIPERBARUI',
          `Order: ${order.order_id}`,
          `Status baru: ${ORDER_STATUS_LABELS[status] || status}`,
          `Customer: ${order.customer_name || '-'}`,
          `Total: Rp ${Number(order.gross_amount || 0).toLocaleString('id-ID')}`
        ].join('\n')
      );
    } catch (error) {
      console.error('Telegram order status notification error:', error);
    }

    res.json({ success: true, data: mapOrderRow(order) });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui status order' });
  }
};

module.exports = { getOrders, getOrderById, updateOrderStatus };
