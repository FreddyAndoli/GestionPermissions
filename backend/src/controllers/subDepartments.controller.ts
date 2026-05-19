import { Request, Response } from 'express';
import {
  listSubDepartments, getSubDepartmentById, createSubDepartment,
  updateSubDepartment, deleteSubDepartment, addSubDepartmentMembers,
  removeSubDepartmentMember
} from '../services/subDepartments.service';
import { createSubDepartmentSchema, updateSubDepartmentSchema, addMembersSchema } from '../schemas/subDepartment.schema';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getSubDepartments = async (req: Request, res: Response) => {
  try {
    const departmentId = parseId(req.params.departmentId, 'departmentId');
    const subs = await listSubDepartments(departmentId);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sub departments' });
  }
};

export const getSubDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const sub = await getSubDepartmentById(id, req.user!.organizationId);
    if (!sub) {
      res.status(404).json({ error: 'Sub department not found' });
      return;
    }
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sub department' });
  }
};

export const createNewSubDepartment = async (req: Request, res: Response) => {
  try {
    const data = createSubDepartmentSchema.parse(req.body);
    const sub = await createSubDepartment(data);
    res.status(201).json(sub);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create sub department error', { error: err });
    res.status(500).json({ error: 'Failed to create sub department' });
  }
};

export const updateSubDepartmentById = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = updateSubDepartmentSchema.parse(req.body);
    const sub = await updateSubDepartment(id, data, req.user!.organizationId);
    res.json(sub);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(400).json({ error: err.message || 'Failed to update sub department' });
  }
};

export const removeSubDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deleteSubDepartment(id, req.user!.organizationId);
    res.json({ message: 'Sub department deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete sub department' });
  }
};

export const addSubDeptMembers = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { userIds } = addMembersSchema.parse(req.body);
    await addSubDepartmentMembers(id, userIds);
    res.json({ message: 'Members added' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to add members' });
  }
};

export const removeSubDeptMember = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const userId = parseId(req.params.userId, 'userId');
    await removeSubDepartmentMember(id, userId);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
