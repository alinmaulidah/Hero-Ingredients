const db = require('../config/database');
const midtrans = require('../utils/midtrans');
const { validateVoucherFor } = require('../utils/voucher');
const { sendTelegramMessage } = require('../utils/telegram');

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

const generateOrderId = () =>
  `HERO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

/**
 * POST /api/charge — dipanggil storefront setelah login pelanggan
 * (rute dilindungi protectCustomer). Checkout online selalu Rupiah.
 *
 * Alur:
 * 1) Pelanggan & alamat tujuannya (harus milik akun ini) & kurir aktif.
 * 2) Voucher (opsional) divalidasi & diskon dihitung di dalam transaksi
 *    (baris voucher dikunci FOR UPDATE agar used_count aman).
 * 3) Simpan order (pending) + item snapshot + kolom alamat/ongkir/voucher.
 * 4) Buat transaksi Snap Midtrans; item_details = produk + ongkir - diskon
 *    sehingga jumlahnya = gross_amount. Kalau gagal, order ditandai cancelled.
 */
const createCharge = async (req, res) => {
  const customerId = req.customer.id;
  let conn;

  try {
    // 1. Pelanggan (snapshot kontak dari DB, jangan percaya body).
    const [customers] = await db.query(
      'SELECT id, name, email, phone FROM customers WHERE id = ?',
      [customerId]
    );
    if (customers.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan. Silakan masuk kembali.'
      });
    }
    const customer = customers[0];

    // 2. Items + mata uang (wajib Rupiah).
    const items = sanitizeItems(req.body?.items);
    const currency = String(req.body?.currency || 'IDR').toUpperCase().substring(0, 3);
    if (currency !== 'IDR') {
      throw badRequest('Pembayaran online hanya mendukung Rupiah (IDR)');
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 3. Alamat pengiriman (buku alamat akun).
    const addressId = Math.round(Number(req.body?.addressId));
    if (!Number.isInteger(addressId) || addressId <= 0) {
      throw badRequest('Pilih alamat pengiriman terlebih dahulu');
    }
    const [addressRows] = await db.query(
      'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?',
      [addressId, customerId]
    );
    if (addressRows.length === 0) {
      throw badRequest('Alamat pengiriman tidak ditemukan');
    }
    const address = addressRows[0];

    // 4. Kurir pengiriman aktif.
    const shippingOptionId = Math.round(Number(req.body?.shippingOptionId));
    if (!Number.isInteger(shippingOptionId) || shippingOptionId <= 0) {
      throw badRequest('Pilih kurir pengiriman terlebih dahulu');
    }
    const [shippingRows] = await db.query(
      'SELECT * FROM shipping_options WHERE id = ? AND is_active = 1',
      [shippingOptionId]
    );
    if (shippingRows.length === 0) {
      throw badRequest('Kurir pengiriman tidak tersedia');
    }
    const courier = shippingRows[0];
    const shippingCost = Math.round(Number(courier.price_idr)) || 0;

    const orderId = generateOrderId();
    const voucherCode =
      String(req.body?.voucherCode || '').trim().toUpperCase().substring(0, 50) || null;

    // 5. Simpan order + gunakan voucher (dalam satu transaksi).
    conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let voucherId = null;
      let discountAmount = 0;
      if (voucherCode) {
        const { voucher, discount } = await validateVoucherFor({
          code: voucherCode,
          subtotal,
          conn,
          lock: true
        });
        voucherId = voucher.id;
        discountAmount = discount;
      }

      const grossAmount = subtotal + shippingCost - discountAmount;
      if (grossAmount < 10000) {
        const error = badRequest(
          'Minimal transaksi pembayaran via Midtrans adalah Rp 10.000'
        );
        error.rollback = true;
        throw error;
      }

      const [orderResult] = await conn.query(
        `INSERT INTO orders
           (order_id, gross_amount, currency, customer_id,
            customer_name, customer_email, customer_phone,
            shipping_name, shipping_phone, shipping_address,
            shipping_city, shipping_province, shipping_postal_code,
            shipping_country, courier_name, shipping_cost,
            voucher_id, voucher_code, discount_amount)
         VALUES (?, ?, 'IDR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          grossAmount,
          customer.id,
          customer.name,
          customer.email,
          customer.phone,
          address.recipient_name,
          address.phone,
          address.address_line,
          address.city,
          address.province,
          address.postal_code,
          address.country,
          courier.name,
          shippingCost,
          voucherId,
          voucherCode,
          discountAmount
        ]
      );
      const orderDbId = orderResult.insertId;

      for (const item of items) {
        await conn.query(
          'INSERT INTO order_items (order_id_fk, name, unit_price, quantity) VALUES (?, ?, ?, ?)',
          [orderDbId, item.name, item.price, item.quantity]
        );
      }

      // Catat pemakaian voucher.
      if (voucherId) {
        await conn.query(
          'UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?',
          [voucherId]
        );
      }

      await conn.commit();
      conn.release();
      conn = null;

      // 6. Buat transaksi Snap — item_details harus berjumlah gross_amount.
      try {
        const itemDetails = items.map((item) => ({
          id: item.name,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }));
        if (shippingCost > 0) {
          itemDetails.push({
            id: 'ONGKIR',
            name: `Ongkos Kirim - ${courier.name}`.substring(0, 50),
            price: shippingCost,
            quantity: 1
          });
        }
        if (discountAmount > 0) {
          itemDetails.push({
            id: 'DISCOUNT',
            name: `Diskon Voucher ${voucherCode}`.substring(0, 50),
            price: -discountAmount,
            quantity: 1
          });
        }

        const snapResult = await midtrans.createSnapTransaction({
          orderId,
          grossAmount,
          items: itemDetails
        });

        await db.query(
          'UPDATE orders SET snap_token = ? WHERE order_id = ?',
          [snapResult.token || null, orderId]
        );

        // Notifikasi Telegram: pesanan baru masuk (menunggu pembayaran).
        await notifyNewOrder({ orderId, grossAmount, customer, courier, address, items });

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
      await conn.rollback();
      if (error.rollback) {
        return res.status(error.status || 400).json({
          success: false,
          message: error.message
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Create charge error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.status ? error.message : 'Gagal memproses permintaan pembayaran'
    });
  } finally {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        // abaikan — koneksi dibersihkan di bawah
      }
      conn.release();
    }
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

const formatMoney = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

/**
 * Kirim notifikasi Telegram saat pesanan baru masuk (menunggu pembayaran).
 * Dipanggil dari createCharge setelah order tersimpan & Snap token dibuat.
 */
const notifyNewOrder = async ({ orderId, grossAmount, customer, courier, address, items }) => {
  try {
    const lines = [
      '🆕 PESANAN BARU',
      `Order: ${orderId}`,
      `Total: ${formatMoney(grossAmount)}`,
      `Customer: ${customer.name || '-'}` +
        (customer.email ? ` (${customer.email})` : ''),
      'Status: menunggu pembayaran'
    ];

    if (items.length > 0) {
      lines.push('', 'Isi pesanan:');
      lines.push(...items.map((item) => `• ${item.name} x${item.quantity}`));
    }

    if (courier) {
      lines.push('', `Kurir: ${courier.name} — ${formatMoney(courier.price_idr)}`);
    }
    if (address?.city) {
      lines.push(`Kirim ke: ${address.city}, ${address.province || ''}`);
    }

    await sendTelegramMessage(lines.join('\n'));
  } catch (error) {
    console.error('Telegram new order notification error:', error);
  }
};

/** Kirim notifikasi Telegram saat pembayaran baru berhasil (paid). */
const notifyPaymentReceived = async (order, payload) => {
  try {
    const [items] = await db.query(
      `SELECT name, quantity FROM order_items
        WHERE order_id_fk = ? ORDER BY id ASC LIMIT 8`,
      [order.id]
    );

    const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

    const lines = [
      '🟢 PEMBAYARAN DITERIMA',
      `Order: ${order.order_id}`,
      `Total: ${money(order.gross_amount)}`,
      `Customer: ${order.customer_name || '-'}` +
        (order.customer_email ? ` (${order.customer_email})` : ''),
      `Metode: ${payload.payment_type || '-'}`
    ];

    if (items.length > 0) {
      lines.push('', 'Isi pesanan:');
      lines.push(...items.map((item) => `• ${item.name} x${item.quantity}`));
      if (items.length === 8) lines.push('…');
    }

    if (order.shipping_city) {
      lines.push('', `Kirim ke: ${order.shipping_city}, ${order.shipping_province || ''}`);
    }

    await sendTelegramMessage(lines.join('\n'));
  } catch (error) {
    console.error('Telegram payment notification error:', error);
  }
};

/**
 * Terapkan payload status Midtrans (dari webhook maupun GET status) ke order:
 * sinkronkan transaction_status/payment_type + order_status, lalu kirim
 * notifikasi Telegram bila pembayaran BARU berhasil (transisi ke paid).
 * Dipakai bersama oleh handleNotification & syncPaymentStatus.
 */
const applyPaymentUpdate = async (order, payload) => {
  const derivedStatus = mapTransactionStatus(payload.transaction_status);

  const updates = ["transaction_status = 'pending'"];
  const params = [];

  if (derivedStatus) {
    updates[0] = 'transaction_status = ?';
    params.push(derivedStatus);
  }
  if (payload.payment_type) {
    updates.push('payment_type = ?');
    params.push(String(payload.payment_type).substring(0, 30));
  }

  const justPaid = derivedStatus === 'paid' && order.transaction_status !== 'paid';
  if (justPaid && order.order_status === 'pending') {
    updates.push("order_status = 'processed'");
  }
  // Batal/kadaluarsa: selaraskan order_status agar tidak tertinggal 'pending'.
  if (derivedStatus === 'cancelled' && order.order_status === 'pending') {
    updates.push("order_status = 'cancelled'");
  }

  params.push(order.order_id);
  await db.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);

  // Hanya saat pembayaran BARU berhasil, supaya webhook yang diulang tidak dobel.
  if (justPaid) {
    await notifyPaymentReceived(order, payload);
  }

  return { derivedStatus, justPaid };
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

    await applyPaymentUpdate(rows[0], body);

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

/**
 * POST /api/payment/sync — tarik status transaksi langsung dari Midtrans.
 * Jaring pengaman bila webhook tidak sampai ke server (mis. pengembangan
 * lokal tanpa URL publik). Admin boleh order mana pun; pelanggan hanya
 * order miliknya sendiri.
 */
const syncPaymentStatus = async (req, res) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId wajib diisi' });
    }

    const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }
    const order = rows[0];

    if (req.user?.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    let statusPayload;
    try {
      statusPayload = await midtrans.getTransactionStatus(orderId);
    } catch (error) {
      if (error.code === 'MIDTRANS_CONFIG') {
        return res.status(500).json({
          success: false,
          message: 'MIDTRANS_SERVER_KEY belum diisi di Backend/.env'
        });
      }
      // Transaksi belum/tidak ada di Midtrans — bukan error fatal.
      if (error.status === 404) {
        return res.json({
          success: true,
          data: {
            orderId,
            transactionStatus: order.transaction_status,
            orderStatus: order.order_status
          }
        });
      }
      throw error;
    }

    // Respons status Midtrans menyertakan signature_key — verifikasi bila ada.
    if (statusPayload.signature_key) {
      const valid = midtrans.verifySignature({
        orderId: statusPayload.order_id || orderId,
        statusCode: statusPayload.status_code,
        grossAmount: statusPayload.gross_amount,
        signatureKey: statusPayload.signature_key
      });
      if (!valid) {
        return res.status(403).json({
          success: false,
          message: 'Signature Midtrans tidak valid'
        });
      }
    }

    await applyPaymentUpdate(order, statusPayload);

    const [updated] = await db.query(
      'SELECT transaction_status, order_status FROM orders WHERE order_id = ?',
      [orderId]
    );

    return res.json({
      success: true,
      data: {
        orderId,
        transactionStatus: updated[0].transaction_status,
        orderStatus: updated[0].order_status
      }
    });
  } catch (error) {
    console.error('Sync payment status error:', error);
    return res.status(502).json({
      success: false,
      message: 'Gagal mengambil status pembayaran dari Midtrans'
    });
  }
};

module.exports = { createCharge, handleNotification, syncPaymentStatus };
