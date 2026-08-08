"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const VENDOR_INVOICE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
  "Disputed",
];

const PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overpaid",
];

const MATCHING_STATUSES = [
  "Not Matched",
  "Matched",
  "Partially Matched",
  "Mismatch",
];

const APPROVAL_STATUSES = [
  "Not Required",
  "Pending",
  "Approved",
  "Rejected",
];

const DISCOUNT_TYPES = [
  "None",
  "Percentage",
  "Fixed",
];

const SORT_FIELDS = [
  "invoiceDate",
  "dueDate",
  "createdAt",
  "updatedAt",
  "invoiceNumber",
  "grandTotal",
  "status",
];

const SORT_ORDERS = [
  "asc",
  "desc",
];

const ALLOWED_CURRENCIES = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SAR",
  "CNY",
  "JPY",
];

/* =========================================================
   ERROR HELPERS
========================================================= */

const createValidationError = (
  message,
  {
    field = null,
    code = "VALIDATION_ERROR",
    details = null,
  } = {}
) => {
  const error = new Error(message);

  error.statusCode = 400;
  error.code = code;

  if (field) {
    error.field = field;
  }

  if (details) {
    error.details = details;
  }

  return error;
};

const throwValidationError = (
  message,
  options = {}
) => {
  throw createValidationError(
    message,
    options
  );
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const hasOwn = (
  object,
  property
) =>
  Object.prototype.hasOwnProperty.call(
    object,
    property
  );

const isPlainObject = (
  value
) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const isNonEmptyString = (
  value
) =>
  typeof value === "string" &&
  value.trim().length > 0;

const isValidObjectId = (
  value
) =>
  mongoose.Types.ObjectId.isValid(
    value
  );

const isValidDate = (
  value
) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

const isFiniteNumber = (
  value
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return false;
  }

  return Number.isFinite(
    Number(value)
  );
};

const parseBoolean = (
  value
) => {
  if (
    value === true ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false"
  ) {
    return false;
  }

  return null;
};

const normalizeString = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return value;
  }

  return value.trim();
};

const sanitizeOptionalString = (
  object,
  field
) => {
  if (
    hasOwn(object, field) &&
    typeof object[field] ===
      "string"
  ) {
    object[field] =
      object[field].trim();
  }
};

const sanitizeNumber = (
  object,
  field
) => {
  if (
    hasOwn(object, field) &&
    isFiniteNumber(
      object[field]
    )
  ) {
    object[field] =
      Number(object[field]);
  }
};

/* =========================================================
   VALIDATION HELPERS
========================================================= */

const validateRequiredString = (
  value,
  field,
  {
    minLength = 1,
    maxLength = 255,
  } = {}
) => {
  if (!isNonEmptyString(value)) {
    throwValidationError(
      `${field} is required`,
      {
        field,
        code:
          "REQUIRED_FIELD",
      }
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length <
    minLength
  ) {
    throwValidationError(
      `${field} must contain at least ${minLength} characters`,
      {
        field,
        code:
          "INVALID_STRING_LENGTH",
      }
    );
  }

  if (
    normalized.length >
    maxLength
  ) {
    throwValidationError(
      `${field} cannot exceed ${maxLength} characters`,
      {
        field,
        code:
          "INVALID_STRING_LENGTH",
      }
    );
  }

  return normalized;
};

const validateOptionalString = (
  value,
  field,
  {
    maxLength = 1000,
    allowEmpty = true,
  } = {}
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    throwValidationError(
      `${field} must be a string`,
      {
        field,
        code:
          "INVALID_STRING",
      }
    );
  }

  const normalized =
    value.trim();

  if (
    !allowEmpty &&
    normalized.length === 0
  ) {
    throwValidationError(
      `${field} cannot be empty`,
      {
        field,
        code:
          "EMPTY_STRING_NOT_ALLOWED",
      }
    );
  }

  if (
    normalized.length >
    maxLength
  ) {
    throwValidationError(
      `${field} cannot exceed ${maxLength} characters`,
      {
        field,
        code:
          "INVALID_STRING_LENGTH",
      }
    );
  }

  return normalized;
};

const validateObjectId = (
  value,
  field,
  {
    required = true,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throwValidationError(
        `${field} is required`,
        {
          field,
          code:
            "REQUIRED_FIELD",
        }
      );
    }

    return null;
  }

  if (!isValidObjectId(value)) {
    throwValidationError(
      `${field} must be a valid MongoDB ObjectId`,
      {
        field,
        code:
          "INVALID_OBJECT_ID",
      }
    );
  }

  return value;
};

const validateNumber = (
  value,
  field,
  {
    required = false,
    min = null,
    max = null,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throwValidationError(
        `${field} is required`,
        {
          field,
          code:
            "REQUIRED_FIELD",
        }
      );
    }

    return null;
  }

  if (!isFiniteNumber(value)) {
    throwValidationError(
      `${field} must be a valid number`,
      {
        field,
        code:
          "INVALID_NUMBER",
      }
    );
  }

  const numberValue =
    Number(value);

  if (
    min !== null &&
    numberValue < min
  ) {
    throwValidationError(
      `${field} cannot be less than ${min}`,
      {
        field,
        code:
          "NUMBER_BELOW_MINIMUM",
      }
    );
  }

  if (
    max !== null &&
    numberValue > max
  ) {
    throwValidationError(
      `${field} cannot be greater than ${max}`,
      {
        field,
        code:
          "NUMBER_ABOVE_MAXIMUM",
      }
    );
  }

  return numberValue;
};

const validateInteger = (
  value,
  field,
  {
    required = false,
    min = null,
    max = null,
  } = {}
) => {
  const numberValue =
    validateNumber(
      value,
      field,
      {
        required,
        min,
        max,
      }
    );

  if (
    numberValue !== null &&
    !Number.isInteger(
      numberValue
    )
  ) {
    throwValidationError(
      `${field} must be an integer`,
      {
        field,
        code:
          "INVALID_INTEGER",
      }
    );
  }

  return numberValue;
};

const validateDate = (
  value,
  field,
  {
    required = false,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throwValidationError(
        `${field} is required`,
        {
          field,
          code:
            "REQUIRED_FIELD",
        }
      );
    }

    return null;
  }

  if (!isValidDate(value)) {
    throwValidationError(
      `${field} must be a valid date`,
      {
        field,
        code:
          "INVALID_DATE",
      }
    );
  }

  return new Date(value);
};

const validateEnum = (
  value,
  field,
  allowedValues,
  {
    required = false,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throwValidationError(
        `${field} is required`,
        {
          field,
          code:
            "REQUIRED_FIELD",
        }
      );
    }

    return null;
  }

  if (
    !allowedValues.includes(
      value
    )
  ) {
    throwValidationError(
      `${field} must be one of: ${allowedValues.join(
        ", "
      )}`,
      {
        field,
        code:
          "INVALID_ENUM_VALUE",
      }
    );
  }

  return value;
};

const validateBoolean = (
  value,
  field,
  {
    required = false,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throwValidationError(
        `${field} is required`,
        {
          field,
          code:
            "REQUIRED_FIELD",
        }
      );
    }

    return null;
  }

  const booleanValue =
    parseBoolean(value);

  if (
    booleanValue === null
  ) {
    throwValidationError(
      `${field} must be true or false`,
      {
        field,
        code:
          "INVALID_BOOLEAN",
      }
    );
  }

  return booleanValue;
};

/* =========================================================
   ATTACHMENT VALIDATION
========================================================= */

const validateAttachments = (
  attachments
) => {
  if (
    attachments === undefined ||
    attachments === null
  ) {
    return;
  }

  if (
    !Array.isArray(
      attachments
    )
  ) {
    throwValidationError(
      "attachments must be an array",
      {
        field:
          "attachments",
        code:
          "INVALID_ATTACHMENTS",
      }
    );
  }

  if (
    attachments.length > 20
  ) {
    throwValidationError(
      "A maximum of 20 attachments is allowed",
      {
        field:
          "attachments",
        code:
          "TOO_MANY_ATTACHMENTS",
      }
    );
  }

  attachments.forEach(
    (
      attachment,
      index
    ) => {
      const field =
        `attachments[${index}]`;

      if (
        !isPlainObject(
          attachment
        )
      ) {
        throwValidationError(
          `${field} must be an object`,
          {
            field,
            code:
              "INVALID_ATTACHMENT",
          }
        );
      }

      if (
        hasOwn(
          attachment,
          "fileName"
        )
      ) {
        attachment.fileName =
          validateOptionalString(
            attachment.fileName,
            `${field}.fileName`,
            {
              maxLength: 255,
              allowEmpty: false,
            }
          );
      }

      if (
        hasOwn(
          attachment,
          "url"
        )
      ) {
        attachment.url =
          validateOptionalString(
            attachment.url,
            `${field}.url`,
            {
              maxLength: 2000,
              allowEmpty: false,
            }
          );
      }

      if (
        hasOwn(
          attachment,
          "mimeType"
        )
      ) {
        attachment.mimeType =
          validateOptionalString(
            attachment.mimeType,
            `${field}.mimeType`,
            {
              maxLength: 100,
            }
          );
      }

      if (
        hasOwn(
          attachment,
          "size"
        )
      ) {
        attachment.size =
          validateNumber(
            attachment.size,
            `${field}.size`,
            {
              min: 0,
              max:
                50 *
                1024 *
                1024,
            }
          );
      }
    }
  );
};

/* =========================================================
   DISCOUNT VALIDATION
========================================================= */

const validateDiscount = (
  discount,
  field
) => {
  if (
    discount === undefined ||
    discount === null
  ) {
    return;
  }

  if (
    !isPlainObject(
      discount
    )
  ) {
    throwValidationError(
      `${field} must be an object`,
      {
        field,
        code:
          "INVALID_DISCOUNT",
      }
    );
  }

  if (
    hasOwn(
      discount,
      "type"
    )
  ) {
    discount.type =
      validateEnum(
        discount.type,
        `${field}.type`,
        DISCOUNT_TYPES,
        {
          required: true,
        }
      );
  }

  if (
    hasOwn(
      discount,
      "rate"
    )
  ) {
    discount.rate =
      validateNumber(
        discount.rate,
        `${field}.rate`,
        {
          min: 0,
          max: 100,
        }
      );
  }

  if (
    hasOwn(
      discount,
      "amount"
    )
  ) {
    discount.amount =
      validateNumber(
        discount.amount,
        `${field}.amount`,
        {
          min: 0,
        }
      );
  }

  if (
    discount.type ===
      "Percentage" &&
    discount.rate ===
      undefined
  ) {
    throwValidationError(
      `${field}.rate is required for Percentage discount`,
      {
        field:
          `${field}.rate`,
        code:
          "DISCOUNT_RATE_REQUIRED",
      }
    );
  }

  if (
    discount.type ===
      "Fixed" &&
    discount.amount ===
      undefined
  ) {
    throwValidationError(
      `${field}.amount is required for Fixed discount`,
      {
        field:
          `${field}.amount`,
        code:
          "DISCOUNT_AMOUNT_REQUIRED",
      }
    );
  }
};

/* =========================================================
   TAX VALIDATION
========================================================= */

const validateTax = (
  tax,
  field
) => {
  if (
    tax === undefined ||
    tax === null
  ) {
    return;
  }

  if (!isPlainObject(tax)) {
    throwValidationError(
      `${field} must be an object`,
      {
        field,
        code:
          "INVALID_TAX",
      }
    );
  }

  sanitizeOptionalString(
    tax,
    "taxCode"
  );

  sanitizeOptionalString(
    tax,
    "taxName"
  );

  if (
    hasOwn(
      tax,
      "taxRate"
    )
  ) {
    tax.taxRate =
      validateNumber(
        tax.taxRate,
        `${field}.taxRate`,
        {
          min: 0,
          max: 100,
        }
      );
  }

  if (
    hasOwn(
      tax,
      "withholdingTaxRate"
    )
  ) {
    tax.withholdingTaxRate =
      validateNumber(
        tax.withholdingTaxRate,
        `${field}.withholdingTaxRate`,
        {
          min: 0,
          max: 100,
        }
      );
  }

  if (
    hasOwn(
      tax,
      "inclusive"
    )
  ) {
    tax.inclusive =
      validateBoolean(
        tax.inclusive,
        `${field}.inclusive`
      );
  }
};

/* =========================================================
   ACCOUNTING ALLOCATION VALIDATION
========================================================= */

const validateAccountingAllocation =
  (
    allocation,
    field
  ) => {
    if (
      allocation ===
        undefined ||
      allocation === null
    ) {
      return;
    }

    if (
      !isPlainObject(
        allocation
      )
    ) {
      throwValidationError(
        `${field} must be an object`,
        {
          field,
          code:
            "INVALID_ACCOUNTING_ALLOCATION",
        }
      );
    }

    const objectIdFields = [
      "expenseAccount",
      "inventoryAccount",
      "taxAccount",
      "withholdingTaxAccount",
      "costCenter",
      "department",
      "project",
    ];

    objectIdFields.forEach(
      (key) => {
        if (
          hasOwn(
            allocation,
            key
          ) &&
          allocation[key]
        ) {
          validateObjectId(
            allocation[key],
            `${field}.${key}`,
            {
              required: false,
            }
          );
        }
      }
    );
  };

/* =========================================================
   VENDOR INVOICE ITEM VALIDATION
========================================================= */

const validateInvoiceItem = (
  item,
  index,
  {
    requireQuantity = true,
  } = {}
) => {
  const field =
    `items[${index}]`;

  if (!isPlainObject(item)) {
    throwValidationError(
      `${field} must be an object`,
      {
        field,
        code:
          "INVALID_INVOICE_ITEM",
      }
    );
  }

  const optionalObjectIdFields = [
    "purchaseOrderItem",
    "goodsReceivedItem",
    "product",
    "variant",
    "unit",
  ];

  optionalObjectIdFields.forEach(
    (key) => {
      if (
        hasOwn(item, key) &&
        item[key] !== null &&
        item[key] !== ""
      ) {
        validateObjectId(
          item[key],
          `${field}.${key}`,
          {
            required: false,
          }
        );
      }
    }
  );

  if (
    requireQuantity ||
    hasOwn(
      item,
      "invoicedQuantity"
    )
  ) {
    item.invoicedQuantity =
      validateNumber(
        item.invoicedQuantity,
        `${field}.invoicedQuantity`,
        {
          required:
            requireQuantity,
          min: 0.0001,
        }
      );
  }

  const numericFields = [
    {
      key:
        "acceptedQuantity",
      min: 0,
    },
    {
      key:
        "rejectedQuantity",
      min: 0,
    },
    {
      key:
        "returnedQuantity",
      min: 0,
    },
    {
      key:
        "unitPrice",
      min: 0,
    },
    {
      key:
        "conversionFactor",
      min: 0.000001,
    },
    {
      key:
        "shippingAllocation",
      min: 0,
    },
    {
      key:
        "otherChargeAllocation",
      min: 0,
    },
  ];

  numericFields.forEach(
    ({ key, min }) => {
      if (
        hasOwn(
          item,
          key
        )
      ) {
        item[key] =
          validateNumber(
            item[key],
            `${field}.${key}`,
            {
              min,
            }
          );
      }
    }
  );

  if (
    hasOwn(
      item,
      "roundOffAllocation"
    )
  ) {
    item.roundOffAllocation =
      validateNumber(
        item.roundOffAllocation,
        `${field}.roundOffAllocation`
      );
  }

  const stringFields = [
    {
      key:
        "productName",
      maxLength: 255,
    },
    {
      key: "sku",
      maxLength: 100,
    },
    {
      key: "barcode",
      maxLength: 100,
    },
    {
      key:
        "description",
      maxLength: 1000,
    },
    {
      key:
        "unitName",
      maxLength: 100,
    },
    {
      key:
        "unitCode",
      maxLength: 50,
    },
    {
      key:
        "variantName",
      maxLength: 255,
    },
    {
      key:
        "variantSku",
      maxLength: 100,
    },
    {
      key:
        "variantBarcode",
      maxLength: 100,
    },
    {
      key: "remarks",
      maxLength: 1000,
    },
  ];

  stringFields.forEach(
    ({
      key,
      maxLength,
    }) => {
      if (
        hasOwn(
          item,
          key
        )
      ) {
        item[key] =
          validateOptionalString(
            item[key],
            `${field}.${key}`,
            {
              maxLength,
            }
          );
      }
    }
  );

  if (
    hasOwn(
      item,
      "variantAttributes"
    ) &&
    !isPlainObject(
      item.variantAttributes
    )
  ) {
    throwValidationError(
      `${field}.variantAttributes must be an object`,
      {
        field:
          `${field}.variantAttributes`,
        code:
          "INVALID_VARIANT_ATTRIBUTES",
      }
    );
  }

  validateDiscount(
    item.discount,
    `${field}.discount`
  );

  validateTax(
    item.tax,
    `${field}.tax`
  );

  validateAccountingAllocation(
    item.accountingAllocation,
    `${field}.accountingAllocation`
  );

  if (
    !item.product &&
    !item.purchaseOrderItem &&
    !item.goodsReceivedItem
  ) {
    throwValidationError(
      `${field} must include product, purchaseOrderItem, or goodsReceivedItem`,
      {
        field,
        code:
          "ITEM_SOURCE_REQUIRED",
      }
    );
  }
};

/* =========================================================
   DATE RELATION VALIDATION
========================================================= */

const validateInvoiceDates = (
  body
) => {
  let invoiceDate = null;
  let postingDate = null;
  let dueDate = null;

  if (
    hasOwn(
      body,
      "invoiceDate"
    )
  ) {
    invoiceDate =
      validateDate(
        body.invoiceDate,
        "invoiceDate"
      );

    body.invoiceDate =
      invoiceDate;
  }

  if (
    hasOwn(
      body,
      "postingDate"
    ) &&
    body.postingDate
  ) {
    postingDate =
      validateDate(
        body.postingDate,
        "postingDate"
      );

    body.postingDate =
      postingDate;
  }

  if (
    hasOwn(body, "dueDate")
  ) {
    dueDate =
      validateDate(
        body.dueDate,
        "dueDate",
        {
          required: true,
        }
      );

    body.dueDate =
      dueDate;
  }

  const effectiveInvoiceDate =
    invoiceDate ||
    (
      body.invoiceDate
        ? new Date(
            body.invoiceDate
          )
        : null
    );

  if (
    dueDate &&
    effectiveInvoiceDate &&
    dueDate <
      effectiveInvoiceDate
  ) {
    throwValidationError(
      "dueDate cannot be earlier than invoiceDate",
      {
        field: "dueDate",
        code:
          "INVALID_DUE_DATE",
      }
    );
  }

  if (
    postingDate &&
    effectiveInvoiceDate &&
    postingDate <
      effectiveInvoiceDate
  ) {
    throwValidationError(
      "postingDate cannot be earlier than invoiceDate",
      {
        field:
          "postingDate",
        code:
          "INVALID_POSTING_DATE",
      }
    );
  }
};

/* =========================================================
   CREATE VENDOR INVOICE
========================================================= */

const validateCreateVendorInvoice =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      const body = req.body;

      body.supplier =
        validateObjectId(
          body.supplier,
          "supplier"
        );

      if (
        hasOwn(
          body,
          "purchaseOrder"
        ) &&
        body.purchaseOrder
      ) {
        body.purchaseOrder =
          validateObjectId(
            body.purchaseOrder,
            "purchaseOrder",
            {
              required: false,
            }
          );
      }

      if (
        hasOwn(
          body,
          "goodsReceived"
        ) &&
        body.goodsReceived
      ) {
        body.goodsReceived =
          validateObjectId(
            body.goodsReceived,
            "goodsReceived",
            {
              required: false,
            }
          );
      }

      if (
        hasOwn(
          body,
          "warehouse"
        ) &&
        body.warehouse
      ) {
        body.warehouse =
          validateObjectId(
            body.warehouse,
            "warehouse",
            {
              required: false,
            }
          );
      }

      body.supplierInvoiceNumber =
        validateRequiredString(
          body.supplierInvoiceNumber,
          "supplierInvoiceNumber",
          {
            minLength: 1,
            maxLength: 100,
          }
        );

      if (
        hasOwn(
          body,
          "invoiceNumber"
        )
      ) {
        body.invoiceNumber =
          validateOptionalString(
            body.invoiceNumber,
            "invoiceNumber",
            {
              maxLength: 100,
              allowEmpty: false,
            }
          );
      }

      validateInvoiceDates(body);

      if (!body.dueDate) {
        throwValidationError(
          "dueDate is required",
          {
            field: "dueDate",
            code:
              "REQUIRED_FIELD",
          }
        );
      }

      if (
        hasOwn(
          body,
          "currency"
        )
      ) {
        body.currency =
          validateEnum(
            normalizeString(
              body.currency
            )?.toUpperCase(),
            "currency",
            ALLOWED_CURRENCIES,
            {
              required: true,
            }
          );
      }

      if (
        hasOwn(
          body,
          "baseCurrency"
        )
      ) {
        body.baseCurrency =
          validateEnum(
            normalizeString(
              body.baseCurrency
            )?.toUpperCase(),
            "baseCurrency",
            ALLOWED_CURRENCIES,
            {
              required: true,
            }
          );
      }

      if (
        hasOwn(
          body,
          "exchangeRate"
        )
      ) {
        body.exchangeRate =
          validateNumber(
            body.exchangeRate,
            "exchangeRate",
            {
              min: 0.000001,
            }
          );
      }

      const optionalStrings = [
        {
          field:
            "accountingPeriod",
          maxLength: 50,
        },
        {
          field:
            "paymentTerms",
          maxLength: 500,
        },
        {
          field: "remarks",
          maxLength: 2000,
        },
        {
          field:
            "internalNotes",
          maxLength: 5000,
        },
      ];

      optionalStrings.forEach(
        ({
          field,
          maxLength,
        }) => {
          if (
            hasOwn(
              body,
              field
            )
          ) {
            body[field] =
              validateOptionalString(
                body[field],
                field,
                {
                  maxLength,
                }
              );
          }
        }
      );

      if (
        hasOwn(
          body,
          "approval"
        )
      ) {
        if (
          !isPlainObject(
            body.approval
          )
        ) {
          throwValidationError(
            "approval must be an object",
            {
              field:
                "approval",
              code:
                "INVALID_APPROVAL",
            }
          );
        }

        if (
          hasOwn(
            body.approval,
            "required"
          )
        ) {
          body.approval.required =
            validateBoolean(
              body.approval.required,
              "approval.required"
            );
        }
      }

      validateAttachments(
        body.attachments
      );

      if (
        !Array.isArray(
          body.items
        ) ||
        body.items.length ===
          0
      ) {
        throwValidationError(
          "At least one vendor invoice item is required",
          {
            field: "items",
            code:
              "VENDOR_INVOICE_ITEMS_REQUIRED",
          }
        );
      }

      if (
        body.items.length >
        1000
      ) {
        throwValidationError(
          "A vendor invoice cannot contain more than 1000 items",
          {
            field: "items",
            code:
              "TOO_MANY_INVOICE_ITEMS",
          }
        );
      }

      body.items.forEach(
        (
          item,
          index
        ) => {
          validateInvoiceItem(
            item,
            index,
            {
              requireQuantity:
                true,
            }
          );
        }
      );

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE VENDOR INVOICE
========================================================= */

const validateUpdateVendorInvoice =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      const body = req.body;

      if (
        Object.keys(body)
          .length === 0
      ) {
        throwValidationError(
          "At least one field is required for update",
          {
            code:
              "EMPTY_UPDATE_BODY",
          }
        );
      }

      if (
        hasOwn(
          body,
          "supplier"
        )
      ) {
        body.supplier =
          validateObjectId(
            body.supplier,
            "supplier"
          );
      }

      if (
        hasOwn(
          body,
          "warehouse"
        ) &&
        body.warehouse
      ) {
        body.warehouse =
          validateObjectId(
            body.warehouse,
            "warehouse",
            {
              required: false,
            }
          );
      }

      if (
        hasOwn(
          body,
          "supplierInvoiceNumber"
        )
      ) {
        body.supplierInvoiceNumber =
          validateRequiredString(
            body.supplierInvoiceNumber,
            "supplierInvoiceNumber",
            {
              maxLength: 100,
            }
          );
      }

      validateInvoiceDates(body);

      if (
        hasOwn(
          body,
          "currency"
        )
      ) {
        body.currency =
          validateEnum(
            normalizeString(
              body.currency
            )?.toUpperCase(),
            "currency",
            ALLOWED_CURRENCIES,
            {
              required: true,
            }
          );
      }

      if (
        hasOwn(
          body,
          "baseCurrency"
        )
      ) {
        body.baseCurrency =
          validateEnum(
            normalizeString(
              body.baseCurrency
            )?.toUpperCase(),
            "baseCurrency",
            ALLOWED_CURRENCIES,
            {
              required: true,
            }
          );
      }

      if (
        hasOwn(
          body,
          "exchangeRate"
        )
      ) {
        body.exchangeRate =
          validateNumber(
            body.exchangeRate,
            "exchangeRate",
            {
              min: 0.000001,
            }
          );
      }

      const optionalStrings = [
        {
          field:
            "accountingPeriod",
          maxLength: 50,
        },
        {
          field:
            "paymentTerms",
          maxLength: 500,
        },
        {
          field: "remarks",
          maxLength: 2000,
        },
        {
          field:
            "internalNotes",
          maxLength: 5000,
        },
      ];

      optionalStrings.forEach(
        ({
          field,
          maxLength,
        }) => {
          if (
            hasOwn(
              body,
              field
            )
          ) {
            body[field] =
              validateOptionalString(
                body[field],
                field,
                {
                  maxLength,
                }
              );
          }
        }
      );

      if (
        hasOwn(
          body,
          "approval"
        )
      ) {
        if (
          !isPlainObject(
            body.approval
          )
        ) {
          throwValidationError(
            "approval must be an object",
            {
              field:
                "approval",
              code:
                "INVALID_APPROVAL",
            }
          );
        }

        if (
          hasOwn(
            body.approval,
            "required"
          )
        ) {
          body.approval.required =
            validateBoolean(
              body.approval.required,
              "approval.required"
            );
        }
      }

      validateAttachments(
        body.attachments
      );

      if (
        hasOwn(
          body,
          "items"
        )
      ) {
        if (
          !Array.isArray(
            body.items
          ) ||
          body.items.length ===
            0
        ) {
          throwValidationError(
            "items must contain at least one invoice item",
            {
              field: "items",
              code:
                "VENDOR_INVOICE_ITEMS_REQUIRED",
            }
          );
        }

        if (
          body.items.length >
          1000
        ) {
          throwValidationError(
            "A vendor invoice cannot contain more than 1000 items",
            {
              field: "items",
              code:
                "TOO_MANY_INVOICE_ITEMS",
            }
          );
        }

        body.items.forEach(
          (
            item,
            index
          ) => {
            validateInvoiceItem(
              item,
              index,
              {
                requireQuantity:
                  true,
              }
            );
          }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   VENDOR INVOICE ID
========================================================= */

const validateVendorInvoiceId =
  (
    req,
    res,
    next
  ) => {
    try {
      req.params.vendorInvoiceId =
        validateObjectId(
          req.params
            .vendorInvoiceId,
          "vendorInvoiceId"
        );

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   LIST QUERY
========================================================= */

const validateVendorInvoiceListQuery =
  (
    req,
    res,
    next
  ) => {
    try {
      const query = req.query;

      if (
        hasOwn(
          query,
          "page"
        )
      ) {
        query.page =
          validateInteger(
            query.page,
            "page",
            {
              min: 1,
            }
          );
      }

      if (
        hasOwn(
          query,
          "limit"
        )
      ) {
        query.limit =
          validateInteger(
            query.limit,
            "limit",
            {
              min: 1,
              max: 100,
            }
          );
      }

      if (
        hasOwn(
          query,
          "search"
        )
      ) {
        query.search =
          validateOptionalString(
            query.search,
            "search",
            {
              maxLength: 200,
              allowEmpty: false,
            }
          );
      }

      if (
        hasOwn(
          query,
          "status"
        )
      ) {
        query.status =
          validateEnum(
            query.status,
            "status",
            VENDOR_INVOICE_STATUSES
          );
      }

      if (
        hasOwn(
          query,
          "paymentStatus"
        )
      ) {
        query.paymentStatus =
          validateEnum(
            query.paymentStatus,
            "paymentStatus",
            PAYMENT_STATUSES
          );
      }

      if (
        hasOwn(
          query,
          "matchingStatus"
        )
      ) {
        query.matchingStatus =
          validateEnum(
            query.matchingStatus,
            "matchingStatus",
            MATCHING_STATUSES
          );
      }

      if (
        hasOwn(
          query,
          "approvalStatus"
        )
      ) {
        query.approvalStatus =
          validateEnum(
            query.approvalStatus,
            "approvalStatus",
            APPROVAL_STATUSES
          );
      }

      const objectIdFields = [
        "supplier",
        "purchaseOrder",
        "goodsReceived",
      ];

      objectIdFields.forEach(
        (field) => {
          if (
            hasOwn(
              query,
              field
            )
          ) {
            query[field] =
              validateObjectId(
                query[field],
                field,
                {
                  required:
                    false,
                }
              );
          }
        }
      );

      const dateFields = [
        "dateFrom",
        "dateTo",
        "dueDateFrom",
        "dueDateTo",
      ];

      dateFields.forEach(
        (field) => {
          if (
            hasOwn(
              query,
              field
            )
          ) {
            validateDate(
              query[field],
              field
            );
          }
        }
      );

      if (
        query.dateFrom &&
        query.dateTo &&
        new Date(
          query.dateFrom
        ) >
          new Date(
            query.dateTo
          )
      ) {
        throwValidationError(
          "dateFrom cannot be later than dateTo",
          {
            field:
              "dateFrom",
            code:
              "INVALID_DATE_RANGE",
          }
        );
      }

      if (
        query.dueDateFrom &&
        query.dueDateTo &&
        new Date(
          query.dueDateFrom
        ) >
          new Date(
            query.dueDateTo
          )
      ) {
        throwValidationError(
          "dueDateFrom cannot be later than dueDateTo",
          {
            field:
              "dueDateFrom",
            code:
              "INVALID_DATE_RANGE",
          }
        );
      }

      const booleanFields = [
        "overdue",
        "includeDeleted",
      ];

      booleanFields.forEach(
        (field) => {
          if (
            hasOwn(
              query,
              field
            )
          ) {
            validateBoolean(
              query[field],
              field
            );

            query[field] =
              String(
                parseBoolean(
                  query[field]
                )
              );
          }
        }
      );

      if (
        hasOwn(
          query,
          "sortBy"
        )
      ) {
        query.sortBy =
          validateEnum(
            query.sortBy,
            "sortBy",
            SORT_FIELDS
          );
      }

      if (
        hasOwn(
          query,
          "sortOrder"
        )
      ) {
        query.sortOrder =
          validateEnum(
            query.sortOrder,
            "sortOrder",
            SORT_ORDERS
          );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DETAILS QUERY
========================================================= */

const validateVendorInvoiceDetailsQuery =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        hasOwn(
          req.query,
          "includeDeleted"
        )
      ) {
        validateBoolean(
          req.query
            .includeDeleted,
          "includeDeleted"
        );

        req.query.includeDeleted =
          String(
            parseBoolean(
              req.query
                .includeDeleted
            )
          );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   THREE-WAY MATCHING
========================================================= */

const validateVendorInvoiceMatching =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        req.body ===
          undefined ||
        req.body === null
      ) {
        req.body = {};
      }

      if (
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      const toleranceFields = [
        "quantityTolerance",
        "priceTolerance",
        "taxTolerance",
      ];

      toleranceFields.forEach(
        (field) => {
          if (
            hasOwn(
              req.body,
              field
            )
          ) {
            req.body[field] =
              validateNumber(
                req.body[field],
                field,
                {
                  min: 0,
                }
              );
          }
        }
      );

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   STATUS UPDATE
========================================================= */

const validateVendorInvoiceStatusUpdate =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      req.body.status =
        validateEnum(
          req.body.status,
          "status",
          VENDOR_INVOICE_STATUSES,
          {
            required: true,
          }
        );

      if (
        hasOwn(
          req.body,
          "remarks"
        )
      ) {
        req.body.remarks =
          validateOptionalString(
            req.body.remarks,
            "remarks",
            {
              maxLength: 2000,
            }
          );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE
========================================================= */

const validateVendorInvoiceDelete =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        req.body ===
          undefined ||
        req.body === null
      ) {
        req.body = {};
      }

      if (
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      if (
        hasOwn(
          req.body,
          "reason"
        )
      ) {
        req.body.reason =
          validateOptionalString(
            req.body.reason,
            "reason",
            {
              maxLength: 1000,
            }
          );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   RESTORE
========================================================= */

const validateVendorInvoiceRestore =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        req.body !==
          undefined &&
        req.body !== null &&
        !isPlainObject(
          req.body
        )
      ) {
        throwValidationError(
          "Request body must be a JSON object",
          {
            code:
              "INVALID_REQUEST_BODY",
          }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   OUTSTANDING SUMMARY
========================================================= */

const validateVendorInvoiceOutstandingSummary =
  (
    req,
    res,
    next
  ) => {
    try {
      if (
        hasOwn(
          req.query,
          "supplier"
        )
      ) {
        req.query.supplier =
          validateObjectId(
            req.query.supplier,
            "supplier",
            {
              required: false,
            }
          );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  validateCreateVendorInvoice,
  validateUpdateVendorInvoice,
  validateVendorInvoiceId,
  validateVendorInvoiceListQuery,
  validateVendorInvoiceDetailsQuery,
  validateVendorInvoiceMatching,
  validateVendorInvoiceStatusUpdate,
  validateVendorInvoiceDelete,
  validateVendorInvoiceRestore,
  validateVendorInvoiceOutstandingSummary,
};