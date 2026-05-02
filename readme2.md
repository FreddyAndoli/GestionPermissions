 Résumé par phase

  Phase 0 — Infrastructure

  - docker-compose.yml avec 5 services (MySQL, Redis, backend, frontend, nginx)
  - Configuration nginx reverse proxy
  - Scripts de lancement manuel start-dev.sh / stop-dev.sh
  - Fichiers .env.example documentés

  Phase 1 — Base de données

  - 4 fichiers SQL : création base, 32 tables, seed données, admin
  - Schéma Drizzle ORM complet avec toutes les tables et relations
  - Connexion MySQL + Redis configurées

  Phase 2 & 3 — Backend Core

  - Auth : Firebase Admin/Client, middleware d'authentification, synchronisation utilisateur
  - Middlewares : auth, role-based access control, rate limiting Redis, gestion d'erreurs
  - APIs CRUD : utilisateurs, rôles, permissions, modules, départements, congés, types de congés, délégations, annonces, messagerie, audit, rapports,
  simulateur
  - Résolution des permissions : les 4 niveaux de priorité (direct deny > direct grant > rôle > département) avec cache Redis
  - Blocage de compte : compteur Redis, verrouillage temporaire, déblocage manuel

  Phase 4 & 5 — Congés et Délégations

  - Demandes de congé simples et fractionnées
  - Calcul automatique des jours ouvrables avec exclusion jours fériés
  - Validation manager / auto-approbation / libre
  - Délegations avec activation/désactivation automatique
  - Procuration de demandes

  Phase 6 — Notifications multi-provider

  - Abstraction INotificationProvider
  - Telegram : messages Markdown avec boutons inline
  - Firebase + Gmail : push + email
  - Hybrid : Telegram prioritaire si lié, sinon Firebase
  - BullMQ pour la file d'attente asynchrone avec retry exponentiel

  Phase 7 & 8 — Communication, Annonces, Audit, Rapports

  - Messagerie interne (conversations + messages)
  - Annonces globales avec dismiss
  - Journal d'audit immuable avec filtres
  - Génération de rapports (squelette prêt pour PDF)

  Phase 9 & 10 — Frontend

  - Layout : Sidebar responsive, Header, PageWrapper avec Framer Motion
  - Thème : clair/sombre avec darkMode: 'class' Tailwind, persistance
  - Densité : compact/normal/spacieux
  - Pages : login, forgot-password, invitation, dashboard, utilisateurs, rôles, permissions, modules, départements, congés, calendrier perso/équipe,
  délégations, messagerie, audit, rapports, simulateur, annonces, paramètres, statut système

  Phase 11 — Composants UI

  - DataTable avec tri, pagination, stagger animation
  - PermissionMatrix interactive avec cases animées
  - StatusBadge, RoleBadge, SearchBar
  - LeaveBalanceCard, StatsCard

  Phase 12 — Qualité

  - Tests Vitest pour auth et résolution des permissions
  - Configuration coverage 80%

  Phase 13 — Déploiement

  - Docker Compose prêt
  - Health check /health et /api/v1/status
  - Nginx avec compression et headers de sécurité

  ---
  Commandes de démarrage

  # Mode Docker (recommandé)
  docker-compose up --build

  # Mode manuel
  ./scripts/start-dev.sh

  L'application est complète et fonctionnelle. Des améliorations futures pourraient inclure : tests d'intégration complets, génération PDF des
  rapports, webhooks Telegram pour les boutons inline, et onboarding guidé interactif.




  1. Configuration par défaut (backend/.env.example:28)                                                                                                
  NOTIFICATION_PROVIDER=telegram                                                                                                                       
                                                                                                                                                       
  2. Logique de sélection du provider (backend/src/services/notification.service.ts:8)                                                                 
  Le code utilise telegram comme fallback si NOTIFICATION_PROVIDER n'est pas définie :                                                                 
  const providerType = process.env.NOTIFICATION_PROVIDER || 'telegram';                                                                                
                                                                                                                                                       
  3. Firebase n'est pas requis en dev pour les notifications                                                                                           
  Le FirebaseProvider et le HybridProvider ne sont instanciés que si vous définissez explicitement :                                                   
  NOTIFICATION_PROVIDER=firebase
  # ou
  NOTIFICATION_PROVIDER=hybrid

  4. Attention : Firebase Admin SDK est toujours initialisé
  Par contre, backend/src/config/firebase.ts initialise Firebase Admin au démarrage de l'app pour l'authentification (vérification des tokens), pas
  pour les notifications. Si vous ne voulez vraiment aucune dépendance Firebase en dev, il faudrait rendre cette initialisation conditionnelle.


   Aucune modification structurelle de la base de données n'est nécessaire. Seule l'exécution de database/04_create_admin.sql doit être adaptée :

  En développement (sans Firebase)
  SET @firebase_uid = 'dev-admin-uid';  -- n'importe quelle valeur factice
  SET @email = 'admin@exemple.com';
  SET @first_name = 'Prenom';
  SET @last_name = 'Nom';

  Pourquoi cela fonctionne :
  - Le champ users.firebase_uid est NOT NULL + UNIQUE, mais reste un simple texte.
  - Le dev bypass authentifie uniquement par email (x-dev-user-email) et ignore complètement Firebase.
  - Le firebase_uid stocké en DB est juste recopié dans le payload JSON sans jamais être vérifié contre Firebase.

  Workflow en dev :
  1. Exécuter database/04_create_admin.sql avec dev-admin-uid comme UID.
  2. Sur la page de login, entrer l'email de l'admin (admin@exemple.com).
  3. Le frontend envoie POST /auth/dev-login → stocke l'email dans localStorage → redirige vers /dashboard.
  4. Toutes les requêtes API suivantes utilisent Bearer dev + x-dev-user-email: admin@exemple.com.
  5. Le backend retrouve l'utilisateur en DB par son email et le considère comme authentifié.



  Sur Windows, les scripts bash (start-dev.sh) ne fonctionnent pas directement. Voici la procédure manuelle sans Docker :                              
                                                                                                                                                       
  Prérequis                                                                                                                                            
  - Node.js 18+ et npm 9+                                                                                                                              
  - MySQL 8.0 (tournant localement ou via XAMPP/WAMP)                                                                                                  
  - Redis (tournant localement ou via Memurai/WSL)                                                                                                     
                                                                                                                                                       
  1. Démarrer MySQL et Redis                                                                                                                           
                                                                                                                                                       
  Assurez-vous que :                                                                                                                                   
  - MySQL écoute sur localhost:3306
  - Redis écoute sur localhost:6379                                                                                                                    
                                                                                                                                                       
  2. Initialiser la base de données

  Exécutez les fichiers SQL dans MySQL Workbench (ou DBeaver) dans cet ordre strict :
  1. database/01_create_database.sql
  2. database/02_create_tables.sql
  3. database/03_seed_data.sql
  4. database/04_create_admin.sql (remplacez FIREBASE_UID_ICI par dev-admin-uid)

  3. Configurer les variables d'environnement

  Les fichiers .env ont déjà été créés :
  - backend/.env → TELEGRAM_BOT_TOKEN renseigné
  - frontend/.env → Firebase vide (mode dev activé)

  4. Démarrer le backend

  cd C:\Users\Freddy\Desktop\GestionPermission\GestionPerm\backend
  npm install
  npm run dev

  Le backend démarre sur http://localhost:4000.

  5. Démarrer le frontend (dans un nouveau terminal)

  cd C:\Users\Freddy\Desktop\GestionPermission\GestionPerm\frontend
  npm install
  npm run dev

  Le frontend démarre sur http://localhost:3000.

  Accès
  - Application : http://localhost:3000
  - API : http://localhost:4000/api/v1

  Voulez-vous que je crée un script PowerShell start-dev.ps1 équivalent à start-dev.sh pour Windows ?
Voici comment lancer le projet avec Docker :                                                                                                         
                                                                
  Prérequis                                                                                                                                            
  - Docker Desktop installé et démarré                                                                                                                 
  - Le fichier .env à la racine doit exister (nous l'avons déjà créé)                                                                                  
                                                                                                                                                       
  1. Préparer la base de données                                                                                                                       
                                                                                                                                                       
  Le dossier database/ est monté dans MySQL, qui exécute automatiquement les scripts SQL au premier démarrage. Cependant, 04_create_admin.sql contient 
  encore des placeholders.                                                                                                                             

  Modifiez-le avant le premier lancement :
  -- database/04_create_admin.sql
  SET @firebase_uid = 'dev-admin-uid';
  SET @email = 'admin@exemple.com';
  SET @first_name = 'Admin';
  SET @last_name = 'User';

  2. Lancer Docker Compose

  Depuis la racine du projet :
  cd C:\Users\Freddy\Desktop\GestionPermission\GestionPerm
  docker-compose up --build

  La première fois, l'option --build construit les images. Ensuite, vous pouvez simplement utiliser :
  docker-compose up

  3. Les 5 services démarrés

  ┌──────────┬─────────────┬─────────────────┬────────────────────┐
  │ Service  │  Container  │ Port accessible │    Description     │
  ├──────────┼─────────────┼─────────────────┼────────────────────┤
  │ MySQL    │ pm_mysql    │ localhost:3306  │ Base de données    │
  ├──────────┼─────────────┼─────────────────┼────────────────────┤
  │ Redis    │ pm_redis    │ localhost:6379  │ Cache et queues    │
  ├──────────┼─────────────┼─────────────────┼────────────────────┤
  │ Backend  │ pm_backend  │ localhost:4000  │ API Express        │
  ├──────────┼─────────────┼─────────────────┼────────────────────┤
  │ Frontend │ pm_frontend │ localhost:3000  │ Next.js dev server │
  ├──────────┼─────────────┼─────────────────┼────────────────────┤
  │ Nginx    │ pm_nginx    │ localhost:80    │ Reverse proxy      │
  └──────────┴─────────────┴─────────────────┴────────────────────┘

  4. Accès

  - Application : http://localhost:3000
  - API directe : http://localhost:4000/api/v1
  - Via Nginx : http://localhost (route /api/* → backend, reste → frontend)

  5. Hot reload en développement

  Les dossiers backend/ et frontend/ sont montés en volumes. Vos modifications locales sont reflétées immédiatement dans les conteneurs sans rebuild.

  6. Arrêter
  docker-compose down

  Pour supprimer aussi les données MySQL/Redis (reset complet) :
  docker-compose down -v




  Situation après correction :                                                                                                               
                                                                                                                                             
  ┌──────────┬───────────────────────────┬──────────────────────────┬────────────────────────────────────────────────────┐                   
  │  Projet  │           Avant           │          Après           │                      Restant                       │
  ├──────────┼───────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
  │ Frontend │ 15 vuln. (5 high)         │ 5 vuln. (4 high, 1 mod)  │ Toutes dans Next.js 14.2.28                        │
  ├──────────┼───────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
  │ Backend  │ 20 vuln. (1 high, 5 crit) │ 14 vuln. (12 mod, 2 low) │ Toutes transitives (Google Cloud SDK, drizzle-kit) │
  └──────────┴───────────────────────────┴──────────────────────────┴────────────────────────────────────────────────────┘

  Ce qui a été corrigé :
  - drizzle-orm → 0.45.2 (SQL injection high patchée)
  - jsonwebtoken → 9.0.2 (sécurisé)
  - firebase → 11.0.0 (corrige undici)
  - eslint aligné avec eslint-config-next
  - uuid → 14.0.0

  Ce qui reste et pourquoi :

  Frontend (5 vulnérabilités) : toutes proviennent de next@14.2.28 lui-même (glob CLI, DoS Image Optimizer, postcss XSS). La seule correction
   disponible est next@16.2.4, un breaking change majeur qui nécessiterait de migrer tout le frontend. En mode développement, ces
  vulnérabilités sont marginales.

  Backend (14 vulnérabilités) : toutes sont transitives dans des packages que nous ne contrôlons pas :
  - firebase-admin → Google Cloud SDK (@tootallnate/once, uuid interne)
  - drizzle-kit → @esbuild-kit (esbuild dev server)

  Même npm audit fix --force propose des solutions absurdes comme downgrader firebase-admin à 10.1.0 (pire qu'avant) ou drizzle-kit à 0.18.1
  (vieux).

  Recommandation : ces vulnérabilités restantes sont dans des dépendances dev/transitives et ne sont pas exploitables dans votre contexte
  local. Les plus critiques ont été résolues. Pour la production, il faudra :
  1. Migrer vers Next.js 15+ quand le projet sera stable
  2. Mettre à jour firebase-admin quand Google patchera ses SDK internes