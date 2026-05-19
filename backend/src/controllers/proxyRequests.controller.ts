import { Request, Response } from 'express';
import {
  createProxyRequest,
  listProxyRequests,
  confirmProxyRequest,
  approveProxyRequest,
  deleteProxyRequest
} from '../services/proxyRequests.service';
import { createProxyRequestSchema, confirmProxyRequestSchema } from '../schemas/proxyRequest.schema';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getProxyRequests = async (req: Request, res: Response) => {
  try {
    const rows = await listProxyRequests(req.user!.id, req.user!.organizationId);
    res.json(rows);
  } catch (err) {
    logger.error('Get proxy requests error', { error: err });
    res.status(500).json({ error: 'Failed to fetch proxy requests' });
  }
};

export const postProxyRequest = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // Handle multipart form-data (file upload) where fields may be strings
    const payload = {
      beneficiaryUserId: parseInt(body.beneficiaryUserId, 10),
      permissionId: parseInt(body.permissionId, 10),
      reason: body.reason || undefined,
      attachmentUrl: body.attachmentUrl || undefined,
      attachmentName: body.attachmentName || undefined,
      attachmentMimeType: body.attachmentMimeType || undefined
    };
    const data = createProxyRequestSchema.parse(payload);

    // If a file was uploaded, override with its path
    if (req.file) {
      data.attachmentUrl = `/proxy-attachments/${req.file.filename}`;
      data.attachmentName = req.file.originalname;
      data.attachmentMimeType = req.file.mimetype;
    }

    const row = await createProxyRequest({
      proxyUserId: req.user!.id,
      organizationId: req.user!.organizationId,
      beneficiaryUserId: data.beneficiaryUserId,
      permissionId: data.permissionId,
      reason: data.reason,
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      attachmentMimeType: data.attachmentMimeType
    });
    res.status(201).json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Create proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to create proxy request' });
  }
};

export const confirmProxy = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { status } = confirmProxyRequestSchema.parse(req.body);
    const row = await confirmProxyRequest(id, req.user!.id, status);
    res.json(row);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    if (err.message === 'Proxy request not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error('Confirm proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to confirm proxy request' });
  }
};

export const approveProxy = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const row = await approveProxyRequest(id, req.user!.id);
    res.json(row);
  } catch (err: any) {
    if (err.message === 'Proxy request not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error('Approve proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to approve proxy request' });
  }
};

export const removeProxyRequest = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await deleteProxyRequest(id, req.user!.id);
    res.json({ message: 'Proxy request deleted' });
  } catch (err: any) {
    if (err.message === 'Proxy request not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error('Delete proxy request error', { error: err });
    res.status(400).json({ error: err.message || 'Failed to delete proxy request' });
  }
};
