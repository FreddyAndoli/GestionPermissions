import { Request, Response } from 'express';
import {
  listPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday
} from '../services/publicHolidays.service';
import { createPublicHolidaySchema, updatePublicHolidaySchema } from '../schemas/publicHoliday.schema';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getPublicHolidays = async (req: Request, res: Response) => {
  try {
    const { year, countryCode } = req.query;
    const rows = await listPublicHolidays({
      organizationId: req.user!.organizationId,
      year: year ? parseInt(year as string) : undefined,
      countryCode: countryCode as string
    });
    res.json(rows);
  } catch (err) {
    logger.error('Get public holidays error', { error: err });
    res.status(500).json({ error: 'Failed to fetch public holidays' });
  }
};

export const createHoliday = async (req: Request, res: Response) => {
  try {
    const data = createPublicHolidaySchema.parse(req.body);
    const row = await createPublicHoliday({
      ...data,
      organizationId: req.user!.organizationId
    });
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create public holiday' });
  }
};

export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = updatePublicHolidaySchema.parse(req.body);
    const row = await updatePublicHoliday(id, data);
    res.json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Update public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to update public holiday' });
  }
};

export const removeHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deletePublicHoliday(id);
    res.json({ message: 'Public holiday deleted' });
  } catch (err: any) {
    logger.error('Delete public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete public holiday' });
  }
};
