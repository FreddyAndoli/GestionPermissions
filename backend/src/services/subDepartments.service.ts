import { db } from '../config/db';
import { subDepartments, subDepartmentMembers, users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const listSubDepartments = async (departmentId: number) => {
  const subs = await db.select().from(subDepartments).where(eq(subDepartments.departmentId, departmentId));
  const result = [];
  for (const s of subs) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subDepartmentMembers)
      .where(eq(subDepartmentMembers.subDepartmentId, s.id));
    const manager = s.managerId
      ? (await db.select().from(users).where(eq(users.id, s.managerId)).limit(1))[0]
      : null;
    result.push({ ...s, memberCount: count, manager });
  }
  return result;
};

export const getSubDepartmentById = async (id: number) => {
  const [sub] = await db.select().from(subDepartments).where(eq(subDepartments.id, id)).limit(1);
  if (!sub) return null;

  const members = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(subDepartmentMembers)
    .innerJoin(users, eq(subDepartmentMembers.userId, users.id))
    .where(eq(subDepartmentMembers.subDepartmentId, id));

  const manager = sub.managerId
    ? (await db.select().from(users).where(eq(users.id, sub.managerId)).limit(1))[0]
    : null;

  return { ...sub, members, manager };
};

export const createSubDepartment = async (input: { name: string; description?: string; departmentId: number; managerId?: number }) => {
  const [result] = await db.insert(subDepartments).values({
    name: input.name,
    description: input.description,
    departmentId: input.departmentId,
    managerId: input.managerId
  });
  return getSubDepartmentById(result.insertId);
};

export const updateSubDepartment = async (id: number, input: { name?: string; description?: string; departmentId?: number; managerId?: number | null }) => {
  if (input.managerId !== undefined) {
    if (input.managerId) {
      const [existing] = await db.select().from(subDepartments).where(eq(subDepartments.managerId, input.managerId)).limit(1);
      if (existing && existing.id !== id) {
        throw new Error('Manager already assigned to another sub department');
      }
      await db.update(users).set({ subDepartmentId: id }).where(eq(users.id, input.managerId));
    }
  }
  await db.update(subDepartments).set(input).where(eq(subDepartments.id, id));
  return getSubDepartmentById(id);
};

export const deleteSubDepartment = async (id: number) => {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subDepartmentMembers)
    .where(eq(subDepartmentMembers.subDepartmentId, id));

  if (count > 0) throw new Error('Cannot delete sub department with active members');

  await db.delete(subDepartments).where(eq(subDepartments.id, id));
};

export const addSubDepartmentMembers = async (subDepartmentId: number, userIds: number[]) => {
  await db.insert(subDepartmentMembers).values(
    userIds.map(uid => ({ subDepartmentId, userId: uid }))
  );
  for (const uid of userIds) {
    await db.update(users).set({ subDepartmentId }).where(eq(users.id, uid));
    await invalidateUserPermissions(uid);
  }
};

export const removeSubDepartmentMember = async (subDepartmentId: number, userId: number) => {
  await db.delete(subDepartmentMembers)
    .where(and(eq(subDepartmentMembers.subDepartmentId, subDepartmentId), eq(subDepartmentMembers.userId, userId)));
  await db.update(users).set({ subDepartmentId: null }).where(eq(users.id, userId));
  await invalidateUserPermissions(userId);
};
