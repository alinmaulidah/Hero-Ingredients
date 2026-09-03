# Company Profile — Hero Ingredients

Website company profile (Astro) + API (Express/MySQL).

## Struktur Folder

```
company-profile/
├── Frontend/          # Proyek Astro (website utama)
│   ├── public/        # Aset statis (favicon, gambar)
│   └── src/
│       ├── components/    # Komponen UI (Navbar, Footer, WhatsAppButton, home/*)
│       ├── data/          # Data terpusat: company.ts, products.ts
│       ├── layouts/       # Layout.astro (kerangka halaman + script global)
│       ├── pages/         # Route: index, about, products, contact, api/*
│       ├── scripts/       # Skrip frontend (mis. logika keranjang produk)
│       └── styles/        # CSS global & per-halaman
├── Backend/           # API Express + MySQL
│   ├── config/        # Koneksi database
│   ├── controllers/   # Logika handler
│   └── routes/        # Definisi route
└── package.json       # Skrip bantuan (dev/build/start)
```

## Menjalankan

### Frontend (Astro)

```sh
npm run dev        # dev server di http://localhost:4321
npm run build      # build produksi ke Frontend/dist/
npm run preview    # pratinjau hasil build
```

### Backend (Express)

```sh
npm run dev:api     # nodemon (perlu MySQL aktif)
npm run start:api   # node server.js
```

Backend membutuhkan MySQL. Buat file `Backend/.env` dari `Backend/.env.example`
jika konfigurasi database berbeda dari default (`localhost/root/` db `magna_ingredients`).

### Docker (Frontend)

```sh
docker build -t company-web ./Frontend
```

## Variabel Lingkungan

| File | Variabel | Keterangan |
|---|---|---|
| `Frontend/.env` | `PUBLIC_MIDTRANS_CLIENT_KEY` | Client key Midtrans (dikirim ke browser) |
| `Frontend/.env` | `MIDTRANS_SERVER_KEY` | Server key Midtrans (hanya di server, untuk API `/api/charge`) |
| `Backend/.env` | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Koneksi MySQL |

## Data Perusahaan

Semua identitas perusahaan (nama brand, kontak, alamat, jam operasional, menu navigasi,
nomor WhatsApp) **terpusat di satu file**: `Frontend/src/data/company.ts`.
Ubah data di sana, dan seluruh halaman (Navbar, Footer, halaman kontak, tombol WhatsApp)
ikut berubah otomatis.

> ⚠️ Beberapa nilai di `company.ts` diberi komentar `// verifikasi:` karena sebelumnya
> tersebar & bertabrakan di banyak file. Periksa sebelum deploy.

## Konvensi Bahasa (i18n)

- Teks yang tampil ke pengguna ditulis dua bahasa memakai atribut
  `data-lang-id` (Indonesia) dan `data-lang-en` (Inggris), dengan teks fallback
  default berbahasa Indonesia.
- Mesin penerjemah ada **satu** di `Frontend/src/layouts/Layout.astro`
  (script inline global, key localStorage `selectedLanguage`).
- Tombol bahasa di Navbar memakai atribut `data-lang="id|en"` agar terdeteksi delegasi global.

## Catatan

- Halaman katalog produk (`products.astro`) saat ini berbahasa Indonesia saja
  (belum memakai sistem `data-lang`). Menerjemahkan penuh katalog adalah pekerjaan lanjutan.
- Endpoint `/api/charge` (Midtrans) ada di `Frontend/src/pages/api/charge.ts`.
