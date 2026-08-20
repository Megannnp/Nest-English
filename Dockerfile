# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM m.daocloud.io/docker.io/library/node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM m.daocloud.io/docker.io/library/node:20-alpine AS production
WORKDIR /app/server

# Install server dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev --registry=https://registry.npmmirror.com

COPY server/ ./
COPY shared/ /app/shared/
COPY client/src/ /app/client/src/

# Copy built client assets for static serving
COPY --from=client-builder /app/client/dist /app/client/dist

# Non-root user for security
RUN addgroup -S nest && adduser -S nest -G nest
RUN mkdir -p /app/server/runtime/tts && chown -R nest:nest /app/server/runtime
USER nest

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
