"use strict";

const mongoose = require("mongoose");

const {
  Schema,
  model,
} = mongoose;

/* =========================================================
   CONSTANTS
========================================================= */

const TRANSACTION_TYPES = [
  "Purchase Receipt",
  "Purchase Return",
  "Sales Issue",
  "Sales Return",
  "Stock Transfer In",
  "Stock Transfer Out",
  "Stock Adjustment",
  "Stock Count",
  "Production Receipt",
  "Production Issue",
  "Opening Stock",
  "Inventory Reversal",
];

const MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "ADJUSTMENT",
];

const TRANSACTION_STATUSES = [
  "Pending",
  "Posted",
  "Failed",
  "Reversed",
  "Cancelled",
];

const REFERENCE_TYPES = [
  "GoodsReceived",
  "PurchaseOrder",
  "PurchaseReturn",
  "SalesOrder",
  "SalesReturn",
  "StockTransfer",
  "StockAdjustment",
  "StockCount",
  "ProductionOrder",
  "OpeningStock",
  "Manual",
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
   INVENTORY TRANSACTION SCHEMA
========================================================= */

const inventoryTransactionSchema =
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
         TRANSACTION IDENTITY
      ===================================================== */

      referenceNumber: {
        type: String,

        required: [
          true,
          "Reference number is required",
        ],

        trim: true,
        uppercase: true,
        maxlength: 150,

        index: true,
      },

      transactionType: {
        type: String,

        required: [
          true,
          "Transaction type is required",
        ],

        enum: {
          values:
            TRANSACTION_TYPES,

          message:
            "Invalid inventory transaction type",
        },

        index: true,
      },

      movementType: {
        type: String,

        required: [
          true,
          "Movement type is required",
        ],

        enum: {
          values:
            MOVEMENT_TYPES,

          message:
            "Invalid inventory movement type",
        },

        index: true,
      },

      status: {
        type: String,

        enum: {
          values:
            TRANSACTION_STATUSES,

          message:
            "Invalid inventory transaction status",
        },

        default: "Pending",

        index: true,
      },

      /* =====================================================
         REFERENCE
      ===================================================== */

      referenceType: {
        type: String,

        required: [
          true,
          "Reference type is required",
        ],

        enum: {
          values:
            REFERENCE_TYPES,

          message:
            "Invalid inventory reference type",
        },

        index: true,
      },

      referenceId: {
        type:
          Schema.Types.ObjectId,

        required: [
          true,
          "Reference identifier is required",
        ],

        index: true,
      },

      parentTransaction: {
        type:
          Schema.Types.ObjectId,

        ref:
          "InventoryTransaction",

        default: null,
      },

      reversalTransaction: {
        type:
          Schema.Types.ObjectId,

        ref:
          "InventoryTransaction",

        default: null,
      },

      /* =====================================================
         PURCHASING REFERENCES
      ===================================================== */

      goodsReceived: {
        type:
          Schema.Types.ObjectId,

        ref: "GoodsReceived",

        default: null,

        index: true,
      },

      goodsReceivedItem: {
        type:
          Schema.Types.ObjectId,

        ref: "GoodsReceivedItem",

        default: null,

        index: true,
      },

      purchaseOrder: {
        type:
          Schema.Types.ObjectId,

        ref: "PurchaseOrder",

        default: null,

        index: true,
      },

      purchaseReturn: {
        type:
          Schema.Types.ObjectId,

        ref: "PurchaseReturn",

        default: null,

        index: true,
      },

      supplier: {
        type:
          Schema.Types.ObjectId,

        ref: "Supplier",

        default: null,

        index: true,
      },

      /* =====================================================
         SALES REFERENCES
      ===================================================== */

      salesOrder: {
        type:
          Schema.Types.ObjectId,

        ref: "SalesOrder",

        default: null,

        index: true,
      },

      salesReturn: {
        type:
          Schema.Types.ObjectId,

        ref: "SalesReturn",

        default: null,

        index: true,
      },

      customer: {
        type:
          Schema.Types.ObjectId,

        ref: "Customer",

        default: null,

        index: true,
      },

      /* =====================================================
         STOCK REFERENCES
      ===================================================== */

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

      sourceWarehouse: {
        type:
          Schema.Types.ObjectId,

        ref: "Warehouse",

        default: null,
      },

      destinationWarehouse: {
        type:
          Schema.Types.ObjectId,

        ref: "Warehouse",

        default: null,
      },

      inventoryStock: {
        type:
          Schema.Types.ObjectId,

        ref: "InventoryStock",

        required: [
          true,
          "Inventory stock is required",
        ],

        index: true,
      },

      stockTransfer: {
        type:
          Schema.Types.ObjectId,

        ref: "StockTransfer",

        default: null,
      },

      stockAdjustment: {
        type:
          Schema.Types.ObjectId,

        ref: "StockAdjustment",

        default: null,
      },

      stockCount: {
        type:
          Schema.Types.ObjectId,

        ref: "StockCount",

        default: null,
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

      /* =====================================================
         PRODUCT SNAPSHOT
      ===================================================== */

      productSnapshot: {
        productName: {
          type: String,
          trim: true,
          maxlength: 300,
          default: null,
        },

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

        unitName: {
          type: String,
          trim: true,
          maxlength: 100,
          default: null,
        },
      },

      variantSnapshot: {
        variantName: {
          type: String,
          trim: true,
          maxlength: 300,
          default: null,
        },

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
      },

      /* =====================================================
         BATCH AND SERIAL
      ===================================================== */

      batchNumber: {
        type: String,
        trim: true,
        maxlength: 200,
        default: null,

        index: true,
      },

      manufacturingDate: {
        type: Date,
        default: null,
      },

      expiryDate: {
        type: Date,
        default: null,
      },

      serialNumbers: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: 300,
          },
        ],

        default: [],
      },

      /* =====================================================
         QUANTITY
      ===================================================== */

      quantity: {
        type: Number,

        required: [
          true,
          "Transaction quantity is required",
        ],

        min: [
          0,
          "Transaction quantity cannot be negative",
        ],
      },

      signedQuantity: {
        type: Number,
        default: 0,
      },

      quantityBefore: {
        type: Number,
        required: true,
        min: 0,
      },

      quantityAfter: {
        type: Number,
        required: true,
      },

      availableQuantityBefore: {
        type: Number,
        default: null,
      },

      availableQuantityAfter: {
        type: Number,
        default: null,
      },

      reservedQuantityBefore: {
        type: Number,
        default: null,
      },

      reservedQuantityAfter: {
        type: Number,
        default: null,
      },

      /* =====================================================
         COST
      ===================================================== */

      unitCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalCost: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageCostBefore: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageCostAfter: {
        type: Number,
        default: 0,
        min: 0,
      },

      stockValueBefore: {
        type: Number,
        default: null,
      },

      stockValueAfter: {
        type: Number,
        default: null,
      },

      /* =====================================================
         TRANSACTION DATE
      ===================================================== */

      transactionDate: {
        type: Date,

        required: [
          true,
          "Transaction date is required",
        ],

        default: Date.now,

        index: true,
      },

      postingDate: {
        type: Date,
        default: null,
      },

      /* =====================================================
         REVERSAL
      ===================================================== */

      isReversal: {
        type: Boolean,
        default: false,
      },

      reversedAt: {
        type: Date,
        default: null,
      },

      reversedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      reversalReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      /* =====================================================
         FAILURE
      ===================================================== */

      failureReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      /* =====================================================
         NOTES
      ===================================================== */

      remarks: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null,
      },

      metadata: {
        type: Schema.Types.Mixed,
        default: {},
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
   UNIQUE INDEX

   One posting reference may contain multiple item
   transactions, but the same GRN item must not be posted
   twice under the same reference.
========================================================= */

inventoryTransactionSchema.index(
  {
    tenant: 1,
    referenceNumber: 1,
    goodsReceivedItem: 1,
    transactionType: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      goodsReceivedItem: {
        $type: "objectId",
      },

      isDeleted: false,
    },

    name:
      "unique_inventory_transaction_per_grn_item",
  }
);

/* =========================================================
   SUPPORTING INDEXES
========================================================= */

inventoryTransactionSchema.index({
  tenant: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  warehouse: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  product: 1,
  variant: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  inventoryStock: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  referenceType: 1,
  referenceId: 1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  transactionType: 1,
  status: 1,
  transactionDate: -1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  supplier: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  customer: 1,
  transactionDate: -1,
  isDeleted: 1,
});

inventoryTransactionSchema.index({
  tenant: 1,
  batchNumber: 1,
  transactionDate: -1,
  isDeleted: 1,
});

/* =========================================================
   VIRTUALS
========================================================= */

inventoryTransactionSchema.virtual(
  "isInbound"
).get(function getIsInbound() {
  return (
    this.movementType ===
    "IN"
  );
});

inventoryTransactionSchema.virtual(
  "isOutbound"
).get(function getIsOutbound() {
  return (
    this.movementType ===
    "OUT"
  );
});

inventoryTransactionSchema.virtual(
  "isPosted"
).get(function getIsPosted() {
  return (
    this.status ===
    "Posted"
  );
});

inventoryTransactionSchema.virtual(
  "isReversed"
).get(function getIsReversed() {
  return (
    this.status ===
      "Reversed" ||
    Boolean(
      this.reversalTransaction
    )
  );
});

/* =========================================================
   QUERY HELPERS
========================================================= */

inventoryTransactionSchema.query.forTenant =
  function forTenant(
    tenantId
  ) {
    return this.where({
      tenant: tenantId,
    });
  };

inventoryTransactionSchema.query.notDeleted =
  function notDeleted() {
    return this.where({
      isDeleted: false,
    });
  };

inventoryTransactionSchema.query.posted =
  function posted() {
    return this.where({
      status: "Posted",
      isDeleted: false,
    });
  };

inventoryTransactionSchema.query.forWarehouse =
  function forWarehouse(
    warehouseId
  ) {
    return this.where({
      warehouse:
        warehouseId,
    });
  };

inventoryTransactionSchema.query.forProduct =
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

inventoryTransactionSchema.query.forReference =
  function forReference({
    referenceType,
    referenceId,
  }) {
    return this.where({
      referenceType,
      referenceId,
    });
  };

inventoryTransactionSchema.query.inbound =
  function inbound() {
    return this.where({
      movementType: "IN",
    });
  };

inventoryTransactionSchema.query.outbound =
  function outbound() {
    return this.where({
      movementType: "OUT",
    });
  };

/* =========================================================
   INSTANCE METHODS
========================================================= */

inventoryTransactionSchema.methods.calculateSignedQuantity =
  function calculateSignedQuantity() {
    const quantity =
      roundNumber(
        this.quantity
      );

    if (
      this.movementType ===
      "IN"
    ) {
      this.signedQuantity =
        quantity;
    } else if (
      this.movementType ===
      "OUT"
    ) {
      this.signedQuantity =
        roundNumber(
          quantity * -1
        );
    } else {
      this.signedQuantity =
        roundNumber(
          Number(
            this.quantityAfter ||
              0
          ) -
            Number(
              this.quantityBefore ||
                0
            )
        );
    }

    return this.signedQuantity;
  };

inventoryTransactionSchema.methods.calculateTotalCost =
  function calculateTotalCost() {
    this.totalCost =
      roundNumber(
        Number(
          this.quantity ||
            0
        ) *
          Number(
            this.unitCost ||
              0
          ),
        COST_PRECISION
      );

    return this.totalCost;
  };

inventoryTransactionSchema.methods.markPosted =
  function markPosted({
    userId,
    postingDate = new Date(),
  }) {
    this.status = "Posted";
    this.postingDate =
      postingDate;
    this.failureReason = null;
    this.updatedBy =
      userId;

    return this;
  };

inventoryTransactionSchema.methods.markFailed =
  function markFailed({
    userId,
    reason,
  }) {
    this.status = "Failed";
    this.failureReason =
      normalizeText(reason);
    this.updatedBy =
      userId;

    return this;
  };

inventoryTransactionSchema.methods.markReversed =
  function markReversed({
    userId,
    reversalTransactionId,
    reason,
  }) {
    this.status = "Reversed";
    this.reversedAt =
      new Date();
    this.reversedBy =
      userId;
    this.reversalTransaction =
      reversalTransactionId;
    this.reversalReason =
      normalizeText(reason);
    this.updatedBy =
      userId;

    return this;
  };

inventoryTransactionSchema.methods.softDelete =
  function softDelete({
    userId,
    reason = null,
  }) {
    if (
      this.status ===
      "Posted"
    ) {
      throw new Error(
        "A posted inventory transaction cannot be deleted. Reverse it instead."
      );
    }

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

/* =========================================================
   VALIDATION MIDDLEWARE
========================================================= */

inventoryTransactionSchema.pre(
  "validate",
  function validateInventoryTransaction(
    next
  ) {
    try {
      this.referenceNumber =
        normalizeText(
          this.referenceNumber
        );

      this.batchNumber =
        normalizeText(
          this.batchNumber
        );

      this.remarks =
        normalizeText(
          this.remarks
        );

      this.failureReason =
        normalizeText(
          this.failureReason
        );

      this.reversalReason =
        normalizeText(
          this.reversalReason
        );

      this.quantity =
        roundNumber(
          this.quantity
        );

      this.quantityBefore =
        roundNumber(
          this.quantityBefore
        );

      this.quantityAfter =
        roundNumber(
          this.quantityAfter
        );

      this.unitCost =
        roundNumber(
          this.unitCost,
          COST_PRECISION
        );

      this.totalCost =
        roundNumber(
          this.totalCost,
          COST_PRECISION
        );

      this.averageCostBefore =
        roundNumber(
          this.averageCostBefore,
          COST_PRECISION
        );

      this.averageCostAfter =
        roundNumber(
          this.averageCostAfter,
          COST_PRECISION
        );

      if (
        this.availableQuantityBefore !==
          null &&
        this.availableQuantityBefore !==
          undefined
      ) {
        this.availableQuantityBefore =
          roundNumber(
            this.availableQuantityBefore
          );
      }

      if (
        this.availableQuantityAfter !==
          null &&
        this.availableQuantityAfter !==
          undefined
      ) {
        this.availableQuantityAfter =
          roundNumber(
            this.availableQuantityAfter
          );
      }

      if (
        this.reservedQuantityBefore !==
          null &&
        this.reservedQuantityBefore !==
          undefined
      ) {
        this.reservedQuantityBefore =
          roundNumber(
            this.reservedQuantityBefore
          );
      }

      if (
        this.reservedQuantityAfter !==
          null &&
        this.reservedQuantityAfter !==
          undefined
      ) {
        this.reservedQuantityAfter =
          roundNumber(
            this.reservedQuantityAfter
          );
      }

      this.serialNumbers = [
        ...new Set(
          (
            this.serialNumbers ||
            []
          )
            .map(
              (serial) =>
                normalizeText(
                  serial
                )
            )
            .filter(Boolean)
        ),
      ];

      this.calculateSignedQuantity();
      this.calculateTotalCost();

      if (
        this.quantity <= 0
      ) {
        return next(
          new Error(
            "Inventory transaction quantity must be greater than zero"
          )
        );
      }

      if (
        this.movementType ===
          "IN" &&
        this.quantityAfter <
          this.quantityBefore
      ) {
        return next(
          new Error(
            "Inbound transaction quantity after cannot be less than quantity before"
          )
        );
      }

      if (
        this.movementType ===
          "OUT" &&
        this.quantityAfter >
          this.quantityBefore
      ) {
        return next(
          new Error(
            "Outbound transaction quantity after cannot exceed quantity before"
          )
        );
      }

      if (
        this.movementType ===
          "IN" &&
        roundNumber(
          this.quantityAfter -
            this.quantityBefore
        ) !==
          this.quantity
      ) {
        return next(
          new Error(
            "Inbound transaction quantity does not match stock quantity change"
          )
        );
      }

      if (
        this.movementType ===
          "OUT" &&
        roundNumber(
          this.quantityBefore -
            this.quantityAfter
        ) !==
          this.quantity
      ) {
        return next(
          new Error(
            "Outbound transaction quantity does not match stock quantity change"
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
        this.status ===
          "Failed" &&
        !this.failureReason
      ) {
        return next(
          new Error(
            "Failure reason is required for a failed inventory transaction"
          )
        );
      }

      if (
        this.status ===
          "Reversed" &&
        !this.reversedAt
      ) {
        this.reversedAt =
          new Date();
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   IMMUTABILITY PROTECTION

   Posted transactions behave as a permanent stock ledger.
========================================================= */

inventoryTransactionSchema.pre(
  "save",
  function protectPostedTransaction(
    next
  ) {
    if (
      !this.isNew &&
      this.isModified() &&
      this.$locals
        ?.allowPostedMutation !==
        true
    ) {
      const originalStatus =
        this.$locals
          ?.originalStatus;

      if (
        originalStatus ===
        "Posted"
      ) {
        const allowedFields =
          new Set([
            "status",
            "reversedAt",
            "reversedBy",
            "reversalReason",
            "reversalTransaction",
            "updatedBy",
            "updatedAt",
          ]);

        const modifiedFields =
          this.modifiedPaths();

        const invalidFields =
          modifiedFields.filter(
            (field) =>
              !allowedFields.has(
                field
              )
          );

        if (
          invalidFields.length >
          0
        ) {
          return next(
            new Error(
              "Posted inventory transaction ledger fields cannot be modified"
            )
          );
        }
      }
    }

    next();
  }
);

inventoryTransactionSchema.post(
  "init",
  function captureOriginalStatus(
    document
  ) {
    document.$locals.originalStatus =
      document.status;
  }
);

/* =========================================================
   STATIC METHODS
========================================================= */

inventoryTransactionSchema.statics.findByReference =
  function findByReference({
    tenantId,
    referenceType,
    referenceId,
  }) {
    return this.find({
      tenant: tenantId,
      referenceType,
      referenceId,
      isDeleted: false,
    }).sort({
      transactionDate: 1,
      createdAt: 1,
    });
  };

inventoryTransactionSchema.statics.getProductLedger =
  function getProductLedger({
    tenantId,
    productId,
    variantId = undefined,
    warehouseId = undefined,
    dateFrom = undefined,
    dateTo = undefined,
  }) {
    const filter = {
      tenant: tenantId,
      product: productId,
      status: "Posted",
      isDeleted: false,
    };

    if (
      variantId !==
      undefined
    ) {
      filter.variant =
        variantId || null;
    }

    if (
      warehouseId
    ) {
      filter.warehouse =
        warehouseId;
    }

    if (
      dateFrom ||
      dateTo
    ) {
      filter.transactionDate =
        {};

      if (dateFrom) {
        filter.transactionDate
          .$gte =
          new Date(dateFrom);
      }

      if (dateTo) {
        filter.transactionDate
          .$lte =
          new Date(dateTo);
      }
    }

    return this.find(filter)
      .sort({
        transactionDate: 1,
        createdAt: 1,
      })
      .populate(
        "warehouse",
        "warehouseCode warehouseName name"
      )
      .populate(
        "createdBy",
        "name email"
      );
  };

inventoryTransactionSchema.statics.getMovementSummary =
  async function getMovementSummary({
    tenantId,
    warehouseId = null,
    dateFrom = null,
    dateTo = null,
  }) {
    const match = {
      tenant:
        new mongoose.Types.ObjectId(
          tenantId
        ),

      status: "Posted",
      isDeleted: false,
    };

    if (warehouseId) {
      match.warehouse =
        new mongoose.Types.ObjectId(
          warehouseId
        );
    }

    if (
      dateFrom ||
      dateTo
    ) {
      match.transactionDate =
        {};

      if (dateFrom) {
        match.transactionDate
          .$gte =
          new Date(dateFrom);
      }

      if (dateTo) {
        match.transactionDate
          .$lte =
          new Date(dateTo);
      }
    }

    const result =
      await this.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id:
              "$movementType",

            totalTransactions: {
              $sum: 1,
            },

            totalQuantity: {
              $sum:
                "$quantity",
            },

            totalValue: {
              $sum:
                "$totalCost",
            },
          },
        },
      ]);

    const summary = {
      inbound: {
        totalTransactions: 0,
        totalQuantity: 0,
        totalValue: 0,
      },

      outbound: {
        totalTransactions: 0,
        totalQuantity: 0,
        totalValue: 0,
      },

      adjustment: {
        totalTransactions: 0,
        totalQuantity: 0,
        totalValue: 0,
      },
    };

    result.forEach(
      (entry) => {
        const key =
          entry._id === "IN"
            ? "inbound"
            : entry._id ===
                "OUT"
              ? "outbound"
              : "adjustment";

        summary[key] = {
          totalTransactions:
            entry.totalTransactions,

          totalQuantity:
            roundNumber(
              entry.totalQuantity
            ),

          totalValue:
            roundNumber(
              entry.totalValue,
              COST_PRECISION
            ),
        };
      }
    );

    return summary;
  };

/* =========================================================
   MODEL
========================================================= */

const InventoryTransaction =
  model(
    "InventoryTransaction",
    inventoryTransactionSchema
  );

module.exports =
  InventoryTransaction;