"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const WAREHOUSE_TYPES = [
  "Main",
  "Regional",
  "Distribution Center",
  "Fulfillment Center",
  "Retail Store",
  "Transit",
  "Returns",
  "Damaged Goods",
  "Virtual",
  "Other",
];

const WAREHOUSE_STATUSES = [
  "Active",
  "Inactive",
  "Maintenance",
  "Closed",
];

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const normalizeText = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value).trim();
};

const normalizeOptionalText = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
};

const normalizeCode = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");
};

/* =========================================================
   ADDRESS SUB-SCHEMA
========================================================= */

const warehouseAddressSchema =
  new mongoose.Schema(
    {
      addressLine1: {
        type: String,
        trim: true,
        default: null,
        maxlength: 300,
        set: normalizeOptionalText,
      },

      addressLine2: {
        type: String,
        trim: true,
        default: null,
        maxlength: 300,
        set: normalizeOptionalText,
      },

      area: {
        type: String,
        trim: true,
        default: null,
        maxlength: 150,
        set: normalizeOptionalText,
      },

      city: {
        type: String,
        trim: true,
        default: null,
        maxlength: 150,
        set: normalizeOptionalText,
      },

      district: {
        type: String,
        trim: true,
        default: null,
        maxlength: 150,
        set: normalizeOptionalText,
      },

      division: {
        type: String,
        trim: true,
        default: null,
        maxlength: 150,
        set: normalizeOptionalText,
      },

      postalCode: {
        type: String,
        trim: true,
        default: null,
        maxlength: 30,
        set: normalizeOptionalText,
      },

      country: {
        type: String,
        trim: true,
        default: "Bangladesh",
        maxlength: 100,
        set: normalizeOptionalText,
      },

      latitude: {
        type: Number,
        default: null,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180,
      },
    },
    {
      _id: false,
      id: false,
    }
  );

/* =========================================================
   OPERATING HOURS SUB-SCHEMA
========================================================= */

const operatingHourSchema =
  new mongoose.Schema(
    {
      day: {
        type: String,
        required: true,
        enum: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      },

      isOpen: {
        type: Boolean,
        default: true,
      },

      openingTime: {
        type: String,
        trim: true,
        default: null,
        maxlength: 20,
        set: normalizeOptionalText,
      },

      closingTime: {
        type: String,
        trim: true,
        default: null,
        maxlength: 20,
        set: normalizeOptionalText,
      },
    },
    {
      _id: false,
      id: false,
    }
  );

/* =========================================================
   STORAGE CONFIGURATION SUB-SCHEMA
========================================================= */

const storageConfigurationSchema =
  new mongoose.Schema(
    {
      supportsRackTracking: {
        type: Boolean,
        default: false,
      },

      supportsBinTracking: {
        type: Boolean,
        default: false,
      },

      supportsBatchTracking: {
        type: Boolean,
        default: true,
      },

      supportsSerialTracking: {
        type: Boolean,
        default: true,
      },

      supportsExpiryTracking: {
        type: Boolean,
        default: true,
      },

      supportsTemperatureControl: {
        type: Boolean,
        default: false,
      },

      minimumTemperature: {
        type: Number,
        default: null,
      },

      maximumTemperature: {
        type: Number,
        default: null,
      },

      totalRackCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalBinCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      maximumCapacity: {
        type: Number,
        default: null,
        min: 0,
      },

      capacityUnit: {
        type: String,
        trim: true,
        default: null,
        maxlength: 50,
        set: normalizeOptionalText,
      },
    },
    {
      _id: false,
      id: false,
    }
  );

/* =========================================================
   WAREHOUSE SCHEMA
========================================================= */

const warehouseSchema =
  new mongoose.Schema(
    {
      tenant: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: [
          true,
          "Warehouse name is required",
        ],
        trim: true,
        minlength: 2,
        maxlength: 200,
        set: normalizeText,
      },

      code: {
        type: String,
        required: [
          true,
          "Warehouse code is required",
        ],
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 50,
        set: normalizeCode,
      },

      warehouseType: {
        type: String,
        enum: WAREHOUSE_TYPES,
        default: "Main",
        index: true,
      },

      description: {
        type: String,
        trim: true,
        default: null,
        maxlength: 2000,
        set: normalizeOptionalText,
      },

      phone: {
        type: String,
        trim: true,
        default: null,
        maxlength: 30,
        set: normalizeOptionalText,
      },

      alternatePhone: {
        type: String,
        trim: true,
        default: null,
        maxlength: 30,
        set: normalizeOptionalText,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
        maxlength: 200,
        set: normalizeOptionalText,
      },

      manager: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      managerName: {
        type: String,
        trim: true,
        default: null,
        maxlength: 150,
        set: normalizeOptionalText,
      },

      managerPhone: {
        type: String,
        trim: true,
        default: null,
        maxlength: 30,
        set: normalizeOptionalText,
      },

      address: {
        type: warehouseAddressSchema,
        default: () => ({}),
      },

      operatingHours: {
        type: [operatingHourSchema],
        default: [],
      },

      storageConfiguration: {
        type:
          storageConfigurationSchema,
        default: () => ({}),
      },

      isDefault: {
        type: Boolean,
        default: false,
        index: true,
      },

      allowPurchasing: {
        type: Boolean,
        default: true,
      },

      allowSalesFulfillment: {
        type: Boolean,
        default: true,
      },

      allowTransfers: {
        type: Boolean,
        default: true,
      },

      allowReturns: {
        type: Boolean,
        default: true,
      },

      allowNegativeStock: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,
        enum: WAREHOUSE_STATUSES,
        default: "Active",
        index: true,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
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
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: true,

      minimize: false,

      versionKey: "__v",

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   VIRTUALS
========================================================= */

warehouseSchema.virtual(
  "displayName"
).get(function getDisplayName() {
  return this.code
    ? `${this.name} (${this.code})`
    : this.name;
});

warehouseSchema.virtual(
  "fullAddress"
).get(function getFullAddress() {
  const address =
    this.address || {};

  return [
    address.addressLine1,
    address.addressLine2,
    address.area,
    address.city,
    address.district,
    address.division,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
});

/* =========================================================
   INDEXES
========================================================= */

/*
 * Warehouse code must be unique
 * within the same tenant.
 */
warehouseSchema.index(
  {
    tenant: 1,
    code: 1,
  },
  {
    unique: true,
    name:
      "tenant_warehouse_code_unique_idx",
    partialFilterExpression: {
      isDeleted: false,
    },
  }
);

/*
 * Warehouse name lookup inside tenant.
 */
warehouseSchema.index(
  {
    tenant: 1,
    name: 1,
    isDeleted: 1,
  },
  {
    name:
      "tenant_warehouse_name_idx",
  }
);

/*
 * Active warehouse list.
 */
warehouseSchema.index(
  {
    tenant: 1,
    isActive: 1,
    status: 1,
    isDeleted: 1,
  },
  {
    name:
      "tenant_active_warehouse_idx",
  }
);

/*
 * Default warehouse lookup.
 */
warehouseSchema.index(
  {
    tenant: 1,
    isDefault: 1,
    isDeleted: 1,
  },
  {
    name:
      "tenant_default_warehouse_idx",
  }
);

/*
 * Warehouse list sorting.
 */
warehouseSchema.index(
  {
    tenant: 1,
    createdAt: -1,
  },
  {
    name:
      "tenant_warehouse_created_idx",
  }
);

/*
 * Manager warehouse lookup.
 */
warehouseSchema.index(
  {
    tenant: 1,
    manager: 1,
    isDeleted: 1,
  },
  {
    name:
      "tenant_warehouse_manager_idx",
  }
);

/* =========================================================
   VALIDATION
========================================================= */

warehouseSchema.pre(
  "validate",
  function validateWarehouse(next) {
    if (
      this.storageConfiguration
        ?.supportsTemperatureControl
    ) {
      const minimumTemperature =
        this.storageConfiguration
          .minimumTemperature;

      const maximumTemperature =
        this.storageConfiguration
          .maximumTemperature;

      if (
        minimumTemperature !== null &&
        minimumTemperature !==
          undefined &&
        maximumTemperature !== null &&
        maximumTemperature !==
          undefined &&
        minimumTemperature >
          maximumTemperature
      ) {
        return next(
          new Error(
            "Minimum temperature cannot exceed maximum temperature"
          )
        );
      }
    }

    if (
      this.status === "Active"
    ) {
      this.isActive = true;
    }

    if (
      [
        "Inactive",
        "Closed",
      ].includes(this.status)
    ) {
      this.isActive = false;
    }

    return next();
  }
);

/* =========================================================
   DEFAULT WAREHOUSE ENFORCEMENT
========================================================= */

warehouseSchema.pre(
  "save",
  async function enforceDefaultWarehouse() {
    if (
      !this.isDefault ||
      !this.tenant ||
      this.isDeleted
    ) {
      return;
    }

    await this.constructor.updateMany(
      {
        tenant: this.tenant,

        _id: {
          $ne: this._id,
        },

        isDefault: true,

        isDeleted: false,
      },
      {
        $set: {
          isDefault: false,
        },
      }
    );
  }
);

/* =========================================================
   QUERY HELPERS
========================================================= */

warehouseSchema.query.active =
  function active() {
    return this.where({
      isActive: true,
      status: "Active",
      isDeleted: false,
    });
  };

warehouseSchema.query.notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

warehouseSchema.query.forTenant =
  function forTenant(tenantId) {
    return this.where({
      tenant: tenantId,
    });
  };

/* =========================================================
   STATIC METHODS
========================================================= */

warehouseSchema.statics.findDefaultWarehouse =
  function findDefaultWarehouse(
    tenantId
  ) {
    return this.findOne({
      tenant: tenantId,
      isDefault: true,
      isActive: true,
      status: "Active",
      isDeleted: false,
    });
  };

warehouseSchema.statics.findActiveWarehouses =
  function findActiveWarehouses(
    tenantId
  ) {
    return this.find({
      tenant: tenantId,
      isActive: true,
      status: "Active",
      isDeleted: false,
    }).sort({
      isDefault: -1,
      name: 1,
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

warehouseSchema.methods.softDelete =
  async function softDelete(
    userId
  ) {
    this.isDeleted = true;
    this.isActive = false;
    this.status = "Inactive";
    this.isDefault = false;
    this.deletedAt =
      new Date();
    this.deletedBy =
      userId;
    this.updatedBy =
      userId;

    return this.save();
  };

warehouseSchema.methods.restore =
  async function restore(
    userId
  ) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.status = "Active";
    this.isActive = true;
    this.updatedBy =
      userId;

    return this.save();
  };

/* =========================================================
   MODEL
========================================================= */

const Warehouse =
  mongoose.models.Warehouse ||
  mongoose.model(
    "Warehouse",
    warehouseSchema
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = Warehouse;

module.exports.WAREHOUSE_TYPES =
  WAREHOUSE_TYPES;

module.exports.WAREHOUSE_STATUSES =
  WAREHOUSE_STATUSES;