import { Request, Response } from 'express';
import {
  listBlackoutPeriods,
  createBlackoutPeriod,
  updateBlackoutPeriod,
  deleteBlackoutPeriod
} from '../services/blackout.service';
import { logger } from '../utils/logger';

export const getBlackoutPeriods = async (req: Request, res: Response) => {
  try {
    const { departmentId, year } = req.query;
    const rows = await listBlackoutPeriods({
      organizationId: req.user!.organizationId,
      departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      year: year ? parseInt(year as string) : undefined
    });
    res.json(rows);
  } catch (err) {
    logger.error('Get blackout periods error', { error: err });
    res.status(500).json({ error: 'Failed to fetch blackout periods' });
  }
};

export const createBlackout = async (req: Request, res: Response) => {
  try {
    const row = await createBlackoutPeriod({
      ...req.body,
      organizationId: req.user!.organizationId,
      createdBy: req.user!.id
    });
    res.status(201).json(row);
  } catch (err: any) {
    logger.error('Create blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create blackout period' });
  }
};

export const updateBlackout = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const row = await updateBlackoutPeriod(id, req.body);
    res.json(row);
  } catch (err: any) {
    logger.error('Update blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to update blackout period' });
  }
};

export const removeBlackout = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteBlackoutPeriod(id);
    res.json({ message: 'Blackout period deleted' });
  } catch (err: any) {
    logger.error('Delete blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete blackout period' });
  }
};
