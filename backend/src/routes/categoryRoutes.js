const { Router } = require('express');
const { getCategories, getAllCategoriesAdmin, getCategoryBySlug, createCategory, updateCategory, deleteCategory, createCategorySchema, } = require('../controllers/categoryController');
const { validateRequest } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');
const router = Router();
// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
// Admin-only management routes
router.get('/admin/all', requireRole('ADMIN'), getAllCategoriesAdmin);
router.post('/', requireRole('ADMIN'), validateRequest(createCategorySchema), createCategory);
router.put('/:id', requireRole('ADMIN'), updateCategory);
router.delete('/:id', requireRole('ADMIN'), deleteCategory);


module.exports = router;
