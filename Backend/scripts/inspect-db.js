// Inspeksi read-only: daftar tabel + kolom + jumlah baris di database.
// Jalankan: npm run db:inspect
require('dotenv').config();

const mysql = require('mysql2/promise');

async function main() {
  const dbName = process.env.DB_NAME || 'magna_ingredients';

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
    database: dbName
  });

  const [tables] = await conn.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY table_name`,
    [dbName]
  );

  if (tables.length === 0) {
    console.log(`Database "${dbName}" ada tetapi belum punya tabel.`);
    await conn.end();
    return;
  }

  for (const { TABLE_NAME: table } of tables) {
    const [columns] = await conn.query(
      `SELECT column_name, column_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position`,
      [dbName, table]
    );

    let count = null;
    try {
      const [rows] = await conn.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
      count = rows[0].total;
    } catch {
      count = '?';
    }

    console.log(`\n== ${table} (${count} baris) ==`);
    for (const col of columns) {
      console.log(
        `  ${col.COLUMN_NAME}  ${col.COLUMN_TYPE}${col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''}`
      );
    }
  }

  await conn.end();
}

main().catch((error) => {
  console.error('Gagal menginspeksi database:', error.message);
  process.exit(1);
});
