const db = require('../config/database');
const midtrans = require('../utils/midtrans');

const sanitizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Keranjang kosong — tidak ada item untuk dibayar');
    error.status = 400;
    throw error;
  }

  return items.map((item, index) => {
    const name = String(item.name || '').trim().substring(0, 150);
    const price = Math.round(Number(item.price));
    const quantity = Math.round(Number(item.quantity));

    if (!name) {
      const error = new Error(`Nama item ke-${index + 1} tidak valid`);
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(price) || price <= 0) {
      const error = new Error(`Harga item "${name}" tidak valid`);
      error.status = 400;
      throw error;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error(`Jumlah item "${name}" tidak valid`);
      error.status = 400;
      throw error;
    }

    return { name, price, quantity };
  });
};

const sanitizeCustomer = (customer) => ({
  name: customer?.name ? String(customer.name).trim().substring(0, 150) : null,
  email: customer?.email ? String(customer.email).trim().toLowerCase().substring(0, 150) : null,
  phone: customer?.phone ? String(customer.phone).trim().substring(0, 30) : null
});

const generateOrderId = () =>
  `MAGNA-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

/**
 * POST /api/charge — dipanggil storefront.
 * 1) Simpan order (pending) + item snapshot di DB.
 * 2) Buat transaksi Snap Midtrans.
 * 3) Token/redirect_url dikembalikan; kalau gagal, order ditandai cancelled.
 */
const createCharge = async (req, res) => {
  try {
    const items = sanitizeItems(req.body?.items);
    const customer = sanitizeCustomer(req.body?.customer);
    const currency = String(req.body?.currency || 'IDR').toUpperCase().substring(0, 3);
    const grossAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = generateOrderId();

    // Simpan order terlebih dahulu supaya status bisa di-update webhook nanti.
    const conn = await db.getConnection();
    let orderDbId;
    try {
      await conn.beginTransaction();
      const [orderResult] = await conn.query(
        `INSERT INTO orders
           (order_id, gross_amount, currency, customer_name, customer_email, customer_phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, grossAmount, currency, customer.name, customer.email, customer.phone]
      );
      orderDbId = orderResult.insertId;

      for (const item of items) {
        await conn.query(
          'INSERT INTO order_items (order_id_fk, name, unit_price, quantity) VALUES (?, ?, ?, ?)',
          [orderDbId, item.name, item.price, item.quantity]
        );
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    try {
      const snapResult = await midtrans.createSnapTransaction({
        orderId,
        grossAmount,
        items: items.map((item) => ({
          id: item.name,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });

      await db.query(
        "UPDATE orders SET snap_token = ? WHERE order_id = ?",
        [snapResult.token || null, orderId]
      );

      return res.json({
        success: true,
        data: { orderId, token: snapResult.token, redirectUrl: snapResult.redirect_url }
      });
    } catch (error) {
      // Midtrans menolak / gagal: order tidak layak diproses.
      await db.query(
        "UPDATE orders SET transaction_status = 'cancelled', order_status = 'cancelled' WHERE order_id = ?",
        [orderId]
      );

      console.error('Create Midtrans transaction error:', error);
      return res.status(error.code === 'MIDTRANS_API' ? 502 : 500).json({
        success: false,
        message: error.code === 'MIDTRANS_CONFIG'
          ? 'MIDTRANS_SERVER_KEY belum diisi di Backend/.env'
          : 'Gagal memproses pembayaran. Silakan coba lagi.'
      });
    }
  } catch (error) {
    console.error('Create charge error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.status ? error.message : 'Gagal memproses permintaan pembayaran'
    });
  }
};

const mapTransactionStatus = (rawStatus) => {
  switch (String(rawStatus || '').toLowerCase()) {
    case 'capture':
    case 'settlement':
      return 'paid';
    case 'pending':
    case 'challenge':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'expire':
    case 'failure':
      return 'cancelled';
    case 'refund':
    case 'partial_refund':
    case 'chargeback':
    case 'partial_chargeback':
      return 'refunded';
    default:
      return null;
  }
};

/**
 * POST /api/payment/notification — webhook Midtrans (set di dashboard).
 * Verifikasi signature lalu sinkronkan status order. Idempotent.
 */
const handleNotification = async (req, res) => {
  const body = req.body || {};

  try {
    const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount } = body;

    if (!orderId || statusCode === undefined || grossAmount === undefined || !body.signature_key) {
      return res.status(400).json({
        success: false,
        message: 'Payload webhook tidak lengkap'
      });
    }

    const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan'
      });
    }

    const valid = midtrans.verifySignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey: body.signature_key
    });
    if (!valid) {
      return res.status(403).json({
        success: false,
        message: 'Signature tidak valid'
      });
    }

    const order = rows[0];
    const derivedStatus = mapTransactionStatus(body.transaction_status);

    const updates = ["transaction_status = 'pending'"];
    const params = [];

    if (derivedStatus) {
      updates[0] = 'transaction_status = ?';
      params.push(derivedStatus);
    }
    if (body.payment_type) {
      updates.push('payment_type = ?');
      params.push(String(body.payment_type).substring(0, 30));
    }
    if (derivedStatus === 'paid' && order.order_status === 'pending') {
      updates.push("order_status = 'processed'");
    }
    params.push(orderId);

    await db.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);

    return res.json({
      success: true,
      message: 'Status order diperbarui'
    });
  } catch (error) {
    console.error('Payment notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses notifikasi pembayaran'
    });
  }
};

module.exports = { createCharge, handleNotification };
