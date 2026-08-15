"use strict";

const mongoose = require("mongoose");

/* =========================================================
   HOMEPAGE PRODUCT SECTION ITEM
========================================================= */

const homepageProductSectionItemSchema =
  new mongoose.Schema(
    {
      key: {
        type: String,
        required: true,
        trim: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
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
    },
    {
      _id: true,
    },
  );

/* =========================================================
   HOMEPAGE PRODUCT SECTION SETTING
========================================================= */

const homepageProductSectionSettingSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        unique: true,
        index: true,
      },

      sections: {
        type: [homepageProductSectionItemSchema],

        default: () => [
          {
            key: "topSelling",
            title: "Top Selling",
            active: true,
            order: 1,
          },

          {
            key: "exclusive",
            title: "Exclusive",
            active: true,
            order: 2,
          },

          {
            key: "newArrival",
            title: "New Arrival",
            active: true,
            order: 3,
          },

          {
            key: "fashionStyle",
            title: "Fashion & Style",
            active: true,
            order: 4,
          },
        ],
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

/* =========================================================
   NORMALIZATION
========================================================= */

homepageProductSectionSettingSchema.pre(
  "validate",
  function normalizeSections(next) {
    if (!Array.isArray(this.sections)) {
      this.sections = [];
    }

    this.sections = this.sections
      .map((section, index) => ({
        key:
          String(
            section.key ||
              `section-${index + 1}`,
          )
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),

        title:
          String(
            section.title || "",
          ).trim(),

        active:
          section.active !== false,

        order:
          Math.max(
            1,
            Number(section.order) ||
              index + 1,
          ),
      }))
      .filter(
        (section) =>
          section.key &&
          section.title,
      );

    next();
  },
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  mongoose.models.HomepageProductSectionSetting ||
  mongoose.model(
    "HomepageProductSectionSetting",
    homepageProductSectionSettingSchema,
  );