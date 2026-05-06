import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller';

const router = Router();

router.get('/', authMiddleware, asyncHandler(getPreferences));
router.put('/', authMiddleware, asyncHandler(updatePreferences));

export default router;
