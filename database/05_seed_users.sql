USE permission_manager;

-- ============================================================
-- Script de création des comptes de démonstration
-- Exécutez ce fichier après 04_create_admin.sql
-- ============================================================

SET @org_id = (SELECT id FROM organizations ORDER BY id LIMIT 1);
SET @default_dept = (SELECT id FROM departments WHERE organization_id = @org_id ORDER BY id LIMIT 1);
SET @role_manager = (SELECT id FROM roles WHERE name = 'Manager' LIMIT 1);
SET @role_rh = (SELECT id FROM roles WHERE name = 'Superviseur RH' LIMIT 1);
SET @role_emp = (SELECT id FROM roles WHERE name = 'Employe' LIMIT 1);

-- ============================================================
-- 1. Compte MANAGER
-- ============================================================
INSERT INTO users (firebase_uid, email, first_name, last_name, organization_id, department_id, status, created_at)
VALUES ('dev-manager-uid', 'manager@exemple.com', 'Marie', 'Manager', @org_id, @default_dept, 'active', NOW());
SET @u_manager = LAST_INSERT_ID();

INSERT INTO user_preferences (user_id, theme, density, language, notification_channels, created_at)
VALUES (@u_manager, 'system', 'normal', 'fr', '{"push":true,"email":true,"telegram":false}', NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (@u_manager, @role_manager);
INSERT INTO department_members (department_id, user_id) VALUES (@default_dept, @u_manager);

-- Quotas de congés
INSERT INTO leave_quotas (user_id, leave_type_id, year, total_quota, used_days, pending_days)
SELECT @u_manager, id, YEAR(CURDATE()), default_quota, 0, 0
FROM leave_types
WHERE organization_id = @org_id;

-- ============================================================
-- 2. Compte RH (Superviseur RH)
-- ============================================================
INSERT INTO users (firebase_uid, email, first_name, last_name, organization_id, department_id, status, created_at)
VALUES ('dev-rh-uid', 'rh@exemple.com', 'Pierre', 'RH', @org_id, @default_dept, 'active', NOW());
SET @u_rh = LAST_INSERT_ID();

INSERT INTO user_preferences (user_id, theme, density, language, notification_channels, created_at)
VALUES (@u_rh, 'system', 'normal', 'fr', '{"push":true,"email":true,"telegram":false}', NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (@u_rh, @role_rh);
INSERT INTO department_members (department_id, user_id) VALUES (@default_dept, @u_rh);

-- Quotas de congés
INSERT INTO leave_quotas (user_id, leave_type_id, year, total_quota, used_days, pending_days)
SELECT @u_rh, id, YEAR(CURDATE()), default_quota, 0, 0
FROM leave_types
WHERE organization_id = @org_id;

-- ============================================================
-- 3. Compte EMPLOYE
-- ============================================================
INSERT INTO users (firebase_uid, email, first_name, last_name, organization_id, department_id, status, created_at)
VALUES ('dev-employee-uid', 'employe@exemple.com', 'Jean', 'Dupont', @org_id, @default_dept, 'active', NOW());
SET @u_emp = LAST_INSERT_ID();

INSERT INTO user_preferences (user_id, theme, density, language, notification_channels, created_at)
VALUES (@u_emp, 'system', 'normal', 'fr', '{"push":true,"email":true,"telegram":false}', NOW());

INSERT INTO user_roles (user_id, role_id) VALUES (@u_emp, @role_emp);
INSERT INTO department_members (department_id, user_id) VALUES (@default_dept, @u_emp);

-- Quotas de congés
INSERT INTO leave_quotas (user_id, leave_type_id, year, total_quota, used_days, pending_days)
SELECT @u_emp, id, YEAR(CURDATE()), default_quota, 0, 0
FROM leave_types
WHERE organization_id = @org_id;

-- ============================================================
-- Vérification
-- ============================================================
SELECT
  u.email,
  CONCAT(u.first_name, ' ', u.last_name) AS nom,
  r.name AS role,
  u.status
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.email IN ('manager@exemple.com', 'rh@exemple.com', 'employe@exemple.com');
