const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const EVENT_TYPES = [
  "revenue",
  "discount",
  "refund",
  "cogs",
  "delivery_revenue",
  "courier_cost",
  "packaging_cost",
  "marketplace_fee",
  "payment_fee",
  "marketing_cost",
  "operating_expense",
  "financial_cost",
  "tax",
  "inventory_loss",
  "inventory_adjustment",
  "other_income",
  "other_expense",
];

const EVENT_DIRECTIONS = [
  "credit",
  "debit",
];

const EVENT_STATUSES = [
  "pending",
  "posted",
  "reversed",
  "failed",
];

const SOURCE_TYPES = [
  "order",
  "sale_financial_snapshot",
  "expense",
  "inventory",
  "payment",
  "courier",
  "marketplace",
  "marketing",
  "tax",
  "manual",
  "migration",
  "system",
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
   RELATED ENTITY SCHEMA
========================================================= */

const relatedEntitySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    label: {
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
   EVENT METADATA SCHEMA
========================================================= */

const eventMetadataSchema = new mongoose.Schema(
  {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    requestId: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    batchId: {
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

    tags: {
      type: [String],
      default: [],

      set(values) {
        if (!Array.isArray(values)) {
          return [];
        }

        return [
          ...new Set(
            values
              .filter(
                (value) =>
                  typeof value === "string"
              )
              .map((value) =>
                value.trim().toLowerCase()
              )
              .filter(Boolean)
          ),
        ];
      },
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   FINANCIAL EVENT SCHEMA

   This collection acts as an append-only financial ledger.

   Core rules:
   - Every posted event is immutable
   - Corrections happen through reversal events
   - Idempotency prevents duplicate posting
   - Financial amount uses Decimal128
   - Every record is tenant-scoped
========================================================= */

const financialEventSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
    },

    eventType: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
      immutable: true,
      index: true,
    },

    direction: {
      type: String,
      enum: EVENT_DIRECTIONS,
      required: true,
      immutable: true,
    },

    status: {
      type: String,
      enum: EVENT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },

    amount: decimalField(),

    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
      immutable: true,
      set: normalizeCurrency,
      match: [
        /^[A-Z]{3}$/,
        "Currency must be a valid 3-letter ISO code",
      ],
    },

    sourceType: {
      type: String,
      enum: SOURCE_TYPES,
      required: true,
      immutable: true,
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      immutable: true,
    },

    orderNumber: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      immutable: true,
      set: normalizeOptionalString,
    },

    saleFinancialSnapshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SaleFinancialSnapshot",
      default: null,
      immutable: true,
    },

    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
      immutable: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      immutable: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      immutable: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      immutable: true,
    },

    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courier",
      default: null,
      immutable: true,
    },

    salesChannel: {
      type: String,
      enum: SALES_CHANNELS,
      default: null,
      lowercase: true,
      trim: true,
      immutable: true,
    },

    accountingDate: {
      type: Date,
      required: true,
      immutable: true,
      index: true,
    },

    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },

    postedAt: {
      type: Date,
      default: null,
    },

    calculationVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      immutable: true,
    },

    eventVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      immutable: true,
    },

    relatedEntities: {
      type: [relatedEntitySchema],
      default: [],
      immutable: true,
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialEvent",
      default: null,
      immutable: true,
    },

    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialEvent",
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    metadata: {
      type: eventMetadataSchema,
      default: () => ({}),
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
   VALIDATION
========================================================= */

financialEventSchema.pre(
  "validate",
  function validateFinancialEvent(next) {
    if (
      this.status === "posted" &&
      !this.postedAt
    ) {
      this.postedAt = new Date();
    }

    if (
      this.status === "pending" &&
      this.postedAt
    ) {
      this.invalidate(
        "postedAt",
        "Pending event cannot have a posted timestamp"
      );
    }

    if (
      this.status === "reversed" &&
      !this.reversedBy
    ) {
      this.invalidate(
        "reversedBy",
        "Reversed event must reference its reversing event"
      );
    }

    if (
      this.reversalOf &&
      this.direction
    ) {
      /*
        Reversal event-এর amount positive থাকে,
        direction original event-এর বিপরীত হতে হবে।
        এই model original event load না করে direction compare করে না;
        service layer সেই consistency enforce করবে।
      */
    }

    next();
  }
);

/* =========================================================
   IMMUTABILITY PROTECTION
========================================================= */

financialEventSchema.pre(
  "save",
  async function protectPostedEvent(next) {
    if (this.isNew) {
      return next();
    }

    const existingEvent =
      await this.constructor
        .findById(this._id)
        .select("status")
        .lean();

    if (
      existingEvent &&
      ["posted", "reversed"].includes(
        existingEvent.status
      )
    ) {
      /*
        শুধু pending -> posted transition allowed।
        Posted/reversed event-এর financial payload পরিবর্তন করা যাবে না।
      */

      const modifiedPaths =
        this.modifiedPaths();

      const allowedPaths = new Set([
        "status",
        "postedAt",
        "reversedBy",
        "failureReason",
        "updatedAt",
      ]);

      const hasForbiddenModification =
        modifiedPaths.some(
          (path) =>
            !allowedPaths.has(path)
        );

      if (hasForbiddenModification) {
        return next(
          new Error(
            "Posted financial events are immutable"
          )
        );
      }
    }

    return next();
  }
);

const protectQueryUpdate =
  async function protectQueryUpdate(next) {
    const filter =
      this.getFilter();

    const existingEvent =
      await this.model
        .findOne(filter)
        .select("status")
        .lean();

    if (
      existingEvent &&
      ["posted", "reversed"].includes(
        existingEvent.status
      )
    ) {
      const update =
        this.getUpdate() || {};

      const allowedFields =
        new Set([
          "status",
          "postedAt",
          "reversedBy",
          "failureReason",
          "updatedAt",
        ]);

      const fieldNames =
        new Set();

      Object.entries(update).forEach(
        ([key, value]) => {
          if (key.startsWith("$")) {
            if (
              value &&
              typeof value === "object"
            ) {
              Object.keys(value).forEach(
                (field) =>
                  fieldNames.add(field)
              );
            }

            return;
          }

          fieldNames.add(key);
        }
      );

      const hasForbiddenModification =
        [...fieldNames].some(
          (field) =>
            !allowedFields.has(field)
        );

      if (hasForbiddenModification) {
        return next(
          new Error(
            "Posted financial events are immutable"
          )
        );
      }
    }

    return next();
  };

financialEventSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "replaceOne",
  ],
  protectQueryUpdate
);

/*
  Ledger record delete করা যাবে না।
  Correction সবসময় reversal event-এর মাধ্যমে হবে।
*/

const blockDelete = function blockDelete(next) {
  return next(
    new Error(
      "Financial events cannot be deleted; create a reversal event instead"
    )
  );
};

financialEventSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
  ],
  blockDelete
);

/* =========================================================
   INDEXES
========================================================= */

/*
  Duplicate posting prevention।
*/

financialEventSchema.index(
  {
    tenant: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    name: "tenant_financial_event_idempotency_unique",
  }
);

/*
  Source-level event lookup।
*/

financialEventSchema.index({
  tenant: 1,
  sourceType: 1,
  sourceId: 1,
  eventType: 1,
});

/*
  Order financial ledger।
*/

financialEventSchema.index({
  tenant: 1,
  order: 1,
  accountingDate: 1,
});

/*
  Daily financial reporting।
*/

financialEventSchema.index({
  tenant: 1,
  accountingDate: 1,
  status: 1,
  eventType: 1,
});

/*
  Product profitability।
*/

financialEventSchema.index({
  tenant: 1,
  product: 1,
  accountingDate: 1,
  eventType: 1,
});

/*
  Channel profitability।
*/

financialEventSchema.index({
  tenant: 1,
  salesChannel: 1,
  accountingDate: 1,
  eventType: 1,
});

/*
  Pending event processing queue।
*/

financialEventSchema.index({
  tenant: 1,
  status: 1,
  createdAt: 1,
});

/*
  Reversal lookup।
*/

financialEventSchema.index({
  tenant: 1,
  reversalOf: 1,
});

/* =========================================================
   SERIALIZATION
========================================================= */

const decimal128ToStringTransform = (
  _doc,
  ret
) => {
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
      Object.keys(value).forEach(
        (key) => {
          value[key] =
            convertValue(value[key]);
        }
      );
    }

    return value;
  };

  return convertValue(ret);
};

financialEventSchema.set(
  "toJSON",
  {
    transform:
      decimal128ToStringTransform,
  }
);

financialEventSchema.set(
  "toObject",
  {
    transform:
      decimal128ToStringTransform,
  }
);

/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports = mongoose.model(
  "FinancialEvent",
  financialEventSchema
);
