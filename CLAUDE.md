# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, Drizzle ORM, MySQL2, Redis, Firebase Admin SDK, Winston, BullMQ, Zod, Vitest
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Tanstack Query, React Hook Form, Zod, Framer Motion, Firebase Client SDK
- **Infrastructure**: Docker Compose, Nginx, MySQL 8, Redis
- **Auth**: Firebase Authentication (Email/Password)
- **Notifications**: Multi-provider abstraction. **Development default is Telegram Bot API**. Production default is Firebase Cloud Messaging + Gmail API. `hybrid` mode available via `NOTIFICATION_PROVIDER` env var.

## Project Structure

Monorepo with two main applications:

```
├── backend/     # Express API (Node.js/TypeScript)
├── frontend/    # Next.js 14 App Router
├── database/    # SQL initialization scripts
├── nginx/       # Reverse proxy config
├── docker-compose.yml
└── scripts/     # Manual dev start/stop scripts
```

All backend routes are versioned under `/api/v1/`. Nginx routes `/api/*` to the backend and all other traffic to the frontend.

## Common Commands

### Docker (recommended)
```bash
docker-compose up           # Start all services
docker-compose up --build   # Rebuild after dependency changes
```

### Manual Development (without Docker)
Requires: Node.js 18+, npm 9+, MySQL 8.0, Redis (port 6379), Firebase project.

```bash
# Start backend and frontend manually
./scripts/start-dev.sh

# Stop manual dev processes
./scripts/stop-dev.sh
```

### Backend
```bash
cd backend
npm install
npm run dev        # Nodemon with hot reload
npm run test       # Run test suite
npm run test:coverage  # Coverage report (80% minimum threshold)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Next.js dev server
npm run build      # Production build
```

### Database Initialization
Execute SQL files in strict order. They can be run in any MySQL client (MySQL Workbench, DBeaver, terminal):

1. `database/01_create_database.sql` — Creates `permission_manager` DB
2. `database/02_create_tables.sql` — All 30+ tables with foreign keys and indexes
3. `database/03_seed_data.sql` — Default organization, modules, permissions, system roles, leave types
4. `database/04_create_admin.sql` — Template for Super Admin (requires manual Firebase UID substitution)

**Security note:** `04_create_admin.sql` contains placeholder sensitive values. Do not commit the customized version.

## Architecture

### Authentication Flow
Every API request includes a Firebase ID token in the `Authorization` header. The backend verifies it via Firebase Admin SDK and caches the result in Redis for the token's remaining lifetime. Token refresh is automatic on the frontend via Firebase Client SDK.

### Permission Resolution (Critical)
Effective permissions are calculated by combining roles, department assignments, and direct permissions. When conflicts occur, this hierarchy applies strictly:

1. **Direct permission explicitly denied** (`granted = false` on user) — absolute priority
2. **Direct permission explicitly granted** (`granted = true` on user)
3. **Inherited from role assigned directly to user**
4. **Inherited via user's department**

If two sources at the same level conflict, **deny wins** for security.

The calculation result is cached in Redis (`permissions:{userId}`) with a 15-minute TTL and invalidated immediately when the user's roles, permissions, or department changes.

### Notification System
The backend uses an `INotificationProvider` interface. The active provider is selected at startup via `NOTIFICATION_PROVIDER`:

- `telegram` (dev default): HTTP calls to Telegram Bot API. Users link their account by messaging the bot (`/start`); `chat_id` is stored in `user_preferences`. Leave requests sent to managers include inline approve/reject buttons.
- `firebase` (prod default): Firebase Cloud Messaging (web push) + Gmail API.
- `hybrid` (optional): Telegram for users who linked it; Firebase/Gmail for everyone else.

Notification jobs are queued in Redis via BullMQ. Failed jobs retry up to 3 times with exponential backoff.

### Department Constraints
- Every user **must** belong to exactly one department.
- A manager can belong to **only one** department at a time.
- A department cannot be deleted if it still contains active users.
- Department-level role assignments cause all members to inherit those roles automatically.

### Redis Usage
Redis is strictly volatile — no persistent business data. It is used for:
- Permission effective cache
- Firebase token verification cache
- Account lockout counters (with native TTL)
- Rate limiting counters per user/IP
- BullMQ notification queues

### Logging
Winston structured JSON logging in production (rotating daily files, 30-day retention) and colorized terminal output in development. Every log entry includes: timestamp, level, message, userId, route, duration, and context.

### API Versioning
All routes are prefixed with `/api/v1/`. Non-breaking changes keep the same version. Breaking changes require a new version while maintaining the old one during a documented transition period. Deprecated routes return a `Deprecation` header.

## Environment Variables

Key variables are documented in `.env.example` at the root and in `backend/.env.example` / `frontend/.env.example`.

Important backend variables:
- `DATABASE_URL` — MySQL connection string
- `REDIS_URL` — Redis connection string (`redis://redis:6379` in Docker, `redis://localhost:6379` manual)
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` — Firebase Admin SDK
- `NOTIFICATION_PROVIDER` — `telegram` | `firebase` | `hybrid`
- `TELEGRAM_BOT_TOKEN` — Required when provider is `telegram` or `hybrid`
- `REDIS_PERMISSIONS_TTL` — Default 900 seconds
- `REDIS_RATE_LIMIT_WINDOW` / `REDIS_RATE_LIMIT_MAX` — Rate limit config

## Important Notes

- Passwords never transit through the backend; Firebase handles them entirely.
- Audit logs are append-only. No update or delete endpoints exist for them.
- The Simulator page (`/simulator`) is read-only and does not write to the audit log.
- All animations respect the user's `prefers-reduced-motion` system setting.
- The application supports dark/light/system theme with persistence in `user_preferences`.
