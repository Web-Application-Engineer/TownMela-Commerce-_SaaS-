"use strict";

const mongoose = require("mongoose");

const stringArrayField = {
  type: [{ type: String, trim: true }],
  default: [],
};

const productSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      select: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 180,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10000,
    },

    features: stringArrayField,

    image: {
      type: String,
      required: true,
      trim: true,
    },

    images: stringArrayField,
    sizes: stringArrayField,
    colors: stringArrayField,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
      select: false,
    },

    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index(
  { tenant: 1, slug: 1 },
  { unique: true, name: "tenant_slug_unique" }
);

productSchema.index({
  tenant: 1,
  isDeleted: 1,
  isActive: 1,
  createdAt: -1,
});

productSchema.index({
  tenant: 1,
  category: 1,
  isDeleted: 1,
  isActive: 1,
  createdAt: -1,
});

productSchema.index({
  tenant: 1,
  price: 1,
  isDeleted: 1,
  isActive: 1,
});

productSchema.pre("validate", function normalizeProduct(next) {
  if (typeof this.name === "string") {
    this.name = this.name.trim();
  }

  if (typeof this.slug === "string") {
    this.slug = this.slug.trim().toLowerCase();
  }

  for (const field of ["features", "images", "sizes", "colors"]) {
    if (!Array.isArray(this[field])) {
      this[field] = [];
      continue;
    }

    this[field] = [
      ...new Set(
        this[field]
          .map((value) => String(value).trim())
          .filter(Boolean)
      ),
    ];
  }

  next();
});

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
