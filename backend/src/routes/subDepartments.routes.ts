import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getSubDepartments, getSubDepartment, createNewSubDepartment,
  updateSubDepartmentById, removeSubDepartment, addSubDeptMembers, removeSubDeptMember
} from '../controllers/subDepartments.controller';

const router = Router();

router.get('/by-department/:departmentId', authMiddleware, requirePermission('departments.read'), getSubDepartments);
router.post('/', authMiddleware, requirePermission('departments.create'), createNewSubDepartment);
router.get('/:id', authMiddleware, requirePermission('departments.read'), getSubDepartment);
router.put('/:id', authMiddleware, requirePermission('departments.update'), updateSubDepartmentById);
router.delete('/:id', authMiddleware, requirePermission('departments.delete'), removeSubDepartment);
router.post('/:id/members', authMiddleware, requirePermission('departments.update'), addSubDeptMembers);
router.delete('/:id/members/:userId', authMiddleware, requirePermission('departments.update'), removeSubDeptMember);

export default router;
