FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm install -g typescript && tsc

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database
RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/flowledger.db

CMD ["node", "dist/index.js"]
