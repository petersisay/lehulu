import { Router } from 'express';
import {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategorySchema,
} from '../controllers/categoryController';
import { validateRequest } from '../middleware/validate';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin-only management routes
router.get('/admin/all', requireRole('ADMIN'), getAllCategoriesAdmin);
router.post('/', requireRole('ADMIN'), validateRequest(createCategorySchema), createCategory);
router.put('/:id', requireRole('ADMIN'), updateCategory);
router.delete('/:id', requireRole('ADMIN'), deleteCategory);

export default router;
