import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller';

const router = Router();

router.get('/', authMiddleware, getPreferences);
router.put('/', authMiddleware, updatePreferences);

export default router;
