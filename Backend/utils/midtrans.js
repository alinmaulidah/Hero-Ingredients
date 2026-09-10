const crypto = require('crypto');

const getServerKey = () => process.env.MIDTRANS_SERVER_KEY || '';

const isProduction = () => {
  if (process.env.MIDTRANS_IS_PRODUCTION === 'true') return true;
  if (process.env.MIDTRANS_IS_PRODUCTION === 'false') return false;
  // SB-Mid-server-* => sandbox; Mid-server-* => production
  return getServerKey().startsWith('Mid-server-');
};

const midtransApiBase = () =>
  isProduction() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';

const snapTransactionsUrl = () => `${midtransApiBase()}/snap/v1/transactions`;

const basicAuthHeader = () =>
  'Basic ' + Buffer.from(`${getServerKey()}:`).toString('base64');

const formatItems = (items) =>
  items.map((item) => ({
    id: String(item.id ?? 'item'),
    price: Math.round(Number(item.price)),
    quantity: Math.round(Number(item.quantity)),
    name: String(item.name).substring(0, 50)
  }));

/**
 * Buat transaksi Snap Midtrans. Mengembalikan respons mentah Midtrans
 * ({ token, redirect_url, ... }). Melempar Error bila gagal.
 */
const createSnapTransaction = async ({ orderId, grossAmount, items }) => {
  const serverKey = getServerKey();
  if (!serverKey) {
    const error = new Error('MIDTRANS_SERVER_KEY belum diisi di Backend/.env');
    error.code = 'MIDTRANS_CONFIG';
    throw error;
  }

  const response = await fetch(snapTransactionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': basicAuthHeader()
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: String(orderId),
        gross_amount: Math.round(Number(grossAmount))
      },
      item_details: formatItems(items)
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error_messages?.[0] || data?.message || `Midtrans API error (${response.status})`
    );
    error.code = 'MIDTRANS_API';
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

/**
 * Ambil status transaksi langsung dari Midtrans (GET /v2/{order_id}/status).
 * Dipakai sebagai jaring pengaman bila webhook tidak sampai ke server
 * (mis. saat pengembangan lokal tanpa URL publik). Melempar Error bila gagal;
 * error.status = 404 berarti transaksi belum/tidak ada di Midtrans.
 */
const getTransactionStatus = async (orderId) => {
  const serverKey = getServerKey();
  if (!serverKey) {
    const error = new Error('MIDTRANS_SERVER_KEY belum diisi di Backend/.env');
    error.code = 'MIDTRANS_CONFIG';
    throw error;
  }

  const response = await fetch(
    `${midtransApiBase()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: basicAuthHeader()
      }
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.status_message || `Midtrans status error (${response.status})`
    );
    error.code = 'MIDTRANS_API';
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

/**
 * Verifikasi signature webhook Midtrans:
 * sha512(order_id + status_code + gross_amount + server_key)
 */
const verifySignature = ({ orderId, statusCode, grossAmount, signatureKey }) => {
  const expected = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${getServerKey()}`)
    .digest('hex');

  const actual = Buffer.from(String(signatureKey || ''));
  const expectedBuffer = Buffer.from(expected);

  return (
    actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actual, expectedBuffer)
  );
};

module.exports = {
  isProduction,
  createSnapTransaction,
  getTransactionStatus,
  verifySignature
};
