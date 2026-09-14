-- ============================================================
-- Indonesia Ingredients — Schema Backend (Express/MySQL)
-- Idempotent: pakai IF NOT EXISTS, aman dijalankan berulang.
-- Jalankan lewat `npm run db:schema` di folder Backend/.
-- Tabel lama `products` (jika ada) TIDAK disentuh.
-- ============================================================

-- Akun admin (auth JWT)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pesan dari formulir "Kirim Pesan" di halaman kontak publik
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  market ENUM('Lokal','Export') NOT NULL DEFAULT 'Lokal',
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'sudah dibaca/dibalas admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Katalog: grup bahan baku (mirror Frontend/src/data/products.ts, mis. 'Turmeric (Kunyit)')
CREATE TABLE IF NOT EXISTS product_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_groups_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Katalog: opsi olahan dalam satu grup (mis. 'Dry Slice Fine')
CREATE TABLE IF NOT EXISTS product_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id INT UNSIGNED NOT NULL,
  slug VARCHAR(150) NOT NULL,
  name VARCHAR(150) NOT NULL,
  spec VARCHAR(100) NULL,
  grade VARCHAR(50) NULL,
  category VARCHAR(100) NULL,
  image_url VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_options (group_id, slug),
  CONSTRAINT fk_product_options_group
    FOREIGN KEY (group_id) REFERENCES product_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Katalog: varian ukuran + harga 4 mata uang per opsi
CREATE TABLE IF NOT EXISTS product_variants (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_id INT UNSIGNED NOT NULL,
  size VARCHAR(50) NOT NULL,
  price_idr INT NOT NULL DEFAULT 0,
  price_usd DECIMAL(12,2) NULL,
  price_aed DECIMAL(12,2) NULL,
  price_eur DECIMAL(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_variants (option_id, size),
  CONSTRAINT fk_product_variants_option
    FOREIGN KEY (option_id) REFERENCES product_options (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pelanggan storefront (auth JWT terpisah dari tabel admin `users`)
CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Buku alamat pelanggan
CREATE TABLE IF NOT EXISTS customer_addresses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  label VARCHAR(50) NULL COMMENT 'mis. Rumah, Kantor',
  recipient_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_customer_addresses_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Opsi kurir pengiriman + tarif tetap (Rupiah), dikelola admin
CREATE TABLE IF NOT EXISTS shipping_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'mis. JNE Reguler',
  description VARCHAR(255) NULL,
  price_idr INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voucher/diskon checkout (dikelola admin)
CREATE TABLE IF NOT EXISTS vouchers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  type ENUM('percent','nominal') NOT NULL DEFAULT 'percent' COMMENT 'percent = % dari subtotal; nominal = potongan Rupiah tetap',
  value INT NOT NULL COMMENT 'persen (10 = 10%) atau nominal Rupiah sesuai type',
  min_subtotal INT NULL COMMENT 'minimal belanja Rupiah; NULL = tanpa minimal',
  max_uses INT NULL COMMENT 'batas total pemakaian; NULL = tanpa batas',
  used_count INT NOT NULL DEFAULT 0,
  valid_until DATETIME NULL COMMENT 'NULL = tanpa batas waktu',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vouchers_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order transaksi (gross_amount dalam Rupiah = subtotal produk + ongkir - diskon,
-- nilai yang dibayar ke Midtrans)
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id VARCHAR(40) NOT NULL COMMENT 'ID publik Midtrans, format INDONESIA-<timestamp>-<rand>',
  gross_amount INT NOT NULL DEFAULT 0 COMMENT 'subtotal + ongkir - diskon (Rupiah)',
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  customer_id INT UNSIGNED NULL COMMENT 'FK ke customers.id (akun pelanggan)',
  customer_name VARCHAR(150) NULL,
  customer_email VARCHAR(150) NULL,
  customer_phone VARCHAR(30) NULL,
  shipping_name VARCHAR(150) NULL,
  shipping_phone VARCHAR(30) NULL,
  shipping_address VARCHAR(255) NULL,
  shipping_city VARCHAR(100) NULL,
  shipping_province VARCHAR(100) NULL,
  shipping_postal_code VARCHAR(20) NULL,
  shipping_country VARCHAR(100) NULL,
  courier_name VARCHAR(100) NULL,
  shipping_cost INT NULL COMMENT 'ongkir Rupiah',
  voucher_id INT UNSIGNED NULL COMMENT 'FK ke vouchers.id',
  voucher_code VARCHAR(50) NULL,
  discount_amount INT NULL COMMENT 'potongan voucher Rupiah',
  transaction_status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|cancelled|refunded (hasil map webhook)',
  order_status ENUM('pending','processed','shipped','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'status pemenuhan pesanan oleh admin',
  payment_type VARCHAR(30) NULL,
  snap_token VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_id (order_id),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_voucher
    FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snapshot item per order (nama/price disalin saat order dibuat)
CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id_fk INT UNSIGNED NOT NULL COMMENT 'FK ke orders.id',
  name VARCHAR(150) NOT NULL,
  unit_price INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id_fk) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
