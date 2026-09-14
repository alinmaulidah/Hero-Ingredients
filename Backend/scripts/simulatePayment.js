// Simulasi webhook Midtrans: menandai sebuah order sebagai "sudah dibayar"
// lewat jalur resmi /api/payment/notification (signature dihitung sendiri).
// Berguna untuk mengetes dashboard admin tanpa pembayaran sungguhan.
// Jalankan: npm run simulate:payment -- --order INDONESIA-1234-567 [--status settlement]
require('dotenv').config();

const crypto = require('crypto');
const db = require('../config/database');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const STATUS_CODES = {
  settlement: '200',
  capture: '200',
  pending: '201',
  expire: '407',
  cancel: '200',
  deny: '202'
};

async function main() {
  const { order, status } = parseArgs(process.argv.slice(2));

  if (!order) {
    console.error('Usage: npm run simulate:payment -- --order <order_id> [--status settlement|pending|expire|cancel|deny]');
    process.exit(1);
  }

  const transactionStatus = status || 'settlement';
  const statusCode = STATUS_CODES[transactionStatus];
  if (!statusCode) {
    console.error(`Status "${transactionStatus}" tidak dikenal.`);
    process.exit(1);
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error('MIDTRANS_SERVER_KEY belum diatur di Backend/.env');
    process.exit(1);
  }

  const [rows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [order]);
  if (rows.length === 0) {
    console.error(`Order "${order}" tidak ditemukan di database.`);
    process.exit(1);
  }

  const grossAmount = String(rows[0].gross_amount);
  const signatureKey = crypto
    .createHash('sha512')
    .update(`${order}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  const payload = {
    transaction_status: transactionStatus,
    order_id: order,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    payment_type: transactionStatus === 'settlement' ? 'bank_transfer' : 'credit_card',
    fraud_status: transactionStatus === 'settlement' ? 'accept' : 'accept'
  };

  const base = `http://localhost:${process.env.PORT || 5000}`;
  console.log(`Mengirim notifikasi "${transactionStatus}" untuk ${order} (gross ${grossAmount})…`);

  const res = await fetch(`${base}/api/payment/notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  console.log(`HTTP ${res.status}:`, JSON.stringify(data, null, 2));
}

main()
  .catch((error) => {
    console.error('Simulasi gagal:', error.message);
    process.exit(1);
  })
  .finally(() => db.end());
