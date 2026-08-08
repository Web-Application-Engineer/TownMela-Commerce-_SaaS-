"use strict";

const mongoose = require("mongoose");

const { Schema, model } = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const INVOICE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
  "Disputed",
];

const MATCHING_STATUSES = [
  "Not Matched",
  "Partially Matched",
  "Matched",
  "Mismatch",
];

const PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overpaid",
];

const APPROVAL_STATUSES = [
  "Not Required",
  "Pending",
  "Approved",
  "Rejected",
];

const CURRENCIES = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
];

/* =========================================================
   HELPERS
========================================================= */

const roundAmount = (
  value,
  precision = 2
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
   TAX SUMMARY SCHEMA
========================================================= */

const taxSummarySchema = new Schema(
  {
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

    withholdingTaxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxInclusive: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   DISCOUNT SUMMARY SCHEMA
========================================================= */

const discountSummarySchema = new Schema(
  {
    discountType: {
      type: String,
      enum: [
        "None",
        "Percentage",
        "Fixed",
      ],
      default: "None",
    },

    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountAmount: {
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
   PAYMENT SUMMARY SCHEMA
========================================================= */

const paymentSummarySchema = new Schema(
  {
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDebitNoteApplied: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCreditApplied: {
      type: Number,
      default: 0,
      min: 0,
    },

    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Unpaid",
    },

    lastPaymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   APPROVAL SCHEMA
========================================================= */

const approvalSchema = new Schema(
  {
    required: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "Not Required",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
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
   THREE-WAY MATCHING SCHEMA
========================================================= */

const matchingSchema = new Schema(
  {
    status: {
      type: String,
      enum: MATCHING_STATUSES,
      default: "Not Matched",
    },

    purchaseOrderMatched: {
      type: Boolean,
      default: false,
    },

    goodsReceivedMatched: {
      type: Boolean,
      default: false,
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
      maxlength: 3000,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   STATUS HISTORY SCHEMA
========================================================= */

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    _id: true,
  }
);

/* =========================================================
   ATTACHMENT SCHEMA
========================================================= */

const attachmentSchema = new Schema(
  {
    fileName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 300,
    },

    fileUrl: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },

    mimeType: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    fileSize: {
      type: Number,
      min: 0,
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    _id: true,
  }
);

/* =========================================================
   VENDOR INVOICE SCHEMA
========================================================= */

const vendorInvoiceSchema = new Schema(
  {
    /* =====================================================
       TENANT
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

    /* =====================================================
       INVOICE IDENTITY
    ===================================================== */

    invoiceNumber: {
      type: String,
      required: [
        true,
        "Invoice number is required",
      ],
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    supplierInvoiceNumber: {
      type: String,
      required: [
        true,
        "Supplier invoice number is required",
      ],
      trim: true,
      maxlength: 150,
    },

    invoiceDate: {
      type: Date,
      required: [
        true,
        "Invoice date is required",
      ],
      index: true,
    },

    postingDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      required: [
        true,
        "Due date is required",
      ],
      index: true,
    },

    accountingPeriod: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },

    /* =====================================================
       SUPPLIER
    ===================================================== */

    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: [
        true,
        "Supplier is required",
      ],
      index: true,
    },

    supplierSnapshot: {
      supplierCode: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      supplierName: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },

      taxNumber: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 200,
        default: null,
      },

      address: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },
    },

    /* =====================================================
       PURCHASING REFERENCES
    ===================================================== */

    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
      index: true,
    },

    goodsReceived: {
      type: Schema.Types.ObjectId,
      ref: "GoodsReceived",
      default: null,
      index: true,
    },

    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },

    /* =====================================================
       CURRENCY
    ===================================================== */

    currency: {
      type: String,
      enum: CURRENCIES,
      default: "BDT",
    },

    exchangeRate: {
      type: Number,
      default: 1,
      min: 0,
    },

    baseCurrency: {
      type: String,
      enum: CURRENCIES,
      default: "BDT",
    },

    /* =====================================================
       FINANCIAL SUMMARY
    ===================================================== */

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountSummary: {
      type: discountSummarySchema,
      default: () => ({}),
    },

    taxSummary: {
      type: taxSummarySchema,
      default: () => ({}),
    },

    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    roundOffAmount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    baseCurrencyTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentSummary: {
      type: paymentSummarySchema,
      default: () => ({}),
    },

    /* =====================================================
       MATCHING
    ===================================================== */

    matching: {
      type: matchingSchema,
      default: () => ({}),
    },

    /* =====================================================
       APPROVAL
    ===================================================== */

    approval: {
      type: approvalSchema,
      default: () => ({}),
    },

    /* =====================================================
       STATUS
    ===================================================== */

    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "Draft",
      index: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    /* =====================================================
       TERMS AND NOTES
    ===================================================== */

    paymentTerms: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: null,
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: null,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    /* =====================================================
       ACCOUNTING POSTING
    ===================================================== */

    accountingPosting: {
      posted: {
        type: Boolean,
        default: false,
      },

      journalEntry: {
        type: Schema.Types.ObjectId,
        ref: "JournalEntry",
        default: null,
      },

      postingReference: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      postedAt: {
        type: Date,
        default: null,
      },

      postedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      failureReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },
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

vendorInvoiceSchema.index(
  {
    tenant: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },

    name:
      "unique_active_vendor_invoice_number",
  }
);

vendorInvoiceSchema.index(
  {
    tenant: 1,
    supplier: 1,
    supplierInvoiceNumber: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },

    name:
      "unique_supplier_invoice_number",
  }
);

/* =========================================================
   SUPPORTING INDEXES
========================================================= */

vendorInvoiceSchema.index({
  tenant: 1,
  supplier: 1,
  invoiceDate: -1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  status: 1,
  dueDate: 1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  purchaseOrder: 1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  goodsReceived: 1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  "paymentSummary.paymentStatus": 1,
  dueDate: 1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  "matching.status": 1,
  isDeleted: 1,
});

vendorInvoiceSchema.index({
  tenant: 1,
  createdAt: -1,
  isDeleted: 1,
});

/* =========================================================
   VIRTUALS
========================================================= */

vendorInvoiceSchema.virtual(
  "isOverdue"
).get(function getIsOverdue() {
  if (
    [
      "Paid",
      "Cancelled",
    ].includes(this.status)
  ) {
    return false;
  }

  if (!this.dueDate) {
    return false;
  }

  return (
    new Date(this.dueDate).getTime() <
      Date.now() &&
    Number(
      this.paymentSummary
        ?.outstandingAmount || 0
    ) > 0
  );
});

vendorInvoiceSchema.virtual(
  "daysOverdue"
).get(function getDaysOverdue() {
  if (!this.isOverdue) {
    return 0;
  }

  const difference =
    Date.now() -
    new Date(this.dueDate).getTime();

  return Math.floor(
    difference /
      (1000 * 60 * 60 * 24)
  );
});

vendorInvoiceSchema.virtual(
  "amountPaid"
).get(function getAmountPaid() {
  return roundAmount(
    this.paymentSummary?.totalPaid || 0
  );
});

vendorInvoiceSchema.virtual(
  "outstandingAmount"
).get(function getOutstandingAmount() {
  return roundAmount(
    this.paymentSummary
      ?.outstandingAmount || 0
  );
});

/* =========================================================
   QUERY HELPERS
========================================================= */

vendorInvoiceSchema.query.forTenant =
  function forTenant(tenantId) {
    return this.where({
      tenant: tenantId,
    });
  };

vendorInvoiceSchema.query.notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

vendorInvoiceSchema.query.draft =
  function draft() {
    return this.where({
      status: "Draft",
      isDeleted: false,
    });
  };

vendorInvoiceSchema.query.approved =
  function approved() {
    return this.where({
      status: "Approved",
      isDeleted: false,
    });
  };

vendorInvoiceSchema.query.unpaid =
  function unpaid() {
    return this.where({
      "paymentSummary.paymentStatus": {
        $in: [
          "Unpaid",
          "Partially Paid",
        ],
      },

      isDeleted: false,
    });
  };

vendorInvoiceSchema.query.overdue =
  function overdue() {
    return this.where({
      dueDate: {
        $lt: new Date(),
      },

      status: {
        $nin: [
          "Paid",
          "Cancelled",
        ],
      },

      "paymentSummary.outstandingAmount": {
        $gt: 0,
      },

      isDeleted: false,
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

vendorInvoiceSchema.methods.calculateFinancialSummary =
  function calculateFinancialSummary() {
    const subtotal = roundAmount(
      this.subtotal
    );

    const discountAmount =
      roundAmount(
        this.discountSummary
          ?.discountAmount || 0
      );

    const taxAmount = roundAmount(
      this.taxSummary?.taxAmount || 0
    );

    const withholdingTaxAmount =
      roundAmount(
        this.taxSummary
          ?.withholdingTaxAmount || 0
      );

    const shippingAmount =
      roundAmount(
        this.shippingAmount || 0
      );

    const otherCharges = roundAmount(
      this.otherCharges || 0
    );

    const roundOffAmount =
      roundAmount(
        this.roundOffAmount || 0
      );

    this.grandTotal = roundAmount(
      subtotal -
        discountAmount +
        taxAmount +
        shippingAmount +
        otherCharges +
        roundOffAmount -
        withholdingTaxAmount
    );

    this.baseCurrencyTotal =
      roundAmount(
        this.grandTotal *
          Number(
            this.exchangeRate || 1
          )
      );

    const paidAmount = roundAmount(
      Number(
        this.paymentSummary
          ?.totalPaid || 0
      ) +
        Number(
          this.paymentSummary
            ?.totalDebitNoteApplied ||
            0
        ) +
        Number(
          this.paymentSummary
            ?.totalCreditApplied || 0
        )
    );

    this.paymentSummary.outstandingAmount =
      roundAmount(
        Math.max(
          this.grandTotal -
            paidAmount,
          0
        )
      );

    if (paidAmount <= 0) {
      this.paymentSummary.paymentStatus =
        "Unpaid";
    } else if (
      paidAmount <
      this.grandTotal
    ) {
      this.paymentSummary.paymentStatus =
        "Partially Paid";
    } else if (
      paidAmount ===
      this.grandTotal
    ) {
      this.paymentSummary.paymentStatus =
        "Paid";
    } else {
      this.paymentSummary.paymentStatus =
        "Overpaid";
    }

    return {
      subtotal: this.subtotal,
      grandTotal: this.grandTotal,
      baseCurrencyTotal:
        this.baseCurrencyTotal,
      outstandingAmount:
        this.paymentSummary
          .outstandingAmount,
      paymentStatus:
        this.paymentSummary
          .paymentStatus,
    };
  };

vendorInvoiceSchema.methods.addStatusHistory =
  function addStatusHistory({
    status,
    userId,
    remarks = null,
  }) {
    this.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: userId,
      remarks: normalizeText(
        remarks
      ),
    });

    this.status = status;
    this.updatedBy = userId;

    return this;
  };

vendorInvoiceSchema.methods.softDelete =
  function softDelete({
    userId,
    reason = null,
  }) {
    if (
      ![
        "Draft",
        "Cancelled",
      ].includes(this.status)
    ) {
      throw new Error(
        "Only draft or cancelled vendor invoices can be deleted"
      );
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    this.deleteReason =
      normalizeText(reason);
    this.updatedBy = userId;

    return this;
  };

vendorInvoiceSchema.methods.restore =
  function restore({ userId }) {
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

vendorInvoiceSchema.pre(
  "validate",
  function validateVendorInvoice(next) {
    try {
      this.invoiceNumber =
        normalizeText(
          this.invoiceNumber
        );

      this.supplierInvoiceNumber =
        normalizeText(
          this.supplierInvoiceNumber
        );

      this.paymentTerms =
        normalizeText(
          this.paymentTerms
        );

      this.remarks = normalizeText(
        this.remarks
      );

      this.internalNotes =
        normalizeText(
          this.internalNotes
        );

      this.subtotal = roundAmount(
        this.subtotal
      );

      this.shippingAmount =
        roundAmount(
          this.shippingAmount
        );

      this.otherCharges =
        roundAmount(
          this.otherCharges
        );

      this.roundOffAmount =
        roundAmount(
          this.roundOffAmount
        );

      this.exchangeRate =
        roundAmount(
          this.exchangeRate,
          6
        );

      if (
        this.dueDate &&
        this.invoiceDate &&
        new Date(
          this.dueDate
        ).getTime() <
          new Date(
            this.invoiceDate
          ).getTime()
      ) {
        return next(
          new Error(
            "Due date cannot be earlier than invoice date"
          )
        );
      }

      if (
        this.currency !==
          this.baseCurrency &&
        Number(this.exchangeRate) <=
          0
      ) {
        return next(
          new Error(
            "Exchange rate must be greater than zero"
          )
        );
      }

      if (
        this.status === "Paid" &&
        this.paymentSummary
          .paymentStatus !== "Paid"
      ) {
        return next(
          new Error(
            "Paid invoice must have a paid payment status"
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

vendorInvoiceSchema.pre(
  "save",
  function prepareVendorInvoice(next) {
    try {
      this.calculateFinancialSummary();

      if (
        this.isOverdue &&
        ![
          "Paid",
          "Cancelled",
          "Disputed",
        ].includes(this.status)
      ) {
        this.status = "Overdue";
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   STATIC METHODS
========================================================= */

vendorInvoiceSchema.statics.getOutstandingSummary =
  async function getOutstandingSummary({
    tenantId,
    supplierId = null,
  }) {
    const match = {
      tenant:
        new mongoose.Types.ObjectId(
          tenantId
        ),

      isDeleted: false,

      status: {
        $nin: [
          "Cancelled",
          "Draft",
        ],
      },

      "paymentSummary.outstandingAmount": {
        $gt: 0,
      },
    };

    if (supplierId) {
      match.supplier =
        new mongoose.Types.ObjectId(
          supplierId
        );
    }

    const [summary] =
      await this.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,

            totalInvoices: {
              $sum: 1,
            },

            totalInvoiceAmount: {
              $sum: "$grandTotal",
            },

            totalPaidAmount: {
              $sum:
                "$paymentSummary.totalPaid",
            },

            totalOutstandingAmount: {
              $sum:
                "$paymentSummary.outstandingAmount",
            },

            overdueInvoices: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      "$dueDate",
                      new Date(),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overdueAmount: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      "$dueDate",
                      new Date(),
                    ],
                  },
                  "$paymentSummary.outstandingAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    return (
      summary || {
        totalInvoices: 0,
        totalInvoiceAmount: 0,
        totalPaidAmount: 0,
        totalOutstandingAmount: 0,
        overdueInvoices: 0,
        overdueAmount: 0,
      }
    );
  };

/* =========================================================
   MODEL
========================================================= */

const VendorInvoice = model(
  "VendorInvoice",
  vendorInvoiceSchema
);

module.exports = VendorInvoice;