import { Request, Response } from 'express';
import {
  listBlackoutPeriods,
  createBlackoutPeriod,
  updateBlackoutPeriod,
  deleteBlackoutPeriod
} from '../services/blackout.service';
import { createBlackoutSchema, updateBlackoutSchema } from '../schemas/blackout.schema';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

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
    const data = createBlackoutSchema.parse(req.body);
    const row = await createBlackoutPeriod({
      ...data,
      organizationId: req.user!.organizationId,
      createdBy: req.user!.id
    });
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create blackout period' });
  }
};

export const updateBlackout = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = updateBlackoutSchema.parse(req.body);
    const row = await updateBlackoutPeriod(id, data);
    res.json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Update blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to update blackout period' });
  }
};

export const removeBlackout = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deleteBlackoutPeriod(id);
    res.json({ message: 'Blackout period deleted' });
  } catch (err: any) {
    logger.error('Delete blackout period error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete blackout period' });
  }
};
