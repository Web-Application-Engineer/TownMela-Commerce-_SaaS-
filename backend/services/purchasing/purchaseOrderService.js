"use strict";

const mongoose = require("mongoose");

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

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const EDITABLE_STATUSES = [
  "Draft",
];

const DELETABLE_STATUSES = [
  "Draft",
];

const STATUS_TRANSITIONS = {
  Draft: [
    "Pending Approval",
    "Approved",
    "Cancelled",
  ],

  "Pending Approval": [
    "Approved",
    "Draft",
    "Cancelled",
  ],

  Approved: [
    "Ordered",
    "Cancelled",
  ],

  Ordered: [
    "Partially Received",
    "Received",
    "Cancelled",
  ],

  "Partially Received": [
    "Received",
    "Closed",
    "Cancelled",
  ],

  Received: [
    "Closed",
  ],

  Cancelled: [],

  Closed: [],
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

  if (details) {
    error.details = details;
  }

  return error;
};

const throwValidationError = (
  message,
  validationErrors
) => {
  const error = createHttpError(
    400,
    message,
    "VALIDATION_ERROR"
  );

  error.validationErrors =
    validationErrors;

  throw error;
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const toObjectId = (
  value,
  fieldName
) => {
  if (!isValidObjectId(value)) {
    throw createHttpError(
      400,
      `Invalid ${fieldName}`,
      `INVALID_${String(fieldName)
        .replace(/\s+/g, "_")
        .toUpperCase()}`
    );
  }

  return new mongoose.Types.ObjectId(
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

  const normalizedValue =
    value.trim();

  return normalizedValue || fallback;
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
  return Math.round(
    (normalizeNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;
};

const roundQuantity = (value) => {
  return Math.round(
    (normalizeNumber(value) +
      Number.EPSILON) *
      10000
  ) / 10000;
};

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    if (
      value.toLowerCase() === "true"
    ) {
      return true;
    }

    if (
      value.toLowerCase() === "false"
    ) {
      return false;
    }
  }

  return fallback;
};

const parseDate = (
  value,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsedDate = new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be a valid date`,
      "INVALID_DATE"
    );
  }

  return parsedDate;
};

/* =========================================================
   TRANSACTION HELPER
========================================================= */

const executeInTransaction =
  async (operation) => {
    const session =
      await mongoose.startSession();

    let result;

    try {
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
   PURCHASE ORDER NUMBER GENERATION
========================================================= */

const createTenantCode = (
  tenantId
) => {
  return String(tenantId)
    .slice(-6)
    .toUpperCase();
};

const generatePurchaseOrderNumber =
  async ({
    tenantId,
    session,
  }) => {
    const tenantCode =
      createTenantCode(tenantId);

    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const prefix =
      `PO-${tenantCode}-${datePart}`;

    const lastPurchaseOrder =
      await PurchaseOrder.findOne({
        tenant: tenantId,

        purchaseOrderNumber: {
          $regex: `^${escapeRegex(
            prefix
          )}-\\d{4}$`,
        },
      })
        .sort({
          purchaseOrderNumber: -1,
        })
        .select({
          purchaseOrderNumber: 1,
        })
        .session(session)
        .lean();

    let sequence = 1;

    if (
      lastPurchaseOrder
        ?.purchaseOrderNumber
    ) {
      const lastSequence = Number(
        lastPurchaseOrder
          .purchaseOrderNumber
          .split("-")
          .pop()
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
    ).padStart(4, "0")}`;
  };

/* =========================================================
   SUPPLIER HELPERS
========================================================= */

const getActiveSupplier = async ({
  tenantId,
  supplierId,
  session = null,
}) => {
  const supplierObjectId =
    toObjectId(
      supplierId,
      "supplier ID"
    );

  const supplier =
    await Supplier.findOne({
      _id: supplierObjectId,
      tenant: tenantId,
      isDeleted: false,
    })
      .session(session)
      .lean();

  if (!supplier) {
    throw createHttpError(
      404,
      "Supplier not found",
      "SUPPLIER_NOT_FOUND"
    );
  }

  if (
    supplier.status !== "Active"
  ) {
    throw createHttpError(
      409,
      "Only active suppliers can be used for purchase orders",
      "SUPPLIER_NOT_ACTIVE"
    );
  }

  return supplier;
};

const createSupplierSnapshot = (
  supplier
) => {
  return {
    supplierCode:
      supplier.supplierCode,

    businessName:
      supplier.businessName,

    contactPerson:
      supplier.contactPerson ||
      null,

    phone:
      supplier.phone,

    email:
      supplier.email || null,

    currency:
      supplier.currency ||
      "BDT",
  };
};

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const resolveProductVariant = (
  product,
  variantId
) => {
  if (!variantId) {
    return null;
  }

  const variantObjectId =
    toObjectId(
      variantId,
      "variant ID"
    );

  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];

  const variant = variants.find(
    (entry) =>
      String(entry._id) ===
      String(variantObjectId)
  );

  if (!variant) {
    throw createHttpError(
      404,
      "Product variant not found",
      "PRODUCT_VARIANT_NOT_FOUND"
    );
  }

  return variant;
};

const createProductSnapshot = ({
  product,
  variant,
}) => {
  return {
    productName:
      product.name ||
      product.productName ||
      product.title ||
      "Unnamed Product",

    sku:
      variant?.sku ||
      product.sku ||
      null,

    barcode:
      variant?.barcode ||
      product.barcode ||
      null,

    variantName:
      variant?.name ||
      variant?.variantName ||
      null,

    unitName:
      product.unitName ||
      product.unit ||
      "Piece",

    brandName:
      product.brandName ||
      product.brand?.name ||
      null,

    categoryName:
      product.categoryName ||
      product.category?.name ||
      null,
  };
};

const getProductForPurchase =
  async ({
    tenantId,
    productId,
    variantId = null,
    session = null,
  }) => {
    const productObjectId =
      toObjectId(
        productId,
        "product ID"
      );

    const product =
      await Product.findOne({
        _id: productObjectId,
        tenant: tenantId,
        isDeleted: {
          $ne: true,
        },
      })
        .session(session)
        .lean();

    if (!product) {
      throw createHttpError(
        404,
        "Product not found",
        "PRODUCT_NOT_FOUND"
      );
    }

    const variant =
      resolveProductVariant(
        product,
        variantId
      );

    return {
      product,
      variant,
    };
  };

/* =========================================================
   ITEM VALIDATION
========================================================= */

const validatePurchaseOrderItems = (
  items
) => {
  const errors = [];

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    errors.push({
      field: "items",
      message:
        "At least one purchase order item is required",
    });

    throwValidationError(
      "Purchase order item validation failed",
      errors
    );
  }

  if (items.length > 500) {
    errors.push({
      field: "items",
      message:
        "A purchase order cannot contain more than 500 items",
    });
  }

  items.forEach(
    (item, index) => {
      const fieldPrefix =
        `items.${index}`;

      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        errors.push({
          field: fieldPrefix,
          message:
            "Purchase order item must be an object",
        });

        return;
      }

      if (
        !isValidObjectId(
          item.product
        )
      ) {
        errors.push({
          field:
            `${fieldPrefix}.product`,

          message:
            "A valid product ID is required",
        });
      }

      if (
        item.variant &&
        !isValidObjectId(
          item.variant
        )
      ) {
        errors.push({
          field:
            `${fieldPrefix}.variant`,

          message:
            "Variant ID is invalid",
        });
      }

      const orderedQuantity =
        Number(
          item.orderedQuantity
        );

      if (
        !Number.isFinite(
          orderedQuantity
        ) ||
        orderedQuantity <= 0
      ) {
        errors.push({
          field:
            `${fieldPrefix}.orderedQuantity`,

          message:
            "Ordered quantity must be greater than zero",
        });
      }

      const unitCost = Number(
        item.unitCost
      );

      if (
        !Number.isFinite(
          unitCost
        ) ||
        unitCost < 0
      ) {
        errors.push({
          field:
            `${fieldPrefix}.unitCost`,

          message:
            "Unit cost must be zero or greater",
        });
      }

      if (
        item.discountType ===
          "Percentage" &&
        Number(item.discountValue) >
          100
      ) {
        errors.push({
          field:
            `${fieldPrefix}.discountValue`,

          message:
            "Percentage discount cannot exceed 100",
        });
      }

      if (
        item.taxType ===
          "Percentage" &&
        Number(item.taxValue) >
          100
      ) {
        errors.push({
          field:
            `${fieldPrefix}.taxValue`,

          message:
            "Percentage tax cannot exceed 100",
        });
      }
    }
  );

  if (errors.length) {
    throwValidationError(
      "Purchase order item validation failed",
      errors
    );
  }
};

/* =========================================================
   ITEM DOCUMENT CREATION
========================================================= */

const buildPurchaseOrderItems =
  async ({
    tenantId,
    purchaseOrderId,
    supplierId,
    items,
    userId,
    session,
  }) => {
    const itemDocuments = [];

    for (
      let index = 0;
      index < items.length;
      index += 1
    ) {
      const inputItem =
        items[index];

      const {
        product,
        variant,
      } =
        await getProductForPurchase({
          tenantId,

          productId:
            inputItem.product,

          variantId:
            inputItem.variant,

          session,
        });

      const itemDocument =
        new PurchaseOrderItem({
          tenant: tenantId,

          purchaseOrder:
            purchaseOrderId,

          supplier:
            supplierId,

          product:
            product._id,

          variant:
            variant?._id || null,

          productSnapshot:
            createProductSnapshot({
              product,
              variant,
            }),

          lineNumber:
            index + 1,

          orderedQuantity:
            roundQuantity(
              inputItem
                .orderedQuantity
            ),

          unitCost:
            roundMoney(
              inputItem.unitCost
            ),

          discountType:
            inputItem
              .discountType ||
            "None",

          discountValue:
            roundMoney(
              inputItem
                .discountValue
            ),

          taxType:
            inputItem.taxType ||
            "None",

          taxValue:
            roundMoney(
              inputItem.taxValue
            ),

          expectedDeliveryDate:
            parseDate(
              inputItem
                .expectedDeliveryDate,
              "Item expected delivery date"
            ),

          note:
            normalizeString(
              inputItem.note
            ),

          createdBy: userId,
          updatedBy: userId,
        });

      itemDocument
        .calculateLineSummary();

      await itemDocument.validate();

      itemDocuments.push(
        itemDocument
      );
    }

    return itemDocuments;
  };

/* =========================================================
   ORDER SUMMARY CALCULATION
========================================================= */

const calculateOrderItemSummary = (
  itemDocuments
) => {
  return itemDocuments.reduce(
    (summary, item) => {
      summary.itemCount += 1;

      summary.totalOrderedQuantity =
        roundQuantity(
          summary
            .totalOrderedQuantity +
            Number(
              item.orderedQuantity
            )
        );

      summary.subtotal =
        roundMoney(
          summary.subtotal +
            Number(
              item.lineTotal
            )
        );

      return summary;
    },
    {
      itemCount: 0,
      totalOrderedQuantity: 0,
      subtotal: 0,
    }
  );
};

/* =========================================================
   CREATE PURCHASE ORDER
========================================================= */

const createPurchaseOrder =
  async ({
    tenantId,
    userId,
    payload,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const userObjectId =
      toObjectId(
        userId,
        "user ID"
      );

    validatePurchaseOrderItems(
      payload.items
    );

    return executeInTransaction(
      async (session) => {
        const supplier =
          await getActiveSupplier({
            tenantId:
              tenantObjectId,

            supplierId:
              payload.supplier,

            session,
          });

        const purchaseOrderNumber =
          await generatePurchaseOrderNumber({
            tenantId:
              tenantObjectId,

            session,
          });

        const purchaseOrder =
          new PurchaseOrder({
            tenant:
              tenantObjectId,

            purchaseOrderNumber,

            supplier:
              supplier._id,

            supplierSnapshot:
              createSupplierSnapshot(
                supplier
              ),

            orderDate:
              parseDate(
                payload.orderDate,
                "Order date"
              ) || new Date(),

            expectedDeliveryDate:
              parseDate(
                payload
                  .expectedDeliveryDate,
                "Expected delivery date"
              ),

            referenceNumber:
              normalizeString(
                payload
                  .referenceNumber
              ),

            supplierInvoiceNumber:
              normalizeString(
                payload
                  .supplierInvoiceNumber
              ),

            source:
              payload.source ||
              "Manual",

            priority:
              payload.priority ||
              "Normal",

            status: "Draft",

            currency:
              normalizeString(
                payload.currency,
                supplier.currency ||
                  "BDT"
              ).toUpperCase(),

            exchangeRate:
              normalizeNumber(
                payload.exchangeRate,
                1
              ),

            discountType:
              payload.discountType ||
              "Fixed",

            discountValue:
              roundMoney(
                payload.discountValue
              ),

            taxAmount:
              roundMoney(
                payload.taxAmount
              ),

            shippingAmount:
              roundMoney(
                payload
                  .shippingAmount
              ),

            otherChargeAmount:
              roundMoney(
                payload
                  .otherChargeAmount
              ),

            adjustmentAmount:
              roundMoney(
                payload
                  .adjustmentAmount
              ),

            deliveryAddress:
              payload
                .deliveryAddress ||
              {},

            paymentTerm:
              normalizeString(
                payload.paymentTerm,
                supplier.paymentTerm ||
                  "Immediate"
              ),

            paymentDueDate:
              parseDate(
                payload.paymentDueDate,
                "Payment due date"
              ),

            internalNote:
              normalizeString(
                payload.internalNote
              ),

            supplierNote:
              normalizeString(
                payload.supplierNote
              ),

            termsAndConditions:
              normalizeString(
                payload
                  .termsAndConditions
              ),

            createdBy:
              userObjectId,

            updatedBy:
              userObjectId,
          });

        await purchaseOrder.save({
          session,
        });

        const itemDocuments =
          await buildPurchaseOrderItems({
            tenantId:
              tenantObjectId,

            purchaseOrderId:
              purchaseOrder._id,

            supplierId:
              supplier._id,

            items:
              payload.items,

            userId:
              userObjectId,

            session,
          });

        await PurchaseOrderItem.insertMany(
          itemDocuments.map(
            (item) =>
              item.toObject()
          ),
          {
            session,
            ordered: true,
          }
        );

        const itemSummary =
          calculateOrderItemSummary(
            itemDocuments
          );

        purchaseOrder.itemCount =
          itemSummary.itemCount;

        purchaseOrder.totalOrderedQuantity =
          itemSummary
            .totalOrderedQuantity;

        purchaseOrder.subtotal =
          itemSummary.subtotal;

        purchaseOrder.receivingSummary =
          {
            totalOrderedQuantity:
              itemSummary
                .totalOrderedQuantity,

            totalReceivedQuantity: 0,
            totalRejectedQuantity: 0,

            totalPendingQuantity:
              itemSummary
                .totalOrderedQuantity,
          };

        purchaseOrder
          .calculateFinancialSummary();

        await purchaseOrder.save({
          session,
        });

        return getPurchaseOrderById({
          tenantId:
            tenantObjectId,

          purchaseOrderId:
            purchaseOrder._id,

          includeItems: true,

          session,
        });
      }
    );
  };

/* =========================================================
   GET PURCHASE ORDERS
========================================================= */

const getPurchaseOrders =
  async ({
    tenantId,
    query = {},
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
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

    const filter = {
      tenant:
        tenantObjectId,

      isDeleted:
        parseBoolean(
          query.includeDeleted,
          false
        )
          ? {
              $in: [
                true,
                false,
              ],
            }
          : false,
    };

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.paymentStatus) {
      filter.paymentStatus =
        query.paymentStatus;
    }

    if (query.priority) {
      filter.priority =
        query.priority;
    }

    if (query.supplier) {
      filter.supplier =
        toObjectId(
          query.supplier,
          "supplier ID"
        );
    }

    if (
      query.orderDateFrom ||
      query.orderDateTo
    ) {
      filter.orderDate = {};

      if (query.orderDateFrom) {
        filter.orderDate.$gte =
          parseDate(
            query.orderDateFrom,
            "Order date from"
          );
      }

      if (query.orderDateTo) {
        const endDate =
          parseDate(
            query.orderDateTo,
            "Order date to"
          );

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.orderDate.$lte =
          endDate;
      }
    }

    if (query.search) {
      const searchRegex =
        new RegExp(
          escapeRegex(
            query.search.trim()
          ),
          "i"
        );

      filter.$or = [
        {
          purchaseOrderNumber:
            searchRegex,
        },

        {
          referenceNumber:
            searchRegex,
        },

        {
          supplierInvoiceNumber:
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

        {
          "supplierSnapshot.phone":
            searchRegex,
        },
      ];
    }

    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "orderDate",
        "expectedDeliveryDate",
        "grandTotal",
        "purchaseOrderNumber",
        "status",
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
      purchaseOrders,
      total,
    ] = await Promise.all([
      PurchaseOrder.find(filter)
        .sort({
          [sortBy]: sortOrder,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "supplier",

          select:
            "supplierCode businessName displayName phone email status",
        })
        .populate({
          path: "createdBy",

          select:
            "name email",
        })
        .populate({
          path: "updatedBy",

          select:
            "name email",
        })
        .lean(),

      PurchaseOrder.countDocuments(
        filter
      ),
    ]);

    return {
      purchaseOrders,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),

        hasNextPage:
          page <
          Math.ceil(
            total / limit
          ),

        hasPreviousPage:
          page > 1,
      },
    };
  };

/* =========================================================
   GET PURCHASE ORDER BY ID
========================================================= */

const getPurchaseOrderById =
  async ({
    tenantId,
    purchaseOrderId,
    includeItems = true,
    includeDeleted = false,
    session = null,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const orderObjectId =
      toObjectId(
        purchaseOrderId,
        "purchase order ID"
      );

    const purchaseOrderQuery =
      PurchaseOrder.findOne({
        _id: orderObjectId,

        tenant:
          tenantObjectId,

        ...(includeDeleted
          ? {}
          : {
              isDeleted: false,
            }),
      })
        .populate({
          path: "supplier",

          select:
            "supplierCode businessName displayName phone alternatePhone email status paymentTerm currency",
        })
        .populate({
          path: "createdBy",

          select:
            "name email",
        })
        .populate({
          path: "updatedBy",

          select:
            "name email",
        })
        .populate({
          path:
            "approval.requestedBy",

          select:
            "name email",
        })
        .populate({
          path:
            "approval.approvedBy",

          select:
            "name email",
        })
        .populate({
          path:
            "approval.rejectedBy",

          select:
            "name email",
        });

    if (session) {
      purchaseOrderQuery.session(
        session
      );
    }

    const purchaseOrder =
      await purchaseOrderQuery.lean();

    if (!purchaseOrder) {
      throw createHttpError(
        404,
        "Purchase order not found",
        "PURCHASE_ORDER_NOT_FOUND"
      );
    }

    if (!includeItems) {
      return {
        purchaseOrder,
      };
    }

    const itemQuery =
      PurchaseOrderItem.find({
        tenant:
          tenantObjectId,

        purchaseOrder:
          orderObjectId,

        isDeleted: false,
      })
        .sort({
          lineNumber: 1,
        })
        .populate({
          path: "product",

          select:
            "name productName title sku barcode status",
        })
        .lean();

    if (session) {
      itemQuery.session(session);
    }

    const items =
      await itemQuery;

    return {
      purchaseOrder,
      items,
    };
  };

/* =========================================================
   UPDATE PURCHASE ORDER
========================================================= */

const updatePurchaseOrder =
  async ({
    tenantId,
    purchaseOrderId,
    userId,
    payload,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const orderObjectId =
      toObjectId(
        purchaseOrderId,
        "purchase order ID"
      );

    const userObjectId =
      toObjectId(
        userId,
        "user ID"
      );

    if (
      payload.items !== undefined
    ) {
      validatePurchaseOrderItems(
        payload.items
      );
    }

    return executeInTransaction(
      async (session) => {
        const purchaseOrder =
          await PurchaseOrder.findOne({
            _id: orderObjectId,

            tenant:
              tenantObjectId,

            isDeleted: false,
          }).session(session);

        if (!purchaseOrder) {
          throw createHttpError(
            404,
            "Purchase order not found",
            "PURCHASE_ORDER_NOT_FOUND"
          );
        }

        if (
          !EDITABLE_STATUSES.includes(
            purchaseOrder.status
          )
        ) {
          throw createHttpError(
            409,
            "Only draft purchase orders can be edited",
            "PURCHASE_ORDER_UPDATE_NOT_ALLOWED"
          );
        }

        if (
          payload.supplier &&
          String(payload.supplier) !==
            String(
              purchaseOrder.supplier
            )
        ) {
          const supplier =
            await getActiveSupplier({
              tenantId:
                tenantObjectId,

              supplierId:
                payload.supplier,

              session,
            });

          purchaseOrder.supplier =
            supplier._id;

          purchaseOrder.supplierSnapshot =
            createSupplierSnapshot(
              supplier
            );
        }

        const assignableFields = [
          "source",
          "priority",
          "discountType",
          "deliveryAddress",
        ];

        assignableFields.forEach(
          (field) => {
            if (
              payload[field] !==
              undefined
            ) {
              purchaseOrder[field] =
                payload[field];
            }
          }
        );

        const stringFields = [
          "referenceNumber",
          "supplierInvoiceNumber",
          "paymentTerm",
          "internalNote",
          "supplierNote",
          "termsAndConditions",
        ];

        stringFields.forEach(
          (field) => {
            if (
              payload[field] !==
              undefined
            ) {
              purchaseOrder[field] =
                normalizeString(
                  payload[field]
                );
            }
          }
        );

        const moneyFields = [
          "discountValue",
          "taxAmount",
          "shippingAmount",
          "otherChargeAmount",
          "adjustmentAmount",
        ];

        moneyFields.forEach(
          (field) => {
            if (
              payload[field] !==
              undefined
            ) {
              purchaseOrder[field] =
                roundMoney(
                  payload[field]
                );
            }
          }
        );

        if (
          payload.currency !==
          undefined
        ) {
          purchaseOrder.currency =
            normalizeString(
              payload.currency,
              "BDT"
            ).toUpperCase();
        }

        if (
          payload.exchangeRate !==
          undefined
        ) {
          purchaseOrder.exchangeRate =
            normalizeNumber(
              payload.exchangeRate,
              1
            );
        }

        if (
          payload.orderDate !==
          undefined
        ) {
          purchaseOrder.orderDate =
            parseDate(
              payload.orderDate,
              "Order date"
            );
        }

        if (
          payload
            .expectedDeliveryDate !==
          undefined
        ) {
          purchaseOrder.expectedDeliveryDate =
            parseDate(
              payload
                .expectedDeliveryDate,
              "Expected delivery date"
            );
        }

        if (
          payload.paymentDueDate !==
          undefined
        ) {
          purchaseOrder.paymentDueDate =
            parseDate(
              payload
                .paymentDueDate,
              "Payment due date"
            );
        }

        if (
          payload.items !== undefined
        ) {
          await PurchaseOrderItem.deleteMany(
            {
              tenant:
                tenantObjectId,

              purchaseOrder:
                orderObjectId,
            },
            {
              session,
            }
          );

          const itemDocuments =
            await buildPurchaseOrderItems({
              tenantId:
                tenantObjectId,

              purchaseOrderId:
                orderObjectId,

              supplierId:
                purchaseOrder
                  .supplier,

              items:
                payload.items,

              userId:
                userObjectId,

              session,
            });

          await PurchaseOrderItem.insertMany(
            itemDocuments.map(
              (item) =>
                item.toObject()
            ),
            {
              session,
              ordered: true,
            }
          );

          const itemSummary =
            calculateOrderItemSummary(
              itemDocuments
            );

          purchaseOrder.itemCount =
            itemSummary.itemCount;

          purchaseOrder.totalOrderedQuantity =
            itemSummary
              .totalOrderedQuantity;

          purchaseOrder.subtotal =
            itemSummary.subtotal;

          purchaseOrder.receivingSummary =
            {
              totalOrderedQuantity:
                itemSummary
                  .totalOrderedQuantity,

              totalReceivedQuantity: 0,
              totalRejectedQuantity: 0,

              totalPendingQuantity:
                itemSummary
                  .totalOrderedQuantity,

              firstReceivedAt: null,
              lastReceivedAt: null,
              completedAt: null,
            };
        }

        purchaseOrder.updatedBy =
          userObjectId;

        purchaseOrder
          .calculateFinancialSummary();

        await purchaseOrder.save({
          session,
        });

        return getPurchaseOrderById({
          tenantId:
            tenantObjectId,

          purchaseOrderId:
            orderObjectId,

          includeItems: true,

          session,
        });
      }
    );
  };

/* =========================================================
   CHANGE PURCHASE ORDER STATUS
========================================================= */

const changePurchaseOrderStatus =
  async ({
    tenantId,
    purchaseOrderId,
    userId,
    status,
    reason = null,
    note = null,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const orderObjectId =
      toObjectId(
        purchaseOrderId,
        "purchase order ID"
      );

    const userObjectId =
      toObjectId(
        userId,
        "user ID"
      );

    const purchaseOrder =
      await PurchaseOrder.findOne({
        _id: orderObjectId,

        tenant:
          tenantObjectId,

        isDeleted: false,
      });

    if (!purchaseOrder) {
      throw createHttpError(
        404,
        "Purchase order not found",
        "PURCHASE_ORDER_NOT_FOUND"
      );
    }

    if (
      purchaseOrder.status === status
    ) {
      throw createHttpError(
        409,
        `Purchase order is already ${status}`,
        "PURCHASE_ORDER_STATUS_UNCHANGED"
      );
    }

    const allowedTransitions =
      STATUS_TRANSITIONS[
        purchaseOrder.status
      ] || [];

    if (
      !allowedTransitions.includes(
        status
      )
    ) {
      throw createHttpError(
        409,
        `Purchase order cannot move from ${purchaseOrder.status} to ${status}`,
        "INVALID_PURCHASE_ORDER_STATUS_TRANSITION"
      );
    }

    if (
      status === "Cancelled" &&
      !normalizeString(reason)
    ) {
      throw createHttpError(
        400,
        "Cancellation reason is required",
        "CANCELLATION_REASON_REQUIRED"
      );
    }

    purchaseOrder.addStatusHistory({
      toStatus: status,

      changedBy:
        userObjectId,

      reason:
        normalizeString(reason),

      note:
        normalizeString(note),
    });

    if (
      status ===
      "Pending Approval"
    ) {
      purchaseOrder.approval.requestedAt =
        new Date();

      purchaseOrder.approval.requestedBy =
        userObjectId;

      purchaseOrder.approval.approvedAt =
        null;

      purchaseOrder.approval.approvedBy =
        null;
    }

    if (status === "Approved") {
      purchaseOrder.approval.approvedAt =
        new Date();

      purchaseOrder.approval.approvedBy =
        userObjectId;

      purchaseOrder.approval.rejectedAt =
        null;

      purchaseOrder.approval.rejectedBy =
        null;

      purchaseOrder.approval.rejectionReason =
        null;
    }

    if (status === "Cancelled") {
      purchaseOrder.cancelledAt =
        new Date();

      purchaseOrder.cancelledBy =
        userObjectId;

      purchaseOrder.cancellationReason =
        normalizeString(reason);
    }

    if (status === "Closed") {
      purchaseOrder.closedAt =
        new Date();

      purchaseOrder.closedBy =
        userObjectId;
    }

    purchaseOrder.updatedBy =
      userObjectId;

    await purchaseOrder.save();

    return getPurchaseOrderById({
      tenantId:
        tenantObjectId,

      purchaseOrderId:
        orderObjectId,

      includeItems: true,
    });
  };

/* =========================================================
   DELETE PURCHASE ORDER
========================================================= */

const deletePurchaseOrder =
  async ({
    tenantId,
    purchaseOrderId,
    userId,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const orderObjectId =
      toObjectId(
        purchaseOrderId,
        "purchase order ID"
      );

    const userObjectId =
      toObjectId(
        userId,
        "user ID"
      );

    return executeInTransaction(
      async (session) => {
        const purchaseOrder =
          await PurchaseOrder.findOne({
            _id: orderObjectId,

            tenant:
              tenantObjectId,

            isDeleted: false,
          }).session(session);

        if (!purchaseOrder) {
          throw createHttpError(
            404,
            "Purchase order not found",
            "PURCHASE_ORDER_NOT_FOUND"
          );
        }

        if (
          !DELETABLE_STATUSES.includes(
            purchaseOrder.status
          )
        ) {
          throw createHttpError(
            409,
            "Only draft purchase orders can be deleted",
            "PURCHASE_ORDER_DELETE_NOT_ALLOWED"
          );
        }

        purchaseOrder.isDeleted =
          true;

        purchaseOrder.deletedAt =
          new Date();

        purchaseOrder.deletedBy =
          userObjectId;

        purchaseOrder.updatedBy =
          userObjectId;

        await purchaseOrder.save({
          session,
        });

        await PurchaseOrderItem.updateMany(
          {
            tenant:
              tenantObjectId,

            purchaseOrder:
              orderObjectId,

            isDeleted: false,
          },

          {
            $set: {
              isDeleted: true,
              deletedAt:
                new Date(),

              deletedBy:
                userObjectId,

              updatedBy:
                userObjectId,
            },
          },

          {
            session,
          }
        );

        return {
          purchaseOrderId:
            orderObjectId,

          deleted: true,
        };
      }
    );
  };

/* =========================================================
   RESTORE PURCHASE ORDER
========================================================= */

const restorePurchaseOrder =
  async ({
    tenantId,
    purchaseOrderId,
    userId,
  }) => {
    const tenantObjectId =
      toObjectId(
        tenantId,
        "tenant ID"
      );

    const orderObjectId =
      toObjectId(
        purchaseOrderId,
        "purchase order ID"
      );

    const userObjectId =
      toObjectId(
        userId,
        "user ID"
      );

    return executeInTransaction(
      async (session) => {
        const purchaseOrder =
          await PurchaseOrder.findOne({
            _id: orderObjectId,

            tenant:
              tenantObjectId,

            isDeleted: true,
          }).session(session);

        if (!purchaseOrder) {
          throw createHttpError(
            404,
            "Deleted purchase order not found",
            "PURCHASE_ORDER_NOT_FOUND"
          );
        }

        if (
          purchaseOrder.status !==
          "Draft"
        ) {
          throw createHttpError(
            409,
            "Only deleted draft purchase orders can be restored",
            "PURCHASE_ORDER_RESTORE_NOT_ALLOWED"
          );
        }

        purchaseOrder.isDeleted =
          false;

        purchaseOrder.deletedAt =
          null;

        purchaseOrder.deletedBy =
          null;

        purchaseOrder.updatedBy =
          userObjectId;

        await purchaseOrder.save({
          session,
        });

        await PurchaseOrderItem.updateMany(
          {
            tenant:
              tenantObjectId,

            purchaseOrder:
              orderObjectId,

            isDeleted: true,
          },

          {
            $set: {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,

              updatedBy:
                userObjectId,
            },
          },

          {
            session,
          }
        );

        return getPurchaseOrderById({
          tenantId:
            tenantObjectId,

          purchaseOrderId:
            orderObjectId,

          includeItems: true,

          session,
        });
      }
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  changePurchaseOrderStatus,
  deletePurchaseOrder,
  restorePurchaseOrder,
};