import { Request, Response } from 'express';
import { getOrganizationById, getOrganizationByUserId, updateOrganization } from '../services/organizations.service';
import { logger } from '../utils/logger';
import { checkIsSuperAdmin } from '../services/users.service';

export const getMyOrganization = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const org = await getOrganizationByUserId(req.user.id);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(org);
  } catch (err) {
    logger.error('Get organization error', { error: err });
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
};

export const updateOrganizationById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid organization ID' });
      return;
    }

    const org = await getOrganizationById(id);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Only Super Admin can update organization name
    const isSuperAdmin = await checkIsSuperAdmin(req.user.id);
    if (!isSuperAdmin) {
      res.status(403).json({ error: 'Forbidden: only Super Admin can update organization' });
      return;
    }

    const { name, slug, settings } = req.body;
    const updated = await updateOrganization(id, {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(settings !== undefined && { settings })
    });
    res.json(updated);
  } catch (err) {
    logger.error('Update organization error', { error: err });
    res.status(500).json({ error: 'Failed to update organization' });
  }
};
