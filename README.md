# Permission Manager

Application web full-stack de gestion des permissions et droits d'acces pour entreprises.

## Démarrage rapide (Docker)

```bash
docker-compose up --build
```

Acces :
- Application : http://localhost
- API : http://localhost/api/v1
- Health check : http://localhost/health

## Démarrage sans Docker (mode manuel)

### Prerequis
- Node.js 18+
- npm 9+
- MySQL 8.0
- Redis (port 6379)
- Compte Firebase avec Authentication Email/Password active

### 1. Base de donnees
Executer les fichiers SQL dans `database/` dans l'ordre :
1. `01_create_database.sql`
2. `02_create_tables.sql`
3. `03_seed_data.sql`
4. `04_create_admin.sql` (apres creation du compte dans Firebase)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Remplir les variables	npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Remplir les variables
npm install
npm run dev
```

## Scripts de developpement

```bash
# Lancer backend + frontend manuellement
./scripts/start-dev.sh

# Arreter
./scripts/stop-dev.sh
```

## Architecture

- **Backend** : Express + TypeScript, API REST sous `/api/v1/`
- **Frontend** : Next.js 14 App Router + TypeScript + Tailwind CSS
- **Base de donnees** : MySQL 8, ORM Drizzle
- **Cache** : Redis (permissions, sessions, rate limiting, notifications)
- **Auth** : Firebase Authentication
- **Notifications** : Telegram (dev) / Firebase FCM + Gmail (prod)
- **Proxy** : Nginx

## Tests

```bash
cd backend
npm run test
npm run test:coverage
```

Seuil de couverture : 80% minimum.
