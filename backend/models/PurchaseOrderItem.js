"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const ITEM_STATUSES = [
  "Pending",
  "Partially Received",
  "Received",
  "Cancelled",
];

const TAX_TYPES = [
  "None",
  "Percentage",
  "Fixed",
];

const DISCOUNT_TYPES = [
  "None",
  "Percentage",
  "Fixed",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeOptionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
};

const normalizeRequiredString = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const normalizeSku = (value) => {
  const normalizedValue =
    normalizeOptionalString(value);

  return normalizedValue
    ? normalizedValue.toUpperCase()
    : null;
};

const roundMoney = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.round(
    (parsedValue + Number.EPSILON) * 100
  ) / 100;
};

const roundQuantity = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.round(
    (parsedValue + Number.EPSILON) *
      10000
  ) / 10000;
};

/* =========================================================
   PRODUCT SNAPSHOT SCHEMA
========================================================= */

const productSnapshotSchema =
  new mongoose.Schema(
    {
      productName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250,
        set: normalizeRequiredString,
      },

      sku: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeSku,
      },

      barcode: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      variantName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200,
        set: normalizeOptionalString,
      },

      unitName: {
        type: String,
        default: "Piece",
        trim: true,
        maxlength: 100,
        set: normalizeRequiredString,
      },

      brandName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      categoryName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PURCHASE ORDER ITEM SCHEMA
========================================================= */

const purchaseOrderItemSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        required: true,
        immutable: true,
        index: true,
      },

      supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
        immutable: true,
        index: true,
      },

      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
      },

      variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant",
        default: null,
      },

      productSnapshot: {
        type: productSnapshotSchema,
        required: true,
      },

      lineNumber: {
        type: Number,
        required: true,
        min: 1,
      },

      orderedQuantity: {
        type: Number,
        required: true,
        min: 0.0001,
        set: roundQuantity,
      },

      receivedQuantity: {
        type: Number,
        min: 0,
        default: 0,
        set: roundQuantity,
      },

      rejectedQuantity: {
        type: Number,
        min: 0,
        default: 0,
        set: roundQuantity,
      },

      cancelledQuantity: {
        type: Number,
        min: 0,
        default: 0,
        set: roundQuantity,
      },

      pendingQuantity: {
        type: Number,
        min: 0,
        default: 0,
        set: roundQuantity,
      },

      unitCost: {
        type: Number,
        required: true,
        min: 0,
        set: roundMoney,
      },

      discountType: {
        type: String,
        enum: DISCOUNT_TYPES,
        default: "None",
      },

      discountValue: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      discountAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      taxType: {
        type: String,
        enum: TAX_TYPES,
        default: "None",
      },

      taxValue: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      taxAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      subtotal: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      lineTotal: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      status: {
        type: String,
        enum: ITEM_STATUSES,
        default: "Pending",
        required: true,
        index: true,
      },

      expectedDeliveryDate: {
        type: Date,
        default: null,
      },

      note: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
        set: normalizeOptionalString,
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },

      deletedAt: {
        type: Date,
        default: null,
      },

      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      minimize: false,
      optimisticConcurrency: true,
    }
  );

/* =========================================================
   CALCULATION METHOD
========================================================= */

purchaseOrderItemSchema.methods
  .calculateLineSummary =
  function calculateLineSummary() {
    const orderedQuantity =
      roundQuantity(
        Math.max(
          Number(this.orderedQuantity) || 0,
          0
        )
      );

    const receivedQuantity =
      roundQuantity(
        Math.max(
          Number(this.receivedQuantity) || 0,
          0
        )
      );

    const rejectedQuantity =
      roundQuantity(
        Math.max(
          Number(this.rejectedQuantity) || 0,
          0
        )
      );

    const cancelledQuantity =
      roundQuantity(
        Math.max(
          Number(this.cancelledQuantity) || 0,
          0
        )
      );

    const unitCost = roundMoney(
      Math.max(
        Number(this.unitCost) || 0,
        0
      )
    );

    const subtotal = roundMoney(
      orderedQuantity * unitCost
    );

    let discountAmount = 0;

    if (
      this.discountType ===
      "Percentage"
    ) {
      const percentage = Math.min(
        Math.max(
          Number(this.discountValue) || 0,
          0
        ),
        100
      );

      discountAmount = roundMoney(
        subtotal * (percentage / 100)
      );
    } else if (
      this.discountType === "Fixed"
    ) {
      discountAmount = roundMoney(
        Math.min(
          Math.max(
            Number(this.discountValue) || 0,
            0
          ),
          subtotal
        )
      );
    }

    const taxableAmount = roundMoney(
      Math.max(
        subtotal - discountAmount,
        0
      )
    );

    let taxAmount = 0;

    if (this.taxType === "Percentage") {
      const percentage = Math.min(
        Math.max(
          Number(this.taxValue) || 0,
          0
        ),
        100
      );

      taxAmount = roundMoney(
        taxableAmount *
          (percentage / 100)
      );
    } else if (
      this.taxType === "Fixed"
    ) {
      taxAmount = roundMoney(
        Math.max(
          Number(this.taxValue) || 0,
          0
        )
      );
    }

    const lineTotal = roundMoney(
      taxableAmount + taxAmount
    );

    const processedQuantity =
      roundQuantity(
        receivedQuantity +
          rejectedQuantity +
          cancelledQuantity
      );

    const pendingQuantity =
      roundQuantity(
        Math.max(
          orderedQuantity -
            processedQuantity,
          0
        )
      );

    if (
      receivedQuantity >
      orderedQuantity
    ) {
      this.invalidate(
        "receivedQuantity",
        "Received quantity cannot exceed ordered quantity"
      );
    }

    if (
      processedQuantity >
      orderedQuantity
    ) {
      this.invalidate(
        "pendingQuantity",
        "Received, rejected and cancelled quantities cannot exceed ordered quantity"
      );
    }

    this.orderedQuantity =
      orderedQuantity;

    this.receivedQuantity =
      receivedQuantity;

    this.rejectedQuantity =
      rejectedQuantity;

    this.cancelledQuantity =
      cancelledQuantity;

    this.pendingQuantity =
      pendingQuantity;

    this.unitCost = unitCost;
    this.subtotal = subtotal;
    this.discountAmount =
      discountAmount;
    this.taxAmount = taxAmount;
    this.lineTotal = lineTotal;

    if (
      cancelledQuantity ===
        orderedQuantity &&
      orderedQuantity > 0
    ) {
      this.status = "Cancelled";
    } else if (
      pendingQuantity === 0 &&
      receivedQuantity > 0
    ) {
      this.status = "Received";
    } else if (
      receivedQuantity > 0 ||
      rejectedQuantity > 0
    ) {
      this.status =
        "Partially Received";
    } else {
      this.status = "Pending";
    }

    return {
      orderedQuantity,
      receivedQuantity,
      rejectedQuantity,
      cancelledQuantity,
      pendingQuantity,
      unitCost,
      subtotal,
      discountAmount,
      taxAmount,
      lineTotal,
      status: this.status,
    };
  };

/* =========================================================
   VALIDATION
========================================================= */

purchaseOrderItemSchema.pre(
  "validate",
  function validatePurchaseOrderItem(
    next
  ) {
    if (
      this.discountType ===
        "Percentage" &&
      Number(this.discountValue) > 100
    ) {
      this.invalidate(
        "discountValue",
        "Percentage discount cannot exceed 100"
      );
    }

    if (
      this.taxType === "Percentage" &&
      Number(this.taxValue) > 100
    ) {
      this.invalidate(
        "taxValue",
        "Percentage tax cannot exceed 100"
      );
    }

    this.calculateLineSummary();

    next();
  }
);

/* =========================================================
   INSTANCE METHODS
========================================================= */

purchaseOrderItemSchema.methods.softDelete =
  async function softDelete({
    userId,
    session = null,
  } = {}) {
    if (
      Number(this.receivedQuantity) > 0
    ) {
      const error = new Error(
        "A received purchase order item cannot be deleted"
      );

      error.statusCode = 409;
      error.code =
        "PURCHASE_ORDER_ITEM_DELETE_NOT_ALLOWED";

      throw error;
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId || null;
    this.updatedBy = userId || null;

    return this.save({
      session,
    });
  };

/* =========================================================
   DATABASE INDEXES
========================================================= */

purchaseOrderItemSchema.index(
  {
    tenant: 1,
    purchaseOrder: 1,
    lineNumber: 1,
  },
  {
    unique: true,
    name:
      "tenant_purchase_order_line_unique",
  }
);

purchaseOrderItemSchema.index({
  tenant: 1,
  purchaseOrder: 1,
  isDeleted: 1,
  lineNumber: 1,
});

purchaseOrderItemSchema.index({
  tenant: 1,
  product: 1,
  createdAt: -1,
  isDeleted: 1,
});

purchaseOrderItemSchema.index({
  tenant: 1,
  supplier: 1,
  product: 1,
  createdAt: -1,
  isDeleted: 1,
});

purchaseOrderItemSchema.index({
  tenant: 1,
  status: 1,
  expectedDeliveryDate: 1,
  isDeleted: 1,
});

/* =========================================================
   QUERY HELPERS
========================================================= */

purchaseOrderItemSchema.query
  .forTenant = function forTenant(
  tenantId
) {
  return this.where({
    tenant: tenantId,
  });
};

purchaseOrderItemSchema.query
  .notDeleted = function notDeleted() {
  return this.where({
    isDeleted: false,
  });
};

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

purchaseOrderItemSchema.set(
  "toJSON",
  {
    transform(
      document,
      returnedObject
    ) {
      delete returnedObject.__v;

      return returnedObject;
    },
  }
);

/* =========================================================
   EXPORT
========================================================= */

const PurchaseOrderItem =
  mongoose.models.PurchaseOrderItem ||
  mongoose.model(
    "PurchaseOrderItem",
    purchaseOrderItemSchema
  );

module.exports = PurchaseOrderItem;

module.exports.ITEM_STATUSES =
  ITEM_STATUSES;

module.exports.TAX_TYPES =
  TAX_TYPES;

module.exports.DISCOUNT_TYPES =
  DISCOUNT_TYPES;