// Menerapkan db/schema.sql ke MySQL (membuat database bila belum ada).
// Jalankan: npm run db:schema
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const dbName = process.env.DB_NAME || 'magna_ingredients';
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${dbName}\``);
  await conn.query(sql);

  // Migrasi idempoten untuk DB lama: tabel `orders` yang sudah ada tidak
  // diubah oleh CREATE TABLE IF NOT EXISTS, jadi pastikan kolom & FK baru
  // (checkout: alamat, ongkir, voucher, customer_id) tersedia.
  await ensureOrdersColumns(conn);
  await ensureOrdersForeignKeys(conn);
  await ensureContactMessagesColumns(conn);

  console.log(`Schema berhasil diterapkan ke database "${dbName}".`);
  await conn.end();
}

/** Tambahkan kolom yang belum ada pada tabel `contact_messages`. */
async function ensureContactMessagesColumns(conn) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages'`
  );
  if (tables.length === 0) return; // tabel dibuat fresh oleh schema.sql

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages'`
  );
  const existing = new Set(cols.map((row) => row.COLUMN_NAME));

  if (!existing.has('is_read')) {
    try {
      await conn.query(
        "ALTER TABLE contact_messages ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'sudah dibaca/dibalas admin'"
      );
      console.log('  + kolom contact_messages.is_read');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}

/** Tambahkan kolom yang belum ada pada tabel `orders` (aman dijalankan ulang). */
async function ensureOrdersColumns(conn) {
  const table = 'orders';
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  const existing = new Set(cols.map((row) => row.COLUMN_NAME));

  const additions = [
    ['customer_id', 'INT UNSIGNED NULL'],
    ['shipping_name', "VARCHAR(150) NULL"],
    ['shipping_phone', "VARCHAR(30) NULL"],
    ['shipping_address', "VARCHAR(255) NULL"],
    ['shipping_city', "VARCHAR(100) NULL"],
    ['shipping_province', "VARCHAR(100) NULL"],
    ['shipping_postal_code', "VARCHAR(20) NULL"],
    ['shipping_country', "VARCHAR(100) NULL"],
    ['courier_name', "VARCHAR(100) NULL"],
    ['shipping_cost', 'INT NULL'],
    ['voucher_id', 'INT UNSIGNED NULL'],
    ['voucher_code', "VARCHAR(50) NULL"],
    ['discount_amount', 'INT NULL']
  ];

  for (const [name, definition] of additions) {
    if (existing.has(name)) continue;
    try {
      await conn.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      console.log(`  + kolom orders.${name}`);
    } catch (error) {
      // 1060 = ER_DUP_FIELDNAME — kolom keburu dibuat (mis. oleh instance lain).
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}

/** Tambahkan FK baru yang belum ada pada tabel `orders`. */
async function ensureOrdersForeignKeys(conn) {
  const [constraints] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
  );
  const existing = new Set(constraints.map((row) => row.CONSTRAINT_NAME));

  const fks = [
    {
      name: 'fk_orders_customer',
      sql:
        'ALTER TABLE orders ADD CONSTRAINT fk_orders_customer ' +
        'FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL'
    },
    {
      name: 'fk_orders_voucher',
      sql:
        'ALTER TABLE orders ADD CONSTRAINT fk_orders_voucher ' +
        'FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE SET NULL'
    }
  ];

  for (const fk of fks) {
    if (existing.has(fk.name)) continue;
    try {
      await conn.query(fk.sql);
      console.log(`  + FK orders.${fk.name}`);
    } catch (error) {
      // 1061 = ER_DUP_KEYNAME — constraint keburu dibuat oleh instance lain.
      if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
  }
}

main().catch((error) => {
  console.error('Gagal menerapkan schema:', error.message);
  process.exit(1);
});
