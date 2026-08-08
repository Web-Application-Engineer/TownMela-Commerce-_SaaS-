const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const HOMEPAGE_CATEGORY_SHOWCASE_KEY =
  "homepage-category-showcase";

/* =========================================================
   SHOWCASE SECTION SCHEMA
========================================================= */

const showcaseSectionSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          120,
          "Showcase title cannot exceed 120 characters",
        ],
      },

      categoryOne: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Category",
        default: null,
      },

      categoryTwo: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Category",
        default: null,
      },

      categoryThree: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Category",
        default: null,
      },
    },
    {
      _id: false,
      id: false,
    },
  );

/* =========================================================
   DEFAULT SHOWCASE SECTIONS
========================================================= */

const createDefaultShowcaseOne =
  () => ({
    title: "Explore Categories",
    categoryOne: null,
    categoryTwo: null,
    categoryThree: null,
  });

const createDefaultShowcaseTwo =
  () => ({
    title: "Featured Categories",
    categoryOne: null,
    categoryTwo: null,
    categoryThree: null,
  });

const createDefaultShowcaseThree =
  () => ({
    title: "More Categories",
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
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Tenant",
        required: true,
        index: true,
        select: false,
      },

      key: {
        type: String,
        required: [
          true,
          "Showcase key is required",
        ],
        immutable: true,
        trim: true,
        default:
          HOMEPAGE_CATEGORY_SHOWCASE_KEY,
        enum: {
          values: [
            HOMEPAGE_CATEGORY_SHOWCASE_KEY,
          ],
          message:
            "Invalid homepage category showcase key",
        },
      },

      showcaseOne: {
        type: showcaseSectionSchema,
        default:
          createDefaultShowcaseOne,
      },

      showcaseTwo: {
        type: showcaseSectionSchema,
        default:
          createDefaultShowcaseTwo,
      },

      showcaseThree: {
        type: showcaseSectionSchema,
        default:
          createDefaultShowcaseThree,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

/* =========================================================
   TENANT-SCOPED INDEX
========================================================= */

homepageCategoryShowcaseSchema.index(
  {
    tenant: 1,
    key: 1,
  },
  {
    unique: true,
    name:
      "unique_tenant_homepage_category_showcase",
  },
);

/* =========================================================
   DATA NORMALIZATION
========================================================= */

const normalizeSectionTitle = (
  section,
  fallbackTitle,
) => {
  if (!section) {
    return;
  }

  const normalizedTitle =
    typeof section.title === "string"
      ? section.title.trim()
      : "";

  section.title =
    normalizedTitle ||
    fallbackTitle;
};

homepageCategoryShowcaseSchema.pre(
  "save",
  function normalizeShowcase(next) {
    normalizeSectionTitle(
      this.showcaseOne,
      "Explore Categories",
    );

    normalizeSectionTitle(
      this.showcaseTwo,
      "Featured Categories",
    );

    normalizeSectionTitle(
      this.showcaseThree,
      "More Categories",
    );

    next();
  },
);

const HomepageCategoryShowcase =
  mongoose.models
    .HomepageCategoryShowcase ||
  mongoose.model(
    "HomepageCategoryShowcase",
    homepageCategoryShowcaseSchema,
  );

module.exports =
  HomepageCategoryShowcase;
