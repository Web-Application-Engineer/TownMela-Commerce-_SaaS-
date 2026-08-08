"use strict";

const mongoose = require("mongoose");

const {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_PRIORITIES,
  PURCHASE_ORDER_SOURCES,
  DISCOUNT_TYPES,
} = require("../models/PurchaseOrder");

const {
  TAX_TYPES,
  DISCOUNT_TYPES:
    ITEM_DISCOUNT_TYPES,
} = require("../models/PurchaseOrderItem");

/* =========================================================
   CONSTANTS
========================================================= */

const CURRENCIES_PATTERN =
  /^[A-Za-z]{3}$/;

const ALLOWED_CREATE_FIELDS =
  new Set([
    "supplier",
    "orderDate",
    "expectedDeliveryDate",
    "referenceNumber",
    "supplierInvoiceNumber",
    "source",
    "priority",
    "currency",
    "exchangeRate",
    "discountType",
    "discountValue",
    "taxAmount",
    "shippingAmount",
    "otherChargeAmount",
    "adjustmentAmount",
    "deliveryAddress",
    "paymentTerm",
    "paymentDueDate",
    "internalNote",
    "supplierNote",
    "termsAndConditions",
    "items",
  ]);

const ALLOWED_UPDATE_FIELDS =
  new Set([
    "supplier",
    "orderDate",
    "expectedDeliveryDate",
    "referenceNumber",
    "supplierInvoiceNumber",
    "source",
    "priority",
    "currency",
    "exchangeRate",
    "discountType",
    "discountValue",
    "taxAmount",
    "shippingAmount",
    "otherChargeAmount",
    "adjustmentAmount",
    "deliveryAddress",
    "paymentTerm",
    "paymentDueDate",
    "internalNote",
    "supplierNote",
    "termsAndConditions",
    "items",
  ]);

const FORBIDDEN_CLIENT_FIELDS =
  new Set([
    "_id",
    "id",
    "tenant",
    "tenantId",
    "purchaseOrderNumber",
    "supplierSnapshot",
    "status",
    "paymentStatus",
    "itemCount",
    "totalOrderedQuantity",
    "subtotal",
    "discountAmount",
    "grandTotal",
    "baseCurrencyGrandTotal",
    "paidAmount",
    "refundedAmount",
    "dueAmount",
    "receivingSummary",
    "approval",
    "statusHistory",
    "attachments",
    "actualDeliveryDate",
    "cancelledAt",
    "cancelledBy",
    "cancellationReason",
    "closedAt",
    "closedBy",
    "isDeleted",
    "deletedAt",
    "deletedBy",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt",
    "__v",
  ]);

const ALLOWED_ITEM_FIELDS =
  new Set([
    "product",
    "variant",
    "orderedQuantity",
    "unitCost",
    "discountType",
    "discountValue",
    "taxType",
    "taxValue",
    "expectedDeliveryDate",
    "note",
  ]);

const FORBIDDEN_ITEM_FIELDS =
  new Set([
    "_id",
    "id",
    "tenant",
    "purchaseOrder",
    "supplier",
    "productSnapshot",
    "lineNumber",
    "receivedQuantity",
    "rejectedQuantity",
    "cancelledQuantity",
    "pendingQuantity",
    "discountAmount",
    "taxAmount",
    "subtotal",
    "lineTotal",
    "status",
    "isDeleted",
    "deletedAt",
    "deletedBy",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt",
    "__v",
  ]);

const ALLOWED_ADDRESS_FIELDS =
  new Set([
    "recipientName",
    "phone",
    "addressLine1",
    "addressLine2",
    "area",
    "district",
    "division",
    "postalCode",
    "country",
  ]);

/* =========================================================
   GENERAL HELPERS
========================================================= */

const createValidationError = (
  field,
  message
) => ({
  field,
  message,
});

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const isValidDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  const parsedDate = new Date(value);

  return !Number.isNaN(
    parsedDate.getTime()
  );
};

const parseDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return new Date(value);
};

const isFiniteNumber = (value) => {
  return (
    value !== "" &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value))
  );
};

const validateString = ({
  errors,
  field,
  value,
  required = false,
  maximum,
  minimum = 0,
}) => {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      errors.push(
        createValidationError(
          field,
          `${field} is required`
        )
      );
    }

    return;
  }

  if (typeof value !== "string") {
    errors.push(
      createValidationError(
        field,
        `${field} must be a string`
      )
    );

    return;
  }

  const normalizedValue =
    value.trim();

  if (
    required &&
    normalizedValue.length === 0
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} is required`
      )
    );

    return;
  }

  if (
    normalizedValue.length < minimum
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} must contain at least ${minimum} characters`
      )
    );
  }

  if (
    normalizedValue.length > maximum
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} cannot exceed ${maximum} characters`
      )
    );
  }
};

const validateNumber = ({
  errors,
  field,
  value,
  required = false,
  minimum = null,
  maximum = null,
  greaterThan = null,
}) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      errors.push(
        createValidationError(
          field,
          `${field} is required`
        )
      );
    }

    return;
  }

  if (!isFiniteNumber(value)) {
    errors.push(
      createValidationError(
        field,
        `${field} must be a valid number`
      )
    );

    return;
  }

  const numericValue = Number(value);

  if (
    minimum !== null &&
    numericValue < minimum
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} must be at least ${minimum}`
      )
    );
  }

  if (
    maximum !== null &&
    numericValue > maximum
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} cannot exceed ${maximum}`
      )
    );
  }

  if (
    greaterThan !== null &&
    numericValue <= greaterThan
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} must be greater than ${greaterThan}`
      )
    );
  }
};

const validateEnum = ({
  errors,
  field,
  value,
  allowedValues,
  required = false,
}) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      errors.push(
        createValidationError(
          field,
          `${field} is required`
        )
      );
    }

    return;
  }

  if (
    !allowedValues.includes(value)
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} must be one of: ${allowedValues.join(
          ", "
        )}`
      )
    );
  }
};

const validateObjectFields = ({
  errors,
  object,
  fieldPrefix,
  allowedFields,
  forbiddenFields = new Set(),
}) => {
  Object.keys(object).forEach(
    (field) => {
      if (
        forbiddenFields.has(field)
      ) {
        errors.push(
          createValidationError(
            fieldPrefix
              ? `${fieldPrefix}.${field}`
              : field,
            `${field} cannot be provided by the client`
          )
        );

        return;
      }

      if (!allowedFields.has(field)) {
        errors.push(
          createValidationError(
            fieldPrefix
              ? `${fieldPrefix}.${field}`
              : field,
            `Unsupported field: ${field}`
          )
        );
      }
    }
  );
};

/* =========================================================
   DELIVERY ADDRESS VALIDATION
========================================================= */

const validateDeliveryAddress = (
  address,
  errors
) => {
  if (address === undefined) {
    return;
  }

  if (!isPlainObject(address)) {
    errors.push(
      createValidationError(
        "deliveryAddress",
        "Delivery address must be an object"
      )
    );

    return;
  }

  validateObjectFields({
    errors,
    object: address,
    fieldPrefix:
      "deliveryAddress",
    allowedFields:
      ALLOWED_ADDRESS_FIELDS,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.recipientName",
    value: address.recipientName,
    maximum: 150,
  });

  validateString({
    errors,
    field: "deliveryAddress.phone",
    value: address.phone,
    maximum: 30,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.addressLine1",
    value: address.addressLine1,
    maximum: 250,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.addressLine2",
    value: address.addressLine2,
    maximum: 250,
  });

  validateString({
    errors,
    field: "deliveryAddress.area",
    value: address.area,
    maximum: 120,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.district",
    value: address.district,
    maximum: 120,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.division",
    value: address.division,
    maximum: 120,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.postalCode",
    value: address.postalCode,
    maximum: 30,
  });

  validateString({
    errors,
    field:
      "deliveryAddress.country",
    value: address.country,
    maximum: 120,
  });
};

/* =========================================================
   PURCHASE ORDER ITEM VALIDATION
========================================================= */

const validatePurchaseOrderItem = (
  item,
  index,
  errors
) => {
  const fieldPrefix =
    `items.${index}`;

  if (!isPlainObject(item)) {
    errors.push(
      createValidationError(
        fieldPrefix,
        "Purchase order item must be an object"
      )
    );

    return;
  }

  validateObjectFields({
    errors,
    object: item,
    fieldPrefix,
    allowedFields:
      ALLOWED_ITEM_FIELDS,
    forbiddenFields:
      FORBIDDEN_ITEM_FIELDS,
  });

  if (
    !item.product ||
    !isValidObjectId(item.product)
  ) {
    errors.push(
      createValidationError(
        `${fieldPrefix}.product`,
        "A valid product ID is required"
      )
    );
  }

  if (
    item.variant !== undefined &&
    item.variant !== null &&
    item.variant !== "" &&
    !isValidObjectId(item.variant)
  ) {
    errors.push(
      createValidationError(
        `${fieldPrefix}.variant`,
        "Variant ID must be a valid ObjectId"
      )
    );
  }

  validateNumber({
    errors,
    field:
      `${fieldPrefix}.orderedQuantity`,
    value: item.orderedQuantity,
    required: true,
    greaterThan: 0,
    maximum: 999999999,
  });

  validateNumber({
    errors,
    field:
      `${fieldPrefix}.unitCost`,
    value: item.unitCost,
    required: true,
    minimum: 0,
    maximum: 999999999999,
  });

  validateEnum({
    errors,
    field:
      `${fieldPrefix}.discountType`,
    value: item.discountType,
    allowedValues:
      ITEM_DISCOUNT_TYPES,
  });

  validateNumber({
    errors,
    field:
      `${fieldPrefix}.discountValue`,
    value: item.discountValue,
    minimum: 0,
    maximum:
      item.discountType ===
      "Percentage"
        ? 100
        : 999999999999,
  });

  if (
    item.discountType === "None" &&
    item.discountValue !== undefined &&
    Number(item.discountValue) !== 0
  ) {
    errors.push(
      createValidationError(
        `${fieldPrefix}.discountValue`,
        "Discount value must be zero when discount type is None"
      )
    );
  }

  validateEnum({
    errors,
    field:
      `${fieldPrefix}.taxType`,
    value: item.taxType,
    allowedValues: TAX_TYPES,
  });

  validateNumber({
    errors,
    field:
      `${fieldPrefix}.taxValue`,
    value: item.taxValue,
    minimum: 0,
    maximum:
      item.taxType ===
      "Percentage"
        ? 100
        : 999999999999,
  });

  if (
    item.taxType === "None" &&
    item.taxValue !== undefined &&
    Number(item.taxValue) !== 0
  ) {
    errors.push(
      createValidationError(
        `${fieldPrefix}.taxValue`,
        "Tax value must be zero when tax type is None"
      )
    );
  }

  if (
    !isValidDate(
      item.expectedDeliveryDate
    )
  ) {
    errors.push(
      createValidationError(
        `${fieldPrefix}.expectedDeliveryDate`,
        "Expected delivery date must be a valid date"
      )
    );
  }

  validateString({
    errors,
    field:
      `${fieldPrefix}.note`,
    value: item.note,
    maximum: 1000,
  });
};

const validateItems = ({
  items,
  errors,
  required,
}) => {
  if (items === undefined) {
    if (required) {
      errors.push(
        createValidationError(
          "items",
          "At least one purchase order item is required"
        )
      );
    }

    return;
  }

  if (!Array.isArray(items)) {
    errors.push(
      createValidationError(
        "items",
        "Items must be an array"
      )
    );

    return;
  }

  if (items.length === 0) {
    errors.push(
      createValidationError(
        "items",
        "At least one purchase order item is required"
      )
    );

    return;
  }

  if (items.length > 500) {
    errors.push(
      createValidationError(
        "items",
        "A purchase order cannot contain more than 500 items"
      )
    );
  }

  const productVariantKeys =
    new Set();

  items.forEach((item, index) => {
    validatePurchaseOrderItem(
      item,
      index,
      errors
    );

    if (
      isPlainObject(item) &&
      isValidObjectId(item.product)
    ) {
      const duplicateKey = [
        String(item.product),
        item.variant
          ? String(item.variant)
          : "no-variant",
      ].join(":");

      if (
        productVariantKeys.has(
          duplicateKey
        )
      ) {
        errors.push(
          createValidationError(
            `items.${index}`,
            "The same product and variant cannot appear more than once"
          )
        );
      } else {
        productVariantKeys.add(
          duplicateKey
        );
      }
    }
  });
};

/* =========================================================
   DATE RELATIONSHIP VALIDATION
========================================================= */

const validateDateRelationships = (
  payload,
  errors
) => {
  const orderDate =
    parseDate(payload.orderDate);

  const expectedDeliveryDate =
    parseDate(
      payload.expectedDeliveryDate
    );

  const paymentDueDate =
    parseDate(
      payload.paymentDueDate
    );

  if (
    orderDate &&
    expectedDeliveryDate &&
    expectedDeliveryDate < orderDate
  ) {
    errors.push(
      createValidationError(
        "expectedDeliveryDate",
        "Expected delivery date cannot be before order date"
      )
    );
  }

  if (
    orderDate &&
    paymentDueDate &&
    paymentDueDate < orderDate
  ) {
    errors.push(
      createValidationError(
        "paymentDueDate",
        "Payment due date cannot be before order date"
      )
    );
  }

  if (
    expectedDeliveryDate &&
    Array.isArray(payload.items)
  ) {
    payload.items.forEach(
      (item, index) => {
        if (
          !isPlainObject(item) ||
          !isValidDate(
            item.expectedDeliveryDate
          )
        ) {
          return;
        }

        const itemDeliveryDate =
          parseDate(
            item.expectedDeliveryDate
          );

        if (
          orderDate &&
          itemDeliveryDate &&
          itemDeliveryDate <
            orderDate
        ) {
          errors.push(
            createValidationError(
              `items.${index}.expectedDeliveryDate`,
              "Item delivery date cannot be before order date"
            )
          );
        }
      }
    );
  }
};

/* =========================================================
   PURCHASE ORDER PAYLOAD VALIDATION
========================================================= */

const validatePurchaseOrderPayload =
  ({
    payload,
    isUpdate = false,
  }) => {
    const errors = [];

    if (!isPlainObject(payload)) {
      return [
        createValidationError(
          "body",
          "A valid request body is required"
        ),
      ];
    }

    if (
      isUpdate &&
      Object.keys(payload).length === 0
    ) {
      errors.push(
        createValidationError(
          "body",
          "At least one update field is required"
        )
      );

      return errors;
    }

    validateObjectFields({
      errors,
      object: payload,
      fieldPrefix: "",
      allowedFields: isUpdate
        ? ALLOWED_UPDATE_FIELDS
        : ALLOWED_CREATE_FIELDS,
      forbiddenFields:
        FORBIDDEN_CLIENT_FIELDS,
    });

    if (
      !isUpdate &&
      (!payload.supplier ||
        !isValidObjectId(
          payload.supplier
        ))
    ) {
      errors.push(
        createValidationError(
          "supplier",
          "A valid supplier ID is required"
        )
      );
    }

    if (
      isUpdate &&
      payload.supplier !==
        undefined &&
      !isValidObjectId(
        payload.supplier
      )
    ) {
      errors.push(
        createValidationError(
          "supplier",
          "Supplier ID must be a valid ObjectId"
        )
      );
    }

    if (
      !isValidDate(payload.orderDate)
    ) {
      errors.push(
        createValidationError(
          "orderDate",
          "Order date must be a valid date"
        )
      );
    }

    if (
      !isValidDate(
        payload.expectedDeliveryDate
      )
    ) {
      errors.push(
        createValidationError(
          "expectedDeliveryDate",
          "Expected delivery date must be a valid date"
        )
      );
    }

    if (
      !isValidDate(
        payload.paymentDueDate
      )
    ) {
      errors.push(
        createValidationError(
          "paymentDueDate",
          "Payment due date must be a valid date"
        )
      );
    }

    validateString({
      errors,
      field: "referenceNumber",
      value: payload.referenceNumber,
      maximum: 100,
    });

    validateString({
      errors,
      field:
        "supplierInvoiceNumber",
      value:
        payload.supplierInvoiceNumber,
      maximum: 100,
    });

    validateEnum({
      errors,
      field: "source",
      value: payload.source,
      allowedValues:
        PURCHASE_ORDER_SOURCES,
    });

    validateEnum({
      errors,
      field: "priority",
      value: payload.priority,
      allowedValues:
        PURCHASE_ORDER_PRIORITIES,
    });

    if (
      payload.currency !==
      undefined
    ) {
      if (
        typeof payload.currency !==
          "string" ||
        !CURRENCIES_PATTERN.test(
          payload.currency.trim()
        )
      ) {
        errors.push(
          createValidationError(
            "currency",
            "Currency must be a valid 3-letter code"
          )
        );
      }
    }

    validateNumber({
      errors,
      field: "exchangeRate",
      value: payload.exchangeRate,
      greaterThan: 0,
      maximum: 999999999,
    });

    validateEnum({
      errors,
      field: "discountType",
      value: payload.discountType,
      allowedValues:
        DISCOUNT_TYPES,
    });

    validateNumber({
      errors,
      field: "discountValue",
      value: payload.discountValue,
      minimum: 0,
      maximum:
        payload.discountType ===
        "Percentage"
          ? 100
          : 999999999999,
    });

    validateNumber({
      errors,
      field: "taxAmount",
      value: payload.taxAmount,
      minimum: 0,
      maximum: 999999999999,
    });

    validateNumber({
      errors,
      field: "shippingAmount",
      value: payload.shippingAmount,
      minimum: 0,
      maximum: 999999999999,
    });

    validateNumber({
      errors,
      field:
        "otherChargeAmount",
      value:
        payload.otherChargeAmount,
      minimum: 0,
      maximum: 999999999999,
    });

    validateNumber({
      errors,
      field:
        "adjustmentAmount",
      value:
        payload.adjustmentAmount,
      minimum: -999999999999,
      maximum: 999999999999,
    });

    validateString({
      errors,
      field: "paymentTerm",
      value: payload.paymentTerm,
      maximum: 100,
    });

    validateString({
      errors,
      field: "internalNote",
      value: payload.internalNote,
      maximum: 3000,
    });

    validateString({
      errors,
      field: "supplierNote",
      value: payload.supplierNote,
      maximum: 3000,
    });

    validateString({
      errors,
      field:
        "termsAndConditions",
      value:
        payload.termsAndConditions,
      maximum: 5000,
    });

    validateDeliveryAddress(
      payload.deliveryAddress,
      errors
    );

    validateItems({
      items: payload.items,
      errors,
      required: !isUpdate,
    });

    validateDateRelationships(
      payload,
      errors
    );

    return errors;
  };

/* =========================================================
   STATUS PAYLOAD VALIDATION
========================================================= */

const validateStatusPayload = (
  payload
) => {
  const errors = [];

  if (!isPlainObject(payload)) {
    return [
      createValidationError(
        "body",
        "A valid request body is required"
      ),
    ];
  }

  const allowedFields =
    new Set([
      "status",
      "reason",
      "note",
    ]);

  validateObjectFields({
    errors,
    object: payload,
    fieldPrefix: "",
    allowedFields,
  });

  validateEnum({
    errors,
    field: "status",
    value: payload.status,
    allowedValues:
      PURCHASE_ORDER_STATUSES,
    required: true,
  });

  validateString({
    errors,
    field: "reason",
    value: payload.reason,
    maximum: 1000,
  });

  validateString({
    errors,
    field: "note",
    value: payload.note,
    maximum: 1000,
  });

  if (
    payload.status ===
      "Cancelled" &&
    (
      typeof payload.reason !==
        "string" ||
      !payload.reason.trim()
    )
  ) {
    errors.push(
      createValidationError(
        "reason",
        "Cancellation reason is required"
      )
    );
  }

  return errors;
};

/* =========================================================
   QUERY VALIDATION
========================================================= */

const validatePurchaseOrderQuery =
  (req, res, next) => {
    const errors = [];
    const { query } = req;

    if (
      query.page !== undefined
    ) {
      const page = Number(
        query.page
      );

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        errors.push(
          createValidationError(
            "page",
            "Page must be a positive integer"
          )
        );
      }
    }

    if (
      query.limit !== undefined
    ) {
      const limit = Number(
        query.limit
      );

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        errors.push(
          createValidationError(
            "limit",
            "Limit must be between 1 and 100"
          )
        );
      }
    }

    validateEnum({
      errors,
      field: "status",
      value: query.status,
      allowedValues:
        PURCHASE_ORDER_STATUSES,
    });

    validateEnum({
      errors,
      field: "priority",
      value: query.priority,
      allowedValues:
        PURCHASE_ORDER_PRIORITIES,
    });

    if (
      query.supplier !==
        undefined &&
      !isValidObjectId(
        query.supplier
      )
    ) {
      errors.push(
        createValidationError(
          "supplier",
          "Supplier ID must be a valid ObjectId"
        )
      );
    }

    if (
      query.orderDateFrom !==
        undefined &&
      !isValidDate(
        query.orderDateFrom
      )
    ) {
      errors.push(
        createValidationError(
          "orderDateFrom",
          "Order date from must be a valid date"
        )
      );
    }

    if (
      query.orderDateTo !==
        undefined &&
      !isValidDate(
        query.orderDateTo
      )
    ) {
      errors.push(
        createValidationError(
          "orderDateTo",
          "Order date to must be a valid date"
        )
      );
    }

    if (
      isValidDate(
        query.orderDateFrom
      ) &&
      isValidDate(
        query.orderDateTo
      )
    ) {
      const fromDate = parseDate(
        query.orderDateFrom
      );

      const toDate = parseDate(
        query.orderDateTo
      );

      if (
        fromDate &&
        toDate &&
        fromDate > toDate
      ) {
        errors.push(
          createValidationError(
            "orderDateTo",
            "Order date to cannot be before order date from"
          )
        );
      }
    }

    const booleanQueryFields = [
      "includeDeleted",
      "includeItems",
    ];

    booleanQueryFields.forEach(
      (field) => {
        if (
          query[field] !==
            undefined &&
          ![
            "true",
            "false",
          ].includes(
            String(
              query[field]
            ).toLowerCase()
          )
        ) {
          errors.push(
            createValidationError(
              field,
              `${field} must be true or false`
            )
          );
        }
      }
    );

    const allowedSortFields =
      [
        "createdAt",
        "updatedAt",
        "orderDate",
        "expectedDeliveryDate",
        "grandTotal",
        "purchaseOrderNumber",
        "status",
      ];

    if (
      query.sortBy !== undefined &&
      !allowedSortFields.includes(
        query.sortBy
      )
    ) {
      errors.push(
        createValidationError(
          "sortBy",
          `sortBy must be one of: ${allowedSortFields.join(
            ", "
          )}`
        )
      );
    }

    if (
      query.sortOrder !==
        undefined &&
      ![
        "asc",
        "desc",
      ].includes(
        String(
          query.sortOrder
        ).toLowerCase()
      )
    ) {
      errors.push(
        createValidationError(
          "sortOrder",
          "sortOrder must be asc or desc"
        )
      );
    }

    if (errors.length) {
      return sendValidationErrors(
        req,
        res,
        errors
      );
    }

    return next();
  };

/* =========================================================
   RESPONSE HELPER
========================================================= */

const sendValidationErrors = (
  req,
  res,
  errors
) => {
  return res.status(400).json({
    success: false,
    code: "VALIDATION_ERROR",
    message:
      "Purchase order request validation failed",
    errors,
    requestId:
      req.requestId || null,
  });
};

/* =========================================================
   MIDDLEWARES
========================================================= */

const validateCreatePurchaseOrder =
  (req, res, next) => {
    const errors =
      validatePurchaseOrderPayload({
        payload: req.body,
        isUpdate: false,
      });

    if (errors.length) {
      return sendValidationErrors(
        req,
        res,
        errors
      );
    }

    return next();
  };

const validateUpdatePurchaseOrder =
  (req, res, next) => {
    const errors =
      validatePurchaseOrderPayload({
        payload: req.body,
        isUpdate: true,
      });

    if (errors.length) {
      return sendValidationErrors(
        req,
        res,
        errors
      );
    }

    return next();
  };

const validatePurchaseOrderStatus =
  (req, res, next) => {
    const errors =
      validateStatusPayload(
        req.body
      );

    if (errors.length) {
      return sendValidationErrors(
        req,
        res,
        errors
      );
    }

    return next();
  };

const validatePurchaseOrderId =
  (req, res, next) => {
    const {
      purchaseOrderId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        purchaseOrderId
      )
    ) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_PURCHASE_ORDER_ID",
        message:
          "Invalid purchase order identifier",
        requestId:
          req.requestId || null,
      });
    }

    return next();
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validatePurchaseOrderStatus,
  validatePurchaseOrderId,
  validatePurchaseOrderQuery,
};