const db = require('../config/database');

/**
 * GET /api/stats — ringkasan untuk dashboard admin (wajib login JWT).
 */

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

/** Tempel items ke daftar order (satu query tambahan, tanpa N+1). */
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

const getStats = async (req, res) => {
  try {
    const [[groupCount]] = await db.query('SELECT COUNT(*) AS count FROM product_groups');
    const [[optionCount]] = await db.query('SELECT COUNT(*) AS count FROM product_options');
    const [[variantCount]] = await db.query('SELECT COUNT(*) AS count FROM product_variants');
    const [[orderCount]] = await db.query('SELECT COUNT(*) AS count FROM orders');
    const [[revenueRow]] = await db.query(
      "SELECT COALESCE(SUM(gross_amount), 0) AS total FROM orders WHERE transaction_status = 'paid'"
    );

    const [breakdownRows] = await db.query(
      'SELECT transaction_status, COUNT(*) AS count FROM orders GROUP BY transaction_status'
    );

    const [recentRows] = await db.query(
      `SELECT id, order_id, gross_amount, currency,
              customer_name, customer_email, customer_phone,
              transaction_status, order_status, payment_type, created_at
         FROM orders
        ORDER BY created_at DESC
        LIMIT 5`
    );

    const recentOrders = recentRows.map(mapOrderRow);
    await attachItems(recentOrders);

    const transactionBreakdown = {};
    for (const row of breakdownRows) {
      transactionBreakdown[row.transaction_status] = Number(row.count);
    }

    res.json({
      success: true,
      data: {
        groups: Number(groupCount.count),
        options: Number(optionCount.count),
        variants: Number(variantCount.count),
        orders: Number(orderCount.count),
        transactionBreakdown,
        paidRevenue: Number(revenueRow.total) || 0,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
  }
};

module.exports = { getStats };
