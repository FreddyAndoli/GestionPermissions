# Project Report — Permission Manager

**Date:** 2026-05-18  
**Repository:** `C:\workshop\dev\Freddy`  
**Branch:** `main`  
**Last Commit:** `5424710` — docker fixed; new workflow established (see `DOCKER.md`)

---

## 1. Project Overview

Permission Manager is a full-stack enterprise application for managing user permissions, access rights, roles, departments, and leave requests. It is designed for multi-department organizations with hierarchical structures.

**Key Capabilities:**
- Granular permission management (CRUD + approve/export/simulate)
- Role-based and department-based access control
- User invitations and account lifecycle
- Leave request workflows with delegation and blackout periods
- Audit logging, reporting (PDF), and GDPR data retention
- Real-time notifications (WebSocket + multi-provider queue)
- Admin simulator for testing permissions without side effects

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 20, TypeScript 5.4, Express 4.19 |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5.4 |
| **Styling** | Tailwind CSS 3.4, Framer Motion, Lucide React |
| **Database** | MySQL 8.0, Drizzle ORM 0.45 |
| **Cache / Queue** | Redis 7 (BullMQ for notification jobs) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Validation** | Zod 3.23 (shared schemas) |
| **Forms** | React Hook Form + Zod resolvers |
| **State / Query** | Tanstack Query v5, Zustand |
| **Testing** | Vitest v4, Supertest, 80% coverage threshold |
| **Dev Tools** | Nodemon, tsx, drizzle-kit |
| **Infra** | Docker Compose, Nginx reverse proxy |

---

## 3. Repository Structure

```
Freddy/
├── backend/              # Express API (~8,449 LoC TypeScript)
│   ├── src/
│   │   ├── config/       # DB, Redis, Firebase, env
│   │   ├── controllers/  # 17 route controllers
│   │   ├── routes/       # 25 API route modules
│   │   ├── services/     # 35+ business logic services
│   │   ├── middlewares/  # Auth, roles, rate limit, errors
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── db/
│   │   │   ├── schema.ts # Drizzle ORM table definitions
│   │   │   └── seed.ts   # Database seeding
│   │   ├── workers/      # BullMQ notification worker + cron worker
│   │   ├── utils/        # Logger, async handler
│   │   ├── types/        # Express extensions, shared types
│   │   └── tests/        # Unit + integration tests
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/             # Next.js 14 App Router (~9,697 LoC TS/TSX)
│   ├── src/
│   │   ├── app/          # App Router pages (auth + app layouts)
│   │   ├── components/
│   │   │   ├── layout/   # Header, Sidebar, ProtectedRoute, etc.
│   │   │   └── ui/       # Reusable UI components
│   │   ├── hooks/        # useAuth, usePermissions, useTheme, useWebSocket
│   │   ├── lib/          # API client, Firebase config, animations, query client
│   │   └── stores/       # Zustand global stores
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── database/             # SQL initialization scripts
│   ├── 01_create_database.sql
│   ├── 02_create_tables.sql       # 38 tables
│   ├── 03_seed_data.sql
│   ├── 04_create_admin.sql
│   ├── 05_seed_users.sql
│   └── 06_consent_logs.sql
├── nginx/                # Reverse proxy configuration
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/              # Manual dev helpers
│   ├── start-dev.sh
│   └── stop-dev.sh
├── docker-compose.yml
├── DOCKER.md             # Docker workflow documentation
├── CLAUDE.md             # Codebase guidance for Claude Code
├── README.md
├── .env.example
└── admin.md              # Admin credentials (not for commit)
```

---

## 4. API Routes (`/api/v1/*`)

The backend exposes 25 route modules under `/api/v1/`:

| Route | Domain |
|-------|--------|
| `/auth` | Login, register, password reset, token refresh |
| `/users` | CRUD, invitations, bulk import, profile |
| `/roles` | Role management, assignments |
| `/permissions` | Permission definitions, module linkage |
| `/modules` | Feature module toggles |
| `/departments` | Department CRUD, managers, members |
| `/sub-departments` | Sub-department management |
| `/leaves` | Leave requests, approvals, calendar |
| `/leave-types` | Leave type configuration |
| `/delegations` | Permission delegation workflows |
| `/notifications` | Notification preferences, history |
| `/audit` | Append-only audit logs |
| `/reports` | PDF report generation |
| `/announcements` | Internal announcements |
| `/conversations` | Internal messaging |
| `/status` | System status / health |
| `/simulator` | Read-only permission simulator |
| `/proxy-requests` | Proxy permission requests |
| `/telegram` | Telegram bot webhook/integration |
| `/public-holidays` | Holiday calendar management |
| `/blackout-periods` | Blackout period rules |
| `/preferences` | User preferences (theme, density, etc.) |
| `/user-permissions` | Direct user permission overrides |
| `/organizations` | Organization settings |

---

## 5. Database Schema

**38 tables** covering:
- `organizations`, `users`, `user_preferences`
- `roles`, `permissions`, `modules`, `user_roles`, `role_permissions`
- `departments`, `sub_departments`, `department_roles`
- `leaves`, `leave_types`, `leave_balances`, `public_holidays`, `blackout_periods`
- `delegations`, `proxy_requests`
- `audit_logs`, `consent_logs`, `data_exports`
- `notifications`, `messages`, `announcements`
- `reports`, `password_tokens`, `invitations`, `sessions`
- `gdpr_erasure_requests`, `retention_policies`

Indexes are defined on all foreign keys and frequently queried columns (status, organization, department).

---

## 6. Docker Infrastructure

**Services:**

| Service | Image | Host Port | Container Port | Purpose |
|---------|-------|-----------|----------------|---------|
| `mysql` | `mysql:8.0` | `3307` | `3306` | Persistent data volume `mysql_data` |
| `redis` | `redis:7-alpine` | — | `6379` | Internal cache, sessions, queues |
| `backend` | Build from `./backend` | `8080` | `4000` | Nodemon dev server, mounts local code |
| `frontend` | Build from `./frontend` | `3000` | `3000` | Next.js dev server (`next dev`) |
| `nginx` | Build from `./nginx` | `80` | `80` | Reverse proxy + static assets |

**Network:** `pm_network` (bridge)

**Proxy Rules (Nginx):**
- `/api/*` → backend:4000
- `/health` → backend:4000
- `/ws` → backend:4000 (WebSocket upgrade)
- `/` → frontend:3000

**Live Reload:** Local source is mounted via Docker volumes. Rebuild only needed for new npm packages, Dockerfile changes, or DB init script changes.

**Persistent vs Fresh DB:**
- `docker-compose down` — keeps MySQL data
- `docker-compose down -v` — wipes data and re-runs init scripts on next start

---

## 7. Environment Configuration

Key variables (from `.env.example`):

| Variable | Purpose |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` / `DB_PASSWORD` | MySQL credentials |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Client SDK (frontend) |
| `NOTIFICATION_PROVIDER` | `telegram` (dev) / `firebase` (prod) / `hybrid` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | Telegram Bot API (dev notifications) |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | Gmail API (prod emails) |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging |
| `REDIS_PERMISSIONS_TTL` | 900s default |
| `REDIS_RATE_LIMIT_WINDOW` / `REDIS_RATE_LIMIT_MAX` | Rate limiting config |
| `RETENTION_*_DAYS` | GDPR retention policies |

---

## 8. Security & Compliance

- **Auth:** Firebase ID tokens verified on every request, cached in Redis for token lifetime
- **Permission Resolution:** 4-level hierarchy (direct deny > direct grant > role > department); deny wins on conflicts
- **Rate Limiting:** Per-user and per-IP counters in Redis
- **Account Lockout:** Max 5 failed attempts, 15-minute lockout
- **Audit Logs:** Append-only; no update/delete endpoints
- **GDPR:** Consent tracking, data export, erasure requests, retention policies
- **CSP & Security Headers:** Configured in Nginx (X-Frame-Options, CSP, Referrer-Policy)
- **Passwords:** Never transit through backend; handled entirely by Firebase

---

## 9. Notifications Architecture

- **Queue:** BullMQ on Redis with retry (3x exponential backoff)
- **Providers:**
  - `telegram` (dev default): HTTP Bot API, inline approve/reject buttons for leave requests
  - `firebase` (prod default): FCM web push + Gmail API
  - `hybrid`: Telegram for linked users, Firebase/Gmail for others
- **WebSocket:** Real-time updates via `ws` library on backend

---

## 10. Testing

- **Runner:** Vitest v4 with coverage via `@vitest/coverage-v8`
- **Minimum Coverage:** 80%
- **Test Types:**
  - Unit: `backend/src/tests/auth.test.ts`, `permissions.test.ts`
  - Integration: `backend/src/tests/integration/leaves.integration.test.ts`, `permissions.integration.test.ts`, `users.integration.test.ts`
- **Commands:**
  - `npm run test` — run once
  - `npm run test:watch` — watch mode
  - `npm run test:coverage` — coverage report

---

## 11. Frontend Architecture

- **App Router:** Next.js 14 with `(app)` and `(auth)` route groups
- **Server Components:** Used for initial page loads (dashboards, lists, audit)
- **Client Components:** All dynamic interactions, forms, animations
- **State:**
  - Tanstack Query for server-state and optimistic updates
  - Zustand for client global state (e.g., dashboard layout)
- **Theming:** Dark / Light / System via `user_preferences`; respects `prefers-reduced-motion`
- **Key Pages:**
  - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/invite/[token]`
  - `/dashboard`, `/hr-dashboard`, `/users`, `/roles`, `/permissions`, `/departments`
  - `/leaves`, `/leaves/calendar`, `/leave-types`, `/delegations`, `/proxy-requests`
  - `/audit`, `/reports`, `/announcements`, `/messages`, `/notifications`
  - `/simulator`, `/settings`, `/profile`, `/team-calendar`, `/public-holidays`, `/blackout-periods`

---

## 12. Development Workflow

### Docker (Recommended)
```bash
# Check ports first (Windows Hyper-V may block some)
node scripts/check-ports.mjs

# Start everything
docker-compose up -d

# Stop
docker-compose down
```

### Manual (No Docker)
Requires Node.js 18+, MySQL 8, Redis, Firebase project.
```bash
./scripts/start-dev.sh   # Start backend + frontend
./scripts/stop-dev.sh    # Stop
```

### Database Init Order
1. `database/01_create_database.sql`
2. `database/02_create_tables.sql`
3. `database/03_seed_data.sql`
4. `database/04_create_admin.sql` (manual Firebase UID required)

---

## 13. Key Notes & Warnings

- `admin.md` contains real admin credentials. **Do not commit** customized versions.
- On Windows, run `node scripts/check-ports.mjs` before `docker-compose up` to detect Hyper-V blocked ports.
- `04_create_admin.sql` contains placeholder sensitive values. **Do not commit** after editing.
- The Simulator page (`/simulator`) is read-only and does **not** write to the audit log.
- Frontend App Router has no root page (`/` returns 404 by design); browse `/login`.
- Redis is strictly volatile — no persistent business data.
- All API routes are versioned under `/api/v1/`.

---

## 14. Stats Summary

| Metric | Value |
|--------|-------|
| Backend TypeScript LoC | ~8,449 |
| Frontend TypeScript/TSX LoC | ~9,697 |
| Database Tables | 38 |
| API Route Modules | 25 |
| Backend Services | 35+ |
| Backend Controllers | 17 |
| Frontend Pages | 28+ |
| Test Files | 5 (unit + integration) |
| Docker Services | 5 |

---

---

## 15. Bug Scan Results & Fixes — 2026-05-19

### Critical Bugs Fixed Today

| # | Bug | Root Cause | Fix |
|---|-----|------------|-----|
| 1 | **Leave creation 400 Bad Request** | Frontend sent flat `startDate/endDate`; backend Zod expects `periods: [{startDate, endDate}]` | `frontend/src/app/(app)/leaves/page.tsx` — wrap dates in `periods` array |
| 2 | **Messages user search 403** | `/users` requires `users.read`; non-admins can't search colleagues | Added `GET /users/colleagues` (auth only, no permission) in backend; frontend messages uses it |
| 3 | **Proxy requests user search 403** | Same as #2 — proxy page loaded `/users?limit=1000` | Frontend proxy-requests uses `/users/colleagues` |
| 4 | **Team calendar user list 403** | Same as #2 — calendar loaded `/users?limit=1000` | Frontend team-calendar uses `/users/colleagues`; dropdown visible to all |
| 5 | **Set-password URL wrong domain** | `NEXT_PUBLIC_APP_URL` defaulted to `http://localhost:3000`; nginx serves on `:80` | Added `NEXT_PUBLIC_APP_URL=http://localhost` to `backend/.env` |
| 6 | **Profile leave stats 403** | Profile called `/leaves?userId=...` requiring `leaves.read` | Changed to `/leaves/me` (self-service endpoint, no extra permission) |
| 7 | **User creation missing department membership** | `createUser` set `users.departmentId` but never inserted `department_members` | `users.service.ts` — insert into `departmentMembers` after user creation |
| 8 | **User update didn't sync department membership** | `updateUser` changed `users.departmentId` without updating `department_members` | `users.service.ts` — delete old membership, insert new one on department change |
| 9 | **Department manager/director not added to members** | `createDepartment` and `updateDepartment` updated `users.departmentId` but skipped `department_members` | `departments.service.ts` — insert manager/director into `departmentMembers` |
| 10 | **`deleteDepartment` syntax error / dead code** | Contained `input.directorId` but `input` didn't exist in scope | Removed the dead block in `departments.service.ts` |

### Additional Logic Gaps Found (Not Yet Fixed)

| # | Issue | Impact | Recommended Fix |
|---|-------|--------|-----------------|
| A | **Dashboard quick actions are hardcoded** | Admin can't customize employee shortcuts | Use `user_preferences.dashboard_layout` JSON field (already in schema) to store configurable tiles |
| B | **User detail page (`/users/[id]`) requires `users.read`** | Non-admins can't view their own profile detail (phone, dept, roles) | Allow self-access without `users.read` in `users.routes.ts` — add `|| req.user.id === id` check |
| C | **Team calendar hardcodes Togo (`TG`) holidays** | Other countries not supported | Add `countryCode` selector in frontend + org-level default in `organizations.settings` |
| D | **Proxy request `POST /` has no permission check** | Any authenticated user can create proxy requests | Add `requirePermission('proxy_requests.create')` to route |
| E | **Reports not org-scoped in storage** | `reports.controller.ts` TODO notes that PDFs lack org isolation | Store reports in org subdirectories (`storage/reports/{orgId}/`) or add `reports` table with metadata |
| F | **Blackout periods exist and work** | Admin creates via `/blackout-periods`; enforced in leave creation | Frontend page exists at `/blackout-periods`; no bug found |
| G | **Bulk user import doesn't validate email format** | Invalid emails can be inserted, causing Firebase errors | Add email regex validation in `bulkCreateUsersSchema` |
| H | **Leave request creation doesn't show backend errors** | If quota exceeded or blackout hit, modal stays open silently | Add `onError` to `createLeave` mutation and surface `err.response.data.error` |

### Files Modified in This Session

- `backend/.env` — `NEXT_PUBLIC_APP_URL=http://localhost`
- `backend/src/routes/users.routes.ts` — added `/users/colleagues`
- `backend/src/controllers/users.controller.ts` — added `getColleagues`
- `backend/src/services/users.service.ts` — `createUser` + `updateUser` departmentMembers sync
- `backend/src/services/departments.service.ts` — manager/director member sync + `deleteDepartment` bugfix
- `frontend/src/app/(app)/leaves/page.tsx` — `periods` array fix
- `frontend/src/app/(app)/messages/page.tsx` — uses `/users/colleagues`
- `frontend/src/app/(app)/proxy-requests/page.tsx` — uses `/users/colleagues`
- `frontend/src/app/(app)/team-calendar/page.tsx` — uses `/users/colleagues`
- `frontend/src/app/(app)/profile/page.tsx` — uses `/leaves/me`

### Verification Steps

1. Restart Docker (`docker-compose up -d`) to pick up `.env` changes
2. Create a new user → welcome email link should point to `http://localhost/set-password?token=...`
3. Log in as employee → open Messagerie → search for colleague → should succeed (no 403)
4. Go to Conges → create leave request → should return 201 (not 400)
5. Go to Calendrier equipe → dropdown shows colleagues
6. Create department with manager → manager appears in team calendar

---

---

## 16. Follow-up Fixes — 2026-05-19 (Session 2)

### Issues Fixed

| # | Bug | Root Cause | Fix |
|---|-----|------------|-----|
| 11 | **Proxy requests POST 400** | `apiClient.ts` hardcoded `Content-Type: application/json`, preventing axios from setting `multipart/form-data` with boundary for FormData uploads. Multer failed to parse, `req.body` was empty, `parseInt` returned NaN, Zod threw. | Removed default `Content-Type` from `apiClient.ts` — axios auto-sets correct type for JSON and FormData. |
| 12 | **Leave creation 400 / TypeError** | `leaves.service.ts` called `.toISOString()` on `publicHolidays.holidayDate` and `blackoutPeriods.startDate/endDate`. MySQL `date` columns return strings at runtime, causing `TypeError: x.toISOString is not a function`. | Removed `.toISOString().split('T')[0]` calls — dates are already `YYYY-MM-DD` strings. Added TypeScript casts `(as unknown as string)` where Drizzle types them as `Date`. |
| 13 | **Messages GET 403 on conversations/1** | React Query cached `['conversations']` without user ID. When switching dev accounts, stale conversation list from previous user persisted. Clicking old conversation triggered 403 (not a participant). | Added `currentUserId` to query keys (`['conversations', userId]` and `['conversation', id, userId]`). Added `useEffect` to clear `selectedConv` on 403. Updated all invalidations. |
| 14 | **Leave/proxy error feedback missing** | `createLeave` and `createMutation` in proxy page had no `onError` or error display. Backend errors (quota, blackout, validation) were silent. | Added error state display in both modals showing `err.response.data.error`. |
| 15 | **Proxy requests dropdowns empty for employees** | User list query was gated by `canReadProxy` and permissions query by `canReadPermissions`. Employees creating proxy requests don't have these permissions, so dropdowns stayed empty. | Removed `enabled` gates from users query (already auth-only via `/users/colleagues`). Added `GET /permissions/public` endpoint (auth only) and switched frontend to use it. |

### Files Modified in This Session

- `frontend/src/lib/apiClient.ts` — removed default `Content-Type: application/json`
- `backend/src/services/leaves.service.ts` — fixed `.toISOString()` calls on string date columns
- `frontend/src/app/(app)/messages/page.tsx` — user-scoped query keys + 403 error handling
- `frontend/src/app/(app)/leaves/page.tsx` — added backend error display in modal
- `frontend/src/app/(app)/proxy-requests/page.tsx` — added backend error display + removed permission gates on dropdowns
- `backend/src/routes/permissions.routes.ts` — added `/permissions/public` (auth only)

---

## Fixed Today — 2026-05-19

**Session 1:**
- Leave creation 400 (periods array fix)
- Messages/proxy/calendar user search 403 (/users/colleagues endpoint)
- Set-password URL wrong domain (NEXT_PUBLIC_APP_URL)
- Profile leave stats 403 (/leaves/me)
- User creation/update missing department membership (department_members sync)
- Department manager/director not in members (departments.service.ts)
- deleteDepartment syntax error (dead code removal)
- Status enum mismatch in schema

**Session 2:**
- Proxy requests POST 400 (apiClient Content-Type fix)
- Leave creation TypeError (toISOString on string dates)
- Messages GET 403 stale cache (user-scoped query keys)
- Leave/proxy error feedback missing (error display in modals)
- Proxy requests dropdowns empty for employees (permissions/public endpoint)

**Date/Time:** 2026-05-19 — work stopped here for the day

### Verification Steps

1. Restart Docker (`docker-compose restart backend frontend`) to pick up code changes
2. Go to **Demandes par procuration** → create a proxy request with attachment → should return 201 (not 400)
3. Go to **Conges** → create a leave request → should succeed even when holidays/blackout periods exist in DB
4. Log in as User A → create a conversation → log out → log in as User B → old conversations should not appear; clicking any conversation should not 403

---

*Report generated by scanning the entire codebase on 2026-05-18.*
*Bug scan and fixes applied on 2026-05-19.*
*Follow-up fixes applied on 2026-05-19.*
