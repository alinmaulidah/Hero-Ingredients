// Membuat/memperbarui akun admin pertama.
// Jalankan: npm run seed:admin -- --email admin@example.com --password rahasia [--name Admin]
require('dotenv').config();

const bcrypt = require('bcryptjs');
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

async function main() {
  const { email, password, name } = parseArgs(process.argv.slice(2));

  if (!email || !password) {
    console.error('Usage: npm run seed:admin -- --email <email> --password <password> [--name <name>]');
    process.exit(1);
  }
  if (String(password).length < 6) {
    console.error('Password minimal 6 karakter.');
    process.exit(1);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(password), 10);
  const adminName = name || 'Administrator';

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

  if (existing.length > 0) {
    await db.query(
      'UPDATE users SET name = ?, password_hash = ? WHERE email = ?',
      [adminName, passwordHash, normalizedEmail]
    );
    console.log(`Akun admin "${normalizedEmail}" sudah ada — password & nama diperbarui.`);
  } else {
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [adminName, normalizedEmail, passwordHash, 'admin']
    );
    console.log(`Akun admin "${normalizedEmail}" berhasil dibuat.`);
  }
}

main()
  .catch((error) => {
    console.error('Gagal membuat akun admin:', error.message);
    process.exit(1);
  })
  .finally(() => db.end());
