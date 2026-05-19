import { Request, Response } from 'express';
import {
  listDepartments, getDepartmentById, createDepartment, updateDepartment,
  deleteDepartment, addDepartmentMembers, removeDepartmentMember, updateDepartmentRoles
} from '../services/departments.service';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const depts = await listDepartments(req.user!.organizationId);
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const getDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const dept = await getDepartmentById(id, req.user!.organizationId);
    if (!dept) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch department' });
  }
};

export const createNewDepartment = async (req: Request, res: Response) => {
  try {
    const { name, description, type, managerId, directorId } = req.body;
    const dept = await createDepartment({
      name, description, type, organizationId: req.user!.organizationId, managerId, directorId
    });
    res.status(201).json(dept);
  } catch (err) {
    logger.error('Create department error', { error: err });
    res.status(500).json({ error: 'Failed to create department' });
  }
};

export const updateDepartmentById = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { name, description, type, managerId, directorId } = req.body;
    const dept = await updateDepartment(id, { name, description, type, managerId, directorId }, req.user!.organizationId);
    res.json(dept);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update department' });
  }
};

export const removeDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deleteDepartment(id, req.user!.organizationId);
    res.json({ message: 'Department deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete department' });
  }
};

export const addMembers = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { userIds } = req.body;
    await addDepartmentMembers(id, userIds);
    res.json({ message: 'Members added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add members' });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const userId = parseId(req.params.userId, 'userId');
    await removeDepartmentMember(id, userId);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

export const setDepartmentRoles = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { roleIds } = req.body;
    await updateDepartmentRoles(id, roleIds);
    res.json({ message: 'Department roles updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department roles' });
  }
};
