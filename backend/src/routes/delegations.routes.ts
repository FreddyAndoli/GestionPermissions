import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getDelegations, createNewDelegation, updateDelegationById, revoke } from '../controllers/delegations.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), asyncHandler(getDelegations));
router.post('/', authMiddleware, requirePermission('leaves.approve'), asyncHandler(createNewDelegation));
router.put('/:id', authMiddleware, requirePermission('leaves.approve'), asyncHandler(updateDelegationById));
router.delete('/:id', authMiddleware, requirePermission('leaves.approve'), asyncHandler(revoke));

export default router;
