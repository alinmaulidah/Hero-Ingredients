# ============================================================
# Mode "satu server": build Frontend (Astro) lalu jalankan
# Backend Express yang sekaligus menyajikan website + /admin + /api.
#
# Build dari root repo (konteks berisi Frontend & Backend):
#   docker build -f Backend/Dockerfile -t hero-ingredients .
#
# Jalankan (isi env DB, JWT_SECRET, kunci Midtrans saat run):
#   docker run -p 8080:8080 --env-file Backend/.env hero-ingredients
# ============================================================

# ---------- Stage 1: build Frontend ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

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

COPY Backend/package*.json ./
RUN npm ci --omit=dev

COPY Backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend-dist

EXPOSE 8080

CMD ["node", "server.js"]
