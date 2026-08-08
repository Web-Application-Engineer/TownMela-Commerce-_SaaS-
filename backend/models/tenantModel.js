const mongoose = require("mongoose");

/* =====================================================
   TENANT SCHEMA
===================================================== */

const tenantSchema = new mongoose.Schema(
  {
    /* =====================================================
       BUSINESS INFORMATION
    ===================================================== */

    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [150, "Business name cannot exceed 150 characters"],
    },

    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [150, "Store name cannot exceed 150 characters"],
    },

    slug: {
      type: String,
      required: [true, "Tenant slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

tenantCode: {
  type: String,
  required: [true, "Tenant code is required"],
  unique: true,
  trim: true,
  immutable: true,
  index: true,
  match: [
    /^SRESTE_202609\d{4,}$/,
    "Invalid Tenant ID format",
  ],
},


    /* =====================================================
       TENANT OWNER INFORMATION
    ===================================================== */

    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
    },

    ownerEmail: {
      type: String,
      required: [true, "Owner email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },

    ownerPhone: {
      type: String,
      required: [true, "Owner phone is required"],
      trim: true,
    },

    /* =====================================================
       DOMAIN INFORMATION
    ===================================================== */

    customDomain: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },

    domainVerified: {
      type: Boolean,
      default: false,
    },

    /* =====================================================
       STORE BRANDING
    ===================================================== */

    branding: {
      logo: {
        type: String,
        default: "",
        trim: true,
      },

      favicon: {
        type: String,
        default: "",
        trim: true,
      },

      primaryColor: {
        type: String,
        default: "#16a34a",
        trim: true,
      },

      secondaryColor: {
        type: String,
        default: "#111827",
        trim: true,
      },

      storeTitle: {
        type: String,
        default: "",
        trim: true,
      },

      storeTagline: {
        type: String,
        default: "",
        trim: true,
      },
    },

    /* =====================================================
       STORE CONTACT INFORMATION
    ===================================================== */

    storeContact: {
      email: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      country: {
        type: String,
        default: "Bangladesh",
        trim: true,
      },
    },

    /* =====================================================
       SUBSCRIPTION
    ===================================================== */

    subscription: {
      plan: {
        type: String,
        enum: ["Standard"],
        default: "Standard",
        required: true,
      },

      isTrial: {
        type: Boolean,
        default: true,
      },

      trialDays: {
        type: Number,
        default: 7,
        min: [0, "Trial days cannot be negative"],
      },

      trialEndsAt: {
        type: Date,
        default: null,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "trial",
          "active",
          "expired",
          "suspended",
          "cancelled",
        ],
        default: "trial",
        required: true,
        index: true,
      },

      startsAt: {
        type: Date,
        default: Date.now,
      },

      expiresAt: {
        type: Date,
        required: [true, "Subscription expiry date is required"],
        index: true,
      },

      autoRenew: {
        type: Boolean,
        default: false,
      },
    },

    /* =====================================================
       TENANT STATUS
    ===================================================== */

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    setupCompleted: {
      type: Boolean,
      default: false,
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =====================================================
   INDEXES
===================================================== */

tenantSchema.index({
  ownerEmail: 1,
  isDeleted: 1,
});

tenantSchema.index({
  status: 1,
  "subscription.status": 1,
});

tenantSchema.index({
  "subscription.status": 1,
  "subscription.trialEndsAt": 1,
  "subscription.expiresAt": 1,
});

tenantSchema.index(
  {
    customDomain: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      customDomain: {
        $type: "string",
      },
    },
  }
);

/* =====================================================
   PRE VALIDATION
===================================================== */

tenantSchema.pre("validate", function (next) {
  if (this.slug) {
    this.slug = this.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (this.customDomain) {
    this.customDomain = this.customDomain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split(":")[0]
      .trim();
  }

  if (this.ownerEmail) {
    this.ownerEmail = this.ownerEmail.toLowerCase().trim();
  }

  if (this.storeContact?.email) {
    this.storeContact.email =
      this.storeContact.email.toLowerCase().trim();
  }

  if (this.branding && !this.branding.storeTitle) {
    this.branding.storeTitle = this.storeName;
  }

  if (
    this.subscription?.status === "trial" &&
    this.subscription?.trialEndsAt &&
    !this.subscription?.expiresAt
  ) {
    this.subscription.expiresAt =
      this.subscription.trialEndsAt;
  }

  next();
});

/* =====================================================
   INSTANCE METHODS
===================================================== */

tenantSchema.methods.isSubscriptionActive = function () {
  if (this.status !== "active" || !this.subscription) {
    return false;
  }

  const now = new Date();

  if (this.subscription.status === "trial") {
    return Boolean(
      this.subscription.isTrial === true &&
      this.subscription.trialEndsAt &&
      new Date(this.subscription.trialEndsAt) > now
    );
  }

  if (this.subscription.status === "active") {
    return Boolean(
      this.subscription.isTrial === false &&
      this.subscription.expiresAt &&
      new Date(this.subscription.expiresAt) > now
    );
  }

  return false;
};

/* =====================================================
   JSON TRANSFORM
===================================================== */

tenantSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    return ret;
  },
});

/* =====================================================
   MODEL EXPORT
===================================================== */

const Tenant =
  mongoose.models.Tenant ||
  mongoose.model("Tenant", tenantSchema);

module.exports = Tenant;
