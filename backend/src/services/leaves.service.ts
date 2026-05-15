import { db } from '../config/db';
import {
  leaveRequests, leavePeriods, leaveAttachments, leaveTypes,
  leaveQuotas, publicHolidays, blackoutPeriods, departments,
  departmentMembers, delegations, users, auditLogs,
  subDepartments, leaveComments, leaveStatusHistory
} from '../db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

const insertLeaveStatusHistory = async (data: {
  leaveRequestId: number;
  oldStatus?: string;
  newStatus: string;
  changedByUserId: number;
  comment?: string;
}, tx?: TxClient) => {
  const client = tx || db;
  await client.insert(leaveStatusHistory).values(data);
};

export const getLeaveComments = async (leaveRequestId: number) => {
  return db.select().from(leaveComments).where(eq(leaveComments.leaveRequestId, leaveRequestId));
};

export const getLeaveHistory = async (leaveRequestId: number) => {
  return db.select().from(leaveStatusHistory).where(eq(leaveStatusHistory.leaveRequestId, leaveRequestId));
};

export const listLeaveRequests = async (filters: { organizationId: number; userId?: number; status?: string; type?: number; dateFrom?: string; dateTo?: string }) => {
  const conditions = [
    eq(users.organizationId, filters.organizationId)
  ];
  if (filters.userId) conditions.push(eq(leaveRequests.userId, filters.userId));
  if (filters.status) conditions.push(eq(leaveRequests.status, filters.status as any));
  if (filters.type) conditions.push(eq(leaveRequests.leaveTypeId, filters.type));
  if (filters.dateFrom) conditions.push(gte(leaveRequests.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(leaveRequests.createdAt, new Date(filters.dateTo)));

  const where = and(...conditions);
  const rows = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(where)
    .then((results) => results.map((r) => r.leave_requests));

  const result = [];
  for (const r of rows) {
    const periods = await db.select().from(leavePeriods).where(eq(leavePeriods.leaveRequestId, r.id));
    const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, r.leaveTypeId)).limit(1);
    result.push({ ...r, periods, leaveType: type });
  }
  return result;
};

export const getLeaveRequest = async (id: number, organizationId?: number) => {
  const conditions = [eq(leaveRequests.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const results = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .limit(1);
  const row = results[0]?.leave_requests;
  if (!row) return null;
  const periods = await db.select().from(leavePeriods).where(eq(leavePeriods.leaveRequestId, id));
  const attachments = await db.select().from(leaveAttachments).where(eq(leaveAttachments.leaveRequestId, id));
  const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, row.leaveTypeId)).limit(1);
  const comments = await getLeaveComments(id);
  const history = await getLeaveHistory(id);
  return { ...row, periods, attachments, leaveType: type, comments, history };
};

export const createLeaveRequest = async (input: {
  userId: number;
  leaveTypeId: number;
  periods: { startDate: string; endDate: string }[];
  reason?: string;
  replacementUserId?: number;
  isProxyRequest?: boolean;
  submittedByUserId?: number;
}) => {
  // Calculate total days
  let totalDays = 0;
  const holidays = await db.select().from(publicHolidays);
  const holidaySet = new Set(holidays.map(h => h.holidayDate.toISOString().split('T')[0]));

  for (const p of input.periods) {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    let days = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      const day = d.getDay();
      if (day !== 0 && day !== 6 && !holidaySet.has(ds)) days++;
    }
    totalDays += days;
  }

  // Resolve user for org/dept scoping and approvers
  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new Error('User not found');
  const subDeptId = user?.subDepartmentId || null;
  const deptId = user?.departmentId || null;

  // Check blackout periods scoped to user's organization and department
  const bps = await db.select().from(blackoutPeriods).where(eq(blackoutPeriods.organizationId, user.organizationId));
  for (const p of input.periods) {
    for (const bp of bps) {
      // Skip department-specific blackouts that don't apply to this user's department
      if (bp.departmentId !== null && bp.departmentId !== user.departmentId) continue;
      if (p.startDate <= bp.endDate.toISOString().split('T')[0] && p.endDate >= bp.startDate.toISOString().split('T')[0]) {
        throw new Error(`Blackout period: ${bp.message}`);
      }
    }
  }

  // Check quota
  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(
      eq(leaveQuotas.userId, input.userId),
      eq(leaveQuotas.leaveTypeId, input.leaveTypeId),
      eq(leaveQuotas.year, new Date().getFullYear())
    )).limit(1);

  if (quota && totalDays > (quota.totalQuota + (quota.carriedOverDays || 0) - (quota.usedDays || 0) - (quota.pendingDays || 0))) {
    throw new Error('Insufficient leave balance');
  }

  // Resolve sub_department and approvers
  let managerId: number | null = null;
  let directorId: number | null = null;

  if (subDeptId) {
    const [sub] = await db.select().from(subDepartments).where(eq(subDepartments.id, subDeptId)).limit(1);
    if (sub) {
      managerId = sub.managerId || null;
      const [dept] = await db.select().from(departments).where(eq(departments.id, sub.departmentId)).limit(1);
      if (dept) directorId = dept.directorId || null;
    }
  } else if (deptId) {
    const [dept] = await db.select().from(departments).where(eq(departments.id, deptId)).limit(1);
    if (dept) {
      managerId = dept.managerId || null;
      directorId = dept.directorId || null;
    }
  }

  const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, input.leaveTypeId)).limit(1);
  let initialStatus: any = 'pending';
  let managerStatus: any = 'pending';
  let directorStatus: any = 'pending';

  if (type?.validationMode === 'auto_approved') {
    initialStatus = 'auto_approved';
    managerStatus = 'approved';
    directorStatus = 'approved';
  }

  return db.transaction(async (tx) => {
    const [result] = await tx.insert(leaveRequests).values({
      userId: input.userId,
      leaveTypeId: input.leaveTypeId,
      subDepartmentId: subDeptId,
      managerId,
      directorId,
      status: initialStatus,
      managerStatus,
      directorStatus,
      totalDays,
      reason: input.reason,
      replacementUserId: input.replacementUserId,
      isProxyRequest: input.isProxyRequest || false,
      submittedByUserId: input.submittedByUserId
    });

    const requestId = result.insertId;
    for (const p of input.periods) {
      await tx.insert(leavePeriods).values({
        leaveRequestId: requestId,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        daysCount: totalDays
      });
    }

    if (quota) {
      await tx.update(leaveQuotas)
        .set({ pendingDays: (quota.pendingDays || 0) + totalDays })
        .where(eq(leaveQuotas.id, quota.id));
    }

    if (type?.validationMode === 'auto_approved') {
      await insertLeaveStatusHistory({
        leaveRequestId: requestId,
        newStatus: 'auto_approved',
        changedByUserId: input.userId,
        comment: 'Auto approved'
      }, tx);
      if (quota) {
        await tx.update(leaveQuotas)
          .set({ usedDays: (quota.usedDays || 0) + totalDays, pendingDays: Math.max(0, (quota.pendingDays || 0) - totalDays) })
          .where(eq(leaveQuotas.id, quota.id));
      }
    } else {
      await insertLeaveStatusHistory({
        leaveRequestId: requestId,
        newStatus: 'pending',
        changedByUserId: input.userId,
        comment: 'Submitted'
      }, tx);
    }

    return getLeaveRequest(requestId);
  });
};

export const approveLeave = async (id: number, approverId: number, comment?: string, isDelegated = false, organizationId?: number) => {
  let conditions: any[] = [eq(leaveRequests.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const [req] = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .limit(1)
    .then((results) => results.map((r) => r.leave_requests));
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'pending') throw new Error('Request is not pending manager review');

  // Verify approver is the assigned manager or delegate
  if (req.managerId !== approverId) {
    const [deleg] = await db.select().from(delegations).where(
      and(eq(delegations.managerId, req.managerId!), eq(delegations.delegateId, approverId), eq(delegations.isActive, true))
    ).limit(1);
    if (!deleg) throw new Error('You are not authorized to approve this request');
    isDelegated = true;
  }

  const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, req.leaveTypeId)).limit(1);

  if (type?.requiresDirectorApproval) {
    // Manager approves but forwards to director
    await db.update(leaveRequests).set({
      status: 'pending_director',
      managerStatus: 'approved',
      managerComment: comment || req.managerComment,
      forwardedToDirectorAt: new Date()
    }).where(eq(leaveRequests.id, id));

    await db.insert(leaveComments).values({
      leaveRequestId: id,
      userId: approverId,
      content: comment || 'Forwarded to director',
      commentType: 'forward'
    });

    await insertLeaveStatusHistory({
      leaveRequestId: id,
      oldStatus: req.status,
      newStatus: 'pending_director',
      changedByUserId: approverId,
      comment: comment || 'Manager approved and forwarded to director'
    });

    // Audit log
    await db.insert(auditLogs).values({
      actorId: approverId,
      targetUserId: req.userId,
      action: 'leave.forwarded',
      entityType: 'leave_request',
      entityId: id,
      newValues: { status: 'pending_director', managerStatus: 'approved' },
      comment,
      isDelegated
    });

    return getLeaveRequest(id);
  }

  // Simple approval (no director required)
  await db.update(leaveRequests).set({
    status: 'approved',
    managerStatus: 'approved',
    managerComment: comment || req.managerComment
  }).where(eq(leaveRequests.id, id));

  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(
      eq(leaveQuotas.userId, req.userId),
      eq(leaveQuotas.leaveTypeId, req.leaveTypeId),
      eq(leaveQuotas.year, new Date().getFullYear())
    )).limit(1);

  if (quota) {
    await db.update(leaveQuotas)
      .set({
        usedDays: (quota.usedDays || 0) + req.totalDays,
        pendingDays: Math.max(0, (quota.pendingDays || 0) - req.totalDays)
      })
      .where(eq(leaveQuotas.id, quota.id));
  }

  if (comment) {
    await db.insert(leaveComments).values({
      leaveRequestId: id,
      userId: approverId,
      content: comment,
      commentType: 'approval'
    });
  }

  await insertLeaveStatusHistory({
    leaveRequestId: id,
    oldStatus: req.status,
    newStatus: 'approved',
    changedByUserId: approverId,
    comment: comment || 'Approved by manager'
  });

  await db.insert(auditLogs).values({
    actorId: approverId,
    targetUserId: req.userId,
    action: 'leave.approved',
    entityType: 'leave_request',
    entityId: id,
    newValues: { status: 'approved' },
    comment,
    isDelegated
  });

  return getLeaveRequest(id);
};

export const rejectLeave = async (id: number, approverId: number, comment?: string, isDelegated = false, organizationId?: number) => {
  let conditions: any[] = [eq(leaveRequests.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const [req] = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .limit(1)
    .then((results) => results.map((r) => r.leave_requests));
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'pending' && req.status !== 'pending_director') {
    throw new Error('Request cannot be rejected at this stage');
  }

  const isDirector = req.directorId === approverId;
  const isManager = req.managerId === approverId;

  if (!isDirector && !isManager) {
    const [deleg] = await db.select().from(delegations).where(
      and(eq(delegations.managerId, req.managerId!), eq(delegations.delegateId, approverId), eq(delegations.isActive, true))
    ).limit(1);
    if (!deleg) throw new Error('You are not authorized to reject this request');
    isDelegated = true;
  }

  await db.update(leaveRequests).set({
    status: 'rejected',
    managerStatus: isManager ? 'rejected' : req.managerStatus,
    directorStatus: isDirector ? 'rejected' : req.directorStatus,
    managerComment: isManager ? (comment || req.managerComment) : req.managerComment,
    directorComment: isDirector ? (comment || req.directorComment) : req.directorComment
  }).where(eq(leaveRequests.id, id));

  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(
      eq(leaveQuotas.userId, req.userId),
      eq(leaveQuotas.leaveTypeId, req.leaveTypeId),
      eq(leaveQuotas.year, new Date().getFullYear())
    )).limit(1);

  if (quota) {
    await db.update(leaveQuotas)
      .set({ pendingDays: Math.max(0, (quota.pendingDays || 0) - req.totalDays) })
      .where(eq(leaveQuotas.id, quota.id));
  }

  if (comment) {
    await db.insert(leaveComments).values({
      leaveRequestId: id,
      userId: approverId,
      content: comment,
      commentType: 'rejection'
    });
  }

  await insertLeaveStatusHistory({
    leaveRequestId: id,
    oldStatus: req.status,
    newStatus: 'rejected',
    changedByUserId: approverId,
    comment: comment || 'Rejected'
  });

  await db.insert(auditLogs).values({
    actorId: approverId,
    targetUserId: req.userId,
    action: 'leave.rejected',
    entityType: 'leave_request',
    entityId: id,
    newValues: { status: 'rejected' },
    comment,
    isDelegated
  });

  return getLeaveRequest(id);
};

export const directorApproveLeave = async (id: number, directorId: number, comment?: string, organizationId?: number) => {
  let conditions: any[] = [eq(leaveRequests.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const [req] = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .limit(1)
    .then((results) => results.map((r) => r.leave_requests));
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'pending_director') throw new Error('Request is not pending director review');
  if (req.directorId !== directorId) throw new Error('You are not authorized to approve this request');

  await db.update(leaveRequests).set({
    status: 'approved',
    directorStatus: 'approved',
    directorComment: comment || req.directorComment
  }).where(eq(leaveRequests.id, id));

  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(
      eq(leaveQuotas.userId, req.userId),
      eq(leaveQuotas.leaveTypeId, req.leaveTypeId),
      eq(leaveQuotas.year, new Date().getFullYear())
    )).limit(1);

  if (quota) {
    await db.update(leaveQuotas)
      .set({
        usedDays: (quota.usedDays || 0) + req.totalDays,
        pendingDays: Math.max(0, (quota.pendingDays || 0) - req.totalDays)
      })
      .where(eq(leaveQuotas.id, quota.id));
  }

  if (comment) {
    await db.insert(leaveComments).values({
      leaveRequestId: id,
      userId: directorId,
      content: comment,
      commentType: 'approval'
    });
  }

  await insertLeaveStatusHistory({
    leaveRequestId: id,
    oldStatus: req.status,
    newStatus: 'approved',
    changedByUserId: directorId,
    comment: comment || 'Approved by director'
  });

  await db.insert(auditLogs).values({
    actorId: directorId,
    targetUserId: req.userId,
    action: 'leave.director_approved',
    entityType: 'leave_request',
    entityId: id,
    newValues: { status: 'approved', directorStatus: 'approved' },
    comment
  });

  return getLeaveRequest(id);
};

export const directorRejectLeave = async (id: number, directorId: number, comment?: string, organizationId?: number) => {
  let conditions: any[] = [eq(leaveRequests.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const [req] = await db
    .select()
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(and(...conditions))
    .limit(1)
    .then((results) => results.map((r) => r.leave_requests));
  if (!req) throw new Error('Leave request not found');
  if (req.status !== 'pending_director') throw new Error('Request is not pending director review');
  if (req.directorId !== directorId) throw new Error('You are not authorized to reject this request');

  await db.update(leaveRequests).set({
    status: 'rejected',
    directorStatus: 'rejected',
    directorComment: comment || req.directorComment
  }).where(eq(leaveRequests.id, id));

  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(
      eq(leaveQuotas.userId, req.userId),
      eq(leaveQuotas.leaveTypeId, req.leaveTypeId),
      eq(leaveQuotas.year, new Date().getFullYear())
    )).limit(1);

  if (quota) {
    await db.update(leaveQuotas)
      .set({ pendingDays: Math.max(0, (quota.pendingDays || 0) - req.totalDays) })
      .where(eq(leaveQuotas.id, quota.id));
  }

  if (comment) {
    await db.insert(leaveComments).values({
      leaveRequestId: id,
      userId: directorId,
      content: comment,
      commentType: 'rejection'
    });
  }

  await insertLeaveStatusHistory({
    leaveRequestId: id,
    oldStatus: req.status,
    newStatus: 'rejected',
    changedByUserId: directorId,
    comment: comment || 'Rejected by director'
  });

  await db.insert(auditLogs).values({
    actorId: directorId,
    targetUserId: req.userId,
    action: 'leave.director_rejected',
    entityType: 'leave_request',
    entityId: id,
    newValues: { status: 'rejected', directorStatus: 'rejected' },
    comment
  });

  return getLeaveRequest(id);
};

export const getTeamCalendar = async (opts: { organizationId: number; departmentId?: number; userId?: number; currentUserId?: number; month?: number; year?: number }) => {
  const { organizationId, departmentId, userId, currentUserId, month, year } = opts;
  const y = year || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);

  // Build user filter scoped to organization
  let userIds: number[] = [];
  if (userId) {
    const [targetUser] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, organizationId))).limit(1);
    if (targetUser) userIds = [userId];
  } else if (departmentId) {
    const members = await db
      .select({ userId: departmentMembers.userId })
      .from(departmentMembers)
      .innerJoin(departments, eq(departments.id, departmentMembers.departmentId))
      .where(and(eq(departmentMembers.departmentId, departmentId), eq(departments.organizationId, organizationId)));
    userIds = members.map(m => m.userId);
  } else if (currentUserId) {
    // Employee: show only their department members in same org
    const [currentUser] = await db.select().from(users).where(and(eq(users.id, currentUserId), eq(users.organizationId, organizationId))).limit(1);
    if (currentUser?.departmentId) {
      const members = await db
        .select({ userId: departmentMembers.userId })
        .from(departmentMembers)
        .where(eq(departmentMembers.departmentId, currentUser.departmentId));
      userIds = members.map(m => m.userId);
    }
  }

  const conditions = [
    gte(leavePeriods.endDate, monthStart),
    lte(leavePeriods.startDate, monthEnd)
  ];

  if (userIds.length > 0) {
    conditions.push(inArray(leaveRequests.userId, userIds));
  }

  const rows = await db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      status: leaveRequests.status,
      totalDays: leaveRequests.totalDays,
      reason: leaveRequests.reason,
      startDate: leavePeriods.startDate,
      endDate: leavePeriods.endDate,
      firstName: users.firstName,
      lastName: users.lastName,
      leaveTypeName: leaveTypes.name,
      leaveTypeColor: leaveTypes.color
    })
    .from(leaveRequests)
    .innerJoin(leavePeriods, eq(leavePeriods.leaveRequestId, leaveRequests.id))
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .innerJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
    .where(and(...conditions));

  return rows;
};

export const getLeaveBalance = async (userId: number, organizationId?: number) => {
  if (organizationId !== undefined) {
    const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, organizationId))).limit(1);
    if (!user) throw new Error('User not found');
  }
  const year = new Date().getFullYear();
  const rows = await db
    .select()
    .from(leaveQuotas)
    .where(and(eq(leaveQuotas.userId, userId), eq(leaveQuotas.year, year)));

  const result = [];
  for (const q of rows) {
    const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, q.leaveTypeId)).limit(1);
    result.push({ ...q, leaveType: type });
  }
  return result;
};
