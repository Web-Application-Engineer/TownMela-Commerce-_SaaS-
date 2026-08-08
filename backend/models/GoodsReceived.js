"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const GOODS_RECEIVED_STATUSES = [
  "Draft",
  "Pending Inspection",
  "Partially Accepted",
  "Accepted",
  "Rejected",
  "Completed",
  "Cancelled",
];

const GOODS_RECEIVED_SOURCES = [
  "Purchase Order",
  "Direct Purchase",
  "Supplier Delivery",
  "Manual",
  "Import",
];

const INSPECTION_STATUSES = [
  "Not Required",
  "Pending",
  "In Progress",
  "Passed",
  "Partially Passed",
  "Failed",
];

const RECEIPT_TYPES = [
  "Full",
  "Partial",
  "Replacement",
  "Return Replacement",
];

const INVENTORY_POSTING_STATUSES = [
  "Not Posted",
  "Partially Posted",
  "Posted",
  "Reversed",
];

const DOCUMENT_TYPES = [
  "Delivery Challan",
  "Supplier Invoice",
  "Packing List",
  "Quality Certificate",
  "Purchase Order",
  "Other",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
};

const normalizeRequiredString = (
  value
) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const normalizeUppercaseString = (
  value
) => {
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

  return (
    Math.round(
      (parsedValue +
        Number.EPSILON) *
        100
    ) / 100
  );
};

const roundQuantity = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return (
    Math.round(
      (parsedValue +
        Number.EPSILON) *
        10000
    ) / 10000
  );
};

/* =========================================================
   SUPPLIER SNAPSHOT SCHEMA
========================================================= */

const supplierSnapshotSchema =
  new mongoose.Schema(
    {
      supplierCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeUppercaseString,
      },

      businessName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250,
        set: normalizeRequiredString,
      },

      contactPerson: {
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

      email: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        maxlength: 254,
        set: normalizeOptionalString,
      },

      currency: {
        type: String,
        default: "BDT",
        trim: true,
        uppercase: true,
        minlength: 3,
        maxlength: 3,
        set: normalizeUppercaseString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   WAREHOUSE SNAPSHOT SCHEMA
========================================================= */

const warehouseSnapshotSchema =
  new mongoose.Schema(
    {
      warehouseName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        set: normalizeRequiredString,
      },

      warehouseCode: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeUppercaseString,
      },

      address: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
        set: normalizeOptionalString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   TRANSPORT INFORMATION SCHEMA
========================================================= */

const transportInformationSchema =
  new mongoose.Schema(
    {
      transporterName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200,
        set: normalizeOptionalString,
      },

      vehicleNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      driverName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      driverPhone: {
        type: String,
        default: null,
        trim: true,
        maxlength: 30,
        set: normalizeOptionalString,
      },

      trackingNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      transportCost: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
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
      itemCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalOrderedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalReceivedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalAcceptedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalRejectedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalDamagedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalShortQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      totalExcessQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   FINANCIAL SUMMARY SCHEMA
========================================================= */

const financialSummarySchema =
  new mongoose.Schema(
    {
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      taxAmount: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      shippingAmount: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      otherChargeAmount: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      adjustmentAmount: {
        type: Number,
        default: 0,
        set: roundMoney,
      },

      grandTotal: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   INSPECTION SCHEMA
========================================================= */

const inspectionSchema =
  new mongoose.Schema(
    {
      status: {
        type: String,
        enum: INSPECTION_STATUSES,
        default: "Not Required",
      },

      required: {
        type: Boolean,
        default: false,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      inspectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      remarks: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   INVENTORY POSTING SCHEMA
========================================================= */

const inventoryPostingSchema =
  new mongoose.Schema(
    {
      status: {
        type: String,
        enum:
          INVENTORY_POSTING_STATUSES,
        default: "Not Posted",
      },

      postedAt: {
        type: Date,
        default: null,
      },

      postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      postingReference: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      postedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      postedValue: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      failureReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      remarks: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      reversedAt: {
        type: Date,
        default: null,
      },

      reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reversalReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
        set: normalizeOptionalString,
      },

      stockTransactionIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryTransaction",
        },
      ],
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
        enum: GOODS_RECEIVED_STATUSES,
        default: null,
      },

      toStatus: {
        type: String,
        enum: GOODS_RECEIVED_STATUSES,
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
      },

      reason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
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
   ATTACHMENT SCHEMA
========================================================= */

const attachmentSchema =
  new mongoose.Schema(
    {
      documentType: {
        type: String,
        enum: DOCUMENT_TYPES,
        default: "Other",
      },

      fileName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
        set: normalizeRequiredString,
      },

      fileUrl: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
        set: normalizeRequiredString,
      },

      mimeType: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      fileSize: {
        type: Number,
        default: null,
        min: 0,
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
    {
      _id: true,
    }
  );

/* =========================================================
   GOODS RECEIVED SCHEMA
========================================================= */

const goodsReceivedSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      goodsReceivedNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 100,
        immutable: true,
        set: normalizeUppercaseString,
      },

      purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        default: null,
        index: true,
      },

      purchaseOrderNumber: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeUppercaseString,
      },

      supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
        index: true,
      },

      supplierSnapshot: {
        type: supplierSnapshotSchema,
        required: true,
      },

      warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
        index: true,
      },

      warehouseSnapshot: {
        type: warehouseSnapshotSchema,
        required: true,
      },

      receiptType: {
        type: String,
        enum: RECEIPT_TYPES,
        default: "Full",
        required: true,
      },

      source: {
        type: String,
        enum: GOODS_RECEIVED_SOURCES,
        default: "Purchase Order",
        required: true,
      },

      status: {
        type: String,
        enum: GOODS_RECEIVED_STATUSES,
        default: "Draft",
        required: true,
        index: true,
      },

      receivedDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },

      receivedAt: {
        type: Date,
        default: Date.now,
      },

      supplierInvoiceNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      supplierInvoiceDate: {
        type: Date,
        default: null,
      },

      deliveryChallanNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      deliveryChallanDate: {
        type: Date,
        default: null,
      },

      externalReferenceNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      currency: {
        type: String,
        default: "BDT",
        trim: true,
        uppercase: true,
        minlength: 3,
        maxlength: 3,
        set: normalizeUppercaseString,
      },

      exchangeRate: {
        type: Number,
        default: 1,
        min: 0.000001,
      },

      receivingSummary: {
        type: receivingSummarySchema,
        default: () => ({}),
      },

      financialSummary: {
        type: financialSummarySchema,
        default: () => ({}),
      },

      transportInformation: {
        type: transportInformationSchema,
        default: () => ({}),
      },

      inspection: {
        type: inspectionSchema,
        default: () => ({}),
      },

      inventoryPosting: {
        type: inventoryPostingSchema,
        default: () => ({}),
      },

      statusHistory: {
        type: [statusHistorySchema],
        default: [],
      },

      attachments: {
        type: [attachmentSchema],
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

      receivingRemark: {
        type: String,
        default: null,
        trim: true,
        maxlength: 3000,
        set: normalizeOptionalString,
      },

      rejectionReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      cancellationReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
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
    },
    {
      timestamps: true,
      minimize: false,
      optimisticConcurrency: true,
    }
  );

/* =========================================================
   SUMMARY CALCULATION
========================================================= */

goodsReceivedSchema.methods
  .calculateReceivingSummary =
  function calculateReceivingSummary(
    itemDocuments = []
  ) {
    const summary =
      itemDocuments.reduce(
        (result, item) => {
          result.itemCount += 1;

          result.totalOrderedQuantity =
            roundQuantity(
              result.totalOrderedQuantity +
                Number(
                  item.orderedQuantity
                )
            );

          result.totalReceivedQuantity =
            roundQuantity(
              result.totalReceivedQuantity +
                Number(
                  item.receivedQuantity
                )
            );

          result.totalAcceptedQuantity =
            roundQuantity(
              result.totalAcceptedQuantity +
                Number(
                  item.acceptedQuantity
                )
            );

          result.totalRejectedQuantity =
            roundQuantity(
              result.totalRejectedQuantity +
                Number(
                  item.rejectedQuantity
                )
            );

          result.totalDamagedQuantity =
            roundQuantity(
              result.totalDamagedQuantity +
                Number(
                  item.damagedQuantity
                )
            );

          result.totalShortQuantity =
            roundQuantity(
              result.totalShortQuantity +
                Number(
                  item.shortQuantity
                )
            );

          result.totalExcessQuantity =
            roundQuantity(
              result.totalExcessQuantity +
                Number(
                  item.excessQuantity
                )
            );

          return result;
        },
        {
          itemCount: 0,
          totalOrderedQuantity: 0,
          totalReceivedQuantity: 0,
          totalAcceptedQuantity: 0,
          totalRejectedQuantity: 0,
          totalDamagedQuantity: 0,
          totalShortQuantity: 0,
          totalExcessQuantity: 0,
        }
      );

    this.receivingSummary = summary;

    return summary;
  };

/* =========================================================
   FINANCIAL CALCULATION
========================================================= */

goodsReceivedSchema.methods
  .calculateFinancialSummary =
  function calculateFinancialSummary(
    itemDocuments = []
  ) {
    const itemTotals =
      itemDocuments.reduce(
        (result, item) => {
          result.subtotal =
            roundMoney(
              result.subtotal +
                Number(
                  item.subtotal
                )
            );

          result.discountAmount =
            roundMoney(
              result.discountAmount +
                Number(
                  item.discountAmount
                )
            );

          result.taxAmount =
            roundMoney(
              result.taxAmount +
                Number(
                  item.taxAmount
                )
            );

          return result;
        },
        {
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
        }
      );

    const shippingAmount =
      roundMoney(
        this.financialSummary
          ?.shippingAmount || 0
      );

    const otherChargeAmount =
      roundMoney(
        this.financialSummary
          ?.otherChargeAmount || 0
      );

    const adjustmentAmount =
      roundMoney(
        this.financialSummary
          ?.adjustmentAmount || 0
      );

    const grandTotal =
      roundMoney(
        itemTotals.subtotal -
          itemTotals.discountAmount +
          itemTotals.taxAmount +
          shippingAmount +
          otherChargeAmount +
          adjustmentAmount
      );

    this.financialSummary = {
      subtotal:
        itemTotals.subtotal,

      discountAmount:
        itemTotals.discountAmount,

      taxAmount:
        itemTotals.taxAmount,

      shippingAmount,
      otherChargeAmount,
      adjustmentAmount,

      grandTotal: Math.max(
        grandTotal,
        0
      ),
    };

    return this.financialSummary;
  };

/* =========================================================
   STATUS HISTORY METHOD
========================================================= */

goodsReceivedSchema.methods
  .addStatusHistory =
  function addStatusHistory({
    toStatus,
    changedBy,
    reason = null,
    note = null,
  }) {
    const fromStatus =
      this.status || null;

    this.statusHistory.push({
      fromStatus,
      toStatus,
      changedBy,
      reason:
        normalizeOptionalString(
          reason
        ),
      note:
        normalizeOptionalString(
          note
        ),
      changedAt: new Date(),
    });

    this.status = toStatus;

    return this;
  };

/* =========================================================
   SOFT DELETE METHOD
========================================================= */

goodsReceivedSchema.methods.softDelete =
  async function softDelete({
    userId,
    session = null,
  } = {}) {
    if (this.status !== "Draft") {
      const error = new Error(
        "Only draft goods receipts can be deleted"
      );

      error.statusCode = 409;
      error.code =
        "GOODS_RECEIVED_DELETE_NOT_ALLOWED";

      throw error;
    }

    if (
      this.inventoryPosting?.status ===
      "Posted"
    ) {
      const error = new Error(
        "A posted goods receipt cannot be deleted"
      );

      error.statusCode = 409;
      error.code =
        "GOODS_RECEIVED_ALREADY_POSTED";

      throw error;
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy =
      userId || null;
    this.updatedBy =
      userId || null;

    return this.save({
      session,
    });
  };

/* =========================================================
   VALIDATION
========================================================= */

goodsReceivedSchema.pre(
  "validate",
  function validateGoodsReceived(
    next
  ) {
    const summary =
      this.receivingSummary || {};

    const totalReceivedQuantity =
      roundQuantity(
        summary.totalReceivedQuantity ||
          0
      );

    const totalAcceptedQuantity =
      roundQuantity(
        summary.totalAcceptedQuantity ||
          0
      );

    const totalRejectedQuantity =
      roundQuantity(
        summary.totalRejectedQuantity ||
          0
      );

    const totalDamagedQuantity =
      roundQuantity(
        summary.totalDamagedQuantity ||
          0
      );

    const processedQuantity =
      roundQuantity(
        totalAcceptedQuantity +
          totalRejectedQuantity
      );

    if (
      totalAcceptedQuantity >
      totalReceivedQuantity
    ) {
      this.invalidate(
        "receivingSummary.totalAcceptedQuantity",
        "Accepted quantity cannot exceed received quantity"
      );
    }

    if (
      totalRejectedQuantity >
      totalReceivedQuantity
    ) {
      this.invalidate(
        "receivingSummary.totalRejectedQuantity",
        "Rejected quantity cannot exceed received quantity"
      );
    }

    if (
      totalDamagedQuantity >
      totalReceivedQuantity
    ) {
      this.invalidate(
        "receivingSummary.totalDamagedQuantity",
        "Damaged quantity cannot exceed received quantity"
      );
    }

    if (
      processedQuantity >
      totalReceivedQuantity
    ) {
      this.invalidate(
        "receivingSummary",
        "Accepted and rejected quantities cannot exceed received quantity"
      );
    }

    if (
      this.supplierInvoiceDate &&
      this.receivedDate &&
      this.supplierInvoiceDate >
        this.receivedDate
    ) {
      this.invalidate(
        "supplierInvoiceDate",
        "Supplier invoice date cannot be after received date"
      );
    }

    if (
      this.deliveryChallanDate &&
      this.receivedDate &&
      this.deliveryChallanDate >
        this.receivedDate
    ) {
      this.invalidate(
        "deliveryChallanDate",
        "Delivery challan date cannot be after received date"
      );
    }

    if (
      this.status ===
        "Rejected" &&
      !this.rejectionReason
    ) {
      this.invalidate(
        "rejectionReason",
        "Rejection reason is required"
      );
    }

    if (
      this.status ===
        "Cancelled" &&
      !this.cancellationReason
    ) {
      this.invalidate(
        "cancellationReason",
        "Cancellation reason is required"
      );
    }

    if (
      this.status ===
      "Completed"
    ) {
      if (
        this.inventoryPosting
          ?.status !== "Posted"
      ) {
        this.invalidate(
          "inventoryPosting.status",
          "Inventory must be posted before completing the goods receipt"
        );
      }

      if (!this.completedAt) {
        this.completedAt =
          new Date();
      }
    } else {
      this.completedAt = null;
      this.completedBy = null;
    }

    if (
      this.status ===
      "Cancelled"
    ) {
      if (!this.cancelledAt) {
        this.cancelledAt =
          new Date();
      }
    } else {
      this.cancelledAt = null;
      this.cancelledBy = null;
      this.cancellationReason =
        null;
    }

    if (
      this.inspection?.required &&
      this.inspection.status ===
        "Not Required"
    ) {
      this.inspection.status =
        "Pending";
    }

    next();
  }
);

/* =========================================================
   INDEXES
========================================================= */

goodsReceivedSchema.index(
  {
    tenant: 1,
    goodsReceivedNumber: 1,
  },
  {
    unique: true,
    name:
      "tenant_goods_received_number_unique",
  }
);

goodsReceivedSchema.index({
  tenant: 1,
  purchaseOrder: 1,
  receivedDate: -1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  supplier: 1,
  receivedDate: -1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  warehouse: 1,
  receivedDate: -1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  status: 1,
  receivedDate: -1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  "inspection.status": 1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  "inventoryPosting.status": 1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  supplierInvoiceNumber: 1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  deliveryChallanNumber: 1,
  isDeleted: 1,
});

goodsReceivedSchema.index({
  tenant: 1,
  createdAt: -1,
  isDeleted: 1,
});

/* =========================================================
   QUERY HELPERS
========================================================= */

goodsReceivedSchema.query
  .forTenant = function forTenant(
  tenantId
) {
  return this.where({
    tenant: tenantId,
  });
};

goodsReceivedSchema.query
  .notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

goodsReceivedSchema.query
  .posted = function posted() {
    return this.where({
      "inventoryPosting.status":
        "Posted",
    });
  };

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

goodsReceivedSchema.set(
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
   MODEL EXPORT
========================================================= */

const GoodsReceived =
  mongoose.models.GoodsReceived ||
  mongoose.model(
    "GoodsReceived",
    goodsReceivedSchema
  );

module.exports = GoodsReceived;

module.exports.GOODS_RECEIVED_STATUSES =
  GOODS_RECEIVED_STATUSES;

module.exports.GOODS_RECEIVED_SOURCES =
  GOODS_RECEIVED_SOURCES;

module.exports.INSPECTION_STATUSES =
  INSPECTION_STATUSES;

module.exports.RECEIPT_TYPES =
  RECEIPT_TYPES;

module.exports.INVENTORY_POSTING_STATUSES =
  INVENTORY_POSTING_STATUSES;

module.exports.DOCUMENT_TYPES =
  DOCUMENT_TYPES;