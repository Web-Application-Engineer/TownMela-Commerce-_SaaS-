"use strict";

const mongoose = require("mongoose");

const Courier = require("../models/Courier");
const CourierSetting = require("../models/CourierSetting");

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_DELIVERY_TYPES = [
  "regular",
  "express",
  "same_day",
];

const ALLOWED_AUTO_BOOK_STATUSES = [
  "confirmed",
  "processing",
  "ready_to_ship",
];

const ALLOWED_COD_FEE_TYPES = [
  "none",
  "fixed",
  "percentage",
];

const BOOLEAN_FIELDS = new Set([
  "autoBookShipment",
  "preventDuplicateBooking",
  "fallbackToDefaultCourier",
  "autoPrintLabel",
  "enabled",
  "updateOrderStatus",
  "markDeliveredOrdersPaid",
  "syncOnlyActiveShipments",
  "includeDeliveryChargeInCod",
  "allowZeroCodAmount",
  "chargeCustomer",
  "deductFromRefund",
  "recordAsBusinessExpense",
  "requireDistrict",
  "requireArea",
  "requirePostalCode",
  "requireCustomerPhone",
  "normalizeBangladeshPhone",
  "notifyOnBookingFailure",
  "notifyOnStatusSyncFailure",
  "notifyOnDelivery",
  "notifyOnReturn",
  "isActive",
]);

/* =========================================================
   COMMON HELPERS
========================================================= */

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(
    object,
    property
  );

const isPlainObject = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(
    String(value || "")
  );

const normalizeString = (
  value,
  fallback = ""
) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
};

const parseNonNegativeNumber = (
  value,
  fieldLabel
) => {
  if (
    value === "" ||
    value === null ||
    typeof value === "undefined"
  ) {
    return 0;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    throw new Error(
      `${fieldLabel} must be a non-negative number`
    );
  }

  return parsedValue;
};

const parseIntegerInRange = (
  value,
  fieldLabel,
  minimum,
  maximum
) => {
  const parsedValue = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `${fieldLabel} must be between ${minimum} and ${maximum}`
    );
  }

  return parsedValue;
};

const getCurrentUserId = (req) =>
  req.user?._id || null;

/*
  Tenant must come only from authenticated server context.
  Never accept tenant from req.body, req.query or req.params.
*/
const getTenantId = (req) =>
  req.tenantId ||
  req.user?.tenant?._id ||
  req.user?.tenant ||
  req.user?.tenantId?._id ||
  req.user?.tenantId ||
  null;

const resolveTenantId = (req, res) => {
  const tenantId = getTenantId(req);

  if (
    !tenantId ||
    !isValidObjectId(tenantId)
  ) {
    res.status(403).json({
      success: false,
      message:
        "Valid tenant context is required",
    });

    return null;
  }

  return tenantId;
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendValidationError = (
  res,
  message
) =>
  res.status(400).json({
    success: false,
    message,
  });

const sendNotFoundError = (
  res,
  message
) =>
  res.status(404).json({
    success: false,
    message,
  });

/* =========================================================
   SANITIZERS
========================================================= */

const sanitizeAutomation = (
  automation
) => {
  if (!isPlainObject(automation)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of [
    "autoBookShipment",
    "preventDuplicateBooking",
    "fallbackToDefaultCourier",
    "autoPrintLabel",
  ]) {
    if (!hasOwn(automation, field)) {
      continue;
    }

    const parsedValue =
      parseBoolean(automation[field]);

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  if (
    hasOwn(
      automation,
      "autoBookOnStatus"
    )
  ) {
    const status = normalizeString(
      automation.autoBookOnStatus
    ).toLowerCase();

    if (
      !ALLOWED_AUTO_BOOK_STATUSES.includes(
        status
      )
    ) {
      throw new Error(
        "Invalid auto-book order status"
      );
    }

    sanitized.autoBookOnStatus =
      status;
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeStatusSync = (
  statusSync
) => {
  if (!isPlainObject(statusSync)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of [
    "enabled",
    "updateOrderStatus",
    "markDeliveredOrdersPaid",
    "syncOnlyActiveShipments",
  ]) {
    if (!hasOwn(statusSync, field)) {
      continue;
    }

    const parsedValue =
      parseBoolean(statusSync[field]);

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  if (
    hasOwn(
      statusSync,
      "intervalMinutes"
    )
  ) {
    sanitized.intervalMinutes =
      parseIntegerInRange(
        statusSync.intervalMinutes,
        "Status sync interval",
        5,
        1440
      );
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeCod = (cod) => {
  if (!isPlainObject(cod)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of [
    "enabled",
    "includeDeliveryChargeInCod",
    "allowZeroCodAmount",
  ]) {
    if (!hasOwn(cod, field)) {
      continue;
    }

    const parsedValue =
      parseBoolean(cod[field]);

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  if (
    hasOwn(cod, "maximumCodAmount")
  ) {
    sanitized.maximumCodAmount =
      parseNonNegativeNumber(
        cod.maximumCodAmount,
        "Maximum COD amount"
      );
  }

  if (hasOwn(cod, "codFeeType")) {
    const codFeeType =
      normalizeString(
        cod.codFeeType
      ).toLowerCase();

    if (
      !ALLOWED_COD_FEE_TYPES.includes(
        codFeeType
      )
    ) {
      throw new Error(
        "Invalid COD fee type"
      );
    }

    sanitized.codFeeType =
      codFeeType;
  }

  if (hasOwn(cod, "codFeeValue")) {
    sanitized.codFeeValue =
      parseNonNegativeNumber(
        cod.codFeeValue,
        "COD fee value"
      );
  }

  const effectiveFeeType =
    sanitized.codFeeType ||
    cod.codFeeType;

  const effectiveFeeValue =
    hasOwn(sanitized, "codFeeValue")
      ? sanitized.codFeeValue
      : Number(cod.codFeeValue || 0);

  if (
    effectiveFeeType ===
      "percentage" &&
    effectiveFeeValue > 100
  ) {
    throw new Error(
      "Percentage-based COD fee cannot exceed 100"
    );
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeDeliveryCharge = (
  deliveryCharge
) => {
  if (!isPlainObject(deliveryCharge)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of [
    "enabled",
    "chargeCustomer",
  ]) {
    if (
      !hasOwn(
        deliveryCharge,
        field
      )
    ) {
      continue;
    }

    const parsedValue =
      parseBoolean(
        deliveryCharge[field]
      );

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  const numericFields = {
    insideDhaka:
      "Inside Dhaka delivery charge",
    dhakaSubArea:
      "Dhaka sub-area delivery charge",
    outsideDhaka:
      "Outside Dhaka delivery charge",
    sameDaySurcharge:
      "Same-day surcharge",
    expressSurcharge:
      "Express surcharge",
    freeDeliveryThreshold:
      "Free delivery threshold",
  };

  for (const [
    field,
    label,
  ] of Object.entries(
    numericFields
  )) {
    if (
      hasOwn(
        deliveryCharge,
        field
      )
    ) {
      sanitized[field] =
        parseNonNegativeNumber(
          deliveryCharge[field],
          label
        );
    }
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeReturnCharge = (
  returnCharge
) => {
  if (!isPlainObject(returnCharge)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of [
    "enabled",
    "deductFromRefund",
    "recordAsBusinessExpense",
  ]) {
    if (
      !hasOwn(
        returnCharge,
        field
      )
    ) {
      continue;
    }

    const parsedValue =
      parseBoolean(
        returnCharge[field]
      );

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  if (
    hasOwn(
      returnCharge,
      "reverseDeliveryCharge"
    )
  ) {
    sanitized.reverseDeliveryCharge =
      parseNonNegativeNumber(
        returnCharge.reverseDeliveryCharge,
        "Reverse delivery charge"
      );
  }

  if (
    hasOwn(
      returnCharge,
      "redeliveryCharge"
    )
  ) {
    sanitized.redeliveryCharge =
      parseNonNegativeNumber(
        returnCharge.redeliveryCharge,
        "Redelivery charge"
      );
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeBooleanSection = (
  section,
  fields
) => {
  if (!isPlainObject(section)) {
    return undefined;
  }

  const sanitized = {};

  for (const field of fields) {
    if (!hasOwn(section, field)) {
      continue;
    }

    const parsedValue =
      parseBoolean(section[field]);

    if (
      typeof parsedValue !==
      "boolean"
    ) {
      throw new Error(
        `${field} must be true or false`
      );
    }

    sanitized[field] = parsedValue;
  }

  return Object.keys(sanitized).length
    ? sanitized
    : undefined;
};

const sanitizeAddressValidation = (
  addressValidation
) =>
  sanitizeBooleanSection(
    addressValidation,
    [
      "requireDistrict",
      "requireArea",
      "requirePostalCode",
      "requireCustomerPhone",
      "normalizeBangladeshPhone",
    ]
  );

const sanitizeNotifications = (
  notifications
) =>
  sanitizeBooleanSection(
    notifications,
    [
      "notifyOnBookingFailure",
      "notifyOnStatusSyncFailure",
      "notifyOnDelivery",
      "notifyOnReturn",
    ]
  );

/* =========================================================
   SETTINGS HELPERS
========================================================= */

const getOrCreateSettings = async (
  tenantId,
  userId
) => {
  let settings =
    await CourierSetting.findOne({
      tenant: tenantId,
    });

  if (settings) {
    return {
      settings,
      created: false,
    };
  }

  const defaultCourier =
    await Courier.findOne({
      tenant: tenantId,
      isActive: true,
      isDefault: true,
    })
      .select("_id")
      .lean();

  try {
    settings =
      await CourierSetting.create({
        tenant: tenantId,
        defaultCourier:
          defaultCourier?._id ||
          null,
        createdBy: userId,
        updatedBy: userId,
      });

    return {
      settings,
      created: true,
    };
  } catch (error) {
    /*
      Concurrent first requests may both attempt initialization.
      The unique tenant index guarantees a single settings row.
    */
    if (error?.code === 11000) {
      settings =
        await CourierSetting.findOne({
          tenant: tenantId,
        });

      return {
        settings,
        created: false,
      };
    }

    throw error;
  }
};

const ensureCourierBelongsToTenant =
  async (
    courierId,
    tenantId,
    {
      requireActive = false,
    } = {}
  ) => {
    if (!isValidObjectId(courierId)) {
      throw new Error(
        "Invalid courier ID"
      );
    }

    const filter = {
      _id: courierId,
      tenant: tenantId,
    };

    if (requireActive) {
      filter.isActive = true;
    }

    return Courier.findOne(filter);
  };

const synchronizeDefaultCourier =
  async (
    courier,
    tenantId,
    userId
  ) => {
    await Courier.updateMany(
      {
        tenant: tenantId,
        _id: {
          $ne: courier._id,
        },
        isDefault: true,
      },
      {
        $set: {
          isDefault: false,
          updatedBy: userId,
        },
      }
    );

    if (!courier.isDefault) {
      courier.isDefault = true;
      courier.updatedBy = userId;
      await courier.save();
    }
  };

const applyNestedSection = (
  document,
  path,
  values
) => {
  if (!values) {
    return;
  }

  document[path] =
    document[path] || {};

  for (const [
    field,
    value,
  ] of Object.entries(values)) {
    document[path][field] =
      value;
  }

  document.markModified(path);
};

/* =========================================================
   ERROR HANDLER
========================================================= */

const handleCourierSettingError = (
  error,
  res
) => {
  console.error(
    "Courier setting controller error:",
    error
  );

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Courier settings already exist for this tenant",
    });
  }

  if (
    error instanceof
    mongoose.Error.ValidationError
  ) {
    const firstError =
      Object.values(
        error.errors
      )[0];

    return res.status(400).json({
      success: false,
      message:
        firstError?.message ||
        "Courier settings validation failed",
    });
  }

  if (
    error instanceof
    mongoose.Error.CastError
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier",
    });
  }

  const validationMessages = [
    "Invalid courier ID",
    "Invalid default delivery type",
    "Invalid auto-book order status",
    "Invalid COD fee type",
  ];

  if (
    validationMessages.includes(
      error?.message
    ) ||
    /must be/.test(
      error?.message || ""
    ) ||
    /cannot exceed/.test(
      error?.message || ""
    )
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message:
      error?.message ||
      "Internal server error",
  });
};

/* =========================================================
   GET / INITIALIZE COURIER SETTINGS

   GET /api/courier-settings
========================================================= */

const getCourierSettings = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { settings, created } =
      await getOrCreateSettings(
        tenantId,
        getCurrentUserId(req)
      );

    await settings.populate({
      path: "defaultCourier",
      select:
        "name code providerType logo isActive isDefault",
    });

    return res.status(
      created ? 201 : 200
    ).json({
      success: true,
      message: created
        ? "Courier settings initialized successfully"
        : "Courier settings retrieved successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    return handleCourierSettingError(
      error,
      res
    );
  }
};

/* =========================================================
   UPDATE COURIER SETTINGS

   PUT /api/courier-settings
========================================================= */

const updateCourierSettings = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { settings } =
      await getOrCreateSettings(
        tenantId,
        getCurrentUserId(req)
      );

    if (
      hasOwn(
        req.body,
        "defaultDeliveryType"
      )
    ) {
      const deliveryType =
        normalizeString(
          req.body.defaultDeliveryType
        ).toLowerCase();

      if (
        !ALLOWED_DELIVERY_TYPES.includes(
          deliveryType
        )
      ) {
        return sendValidationError(
          res,
          "Invalid default delivery type"
        );
      }

      settings.defaultDeliveryType =
        deliveryType;
    }

    if (
      hasOwn(req.body, "isActive")
    ) {
      const isActive =
        parseBoolean(
          req.body.isActive
        );

      if (
        typeof isActive !==
        "boolean"
      ) {
        return sendValidationError(
          res,
          "isActive must be true or false"
        );
      }

      settings.isActive =
        isActive;
    }

    if (
      hasOwn(
        req.body,
        "defaultCourier"
      )
    ) {
      const requestedCourierId =
        req.body.defaultCourier;

      if (
        requestedCourierId === null ||
        requestedCourierId === ""
      ) {
        settings.defaultCourier =
          null;
      } else {
        const courier =
          await ensureCourierBelongsToTenant(
            requestedCourierId,
            tenantId,
            {
              requireActive: true,
            }
          );

        if (!courier) {
          return sendNotFoundError(
            res,
            "Active courier not found for this tenant"
          );
        }

        await synchronizeDefaultCourier(
          courier,
          tenantId,
          getCurrentUserId(req)
        );

        settings.defaultCourier =
          courier._id;
      }
    }

    applyNestedSection(
      settings,
      "automation",
      sanitizeAutomation(
        req.body.automation
      )
    );

    applyNestedSection(
      settings,
      "statusSync",
      sanitizeStatusSync(
        req.body.statusSync
      )
    );

    applyNestedSection(
      settings,
      "cod",
      sanitizeCod(req.body.cod)
    );

    applyNestedSection(
      settings,
      "deliveryCharge",
      sanitizeDeliveryCharge(
        req.body.deliveryCharge
      )
    );

    applyNestedSection(
      settings,
      "returnCharge",
      sanitizeReturnCharge(
        req.body.returnCharge
      )
    );

    applyNestedSection(
      settings,
      "addressValidation",
      sanitizeAddressValidation(
        req.body.addressValidation
      )
    );

    applyNestedSection(
      settings,
      "notifications",
      sanitizeNotifications(
        req.body.notifications
      )
    );

    if (
      settings.statusSync.enabled &&
      !settings.isActive
    ) {
      return sendValidationError(
        res,
        "Status sync cannot be enabled while courier settings are inactive"
      );
    }

    if (
      settings.automation.autoBookShipment &&
      !settings.defaultCourier
    ) {
      return sendValidationError(
        res,
        "A default courier is required before enabling automatic shipment booking"
      );
    }

    settings.updatedBy =
      getCurrentUserId(req);

    await settings.save();

    await settings.populate({
      path: "defaultCourier",
      select:
        "name code providerType logo isActive isDefault",
    });

    return res.status(200).json({
      success: true,
      message:
        "Courier settings updated successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    return handleCourierSettingError(
      error,
      res
    );
  }
};

/* =========================================================
   SET DEFAULT COURIER

   PATCH /api/courier-settings/default-courier
========================================================= */

const setDefaultCourierSetting =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req, res);

      if (!tenantId) {
        return;
      }

      const courierId =
        req.body.courierId ||
        req.body.defaultCourier;

      if (!courierId) {
        return sendValidationError(
          res,
          "Courier ID is required"
        );
      }

      const courier =
        await ensureCourierBelongsToTenant(
          courierId,
          tenantId,
          {
            requireActive: true,
          }
        );

      if (!courier) {
        return sendNotFoundError(
          res,
          "Active courier not found for this tenant"
        );
      }

      const { settings } =
        await getOrCreateSettings(
          tenantId,
          getCurrentUserId(req)
        );

      await synchronizeDefaultCourier(
        courier,
        tenantId,
        getCurrentUserId(req)
      );

      settings.defaultCourier =
        courier._id;
      settings.updatedBy =
        getCurrentUserId(req);

      await settings.save();

      await settings.populate({
        path: "defaultCourier",
        select:
          "name code providerType logo isActive isDefault",
      });

      return res.status(200).json({
        success: true,
        message:
          "Default courier updated successfully",
        data: {
          settings,
        },
      });
    } catch (error) {
      return handleCourierSettingError(
        error,
        res
      );
    }
  };

/* =========================================================
   RESET COURIER SETTINGS

   POST /api/courier-settings/reset

   Keeps the tenant record and current valid default courier,
   while restoring all business rules to schema defaults.
========================================================= */

const resetCourierSettings = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const existingSettings =
      await CourierSetting.findOne({
        tenant: tenantId,
      });

    const activeDefaultCourier =
      await Courier.findOne({
        tenant: tenantId,
        isActive: true,
        isDefault: true,
      })
        .select("_id")
        .lean();

    const defaultCourierId =
      activeDefaultCourier?._id ||
      existingSettings?.defaultCourier ||
      null;

    if (existingSettings) {
      await existingSettings.deleteOne();
    }

    const settings =
      await CourierSetting.create({
        tenant: tenantId,
        defaultCourier:
          defaultCourierId,
        createdBy:
          existingSettings?.createdBy ||
          getCurrentUserId(req),
        updatedBy:
          getCurrentUserId(req),
      });

    await settings.populate({
      path: "defaultCourier",
      select:
        "name code providerType logo isActive isDefault",
    });

    return res.status(200).json({
      success: true,
      message:
        "Courier settings reset successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    return handleCourierSettingError(
      error,
      res
    );
  }
};

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  getCourierSettings,
  updateCourierSettings,
  setDefaultCourierSetting,
  resetCourierSettings,
};
