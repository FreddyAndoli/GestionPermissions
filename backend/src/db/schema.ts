import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  mysqlEnum,
  date,
  uniqueIndex,
  index,
  foreignKey
} from 'drizzle-orm/mysql-core';

export const organizations = mysqlTable('organizations', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  settings: json('settings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 30 }),
  organizationId: int('organization_id').notNull(),
  departmentId: int('department_id'),
  subDepartmentId: int('sub_department_id'),
  status: mysqlEnum('status', ['active', 'inactive', 'locked']).default('active'),
  role: varchar('role', { length: 50 }).default('employee'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  firebaseIdx: index('idx_users_firebase_uid').on(table.firebaseUid),
  emailIdx: index('idx_users_email').on(table.email),
  orgIdx: index('idx_users_organization').on(table.organizationId),
  deptIdx: index('idx_users_department').on(table.departmentId),
  subDeptIdx: index('idx_users_sub_department').on(table.subDepartmentId),
  statusIdx: index('idx_users_status').on(table.status)
}));

export const userPreferences = mysqlTable('user_preferences', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().unique(),
  theme: mysqlEnum('theme', ['light', 'dark', 'system']).default('system'),
  density: mysqlEnum('density', ['compact', 'normal', 'spacious']).default('normal'),
  language: varchar('language', { length: 10 }).default('fr'),
  telegramChatId: varchar('telegram_chat_id', { length: 100 }),
  notificationChannels: json('notification_channels'),
  dashboardLayout: json('dashboard_layout'),
  columnConfigs: json('column_configs'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const modules = mysqlTable('modules', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  orgSlugUniq: uniqueIndex('uk_modules_org_slug').on(table.organizationId, table.slug)
}));

export const permissions = mysqlTable('permissions', {
  id: int('id').autoincrement().primaryKey(),
  moduleId: int('module_id').notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  action: mysqlEnum('action', ['create', 'read', 'update', 'delete', 'approve', 'export', 'simulate']).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  modSlugUniq: uniqueIndex('uk_permissions_module_slug').on(table.moduleId, table.slug)
}));

export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const rolePermissions = mysqlTable('role_permissions', {
  id: int('id').autoincrement().primaryKey(),
  roleId: int('role_id').notNull(),
  permissionId: int('permission_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_role_permission').on(table.roleId, table.permissionId)
}));

export const userRoles = mysqlTable('user_roles', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  roleId: int('role_id').notNull(),
  expiresAt: timestamp('expires_at'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_user_role').on(table.userId, table.roleId)
}));

export const userPermissions = mysqlTable('user_permissions', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  permissionId: int('permission_id').notNull(),
  granted: boolean('granted').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  uniq: uniqueIndex('uk_user_permission').on(table.userId, table.permissionId)
}));

export const departments = mysqlTable('departments', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: mysqlEnum('type', ['department', 'team', 'unit', 'group', 'branch']).default('department'),
  directorId: int('director_id'),
  managerId: int('manager_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  managerUniq: uniqueIndex('uk_department_manager').on(table.managerId)
}));

export const departmentMembers = mysqlTable('department_members', {
  id: int('id').autoincrement().primaryKey(),
  departmentId: int('department_id').notNull(),
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_department_member').on(table.departmentId, table.userId)
}));

export const departmentRoles = mysqlTable('department_roles', {
  id: int('id').autoincrement().primaryKey(),
  departmentId: int('department_id').notNull(),
  roleId: int('role_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_department_role').on(table.departmentId, table.roleId)
}));

export const subDepartments = mysqlTable('sub_departments', {
  id: int('id').autoincrement().primaryKey(),
  departmentId: int('department_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  managerId: int('manager_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  managerUniq: uniqueIndex('uk_sub_department_manager').on(table.managerId)
}));

export const subDepartmentMembers = mysqlTable('sub_department_members', {
  id: int('id').autoincrement().primaryKey(),
  subDepartmentId: int('sub_department_id').notNull(),
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_sub_department_member').on(table.subDepartmentId, table.userId)
}));

export const leaveTypes = mysqlTable('leave_types', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  defaultQuota: int('default_quota').default(0),
  validationMode: mysqlEnum('validation_mode', ['manager', 'auto_approved', 'free']).default('manager'),
  requiresDirectorApproval: boolean('requires_director_approval').default(false),
  isCumulative: boolean('is_cumulative').default(false),
  carryOverLimit: int('carry_over_limit').default(0),
  deductibleQuota: boolean('deductible_quota').default(true),
  isPaid: boolean('is_paid').default(true),
  color: varchar('color', { length: 7 }).default('#22C55E'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  orgSlugUniq: uniqueIndex('uk_leave_types_org_slug').on(table.organizationId, table.slug)
}));

export const leaveRequests = mysqlTable('leave_requests', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  leaveTypeId: int('leave_type_id').notNull(),
  subDepartmentId: int('sub_department_id'),
  managerId: int('manager_id'),
  directorId: int('director_id'),
  status: mysqlEnum('status', ['pending', 'pending_director', 'approved', 'rejected', 'cancelled', 'auto_approved']).default('pending'),
  managerStatus: mysqlEnum('manager_status', ['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  directorStatus: mysqlEnum('director_status', ['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  totalDays: int('total_days').notNull(),
  reason: text('reason'),
  managerComment: text('manager_comment'),
  directorComment: text('director_comment'),
  submittedByUserId: int('submitted_by_user_id'),
  isProxyRequest: boolean('is_proxy_request').default(false),
  replacementUserId: int('replacement_user_id'),
  forwardedToDirectorAt: timestamp('forwarded_to_director_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  userIdx: index('idx_leave_requests_user').on(table.userId),
  statusIdx: index('idx_leave_requests_status').on(table.status),
  managerIdx: index('idx_leave_requests_manager').on(table.managerId),
  directorIdx: index('idx_leave_requests_director').on(table.directorId)
}));

export const leaveComments = mysqlTable('leave_comments', {
  id: int('id').autoincrement().primaryKey(),
  leaveRequestId: int('leave_request_id').notNull(),
  userId: int('user_id').notNull(),
  content: text('content').notNull(),
  commentType: mysqlEnum('comment_type', ['rejection', 'approval', 'forward', 'general']).default('general'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  reqIdx: index('idx_leave_comments_request').on(table.leaveRequestId)
}));

export const leaveStatusHistory = mysqlTable('leave_status_history', {
  id: int('id').autoincrement().primaryKey(),
  leaveRequestId: int('leave_request_id').notNull(),
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedByUserId: int('changed_by_user_id').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  reqIdx: index('idx_leave_history_request').on(table.leaveRequestId)
}));

export const leavePeriods = mysqlTable('leave_periods', {
  id: int('id').autoincrement().primaryKey(),
  leaveRequestId: int('leave_request_id').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  daysCount: int('days_count').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const leaveAttachments = mysqlTable('leave_attachments', {
  id: int('id').autoincrement().primaryKey(),
  leaveRequestId: int('leave_request_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileSize: int('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
});

export const leaveQuotas = mysqlTable('leave_quotas', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  leaveTypeId: int('leave_type_id').notNull(),
  year: int('year').notNull(),
  totalQuota: int('total_quota').notNull(),
  usedDays: int('used_days').default(0),
  pendingDays: int('pending_days').default(0),
  carriedOverDays: int('carried_over_days').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  uniq: uniqueIndex('uk_quota_user_type_year').on(table.userId, table.leaveTypeId, table.year)
}));

export const leaveCarryOverLogs = mysqlTable('leave_carry_over_logs', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  leaveTypeId: int('leave_type_id').notNull(),
  yearFrom: int('year_from').notNull(),
  yearTo: int('year_to').notNull(),
  daysCarriedOver: int('days_carried_over').default(0),
  daysLost: int('days_lost').default(0),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow()
});

export const seniorityTiers = mysqlTable('seniority_tiers', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  yearsRequired: int('years_required').notNull(),
  bonusDays: int('bonus_days').notNull(),
  leaveTypeId: int('leave_type_id'),
  createdAt: timestamp('created_at').defaultNow()
});

export const publicHolidays = mysqlTable('public_holidays', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  holidayDate: date('holiday_date').notNull(),
  countryCode: varchar('country_code', { length: 10 }).default('FR'),
  isCustom: boolean('is_custom').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const blackoutPeriods = mysqlTable('blackout_periods', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  departmentId: int('department_id'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  message: text('message').notNull(),
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: varchar('recurrence_rule', { length: 255 }),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const delegations = mysqlTable('delegations', {
  id: int('id').autoincrement().primaryKey(),
  managerId: int('manager_id').notNull(),
  delegateId: int('delegate_id').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  activeIdx: index('idx_delegations_active').on(table.isActive)
}));

export const proxyRequests = mysqlTable('proxy_requests', {
  id: int('id').autoincrement().primaryKey(),
  beneficiaryUserId: int('beneficiary_user_id').notNull(),
  proxyUserId: int('proxy_user_id').notNull(),
  permissionId: int('permission_id').notNull(),
  reason: text('reason'),
  attachmentUrl: varchar('attachment_url', { length: 500 }),
  attachmentName: varchar('attachment_name', { length: 255 }),
  attachmentMimeType: varchar('attachment_mime_type', { length: 100 }),
  beneficiaryConfirmed: mysqlEnum('beneficiary_confirmed', ['pending', 'confirmed', 'rejected']).default('pending'),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending'),
  approvedBy: int('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  beneficiaryFk: foreignKey({
    columns: [table.beneficiaryUserId],
    foreignColumns: [users.id],
    name: 'fk_proxy_requests_beneficiary'
  }).onDelete('cascade'),
  proxyFk: foreignKey({
    columns: [table.proxyUserId],
    foreignColumns: [users.id],
    name: 'fk_proxy_requests_proxy'
  }).onDelete('cascade'),
  permissionFk: foreignKey({
    columns: [table.permissionId],
    foreignColumns: [permissions.id],
    name: 'fk_proxy_requests_permission'
  }).onDelete('cascade'),
  approvedByFk: foreignKey({
    columns: [table.approvedBy],
    foreignColumns: [users.id],
    name: 'fk_proxy_requests_approved_by'
  }).onDelete('set null')
}));

export const invitations = mysqlTable('invitations', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  roleId: int('role_id'),
  invitedBy: int('invited_by').notNull(),
  status: mysqlEnum('status', ['pending', 'accepted', 'expired', 'revoked']).default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const notifications = mysqlTable('notifications', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  data: json('data'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  readIdx: index('idx_notifications_read').on(table.isRead)
}));

export const loginAttempts = mysqlTable('login_attempts', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id'),
  email: varchar('email', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  success: boolean('success').default(false),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_login_attempts_user').on(table.userId),
  ipIdx: index('idx_login_attempts_ip').on(table.ipAddress)
}));

export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').autoincrement().primaryKey(),
  actorId: int('actor_id'),
  targetUserId: int('target_user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: int('entity_id'),
  oldValues: json('old_values'),
  newValues: json('new_values'),
  comment: text('comment'),
  isDelegated: boolean('is_delegated').default(false),
  delegatedById: int('delegated_by_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  actorIdx: index('idx_audit_actor').on(table.actorId),
  targetIdx: index('idx_audit_target').on(table.targetUserId),
  entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
  createdIdx: index('idx_audit_created').on(table.createdAt)
}));

export const announcements = mysqlTable('announcements', {
  id: int('id').autoincrement().primaryKey(),
  organizationId: int('organization_id').notNull(),
  authorId: int('author_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  level: mysqlEnum('level', ['info', 'warning', 'critical']).default('info'),
  isDismissible: boolean('is_dismissible').default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const announcementDismissals = mysqlTable('announcement_dismissals', {
  id: int('id').autoincrement().primaryKey(),
  announcementId: int('announcement_id').notNull(),
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_dismissal').on(table.announcementId, table.userId)
}));

export const conversations = mysqlTable('conversations', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }),
  relatedEntityType: varchar('related_entity_type', { length: 100 }),
  relatedEntityId: int('related_entity_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const conversationParticipants = mysqlTable('conversation_participants', {
  id: int('id').autoincrement().primaryKey(),
  conversationId: int('conversation_id').notNull(),
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  uniq: uniqueIndex('uk_conversation_participant').on(table.conversationId, table.userId)
}));

export const messages = mysqlTable('messages', {
  id: int('id').autoincrement().primaryKey(),
  conversationId: int('conversation_id').notNull(),
  senderId: int('sender_id').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  convIdx: index('idx_messages_conversation').on(table.conversationId)
}));

export const consentLogs = mysqlTable('consent_logs', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  purpose: varchar('purpose', { length: 100 }).notNull(),
  lawfulBasis: mysqlEnum('lawful_basis', ['contract', 'legal_obligation', 'legitimate_interest', 'consent']).notNull(),
  grantedAt: timestamp('granted_at').defaultNow(),
  withdrawnAt: timestamp('withdrawn_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  userIdx: index('idx_consent_user').on(table.userId),
  purposeIdx: index('idx_consent_purpose').on(table.purpose)
}));
