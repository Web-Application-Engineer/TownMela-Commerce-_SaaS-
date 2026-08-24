"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const HOMEPAGE_CATEGORY_SHOWCASE_KEY =
  "homepage-category-showcase";

/* =========================================================
   SHOWCASE SECTION SCHEMA

   The same shape is used by both the new dynamic array and
   the three legacy fields. Legacy fields stay temporarily so
   existing tenant data is migrated without losing selections.
========================================================= */

const showcaseSectionSchema =
  new mongoose.Schema(
    {
      key: {
        type: String,
        trim: true,
        default: "",
      },

      title: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          120,
          "Showcase title cannot exceed 120 characters",
        ],
      },

      active: {
        type: Boolean,
        default: true,
      },

      order: {
        type: Number,
        default: 1,
        min: 1,
      },

      layoutOrder: {
        type: Number,
        default: 1,
        min: 1,
      },

      categoryOne: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },

      categoryTwo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },

      categoryThree: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },
    },
    {
      _id: true,
      id: false,
    },
  );

/* =========================================================
   DEFAULT LEGACY SHOWCASE SECTIONS
========================================================= */

const createDefaultShowcaseOne = () => ({
  key: "showcaseOne",
  title: "Explore Categories",
  active: true,
  order: 1,
  layoutOrder: 2,
  categoryOne: null,
  categoryTwo: null,
  categoryThree: null,
});

const createDefaultShowcaseTwo = () => ({
  key: "showcaseTwo",
  title: "Featured Categories",
  active: true,
  order: 2,
  layoutOrder: 4,
  categoryOne: null,
  categoryTwo: null,
  categoryThree: null,
});

const createDefaultShowcaseThree = () => ({
  key: "showcaseThree",
  title: "More Categories",
  active: true,
  order: 3,
  layoutOrder: 6,
  categoryOne: null,
  categoryTwo: null,
  categoryThree: null,
});

/* =========================================================
   HOMEPAGE CATEGORY SHOWCASE SCHEMA
========================================================= */

const homepageCategoryShowcaseSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        index: true,
        select: false,
      },

      key: {
        type: String,
        required: [true, "Showcase key is required"],
        immutable: true,
        trim: true,
        default: HOMEPAGE_CATEGORY_SHOWCASE_KEY,
        enum: {
          values: [HOMEPAGE_CATEGORY_SHOWCASE_KEY],
          message: "Invalid homepage category showcase key",
        },
      },

      /* New tenant-configurable showcase collection. */
      showcases: {
        type: [showcaseSectionSchema],
        default: () => [],
      },

      /*
       * Legacy fields are intentionally retained for a safe
       * migration path. The controller synchronizes them with
       * matching legacy keys when the dynamic array is saved.
       */
      showcaseOne: {
        type: showcaseSectionSchema,
        default: createDefaultShowcaseOne,
      },

      showcaseTwo: {
        type: showcaseSectionSchema,
        default: createDefaultShowcaseTwo,
      },

      showcaseThree: {
        type: showcaseSectionSchema,
        default: createDefaultShowcaseThree,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

homepageCategoryShowcaseSchema.index(
  { tenant: 1, key: 1 },
  {
    unique: true,
    name: "unique_tenant_homepage_category_showcase",
  },
);

/* =========================================================
   DATA NORMALIZATION
========================================================= */

const normalizeTitle = (value, fallbackTitle) => {
  const normalized =
    typeof value === "string" ? value.trim() : "";

  return normalized || fallbackTitle;
};

homepageCategoryShowcaseSchema.pre(
  "save",
  function normalizeShowcase(next) {
    if (!Array.isArray(this.showcases)) {
      this.showcases = [];
    }

    this.showcases = this.showcases
      .map((showcase, index) => ({
        ...showcase.toObject?.() ?? showcase,
        key: String(
          showcase.key || `showcase-${index + 1}`,
        ).trim(),
        title: normalizeTitle(
          showcase.title,
          `Category Showcase ${index + 1}`,
        ),
        active: showcase.active !== false,
        order: Math.max(1, Number(showcase.order) || index + 1),
        layoutOrder: Math.max(
          1,
          Number(showcase.layoutOrder) || index + 1,
        ),
      }))
      .filter((showcase) => showcase.key && showcase.title);

    if (this.showcaseOne) {
      this.showcaseOne.title = normalizeTitle(
        this.showcaseOne.title,
        "Explore Categories",
      );
    }

    if (this.showcaseTwo) {
      this.showcaseTwo.title = normalizeTitle(
        this.showcaseTwo.title,
        "Featured Categories",
      );
    }

    if (this.showcaseThree) {
      this.showcaseThree.title = normalizeTitle(
        this.showcaseThree.title,
        "More Categories",
      );
    }

    next();
  },
);

module.exports =
  mongoose.models.HomepageCategoryShowcase ||
  mongoose.model(
    "HomepageCategoryShowcase",
    homepageCategoryShowcaseSchema,
  );
