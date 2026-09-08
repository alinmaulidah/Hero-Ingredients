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

  console.log(`Schema berhasil diterapkan ke database "${dbName}".`);
  await conn.end();
}

main().catch((error) => {
  console.error('Gagal menerapkan schema:', error.message);
  process.exit(1);
});
