const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUSES = [
  "Pending",
  "Partially Paid",
  "Paid",
  "Failed",
  "Partially Refunded",
  "Refunded",
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

const FINANCIAL_PROCESSING_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "reprocess_required",
];

/* =========================================================
   NORMALIZERS
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

/* =========================================================
   ORDER ITEM SCHEMA

   Product information এবং financial cost snapshot রাখা হবে,
   যাতে ভবিষ্যতে Product price/cost পরিবর্তন হলেও পুরোনো
   Order-এর historical data এবং profit calculation ঠিক থাকে।
========================================================= */

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: false,
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

    slug: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    sku: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      set: normalizeOptionalString,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
      Compatibility-এর জন্য monetary fields এখন Number রাখা হয়েছে।
      Financial Core models-এ Decimal128 ব্যবহার করা হবে।
    */

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    itemDiscountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
      Order finalization-এর সময় cost snapshot populate করা হবে।
      null মানে cost এখনো resolve হয়নি।
    */

    unitCost: {
      type: Number,
      min: 0,
      default: null,
    },

    lineCogs: {
      type: Number,
      min: 0,
      default: null,
    },

    costingMethod: {
      type: String,
      enum: ["weighted_average", "fifo", "standard", "manual", "unresolved"],
      default: "unresolved",
    },

    costSource: {
      type: String,
      enum: [
        "product",
        "variant",
        "inventory_cost_layer",
        "purchase",
        "manual",
        "unresolved",
      ],
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
   CUSTOMER SNAPSHOT SCHEMA
========================================================= */

const customerSchema = new mongoose.Schema(
  {
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
  {
    _id: false,
  }
);

/* =========================================================
   SHIPPING ADDRESS SNAPSHOT SCHEMA
========================================================= */

const shippingAddressSchema = new mongoose.Schema(
  {
    division: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
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
   ORDER STATUS HISTORY SCHEMA
========================================================= */

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
    },

    note: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   FINANCIAL PROCESSING METADATA
========================================================= */

const financialProcessingSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: FINANCIAL_PROCESSING_STATUSES,
      default: "pending",
    },

    calculationVersion: {
      type: Number,
      min: 1,
      default: 1,
    },

    snapshotCreated: {
      type: Boolean,
      default: false,
    },

    eventsCreated: {
      type: Boolean,
      default: false,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    failureReason: {
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
   ORDER SCHEMA
========================================================= */

const orderSchema = new mongoose.Schema(
  {
    /*
      Multi-tenant isolation.

      IMPORTANT:
      Order create controller/service অবশ্যই authenticated বা resolved
      tenant context থেকে tenant assign করবে। Client payload-এর tenant
      কখনো trust করা যাবে না।
    */

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
      index: true,
    },

    /*
      Public Order Tracking-এর জন্য tenant-scoped unique Order Number।

      Example:
      TM-20260714-A8F4C2
    */

    orderNumber: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      uppercase: true,
    },

    guestId: {
      type: String,
      required: true,
      immutable: true,
      trim: true,

      match: [
        /^guest_[a-zA-Z0-9_-]{8,120}$/,
        "Invalid guest ID format",
      ],
    },

    customer: {
      type: customerSchema,
      required: true,
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,

      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },

        message: "Order must contain at least one item",
      },
    },

    salesChannel: {
      type: String,
      enum: SALES_CHANNELS,
      default: "website",
      required: true,
      lowercase: true,
      trim: true,
    },

    externalChannelOrderId: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    currency: {
      type: String,
      required: true,
      default: "BDT",
      uppercase: true,
      trim: true,
      set: normalizeCurrency,
      match: [/^[A-Z]{3}$/, "Currency must be a valid 3-letter ISO code"],
    },

    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    deliveryCharge: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    itemDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    couponDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    manualDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    shippingDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
      Existing API compatibility-এর জন্য aggregate discountAmount রাখা হয়েছে।
    */

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    couponCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      set: normalizeOptionalString,
    },

    taxAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Pending",
      required: true,
    },

    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending",
      required: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    customerNote: {
      type: String,
      default: null,
      trim: true,
      set: normalizeOptionalString,
    },

    /*
      Lifecycle timestamps dashboard/report query দ্রুত করবে।
      Status update service/controller থেকে এগুলো populate করতে হবে।
    */

    confirmedAt: {
      type: Date,
      default: null,
    },

    processingAt: {
      type: Date,
      default: null,
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    financialProcessing: {
      type: financialProcessingSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

/* =========================================================
   VALIDATION
========================================================= */

orderSchema.pre("validate", function validateOrderFinancials(next) {
  const calculatedDiscount =
    Number(this.itemDiscountAmount || 0) +
    Number(this.couponDiscountAmount || 0) +
    Number(this.manualDiscountAmount || 0) +
    Number(this.shippingDiscountAmount || 0);

  /*
    Legacy checkout শুধু discountAmount পাঠালে breakdown overwrite করা হবে না।
    Breakdown fields ব্যবহার করা হলে aggregate discountAmount synchronize হবে।
  */

  if (calculatedDiscount > 0) {
    this.discountAmount = calculatedDiscount;
  }

  if (Number(this.paidAmount || 0) > Number(this.totalAmount || 0)) {
    this.invalidate(
      "paidAmount",
      "Paid amount cannot exceed the order total amount"
    );
  }

  if (Number(this.refundedAmount || 0) > Number(this.paidAmount || 0)) {
    this.invalidate(
      "refundedAmount",
      "Refunded amount cannot exceed the paid amount"
    );
  }

  next();
});

/* =========================================================
   DATABASE INDEXES
========================================================= */

/*
  Tenant-scoped public order identity.
*/

orderSchema.index(
  {
    tenant: 1,
    orderNumber: 1,
  },
  {
    unique: true,
    name: "tenant_order_number_unique",
  }
);

/*
  Guest-এর orders দ্রুত খুঁজতে।
*/

orderSchema.index({
  tenant: 1,
  guestId: 1,
  createdAt: -1,
});

/*
  Order Number + Phone দিয়ে public tracking-এর জন্য।
*/

orderSchema.index({
  tenant: 1,
  orderNumber: 1,
  "customer.phone": 1,
});

/*
  Admin order filtering-এর জন্য।
*/

orderSchema.index({
  tenant: 1,
  orderStatus: 1,
  createdAt: -1,
});

/*
  Payment collection filtering-এর জন্য।
*/

orderSchema.index({
  tenant: 1,
  paymentStatus: 1,
  createdAt: -1,
});

/*
  Sales channel analytics এবং filtering-এর জন্য।
*/

orderSchema.index({
  tenant: 1,
  salesChannel: 1,
  createdAt: -1,
});

/*
  Delivered-order financial processing queue-এর জন্য।
*/

orderSchema.index({
  tenant: 1,
  deliveredAt: -1,
  "financialProcessing.status": 1,
});

/*
  External marketplace/channel order deduplication।
*/

orderSchema.index(
  {
    tenant: 1,
    salesChannel: 1,
    externalChannelOrderId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      externalChannelOrderId: {
        $type: "string",
      },
    },
    name: "tenant_channel_external_order_unique",
  }
);

/* =========================================================
   EXPORT ORDER MODEL
========================================================= */

module.exports = mongoose.model("Order", orderSchema);
