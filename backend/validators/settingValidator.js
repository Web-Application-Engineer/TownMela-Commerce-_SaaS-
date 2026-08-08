"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const PUBLIC_SETTINGS_SECTIONS = Object.freeze([
  "general",
  "branding",
  "orders",
  "inventory",
  "notifications",
  "security",
  "users",
  "billing",
  "integrations",
]);

const OWNER_ONLY_SECTION = "ownerOnly";

const ALL_SETTINGS_SECTIONS = Object.freeze([
  ...PUBLIC_SETTINGS_SECTIONS,
  OWNER_ONLY_SECTION,
]);

const CURRENCY_CODES = Object.freeze([
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SAR",
]);

const TIMEZONES = Object.freeze([
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
]);

const DATE_FORMATS = Object.freeze([
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
]);

const TIME_FORMATS = Object.freeze([
  "12-hour",
  "24-hour",
]);

const ORDER_NUMBER_FORMATS = Object.freeze([
  "sequential",
  "timestamp",
  "random",
]);

const STOCK_POLICIES = Object.freeze([
  "deny",
  "allow",
  "warn",
]);

const NOTIFICATION_EVENTS = Object.freeze([
  "orderCreated",
  "orderConfirmed",
  "orderCancelled",
  "orderDelivered",
  "paymentReceived",
  "paymentFailed",
  "lowStock",
  "goodsReceived",
  "vendorInvoiceDue",
  "securityAlert",
]);

const NOTIFICATION_CHANNELS = Object.freeze([
  "email",
  "sms",
  "push",
  "inApp",
]);

const FORBIDDEN_ROOT_FIELDS = Object.freeze([
  "_id",
  "id",
  "tenant",
  "tenantId",
  "schemaVersion",
  "audit",
  "isActive",
  "archivedAt",
  "createdAt",
  "updatedAt",
  "__v",
]);

const FORBIDDEN_OBJECT_KEYS = Object.freeze([
  "__proto__",
  "prototype",
  "constructor",
]);

/* =========================================================
   FIELD WHITELISTS
========================================================= */

const GENERAL_FIELDS = Object.freeze([
  "storeName",
  "legalBusinessName",
  "email",
  "phone",
  "supportEmail",
  "supportPhone",
  "country",
  "currency",
  "timezone",
  "locale",
  "dateFormat",
  "timeFormat",
  "address",
  "maintenanceMode",
  "maintenanceMessage",
]);

const ADDRESS_FIELDS = Object.freeze([
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
]);

const BRANDING_FIELDS = Object.freeze([
  "logoUrl",
  "darkLogoUrl",
  "faviconUrl",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "storeTagline",
  "footerText",
  "invoiceLogoUrl",
  "invoiceFooterText",
  "socialLinks",
]);

const SOCIAL_LINK_FIELDS = Object.freeze([
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
  "tiktok",
  "x",
]);

const ORDER_FIELDS = Object.freeze([
  "orderPrefix",
  "orderNumberFormat",
  "orderNumberPadding",
  "startingOrderNumber",
  "allowGuestCheckout",
  "requirePhoneNumber",
  "requireEmailAddress",
  "autoConfirmOrders",
  "allowOrderCancellation",
  "cancellationWindowMinutes",
  "allowOrderNotes",
  "defaultOrderStatus",
  "defaultPaymentStatus",
  "minimumOrderAmount",
  "maximumOrderAmount",
  "taxIncludedInPrice",
  "defaultTaxRate",
]);

const INVENTORY_FIELDS = Object.freeze([
  "trackInventory",
  "stockPolicy",
  "lowStockThreshold",
  "outOfStockThreshold",
  "showStockQuantityToCustomers",
  "allowBackorders",
  "reserveStockOnOrder",
  "releaseStockOnCancellation",
  "autoPostGoodsReceived",
  "requireGoodsReceivedInspection",
  "requireInventoryPostingApproval",
  "defaultWarehouseId",
  "stockAdjustmentRequiresReason",
]);

const NOTIFICATION_FIELDS = Object.freeze([
  ...NOTIFICATION_EVENTS,
  "senderName",
  "replyToEmail",
]);

const SECURITY_FIELDS = Object.freeze([
  "requireTwoFactorForOwner",
  "requireTwoFactorForAdmins",
  "sessionTimeoutMinutes",
  "maxLoginAttempts",
  "loginLockDurationMinutes",
  "passwordMinimumLength",
  "passwordRequireUppercase",
  "passwordRequireLowercase",
  "passwordRequireNumber",
  "passwordRequireSymbol",
  "allowConcurrentSessions",
  "notifyOnNewLogin",
  "auditSensitiveActions",
]);

const USER_FIELDS = Object.freeze([
  "allowTenantAdminToInviteUsers",
  "allowTenantAdminToManageRoles",
  "requireOwnerApprovalForNewAdmins",
  "defaultNewUserRole",
  "invitationExpiryHours",
]);

const BILLING_FIELDS = Object.freeze([
  "billingEmail",
  "invoiceName",
  "taxIdentificationNumber",
  "billingAddress",
  "receiveBillingNotifications",
  "receiveUsageWarnings",
]);

const INTEGRATION_FIELDS = Object.freeze([
  "paymentGateway",
  "emailProvider",
  "smsProvider",
  "analyticsProvider",
  "accountingProvider",
  "customApi",
]);

const INTEGRATION_ITEM_FIELDS = Object.freeze([
  "enabled",
  "configured",
  "provider",
  "configurationReference",
]);

const OWNER_ONLY_FIELDS = Object.freeze([
  "allowTenantDeletion",
  "allowOwnershipTransfer",
  "allowSubscriptionCancellation",
  "requirePasswordConfirmationForSensitiveActions",
]);

/* =========================================================
   RESPONSE AND ERROR HELPERS
========================================================= */

const createValidationError = (
  field,
  message,
  code = "INVALID_FIELD"
) => ({
  field,
  message,
  code,
});

const sendValidationError = (
  res,
  errors,
  message = "Settings validation failed"
) =>
  res.status(422).json({
    success: false,
    code: "SETTINGS_VALIDATION_FAILED",
    message,
    errors,
  });

const sendBadRequest = (
  res,
  message,
  code = "INVALID_REQUEST"
) =>
  res.status(400).json({
    success: false,
    code,
    message,
  });

/* =========================================================
   GENERAL HELPERS
========================================================= */

const isPlainObject = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) ===
        Object.prototype
  );

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(
    object,
    key
  );

const normalizeSection = (value) =>
  String(value || "")
    .trim()
    .replace(/[-_\s]+(.)?/g, (
      match,
      character
    ) =>
      character
        ? character.toUpperCase()
        : ""
    );

const normalizeString = (value) =>
  typeof value === "string"
    ? value.trim()
    : value;

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );

const isValidHexColor = (value) =>
  /^#[0-9A-Fa-f]{6}$/.test(value);

const isValidHttpUrl = (value) => {
  if (value === "") {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
};

const isValidObjectId = (value) => {
  if (
    value === null ||
    value === ""
  ) {
    return true;
  }

  return mongoose.isValidObjectId(
    value
  );
};

const validateUnknownFields = (
  object,
  allowedFields,
  fieldPrefix,
  errors
) => {
  if (!isPlainObject(object)) {
    errors.push(
      createValidationError(
        fieldPrefix,
        `${fieldPrefix} must be an object`,
        "INVALID_OBJECT"
      )
    );

    return;
  }

  for (const key of Object.keys(object)) {
    if (
      FORBIDDEN_OBJECT_KEYS.includes(key)
    ) {
      errors.push(
        createValidationError(
          fieldPrefix
            ? `${fieldPrefix}.${key}`
            : key,
          "Unsafe object property is not allowed",
          "UNSAFE_PROPERTY"
        )
      );

      continue;
    }

    if (!allowedFields.includes(key)) {
      errors.push(
        createValidationError(
          fieldPrefix
            ? `${fieldPrefix}.${key}`
            : key,
          `Unknown settings field: ${key}`,
          "UNKNOWN_FIELD"
        )
      );
    }
  }
};

const validateStringField = ({
  object,
  key,
  path,
  errors,
  maxLength,
  minLength = 0,
  required = false,
  lowercase = false,
  uppercase = false,
  pattern = null,
  patternMessage = "",
}) => {
  if (!hasOwn(object, key)) {
    if (required) {
      errors.push(
        createValidationError(
          path,
          `${path} is required`,
          "FIELD_REQUIRED"
        )
      );
    }

    return;
  }

  if (typeof object[key] !== "string") {
    errors.push(
      createValidationError(
        path,
        `${path} must be a string`,
        "INVALID_STRING"
      )
    );

    return;
  }

  let value = object[key].trim();

  if (lowercase) {
    value = value.toLowerCase();
  }

  if (uppercase) {
    value = value.toUpperCase();
  }

  object[key] = value;

  if (
    required &&
    value.length === 0
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} cannot be empty`,
        "EMPTY_FIELD"
      )
    );
  }

  if (value.length < minLength) {
    errors.push(
      createValidationError(
        path,
        `${path} must contain at least ${minLength} characters`,
        "VALUE_TOO_SHORT"
      )
    );
  }

  if (value.length > maxLength) {
    errors.push(
      createValidationError(
        path,
        `${path} cannot exceed ${maxLength} characters`,
        "VALUE_TOO_LONG"
      )
    );
  }

  if (
    pattern &&
    value &&
    !pattern.test(value)
  ) {
    errors.push(
      createValidationError(
        path,
        patternMessage ||
          `${path} has an invalid format`,
        "INVALID_FORMAT"
      )
    );
  }
};

const validateBooleanField = ({
  object,
  key,
  path,
  errors,
}) => {
  if (!hasOwn(object, key)) {
    return;
  }

  if (typeof object[key] !== "boolean") {
    errors.push(
      createValidationError(
        path,
        `${path} must be true or false`,
        "INVALID_BOOLEAN"
      )
    );
  }
};

const validateNumberField = ({
  object,
  key,
  path,
  errors,
  min = null,
  max = null,
  integer = false,
}) => {
  if (!hasOwn(object, key)) {
    return;
  }

  const value = object[key];

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} must be a valid number`,
        "INVALID_NUMBER"
      )
    );

    return;
  }

  if (
    integer &&
    !Number.isInteger(value)
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} must be an integer`,
        "INVALID_INTEGER"
      )
    );
  }

  if (
    min !== null &&
    value < min
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} cannot be less than ${min}`,
        "VALUE_TOO_SMALL"
      )
    );
  }

  if (
    max !== null &&
    value > max
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} cannot exceed ${max}`,
        "VALUE_TOO_LARGE"
      )
    );
  }
};

const validateEnumField = ({
  object,
  key,
  path,
  errors,
  allowedValues,
  lowercase = false,
  uppercase = false,
}) => {
  if (!hasOwn(object, key)) {
    return;
  }

  if (typeof object[key] !== "string") {
    errors.push(
      createValidationError(
        path,
        `${path} must be a string`,
        "INVALID_STRING"
      )
    );

    return;
  }

  let value = object[key].trim();

  if (lowercase) {
    value = value.toLowerCase();
  }

  if (uppercase) {
    value = value.toUpperCase();
  }

  object[key] = value;

  if (!allowedValues.includes(value)) {
    errors.push(
      createValidationError(
        path,
        `${path} must be one of: ${allowedValues.join(
          ", "
        )}`,
        "INVALID_OPTION"
      )
    );
  }
};

const validateEmailField = ({
  object,
  key,
  path,
  errors,
}) => {
  validateStringField({
    object,
    key,
    path,
    errors,
    maxLength: 254,
    lowercase: true,
  });

  if (
    hasOwn(object, key) &&
    typeof object[key] === "string" &&
    object[key] &&
    !isValidEmail(object[key])
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} must be a valid email address`,
        "INVALID_EMAIL"
      )
    );
  }
};

const validateUrlField = ({
  object,
  key,
  path,
  errors,
}) => {
  validateStringField({
    object,
    key,
    path,
    errors,
    maxLength: 1000,
  });

  if (
    hasOwn(object, key) &&
    typeof object[key] === "string" &&
    !isValidHttpUrl(object[key])
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} must be a valid HTTP or HTTPS URL`,
        "INVALID_URL"
      )
    );
  }
};

const validateObjectIdField = ({
  object,
  key,
  path,
  errors,
}) => {
  if (!hasOwn(object, key)) {
    return;
  }

  if (!isValidObjectId(object[key])) {
    errors.push(
      createValidationError(
        path,
        `${path} must be a valid MongoDB ObjectId or null`,
        "INVALID_OBJECT_ID"
      )
    );
  }
};

const validateNotEmptyUpdate = (
  object,
  path,
  errors
) => {
  if (
    isPlainObject(object) &&
    Object.keys(object).length === 0
  ) {
    errors.push(
      createValidationError(
        path,
        `${path} update cannot be empty`,
        "EMPTY_UPDATE"
      )
    );
  }
};

/* =========================================================
   NESTED OBJECT VALIDATORS
========================================================= */

const validateAddress = (
  address,
  path,
  errors
) => {
  validateUnknownFields(
    address,
    ADDRESS_FIELDS,
    path,
    errors
  );

  if (!isPlainObject(address)) {
    return;
  }

  validateStringField({
    object: address,
    key: "line1",
    path: `${path}.line1`,
    errors,
    maxLength: 250,
  });

  validateStringField({
    object: address,
    key: "line2",
    path: `${path}.line2`,
    errors,
    maxLength: 250,
  });

  validateStringField({
    object: address,
    key: "city",
    path: `${path}.city`,
    errors,
    maxLength: 100,
  });

  validateStringField({
    object: address,
    key: "state",
    path: `${path}.state`,
    errors,
    maxLength: 100,
  });

  validateStringField({
    object: address,
    key: "postalCode",
    path: `${path}.postalCode`,
    errors,
    maxLength: 30,
  });

  validateStringField({
    object: address,
    key: "country",
    path: `${path}.country`,
    errors,
    maxLength: 2,
    uppercase: true,
    pattern: /^[A-Z]{2}$/,
    patternMessage:
      `${path}.country must be a two-letter country code`,
  });
};

const validateSocialLinks = (
  socialLinks,
  path,
  errors
) => {
  validateUnknownFields(
    socialLinks,
    SOCIAL_LINK_FIELDS,
    path,
    errors
  );

  if (!isPlainObject(socialLinks)) {
    return;
  }

  for (const field of SOCIAL_LINK_FIELDS) {
    validateUrlField({
      object: socialLinks,
      key: field,
      path: `${path}.${field}`,
      errors,
    });
  }
};

const validateNotificationChannels = (
  channels,
  path,
  errors
) => {
  validateUnknownFields(
    channels,
    NOTIFICATION_CHANNELS,
    path,
    errors
  );

  if (!isPlainObject(channels)) {
    return;
  }

  for (const channel of NOTIFICATION_CHANNELS) {
    validateBooleanField({
      object: channels,
      key: channel,
      path: `${path}.${channel}`,
      errors,
    });
  }
};

const validateIntegrationItem = (
  item,
  path,
  errors
) => {
  validateUnknownFields(
    item,
    INTEGRATION_ITEM_FIELDS,
    path,
    errors
  );

  if (!isPlainObject(item)) {
    return;
  }

  validateBooleanField({
    object: item,
    key: "enabled",
    path: `${path}.enabled`,
    errors,
  });

  validateBooleanField({
    object: item,
    key: "configured",
    path: `${path}.configured`,
    errors,
  });

  validateStringField({
    object: item,
    key: "provider",
    path: `${path}.provider`,
    errors,
    maxLength: 100,
    lowercase: true,
  });

  validateObjectIdField({
    object: item,
    key: "configurationReference",
    path: `${path}.configurationReference`,
    errors,
  });
};

/* =========================================================
   GENERAL SETTINGS VALIDATION
========================================================= */

const validateGeneralSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    GENERAL_FIELDS,
    "general",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  validateStringField({
    object: data,
    key: "storeName",
    path: "general.storeName",
    errors,
    maxLength: 150,
  });

  validateStringField({
    object: data,
    key: "legalBusinessName",
    path: "general.legalBusinessName",
    errors,
    maxLength: 200,
  });

  validateEmailField({
    object: data,
    key: "email",
    path: "general.email",
    errors,
  });

  validateStringField({
    object: data,
    key: "phone",
    path: "general.phone",
    errors,
    maxLength: 30,
  });

  validateEmailField({
    object: data,
    key: "supportEmail",
    path: "general.supportEmail",
    errors,
  });

  validateStringField({
    object: data,
    key: "supportPhone",
    path: "general.supportPhone",
    errors,
    maxLength: 30,
  });

  validateStringField({
    object: data,
    key: "country",
    path: "general.country",
    errors,
    maxLength: 2,
    uppercase: true,
    pattern: /^[A-Z]{2}$/,
    patternMessage:
      "general.country must be a two-letter country code",
  });

  validateEnumField({
    object: data,
    key: "currency",
    path: "general.currency",
    errors,
    allowedValues: CURRENCY_CODES,
    uppercase: true,
  });

  validateEnumField({
    object: data,
    key: "timezone",
    path: "general.timezone",
    errors,
    allowedValues: TIMEZONES,
  });

  validateStringField({
    object: data,
    key: "locale",
    path: "general.locale",
    errors,
    maxLength: 20,
  });

  validateEnumField({
    object: data,
    key: "dateFormat",
    path: "general.dateFormat",
    errors,
    allowedValues: DATE_FORMATS,
  });

  validateEnumField({
    object: data,
    key: "timeFormat",
    path: "general.timeFormat",
    errors,
    allowedValues: TIME_FORMATS,
  });

  if (hasOwn(data, "address")) {
    validateAddress(
      data.address,
      "general.address",
      errors
    );
  }

  validateBooleanField({
    object: data,
    key: "maintenanceMode",
    path: "general.maintenanceMode",
    errors,
  });

  validateStringField({
    object: data,
    key: "maintenanceMessage",
    path: "general.maintenanceMessage",
    errors,
    maxLength: 500,
  });
};

/* =========================================================
   BRANDING SETTINGS VALIDATION
========================================================= */

const validateBrandingSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    BRANDING_FIELDS,
    "branding",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of [
    "logoUrl",
    "darkLogoUrl",
    "faviconUrl",
    "invoiceLogoUrl",
  ]) {
    validateUrlField({
      object: data,
      key: field,
      path: `branding.${field}`,
      errors,
    });
  }

  for (const field of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
  ]) {
    validateStringField({
      object: data,
      key: field,
      path: `branding.${field}`,
      errors,
      maxLength: 7,
    });

    if (
      hasOwn(data, field) &&
      typeof data[field] === "string" &&
      !isValidHexColor(data[field])
    ) {
      errors.push(
        createValidationError(
          `branding.${field}`,
          `branding.${field} must use six-digit hexadecimal format, for example #2563EB`,
          "INVALID_COLOR"
        )
      );
    }
  }

  validateStringField({
    object: data,
    key: "storeTagline",
    path: "branding.storeTagline",
    errors,
    maxLength: 200,
  });

  validateStringField({
    object: data,
    key: "footerText",
    path: "branding.footerText",
    errors,
    maxLength: 500,
  });

  validateStringField({
    object: data,
    key: "invoiceFooterText",
    path: "branding.invoiceFooterText",
    errors,
    maxLength: 500,
  });

  if (hasOwn(data, "socialLinks")) {
    validateSocialLinks(
      data.socialLinks,
      "branding.socialLinks",
      errors
    );
  }
};

/* =========================================================
   ORDER SETTINGS VALIDATION
========================================================= */

const validateOrdersSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    ORDER_FIELDS,
    "orders",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  validateStringField({
    object: data,
    key: "orderPrefix",
    path: "orders.orderPrefix",
    errors,
    maxLength: 20,
    uppercase: true,
    pattern: /^[A-Z0-9_-]*$/,
    patternMessage:
      "orders.orderPrefix may contain uppercase letters, numbers, hyphens and underscores only",
  });

  validateEnumField({
    object: data,
    key: "orderNumberFormat",
    path: "orders.orderNumberFormat",
    errors,
    allowedValues:
      ORDER_NUMBER_FORMATS,
    lowercase: true,
  });

  validateNumberField({
    object: data,
    key: "orderNumberPadding",
    path: "orders.orderNumberPadding",
    errors,
    min: 3,
    max: 12,
    integer: true,
  });

  validateNumberField({
    object: data,
    key: "startingOrderNumber",
    path: "orders.startingOrderNumber",
    errors,
    min: 1,
    integer: true,
  });

  for (const field of [
    "allowGuestCheckout",
    "requirePhoneNumber",
    "requireEmailAddress",
    "autoConfirmOrders",
    "allowOrderCancellation",
    "allowOrderNotes",
    "taxIncludedInPrice",
  ]) {
    validateBooleanField({
      object: data,
      key: field,
      path: `orders.${field}`,
      errors,
    });
  }

  validateNumberField({
    object: data,
    key: "cancellationWindowMinutes",
    path:
      "orders.cancellationWindowMinutes",
    errors,
    min: 0,
    max: 10080,
    integer: true,
  });

  validateStringField({
    object: data,
    key: "defaultOrderStatus",
    path: "orders.defaultOrderStatus",
    errors,
    maxLength: 50,
    lowercase: true,
  });

  validateStringField({
    object: data,
    key: "defaultPaymentStatus",
    path:
      "orders.defaultPaymentStatus",
    errors,
    maxLength: 50,
    lowercase: true,
  });

  validateNumberField({
    object: data,
    key: "minimumOrderAmount",
    path: "orders.minimumOrderAmount",
    errors,
    min: 0,
  });

  validateNumberField({
    object: data,
    key: "maximumOrderAmount",
    path: "orders.maximumOrderAmount",
    errors,
    min: 0,
  });

  validateNumberField({
    object: data,
    key: "defaultTaxRate",
    path: "orders.defaultTaxRate",
    errors,
    min: 0,
    max: 100,
  });

  if (
    typeof data.minimumOrderAmount ===
      "number" &&
    typeof data.maximumOrderAmount ===
      "number" &&
    data.maximumOrderAmount > 0 &&
    data.minimumOrderAmount >
      data.maximumOrderAmount
  ) {
    errors.push(
      createValidationError(
        "orders.maximumOrderAmount",
        "Maximum order amount cannot be lower than minimum order amount",
        "INVALID_AMOUNT_RANGE"
      )
    );
  }
};

/* =========================================================
   INVENTORY SETTINGS VALIDATION
========================================================= */

const validateInventorySection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    INVENTORY_FIELDS,
    "inventory",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of [
    "trackInventory",
    "showStockQuantityToCustomers",
    "allowBackorders",
    "reserveStockOnOrder",
    "releaseStockOnCancellation",
    "autoPostGoodsReceived",
    "requireGoodsReceivedInspection",
    "requireInventoryPostingApproval",
    "stockAdjustmentRequiresReason",
  ]) {
    validateBooleanField({
      object: data,
      key: field,
      path: `inventory.${field}`,
      errors,
    });
  }

  validateEnumField({
    object: data,
    key: "stockPolicy",
    path: "inventory.stockPolicy",
    errors,
    allowedValues: STOCK_POLICIES,
    lowercase: true,
  });

  validateNumberField({
    object: data,
    key: "lowStockThreshold",
    path:
      "inventory.lowStockThreshold",
    errors,
    min: 0,
  });

  validateNumberField({
    object: data,
    key: "outOfStockThreshold",
    path:
      "inventory.outOfStockThreshold",
    errors,
    min: 0,
  });

  validateObjectIdField({
    object: data,
    key: "defaultWarehouseId",
    path:
      "inventory.defaultWarehouseId",
    errors,
  });
};

/* =========================================================
   NOTIFICATION SETTINGS VALIDATION
========================================================= */

const validateNotificationsSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    NOTIFICATION_FIELDS,
    "notifications",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const event of NOTIFICATION_EVENTS) {
    if (hasOwn(data, event)) {
      validateNotificationChannels(
        data[event],
        `notifications.${event}`,
        errors
      );
    }
  }

  validateStringField({
    object: data,
    key: "senderName",
    path:
      "notifications.senderName",
    errors,
    maxLength: 100,
  });

  validateEmailField({
    object: data,
    key: "replyToEmail",
    path:
      "notifications.replyToEmail",
    errors,
  });
};

/* =========================================================
   SECURITY SETTINGS VALIDATION
========================================================= */

const validateSecuritySection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    SECURITY_FIELDS,
    "security",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of [
    "requireTwoFactorForOwner",
    "requireTwoFactorForAdmins",
    "passwordRequireUppercase",
    "passwordRequireLowercase",
    "passwordRequireNumber",
    "passwordRequireSymbol",
    "allowConcurrentSessions",
    "notifyOnNewLogin",
    "auditSensitiveActions",
  ]) {
    validateBooleanField({
      object: data,
      key: field,
      path: `security.${field}`,
      errors,
    });
  }

  validateNumberField({
    object: data,
    key: "sessionTimeoutMinutes",
    path:
      "security.sessionTimeoutMinutes",
    errors,
    min: 5,
    max: 10080,
    integer: true,
  });

  validateNumberField({
    object: data,
    key: "maxLoginAttempts",
    path:
      "security.maxLoginAttempts",
    errors,
    min: 1,
    max: 20,
    integer: true,
  });

  validateNumberField({
    object: data,
    key: "loginLockDurationMinutes",
    path:
      "security.loginLockDurationMinutes",
    errors,
    min: 1,
    max: 1440,
    integer: true,
  });

  validateNumberField({
    object: data,
    key: "passwordMinimumLength",
    path:
      "security.passwordMinimumLength",
    errors,
    min: 8,
    max: 128,
    integer: true,
  });
};

/* =========================================================
   USER SETTINGS VALIDATION
========================================================= */

const validateUsersSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    USER_FIELDS,
    "users",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of [
    "allowTenantAdminToInviteUsers",
    "allowTenantAdminToManageRoles",
    "requireOwnerApprovalForNewAdmins",
  ]) {
    validateBooleanField({
      object: data,
      key: field,
      path: `users.${field}`,
      errors,
    });
  }

  validateStringField({
    object: data,
    key: "defaultNewUserRole",
    path: "users.defaultNewUserRole",
    errors,
    maxLength: 100,
    lowercase: true,
    pattern: /^[a-z0-9_-]*$/,
    patternMessage:
      "users.defaultNewUserRole may contain lowercase letters, numbers, hyphens and underscores only",
  });

  validateNumberField({
    object: data,
    key: "invitationExpiryHours",
    path:
      "users.invitationExpiryHours",
    errors,
    min: 1,
    max: 720,
    integer: true,
  });
};

/* =========================================================
   BILLING SETTINGS VALIDATION
========================================================= */

const validateBillingSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    BILLING_FIELDS,
    "billing",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  validateEmailField({
    object: data,
    key: "billingEmail",
    path: "billing.billingEmail",
    errors,
  });

  validateStringField({
    object: data,
    key: "invoiceName",
    path: "billing.invoiceName",
    errors,
    maxLength: 200,
  });

  validateStringField({
    object: data,
    key: "taxIdentificationNumber",
    path:
      "billing.taxIdentificationNumber",
    errors,
    maxLength: 100,
  });

  if (hasOwn(data, "billingAddress")) {
    validateAddress(
      data.billingAddress,
      "billing.billingAddress",
      errors
    );
  }

  validateBooleanField({
    object: data,
    key:
      "receiveBillingNotifications",
    path:
      "billing.receiveBillingNotifications",
    errors,
  });

  validateBooleanField({
    object: data,
    key: "receiveUsageWarnings",
    path:
      "billing.receiveUsageWarnings",
    errors,
  });
};

/* =========================================================
   INTEGRATION SETTINGS VALIDATION
========================================================= */

const validateIntegrationsSection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    INTEGRATION_FIELDS,
    "integrations",
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of INTEGRATION_FIELDS) {
    if (hasOwn(data, field)) {
      validateIntegrationItem(
        data[field],
        `integrations.${field}`,
        errors
      );
    }
  }
};

/* =========================================================
   OWNER-ONLY SETTINGS VALIDATION
========================================================= */

const validateOwnerOnlySection = (
  data,
  errors
) => {
  validateUnknownFields(
    data,
    OWNER_ONLY_FIELDS,
    OWNER_ONLY_SECTION,
    errors
  );

  if (!isPlainObject(data)) {
    return;
  }

  for (const field of OWNER_ONLY_FIELDS) {
    validateBooleanField({
      object: data,
      key: field,
      path:
        `${OWNER_ONLY_SECTION}.${field}`,
      errors,
    });
  }
};

/* =========================================================
   SECTION VALIDATOR ROUTER
========================================================= */

const SECTION_VALIDATORS = Object.freeze({
  general: validateGeneralSection,
  branding: validateBrandingSection,
  orders: validateOrdersSection,
  inventory: validateInventorySection,
  notifications:
    validateNotificationsSection,
  security: validateSecuritySection,
  users: validateUsersSection,
  billing: validateBillingSection,
  integrations:
    validateIntegrationsSection,
  ownerOnly:
    validateOwnerOnlySection,
});

const validateSectionPayload = (
  section,
  payload,
  errors
) => {
  const validator =
    SECTION_VALIDATORS[section];

  if (!validator) {
    errors.push(
      createValidationError(
        "section",
        `Unsupported settings section: ${section}`,
        "INVALID_SETTINGS_SECTION"
      )
    );

    return;
  }

  validator(payload, errors);
};

/* =========================================================
   SECURITY SANITIZATION
========================================================= */

const removeForbiddenRootFields = (
  body
) => {
  if (!isPlainObject(body)) {
    return;
  }

  for (const field of FORBIDDEN_ROOT_FIELDS) {
    delete body[field];
  }
};

const rejectUnsafeDeepKeys = (
  value,
  path = "",
  errors = []
) => {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return errors;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      rejectUnsafeDeepKeys(
        item,
        `${path}[${index}]`,
        errors
      );
    });

    return errors;
  }

  for (const key of Object.keys(value)) {
    const currentPath = path
      ? `${path}.${key}`
      : key;

    if (
      key.startsWith("$") ||
      key.includes(".") ||
      FORBIDDEN_OBJECT_KEYS.includes(key)
    ) {
      errors.push(
        createValidationError(
          currentPath,
          "Unsafe property name is not allowed",
          "UNSAFE_PROPERTY"
        )
      );

      continue;
    }

    rejectUnsafeDeepKeys(
      value[key],
      currentPath,
      errors
    );
  }

  return errors;
};

/* =========================================================
   PARAMETER VALIDATION
========================================================= */

const validateSettingsSectionParam = (
  req,
  res,
  next
) => {
  const rawSection =
    req.params?.section;

  if (!rawSection) {
    return sendBadRequest(
      res,
      "Settings section is required",
      "SETTINGS_SECTION_REQUIRED"
    );
  }

  const section =
    normalizeSection(rawSection);

  if (
    !ALL_SETTINGS_SECTIONS.includes(
      section
    )
  ) {
    return sendBadRequest(
      res,
      `Invalid settings section. Allowed sections: ${ALL_SETTINGS_SECTIONS.join(
        ", "
      )}`,
      "INVALID_SETTINGS_SECTION"
    );
  }

  req.params.section = section;

  return next();
};

const validatePublicSettingsSectionParam = (
  req,
  res,
  next
) => {
  const rawSection =
    req.params?.section;

  if (!rawSection) {
    return sendBadRequest(
      res,
      "Settings section is required",
      "SETTINGS_SECTION_REQUIRED"
    );
  }

  const section =
    normalizeSection(rawSection);

  if (
    !PUBLIC_SETTINGS_SECTIONS.includes(
      section
    )
  ) {
    return sendBadRequest(
      res,
      `Invalid public settings section. Allowed sections: ${PUBLIC_SETTINGS_SECTIONS.join(
        ", "
      )}`,
      "INVALID_PUBLIC_SETTINGS_SECTION"
    );
  }

  req.params.section = section;

  return next();
};

/* =========================================================
   FULL SETTINGS UPDATE VALIDATION

   Expected request body:

   {
     general: {},
     branding: {},
     orders: {}
   }

   Partial section updates are supported.
========================================================= */

const validateUpdateSettings = (
  req,
  res,
  next
) => {
  if (!isPlainObject(req.body)) {
    return sendBadRequest(
      res,
      "Request body must be a JSON object",
      "INVALID_SETTINGS_BODY"
    );
  }

  const unsafeErrors =
    rejectUnsafeDeepKeys(req.body);

  if (unsafeErrors.length > 0) {
    return sendValidationError(
      res,
      unsafeErrors
    );
  }

  removeForbiddenRootFields(req.body);

  const receivedSections =
    Object.keys(req.body);

  if (
    receivedSections.length === 0
  ) {
    return sendValidationError(
      res,
      [
        createValidationError(
          "body",
          "At least one settings section must be provided",
          "EMPTY_SETTINGS_UPDATE"
        ),
      ]
    );
  }

  const errors = [];

  for (const section of receivedSections) {
    if (
      !PUBLIC_SETTINGS_SECTIONS.includes(
        section
      )
    ) {
      errors.push(
        createValidationError(
          section,
          `Unknown or restricted settings section: ${section}`,
          section ===
            OWNER_ONLY_SECTION
            ? "OWNER_ONLY_SECTION_RESTRICTED"
            : "UNKNOWN_SETTINGS_SECTION"
        )
      );

      continue;
    }

    validateNotEmptyUpdate(
      req.body[section],
      section,
      errors
    );

    validateSectionPayload(
      section,
      req.body[section],
      errors
    );
  }

  if (errors.length > 0) {
    return sendValidationError(
      res,
      errors
    );
  }

  return next();
};

/* =========================================================
   SINGLE SECTION UPDATE VALIDATION

   Route example:

   PATCH /api/settings/general

   Request body:

   {
     storeName: "TownMela"
   }
========================================================= */

const validateUpdateSettingsSection = (
  req,
  res,
  next
) => {
  const section =
    normalizeSection(
      req.params?.section
    );

  if (
    !PUBLIC_SETTINGS_SECTIONS.includes(
      section
    )
  ) {
    return sendBadRequest(
      res,
      `Invalid settings section. Allowed sections: ${PUBLIC_SETTINGS_SECTIONS.join(
        ", "
      )}`,
      "INVALID_SETTINGS_SECTION"
    );
  }

  if (!isPlainObject(req.body)) {
    return sendBadRequest(
      res,
      "Request body must be a JSON object",
      "INVALID_SETTINGS_BODY"
    );
  }

  const unsafeErrors =
    rejectUnsafeDeepKeys(req.body);

  if (unsafeErrors.length > 0) {
    return sendValidationError(
      res,
      unsafeErrors
    );
  }

  removeForbiddenRootFields(req.body);

  const errors = [];

  validateNotEmptyUpdate(
    req.body,
    section,
    errors
  );

  validateSectionPayload(
    section,
    req.body,
    errors
  );

  if (errors.length > 0) {
    return sendValidationError(
      res,
      errors
    );
  }

  req.params.section = section;

  return next();
};

/* =========================================================
   OWNER-ONLY UPDATE VALIDATION

   This middleware validates data only.

   Tenant Owner authorization must still be enforced
   separately in route/controller middleware.
========================================================= */

const validateUpdateOwnerOnlySettings = (
  req,
  res,
  next
) => {
  if (!isPlainObject(req.body)) {
    return sendBadRequest(
      res,
      "Request body must be a JSON object",
      "INVALID_OWNER_SETTINGS_BODY"
    );
  }

  const unsafeErrors =
    rejectUnsafeDeepKeys(req.body);

  if (unsafeErrors.length > 0) {
    return sendValidationError(
      res,
      unsafeErrors
    );
  }

  removeForbiddenRootFields(req.body);

  const payload =
    isPlainObject(
      req.body.ownerOnly
    )
      ? req.body.ownerOnly
      : req.body;

  const errors = [];

  validateNotEmptyUpdate(
    payload,
    OWNER_ONLY_SECTION,
    errors
  );

  validateOwnerOnlySection(
    payload,
    errors
  );

  if (errors.length > 0) {
    return sendValidationError(
      res,
      errors
    );
  }

  req.body = payload;

  return next();
};

/* =========================================================
   GET QUERY VALIDATION
========================================================= */

const validateGetSettingsQuery = (
  req,
  res,
  next
) => {
  const allowedQueryFields = [
    "section",
  ];

  const errors = [];

  for (
    const key of Object.keys(
      req.query || {}
    )
  ) {
    if (
      !allowedQueryFields.includes(key)
    ) {
      errors.push(
        createValidationError(
          `query.${key}`,
          `Unsupported query parameter: ${key}`,
          "UNKNOWN_QUERY_PARAMETER"
        )
      );
    }
  }

  if (
    req.query?.section !==
    undefined
  ) {
    const section =
      normalizeSection(
        req.query.section
      );

    if (
      !PUBLIC_SETTINGS_SECTIONS.includes(
        section
      )
    ) {
      errors.push(
        createValidationError(
          "query.section",
          `section must be one of: ${PUBLIC_SETTINGS_SECTIONS.join(
            ", "
          )}`,
          "INVALID_SETTINGS_SECTION"
        )
      );
    } else {
      req.query.section = section;
    }
  }

  if (errors.length > 0) {
    return sendValidationError(
      res,
      errors,
      "Invalid settings query"
    );
  }

  return next();
};

/* =========================================================
   SECTION-SPECIFIC VALIDATOR FACTORY

   Can be used when routes are separated by section.

   Example:

   router.patch(
     "/general",
     validateGeneralSettings,
     controller.updateGeneral
   );
========================================================= */

const createSectionValidator = (
  section
) =>
  (
    req,
    res,
    next
  ) => {
    if (!isPlainObject(req.body)) {
      return sendBadRequest(
        res,
        "Request body must be a JSON object",
        "INVALID_SETTINGS_BODY"
      );
    }

    const unsafeErrors =
      rejectUnsafeDeepKeys(req.body);

    if (unsafeErrors.length > 0) {
      return sendValidationError(
        res,
        unsafeErrors
      );
    }

    removeForbiddenRootFields(
      req.body
    );

    const errors = [];

    validateNotEmptyUpdate(
      req.body,
      section,
      errors
    );

    validateSectionPayload(
      section,
      req.body,
      errors
    );

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors
      );
    }

    return next();
  };

/* =========================================================
   SECTION-SPECIFIC MIDDLEWARES
========================================================= */

const validateGeneralSettings =
  createSectionValidator("general");

const validateBrandingSettings =
  createSectionValidator("branding");

const validateOrderSettings =
  createSectionValidator("orders");

const validateInventorySettings =
  createSectionValidator("inventory");

const validateNotificationSettings =
  createSectionValidator(
    "notifications"
  );

const validateSecuritySettings =
  createSectionValidator("security");

const validateUserSettings =
  createSectionValidator("users");

const validateBillingSettings =
  createSectionValidator("billing");

const validateIntegrationSettings =
  createSectionValidator(
    "integrations"
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  PUBLIC_SETTINGS_SECTIONS,
  OWNER_ONLY_SECTION,
  ALL_SETTINGS_SECTIONS,

  validateGetSettingsQuery,

  validateSettingsSectionParam,
  validatePublicSettingsSectionParam,

  validateUpdateSettings,
  validateUpdateSettingsSection,
  validateUpdateOwnerOnlySettings,

  validateGeneralSettings,
  validateBrandingSettings,
  validateOrderSettings,
  validateInventorySettings,
  validateNotificationSettings,
  validateSecuritySettings,
  validateUserSettings,
  validateBillingSettings,
  validateIntegrationSettings,
};