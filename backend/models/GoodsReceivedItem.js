"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const GOODS_RECEIVED_ITEM_STATUSES = [
  "Pending",
  "Pending Inspection",
  "Accepted",
  "Partially Accepted",
  "Rejected",
  "Completed",
  "Cancelled",
];

const ITEM_INSPECTION_STATUSES = [
  "Not Required",
  "Pending",
  "In Progress",
  "Passed",
  "Partially Passed",
  "Failed",
];

const INVENTORY_POSTING_STATUSES = [
  "Not Posted",
  "Partially Posted",
  "Posted",
  "Reversed",
];

const QUALITY_GRADES = [
  "Not Graded",
  "A",
  "B",
  "C",
  "Rejected",
];

const DISCOUNT_TYPES = [
  "None",
  "Percentage",
  "Fixed",
];

const TAX_TYPES = [
  "None",
  "Percentage",
  "Fixed",
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
        set: normalizeUppercaseString,
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
   BATCH INFORMATION SCHEMA
========================================================= */

const batchInformationSchema =
  new mongoose.Schema(
    {
      batchNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      lotNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      manufacturingDate: {
        type: Date,
        default: null,
      },

      expiryDate: {
        type: Date,
        default: null,
      },

      supplierBatchNumber: {
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
   SERIAL NUMBER SCHEMA
========================================================= */

const serialNumberSchema =
  new mongoose.Schema(
    {
      serialNumber: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250,
        set: normalizeRequiredString,
      },

      imeiNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      accepted: {
        type: Boolean,
        default: true,
      },

      rejectionReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
        set: normalizeOptionalString,
      },
    },
    {
      _id: true,
    }
  );

/* =========================================================
   INSPECTION SCHEMA
========================================================= */

const inspectionSchema =
  new mongoose.Schema(
    {
      required: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,
        enum:
          ITEM_INSPECTION_STATUSES,
        default: "Not Required",
      },

      qualityGrade: {
        type: String,
        enum: QUALITY_GRADES,
        default: "Not Graded",
      },

      inspectedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      passedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      failedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      inspectedAt: {
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

      stockTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryTransaction",
        default: null,
      },

      inventoryStock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryStock",
        default: null,
      },

      postingReference: {
        type: String,
        default: null,
        trim: true,
        maxlength: 150,
        set: normalizeOptionalString,
      },

      failureReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      postedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
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
    },
    {
      _id: false,
    }
  );

/* =========================================================
   GOODS RECEIVED ITEM SCHEMA
========================================================= */

const goodsReceivedItemSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      goodsReceived: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoodsReceived",
        required: true,
        immutable: true,
        index: true,
      },

      purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        default: null,
        index: true,
      },

      purchaseOrderItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrderItem",
        default: null,
        index: true,
      },

      supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
        immutable: true,
        index: true,
      },

      warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
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
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      previouslyReceivedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      receivedQuantity: {
        type: Number,
        required: true,
        min: 0.0001,
        set: roundQuantity,
      },

      acceptedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      rejectedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      damagedQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      shortQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      excessQuantity: {
        type: Number,
        default: 0,
        min: 0,
        set: roundQuantity,
      },

      pendingQuantity: {
        type: Number,
        default: 0,
        min: 0,
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

      taxType: {
        type: String,
        enum: TAX_TYPES,
        default: "None",
      },

      taxValue: {
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

      subtotal: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      lineTotal: {
        type: Number,
        default: 0,
        min: 0,
        set: roundMoney,
      },

      batchInformation: {
        type: batchInformationSchema,
        default: () => ({}),
      },

      serialNumbers: {
        type: [serialNumberSchema],
        default: [],
      },

      inspection: {
        type: inspectionSchema,
        default: () => ({}),
      },

      inventoryPosting: {
        type: inventoryPostingSchema,
        default: () => ({}),
      },

      storageLocation: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200,
        set: normalizeOptionalString,
      },

      rackNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      binNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      status: {
        type: String,
        enum:
          GOODS_RECEIVED_ITEM_STATUSES,
        default: "Pending",
        required: true,
        index: true,
      },

      rejectionReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      damageDescription: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      note: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
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
   QUANTITY CALCULATION
========================================================= */

goodsReceivedItemSchema.methods
  .calculateQuantitySummary =
  function calculateQuantitySummary() {
    const orderedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.orderedQuantity
          ) || 0,
          0
        )
      );

    const previouslyReceivedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this
              .previouslyReceivedQuantity
          ) || 0,
          0
        )
      );

    const receivedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.receivedQuantity
          ) || 0,
          0
        )
      );

    const acceptedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.acceptedQuantity
          ) || 0,
          0
        )
      );

    const rejectedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.rejectedQuantity
          ) || 0,
          0
        )
      );

    const damagedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.damagedQuantity
          ) || 0,
          0
        )
      );

    const processedQuantity =
      roundQuantity(
        acceptedQuantity +
          rejectedQuantity
      );

    const remainingOrderQuantity =
      roundQuantity(
        Math.max(
          orderedQuantity -
            previouslyReceivedQuantity,
          0
        )
      );

    const shortQuantity =
      roundQuantity(
        Math.max(
          remainingOrderQuantity -
            receivedQuantity,
          0
        )
      );

    const excessQuantity =
      roundQuantity(
        Math.max(
          receivedQuantity -
            remainingOrderQuantity,
          0
        )
      );

    const pendingQuantity =
      roundQuantity(
        Math.max(
          receivedQuantity -
            processedQuantity,
          0
        )
      );

    this.orderedQuantity =
      orderedQuantity;

    this.previouslyReceivedQuantity =
      previouslyReceivedQuantity;

    this.receivedQuantity =
      receivedQuantity;

    this.acceptedQuantity =
      acceptedQuantity;

    this.rejectedQuantity =
      rejectedQuantity;

    this.damagedQuantity =
      damagedQuantity;

    this.shortQuantity =
      shortQuantity;

    this.excessQuantity =
      excessQuantity;

    this.pendingQuantity =
      pendingQuantity;

    return {
      orderedQuantity,
      previouslyReceivedQuantity,
      remainingOrderQuantity,
      receivedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      damagedQuantity,
      shortQuantity,
      excessQuantity,
      pendingQuantity,
    };
  };

/* =========================================================
   FINANCIAL CALCULATION
========================================================= */

goodsReceivedItemSchema.methods
  .calculateFinancialSummary =
  function calculateFinancialSummary() {
    const acceptedQuantity =
      roundQuantity(
        Math.max(
          Number(
            this.acceptedQuantity
          ) || 0,
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
      acceptedQuantity * unitCost
    );

    let discountAmount = 0;

    if (
      this.discountType ===
      "Percentage"
    ) {
      const discountPercentage =
        Math.min(
          Math.max(
            Number(
              this.discountValue
            ) || 0,
            0
          ),
          100
        );

      discountAmount =
        roundMoney(
          subtotal *
            (discountPercentage /
              100)
        );
    } else if (
      this.discountType === "Fixed"
    ) {
      discountAmount =
        roundMoney(
          Math.min(
            Math.max(
              Number(
                this.discountValue
              ) || 0,
              0
            ),
            subtotal
          )
        );
    }

    const taxableAmount =
      roundMoney(
        Math.max(
          subtotal -
            discountAmount,
          0
        )
      );

    let taxAmount = 0;

    if (
      this.taxType ===
      "Percentage"
    ) {
      const taxPercentage =
        Math.min(
          Math.max(
            Number(
              this.taxValue
            ) || 0,
            0
          ),
          100
        );

      taxAmount = roundMoney(
        taxableAmount *
          (taxPercentage / 100)
      );
    } else if (
      this.taxType === "Fixed"
    ) {
      taxAmount = roundMoney(
        Math.max(
          Number(this.taxValue) ||
            0,
          0
        )
      );
    }

    const lineTotal = roundMoney(
      taxableAmount + taxAmount
    );

    this.unitCost = unitCost;
    this.subtotal = subtotal;

    this.discountAmount =
      discountAmount;

    this.taxAmount = taxAmount;
    this.lineTotal = lineTotal;

    return {
      acceptedQuantity,
      unitCost,
      subtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  };

/* =========================================================
   STATUS CALCULATION
========================================================= */

goodsReceivedItemSchema.methods
  .calculateStatus =
  function calculateStatus() {
    if (
      this.status === "Cancelled"
    ) {
      return this.status;
    }

    const receivedQuantity =
      Number(
        this.receivedQuantity
      ) || 0;

    const acceptedQuantity =
      Number(
        this.acceptedQuantity
      ) || 0;

    const rejectedQuantity =
      Number(
        this.rejectedQuantity
      ) || 0;

    const pendingQuantity =
      Number(
        this.pendingQuantity
      ) || 0;

    if (
      this.inspection?.required &&
      [
        "Pending",
        "In Progress",
      ].includes(
        this.inspection.status
      )
    ) {
      this.status =
        "Pending Inspection";

      return this.status;
    }

    if (
      rejectedQuantity ===
        receivedQuantity &&
      receivedQuantity > 0
    ) {
      this.status = "Rejected";

      return this.status;
    }

    if (
      acceptedQuantity ===
        receivedQuantity &&
      receivedQuantity > 0 &&
      pendingQuantity === 0
    ) {
      this.status = "Accepted";

      if (
        this.inventoryPosting
          ?.status === "Posted"
      ) {
        this.status = "Completed";
      }

      return this.status;
    }

    if (
      acceptedQuantity > 0 ||
      rejectedQuantity > 0
    ) {
      this.status =
        "Partially Accepted";

      return this.status;
    }

    this.status = "Pending";

    return this.status;
  };

/* =========================================================
   SOFT DELETE
========================================================= */

goodsReceivedItemSchema.methods.softDelete =
  async function softDelete({
    userId,
    session = null,
  } = {}) {
    if (
      this.inventoryPosting?.status ===
      "Posted"
    ) {
      const error = new Error(
        "A posted goods received item cannot be deleted"
      );

      error.statusCode = 409;
      error.code =
        "GOODS_RECEIVED_ITEM_ALREADY_POSTED";

      throw error;
    }

    if (
      this.status !== "Pending" &&
      this.status !==
        "Pending Inspection"
    ) {
      const error = new Error(
        "Only pending goods received items can be deleted"
      );

      error.statusCode = 409;
      error.code =
        "GOODS_RECEIVED_ITEM_DELETE_NOT_ALLOWED";

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

goodsReceivedItemSchema.pre(
  "validate",
  function validateGoodsReceivedItem(
    next
  ) {
    this.calculateQuantitySummary();
    this.calculateFinancialSummary();

    const receivedQuantity =
      Number(
        this.receivedQuantity
      ) || 0;

    const acceptedQuantity =
      Number(
        this.acceptedQuantity
      ) || 0;

    const rejectedQuantity =
      Number(
        this.rejectedQuantity
      ) || 0;

    const damagedQuantity =
      Number(
        this.damagedQuantity
      ) || 0;

    const processedQuantity =
      roundQuantity(
        acceptedQuantity +
          rejectedQuantity
      );

    if (
      acceptedQuantity >
      receivedQuantity
    ) {
      this.invalidate(
        "acceptedQuantity",
        "Accepted quantity cannot exceed received quantity"
      );
    }

    if (
      rejectedQuantity >
      receivedQuantity
    ) {
      this.invalidate(
        "rejectedQuantity",
        "Rejected quantity cannot exceed received quantity"
      );
    }

    if (
      processedQuantity >
      receivedQuantity
    ) {
      this.invalidate(
        "receivedQuantity",
        "Accepted and rejected quantities cannot exceed received quantity"
      );
    }

    if (
      damagedQuantity >
      receivedQuantity
    ) {
      this.invalidate(
        "damagedQuantity",
        "Damaged quantity cannot exceed received quantity"
      );
    }

    if (
      this.discountType ===
        "Percentage" &&
      Number(this.discountValue) >
        100
    ) {
      this.invalidate(
        "discountValue",
        "Percentage discount cannot exceed 100"
      );
    }

    if (
      this.taxType ===
        "Percentage" &&
      Number(this.taxValue) > 100
    ) {
      this.invalidate(
        "taxValue",
        "Percentage tax cannot exceed 100"
      );
    }

    if (
      this.batchInformation
        ?.manufacturingDate &&
      this.batchInformation
        ?.expiryDate &&
      this.batchInformation
        .expiryDate <=
        this.batchInformation
          .manufacturingDate
    ) {
      this.invalidate(
        "batchInformation.expiryDate",
        "Expiry date must be after manufacturing date"
      );
    }

    if (
      rejectedQuantity > 0 &&
      !this.rejectionReason
    ) {
      this.invalidate(
        "rejectionReason",
        "Rejection reason is required when quantity is rejected"
      );
    }

    if (
      damagedQuantity > 0 &&
      !this.damageDescription
    ) {
      this.invalidate(
        "damageDescription",
        "Damage description is required when damaged quantity is recorded"
      );
    }

    const serialNumbers =
      Array.isArray(
        this.serialNumbers
      )
        ? this.serialNumbers
        : [];

    const uniqueSerialNumbers =
      new Set();

    serialNumbers.forEach(
      (serialEntry) => {
        const normalizedSerial =
          String(
            serialEntry.serialNumber ||
              ""
          )
            .trim()
            .toUpperCase();

        if (
          uniqueSerialNumbers.has(
            normalizedSerial
          )
        ) {
          this.invalidate(
            "serialNumbers",
            `Duplicate serial number: ${serialEntry.serialNumber}`
          );
        }

        uniqueSerialNumbers.add(
          normalizedSerial
        );

        if (
          serialEntry.accepted ===
            false &&
          !serialEntry.rejectionReason
        ) {
          this.invalidate(
            "serialNumbers",
            "Serial number rejection reason is required"
          );
        }
      }
    );

    if (
      this.inspection?.required &&
      this.inspection.status ===
        "Not Required"
    ) {
      this.inspection.status =
        "Pending";
    }

    if (
      !this.inspection?.required
    ) {
      this.inspection.status =
        "Not Required";

      this.inspection.inspectedQuantity =
        0;

      this.inspection.passedQuantity =
        0;

      this.inspection.failedQuantity =
        0;
    }

    const inspectedQuantity =
      Number(
        this.inspection
          ?.inspectedQuantity
      ) || 0;

    const passedQuantity =
      Number(
        this.inspection
          ?.passedQuantity
      ) || 0;

    const failedQuantity =
      Number(
        this.inspection
          ?.failedQuantity
      ) || 0;

    if (
      inspectedQuantity >
      receivedQuantity
    ) {
      this.invalidate(
        "inspection.inspectedQuantity",
        "Inspected quantity cannot exceed received quantity"
      );
    }

    if (
      passedQuantity +
        failedQuantity >
      inspectedQuantity
    ) {
      this.invalidate(
        "inspection",
        "Passed and failed quantities cannot exceed inspected quantity"
      );
    }

    if (
      ["Partially Posted", "Posted"].includes(
        this.inventoryPosting?.status
      )
    ) {
      const postedQuantity =
        Number(
          this.inventoryPosting
            .postedQuantity
        ) || 0;

      if (
        postedQuantity >
        acceptedQuantity
      ) {
        this.invalidate(
          "inventoryPosting.postedQuantity",
          "Posted quantity cannot exceed accepted quantity"
        );
      }

      if (
        !this.inventoryPosting
          .stockTransaction
      ) {
        this.invalidate(
          "inventoryPosting.stockTransaction",
          "Stock transaction is required for posted items"
        );
      }

      if (
        !this.inventoryPosting
          .postedAt
      ) {
        this.inventoryPosting.postedAt =
          new Date();
      }
    }

    this.calculateStatus();

    next();
  }
);

/* =========================================================
   INDEXES
========================================================= */

goodsReceivedItemSchema.index(
  {
    tenant: 1,
    goodsReceived: 1,
    lineNumber: 1,
  },
  {
    unique: true,
    name:
      "tenant_goods_received_line_unique",
  }
);

goodsReceivedItemSchema.index({
  tenant: 1,
  goodsReceived: 1,
  isDeleted: 1,
  lineNumber: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  purchaseOrder: 1,
  purchaseOrderItem: 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  supplier: 1,
  product: 1,
  createdAt: -1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  warehouse: 1,
  product: 1,
  createdAt: -1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  status: 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  "inspection.status": 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  "inventoryPosting.status": 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  "batchInformation.batchNumber": 1,
  product: 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  "batchInformation.expiryDate": 1,
  isDeleted: 1,
});

goodsReceivedItemSchema.index({
  tenant: 1,
  "serialNumbers.serialNumber": 1,
  isDeleted: 1,
});

/* =========================================================
   QUERY HELPERS
========================================================= */

goodsReceivedItemSchema.query
  .forTenant = function forTenant(
  tenantId
) {
  return this.where({
    tenant: tenantId,
  });
};

goodsReceivedItemSchema.query
  .notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

goodsReceivedItemSchema.query
  .forReceipt =
  function forReceipt(
    goodsReceivedId
  ) {
    return this.where({
      goodsReceived:
        goodsReceivedId,
    });
  };

goodsReceivedItemSchema.query
  .notPosted =
  function notPosted() {
    return this.where({
      "inventoryPosting.status":
        "Not Posted",
    });
  };

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

goodsReceivedItemSchema.set(
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

const GoodsReceivedItem =
  mongoose.models
    .GoodsReceivedItem ||
  mongoose.model(
    "GoodsReceivedItem",
    goodsReceivedItemSchema
  );

module.exports =
  GoodsReceivedItem;

module.exports.GOODS_RECEIVED_ITEM_STATUSES =
  GOODS_RECEIVED_ITEM_STATUSES;

module.exports.ITEM_INSPECTION_STATUSES =
  ITEM_INSPECTION_STATUSES;

module.exports.INVENTORY_POSTING_STATUSES =
  INVENTORY_POSTING_STATUSES;

module.exports.QUALITY_GRADES =
  QUALITY_GRADES;

module.exports.DISCOUNT_TYPES =
  DISCOUNT_TYPES;

module.exports.TAX_TYPES =
  TAX_TYPES;