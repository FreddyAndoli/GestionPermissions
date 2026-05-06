import { Request, Response } from 'express';
import { listDelegations, createDelegation, updateDelegation, revokeDelegation } from '../services/delegations.service';
import { createDelegationSchema, updateDelegationSchema } from '../schemas/delegation.schema';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getDelegations = async (req: Request, res: Response) => {
  try {
    const { managerId, active } = req.query;
    const rows = await listDelegations({
      organizationId: req.user!.organizationId,
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
    const data = createDelegationSchema.parse(req.body);
    const row = await createDelegation(data);
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create delegation error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create delegation' });
  }
};

export const updateDelegationById = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const data = updateDelegationSchema.parse(req.body);
    const row = await updateDelegation(id, data);
    res.json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update delegation' });
  }
};

export const revoke = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await revokeDelegation(id);
    res.json({ message: 'Delegation revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke delegation' });
  }
};
