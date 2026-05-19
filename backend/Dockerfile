# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install

# ---- Builder ----
FROM deps AS builder
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S app -u 1001

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder --chown=app:nodejs /app/dist ./dist

USER app

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
