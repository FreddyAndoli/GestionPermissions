# PROMPT — Application Web de Gestion de Permissions pour Entreprise

## Description générale

Construire une application web full-stack de gestion des permissions et droits d'accès destinée aux entreprises et grandes structures. L'application permet de créer, attribuer, auditer et révoquer les permissions des utilisateurs de manière granulaire, avec une gestion par rôles, départements et modules. Elle est pensée pour des organisations multi-départements avec plusieurs niveaux hiérarchiques.

---

## Stack technique

**Backend**
- Node.js avec TypeScript
- API REST construite avec les API Routes natives de Next.js côté backend, hébergées dans le dossier `backend/` du monorepo
- Base de données MySQL
- ORM Drizzle (gestion du schéma, migrations et requêtes)
- Redis pour le cache des permissions, la gestion des sessions, le blocage de compte, le rate limiting et la file d'attente des notifications
- Firebase Authentication pour la gestion des identités (Email/Password)
- Nodemon pour le rechargement automatique en développement

**Frontend**
- Next.js 14+ (App Router) avec TypeScript — framework principal
- React 18 — couche composants, Server Components pour le rendu initial des pages (dashboard, listes, audit), Client Components pour toutes les interactions dynamiques et les animations
- Tanstack Query (React Query) — gestion du cache des requêtes API côté client, synchronisation automatique des données, et implémentation de l'Optimistic UI (mise à jour instantanée + rollback en cas d'erreur)
- React Hook Form — gestion des formulaires complexes (demandes de congé, création de rôle, configuration des permissions)
- Zod — validation des données des formulaires côté frontend, avec partage des schémas de validation entre frontend et backend dans le monorepo
- Framer Motion — animations professionnelles sur toute l'interface

**Notifications**
- Architecture multi-provider avec abstraction : le code métier ne connaît pas le provider, il appelle uniquement un service `NotificationService` générique
- **Développement** : Telegram Bot API — simple, gratuit, zéro configuration OAuth
- **Production** : Firebase Cloud Messaging (push navigateur) + Gmail API (emails) par défaut
- **Option production** : Telegram peut remplacer ou compléter Firebase/Gmail via une variable d'environnement
- Le provider actif est contrôlé par la variable `NOTIFICATION_PROVIDER` dans le `.env`

**Infrastructure**
- Docker et Docker Compose pour la conteneurisation de tous les services (backend, frontend, MySQL, Nginx)
- Nginx comme reverse proxy (routage des requêtes frontend et API)
- Lancement alternatif sans Docker via scripts manuels (voir section dédiée)

**Structure du projet**
- Monorepo avec deux dossiers distincts : `frontend/` (Next.js App Router) et `backend/` (API REST Node.js/TypeScript)
- Le frontend Next.js consomme l'API du backend via fetch depuis les Server Components et les Client Components
- Les deux services communiquent dans le même réseau Docker via Nginx

---

## Architecture générale

Le backend expose une API REST sécurisée construite en Node.js/TypeScript. Chaque requête est authentifiée via un token Firebase vérifié côté serveur. Le frontend Next.js (App Router) consomme cette API depuis ses Server Components pour le rendu initial, et depuis ses Client Components pour les interactions dynamiques. Redis s'intercale entre le backend et MySQL pour mettre en cache les données fréquemment lues et gérer les traitements asynchrones. Nginx redirige le trafic : les routes `/api/*` vers le backend, le reste vers le frontend Next.js. Tous les services tournent dans des conteneurs Docker orchestrés par Docker Compose.

---

## Authentification (Firebase)

- Connexion et déconnexion via Firebase Authentication (Email/Password)
- À la connexion, le token Firebase est transmis à chaque appel API via un en-tête Authorization
- Le backend vérifie le token Firebase à chaque requête avant d'autoriser l'accès
- Gestion des sessions : rafraîchissement automatique du token côté frontend
- Réinitialisation de mot de passe via Firebase
- Invitation d'utilisateurs par email avec lien d'activation
- Déploiement des règles de sécurité Firebase pour protéger les données sensibles

---

## Fonctionnalités principales

### Gestion des utilisateurs
- Création, modification et désactivation des comptes utilisateurs
- Synchronisation des utilisateurs Firebase avec la base de données MySQL
- Affichage des permissions effectives d'un utilisateur (cumulées depuis ses rôles, département et permissions directes)
- Invitation d'un utilisateur par email avec attribution de rôle initial
- Historique des modifications sur chaque compte

### Gestion des rôles
- Création et modification de rôles personnalisés par organisation
- Attribution de permissions à un rôle
- Attribution de rôles à des utilisateurs ou départements
- Rôles système non supprimables (ex. Super Admin)
- Permissions temporaires avec date d'expiration

### Gestion des permissions
- Les permissions sont atomiques et liées à des modules (ex. users.create, reports.export)
- Chaque permission a une action : créer, lire, modifier, supprimer, exporter, etc.
- Possibilité d'accorder ou refuser explicitement une permission directement à un utilisateur (override du rôle)

### Gestion des modules
- Les modules représentent les sections ou fonctionnalités de l'application (ex. Utilisateurs, Rapports, Facturation)
- Chaque permission est rattachée à un module
- Activation ou désactivation d'un module

### Gestion des départements
- Création et modification de départements au sein de l'organisation
- Chaque département a un nom, une description et un manager unique désigné
- Un manager ne peut appartenir qu'à un seul département à la fois
- Tous les utilisateurs et employés sont obligatoirement rattachés à un département
- Attribution de rôles à un département entier : tous les membres héritent automatiquement des rôles du département
- Ajout et retrait de membres dans un département
- Suppression d'un département impossible s'il contient encore des utilisateurs actifs

### Demande de permission par procuration
Un utilisateur connecté peut soumettre une demande de permission au nom d'un autre utilisateur qui se trouve dans l'incapacité temporaire de se connecter à son compte (absence, problème technique, incapacité physique, etc.).

- Tout utilisateur authentifié peut initier une demande au nom d'un collègue en le sélectionnant dans la liste des utilisateurs de l'organisation
- La demande indique clairement qui l'a soumise et pour qui elle est faite (champ "soumis par" distinct du champ "bénéficiaire")
- L'utilisateur bénéficiaire reçoit une notification (push et email) l'informant qu'une demande a été faite en son nom, avec un lien pour confirmer ou rejeter cette demande dès qu'il retrouve accès à son compte
- Le manager ou l'administrateur voit dans l'interface de validation à la fois le nom du demandeur et celui du bénéficiaire
- Toutes les demandes par procuration sont tracées dans le journal d'audit avec mention explicite du mandataire
- Un badge visuel identifie ces demandes dans toutes les listes et tableaux de bord

### Délégation de rôle par un manager
En cas d'absence prévue ou imprévue, un manager peut déléguer temporairement son rôle et ses responsabilités d'approbation à un autre utilisateur de son équipe ou de son organisation.

- Le manager désigne un délégataire parmi les utilisateurs de l'organisation, pour une période définie (date de début et date de fin obligatoires)
- Pendant la période de délégation, le délégataire dispose des mêmes droits d'approbation que le manager absent pour son périmètre
- Le manager peut créer, modifier ou révoquer une délégation à tout moment depuis son interface
- Les décisions prises par un délégataire sont clairement identifiées dans l'historique et le journal d'audit par un badge "décision par délégation", avec le nom du délégataire et celui du manager d'origine
- L'administrateur peut voir toutes les délégations actives dans l'organisation et en révoquer une si nécessaire
- Une notification est envoyée au délégataire lors de la création, modification ou expiration de la délégation
- Une délégation expirée est automatiquement désactivée et archivée ; les droits du manager original sont restaurés sans intervention manuelle

### Journal d'audit
- Enregistrement immuable de toutes les actions sensibles : attribution/révocation de rôle, modification de permission, connexion, invitation, etc.
- Chaque entrée contient : l'auteur de l'action, l'utilisateur ciblé, la date, l'action effectuée, et les valeurs avant/après
- Filtres avancés : par utilisateur, action, entité, plage de dates
- Export du journal en CSV ou PDF

### Notifications — Architecture multi-provider

Le système de notifications est construit autour d'une interface abstraite `INotificationProvider`. Chaque provider implémente la même interface. Le backend instancie le bon provider selon la variable `NOTIFICATION_PROVIDER` au démarrage, sans modifier le code métier.

**Événements déclenchant une notification :**
- Attribution ou révocation d'un rôle ou permission
- Expiration d'une permission temporaire (J-7 et J-1)
- Acceptation ou refus d'une invitation
- Connexion depuis un nouvel appareil ou IP inhabituelle
- Approbation, rejet ou annulation d'une demande de congé
- Création ou expiration d'une délégation
- Annonce globale de niveau critique
- Blocage de compte après tentatives échouées

**Provider Telegram (développement + option production) :**
- Utilisé automatiquement quand `NOTIFICATION_PROVIDER=telegram` dans le `.env`
- Création d'un bot via @BotFather → récupération du `TELEGRAM_BOT_TOKEN`
- Chaque utilisateur lie son compte Telegram en démarrant une conversation avec le bot (`/start`) → le `chat_id` est stocké dans `user_preferences`
- Le frontend affiche dans les paramètres utilisateur un lien direct `https://t.me/NomDuBot?start={userId}` pour lier facilement le compte
- Les notifications sont envoyées via une requête HTTP simple à `https://api.telegram.org/bot{TOKEN}/sendMessage`
- Les messages utilisent le formatage Markdown de Telegram pour une présentation claire
- **Boutons d'action inline** : les demandes de congé envoyées au manager incluent des boutons ✅ Approuver et ❌ Rejeter directement dans le message Telegram — le manager approuve sans ouvrir l'application
- En développement, si un utilisateur n'a pas lié son Telegram, la notification est loguée dans la console au lieu d'être envoyée (pas d'erreur bloquante)

**Provider Firebase FCM + Gmail (production par défaut) :**
- Utilisé quand `NOTIFICATION_PROVIDER=firebase` dans le `.env`
- Firebase Cloud Messaging pour les notifications push navigateur (quand l'app est fermée)
- Gmail API pour les emails transactionnels (invitation, blocage de compte, annonces critiques)
- Nécessite la `FIREBASE_VAPID_KEY` pour les notifications push web
- Les deux canaux (push + email) sont envoyés simultanément via BullMQ

**Mode hybride (option production avancée) :**
- Utilisé quand `NOTIFICATION_PROVIDER=hybrid` dans le `.env`
- Firebase FCM + Gmail pour les utilisateurs sans compte Telegram lié
- Telegram pour les utilisateurs ayant lié leur compte Telegram (prioritaire car plus fiable)
- Chaque utilisateur voit dans ses préférences quel canal est actif pour son compte

**Préférences utilisateur :**
- Chaque utilisateur peut activer ou désactiver les notifications par type d'événement
- Il peut choisir ses canaux préférés (push, email, Telegram) selon les providers disponibles
- Centre de notifications in-app avec marquage lu/non lu, indépendant du provider externe

### Rôle Administrateur — Contrôle total de l'application
L'administrateur est le seul rôle disposant d'un accès complet et sans restriction à toutes les fonctionnalités de l'application, directement depuis son compte.

**Gestion des utilisateurs :**
- Créer, modifier, désactiver ou supprimer n'importe quel compte utilisateur
- Réinitialiser le mot de passe d'un utilisateur via Firebase
- Attribuer ou révoquer n'importe quel rôle ou permission à n'importe quel utilisateur
- Soumettre une demande de permission au nom de n'importe quel utilisateur
- Consulter le profil complet, les permissions effectives et l'historique de chaque utilisateur

**Gestion des rôles et permissions :**
- Créer, modifier et supprimer des rôles (y compris les rôles système avec confirmation)
- Définir la matrice complète des permissions par rôle
- Accorder ou refuser une permission directement à un utilisateur (override individuel)
- Créer, modifier et supprimer des modules et leurs permissions associées

**Gestion des départements et délégations :**
- Créer, modifier et supprimer des départements
- Gérer les membres et le manager de chaque département
- Voir toutes les délégations actives dans l'organisation
- Révoquer une délégation de manager à tout moment

**Configuration de l'organisation :**
- Modifier les informations de l'organisation (nom, paramètres généraux)
- Activer ou désactiver des modules de l'application
- Configurer les paramètres de notifications globaux

**Audit et supervision :**
- Accéder à l'intégralité du journal d'audit sans restriction de périmètre
- Exporter l'audit complet en CSV ou PDF
- Consulter les statistiques globales de l'organisation (utilisateurs actifs, rôles les plus utilisés, permissions expirées, etc.)

**Règle clé :** Aucune action dans l'application ne doit être inaccessible à l'administrateur. Il ne peut jamais se retrouver bloqué par une restriction de rôle ou de permission. Son accès est inconditionnel et prioritaire sur toute autre règle de contrôle d'accès.

---

## Interfaces utilisateur (Frontend React)

**Pages à créer :**
- Page de connexion (Email/Password Firebase)
- Page de réinitialisation de mot de passe
- Page d'acceptation d'invitation
- Dashboard principal : statistiques globales, activité récente, alertes (permissions expirées, invitations en attente)
- Liste et détail des utilisateurs avec permissions effectives
- Gestion des rôles : création, édition, attribution de permissions via matrice visuelle
- Gestion des permissions groupées par module
- Gestion des modules
- Gestion des départements, de leurs membres et de leur manager
- Journal d'audit avec filtres et export
- Page de demande de permission par procuration : sélection du bénéficiaire, choix de la permission, motif
- Page de gestion des délégations (pour les managers) : créer, modifier, révoquer une délégation avec période définie
- Vue administrateur des délégations actives dans toute l'organisation
- Paramètres : profil, préférences de notification, configuration de l'organisation

**Navigation :**
- Barre latérale avec accès conditionnel selon le rôle de l'utilisateur connecté
- Routes protégées : l'accès à chaque page est vérifié selon les permissions de l'utilisateur connecté

---

## Base de données (Drizzle ORM + MySQL)

**Tables principales :**
- `organizations` : structures/entreprises
- `users` : utilisateurs synchronisés avec Firebase (contient `department_id` — clé étrangère vers `departments`, obligatoire)
- `user_preferences` : préférences utilisateur incluant `telegram_chat_id` (nullable — rempli quand l'utilisateur lie son Telegram), `notification_channels` (JSON), `theme`, `density`, `language`
- `modules` : sections de l'application
- `permissions` : permissions atomiques liées à un module et une action
- `roles` : rôles par organisation
- `role_permissions` : liaison rôles et permissions
- `user_roles` : attribution de rôles aux utilisateurs avec expiration optionnelle
- `user_permissions` : permissions directes sur un utilisateur (accordées ou refusées explicitement)
- `departments` : départements de l'organisation (nom, description, manager_id)
- `department_members` : rattachement des utilisateurs à leur département
- `department_roles` : rôles attribués à un département entier
- `audit_logs` : journal d'audit immuable
- `invitations` : invitations par email avec token et statut
- `notifications` : notifications in-app
- `delegations` : délégations de rôle manager (délégataire, manager, date début, date fin, statut actif/expiré)
- `proxy_requests` : demandes soumises par procuration (champ bénéficiaire + champ mandataire + statut de confirmation du bénéficiaire)

Migrations gérées via Drizzle Kit. Un script de seed initialise les données de base : organisation par défaut, modules système, rôle Super Admin.

---

## Fichiers SQL — Initialisation de la base de données

Tous les fichiers SQL sont placés dans le dossier `database/` à la racine du monorepo. Ils sont conçus pour être copiés et collés directement dans un client MySQL (MySQL Workbench, DBeaver, phpMyAdmin, ou le terminal MySQL). Ils doivent être exécutés dans l'ordre indiqué.

### Ordre d'exécution

```
database/
├── 01_create_database.sql       Création de la base et sélection
├── 02_create_tables.sql         Création de toutes les tables avec clés étrangères
├── 03_seed_data.sql             Données initiales (modules, rôles système, types de congés, etc.)
└── 04_create_admin.sql          Création du compte Super Administrateur
```

---

### `01_create_database.sql`

Ce fichier crée la base de données avec l'encodage UTF-8 et la sélectionne pour les opérations suivantes.

- Crée la base `permission_manager` si elle n'existe pas
- Définit le jeu de caractères `utf8mb4` et la collation `utf8mb4_unicode_ci` pour supporter tous les caractères incluant les emojis
- Sélectionne la base pour les fichiers suivants

---

### `02_create_tables.sql`

Ce fichier crée toutes les tables de l'application dans le bon ordre pour respecter les dépendances des clés étrangères.

**Ordre de création des tables :**
1. `organizations`
2. `users`
3. `user_preferences`
4. `modules`
5. `permissions`
6. `roles`
7. `role_permissions`
8. `user_roles`
9. `user_permissions`
10. `departments`
11. `department_members`
12. `department_roles`
13. `leave_types`
14. `leave_requests`
15. `leave_periods`
16. `leave_attachments`
17. `leave_quotas`
18. `leave_carry_over_logs`
19. `seniority_tiers`
20. `public_holidays`
21. `blackout_periods`
22. `delegations`
23. `proxy_requests`
24. `invitations`
25. `notifications`
26. `login_attempts`
27. `audit_logs`
28. `announcements`
29. `announcement_dismissals`
30. `conversations`
31. `conversation_participants`
32. `messages`

**Chaque table inclut :**
- Clé primaire auto-incrémentée (`id INT AUTO_INCREMENT PRIMARY KEY`)
- Clés étrangères avec `ON DELETE CASCADE` ou `ON DELETE SET NULL` selon le comportement attendu
- Colonnes `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` et `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` sur toutes les tables principales
- Index sur les colonnes fréquemment utilisées en filtre ou en jointure (ex. `firebase_uid`, `email`, `organization_id`, `status`)

---

### `03_seed_data.sql`

Ce fichier insère toutes les données de référence nécessaires au fonctionnement de l'application dès le démarrage.

**Données insérées :**

- **Organisation par défaut** : une organisation initiale nommée "Mon Organisation" avec le slug `mon-organisation`

- **Modules système** : les modules de base de l'application
  - Utilisateurs (`users`)
  - Rôles (`roles`)
  - Permissions (`permissions`)
  - Départements (`departments`)
  - Congés (`leaves`)
  - Audit (`audit`)
  - Rapports (`reports`)
  - Notifications (`notifications`)
  - Messagerie (`messages`)
  - Départements (`departments`)
  - Administration (`admin`)

- **Permissions atomiques** : pour chaque module, les permissions CRUD standards sont créées automatiquement (`create`, `read`, `update`, `delete`) plus les permissions spécifiques (`approve` pour les congés, `export` pour l'audit et les rapports, `simulate` pour le simulateur)

- **Rôles système** (non supprimables) :
  - `Super Admin` : accès total à toutes les permissions
  - `Manager` : permissions d'approbation congés, lecture et gestion de son département, délégation
  - `Superviseur RH` : lecture de tous les départements, export rapports
  - `Employé` : permissions de base (soumettre congés, voir son profil, messagerie)

- **Règle de rattachement** : chaque utilisateur doit être rattaché à un département. Le rattachement est obligatoire à la création du compte. Un département sans manager désigné reste fonctionnel mais les demandes de congés de ses membres remontent directement à l'administrateur

- **Attribution des permissions aux rôles** : la matrice complète définie dans la section "Matrice des accès par rôle" est traduite en insertions dans `role_permissions`

- **Types de congés par défaut** :
  - Congés payés (25 jours/an, cumulable jusqu'à 10 jours, validation manager requise)
  - Congés maladie (illimité, non cumulable, auto-approbation avec justificatif)
  - RTT (jours selon accord, non cumulable, libre sans validation)
  - Congés sans solde (0 jour quota, non cumulable, validation manager requise)
  - Congés exceptionnels (variable selon événement, non cumulable, auto-approbation avec justificatif)

- **Paliers d'ancienneté par défaut** :
  - 3 ans → +2 jours de congés payés
  - 5 ans → +3 jours supplémentaires (total +5)
  - 10 ans → +3 jours supplémentaires (total +8)

---

### `04_create_admin.sql`

Ce fichier crée le compte Super Administrateur de l'application. Il doit être exécuté après les trois premiers fichiers et après avoir créé manuellement le compte dans Firebase Authentication.

**Avant d'exécuter ce fichier :**
1. Créer le compte dans la console Firebase Authentication (Email/Password) avec l'email et le mot de passe souhaités
2. Récupérer le `UID` Firebase généré (visible dans la console Firebase sous Authentication → Users)
3. Remplacer les valeurs suivantes dans le fichier avant de l'exécuter :
   - `FIREBASE_UID_ICI` → l'UID Firebase récupéré à l'étape 2
   - `email@exemple.com` → l'adresse email de l'administrateur
   - `Prénom` → le prénom de l'administrateur
   - `Nom` → le nom de l'administrateur

**Ce que le fichier fait :**
- Insère l'utilisateur dans la table `users` avec le `firebase_uid` fourni
- Insère les préférences par défaut dans `user_preferences` (thème `system`, densité `normal`)
- Attribue le rôle `Super Admin` à cet utilisateur dans `user_roles`
- Insère un quota de congés initial pour chaque type de congé actif

**Note de sécurité :** Ce fichier contient des données sensibles (email, UID Firebase). Ne pas le versionner dans Git après personnalisation. Le fichier original dans le dépôt contient uniquement des valeurs placeholder.

---

## Docker & Nginx

Cinq services dans Docker Compose :
- `mysql` : base de données avec volume persistant et healthcheck
- `redis` : cache et file d'attente avec volume persistant, accessible uniquement en réseau Docker interne
- `backend` : API REST Node.js/TypeScript avec Nodemon en développement
- `frontend` : application Next.js (App Router)
- `nginx` : reverse proxy qui route `/api/*` vers le backend et tout le reste vers le frontend Next.js

Nginx gère également la compression, les headers de sécurité HTTP et le support HTTPS.

---

## Sécurité

- Toutes les routes API sont protégées par vérification du token Firebase
- Un middleware de rôle vérifie les permissions avant chaque action sensible
- Les logs d'audit sont en écriture seule, aucune modification ou suppression n'est possible
- Les mots de passe ne transitent jamais par le backend, ils sont gérés intégralement par Firebase
- Headers de sécurité HTTP configurés dans Nginx
- Toutes les clés sensibles (Firebase, DB) passent par des variables d'environnement, jamais en dur dans le code

---

## Déploiement

- Un fichier `.env.example` documente toutes les variables d'environnement requises
- Le projet démarre avec une seule commande : `docker-compose up`
- Documentation à fournir : architecture générale, liste des routes API, guide d'installation, guide d'administration

---

## Lancement sans Docker

Le projet doit pouvoir être démarré intégralement sans Docker, pour les environnements de développement local ou les machines sans Docker installé. Deux modes de lancement sont donc supportés en parallèle :

**Mode Docker (production / déploiement)**
- `docker-compose up` démarre tous les services en une commande

**Mode manuel sans Docker (développement local)**
- Un fichier `README.md` détaille les étapes de lancement manuel :
  - Vérifie que Node.js, npm, MySQL et Redis sont installés sur la machine
  - Installe les dépendances du backend et du frontend si nécessaire (`npm install`)
  - Applique les migrations Drizzle sur la base de données MySQL locale
  - Lance le backend avec Nodemon en arrière-plan
  - Lance le frontend avec Vite en arrière-plan
  - Affiche les URLs d'accès (backend et frontend) dans le terminal
- Un script `scripts/stop-dev.sh` arrête proprement les deux processus
- Les variables d'environnement sont lues depuis les fichiers `.env` locaux de chaque dossier (`backend/.env` et `frontend/.env`)
- La base de données MySQL doit être installée localement par le développeur (ou via un service cloud) ; le script vérifie la connexion avant de démarrer
- Le script d'importation de base de données (`scripts/import-db.sh`) fonctionne aussi bien en mode Docker qu'en mode manuel

**Prérequis documentés pour le mode sans Docker :**
- Node.js version 18 ou supérieure
- npm version 9 ou supérieure
- MySQL 8.0 installé et en cours d'exécution localement
- Redis installé et en cours d'exécution localement (port 6379 par défaut)
- Un compte Firebase avec les clés de configuration disponibles
- Les fichiers `.env` correctement remplis à partir des `.env.example`

---

## Animations (Framer Motion)

L'interface utilise Framer Motion pour offrir une expérience fluide et professionnelle. Les animations doivent être subtiles, rapides et cohérentes sur toute l'application. Elles ne doivent jamais ralentir la navigation ni distraire l'utilisateur.

**Principes généraux :**
- Durées courtes : entre 200ms et 400ms selon le type d'animation
- Courbes d'accélération naturelles (ease-out pour les entrées, ease-in pour les sorties)
- Respect des préférences d'accessibilité : si l'utilisateur a activé "réduire les animations" dans son système, toutes les animations doivent être désactivées ou réduites à de simples opacités

**Transitions de pages :**
- Chaque changement de page produit une transition en fondu enchaîné avec léger glissement vertical (fade + translateY)
- La page sortante disparaît rapidement, la page entrante s'installe avec un léger rebond final

**Éléments de liste et tableaux :**
- Les lignes d'un tableau ou les cartes d'une liste apparaissent en cascade (stagger) : chaque élément entre avec un décalage de 40ms par rapport au précédent
- Effet : glissement depuis le bas avec fondu, donnant l'impression que la liste se construit progressivement

**Cartes de statistiques (Dashboard) :**
- À l'ouverture du dashboard, les cartes de statistiques entrent en cascade avec un léger effet de scale (de 0.95 à 1) et fondu
- Les compteurs numériques s'animent en incrémentant depuis 0 jusqu'à la valeur réelle (animation de comptage)

**Modales et panneaux latéraux :**
- Les modales apparaissent avec un scale de 0.9 à 1 et un fondu ; elles disparaissent en sens inverse
- Les panneaux latéraux (drawers) glissent depuis le bord de l'écran (slide-in depuis la droite ou le bas)
- L'arrière-plan se noircit progressivement avec l'ouverture de la modale

**Notifications et toasts :**
- Les notifications toast entrent par le haut ou le bas de l'écran en glissant, avec un rebond léger à l'arrivée
- Elles disparaissent en glissant vers le côté, comme balayées

**Boutons et interactions :**
- Les boutons d'action principale ont un léger scale au survol (1.02) et un scale plus marqué au clic (0.97), donnant un retour tactile visuel
- Les icônes dans la navigation latérale ont un effet de scale et changement de couleur animé lors de la sélection

**Badges et alertes :**
- Les badges de notification (nombre de messages non lus) pulsent légèrement lors de l'arrivée d'une nouvelle notification
- Les alertes d'expiration de permission apparaissent avec un shake subtil pour attirer l'attention

**Matrice de permissions :**
- Lorsqu'une permission est cochée ou décochée, la case s'anime avec un scale rapide (pop) et un changement de couleur progressif
- Les lignes de la matrice s'affichent en stagger lors du chargement initial

**Chargement et états vides :**
- Les skeletons de chargement ont une animation de shimmer (balayage lumineux de gauche à droite)
- Les états vides (aucun résultat) apparaissent avec un fondu et un léger rebond de l'illustration

---

## Simulateur de permissions

L'administrateur dispose d'un outil de simulation intégré à l'interface permettant de tester les droits d'un utilisateur sans modifier quoi que ce soit en base de données.

- L'admin sélectionne un utilisateur et une action (ex. "peut-il accéder au module Rapports ?")
- Le système calcule en temps réel si cet utilisateur dispose du droit, et affiche le résultat avec une explication claire : via quel rôle, via quel département, ou via une permission directe la décision a été prise
- Si le droit est refusé, le simulateur explique pourquoi : permission absente, permission explicitement refusée, rôle expiré, etc.
- Le simulateur affiche la chaîne complète de résolution : rôles hérités → permissions de département → permissions directes → règle de conflit appliquée
- Aucune action du simulateur n'est enregistrée dans le journal d'audit (c'est une consultation, pas une modification)
- Accessible uniquement par les administrateurs depuis une page dédiée "Simulateur de permissions" dans le menu Administration

---

## Règle de résolution des conflits de permissions

Lorsqu'un utilisateur dispose de plusieurs sources de permissions contradictoires (rôle, département, permission directe), une règle de priorité claire et immuable s'applique dans cet ordre :

1. **Permission directe explicitement refusée** (granted = false sur l'utilisateur) — priorité absolue, écrase tout le reste
2. **Permission directe explicitement accordée** (granted = true sur l'utilisateur) — écrase les rôles et le département
3. **Permission héritée d'un rôle attribué directement à l'utilisateur**
4. **Permission héritée via le département** auquel appartient l'utilisateur

Cette règle doit être documentée dans le README technique, appliquée de manière identique dans le backend à chaque calcul de permissions effectives, et visible dans le simulateur de permissions. Aucune exception ne peut être faite à cette hiérarchie. Si deux sources de même niveau sont en conflit (ex. deux rôles, l'un accordant et l'autre refusant), le refus prend toujours le dessus par sécurité.

---

## Logging structuré (Winston)

Le backend utilise un système de logging structuré basé sur Winston pour faciliter le débogage, la supervision et le diagnostic en production.

**Niveaux de log :**
- `error` : erreurs critiques (crash, échec de connexion DB, token Firebase invalide)
- `warn` : comportements anormaux non bloquants (tentative d'accès refusée, permission expirée utilisée)
- `info` : événements métier normaux (connexion réussie, permission attribuée, délégation créée)
- `debug` : détails techniques pour le développement (requêtes SQL, payloads des requêtes)

**Format des logs :**
- Chaque entrée de log est au format JSON avec les champs : timestamp, niveau, message, userId (si authentifié), route, durée de la requête, et contexte additionnel
- En développement, les logs sont affichés dans le terminal avec couleurs et formatage lisible
- En production (Docker), les logs sont écrits dans des fichiers rotatifs (un fichier par jour, conservation 30 jours) et également envoyés sur la sortie standard pour être captés par Docker

**Route de health check :**
- Le backend expose une route `GET /health` retournant l'état du service : connexion base de données active, uptime, version de l'application
- Nginx et Docker utilisent cette route pour vérifier que le backend est opérationnel avant de router le trafic

---

## Tableau de bord RH / Superviseur

Un dashboard dédié aux responsables RH et superviseurs offre une vue consolidée de l'état des permissions dans toute l'organisation, sans avoir à naviguer utilisateur par utilisateur.

**Vue par département :**
- Liste de tous les départements avec, pour chacun : nombre d'utilisateurs, rôles attribués, nombre de permissions actives
- Possibilité de cliquer sur un département pour voir le détail des utilisateurs et leurs permissions

**Alertes et surveillance :**
- Liste des permissions et rôles arrivant à expiration dans les 7 prochains jours, avec lien direct vers l'utilisateur concerné
- Liste des délégations de manager actuellement actives dans l'organisation, avec dates de début et de fin
- Liste des invitations en attente non acceptées depuis plus de 48h
- Indicateur des utilisateurs n'ayant aucun rôle attribué (comptes orphelins)

**Exports :**
- Export CSV ou PDF de la vue complète des permissions par département
- Export de la liste des droits en cours d'expiration

**Accès :**
- Ce tableau de bord est accessible aux administrateurs et aux utilisateurs ayant le rôle Superviseur RH
- Le superviseur RH voit uniquement les données de son ou ses départements ; l'administrateur voit l'ensemble de l'organisation

---

## Commentaires sur les attributions et révocations

Chaque action d'attribution ou de révocation d'un rôle ou d'une permission peut être accompagnée d'un commentaire de justification.

- Lors de l'attribution ou la révocation d'un rôle ou d'une permission, un champ texte optionnel permet à l'auteur de saisir la raison de la décision (ex. "Promotion au poste de chef de projet", "Départ de l'employé", "Remplacement temporaire durant congé maternité")
- Ce commentaire est enregistré et affiché dans le journal d'audit à côté de l'action correspondante
- Le commentaire est également visible dans le profil de l'utilisateur concerné, dans l'historique de ses permissions
- Pour les révocations sensibles (suppression d'un rôle administrateur, refus explicite d'une permission), le commentaire devient obligatoire afin de garantir une traçabilité complète
- Les commentaires sont immuables une fois enregistrés : ils ne peuvent être ni modifiés ni supprimés, même par l'administrateur

---

## Gestion des congés et solde annuel

### Quota annuel de congés par utilisateur

Chaque utilisateur dispose d'un solde de jours de congés défini annuellement par l'organisation ou par son département. Ce solde est visible à tout moment depuis son tableau de bord personnel.

**Configuration du quota :**
- L'administrateur définit le nombre de jours de congés annuels par défaut pour toute l'organisation (ex. 25 jours ouvrables par an)
- Ce quota peut être surchargé individuellement pour un utilisateur spécifique (ex. ancienneté, contrat particulier)
- Il peut également varier par département ou par type de contrat
- Plusieurs types de congés peuvent coexister avec leurs propres quotas : congés payés, congés maladie, congés sans solde, RTT, congés exceptionnels, etc.

**Affichage du solde utilisateur :**
- Sur le tableau de bord de l'utilisateur, une carte de solde affiche pour chaque type de congé : le quota annuel total, le nombre de jours déjà utilisés, le nombre de jours restants, et le nombre de jours en cours de validation
- Une barre de progression visuelle indique le niveau de consommation du solde
- Une alerte est affichée lorsque le solde restant passe sous un seuil configurable (ex. 5 jours restants)
- Le solde est mis à jour en temps réel dès qu'une demande est approuvée ou annulée

### Cumul des congés (report d'une année sur l'autre)

Certaines organisations autorisent le report des jours de congés non utilisés d'une année à l'autre. Ce comportement est configurable par l'administrateur.

**Configuration du cumul :**
- L'administrateur peut activer ou désactiver le cumul de congés pour toute l'organisation ou par département
- Si le cumul est activé, un plafond de report peut être défini (ex. maximum 10 jours reportables d'une année sur l'autre)
- Une date de clôture annuelle est configurée (ex. 31 décembre) : à cette date, les jours non utilisés au-delà du plafond sont automatiquement perdus, et les jours dans la limite du plafond sont ajoutés au solde de l'année suivante
- L'historique du cumul est conservé et consultable par l'utilisateur et l'administrateur
- L'administrateur peut ajuster manuellement le solde cumulé d'un utilisateur avec un commentaire de justification obligatoire

**Règles de cumul :**
- Les congés maladie et congés exceptionnels ne sont généralement pas cumulables : ce comportement est paramétrable par type de congé
- Un rapport annuel de clôture est généré automatiquement à la date de clôture, récapitulant pour chaque utilisateur : jours utilisés, jours perdus, jours reportés

---

## Calendrier de suivi des permissions et congés

### Calendrier personnel (vue utilisateur)

Chaque utilisateur dispose d'un calendrier personnel dédié accessible depuis son tableau de bord. Ce calendrier centralise toutes les informations temporelles liées à ses permissions et ses congés.

**Contenu du calendrier utilisateur :**
- Les jours de congés approuvés sont affichés en vert avec le type de congé indiqué
- Les jours de congés en attente de validation sont affichés en jaune/orange
- Les jours de congés refusés restent visibles en rouge pour l'historique du mois en cours
- Un compte à rebours est affiché pour les permissions temporaires actives : "X jours restants avant expiration de la permission [nom]"
- Les rôles et permissions à expiration proche (moins de 7 jours) sont mis en évidence avec une alerte visuelle sur le calendrier
- L'utilisateur peut naviguer mois par mois et voir une vue annuelle synthétique de ses congés

**Compteurs et indicateurs :**
- En haut du calendrier, des indicateurs résumés : jours de congés restants cette année, jours posés, jours en attente, jours cumulés reportés de l'année précédente
- Un indicateur spécifique signale les permissions qui expirent dans les 30 prochains jours avec leur date exacte

### Calendrier manager (vue équipe)

Le manager dispose d'un calendrier d'équipe lui permettant de suivre simultanément les congés et les permissions de tous les membres de son département.

**Contenu du calendrier manager :**
- Vue mensuelle avec toutes les absences de l'équipe superposées sur un même calendrier
- Chaque utilisateur est représenté par une couleur distincte pour faciliter la lecture
- Le manager voit en un coup d'œil les jours où plusieurs membres sont absents simultanément, avec un indicateur de charge (ex. "3 personnes absentes ce jour")
- Les permissions temporaires de ses collaborateurs arrivant à expiration sont signalées directement sur le calendrier avec un badge d'alerte
- Le manager peut filtrer la vue par type de congé, par statut (approuvé, en attente), ou par collaborateur spécifique
- Une vue hebdomadaire est disponible pour un suivi plus fin de la semaine courante

**Alertes proactives pour le manager :**
- Une section "À faire" liste les congés en attente d'approbation avec leur date de début, pour éviter qu'une demande reste sans réponse trop longtemps
- Une section "Expirations à venir" liste toutes les permissions temporaires de l'équipe qui expirent dans les 14 prochains jours, avec un lien direct pour renouveler ou révoquer
- Si un collaborateur approche du solde zéro de congés, une alerte apparaît sur le calendrier manager pour anticiper la situation

**Exports du calendrier :**
- Le manager peut exporter le planning de son équipe en PDF ou CSV pour une période donnée
- L'export inclut : nom des collaborateurs, dates d'absence, types de congés, soldes restants de chaque membre

### Tables supplémentaires en base de données

- `leave_quotas` : quota annuel par utilisateur et par type de congé (total, utilisé, reporté de l'année précédente, plafond de cumul)
- `leave_carry_over_logs` : historique des reports annuels (année, utilisateur, jours reportés, jours perdus, date de clôture)
- `leave_types` : types de congés configurables par l'organisation (nom, cumulable oui/non, plafond de cumul, déductible du quota oui/non)
- `permission_expirations` : vue ou table dénormalisée des permissions et rôles avec date d'expiration, pour alimenter efficacement les alertes calendrier sans recalcul systématique

---

## Mode sombre / clair

L'application propose un basculement entre un thème clair et un thème sombre, avec persistance de la préférence de l'utilisateur entre les sessions.

### Comportement général

- Un bouton de basculement (toggle) est accessible en permanence depuis la barre de navigation supérieure, visible sur toutes les pages de l'application
- La transition entre les deux thèmes est animée via Framer Motion : un fondu progressif de 300ms sur l'ensemble de l'interface pour éviter un changement brutal
- Au premier lancement, le thème appliqué par défaut correspond à la préférence système de l'appareil de l'utilisateur (détectée via la propriété CSS `prefers-color-scheme`)
- Si l'utilisateur choisit manuellement un thème, ce choix prend le dessus sur la préférence système et est conservé

### Persistance de la préférence

- La préférence de thème (clair ou sombre) est sauvegardée en base de données dans le profil de l'utilisateur, dans la table `user_preferences`
- Elle est chargée dès l'authentification et appliquée avant le premier rendu de l'interface pour éviter tout flash de thème incorrect (FOUC — Flash of Unstyled Content)
- Si l'utilisateur se connecte depuis un autre appareil ou navigateur, son thème préféré est automatiquement restauré
- En attendant le chargement de la préférence depuis le serveur, le thème système est appliqué temporairement comme valeur de repli

### Couverture des thèmes

Les deux thèmes couvrent l'intégralité de l'interface sans exception :
- Toutes les pages (dashboard, listes, formulaires, modales, calendrier, journal d'audit, simulateur)
- Tous les composants (tableaux, cartes, badges, alertes, toasts, navigation latérale, barre supérieure)
- Les graphiques et visualisations de données (couleurs adaptées pour rester lisibles dans les deux modes)
- Les animations Framer Motion (les couleurs animées respectent le thème actif)
- Les emails de notification ne sont pas concernés par ce paramètre (ils ont leur propre template fixe)

### Thème sombre — principes visuels

- Arrière-plan principal : gris très foncé (pas noir pur, pour réduire la fatigue oculaire)
- Surfaces des cartes et panneaux : gris légèrement plus clair que l'arrière-plan pour créer de la hiérarchie
- Texte principal : blanc cassé (pas blanc pur)
- Couleurs d'accentuation (boutons, liens, badges) : légèrement désaturées par rapport au thème clair pour éviter l'éblouissement
- Ombres remplacées par des bordures subtiles pour délimiter les éléments sur fond sombre

### Thème clair — principes visuels

- Arrière-plan principal : blanc ou gris très clair
- Surfaces des cartes : blanc avec ombres douces
- Texte principal : gris très foncé (pas noir pur)
- Couleurs d'accentuation vives et saturées

### Table supplémentaire en base de données

- La table `user_preferences` stocke les préférences de chaque utilisateur : `theme` (`light`/`dark`/`system`), `telegram_chat_id` (lien avec le compte Telegram de l'utilisateur), `notification_channels` (JSON des canaux activés par type d'événement), densité d'affichage, langue, etc.

---

## Blocage temporaire de compte

Après un nombre configurable de tentatives de connexion échouées consécutives, le compte de l'utilisateur est temporairement bloqué pour protéger l'organisation contre les attaques par force brute.

**Fonctionnement :**
- L'administrateur configure le seuil de blocage (ex. 5 tentatives échouées) et la durée du blocage temporaire (ex. 15 minutes, 1 heure) depuis les paramètres de sécurité de l'organisation
- Après dépassement du seuil, le compte est automatiquement verrouillé pour la durée définie. L'utilisateur voit un message clair lui indiquant que son compte est temporairement bloqué et lui communique le temps d'attente restant
- Une notification email est envoyée à l'utilisateur concerné et à l'administrateur pour les alerter du blocage
- Le blocage est levé automatiquement à l'expiration du délai, sans intervention manuelle
- L'administrateur peut débloquer manuellement un compte à tout moment depuis la fiche utilisateur, avec un commentaire de justification enregistré dans le journal d'audit
- Chaque tentative échouée et chaque blocage sont enregistrés dans le journal d'audit avec l'adresse IP source
- Après un blocage, le compteur de tentatives est remis à zéro

**Table supplémentaire :**
- La table `login_attempts` enregistre chaque tentative de connexion : userId, adresse IP, timestamp, succès ou échec, et statut de blocage associé

---

## Gestion avancée des congés

### Demande de congé fractionné

Un employé peut soumettre une demande de congé couvrant plusieurs périodes non consécutives regroupées en une seule demande, évitant ainsi de multiplier les formulaires pour un congé avec interruptions.

**Fonctionnement :**
- Dans le formulaire de demande de congé, l'employé peut ajouter plusieurs plages de dates distinctes au sein d'une même demande (ex. du 1er au 5 juillet + du 15 au 19 juillet)
- Le total de jours ouvrables de toutes les périodes est calculé automatiquement et comparé au solde disponible avant soumission
- Le manager voit toutes les périodes de la demande regroupées sur une même fiche de validation, avec le total de jours
- Le calendrier de l'équipe affiche chaque période distinctement avec un indicateur visuel les reliant à la même demande
- L'approbation ou le refus s'applique à l'ensemble de la demande fractionnée ; il n'est pas possible d'approuver certaines périodes et d'en refuser d'autres au sein d'une même demande
- Le décompte du solde de congés n'est effectué qu'à la validation finale de l'ensemble de la demande

### Gestion des jours fériés

Les jours fériés sont pris en compte dans le calcul des jours de congé : un jour férié tombant dans une période de congé ne consomme pas de jour du quota de l'employé.

**Configuration :**
- L'administrateur configure le pays ou la région de l'organisation pour charger automatiquement le calendrier des jours fériés officiels correspondant
- Il est possible de définir des jours fériés personnalisés propres à l'organisation (ex. journée de cohésion interne, fermeture exceptionnelle)
- Les jours fériés sont visibles sur le calendrier personnel de l'utilisateur et sur le calendrier d'équipe du manager, distingués visuellement des autres jours
- Lors du calcul d'une demande de congé, les jours fériés inclus dans la période sont automatiquement exclus du décompte et affichés à l'utilisateur (ex. "Votre demande couvre 7 jours calendaires dont 1 jour férié, soit 6 jours déduits de votre solde")
- Si un nouveau jour férié est ajouté rétroactivement par l'administrateur et qu'il tombe dans une période de congé déjà approuvée, le solde de l'employé concerné est automatiquement recalculé et ajusté

**Table supplémentaire :**
- La table `public_holidays` enregistre les jours fériés par pays/région et par année, avec un champ indiquant s'il s'agit d'un jour férié officiel ou personnalisé par l'organisation

### Congés collectifs obligatoires

Un manager ou un administrateur peut imposer une période de congé collectif à tout ou partie de l'équipe, par exemple lors d'une fermeture annuelle de l'entreprise.

**Fonctionnement :**
- Depuis son interface, le manager crée un congé collectif en définissant une plage de dates, le type de congé (ex. congés payés), et le périmètre concerné (toute l'équipe, un département spécifique, ou des utilisateurs sélectionnés individuellement)
- Une notification est envoyée à tous les employés concernés les informant du congé collectif imposé, avec les dates et le nombre de jours déduits de leur solde
- Les jours du congé collectif sont automatiquement déduits du solde de congés de chaque employé concerné et apparaissent sur leur calendrier personnel comme des congés approuvés
- L'employé ne peut pas annuler un congé collectif imposé par son manager ; seul le manager ou l'administrateur peut le modifier ou le supprimer
- Le congé collectif est visible sur le calendrier d'équipe avec une couleur distincte et un label "Congé collectif"
- L'administrateur peut créer des congés collectifs pour toute l'organisation, sans restriction de département

### Système de remplacement pendant un congé

Lors d'une demande de congé, l'employé peut désigner un collègue référent qui assurera le suivi de ses responsabilités pendant son absence.

**Fonctionnement :**
- Dans le formulaire de demande de congé, un champ optionnel permet à l'employé de sélectionner un collègue de l'organisation comme référent pour la durée de l'absence
- Le collègue désigné reçoit une notification (push et email) lui indiquant qu'il a été désigné comme référent, avec les dates de l'absence et un message optionnel laissé par l'employé partant
- Le référent doit accepter ou refuser ce rôle ; en cas de refus, l'employé partant est notifié et peut désigner un autre collègue
- Pendant la durée du congé, le nom du référent est affiché sur le profil de l'employé absent, visible par tous les membres de l'organisation qui consultent ce profil
- La désignation d'un référent est enregistrée dans le journal d'audit et apparaît sur le calendrier d'équipe du manager
- Le référent ne reçoit aucun droit ou permission supplémentaire automatiquement : il s'agit d'une information organisationnelle uniquement, sauf si le manager décide parallèlement de créer une délégation formelle

---

## Rapports et analyses

### Rapports PDF mensuels et annuels

L'application génère des rapports exportables en PDF couvrant les activités de l'organisation sur une période donnée.

**Rapports disponibles :**
- **Rapport de congés par département** : pour chaque département, nombre de jours de congés posés, approuvés, refusés, soldes restants moyens, taux de consommation du quota annuel, avec le nom du manager du département
- **Rapport d'utilisation des permissions** : liste des permissions les plus et les moins utilisées, utilisateurs ayant le plus de droits, évolution du nombre de rôles attribués sur la période
- **Rapport des délégations** : historique de toutes les délégations créées, leur durée effective, et les décisions prises par délégation
- **Rapport annuel de clôture** : récapitulatif par utilisateur des jours utilisés, reportés et perdus lors de la clôture annuelle des congés

**Génération :**
- Les rapports sont générés depuis la section Administration ou depuis le tableau de bord RH/superviseur
- L'utilisateur sélectionne le type de rapport, la période concernée (mois, trimestre, année) et le périmètre (toute l'organisation ou un département spécifique)
- La génération se fait côté serveur ; un lien de téléchargement est transmis à l'utilisateur une fois le fichier prêt
- Les rapports PDF incluent le logo de l'organisation, la date de génération, le nom de l'utilisateur ayant généré le rapport, et un numéro de référence unique

### Graphiques interactifs dans le tableau de bord admin

Le tableau de bord administrateur intègre des visualisations de données dynamiques permettant de surveiller l'évolution de l'organisation dans le temps.

**Graphiques disponibles :**
- Courbe d'évolution du nombre d'utilisateurs actifs par rôle sur les 12 derniers mois
- Histogramme des permissions les plus attribuées et les moins utilisées sur la période sélectionnée
- Camembert de répartition des types de congés consommés sur l'année en cours
- Graphique de chaleur (heatmap) des jours d'absence les plus fréquents dans l'année pour anticiper les périodes de tension
- Évolution du nombre de délégations actives par mois

**Interactivité :**
- Chaque graphique dispose d'un sélecteur de période (7 jours, 30 jours, 3 mois, 1 an)
- Au survol d'un point ou d'une barre, une infobulle affiche le détail chiffré
- Les graphiques sont animés à leur apparition via Framer Motion

### Rapport d'anomalies

Un rapport d'anomalies automatique identifie les situations qui nécessitent une attention de l'administrateur.

**Anomalies détectées :**
- Utilisateurs actifs sans aucun rôle attribué (comptes orphelins potentiellement inutilisés)
- Permissions existantes n'ayant jamais été utilisées depuis 90 jours ou plus (candidates à la suppression ou à la révision)
- Délégations créées mais jamais activées car leur période n'a jamais démarré
- Utilisateurs dont toutes les permissions sont expirées mais dont le compte est toujours actif
- Invitations envoyées il y a plus de 7 jours et toujours non acceptées
- Rôles sans aucune permission associée (rôles vides)

**Affichage :**
- Le rapport d'anomalies est accessible depuis le tableau de bord admin sous forme d'une liste organisée par type d'anomalie
- Chaque anomalie dispose d'un lien direct vers l'entité concernée pour corriger la situation rapidement
- L'administrateur peut marquer une anomalie comme "ignorée" avec un commentaire, pour ne plus la voir apparaître si elle est intentionnelle

---

## Communication interne

### Messagerie interne

L'application intègre un système de messages internes permettant aux utilisateurs de communiquer directement sans quitter la plateforme, notamment pour échanger autour d'une demande de congé ou d'une permission.

**Fonctionnement général :**
- Chaque utilisateur peut envoyer un message privé à n'importe quel autre membre de l'organisation
- Les conversations sont accessibles depuis une icône dédiée dans la barre de navigation supérieure, avec un badge indiquant le nombre de messages non lus
- Les messages sont affichés dans une interface de type fil de discussion (thread), avec le nom de l'expéditeur, son avatar, la date et l'heure d'envoi
- Les messages peuvent être attachés à une demande de congé ou à une action de permission spécifique, créant ainsi un contexte clair pour la discussion

**Liaison avec les demandes :**
- Depuis la fiche de validation d'une demande de congé, le manager peut envoyer un message directement à l'employé concerné (ex. pour demander un justificatif ou expliquer un refus) sans quitter la page
- L'employé voit ce message attaché à sa demande dans son historique
- Ces échanges sont conservés et visibles dans le journal d'audit comme des événements liés à la demande concernée

**Notifications :**
- La réception d'un nouveau message déclenche une notification push (Firebase Cloud Messaging) et une notification in-app
- L'utilisateur peut choisir de recevoir ou non les notifications email pour les nouveaux messages depuis ses préférences

**Limites et modération :**
- L'administrateur peut consulter les conversations en cas de litige signalé, dans le respect des règles de l'organisation
- Les messages ne peuvent pas être supprimés par les utilisateurs afin de garantir la traçabilité ; seul l'administrateur peut archiver une conversation en cas de nécessité

**Tables supplémentaires :**
- `conversations` : enregistre les fils de discussion (participants, date de création, entité liée optionnelle)
- `messages` : enregistre chaque message (conversationId, auteur, contenu, timestamp, lu/non lu)

### Annonces globales de l'administrateur

L'administrateur peut diffuser des annonces visibles par tous les utilisateurs de l'organisation directement depuis les tableaux de bord.

**Fonctionnement :**
- Depuis la section Administration, l'admin rédige une annonce avec un titre, un message, un niveau d'importance (information, avertissement, critique) et une date d'expiration optionnelle
- L'annonce apparaît en haut de tous les tableaux de bord sous forme de bandeau coloré selon le niveau d'importance : bleu pour information, orange pour avertissement, rouge pour critique
- L'annonce est animée à son apparition via Framer Motion (glissement depuis le haut)
- Chaque utilisateur peut fermer l'annonce depuis son interface ; elle ne réapparaît pas pour lui à moins que l'admin ne la marque comme non dismissible
- Les annonces marquées comme non dismissibles restent visibles en permanence jusqu'à leur date d'expiration ou jusqu'à leur suppression manuelle par l'admin
- L'historique de toutes les annonces passées est consultable par l'administrateur
- Une notification push et email est envoyée à tous les utilisateurs lors de la publication d'une annonce de niveau critique

**Table supplémentaire :**
- `announcements` : enregistre chaque annonce (titre, message, niveau, date de publication, date d'expiration, dismissible oui/non, auteur)
- `announcement_dismissals` : enregistre les utilisateurs ayant fermé une annonce donnée

---

## Redis — Rôles et cas d'usage

Redis est utilisé comme couche complémentaire à MySQL. Il ne stocke aucune donnée métier persistante : toutes les données de référence restent dans MySQL. Redis gère uniquement les données volatiles, les caches et les traitements asynchrones.

### 1. Cache des permissions effectives

C'est le cas d'usage le plus critique du projet. À chaque requête API, le backend doit calculer les permissions effectives d'un utilisateur en combinant ses rôles, son département, ses permissions directes et les règles de conflit. Ce calcul implique plusieurs jointures SQL coûteuses.

- Lors du premier calcul, le résultat est mis en cache dans Redis sous une clé identifiant l'utilisateur (ex. `permissions:userId`)
- Les requêtes suivantes lisent directement le cache Redis sans toucher MySQL, réduisant le temps de réponse de plusieurs dizaines de millisecondes à quelques millisecondes
- Le cache d'un utilisateur est automatiquement invalidé dès qu'une de ses permissions, un de ses rôles ou son département est modifié
- La durée de vie du cache (TTL) est configurée à 15 minutes par défaut, renouvelée à chaque accès actif
- Le simulateur de permissions lit également ce cache pour afficher les résultats instantanément

### 2. Gestion des sessions et tokens Firebase

- Après vérification d'un token Firebase par le Firebase Admin SDK, le résultat est mis en cache dans Redis pour la durée de vie restante du token
- Les requêtes suivantes du même utilisateur avec le même token sont validées directement via Redis sans rappeler Firebase, réduisant la latence et la consommation de l'API Firebase
- À la déconnexion ou à la désactivation d'un compte, la session est immédiatement invalidée dans Redis

### 3. Blocage de compte après tentatives échouées

Redis est la solution idéale pour ce mécanisme grâce à son TTL natif sur chaque clé.

- À chaque tentative de connexion échouée, un compteur est incrémenté dans Redis sous la clé `login_attempts:userId`
- Lorsque le compteur atteint le seuil configuré (ex. 5 tentatives), une clé de blocage `account_locked:userId` est créée avec un TTL correspondant à la durée de blocage définie par l'admin
- À l'expiration du TTL, le blocage est automatiquement levé par Redis sans aucune intervention du backend
- Le backend consulte cette clé au début de chaque tentative de connexion pour refuser immédiatement si le compte est bloqué
- En cas de déblocage manuel par l'admin, la clé Redis est supprimée explicitement

### 4. Rate limiting sur les routes API

- Redis comptabilise le nombre de requêtes par utilisateur ou par adresse IP sur une fenêtre de temps glissante (ex. 100 requêtes par minute)
- Chaque route sensible (connexion, attribution de permission, création d'utilisateur) a ses propres limites configurables
- Lorsqu'une limite est dépassée, le backend retourne une erreur 429 avec un message indiquant le temps d'attente avant de pouvoir réessayer
- Ce mécanisme protège l'API contre les abus sans impacter les utilisateurs normaux

### 5. File d'attente des notifications (BullMQ)

Les envois de notifications (emails Gmail, messages FCM) sont traités de manière asynchrone via une file d'attente BullMQ stockée dans Redis.

- Lorsqu'une action déclenche une notification (attribution de rôle, approbation de congé, annonce globale, etc.), le backend publie un job dans la file Redis au lieu d'envoyer la notification directement
- Un worker dédié consomme la file et envoie les notifications de manière séquentielle ou parallèle selon la priorité
- Les jobs échoués sont automatiquement relancés jusqu'à 3 fois avec un délai exponentiel entre chaque tentative
- L'administrateur dispose d'une vue dans le tableau de bord technique affichant l'état de la file : jobs en attente, en cours, réussis, échoués
- Ce mécanisme garantit qu'aucune notification n'est perdue même en cas d'indisponibilité temporaire du service Gmail ou FCM

### Configuration Redis dans Docker Compose

Redis est ajouté comme cinquième service dans Docker Compose, avec un volume persistant pour la durabilité des données de file d'attente entre les redémarrages. Le backend se connecte à Redis via la variable d'environnement `REDIS_URL`. Redis n'est pas exposé publiquement : il est uniquement accessible dans le réseau Docker interne entre le backend et le worker de notifications.

### Variables d'environnement Redis à documenter dans `.env.example`

- `REDIS_URL` : URL de connexion Redis (ex. `redis://redis:6379` en Docker, `redis://localhost:6379` en mode sans Docker)
- `REDIS_PERMISSIONS_TTL` : durée de vie du cache des permissions en secondes (défaut : 900)
- `REDIS_SESSION_TTL` : durée de vie du cache de session en secondes (défaut : 3600)
- `REDIS_RATE_LIMIT_WINDOW` : fenêtre de rate limiting en secondes (défaut : 60)
- `REDIS_RATE_LIMIT_MAX` : nombre maximum de requêtes par fenêtre (défaut : 100)

---

## Optimistic UI

L'interface applique le principe d'Optimistic UI sur toutes les actions utilisateur courantes : la mise à jour visuelle est effectuée immédiatement côté client sans attendre la confirmation du serveur, offrant une expérience fluide et réactive.

**Fonctionnement général :**
- Lorsqu'un utilisateur coche ou décoche une permission dans la matrice, la case change d'état visuellement en moins de 50ms, avant même que la requête API soit envoyée
- Lorsqu'un manager approuve ou rejette une demande de congé, la carte disparaît ou change de statut instantanément dans la liste
- Si la requête API échoue (erreur réseau, conflit, droits insuffisants), l'interface revient automatiquement à l'état précédent et affiche un toast d'erreur explicite
- Un indicateur discret (spinner léger ou icône de synchronisation) signale que la confirmation serveur est en cours, sans bloquer l'interaction

**Cas d'usage couverts par l'Optimistic UI :**
- Cocher / décocher une permission dans la matrice de rôle
- Approuver ou rejeter une demande de congé depuis le dashboard manager
- Marquer une notification comme lue
- Ajouter ou retirer un membre d'un département
- Fermer une annonce globale
- Basculer le thème sombre / clair

**Gestion des conflits :**
- Si deux utilisateurs modifient simultanément la même ressource (ex. deux admins modifient le même rôle), le serveur retourne une erreur de conflit et l'interface de chacun revient à l'état réel en affichant un message "Cette ressource a été modifiée par un autre utilisateur"

---

## Personnalisation de l'interface

### Densité d'affichage

L'utilisateur choisit la densité visuelle de l'interface selon ses préférences de lecture et la taille de son écran.

**Trois niveaux disponibles :**
- **Compact** : espacement réduit, taille de police légèrement diminuée, plus de lignes visibles simultanément dans les tableaux — adapté aux écrans larges et aux utilisateurs expérimentés
- **Normal** : espacement standard, taille de police par défaut — mode par défaut à la première connexion
- **Spacieux** : espacement généreux, taille de police légèrement augmentée — adapté aux écrans de petite résolution ou aux utilisateurs préférant une lecture aérée

**Comportement :**
- La densité est configurable depuis le menu des paramètres utilisateur et depuis un raccourci dans la barre de navigation supérieure
- La préférence est stockée dans la table `user_preferences` et restaurée à chaque connexion
- La transition entre les densités est animée via Framer Motion (fondu + légère translation verticale des éléments)
- La densité s'applique à tous les tableaux, listes, formulaires et cartes de l'interface sans exception

### Colonnes configurables dans les tableaux

Chaque tableau principal de l'application (liste des utilisateurs, liste des congés, journal d'audit, liste des permissions) propose une configuration des colonnes visibles.

**Fonctionnement :**
- Une icône de configuration à droite de l'en-tête de chaque tableau ouvre un panneau latéral listant toutes les colonnes disponibles avec des cases à cocher
- L'utilisateur coche ou décoche les colonnes qu'il souhaite afficher, et peut réordonner les colonnes visibles par glisser-déposer dans ce même panneau
- Certaines colonnes sont obligatoires et ne peuvent pas être masquées (ex. colonne "Nom" dans la liste des utilisateurs)
- La configuration des colonnes est sauvegardée par tableau dans `user_preferences` (clé spécifique par tableau) et restaurée à chaque session
- Si de nouvelles colonnes sont ajoutées lors d'une mise à jour de l'application, elles apparaissent visibles par défaut pour tous les utilisateurs n'ayant pas encore de configuration personnalisée pour ce tableau

### Tableau de bord personnalisable

L'utilisateur peut réorganiser et personnaliser les cartes de statistiques affichées sur son tableau de bord selon ses priorités.

**Fonctionnement :**
- Un bouton "Personnaliser" en haut du dashboard active le mode édition : les cartes deviennent déplaçables par glisser-déposer (avec animation Framer Motion fluide pendant le déplacement)
- En mode édition, chaque carte affiche une icône de fermeture permettant de la masquer du dashboard
- Un panneau latéral liste toutes les cartes disponibles, y compris celles masquées, que l'utilisateur peut réactiver en un clic
- L'ordre et la visibilité des cartes sont sauvegardés dans `user_preferences` et restaurés à chaque connexion
- Un bouton "Réinitialiser" remet la disposition par défaut correspondant au rôle de l'utilisateur
- Les cartes disponibles varient selon le rôle : un employé ne voit pas les mêmes cartes qu'un manager ou un administrateur

---

## Gestion des congés — compléments

### Politique de validation par type de congé

Chaque type de congé peut avoir sa propre politique de validation, configurable par l'administrateur, évitant ainsi d'appliquer le même circuit d'approbation à des congés de nature très différente.

**Trois modes de validation disponibles :**
- **Validation manager requise** : la demande est soumise au manager pour approbation avant d'être accordée (mode par défaut pour les congés payés)
- **Auto-approbation avec justificatif** : la demande est automatiquement approuvée dès qu'un document justificatif valide est uploadé par l'employé (adapté aux congés maladie, congés pour événement familial)
- **Libre sans validation** : l'employé pose le congé directement sans aucune approbation requise, sous réserve que son solde soit suffisant (adapté aux RTT ou aux jours de récupération)

**Configuration :**
- L'administrateur définit la politique de chaque type de congé depuis la page de gestion des types de congés
- Pour le mode auto-approbation, l'admin précise les types de fichiers acceptés comme justificatifs (PDF, image) et la taille maximale autorisée
- Le manager reste notifié des congés posés en mode libre ou auto-approuvé pour maintenir la visibilité sur son équipe, mais n'a pas d'action requise
- La politique de validation est enregistrée dans la table `leave_types` avec un champ `validation_mode`

### Compteur d'ancienneté et ajustement automatique du quota

Le système suit l'ancienneté de chaque employé et peut ajuster automatiquement son quota annuel de congés selon des paliers définis par l'organisation.

**Fonctionnement :**
- La date d'entrée dans l'organisation est enregistrée sur le profil de chaque utilisateur
- L'administrateur configure des paliers d'ancienneté avec le bonus de jours correspondant (ex. 3 ans → +2 jours, 5 ans → +5 jours, 10 ans → +8 jours)
- Un job automatique vérifie chaque jour les anniversaires d'ancienneté et ajuste les quotas des utilisateurs concernés
- L'employé reçoit une notification lui annonçant que son quota a été augmenté suite à son ancienneté
- L'historique de chaque ajustement automatique est enregistré dans `leave_carry_over_logs` avec la mention "ajustement ancienneté"
- L'administrateur peut désactiver cette fonctionnalité ou modifier manuellement le quota d'un utilisateur indépendamment des paliers automatiques

**Table supplémentaire :**
- `seniority_tiers` : paliers d'ancienneté configurés par l'organisation (années requises, jours de bonus associés)

### Blackout periods — Périodes de blocage des congés

L'administrateur ou le manager peut définir des périodes pendant lesquelles aucune demande de congé ne peut être soumise pour tout ou partie de l'organisation.

**Fonctionnement :**
- Depuis la page d'administration des congés, l'admin ou le manager crée une blackout period en définissant une plage de dates, un périmètre (toute l'organisation ou un département spécifique), et un message explicatif affiché aux employés
- Lorsqu'un employé tente de soumettre une demande de congé incluant une date couverte par une blackout period, le formulaire affiche immédiatement un message d'avertissement avec l'explication fournie par l'admin, et bloque la soumission
- Les blackout periods sont affichées sur le calendrier personnel de l'employé et sur le calendrier d'équipe du manager avec une couleur distincte et un fond hachuré, clairement différenciées des congés
- Les demandes déjà approuvées avant la création d'une blackout period ne sont pas affectées rétroactivement
- L'administrateur peut créer des blackout periods récurrentes (ex. chaque année du 15 au 31 décembre)

**Table supplémentaire :**
- `blackout_periods` : périodes de blocage avec plage de dates, périmètre concerné, message explicatif, récurrence optionnelle, et auteur de la création

---

## Onboarding et aide contextuelle

### Tour guidé interactif au premier login

À la première connexion, chaque utilisateur est accueilli par un tour guidé interactif présentant les fonctionnalités clés de l'application selon son rôle.

**Fonctionnement :**
- Le tour démarre automatiquement après le premier login et peut être ignoré à tout moment
- Il est composé d'étapes séquentielles mettant en surbrillance les éléments de l'interface concernés avec une bulle explicative animée via Framer Motion
- Le contenu du tour est adapté au rôle de l'utilisateur : un employé voit les étapes liées à la soumission de congés et à la consultation de ses permissions, un manager voit les étapes d'approbation et de délégation, un administrateur voit les étapes de gestion des rôles et de la configuration
- L'utilisateur peut mettre le tour en pause et le reprendre plus tard depuis ses paramètres (section "Aide et onboarding")
- Le tour peut être relancé à tout moment depuis les paramètres, utile après une mise à jour majeure de l'application
- La complétion du tour est enregistrée dans `user_preferences` pour ne pas le relancer à chaque connexion

### Aide contextuelle

Une aide intégrée est disponible sur toutes les fonctionnalités complexes de l'application, accessible sans quitter la page en cours.

**Fonctionnement :**
- Une icône d'information discrète est placée à côté de chaque fonctionnalité complexe : matrice de permissions, règle de résolution des conflits, formulaire de délégation, configuration des blackout periods, simulateur de permissions, etc.
- Au clic sur cette icône, un panneau latéral s'ouvre (slide-in animé via Framer Motion) affichant une explication claire en langage non technique, avec des exemples concrets et si pertinent un schéma illustratif
- Le panneau d'aide ne bloque pas l'interface : l'utilisateur peut continuer à interagir avec la page pendant qu'il consulte l'aide
- L'administrateur peut personnaliser le contenu des panneaux d'aide depuis la section Administration pour l'adapter au contexte spécifique de son organisation

### Page de statut du système

Une page dédiée affiche en temps réel l'état de santé de tous les composants de l'application.

**Contenu de la page :**
- État de chaque service : API backend, base de données MySQL, Redis, Firebase Authentication, file de notifications BullMQ — chacun affiché avec un indicateur coloré (vert opérationnel, orange dégradé, rouge indisponible)
- Temps de réponse moyen de l'API sur les 5 dernières minutes
- Taille de la file de notifications : nombre de jobs en attente, en cours, échoués
- Historique des incidents des 30 derniers jours avec description et durée de chaque interruption

**Accès :**
- La page est accessible à l'adresse `/status` sans authentification pour permettre une consultation rapide même en cas de problème de connexion
- Une version détaillée avec les métriques techniques est accessible uniquement aux administrateurs depuis le menu Administration
- L'administrateur peut créer manuellement un incident dans l'historique pour documenter une maintenance planifiée

---

## Qualité et maintenabilité

### Versionning de l'API

Toutes les routes de l'API sont préfixées par `/api/v1/` dès le départ pour anticiper les évolutions futures sans impacter les intégrations existantes.

**Règles de versionning :**
- Toute modification non rétrocompatible d'une route existante entraîne la création d'une version `/api/v2/` de cette route, l'ancienne version restant disponible pendant une période de transition documentée
- Les routes dépréciées retournent un en-tête `Deprecation` indiquant la date de suppression prévue
- La version de l'API en cours est retournée dans la réponse de la route `/health`
- La documentation Swagger est versionnée en parallèle

### Documentation Swagger / OpenAPI

Une documentation interactive de l'API est générée automatiquement depuis les définitions TypeScript des routes et accessible en développement à l'adresse `/api/docs`.

**Contenu de la documentation :**
- Liste de toutes les routes organisées par domaine fonctionnel (Auth, Utilisateurs, Rôles, Permissions, Congés, Audit, etc.)
- Pour chaque route : méthode HTTP, URL, paramètres attendus avec leur type TypeScript, corps de la requête, codes de réponse possibles avec exemples de payload
- Interface interactive permettant de tester les routes directement depuis le navigateur avec authentification Firebase intégrée
- La documentation est désactivée en production ou protégée par authentification admin pour éviter l'exposition des détails techniques

### Tests automatisés avec Vitest

Le backend dispose d'une suite de tests automatisés couvrant les routes et logiques critiques de l'application.

**Couverture minimale attendue :**
- Authentification : vérification de token valide, token expiré, token invalide, compte bloqué
- Calcul des permissions effectives : tous les scénarios de la règle de résolution des conflits (permission directe refusée, accordée, héritée de rôle, héritée de département)
- Blocage de compte : dépassement du seuil, expiration automatique, déblocage manuel
- Gestion des congés : calcul du solde, déduction des jours fériés, validation contre blackout period, congé fractionné
- Délégation : activation, expiration, vérification des droits du délégataire
- Rate limiting : dépassement de quota, remise à zéro de la fenêtre

**Organisation des tests :**
- Tests unitaires pour les fonctions de logique métier isolées (calcul de permissions, calcul d'ancienneté, résolution des conflits)
- Tests d'intégration pour les routes API complètes avec base de données de test et Redis de test
- Un script `npm run test:coverage` génère un rapport de couverture de code, avec un seuil minimum de 80% requis pour valider un déploiement

---

## Arborescence complète des fichiers et dossiers

```
permission-manager/
├── docker-compose.yml
├── .env.example                          # Variables globales Docker
├── README.md
├── database/
│   ├── 01_create_database.sql         Création de la base
│   ├── 02_create_tables.sql           Toutes les tables avec clés étrangères
│   ├── 03_seed_data.sql               Données initiales (rôles, modules, types de congés)
│   └── 04_create_admin.sql            Création du Super Administrateur
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── .env.example
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts                      # Point d'entrée du serveur
│       ├── config/
│       │   ├── db.ts                     # Connexion Drizzle + MySQL
│       │   ├── redis.ts                  # Connexion Redis
│       │   └── firebase.ts              # Init Firebase Admin SDK
│       ├── db/
│       │   ├── schema.ts                # Schéma Drizzle complet
│       │   ├── seed.ts                  # Données initiales
│       │   └── migrations/              # Fichiers SQL générés par Drizzle Kit
│       ├── middlewares/
│       │   ├── auth.middleware.ts        # Vérification token Firebase
│       │   ├── role.middleware.ts        # Contrôle rôles et permissions
│       │   ├── rateLimit.middleware.ts   # Rate limiting via Redis
│       │   └── error.middleware.ts       # Gestion globale des erreurs
│       ├── routes/
│       │   ├── index.ts                  # Agrégation de toutes les routes v1
│       │   ├── auth.routes.ts
│       │   ├── users.routes.ts
│       │   ├── roles.routes.ts
│       │   ├── permissions.routes.ts
│       │   ├── modules.routes.ts
│       │   ├── departments.routes.ts
│       │   ├── leaves.routes.ts
│       │   ├── leaveTypes.routes.ts
│       │   ├── delegations.routes.ts
│       │   ├── announcements.routes.ts
│       │   ├── messages.routes.ts
│       │   ├── notifications.routes.ts
│       │   ├── audit.routes.ts
│       │   ├── reports.routes.ts
│       │   ├── status.routes.ts
│       │   └── admin.routes.ts
│       ├── controllers/
│       │   └── [un fichier par route]
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── users.service.ts
│       │   ├── roles.service.ts
│       │   ├── permissions.service.ts
│       │   ├── permissionsResolver.service.ts  # Calcul permissions effectives
│       │   ├── leaves.service.ts
│       │   ├── delegations.service.ts
│       │   ├── notifications.service.ts
│       │   ├── email.service.ts               # Gmail API
│       │   ├── queue.service.ts               # BullMQ
│       │   ├── redis.service.ts               # Cache et sessions
│       │   ├── reports.service.ts             # Génération PDF
│       │   └── audit.service.ts
│       ├── workers/
│       │   └── notifications.worker.ts        # Consommateur BullMQ
│       ├── types/
│       │   ├── express.d.ts                   # Extension du type Request Express
│       │   └── index.ts                       # Types partagés backend
│       ├── schemas/                           # Schémas Zod partagés frontend/backend
│       │   ├── user.schema.ts
│       │   ├── role.schema.ts
│       │   ├── leave.schema.ts
│       │   └── permission.schema.ts
│       └── utils/
│           ├── logger.ts                      # Winston
│           ├── password.ts                    # Validation mot de passe
│           └── date.ts                        # Helpers dates et jours fériés
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── src/
│       ├── app/                              # App Router Next.js
│       │   ├── layout.tsx                    # Layout racine
│       │   ├── page.tsx                      # Page d'accueil (redirect login)
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   ├── forgot-password/page.tsx
│       │   │   └── invite/[token]/page.tsx
│       │   ├── (app)/                        # Pages protégées
│       │   │   ├── layout.tsx                # Layout avec sidebar + header
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── users/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   ├── roles/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   ├── permissions/page.tsx
│       │   │   ├── modules/page.tsx
│       │   │   ├── departments/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   ├── leaves/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   ├── [id]/page.tsx
│       │   │   │   └── calendar/page.tsx
│       │   │   ├── team-calendar/page.tsx
│       │   │   ├── delegations/page.tsx
│       │   │   ├── messages/page.tsx
│       │   │   ├── audit/page.tsx
│       │   │   ├── reports/page.tsx
│       │   │   ├── simulator/page.tsx
│       │   │   ├── announcements/page.tsx
│       │   │   ├── hr-dashboard/page.tsx
│       │   │   └── settings/
│       │   │       ├── page.tsx
│       │   │       ├── profile/page.tsx
│       │   │       └── notifications/page.tsx
│       │   ├── status/page.tsx               # Page statut système (publique)
│       │   └── api/                          # API Routes Next.js (auth only)
│       │       └── auth/[...nextauth]/route.ts
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   ├── ProtectedRoute.tsx
│       │   │   └── PageWrapper.tsx           # Wrapper avec animation Framer Motion
│       │   ├── ui/
│       │   │   ├── DataTable.tsx
│       │   │   ├── PermissionMatrix.tsx
│       │   │   ├── RoleBadge.tsx
│       │   │   ├── StatusBadge.tsx
│       │   │   ├── UserAvatar.tsx
│       │   │   ├── NotificationBell.tsx
│       │   │   ├── ThemeToggle.tsx
│       │   │   ├── DensityToggle.tsx
│       │   │   ├── ColumnConfigurator.tsx
│       │   │   ├── AuditTimeline.tsx
│       │   │   ├── LeaveBalanceCard.tsx
│       │   │   ├── CalendarView.tsx
│       │   │   ├── StatsCard.tsx
│       │   │   ├── AnnouncementBanner.tsx
│       │   │   ├── ContextualHelp.tsx
│       │   │   └── SystemStatusBadge.tsx
│       │   └── shared/
│       │       ├── ConfirmDialog.tsx
│       │       ├── ExportButton.tsx
│       │       ├── SearchBar.tsx
│       │       ├── EmptyState.tsx
│       │       ├── Skeleton.tsx
│       │       ├── Toast.tsx
│       │       └── OnboardingTour.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── usePermissions.ts
│       │   ├── useTheme.ts
│       │   ├── useDensity.ts
│       │   ├── useOptimistic.ts
│       │   └── useColumnConfig.ts
│       ├── lib/
│       │   ├── firebase.ts                   # Init Firebase client SDK
│       │   ├── apiClient.ts                  # Fetch wrapper avec token Firebase
│       │   ├── queryClient.ts                # Config Tanstack Query
│       │   └── animations.ts                 # Variants Framer Motion réutilisables
│       ├── stores/
│       │   └── dashboardStore.ts             # Zustand pour layout du dashboard
│       └── types/
│           └── index.ts                      # Types partagés frontend
```

---

## Schéma des relations entre tables (clés étrangères et cardinalités)

```
organizations (1) ──────────────────────────────── (N) users
organizations (1) ──────────────────────────────── (N) roles
organizations (1) ──────────────────────────────── (N) departments
organizations (1) ──────────────────────────────── (N) announcements
organizations (1) ──────────────────────────────── (N) leave_types
organizations (1) ──────────────────────────────── (N) blackout_periods
organizations (1) ──────────────────────────────── (N) seniority_tiers
organizations (1) ──────────────────────────────── (N) public_holidays

users (1) ───────────────────────────────────────── (N) user_roles
users (1) ───────────────────────────────────────── (N) user_permissions
users (1) ───────────────────────────────────────── (N) leave_quotas
users (1) ───────────────────────────────────────── (N) notifications
users (1) ───────────────────────────────────────── (N) invitations (invitedBy)
users (1) ───────────────────────────────────────── (N) audit_logs (actorId)
users (1) ───────────────────────────────────────── (N) audit_logs (targetUserId)
users (1) ───────────────────────────────────────── (N) login_attempts
users (1) ───────────────────────────────────────── (1) user_preferences
users (1) ───────────────────────────────────────── (N) messages (senderId)
users (1) ───────────────────────────────────────── (N) delegations (managerId)
users (1) ───────────────────────────────────────── (N) delegations (delegateId)

roles (1) ───────────────────────────────────────── (N) role_permissions
roles (1) ───────────────────────────────────────── (N) user_roles
roles (1) ───────────────────────────────────────── (N) department_roles
roles (1) ───────────────────────────────────────── (N) invitations

modules (1) ─────────────────────────────────────── (N) permissions

permissions (1) ─────────────────────────────────── (N) role_permissions
permissions (1) ─────────────────────────────────── (N) user_permissions



leave_types (1) ─────────────────────────────────── (N) leave_requests
leave_types (1) ─────────────────────────────────── (N) leave_quotas
leave_types (1) ─────────────────────────────────── (N) leave_periods (via leave_requests)

leave_requests (1) ──────────────────────────────── (N) leave_periods
leave_requests (1) ──────────────────────────────── (N) leave_attachments
leave_requests (1) ──────────────────────────────── (N) messages (relatedEntityId)

conversations (N) ───────────────────────────────── (N) users (via conversation_participants)
conversations (1) ───────────────────────────────── (N) messages

announcements (1) ───────────────────────────────── (N) announcement_dismissals
```

**Contraintes importantes :**
- Un utilisateur ne peut avoir qu'un seul enregistrement dans `user_preferences`
- Un manager ne peut déléguer qu'à un seul délégataire à la fois sur une même période (pas de chevauchement de délégations actives)
- Un rôle système (`is_system = true`) ne peut pas être supprimé
- Un utilisateur ne peut appartenir qu'à un seul département à la fois
- Un manager ne peut être désigné que dans un seul département à la fois
- Un département ne peut pas être supprimé s'il contient des utilisateurs actifs
- Le champ `granted` dans `user_permissions` peut valoir `true` (accordé) ou `false` (refusé explicitement) — `null` signifie pas de règle directe

---

## Liste exhaustive des routes API (`/api/v1/`)

### Authentification
```
POST   /api/v1/auth/sync              Synchroniser utilisateur Firebase → MySQL
POST   /api/v1/auth/logout            Invalider session Redis
GET    /api/v1/auth/me                Profil courant + permissions effectives
```

### Utilisateurs
```
GET    /api/v1/users                  Liste paginée (query: page, limit, search, role, status, department)
POST   /api/v1/users                  Créer utilisateur
GET    /api/v1/users/:id              Détail utilisateur
PUT    /api/v1/users/:id              Modifier utilisateur
DELETE /api/v1/users/:id              Désactiver utilisateur
GET    /api/v1/users/:id/permissions  Permissions effectives calculées
POST   /api/v1/users/invite           Inviter par email
POST   /api/v1/users/:id/unblock      Débloquer un compte (admin)
GET    /api/v1/users/:id/sessions     Sessions actives
DELETE /api/v1/users/:id/sessions     Révoquer toutes les sessions
```

### Rôles
```
GET    /api/v1/roles                  Liste des rôles
POST   /api/v1/roles                  Créer rôle
GET    /api/v1/roles/:id              Détail rôle + permissions assignées
PUT    /api/v1/roles/:id              Modifier rôle
DELETE /api/v1/roles/:id              Supprimer rôle (si non système)
PUT    /api/v1/roles/:id/permissions  Mettre à jour les permissions du rôle (remplacement complet)
```

### Permissions
```
GET    /api/v1/permissions            Liste par module
POST   /api/v1/permissions            Créer permission
PUT    /api/v1/permissions/:id        Modifier
DELETE /api/v1/permissions/:id        Supprimer
```

### Modules
```
GET    /api/v1/modules                Liste des modules
POST   /api/v1/modules                Créer module
PUT    /api/v1/modules/:id            Modifier
DELETE /api/v1/modules/:id            Supprimer
PATCH  /api/v1/modules/:id/toggle     Activer / désactiver
```

### Départements
```
GET    /api/v1/departments                        Liste des départements
POST   /api/v1/departments                        Créer département
GET    /api/v1/departments/:id                    Détail département + membres + rôles + manager
PUT    /api/v1/departments/:id                    Modifier (nom, description)
DELETE /api/v1/departments/:id                    Supprimer (refusé si membres actifs)
PUT    /api/v1/departments/:id/manager            Désigner ou changer le manager du département
DELETE /api/v1/departments/:id/manager            Retirer le manager sans en désigner un nouveau
POST   /api/v1/departments/:id/members            Ajouter membres (body: userIds[])
DELETE /api/v1/departments/:id/members/:userId    Retirer un membre
PUT    /api/v1/departments/:id/roles              Mettre à jour les rôles du département
```

### Congés
```
GET    /api/v1/leaves                 Liste des demandes (query: status, userId, type, dateFrom, dateTo)
POST   /api/v1/leaves                 Créer demande (simple ou fractionnée)
GET    /api/v1/leaves/:id             Détail demande + pièces jointes + timeline
PUT    /api/v1/leaves/:id             Modifier demande (si encore en attente)
DELETE /api/v1/leaves/:id             Annuler demande
PATCH  /api/v1/leaves/:id/approve     Approuver (manager / délégataire)
PATCH  /api/v1/leaves/:id/reject      Rejeter avec commentaire obligatoire
PATCH  /api/v1/leaves/:id/confirm     Confirmer par l'employé (validation 2 niveaux)
POST   /api/v1/leaves/:id/attachments Upload pièce jointe
DELETE /api/v1/leaves/:id/attachments/:fileId  Supprimer pièce jointe
GET    /api/v1/leaves/team-calendar   Absences équipe pour le calendrier (query: month, year, departmentId)
POST   /api/v1/leaves/collective      Créer congé collectif (manager/admin)
POST   /api/v1/leaves/proxy           Soumettre demande par procuration
GET    /api/v1/leaves/balance         Solde de congés de l'utilisateur courant
```

### Types de congés
```
GET    /api/v1/leave-types            Liste des types de congés
POST   /api/v1/leave-types            Créer type
PUT    /api/v1/leave-types/:id        Modifier (validation_mode, cumulable, plafond)
DELETE /api/v1/leave-types/:id        Supprimer
```

### Quotas de congés
```
GET    /api/v1/quotas                 Liste des quotas (query: userId, year)
PUT    /api/v1/quotas/:userId         Modifier manuellement le quota d'un utilisateur
POST   /api/v1/quotas/close-year      Clôture annuelle (calcul reports + pertes)
```

### Jours fériés et blackout periods
```
GET    /api/v1/holidays               Liste des jours fériés (query: year, country)
POST   /api/v1/holidays               Ajouter jour férié personnalisé
DELETE /api/v1/holidays/:id           Supprimer jour férié personnalisé
GET    /api/v1/blackout-periods       Liste des périodes de blocage
POST   /api/v1/blackout-periods       Créer blackout period
PUT    /api/v1/blackout-periods/:id   Modifier
DELETE /api/v1/blackout-periods/:id   Supprimer
```

### Délégations
```
GET    /api/v1/delegations            Liste (query: managerId, active)
POST   /api/v1/delegations            Créer délégation
PUT    /api/v1/delegations/:id        Modifier dates ou délégataire
DELETE /api/v1/delegations/:id        Révoquer
```

### Simulateur de permissions
```
POST   /api/v1/simulator              Simuler (body: userId, permissionSlug) → résultat + chaîne de résolution
```

### Annonces
```
GET    /api/v1/announcements          Liste des annonces actives
POST   /api/v1/announcements          Créer annonce (admin)
PUT    /api/v1/announcements/:id      Modifier
DELETE /api/v1/announcements/:id      Supprimer
PATCH  /api/v1/announcements/:id/dismiss  Fermer une annonce (utilisateur courant)
```

### Messagerie interne
```
GET    /api/v1/conversations          Liste des conversations de l'utilisateur courant
POST   /api/v1/conversations          Créer conversation
GET    /api/v1/conversations/:id      Messages d'une conversation (paginés)
POST   /api/v1/conversations/:id/messages  Envoyer message
```

### Notifications
```
GET    /api/v1/notifications          Notifications de l'utilisateur courant
PATCH  /api/v1/notifications/:id/read Marquer comme lue
PATCH  /api/v1/notifications/read-all Tout marquer comme lu
```

### Journal d'audit
```
GET    /api/v1/audit                  Journal (query: actorId, targetId, action, entityType, dateFrom, dateTo, page, limit)
GET    /api/v1/audit/export           Export CSV ou PDF (query: format)
```

### Rapports
```
POST   /api/v1/reports/generate       Générer rapport (body: type, period, scope, format)
GET    /api/v1/reports/:reportId      Télécharger rapport généré
GET    /api/v1/reports/anomalies      Rapport d'anomalies en temps réel
```

### Statut système
```
GET    /api/v1/status                 État de tous les services (public)
GET    /health                        Health check Docker/Nginx
```

---

## Variables d'environnement complètes

### `backend/.env.example`
```
# Serveur
NODE_ENV=development
PORT=4000

# Base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=pm_user
DB_PASSWORD=
DB_NAME=permission_manager
DATABASE_URL=mysql://pm_user:password@localhost:3306/permission_manager

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PERMISSIONS_TTL=900
REDIS_SESSION_TTL=3600
REDIS_RATE_LIMIT_WINDOW=60
REDIS_RATE_LIMIT_MAX=100
REDIS_LOGIN_ATTEMPTS_MAX=5
REDIS_LOCKOUT_DURATION=900

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Système de notifications
# Valeurs possibles : telegram | firebase | hybrid
# → telegram  : développement (simple, pas d'OAuth)
# → firebase  : production par défaut (FCM push + Gmail email)
# → hybrid    : production avancée (Telegram si lié, sinon Firebase)
NOTIFICATION_PROVIDER=telegram

# Telegram Bot (développement + option production)
# Créer le bot via @BotFather sur Telegram pour obtenir le token
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

# Gmail API (production — provider firebase ou hybrid uniquement)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_SENDER_EMAIL=

# Firebase Cloud Messaging (production — provider firebase ou hybrid uniquement)
FCM_SERVER_KEY=

# PDF (génération rapports)
PDF_STORAGE_PATH=./storage/reports

# Logs
LOG_LEVEL=info
LOG_DIR=./logs
```

### `frontend/.env.example`
```
# URL de l'API backend
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# VAPID Key — uniquement nécessaire si NOTIFICATION_PROVIDER=firebase ou hybrid
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Application
NEXT_PUBLIC_APP_NAME=Permission Manager
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Matrice des accès par rôle

### Légende
- ✅ Accès complet
- 👁️ Lecture seule
- 🔒 Accès sur son périmètre uniquement
- ❌ Aucun accès

| Fonctionnalité | Employé | Manager | Superviseur RH | Admin |
|---|---|---|---|---|
| Voir son propre profil | ✅ | ✅ | ✅ | ✅ |
| Voir le profil des autres | ❌ | 🔒 équipe | 🔒 département | ✅ |
| Créer / modifier un utilisateur | ❌ | ❌ | ❌ | ✅ |
| Désactiver un utilisateur | ❌ | ❌ | ❌ | ✅ |
| Débloquer un compte | ❌ | ❌ | ❌ | ✅ |
| Inviter un utilisateur | ❌ | ❌ | ❌ | ✅ |
| Voir les rôles | ❌ | 👁️ | 👁️ | ✅ |
| Créer / modifier un rôle | ❌ | ❌ | ❌ | ✅ |
| Attribuer un rôle à un utilisateur | ❌ | ❌ | ❌ | ✅ |
| Voir les permissions | ❌ | 👁️ | 👁️ | ✅ |
| Créer / modifier une permission | ❌ | ❌ | ❌ | ✅ |
| Gérer les modules | ❌ | ❌ | ❌ | ✅ |
| Voir les départements | ❌ | 🔒 son département | 🔒 département | ✅ |
| Créer / modifier un département | ❌ | ❌ | ❌ | ✅ |
| Désigner le manager d'un département | ❌ | ❌ | ❌ | ✅ |
| Ajouter / retirer un membre d'un département | ❌ | ❌ | ❌ | ✅ |
| Soumettre une demande de congé | ✅ | ✅ | ✅ | ✅ |
| Soumettre par procuration | ✅ | ✅ | ✅ | ✅ |
| Approuver / rejeter un congé | ❌ | 🔒 son équipe | ❌ | ✅ |
| Créer un congé collectif | ❌ | 🔒 son équipe | ❌ | ✅ |
| Voir le calendrier personnel | ✅ | ✅ | ✅ | ✅ |
| Voir le calendrier équipe | ❌ | 🔒 son équipe | 🔒 département | ✅ |
| Créer une délégation | ❌ | ✅ | ❌ | ✅ |
| Voir toutes les délégations | ❌ | 🔒 les siennes | 🔒 département | ✅ |
| Révoquer une délégation | ❌ | 🔒 les siennes | ❌ | ✅ |
| Utiliser le simulateur | ❌ | ❌ | ❌ | ✅ |
| Voir le journal d'audit | ❌ | 🔒 son équipe | 🔒 département | ✅ |
| Exporter le journal d'audit | ❌ | ❌ | 🔒 département | ✅ |
| Voir le tableau de bord RH | ❌ | 🔒 son équipe | 🔒 département | ✅ |
| Générer des rapports | ❌ | 🔒 son équipe | 🔒 département | ✅ |
| Voir le rapport d'anomalies | ❌ | ❌ | ❌ | ✅ |
| Publier une annonce globale | ❌ | ❌ | ❌ | ✅ |
| Gérer les blackout periods | ❌ | 🔒 son équipe | ❌ | ✅ |
| Gérer les jours fériés | ❌ | ❌ | ❌ | ✅ |
| Gérer les types de congés | ❌ | ❌ | ❌ | ✅ |
| Voir la messagerie interne | ✅ | ✅ | ✅ | ✅ |
| Configurer l'organisation | ❌ | ❌ | ❌ | ✅ |
| Voir la page de statut | ✅ | ✅ | ✅ | ✅ |
| Voir les métriques techniques | ❌ | ❌ | ❌ | ✅ |

---

## Design system

### Palette de couleurs

```
-- Couleurs principales
primary:          #6366F1   (indigo)
primary-dark:     #4F46E5
primary-light:    #818CF8

-- Couleurs sémantiques
success:          #22C55E
warning:          #F59E0B
danger:           #EF4444
info:             #3B82F6

-- Thème clair
bg-base:          #F9FAFB
bg-surface:       #FFFFFF
bg-subtle:        #F3F4F6
border:           #E5E7EB
text-primary:     #111827
text-secondary:   #6B7280
text-muted:       #9CA3AF

-- Thème sombre
bg-base-dark:     #0F172A
bg-surface-dark:  #1E293B
bg-subtle-dark:   #334155
border-dark:      #475569
text-primary-dark:#F1F5F9
text-secondary-dark:#94A3B8
text-muted-dark:  #64748B

-- Sidebar
sidebar-bg:       #1E1B4B   (indigo très sombre)
sidebar-text:     #C7D2FE
sidebar-active:   #6366F1
sidebar-hover:    #312E81
```

### Typographie

```
-- Police principale
font-family: 'Inter', sans-serif

-- Tailles
text-xs:    12px / line-height 16px
text-sm:    14px / line-height 20px
text-base:  16px / line-height 24px
text-lg:    18px / line-height 28px
text-xl:    20px / line-height 28px
text-2xl:   24px / line-height 32px
text-3xl:   30px / line-height 36px

-- Poids
font-normal:   400
font-medium:   500
font-semibold: 600
font-bold:     700
```

### Espacements (base 4px)

```
spacing-1:   4px
spacing-2:   8px
spacing-3:   12px
spacing-4:   16px
spacing-5:   20px
spacing-6:   24px
spacing-8:   32px
spacing-10:  40px
spacing-12:  48px
spacing-16:  64px
```

### Bordures et ombres

```
-- Border radius
rounded-sm:   4px
rounded:      8px
rounded-md:   12px
rounded-lg:   16px
rounded-full: 9999px

-- Ombres (thème clair)
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
shadow:     0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
shadow-lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)

-- Thème sombre : remplacer les ombres par des bordures
border: 1px solid var(--border-dark)
```

### Composants — tailles standards

```
-- Sidebar
largeur:       256px (collapsible à 64px sur mobile)
hauteur:       100vh

-- Header
hauteur:       64px

-- Boutons
height-sm:     32px / padding: 0 12px / text-sm
height-md:     40px / padding: 0 16px / text-sm
height-lg:     48px / padding: 0 20px / text-base

-- Inputs
height:        40px / border-radius: 8px

-- Cards
padding:       24px / border-radius: 12px

-- Tableaux (densité normale)
row-height:    52px
row-compact:   36px
row-spacious:  68px

-- Modales
max-width-sm:  400px
max-width-md:  560px
max-width-lg:  720px
```

### Conventions de nommage

```
-- Fichiers et dossiers
Composants React :    PascalCase         (UserTable.tsx)
Hooks :               camelCase + use    (usePermissions.ts)
Services backend :    camelCase.service  (permissions.service.ts)
Routes backend :      camelCase.routes   (users.routes.ts)
Schémas Zod :         camelCase.schema   (user.schema.ts)
Pages Next.js :       page.tsx           (dans dossier nommé en kebab-case)
Variables CSS :       --kebab-case

-- Variables et fonctions
Variables :           camelCase
Constantes globales : UPPER_SNAKE_CASE
Types TypeScript :    PascalCase
Interfaces :          PascalCase (pas de préfixe I)
Enums :               PascalCase

-- Base de données (Drizzle)
Noms de tables :      snake_case pluriel  (user_roles)
Noms de colonnes :    snake_case          (created_at)
Clés étrangères :     [table]_id          (user_id, role_id)
```

---

## Architecture du système de notifications (multi-provider)

### Principe d'abstraction

Le backend définit une interface `INotificationProvider` avec une méthode unique `send(userId, event, payload)`. Chaque provider (Telegram, Firebase, Hybrid) implémente cette interface. Au démarrage du serveur, le `NotificationService` lit la variable `NOTIFICATION_PROVIDER` et instancie le bon provider. Tout le code métier appelle uniquement `NotificationService.send()` sans jamais savoir quel provider est utilisé.

```
NotificationService.send(userId, 'leave.approved', { days: 5, startDate: '2025-07-01' })
         ↓
   Lit NOTIFICATION_PROVIDER
         ↓
   ┌─────────────────────────────────────────┐
   │  telegram  │  firebase  │    hybrid     │
   └─────────────────────────────────────────┘
         ↓               ↓             ↓
   TelegramProvider  FirebaseProvider  HybridProvider
   (HTTP simple)     (FCM + Gmail)     (les deux)
```

### Provider Telegram — développement

**Configuration requise :**
- `NOTIFICATION_PROVIDER=telegram`
- `TELEGRAM_BOT_TOKEN=` (obtenu via @BotFather)
- `TELEGRAM_BOT_USERNAME=` (nom du bot sans @)

**Liaison du compte utilisateur :**
1. L'utilisateur clique sur "Lier mon Telegram" dans ses paramètres
2. L'application génère un lien `https://t.me/{BOT_USERNAME}?start={userId}`
3. L'utilisateur ouvre ce lien, démarre la conversation avec le bot
4. Le bot reçoit le `userId` via le paramètre `/start`, récupère le `chat_id` Telegram de l'utilisateur et le sauvegarde dans `user_preferences.telegram_chat_id`
5. Le compte est lié — toutes les notifications futures arrivent sur Telegram

**Format des messages en développement :**
- Messages en texte Markdown pour une lecture claire dans Telegram
- Boutons inline pour les actions rapides (approbation de congé, confirmation de délégation)
- Si `telegram_chat_id` est absent pour un utilisateur, la notification est loguée en console (niveau `info`) sans erreur

**Exemple de message avec boutons :**
```
🗓 *Nouvelle demande de congé*

👤 Employé : Jean Dupont
📅 Période : 1 au 5 juillet 2025 (5 jours)
📋 Type : Congés payés
💬 Motif : Vacances familiales

[✅ Approuver]  [❌ Rejeter]  [👁 Voir le détail]
```

### Provider Firebase + Gmail — production par défaut

**Configuration requise :**
- `NOTIFICATION_PROVIDER=firebase`
- `FCM_SERVER_KEY=`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY=`
- `GMAIL_CLIENT_ID=`, `GMAIL_CLIENT_SECRET=`, `GMAIL_REFRESH_TOKEN=`, `GMAIL_SENDER_EMAIL=`

**Canaux utilisés :**
- **Firebase FCM** → notifications push dans le navigateur (même onglet fermé)
- **Gmail API** → emails transactionnels (invitation, blocage de compte, annonce critique, résumé quotidien)
- Les deux canaux sont envoyés en parallèle via deux jobs BullMQ distincts

### Provider Hybrid — production avancée

**Configuration requise :**
- `NOTIFICATION_PROVIDER=hybrid`
- Toutes les variables Firebase + Gmail + Telegram

**Logique de routage :**
- Si `user_preferences.telegram_chat_id` est rempli → envoyer via Telegram
- Sinon → envoyer via Firebase FCM + Gmail
- Un utilisateur peut désactiver Telegram même s'il a lié son compte (via ses préférences)

### Variables d'environnement par mode

| Variable | Dev (telegram) | Prod (firebase) | Prod (hybrid) |
|---|---|---|---|
| `NOTIFICATION_PROVIDER` | `telegram` | `firebase` | `hybrid` |
| `TELEGRAM_BOT_TOKEN` | ✅ Requis | ❌ Ignoré | ✅ Requis |
| `TELEGRAM_BOT_USERNAME` | ✅ Requis | ❌ Ignoré | ✅ Requis |
| `FCM_SERVER_KEY` | ❌ Ignoré | ✅ Requis | ✅ Requis |
| `FIREBASE_VAPID_KEY` | ❌ Ignoré | ✅ Requis | ✅ Requis |
| `GMAIL_CLIENT_ID` | ❌ Ignoré | ✅ Requis | ✅ Requis |
| `GMAIL_CLIENT_SECRET` | ❌ Ignoré | ✅ Requis | ✅ Requis |
| `GMAIL_REFRESH_TOKEN` | ❌ Ignoré | ✅ Requis | ✅ Requis |

### Pages frontend à ajouter

Dans les paramètres utilisateur, une section **"Notifications"** affiche :
- Le provider actif (information en lecture seule, défini par l'admin)
- Si le provider est `telegram` ou `hybrid` : bouton "Lier mon compte Telegram" avec le lien direct vers le bot, et statut de liaison (lié / non lié)
- Liste des types de notifications avec toggle on/off par canal disponible
- Bouton "Envoyer une notification test" pour vérifier que la liaison fonctionne

---

## TODO LIST — Suivi de l'avancement du projet

Cette liste couvre toutes les tâches du projet du début au déploiement. Cocher une case `[x]` quand la tâche est terminée.

---

### PHASE 0 — Initialisation du projet

#### Infrastructure
- [ ] Créer la structure monorepo avec les dossiers `frontend/` et `backend/` à la racine
- [ ] Créer le `docker-compose.yml` avec les 5 services : mysql, redis, backend, frontend, nginx
- [ ] Créer le `nginx/nginx.conf` (reverse proxy `/api/*` → backend, `/` → frontend)
- [ ] Créer le `nginx/Dockerfile`
- [ ] Créer les fichiers `backend/.env.example` et `frontend/.env.example` avec toutes les variables documentées
- [ ] Créer le `README.md` avec les instructions de démarrage Docker et sans Docker
- [ ] Créer le dossier `database/` avec les 4 fichiers SQL vides prêts à être remplis

#### Backend — Initialisation
- [ ] Initialiser `backend/package.json` avec toutes les dépendances (Node.js, TypeScript, Drizzle, Redis, Firebase Admin, Winston, BullMQ, Zod, Nodemon)
- [ ] Configurer `backend/tsconfig.json`
- [ ] Configurer `backend/nodemon.json`
- [ ] Créer le point d'entrée `backend/src/index.ts`
- [ ] Créer `backend/Dockerfile`

#### Frontend — Initialisation
- [ ] Initialiser le projet Next.js 14+ App Router avec TypeScript
- [ ] Installer les dépendances frontend (Tanstack Query, React Hook Form, Zod, Framer Motion)
- [ ] Configurer `tailwind.config.ts` avec `darkMode: 'class'` et les variables CSS du design system
- [ ] Configurer la police Inter depuis Google Fonts dans `app/layout.tsx`
- [ ] Créer `frontend/Dockerfile`
- [ ] Configurer `frontend/next.config.ts`

---

### PHASE 1 — Base de données

- [ ] Écrire et exécuter `database/01_create_database.sql` (création base MySQL utf8mb4)
- [ ] Écrire et exécuter `database/02_create_tables.sql` (32 tables avec clés étrangères et index)
- [ ] Écrire et exécuter `database/03_seed_data.sql` (modules, rôles système, types de congés, paliers d'ancienneté, permissions)
- [ ] Configurer Drizzle ORM dans `backend/src/config/db.ts`
- [ ] Écrire le schéma Drizzle complet dans `backend/src/db/schema.ts` (32 tables)
- [ ] Créer le compte Firebase Admin dans la console Firebase et récupérer l'UID
- [ ] Écrire et exécuter `database/04_create_admin.sql` avec l'UID Firebase récupéré

---

### PHASE 2 — Firebase & Authentification

- [ ] Créer le projet Firebase et activer Email/Password Authentication
- [ ] Configurer Firebase Admin SDK côté backend (`backend/src/config/firebase.ts`)
- [ ] Configurer Firebase Client SDK côté frontend (`frontend/src/lib/firebase.ts`)
- [ ] Écrire le middleware `auth.middleware.ts` (vérification token Firebase à chaque requête)
- [ ] Écrire le middleware `role.middleware.ts` (contrôle des rôles et permissions)
- [ ] Écrire le middleware `rateLimit.middleware.ts` (rate limiting via Redis)
- [ ] Écrire le middleware `error.middleware.ts` (gestion globale des erreurs)
- [ ] Implémenter `POST /api/v1/auth/sync` (synchronisation Firebase → MySQL)
- [ ] Implémenter `GET /api/v1/auth/me` (profil courant + permissions effectives)
- [ ] Implémenter `POST /api/v1/auth/logout` (invalidation session Redis)
- [ ] Créer `AuthContext.tsx` côté frontend (gestion session, rafraîchissement token automatique)
- [ ] Configurer Tanstack Query (`frontend/src/lib/queryClient.ts`)
- [ ] Créer le client API avec attachement automatique du token Firebase (`frontend/src/lib/apiClient.ts`)
- [ ] Créer la page `/login` (Email/Password Firebase)
- [ ] Créer la page `/forgot-password` (réinitialisation via Firebase)
- [ ] Créer la page `/invite/[token]` (acceptation d'invitation)
- [ ] Déployer les règles de sécurité Firebase

---

### PHASE 3 — Backend Core

#### Configuration
- [ ] Configurer Redis (`backend/src/config/redis.ts`)
- [ ] Configurer Winston logger (`backend/src/utils/logger.ts`) avec niveaux error/warn/info/debug
- [ ] Créer la route `GET /health` (health check Docker/Nginx)
- [ ] Créer la route `GET /api/v1/status` (état de tous les services)

#### Utilisateurs
- [ ] `GET /api/v1/users` (liste paginée avec filtres)
- [ ] `POST /api/v1/users` (créer utilisateur)
- [ ] `GET /api/v1/users/:id` (détail utilisateur)
- [ ] `PUT /api/v1/users/:id` (modifier utilisateur)
- [ ] `DELETE /api/v1/users/:id` (désactiver utilisateur)
- [ ] `GET /api/v1/users/:id/permissions` (permissions effectives calculées)
- [ ] `POST /api/v1/users/invite` (inviter par email)
- [ ] `POST /api/v1/users/:id/unblock` (débloquer compte)
- [ ] `GET /api/v1/users/:id/sessions` (sessions actives)
- [ ] `DELETE /api/v1/users/:id/sessions` (révoquer sessions)

#### Rôles & Permissions
- [ ] CRUD complet `/api/v1/roles`
- [ ] `PUT /api/v1/roles/:id/permissions` (mettre à jour permissions d'un rôle)
- [ ] CRUD complet `/api/v1/permissions`
- [ ] CRUD complet `/api/v1/modules`
- [ ] `PATCH /api/v1/modules/:id/toggle` (activer/désactiver module)

#### Départements
- [ ] CRUD complet `/api/v1/departments`
- [ ] `PUT /api/v1/departments/:id/manager` (désigner manager)
- [ ] `DELETE /api/v1/departments/:id/manager` (retirer manager)
- [ ] `POST /api/v1/departments/:id/members` (ajouter membres)
- [ ] `DELETE /api/v1/departments/:id/members/:userId` (retirer membre)
- [ ] `PUT /api/v1/departments/:id/roles` (rôles du département)

#### Service de résolution des permissions
- [ ] Écrire `permissionsResolver.service.ts` (calcul permissions effectives avec règle de priorité en 4 niveaux)
- [ ] Mettre en cache les permissions dans Redis (`redis.service.ts`)
- [ ] Invalider le cache dès qu'une permission, un rôle ou un département est modifié
- [ ] Implémenter `POST /api/v1/simulator` (simulateur de permissions)

#### Blocage de compte
- [ ] Implémenter le compteur de tentatives échouées dans Redis (`login_attempts:userId`)
- [ ] Implémenter le blocage automatique avec TTL Redis (`account_locked:userId`)
- [ ] Envoyer notification au compte bloqué et à l'admin
- [ ] Enregistrer chaque tentative dans `login_attempts` (MySQL)

---

### PHASE 4 — Congés & Calendrier

- [ ] CRUD complet `/api/v1/leave-types` (types de congés avec politique de validation)
- [ ] `POST /api/v1/leaves` (demande simple ou fractionnée)
- [ ] `GET /api/v1/leaves` (liste avec filtres)
- [ ] `GET /api/v1/leaves/:id` (détail + pièces jointes + timeline)
- [ ] `PATCH /api/v1/leaves/:id/approve` (approbation manager/délégataire)
- [ ] `PATCH /api/v1/leaves/:id/reject` (rejet avec commentaire obligatoire)
- [ ] `POST /api/v1/leaves/:id/attachments` (upload pièce jointe)
- [ ] `GET /api/v1/leaves/team-calendar` (absences équipe pour calendrier)
- [ ] `POST /api/v1/leaves/collective` (congé collectif manager/admin)
- [ ] `POST /api/v1/leaves/proxy` (demande par procuration)
- [ ] `GET /api/v1/leaves/balance` (solde congés utilisateur courant)
- [ ] CRUD `/api/v1/quotas` (gestion quotas annuels)
- [ ] `POST /api/v1/quotas/close-year` (clôture annuelle avec report/perte)
- [ ] CRUD `/api/v1/holidays` (jours fériés)
- [ ] CRUD `/api/v1/blackout-periods` (périodes de blocage)
- [ ] Job automatique d'ajustement du quota selon ancienneté (`seniority_tiers`)
- [ ] Job automatique de clôture annuelle des congés

---

### PHASE 5 — Délégations & Procuration

- [ ] CRUD complet `/api/v1/delegations`
- [ ] Activation/désactivation automatique des délégations selon les dates
- [ ] Vérification des droits du délégataire dans `role.middleware.ts`
- [ ] Badge "décision par délégation" dans le journal d'audit
- [ ] CRUD `/api/v1/proxy-requests` (demandes par procuration)
- [ ] Notification au bénéficiaire lors d'une demande par procuration

---

### PHASE 6 — Système de notifications (multi-provider)

- [ ] Écrire l'interface abstraite `INotificationProvider` (`notification.provider.ts`)
- [ ] Écrire le `NotificationService` qui instancie le bon provider selon `NOTIFICATION_PROVIDER`
- [ ] Configurer BullMQ (`queue.service.ts`) et le worker (`notifications.worker.ts`)
- [ ] **Provider Telegram** (`telegram.provider.ts`) :
  - [ ] Créer le bot via @BotFather et configurer `TELEGRAM_BOT_TOKEN`
  - [ ] Implémenter l'envoi de message texte Markdown
  - [ ] Implémenter les boutons inline (approbation congé directement depuis Telegram)
  - [ ] Implémenter le webhook `/start {userId}` pour lier le `chat_id`
  - [ ] Fallback console.log si `telegram_chat_id` absent
- [ ] **Provider Firebase + Gmail** (`firebase.provider.ts`) :
  - [ ] Configurer FCM pour les notifications push navigateur
  - [ ] Configurer Gmail API (OAuth2) pour les emails transactionnels
- [ ] **Provider Hybrid** (`hybrid.provider.ts`) :
  - [ ] Routage : Telegram si `telegram_chat_id` présent, sinon Firebase + Gmail
- [ ] CRUD `/api/v1/notifications` (in-app)
- [ ] `PATCH /api/v1/notifications/:id/read`
- [ ] `PATCH /api/v1/notifications/read-all`
- [ ] Déclencher les notifications sur tous les événements métier listés

---

### PHASE 7 — Communication interne & Annonces

- [ ] CRUD `/api/v1/conversations` (messagerie interne)
- [ ] `POST /api/v1/conversations/:id/messages` (envoyer message)
- [ ] `GET /api/v1/conversations/:id` (messages paginés)
- [ ] Liaison message ↔ demande de congé ou action de permission
- [ ] CRUD `/api/v1/announcements` (annonces globales)
- [ ] `PATCH /api/v1/announcements/:id/dismiss` (fermer annonce)
- [ ] Notification push + email pour annonces critiques

---

### PHASE 8 — Audit & Rapports

- [ ] `GET /api/v1/audit` (journal avec filtres avancés)
- [ ] `GET /api/v1/audit/export` (export CSV ou PDF)
- [ ] Enregistrement automatique de toutes les actions sensibles dans `audit_logs`
- [ ] `POST /api/v1/reports/generate` (génération rapport PDF côté serveur)
- [ ] `GET /api/v1/reports/:reportId` (téléchargement rapport)
- [ ] `GET /api/v1/reports/anomalies` (rapport d'anomalies en temps réel)
- [ ] Rapport congés par département
- [ ] Rapport utilisation des permissions
- [ ] Rapport des délégations
- [ ] Rapport de clôture annuelle

---

### PHASE 9 — Interface Frontend (Layout & Design system)

- [ ] Créer les variants Framer Motion réutilisables (`frontend/src/lib/animations.ts`)
- [ ] Créer le composant `PageWrapper.tsx` (animation de transition entre pages)
- [ ] Créer le `Sidebar.tsx` (navigation avec accès conditionnel par rôle, collapsible)
- [ ] Créer le `Header.tsx` (barre supérieure : toggle thème, cloche notifications, profil)
- [ ] Créer `ThemeToggle.tsx` (bascule thème clair/sombre avec persistance)
- [ ] Créer `DensityToggle.tsx` (compact/normal/spacieux)
- [ ] Créer le layout protégé `(app)/layout.tsx` avec Sidebar + Header
- [ ] Implémenter `ProtectedRoute.tsx` (garde de route selon permissions)
- [ ] **Mode sombre : appliquer les classes Tailwind dark: sur TOUS les composants**
  - [ ] Inputs : `bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100`
  - [ ] Cards : `bg-white dark:bg-slate-800 border dark:border-slate-700`
  - [ ] Header : `bg-white dark:bg-slate-900 border-b dark:border-slate-700`
  - [ ] Sidebar : `bg-[#1E1B4B]` (fixe, même en light)
  - [ ] Boutons primaires : `bg-indigo-600 hover:bg-indigo-700 text-white`
  - [ ] Arrière-plan principal : `bg-gray-50 dark:bg-slate-900`
  - [ ] Texte secondaire : `text-gray-500 dark:text-slate-400`

---

### PHASE 10 — Pages Frontend

#### Authentification
- [ ] Page `/login`
- [ ] Page `/forgot-password`
- [ ] Page `/invite/[token]`

#### Dashboard
- [ ] Page `/dashboard` avec statistiques, activité récente, alertes
- [ ] Cartes de statistiques animées (compteurs, stagger Framer Motion)
- [ ] Graphiques interactifs (courbes, histogrammes, heatmap)
- [ ] Dashboard personnalisable par glisser-déposer
- [ ] Tableau de bord RH/Superviseur `/hr-dashboard`

#### Gestion des accès
- [ ] Page `/users` (liste avec filtres, colonnes configurables)
- [ ] Page `/users/[id]` (profil + permissions effectives + historique)
- [ ] Page `/roles` (liste avec nombre d'utilisateurs)
- [ ] Page `/roles/new` et `/roles/[id]` (matrice de permissions interactive)
- [ ] Page `/permissions` (groupées par module)
- [ ] Page `/modules`
- [ ] Page `/departments` et `/departments/[id]`
- [ ] Page `/simulator` (simulateur de permissions)

#### Congés & Calendrier
- [ ] Page `/leaves` (liste des demandes)
- [ ] Page `/leaves/new` (formulaire avec support fractionné)
- [ ] Page `/leaves/[id]` (détail + timeline + pièces jointes)
- [ ] Page `/leaves/calendar` (calendrier personnel)
- [ ] Page `/team-calendar` (vue équipe manager)

#### Autres
- [ ] Page `/delegations`
- [ ] Page `/messages` (messagerie interne)
- [ ] Page `/audit` (journal avec filtres et export)
- [ ] Page `/reports` (génération et téléchargement)
- [ ] Page `/announcements`
- [ ] Page `/status` (état des services, publique)
- [ ] Page `/settings/profile`
- [ ] Page `/settings/notifications` (préférences + lien Telegram)

---

### PHASE 11 — Composants UI

- [ ] `DataTable.tsx` (tri, filtre, pagination, colonnes configurables, densité)
- [ ] `PermissionMatrix.tsx` (matrice interactive avec Optimistic UI)
- [ ] `NotificationBell.tsx` (badge + dropdown avec marquage lu/non lu)
- [ ] `CalendarView.tsx` (calendrier personnel et équipe)
- [ ] `LeaveBalanceCard.tsx` (solde congés avec barre de progression)
- [ ] `AuditTimeline.tsx` (timeline des actions)
- [ ] `AnnouncementBanner.tsx` (bandeau animé Framer Motion selon niveau)
- [ ] `ContextualHelp.tsx` (panneau latéral d'aide contextuelle)
- [ ] `SystemStatusBadge.tsx` (indicateur état des services)
- [ ] `OnboardingTour.tsx` (tour guidé interactif au premier login)
- [ ] `ConfirmDialog.tsx` (modale de confirmation avec animation)
- [ ] `ExportButton.tsx` (export CSV/PDF)
- [ ] `Skeleton.tsx` (shimmer de chargement)
- [ ] `Toast.tsx` (notifications toast avec animation entrée/sortie)
- [ ] `RoleBadge.tsx`, `StatusBadge.tsx`, `UserAvatar.tsx`

---

### PHASE 12 — Sécurité & Qualité

- [ ] Valider toutes les entrées API avec Zod (backend)
- [ ] Implémenter le rate limiting Redis sur toutes les routes sensibles
- [ ] Vérifier que le rôle Admin ne peut jamais être bloqué par une restriction
- [ ] Vérifier que les logs d'audit sont immuables (pas de route DELETE sur audit_logs)
- [ ] Configurer les headers de sécurité Nginx (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Implémenter la documentation Swagger/OpenAPI (`/api/docs`)
- [ ] Écrire les tests Vitest pour les routes critiques :
  - [ ] Authentification (token valide, expiré, invalide, compte bloqué)
  - [ ] Résolution des permissions (4 niveaux de priorité)
  - [ ] Blocage de compte (seuil, expiration, déblocage manuel)
  - [ ] Calcul des congés (solde, jours fériés, blackout period, fractionné)
  - [ ] Délégation (activation, expiration, droits du délégataire)
  - [ ] Rate limiting
- [ ] Versionner l'API avec le préfixe `/api/v1/`

---

### PHASE 13 — Déploiement

- [ ] Vérifier que `docker-compose up` démarre tous les services sans erreur
- [ ] Vérifier que Nginx route correctement les requêtes
- [ ] Tester le mode sombre et le mode clair sur toutes les pages
- [ ] Tester la liaison du compte Telegram et la réception de notifications
- [ ] Tester le basculement `NOTIFICATION_PROVIDER` (telegram → firebase → hybrid)
- [ ] Tester l'export PDF des rapports
- [ ] Tester la clôture annuelle des congés
- [ ] Vérifier que le compte admin a bien accès à toutes les fonctionnalités
- [ ] Tester le mode sans Docker (lancement manuel backend + frontend)
- [ ] Vérifier la page `/status` et la route `/health`
- [ ] Configurer HTTPS sur Nginx (certificat SSL)
