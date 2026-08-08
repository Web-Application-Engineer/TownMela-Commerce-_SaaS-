"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const SUPPLIER_STATUSES = [
  "Active",
  "Inactive",
  "Blocked",
];

const SUPPLIER_TYPES = [
  "Local",
  "International",
  "Manufacturer",
  "Distributor",
  "Wholesaler",
  "Other",
];

const PAYMENT_TERMS = [
  "Immediate",
  "Advance",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Custom",
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

const normalizeRequiredString = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
};

const normalizeEmail = (value) => {
  const normalizedValue =
    normalizeOptionalString(value);

  return normalizedValue
    ? normalizedValue.toLowerCase()
    : null;
};

const normalizeSupplierCode = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
};

const normalizeCurrency = (value) => {
  if (typeof value !== "string") {
    return "BDT";
  }

  const cleanValue = value
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(cleanValue)
    ? cleanValue
    : "BDT";
};

/* =========================================================
   ADDRESS SCHEMA
========================================================= */

const supplierAddressSchema =
  new mongoose.Schema(
    {
      addressLine1: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      addressLine2: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      area: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
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
        set: normalizeRequiredString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   BANK ACCOUNT SCHEMA
========================================================= */

const supplierBankAccountSchema =
  new mongoose.Schema(
    {
      accountName: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      accountNumber: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      bankName: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      branchName: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      routingNumber: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      swiftCode: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        set: normalizeOptionalString,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   MOBILE BANKING SCHEMA
========================================================= */

const mobileBankingSchema =
  new mongoose.Schema(
    {
      provider: {
        type: String,
        enum: [
          "bKash",
          "Nagad",
          "Rocket",
          "Upay",
          "Other",
        ],
        default: null,
      },

      accountName: {
        type: String,
        default: null,
        trim: true,
        set: normalizeOptionalString,
      },

      accountNumber: {
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
   SUPPLIER SCHEMA
========================================================= */

const supplierSchema =
  new mongoose.Schema(
    {
      /*
        Multi-tenant isolation.

        Tenant অবশ্যই authenticated server context থেকে
        assign করতে হবে। Client request body থেকে tenant
        গ্রহণ করা যাবে না।
      */

      tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        immutable: true,
        index: true,
      },

      /*
        Supplier code tenant-এর মধ্যে unique হবে।

        Example:
        SUP-000001
      */

      supplierCode: {
        type: String,
        required: true,
        immutable: true,
        trim: true,
        uppercase: true,
        set: normalizeSupplierCode,

        match: [
          /^[A-Z0-9][A-Z0-9_-]{1,49}$/,
          "Supplier code contains invalid characters",
        ],
      },

      businessName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
        set: normalizeRequiredString,
      },

      displayName: {
        type: String,
        default: null,
        trim: true,
        maxlength: 180,
        set: normalizeOptionalString,
      },

      supplierType: {
        type: String,
        enum: SUPPLIER_TYPES,
        default: "Local",
        required: true,
      },

      contactPerson: {
        type: String,
        default: null,
        trim: true,
        maxlength: 120,
        set: normalizeOptionalString,
      },

      designation: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
        set: normalizeRequiredString,
      },

      alternatePhone: {
        type: String,
        default: null,
        trim: true,
        maxlength: 30,
        set: normalizeOptionalString,
      },

      email: {
        type: String,
        default: null,
        trim: true,
        lowercase: true,
        maxlength: 180,
        set: normalizeEmail,

        match: [
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          "Please provide a valid supplier email",
        ],
      },

      website: {
        type: String,
        default: null,
        trim: true,
        maxlength: 300,
        set: normalizeOptionalString,
      },

      address: {
        type: supplierAddressSchema,
        default: () => ({}),
      },

      taxIdentificationNumber: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      businessIdentificationNumber: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      tradeLicenseNumber: {
        type: String,
        default: null,
        trim: true,
        uppercase: true,
        maxlength: 100,
        set: normalizeOptionalString,
      },

      currency: {
        type: String,
        required: true,
        default: "BDT",
        uppercase: true,
        trim: true,
        set: normalizeCurrency,

        match: [
          /^[A-Z]{3}$/,
          "Currency must be a valid 3-letter ISO code",
        ],
      },

      paymentTerm: {
        type: String,
        enum: PAYMENT_TERMS,
        default: "Immediate",
        required: true,
      },

      customPaymentTermDays: {
        type: Number,
        min: 0,
        max: 3650,
        default: null,
      },

      creditLimit: {
        type: Number,
        min: 0,
        default: 0,
      },

      /*
        openingBalance শুধু supplier onboarding-এর সময়
        historical payable/advance balance capture করবে।

        Positive value = supplier-কে payable
        Negative value = supplier advance
      */

      openingBalance: {
        type: Number,
        default: 0,
      },

      /*
        currentBalance একটি cached summary field।

        SupplierLedger হবে accounting source of truth।
        এই field controller থেকে সরাসরি arbitrary update
        করা যাবে না।
      */

      currentBalance: {
        type: Number,
        default: 0,
      },

      totalPurchaseAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalPaidAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      totalReturnAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      bankAccount: {
        type: supplierBankAccountSchema,
        default: () => ({}),
      },

      mobileBanking: {
        type: mobileBankingSchema,
        default: () => ({}),
      },

      notes: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000,
        set: normalizeOptionalString,
      },

      tags: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 50,
          },
        ],
        default: [],
      },

      status: {
        type: String,
        enum: SUPPLIER_STATUSES,
        default: "Active",
        required: true,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
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

supplierSchema.pre(
  "validate",
  function validateSupplier(next) {
    if (
      this.paymentTerm === "Custom" &&
      (
        this.customPaymentTermDays === null ||
        this.customPaymentTermDays === undefined
      )
    ) {
      this.invalidate(
        "customPaymentTermDays",
        "Custom payment term days are required"
      );
    }

    if (this.paymentTerm !== "Custom") {
      this.customPaymentTermDays = null;
    }

    if (
      !this.displayName &&
      this.businessName
    ) {
      this.displayName =
        this.businessName;
    }

    if (Array.isArray(this.tags)) {
      this.tags = [
        ...new Set(
          this.tags
            .filter(
              (tag) =>
                typeof tag === "string"
            )
            .map((tag) => tag.trim())
            .filter(Boolean)
        ),
      ];
    }

    next();
  }
);

/* =========================================================
   DATABASE INDEXES
========================================================= */

/*
  Supplier code tenant-এর মধ্যে unique।
*/

supplierSchema.index(
  {
    tenant: 1,
    supplierCode: 1,
  },
  {
    unique: true,
    name: "tenant_supplier_code_unique",
  }
);

/*
  একই tenant-এর active supplier business name দিয়ে
  accidental duplicate কমানো হবে।

  এটি strict unique রাখা হয়নি, কারণ বাস্তবে একই নামে
  একাধিক supplier থাকতে পারে।
*/

supplierSchema.index({
  tenant: 1,
  businessName: 1,
  isDeleted: 1,
});

/*
  Supplier list filtering।
*/

supplierSchema.index({
  tenant: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1,
});

/*
  Supplier phone search।
*/

supplierSchema.index({
  tenant: 1,
  phone: 1,
  isDeleted: 1,
});

/*
  Supplier email search।
*/

supplierSchema.index(
  {
    tenant: 1,
    email: 1,
    isDeleted: 1,
  },
  {
    partialFilterExpression: {
      email: {
        $type: "string",
      },
    },
  }
);

/*
  Recently created supplier list।
*/

supplierSchema.index({
  tenant: 1,
  createdAt: -1,
});

/* =========================================================
   INSTANCE METHODS
========================================================= */

supplierSchema.methods.softDelete =
  async function softDelete({
    userId,
    session = null,
  } = {}) {
    this.isDeleted = true;
    this.status = "Inactive";
    this.deletedAt = new Date();
    this.deletedBy = userId || null;
    this.updatedBy = userId || null;

    return this.save({
      session,
    });
  };

/* =========================================================
   JSON TRANSFORMATION
========================================================= */

supplierSchema.set("toJSON", {
  transform(document, returnedObject) {
    delete returnedObject.__v;

    return returnedObject;
  },
});

/* =========================================================
   EXPORT
========================================================= */

module.exports = mongoose.model(
  "Supplier",
  supplierSchema
);

module.exports.SUPPLIER_STATUSES =
  SUPPLIER_STATUSES;

module.exports.SUPPLIER_TYPES =
  SUPPLIER_TYPES;

module.exports.PAYMENT_TERMS =
  PAYMENT_TERMS;