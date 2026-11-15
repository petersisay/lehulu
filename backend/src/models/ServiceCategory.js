const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubcategorySchema = new Schema(
  {
    nameEn: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ServiceCategorySchema = new Schema(
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

const ServiceCategory = mongoose.model('ServiceCategory', ServiceCategorySchema);

module.exports = {
  ServiceCategory,
};
