const { z } = require('zod');
const { ServiceCategory } = require('../models/ServiceCategory');
const { recordAuditLog } = require('../middleware/audit');
const createCategorySchema = z.object({
    body: z.object({
        nameEn: z.string().min(2, 'English name is required'),
        nameAm: z.string().min(2, 'Amharic name is required'),
        slug: z.string().min(2, 'Slug is required'),
        descriptionEn: z.string().min(5),
        descriptionAm: z.string().min(5),
        icon: z.string().default('Wrench'),
        displayOrder: z.number().default(0),
        isActive: z.boolean().default(true),
        subcategories: z
            .array(z.object({
            nameEn: z.string(),
            nameAm: z.string(),
            slug: z.string(),
        }))
            .default([]),
    }),
});
// High-performance in-memory cache for categories (5-minute TTL, instantly invalidated on writes)
let cachedCategories = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;
const invalidateCategoryCache = () => {
    cachedCategories = null;
    cacheTimestamp = 0;
};
const getCategories = async (req, res) => {
    try {
        const now = Date.now();
        if (cachedCategories && now - cacheTimestamp < CACHE_TTL_MS) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
            res.status(200).json({
                success: true,
                categories: cachedCategories,
                data: cachedCategories,
            });
            return;
        }
        const categories = await ServiceCategory.find({ isActive: true })
            .sort({ displayOrder: 1 })
            .lean();
        cachedCategories = categories;
        cacheTimestamp = now;
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.status(200).json({
            success: true,
            categories,
            data: categories,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getAllCategoriesAdmin = async (req, res) => {
    try {
        const categories = await ServiceCategory.find().sort({ displayOrder: 1 }).lean();
        res.status(200).json({
            success: true,
            categories,
            data: categories,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const category = await ServiceCategory.findOne({ slug, isActive: true }).lean();
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        res.status(200).json({
            success: true,
            category,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const createCategory = async (req, res) => {
    try {
        const category = await ServiceCategory.create(req.body);
        invalidateCategoryCache();
        if (req.user) {
            await recordAuditLog({
                actorId: req.user._id,
                actorEmail: req.user.email,
                action: 'CATEGORY_CREATED',
                entityType: 'ServiceCategory',
                entityId: category._id,
                details: { slug: category.slug, nameEn: category.nameEn },
                req,
            });
        }
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ServiceCategory.findByIdAndUpdate(id, req.body, { new: true });
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        invalidateCategoryCache();
        if (req.user) {
            await recordAuditLog({
                actorId: req.user._id,
                actorEmail: req.user.email,
                action: 'CATEGORY_UPDATED',
                entityType: 'ServiceCategory',
                entityId: category._id,
                details: { slug: category.slug, nameEn: category.nameEn },
                req,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await ServiceCategory.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        invalidateCategoryCache();
        if (req.user) {
            await recordAuditLog({
                actorId: req.user._id,
                actorEmail: req.user.email,
                action: 'CATEGORY_DEACTIVATED',
                entityType: 'ServiceCategory',
                entityId: category._id,
                details: { slug: category.slug },
                req,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Category deactivated successfully',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
  createCategorySchema,
  invalidateCategoryCache,
  getCategories,
  getAllCategoriesAdmin,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
