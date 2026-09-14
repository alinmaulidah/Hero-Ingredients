# Company Profile — Indonesia Ingredients

Website company profile + katalog & belanja (Astro) + API & panel admin (Express/MySQL + Midtrans).

## Struktur

```
company-profile/
├── Frontend/           # Astro (statis): website publik + panel admin /admin/*
│   ├── public/         # Aset statis (gambar, styles/products.css)
│   └── src/
│       ├── components/ # Navbar, Footer, home/*
│       ├── data/       # company.ts, products.ts (fallback katalog)
│       ├── layouts/    # Layout.astro (publik), AdminLayout.astro
│       ├── lib/        # catalogData/catalogHtml (render & sinkronisasi katalog),
│       │               #   admin/api.ts (client API + token)
│       ├── pages/      # index, about, products, contact, admin/*
│       └── styles/     # global.css, admin.css
├── Backend/            # Express 5 + MySQL (API REST, JWT, Midtrans)
│   ├── controllers/    # auth, product, order, payment, stats
│   ├── routes/         # definisi route (/api/*)
│   ├── middleware/     # authMiddleware (protect JWT)
│   ├── db/             # schema.sql
│   ├── scripts/        # runSchema, seedAdmin, seedCatalog, simulatePayment
│   ├── utils/          # midtrans.js (Snap + verifikasi signature)
│   └── server.js       # API + (opsional) static serving Frontend
└── package.json        # skrip bantuan
```

## Cara Menjalankan (Pengembangan)

1. MySQL aktif + database dibuat dari `Backend/db/schema.sql`:
   ```sh
   cd Backend
   npm run db:schema
   ```
2. Salin `Backend/.env.example` → `Backend/.env`, isi `JWT_SECRET`
   (min. 32 karakter acak) dan kunci server Midtrans.
3. Buat akun admin:
   ```sh
   npm run seed:admin -- --email admin@example.com --password <rahasia>
   ```
4. Jalankan API:
   ```sh
   cd Backend && npm run dev        # http://localhost:5000
   ```
5. Jalankan website:
   ```sh
   cd Frontend && npm run dev       # http://localhost:4321
   ```
   Buat `Frontend/.env` dari `.env.example`; `PUBLIC_API_BASE=http://localhost:5000`.

## Panel Admin

Buka `http://localhost:4321/admin/` (mode dev) lalu login dengan akun admin.

- **Dashboard** (`/admin/`) — ringkasan produk, pesanan, & pemasukan.
- **Kelola Produk** (`/admin/products/`) — CRUD produk (grup → jenis olahan →
  varian kemasan + harga IDR/USD/AED/EUR). Gambar cukup diisi URL; kosong = placeholder.
- **Pesanan** (`/admin/orders/`) — daftar pesanan, **status pembayaran otomatis
  dari webhook Midtrans**, ubah status pemenuhan (diproses/dikirim/selesai),
  dan banner “pesanan baru dibayar” (polling tiap 20 detik).

Data produk yang diubah di panel admin langsung muncul di halaman publik
`/products` (halaman itu mengambil katalog dari `GET /api/products` saat dibuka,
dengan data statis `src/data/products.ts` sebagai cadangan bila API mati).

> Setup webhook Midtrans: di dashboard Midtrans, arahkan Payment Notification URL
> ke `<base>/api/payment/notification` (endpoint memverifikasi signature key).
> Untuk mengetes tanpa pembayaran sungguhan:
> `cd Backend && npm run simulate:payment -- --order <order_id>`.

## Mode Produksi “Satu Server”

Backend Express dapat menyajikan website publik + `/admin` + `/api` dari satu
port/domain (website & admin ikut ter-deploy bersama API).

1. Build Frontend:
   ```sh
   cd Frontend && npm run build      # hasil di Frontend/dist
   ```
2. Set `PUBLIC_API_BASE=` (kosong) saat build bila akan same-origin,
   atau biarkan kosong — kode memakai API relatif.
3. Jalankan Backend dengan folder dist:
   ```sh
   cd Backend
   SERVE_FRONTEND=../Frontend/dist npm start   # Windows: set SERVE_FRONTEND=..\Frontend\dist
   ```
   Sekarang buka `http://localhost:5000` (website), `/admin/`, dan `/api`.
   Express menangani clean URL Astro (mis. `/admin/products` tanpa slash).

Atau pakai Docker (build dari root repo):
```sh
docker build -f Backend/Dockerfile -t indonesia-ingredients .
docker run -p 8080:8080 --env-file Backend/.env indonesia-ingredients
```

### Deploy ke Coolify (hosting)

Panduan langkah demi langkah (klik demi klik di UI Coolify) ada di
**[`docs/DEPLOY-COOLIFY.md`](docs/DEPLOY-COOLIFY.md)**.

Ringkasnya: buat resource **MySQL** di Coolify, lalu buat **Application** dari
repo GitHub ini dengan:

- **Build Pack**: `Dockerfile`
- **Base Directory**: `/` (root repo — karena Dockerfile membangun Frontend & Backend)
- **Dockerfile Location**: `/Backend/Dockerfile`
- **Ports Exposes**: `8080`
- **Persistent Storage**: mount ke `/app/uploads` (agar gambar upload tidak hilang saat redeploy)

Rahasia (`DB_*`, `JWT_SECRET`, `MIDTRANS_*`, `TELEGRAM_*`, `GOOGLE_CLIENT_ID`)
diisi lewat Environment Variables Coolify, sedangkan nilai `PUBLIC_*` harus
diisi sebagai **Build Variables** (ditanam saat `npm run build`).

Untuk uji lokal sebelum deploy:

```sh
docker compose up --build   # http://localhost:8080
```

### Variabel Lingkungan

| File | Variabel | Keterangan |
|---|---|---|
| `Backend/.env` | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Koneksi MySQL |
| `Backend/.env` | `JWT_SECRET`, `JWT_EXPIRES_IN` | Secret & masa berlaku token admin |
| `Backend/.env` | `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION` | Server key & mode Midtrans |
| `Backend/.env` | `SERVE_FRONTEND` | Path folder `dist` Frontend (aktifkan mode satu server) |
| `Backend/.env` | `PORT` | Port HTTP (default 5000) |
| `Frontend/.env` | `PUBLIC_API_BASE` | Base URL API; **kosongkan** saat same-origin |
| `Frontend/.env` | `PUBLIC_MIDTRANS_CLIENT_KEY` | Client key Midtrans (dikirim ke browser) |
| `Frontend/.env` | `PUBLIC_MIDTRANS_IS_PRODUCTION`, `PUBLIC_GOOGLE_CLIENT_ID` | Mode Midtrans & Client ID Google (ditanam saat build) |
| `Backend/.env` | `GOOGLE_CLIENT_ID` | Client ID Google untuk verifikasi login pelanggan |
| `Backend/.env` | `RUN_MIGRATIONS`, `SEED_CATALOG` | Jalankan `db:schema` / `seed:catalog` otomatis saat container start |
| `Backend/.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Buat/perbarui akun admin otomatis saat container start |

## Script Backend

| Perintah | Fungsi |
|---|---|
| `npm run db:schema` | Buat tabel dari `db/schema.sql` |
| `npm run seed:admin -- --email .. --password ..` | Buat/update akun admin |
| `npm run seed:catalog` | Isi katalog awal (Turmeric) bila DB kosong |
| `npm run simulate:payment -- --order <id>` | Simulasi notifikasi bayar (testing) |
| `npm run db:inspect` | Lihat isi DB |

## Catatan

- Katalog storefront bersifat **live** dari database; `products.ts` adalah
  cadangan statis (HTML awal + saat API mati). Produk baru dari admin tampil
  setelah halaman dibuka tanpa build ulang.
- Halaman katalog belum memakai sistem bilingual `data-lang` (pekerjaan lanjutan).
- Belum ada upload gambar — isi URL gambar saat mengelola produk.
- CORS terbuka untuk kemudahan pengembangan; sebaiknya dikunci saat produksi.
