import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getSubDepartments, getSubDepartment, createNewSubDepartment,
  updateSubDepartmentById, removeSubDepartment, addSubDeptMembers, removeSubDeptMember
} from '../controllers/subDepartments.controller';

const router = Router();

router.get('/by-department/:departmentId', authMiddleware, requirePermission('departments.read'), asyncHandler(getSubDepartments));
router.post('/', authMiddleware, requirePermission('departments.create'), asyncHandler(createNewSubDepartment));
router.get('/:id', authMiddleware, requirePermission('departments.read'), asyncHandler(getSubDepartment));
router.put('/:id', authMiddleware, requirePermission('departments.update'), asyncHandler(updateSubDepartmentById));
router.delete('/:id', authMiddleware, requirePermission('departments.delete'), asyncHandler(removeSubDepartment));
router.post('/:id/members', authMiddleware, requirePermission('departments.update'), asyncHandler(addSubDeptMembers));
router.delete('/:id/members/:userId', authMiddleware, requirePermission('departments.update'), asyncHandler(removeSubDeptMember));

export default router;
