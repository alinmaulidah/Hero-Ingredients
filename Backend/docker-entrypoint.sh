#!/bin/sh
# Entrypoint container: menjalankan migrasi/seed opsional lalu menyalakan server.
# Semua langkah di bawah idempoten, jadi aman dijalankan ulang setiap deploy.
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "== Menerapkan skema database =="
  attempt=1
  until node scripts/runSchema.js; do
    if [ "$attempt" -ge 20 ]; then
      echo "Skema gagal diterapkan setelah 20 percobaan - server tetap dinyalakan."
      break
    fi
    echo "Database belum siap, coba lagi ($attempt/20)..."
    attempt=$((attempt + 1))
    sleep 3
  done
fi

if [ "$SEED_CATALOG" = "true" ]; then
  echo "== Mengisi katalog awal =="
  node scripts/seedCatalog.js || echo "Seed katalog dilewati."
fi

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "== Membuat/memperbarui akun admin =="
  node scripts/seedAdmin.js \
    --email "$ADMIN_EMAIL" \
    --password "$ADMIN_PASSWORD" \
    --name "${ADMIN_NAME:-Administrator}" || echo "Seed admin dilewati."
fi

exec node server.js
