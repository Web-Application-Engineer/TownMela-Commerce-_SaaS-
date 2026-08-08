"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_ELIGIBLE_ORDER_STATUSES = [
  "Delivered",
  "Completed",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeObjectId = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return String(value._id).trim();
  }

  if (
    typeof value === "object" &&
    value.id
  ) {
    return String(value.id).trim();
  }

  return String(value).trim();
};

const createModelError = (
  message,
  statusCode = 400,
  code = "ROI_SETTING_MODEL_ERROR",
  details = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
};

const resolveFindOrCreateArguments = (
  input
) => {
  /*
    Supports both call styles:

    ROISetting.findOrCreateForTenant(tenantId)

    ROISetting.findOrCreateForTenant({
      tenantId,
      userId,
      session,
    })
  */
  if (
    input &&
    typeof input === "object" &&
    !mongoose.isValidObjectId(input) &&
    (
      Object.prototype.hasOwnProperty.call(
        input,
        "tenantId"
      ) ||
      Object.prototype.hasOwnProperty.call(
        input,
        "userId"
      ) ||
      Object.prototype.hasOwnProperty.call(
        input,
        "session"
      )
    )
  ) {
    return {
      tenantId: input.tenantId,
      userId:
        input.userId || null,
      session:
        input.session || null,
    };
  }

  return {
    tenantId: input,
    userId: null,
    session: null,
  };
};

/* =========================================================
   ROI SETTING SCHEMA
========================================================= */

const roiSettingSchema =
  new mongoose.Schema(
    {
      /* =====================================================
         TENANT ISOLATION
      ===================================================== */

      tenant: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Tenant",
        required: [
          true,
          "Tenant is required for ROI settings.",
        ],
        index: true,
      },

      /* =====================================================
         GENERAL SETTINGS
      ===================================================== */

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "BDT",
        maxlength: [
          10,
          "Currency code cannot exceed 10 characters.",
        ],
      },

      /* =====================================================
         FIXED ORDER COSTS
      ===================================================== */

      packagingCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Packaging cost cannot be negative.",
        ],
      },

      advertisingCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Advertising cost cannot be negative.",
        ],
      },

      transportCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Transport cost cannot be negative.",
        ],
      },

      overheadCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Overhead cost cannot be negative.",
        ],
      },

      handlingCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Handling cost cannot be negative.",
        ],
      },

      processingCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Processing cost cannot be negative.",
        ],
      },

      otherCostPerOrder: {
        type: Number,
        default: 0,
        min: [
          0,
          "Other cost cannot be negative.",
        ],
      },

      gatewayFeePercent: {
        type: Number,
        default: 0,
        min: [
          0,
          "Gateway fee cannot be negative.",
        ],
        max: [
          100,
          "Gateway fee cannot exceed 100 percent.",
        ],
      },

      /* =====================================================
         CALCULATION OPTIONS
      ===================================================== */

      includeCourierCost: {
        type: Boolean,
        default: true,
      },

      includePackagingCost: {
        type: Boolean,
        default: true,
      },

      includeGatewayFee: {
        type: Boolean,
        default: true,
      },

      includeAdvertisingCost: {
        type: Boolean,
        default: true,
      },

      includeTransportCost: {
        type: Boolean,
        default: true,
      },

      includeOverheadCost: {
        type: Boolean,
        default: true,
      },

      includeHandlingCost: {
        type: Boolean,
        default: true,
      },

      includeProcessingCost: {
        type: Boolean,
        default: true,
      },

      includeOtherCost: {
        type: Boolean,
        default: true,
      },

      includeDiscount: {
        type: Boolean,
        default: true,
      },

      includeRefund: {
        type: Boolean,
        default: true,
      },

      /* =====================================================
         ELIGIBLE ORDER STATUSES
      ===================================================== */

      eligibleOrderStatuses: {
        type: [
          {
            type: String,
            trim: true,
          },
        ],
        default:
          DEFAULT_ELIGIBLE_ORDER_STATUSES,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length > 0
            );
          },
          message:
            "At least one eligible order status is required.",
        },
      },

      /* =====================================================
         MODULE STATUS
      ===================================================== */

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

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

      toJSON: {
        virtuals: true,
        transform(
          document,
          returnedObject
        ) {
          returnedObject.id =
            returnedObject._id;

          delete returnedObject._id;

          return returnedObject;
        },
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   INDEXES
========================================================= */

roiSettingSchema.index(
  {
    tenant: 1,
  },
  {
    unique: true,
    name:
      "unique_roi_setting_per_tenant",
  }
);

/* =========================================================
   NORMALIZATION
========================================================= */

roiSettingSchema.pre(
  "validate",
  function normalizeROISetting(
    next
  ) {
    try {
      this.currency =
        String(
          this.currency || "BDT"
        )
          .trim()
          .toUpperCase() ||
        "BDT";

      this.packagingCostPerOrder =
        Math.max(
          Number(
            this
              .packagingCostPerOrder ||
              0
          ),
          0
        );

      this.advertisingCostPerOrder =
        Math.max(
          Number(
            this
              .advertisingCostPerOrder ||
              0
          ),
          0
        );

      this.transportCostPerOrder =
        Math.max(
          Number(this.transportCostPerOrder || 0),
          0
        );

      this.overheadCostPerOrder =
        Math.max(
          Number(this.overheadCostPerOrder || 0),
          0
        );

      this.handlingCostPerOrder =
        Math.max(
          Number(this.handlingCostPerOrder || 0),
          0
        );

      this.processingCostPerOrder =
        Math.max(
          Number(this.processingCostPerOrder || 0),
          0
        );

      this.otherCostPerOrder =
        Math.max(
          Number(this.otherCostPerOrder || 0),
          0
        );

      this.gatewayFeePercent =
        Math.min(
          Math.max(
            Number(
              this.gatewayFeePercent ||
                0
            ),
            0
          ),
          100
        );

      if (
        !Array.isArray(
          this
            .eligibleOrderStatuses
        ) ||
        this
          .eligibleOrderStatuses
          .length === 0
      ) {
        this.eligibleOrderStatuses = [
          ...DEFAULT_ELIGIBLE_ORDER_STATUSES,
        ];
      } else {
        this.eligibleOrderStatuses = [
          ...new Set(
            this
              .eligibleOrderStatuses
              .map((status) =>
                String(
                  status || ""
                ).trim()
              )
              .filter(Boolean)
          ),
        ];
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   INSTANCE METHODS
========================================================= */

roiSettingSchema.methods
  .toSettingsObject =
  function toSettingsObject() {
    return {
      id: this._id,
      tenant: this.tenant,

      currency:
        this.currency || "BDT",

      packagingCostPerOrder:
        Number(
          this
            .packagingCostPerOrder ||
            0
        ),

      advertisingCostPerOrder:
        Number(
          this
            .advertisingCostPerOrder ||
            0
        ),

      transportCostPerOrder:
        Number(this.transportCostPerOrder || 0),

      overheadCostPerOrder:
        Number(this.overheadCostPerOrder || 0),

      handlingCostPerOrder:
        Number(this.handlingCostPerOrder || 0),

      processingCostPerOrder:
        Number(this.processingCostPerOrder || 0),

      otherCostPerOrder:
        Number(this.otherCostPerOrder || 0),

      gatewayFeePercent:
        Number(
          this.gatewayFeePercent || 0
        ),

      includeCourierCost:
        this.includeCourierCost !==
        false,

      includePackagingCost:
        this.includePackagingCost !==
        false,

      includeGatewayFee:
        this.includeGatewayFee !==
        false,

      includeAdvertisingCost:
        this
          .includeAdvertisingCost !==
        false,

      includeTransportCost:
        this.includeTransportCost !== false,

      includeOverheadCost:
        this.includeOverheadCost !== false,

      includeHandlingCost:
        this.includeHandlingCost !== false,

      includeProcessingCost:
        this.includeProcessingCost !== false,

      includeOtherCost:
        this.includeOtherCost !== false,

      includeDiscount:
        this.includeDiscount !== false,

      includeRefund:
        this.includeRefund !== false,

      eligibleOrderStatuses:
        Array.isArray(
          this
            .eligibleOrderStatuses
        ) &&
        this
          .eligibleOrderStatuses
          .length > 0
          ? this
              .eligibleOrderStatuses
          : [
              ...DEFAULT_ELIGIBLE_ORDER_STATUSES,
            ],

      isActive:
        this.isActive !== false,

      createdBy: this.createdBy,
      updatedBy: this.updatedBy,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  };

/* =========================================================
   STATIC METHODS
========================================================= */

roiSettingSchema.statics
  .getDefaults =
  function getDefaults() {
    return {
      currency: "BDT",

      packagingCostPerOrder: 0,
      advertisingCostPerOrder: 0,
      transportCostPerOrder: 0,
      overheadCostPerOrder: 0,
      handlingCostPerOrder: 0,
      processingCostPerOrder: 0,
      otherCostPerOrder: 0,
      gatewayFeePercent: 0,

      includeCourierCost: true,
      includePackagingCost: true,
      includeGatewayFee: true,
      includeAdvertisingCost: true,
      includeTransportCost: true,
      includeOverheadCost: true,
      includeHandlingCost: true,
      includeProcessingCost: true,
      includeOtherCost: true,
      includeDiscount: true,
      includeRefund: true,

      eligibleOrderStatuses: [
        ...DEFAULT_ELIGIBLE_ORDER_STATUSES,
      ],

      isActive: true,
    };
  };

roiSettingSchema.statics
  .findOrCreateForTenant =
  async function findOrCreateForTenant(
    input
  ) {
    const {
      tenantId,
      userId = null,
      session = null,
    } =
      resolveFindOrCreateArguments(
        input
      );

    const normalizedTenantId =
      normalizeObjectId(
        tenantId
      );

    if (
      !normalizedTenantId ||
      !mongoose.isValidObjectId(
        normalizedTenantId
      )
    ) {
      throw createModelError(
        "A valid tenant ID is required.",
        400,
        "INVALID_TENANT_ID",
        {
          receivedTenantId:
            normalizedTenantId ||
            null,
        }
      );
    }

    const tenantObjectId =
      new mongoose.Types.ObjectId(
        normalizedTenantId
      );

    let userObjectId = null;

    if (userId) {
      const normalizedUserId =
        normalizeObjectId(
          userId
        );

      if (
        !mongoose.isValidObjectId(
          normalizedUserId
        )
      ) {
        throw createModelError(
          "A valid user ID is required.",
          400,
          "INVALID_USER_ID",
          {
            receivedUserId:
              normalizedUserId ||
              null,
          }
        );
      }

      userObjectId =
        new mongoose.Types.ObjectId(
          normalizedUserId
        );
    }

    const query = {
      tenant: tenantObjectId,
    };

    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    };

    if (session) {
      options.session = session;
    }

    try {
      return await this
        .findOneAndUpdate(
          query,
          {
            $setOnInsert: {
              tenant:
                tenantObjectId,
              createdBy:
                userObjectId,
              updatedBy:
                userObjectId,
              ...this.getDefaults(),
            },
          },
          options
        );
    } catch (error) {
      /*
        Handles a rare race condition where two requests try
        to create the same tenant settings at the same time.
      */
      if (error?.code === 11000) {
        const fallbackQuery =
          this.findOne({
            tenant:
              tenantObjectId,
          });

        if (session) {
          fallbackQuery.session(
            session
          );
        }

        const existing =
          await fallbackQuery;

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  };

/* =========================================================
   MODEL
========================================================= */

const ROISetting =
  mongoose.models.ROISetting ||
  mongoose.model(
    "ROISetting",
    roiSettingSchema
  );

module.exports = ROISetting;
