# ============================================================
# Mode "satu server": build Frontend (Astro) lalu jalankan
# Backend Express yang sekaligus menyajikan website + /admin + /api.
#
# Build dari root repo (konteks berisi Frontend & Backend):
#   docker build -f Backend/Dockerfile -t hero-ingredients .
#
# Jalankan (isi env DB, JWT_SECRET, kunci Midtrans saat run):
#   docker run -p 8080:8080 --env-file Backend/.env hero-ingredients
#
# Catatan Coolify: variabel PUBLIC_* di bawah harus diisi sebagai
# "Build Arguments", bukan hanya Environment Variables, karena Astro
# menanam nilainya ke HTML/JS saat proses build.
# ============================================================

# ---------- Stage 1: build Frontend ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# PUBLIC_API_BASE dikosongkan agar API dipanggil same-origin (/api/...).
ARG PUBLIC_API_BASE=""
ARG PUBLIC_MIDTRANS_CLIENT_KEY=""
ARG PUBLIC_MIDTRANS_IS_PRODUCTION=""
ARG PUBLIC_GOOGLE_CLIENT_ID=""

ENV PUBLIC_API_BASE=$PUBLIC_API_BASE
ENV PUBLIC_MIDTRANS_CLIENT_KEY=$PUBLIC_MIDTRANS_CLIENT_KEY
ENV PUBLIC_MIDTRANS_IS_PRODUCTION=$PUBLIC_MIDTRANS_IS_PRODUCTION
ENV PUBLIC_GOOGLE_CLIENT_ID=$PUBLIC_GOOGLE_CLIENT_ID

COPY Frontend/package*.json ./
RUN npm ci

COPY Frontend/ ./
RUN npm run build

# ---------- Stage 2: runtime Backend ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV SERVE_FRONTEND=/app/frontend-dist
ENV PORT=8080
# Default aman: migrasi/seed otomatis hanya bila diaktifkan lewat env
# (Coolify: set RUN_MIGRATIONS=true pada deploy pertama).
ENV RUN_MIGRATIONS=false

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend-dist

# Gambar hasil upload admin disimpan di sini — pasang volume persisten
# (Coolify: Persistent Storage → /app/uploads) agar tidak hilang saat redeploy.
RUN mkdir -p /app/uploads && chmod +x ./docker-entrypoint.sh

EXPOSE 8080

# Health check: endpoint /api membalas {"success":true,...}
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api || exit 1

CMD ["sh", "docker-entrypoint.sh"]
