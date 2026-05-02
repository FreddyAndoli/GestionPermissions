import { Request, Response } from 'express';
import { getUserPreferences, updateUserPreferences } from '../services/preferences.service';

export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const prefs = await getUserPreferences(userId);
    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get preferences' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const prefs = await updateUserPreferences(userId, req.body);
    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update preferences' });
  }
};
