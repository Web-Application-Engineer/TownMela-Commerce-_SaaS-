"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const SETTINGS_SCHEMA_VERSION = 1;

const CURRENCY_CODES = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SAR",
];

const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

const TIME_FORMATS = [
  "12-hour",
  "24-hour",
];

const ORDER_NUMBER_FORMATS = [
  "sequential",
  "timestamp",
  "random",
];

const STOCK_POLICIES = [
  "deny",
  "allow",
  "warn",
];

/* =========================================================
   GENERAL SETTINGS
========================================================= */

const generalSettingsSchema = new Schema(
  {
    storeName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    legalBusinessName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },

    supportPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
      default: "BD",
    },

    currency: {
      type: String,
      enum: CURRENCY_CODES,
      default: "BDT",
    },

    timezone: {
      type: String,
      enum: TIMEZONES,
      default: "Asia/Dhaka",
    },

    locale: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "en-BD",
    },

    dateFormat: {
      type: String,
      enum: DATE_FORMATS,
      default: "DD/MM/YYYY",
    },

    timeFormat: {
      type: String,
      enum: TIME_FORMATS,
      default: "12-hour",
    },

    address: {
      line1: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      line2: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 2,
        default: "BD",
      },
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    maintenanceMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default:
        "Our store is temporarily unavailable. Please check again later.",
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   BRANDING SETTINGS
========================================================= */

const brandingSettingsSchema = new Schema(
  {
    logoUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    darkLogoUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    faviconUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    primaryColor: {
      type: String,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#111827",
    },

    secondaryColor: {
      type: String,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#F59E0B",
    },

    accentColor: {
      type: String,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#2563EB",
    },

    storeTagline: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    footerText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    invoiceLogoUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    invoiceFooterText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    socialLinks: {
      facebook: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      instagram: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      youtube: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      linkedin: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      tiktok: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      x: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   ORDER SETTINGS
========================================================= */

const orderSettingsSchema = new Schema(
  {
    orderPrefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: "ORD",
    },

    orderNumberFormat: {
      type: String,
      enum: ORDER_NUMBER_FORMATS,
      default: "sequential",
    },

    orderNumberPadding: {
      type: Number,
      min: 3,
      max: 12,
      default: 6,
    },

    startingOrderNumber: {
      type: Number,
      min: 1,
      default: 1001,
    },

    allowGuestCheckout: {
      type: Boolean,
      default: true,
    },

    requirePhoneNumber: {
      type: Boolean,
      default: true,
    },

    requireEmailAddress: {
      type: Boolean,
      default: false,
    },

    autoConfirmOrders: {
      type: Boolean,
      default: false,
    },

    allowOrderCancellation: {
      type: Boolean,
      default: true,
    },

    cancellationWindowMinutes: {
      type: Number,
      min: 0,
      max: 10080,
      default: 30,
    },

    allowOrderNotes: {
      type: Boolean,
      default: true,
    },

    defaultOrderStatus: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
      default: "pending",
    },

    defaultPaymentStatus: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
      default: "unpaid",
    },

    minimumOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxIncludedInPrice: {
      type: Boolean,
      default: false,
    },

    defaultTaxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   INVENTORY SETTINGS
========================================================= */

const inventorySettingsSchema = new Schema(
  {
    trackInventory: {
      type: Boolean,
      default: true,
    },

    stockPolicy: {
      type: String,
      enum: STOCK_POLICIES,
      default: "deny",
    },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 5,
    },

    outOfStockThreshold: {
      type: Number,
      min: 0,
      default: 0,
    },

    showStockQuantityToCustomers: {
      type: Boolean,
      default: false,
    },

    allowBackorders: {
      type: Boolean,
      default: false,
    },

    reserveStockOnOrder: {
      type: Boolean,
      default: true,
    },

    releaseStockOnCancellation: {
      type: Boolean,
      default: true,
    },

    autoPostGoodsReceived: {
      type: Boolean,
      default: false,
    },

    requireGoodsReceivedInspection: {
      type: Boolean,
      default: true,
    },

    requireInventoryPostingApproval: {
      type: Boolean,
      default: true,
    },

    defaultWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },

    stockAdjustmentRequiresReason: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   NOTIFICATION SETTINGS
========================================================= */

const notificationChannelSchema =
  new Schema(
    {
      email: {
        type: Boolean,
        default: true,
      },

      sms: {
        type: Boolean,
        default: false,
      },

      push: {
        type: Boolean,
        default: false,
      },

      inApp: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
    }
  );

const notificationSettingsSchema =
  new Schema(
    {
      orderCreated: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      orderConfirmed: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      orderCancelled: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      orderDelivered: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      paymentReceived: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      paymentFailed: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      lowStock: {
        type: notificationChannelSchema,
        default: () => ({
          email: true,
          sms: false,
          push: false,
          inApp: true,
        }),
      },

      goodsReceived: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      vendorInvoiceDue: {
        type: notificationChannelSchema,
        default: () => ({}),
      },

      securityAlert: {
        type: notificationChannelSchema,
        default: () => ({
          email: true,
          sms: false,
          push: false,
          inApp: true,
        }),
      },

      senderName: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      replyToEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   SECURITY SETTINGS
========================================================= */

const securitySettingsSchema = new Schema(
  {
    requireTwoFactorForOwner: {
      type: Boolean,
      default: false,
    },

    requireTwoFactorForAdmins: {
      type: Boolean,
      default: false,
    },

    sessionTimeoutMinutes: {
      type: Number,
      min: 5,
      max: 10080,
      default: 1440,
    },

    maxLoginAttempts: {
      type: Number,
      min: 1,
      max: 20,
      default: 5,
    },

    loginLockDurationMinutes: {
      type: Number,
      min: 1,
      max: 1440,
      default: 30,
    },

    passwordMinimumLength: {
      type: Number,
      min: 8,
      max: 128,
      default: 8,
    },

    passwordRequireUppercase: {
      type: Boolean,
      default: true,
    },

    passwordRequireLowercase: {
      type: Boolean,
      default: true,
    },

    passwordRequireNumber: {
      type: Boolean,
      default: true,
    },

    passwordRequireSymbol: {
      type: Boolean,
      default: false,
    },

    allowConcurrentSessions: {
      type: Boolean,
      default: true,
    },

    notifyOnNewLogin: {
      type: Boolean,
      default: true,
    },

    auditSensitiveActions: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   USER AND ROLE SETTINGS
========================================================= */

const userSettingsSchema = new Schema(
  {
    allowTenantAdminToInviteUsers: {
      type: Boolean,
      default: true,
    },

    allowTenantAdminToManageRoles: {
      type: Boolean,
      default: true,
    },

    requireOwnerApprovalForNewAdmins: {
      type: Boolean,
      default: false,
    },

    defaultNewUserRole: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: "tenant_admin",
    },

    invitationExpiryHours: {
      type: Number,
      min: 1,
      max: 720,
      default: 72,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   BILLING SETTINGS

   Sensitive card details, gateway secrets বা private API keys
   এই document-এ রাখা হবে না।
========================================================= */

const billingSettingsSchema = new Schema(
  {
    billingEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },

    invoiceName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    taxIdentificationNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    billingAddress: {
      line1: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      line2: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 30,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 2,
        default: "BD",
      },
    },

    receiveBillingNotifications: {
      type: Boolean,
      default: true,
    },

    receiveUsageWarnings: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   INTEGRATION SETTINGS

   এখানে শুধুমাত্র public configuration এবং feature status
   থাকবে। Secret credentials আলাদা encrypted storage-এ থাকবে।
========================================================= */

const integrationItemSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    configured: {
      type: Boolean,
      default: false,
    },

    provider: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: "",
    },

    configurationReference: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const integrationSettingsSchema =
  new Schema(
    {
      paymentGateway: {
        type: integrationItemSchema,
        default: () => ({}),
      },

      emailProvider: {
        type: integrationItemSchema,
        default: () => ({}),
      },

      smsProvider: {
        type: integrationItemSchema,
        default: () => ({}),
      },

      analyticsProvider: {
        type: integrationItemSchema,
        default: () => ({}),
      },

      accountingProvider: {
        type: integrationItemSchema,
        default: () => ({}),
      },

      customApi: {
        type: integrationItemSchema,
        default: () => ({}),
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   OWNER-ONLY SETTINGS

   এই section শুধু Tenant Owner service/controller দিয়ে
   update করতে পারবে।
========================================================= */

const ownerOnlySettingsSchema = new Schema(
  {
    allowTenantDeletion: {
      type: Boolean,
      default: true,
    },

    allowOwnershipTransfer: {
      type: Boolean,
      default: true,
    },

    allowSubscriptionCancellation: {
      type: Boolean,
      default: true,
    },

    requirePasswordConfirmationForSensitiveActions: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   SETTINGS AUDIT METADATA
========================================================= */

const auditMetadataSchema = new Schema(
  {
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastUpdatedRole: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: "",
    },

    lastUpdatedSection: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: "",
    },

    lastRequestId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    migrationVersion: {
      type: Number,
      min: 1,
      default: SETTINGS_SCHEMA_VERSION,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   TENANT SETTINGS ROOT SCHEMA
========================================================= */

const tenantSettingSchema = new Schema(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [
        true,
        "Tenant is required for tenant settings",
      ],
      immutable: true,
    },

    schemaVersion: {
      type: Number,
      min: 1,
      default: SETTINGS_SCHEMA_VERSION,
    },

    general: {
      type: generalSettingsSchema,
      default: () => ({}),
    },

    branding: {
      type: brandingSettingsSchema,
      default: () => ({}),
    },

    orders: {
      type: orderSettingsSchema,
      default: () => ({}),
    },

    inventory: {
      type: inventorySettingsSchema,
      default: () => ({}),
    },

    notifications: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },

    security: {
      type: securitySettingsSchema,
      default: () => ({}),
    },

    users: {
      type: userSettingsSchema,
      default: () => ({}),
    },

    billing: {
      type: billingSettingsSchema,
      default: () => ({}),
    },

    integrations: {
      type: integrationSettingsSchema,
      default: () => ({}),
    },

    ownerOnly: {
      type: ownerOnlySettingsSchema,
      default: () => ({}),
      select: false,
    },

    audit: {
      type: auditMetadataSchema,
      default: () => ({}),
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(document, returnedObject) {
        delete returnedObject.ownerOnly;
        delete returnedObject.__v;

        return returnedObject;
      },
    },

    toObject: {
      virtuals: true,
      versionKey: false,
    },
  }
);

/* =========================================================
   INDEXES

   প্রতিটি tenant-এর জন্য কেবল একটি settings document থাকবে।
========================================================= */

tenantSettingSchema.index(
  {
    tenant: 1,
  },
  {
    unique: true,
    name: "unique_tenant_settings",
  }
);

tenantSettingSchema.index(
  {
    tenant: 1,
    isActive: 1,
  },
  {
    name: "tenant_active_settings_lookup",
  }
);

/* =========================================================
   QUERY HELPERS
========================================================= */

tenantSettingSchema.query.byTenant =
  function byTenant(tenantId) {
    return this.where({
      tenant: tenantId,
    });
  };

tenantSettingSchema.query.active =
  function active() {
    return this.where({
      isActive: true,
      archivedAt: null,
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

tenantSettingSchema.methods.markUpdated =
  function markUpdated({
    userId = null,
    role = "",
    section = "",
    requestId = "",
  } = {}) {
    this.audit = {
      ...this.audit?.toObject?.(),
      lastUpdatedBy:
        userId || null,
      lastUpdatedRole:
        String(role || "")
          .trim()
          .toLowerCase(),
      lastUpdatedSection:
        String(section || "")
          .trim()
          .toLowerCase(),
      lastRequestId:
        String(requestId || "")
          .trim()
          .slice(0, 200),
      migrationVersion:
        this.schemaVersion ||
        SETTINGS_SCHEMA_VERSION,
    };

    return this;
  };

/* =========================================================
   STATIC METHODS
========================================================= */

tenantSettingSchema.statics.findByTenant =
  function findByTenant(
    tenantId,
    options = {}
  ) {
    const query = this.findOne({
      tenant: tenantId,
      isActive: true,
      archivedAt: null,
    });

    if (options.includeOwnerOnly === true) {
      query.select("+ownerOnly");
    }

    return query;
  };

tenantSettingSchema.statics.getOrCreateForTenant =
  async function getOrCreateForTenant(
    tenantId
  ) {
    const existingSettings =
      await this.findOne({
        tenant: tenantId,
        isActive: true,
        archivedAt: null,
      });

    if (existingSettings) {
      return existingSettings;
    }

    try {
      return await this.create({
        tenant: tenantId,
      });
    } catch (error) {
      /*
        একই tenant-এর জন্য simultaneous requests হলে unique
        index duplicate error হতে পারে। তখন existing document
        return করা হবে।
      */

      if (error?.code === 11000) {
        const settings =
          await this.findOne({
            tenant: tenantId,
            isActive: true,
            archivedAt: null,
          });

        if (settings) {
          return settings;
        }
      }

      throw error;
    }
  };

/* =========================================================
   MODEL EXPORT
========================================================= */

const TenantSetting =
  mongoose.models.TenantSetting ||
  mongoose.model(
    "TenantSetting",
    tenantSettingSchema
  );

module.exports = TenantSetting;