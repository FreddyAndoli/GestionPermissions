import { Request, Response } from 'express';
import { listRoles, getRoleById, createRole, updateRole, deleteRole, listPermissions } from '../services/roles.service';
import { createRoleSchema, updateRoleSchema } from '../schemas/role.schema';
import { logger } from '../utils/logger';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await listRoles(req.user!.organizationId);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const getRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const role = await getRoleById(id);
    if (!role) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role' });
  }
};

export const createNewRole = async (req: Request, res: Response) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await createRole({ ...data, organizationId: req.user!.organizationId });
    res.status(201).json(role);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create role error', { error: err });
    res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRoleById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateRoleSchema.parse(req.body);
    const role = await updateRole(id, data);
    res.json(role);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const removeRole = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteRole(id);
    res.json({ message: 'Role deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete role' });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const perms = await listPermissions(req.user!.organizationId);
    res.json(perms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};
