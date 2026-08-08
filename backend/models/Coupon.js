const mongoose = require("mongoose");

/* =========================================================
   COUPON SCHEMA
========================================================= */

const couponSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [
        true,
        "Tenant is required",
      ],
      index: true,
    },

    code: {
      type: String,
      required: [
        true,
        "Coupon code is required",
      ],
      uppercase: true,
      trim: true,
      minlength: [
        2,
        "Coupon code must be at least 2 characters",
      ],
      maxlength: [
        40,
        "Coupon code cannot exceed 40 characters",
      ],
      match: [
        /^[A-Z0-9_-]+$/,
        "Coupon code can contain only letters, numbers, underscore and hyphen",
      ],
    },

    discountType: {
      type: String,
      required: [
        true,
        "Discount type is required",
      ],
      enum: {
        values: [
          "percentage",
          "fixed",
        ],
        message:
          "Discount type must be percentage or fixed",
      },
    },

    discountValue: {
      type: Number,
      required: [
        true,
        "Discount value is required",
      ],
      min: [
        0.01,
        "Discount value must be greater than 0",
      ],
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Minimum order amount cannot be negative",
      ],
    },

    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [
        0,
        "Maximum discount amount cannot be negative",
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    expiresAt: {
      type: Date,
      required: [
        true,
        "Coupon expiry date is required",
      ],
    },
  },
  {
    timestamps: true,
  },
);

/* =========================================================
   TENANT-SCOPED UNIQUE INDEX
========================================================= */

couponSchema.index(
  {
    tenant: 1,
    code: 1,
  },
  {
    unique: true,
    name: "unique_tenant_coupon_code",
  },
);

/* =========================================================
   NORMALIZE COUPON CODE BEFORE SAVE
========================================================= */

couponSchema.pre(
  "save",
  function normalizeCouponCode(
    next,
  ) {
    if (
      typeof this.code ===
      "string"
    ) {
      this.code = this.code
        .trim()
        .toUpperCase();
    }

    next();
  },
);

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

couponSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform: function (
      doc,
      ret,
    ) {
      delete ret.__v;

      return ret;
    },
  },
);

module.exports = mongoose.model(
  "Coupon",
  couponSchema,
);
