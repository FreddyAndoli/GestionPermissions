import { Request, Response } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser, bulkCreateUsers, updateUserRoles, resetUserPassword, checkIsSuperAdmin } from '../services/users.service';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';
import { generateCSV, downloadCSV } from '../services/csv.service';

export const exportUsersCSV = async (req: Request, res: Response) => {
  try {
    const { search, role, status, departmentId } = req.query;
    const isSuperAdmin = await checkIsSuperAdmin(req.user!.id);
    const result = await listUsers({
      page: 1,
      limit: 10000,
      search: search as string,
      role: role as string,
      status: status as string,
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      excludeSuperAdmin: !isSuperAdmin
    });
    const csv = generateCSV(result.data, [
      { key: 'id', label: 'ID' },
      { key: 'firstName', label: 'Prenom' },
      { key: 'lastName', label: 'Nom' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Statut' },
      { key: 'role', label: 'Role' },
      { key: 'createdAt', label: 'Date creation' }
    ]);
    downloadCSV(res, `users-export-${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (err) {
    logger.error('Export users error', { error: err });
    res.status(500).json({ error: 'Failed to export users' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, role, status, departmentId } = req.query;
    const isSuperAdmin = await checkIsSuperAdmin(req.user!.id);
    const result = await listUsers({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      role: role as string,
      status: status as string,
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      excludeSuperAdmin: !isSuperAdmin
    });
    res.json(result);
  } catch (err) {
    logger.error('Get users error', { error: err });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isTargetSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Admin');
    if (isTargetSuperAdmin) {
      const isViewerSuperAdmin = await checkIsSuperAdmin(req.user!.id);
      if (!isViewerSuperAdmin) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createNewUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await createUser({
      ...data,
      organizationId: req.user!.organizationId
    });
    res.status(201).json(user);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create user error', { error: err });
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const sendUserCredentials = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    // In a real app, send email with credentials. Here we just confirm user exists.
    res.json({ message: 'User can login with email and the password set by admin', email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send credentials' });
  }
};

export const updateUserById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(id, data);
    res.json(user);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteUser(id);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

export const bulkCreateUsersController = async (req: Request, res: Response) => {
  try {
    const { users: userList } = req.body;
    if (!Array.isArray(userList) || userList.length === 0) {
      res.status(400).json({ error: 'users array is required' });
      return;
    }
    const result = await bulkCreateUsers(userList, req.user!.organizationId);
    res.status(201).json(result);
  } catch (err: any) {
    logger.error('Bulk create users error', { error: err });
    res.status(500).json({ error: 'Failed to bulk create users', message: err.message });
  }
};

export const updateUserRolesController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      res.status(400).json({ error: 'roleIds array is required' });
      return;
    }
    const user = await updateUserRoles(id, roleIds);
    res.json(user);
  } catch (err: any) {
    logger.error('Update user roles error', { error: err });
    res.status(500).json({ error: 'Failed to update roles', message: err.message });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = resetPasswordSchema.parse(req.body);
    const result = await resetUserPassword(id, data.password);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Reset password error', { error: err });
    res.status(500).json({ error: 'Failed to reset password', message: err.message });
  }
};
