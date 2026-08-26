const mongoose = require("mongoose");

/* =====================================================
   ABOUT PAGE SUB SCHEMAS
===================================================== */

const aboutValueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: [150, "About value title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "About value description cannot exceed 1000 characters"],
    },
    icon: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "About value icon cannot exceed 100 characters"],
    },
  },
  {
    _id: false,
  }
);

const aboutJourneyStepSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: [150, "About journey title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "About journey description cannot exceed 1000 characters"],
    },
  },
  {
    _id: false,
  }
);

const aboutPageSchema = new mongoose.Schema(
  {
    menuTitle: {
      type: String,
      default: "About Us",
      trim: true,
      maxlength: [100, "About menu title cannot exceed 100 characters"],
    },

    banner: {
      image: {
        type: String,
        default: "",
        trim: true,
      },
      altText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "About banner alt text cannot exceed 200 characters"],
      },
      label: {
        type: String,
        default: "",
        trim: true,
        maxlength: [150, "About banner label cannot exceed 150 characters"],
      },
    },

    hero: {
      badge: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About hero badge cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "About hero title cannot exceed 200 characters"],
      },
      highlightedTitle: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "About highlighted title cannot exceed 200 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "About hero description cannot exceed 1500 characters"],
      },
      primaryButtonText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [80, "About primary button text cannot exceed 80 characters"],
      },
      primaryButtonLink: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "About primary button link cannot exceed 500 characters"],
      },
      secondaryButtonText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [80, "About secondary button text cannot exceed 80 characters"],
      },
      secondaryButtonLink: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "About secondary button link cannot exceed 500 characters"],
      },
    },

    intro: {
      eyebrow: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About intro eyebrow cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [250, "About intro title cannot exceed 250 characters"],
      },
      paragraphOne: {
        type: String,
        default: "",
        trim: true,
        maxlength: [3000, "About intro paragraph cannot exceed 3000 characters"],
      },
      paragraphTwo: {
        type: String,
        default: "",
        trim: true,
        maxlength: [3000, "About intro paragraph cannot exceed 3000 characters"],
      },
    },

    values: {
      eyebrow: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About values eyebrow cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [250, "About values title cannot exceed 250 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "About values description cannot exceed 1500 characters"],
      },
      items: {
        type: [aboutValueSchema],
        default: [],
      },
    },

    commitment: {
      eyebrow: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About commitment eyebrow cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [250, "About commitment title cannot exceed 250 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "About commitment description cannot exceed 1500 characters"],
      },
      items: {
        type: [String],
        default: [],
      },
    },

    journey: {
      eyebrow: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About journey eyebrow cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [250, "About journey title cannot exceed 250 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "About journey description cannot exceed 1500 characters"],
      },
      steps: {
        type: [aboutJourneyStepSchema],
        default: [],
      },
    },

    notice: {
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "About notice title cannot exceed 200 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [2000, "About notice description cannot exceed 2000 characters"],
      },
    },

    cta: {
      eyebrow: {
        type: String,
        default: "",
        trim: true,
        maxlength: [100, "About CTA eyebrow cannot exceed 100 characters"],
      },
      title: {
        type: String,
        default: "",
        trim: true,
        maxlength: [250, "About CTA title cannot exceed 250 characters"],
      },
      description: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "About CTA description cannot exceed 1500 characters"],
      },
      primaryButtonText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [80, "About CTA primary button text cannot exceed 80 characters"],
      },
      primaryButtonLink: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "About CTA primary button link cannot exceed 500 characters"],
      },
      secondaryButtonText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [80, "About CTA secondary button text cannot exceed 80 characters"],
      },
      secondaryButtonLink: {
        type: String,
        default: "",
        trim: true,
        maxlength: [500, "About CTA secondary button link cannot exceed 500 characters"],
      },
    },

    seo: {
      metaTitle: {
        type: String,
        default: "",
        trim: true,
        maxlength: [160, "About meta title cannot exceed 160 characters"],
      },
      metaDescription: {
        type: String,
        default: "",
        trim: true,
        maxlength: [320, "About meta description cannot exceed 320 characters"],
      },
    },
  },
  {
    _id: false,
  }
);

/* =====================================================
   FOOTER CONTENT PAGE SUB SCHEMA

   Used for tenant-owned informational pages managed from
   Footer Management. The "content" field can store the
   rich-text/HTML produced by the admin editor.

   Functional system pages such as Cart, Checkout,
   My Account and Track Orders are intentionally NOT
   represented here.
===================================================== */

const footerContentPageSchema = new mongoose.Schema(
  {
    menuTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "Footer page menu title cannot exceed 100 characters"],
    },

    pageTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [250, "Footer page title cannot exceed 250 characters"],
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Footer page subtitle cannot exceed 1000 characters"],
    },

    banner: {
      image: {
        type: String,
        default: "",
        trim: true,
      },

      altText: {
        type: String,
        default: "",
        trim: true,
        maxlength: [200, "Footer page banner alt text cannot exceed 200 characters"],
      },
    },

    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100000, "Footer page content cannot exceed 100000 characters"],
    },

    seo: {
      metaTitle: {
        type: String,
        default: "",
        trim: true,
        maxlength: [160, "Footer page meta title cannot exceed 160 characters"],
      },

      metaDescription: {
        type: String,
        default: "",
        trim: true,
        maxlength: [320, "Footer page meta description cannot exceed 320 characters"],
      },
    },
  },
  {
    _id: false,
  }
);

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
      match: [/^SRESTE_202609\d{4,}$/, "Invalid Tenant ID format"],
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
       ABOUT US PAGE
    ===================================================== */

    aboutPage: {
      type: aboutPageSchema,
      default: () => ({}),
    },

    /* =====================================================
       FOOTER MANAGEMENT CONTENT PAGES

       Customer Info:
       - About Us
       - Contact Us
       - Privacy Policy
       - Terms & Conditions
       - Return & Refund Policy

       Quick Navigation:
       - Customer Support

       NOTE:
       Cart, Checkout, My Account and Track Orders remain
       functional system pages and are intentionally untouched.
    ===================================================== */

    contactPage: {
      type: footerContentPageSchema,
      default: () => ({
        menuTitle: "Contact Us",
      }),
    },

    privacyPolicyPage: {
      type: footerContentPageSchema,
      default: () => ({
        menuTitle: "Privacy Policy",
      }),
    },

    termsConditionsPage: {
      type: footerContentPageSchema,
      default: () => ({
        menuTitle: "Terms & Conditions",
      }),
    },

    returnRefundPage: {
      type: footerContentPageSchema,
      default: () => ({
        menuTitle: "Return & Refund Policy",
      }),
    },

    customerSupportPage: {
      type: footerContentPageSchema,
      default: () => ({
        menuTitle: "Customer Support",
      }),
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
        enum: ["trial", "active", "expired", "suspended", "cancelled"],
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
    this.storeContact.email = this.storeContact.email.toLowerCase().trim();
  }

  if (this.branding && !this.branding.storeTitle) {
    this.branding.storeTitle = this.storeName;
  }

  if (
    this.subscription?.status === "trial" &&
    this.subscription?.trialEndsAt &&
    !this.subscription?.expiresAt
  ) {
    this.subscription.expiresAt = this.subscription.trialEndsAt;
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
  mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);

module.exports = Tenant;
