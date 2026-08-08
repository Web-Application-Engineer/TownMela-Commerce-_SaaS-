"use strict";

const mongoose = require("mongoose");

const { Schema, model } = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const ITEM_STATUSES = [
  "Draft",
  "Matched",
  "Mismatch",
  "Approved",
  "Cancelled",
];

const MATCHING_STATUSES = [
  "Not Matched",
  "Matched",
  "Quantity Mismatch",
  "Price Mismatch",
  "Tax Mismatch",
  "Multiple Mismatch",
];

const DISCOUNT_TYPES = [
  "None",
  "Percentage",
  "Fixed",
];

const QUANTITY_PRECISION = 4;
const AMOUNT_PRECISION = 2;
const RATE_PRECISION = 6;

/* =========================================================
   HELPERS
========================================================= */

const roundNumber = (
  value,
  precision = AMOUNT_PRECISION
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const multiplier = 10 ** precision;

  return (
    Math.round(
      (numericValue + Number.EPSILON) *
        multiplier
    ) / multiplier
  );
};

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();

  return normalized || null;
};

/* =========================================================
   PRODUCT SNAPSHOT SCHEMA
========================================================= */

const productSnapshotSchema =
  new Schema(
    {
      productName: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },

      sku: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      barcode: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      unitName: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      unitCode: {
        type: String,
        trim: true,
        maxlength: 50,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   VARIANT SNAPSHOT SCHEMA
========================================================= */

const variantSnapshotSchema =
  new Schema(
    {
      variantName: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },

      sku: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      barcode: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      attributes: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   DISCOUNT SCHEMA
========================================================= */

const discountSchema = new Schema(
  {
    type: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: "None",
    },

    rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   TAX SCHEMA
========================================================= */

const taxSchema = new Schema(
  {
    taxCode: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    taxName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    withholdingTaxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    withholdingTaxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    inclusive: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   MATCHING SCHEMA
========================================================= */

const matchingSchema = new Schema(
  {
    status: {
      type: String,
      enum: MATCHING_STATUSES,
      default: "Not Matched",
    },

    purchaseOrderQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    goodsReceivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoiceQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseOrderUnitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoiceUnitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantityVariance: {
      type: Number,
      default: 0,
    },

    priceVariance: {
      type: Number,
      default: 0,
    },

    taxVariance: {
      type: Number,
      default: 0,
    },

    quantityMatched: {
      type: Boolean,
      default: false,
    },

    priceMatched: {
      type: Boolean,
      default: false,
    },

    taxMatched: {
      type: Boolean,
      default: false,
    },

    matchedAt: {
      type: Date,
      default: null,
    },

    matchedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    mismatchReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   ACCOUNTING ALLOCATION SCHEMA
========================================================= */

const accountingAllocationSchema =
  new Schema(
    {
      expenseAccount: {
        type: Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        default: null,
      },

      inventoryAccount: {
        type: Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        default: null,
      },

      taxAccount: {
        type: Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        default: null,
      },

      withholdingTaxAccount: {
        type: Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        default: null,
      },

      costCenter: {
        type: Schema.Types.ObjectId,
        ref: "CostCenter",
        default: null,
      },

      department: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        default: null,
      },

      project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   VENDOR INVOICE ITEM SCHEMA
========================================================= */

const vendorInvoiceItemSchema =
  new Schema(
    {
      /* =====================================================
         TENANT AND PARENT
      ===================================================== */

      tenant: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [
          true,
          "Tenant is required",
        ],
        index: true,
      },

      vendorInvoice: {
        type: Schema.Types.ObjectId,
        ref: "VendorInvoice",
        required: [
          true,
          "Vendor invoice is required",
        ],
        index: true,
      },

      lineNumber: {
        type: Number,
        required: [
          true,
          "Line number is required",
        ],
        min: 1,
      },

      /* =====================================================
         PURCHASE REFERENCES
      ===================================================== */

      purchaseOrder: {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        default: null,
        index: true,
      },

      purchaseOrderItem: {
        type: Schema.Types.ObjectId,
        ref: "PurchaseOrderItem",
        default: null,
        index: true,
      },

      goodsReceived: {
        type: Schema.Types.ObjectId,
        ref: "GoodsReceived",
        default: null,
        index: true,
      },

      goodsReceivedItem: {
        type: Schema.Types.ObjectId,
        ref: "GoodsReceivedItem",
        default: null,
        index: true,
      },

      /* =====================================================
         PRODUCT REFERENCES
      ===================================================== */

      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: [
          true,
          "Product is required",
        ],
        index: true,
      },

      /*
        ProductVariant model is not currently registered
        in the startup version.

        We keep the variant ObjectId field for data
        compatibility, but we do NOT populate it until
        a ProductVariant model is actually implemented.
      */
      variant: {
        type: Schema.Types.ObjectId,
        ref: "ProductVariant",
        default: null,
        index: true,
      },

      productSnapshot: {
        type: productSnapshotSchema,
        default: () => ({}),
      },

      variantSnapshot: {
        type: variantSnapshotSchema,
        default: () => ({}),
      },

      /* =====================================================
         QUANTITY
      ===================================================== */

      invoicedQuantity: {
        type: Number,
        required: [
          true,
          "Invoiced quantity is required",
        ],
        min: 0,
      },

      acceptedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      rejectedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      returnedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      payableQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      unit: {
        type: Schema.Types.ObjectId,
        ref: "Unit",
        default: null,
      },

      conversionFactor: {
        type: Number,
        default: 1,
        min: 0,
      },

      baseQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================================
         PRICING
      ===================================================== */

      unitPrice: {
        type: Number,
        required: [
          true,
          "Unit price is required",
        ],
        min: 0,
      },

      baseUnitPrice: {
        type: Number,
        default: 0,
        min: 0,
      },

      grossAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      discount: {
        type: discountSchema,
        default: () => ({}),
      },

      netAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      tax: {
        type: taxSchema,
        default: () => ({}),
      },

      shippingAllocation: {
        type: Number,
        default: 0,
        min: 0,
      },

      otherChargeAllocation: {
        type: Number,
        default: 0,
        min: 0,
      },

      roundOffAllocation: {
        type: Number,
        default: 0,
      },

      lineTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      baseCurrencyLineTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================================
         MATCHING
      ===================================================== */

      matching: {
        type: matchingSchema,
        default: () => ({}),
      },

      /* =====================================================
         ACCOUNTING
      ===================================================== */

      accountingAllocation: {
        type: accountingAllocationSchema,
        default: () => ({}),
      },

      /* =====================================================
         STATUS
      ===================================================== */

      status: {
        type: String,
        enum: ITEM_STATUSES,
        default: "Draft",
        index: true,
      },

      remarks: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Created by user is required",
        ],
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Updated by user is required",
        ],
      },

      /* =====================================================
         SOFT DELETE
      ===================================================== */

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
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      deleteReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      minimize: false,

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   UNIQUE INDEXES
========================================================= */

vendorInvoiceItemSchema.index(
  {
    tenant: 1,
    vendorInvoice: 1,
    lineNumber: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },

    name:
      "unique_active_vendor_invoice_line",
  }
);

/* =========================================================
   SUPPORTING INDEXES
========================================================= */

vendorInvoiceItemSchema.index({
  tenant: 1,
  vendorInvoice: 1,
  isDeleted: 1,
  lineNumber: 1,
});

vendorInvoiceItemSchema.index({
  tenant: 1,
  product: 1,
  variant: 1,
  isDeleted: 1,
});

vendorInvoiceItemSchema.index({
  tenant: 1,
  purchaseOrderItem: 1,
  isDeleted: 1,
});

vendorInvoiceItemSchema.index({
  tenant: 1,
  goodsReceivedItem: 1,
  isDeleted: 1,
});

vendorInvoiceItemSchema.index({
  tenant: 1,
  "matching.status": 1,
  isDeleted: 1,
});

vendorInvoiceItemSchema.index({
  tenant: 1,
  status: 1,
  isDeleted: 1,
});

/* =========================================================
   VIRTUALS
========================================================= */

vendorInvoiceItemSchema.virtual(
  "hasMismatch"
).get(function getHasMismatch() {
  return (
    this.matching?.status !==
      "Not Matched" &&
    this.matching?.status !==
      "Matched"
  );
});

vendorInvoiceItemSchema.virtual(
  "quantityVarianceAbsolute"
).get(
  function getQuantityVarianceAbsolute() {
    return Math.abs(
      Number(
        this.matching
          ?.quantityVariance || 0
      )
    );
  }
);

vendorInvoiceItemSchema.virtual(
  "priceVarianceAbsolute"
).get(
  function getPriceVarianceAbsolute() {
    return Math.abs(
      Number(
        this.matching
          ?.priceVariance || 0
      )
    );
  }
);

/* =========================================================
   QUERY HELPERS
========================================================= */

vendorInvoiceItemSchema.query.forTenant =
  function forTenant(tenantId) {
    return this.where({
      tenant: tenantId,
    });
  };

vendorInvoiceItemSchema.query.notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

vendorInvoiceItemSchema.query.forInvoice =
  function forInvoice(
    vendorInvoiceId
  ) {
    return this.where({
      vendorInvoice:
        vendorInvoiceId,
      isDeleted: false,
    });
  };

vendorInvoiceItemSchema.query.mismatched =
  function mismatched() {
    return this.where({
      "matching.status": {
        $nin: [
          "Not Matched",
          "Matched",
        ],
      },

      isDeleted: false,
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

vendorInvoiceItemSchema.methods
  .calculateQuantitySummary =
  function calculateQuantitySummary() {
    const invoicedQuantity =
      roundNumber(
        this.invoicedQuantity,
        QUANTITY_PRECISION
      );

    const acceptedQuantity =
      roundNumber(
        this.acceptedQuantity,
        QUANTITY_PRECISION
      );

    const rejectedQuantity =
      roundNumber(
        this.rejectedQuantity,
        QUANTITY_PRECISION
      );

    const returnedQuantity =
      roundNumber(
        this.returnedQuantity,
        QUANTITY_PRECISION
      );

    this.payableQuantity =
      roundNumber(
        Math.max(
          acceptedQuantity -
            returnedQuantity,
          0
        ),
        QUANTITY_PRECISION
      );

    if (
      acceptedQuantity === 0 &&
      rejectedQuantity === 0
    ) {
      this.payableQuantity =
        invoicedQuantity;
    }

    this.baseQuantity =
      roundNumber(
        this.payableQuantity *
          Number(
            this.conversionFactor ||
              1
          ),
        QUANTITY_PRECISION
      );

    return {
      invoicedQuantity:
        this.invoicedQuantity,

      payableQuantity:
        this.payableQuantity,

      baseQuantity:
        this.baseQuantity,
    };
  };

vendorInvoiceItemSchema.methods
  .calculateFinancialSummary =
  function calculateFinancialSummary({
    exchangeRate = 1,
  } = {}) {
    const quantity =
      roundNumber(
        this.payableQuantity ||
          this.invoicedQuantity,
        QUANTITY_PRECISION
      );

    const unitPrice =
      roundNumber(
        this.unitPrice,
        RATE_PRECISION
      );

    this.grossAmount =
      roundNumber(
        quantity * unitPrice
      );

    let discountAmount =
      roundNumber(
        this.discount?.amount || 0
      );

    if (
      this.discount?.type ===
      "Percentage"
    ) {
      discountAmount =
        roundNumber(
          this.grossAmount *
            (Number(
              this.discount.rate || 0
            ) /
              100)
        );
    }

    if (
      this.discount?.type ===
      "None"
    ) {
      discountAmount = 0;
    }

    this.discount.amount =
      discountAmount;

    this.netAmount =
      roundNumber(
        Math.max(
          this.grossAmount -
            discountAmount,
          0
        )
      );

    this.tax.taxableAmount =
      this.netAmount;

    if (
      !this.tax.inclusive
    ) {
      this.tax.taxAmount =
        roundNumber(
          this.netAmount *
            (Number(
              this.tax.taxRate || 0
            ) /
              100)
        );
    }

    this.tax.withholdingTaxAmount =
      roundNumber(
        this.netAmount *
          (Number(
            this.tax
              .withholdingTaxRate ||
              0
          ) /
            100)
      );

    this.lineTotal =
      roundNumber(
        this.netAmount +
          Number(
            this.tax.taxAmount ||
              0
          ) +
          Number(
            this.shippingAllocation ||
              0
          ) +
          Number(
            this.otherChargeAllocation ||
              0
          ) +
          Number(
            this.roundOffAllocation ||
              0
          ) -
          Number(
            this.tax
              .withholdingTaxAmount ||
              0
          )
      );

    this.baseCurrencyLineTotal =
      roundNumber(
        this.lineTotal *
          Number(exchangeRate || 1)
      );

    this.baseUnitPrice =
      roundNumber(
        this.unitPrice *
          Number(exchangeRate || 1),
        RATE_PRECISION
      );

    return {
      grossAmount:
        this.grossAmount,

      discountAmount:
        this.discount.amount,

      netAmount:
        this.netAmount,

      taxAmount:
        this.tax.taxAmount,

      withholdingTaxAmount:
        this.tax
          .withholdingTaxAmount,

      lineTotal:
        this.lineTotal,

      baseCurrencyLineTotal:
        this.baseCurrencyLineTotal,
    };
  };

vendorInvoiceItemSchema.methods
  .calculateMatching =
  function calculateMatching({
    quantityTolerance = 0,
    priceTolerance = 0,
    taxTolerance = 0,
    userId = null,
  } = {}) {
    const poQuantity =
      roundNumber(
        this.matching
          .purchaseOrderQuantity,
        QUANTITY_PRECISION
      );

    const receivedQuantity =
      roundNumber(
        this.matching
          .goodsReceivedQuantity,
        QUANTITY_PRECISION
      );

    const invoiceQuantity =
      roundNumber(
        this.invoicedQuantity,
        QUANTITY_PRECISION
      );

    const poUnitPrice =
      roundNumber(
        this.matching
          .purchaseOrderUnitPrice,
        RATE_PRECISION
      );

    const invoiceUnitPrice =
      roundNumber(
        this.unitPrice,
        RATE_PRECISION
      );

    this.matching.invoiceQuantity =
      invoiceQuantity;

    this.matching.invoiceUnitPrice =
      invoiceUnitPrice;

    this.matching.quantityVariance =
      roundNumber(
        invoiceQuantity -
          receivedQuantity,
        QUANTITY_PRECISION
      );

    this.matching.priceVariance =
      roundNumber(
        invoiceUnitPrice -
          poUnitPrice,
        RATE_PRECISION
      );

    this.matching.quantityMatched =
      Math.abs(
        this.matching
          .quantityVariance
      ) <= quantityTolerance;

    this.matching.priceMatched =
      Math.abs(
        this.matching
          .priceVariance
      ) <= priceTolerance;

    this.matching.taxMatched =
      Math.abs(
        Number(
          this.matching
            .taxVariance || 0
        )
      ) <= taxTolerance;

    const mismatches = [];

    if (
      !this.matching
        .quantityMatched
    ) {
      mismatches.push(
        "quantity"
      );
    }

    if (
      !this.matching
        .priceMatched
    ) {
      mismatches.push(
        "price"
      );
    }

    if (
      !this.matching
        .taxMatched
    ) {
      mismatches.push(
        "tax"
      );
    }

    if (
      mismatches.length === 0
    ) {
      this.matching.status =
        "Matched";

      this.status =
        "Matched";
    } else if (
      mismatches.length > 1
    ) {
      this.matching.status =
        "Multiple Mismatch";

      this.status =
        "Mismatch";
    } else if (
      mismatches[0] ===
      "quantity"
    ) {
      this.matching.status =
        "Quantity Mismatch";

      this.status =
        "Mismatch";
    } else if (
      mismatches[0] ===
      "price"
    ) {
      this.matching.status =
        "Price Mismatch";

      this.status =
        "Mismatch";
    } else {
      this.matching.status =
        "Tax Mismatch";

      this.status =
        "Mismatch";
    }

    this.matching.matchedAt =
      new Date();

    this.matching.matchedBy =
      userId;

    return {
      status:
        this.matching.status,

      quantityMatched:
        this.matching
          .quantityMatched,

      priceMatched:
        this.matching
          .priceMatched,

      taxMatched:
        this.matching
          .taxMatched,
    };
  };

vendorInvoiceItemSchema.methods
  .softDelete =
  function softDelete({
    userId,
    reason = null,
  }) {
    if (
      this.status ===
      "Approved"
    ) {
      throw new Error(
        "Approved vendor invoice item cannot be deleted"
      );
    }

    this.isDeleted = true;
    this.deletedAt =
      new Date();
    this.deletedBy =
      userId;
    this.deleteReason =
      normalizeText(reason);
    this.updatedBy =
      userId;

    return this;
  };

vendorInvoiceItemSchema.methods
  .restore =
  function restore({
    userId,
  }) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deleteReason = null;
    this.updatedBy = userId;

    return this;
  };

/* =========================================================
   VALIDATION MIDDLEWARE
========================================================= */

vendorInvoiceItemSchema.pre(
  "validate",
  function validateVendorInvoiceItem(
    next
  ) {
    try {
      this.remarks =
        normalizeText(
          this.remarks
        );

      this.invoicedQuantity =
        roundNumber(
          this.invoicedQuantity,
          QUANTITY_PRECISION
        );

      this.acceptedQuantity =
        roundNumber(
          this.acceptedQuantity,
          QUANTITY_PRECISION
        );

      this.rejectedQuantity =
        roundNumber(
          this.rejectedQuantity,
          QUANTITY_PRECISION
        );

      this.returnedQuantity =
        roundNumber(
          this.returnedQuantity,
          QUANTITY_PRECISION
        );

      this.unitPrice =
        roundNumber(
          this.unitPrice,
          RATE_PRECISION
        );

      this.conversionFactor =
        roundNumber(
          this.conversionFactor,
          RATE_PRECISION
        );

      if (
        this.invoicedQuantity <= 0
      ) {
        return next(
          new Error(
            "Invoiced quantity must be greater than zero"
          )
        );
      }

      if (
        this.unitPrice < 0
      ) {
        return next(
          new Error(
            "Unit price cannot be negative"
          )
        );
      }

      if (
        this.acceptedQuantity >
        this.invoicedQuantity
      ) {
        return next(
          new Error(
            "Accepted quantity cannot exceed invoiced quantity"
          )
        );
      }

      if (
        this.rejectedQuantity >
        this.invoicedQuantity
      ) {
        return next(
          new Error(
            "Rejected quantity cannot exceed invoiced quantity"
          )
        );
      }

      if (
        this.acceptedQuantity +
          this.rejectedQuantity >
        this.invoicedQuantity
      ) {
        return next(
          new Error(
            "Accepted and rejected quantities cannot exceed invoiced quantity"
          )
        );
      }

      if (
        this.returnedQuantity >
        this.acceptedQuantity
      ) {
        return next(
          new Error(
            "Returned quantity cannot exceed accepted quantity"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   SAVE MIDDLEWARE
========================================================= */

vendorInvoiceItemSchema.pre(
  "save",
  function prepareVendorInvoiceItem(
    next
  ) {
    try {
      this.calculateQuantitySummary();

      this.calculateFinancialSummary();

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   STATIC METHODS
========================================================= */

vendorInvoiceItemSchema.statics
  .getInvoiceItems =
  function getInvoiceItems({
    tenantId,
    vendorInvoiceId,
  }) {
    return this.find({
      tenant: tenantId,

      vendorInvoice:
        vendorInvoiceId,

      isDeleted: false,
    })
      .sort({
        lineNumber: 1,
      })
      .populate(
        "product",
        "name sku barcode"
      )
      /*
        IMPORTANT:
        Do not populate "variant" here until
        ProductVariant model is implemented
        and registered with mongoose.
      */
      .populate(
        "purchaseOrderItem"
      )
      .populate(
        "goodsReceivedItem"
      );
  };

vendorInvoiceItemSchema.statics
  .getInvoiceFinancialSummary =
  async function getInvoiceFinancialSummary({
    tenantId,
    vendorInvoiceId,
  }) {
    const [summary] =
      await this.aggregate([
        {
          $match: {
            tenant:
              new mongoose.Types.ObjectId(
                tenantId
              ),

            vendorInvoice:
              new mongoose.Types.ObjectId(
                vendorInvoiceId
              ),

            isDeleted: false,
          },
        },

        {
          $group: {
            _id: null,

            totalItems: {
              $sum: 1,
            },

            totalQuantity: {
              $sum:
                "$invoicedQuantity",
            },

            subtotal: {
              $sum:
                "$grossAmount",
            },

            totalDiscount: {
              $sum:
                "$discount.amount",
            },

            totalTax: {
              $sum:
                "$tax.taxAmount",
            },

            totalWithholdingTax: {
              $sum:
                "$tax.withholdingTaxAmount",
            },

            totalShipping: {
              $sum:
                "$shippingAllocation",
            },

            totalOtherCharges: {
              $sum:
                "$otherChargeAllocation",
            },

            grandTotal: {
              $sum:
                "$lineTotal",
            },
          },
        },
      ]);

    return (
      summary || {
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        totalWithholdingTax: 0,
        totalShipping: 0,
        totalOtherCharges: 0,
        grandTotal: 0,
      }
    );
  };

/* =========================================================
   MODEL
========================================================= */

const VendorInvoiceItem = model(
  "VendorInvoiceItem",
  vendorInvoiceItemSchema
);

module.exports =
  VendorInvoiceItem;