import { db, connection } from '../config/db';
import {
  organizations,
  modules,
  permissions,
  roles,
  rolePermissions,
  leaveTypes,
  seniorityTiers,
  publicHolidays,
  users,
  userPreferences,
  userRoles,
  departments,
  departmentMembers,
} from './schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const DEFAULT_ORG_NAME = 'Mon Organisation';
const DEFAULT_ORG_SLUG = 'mon-organisation';

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getFrenchHolidays(year: number, orgId: number) {
  const easter = getEasterDate(year);
  const holidays = [
    { name: "Jour de l'An", date: `${year}-01-01` },
    { name: 'Lundi de Paques', date: formatDate(addDays(easter, 1)) },
    { name: 'Fete du Travail', date: `${year}-05-01` },
    { name: 'Victoire 1945', date: `${year}-05-08` },
    { name: 'Ascension', date: formatDate(addDays(easter, 39)) },
    { name: 'Lundi de Pentecote', date: formatDate(addDays(easter, 50)) },
    { name: 'Fete Nationale', date: `${year}-07-14` },
    { name: 'Assomption', date: `${year}-08-15` },
    { name: 'Toussaint', date: `${year}-11-01` },
    { name: 'Armistice', date: `${year}-11-11` },
    { name: 'Noel', date: `${year}-12-25` },
  ];
  return holidays.map((h) => ({
    organizationId: orgId,
    name: h.name,
    holidayDate: new Date(h.date),
    countryCode: 'FR',
    isCustom: false,
  }));
}

async function ensureOrganization() {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);
  if (existing.length > 0) {
    logger.info('Seed: default organization already exists');
    return existing[0];
  }
  const [result] = await db.insert(organizations).values({
    name: DEFAULT_ORG_NAME,
    slug: DEFAULT_ORG_SLUG,
  });
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, Number(result.insertId)))
    .limit(1);
  logger.info('Seed: created default organization', { orgId: org.id });
  return org;
}

async function ensureModules(orgId: number) {
  const moduleDefs = [
    { slug: 'users', name: 'Utilisateurs', description: 'Gestion des utilisateurs' },
    { slug: 'roles', name: 'Roles', description: 'Gestion des roles' },
    { slug: 'permissions', name: 'Permissions', description: 'Gestion des permissions' },
    { slug: 'departments', name: 'Departements', description: 'Gestion des departements' },
    { slug: 'leaves', name: 'Conges', description: 'Gestion des conges' },
    { slug: 'leave_types', name: 'Types de conges', description: 'Gestion des types de conges' },
    { slug: 'audit', name: 'Audit', description: "Journal d'audit" },
    { slug: 'reports', name: 'Rapports', description: 'Rapports et analyses' },
    { slug: 'notifications', name: 'Notifications', description: 'Centre de notifications' },
    { slug: 'messages', name: 'Messagerie', description: 'Communication interne' },
    { slug: 'admin', name: 'Administration', description: 'Configuration et administration' },
  ];

  for (const m of moduleDefs) {
    const existing = await db
      .select()
      .from(modules)
      .where(eq(modules.slug, m.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(modules).values({
        organizationId: orgId,
        slug: m.slug,
        name: m.name,
        description: m.description,
      });
    }
  }
  logger.info('Seed: modules ensured');
}

async function ensurePermissions(orgId: number) {
  const allModules = await db.select().from(modules).where(eq(modules.organizationId, orgId));
  const modMap = new Map(allModules.map((m) => [m.slug, m.id]));

  const permissionDefs: Array<{ slug: string; name: string; action: string; moduleSlug: string }> = [
    // users
    { slug: 'users.create', name: 'Creer un utilisateur', action: 'create', moduleSlug: 'users' },
    { slug: 'users.read', name: 'Voir les utilisateurs', action: 'read', moduleSlug: 'users' },
    { slug: 'users.update', name: 'Modifier un utilisateur', action: 'update', moduleSlug: 'users' },
    { slug: 'users.delete', name: 'Supprimer un utilisateur', action: 'delete', moduleSlug: 'users' },
    // roles
    { slug: 'roles.create', name: 'Creer un role', action: 'create', moduleSlug: 'roles' },
    { slug: 'roles.read', name: 'Voir les roles', action: 'read', moduleSlug: 'roles' },
    { slug: 'roles.update', name: 'Modifier un role', action: 'update', moduleSlug: 'roles' },
    { slug: 'roles.delete', name: 'Supprimer un role', action: 'delete', moduleSlug: 'roles' },
    // permissions
    { slug: 'permissions.create', name: 'Creer une permission', action: 'create', moduleSlug: 'permissions' },
    { slug: 'permissions.read', name: 'Voir les permissions', action: 'read', moduleSlug: 'permissions' },
    { slug: 'permissions.update', name: 'Modifier une permission', action: 'update', moduleSlug: 'permissions' },
    { slug: 'permissions.delete', name: 'Supprimer une permission', action: 'delete', moduleSlug: 'permissions' },
    // departments
    { slug: 'departments.create', name: 'Creer un departement', action: 'create', moduleSlug: 'departments' },
    { slug: 'departments.read', name: 'Voir les departements', action: 'read', moduleSlug: 'departments' },
    { slug: 'departments.update', name: 'Modifier un departement', action: 'update', moduleSlug: 'departments' },
    { slug: 'departments.delete', name: 'Supprimer un departement', action: 'delete', moduleSlug: 'departments' },
    // leaves
    { slug: 'leaves.create', name: 'Soumettre une demande de conge', action: 'create', moduleSlug: 'leaves' },
    { slug: 'leaves.read', name: 'Voir les demandes de conge', action: 'read', moduleSlug: 'leaves' },
    { slug: 'leaves.update', name: 'Modifier une demande de conge', action: 'update', moduleSlug: 'leaves' },
    { slug: 'leaves.delete', name: 'Annuler une demande de conge', action: 'delete', moduleSlug: 'leaves' },
    { slug: 'leaves.approve', name: 'Approuver une demande de conge', action: 'approve', moduleSlug: 'leaves' },
    // leave_types
    { slug: 'leave_types.create', name: 'Creer un type de conge', action: 'create', moduleSlug: 'leave_types' },
    { slug: 'leave_types.read', name: 'Voir les types de conges', action: 'read', moduleSlug: 'leave_types' },
    { slug: 'leave_types.update', name: 'Modifier un type de conge', action: 'update', moduleSlug: 'leave_types' },
    { slug: 'leave_types.delete', name: 'Supprimer un type de conge', action: 'delete', moduleSlug: 'leave_types' },
    // audit
    { slug: 'audit.read', name: 'Voir le journal d audit', action: 'read', moduleSlug: 'audit' },
    { slug: 'audit.export', name: 'Exporter le journal d audit', action: 'export', moduleSlug: 'audit' },
    // reports
    { slug: 'reports.read', name: 'Voir les rapports', action: 'read', moduleSlug: 'reports' },
    { slug: 'reports.export', name: 'Generer des rapports', action: 'export', moduleSlug: 'reports' },
    // notifications
    { slug: 'notifications.read', name: 'Voir les notifications', action: 'read', moduleSlug: 'notifications' },
    // messages
    { slug: 'messages.create', name: 'Envoyer un message', action: 'create', moduleSlug: 'messages' },
    { slug: 'messages.read', name: 'Voir les messages', action: 'read', moduleSlug: 'messages' },
    // admin
    { slug: 'admin.read', name: 'Acceder a l administration', action: 'read', moduleSlug: 'admin' },
    { slug: 'admin.simulate', name: 'Utiliser le simulateur', action: 'simulate', moduleSlug: 'admin' },
  ];

  for (const p of permissionDefs) {
    const moduleId = modMap.get(p.moduleSlug);
    if (!moduleId) continue;
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.slug, p.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(permissions).values({
        moduleId,
        slug: p.slug,
        name: p.name,
        action: p.action as any,
      });
    }
  }
  logger.info('Seed: permissions ensured');
}

async function ensureRoles(orgId: number) {
  const roleDefs = [
    { name: 'Super Admin', description: 'Acces total a toutes les fonctionnalites' },
    { name: 'Manager', description: 'Gestion de son equipe et approbation des conges' },
    { name: 'Superviseur RH', description: 'Supervision RH et rapports' },
    { name: 'Employe', description: 'Permissions de base' },
  ];

  for (const r of roleDefs) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, r.name))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values({
        organizationId: orgId,
        name: r.name,
        description: r.description,
        isSystem: true,
      });
    }
  }
  logger.info('Seed: roles ensured');
}

async function ensureRolePermissions(orgId: number) {
  const allRoles = await db.select().from(roles).where(eq(roles.organizationId, orgId));
  const allPerms = await db.select().from(permissions);
  const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
  const permMap = new Map(allPerms.map((p) => [p.slug, p.id]));

  const assignments: Record<string, string[]> = {
    'Super Admin': allPerms.map((p) => p.slug),
    Manager: [
      'users.read',
      'departments.read',
      'leaves.read',
      'leaves.approve',
      'leave_types.read',
      'messages.create',
      'messages.read',
      'notifications.read',
    ],
    'Superviseur RH': [
      'users.read',
      'departments.read',
      'leaves.read',
      'leave_types.read',
      'audit.read',
      'reports.read',
      'reports.export',
      'messages.create',
      'messages.read',
      'notifications.read',
    ],
    Employe: [
      'leaves.create',
      'leaves.read',
      'leaves.update',
      'leaves.delete',
      'messages.create',
      'messages.read',
      'notifications.read',
    ],
  };

  for (const [roleName, permSlugs] of Object.entries(assignments)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    for (const slug of permSlugs) {
      const permId = permMap.get(slug);
      if (!permId) continue;
      const existing = await db
        .select()
        .from(rolePermissions)
        .where(
          sql`${rolePermissions.roleId} = ${roleId} AND ${rolePermissions.permissionId} = ${permId}`
        )
        .limit(1);
      if (existing.length === 0) {
        await db.insert(rolePermissions).values({ roleId, permissionId: permId });
      }
    }
  }
  logger.info('Seed: role-permissions ensured');
}

async function ensureLeaveTypes(orgId: number) {
  const leaveTypeDefs = [
    { name: 'Conges payes', slug: 'paid_leave', defaultQuota: 25, validationMode: 'manager' as const, isCumulative: true, carryOverLimit: 10, deductibleQuota: true, isPaid: true, color: '#22C55E' },
    { name: 'Conges maladie', slug: 'sick_leave', defaultQuota: 0, validationMode: 'auto_approved' as const, isCumulative: false, carryOverLimit: 0, deductibleQuota: false, isPaid: true, color: '#EF4444' },
    { name: 'RTT', slug: 'rtt', defaultQuota: 10, validationMode: 'free' as const, isCumulative: false, carryOverLimit: 0, deductibleQuota: false, isPaid: true, color: '#3B82F6' },
    { name: 'Conges sans solde', slug: 'unpaid_leave', defaultQuota: 0, validationMode: 'manager' as const, isCumulative: false, carryOverLimit: 0, deductibleQuota: false, isPaid: false, color: '#F59E0B' },
    { name: 'Conges exceptionnels', slug: 'exceptional_leave', defaultQuota: 0, validationMode: 'auto_approved' as const, isCumulative: false, carryOverLimit: 0, deductibleQuota: false, isPaid: true, color: '#8B5CF6' },
  ];

  for (const lt of leaveTypeDefs) {
    const existing = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.slug, lt.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(leaveTypes).values({
        organizationId: orgId,
        ...lt,
      });
    }
  }
  logger.info('Seed: leave types ensured');
}

async function ensureSeniorityTiers(orgId: number) {
  const [paidLeave] = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.slug, 'paid_leave'))
    .limit(1);
  if (!paidLeave) return;

  const tiers = [
    { yearsRequired: 3, bonusDays: 2 },
    { yearsRequired: 5, bonusDays: 3 },
    { yearsRequired: 10, bonusDays: 3 },
  ];

  for (const t of tiers) {
    const existing = await db
      .select()
      .from(seniorityTiers)
      .where(
        sql`${seniorityTiers.organizationId} = ${orgId} AND ${seniorityTiers.yearsRequired} = ${t.yearsRequired}`
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(seniorityTiers).values({
        organizationId: orgId,
        yearsRequired: t.yearsRequired,
        bonusDays: t.bonusDays,
        leaveTypeId: paidLeave.id,
      });
    }
  }
  logger.info('Seed: seniority tiers ensured');
}

async function ensurePublicHolidays(orgId: number) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  let inserted = 0;

  for (const year of years) {
    const holidays = getFrenchHolidays(year, orgId);
    for (const h of holidays) {
      const existing = await db
        .select()
        .from(publicHolidays)
        .where(
          sql`${publicHolidays.organizationId} = ${orgId} AND ${publicHolidays.name} = ${h.name} AND YEAR(${publicHolidays.holidayDate}) = ${year}`
        )
        .limit(1);
      if (existing.length === 0) {
        await db.insert(publicHolidays).values(h);
        inserted++;
      }
    }
  }
  logger.info('Seed: public holidays ensured', { inserted });
}

async function ensureDefaultAdmin(orgId: number) {
  const firebaseUid = process.env.SEED_ADMIN_FIREBASE_UID || 'dev-admin-uid';
  const email = 'admin@permissionmanager.com';

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    logger.info('Seed: default admin already exists');
    return;
  }

  // Find a default department for this organization
  const [defaultDept] = await db
    .select()
    .from(departments)
    .where(eq(departments.organizationId, orgId))
    .limit(1);
  const departmentId = defaultDept?.id;

  const [result] = await db.insert(users).values({
    firebaseUid,
    email,
    firstName: 'Admin',
    lastName: 'User',
    organizationId: orgId,
    departmentId,
    status: 'active',
  });
  const userId = Number(result.insertId);

  await db.insert(userPreferences).values({
    userId,
    theme: 'system',
    density: 'normal',
    language: 'fr',
  });

  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'Super Admin'))
    .limit(1);
  if (superAdminRole) {
    await db.insert(userRoles).values({ userId, roleId: superAdminRole.id });
  }

  if (departmentId) {
    await db.insert(departmentMembers).values({ userId, departmentId });
  }

  logger.info('Seed: created default admin user', { userId });
}

async function ensureSchemaMigrations() {
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS consent_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        lawful_basis ENUM('contract', 'legal_obligation', 'legitimate_interest', 'consent') NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        withdrawn_at TIMESTAMP NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_consent_user (user_id),
        INDEX idx_consent_purpose (purpose),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info('Seed: ensured consent_logs table exists');
  } catch (err) {
    logger.warn('Seed: could not ensure consent_logs table', { error: err });
  }

  try {
    const [cols] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'departments' AND column_name = 'type'
    `);
    if ((cols as any[])[0]?.count === 0) {
      await connection.execute(`
        ALTER TABLE departments
        ADD COLUMN type ENUM('department','team','unit','group','branch') DEFAULT 'department'
      `);
      logger.info('Seed: added departments.type column');
    } else {
      logger.info('Seed: departments.type column already exists');
    }
  } catch (err) {
    logger.warn('Seed: could not ensure departments.type column', { error: err });
  }
}

export async function seedDatabase() {
  try {
    logger.info('Seed: checking database state...');
    await ensureSchemaMigrations();
    const org = await ensureOrganization();
    await ensureModules(org.id);
    await ensurePermissions(org.id);
    await ensureRoles(org.id);
    await ensureRolePermissions(org.id);
    await ensureLeaveTypes(org.id);
    await ensureSeniorityTiers(org.id);
    await ensurePublicHolidays(org.id);
    await ensureDefaultAdmin(org.id);
    logger.info('Seed: database is ready');
  } catch (error) {
    logger.error('Seed: failed to seed database', { error });
    throw error;
  }
}
