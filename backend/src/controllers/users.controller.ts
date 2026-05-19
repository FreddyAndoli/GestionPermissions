import { Request, Response } from 'express';
import { listUsers, getUserById, createUser, updateUser, deleteUser, bulkCreateUsers, updateUserRoles, resetUserPassword, checkIsSuperAdmin, hardDeleteUser } from '../services/users.service';
import { createUserSchema, updateUserSchema, resetPasswordSchema, bulkCreateUsersSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';
import { generateCSV, downloadCSV } from '../services/csv.service';
import { parseId } from '../utils/asyncHandler';
import { eraseUserData } from '../services/erasure.service';
import { hasPermission } from '../services/permissionsResolver.service';
import { logAction } from '../services/audit.service';
import { exportUserData } from '../services/dataExport.service';

export const exportUsersCSV = async (req: Request, res: Response) => {
  try {
    const { search, role, status, departmentId } = req.query;
    const isSuperAdmin = await checkIsSuperAdmin(req.user!.id);
    const result = await listUsers({
      organizationId: req.user!.organizationId,
      page: 1,
      limit: 10000,
      search: search as string,
      role: role as string,
      status: status as string,
      departmentId: isSuperAdmin
        ? (departmentId ? parseInt(departmentId as string) : undefined)
        : (req.user!.departmentId || undefined),
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

export const getColleagues = async (req: Request, res: Response) => {
  try {
    const { search, limit } = req.query;
    const result = await listUsers({
      organizationId: req.user!.organizationId,
      page: 1,
      limit: limit ? parseInt(limit as string) : 100,
      search: search as string,
      status: 'active'
    });
    res.json(result);
  } catch (err) {
    logger.error('Get colleagues error', { error: err });
    res.status(500).json({ error: 'Failed to fetch colleagues' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, role, status, departmentId } = req.query;
    const isSuperAdmin = await checkIsSuperAdmin(req.user!.id);
    const result = await listUsers({
      organizationId: req.user!.organizationId,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      role: role as string,
      status: status as string,
      departmentId: isSuperAdmin
        ? (departmentId ? parseInt(departmentId as string) : undefined)
        : (req.user!.departmentId || undefined),
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
    const id = parseId(req.params.id);
    const user = await getUserById(id, req.user!.organizationId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isViewerSuperAdmin = await checkIsSuperAdmin(req.user!.id);

    // Non-super-admins can only view users in their own department
    if (!isViewerSuperAdmin && req.user!.departmentId && user.departmentId !== req.user!.departmentId) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isTargetSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Admin');
    if (isTargetSuperAdmin && !isViewerSuperAdmin) {
      res.status(404).json({ error: 'User not found' });
      return;
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
      logger.warn('Create user validation failed', { errors: err.errors, body: req.body });
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'Cet email est deja utilise. Essayez la reinitialisation de mot de passe ou utilisez un autre email.' });
      return;
    }
    if (err.code === 'auth/invalid-email') {
      res.status(400).json({ error: 'Adresse email invalide.' });
      return;
    }
    logger.error('Create user error', { error: err });
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const sendUserCredentials = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const user = await getUserById(id, req.user!.organizationId);
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
    const id = parseId(req.params.id);
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(id, data, req.user!.organizationId);
    res.json(user);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err.message === 'Cannot change status of a Super Admin') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deleteUser(id, req.user!.organizationId);
    res.json({ message: 'User deactivated' });
  } catch (err: any) {
    if (err.message === 'Cannot deactivate a Super Admin') {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

export const hardDeleteUserController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const isSelf = req.user!.id === id;
    const isRequesterSuperAdmin = await checkIsSuperAdmin(req.user!.id);

    // Hard delete is Super Admin only, and cannot delete self
    if (!isRequesterSuperAdmin) {
      res.status(403).json({ error: 'Only Super Admin can permanently delete users' });
      return;
    }
    if (isSelf) {
      res.status(403).json({ error: 'Cannot delete your own account' });
      return;
    }

    await hardDeleteUser(id, req.user!.organizationId);

    try {
      await logAction({
        actorId: req.user!.id,
        targetUserId: null,
        action: 'user.hard_deleted',
        entityType: 'user',
        entityId: id,
        comment: 'Permanent deletion by Super Admin'
      });
    } catch (auditErr) {
      logger.error('Failed to log hard delete action', { error: auditErr });
    }

    res.json({ message: 'User deleted permanently' });
  } catch (err: any) {
    if (err.message === 'User not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'Cannot delete a Super Admin') {
      res.status(403).json({ error: err.message });
      return;
    }
    logger.error('Hard delete user error', { error: err });
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const eraseUser = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const isSelf = req.user!.id === id;
    const canDeleteOthers = await hasPermission(req.user!.id, 'users.delete');

    if (!isSelf && !canDeleteOthers) {
      res.status(403).json({ error: 'Forbidden: you can only erase your own account' });
      return;
    }

    const isTargetSuperAdmin = await checkIsSuperAdmin(id);
    if (isTargetSuperAdmin) {
      res.status(403).json({ error: 'Cannot erase a Super Admin' });
      return;
    }

    await eraseUserData(id, req.user!.organizationId, req.user!.id);

    try {
      await logAction({
        actorId: req.user!.id,
        targetUserId: id,
        action: 'user.erased',
        entityType: 'user',
        entityId: id,
        comment: 'GDPR data erasure (Art. 17)'
      });
    } catch (auditErr) {
      logger.error('Failed to log erasure action', { error: auditErr });
    }

    res.json({ message: 'User data erased successfully' });
  } catch (err: any) {
    if (err.message === 'User not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error('Erase user error', { error: err });
    res.status(500).json({ error: 'Failed to erase user data' });
  }
};

export const exportUserDataController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const isSelf = req.user!.id === id;
    const canReadOthers = await hasPermission(req.user!.id, 'users.read');

    if (!isSelf && !canReadOthers) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Super Admin exporting their own data only gets audit logs
    const isRequesterSuperAdmin = await checkIsSuperAdmin(req.user!.id);
    const isAdminExportingSelf = isSelf && isRequesterSuperAdmin;

    const data = await exportUserData(id, isAdminExportingSelf);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${id}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (err) {
    logger.error('Export user data error', { error: err });
    res.status(500).json({ error: 'Failed to export user data' });
  }
};

export const getUserConsentsController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const isSelf = req.user!.id === id;
    const canReadOthers = await hasPermission(req.user!.id, 'users.read');

    if (!isSelf && !canReadOthers) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { getUserConsents } = await import('../services/consent.service');
    const consents = await getUserConsents(id);
    res.json(consents);
  } catch (err) {
    logger.error('Get consents error', { error: err });
    res.status(500).json({ error: 'Failed to get consents' });
  }
};

export const withdrawConsentController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { purpose } = req.body;

    if (req.user!.id !== id) {
      res.status(403).json({ error: 'You can only manage your own consent' });
      return;
    }

    if (!purpose) {
      res.status(400).json({ error: 'Purpose is required' });
      return;
    }

    if (['account_management', 'leave_processing'].includes(purpose)) {
      res.status(403).json({ error: 'Cannot withdraw consent required for service provision' });
      return;
    }

    const { withdrawConsent } = await import('../services/consent.service');
    await withdrawConsent(id, purpose);
    res.json({ message: 'Consent withdrawn successfully' });
  } catch (err) {
    logger.error('Withdraw consent error', { error: err });
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
};

export const bulkCreateUsersController = async (req: Request, res: Response) => {
  try {
    const { users: userList } = bulkCreateUsersSchema.parse(req.body);
    const result = await bulkCreateUsers(userList, req.user!.organizationId);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Bulk create users error', { error: err });
    res.status(500).json({ error: 'Failed to bulk create users', message: err.message });
  }
};

export const updateUserRolesController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      res.status(400).json({ error: 'roleIds array is required' });
      return;
    }
    const user = await updateUserRoles(id, roleIds);
    res.json(user);
  } catch (err: any) {
    if (err.message === 'Cannot remove Super Admin role from a Super Admin') {
      res.status(403).json({ error: err.message });
      return;
    }
    logger.error('Update user roles error', { error: err });
    res.status(500).json({ error: 'Failed to update roles', message: err.message });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
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
