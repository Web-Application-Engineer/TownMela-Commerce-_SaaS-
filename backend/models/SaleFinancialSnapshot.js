const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const SNAPSHOT_STATUSES = [
  "draft",
  "finalized",
  "reversed",
];

const SALES_CHANNELS = [
  "website",
  "facebook",
  "daraz",
  "shopify",
  "pos",
  "manual",
  "other",
];

const COSTING_METHODS = [
  "weighted_average",
  "fifo",
  "standard",
  "manual",
  "unresolved",
];

const COST_SOURCES = [
  "product",
  "variant",
  "inventory_cost_layer",
  "purchase",
  "manual",
  "unresolved",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeOptionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue || null;
};

const normalizeCurrency = (value) => {
  if (typeof value !== "string") {
    return "BDT";
  }

  const cleanValue = value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(cleanValue) ? cleanValue : "BDT";
};

const toDecimal128 = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return mongoose.Types.Decimal128.fromString("0");
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new mongoose.Error.CastError(
      "Decimal128",
      value,
      "financial amount"
    );
  }

  return mongoose.Types.Decimal128.fromString(
    numericValue.toFixed(2)
  );
};

/* =========================================================
   DECIMAL FIELD FACTORY

   Financial truth Number দিয়ে persist করা হবে না।
   Decimal128 ব্যবহারে binary floating-point drift এড়ানো যায়।
========================================================= */

const decimalField = ({
  required = true,
  defaultValue = "0",
  min = "0",
} = {}) => ({
  type: mongoose.Schema.Types.Decimal128,
  required,
  default: () =>
    mongoose.Types.Decimal128.fromString(defaultValue),
  min,
  set: toDecimal128,
});

/* =========================================================
   SNAPSHOT ITEM SCHEMA

   Order item-এর pricing এবং cost state freeze করে।
   Product বা Inventory data পরিবর্তন হলেও historical profit
   calculation অপরিবর্তিত থাকবে।
========================================================= */

const snapshotItemSchema = new mongoose.Schema(
  {
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      set: normalizeOptionalString,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: decimalField(),

    grossLineRevenue: decimalField(),

    itemDiscountAmount: decimalField(),

    netLineRevenue: decimalField(),

    unitCost: decimalField(),

    lineCogs: decimalField(),

    grossProfit: decimalField({
      min: null,
    }),

    grossMarginPercent: {
      type: mongoose.Schema.Types.Decimal128,
      default: () =>
        mongoose.Types.Decimal128.fromString("0"),
      set: toDecimal128,
    },

    costingMethod: {
      type: String,
      enum: COSTING_METHODS,
      default: "unresolved",
    },

    costSource: {
      type: String,
      enum: COST_SOURCES,
      default: "unresolved",
    },

    selectedSize: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    selectedColor: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },
  },
  {
    _id: true,
  }
);

/* =========================================================
   CALCULATION BREAKDOWN SCHEMA
========================================================= */

const calculationBreakdownSchema = new mongoose.Schema(
  {
    grossRevenue: decimalField(),

    itemDiscountAmount: decimalField(),

    couponDiscountAmount: decimalField(),

    manualDiscountAmount: decimalField(),

    shippingDiscountAmount: decimalField(),

    totalDiscountAmount: decimalField(),

    netProductRevenue: decimalField(),

    deliveryRevenue: decimalField(),

    taxAmount: decimalField(),

    netRevenue: decimalField(),

    cogs: decimalField(),

    grossProfit: decimalField({
      min: null,
    }),

    grossMarginPercent: {
      type: mongoose.Schema.Types.Decimal128,
      default: () =>
        mongoose.Types.Decimal128.fromString("0"),
      set: toDecimal128,
    },

    amountPaid: decimalField(),

    amountRefunded: decimalField(),

    outstandingAmount: decimalField(),
  },
  {
    _id: false,
  }
);

/* =========================================================
   SOURCE METADATA SCHEMA
========================================================= */

const sourceMetadataSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: [
        "order_created",
        "order_confirmed",
        "order_delivered",
        "manual_rebuild",
        "migration",
      ],
      required: true,
      default: "order_created",
    },

    sourceVersion: {
      type: Number,
      min: 1,
      default: 1,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    requestId: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    notes: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   SALE FINANCIAL SNAPSHOT SCHEMA

   Responsibilities:
   - একটি Order-এর financial state freeze করা
   - FinancialEvent generation-এর immutable source হওয়া
   - Historical profitability audit করা
   - Calculation version preserve করা

   This model is not:
   - live Order state
   - accounting ledger
   - dashboard aggregation
========================================================= */

const saleFinancialSnapshotSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      immutable: true,
    },

    orderNumber: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      uppercase: true,
    },

    snapshotVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      immutable: true,
    },

    calculationVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      immutable: true,
    },

    status: {
      type: String,
      enum: SNAPSHOT_STATUSES,
      required: true,
      default: "draft",
      index: true,
    },

    salesChannel: {
      type: String,
      enum: SALES_CHANNELS,
      required: true,
      default: "website",
      lowercase: true,
      trim: true,
      immutable: true,
    },

    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
      immutable: true,
      set: normalizeCurrency,
      match: [/^[A-Z]{3}$/, "Currency must be a valid 3-letter ISO code"],
    },

    customer: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        default: null,
      },

      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        set: normalizeOptionalString,
      },
    },

    items: {
      type: [snapshotItemSchema],
      required: true,

      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },

        message:
          "Sale financial snapshot must contain at least one item",
      },
    },

    totals: {
      type: calculationBreakdownSchema,
      required: true,
    },

    orderCreatedAt: {
      type: Date,
      required: true,
      immutable: true,
    },

    orderConfirmedAt: {
      type: Date,
      default: null,
      immutable: true,
    },

    orderDeliveredAt: {
      type: Date,
      default: null,
      immutable: true,
    },

    finalizedAt: {
      type: Date,
      default: null,
    },

    reversalSnapshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleFinancialSnapshot",
      default: null,
      immutable: true,
    },

    reversedBySnapshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleFinancialSnapshot",
      default: null,
    },

    sourceMetadata: {
      type: sourceMetadataSchema,
      required: true,
      default: () => ({}),
      immutable: true,
    },

    checksum: {
      type: String,
      default: null,
      trim: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
    strict: "throw",
  }
);

/* =========================================================
   IMMUTABILITY PROTECTION

   Finalized বা reversed snapshot financial history।
   সাধারণ save operation দিয়ে পরিবর্তন করা যাবে না।
========================================================= */

saleFinancialSnapshotSchema.pre(
  "save",
  async function protectFinalizedSnapshot(next) {
    if (this.isNew) {
      return next();
    }

    const existingSnapshot =
      await this.constructor
        .findById(this._id)
        .select("status")
        .lean();

    if (
      existingSnapshot &&
      ["finalized", "reversed"].includes(
        existingSnapshot.status
      )
    ) {
      return next(
        new Error(
          "Finalized financial snapshots are immutable"
        )
      );
    }

    return next();
  }
);

/*
  Query-based update methods bypass document save middleware।
  তাই finalized/reversed record update করার চেষ্টা block করা হচ্ছে।
*/

const blockImmutableQueryUpdate = async function blockImmutableQueryUpdate(next) {
  const filter = this.getFilter();

  const existingSnapshot =
    await this.model
      .findOne(filter)
      .select("status")
      .lean();

  if (
    existingSnapshot &&
    ["finalized", "reversed"].includes(
      existingSnapshot.status
    )
  ) {
    return next(
      new Error(
        "Finalized financial snapshots are immutable"
      )
    );
  }

  return next();
};

saleFinancialSnapshotSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "replaceOne",
  ],
  blockImmutableQueryUpdate
);

/* =========================================================
   VALIDATION
========================================================= */

saleFinancialSnapshotSchema.pre(
  "validate",
  function validateSnapshot(next) {
    if (
      this.status === "finalized" &&
      !this.finalizedAt
    ) {
      this.finalizedAt = new Date();
    }

    if (
      this.status === "draft" &&
      this.finalizedAt
    ) {
      this.invalidate(
        "finalizedAt",
        "Draft snapshot cannot have a finalized timestamp"
      );
    }

    if (
      this.status === "reversed" &&
      !this.reversalSnapshot
    ) {
      this.invalidate(
        "reversalSnapshot",
        "Reversed snapshot must reference its reversal snapshot"
      );
    }

    next();
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
  প্রতিটি tenant + order + snapshotVersion combination unique।
*/

saleFinancialSnapshotSchema.index(
  {
    tenant: 1,
    order: 1,
    snapshotVersion: 1,
  },
  {
    unique: true,
    name: "tenant_order_snapshot_version_unique",
  }
);

/*
  Tenant-scoped Order Number lookup।
*/

saleFinancialSnapshotSchema.index({
  tenant: 1,
  orderNumber: 1,
  createdAt: -1,
});

/*
  Financial event processing queue।
*/

saleFinancialSnapshotSchema.index({
  tenant: 1,
  status: 1,
  createdAt: 1,
});

/*
  Sales channel financial reporting।
*/

saleFinancialSnapshotSchema.index({
  tenant: 1,
  salesChannel: 1,
  orderCreatedAt: -1,
});

/*
  Calculation-version migration এবং audit।
*/

saleFinancialSnapshotSchema.index({
  tenant: 1,
  calculationVersion: 1,
  orderCreatedAt: -1,
});

/*
  Reversal relationship lookup।
*/

saleFinancialSnapshotSchema.index({
  tenant: 1,
  reversalSnapshot: 1,
});

/* =========================================================
   SERIALIZATION

   Decimal128 API response-এ plain string হিসেবে পাঠানো হবে,
   যাতে JavaScript number precision loss না হয়।
========================================================= */

const decimal128ToStringTransform = (_doc, ret) => {
  const convertValue = (value) => {
    if (
      value &&
      typeof value === "object" &&
      value._bsontype === "Decimal128"
    ) {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map(convertValue);
    }

    if (
      value &&
      typeof value === "object"
    ) {
      Object.keys(value).forEach((key) => {
        value[key] = convertValue(value[key]);
      });
    }

    return value;
  };

  return convertValue(ret);
};

saleFinancialSnapshotSchema.set("toJSON", {
  transform: decimal128ToStringTransform,
});

saleFinancialSnapshotSchema.set("toObject", {
  transform: decimal128ToStringTransform,
});

/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports = mongoose.model(
  "SaleFinancialSnapshot",
  saleFinancialSnapshotSchema
);
