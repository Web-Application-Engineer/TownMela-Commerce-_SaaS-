"use strict";

const mongoose = require("mongoose");

const GoodsReceived = require(
  "../../models/GoodsReceived"
);

const GoodsReceivedItem = require(
  "../../models/GoodsReceivedItem"
);

const PurchaseOrder = require(
  "../../models/PurchaseOrder"
);

const PurchaseOrderItem = require(
  "../../models/PurchaseOrderItem"
);

const Supplier = require(
  "../../models/Supplier"
);

const Product = require(
  "../../models/product"
);

let Warehouse = null;

try {
  Warehouse = require(
    "../../models/Warehouse"
  );
} catch (error) {
  Warehouse = null;
}

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_ITEMS = 500;

const EDITABLE_STATUSES = [
  "Draft",
];

const DELETABLE_STATUSES = [
  "Draft",
];

const STATUS_TRANSITIONS = {
  Draft: [
    "Pending Inspection",
    "Accepted",
    "Partially Accepted",
    "Rejected",
    "Cancelled",
  ],

  "Pending Inspection": [
    "Partially Accepted",
    "Accepted",
    "Rejected",
    "Cancelled",
  ],

  "Partially Accepted": [
    "Accepted",
    "Rejected",
    "Completed",
    "Cancelled",
  ],

  Accepted: [
    "Completed",
    "Cancelled",
  ],

  Rejected: [
    "Cancelled",
  ],

  Completed: [],

  Cancelled: [],
};

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

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const normalizeString = (
  value,
  fallback = null
) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return normalized || fallback;
};

const normalizeUppercaseString = (
  value,
  fallback = null
) => {
  const normalized =
    normalizeString(value, fallback);

  return normalized
    ? normalized.toUpperCase()
    : fallback;
};

const normalizeNumber = (
  value,
  fallback = 0
) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
};

const roundMoney = (value) => {
  return (
    Math.round(
      (normalizeNumber(value) +
        Number.EPSILON) *
        100
    ) / 100
  );
};

const roundQuantity = (value) => {
  return (
    Math.round(
      (normalizeNumber(value) +
        Number.EPSILON) *
        10000
    ) / 10000
  );
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return (
    String(value).toLowerCase() ===
    "true"
  );
};

const parseDate = (
  value,
  fallback = null
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return fallback;
  }

  return parsedDate;
};

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const ensureObjectId = (
  value,
  fieldName
) => {
  if (!isValidObjectId(value)) {
    throw createValidationError(
      `${fieldName} must be a valid identifier`
    );
  }

  return value;
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
        result = await operation(
          session
        );
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   DOCUMENT NUMBER GENERATION
========================================================= */

const getTenantCode = (
  tenantId
) => {
  return String(tenantId)
    .slice(-6)
    .toUpperCase();
};

const formatSequence = (
  value
) => {
  return String(value).padStart(
    4,
    "0"
  );
};

const generateGoodsReceivedNumber =
  async ({
    tenantId,
    receivedDate,
    session,
  }) => {
    const date =
      parseDate(
        receivedDate,
        new Date()
      );

    const year = date
      .getUTCFullYear()
      .toString();

    const month = String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getUTCDate()
    ).padStart(2, "0");

    const dateKey =
      `${year}${month}${day}`;

    const prefix =
      `GRN-${getTenantCode(
        tenantId
      )}-${dateKey}`;

    const latestReceipt =
      await GoodsReceived.findOne({
        tenant: tenantId,

        goodsReceivedNumber: {
          $regex:
            `^${escapeRegex(
              prefix
            )}-\\d{4}$`,
        },
      })
        .sort({
          goodsReceivedNumber: -1,
        })
        .select(
          "goodsReceivedNumber"
        )
        .session(session)
        .lean();

    let nextSequence = 1;

    if (
      latestReceipt
        ?.goodsReceivedNumber
    ) {
      const currentSequence =
        Number(
          latestReceipt
            .goodsReceivedNumber
            .split("-")
            .pop()
        );

      if (
        Number.isInteger(
          currentSequence
        )
      ) {
        nextSequence =
          currentSequence + 1;
      }
    }

    return [
      prefix,
      formatSequence(nextSequence),
    ].join("-");
  };

/* =========================================================
   SUPPLIER HELPERS
========================================================= */

const getActiveSupplier = async ({
  tenantId,
  supplierId,
  session,
}) => {
  ensureObjectId(
    supplierId,
    "Supplier"
  );

  const supplier =
    await Supplier.findOne({
      _id: supplierId,
      tenant: tenantId,
      isDeleted: false,
    }).session(session);

  if (!supplier) {
    throw createHttpError(
      404,
      "Supplier was not found",
      "SUPPLIER_NOT_FOUND"
    );
  }

  if (
    supplier.isActive === false
  ) {
    throw createHttpError(
      409,
      "Inactive supplier cannot be used for goods receiving",
      "SUPPLIER_INACTIVE"
    );
  }

  return supplier;
};

const createSupplierSnapshot = (
  supplier
) => {
  return {
    supplierCode:
      supplier.supplierCode ||
      supplier.code ||
      "SUPPLIER",

    businessName:
      supplier.businessName ||
      supplier.name,

    contactPerson:
      supplier.contactPerson ||
      null,

    phone:
      supplier.phone ||
      supplier.primaryPhone ||
      null,

    email:
      supplier.email || null,

    currency:
      normalizeUppercaseString(
        supplier.currency,
        "BDT"
      ),
  };
};

/* =========================================================
   WAREHOUSE HELPERS
========================================================= */

const getActiveWarehouse = async ({
  tenantId,
  warehouseId,
  session,
}) => {
  ensureObjectId(
    warehouseId,
    "Warehouse"
  );

  if (!Warehouse) {
    throw createHttpError(
      500,
      "Warehouse model is not available",
      "WAREHOUSE_MODEL_NOT_AVAILABLE"
    );
  }

  const warehouse =
    await Warehouse.findOne({
      _id: warehouseId,
      tenant: tenantId,
      isDeleted: {
        $ne: true,
      },
    }).session(session);

  if (!warehouse) {
    throw createHttpError(
      404,
      "Warehouse was not found",
      "WAREHOUSE_NOT_FOUND"
    );
  }

  if (
    warehouse.isActive === false
  ) {
    throw createHttpError(
      409,
      "Inactive warehouse cannot receive goods",
      "WAREHOUSE_INACTIVE"
    );
  }

  return warehouse;
};

const createWarehouseSnapshot = (
  warehouse
) => {
  return {
    warehouseName:
      warehouse.warehouseName ||
      warehouse.name,

    warehouseCode:
      warehouse.warehouseCode ||
      warehouse.code ||
      null,

    address:
      warehouse.addressLine ||
      warehouse.address ||
      warehouse.location ||
      null,
  };
};

/* =========================================================
   PURCHASE ORDER HELPERS
========================================================= */

const getPurchaseOrder = async ({
  tenantId,
  purchaseOrderId,
  session,
}) => {
  ensureObjectId(
    purchaseOrderId,
    "Purchase order"
  );

  const purchaseOrder =
    await PurchaseOrder.findOne({
      _id: purchaseOrderId,
      tenant: tenantId,
      isDeleted: false,
    }).session(session);

  if (!purchaseOrder) {
    throw createHttpError(
      404,
      "Purchase order was not found",
      "PURCHASE_ORDER_NOT_FOUND"
    );
  }

  if (
    [
      "Draft",
      "Cancelled",
      "Closed",
    ].includes(
      purchaseOrder.status
    )
  ) {
    throw createHttpError(
      409,
      `Goods cannot be received against a ${purchaseOrder.status.toLowerCase()} purchase order`,
      "PURCHASE_ORDER_NOT_RECEIVABLE"
    );
  }

  return purchaseOrder;
};

const getPurchaseOrderItems =
  async ({
    tenantId,
    purchaseOrderId,
    session,
  }) => {
    return PurchaseOrderItem.find({
      tenant: tenantId,
      purchaseOrder:
        purchaseOrderId,
      isDeleted: false,
    })
      .sort({
        lineNumber: 1,
      })
      .session(session);
  };

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const getProductForReceipt =
  async ({
    tenantId,
    productId,
    session,
  }) => {
    ensureObjectId(
      productId,
      "Product"
    );

    const product =
      await Product.findOne({
        _id: productId,
        tenant: tenantId,
        isDeleted: {
          $ne: true,
        },
      }).session(session);

    if (!product) {
      throw createHttpError(
        404,
        "Product was not found",
        "PRODUCT_NOT_FOUND"
      );
    }

    if (
      product.isActive === false
    ) {
      throw createHttpError(
        409,
        "Inactive product cannot be received",
        "PRODUCT_INACTIVE"
      );
    }

    return product;
  };

const resolveProductVariant = (
  product,
  variantId
) => {
  if (!variantId) {
    return null;
  }

  ensureObjectId(
    variantId,
    "Product variant"
  );

  const variants =
    product.variants ||
    product.productVariants ||
    [];

  const variant =
    variants.find((entry) => {
      const entryId =
        entry._id || entry.id;

      return (
        String(entryId) ===
        String(variantId)
      );
    });

  if (!variant) {
    throw createHttpError(
      404,
      "Product variant was not found",
      "PRODUCT_VARIANT_NOT_FOUND"
    );
  }

  if (
    variant.isActive === false
  ) {
    throw createHttpError(
      409,
      "Inactive product variant cannot be received",
      "PRODUCT_VARIANT_INACTIVE"
    );
  }

  return variant;
};

const createProductSnapshot = ({
  product,
  variant,
  fallback = {},
}) => {
  return {
    productName:
      product.productName ||
      product.name ||
      fallback.productName,

    sku:
      variant?.sku ||
      product.sku ||
      fallback.sku ||
      null,

    barcode:
      variant?.barcode ||
      product.barcode ||
      fallback.barcode ||
      null,

    variantName:
      variant?.variantName ||
      variant?.name ||
      fallback.variantName ||
      null,

    unitName:
      product.unitName ||
      product.unit?.name ||
      fallback.unitName ||
      "Piece",

    brandName:
      product.brandName ||
      product.brand?.name ||
      fallback.brandName ||
      null,

    categoryName:
      product.categoryName ||
      product.category?.name ||
      fallback.categoryName ||
      null,
  };
};

/* =========================================================
   ITEM VALIDATION
========================================================= */

const validateReceiptItems = (
  items
) => {
  if (!Array.isArray(items)) {
    throw createValidationError(
      "Goods received items must be an array"
    );
  }

  if (items.length === 0) {
    throw createValidationError(
      "At least one goods received item is required"
    );
  }

  if (
    items.length > MAX_ITEMS
  ) {
    throw createValidationError(
      `A goods receipt cannot contain more than ${MAX_ITEMS} items`
    );
  }

  const duplicateKeys =
    new Set();

  items.forEach(
    (item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        throw createValidationError(
          `Item ${index + 1} must be an object`
        );
      }

      ensureObjectId(
        item.product,
        `Item ${index + 1} product`
      );

      if (item.variant) {
        ensureObjectId(
          item.variant,
          `Item ${index + 1} variant`
        );
      }

      if (
        item.purchaseOrderItem
      ) {
        ensureObjectId(
          item.purchaseOrderItem,
          `Item ${index + 1} purchase order item`
        );
      }

      const receivedQuantity =
        normalizeNumber(
          item.receivedQuantity,
          NaN
        );

      if (
        !Number.isFinite(
          receivedQuantity
        ) ||
        receivedQuantity <= 0
      ) {
        throw createValidationError(
          `Item ${index + 1} received quantity must be greater than zero`
        );
      }

      const acceptedQuantity =
        normalizeNumber(
          item.acceptedQuantity,
          0
        );

      const rejectedQuantity =
        normalizeNumber(
          item.rejectedQuantity,
          0
        );

      const damagedQuantity =
        normalizeNumber(
          item.damagedQuantity,
          0
        );

      if (
        acceptedQuantity < 0 ||
        rejectedQuantity < 0 ||
        damagedQuantity < 0
      ) {
        throw createValidationError(
          `Item ${index + 1} quantities cannot be negative`
        );
      }

      if (
        roundQuantity(
          acceptedQuantity +
            rejectedQuantity
        ) >
        roundQuantity(
          receivedQuantity
        )
      ) {
        throw createValidationError(
          `Item ${index + 1} accepted and rejected quantities cannot exceed received quantity`
        );
      }

      if (
        damagedQuantity >
        receivedQuantity
      ) {
        throw createValidationError(
          `Item ${index + 1} damaged quantity cannot exceed received quantity`
        );
      }

      const unitCost =
        normalizeNumber(
          item.unitCost,
          NaN
        );

      if (
        !Number.isFinite(
          unitCost
        ) ||
        unitCost < 0
      ) {
        throw createValidationError(
          `Item ${index + 1} unit cost must be zero or greater`
        );
      }

      if (
        item.discountType ===
          "Percentage" &&
        normalizeNumber(
          item.discountValue
        ) > 100
      ) {
        throw createValidationError(
          `Item ${index + 1} percentage discount cannot exceed 100`
        );
      }

      if (
        item.taxType ===
          "Percentage" &&
        normalizeNumber(
          item.taxValue
        ) > 100
      ) {
        throw createValidationError(
          `Item ${index + 1} percentage tax cannot exceed 100`
        );
      }

      if (
        rejectedQuantity > 0 &&
        !normalizeString(
          item.rejectionReason
        )
      ) {
        throw createValidationError(
          `Item ${index + 1} rejection reason is required`
        );
      }

      if (
        damagedQuantity > 0 &&
        !normalizeString(
          item.damageDescription
        )
      ) {
        throw createValidationError(
          `Item ${index + 1} damage description is required`
        );
      }

      const duplicateKey = [
        String(item.product),
        item.variant
          ? String(item.variant)
          : "no-variant",
        item.purchaseOrderItem
          ? String(
              item.purchaseOrderItem
            )
          : "no-po-item",
      ].join(":");

      if (
        duplicateKeys.has(
          duplicateKey
        )
      ) {
        throw createValidationError(
          `Duplicate product and variant found at item ${index + 1}`
        );
      }

      duplicateKeys.add(
        duplicateKey
      );
    }
  );
};

/* =========================================================
   PURCHASE ORDER ITEM MATCHING
========================================================= */

const findMatchingPurchaseOrderItem =
  ({
    purchaseOrderItems,
    payloadItem,
  }) => {
    if (
      payloadItem.purchaseOrderItem
    ) {
      return purchaseOrderItems.find(
        (entry) =>
          String(entry._id) ===
          String(
            payloadItem
              .purchaseOrderItem
          )
      );
    }

    return purchaseOrderItems.find(
      (entry) => {
        const sameProduct =
          String(entry.product) ===
          String(
            payloadItem.product
          );

        const entryVariant =
          entry.variant
            ? String(entry.variant)
            : null;

        const payloadVariant =
          payloadItem.variant
            ? String(
                payloadItem.variant
              )
            : null;

        return (
          sameProduct &&
          entryVariant ===
            payloadVariant
        );
      }
    );
  };

/* =========================================================
   RECEIPT ITEM BUILDING
========================================================= */

const buildGoodsReceivedItems =
  async ({
    tenantId,
    goodsReceivedId,
    supplierId,
    warehouseId,
    purchaseOrder,
    purchaseOrderItems,
    items,
    userId,
    session,
  }) => {
    const documents = [];

    for (
      let index = 0;
      index < items.length;
      index += 1
    ) {
      const payloadItem =
        items[index];

      const product =
        await getProductForReceipt({
          tenantId,
          productId:
            payloadItem.product,
          session,
        });

      const variant =
        resolveProductVariant(
          product,
          payloadItem.variant
        );

      let purchaseOrderItem =
        null;

      if (purchaseOrder) {
        purchaseOrderItem =
          findMatchingPurchaseOrderItem({
            purchaseOrderItems,
            payloadItem,
          });

        if (!purchaseOrderItem) {
          throw createHttpError(
            409,
            `Item ${index + 1} does not belong to the selected purchase order`,
            "PURCHASE_ORDER_ITEM_MISMATCH"
          );
        }

        if (
          String(
            purchaseOrderItem.product
          ) !==
          String(
            payloadItem.product
          )
        ) {
          throw createHttpError(
            409,
            `Item ${index + 1} product does not match the purchase order item`,
            "PURCHASE_ORDER_PRODUCT_MISMATCH"
          );
        }

        const orderVariant =
          purchaseOrderItem.variant
            ? String(
                purchaseOrderItem.variant
              )
            : null;

        const receiptVariant =
          payloadItem.variant
            ? String(
                payloadItem.variant
              )
            : null;

        if (
          orderVariant !==
          receiptVariant
        ) {
          throw createHttpError(
            409,
            `Item ${index + 1} variant does not match the purchase order item`,
            "PURCHASE_ORDER_VARIANT_MISMATCH"
          );
        }
      }

      const orderedQuantity =
        roundQuantity(
          purchaseOrderItem
            ?.orderedQuantity ||
            payloadItem
              .orderedQuantity ||
            0
        );

      const previouslyReceivedQuantity =
        roundQuantity(
          purchaseOrderItem
            ?.receivedQuantity || 0
        );

      const pendingOrderQuantity =
        roundQuantity(
          Math.max(
            orderedQuantity -
              previouslyReceivedQuantity -
              normalizeNumber(
                purchaseOrderItem
                  ?.cancelledQuantity,
                0
              ),
            0
          )
        );

      const receivedQuantity =
        roundQuantity(
          payloadItem
            .receivedQuantity
        );

      if (
        purchaseOrderItem &&
        receivedQuantity >
          pendingOrderQuantity
      ) {
        throw createHttpError(
          409,
          `Item ${index + 1} received quantity exceeds the pending purchase order quantity`,
          "RECEIVED_QUANTITY_EXCEEDS_PENDING",
          {
            orderedQuantity,
            previouslyReceivedQuantity,
            pendingOrderQuantity,
            requestedReceivedQuantity:
              receivedQuantity,
          }
        );
      }

      const inspectionRequired =
        parseBoolean(
          payloadItem.inspection
            ?.required,
          false
        );

      let acceptedQuantity =
        roundQuantity(
          normalizeNumber(
            payloadItem
              .acceptedQuantity,
            0
          )
        );

      let rejectedQuantity =
        roundQuantity(
          normalizeNumber(
            payloadItem
              .rejectedQuantity,
            0
          )
        );

      if (
        !inspectionRequired &&
        payloadItem
          .acceptedQuantity ===
          undefined &&
        payloadItem
          .rejectedQuantity ===
          undefined
      ) {
        acceptedQuantity =
          receivedQuantity;

        rejectedQuantity = 0;
      }

      const itemDocument =
        new GoodsReceivedItem({
          tenant: tenantId,

          goodsReceived:
            goodsReceivedId,

          purchaseOrder:
            purchaseOrder?._id ||
            null,

          purchaseOrderItem:
            purchaseOrderItem?._id ||
            null,

          supplier: supplierId,
          warehouse: warehouseId,

          product:
            payloadItem.product,

          variant:
            payloadItem.variant ||
            null,

          productSnapshot:
            createProductSnapshot({
              product,
              variant,

              fallback:
                purchaseOrderItem
                  ?.productSnapshot ||
                {},
            }),

          lineNumber: index + 1,

          orderedQuantity,

          previouslyReceivedQuantity,

          receivedQuantity,

          acceptedQuantity,

          rejectedQuantity,

          damagedQuantity:
            roundQuantity(
              payloadItem
                .damagedQuantity ||
                0
            ),

          unitCost:
            roundMoney(
              payloadItem.unitCost ??
                purchaseOrderItem
                  ?.unitCost ??
                0
            ),

          discountType:
            payloadItem
              .discountType ||
            purchaseOrderItem
              ?.discountType ||
            "None",

          discountValue:
            roundMoney(
              payloadItem
                .discountValue ??
                purchaseOrderItem
                  ?.discountValue ??
                0
            ),

          taxType:
            payloadItem.taxType ||
            purchaseOrderItem
              ?.taxType ||
            "None",

          taxValue:
            roundMoney(
              payloadItem.taxValue ??
                purchaseOrderItem
                  ?.taxValue ??
                0
            ),

          batchInformation: {
            batchNumber:
              normalizeString(
                payloadItem
                  .batchInformation
                  ?.batchNumber
              ),

            lotNumber:
              normalizeString(
                payloadItem
                  .batchInformation
                  ?.lotNumber
              ),

            manufacturingDate:
              parseDate(
                payloadItem
                  .batchInformation
                  ?.manufacturingDate
              ),

            expiryDate:
              parseDate(
                payloadItem
                  .batchInformation
                  ?.expiryDate
              ),

            supplierBatchNumber:
              normalizeString(
                payloadItem
                  .batchInformation
                  ?.supplierBatchNumber
              ),
          },

          serialNumbers:
            Array.isArray(
              payloadItem.serialNumbers
            )
              ? payloadItem.serialNumbers
              : [],

          inspection: {
            required:
              inspectionRequired,

            status:
              inspectionRequired
                ? payloadItem
                    .inspection
                    ?.status ||
                  "Pending"
                : "Not Required",

            qualityGrade:
              payloadItem
                .inspection
                ?.qualityGrade ||
              "Not Graded",

            inspectedQuantity:
              roundQuantity(
                payloadItem
                  .inspection
                  ?.inspectedQuantity ||
                  0
              ),

            passedQuantity:
              roundQuantity(
                payloadItem
                  .inspection
                  ?.passedQuantity ||
                  0
              ),

            failedQuantity:
              roundQuantity(
                payloadItem
                  .inspection
                  ?.failedQuantity ||
                  0
              ),

            inspectedAt:
              parseDate(
                payloadItem
                  .inspection
                  ?.inspectedAt
              ),

            inspectedBy:
              payloadItem
                .inspection
                ?.inspectedBy ||
              null,

            remarks:
              normalizeString(
                payloadItem
                  .inspection
                  ?.remarks
              ),
          },

          storageLocation:
            normalizeString(
              payloadItem
                .storageLocation
            ),

          rackNumber:
            normalizeString(
              payloadItem.rackNumber
            ),

          binNumber:
            normalizeString(
              payloadItem.binNumber
            ),

          rejectionReason:
            normalizeString(
              payloadItem
                .rejectionReason
            ),

          damageDescription:
            normalizeString(
              payloadItem
                .damageDescription
            ),

          note:
            normalizeString(
              payloadItem.note
            ),

          createdBy: userId,
          updatedBy: userId,
        });

      itemDocument
        .calculateQuantitySummary();

      itemDocument
        .calculateFinancialSummary();

      itemDocument
        .calculateStatus();

      documents.push(
        itemDocument
      );
    }

    return documents;
  };

/* =========================================================
   PURCHASE ORDER RECEIVING UPDATE
========================================================= */

const updatePurchaseOrderReceiving =
  async ({
    purchaseOrder,
    receiptItems,
    userId,
    session,
  }) => {
    if (!purchaseOrder) {
      return;
    }

    for (const receiptItem of receiptItems) {
      if (
        !receiptItem
          .purchaseOrderItem
      ) {
        continue;
      }

      const purchaseOrderItem =
        await PurchaseOrderItem.findOne({
          _id:
            receiptItem
              .purchaseOrderItem,

          tenant:
            purchaseOrder.tenant,

          purchaseOrder:
            purchaseOrder._id,

          isDeleted: false,
        }).session(session);

      if (!purchaseOrderItem) {
        throw createHttpError(
          404,
          "Purchase order item was not found while updating receiving quantities",
          "PURCHASE_ORDER_ITEM_NOT_FOUND"
        );
      }

      purchaseOrderItem.receivedQuantity =
        roundQuantity(
          normalizeNumber(
            purchaseOrderItem
              .receivedQuantity
          ) +
            receiptItem
              .receivedQuantity
        );

      purchaseOrderItem.pendingQuantity =
        roundQuantity(
          Math.max(
            normalizeNumber(
              purchaseOrderItem
                .orderedQuantity
            ) -
              normalizeNumber(
                purchaseOrderItem
                  .receivedQuantity
              ) -
              normalizeNumber(
                purchaseOrderItem
                  .cancelledQuantity
              ),
            0
          )
        );

      if (
        purchaseOrderItem
          .receivedQuantity >=
        purchaseOrderItem
          .orderedQuantity
      ) {
        purchaseOrderItem.status =
          "Received";
      } else if (
        purchaseOrderItem
          .receivedQuantity > 0
      ) {
        purchaseOrderItem.status =
          "Partially Received";
      }

      purchaseOrderItem.updatedBy =
        userId;

      await purchaseOrderItem.save({
        session,
      });
    }

    const allItems =
      await PurchaseOrderItem.find({
        tenant:
          purchaseOrder.tenant,

        purchaseOrder:
          purchaseOrder._id,

        isDeleted: false,
      }).session(session);

    const totalOrderedQuantity =
      roundQuantity(
        allItems.reduce(
          (sum, item) =>
            sum +
            normalizeNumber(
              item.orderedQuantity
            ),
          0
        )
      );

    const totalReceivedQuantity =
      roundQuantity(
        allItems.reduce(
          (sum, item) =>
            sum +
            normalizeNumber(
              item.receivedQuantity
            ),
          0
        )
      );

    const pendingQuantity =
      roundQuantity(
        Math.max(
          totalOrderedQuantity -
            totalReceivedQuantity,
          0
        )
      );

    purchaseOrder.receivingSummary =
      {
        ...(
          purchaseOrder
            .receivingSummary
            ?.toObject?.() ||
          purchaseOrder
            .receivingSummary ||
          {}
        ),

        totalOrderedQuantity,
        totalReceivedQuantity,
        pendingQuantity,

        lastReceivedAt:
          new Date(),
      };

    if (
      totalReceivedQuantity >=
        totalOrderedQuantity &&
      totalOrderedQuantity > 0
    ) {
      purchaseOrder.status =
        "Received";
    } else if (
      totalReceivedQuantity > 0
    ) {
      purchaseOrder.status =
        "Partially Received";
    }

    purchaseOrder.updatedBy =
      userId;

    if (
      typeof purchaseOrder
        .addStatusHistory ===
        "function"
    ) {
      const latestHistory =
        purchaseOrder
          .statusHistory?.[
          purchaseOrder
            .statusHistory.length -
            1
        ];

      if (
        latestHistory?.toStatus !==
        purchaseOrder.status
      ) {
        purchaseOrder
          .statusHistory.push({
            fromStatus:
              latestHistory
                ?.toStatus ||
              "Approved",

            toStatus:
              purchaseOrder.status,

            changedBy: userId,
            changedAt:
              new Date(),

            note:
              "Updated automatically from goods receiving",
          });
      }
    }

    await purchaseOrder.save({
      session,
    });
  };

/* =========================================================
   CREATE GOODS RECEIPT
========================================================= */

const createGoodsReceived =
  async ({
    tenantId,
    userId,
    payload,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      userId,
      "User"
    );

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      throw createValidationError(
        "A valid goods received payload is required"
      );
    }

    validateReceiptItems(
      payload.items
    );

    return runInTransaction(
      async (session) => {
        let purchaseOrder = null;
        let purchaseOrderItems =
          [];

        if (
          payload.purchaseOrder
        ) {
          purchaseOrder =
            await getPurchaseOrder({
              tenantId,

              purchaseOrderId:
                payload.purchaseOrder,

              session,
            });

          purchaseOrderItems =
            await getPurchaseOrderItems({
              tenantId,

              purchaseOrderId:
                purchaseOrder._id,

              session,
            });
        }

        const supplierId =
          purchaseOrder
            ? purchaseOrder.supplier
            : payload.supplier;

        if (!supplierId) {
          throw createValidationError(
            "Supplier is required"
          );
        }

        if (
          purchaseOrder &&
          payload.supplier &&
          String(
            payload.supplier
          ) !==
            String(
              purchaseOrder.supplier
            )
        ) {
          throw createHttpError(
            409,
            "Supplier does not match the selected purchase order",
            "PURCHASE_ORDER_SUPPLIER_MISMATCH"
          );
        }

        const supplier =
          await getActiveSupplier({
            tenantId,
            supplierId,
            session,
          });

        const warehouse =
          await getActiveWarehouse({
            tenantId,

            warehouseId:
              payload.warehouse,

            session,
          });

        const receivedDate =
          parseDate(
            payload.receivedDate,
            new Date()
          );

        const goodsReceivedNumber =
          await generateGoodsReceivedNumber({
            tenantId,
            receivedDate,
            session,
          });

        const goodsReceived =
          new GoodsReceived({
            tenant: tenantId,

            goodsReceivedNumber,

            purchaseOrder:
              purchaseOrder?._id ||
              null,

            purchaseOrderNumber:
              purchaseOrder
                ?.purchaseOrderNumber ||
              null,

            supplier:
              supplier._id,

            supplierSnapshot:
              createSupplierSnapshot(
                supplier
              ),

            warehouse:
              warehouse._id,

            warehouseSnapshot:
              createWarehouseSnapshot(
                warehouse
              ),

            receiptType:
              payload.receiptType ||
              "Full",

            source:
              purchaseOrder
                ? "Purchase Order"
                : payload.source ||
                  "Direct Purchase",

            status: "Draft",

            receivedDate,

            receivedAt:
              parseDate(
                payload.receivedAt,
                new Date()
              ),

            supplierInvoiceNumber:
              normalizeString(
                payload
                  .supplierInvoiceNumber
              ),

            supplierInvoiceDate:
              parseDate(
                payload
                  .supplierInvoiceDate
              ),

            deliveryChallanNumber:
              normalizeString(
                payload
                  .deliveryChallanNumber
              ),

            deliveryChallanDate:
              parseDate(
                payload
                  .deliveryChallanDate
              ),

            externalReferenceNumber:
              normalizeString(
                payload
                  .externalReferenceNumber
              ),

            currency:
              normalizeUppercaseString(
                payload.currency ||
                  purchaseOrder
                    ?.currency ||
                  supplier.currency,
                "BDT"
              ),

            exchangeRate:
              normalizeNumber(
                payload.exchangeRate ||
                  purchaseOrder
                    ?.exchangeRate,
                1
              ),

            transportInformation: {
              transporterName:
                normalizeString(
                  payload
                    .transportInformation
                    ?.transporterName
                ),

              vehicleNumber:
                normalizeString(
                  payload
                    .transportInformation
                    ?.vehicleNumber
                ),

              driverName:
                normalizeString(
                  payload
                    .transportInformation
                    ?.driverName
                ),

              driverPhone:
                normalizeString(
                  payload
                    .transportInformation
                    ?.driverPhone
                ),

              trackingNumber:
                normalizeString(
                  payload
                    .transportInformation
                    ?.trackingNumber
                ),

              transportCost:
                roundMoney(
                  payload
                    .transportInformation
                    ?.transportCost ||
                    0
                ),
            },

            inspection: {
              required:
                parseBoolean(
                  payload.inspection
                    ?.required,
                  false
                ),

              status:
                parseBoolean(
                  payload.inspection
                    ?.required,
                  false
                )
                  ? "Pending"
                  : "Not Required",

              remarks:
                normalizeString(
                  payload.inspection
                    ?.remarks
                ),
            },

            financialSummary: {
              shippingAmount:
                roundMoney(
                  payload
                    .shippingAmount ||
                    0
                ),

              otherChargeAmount:
                roundMoney(
                  payload
                    .otherChargeAmount ||
                    0
                ),

              adjustmentAmount:
                roundMoney(
                  payload
                    .adjustmentAmount ||
                    0
                ),
            },

            internalNote:
              normalizeString(
                payload.internalNote
              ),

            supplierNote:
              normalizeString(
                payload.supplierNote
              ),

            receivingRemark:
              normalizeString(
                payload
                  .receivingRemark
              ),

            createdBy: userId,
            updatedBy: userId,
          });

        await goodsReceived.save({
          session,
        });

        const receiptItems =
          await buildGoodsReceivedItems({
            tenantId,

            goodsReceivedId:
              goodsReceived._id,

            supplierId:
              supplier._id,

            warehouseId:
              warehouse._id,

            purchaseOrder,

            purchaseOrderItems,

            items: payload.items,

            userId,
            session,
          });

        for (
          const receiptItem of
          receiptItems
        ) {
          await receiptItem.save({
            session,
          });
        }

        goodsReceived
          .calculateReceivingSummary(
            receiptItems
          );

        goodsReceived
          .calculateFinancialSummary(
            receiptItems
          );

        const requiresInspection =
          receiptItems.some(
            (item) =>
              item.inspection
                ?.required
          );

        goodsReceived
          .inspection.required =
          requiresInspection ||
          goodsReceived.inspection
            .required;

        goodsReceived
          .inspection.status =
          goodsReceived.inspection
            .required
            ? "Pending"
            : "Not Required";

        goodsReceived
          .addStatusHistory({
            toStatus:
              goodsReceived.inspection
                .required
                ? "Pending Inspection"
                : "Accepted",

            changedBy: userId,

            note:
              "Goods receipt created",
          });

        await goodsReceived.save({
          session,
        });

        await updatePurchaseOrderReceiving({
          purchaseOrder,
          receiptItems,
          userId,
          session,
        });

        return {
          goodsReceived,
          items: receiptItems,
        };
      }
    );
  };

/* =========================================================
   GET GOODS RECEIPTS
========================================================= */

const getGoodsReceivedList =
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

    const skip =
      (page - 1) * limit;

    const includeDeleted =
      parseBoolean(
        query.includeDeleted,
        false
      );

    const filter = {
      tenant: tenantId,
    };

    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    if (query.status) {
      filter.status = query.status;
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

    if (
      query.purchaseOrder
    ) {
      ensureObjectId(
        query.purchaseOrder,
        "Purchase order"
      );

      filter.purchaseOrder =
        query.purchaseOrder;
    }

    if (query.receiptType) {
      filter.receiptType =
        query.receiptType;
    }

    if (query.source) {
      filter.source =
        query.source;
    }

    if (
      query.inspectionStatus
    ) {
      filter[
        "inspection.status"
      ] =
        query.inspectionStatus;
    }

    if (
      query.inventoryPostingStatus
    ) {
      filter[
        "inventoryPosting.status"
      ] =
        query.inventoryPostingStatus;
    }

    const receivedDateFrom =
      parseDate(
        query.receivedDateFrom
      );

    const receivedDateTo =
      parseDate(
        query.receivedDateTo
      );

    if (
      receivedDateFrom ||
      receivedDateTo
    ) {
      filter.receivedDate = {};

      if (receivedDateFrom) {
        filter.receivedDate.$gte =
          receivedDateFrom;
      }

      if (receivedDateTo) {
        const endDate =
          new Date(
            receivedDateTo
          );

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.receivedDate.$lte =
          endDate;
      }
    }

    const search =
      normalizeString(
        query.search
      );

    if (search) {
      const searchRegex =
        new RegExp(
          escapeRegex(search),
          "i"
        );

      filter.$or = [
        {
          goodsReceivedNumber:
            searchRegex,
        },

        {
          purchaseOrderNumber:
            searchRegex,
        },

        {
          supplierInvoiceNumber:
            searchRegex,
        },

        {
          deliveryChallanNumber:
            searchRegex,
        },

        {
          externalReferenceNumber:
            searchRegex,
        },

        {
          "supplierSnapshot.businessName":
            searchRegex,
        },

        {
          "supplierSnapshot.supplierCode":
            searchRegex,
        },
      ];
    }

    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "receivedDate",
        "goodsReceivedNumber",
        "status",
        "financialSummary.grandTotal",
      ]);

    const sortBy =
      allowedSortFields.has(
        query.sortBy
      )
        ? query.sortBy
        : "createdAt";

    const sortOrder =
      String(
        query.sortOrder
      ).toLowerCase() === "asc"
        ? 1
        : -1;

    const [
      goodsReceipts,
      total,
    ] = await Promise.all([
      GoodsReceived.find(
        filter
      )
        .sort({
          [sortBy]:
            sortOrder,
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
   GET GOODS RECEIPT BY ID
========================================================= */

const getGoodsReceivedById =
  async ({
    tenantId,
    goodsReceivedId,
    includeItems = true,
    includeDeleted = false,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    const filter = {
      _id: goodsReceivedId,
      tenant: tenantId,
    };

    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const goodsReceived =
      await GoodsReceived.findOne(
        filter
      )
        .populate(
          "supplier",
          "supplierCode businessName contactPerson phone email"
        )
        .populate(
          "warehouse",
          "warehouseCode warehouseName name address"
        )
        .populate(
          "purchaseOrder",
          "purchaseOrderNumber status paymentStatus grandTotal receivingSummary"
        )
        .populate(
          "createdBy updatedBy deletedBy completedBy cancelledBy",
          "name email"
        )
        .populate(
          "inspection.inspectedBy",
          "name email"
        )
        .populate(
          "inventoryPosting.postedBy inventoryPosting.reversedBy",
          "name email"
        )
        .populate(
          "statusHistory.changedBy",
          "name email"
        );

    if (!goodsReceived) {
      throw createHttpError(
        404,
        "Goods receipt was not found",
        "GOODS_RECEIVED_NOT_FOUND"
      );
    }

    let items = [];

    if (includeItems) {
      items =
        await GoodsReceivedItem.find({
          tenant: tenantId,

          goodsReceived:
            goodsReceivedId,

          isDeleted:
            includeDeleted
              ? {
                  $in: [
                    true,
                    false,
                  ],
                }
              : false,
        })
          .populate(
            "product",
            "productName name sku barcode"
          )
          .populate(
            "purchaseOrderItem",
            "lineNumber orderedQuantity receivedQuantity pendingQuantity unitCost status"
          )
          .populate(
            "warehouse",
            "warehouseCode warehouseName name"
          )
          .populate(
            "inspection.inspectedBy",
            "name email"
          )
          .populate(
            "inventoryPosting.postedBy inventoryPosting.reversedBy",
            "name email"
          )
          .sort({
            lineNumber: 1,
          });
    }

    return {
      goodsReceived,
      items,
    };
  };

/* =========================================================
   UPDATE GOODS RECEIPT
========================================================= */

const updateGoodsReceived =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    payload,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    ensureObjectId(
      userId,
      "User"
    );

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      throw createValidationError(
        "A valid update payload is required"
      );
    }

    return runInTransaction(
      async (session) => {
        const goodsReceived =
          await GoodsReceived.findOne({
            _id: goodsReceivedId,
            tenant: tenantId,
            isDeleted: false,
          }).session(session);

        if (!goodsReceived) {
          throw createHttpError(
            404,
            "Goods receipt was not found",
            "GOODS_RECEIVED_NOT_FOUND"
          );
        }

        if (
          !EDITABLE_STATUSES.includes(
            goodsReceived.status
          )
        ) {
          throw createHttpError(
            409,
            "Only draft goods receipts can be updated",
            "GOODS_RECEIVED_UPDATE_NOT_ALLOWED"
          );
        }

        if (
          goodsReceived
            .inventoryPosting
            ?.status !==
          "Not Posted"
        ) {
          throw createHttpError(
            409,
            "A posted goods receipt cannot be updated",
            "GOODS_RECEIVED_ALREADY_POSTED"
          );
        }

        const scalarFieldMap = {
          receiptType:
            "receiptType",

          source: "source",

          supplierInvoiceNumber:
            "supplierInvoiceNumber",

          supplierInvoiceDate:
            "supplierInvoiceDate",

          deliveryChallanNumber:
            "deliveryChallanNumber",

          deliveryChallanDate:
            "deliveryChallanDate",

          externalReferenceNumber:
            "externalReferenceNumber",

          internalNote:
            "internalNote",

          supplierNote:
            "supplierNote",

          receivingRemark:
            "receivingRemark",
        };

        Object.entries(
          scalarFieldMap
        ).forEach(
          ([
            payloadField,
            documentField,
          ]) => {
            if (
              payload[
                payloadField
              ] !== undefined
            ) {
              goodsReceived[
                documentField
              ] =
                payload[
                  payloadField
                ];
            }
          }
        );

        if (
          payload.receivedDate !==
          undefined
        ) {
          const receivedDate =
            parseDate(
              payload.receivedDate
            );

          if (!receivedDate) {
            throw createValidationError(
              "Received date is invalid"
            );
          }

          goodsReceived.receivedDate =
            receivedDate;
        }

        if (
          payload.currency !==
          undefined
        ) {
          goodsReceived.currency =
            normalizeUppercaseString(
              payload.currency,
              "BDT"
            );
        }

        if (
          payload.exchangeRate !==
          undefined
        ) {
          const exchangeRate =
            normalizeNumber(
              payload.exchangeRate,
              NaN
            );

          if (
            !Number.isFinite(
              exchangeRate
            ) ||
            exchangeRate <= 0
          ) {
            throw createValidationError(
              "Exchange rate must be greater than zero"
            );
          }

          goodsReceived.exchangeRate =
            exchangeRate;
        }

        if (
          payload
            .transportInformation !==
          undefined
        ) {
          goodsReceived
            .transportInformation = {
            ...(
              goodsReceived
                .transportInformation
                ?.toObject?.() ||
              goodsReceived
                .transportInformation ||
              {}
            ),

            ...payload
              .transportInformation,
          };
        }

        if (
          payload.shippingAmount !==
          undefined
        ) {
          goodsReceived
            .financialSummary
            .shippingAmount =
            roundMoney(
              payload.shippingAmount
            );
        }

        if (
          payload
            .otherChargeAmount !==
          undefined
        ) {
          goodsReceived
            .financialSummary
            .otherChargeAmount =
            roundMoney(
              payload
                .otherChargeAmount
            );
        }

        if (
          payload
            .adjustmentAmount !==
          undefined
        ) {
          goodsReceived
            .financialSummary
            .adjustmentAmount =
            roundMoney(
              payload
                .adjustmentAmount
            );
        }

        if (
          payload.items !==
          undefined
        ) {
          validateReceiptItems(
            payload.items
          );

          const purchaseOrder =
            goodsReceived
              .purchaseOrder
              ? await getPurchaseOrder({
                  tenantId,

                  purchaseOrderId:
                    goodsReceived
                      .purchaseOrder,

                  session,
                })
              : null;

          const purchaseOrderItems =
            purchaseOrder
              ? await getPurchaseOrderItems(
                  {
                    tenantId,

                    purchaseOrderId:
                      purchaseOrder._id,

                    session,
                  }
                )
              : [];

          await GoodsReceivedItem.deleteMany(
            {
              tenant: tenantId,

              goodsReceived:
                goodsReceivedId,

              "inventoryPosting.status":
                "Not Posted",
            },
            {
              session,
            }
          );

          const receiptItems =
            await buildGoodsReceivedItems({
              tenantId,

              goodsReceivedId,

              supplierId:
                goodsReceived
                  .supplier,

              warehouseId:
                goodsReceived
                  .warehouse,

              purchaseOrder,

              purchaseOrderItems,

              items: payload.items,

              userId,
              session,
            });

          for (
            const receiptItem of
            receiptItems
          ) {
            await receiptItem.save({
              session,
            });
          }

          goodsReceived
            .calculateReceivingSummary(
              receiptItems
            );

          goodsReceived
            .calculateFinancialSummary(
              receiptItems
            );
        } else {
          const existingItems =
            await GoodsReceivedItem.find(
              {
                tenant: tenantId,

                goodsReceived:
                  goodsReceivedId,

                isDeleted: false,
              }
            ).session(session);

          goodsReceived
            .calculateReceivingSummary(
              existingItems
            );

          goodsReceived
            .calculateFinancialSummary(
              existingItems
            );
        }

        goodsReceived.updatedBy =
          userId;

        await goodsReceived.save({
          session,
        });

        const result =
          await getGoodsReceivedById({
            tenantId,
            goodsReceivedId,
            includeItems: true,
          });

        return result;
      }
    );
  };

/* =========================================================
   CHANGE STATUS
========================================================= */

const changeGoodsReceivedStatus =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    status,
    reason = null,
    note = null,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    ensureObjectId(
      userId,
      "User"
    );

    if (!status) {
      throw createValidationError(
        "Status is required"
      );
    }

    return runInTransaction(
      async (session) => {
        const goodsReceived =
          await GoodsReceived.findOne({
            _id: goodsReceivedId,
            tenant: tenantId,
            isDeleted: false,
          }).session(session);

        if (!goodsReceived) {
          throw createHttpError(
            404,
            "Goods receipt was not found",
            "GOODS_RECEIVED_NOT_FOUND"
          );
        }

        if (
          goodsReceived.status ===
          status
        ) {
          throw createHttpError(
            409,
            `Goods receipt is already ${status}`,
            "GOODS_RECEIVED_STATUS_UNCHANGED"
          );
        }

        const allowedTransitions =
          STATUS_TRANSITIONS[
            goodsReceived.status
          ] || [];

        if (
          !allowedTransitions.includes(
            status
          )
        ) {
          throw createHttpError(
            409,
            `Status cannot be changed from ${goodsReceived.status} to ${status}`,
            "INVALID_GOODS_RECEIVED_STATUS_TRANSITION"
          );
        }

        if (
          status === "Cancelled" &&
          !normalizeString(reason)
        ) {
          throw createValidationError(
            "Cancellation reason is required"
          );
        }

        if (
          status === "Rejected" &&
          !normalizeString(reason)
        ) {
          throw createValidationError(
            "Rejection reason is required"
          );
        }

        if (
          status ===
            "Completed" &&
          goodsReceived
            .inventoryPosting
            ?.status !== "Posted"
        ) {
          throw createHttpError(
            409,
            "Inventory must be posted before completing the goods receipt",
            "INVENTORY_NOT_POSTED"
          );
        }

        if (
          status ===
            "Cancelled" &&
          goodsReceived
            .inventoryPosting
            ?.status === "Posted"
        ) {
          throw createHttpError(
            409,
            "Posted inventory must be reversed before cancelling the goods receipt",
            "INVENTORY_REVERSAL_REQUIRED"
          );
        }

        if (
          status === "Rejected"
        ) {
          goodsReceived.rejectionReason =
            normalizeString(reason);
        }

        if (
          status === "Cancelled"
        ) {
          goodsReceived.cancellationReason =
            normalizeString(reason);

          goodsReceived.cancelledAt =
            new Date();

          goodsReceived.cancelledBy =
            userId;
        }

        if (
          status === "Completed"
        ) {
          goodsReceived.completedAt =
            new Date();

          goodsReceived.completedBy =
            userId;
        }

        goodsReceived
          .addStatusHistory({
            toStatus: status,
            changedBy: userId,
            reason,
            note,
          });

        goodsReceived.updatedBy =
          userId;

        await goodsReceived.save({
          session,
        });

        return getGoodsReceivedById({
          tenantId,
          goodsReceivedId,
          includeItems: true,
        });
      }
    );
  };

/* =========================================================
   DELETE GOODS RECEIPT
========================================================= */

const deleteGoodsReceived =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    ensureObjectId(
      userId,
      "User"
    );

    return runInTransaction(
      async (session) => {
        const goodsReceived =
          await GoodsReceived.findOne({
            _id: goodsReceivedId,
            tenant: tenantId,
            isDeleted: false,
          }).session(session);

        if (!goodsReceived) {
          throw createHttpError(
            404,
            "Goods receipt was not found",
            "GOODS_RECEIVED_NOT_FOUND"
          );
        }

        if (
          !DELETABLE_STATUSES.includes(
            goodsReceived.status
          )
        ) {
          throw createHttpError(
            409,
            "Only draft goods receipts can be deleted",
            "GOODS_RECEIVED_DELETE_NOT_ALLOWED"
          );
        }

        if (
          goodsReceived
            .inventoryPosting
            ?.status !==
          "Not Posted"
        ) {
          throw createHttpError(
            409,
            "A posted goods receipt cannot be deleted",
            "GOODS_RECEIVED_ALREADY_POSTED"
          );
        }

        await GoodsReceivedItem.updateMany(
          {
            tenant: tenantId,

            goodsReceived:
              goodsReceivedId,

            isDeleted: false,
          },
          {
            $set: {
              isDeleted: true,
              deletedAt:
                new Date(),
              deletedBy:
                userId,
              updatedBy:
                userId,
            },
          },
          {
            session,
          }
        );

        goodsReceived.isDeleted =
          true;

        goodsReceived.deletedAt =
          new Date();

        goodsReceived.deletedBy =
          userId;

        goodsReceived.updatedBy =
          userId;

        await goodsReceived.save({
          session,
        });

        return {
          goodsReceivedId:
            goodsReceived._id,

          goodsReceivedNumber:
            goodsReceived
              .goodsReceivedNumber,

          deleted: true,
        };
      }
    );
  };

/* =========================================================
   RESTORE GOODS RECEIPT
========================================================= */

const restoreGoodsReceived =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
  }) => {
    ensureObjectId(
      tenantId,
      "Tenant"
    );

    ensureObjectId(
      goodsReceivedId,
      "Goods receipt"
    );

    ensureObjectId(
      userId,
      "User"
    );

    return runInTransaction(
      async (session) => {
        const goodsReceived =
          await GoodsReceived.findOne({
            _id: goodsReceivedId,
            tenant: tenantId,
            isDeleted: true,
          }).session(session);

        if (!goodsReceived) {
          throw createHttpError(
            404,
            "Deleted goods receipt was not found",
            "DELETED_GOODS_RECEIVED_NOT_FOUND"
          );
        }

        if (
          goodsReceived.status !==
          "Draft"
        ) {
          throw createHttpError(
            409,
            "Only draft goods receipts can be restored",
            "GOODS_RECEIVED_RESTORE_NOT_ALLOWED"
          );
        }

        goodsReceived.isDeleted =
          false;

        goodsReceived.deletedAt =
          null;

        goodsReceived.deletedBy =
          null;

        goodsReceived.updatedBy =
          userId;

        await goodsReceived.save({
          session,
        });

        await GoodsReceivedItem.updateMany(
          {
            tenant: tenantId,

            goodsReceived:
              goodsReceivedId,

            isDeleted: true,
          },
          {
            $set: {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy:
                userId,
            },
          },
          {
            session,
          }
        );

        return getGoodsReceivedById({
          tenantId,
          goodsReceivedId,
          includeItems: true,
        });
      }
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createGoodsReceived,
  getGoodsReceivedList,
  getGoodsReceivedById,
  updateGoodsReceived,
  changeGoodsReceivedStatus,
  deleteGoodsReceived,
  restoreGoodsReceived,
};