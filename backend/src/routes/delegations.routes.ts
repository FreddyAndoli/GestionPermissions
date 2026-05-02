import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { getDelegations, createNewDelegation, updateDelegationById, revoke } from '../controllers/delegations.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), getDelegations);
router.post('/', authMiddleware, requirePermission('leaves.approve'), createNewDelegation);
router.put('/:id', authMiddleware, requirePermission('leaves.approve'), updateDelegationById);
router.delete('/:id', authMiddleware, requirePermission('leaves.approve'), revoke);

export default router;
