USE permission_manager;

-- ============================================================
-- Avant d executer ce fichier :
-- 1. En production : Creer le compte dans Firebase Authentication (Email/Password)
--    Recuperer l UID Firebase genere (console Firebase -> Authentication -> Users)
-- 2. En developpement (sans Firebase) : mettez n importe quelle valeur factice
--    pour @firebase_uid, par exemple 'dev-admin-uid'
-- 3. Remplacer les placeholders ci-dessous par les vraies valeurs
-- ============================================================

SET @firebase_uid = 'dev-admin-uid';  -- REMPLACER PAR VOTRE UID FIREBASE
SET @email = 'admin@permissionmanager.com';
SET @first_name = 'Admin';
SET @last_name = 'User';

SET @org_id = (SELECT id FROM organizations ORDER BY id LIMIT 1);
SET @role_superadmin = (SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1);
SET @default_dept = (SELECT id FROM departments WHERE organization_id = @org_id ORDER BY id LIMIT 1);

-- 1. Inserer l utilisateur (avec departement par defaut)
INSERT INTO users (firebase_uid, email, first_name, last_name, organization_id, department_id, status)
VALUES (@firebase_uid, @email, @first_name, @last_name, @org_id, @default_dept, 'active');

SET @admin_user_id = LAST_INSERT_ID();

-- 2. Inserer les preferences par defaut
INSERT INTO user_preferences (user_id, theme, density, language)
VALUES (@admin_user_id, 'system', 'normal', 'fr');

-- 3. Attribuer le role Super Admin
INSERT INTO user_roles (user_id, role_id) VALUES (@admin_user_id, @role_superadmin);

-- 4. Inserer dans department_members
INSERT INTO department_members (department_id, user_id) VALUES (@default_dept, @admin_user_id);

-- 5. Inserer les quotas de conges initiaux
INSERT INTO leave_quotas (user_id, leave_type_id, year, total_quota)
SELECT @admin_user_id, id, YEAR(CURDATE()), default_quota
FROM leave_types
WHERE organization_id = @org_id;
