"use strict";

const mongoose = require("mongoose");

/* =========================================================
   COURIER PROVIDER SCHEMA
========================================================= */

const credentialSchema = new mongoose.Schema(
  {
    apiKey: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    apiSecret: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    clientId: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    clientSecret: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    username: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    password: {
      type: String,
      default: "",
      select: false,
    },

    webhookSecret: {
      type: String,
      default: "",
      select: false,
    },
  },
  {
    _id: false,
    id: false,
  }
);

const courierSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [
        true,
        "Tenant is required",
      ],
      index: true,
      immutable: true,
    },

    name: {
      type: String,
      required: [
        true,
        "Courier name is required",
      ],
      trim: true,
      maxlength: [
        100,
        "Courier name cannot exceed 100 characters",
      ],
    },

    code: {
      type: String,
      required: [
        true,
        "Courier code is required",
      ],
      trim: true,
      lowercase: true,
      immutable: true,
      maxlength: [
        50,
        "Courier code cannot exceed 50 characters",
      ],
      match: [
        /^[a-z0-9-]+$/,
        "Courier code may contain only lowercase letters, numbers and hyphens",
      ],
    },

    providerType: {
      type: String,
      enum: [
        "manual",
        "pathao",
        "steadfast",
        "redx",
        "paperfly",
        "custom",
      ],
      default: "manual",
      index: true,
    },

    logo: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        2048,
        "Logo URL cannot exceed 2048 characters",
      ],
    },

    website: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        2048,
        "Website URL cannot exceed 2048 characters",
      ],
    },

    supportPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        30,
        "Support phone cannot exceed 30 characters",
      ],
    },

    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: [
        150,
        "Support email cannot exceed 150 characters",
      ],
      match: [
        /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Support email is invalid",
      ],
    },

    apiBaseUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        2048,
        "API base URL cannot exceed 2048 characters",
      ],
    },

    credentials: {
      type: credentialSchema,
      default: () => ({}),
      select: false,
    },

    /*
      Kept as a top-level field for compatibility with the webhook
      controller, which supports both courier.webhookSecret and
      credentials.webhookSecret.
    */
    webhookSecret: {
      type: String,
      default: "",
      select: false,
    },

    settings: {
      merchantStoreId: {
        type: String,
        trim: true,
        default: "",
      },

      defaultDeliveryType: {
        type: String,
        enum: [
          "regular",
          "express",
          "same_day",
        ],
        default: "regular",
      },

      autoBookShipment: {
        type: Boolean,
        default: false,
      },

      enableStatusSync: {
        type: Boolean,
        default: false,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  }
);

/* =========================================================
   INDEXES

   Courier codes are unique inside a tenant, not globally.
   Only one default courier is allowed for each tenant.
========================================================= */

courierSchema.index(
  {
    tenant: 1,
    code: 1,
  },
  {
    unique: true,
    name: "uniq_courier_code_per_tenant",
  }
);

courierSchema.index(
  {
    tenant: 1,
    isDefault: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDefault: true,
    },
    name: "uniq_default_courier_per_tenant",
  }
);

courierSchema.index({
  tenant: 1,
  isActive: 1,
  providerType: 1,
});

/* =========================================================
   NORMALIZATION
========================================================= */

courierSchema.pre(
  "validate",
  function normalizeCourier() {
    if (
      typeof this.code === "string"
    ) {
      this.code = this.code
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
    }

    if (
      typeof this.name === "string"
    ) {
      this.name = this.name.trim();
    }

    if (
      typeof this.supportEmail === "string"
    ) {
      this.supportEmail = this.supportEmail
        .trim()
        .toLowerCase();
    }
  }
);

/* =========================================================
   SAFE OUTPUT

   Sensitive credentials and webhook secrets must never be
   exposed through JSON or plain-object serialization.
========================================================= */

const removeSensitiveFields = (
  _document,
  returnedObject
) => {
  delete returnedObject.credentials;
  delete returnedObject.webhookSecret;

  return returnedObject;
};

courierSchema.set(
  "toJSON",
  {
    transform: removeSensitiveFields,
  }
);

courierSchema.set(
  "toObject",
  {
    transform: removeSensitiveFields,
  }
);

/* =========================================================
   MODEL
========================================================= */

const Courier =
  mongoose.models.Courier ||
  mongoose.model(
    "Courier",
    courierSchema
  );

module.exports = Courier;
