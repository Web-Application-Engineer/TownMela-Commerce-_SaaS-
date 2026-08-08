const mongoose = require("mongoose");

/* =========================================================
   HOMEPAGE BANNER SCHEMA
========================================================= */

const homepageBannerSchema = new mongoose.Schema(
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
       BASIC INFORMATION
    ===================================================== */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    link: {
      type: String,
      default: "/shop",
      trim: true,
    },

    altText: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================================
       BANNER TYPE
    ===================================================== */

    type: {
      type: String,
      required: true,
      enum: [
        "main",
        "sideTop",
        "sideBottom",
      ],
    },

    /* =====================================================
       DISPLAY SETTINGS
    ===================================================== */

    order: {
      type: Number,
      default: 1,
      min: 1,
    },

    active: {
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

homepageBannerSchema.index({
  tenant: 1,
  type: 1,
  active: 1,
  order: 1,
});

module.exports =
  mongoose.models.HomepageBanner ||
  mongoose.model(
    "HomepageBanner",
    homepageBannerSchema,
  );
