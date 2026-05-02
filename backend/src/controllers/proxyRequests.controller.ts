import { Request, Response } from 'express';
import {
  createProxyRequest,
  listProxyRequests,
  confirmProxyRequest,
  approveProxyRequest,
  deleteProxyRequest
} from '../services/proxyRequests.service';
import { logger } from '../utils/logger';

export const getProxyRequests = async (req: Request, res: Response) => {
  try {
    const rows = await listProxyRequests(req.user!.id);
    res.json(rows);
  } catch (err) {
    logger.error('Get proxy requests error', { error: err });
    res.status(500).json({ error: 'Failed to fetch proxy requests' });
  }
};

export const postProxyRequest = async (req: Request, res: Response) => {
  try {
    const { beneficiaryUserId, permissionId, reason } = req.body;
    const row = await createProxyRequest({
      proxyUserId: req.user!.id,
      beneficiaryUserId,
      permissionId,
      reason
    });
    res.status(201).json(row);
  } catch (err: any) {
    logger.error('Create proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create proxy request' });
  }
};

export const confirmProxy = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // 'confirmed' | 'rejected'
    const row = await confirmProxyRequest(id, req.user!.id, status);
    res.json(row);
  } catch (err: any) {
    logger.error('Confirm proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to confirm proxy request' });
  }
};

export const approveProxy = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const row = await approveProxyRequest(id, req.user!.id);
    res.json(row);
  } catch (err: any) {
    logger.error('Approve proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to approve proxy request' });
  }
};

export const removeProxyRequest = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteProxyRequest(id, req.user!.id);
    res.json({ message: 'Proxy request deleted' });
  } catch (err: any) {
    logger.error('Delete proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete proxy request' });
  }
};
