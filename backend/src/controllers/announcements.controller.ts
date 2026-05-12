import { Request, Response } from 'express';
import { createAnnouncement, listActiveAnnouncements, dismissAnnouncement } from '../services/announcement.service';
import { logger } from '../utils/logger';
import { parseId } from '../utils/asyncHandler';

export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const rows = await listActiveAnnouncements(req.user!.id, req.user!.organizationId);
    res.json(rows);
  } catch (err) {
    logger.error('Get announcements error', { error: err });
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

export const postAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message, level, isDismissible, expiresAt, targetRoles, sendEmail } = req.body;
    const result = await createAnnouncement({
      organizationId: req.user!.organizationId,
      authorId: req.user!.id,
      title,
      message,
      level,
      isDismissible,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      targetRoles,
      sendEmail
    });
    res.status(201).json(result);
  } catch (err) {
    logger.error('Create announcement error', { error: err });
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

export const dismissAnnouncementController = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await dismissAnnouncement(req.user!.id, id);
    res.json({ message: 'Dismissed' });
  } catch (err) {
    logger.error('Dismiss announcement error', { error: err });
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
};
