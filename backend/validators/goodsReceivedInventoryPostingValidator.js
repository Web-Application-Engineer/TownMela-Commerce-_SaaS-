"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const INVENTORY_POSTING_STATUSES = [
  "Not Posted",
  "Partially Posted",
  "Posted",
  "Reversed",
];

const POSTING_ALLOWED_FIELDS =
  new Set([
    "postingDate",
    "remarks",
  ]);

const POSTING_QUEUE_ALLOWED_QUERY_FIELDS =
  new Set([
    "page",
    "limit",
    "search",
    "status",
    "supplier",
    "warehouse",
  ]);

/* =========================================================
   ERROR HELPERS
========================================================= */

const createValidationError = (
  message,
  details = null
) => {
  const error = new Error(message);

  error.statusCode = 400;
  error.code =
    "VALIDATION_ERROR";

  if (details !== null) {
    error.details = details;
  }

  return error;
};

const fail = (
  field,
  message,
  extraDetails = {}
) => {
  throw createValidationError(
    message,
    {
      field,
      ...extraDetails,
    }
  );
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const isPlainObject = (
  value
) => {
  return (
    value !== null &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  );
};

const ensureBodyObject = (
  req
) => {
  if (
    req.body === undefined ||
    req.body === null
  ) {
    req.body = {};
  }

  if (
    !isPlainObject(req.body)
  ) {
    throw createValidationError(
      "Request body must be a valid object"
    );
  }
};

const validateAllowedFields = (
  object,
  allowedFields,
  fieldName = "body"
) => {
  if (!isPlainObject(object)) {
    fail(
      fieldName,
      `${fieldName} must be an object`
    );
  }

  const unsupportedFields =
    Object.keys(
      object
    ).filter(
      (field) =>
        !allowedFields.has(
          field
        )
    );

  if (
    unsupportedFields.length >
    0
  ) {
    throw createValidationError(
      `${fieldName} contains unsupported fields`,
      {
        field:
          fieldName,

        unsupportedFields,
      }
    );
  }
};

const validateObjectId = (
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
      fail(
        field,
        `${field} is required`
      );
    }

    return;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    fail(
      field,
      `${field} must be a valid identifier`
    );
  }
};

const validateString = (
  value,
  field,
  {
    required = false,
    minLength = 0,
    maxLength = 2000,
  } = {}
) => {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      fail(
        field,
        `${field} is required`
      );
    }

    return;
  }

  if (
    typeof value !==
    "string"
  ) {
    fail(
      field,
      `${field} must be a string`
    );
  }

  const normalizedValue =
    value.trim();

  if (
    required &&
    normalizedValue.length ===
      0
  ) {
    fail(
      field,
      `${field} is required`
    );
  }

  if (
    normalizedValue.length <
    minLength
  ) {
    fail(
      field,
      `${field} must contain at least ${minLength} characters`
    );
  }

  if (
    normalizedValue.length >
    maxLength
  ) {
    fail(
      field,
      `${field} cannot exceed ${maxLength} characters`
    );
  }
};

const validateNumber = (
  value,
  field,
  {
    required = false,
    min = null,
    max = null,
    integer = false,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      fail(
        field,
        `${field} is required`
      );
    }

    return;
  }

  if (
    typeof value ===
    "boolean"
  ) {
    fail(
      field,
      `${field} must be a valid number`
    );
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    fail(
      field,
      `${field} must be a valid number`
    );
  }

  if (
    integer &&
    !Number.isInteger(
      numericValue
    )
  ) {
    fail(
      field,
      `${field} must be an integer`
    );
  }

  if (
    min !== null &&
    numericValue < min
  ) {
    fail(
      field,
      `${field} must be at least ${min}`
    );
  }

  if (
    max !== null &&
    numericValue > max
  ) {
    fail(
      field,
      `${field} cannot exceed ${max}`
    );
  }
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
      fail(
        field,
        `${field} is required`
      );
    }

    return;
  }

  if (
    typeof value !==
    "string"
  ) {
    fail(
      field,
      `${field} must be a string`
    );
  }

  if (
    !allowedValues.includes(
      value
    )
  ) {
    fail(
      field,
      `${field} must be one of: ${allowedValues.join(
        ", "
      )}`
    );
  }
};

const validateDate = (
  value,
  field,
  {
    required = false,
    allowFuture = true,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      fail(
        field,
        `${field} is required`
      );
    }

    return;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    fail(
      field,
      `${field} must be a valid date`
    );
  }

  if (
    !allowFuture &&
    date.getTime() >
      Date.now()
  ) {
    fail(
      field,
      `${field} cannot be a future date`
    );
  }
};

/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

const normalizePostingPayload = (
  req
) => {
  if (
    typeof req.body.remarks ===
    "string"
  ) {
    req.body.remarks =
      req.body.remarks.trim();
  }

  if (
    req.body.postingDate !==
      undefined &&
    req.body.postingDate !==
      null &&
    req.body.postingDate !==
      ""
  ) {
    req.body.postingDate =
      new Date(
        req.body.postingDate
      ).toISOString();
  }
};

const normalizeQueueQuery = (
  req
) => {
  const sourceQuery =
    req.query || {};

  const normalizedQuery = {};

  if (
    sourceQuery.page !==
      undefined &&
    sourceQuery.page !== ""
  ) {
    normalizedQuery.page =
      Number.parseInt(
        sourceQuery.page,
        10
      );
  }

  if (
    sourceQuery.limit !==
      undefined &&
    sourceQuery.limit !== ""
  ) {
    normalizedQuery.limit =
      Number.parseInt(
        sourceQuery.limit,
        10
      );
  }

  if (
    typeof sourceQuery.search ===
    "string"
  ) {
    const search =
      sourceQuery.search.trim();

    if (search) {
      normalizedQuery.search =
        search;
    }
  }

  if (
    typeof sourceQuery.status ===
    "string"
  ) {
    const status =
      sourceQuery.status.trim();

    if (status) {
      normalizedQuery.status =
        status;
    }
  }

  if (
    typeof sourceQuery.supplier ===
    "string"
  ) {
    const supplier =
      sourceQuery.supplier.trim();

    if (supplier) {
      normalizedQuery.supplier =
        supplier;
    }
  }

  if (
    typeof sourceQuery.warehouse ===
    "string"
  ) {
    const warehouse =
      sourceQuery.warehouse.trim();

    if (warehouse) {
      normalizedQuery.warehouse =
        warehouse;
    }
  }

  req.validatedQuery =
    normalizedQuery;
};

/* =========================================================
   GOODS RECEIVED ID VALIDATOR
========================================================= */

const validateGoodsReceivedId = (
  req,
  res,
  next
) => {
  try {
    validateObjectId(
      req.params
        ?.goodsReceivedId,
      "goodsReceivedId",
      {
        required: true,
      }
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   INVENTORY POSTING PAYLOAD VALIDATOR

   POST
   /:goodsReceivedId/post
========================================================= */

const validatePostGoodsReceivedInventory = (
  req,
  res,
  next
) => {
  try {
    ensureBodyObject(req);

    validateAllowedFields(
      req.body,
      POSTING_ALLOWED_FIELDS,
      "body"
    );

    validateDate(
      req.body.postingDate,
      "postingDate",
      {
        allowFuture: false,
      }
    );

    validateString(
      req.body.remarks,
      "remarks",
      {
        maxLength: 2000,
      }
    );

    normalizePostingPayload(
      req
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   INVENTORY POSTING PREVIEW VALIDATOR

   GET
   /:goodsReceivedId/preview
========================================================= */

const validateInventoryPostingPreview = (
  req,
  res,
  next
) => {
  try {
    validateObjectId(
      req.params
        ?.goodsReceivedId,
      "goodsReceivedId",
      {
        required: true,
      }
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   INVENTORY POSTING DETAILS VALIDATOR

   GET
   /:goodsReceivedId
========================================================= */

const validateInventoryPostingDetails = (
  req,
  res,
  next
) => {
  try {
    validateObjectId(
      req.params
        ?.goodsReceivedId,
      "goodsReceivedId",
      {
        required: true,
      }
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   INVENTORY POSTING QUEUE QUERY VALIDATOR

   GET
   /queue
========================================================= */

const validateInventoryPostingQueueQuery = (
  req,
  res,
  next
) => {
  try {
    const query =
      req.query || {};

    const unsupportedFields =
      Object.keys(
        query
      ).filter(
        (field) =>
          !POSTING_QUEUE_ALLOWED_QUERY_FIELDS.has(
            field
          )
      );

    if (
      unsupportedFields.length >
      0
    ) {
      throw createValidationError(
        "Query contains unsupported fields",
        {
          unsupportedFields,
        }
      );
    }

    validateNumber(
      query.page,
      "page",
      {
        min: 1,
        integer: true,
      }
    );

    validateNumber(
      query.limit,
      "limit",
      {
        min: 1,
        max: 100,
        integer: true,
      }
    );

    validateString(
      query.search,
      "search",
      {
        maxLength: 200,
      }
    );

    validateEnum(
      query.status,
      "status",
      INVENTORY_POSTING_STATUSES
    );

    validateObjectId(
      query.supplier,
      "supplier"
    );

    validateObjectId(
      query.warehouse,
      "warehouse"
    );

    normalizeQueueQuery(req);

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GENERIC INVENTORY POSTING STATUS VALIDATOR

   This can later be reused by reports, dashboards,
   manual recovery workflows, or posting filters.
========================================================= */

const validateInventoryPostingStatus = (
  req,
  res,
  next
) => {
  try {
    const status =
      req.body?.status ??
      req.query?.status;

    validateEnum(
      status,
      "status",
      INVENTORY_POSTING_STATUSES,
      {
        required: true,
      }
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  validateGoodsReceivedId,

  validateInventoryPostingPreview,
  validatePostGoodsReceivedInventory,
  validateInventoryPostingDetails,

  validateInventoryPostingQueueQuery,
  validateInventoryPostingStatus,
};