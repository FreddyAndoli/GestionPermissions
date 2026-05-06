import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getMyOrganization, updateOrganizationById } from '../controllers/organizations.controller';

const router = Router();

router.get('/me', authMiddleware, asyncHandler(getMyOrganization));
router.put('/:id', authMiddleware, asyncHandler(updateOrganizationById));

export default router;
