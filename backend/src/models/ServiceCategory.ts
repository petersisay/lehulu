import mongoose, { Schema, Document } from 'mongoose';

export interface ISubcategory {
  nameEn: string;
  nameAm: string;
  slug: string;
}

export interface IServiceCategory extends Document {
  nameEn: string;
  nameAm: string;
  slug: string;
  descriptionEn: string;
  descriptionAm: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: ISubcategory[];
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new Schema<ISubcategory>(
  {
    nameEn: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ServiceCategorySchema = new Schema<IServiceCategory>(
  {
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    nameAm: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    descriptionEn: {
      type: String,
      required: true,
      trim: true,
    },
    descriptionAm: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      default: 'Wrench',
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    subcategories: [SubcategorySchema],
  },
  {
    timestamps: true,
  }
);

ServiceCategorySchema.index({ isActive: 1, displayOrder: 1 });

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
