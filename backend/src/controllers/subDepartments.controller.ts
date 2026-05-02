import { Request, Response } from 'express';
import {
  listSubDepartments, getSubDepartmentById, createSubDepartment,
  updateSubDepartment, deleteSubDepartment, addSubDepartmentMembers,
  removeSubDepartmentMember
} from '../services/subDepartments.service';
import { logger } from '../utils/logger';

export const getSubDepartments = async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.departmentId);
    const subs = await listSubDepartments(departmentId);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sub departments' });
  }
};

export const getSubDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sub = await getSubDepartmentById(id);
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
    const { name, description, departmentId, managerId } = req.body;
    const sub = await createSubDepartment({ name, description, departmentId, managerId });
    res.status(201).json(sub);
  } catch (err) {
    logger.error('Create sub department error', { error: err });
    res.status(500).json({ error: 'Failed to create sub department' });
  }
};

export const updateSubDepartmentById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, managerId } = req.body;
    const sub = await updateSubDepartment(id, { name, description, managerId });
    res.json(sub);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update sub department' });
  }
};

export const removeSubDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteSubDepartment(id);
    res.json({ message: 'Sub department deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete sub department' });
  }
};

export const addSubDeptMembers = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userIds } = req.body;
    await addSubDepartmentMembers(id, userIds);
    res.json({ message: 'Members added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add members' });
  }
};

export const removeSubDeptMember = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await removeSubDepartmentMember(id, userId);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
