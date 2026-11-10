import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { ServiceCategory } from '../models/ServiceCategory';
import { recordAuditLog } from '../middleware/audit';

export const createCategorySchema = z.object({
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
      .array(
        z.object({
          nameEn: z.string(),
          nameAm: z.string(),
          slug: z.string(),
        })
      )
      .default([]),
  }),
});

// High-performance in-memory cache for categories (5-minute TTL, instantly invalidated on writes)
let cachedCategories: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const invalidateCategoryCache = (): void => {
  cachedCategories = null;
  cacheTimestamp = 0;
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    if (cachedCategories && now - cacheTimestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
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
    res.status(200).json({
      success: true,
      categories,
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCategoriesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await ServiceCategory.find().sort({ displayOrder: 1 }).lean();
    res.status(200).json({
      success: true,
      categories,
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
