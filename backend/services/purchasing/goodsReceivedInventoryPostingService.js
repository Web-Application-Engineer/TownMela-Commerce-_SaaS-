"use strict";

const mongoose = require("mongoose");

const GoodsReceived = require(
  "../../models/GoodsReceived"
);

const GoodsReceivedItem = require(
  "../../models/GoodsReceivedItem"
);

const InventoryStock = require(
  "../../models/InventoryStock"
);

const InventoryTransaction = require(
  "../../models/InventoryTransaction"
);

/* =========================================================
   CONSTANTS
========================================================= */

const POSTABLE_RECEIPT_STATUSES = [
  "Accepted",
  "Partially Accepted",
];

const POSTABLE_INSPECTION_STATUSES = [
  "Not Required",
  "Passed",
  "Partially Passed",
];

const POSTABLE_ITEM_STATUSES = [
  "Accepted",
  "Partially Accepted",
];

const INVENTORY_POSTING_STATUSES = [
  "Not Posted",
  "Partially Posted",
  "Posted",
  "Reversed",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =========================================================
   ERROR HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code,
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

const createValidationError = (
  message,
  details = null
) => {
  return createHttpError(
    400,
    message,
    "VALIDATION_ERROR",
    details
  );
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const ensureObjectId = (
  value,
  field
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    throw createValidationError(
      `${field} must be a valid identifier`,
      {
        field,
      }
    );
  }

  return value;
};

const normalizeString = (
  value,
  fallback = null
) => {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || fallback;
};

const normalizeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const roundQuantity = (
  value
) => {
  return (
    Math.round(
      (
        normalizeNumber(value) +
        Number.EPSILON
      ) * 10000
    ) / 10000
  );
};

const escapeRegex = (
  value
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const runInTransaction = async (
  operation
) => {
  const session =
    await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result =
          await operation(session);
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   POSTING NUMBER GENERATOR
========================================================= */

const generateInventoryPostingReference =
  async ({
    tenantId,
    session,
  }) => {
    const date = new Date();

    const year =
      date.getUTCFullYear();

    const month = String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

    const prefix =
      `GRN-INV-${year}${month}`;

    const lastTransaction =
      await InventoryTransaction.findOne({
        tenant: tenantId,

        referenceNumber: {
          $regex:
            `^${escapeRegex(
              prefix
            )}-`,
        },
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "referenceNumber"
        )
        .session(session)
        .lean();

    let sequence = 1;

    if (
      lastTransaction
        ?.referenceNumber
    ) {
      const lastSequence =
        Number.parseInt(
          lastTransaction
            .referenceNumber
            .split("-")
            .pop(),
          10
        );

      if (
        Number.isInteger(
          lastSequence
        )
      ) {
        sequence =
          lastSequence + 1;
      }
    }

    return `${prefix}-${String(
      sequence
    ).padStart(6, "0")}`;
  };

/* =========================================================
   RECEIPT LOOKUP
========================================================= */

const getGoodsReceivedForPosting =
  async ({
    tenantId,
    goodsReceivedId,
    session = null,
    lean = false,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    let query =
      GoodsReceived.findOne({
        _id: goodsReceivedId,
        tenant: tenantId,
        isDeleted: false,
      });

    if (session) {
      query = query.session(
        session
      );
    }

    if (lean) {
      query = query.lean();
    }

    const goodsReceived =
      await query;

    if (!goodsReceived) {
      throw createHttpError(
        404,
        "Goods receipt was not found",
        "GOODS_RECEIVED_NOT_FOUND"
      );
    }

    return goodsReceived;
  };

/* =========================================================
   RECEIPT ITEM LOOKUP
========================================================= */

const getGoodsReceivedItems =
  async ({
    tenantId,
    goodsReceivedId,
    session = null,
    lean = false,
  }) => {
    let query =
      GoodsReceivedItem.find({
        tenant: tenantId,

        goodsReceived:
          goodsReceivedId,

        isDeleted: false,
      }).sort({
        lineNumber: 1,
      });

    if (session) {
      query = query.session(
        session
      );
    }

    if (lean) {
      query = query.lean();
    }

    return query;
  };

/* =========================================================
   POSTING VALIDATION
========================================================= */

const validateReceiptForPosting =
  ({
    goodsReceived,
    items,
  }) => {
    if (
      goodsReceived.status ===
      "Cancelled"
    ) {
      throw createHttpError(
        409,
        "A cancelled goods receipt cannot be posted to inventory",
        "CANCELLED_RECEIPT_NOT_POSTABLE"
      );
    }

    if (
      goodsReceived
        .inventoryPosting
        ?.status === "Posted"
    ) {
      throw createHttpError(
        409,
        "Goods receipt has already been posted to inventory",
        "GOODS_RECEIPT_ALREADY_POSTED",
        {
          postedAt:
            goodsReceived
              .inventoryPosting
              ?.postedAt,

          postingReference:
            goodsReceived
              .inventoryPosting
              ?.postingReference,
        }
      );
    }

    if (
      goodsReceived
        .inventoryPosting
        ?.status ===
      "Reversed"
    ) {
      throw createHttpError(
        409,
        "A reversed goods receipt cannot be posted again without reopening it",
        "REVERSED_RECEIPT_NOT_POSTABLE"
      );
    }

    if (
      !POSTABLE_RECEIPT_STATUSES.includes(
        goodsReceived.status
      )
    ) {
      throw createHttpError(
        409,
        `Goods receipt in ${goodsReceived.status} status cannot be posted to inventory`,
        "GOODS_RECEIPT_NOT_POSTABLE",
        {
          allowedStatuses:
            POSTABLE_RECEIPT_STATUSES,
        }
      );
    }

    if (
      goodsReceived.inspection
        ?.required &&
      !POSTABLE_INSPECTION_STATUSES.includes(
        goodsReceived
          .inspection
          ?.status
      )
    ) {
      throw createHttpError(
        409,
        "Goods receipt inspection must be completed before inventory posting",
        "INSPECTION_NOT_COMPLETED",
        {
          inspectionStatus:
            goodsReceived
              .inspection
              ?.status,
        }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw createHttpError(
        409,
        "Goods receipt does not contain any active items",
        "GOODS_RECEIVED_ITEMS_NOT_FOUND"
      );
    }
  };

/* =========================================================
   POSTABLE QUANTITY
========================================================= */

const resolvePostableQuantity = (
  item
) => {
  const acceptedQuantity =
    roundQuantity(
      item.acceptedQuantity
    );

  const alreadyPostedQuantity =
    roundQuantity(
      item.inventoryPosting
        ?.postedQuantity
    );

  return roundQuantity(
    Math.max(
      acceptedQuantity -
        alreadyPostedQuantity,
      0
    )
  );
};

/* =========================================================
   ITEM POSTING VALIDATION
========================================================= */

const validateItemForPosting =
  ({
    item,
    quantity,
  }) => {
    if (!item.product) {
      throw createHttpError(
        409,
        `Product is missing for receipt line ${item.lineNumber}`,
        "ITEM_PRODUCT_NOT_FOUND",
        {
          itemId: item._id,
          lineNumber:
            item.lineNumber,
        }
      );
    }

    if (
      !POSTABLE_ITEM_STATUSES.includes(
        item.status
      )
    ) {
      throw createHttpError(
        409,
        `Receipt line ${item.lineNumber} is not eligible for inventory posting`,
        "ITEM_NOT_POSTABLE",
        {
          itemId: item._id,
          status: item.status,
        }
      );
    }

    if (quantity <= 0) {
      throw createHttpError(
        409,
        `Receipt line ${item.lineNumber} has no remaining accepted quantity to post`,
        "NO_POSTABLE_QUANTITY",
        {
          itemId: item._id,
          acceptedQuantity:
            item.acceptedQuantity,

          postedQuantity:
            item.inventoryPosting
              ?.postedQuantity ||
            0,
        }
      );
    }

    if (
      item.inspection
        ?.required &&
      !POSTABLE_INSPECTION_STATUSES.includes(
        item.inspection
          ?.status
      )
    ) {
      throw createHttpError(
        409,
        `Inspection for receipt line ${item.lineNumber} is incomplete`,
        "ITEM_INSPECTION_INCOMPLETE",
        {
          itemId: item._id,

          inspectionStatus:
            item.inspection
              ?.status,
        }
      );
    }

    if (
      item.batchInformation?.expiryDate &&
      new Date(item.batchInformation.expiryDate).getTime() <=
        Date.now()
    ) {
      throw createHttpError(
        409,
        `Expired batch cannot be posted for receipt line ${item.lineNumber}`,
        "EXPIRED_BATCH_NOT_POSTABLE",
        {
          itemId: item._id,
        }
      );
    }

    const serialNumbers =
      Array.isArray(item.serialNumbers)
        ? item.serialNumbers
        : [];

    if (serialNumbers.length > 0) {
      if (
        serialNumbers.length !==
        quantity
      ) {
        throw createHttpError(
          409,
          `Serial number count must equal posting quantity for receipt line ${item.lineNumber}`,
          "SERIAL_QUANTITY_MISMATCH",
          {
            itemId: item._id,
            postingQuantity:
              quantity,

            serialNumberCount:
              serialNumbers.length,
          }
        );
      }
    }
  };

/* =========================================================
   STOCK LOOKUP OR CREATION
========================================================= */

const getOrCreateInventoryStock =
  async ({
    tenantId,
    warehouseId,
    item,
    userId,
    session,
  }) => {
    const stockFilter = {
      tenant: tenantId,

      warehouse:
        warehouseId,

      product:
        item.product,

      variant:
        item.variant || null,

      batchNumber:
        item.batchInformation
          ?.batchNumber ||
        null,

      isDeleted: false,
    };

    let stock =
      await InventoryStock.findOne(
        stockFilter
      ).session(session);

    if (!stock) {
      stock =
        new InventoryStock({
          ...stockFilter,

          sku:
            item.productSnapshot
              ?.sku ||
            item.variantSnapshot
              ?.sku ||
            null,

          productName:
            item.productSnapshot
              ?.productName ||
            null,

          variantName:
            item.productSnapshot
              ?.variantName ||
            null,

          unit:
            item.productSnapshot
              ?.unitName ||
            null,

          quantityOnHand: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          damagedQuantity: 0,

          averageCost: 0,
          totalStockValue: 0,

          createdBy: userId,
          updatedBy: userId,
        });
    }

    return stock;
  };

/* =========================================================
   COST RESOLUTION
========================================================= */

const resolveItemUnitCost = (
  item
) => {
  const unitCost =
    normalizeNumber(
      item.unitCost ??
        item.purchasePrice ??
        item.financialSummary
          ?.netUnitCost ??
        item.financialSummary
          ?.unitCost
    );

  return roundQuantity(
    Math.max(
      unitCost,
      0
    )
  );
};

/* =========================================================
   UPDATE WEIGHTED AVERAGE COST
========================================================= */

const calculateWeightedAverageCost =
  ({
    currentQuantity,
    currentAverageCost,
    incomingQuantity,
    incomingUnitCost,
  }) => {
    const existingValue =
      roundQuantity(
        currentQuantity *
          currentAverageCost
      );

    const incomingValue =
      roundQuantity(
        incomingQuantity *
          incomingUnitCost
      );

    const newQuantity =
      roundQuantity(
        currentQuantity +
          incomingQuantity
      );

    if (newQuantity <= 0) {
      return {
        averageCost: 0,
        totalValue: 0,
      };
    }

    return {
      averageCost:
        roundQuantity(
          (
            existingValue +
            incomingValue
          ) / newQuantity
        ),

      totalValue:
        roundQuantity(
          existingValue +
            incomingValue
        ),
    };
  };

/* =========================================================
   POST SINGLE ITEM
========================================================= */

const postItemToInventory =
  async ({
    tenantId,
    goodsReceived,
    item,
    postingReference,
    userId,
    postingDate,
    remarks,
    session,
  }) => {
    const quantity =
      resolvePostableQuantity(
        item
      );

    validateItemForPosting({
      item,
      quantity,
    });

    const warehouseId =
      item.warehouse ||
      goodsReceived.warehouse;

    if (!warehouseId) {
      throw createHttpError(
        409,
        `Warehouse is missing for receipt line ${item.lineNumber}`,
        "WAREHOUSE_REQUIRED",
        {
          itemId: item._id,
        }
      );
    }

    const stock =
      await getOrCreateInventoryStock({
        tenantId,
        warehouseId,
        item,
        userId,
        session,
      });

    const previousQuantity =
      roundQuantity(
        stock.quantityOnHand
      );

    const previousAvailableQuantity =
      roundQuantity(
        stock.availableQuantity
      );

    const previousAverageCost =
      roundQuantity(
        stock.averageCost
      );

    const unitCost =
      resolveItemUnitCost(
        item
      );

    const costResult =
      calculateWeightedAverageCost({
        currentQuantity:
          previousQuantity,

        currentAverageCost:
          previousAverageCost,

        incomingQuantity:
          quantity,

        incomingUnitCost:
          unitCost,
      });

    stock.quantityOnHand =
      roundQuantity(
        previousQuantity +
          quantity
      );

    stock.availableQuantity =
      roundQuantity(
        previousAvailableQuantity +
          quantity
      );

    stock.averageCost =
      costResult.averageCost;

    stock.totalStockValue =
      costResult.totalValue;

    stock.lastPurchaseCost =
      unitCost;

    stock.lastReceivedAt =
      postingDate;

    stock.updatedBy =
      userId;

    await stock.save({
      session,
    });

    const transaction =
      await InventoryTransaction.create(
        [
          {
            tenant: tenantId,

            transactionType:
              "Purchase Receipt",

            movementType:
              "IN",

            referenceType:
              "GoodsReceived",

            referenceId:
              goodsReceived._id,

            referenceNumber:
              postingReference,

            goodsReceived:
              goodsReceived._id,

            goodsReceivedItem:
              item._id,

            purchaseOrder:
              goodsReceived
                .purchaseOrder ||
              null,

            supplier:
              goodsReceived
                .supplier ||
              null,

            warehouse:
              warehouseId,

            inventoryStock:
              stock._id,

            product:
              item.product,

            variant:
              item.variant ||
              null,

            batchNumber:
              item.batchInformation
                ?.batchNumber ||
              null,

            serialNumbers:
              item.serialNumbers ||
              [],

            quantity,

            unitCost,

            totalCost:
              roundQuantity(
                quantity *
                  unitCost
              ),

            quantityBefore:
              previousQuantity,

            quantityAfter:
              stock.quantityOnHand,

            averageCostBefore:
              previousAverageCost,

            averageCostAfter:
              stock.averageCost,

            transactionDate:
              postingDate,

            remarks:
              normalizeString(
                remarks,
                `Inventory received from ${goodsReceived.goodsReceivedNumber}`
              ),

            status: "Posted",

            createdBy: userId,
            updatedBy: userId,
          },
        ],
        {
          session,
        }
      );

    const previousPostedQuantity =
      roundQuantity(
        item.inventoryPosting
          ?.postedQuantity
      );

    const totalPostedQuantity =
      roundQuantity(
        previousPostedQuantity +
          quantity
      );

    item.inventoryPosting = {
      ...(
        item.inventoryPosting
          ?.toObject?.() ||
        item.inventoryPosting ||
        {}
      ),

      status:
        totalPostedQuantity >=
        roundQuantity(
          item.acceptedQuantity
        )
          ? "Posted"
          : "Partially Posted",

      postedQuantity:
        totalPostedQuantity,

      postedAt:
        postingDate,

      postedBy:
        userId,

      postingReference,

      inventoryStock:
        stock._id,

      /*
       * GoodsReceivedItem schema requires stockTransaction when
       * inventoryPosting.status becomes Posted/Partially Posted.
       */
      stockTransaction:
        transaction[0]._id,

      failureReason: null,
    };

    item.updatedBy =
      userId;

    if (
      typeof item
        .calculateStatus ===
      "function"
    ) {
      item.calculateStatus();
    }

    await item.save({
      session,
    });

    return {
      item,
      stock,
      transaction:
        transaction[0],

      postedQuantity:
        quantity,

      unitCost,

      totalCost:
        roundQuantity(
          quantity * unitCost
        ),
    };
  };

/* =========================================================
   RECEIPT POSTING SUMMARY
========================================================= */

const calculatePostingSummary =
  ({
    items,
  }) => {
    const totalAcceptedQuantity =
      roundQuantity(
        items.reduce(
          (sum, item) =>
            sum +
            normalizeNumber(
              item.acceptedQuantity
            ),
          0
        )
      );

    const totalPostedQuantity =
      roundQuantity(
        items.reduce(
          (sum, item) =>
            sum +
            normalizeNumber(
              item.inventoryPosting
                ?.postedQuantity
            ),
          0
        )
      );

    const postedItemCount =
      items.filter(
        (item) =>
          item.inventoryPosting
            ?.status === "Posted"
      ).length;

    const partiallyPostedItemCount =
      items.filter(
        (item) =>
          item.inventoryPosting
            ?.status ===
          "Partially Posted"
      ).length;

    const failedItemCount = 0;

    let status =
      "Not Posted";

    if (
      totalPostedQuantity > 0 &&
      totalPostedQuantity <
        totalAcceptedQuantity
    ) {
      status =
        "Partially Posted";
    }

    if (
      totalAcceptedQuantity > 0 &&
      totalPostedQuantity >=
        totalAcceptedQuantity
    ) {
      status = "Posted";
    }


    return {
      status,

      totalItems:
        items.length,

      postedItemCount,
      partiallyPostedItemCount,
      failedItemCount,

      totalAcceptedQuantity,
      totalPostedQuantity,

      remainingQuantity:
        roundQuantity(
          Math.max(
            totalAcceptedQuantity -
              totalPostedQuantity,
            0
          )
        ),
    };
  };

/* =========================================================
   INVENTORY POSTING PREVIEW
========================================================= */

const previewGoodsReceivedInventoryPosting =
  async ({
    tenantId,
    goodsReceivedId,
  }) => {
    const goodsReceived =
      await getGoodsReceivedForPosting({
        tenantId,
        goodsReceivedId,
        lean: true,
      });

    const items =
      await getGoodsReceivedItems({
        tenantId,
        goodsReceivedId,
        lean: true,
      });

    validateReceiptForPosting({
      goodsReceived,
      items,
    });

    const previewItems =
      items.map((item) => {
        const postableQuantity =
          resolvePostableQuantity(
            item
          );

        const unitCost =
          resolveItemUnitCost(
            item
          );

        const errors = [];

        if (!item.product) {
          errors.push(
            "Product is missing"
          );
        }

        if (
          !POSTABLE_ITEM_STATUSES.includes(
            item.status
          )
        ) {
          errors.push(
            `Item status ${item.status} is not postable`
          );
        }

        if (
          postableQuantity <= 0
        ) {
          errors.push(
            "No remaining quantity to post"
          );
        }

        if (
          !(
            item.warehouse ||
            goodsReceived.warehouse
          )
        ) {
          errors.push(
            "Warehouse is missing"
          );
        }

        if (
          item.batchInformation?.expiryDate &&
          new Date(item.batchInformation.expiryDate).getTime() <= Date.now()
        ) {
          errors.push(
            "Batch is expired"
          );
        }

        {
          const serialCount =
            Array.isArray(item.serialNumbers)
              ? item.serialNumbers.length
              : 0;

          if (
            serialCount > 0 &&
            serialCount !==
            postableQuantity
          ) {
            errors.push(
              "Serial number count does not match posting quantity"
            );
          }
        }

        return {
          goodsReceivedItemId:
            item._id,

          lineNumber:
            item.lineNumber,

          product:
            item.product,

          variant:
            item.variant ||
            null,

          productSnapshot:
            item.productSnapshot,

          variantSnapshot:
            item.variantSnapshot,

          warehouse:
            item.warehouse ||
            goodsReceived.warehouse,

          acceptedQuantity:
            roundQuantity(
              item.acceptedQuantity
            ),

          alreadyPostedQuantity:
            roundQuantity(
              item.inventoryPosting
                ?.postedQuantity
            ),

          postableQuantity,

          unitCost,

          totalCost:
            roundQuantity(
              postableQuantity *
                unitCost
            ),

          batchNumber:
            item.batchInformation
              ?.batchNumber ||
            null,

          serialNumberCount:
            item.serialNumbers
              ?.length ||
            0,

          canPost:
            errors.length === 0,

          errors,
        };
      });

    const postableItems =
      previewItems.filter(
        (item) =>
          item.canPost
      );

    const totalPostableQuantity =
      roundQuantity(
        postableItems.reduce(
          (sum, item) =>
            sum +
            item.postableQuantity,
          0
        )
      );

    const totalPostingValue =
      roundQuantity(
        postableItems.reduce(
          (sum, item) =>
            sum +
            item.totalCost,
          0
        )
      );

    return {
      goodsReceived,

      items:
        previewItems,

      summary: {
        totalItems:
          previewItems.length,

        postableItemCount:
          postableItems.length,

        blockedItemCount:
          previewItems.length -
          postableItems.length,

        totalPostableQuantity,
        totalPostingValue,

        canPost:
          postableItems.length >
            0 &&
          previewItems.every(
            (item) =>
              item.canPost
          ),
      },
    };
  };

/* =========================================================
   POST GOODS RECEIPT TO INVENTORY
========================================================= */

const postGoodsReceivedInventory =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    payload = {},
  }) => {
    ensureObjectId(
      userId,
      "User"
    );

    const postingDate =
      payload.postingDate
        ? new Date(
            payload.postingDate
          )
        : new Date();

    if (
      Number.isNaN(
        postingDate.getTime()
      )
    ) {
      throw createValidationError(
        "Posting date must be a valid date",
        {
          field: "postingDate",
        }
      );
    }

    return runInTransaction(
      async (session) => {
        const goodsReceived =
          await getGoodsReceivedForPosting({
            tenantId,
            goodsReceivedId,
            session,
          });

        const items =
          await getGoodsReceivedItems({
            tenantId,
            goodsReceivedId,
            session,
          });

        validateReceiptForPosting({
          goodsReceived,
          items,
        });

        const postingReference =
          goodsReceived
            .inventoryPosting
            ?.postingReference ||
          await generateInventoryPostingReference({
            tenantId,
            session,
          });

        /*
         * Do not persist an intermediate "Pending" status here.
         *
         * The GoodsReceived schema does not allow "Pending" in
         * inventoryPosting.status. All inventory mutations below run
         * inside one MongoDB transaction, so the receipt remains
         * "Not Posted" until the transaction successfully completes.
         * On success it is saved as "Partially Posted" or "Posted".
         * On failure the entire transaction is rolled back.
         */
        const results = [];

        for (
          const item of items
        ) {
          const postableQuantity =
            resolvePostableQuantity(
              item
            );

          if (
            postableQuantity <= 0
          ) {
            continue;
          }

          const result =
            await postItemToInventory({
              tenantId,
              goodsReceived,
              item,
              postingReference,
              userId,
              postingDate,

              remarks:
                payload.remarks,

              session,
            });

          results.push(result);
        }

        if (
          results.length === 0
        ) {
          throw createHttpError(
            409,
            "No receipt items are available for inventory posting",
            "NO_ITEMS_AVAILABLE_FOR_POSTING"
          );
        }

        const refreshedItems =
          await getGoodsReceivedItems({
            tenantId,
            goodsReceivedId,
            session,
          });

        const postingSummary =
          calculatePostingSummary({
            items:
              refreshedItems,
          });

        const totalPostedValue =
          roundQuantity(
            results.reduce(
              (sum, result) =>
                sum +
                result.totalCost,
              0
            )
          );

        goodsReceived.inventoryPosting = {
          ...(
            goodsReceived
              .inventoryPosting
              ?.toObject?.() ||
            goodsReceived
              .inventoryPosting ||
            {}
          ),

          status:
            postingSummary.status,

          postingReference,

          postedQuantity:
            postingSummary
              .totalPostedQuantity,

          postedValue:
            roundQuantity(
              normalizeNumber(
                goodsReceived
                  .inventoryPosting
                  ?.postedValue
              ) +
                totalPostedValue
            ),

          postedAt:
            postingSummary
              .status === "Posted"
              ? postingDate
              : goodsReceived
                  .inventoryPosting
                  ?.postedAt ||
                null,

          postedBy:
            userId,

          failureReason: null,

          remarks:
            normalizeString(
              payload.remarks,
              goodsReceived
                .inventoryPosting
                ?.remarks ||
                null
            ),
        };

        if (
          postingSummary.status ===
          "Posted"
        ) {
          const previousStatus =
            goodsReceived.status;

          goodsReceived.status =
            "Completed";

          if (
            typeof goodsReceived
              .addStatusHistory ===
            "function"
          ) {
            goodsReceived.addStatusHistory({
              fromStatus:
                previousStatus,

              toStatus:
                "Completed",

              changedBy:
                userId,

              note:
                "Goods receipt posted to inventory",
            });
          }
        }

        goodsReceived.updatedBy =
          userId;

        await goodsReceived.save({
          session,
        });

        return {
          goodsReceived,

          postingReference,

          postedItems:
            results.map(
              (result) => ({
                item:
                  result.item,

                inventoryStock:
                  result.stock,

                inventoryTransaction:
                  result.transaction,

                postedQuantity:
                  result.postedQuantity,

                unitCost:
                  result.unitCost,

                totalCost:
                  result.totalCost,
              })
            ),

          postingSummary: {
            ...postingSummary,

            operationPostedValue:
              totalPostedValue,

            totalPostedValue:
              roundQuantity(
                normalizeNumber(
                  goodsReceived
                    .inventoryPosting
                    ?.postedValue
                )
              ),
          },
        };
      }
    );
  };

/* =========================================================
   GET INVENTORY POSTING DETAILS
========================================================= */

const getGoodsReceivedInventoryPosting =
  async ({
    tenantId,
    goodsReceivedId,
  }) => {
    const goodsReceived =
      await getGoodsReceivedForPosting({
        tenantId,
        goodsReceivedId,
        lean: true,
      });

    const items =
      await GoodsReceivedItem.find({
        tenant: tenantId,

        goodsReceived:
          goodsReceivedId,

        isDeleted: false,
      })
        .populate(
          "product",
          "productName name sku barcode"
        )
        .populate(
          "variant",
          "name variantName sku"
        )
        .populate(
          "inventoryPosting.inventoryStock"
        )
        .populate(
          "inventoryPosting.stockTransaction"
        )
        .sort({
          lineNumber: 1,
        })
        .lean();

    const transactions =
      await InventoryTransaction.find({
        tenant: tenantId,

        referenceType:
          "GoodsReceived",

        referenceId:
          goodsReceivedId,
      })
        .populate(
          "warehouse",
          "warehouseCode warehouseName name"
        )
        .populate(
          "product",
          "productName name sku"
        )
        .sort({
          createdAt: 1,
        })
        .lean();

    const postingSummary =
      calculatePostingSummary({
        items,
      });

    return {
      goodsReceived,
      items,
      transactions,
      postingSummary,
    };
  };

/* =========================================================
   PENDING POSTING QUEUE
========================================================= */

const getPendingInventoryPostingQueue =
  async ({
    tenantId,
    query = {},
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    const page = Math.max(
      Number.parseInt(
        query.page,
        10
      ) || DEFAULT_PAGE,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          query.limit,
          10
        ) || DEFAULT_LIMIT,
        1
      ),
      MAX_LIMIT
    );

    const filter = {
      tenant: tenantId,
      isDeleted: false,

      status: {
        $in:
          POSTABLE_RECEIPT_STATUSES,
      },

      "inventoryPosting.status": {
        $in: [
          "Not Posted",
          "Partially Posted",
          null,
        ],
      },
    };

    if (query.status) {
      if (
        !INVENTORY_POSTING_STATUSES.includes(
          query.status
        )
      ) {
        throw createValidationError(
          `Posting status must be one of: ${INVENTORY_POSTING_STATUSES.join(
            ", "
          )}`,
          {
            field: "status",
          }
        );
      }

      filter[
        "inventoryPosting.status"
      ] = query.status;
    }

    if (query.supplier) {
      ensureObjectId(
        query.supplier,
        "Supplier"
      );

      filter.supplier =
        query.supplier;
    }

    if (query.warehouse) {
      ensureObjectId(
        query.warehouse,
        "Warehouse"
      );

      filter.warehouse =
        query.warehouse;
    }

    const search =
      normalizeString(
        query.search
      );

    if (search) {
      const regex =
        new RegExp(
          escapeRegex(search),
          "i"
        );

      filter.$or = [
        {
          goodsReceivedNumber:
            regex,
        },
        {
          purchaseOrderNumber:
            regex,
        },
        {
          supplierInvoiceNumber:
            regex,
        },
        {
          "supplierSnapshot.businessName":
            regex,
        },
        {
          "supplierSnapshot.supplierCode":
            regex,
        },
      ];
    }

    const skip =
      (page - 1) * limit;

    const [
      goodsReceipts,
      total,
    ] = await Promise.all([
      GoodsReceived.find(filter)
        .populate(
          "supplier",
          "supplierCode businessName contactPerson phone"
        )
        .populate(
          "warehouse",
          "warehouseCode warehouseName name"
        )
        .sort({
          receivedDate: 1,
          createdAt: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      GoodsReceived.countDocuments(
        filter
      ),
    ]);

    return {
      goodsReceipts,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),

        hasNextPage:
          page * limit < total,

        hasPreviousPage:
          page > 1,
      },
    };
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  previewGoodsReceivedInventoryPosting,
  postGoodsReceivedInventory,
  getGoodsReceivedInventoryPosting,
  getPendingInventoryPostingQueue,
};