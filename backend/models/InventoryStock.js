"use strict";

const mongoose = require("mongoose");

const {
  Schema,
  model,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const INVENTORY_STOCK_STATUSES = [
  "Active",
  "Inactive",
  "Blocked",
];

const STOCK_TYPES = [
  "Regular",
  "Batch",
  "Serial",
];

const QUANTITY_PRECISION = 4;
const COST_PRECISION = 4;

/* =========================================================
   HELPERS
========================================================= */

const roundNumber = (
  value,
  precision = QUANTITY_PRECISION
) => {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return 0;
  }

  const multiplier =
    10 ** precision;

  return (
    Math.round(
      (
        numericValue +
        Number.EPSILON
      ) * multiplier
    ) / multiplier
  );
};

const normalizeText = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return value;
  }

  const normalized =
    value.trim();

  return normalized || null;
};

/* =========================================================
   INVENTORY STOCK SCHEMA
========================================================= */

const inventoryStockSchema =
  new Schema(
    {
      /* =====================================================
         TENANT
      ===================================================== */

      tenant: {
        type:
          Schema.Types.ObjectId,

        ref: "Tenant",

        required: [
          true,
          "Tenant is required",
        ],

        index: true,
      },

      /* =====================================================
         PRODUCT REFERENCES
      ===================================================== */

      product: {
        type:
          Schema.Types.ObjectId,

        ref: "Product",

        required: [
          true,
          "Product is required",
        ],

        index: true,
      },

      variant: {
        type:
          Schema.Types.ObjectId,

        ref: "ProductVariant",

        default: null,

        index: true,
      },

      warehouse: {
        type:
          Schema.Types.ObjectId,

        ref: "Warehouse",

        required: [
          true,
          "Warehouse is required",
        ],

        index: true,
      },

      /* =====================================================
         PRODUCT SNAPSHOT
      ===================================================== */

      sku: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      barcode: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },

      productName: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },

      variantName: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },

      unit: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      /* =====================================================
         STOCK TYPE
      ===================================================== */

      stockType: {
        type: String,

        enum: {
          values:
            STOCK_TYPES,

          message:
            "Invalid stock type",
        },

        default: "Regular",
      },

      batchNumber: {
        type: String,
        trim: true,
        maxlength: 200,
        default: null,
      },

      manufacturingDate: {
        type: Date,
        default: null,
      },

      expiryDate: {
        type: Date,
        default: null,
      },

      /* =====================================================
         QUANTITIES
      ===================================================== */

      quantityOnHand: {
        type: Number,
        default: 0,
        min: 0,
      },

      availableQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      reservedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      committedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      damagedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      quarantineQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      inTransitQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================================
         STOCK LEVEL CONFIGURATION
      ===================================================== */

      minimumStockLevel: {
        type: Number,
        default: 0,
        min: 0,
      },

      maximumStockLevel: {
        type: Number,
        default: null,
        min: 0,
      },

      reorderLevel: {
        type: Number,
        default: 0,
        min: 0,
      },

      reorderQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      safetyStock: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================================
         COSTING
      ===================================================== */

      averageCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastPurchaseCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      standardCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalStockValue: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* =====================================================
         WAREHOUSE LOCATION
      ===================================================== */

      location: {
        zone: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },

        aisle: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },

        rack: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },

        shelf: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },

        bin: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },
      },

      /* =====================================================
         MOVEMENT INFORMATION
      ===================================================== */

      lastReceivedAt: {
        type: Date,
        default: null,
      },

      lastIssuedAt: {
        type: Date,
        default: null,
      },

      lastAdjustedAt: {
        type: Date,
        default: null,
      },

      lastCountedAt: {
        type: Date,
        default: null,
      },

      lastMovementAt: {
        type: Date,
        default: null,
      },

      /* =====================================================
         STOCK CONTROL
      ===================================================== */

      allowNegativeStock: {
        type: Boolean,
        default: false,
      },

      status: {
        type: String,

        enum: {
          values:
            INVENTORY_STOCK_STATUSES,

          message:
            "Invalid inventory stock status",
        },

        default: "Active",

        index: true,
      },

      isBlocked: {
        type: Boolean,
        default: false,
      },

      blockReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      /* =====================================================
         AUDIT
      ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Created by user is required",
        ],
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Updated by user is required",
        ],
      },

      /* =====================================================
         SOFT DELETE
      ===================================================== */

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
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      deleteReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      minimize: false,

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   UNIQUE STOCK IDENTITY INDEX

   One inventory stock row per:

   tenant
   warehouse
   product
   variant
   batch
========================================================= */

inventoryStockSchema.index(
  {
    tenant: 1,
    warehouse: 1,
    product: 1,
    variant: 1,
    batchNumber: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
    },

    name:
      "unique_active_inventory_stock",
  }
);

/* =========================================================
   SUPPORTING INDEXES
========================================================= */

inventoryStockSchema.index({
  tenant: 1,
  warehouse: 1,
  isDeleted: 1,
  status: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  product: 1,
  variant: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  sku: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  barcode: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  batchNumber: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  expiryDate: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  availableQuantity: 1,
  reorderLevel: 1,
  isDeleted: 1,
});

inventoryStockSchema.index({
  tenant: 1,
  lastMovementAt: -1,
  isDeleted: 1,
});

/* =========================================================
   VIRTUALS
========================================================= */

inventoryStockSchema.virtual(
  "unavailableQuantity"
).get(function getUnavailableQuantity() {
  return roundNumber(
    Number(
      this.quantityOnHand ||
        0
    ) -
      Number(
        this.availableQuantity ||
          0
      )
  );
});

inventoryStockSchema.virtual(
  "isOutOfStock"
).get(function getIsOutOfStock() {
  return (
    Number(
      this.availableQuantity ||
        0
    ) <= 0
  );
});

inventoryStockSchema.virtual(
  "isLowStock"
).get(function getIsLowStock() {
  const availableQuantity =
    Number(
      this.availableQuantity ||
        0
    );

  const reorderLevel =
    Number(
      this.reorderLevel ||
        0
    );

  return (
    reorderLevel > 0 &&
    availableQuantity <=
      reorderLevel
  );
});

inventoryStockSchema.virtual(
  "isOverstocked"
).get(function getIsOverstocked() {
  const maximumStockLevel =
    Number(
      this.maximumStockLevel
    );

  if (
    !Number.isFinite(
      maximumStockLevel
    )
  ) {
    return false;
  }

  return (
    Number(
      this.quantityOnHand ||
        0
    ) >
    maximumStockLevel
  );
});

inventoryStockSchema.virtual(
  "stockValue"
).get(function getStockValue() {
  return roundNumber(
    Number(
      this.quantityOnHand ||
        0
    ) *
      Number(
        this.averageCost ||
          0
      ),
    COST_PRECISION
  );
});

/* =========================================================
   QUERY HELPERS
========================================================= */

inventoryStockSchema.query.forTenant =
  function forTenant(
    tenantId
  ) {
    return this.where({
      tenant: tenantId,
    });
  };

inventoryStockSchema.query.notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

inventoryStockSchema.query.active =
  function active() {
    return this.where({
      status: "Active",
      isBlocked: false,
      isDeleted: false,
    });
  };

inventoryStockSchema.query.forWarehouse =
  function forWarehouse(
    warehouseId
  ) {
    return this.where({
      warehouse:
        warehouseId,
    });
  };

inventoryStockSchema.query.forProduct =
  function forProduct(
    productId,
    variantId = undefined
  ) {
    const filter = {
      product: productId,
    };

    if (
      variantId !== undefined
    ) {
      filter.variant =
        variantId || null;
    }

    return this.where(
      filter
    );
  };

inventoryStockSchema.query.lowStock =
  function lowStock() {
    return this.where({
      $expr: {
        $and: [
          {
            $gt: [
              "$reorderLevel",
              0,
            ],
          },
          {
            $lte: [
              "$availableQuantity",
              "$reorderLevel",
            ],
          },
        ],
      },

      isDeleted: false,
      status: "Active",
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

inventoryStockSchema.methods.recalculateAvailableQuantity =
  function recalculateAvailableQuantity() {
    const quantityOnHand =
      roundNumber(
        this.quantityOnHand
      );

    const reservedQuantity =
      roundNumber(
        this.reservedQuantity
      );

    const committedQuantity =
      roundNumber(
        this.committedQuantity
      );

    const damagedQuantity =
      roundNumber(
        this.damagedQuantity
      );

    const quarantineQuantity =
      roundNumber(
        this.quarantineQuantity
      );

    this.availableQuantity =
      roundNumber(
        Math.max(
          quantityOnHand -
            reservedQuantity -
            committedQuantity -
            damagedQuantity -
            quarantineQuantity,
          0
        )
      );

    return this.availableQuantity;
  };

inventoryStockSchema.methods.recalculateStockValue =
  function recalculateStockValue() {
    this.totalStockValue =
      roundNumber(
        Number(
          this.quantityOnHand ||
            0
        ) *
          Number(
            this.averageCost ||
              0
          ),
        COST_PRECISION
      );

    return this.totalStockValue;
  };

inventoryStockSchema.methods.increaseStock =
  function increaseStock({
    quantity,
    unitCost = 0,
    movementDate = new Date(),
  }) {
    const incomingQuantity =
      roundNumber(quantity);

    const incomingUnitCost =
      roundNumber(
        unitCost,
        COST_PRECISION
      );

    if (
      incomingQuantity <= 0
    ) {
      throw new Error(
        "Stock increase quantity must be greater than zero"
      );
    }

    const currentQuantity =
      roundNumber(
        this.quantityOnHand
      );

    const currentAverageCost =
      roundNumber(
        this.averageCost,
        COST_PRECISION
      );

    const existingValue =
      roundNumber(
        currentQuantity *
          currentAverageCost,
        COST_PRECISION
      );

    const incomingValue =
      roundNumber(
        incomingQuantity *
          incomingUnitCost,
        COST_PRECISION
      );

    const newQuantity =
      roundNumber(
        currentQuantity +
          incomingQuantity
      );

    this.quantityOnHand =
      newQuantity;

    this.averageCost =
      newQuantity > 0
        ? roundNumber(
            (
              existingValue +
              incomingValue
            ) / newQuantity,
            COST_PRECISION
          )
        : 0;

    this.lastPurchaseCost =
      incomingUnitCost;

    this.lastReceivedAt =
      movementDate;

    this.lastMovementAt =
      movementDate;

    this.recalculateAvailableQuantity();
    this.recalculateStockValue();

    return this;
  };

inventoryStockSchema.methods.decreaseStock =
  function decreaseStock({
    quantity,
    movementDate = new Date(),
  }) {
    const outgoingQuantity =
      roundNumber(quantity);

    if (
      outgoingQuantity <= 0
    ) {
      throw new Error(
        "Stock decrease quantity must be greater than zero"
      );
    }

    const currentQuantity =
      roundNumber(
        this.quantityOnHand
      );

    if (
      !this.allowNegativeStock &&
      outgoingQuantity >
        currentQuantity
    ) {
      throw new Error(
        "Insufficient stock quantity"
      );
    }

    this.quantityOnHand =
      roundNumber(
        currentQuantity -
          outgoingQuantity
      );

    this.lastIssuedAt =
      movementDate;

    this.lastMovementAt =
      movementDate;

    this.recalculateAvailableQuantity();
    this.recalculateStockValue();

    return this;
  };

inventoryStockSchema.methods.reserveStock =
  function reserveStock(
    quantity
  ) {
    const reserveQuantity =
      roundNumber(quantity);

    if (
      reserveQuantity <= 0
    ) {
      throw new Error(
        "Reserve quantity must be greater than zero"
      );
    }

    if (
      reserveQuantity >
      Number(
        this.availableQuantity ||
          0
      )
    ) {
      throw new Error(
        "Insufficient available stock to reserve"
      );
    }

    this.reservedQuantity =
      roundNumber(
        Number(
          this.reservedQuantity ||
            0
        ) +
          reserveQuantity
      );

    this.recalculateAvailableQuantity();

    return this;
  };

inventoryStockSchema.methods.releaseReservedStock =
  function releaseReservedStock(
    quantity
  ) {
    const releaseQuantity =
      roundNumber(quantity);

    if (
      releaseQuantity <= 0
    ) {
      throw new Error(
        "Release quantity must be greater than zero"
      );
    }

    this.reservedQuantity =
      roundNumber(
        Math.max(
          Number(
            this.reservedQuantity ||
              0
          ) -
            releaseQuantity,
          0
        )
      );

    this.recalculateAvailableQuantity();

    return this;
  };

inventoryStockSchema.methods.softDelete =
  function softDelete({
    userId,
    reason = null,
  }) {
    this.isDeleted = true;
    this.deletedAt =
      new Date();
    this.deletedBy =
      userId;
    this.deleteReason =
      normalizeText(reason);
    this.updatedBy =
      userId;

    return this;
  };

inventoryStockSchema.methods.restore =
  function restore({
    userId,
  }) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deleteReason = null;
    this.updatedBy =
      userId;

    return this;
  };

/* =========================================================
   DOCUMENT VALIDATION
========================================================= */

inventoryStockSchema.pre(
  "validate",
  function validateInventoryStock(
    next
  ) {
    try {
      const quantityFields = [
        "quantityOnHand",
        "availableQuantity",
        "reservedQuantity",
        "committedQuantity",
        "damagedQuantity",
        "quarantineQuantity",
        "inTransitQuantity",
        "minimumStockLevel",
        "reorderLevel",
        "reorderQuantity",
        "safetyStock",
      ];

      quantityFields.forEach(
        (field) => {
          this[field] =
            roundNumber(
              this[field]
            );
        }
      );

      if (
        this.maximumStockLevel !==
          null &&
        this.maximumStockLevel !==
          undefined
      ) {
        this.maximumStockLevel =
          roundNumber(
            this.maximumStockLevel
          );
      }

      this.averageCost =
        roundNumber(
          this.averageCost,
          COST_PRECISION
        );

      this.lastPurchaseCost =
        roundNumber(
          this.lastPurchaseCost,
          COST_PRECISION
        );

      this.standardCost =
        roundNumber(
          this.standardCost,
          COST_PRECISION
        );

      this.totalStockValue =
        roundNumber(
          this.totalStockValue,
          COST_PRECISION
        );

      this.sku =
        normalizeText(
          this.sku
        );

      this.barcode =
        normalizeText(
          this.barcode
        );

      this.productName =
        normalizeText(
          this.productName
        );

      this.variantName =
        normalizeText(
          this.variantName
        );

      this.unit =
        normalizeText(
          this.unit
        );

      this.batchNumber =
        normalizeText(
          this.batchNumber
        );

      if (
        this.batchNumber
      ) {
        this.stockType =
          "Batch";
      }

      if (
        Number(
          this.availableQuantity
        ) >
        Number(
          this.quantityOnHand
        )
      ) {
        return next(
          new Error(
            "Available quantity cannot exceed quantity on hand"
          )
        );
      }

      if (
        Number(
          this.reservedQuantity
        ) >
        Number(
          this.quantityOnHand
        )
      ) {
        return next(
          new Error(
            "Reserved quantity cannot exceed quantity on hand"
          )
        );
      }

      if (
        this.expiryDate &&
        this.manufacturingDate &&
        this.expiryDate <
          this.manufacturingDate
      ) {
        return next(
          new Error(
            "Expiry date cannot be earlier than manufacturing date"
          )
        );
      }

      if (
        this.maximumStockLevel !==
          null &&
        Number(
          this.maximumStockLevel
        ) <
          Number(
            this.minimumStockLevel
          )
      ) {
        return next(
          new Error(
            "Maximum stock level cannot be less than minimum stock level"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   SAVE MIDDLEWARE
========================================================= */

inventoryStockSchema.pre(
  "save",
  function prepareInventoryStock(
    next
  ) {
    try {
      this.recalculateStockValue();

      if (
        !this.lastMovementAt
      ) {
        this.lastMovementAt =
          this.lastReceivedAt ||
          this.lastIssuedAt ||
          null;
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   STATIC METHODS
========================================================= */

inventoryStockSchema.statics.findStock =
  function findStock({
    tenantId,
    warehouseId,
    productId,
    variantId = null,
    batchNumber = null,
  }) {
    return this.findOne({
      tenant: tenantId,
      warehouse:
        warehouseId,
      product: productId,
      variant:
        variantId || null,
      batchNumber:
        normalizeText(
          batchNumber
        ),
      isDeleted: false,
    });
  };

inventoryStockSchema.statics.getStockSummary =
  async function getStockSummary({
    tenantId,
    warehouseId = null,
  }) {
    const match = {
      tenant:
        new mongoose.Types.ObjectId(
          tenantId
        ),

      isDeleted: false,
    };

    if (warehouseId) {
      match.warehouse =
        new mongoose.Types.ObjectId(
          warehouseId
        );
    }

    const [summary] =
      await this.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,

            totalStockRecords: {
              $sum: 1,
            },

            totalQuantityOnHand: {
              $sum:
                "$quantityOnHand",
            },

            totalAvailableQuantity: {
              $sum:
                "$availableQuantity",
            },

            totalReservedQuantity: {
              $sum:
                "$reservedQuantity",
            },

            totalDamagedQuantity: {
              $sum:
                "$damagedQuantity",
            },

            totalStockValue: {
              $sum:
                "$totalStockValue",
            },
          },
        },
      ]);

    return (
      summary || {
        totalStockRecords: 0,
        totalQuantityOnHand: 0,
        totalAvailableQuantity: 0,
        totalReservedQuantity: 0,
        totalDamagedQuantity: 0,
        totalStockValue: 0,
      }
    );
  };

/* =========================================================
   MODEL
========================================================= */

const InventoryStock =
  model(
    "InventoryStock",
    inventoryStockSchema
  );

module.exports =
  InventoryStock;