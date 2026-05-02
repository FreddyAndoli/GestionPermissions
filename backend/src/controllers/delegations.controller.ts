import { Request, Response } from 'express';
import { listDelegations, createDelegation, updateDelegation, revokeDelegation } from '../services/delegations.service';
import { logger } from '../utils/logger';

export const getDelegations = async (req: Request, res: Response) => {
  try {
    const { managerId, active } = req.query;
    const rows = await listDelegations({
      managerId: managerId ? parseInt(managerId as string) : undefined,
      active: active !== undefined ? active === 'true' : undefined
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delegations' });
  }
};

export const createNewDelegation = async (req: Request, res: Response) => {
  try {
    const { managerId, delegateId, startDate, endDate } = req.body;
    const row = await createDelegation({ managerId, delegateId, startDate, endDate });
    res.status(201).json(row);
  } catch (err: any) {
    logger.error('Create delegation error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create delegation' });
  }
};

export const updateDelegationById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const row = await updateDelegation(id, req.body);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update delegation' });
  }
};

export const revoke = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await revokeDelegation(id);
    res.json({ message: 'Delegation revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke delegation' });
  }
};
