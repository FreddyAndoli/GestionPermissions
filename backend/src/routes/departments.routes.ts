import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getDepartments, getDepartment, createNewDepartment, updateDepartmentById,
  removeDepartment, addMembers, removeMember, setDepartmentRoles
} from '../controllers/departments.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('departments.read'), getDepartments);
router.post('/', authMiddleware, requirePermission('departments.create'), createNewDepartment);
router.get('/:id', authMiddleware, requirePermission('departments.read'), getDepartment);
router.put('/:id', authMiddleware, requirePermission('departments.update'), updateDepartmentById);
router.delete('/:id', authMiddleware, requirePermission('departments.delete'), removeDepartment);
router.post('/:id/members', authMiddleware, requirePermission('departments.update'), addMembers);
router.delete('/:id/members/:userId', authMiddleware, requirePermission('departments.update'), removeMember);
router.put('/:id/roles', authMiddleware, requirePermission('departments.update'), setDepartmentRoles);

export default router;
