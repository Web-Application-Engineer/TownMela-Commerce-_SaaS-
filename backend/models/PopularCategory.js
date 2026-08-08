const mongoose = require("mongoose");

/* =========================================================
   POPULAR CATEGORY SCHEMA
========================================================= */

const popularCategorySchema =
  new mongoose.Schema(
    {
      /* ===================================================
         TENANT RELATION
      =================================================== */

      tenant: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Tenant",
        required: true,
        index: true,
        select: false,
      },

      /* ===================================================
         CATEGORY REFERENCE
      =================================================== */

      category: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Category",
        required: [
          true,
          "Category is required",
        ],
        index: true,
      },

      /* ===================================================
         CATEGORY SNAPSHOT DATA
      =================================================== */

      categoryName: {
        type: String,
        required: [
          true,
          "Category name is required",
        ],
        trim: true,
      },

      slug: {
        type: String,
        required: [
          true,
          "Category slug is required",
        ],
        trim: true,
        lowercase: true,
      },

      thumbnail: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===================================================
         DISPLAY SETTINGS
      =================================================== */

      order: {
        type: Number,
        default: 1,
        min: [
          1,
          "Display order must be at least 1",
        ],
      },

      active: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

/* =========================================================
   TENANT-SCOPED INDEXES
========================================================= */

popularCategorySchema.index(
  {
    tenant: 1,
    category: 1,
  },
  {
    unique: true,
    name:
      "unique_tenant_popular_category",
  },
);

popularCategorySchema.index({
  tenant: 1,
  active: 1,
  order: 1,
});

module.exports =
  mongoose.models.PopularCategory ||
  mongoose.model(
    "PopularCategory",
    popularCategorySchema,
  );
