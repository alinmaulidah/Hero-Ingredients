# Panduan Deploy ke Coolify — Indonesia Ingredients

Panduan ini untuk **deploy pertama** website Indonesia Ingredients ke Coolify
(server self-hosted). Pola yang dipakai adalah **satu container**:
`Backend/Dockerfile` membangun Frontend Astro lalu menjalankannya lewat
Express, sehingga website, panel `/admin`, dan `/api` berada di **satu domain**
(port `8080`). Tidak perlu atur CORS atau URL API terpisah.

Ikuti berurutan. Tiap langkah ditulis dengan nama tombol/menu di UI Coolify.

---

## 0. Prasyarat

- Akun Coolify sudah bisa login dan server-nya sudah terhubung (Server → Connected).
- Kode sudah ada di GitHub: `https://github.com/alinmaulidah/Hero-Ingredients`
  (branch `main`). Pastikan perubahan terbaru sudah di-`git push`.
- Domain sudah diarahkan ke IP server Coolify (A record), mis. `indonesiaingredient.com`.
- Punya kunci Midtrans (server key + client key) dan opsional Google Client ID.

> **Yang TIDAK perlu**: isi file `.env` di repo. File `.env` tidak ikut ter-upload
> ke git; semua rahasia diisi lewat UI Coolify (langkah 4).

---

## 1. Buat Project

1. Login Coolify.
2. Menu kiri **Projects** → klik **+ Add**.
3. Isi **Name**: `Indonesia Ingredients` → **Create**.

Semua resource (database + aplikasi) dibuat di dalam project ini.

---

## 2. Buat Database MySQL

1. Masuk ke project `Indonesia Ingredients`.
2. Klik **+ New** (kanan atas) → pilih **Database** → **MySQL**.
3. Isi:
   - **Name**: `indonesia-mysql`
   - **Server**: pilih server Coolify milikmu
4. Klik **Create**.
5. Setelah terbuka, buka tab **General** (atau **Configuration**), lalu isi:
   - **MySQL Database**: `magna_ingredients`
   - **MySQL User**: `hero`
   - **MySQL Password**: klik ikon dadu/generate, **salin dan simpan** passwordnya
   - **MySQL Root Password**: generate, simpan juga
6. Klik **Save** lalu **Start** (atau **Deploy**). Tunggu statusnya **Running/Healthy**.
7. Catat 3 hal dari halaman ini untuk langkah 4 nanti:
   - **Internal Hostname** (contoh: `indonesia-mysql-abc123`) → jadi nilai `DB_HOST`
   - **MySQL User** → `hero`
   - **MySQL Password** → password yang tadi digenerate
   - Port internal selalu `3306`

> **Kunci aksesnya**: aplikasi dan database berada di jaringan internal Docker
> Coolify, jadi `DB_HOST` **bukan** `localhost` dan **bukan** IP publik — pakai
> **Internal Hostname** yang tertulis di halaman database.

---

## 3. Buat Application dari GitHub

1. Masih di project yang sama → klik **+ New** → **Application**.
2. Pilih **Public Repository** (repo ini publik). Untuk repo privat, pilih
   **Private Repository (GitHub App)** lalu sambungkan GitHub dulu.
3. Isi:
   - **Repository URL**: `https://github.com/alinmaulidah/Hero-Ingredients`
   - **Branch**: `main`
4. Klik **Continue / Create**.
5. Buka tab **Configuration** → bagian **Build**:
   - **Build Pack**: `Dockerfile`
   - **Base Directory**: `/`  ← **WAJIB slash saja.** Dockerfile membangun
     Frontend dan Backend sekaligus, jadi konteks build harus **root repo**.
     Kalau diisi `/Backend`, build akan gagal ("Frontend/ not found").
   - **Dockerfile Location**: `/Backend/Dockerfile`
6. Buka bagian **Network**:
   - **Ports Exposes**: `8080`  ← port yang dipakai Express (sudah di-set di image).
7. **Jangan deploy dulu** — selesaikan langkah 4–6 di bawah.

---

## 4. Isi Environment Variables (rahasia & konfigurasi runtime)

Masih di halaman Application → tab **Environment Variables**.
Klik **+ Add** untuk tiap baris di bawah. Isi kolom **Key** dan **Value**.

**Wajib:**

| Key | Value | Keterangan |
|---|---|---|
| `DB_HOST` | Internal Hostname dari langkah 2 (mis. `indonesia-mysql-abc123`) | Jangan `localhost` |
| `DB_PORT` | `3306` | |
| `DB_USER` | `hero` | dari langkah 2 |
| `DB_PASSWORD` | password MySQL dari langkah 2 | |
| `DB_NAME` | `magna_ingredients` | |
| `JWT_SECRET` | string acak min. 32 karakter | cara membuat: lihat kotak di bawah |
| `PORT` | `8080` | **harus sama dengan "Ports Exposes"** (langkah 3) |

Membuat `JWT_SECRET` acak — jalankan di komputer (butuh Node.js):

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Midtrans (pembayaran):**

| Key | Value | Keterangan |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | `Mid-server-...` (produksi) atau `SB-Mid-server-...` (sandbox) | rahasia, jangan dibagikan |
| `MIDTRANS_IS_PRODUCTION` | `true` atau `false` | **wajib isi manual**, jangan andalkan awalannya |

**Telegram (notifikasi pembayaran, opsional):**

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token bot dari @BotFather |
| `TELEGRAM_CHAT_ID` | id chat/group penerima |

**Login Google (opsional):**

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID OAuth dari Google Cloud Console |

**Migrasi & akun admin otomatis (deploy pertama):**

| Key | Value | Keterangan |
|---|---|---|
| `RUN_MIGRATIONS` | `true` | menjalankan `db:schema` saat container start (aman diulang) |
| `SEED_CATALOG` | `true` | mengisi katalog awal bila DB masih kosong |
| `ADMIN_EMAIL` | email admin, mis. `admin@indonesiaingredient.com` | |
| `ADMIN_PASSWORD` | password admin (min. 6 karakter) | |
| `ADMIN_NAME` | `Administrator` | opsional |

Jangan lupa klik **Save** setelah menambahkan variabel.

> `SERVE_FRONTEND=/app/frontend-dist` dan `PORT=8080` sudah ditanam di image
> (lihat `Backend/Dockerfile`), jadi tidak perlu diisi lagi.

---

## 5. Isi Build Variables (nilai yang ditanam saat build Frontend)

Astro menanam variabel `PUBLIC_*` **saat proses build**, bukan saat runtime.
Karena itu nilai-nilai ini harus diisi di bagian **Build Variables**
(umumnya di tab **Configuration** → bagian **Build**, atau tombol
**Build Variables**), **bukan** di Environment Variables biasa.

| Key | Value | Keterangan |
|---|---|---|
| `PUBLIC_API_BASE` | *(kosongkan)* | kosong = API same-origin (`/api/...`) |
| `PUBLIC_MIDTRANS_CLIENT_KEY` | `Mid-client-...` (produksi) | client key Midtrans, aman tampil di browser |
| `PUBLIC_MIDTRANS_IS_PRODUCTION` | `true` atau `false` | samakan dengan `MIDTRANS_IS_PRODUCTION` |
| `PUBLIC_GOOGLE_CLIENT_ID` | Client ID Google | samakan dengan `GOOGLE_CLIENT_ID`; kosong = tombol Google disembunyikan |

Klik **Save**.

---

## 6. Persistent Storage + Health Check

**Storage untuk gambar upload produk:**

1. Masih di halaman Application → tab **Storages** (atau **Persistent Storage**).
2. Klik **+ Add** / **Add Volume**.
3. Isi **Destination Path**: `/app/uploads` → **Save**.
   Volume boleh tanpa Name (Docker volume otomatis) atau diisi `indonesia-uploads`.

Tanpa langkah ini, gambar produk yang diunggah dari panel admin **akan hilang**
setiap kali redeploy.

**Health check (opsional, dianjurkan):**

1. Tab **Health Checks** → aktifkan **Health Check Enabled**.
2. **Path**: `/api`
3. **Port**: `8080`
4. **Scheme**: `http` → **Save**.

Image sudah punya `HEALTHCHECK` sendiri yang memanggil `/api`, jadi langkah ini
sekadar cadangan bila ingin dipantau Coolify.

---

## 7. Set Domain & HTTPS

1. Tab **Domains** (atau **Configuration → Domains**).
2. Isi **Domain**: `https://indonesiaingredient.com` (sesuaikan domainmu).
   Tambahkan `www` juga bila perlu: `https://www.indonesiaingredient.com`.
3. Pastikan **Port** domain = `8080`.
4. Aktifkan **HTTPS / Let's Encrypt** (biasanya sudah aktif default) → **Save**.
5. Sertifikat SSL dibuat otomatis oleh Coolify/Traefik setelah deploy.

---

## 8. Deploy

1. Klik **Deploy** (kanan atas).
2. Buka tab **Logs / Deployments**, tunggu sampai selesai. Tanda berhasil:
   - Tahap build: `RUN npm run build` selesai tanpa error (Astro build).
   - Tahap run: muncul `MySQL berhasil terhubung`, `Schema berhasil diterapkan`,
     lalu `Backend running at http://localhost:8080`.
   - Status deployment: **Running/Healthy**.
3. Bila gagal, lihat bagian **Troubleshooting** di bawah.

---

## 9. Cek Setelah Deploy

Buka di browser:

1. `https://<domain>/` → halaman utama tampil.
2. `https://<domain>/api` → harus muncul
   `{"success":true,"message":"Indonesia Ingredients API is running"}`.
3. `https://<domain>/products` → katalog tampil (datanya dari database).
4. `https://<domain>/admin/login` → login pakai `ADMIN_EMAIL` + `ADMIN_PASSWORD`
   dari langkah 4.
5. Di panel admin, coba **unggah gambar produk**, lalu lakukan **Redeploy** dan
   pastikan gambar masih ada (membuktikan volume `/app/uploads` benar).
6. Buka DevTools → tab **Network** di `/products`: request harus menuju
   `/api/products` (relatif, tanpa `localhost:5000`). Ini menandakan
   `PUBLIC_API_BASE` sudah kosong dengan benar.

**Setelah semuanya lancar**, kamu boleh mengubah `RUN_MIGRATIONS` dan
`SEED_CATALOG` menjadi `false` dan mengosongkan `ADMIN_PASSWORD` agar tidak
menyimpan password admin di env (akun admin tetap ada di database).

---

## 10. Sambungkan Layanan Eksternal

**Midtrans — URL notifikasi pembayaran:**

1. Login dashboard Midtrans → **Settings → Configuration**.
2. Isi **Payment Notification URL**:
   `https://<domain>/api/payment/notification`
   (endpoint ini memverifikasi signature key — biarkan publik).
3. Isi juga **Finish Redirect URL** bila diminta, mis. `https://<domain>/checkout`.
4. Pastikan **server key** dan **client key** di Midtrans sama-sama mode
   produksi (atau sama-sama sandbox) seperti di langkah 4.

**Google OAuth:**

1. Google Cloud Console → **APIs & Services → Credentials** → buka OAuth 2.0
   Client ID milikmu.
2. Tambahkan **Authorized JavaScript origins**: `https://<domain>`.
3. Simpan. Nilai Client ID harus sama dengan `GOOGLE_CLIENT_ID` (backend) dan
   `PUBLIC_GOOGLE_CLIENT_ID` (build variable).

---

## 11. Update / Redeploy Berikutnya

- Setiap `git push` ke branch `main`, klik **Deploy** (atau aktifkan
  **Auto Deploy** di tab **Webhooks** agar otomatis).
- Karena `PUBLIC_*` ditanam saat build, **mengubah nilai Midtrans/Google
  memerlukan Deploy ulang** (bukan sekadar restart).
- Rollback: tab **Deployments** → pilih deployment lama → **Redeploy**.
- Backup database: halaman resource MySQL → tab **Backups** → aktifkan
  **Scheduled Backups** ke S3 (atau jalankan manual).
- Rotasi rahasia: ganti nilai di tab Environment Variables → **Save** →
  **Restart** container.

---

## Troubleshooting

**Build gagal: `COPY Frontend/... not found`**
→ **Base Directory** belum `/`. Ubah ke `/` (langkah 3).

**Build gagal: `Cannot find native binding` / `rolldown-binding.wasi.cjs` pada `RUN npm run build`**
→ `package-lock.json` Frontend dibuat di Windows sehingga binding native Linux
(rolldown, lightningcss) tidak tercatat di dalamnya; `npm ci` hanya mengikuti
lockfile jadi binding-nya tidak terpasang. Dockerfile sudah menangani ini dengan
resolve ulang di dalam image Linux (`rm -f package-lock.json && npm install`).
Pastikan perubahan Dockerfile ini sudah ter-push, lalu **Deploy** ulang.

**Deploy sukses tapi situs menampilkan 502 / Bad Gateway**
→ Port salah. Pastikan **Ports Exposes = 8080** dan **Domain Port = 8080**.

**Healthcheck gagal: `wget: can't connect to remote host (127.0.0.1): Connection refused`**
→ Aplikasi dan healthcheck memakai port berbeda (mis. app di `80`, healthcheck di
`8080`) sehingga Coolify menandai container *unhealthy* dan mengembalikan versi lama.
`HEALTHCHECK` di Dockerfile sudah mengikuti `$PORT`, jadi cukup pastikan nilai
**`PORT`** (Environment Variables) **sama** dengan **Ports Exposes** — ubah salah
satunya agar cocok, lalu **Deploy** ulang.

**Log: `MySQL gagal terhubung (host:port)`**
→ `DB_HOST` masih `localhost` atau bukan hostname database yang benar. Isi dengan
**Internal Hostname** dari resource MySQL (halaman database → bagian Connection /
General). Pastikan juga `DB_PORT=3306`, serta `DB_NAME`/`DB_USER`/`DB_PASSWORD`
sama dengan yang tertulis di halaman itu, dan database berstatus Running.

**Log: `Access denied for user 'hero'`**
→ `DB_USER`/`DB_PASSWORD` tidak cocok dengan yang ada di halaman database.
Salin ulang, lalu **Restart**.

**Schema/seed tidak jalan**
→ `RUN_MIGRATIONS` belum `true`, atau kontainer app naik sebelum MySQL siap.
Entrypoint sudah melakukan percobaan ulang sampai 20x; cukup **Redeploy**.
Atau jalankan manual dari tab **Terminal** container app:
```sh
npm run db:schema
npm run seed:admin -- --email admin@domain.com --password <rahasia>
npm run seed:catalog
```

**Gambar upload hilang setelah redeploy**
→ Persistent Storage `/app/uploads` belum dibuat (langkah 6).

**Tombol "Masuk dengan Google" tidak muncul / checkout error Midtrans**
→ Build Variables `PUBLIC_*` kosong, atau nilainya diubah tanpa Deploy ulang
(langkah 5).

**Katalog tampil tapi kosong**
→ Jalankan `npm run seed:catalog` (atau set `SEED_CATALOG=true`) lalu Redeploy.
