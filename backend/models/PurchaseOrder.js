"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const PURCHASE_ORDER_STATUSES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Ordered",
  "Partially Received",
  "Received",
  "Cancelled",
  "Closed",
];

const PURCHASE_PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overpaid",
  "Refunded",
];

const PURCHASE_ORDER_PRIORITIES = [
  "Low",
  "Normal",
  "High",
  "Urgent",
];

const PURCHASE_ORDER_SOURCES = [
  "Manual",
  "Reorder",
  "Import",
  "API",
];

const DISCOUNT_TYPES = [
  "Fixed",
  "Percentage",
];

const PURCHASE_ORDER_NUMBER_PATTERN =
  /^PO-[A-Z0-9]{2,20}-\d{8}-\d{4}$/;

/* =========================================================
   NORMALIZERS
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

const normalizeUppercaseString = (value) => {
  const normalizedValue =
    normalizeOptionalString(value);

  return normalizedValue
    ? normalizedValue.toUpperCase()
    : null;
};

const normalizeCurrency = (value) => {
  if (typeof value !== "string") {
    return "BDT";
  }

  const normalizedValue = value
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalizedValue
  )
    ? normalizedValue
    : "BDT";
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

/* =========================================================
   DELIVERY ADDRESS SCHEMA
========================================================= */

const deliveryAddressSchema =
  new mongoose.Schema(
    {
      recipientName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      phone: {
        type: String,
        default: null,
        trim: true,
        maxlength: 30,
        set: normalizeOptionalString,
      },

      addressLine1: {
        type: String,
        default: null,
        trim: true,
        maxlength: 250,
        set: normalizeOptionalString,
      },

      addressLine2: {
        type: String,
        default: null,
        trim: true,
        maxlength: 250,
        set: normalizeOptionalString,
      },

      area: {
        type: String,
        default: null,
        trim: true,
        maxlength: 120,
        set: normalizeOptionalString,
      },

      district: {
        type: String,
        default: null,
        trim: true,
        maxlength: 120,
        set: normalizeOptionalString,
      },

      division: {
        type: String,
        default: null,
        trim: true,
        maxlength: 120,
        set: normalizeOptionalString,
      },

      postalCode: {
        type: String,
        default: null,
        trim: true,
        maxlength: 30,
        set: normalizeOptionalString,
      },

      country: {
        type: String,
        default: "Bangladesh",
        trim: true,
        maxlength: 120,
        set: normalizeRequiredString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   STATUS HISTORY SCHEMA
========================================================= */

const statusHistorySchema =
  new mongoose.Schema(
    {
      fromStatus: {
        type: String,
        enum: [
          null,
          ...PURCHASE_ORDER_STATUSES,
        ],
        default: null,
      },

      toStatus: {
        type: String,
        enum: PURCHASE_ORDER_STATUSES,
        required: true,
      },

      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      changedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },

      reason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
        set: normalizeOptionalString,
      },

      note: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
        set: normalizeOptionalString,
      },
    },
    {
      _id: true,
    }
  );

/* =========================================================
   APPROVAL SCHEMA
========================================================= */

const approvalSchema =
  new mongoose.Schema(
    {
      requestedAt: {
        type: Date,
        default: null,
      },

      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },

      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      rejectionReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
        set: normalizeOptionalString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   RECEIVING SUMMARY SCHEMA
========================================================= */

const receivingSummarySchema =
  new mongoose.Schema(
    {
      totalOrderedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalReceivedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalRejectedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalPendingQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      firstReceivedAt: {
        type: Date,
        default: null,
      },

      lastReceivedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PURCHASE ORDER SCHEMA
========================================================= */

const purchaseOrderSchema =
  new mongoose.Schema(
    {
      /*
        Tenant must always come from trusted authenticated
        server context. Never accept tenant from client body.
      */

      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      purchaseOrderNumber: {
        type: String,
        required: true,
        immutable: true,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeUppercaseString,

        match: [
          PURCHASE_ORDER_NUMBER_PATTERN,
          "Invalid purchase order number format",
        ],
      },

      supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
        index: true,
      },

      supplierSnapshot: {
        supplierCode: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
          maxlength: 50,
          set: normalizeUppercaseString,
        },

        businessName: {
          type: String,
          required: true,
          trim: true,
          maxlength: 180,
          set: normalizeRequiredString,
        },

        contactPerson: {
          type: String,
          default: null,
          trim: true,
          maxlength: 120,
          set: normalizeOptionalString,
        },

        phone: {
          type: String,
          required: true,
          trim: true,
          maxlength: 30,
          set: normalizeRequiredString,
        },

        email: {
          type: String,
          default: null,
          trim: true,
          lowercase: true,
          maxlength: 180,
          set: normalizeOptionalString,
        },

        currency: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
          default: "BDT",
          set: normalizeCurrency,
        },
      },

      orderDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },

      expectedDeliveryDate: {
        type: Date,
        default: null,
        index: true,
      },

      actualDeliveryDate: {
        type: Date,
        default: null,
      },

      referenceNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      supplierInvoiceNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      source: {
        type: String,
        enum: PURCHASE_ORDER_SOURCES,
        default: "Manual",
        required: true,
      },

      priority: {
        type: String,
        enum: PURCHASE_ORDER_PRIORITIES,
        default: "Normal",
        required: true,
      },

      status: {
        type: String,
        enum: PURCHASE_ORDER_STATUSES,
        default: "Draft",
        required: true,
        index: true,
      },

      paymentStatus: {
        type: String,
        enum: PURCHASE_PAYMENT_STATUSES,
        default: "Unpaid",
        required: true,
        index: true,
      },

      currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        default: "BDT",
        set: normalizeCurrency,

        match: [
          /^[A-Z]{3}$/,
          "Currency must be a valid 3-letter ISO code",
        ],
      },

      exchangeRate: {
        type: Number,
        min: 0.000001,
        default: 1,
        required: true,
      },

      /*
        Item rows will be stored in PurchaseOrderItem collection.

        itemCount is a cached summary for fast list/dashboard
        queries. PurchaseOrderItem remains the item source.
      */

      itemCount: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalOrderedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      subtotal: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      discountType: {
        type: String,
        enum: DISCOUNT_TYPES,
        default: "Fixed",
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

      taxAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      shippingAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      otherChargeAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      adjustmentAmount: {
        type: Number,
        default: 0,
        set: roundMoney,
      },

      grandTotal: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      baseCurrencyGrandTotal: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      paidAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      refundedAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      dueAmount: {
        type: Number,
        min: 0,
        default: 0,
        set: roundMoney,
      },

      deliveryAddress: {
        type: deliveryAddressSchema,
        default: () => ({}),
      },

      paymentTerm: {
        type: String,
        default: "Immediate",
        trim: true,
        maxlength: 100,
        set: normalizeRequiredString,
      },

      paymentDueDate: {
        type: Date,
        default: null,
        index: true,
      },

      receivingSummary: {
        type: receivingSummarySchema,
        default: () => ({}),
      },

      approval: {
        type: approvalSchema,
        default: () => ({}),
      },

      statusHistory: {
        type: [statusHistorySchema],
        default: [],
      },

      internalNote: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
        set: normalizeOptionalString,
      },

      supplierNote: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
        set: normalizeOptionalString,
      },

      termsAndConditions: {
        type: String,
        default: null,
        trim: true,
        maxlength: 5000,
        set: normalizeOptionalString,
      },

      attachments: {
        type: [
          {
            fileName: {
              type: String,
              required: true,
              trim: true,
              maxlength: 255,
            },

            fileUrl: {
              type: String,
              required: true,
              trim: true,
              maxlength: 2000,
            },

            mimeType: {
              type: String,
              default: null,
              trim: true,
              maxlength: 100,
            },

            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },

            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        default: [],
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      cancellationReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
        set: normalizeOptionalString,
      },

      closedAt: {
        type: Date,
        default: null,
      },

      closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
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
   DOCUMENT VALIDATION
========================================================= */

purchaseOrderSchema.pre(
  "validate",
  function validatePurchaseOrder(next) {
    if (
      this.expectedDeliveryDate &&
      this.orderDate &&
      this.expectedDeliveryDate <
        this.orderDate
    ) {
      this.invalidate(
        "expectedDeliveryDate",
        "Expected delivery date cannot be before order date"
      );
    }

    if (
      this.paymentDueDate &&
      this.orderDate &&
      this.paymentDueDate <
        this.orderDate
    ) {
      this.invalidate(
        "paymentDueDate",
        "Payment due date cannot be before order date"
      );
    }

    if (
      this.discountType ===
        "Percentage" &&
      this.discountValue > 100
    ) {
      this.invalidate(
        "discountValue",
        "Percentage discount cannot exceed 100"
      );
    }

    if (
      this.status === "Cancelled" &&
      !this.cancellationReason
    ) {
      this.invalidate(
        "cancellationReason",
        "Cancellation reason is required"
      );
    }

    if (
      this.status === "Cancelled" &&
      !this.cancelledAt
    ) {
      this.cancelledAt = new Date();
    }

    if (
      this.status !== "Cancelled"
    ) {
      this.cancelledAt = null;
      this.cancelledBy = null;
      this.cancellationReason = null;
    }

    if (
      this.status === "Closed" &&
      !this.closedAt
    ) {
      this.closedAt = new Date();
    }

    if (
      this.status !== "Closed"
    ) {
      this.closedAt = null;
      this.closedBy = null;
    }

    next();
  }
);

/* =========================================================
   FINANCIAL CALCULATION
========================================================= */

purchaseOrderSchema.methods
  .calculateFinancialSummary =
  function calculateFinancialSummary() {
    const subtotal = roundMoney(
      Math.max(
        Number(this.subtotal) || 0,
        0
      )
    );

    let discountAmount = 0;

    if (
      this.discountType === "Percentage"
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
    } else {
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

    const taxAmount = roundMoney(
      Math.max(
        Number(this.taxAmount) || 0,
        0
      )
    );

    const shippingAmount = roundMoney(
      Math.max(
        Number(this.shippingAmount) || 0,
        0
      )
    );

    const otherChargeAmount = roundMoney(
      Math.max(
        Number(this.otherChargeAmount) ||
          0,
        0
      )
    );

    const adjustmentAmount = roundMoney(
      Number(this.adjustmentAmount) || 0
    );

    const grandTotal = roundMoney(
      Math.max(
        subtotal -
          discountAmount +
          taxAmount +
          shippingAmount +
          otherChargeAmount +
          adjustmentAmount,
        0
      )
    );

    const exchangeRate = Math.max(
      Number(this.exchangeRate) || 1,
      0.000001
    );

    const baseCurrencyGrandTotal =
      roundMoney(
        grandTotal * exchangeRate
      );

    const paidAmount = roundMoney(
      Math.max(
        Number(this.paidAmount) || 0,
        0
      )
    );

    const refundedAmount = roundMoney(
      Math.max(
        Number(this.refundedAmount) || 0,
        0
      )
    );

    const netPaidAmount = roundMoney(
      Math.max(
        paidAmount - refundedAmount,
        0
      )
    );

    const dueAmount = roundMoney(
      Math.max(
        grandTotal - netPaidAmount,
        0
      )
    );

    this.subtotal = subtotal;
    this.discountAmount =
      discountAmount;
    this.taxAmount = taxAmount;
    this.shippingAmount =
      shippingAmount;
    this.otherChargeAmount =
      otherChargeAmount;
    this.adjustmentAmount =
      adjustmentAmount;
    this.grandTotal = grandTotal;
    this.baseCurrencyGrandTotal =
      baseCurrencyGrandTotal;
    this.paidAmount = paidAmount;
    this.refundedAmount =
      refundedAmount;
    this.dueAmount = dueAmount;

    if (
      refundedAmount > 0 &&
      netPaidAmount === 0 &&
      grandTotal > 0
    ) {
      this.paymentStatus = "Refunded";
    } else if (
      netPaidAmount === 0
    ) {
      this.paymentStatus = "Unpaid";
    } else if (
      netPaidAmount < grandTotal
    ) {
      this.paymentStatus =
        "Partially Paid";
    } else if (
      netPaidAmount === grandTotal
    ) {
      this.paymentStatus = "Paid";
    } else {
      this.paymentStatus = "Overpaid";
    }

    return {
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      otherChargeAmount,
      adjustmentAmount,
      grandTotal,
      baseCurrencyGrandTotal,
      paidAmount,
      refundedAmount,
      dueAmount,
      paymentStatus:
        this.paymentStatus,
    };
  };

purchaseOrderSchema.pre(
  "save",
  function calculateBeforeSave(next) {
    this.calculateFinancialSummary();
    next();
  }
);

/* =========================================================
   INSTANCE METHODS
========================================================= */

purchaseOrderSchema.methods.addStatusHistory =
  function addStatusHistory({
    toStatus,
    changedBy,
    reason = null,
    note = null,
  }) {
    const fromStatus = this.status;

    this.status = toStatus;

    this.statusHistory.push({
      fromStatus,
      toStatus,
      changedBy,
      changedAt: new Date(),
      reason,
      note,
    });

    this.updatedBy = changedBy;

    return this;
  };

purchaseOrderSchema.methods.softDelete =
  async function softDelete({
    userId,
    session = null,
  } = {}) {
    if (this.status !== "Draft") {
      const error = new Error(
        "Only draft purchase orders can be deleted"
      );

      error.statusCode = 409;
      error.code =
        "PURCHASE_ORDER_DELETE_NOT_ALLOWED";

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

purchaseOrderSchema.index(
  {
    tenant: 1,
    purchaseOrderNumber: 1,
  },
  {
    unique: true,
    name:
      "tenant_purchase_order_number_unique",
  }
);

purchaseOrderSchema.index({
  tenant: 1,
  supplier: 1,
  orderDate: -1,
  isDeleted: 1,
});

purchaseOrderSchema.index({
  tenant: 1,
  status: 1,
  orderDate: -1,
  isDeleted: 1,
});

purchaseOrderSchema.index({
  tenant: 1,
  paymentStatus: 1,
  paymentDueDate: 1,
  isDeleted: 1,
});

purchaseOrderSchema.index({
  tenant: 1,
  expectedDeliveryDate: 1,
  status: 1,
  isDeleted: 1,
});

purchaseOrderSchema.index({
  tenant: 1,
  createdAt: -1,
  isDeleted: 1,
});

purchaseOrderSchema.index(
  {
    tenant: 1,
    supplierInvoiceNumber: 1,
  },
  {
    partialFilterExpression: {
      supplierInvoiceNumber: {
        $type: "string",
      },

      isDeleted: false,
    },

    name:
      "tenant_supplier_invoice_lookup",
  }
);

/* =========================================================
   QUERY HELPER
========================================================= */

purchaseOrderSchema.query
  .forTenant = function forTenant(
  tenantId
) {
  return this.where({
    tenant: tenantId,
  });
};

purchaseOrderSchema.query
  .notDeleted = function notDeleted() {
  return this.where({
    isDeleted: false,
  });
};

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

purchaseOrderSchema.set("toJSON", {
  transform(document, returnedObject) {
    delete returnedObject.__v;

    return returnedObject;
  },
});

/* =========================================================
   EXPORT
========================================================= */

const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model(
    "PurchaseOrder",
    purchaseOrderSchema
  );

module.exports = PurchaseOrder;

module.exports.PURCHASE_ORDER_STATUSES =
  PURCHASE_ORDER_STATUSES;

module.exports.PURCHASE_PAYMENT_STATUSES =
  PURCHASE_PAYMENT_STATUSES;

module.exports.PURCHASE_ORDER_PRIORITIES =
  PURCHASE_ORDER_PRIORITIES;

module.exports.PURCHASE_ORDER_SOURCES =
  PURCHASE_ORDER_SOURCES;

module.exports.DISCOUNT_TYPES =
  DISCOUNT_TYPES;