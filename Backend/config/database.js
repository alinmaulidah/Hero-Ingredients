const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'magna_ingredients',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log('MySQL berhasil terhubung');
    connection.release();
  })
  .catch(error => {
    console.error('MySQL gagal terhubung:', error.message);
  });

module.exports = pool;