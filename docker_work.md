# Docker Workflow — How It Works & Why It Is Better

**Context:** This document explains the Docker architecture of this project and why it is designed the way it is. It is written so you can reuse the same pattern in other projects and understand exactly what problem each decision solves.

**Pain this solves:** The "classic" Docker workflow (build every time, fight with hot reload, race conditions between services, broken DB states, port conflicts) wastes time at every coding session. This setup removes all of that friction.

---

## 1. The Core Philosophy

There are three rules that make this setup reliable:

1. **Build once, code forever.** Your local code is mounted inside the container as a volume. The container reads your live files. You only rebuild when dependencies change.
2. **Services wait for each other.** No more "backend crashed because MySQL was not ready yet." Healthchecks enforce the correct startup order.
3. **One front door.** Nginx is the only service you browse to. It proxies `/api/*` to the backend and everything else to the frontend. You never think about ports again.

---

## 2. The Classic Docker Problems & How This Fixes Them

| Classic Problem | Why It Happens | How This Setup Fixes It |
|-----------------|----------------|--------------------------|
| **Constant rebuilding** | Every code change requires `docker-compose up --build` | `volumes: ["./backend:/app"]` mounts your code. Nodemon / Next.js dev server see changes instantly. |
| **Port conflicts** | Backend, frontend, MySQL all fight for ports on your machine. On Windows, Hyper-V can *reserve* port ranges (e.g. `3996–4095`) making them completely unavailable to Docker. | Only Nginx exposes port `80`. The backend host port is mapped to `8080` (not `4000`) to avoid Hyper-V reserved ranges. Always check `netsh interface ipv4 show excludedportrange` on Windows before picking a port. |
| **DB not ready → backend crashes** | Docker starts containers in parallel. Backend tries to connect before MySQL is accepting connections. | `depends_on` with `condition: service_healthy`. The backend waits until MySQL passes its healthcheck. |
| **Lost data after `docker-compose down`** | Using `down -v` accidentally deletes the MySQL volume permanently. All departments, messages, and user-created data is gone. | Named volume `mysql_data` persists across normal stops (`docker-compose down`). Only `down -v` wipes it. **Never use `-v` unless you want a clean slate.** |
| **Hot reload broken inside Docker** | Containers bind to `localhost` (127.0.0.1) inside the container, unreachable from outside. | Next.js binds to `0.0.0.0` explicitly (`-H 0.0.0.0`). Nodemon does not bind at all — it uses Express defaults which work fine. |
| **Frontend 404 on `/`** | Next.js App Router has no root page by default. | Healthcheck checks `/login` (a real page). Nginx proxies `/` to frontend — the app router handles routing. |
| **Node modules out of sync** | Container has old `node_modules` after you `npm install` locally. | Volume mount `"/app/node_modules"` (anonymous volume) protects container `node_modules` from being overwritten by the host mount. Rebuild only when `package.json` changes. |

---

## 3. Service Breakdown

### 3.1 MySQL (`mysql:8.0`)

```yaml
mysql:
  image: mysql:8.0
  ports:
    - "3307:3306"          # Host:Container — 3307 on your machine, 3306 inside
  volumes:
    - mysql_data:/var/lib/mysql              # Persists DB across restarts
    - ./database:/docker-entrypoint-initdb.d:ro  # Auto-runs .sql files on first start
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
```

**Why port 3307?** So it does not conflict with a local MySQL running on 3306. You can connect with any MySQL client via `localhost:3307`.

**Why `start_period: 120s`?** MySQL first-start initializes data files, then runs init scripts. This gives it breathing room before healthchecks start failing.

**When do init scripts run?** Only when the `mysql_data` volume is empty (first start or after `down -v`). They are mounted read-only (`:ro`) so the container cannot corrupt them.

### 3.2 Redis (`redis:7-alpine`)

```yaml
redis:
  image: redis:7-alpine
  # No ports exposed to host — only internal
```

**Why no exposed port?** Nothing outside Docker needs to talk to Redis. The backend connects via the Docker network using the hostname `redis`.

### 3.3 Backend (Node.js + Express)

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
    target: deps          # <-- KEY: only builds the "deps" stage
  command: npm run dev    # Runs nodemon, not the production build
  volumes:
    - ./backend:/app      # Mounts your live code
    - /app/node_modules   # Protects container node_modules from host mount
  depends_on:
    mysql:
      condition: service_healthy
    redis:
      condition: service_healthy
```

**Why `target: deps`?** The Dockerfile has three stages: `deps` → `builder` → `production`. In development, we only need `deps` (Node.js + `npm install`). The `builder` and `production` stages are for CI/CD and production deploys.

**Why `command: npm run dev` overrides the Dockerfile CMD?** The Dockerfile CMD runs `node dist/index.js` (production). In `docker-compose.yml`, we override it to `npm run dev` (nodemon with hot reload).

**The backend healthcheck:**
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/health"]
```

Nginx depends on this. The backend must be truly ready (DB connected, routes mounted) before Nginx starts proxying traffic to it.

### 3.4 Frontend (Next.js)

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    target: deps
  command: sh -c "npx next dev -p 3000 -H 0.0.0.0"
  volumes:
    - ./frontend:/app
    - /app/node_modules
    - /app/.next           # Also protects the .next build cache
```

**Why `-H 0.0.0.0`?** By default Next.js dev server binds to `localhost` (127.0.0.1) inside the container. That is only reachable from *inside* the container. Binding to `0.0.0.0` makes it reachable from Nginx (which is another container on the same network).

**Why `start.mjs` is bypassed in Docker?** `start.mjs` probably does dynamic port detection or environment setup. Inside Docker, port 3000 is guaranteed free, so we skip the wrapper and call `next dev` directly.

### 3.5 Nginx (Reverse Proxy)

```yaml
nginx:
  build:
    context: ./nginx
    dockerfile: Dockerfile
  ports:
    - "80:80"
  depends_on:
    backend:
      condition: service_healthy
    frontend:
      condition: service_healthy
```

**Why Nginx is the only service with port 80?** It is the single entry point.

**Proxy rules:**
- `/api/*` → `backend:4000`
- `/health` → `backend:4000`
- `/ws` → `backend:4000` (WebSocket upgrade)
- `/*` → `frontend:3000`

You always browse to `http://localhost`. You never think about `:4000` or `:3000`.

---

## 4. The Dockerfile Strategy (Multi-Stage)

Both backend and frontend use the same pattern:

```dockerfile
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
...security hardening, non-root user, copy dist...
CMD ["node", "dist/index.js"]
```

**Why multi-stage?**
- `deps` — fast layer, cached unless `package.json` changes. Used in development.
- `builder` — compiles TypeScript / Next.js. Used in CI.
- `production` — minimal Alpine image, no devDependencies, non-root user. Used in production deploys.

**Why `node:20-slim` for deps/builder but `node:20-alpine` for production?**
- `slim` has `apt-get` and tools needed to compile native modules during `npm install`.
- `alpine` is much smaller (~5MB vs ~180MB) and is perfect for runtime-only.

---

## 5. Daily Workflow

### Start coding
```bash
docker-compose up -d
```
Then open `http://localhost` and code. Changes reflect instantly.

### Stop coding (preserves all data)
```bash
docker-compose down
```
**Your data is safe.** The `mysql_data` volume keeps all departments, messages, users, and everything else.

### DANGER — Wipe everything (cannot be undone)
```bash
docker-compose down -v
docker-compose up -d --build
```
This **permanently deletes** the `mysql_data` volume and re-runs the init scripts. All manually created data is gone forever.

**Only use this when:**
- You changed `database/*.sql` files and need the new schema applied
- You explicitly want a completely empty database

### Installed a new npm package?
```bash
docker-compose up -d --build
```
Only the `deps` stage rebuilds. Your code mounts stay instant.

### Check logs
```bash
docker-compose logs -f backend
docker-compose logs -f mysql
```

---

## 6. How to Reuse This Pattern in Another Project

You can copy this exact structure to any Node.js / Next.js / MySQL / Redis project.

### Step 1: File Structure

```
project/
├── backend/
│   ├── Dockerfile          # Multi-stage: deps, builder, production
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile          # Multi-stage: deps, builder, production
│   ├── package.json
│   └── src/
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── database/               # .sql init scripts
│   └── 01_init.sql
├── docker-compose.yml
└── .env.example
```

### Step 2: Backend Dockerfile (Copy-Paste Template)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install

FROM deps AS builder
COPY . .
RUN npm run build

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
```

### Step 3: Frontend Dockerfile (Copy-Paste Template)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S app -u 1001
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder --chown=app:nodejs /app/.next ./.next
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1
CMD ["npm", "start"]
```

### Step 4: docker-compose.yml (Copy-Paste Template)

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: mydb
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      start_period: 120s
      retries: 10

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      target: deps
    command: npm run dev
    ports:
      - "8080:4000"  # Host:Container — 8080 avoids Windows Hyper-V reserved ranges
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 5

  frontend:
    build:
      context: ./frontend
      target: deps
    command: sh -c "npx next dev -p 3000 -H 0.0.0.0"
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 15s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy

volumes:
  mysql_data:

networks:
  default:
    driver: bridge
```

### Step 5: nginx.conf (Minimal Template)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:4000;
    }
    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;

        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Step 6: Adjust for Your Project

- Change `MYSQL_DATABASE`, ports, and healthcheck endpoints if your app uses different ones.
- Add environment variables to `docker-compose.yml` or use `.env` files.
- If you use a framework other than Next.js (e.g., Vite, Vue), adjust the frontend `command` to bind to `0.0.0.0`.

---

## 7. Windows-Specific Troubleshooting

### "An attempt was made to access a socket in a way forbidden by its access permissions"

This happens when Docker tries to bind to a port that Windows Hyper-V has reserved.

**Quick fix — run the port checker:**
```bash
node scripts/check-ports.mjs
```

This script scans `docker-compose.yml`, checks each host port against Windows excluded ranges, and suggests safe alternatives. To apply fixes automatically:
```bash
node scripts/check-ports.mjs --auto-fix
```

**Manual diagnose:**
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

If your port (e.g. `4000`) falls inside any range, it is blocked.

**Manual fix:** Pick a port outside those ranges. Common safe choices: `8080`, `5000`, `3001`, `7000`, `9000`. Then update `docker-compose.yml`:

```yaml
backend:
  ports:
    - "8080:4000"   # Changed from "4000:4000"
```

Also update `NEXT_PUBLIC_API_URL` — best practice is to route through Nginx (same origin, no CORS issues):
```yaml
  - NEXT_PUBLIC_API_URL=/api/v1
```

The container's **internal** port stays `4000` — only the host mapping changes. Nginx talks to `backend:4000` inside the Docker network, so it does not need updating.

### Port already in use by another process

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess
```

Either stop that process or change the Docker host port.

---

## 8. Why This Will Keep Working

This setup is resilient because every decision has a purpose:

- **Named volumes** prevent accidental data loss.
- **Healthcheck dependencies** prevent race conditions.
- **Volume mounts** make development feel like running locally.
- **Nginx as a single entry point** removes port confusion.
- **Multi-stage Dockerfiles** make the same image work for dev, CI, and production.
- **The `deps` target** means `docker-compose up` is fast unless `package.json` changes.

You can start your day with `docker-compose up -d`, code all day with instant reload, and stop with `docker-compose down`. No surprises.

---

*Written for reference and reuse across projects.*
