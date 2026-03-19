# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install ALL deps (including devDependencies — TypeScript compiler needed)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# wget needed for Docker health checks
RUN apk add --no-cache wget

# Install production deps only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Both API (4000) and Yjs WS (3001) ports — actual binding depends on CMD
EXPOSE 4000 3001

# Default: start the REST API.
# The yjs service overrides this with: node dist/yjs-server.js
CMD ["node", "dist/main.js"]
