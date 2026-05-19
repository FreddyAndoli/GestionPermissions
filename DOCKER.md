# Docker Workflow

## Quick Start

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Check status
docker-compose ps
```

## Port Mapping

| Service | Host Port | Container | Usage |
|---------|-----------|-----------|-------|
| Nginx (main entry) | `80` | `80` | `http://localhost` |
| Backend API | `8080` | `4000` | `http://localhost:8080` |
| Frontend | `3000` | `3000` | `http://localhost:3000` |
| MySQL | `3307` | `3306` | `localhost:3307` |
| Redis | — | `6379` | Internal only |

Always browse via `http://localhost` (nginx). It proxies `/api/*` to backend and everything else to frontend.

## Code Changes (Live Reload)

Local source code is mounted as volumes. You rarely need to rebuild.

| Change | Action |
|--------|--------|
| Backend `.ts` files | Auto-reload via nodemon |
| Frontend `.tsx` files | Auto-reload via Next.js dev server |
| `.env` files | `docker-compose restart <service>` |
| `package.json` (new deps) | `docker-compose up -d --build` |
| Dockerfile or `.sql` init scripts | `docker-compose down -v && docker-compose up -d --build` |

## Database: Persistent vs Fresh (CRITICAL)

**WARNING:** The MySQL volume `freddy_mysql_data` persists across stops, BUT only if you use the correct command.

```bash
# KEEP all data (normal daily stop) -- USE THIS
docker-compose down

# DELETE ALL DATA PERMANENTLY (departments, users, messages, everything gone)
docker-compose down -v
```

**Only use `-v` when:**
- You changed `database/*.sql` files and need the new schema
- You explicitly want a completely clean slate

**If you accidentally ran `-v`:** All manually created data (departments, messages, users created via UI) is gone forever. The init scripts will re-run on next start, creating only the default seeded data.

## Logs

```bash
docker-compose logs -f backend
docker-compose logs -f mysql
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE :::4000` | Port blocked or in use. Run `node scripts/check-ports.mjs` to find safe ports |
| `ER_NO_SUCH_TABLE` | MySQL init script failed. `docker-compose down -v && docker-compose up -d --build` |
| Backend `unhealthy` | Check logs: `docker-compose logs backend` |
| Frontend 404 on `/` | Normal. App Router has no root page. Browse `/login` |
| `Host not allowed` | MySQL user permissions out of sync. `docker-compose down -v` fixes it |
| Changes not reflecting | Did you install a new package? Run `--build` |

## Daily Flow

```bash
# Start stack
docker-compose up -d

# Code all day (auto-reload)

# Stop stack
docker-compose down
```

## Rebuild Required

Only 3 cases require `--build`:

1. New npm package installed
2. Dockerfile changed
3. Database init scripts changed + `down -v`
