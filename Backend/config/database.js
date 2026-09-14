// Konfigurasi koneksi MySQL.
// Nilai default dipakai bila Backend/.env tidak ada atau kosong.
require('dotenv').config();

const pool = require('mysql2/promise').createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'magna_ingredients',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const DB_TARGET = `${process.env.DB_HOST || 'localhost'}:${Number(process.env.DB_PORT) || 3306}`;

pool.getConnection()
  .then(connection => {
    console.log(`MySQL berhasil terhubung (${DB_TARGET})`);
    connection.release();
  })
  .catch(error => {
    // AggregateError (mis. gagal DNS) kadang punya message kosong.
    const detail = error.message || error.code || error.errors?.[0]?.message || String(error);
    console.error(`MySQL gagal terhubung (${DB_TARGET}):`, detail);
  });

module.exports = pool;
