# Catatan Arsitektur — Status Saat Ini

## Yang sudah berjalan (perubahan terakhir)

- **Backend**: Express 5 + MySQL. Endpoint `/api/charge`, webhook
  `/api/payment/notification` (verifikasi signature Midtrans), CRUD produk
  3 tingkat (grup → opsi → varian), order, auth JWT admin, dan `/api/stats`
  untuk dashboard. Katalog fallback bisa di-seed via `npm run seed:catalog`.
- **Frontend Astro**: katalog `/products` kini mengambil data live dari
  `GET /api/products` saat halaman dibuka (data `products.ts` jadi cadangan
  statis). CSS produk dipindah ke `public/styles/products.css`.
- **Panel admin** (`/admin/*`) dibangun di project Astro yang sama:
  - `/admin/login` — login JWT (token di localStorage)
  - `/admin/` — dashboard (statistik + pesanan terbaru)
  - `/admin/products/` — CRUD produk lengkap dari UI
  - `/admin/orders/` — pesanan + status bayar (auto dari webhook) + polling
    notifikasi pembayaran baru
- **Mode produksi satu server**: Express menyajikan hasil build Frontend
  (`SERVE_FRONTEND=../Frontend/dist`) — website, `/admin`, `/api` satu domain.
  Ada `Backend/Dockerfile` untuk build sekaligus.

## Catatan untuk pengembangan berikutnya

- Upload gambar produk (sekarang admin cukup isi URL gambar).
- Kunci CORS ke origin tertentu saat produksi.
- Notifikasi real-time via SSE/WebSocket bila polling 20 detik dirasa kurang.
- Terjemahan katalog (data-lang) di halaman `/products`.
- Snapshot `products.ts` bisa disinkronkan dari DB (script) agar konten statis
  awal (SEO) tidak tertinggal dari data admin.
