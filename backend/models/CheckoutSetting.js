"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   CHECKOUT SETTING SCHEMA
========================================================= */

const checkoutSettingSchema = new Schema(
  {
    /* =====================================================
       TENANT RELATION
    ===================================================== */

    tenant: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
      index: true,
    },

    /* =====================================================
       CONTACT INFORMATION
    ===================================================== */

    supportPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    whatsappNumber: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    /* =====================================================
       DELIVERY & PAYMENT INFORMATION
    ===================================================== */

    deliveryArea: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    deliveryTime: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    codText: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    /* =====================================================
       COLLECTION & ORDER INSTRUCTIONS
    ===================================================== */

    collectionPoint: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    orderInstruction: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    /* =====================================================
       RETURN / WARRANTY / SELLER INFORMATION
    ===================================================== */

    returnPolicy: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    warrantyText: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    soldByText: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    /* =====================================================
       STATUS
    ===================================================== */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
   TENANT-SCOPED INDEXES
========================================================= */

checkoutSettingSchema.index(
  {
    tenant: 1,
  },
  {
    unique: true,
    name: "unique_tenant_checkout_setting",
  }
);

checkoutSettingSchema.index({
  tenant: 1,
  isActive: 1,
});

/* =========================================================
   NORMALIZATION
========================================================= */

checkoutSettingSchema.pre(
  "validate",
  function normalizeCheckoutSetting(next) {
    const stringFields = [
      "supportPhone",
      "whatsappNumber",
      "deliveryArea",
      "deliveryTime",
      "codText",
      "collectionPoint",
      "orderInstruction",
      "returnPolicy",
      "warrantyText",
      "soldByText",
    ];

    for (const field of stringFields) {
      if (typeof this[field] === "string") {
        this[field] = this[field].trim();
      }
    }

    next();
  }
);

/* =========================================================
   QUERY HELPERS
========================================================= */

checkoutSettingSchema.query.byTenant =
  function byTenant(tenantId) {
    return this.where({
      tenant: tenantId,
    });
  };

/* =========================================================
   STATIC HELPERS
========================================================= */

checkoutSettingSchema.statics.findByTenant =
  function findByTenant(tenantId) {
    return this.findOne({
      tenant: tenantId,
    });
  };

checkoutSettingSchema.statics.getOrCreateForTenant =
  async function getOrCreateForTenant(tenantId) {
    const existing =
      await this.findOne({
        tenant: tenantId,
      });

    if (existing) {
      return existing;
    }

    try {
      return await this.create({
        tenant: tenantId,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const setting =
          await this.findOne({
            tenant: tenantId,
          });

        if (setting) {
          return setting;
        }
      }

      throw error;
    }
  };

/* =========================================================
   MODEL EXPORT
========================================================= */

const CheckoutSetting =
  mongoose.models.CheckoutSetting ||
  mongoose.model(
    "CheckoutSetting",
    checkoutSettingSchema
  );

module.exports = CheckoutSetting;
