const crypto = require("crypto");
const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const BOOKING_STATUSES = [
  "pending",
  "processing",
  "booked",
  "failed",
  "cancelled",
];

const DELIVERY_STATUSES = [
  "pending",
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "returned",
  "partially_delivered",
  "cancelled",
  "unknown",
];

const PAYMENT_METHODS = [
  "cod",
  "prepaid",
  "partial",
];

const SHIPMENT_TYPES = [
  "forward",
  "return",
  "exchange",
];

const PACKAGE_TYPES = [
  "parcel",
  "document",
  "fragile",
  "other",
];

const CURRENCIES = ["BDT", "USD", "EUR"];

const MAX_STATUS_HISTORY = 200;
const MAX_API_LOGS = 50;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
  Accepts Bangladesh local/mobile formats after normalization:
  01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX.
  International numbers are also accepted when they contain 8–15 digits.
*/
const PHONE_PATTERN =
  /^(?:\+?8801\d{9}|01\d{9}|\+?[1-9]\d{7,14})$/;

/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue || null;
};

const normalizeRequiredString = (
  value
) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const normalizePhone = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");
};

/* =========================================================
   RECIPIENT SNAPSHOT SCHEMA

   Order অথবা customer data পরে পরিবর্তন হলেও shipment-এর
   original delivery information অপরিবর্তিত থাকবে।
========================================================= */

const recipientSnapshotSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        set: normalizeRequiredString,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
        set: normalizePhone,
        match: [
          PHONE_PATTERN,
          "Recipient phone number is invalid",
        ],
      },

      alternatePhone: {
        type: String,
        default: null,
        trim: true,
        set: normalizePhone,
        validate: {
          validator(value) {
            return (
              value === null ||
              PHONE_PATTERN.test(value)
            );
          },
          message:
            "Recipient alternate phone number is invalid",
        },
      },

      email: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        set: normalizeOptionalString,
        validate: {
          validator(value) {
            return (
              value === null ||
              EMAIL_PATTERN.test(value)
            );
          },
          message: "Recipient email is invalid",
        },
      },

      addressLine: {
        type: String,
        required: true,
        trim: true,
        set: normalizeRequiredString,
      },

      area: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      city: {
        type: String,
        required: true,
        trim: true,
        set: normalizeRequiredString,
      },

      district: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      division: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      postalCode: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      country: {
        type: String,
        default: "Bangladesh",
        trim: true,
      },

      deliveryInstructions: {
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
   PACKAGE ITEM SNAPSHOT SCHEMA
========================================================= */

const packageItemSchema =
  new mongoose.Schema(
    {
      product: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Product",
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
        set: normalizeOptionalString,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      totalPrice: {
        type: Number,
        required: true,
        min: 0,
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
      bookingStatus: {
        type: String,
        enum: BOOKING_STATUSES,
        default: null,
      },

      deliveryStatus: {
        type: String,
        enum: DELIVERY_STATUSES,
        default: null,
      },

      courierStatus: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      message: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      location: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      source: {
        type: String,
        enum: [
          "system",
          "admin",
          "courier_api",
          "webhook",
          "manual",
        ],
        default: "system",
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      changedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        default: null,
      },

      occurredAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
      timestamps: false,
    }
  );

/* =========================================================
   API LOG SCHEMA
========================================================= */

const apiLogSchema =
  new mongoose.Schema(
    {
      action: {
        type: String,
        required: true,
        trim: true,
      },

      method: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
      },

      endpoint: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      requestPayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      responsePayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      statusCode: {
        type: Number,
        default: null,
      },

      success: {
        type: Boolean,
        default: false,
      },

      errorMessage: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      requestedAt: {
        type: Date,
        default: Date.now,
      },

      respondedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: true,
    }
  );

/* =========================================================
   COURIER SHIPMENT SCHEMA
========================================================= */

const courierShipmentSchema =
  new mongoose.Schema(
    {
      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      shipmentNumber: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        immutable: true,
      },

      order: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Order",
        required: true,
        index: true,
      },

      orderNumber: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      courier: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Courier",
        required: true,
        index: true,
      },

      courierCode: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
      },

      shipmentType: {
        type: String,
        enum: SHIPMENT_TYPES,
        default: "forward",
        index: true,
      },

      packageType: {
        type: String,
        enum: PACKAGE_TYPES,
        default: "parcel",
      },

      trackingNumber: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
        index: true,
      },

      consignmentId: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
        index: true,
      },

      bookingId: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      courierReference: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      externalReference: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      merchantInvoiceNumber: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      recipient: {
        type: recipientSnapshotSchema,
        required: true,
      },

      items: {
        type: [packageItemSchema],
        default: [],
      },

      itemCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      itemDescription: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      specialInstructions: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      weight: {
        type: Number,
        default: 0.1,
        min: [
          0.1,
          "Shipment weight must be at least 0.1",
        ],
      },

      weightUnit: {
        type: String,
        enum: ["kg", "gram"],
        default: "kg",
      },

      dimensions: {
        length: {
          type: Number,
          default: 0,
          min: 0,
        },

        width: {
          type: Number,
          default: 0,
          min: 0,
        },

        height: {
          type: Number,
          default: 0,
          min: 0,
        },

        unit: {
          type: String,
          enum: ["cm", "inch"],
          default: "cm",
        },
      },

      paymentMethod: {
        type: String,
        enum: PAYMENT_METHODS,
        default: "cod",
      },

      pricing: {
        orderAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        codAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        shippingCharge: {
          type: Number,
          default: 0,
          min: 0,
        },

        courierCharge: {
          type: Number,
          default: 0,
          min: 0,
        },

        collectionAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        collectedAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        returnCharge: {
          type: Number,
          default: 0,
          min: 0,
        },

        currency: {
          type: String,
          enum: CURRENCIES,
          default: "BDT",
          uppercase: true,
          trim: true,
        },
      },

      bookingStatus: {
        type: String,
        enum: BOOKING_STATUSES,
        default: "pending",
        index: true,
      },

      deliveryStatus: {
        type: String,
        enum: DELIVERY_STATUSES,
        default: "pending",
        index: true,
      },

      courierStatus: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      currentLocation: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      statusMessage: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      failureReason: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      cancellationReason: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      returnReason: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      deliveryAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      statusHistory: {
        type: [statusHistorySchema],
        default: [],
      },

      apiLogs: {
        type: [apiLogSchema],
        default: [],
        select: false,
      },

      lastApiResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        select: false,
      },

      lastWebhookPayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        select: false,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },

      nextSyncAt: {
        type: Date,
        default: null,
      },

      syncAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      bookedAt: {
        type: Date,
        default: null,
      },

      pickedUpAt: {
        type: Date,
        default: null,
      },

      outForDeliveryAt: {
        type: Date,
        default: null,
      },

      deliveredAt: {
        type: Date,
        default: null,
      },

      failedAt: {
        type: Date,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      returnedAt: {
        type: Date,
        default: null,
      },

      expectedDeliveryAt: {
        type: Date,
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      isArchived: {
        type: Boolean,
        default: false,
        index: true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        default: null,
      },

      updatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      minimize: false,
      strict: true,
      toJSON: {
        virtuals: true,
      },
      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   INDEXES
========================================================= */

/* Tenant-scoped identifiers and listing indexes. */
courierShipmentSchema.index(
  {
    tenant: 1,
    shipmentNumber: 1,
  },
  {
    unique: true,
    name: "tenant_shipment_number_unique",
  }
);

courierShipmentSchema.index({
  tenant: 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  courier: 1,
  deliveryStatus: 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  order: 1,
  shipmentType: 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  bookingStatus: 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  isArchived: 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  "recipient.phone": 1,
  createdAt: -1,
});

courierShipmentSchema.index({
  tenant: 1,
  nextSyncAt: 1,
  bookingStatus: 1,
  deliveryStatus: 1,
});

/*
  Courier identifiers may be null, so partial unique indexes
  are used. Uniqueness is enforced inside each tenant.
*/
courierShipmentSchema.index(
  {
    tenant: 1,
    courier: 1,
    trackingNumber: 1,
  },
  {
    unique: true,
    name: "tenant_courier_tracking_unique",
    partialFilterExpression: {
      trackingNumber: {
        $type: "string",
      },
    },
  }
);

courierShipmentSchema.index(
  {
    tenant: 1,
    courier: 1,
    consignmentId: 1,
  },
  {
    unique: true,
    name: "tenant_courier_consignment_unique",
    partialFilterExpression: {
      consignmentId: {
        $type: "string",
      },
    },
  }
);

/* =========================================================
   VIRTUALS
========================================================= */

courierShipmentSchema.virtual(
  "isDelivered"
).get(function () {
  return (
    this.deliveryStatus ===
    "delivered"
  );
});

courierShipmentSchema.virtual(
  "isCancelled"
).get(function () {
  return (
    this.bookingStatus ===
      "cancelled" ||
    this.deliveryStatus ===
      "cancelled"
  );
});

courierShipmentSchema.virtual(
  "isReturnShipment"
).get(function () {
  return (
    this.shipmentType ===
    "return"
  );
});

/* =========================================================
   INSTANCE METHODS
========================================================= */

courierShipmentSchema.methods.addStatusHistory =
  function ({
    bookingStatus = null,
    deliveryStatus = null,
    courierStatus = null,
    message = null,
    location = null,
    source = "system",
    metadata = null,
    changedBy = null,
    occurredAt = new Date(),
  }) {
    this.statusHistory.push({
      bookingStatus,
      deliveryStatus,
      courierStatus,
      message,
      location,
      source,
      metadata,
      changedBy,
      occurredAt,
    });

    if (
      this.statusHistory.length >
      MAX_STATUS_HISTORY
    ) {
      this.statusHistory =
        this.statusHistory.slice(
          -MAX_STATUS_HISTORY
        );
    }

    return this;
  };

courierShipmentSchema.methods.addApiLog =
  function ({
    action,
    method = null,
    endpoint = null,
    requestPayload = null,
    responsePayload = null,
    statusCode = null,
    success = false,
    errorMessage = null,
    requestedAt = new Date(),
    respondedAt = null,
  }) {
    this.apiLogs.push({
      action,
      method,
      endpoint,
      requestPayload,
      responsePayload,
      statusCode,
      success,
      errorMessage,
      requestedAt,
      respondedAt,
    });

    if (
      this.apiLogs.length >
      MAX_API_LOGS
    ) {
      this.apiLogs =
        this.apiLogs.slice(-MAX_API_LOGS);
    }

    return this;
  };

/* =========================================================
   STATIC METHODS
========================================================= */

courierShipmentSchema.statics.generateShipmentNumber =
  async function (tenantId) {
    if (!mongoose.isValidObjectId(tenantId)) {
      throw new Error(
        "A valid tenant ID is required to generate a shipment number"
      );
    }

    const date = new Date();

    const year = String(date.getFullYear());
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const datePrefix = `${year}${month}${day}`;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const randomPart = String(
        crypto.randomInt(0, 1000000)
      ).padStart(6, "0");

      const shipmentNumber =
        `SHP-${datePrefix}-${randomPart}`;

      const existingShipment =
        await this.exists({
          tenant: tenantId,
          shipmentNumber,
        });

      if (!existingShipment) {
        return shipmentNumber;
      }
    }

    throw new Error(
      "Unable to generate a unique shipment number"
    );
  };

courierShipmentSchema.statics.findByShipmentNumber =
  function (tenantId, shipmentNumber) {
    return this.findOne({
      tenant: tenantId,
      shipmentNumber: String(
        shipmentNumber
      ).trim().toUpperCase(),
    });
  };

courierShipmentSchema.statics.findByTracking =
  function (tenantId, trackingNumber) {
    return this.findOne({
      tenant: tenantId,
      trackingNumber: String(
        trackingNumber
      ).trim(),
    });
  };

courierShipmentSchema.statics.findByConsignment =
  function (tenantId, consignmentId) {
    return this.findOne({
      tenant: tenantId,
      consignmentId: String(
        consignmentId
      ).trim(),
    });
  };

/* =========================================================
   PRE-VALIDATE MIDDLEWARE
========================================================= */

courierShipmentSchema.pre(
  "validate",
  async function () {
    if (!this.shipmentNumber) {
      this.shipmentNumber =
        await this.constructor
          .generateShipmentNumber(
            this.tenant
          );
    }

    if (
      Array.isArray(this.items)
    ) {
      this.itemCount =
        this.items.length;

      this.totalQuantity =
        this.items.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.quantity || 0
            ),
          0
        );
    }

    if (
      this.paymentMethod === "prepaid" &&
      this.pricing.codAmount > 0
    ) {
      this.invalidate(
        "pricing.codAmount",
        "COD amount must be zero for prepaid shipments"
      );
    }

    if (
      this.pricing.collectedAmount >
      this.pricing.collectionAmount
    ) {
      this.invalidate(
        "pricing.collectedAmount",
        "Collected amount cannot exceed collection amount"
      );
    }
  }
);

/* =========================================================
   PRE-SAVE MIDDLEWARE
========================================================= */

courierShipmentSchema.pre(
  "save",
  function () {
    if (
      this.isModified(
        "bookingStatus"
      ) &&
      this.bookingStatus ===
        "booked" &&
      !this.bookedAt
    ) {
      this.bookedAt =
        new Date();
    }

    if (
      this.isModified(
        "deliveryStatus"
      )
    ) {
      const currentDate =
        new Date();

      switch (
        this.deliveryStatus
      ) {
        case "picked_up":
          if (!this.pickedUpAt) {
            this.pickedUpAt =
              currentDate;
          }
          break;

        case "out_for_delivery":
          if (
            !this.outForDeliveryAt
          ) {
            this.outForDeliveryAt =
              currentDate;
          }
          break;

        case "delivered":
          if (!this.deliveredAt) {
            this.deliveredAt =
              currentDate;
          }
          break;

        case "delivery_failed":
          if (!this.failedAt) {
            this.failedAt =
              currentDate;
          }
          break;

        case "cancelled":
          if (
            !this.cancelledAt
          ) {
            this.cancelledAt =
              currentDate;
          }
          break;

        case "returned":
          if (!this.returnedAt) {
            this.returnedAt =
              currentDate;
          }
          break;

        default:
          break;
      }
    }
  }
);

/* =========================================================
   MODEL EXPORT
========================================================= */

const CourierShipment =
  mongoose.models.CourierShipment ||
  mongoose.model(
    "CourierShipment",
    courierShipmentSchema
  );

module.exports = CourierShipment;