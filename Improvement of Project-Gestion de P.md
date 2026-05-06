## Improvement of <Project-Gestion de Permissions>
- Goal improve Achitecture and pattern 
- Security vulnerability 
- Performance bottlenecks
- Error handling page 
- Type safety 
- Dependence health 
- Docker implementation : 
  Frontend : Nginx engine for static service and reverse proxy 
  Backend : Alpine:node.js minimal surface attack 
- Database : MySQL in xamp 
- Redis : 

wsl 
redis-server
redis-server --deamonize yes 
redis-cli ping

## Delivrable 
docker-compose.yml 
frontend Dockerfile 
backend Dockerfile 
.dockerignorefile 

## CI/CD 
- GitHub action 
- lint -> test -> build -> push to registry -> deploy 

============================================================================
============================================================================
Path 1: Normal User (Production)
Flow:
User clicks "Login" → Firebase popup/redirect
Firebase returns ID Token (JWT, expires in 1 hour)
Frontend sends token to backend: Authorization: Bearer <token>
Backend verifies with Firebase Admin SDK
Backend finds/creates user in MySQL
Backend creates session in Redis
User is authenticated

Logout:
Frontend calls signOut() from Firebase
Frontend calls backend /auth/logout
Backend deletes Redis session
Frontend clears local state

===

Path 2: Dev Bypass (Development Only)
Why it exists: Firebase setup is complex for local development. This lets developers test without configuring Firebase.

sample way: 
POST /api/v1/auth/dev-login
Headers:
  x-dev-secret: <DEV_SECRET>        ← Required, must match backend .env
  x-dev-user-email: dev@example.com  ← Which user to impersonate

Response:
  { user: { id, email, role, organizationId }, token: "dev-jwt" }

Security guards:                                        -> protector 
NODE_ENV must be development
DEV_SECRET must match (not localStorage, not headers alone)
Frontend uses NEXT_PUBLIC_DEV_SECRET only in dev builds
Backend rejects in production

DEV_SECRET : A shared secret between frontend and backend that proves the request is legitimate development traffic.

where doest it  live ? 
| File                  | Variable                 | Value                      |
| --------------------- | ------------------------ | -------------------------- |
| `backend/.env`        | `DEV_SECRET`             | `super-secret-dev-key-123` |
| `frontend/.env.local` | `NEXT_PUBLIC_DEV_SECRET` | `super-secret-dev-key-123` |


====

User In/Out Experience

1. Admin creates user via dashboard
   → Backend generates random password
   → Email sent to user (or Telegram)
   → User receives invite link with token

2. User clicks invite link
   → Sets their own password
   → Firebase account created (production) OR dev user created (dev)
   → Redirect to login

┌─────────────┐
│ Enter email │
│ Enter pass  │
└──────┬──────┘
       ▼
┌────────────────────┐
│ Firebase validates │◄── Production
│ OR                 │
│ Dev bypass checks  │◄── Development only
└──────┬─────────────┘
       ▼
┌────────────────────┐
│ Backend creates    │
│ session in Redis   │
│ (TTL: 1 hour)      │
└──────┬─────────────┘
       ▼
┌────────────────────┐
│ Redirect to        │
│ dashboard          │
└────────────────────┘



Session Management
Active session: Redis key session:<userId> with user data
Permission cache: Redis key perms:<userId> (TTL: 15 min)
Rate limiting: Redis key ratelimit:<ip> (TTL: 1 min)

1. User clicks "Logout"
2. Frontend calls POST /auth/logout
3. Backend deletes Redis session key
4. Frontend calls Firebase signOut()
5. Redirect to /login

==== demain verifie le firebase de freddy pour ajouter les notification et les login constrains 



====== 
work history 
======
- patched to show issue with backend 
- discovering the use of maria_db 
why pm_user : databse connection - backend talk to mariaDB and MysQl - local xamp
firebse admin@permissionmanager.com : authentication - verify who user are and manage passwords - cloud firebase 
==
User logs in via Firebase (email/password)
         ↓
Firebase verifies password, returns ID Token
         ↓
Backend receives token, verifies with Firebase Admin SDK
         ↓
Backend looks up user in MySQL using Firebase UID
         ↓
Backend checks permissions (roles, organization) from MySQL
         ↓
User gets access based on MySQL role data
==
so in short pm_user is database login and firebase admin is identity verification 
security guard checking ids 
pm_user for databse connection and firebase admin for authh and token management
- 

| Feature                    | Implementation                                              |
| -------------------------- | ----------------------------------------------------------- |
| **Zero-trust security**    | Every endpoint validates JWT + permissions, no dev bypasses |
| **Proper multi-tenancy**   | `organizationId` filters on every query, row-level security |
| **Comprehensive testing**  | 80%+ coverage, unit + integration + e2e                     |
| **API documentation**      | Swagger/OpenAPI auto-generated from Zod schemas             |
| **Observability**          | Structured logging, metrics, health checks, tracing         |
| **Infrastructure as code** | Terraform/Pulumi, not just Docker Compose                   |
| **GitOps CI/CD**           | Lint → Test → Build → Scan → Deploy on merge                |
| **Feature flags**          | Gradual rollouts, A/B testing capability                    |
| **Real-time features**     | WebSockets for notifications, not just polling              |

Research depth: Why this stack? Trade-offs evaluated?
Engineering rigor: Security, scalability, maintainability
Professional delivery: Documented, tested, deployable

| Tier                          | Effort | Impact                     |
| ----------------------------- | ------ | -------------------------- |
| Fix security gaps             | 2 days | Makes it actually usable   |
| Add Zod validation everywhere | 1 day  | Prevents garbage data      |
| Add tests (even basic)        | 3 days | Shows engineering maturity |
| Add Swagger/OpenAPI           | 1 day  | Professional API docs      |
| Add GitHub Actions CI/CD      | 1 day  | Automated quality gates    |
| Add proper logging/monitoring | 2 days | Production readiness       |


=== new user 
kirinryu.dev@gmail.com
admin2 

*manager
usermanager_1@gmail.com
manager_1

Super Admin creates user
    ↓
Backend generates:
    • Random secure password (16+ chars)
    • Time-limited invite token (24h expiry)
    • Magic login link
    ↓
Sends email: "Your account is ready. Set your password: [link]"
    ↓
User clicks link → Enters new password
    ↓
Backend:
    • Validates token
    • Hashes password (bcrypt/argon2)
    • Marks account as "active"
    • Invalidates invite token
    ↓
User can now login with new password
    ↓
User can request password reset → Email OTP → New password

User clicks "Forgot password"
    ↓
Backend generates 6-digit OTP
    ↓
Stores in Redis: `reset:${email}` = `123456` (TTL: 10 minutes)
    ↓
Sends email: "Your code: 123456. Valid 10 minutes."
    ↓
User enters OTP + new password
    ↓
Backend validates OTP → hashes new password → clears Redis key

No permanent reset tokens — OTP only, time-bound, single-use.

Email Service Setup


  Test:
  1. Log in as Super Admin → Settings → Organisation → change name → save → Sidebar updates
  2. Log in as Employee → Settings → Organisation name is visible but read-only
  3. Visit a non-existent route → 404 styled page appears
  4. The login/register pages keep "Permission Manager" as the default branding

  Let me know when you're ready for the next complex tasks.

what superadmin canot do
| Action                                    | Why Blocked                                |
| ----------------------------------------- | ------------------------------------------ |
| See user passwords                        | Never stored plaintext, only hashes        |
| Login as another user                     | No impersonation — prevents insider threat |
| Change user password without user consent | Forces reset flow instead                  |
| Access user 2FA                           | Security boundary                          |


 