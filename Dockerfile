# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY apps/api/package*.json ./

# Install all dependencies (including TypeScript devDependencies)
RUN npm ci

# Copy application source code
COPY apps/api/ ./

# Compile TypeScript to dist/
RUN npm run build

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY apps/api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output and runtime assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

# Default port for API
EXPOSE 3000

# Default entry point runs the HTTP API server.
# For ECS Worker service, override container command to: ["node", "dist/worker.js"]
CMD ["node", "dist/index.js"]

