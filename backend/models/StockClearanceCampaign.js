"use strict";

const mongoose = require("mongoose");

/* =========================================================
   STOCK CLEARANCE CAMPAIGN
========================================================= */

const stockClearanceCampaignSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        unique: true,
        index: true,
      },

      name: {
        type: String,
        trim: true,
        default: "Stock Clearance Discount",
        maxlength: 120,
      },

      enabled: {
        type: Boolean,
        default: false,
        index: true,
      },

      startsAt: {
        type: Date,
        default: null,
        index: true,
      },

      endsAt: {
        type: Date,
        default: null,
        index: true,
      },

      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },

      discountValue: {
        type: Number,
        min: 0,
        default: 0,
      },

      products: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],

      timerEnabled: {
        type: Boolean,
        default: true,
      },

      popupEnabled: {
        type: Boolean,
        default: true,
      },

      popupBanner: {
        type: String,
        trim: true,
        default: "",
      },

      popupAltText: {
        type: String,
        trim: true,
        default: "Stock Clearance Discount",
        maxlength: 160,
      },

      campaignBanner: {
        type: String,
        trim: true,
        default: "",
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

/* =========================================================
   NORMALIZATION
========================================================= */

stockClearanceCampaignSchema.pre(
  "validate",
  function normalizeCampaign(next) {
    this.name =
      String(
        this.name ||
          "Stock Clearance Discount",
      ).trim() ||
      "Stock Clearance Discount";

    this.discountType =
      this.discountType === "fixed"
        ? "fixed"
        : "percentage";

    this.discountValue =
      Math.max(
        0,
        Number(this.discountValue) || 0,
      );

    if (
      this.discountType === "percentage" &&
      this.discountValue > 100
    ) {
      this.discountValue = 100;
    }

    this.products = [
      ...new Map(
        (Array.isArray(this.products)
          ? this.products
          : []
        ).map((productId) => [
          String(productId),
          productId,
        ]),
      ).values(),
    ];

    next();
  },
);

stockClearanceCampaignSchema.index({
  tenant: 1,
  enabled: 1,
  startsAt: 1,
  endsAt: 1,
});

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  mongoose.models.StockClearanceCampaign ||
  mongoose.model(
    "StockClearanceCampaign",
    stockClearanceCampaignSchema,
  );
