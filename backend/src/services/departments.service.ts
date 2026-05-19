import { db } from '../config/db';
import { departments, departmentMembers, departmentRoles, users, roles } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const listDepartments = async (organizationId: number) => {
  const depts = await db.select().from(departments).where(eq(departments.organizationId, organizationId));
  const result = [];
  for (const d of depts) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(departmentMembers)
      .where(eq(departmentMembers.departmentId, d.id));
    const manager = d.managerId
      ? (await db.select().from(users).where(eq(users.id, d.managerId)).limit(1))[0]
      : null;
    result.push({ ...d, memberCount: count, manager });
  }
  return result;
};

export const getDepartmentById = async (id: number, organizationId?: number) => {
  const conditions = [eq(departments.id, id)];
  if (organizationId !== undefined) conditions.push(eq(departments.organizationId, organizationId));
  const [dept] = await db.select().from(departments).where(and(...conditions)).limit(1);
  if (!dept) return null;

  const members = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(departmentMembers)
    .innerJoin(users, eq(departmentMembers.userId, users.id))
    .where(eq(departmentMembers.departmentId, id));

  const deptRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(departmentRoles)
    .innerJoin(roles, eq(departmentRoles.roleId, roles.id))
    .where(eq(departmentRoles.departmentId, id));

  const manager = dept.managerId
    ? (await db.select().from(users).where(eq(users.id, dept.managerId)).limit(1))[0]
    : null;

  const director = dept.directorId
    ? (await db.select().from(users).where(eq(users.id, dept.directorId)).limit(1))[0]
    : null;

  return { ...dept, members, roles: deptRoles, manager, director };
};

export const createDepartment = async (input: { name: string; description?: string; type?: string; organizationId: number; managerId?: number; directorId?: number }) => {
  const [result] = await db.insert(departments).values({
    name: input.name,
    description: input.description,
    type: input.type as any,
    organizationId: input.organizationId,
    managerId: input.managerId,
    directorId: input.directorId
  });
  const deptId = result.insertId;
  if (input.managerId) {
    try { await db.insert(departmentMembers).values({ departmentId: deptId, userId: input.managerId } as any); } catch {}
    await db.update(users).set({ departmentId: deptId }).where(eq(users.id, input.managerId));
  }
  if (input.directorId) {
    try { await db.insert(departmentMembers).values({ departmentId: deptId, userId: input.directorId } as any); } catch {}
    await db.update(users).set({ departmentId: deptId }).where(eq(users.id, input.directorId));
  }
  return getDepartmentById(deptId);
};

export const updateDepartment = async (id: number, input: { name?: string; description?: string; type?: string; managerId?: number | null; directorId?: number | null }, organizationId?: number) => {
  const where = organizationId !== undefined
    ? and(eq(departments.id, id), eq(departments.organizationId, organizationId))
    : eq(departments.id, id);
  if (input.managerId !== undefined) {
    // Ensure manager is not already manager of another department
    if (input.managerId) {
      const [existing] = await db.select().from(departments).where(eq(departments.managerId, input.managerId)).limit(1);
      if (existing && existing.id !== id) {
        throw new Error('Manager already assigned to another department');
      }
      await db.update(users).set({ departmentId: id }).where(eq(users.id, input.managerId));
      try { await db.insert(departmentMembers).values({ departmentId: id, userId: input.managerId } as any); } catch {}
    }
  }
  if (input.directorId !== undefined) {
    if (input.directorId) {
      await db.update(users).set({ departmentId: id }).where(eq(users.id, input.directorId));
      try { await db.insert(departmentMembers).values({ departmentId: id, userId: input.directorId } as any); } catch {}
    }
  }
  await db.update(departments).set(input as any).where(where);
  return getDepartmentById(id, organizationId);
};

export const deleteDepartment = async (id: number, organizationId?: number) => {
  const deptWhere = organizationId !== undefined
    ? and(eq(departments.id, id), eq(departments.organizationId, organizationId))
    : eq(departments.id, id);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(departmentMembers)
    .where(eq(departmentMembers.departmentId, id));

  if (count > 0) throw new Error('Cannot delete department with active members');

  await db.delete(departmentRoles).where(eq(departmentRoles.departmentId, id));
  await db.delete(departments).where(deptWhere);
};

export const addDepartmentMembers = async (departmentId: number, userIds: number[]) => {
  await db.insert(departmentMembers).values(
    userIds.map(uid => ({ departmentId, userId: uid }))
  );
  for (const uid of userIds) {
    await db.update(users).set({ departmentId }).where(eq(users.id, uid));
    await invalidateUserPermissions(uid);
  }
};

export const removeDepartmentMember = async (departmentId: number, userId: number) => {
  await db.delete(departmentMembers)
    .where(and(eq(departmentMembers.departmentId, departmentId), eq(departmentMembers.userId, userId)));
  await db.update(users).set({ departmentId: null }).where(eq(users.id, userId));
  await invalidateUserPermissions(userId);
};

export const updateDepartmentRoles = async (departmentId: number, roleIds: number[]) => {
  await db.delete(departmentRoles).where(eq(departmentRoles.departmentId, departmentId));
  if (roleIds.length) {
    await db.insert(departmentRoles).values(roleIds.map(rid => ({ departmentId, roleId: rid })));
  }
  // Invalidate all department members
  const members = await db.select({ userId: departmentMembers.userId }).from(departmentMembers).where(eq(departmentMembers.departmentId, departmentId));
  for (const m of members) {
    await invalidateUserPermissions(m.userId);
  }
};
