const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    /* =====================================================
       TENANT RELATION
    ===================================================== */

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
      select: false,
    },

    /* =====================================================
       CATEGORY NAME
    ===================================================== */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================================================
       CATEGORY SLUG
    ===================================================== */

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /* =====================================================
       PARENT CATEGORY

       null = Main Category
       ObjectId = Subcategory of that Category
    ===================================================== */

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    /* =====================================================
       CATEGORY THUMBNAIL
    ===================================================== */

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================================
       FEATURED CATEGORY
    ===================================================== */

    featured: {
      type: Boolean,
      default: false,
    },

    /* =====================================================
       HOMEPAGE SECTION

       1 = CategoryShowcaseOne
       2 = CategoryShowcaseTwo
       3 = CategoryShowcaseThree
    ===================================================== */

    homepageSection: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },

    /* =====================================================
       DISPLAY ORDER INSIDE SECTION
    ===================================================== */

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =====================================================
       CATEGORY STATUS
    ===================================================== */

    status: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/* =========================================================
   TENANT-SCOPED INDEXES
========================================================= */

categorySchema.index(
  {
    tenant: 1,
    name: 1,
  },
  {
    unique: true,
    name: "unique_tenant_category_name",
  },
);

categorySchema.index(
  {
    tenant: 1,
    slug: 1,
  },
  {
    unique: true,
    name: "unique_tenant_category_slug",
  },
);

categorySchema.index({
  tenant: 1,
  status: 1,
  homepageSection: 1,
  displayOrder: 1,
});

categorySchema.index({
  tenant: 1,
  parent: 1,
  status: 1,
  displayOrder: 1,
});

/* =========================================================
   NORMALIZATION
========================================================= */

categorySchema.pre(
  "validate",
  function normalizeCategory(next) {
    if (typeof this.name === "string") {
      this.name = this.name.trim();
    }

    if (typeof this.slug === "string") {
      this.slug = this.slug
        .trim()
        .toLowerCase();
    }

    next();
  },
);

module.exports =
  mongoose.models.Category ||
  mongoose.model(
    "Category",
    categorySchema,
  );
