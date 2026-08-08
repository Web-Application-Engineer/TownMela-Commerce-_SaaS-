"use strict";

const mongoose = require("mongoose");

const {
  WAREHOUSE_TYPES,
  WAREHOUSE_STATUSES,
} = require("../models/Warehouse");

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_OPERATING_HOURS = 7;

const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CREATE_ALLOWED_FIELDS = new Set([
  "name",
  "code",
  "warehouseType",
  "description",

  "phone",
  "alternatePhone",
  "email",

  "manager",
  "managerName",
  "managerPhone",

  "address",
  "operatingHours",
  "storageConfiguration",

  "isDefault",

  "allowPurchasing",
  "allowSalesFulfillment",
  "allowTransfers",
  "allowReturns",
  "allowNegativeStock",

  "status",
  "isActive",
]);

const UPDATE_ALLOWED_FIELDS = new Set([
  "name",
  "code",
  "warehouseType",
  "description",

  "phone",
  "alternatePhone",
  "email",

  "manager",
  "managerName",
  "managerPhone",

  "address",
  "operatingHours",
  "storageConfiguration",

  "isDefault",

  "allowPurchasing",
  "allowSalesFulfillment",
  "allowTransfers",
  "allowReturns",
  "allowNegativeStock",

  "status",
  "isActive",
]);

const FORBIDDEN_CLIENT_FIELDS = new Set([
  "_id",
  "id",

  "tenant",
  "tenantId",

  "createdBy",
  "updatedBy",

  "isDeleted",
  "deletedAt",
  "deletedBy",

  "createdAt",
  "updatedAt",
  "__v",

  "displayName",
  "fullAddress",
]);

const ADDRESS_ALLOWED_FIELDS = new Set([
  "addressLine1",
  "addressLine2",
  "area",
  "city",
  "district",
  "division",
  "postalCode",
  "country",
  "latitude",
  "longitude",
]);

const OPERATING_HOUR_ALLOWED_FIELDS = new Set([
  "day",
  "isOpen",
  "openingTime",
  "closingTime",
]);

const STORAGE_CONFIGURATION_ALLOWED_FIELDS = new Set([
  "supportsRackTracking",
  "supportsBinTracking",
  "supportsBatchTracking",
  "supportsSerialTracking",
  "supportsExpiryTracking",
  "supportsTemperatureControl",

  "minimumTemperature",
  "maximumTemperature",

  "totalRackCount",
  "totalBinCount",

  "maximumCapacity",
  "capacityUnit",
]);

const ALLOWED_QUERY_FIELDS = new Set([
  "page",
  "limit",

  "search",
  "code",
  "warehouseType",
  "status",

  "manager",
  "isDefault",
  "isActive",
  "allowPurchasing",
  "allowSalesFulfillment",
  "allowTransfers",
  "allowReturns",

  "includeDeleted",

  "sortBy",
  "sortOrder",
]);

const ALLOWED_SORT_FIELDS = new Set([
  "name",
  "code",
  "warehouseType",
  "status",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt",
]);

const TIME_PATTERN =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN =
  /^[+]?[\d\s\-().]{6,30}$/;

const WAREHOUSE_CODE_PATTERN =
  /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

/* =========================================================
   ERROR HELPERS
========================================================= */

const createValidationError = (
  message,
  details = null,
) => {
  const error = new Error(message);

  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";

  if (details !== null) {
    error.details = details;
  }

  return error;
};

const fail = (
  field,
  message,
  extraDetails = {},
) => {
  throw createValidationError(
    message,
    {
      field,
      ...extraDetails,
    },
  );
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const hasOwn = (
  object,
  key,
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    key,
  );
};

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const parseBooleanValue = (
  value,
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

const isValidObjectId = (
  value,
) => {
  return mongoose.Types.ObjectId.isValid(
    value,
  );
};

/* =========================================================
   REQUEST BODY HELPERS
========================================================= */

const ensureBodyObject = (
  req,
) => {
  if (!isPlainObject(req.body)) {
    throw createValidationError(
      "Request body must be a valid object",
      {
        field: "body",
      },
    );
  }
};

const validateAllowedFields = (
  object,
  allowedFields,
  fieldName,
) => {
  if (!isPlainObject(object)) {
    fail(
      fieldName,
      `${fieldName} must be an object`,
    );
  }

  const unsupportedFields =
    Object.keys(object).filter(
      (field) =>
        !allowedFields.has(field),
    );

  if (
    unsupportedFields.length > 0
  ) {
    throw createValidationError(
      `${fieldName} contains unsupported fields`,
      {
        field: fieldName,
        unsupportedFields,
      },
    );
  }
};

const validateForbiddenFields = (
  object,
  forbiddenFields,
  fieldName,
) => {
  if (!isPlainObject(object)) {
    return;
  }

  const forbiddenFieldsFound =
    Object.keys(object).filter(
      (field) =>
        forbiddenFields.has(field),
    );

  if (
    forbiddenFieldsFound.length > 0
  ) {
    throw createValidationError(
      `${fieldName} contains fields controlled by the server`,
      {
        field: fieldName,
        forbiddenFields:
          forbiddenFieldsFound,
      },
    );
  }
};

/* =========================================================
   COMMON FIELD VALIDATORS
========================================================= */

const validateString = (
  value,
  field,
  {
    required = false,
    allowNull = true,
    minLength = 0,
    maxLength = 1000,
    pattern = null,
    patternMessage = null,
  } = {},
) => {
  if (
    value === undefined ||
    value === null
  ) {
    if (
      required &&
      (
        value === undefined ||
        !allowNull
      )
    ) {
      fail(
        field,
        `${field} is required`,
      );
    }

    return;
  }

  if (typeof value !== "string") {
    fail(
      field,
      `${field} must be a string`,
    );
  }

  const normalized =
    value.trim();

  if (
    required &&
    normalized.length === 0
  ) {
    fail(
      field,
      `${field} is required`,
    );
  }

  if (
    normalized.length > 0 &&
    normalized.length < minLength
  ) {
    fail(
      field,
      `${field} must contain at least ${minLength} characters`,
    );
  }

  if (
    normalized.length > maxLength
  ) {
    fail(
      field,
      `${field} cannot exceed ${maxLength} characters`,
    );
  }

  if (
    normalized.length > 0 &&
    pattern &&
    !pattern.test(normalized)
  ) {
    fail(
      field,
      patternMessage ||
        `${field} has an invalid format`,
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
    allowNull = true,
  } = {},
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (
      required &&
      (
        value === undefined ||
        !allowNull
      )
    ) {
      fail(
        field,
        `${field} is required`,
      );
    }

    return;
  }

  if (typeof value === "boolean") {
    fail(
      field,
      `${field} must be a number`,
    );
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(numericValue)
  ) {
    fail(
      field,
      `${field} must be a valid number`,
    );
  }

  if (
    integer &&
    !Number.isInteger(numericValue)
  ) {
    fail(
      field,
      `${field} must be an integer`,
    );
  }

  if (
    min !== null &&
    numericValue < min
  ) {
    fail(
      field,
      `${field} must be at least ${min}`,
    );
  }

  if (
    max !== null &&
    numericValue > max
  ) {
    fail(
      field,
      `${field} cannot exceed ${max}`,
    );
  }
};

const validateBoolean = (
  value,
  field,
  {
    required = false,
  } = {},
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      fail(
        field,
        `${field} is required`,
      );
    }

    return;
  }

  if (
    parseBooleanValue(value) === null
  ) {
    fail(
      field,
      `${field} must be true or false`,
    );
  }
};

const validateEnum = (
  value,
  field,
  allowedValues,
  {
    required = false,
  } = {},
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      fail(
        field,
        `${field} is required`,
      );
    }

    return;
  }

  if (
    !allowedValues.includes(value)
  ) {
    fail(
      field,
      `${field} must be one of: ${allowedValues.join(
        ", ",
      )}`,
      {
        allowedValues,
      },
    );
  }
};

const validateObjectId = (
  value,
  field,
  {
    required = false,
    allowNull = true,
  } = {},
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (
      required &&
      (
        value === undefined ||
        !allowNull
      )
    ) {
      fail(
        field,
        `${field} is required`,
      );
    }

    return;
  }

  if (
    typeof value !== "string" &&
    !(
      value instanceof
      mongoose.Types.ObjectId
    )
  ) {
    fail(
      field,
      `${field} must be a valid identifier`,
    );
  }

  if (!isValidObjectId(value)) {
    fail(
      field,
      `${field} must be a valid identifier`,
    );
  }
};

/* =========================================================
   CONTACT VALIDATION
========================================================= */

const validateEmail = (
  value,
  field,
) => {
  validateString(
    value,
    field,
    {
      maxLength: 200,
    },
  );

  const normalized =
    normalizeString(value);

  if (
    normalized &&
    !EMAIL_PATTERN.test(normalized)
  ) {
    fail(
      field,
      `${field} must be a valid email address`,
    );
  }
};

const validatePhone = (
  value,
  field,
) => {
  validateString(
    value,
    field,
    {
      maxLength: 30,
    },
  );

  const normalized =
    normalizeString(value);

  if (
    normalized &&
    !PHONE_PATTERN.test(normalized)
  ) {
    fail(
      field,
      `${field} must be a valid phone number`,
    );
  }
};

/* =========================================================
   ADDRESS VALIDATION
========================================================= */

const validateAddress = (
  address,
  field = "address",
) => {
  if (
    address === undefined ||
    address === null
  ) {
    return;
  }

  validateAllowedFields(
    address,
    ADDRESS_ALLOWED_FIELDS,
    field,
  );

  validateString(
    address.addressLine1,
    `${field}.addressLine1`,
    {
      maxLength: 300,
    },
  );

  validateString(
    address.addressLine2,
    `${field}.addressLine2`,
    {
      maxLength: 300,
    },
  );

  validateString(
    address.area,
    `${field}.area`,
    {
      maxLength: 150,
    },
  );

  validateString(
    address.city,
    `${field}.city`,
    {
      maxLength: 150,
    },
  );

  validateString(
    address.district,
    `${field}.district`,
    {
      maxLength: 150,
    },
  );

  validateString(
    address.division,
    `${field}.division`,
    {
      maxLength: 150,
    },
  );

  validateString(
    address.postalCode,
    `${field}.postalCode`,
    {
      maxLength: 30,
    },
  );

  validateString(
    address.country,
    `${field}.country`,
    {
      maxLength: 100,
    },
  );

  validateNumber(
    address.latitude,
    `${field}.latitude`,
    {
      min: -90,
      max: 90,
    },
  );

  validateNumber(
    address.longitude,
    `${field}.longitude`,
    {
      min: -180,
      max: 180,
    },
  );
};

/* =========================================================
   OPERATING HOURS VALIDATION
========================================================= */

const validateTime = (
  value,
  field,
) => {
  validateString(
    value,
    field,
    {
      maxLength: 20,
    },
  );

  const normalized =
    normalizeString(value);

  if (
    normalized &&
    !TIME_PATTERN.test(normalized)
  ) {
    fail(
      field,
      `${field} must use 24-hour HH:mm format`,
    );
  }
};

const timeToMinutes = (
  value,
) => {
  if (
    !value ||
    !TIME_PATTERN.test(value)
  ) {
    return null;
  }

  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

const validateOperatingHours = (
  operatingHours,
  field = "operatingHours",
) => {
  if (
    operatingHours === undefined ||
    operatingHours === null
  ) {
    return;
  }

  if (
    !Array.isArray(operatingHours)
  ) {
    fail(
      field,
      `${field} must be an array`,
    );
  }

  if (
    operatingHours.length >
    MAX_OPERATING_HOURS
  ) {
    fail(
      field,
      `${field} cannot contain more than ${MAX_OPERATING_HOURS} entries`,
    );
  }

  const usedDays =
    new Set();

  operatingHours.forEach(
    (operatingHour, index) => {
      const itemField =
        `${field}[${index}]`;

      if (
        !isPlainObject(
          operatingHour,
        )
      ) {
        fail(
          itemField,
          `${itemField} must be an object`,
        );
      }

      validateAllowedFields(
        operatingHour,
        OPERATING_HOUR_ALLOWED_FIELDS,
        itemField,
      );

      validateEnum(
        operatingHour.day,
        `${itemField}.day`,
        WEEK_DAYS,
        {
          required: true,
        },
      );

      validateBoolean(
        operatingHour.isOpen,
        `${itemField}.isOpen`,
      );

      validateTime(
        operatingHour.openingTime,
        `${itemField}.openingTime`,
      );

      validateTime(
        operatingHour.closingTime,
        `${itemField}.closingTime`,
      );

      if (
        usedDays.has(
          operatingHour.day,
        )
      ) {
        fail(
          `${itemField}.day`,
          `Operating hours for ${operatingHour.day} have already been provided`,
        );
      }

      usedDays.add(
        operatingHour.day,
      );

      const isOpen =
        operatingHour.isOpen !==
        false;

      const openingTime =
        normalizeString(
          operatingHour.openingTime,
        );

      const closingTime =
        normalizeString(
          operatingHour.closingTime,
        );

      if (
        isOpen &&
        (
          !openingTime ||
          !closingTime
        )
      ) {
        fail(
          itemField,
          `Opening and closing times are required when ${operatingHour.day} is open`,
        );
      }

      if (
        !isOpen &&
        (
          openingTime ||
          closingTime
        )
      ) {
        fail(
          itemField,
          `Opening and closing times must be empty when ${operatingHour.day} is closed`,
        );
      }

      if (
        isOpen &&
        openingTime &&
        closingTime
      ) {
        const openingMinutes =
          timeToMinutes(
            openingTime,
          );

        const closingMinutes =
          timeToMinutes(
            closingTime,
          );

        if (
          openingMinutes !== null &&
          closingMinutes !== null &&
          openingMinutes >=
            closingMinutes
        ) {
          fail(
            `${itemField}.closingTime`,
            "Closing time must be after opening time",
          );
        }
      }
    },
  );
};

/* =========================================================
   STORAGE CONFIGURATION VALIDATION
========================================================= */

const validateStorageConfiguration = (
  configuration,
  field =
    "storageConfiguration",
) => {
  if (
    configuration === undefined ||
    configuration === null
  ) {
    return;
  }

  validateAllowedFields(
    configuration,
    STORAGE_CONFIGURATION_ALLOWED_FIELDS,
    field,
  );

  const booleanFields = [
    "supportsRackTracking",
    "supportsBinTracking",
    "supportsBatchTracking",
    "supportsSerialTracking",
    "supportsExpiryTracking",
    "supportsTemperatureControl",
  ];

  booleanFields.forEach(
    (key) => {
      validateBoolean(
        configuration[key],
        `${field}.${key}`,
      );
    },
  );

  validateNumber(
    configuration.minimumTemperature,
    `${field}.minimumTemperature`,
  );

  validateNumber(
    configuration.maximumTemperature,
    `${field}.maximumTemperature`,
  );

  validateNumber(
    configuration.totalRackCount,
    `${field}.totalRackCount`,
    {
      min: 0,
      integer: true,
    },
  );

  validateNumber(
    configuration.totalBinCount,
    `${field}.totalBinCount`,
    {
      min: 0,
      integer: true,
    },
  );

  validateNumber(
    configuration.maximumCapacity,
    `${field}.maximumCapacity`,
    {
      min: 0,
    },
  );

  validateString(
    configuration.capacityUnit,
    `${field}.capacityUnit`,
    {
      maxLength: 50,
    },
  );

  const rackTracking =
    parseBooleanValue(
      configuration
        .supportsRackTracking,
    );

  const binTracking =
    parseBooleanValue(
      configuration
        .supportsBinTracking,
    );

  const temperatureControl =
    parseBooleanValue(
      configuration
        .supportsTemperatureControl,
    );

  const totalRackCount =
    Number(
      configuration.totalRackCount ||
        0,
    );

  const totalBinCount =
    Number(
      configuration.totalBinCount ||
        0,
    );

  if (
    rackTracking === false &&
    totalRackCount > 0
  ) {
    fail(
      `${field}.totalRackCount`,
      "Rack count must be zero when rack tracking is disabled",
    );
  }

  if (
    binTracking === false &&
    totalBinCount > 0
  ) {
    fail(
      `${field}.totalBinCount`,
      "Bin count must be zero when bin tracking is disabled",
    );
  }

  if (
    binTracking === true &&
    rackTracking === false
  ) {
    fail(
      `${field}.supportsBinTracking`,
      "Rack tracking must be enabled when bin tracking is enabled",
    );
  }

  const minimumTemperature =
    configuration.minimumTemperature;

  const maximumTemperature =
    configuration.maximumTemperature;

  if (
    temperatureControl === true
  ) {
    if (
      minimumTemperature ===
        undefined ||
      minimumTemperature === null ||
      maximumTemperature ===
        undefined ||
      maximumTemperature === null
    ) {
      fail(
        field,
        "Minimum and maximum temperatures are required when temperature control is enabled",
      );
    }

    if (
      Number(
        minimumTemperature,
      ) >
      Number(
        maximumTemperature,
      )
    ) {
      fail(
        `${field}.maximumTemperature`,
        "Maximum temperature must be greater than or equal to minimum temperature",
      );
    }
  }

  if (
    temperatureControl === false &&
    (
      minimumTemperature !==
        undefined &&
      minimumTemperature !== null ||
      maximumTemperature !==
        undefined &&
      maximumTemperature !== null
    )
  ) {
    fail(
      field,
      "Temperature values must be empty when temperature control is disabled",
    );
  }

  if (
    configuration.maximumCapacity !==
      undefined &&
    configuration.maximumCapacity !==
      null &&
    !normalizeString(
      configuration.capacityUnit,
    )
  ) {
    fail(
      `${field}.capacityUnit`,
      "Capacity unit is required when maximum capacity is provided",
    );
  }
};

/* =========================================================
   WAREHOUSE COMMON FIELD VALIDATION
========================================================= */

const validateCommonWarehouseFields = (
  body,
  {
    create = false,
  } = {},
) => {
  validateString(
    body.name,
    "name",
    {
      required: create,
      allowNull: false,
      minLength: 2,
      maxLength: 200,
    },
  );

  validateString(
    body.code,
    "code",
    {
      required: create,
      allowNull: false,
      minLength: 2,
      maxLength: 50,
      pattern:
        WAREHOUSE_CODE_PATTERN,
      patternMessage:
        "Warehouse code may contain only uppercase letters, numbers, underscores, and hyphens",
    },
  );

  if (
    typeof body.code ===
      "string" &&
    body.code !==
      body.code.toUpperCase()
  ) {
    fail(
      "code",
      "Warehouse code must use uppercase letters",
    );
  }

  validateEnum(
    body.warehouseType,
    "warehouseType",
    WAREHOUSE_TYPES,
  );

  validateString(
    body.description,
    "description",
    {
      maxLength: 2000,
    },
  );

  validatePhone(
    body.phone,
    "phone",
  );

  validatePhone(
    body.alternatePhone,
    "alternatePhone",
  );

  validateEmail(
    body.email,
    "email",
  );

  validateObjectId(
    body.manager,
    "manager",
  );

  validateString(
    body.managerName,
    "managerName",
    {
      maxLength: 150,
    },
  );

  validatePhone(
    body.managerPhone,
    "managerPhone",
  );

  validateAddress(
    body.address,
  );

  validateOperatingHours(
    body.operatingHours,
  );

  validateStorageConfiguration(
    body.storageConfiguration,
  );

  validateBoolean(
    body.isDefault,
    "isDefault",
  );

  validateBoolean(
    body.allowPurchasing,
    "allowPurchasing",
  );

  validateBoolean(
    body.allowSalesFulfillment,
    "allowSalesFulfillment",
  );

  validateBoolean(
    body.allowTransfers,
    "allowTransfers",
  );

  validateBoolean(
    body.allowReturns,
    "allowReturns",
  );

  validateBoolean(
    body.allowNegativeStock,
    "allowNegativeStock",
  );

  validateEnum(
    body.status,
    "status",
    WAREHOUSE_STATUSES,
  );

  validateBoolean(
    body.isActive,
    "isActive",
  );

  if (
    body.status ===
      "Active" &&
    hasOwn(
      body,
      "isActive",
    ) &&
    parseBooleanValue(
      body.isActive,
    ) === false
  ) {
    fail(
      "isActive",
      "isActive cannot be false when warehouse status is Active",
    );
  }

  if (
    [
      "Inactive",
      "Closed",
    ].includes(
      body.status,
    ) &&
    hasOwn(
      body,
      "isActive",
    ) &&
    parseBooleanValue(
      body.isActive,
    ) === true
  ) {
    fail(
      "isActive",
      `isActive cannot be true when warehouse status is ${body.status}`,
    );
  }

  if (
    parseBooleanValue(
      body.isDefault,
    ) === true &&
    (
      body.status ===
        "Inactive" ||
      body.status ===
        "Closed" ||
      parseBooleanValue(
        body.isActive,
      ) === false
    )
  ) {
    fail(
      "isDefault",
      "The default warehouse must be active",
    );
  }

  if (
    body.phone &&
    body.alternatePhone &&
    normalizeString(
      body.phone,
    ) ===
      normalizeString(
        body.alternatePhone,
      )
  ) {
    fail(
      "alternatePhone",
      "Alternate phone must be different from the primary phone",
    );
  }
};

/* =========================================================
   CREATE VALIDATOR
========================================================= */

const validateCreateWarehouse = (
  req,
  res,
  next,
) => {
  try {
    ensureBodyObject(req);

    validateForbiddenFields(
      req.body,
      FORBIDDEN_CLIENT_FIELDS,
      "body",
    );

    validateAllowedFields(
      req.body,
      CREATE_ALLOWED_FIELDS,
      "body",
    );

    validateCommonWarehouseFields(
      req.body,
      {
        create: true,
      },
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE VALIDATOR
========================================================= */

const validateUpdateWarehouse = (
  req,
  res,
  next,
) => {
  try {
    ensureBodyObject(req);

    validateForbiddenFields(
      req.body,
      FORBIDDEN_CLIENT_FIELDS,
      "body",
    );

    validateAllowedFields(
      req.body,
      UPDATE_ALLOWED_FIELDS,
      "body",
    );

    if (
      Object.keys(req.body)
        .length === 0
    ) {
      throw createValidationError(
        "At least one field is required to update the warehouse",
        {
          field: "body",
        },
      );
    }

    validateCommonWarehouseFields(
      req.body,
      {
        create: false,
      },
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PARAMETER VALIDATOR
========================================================= */

const validateWarehouseId = (
  req,
  res,
  next,
) => {
  try {
    validateObjectId(
      req.params.warehouseId,
      "warehouseId",
      {
        required: true,
        allowNull: false,
      },
    );

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   QUERY VALIDATOR
========================================================= */

const validateWarehouseQuery = (
  req,
  res,
  next,
) => {
  try {
    const query =
      req.query || {};

    const unsupportedFields =
      Object.keys(query).filter(
        (field) =>
          !ALLOWED_QUERY_FIELDS.has(
            field,
          ),
      );

    if (
      unsupportedFields.length > 0
    ) {
      throw createValidationError(
        "Query contains unsupported fields",
        {
          field: "query",
          unsupportedFields,
        },
      );
    }

    validateNumber(
      query.page,
      "page",
      {
        min: 1,
        integer: true,
      },
    );

    validateNumber(
      query.limit,
      "limit",
      {
        min: 1,
        max: 100,
        integer: true,
      },
    );

    validateString(
      query.search,
      "search",
      {
        maxLength: 200,
      },
    );

    validateString(
      query.code,
      "code",
      {
        maxLength: 50,
      },
    );

    validateEnum(
      query.warehouseType,
      "warehouseType",
      WAREHOUSE_TYPES,
    );

    validateEnum(
      query.status,
      "status",
      WAREHOUSE_STATUSES,
    );

    validateObjectId(
      query.manager,
      "manager",
    );

    validateBoolean(
      query.isDefault,
      "isDefault",
    );

    validateBoolean(
      query.isActive,
      "isActive",
    );

    validateBoolean(
      query.allowPurchasing,
      "allowPurchasing",
    );

    validateBoolean(
      query.allowSalesFulfillment,
      "allowSalesFulfillment",
    );

    validateBoolean(
      query.allowTransfers,
      "allowTransfers",
    );

    validateBoolean(
      query.allowReturns,
      "allowReturns",
    );

    validateBoolean(
      query.includeDeleted,
      "includeDeleted",
    );

    if (
      query.sortBy &&
      !ALLOWED_SORT_FIELDS.has(
        query.sortBy,
      )
    ) {
      fail(
        "sortBy",
        `sortBy must be one of: ${[
          ...ALLOWED_SORT_FIELDS,
        ].join(", ")}`,
        {
          allowedValues: [
            ...ALLOWED_SORT_FIELDS,
          ],
        },
      );
    }

    if (
      query.sortOrder &&
      ![
        "asc",
        "desc",
      ].includes(
        String(
          query.sortOrder,
        ).toLowerCase(),
      )
    ) {
      fail(
        "sortOrder",
        "sortOrder must be asc or desc",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DEFAULT WAREHOUSE VALIDATOR
========================================================= */

const validateSetDefaultWarehouse = (
  req,
  res,
  next,
) => {
  try {
    ensureBodyObject(req);

    validateAllowedFields(
      req.body,
      new Set([
        "isDefault",
      ]),
      "body",
    );

    validateBoolean(
      req.body.isDefault,
      "isDefault",
      {
        required: true,
      },
    );

    if (
      parseBooleanValue(
        req.body.isDefault,
      ) !== true
    ) {
      fail(
        "isDefault",
        "isDefault must be true when setting a default warehouse",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   STATUS VALIDATOR
========================================================= */

const validateWarehouseStatus = (
  req,
  res,
  next,
) => {
  try {
    ensureBodyObject(req);

    validateAllowedFields(
      req.body,
      new Set([
        "status",
        "reason",
      ]),
      "body",
    );

    validateEnum(
      req.body.status,
      "status",
      WAREHOUSE_STATUSES,
      {
        required: true,
      },
    );

    validateString(
      req.body.reason,
      "reason",
      {
        maxLength: 1000,
      },
    );

    if (
      [
        "Inactive",
        "Maintenance",
        "Closed",
      ].includes(
        req.body.status,
      ) &&
      !normalizeString(
        req.body.reason,
      )
    ) {
      fail(
        "reason",
        `Reason is required when warehouse status is ${req.body.status}`,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  validateCreateWarehouse,
  validateUpdateWarehouse,
  validateWarehouseId,
  validateWarehouseQuery,
  validateSetDefaultWarehouse,
  validateWarehouseStatus,
};