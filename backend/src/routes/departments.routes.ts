import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getDepartments, getDepartment, createNewDepartment, updateDepartmentById,
  removeDepartment, addMembers, removeMember, setDepartmentRoles
} from '../controllers/departments.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('departments.read'), asyncHandler(getDepartments));
router.post('/', authMiddleware, requirePermission('departments.create'), asyncHandler(createNewDepartment));
router.get('/:id', authMiddleware, requirePermission('departments.read'), asyncHandler(getDepartment));
router.put('/:id', authMiddleware, requirePermission('departments.update'), asyncHandler(updateDepartmentById));
router.delete('/:id', authMiddleware, requirePermission('departments.delete'), asyncHandler(removeDepartment));
router.post('/:id/members', authMiddleware, requirePermission('departments.update'), asyncHandler(addMembers));
router.delete('/:id/members/:userId', authMiddleware, requirePermission('departments.update'), asyncHandler(removeMember));
router.put('/:id/roles', authMiddleware, requirePermission('departments.update'), asyncHandler(setDepartmentRoles));

export default router;
