import { Request, Response } from 'express';
import {
  getUserPermissions as getUserPermissionsSvc,
  setUserPermission as setUserPermissionSvc,
  deleteUserPermission as deleteUserPermissionSvc
} from '../services/userPermissions.service';

export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    const rows = await getUserPermissionsSvc(userId);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get user permissions' });
  }
};

export const setUserPermission = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }
    const { permissionId, granted, comment } = req.body;
    if (permissionId === undefined || granted === undefined) {
      res.status(400).json({ error: 'permissionId and granted are required' });
      return;
    }
    const rows = await setUserPermissionSvc({ userId, permissionId, granted, comment });
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to set user permission' });
  }
};

export const deleteUserPermission = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const row = await deleteUserPermissionSvc(id);
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete user permission' });
  }
};
