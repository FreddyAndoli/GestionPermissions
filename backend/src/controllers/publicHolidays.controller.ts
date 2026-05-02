import { Request, Response } from 'express';
import {
  listPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday
} from '../services/publicHolidays.service';
import { logger } from '../utils/logger';

export const getPublicHolidays = async (req: Request, res: Response) => {
  try {
    const { year, countryCode } = req.query;
    const rows = await listPublicHolidays({
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
    const row = await createPublicHoliday({
      ...req.body,
      organizationId: req.user!.organizationId
    });
    res.status(201).json(row);
  } catch (err: any) {
    logger.error('Create public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create public holiday' });
  }
};

export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const row = await updatePublicHoliday(id, req.body);
    res.json(row);
  } catch (err: any) {
    logger.error('Update public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to update public holiday' });
  }
};

export const removeHoliday = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deletePublicHoliday(id);
    res.json({ message: 'Public holiday deleted' });
  } catch (err: any) {
    logger.error('Delete public holiday error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete public holiday' });
  }
};
