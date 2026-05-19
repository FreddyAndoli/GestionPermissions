USE permission_manager;

-- Organisation par defaut
INSERT INTO organizations (name, slug) VALUES
  ('Mon Organisation', 'mon-organisation');

SET @org_id = LAST_INSERT_ID();

-- Modules systeme
INSERT INTO modules (organization_id, slug, name, description) VALUES
  (@org_id, 'users', 'Utilisateurs', 'Gestion des utilisateurs'),
  (@org_id, 'roles', 'Roles', 'Gestion des roles'),
  (@org_id, 'permissions', 'Permissions', 'Gestion des permissions'),
  (@org_id, 'departments', 'Departements', 'Gestion des departements'),
  (@org_id, 'leaves', 'Conges', 'Gestion des conges'),
  (@org_id, 'leave_types', 'Types de conges', 'Gestion des types de conges'),
  (@org_id, 'audit', 'Audit', 'Journal d audit'),
  (@org_id, 'reports', 'Rapports', 'Rapports et analyses'),
  (@org_id, 'notifications', 'Notifications', 'Centre de notifications'),
  (@org_id, 'messages', 'Messagerie', 'Communication interne'),
  (@org_id, 'proxy_requests', 'Procuration', 'Demandes par procuration'),
  (@org_id, 'admin', 'Administration', 'Configuration et administration');

-- Permissions atomiques par module
-- users
SET @mod_users = (SELECT id FROM modules WHERE slug = 'users' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_users, 'users.create', 'Creer un utilisateur', 'create'),
  (@mod_users, 'users.read', 'Voir les utilisateurs', 'read'),
  (@mod_users, 'users.update', 'Modifier un utilisateur', 'update'),
  (@mod_users, 'users.delete', 'Supprimer un utilisateur', 'delete');

-- roles
SET @mod_roles = (SELECT id FROM modules WHERE slug = 'roles' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_roles, 'roles.create', 'Creer un role', 'create'),
  (@mod_roles, 'roles.read', 'Voir les roles', 'read'),
  (@mod_roles, 'roles.update', 'Modifier un role', 'update'),
  (@mod_roles, 'roles.delete', 'Supprimer un role', 'delete');

-- permissions
SET @mod_perms = (SELECT id FROM modules WHERE slug = 'permissions' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_perms, 'permissions.create', 'Creer une permission', 'create'),
  (@mod_perms, 'permissions.read', 'Voir les permissions', 'read'),
  (@mod_perms, 'permissions.update', 'Modifier une permission', 'update'),
  (@mod_perms, 'permissions.delete', 'Supprimer une permission', 'delete');

-- departments
SET @mod_depts = (SELECT id FROM modules WHERE slug = 'departments' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_depts, 'departments.create', 'Creer un departement', 'create'),
  (@mod_depts, 'departments.read', 'Voir les departements', 'read'),
  (@mod_depts, 'departments.update', 'Modifier un departement', 'update'),
  (@mod_depts, 'departments.delete', 'Supprimer un departement', 'delete');

-- leaves
SET @mod_leaves = (SELECT id FROM modules WHERE slug = 'leaves' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_leaves, 'leaves.create', 'Soumettre une demande de conge', 'create'),
  (@mod_leaves, 'leaves.read', 'Voir les demandes de conge', 'read'),
  (@mod_leaves, 'leaves.update', 'Modifier une demande de conge', 'update'),
  (@mod_leaves, 'leaves.delete', 'Annuler une demande de conge', 'delete'),
  (@mod_leaves, 'leaves.approve', 'Approuver une demande de conge', 'approve');

-- leave_types
SET @mod_leave_types = (SELECT id FROM modules WHERE slug = 'leave_types' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_leave_types, 'leave_types.create', 'Creer un type de conge', 'create'),
  (@mod_leave_types, 'leave_types.read', 'Voir les types de conges', 'read'),
  (@mod_leave_types, 'leave_types.update', 'Modifier un type de conge', 'update'),
  (@mod_leave_types, 'leave_types.delete', 'Supprimer un type de conge', 'delete');

-- audit
SET @mod_audit = (SELECT id FROM modules WHERE slug = 'audit' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_audit, 'audit.read', 'Voir le journal d audit', 'read'),
  (@mod_audit, 'audit.export', 'Exporter le journal d audit', 'export');

-- reports
SET @mod_reports = (SELECT id FROM modules WHERE slug = 'reports' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_reports, 'reports.read', 'Voir les rapports', 'read'),
  (@mod_reports, 'reports.export', 'Generer des rapports', 'export');

-- notifications
SET @mod_notif = (SELECT id FROM modules WHERE slug = 'notifications' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_notif, 'notifications.read', 'Voir les notifications', 'read');

-- messages
SET @mod_msgs = (SELECT id FROM modules WHERE slug = 'messages' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_msgs, 'messages.create', 'Envoyer un message', 'create'),
  (@mod_msgs, 'messages.read', 'Voir les messages', 'read');

-- proxy_requests
SET @mod_proxy = (SELECT id FROM modules WHERE slug = 'proxy_requests' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_proxy, 'proxy_requests.create', 'Creer une demande de procuration', 'create'),
  (@mod_proxy, 'proxy_requests.read', 'Voir les demandes de procuration', 'read'),
  (@mod_proxy, 'proxy_requests.approve', 'Approuver une demande de procuration', 'approve'),
  (@mod_proxy, 'proxy_requests.delete', 'Supprimer une demande de procuration', 'delete');

-- admin
SET @mod_admin = (SELECT id FROM modules WHERE slug = 'admin' LIMIT 1);
INSERT INTO permissions (module_id, slug, name, action) VALUES
  (@mod_admin, 'admin.read', 'Acceder a l administration', 'read'),
  (@mod_admin, 'admin.simulate', 'Utiliser le simulateur', 'simulate');

-- Roles systeme
INSERT INTO roles (organization_id, name, description, is_system) VALUES
  (@org_id, 'Super Admin', 'Acces total a toutes les fonctionnalites', TRUE),
  (@org_id, 'Manager', 'Gestion de son equipe et approbation des conges', TRUE),
  (@org_id, 'Superviseur RH', 'Supervision RH et rapports', TRUE),
  (@org_id, 'Employe', 'Permissions de base', TRUE);

-- Attribution Super Admin a toutes les permissions
SET @role_superadmin = (SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1);
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_superadmin, id FROM permissions;

-- Attribution Manager
SET @role_manager = (SELECT id FROM roles WHERE name = 'Manager' LIMIT 1);
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_manager, id FROM permissions WHERE slug IN (
  'users.read', 'departments.read', 'leaves.read', 'leaves.approve',
  'leave_types.read', 'messages.create', 'messages.read', 'notifications.read'
);

-- Attribution Superviseur RH
SET @role_rh = (SELECT id FROM roles WHERE name = 'Superviseur RH' LIMIT 1);
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_rh, id FROM permissions WHERE slug IN (
  'users.read', 'departments.read', 'leaves.read', 'leave_types.read',
  'audit.read', 'reports.read', 'reports.export',
  'messages.create', 'messages.read', 'notifications.read'
);

-- Attribution Employe
SET @role_emp = (SELECT id FROM roles WHERE name = 'Employe' LIMIT 1);
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_emp, id FROM permissions WHERE slug IN (
  'leaves.create', 'leaves.read', 'leaves.update', 'leaves.delete',
  'messages.create', 'messages.read', 'notifications.read'
);

-- Departement par defaut (pour eviter le message "No department created")
INSERT INTO departments (organization_id, name, description, type) VALUES
  (@org_id, 'Direction Generale', 'Departement principal de direction', 'department');

SET @default_dept_id = LAST_INSERT_ID();

-- Types de conges par defaut
INSERT INTO leave_types (organization_id, name, slug, default_quota, validation_mode, is_cumulative, carry_over_limit, deductible_quota, is_paid, color) VALUES
  (@org_id, 'Conges payes', 'paid_leave', 25, 'manager', TRUE, 10, TRUE, TRUE, '#22C55E'),
  (@org_id, 'Conges maladie', 'sick_leave', 0, 'auto_approved', FALSE, 0, FALSE, TRUE, '#EF4444'),
  (@org_id, 'RTT', 'rtt', 10, 'free', FALSE, 0, FALSE, TRUE, '#3B82F6'),
  (@org_id, 'Conges sans solde', 'unpaid_leave', 0, 'manager', FALSE, 0, FALSE, FALSE, '#F59E0B'),
  (@org_id, 'Conges exceptionnels', 'exceptional_leave', 0, 'auto_approved', FALSE, 0, FALSE, TRUE, '#8B5CF6');

-- Paliers d anciennete par defaut
SET @lt_paid = (SELECT id FROM leave_types WHERE slug = 'paid_leave' LIMIT 1);
INSERT INTO seniority_tiers (organization_id, years_required, bonus_days, leave_type_id) VALUES
  (@org_id, 3, 2, @lt_paid),
  (@org_id, 5, 3, @lt_paid),
  (@org_id, 10, 3, @lt_paid);

-- Jours feries du Togo (annee courante + exemples fixes)
INSERT INTO public_holidays (organization_id, name, holiday_date, country_code, is_custom) VALUES
  (@org_id, 'Jour de l\'an', CONCAT(YEAR(CURDATE()), '-01-01'), 'TG', FALSE),
  (@org_id, 'Fete de la liberation', CONCAT(YEAR(CURDATE()), '-01-13'), 'TG', FALSE),
  (@org_id, 'Jour de la Femme', CONCAT(YEAR(CURDATE()), '-03-08'), 'TG', FALSE),
  (@org_id, 'Fete de l\'Independance', CONCAT(YEAR(CURDATE()), '-04-27'), 'TG', FALSE),
  (@org_id, 'Fete du Travail', CONCAT(YEAR(CURDATE()), '-05-01'), 'TG', FALSE),
  (@org_id, 'Ascension', CONCAT(YEAR(CURDATE()), '-05-29'), 'TG', FALSE),
  (@org_id, 'Lundi de Pentecote', CONCAT(YEAR(CURDATE()), '-06-09'), 'TG', FALSE),
  (@org_id, 'Fete de la Martyrologie', CONCAT(YEAR(CURDATE()), '-06-21'), 'TG', FALSE),
  (@org_id, 'Assomption', CONCAT(YEAR(CURDATE()), '-08-15'), 'TG', FALSE),
  (@org_id, 'Toussaint', CONCAT(YEAR(CURDATE()), '-11-01'), 'TG', FALSE),
  (@org_id, 'Noel', CONCAT(YEAR(CURDATE()), '-12-25'), 'TG', FALSE);


USE permission_manager;