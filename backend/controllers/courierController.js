"use strict";

const mongoose = require("mongoose");

const Courier = require("../models/Courier");

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_PROVIDER_TYPES = [
  "manual",
  "pathao",
  "steadfast",
  "redx",
  "paperfly",
  "custom",
];

const ALLOWED_DELIVERY_TYPES = [
  "regular",
  "express",
  "same_day",
];

const CREDENTIAL_FIELDS = [
  "apiKey",
  "apiSecret",
  "clientId",
  "clientSecret",
  "username",
  "password",
];

/* =========================================================
   COMMON HELPERS
========================================================= */

const hasOwn = (object, property) =>
  Object.prototype.hasOwnProperty.call(
    object,
    property
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

const normalizeCourierCode = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/\s+/g, "-");

const escapeRegExp = (value) =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

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

const parsePositiveInteger = (
  value,
  fallback,
  maximum
) => {
  const parsedValue = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsedValue,
    maximum
  );
};

const getCurrentUserId = (req) =>
  req.user?._id || null;

/*
  Tenant must always come from authenticated server context.
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
  message = "Courier not found"
) =>
  res.status(404).json({
    success: false,
    message,
  });

/* =========================================================
   SANITIZE CREDENTIALS

   - Only approved fields are accepted.
   - During update, blank values are ignored so existing
     credentials are not accidentally erased.
========================================================= */

const sanitizeCredentials = (
  credentials,
  { ignoreBlankValues = false } = {}
) => {
  if (
    !credentials ||
    typeof credentials !== "object" ||
    Array.isArray(credentials)
  ) {
    return undefined;
  }

  const sanitizedCredentials = {};

  for (const field of CREDENTIAL_FIELDS) {
    if (!hasOwn(credentials, field)) {
      continue;
    }

    const value =
      typeof credentials[field] ===
      "string"
        ? credentials[field].trim()
        : "";

    if (
      ignoreBlankValues &&
      !value
    ) {
      continue;
    }

    sanitizedCredentials[field] =
      value;
  }

  return Object.keys(
    sanitizedCredentials
  ).length
    ? sanitizedCredentials
    : undefined;
};

/* =========================================================
   SANITIZE SETTINGS
========================================================= */

const sanitizeSettings = (
  settings
) => {
  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings)
  ) {
    return undefined;
  }

  const sanitizedSettings = {};

  if (
    hasOwn(
      settings,
      "merchantStoreId"
    )
  ) {
    sanitizedSettings.merchantStoreId =
      normalizeString(
        settings.merchantStoreId
      );
  }

  if (
    hasOwn(
      settings,
      "defaultDeliveryType"
    )
  ) {
    const deliveryType =
      normalizeString(
        settings.defaultDeliveryType
      ).toLowerCase();

    if (
      !ALLOWED_DELIVERY_TYPES.includes(
        deliveryType
      )
    ) {
      throw new Error(
        "Invalid default delivery type"
      );
    }

    sanitizedSettings.defaultDeliveryType =
      deliveryType;
  }

  if (
    hasOwn(
      settings,
      "autoBookShipment"
    )
  ) {
    const autoBookShipment =
      parseBoolean(
        settings.autoBookShipment
      );

    if (
      typeof autoBookShipment !==
      "boolean"
    ) {
      throw new Error(
        "autoBookShipment must be true or false"
      );
    }

    sanitizedSettings.autoBookShipment =
      autoBookShipment;
  }

  if (
    hasOwn(
      settings,
      "enableStatusSync"
    )
  ) {
    const enableStatusSync =
      parseBoolean(
        settings.enableStatusSync
      );

    if (
      typeof enableStatusSync !==
      "boolean"
    ) {
      throw new Error(
        "enableStatusSync must be true or false"
      );
    }

    sanitizedSettings.enableStatusSync =
      enableStatusSync;
  }

  return Object.keys(
    sanitizedSettings
  ).length
    ? sanitizedSettings
    : undefined;
};

/* =========================================================
   ERROR HANDLER
========================================================= */

const handleCourierError = (
  error,
  res
) => {
  console.error(
    "Courier controller error:",
    error
  );

  if (error?.code === 11000) {
    const keyPattern =
      error.keyPattern || {};

    if (keyPattern.code) {
      return res.status(409).json({
        success: false,
        message:
          "A courier with this code already exists for this tenant",
      });
    }

    if (keyPattern.isDefault) {
      return res.status(409).json({
        success: false,
        message:
          "Only one default courier is allowed for this tenant",
      });
    }

    const duplicateField =
      Object.keys(keyPattern)[0] ||
      "value";

    return res.status(409).json({
      success: false,
      message:
        `Duplicate ${duplicateField} is not allowed`,
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
        "Courier validation failed",
    });
  }

  if (
    error instanceof
    mongoose.Error.CastError
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid courier ID",
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
   CREATE COURIER

   POST /api/couriers
========================================================= */

const createCourier = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const name = normalizeString(
      req.body.name
    );

    const code =
      normalizeCourierCode(
        req.body.code
      );

    const providerType =
      normalizeString(
        req.body.providerType,
        "manual"
      ).toLowerCase();

    if (!name) {
      return sendValidationError(
        res,
        "Courier name is required"
      );
    }

    if (!code) {
      return sendValidationError(
        res,
        "Courier code is required"
      );
    }

    if (
      !ALLOWED_PROVIDER_TYPES.includes(
        providerType
      )
    ) {
      return sendValidationError(
        res,
        "Invalid courier provider type"
      );
    }

    const existingCourier =
      await Courier.findOne({
        tenant: tenantId,
        code,
      })
        .select("_id")
        .lean();

    if (existingCourier) {
      return res.status(409).json({
        success: false,
        message:
          "A courier with this code already exists for this tenant",
      });
    }

    const isActive =
      parseBoolean(
        req.body.isActive
      );

    const isDefault =
      parseBoolean(
        req.body.isDefault
      );

    const credentials =
      sanitizeCredentials(
        req.body.credentials
      );

    const settings =
      sanitizeSettings(
        req.body.settings
      );

    const courierPayload = {
      tenant: tenantId,
      name,
      code,
      providerType,

      logo: normalizeString(
        req.body.logo
      ),

      website: normalizeString(
        req.body.website
      ),

      supportPhone:
        normalizeString(
          req.body.supportPhone
        ),

      supportEmail:
        normalizeString(
          req.body.supportEmail
        ).toLowerCase(),

      apiBaseUrl:
        normalizeString(
          req.body.apiBaseUrl
        ),

      isActive:
        typeof isActive ===
        "boolean"
          ? isActive
          : true,

      isDefault:
        typeof isDefault ===
        "boolean"
          ? isDefault
          : false,

      createdBy:
        getCurrentUserId(req),

      updatedBy:
        getCurrentUserId(req),
    };

    if (credentials) {
      courierPayload.credentials =
        credentials;
    }

    if (settings) {
      courierPayload.settings =
        settings;
    }

    if (
      courierPayload.isDefault &&
      !courierPayload.isActive
    ) {
      return sendValidationError(
        res,
        "An inactive courier cannot be set as default"
      );
    }

    if (courierPayload.isDefault) {
      await Courier.updateMany(
        {
          tenant: tenantId,
          isDefault: true,
        },
        {
          $set: {
            isDefault: false,
            updatedBy:
              getCurrentUserId(req),
          },
        }
      );
    }

    const courier =
      await Courier.create(
        courierPayload
      );

    return res.status(201).json({
      success: true,
      message:
        "Courier created successfully",
      data: {
        courier,
      },
    });
  } catch (error) {
    return handleCourierError(
      error,
      res
    );
  }
};

/* =========================================================
   GET ALL COURIERS

   GET /api/couriers
========================================================= */

const getCouriers = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const page =
      parsePositiveInteger(
        req.query.page,
        1,
        100000
      );

    const limit =
      parsePositiveInteger(
        req.query.limit,
        20,
        100
      );

    const skip =
      (page - 1) * limit;

    const filter = {
      tenant: tenantId,
    };

    const search =
      normalizeString(
        req.query.search
      );

    const providerType =
      normalizeString(
        req.query.providerType
      ).toLowerCase();

    const isActive =
      parseBoolean(
        req.query.isActive
      );

    const isDefault =
      parseBoolean(
        req.query.isDefault
      );

    if (search) {
      const safeSearch =
        escapeRegExp(search);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          code: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          supportEmail: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          supportPhone: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    if (providerType) {
      if (
        !ALLOWED_PROVIDER_TYPES.includes(
          providerType
        )
      ) {
        return sendValidationError(
          res,
          "Invalid courier provider type"
        );
      }

      filter.providerType =
        providerType;
    }

    if (
      typeof isActive ===
      "boolean"
    ) {
      filter.isActive =
        isActive;
    }

    if (
      typeof isDefault ===
      "boolean"
    ) {
      filter.isDefault =
        isDefault;
    }

    const [
      couriers,
      totalCouriers,
    ] = await Promise.all([
      Courier.find(filter)
        .sort({
          isDefault: -1,
          isActive: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Courier.countDocuments(
        filter
      ),
    ]);

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalCouriers / limit
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Couriers retrieved successfully",
      data: {
        couriers,
        pagination: {
          page,
          limit,
          totalCouriers,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1,
        },
      },
    });
  } catch (error) {
    return handleCourierError(
      error,
      res
    );
  }
};

/* =========================================================
   GET SINGLE COURIER

   GET /api/couriers/:courierId
========================================================= */

const getCourierById = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { courierId } =
      req.params;

    if (
      !isValidObjectId(
        courierId
      )
    ) {
      return sendValidationError(
        res,
        "Invalid courier ID"
      );
    }

    const courier =
      await Courier.findOne({
        _id: courierId,
        tenant: tenantId,
      }).lean();

    if (!courier) {
      return sendNotFoundError(
        res
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Courier retrieved successfully",
      data: {
        courier,
      },
    });
  } catch (error) {
    return handleCourierError(
      error,
      res
    );
  }
};

/* =========================================================
   UPDATE COURIER

   PUT /api/couriers/:courierId
========================================================= */

const updateCourier = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { courierId } =
      req.params;

    if (
      !isValidObjectId(
        courierId
      )
    ) {
      return sendValidationError(
        res,
        "Invalid courier ID"
      );
    }

    const courier =
      await Courier.findOne({
        _id: courierId,
        tenant: tenantId,
      }).select(
        [
          "+credentials",
          "+credentials.apiKey",
          "+credentials.apiSecret",
          "+credentials.clientId",
          "+credentials.clientSecret",
          "+credentials.username",
          "+credentials.password",
        ].join(" ")
      );

    if (!courier) {
      return sendNotFoundError(
        res
      );
    }

    if (
      hasOwn(
        req.body,
        "code"
      )
    ) {
      const requestedCode =
        normalizeCourierCode(
          req.body.code
        );

      if (
        requestedCode !==
        courier.code
      ) {
        return sendValidationError(
          res,
          "Courier code cannot be changed"
        );
      }
    }

    if (
      hasOwn(
        req.body,
        "name"
      )
    ) {
      const name =
        normalizeString(
          req.body.name
        );

      if (!name) {
        return sendValidationError(
          res,
          "Courier name cannot be empty"
        );
      }

      courier.name = name;
    }

    if (
      hasOwn(
        req.body,
        "providerType"
      )
    ) {
      const providerType =
        normalizeString(
          req.body.providerType
        ).toLowerCase();

      if (
        !ALLOWED_PROVIDER_TYPES.includes(
          providerType
        )
      ) {
        return sendValidationError(
          res,
          "Invalid courier provider type"
        );
      }

      courier.providerType =
        providerType;
    }

    const stringFields = [
      "logo",
      "website",
      "supportPhone",
      "apiBaseUrl",
    ];

    for (const field of stringFields) {
      if (
        hasOwn(
          req.body,
          field
        )
      ) {
        courier[field] =
          normalizeString(
            req.body[field]
          );
      }
    }

    if (
      hasOwn(
        req.body,
        "supportEmail"
      )
    ) {
      courier.supportEmail =
        normalizeString(
          req.body.supportEmail
        ).toLowerCase();
    }

    if (
      hasOwn(
        req.body,
        "credentials"
      )
    ) {
      const credentials =
        sanitizeCredentials(
          req.body.credentials,
          {
            ignoreBlankValues: true,
          }
        );

      if (credentials) {
        courier.credentials =
          courier.credentials || {};

        for (const [
          field,
          value,
        ] of Object.entries(
          credentials
        )) {
          courier.credentials[field] =
            value;
        }

        courier.markModified(
          "credentials"
        );
      }
    }

    if (
      hasOwn(
        req.body,
        "settings"
      )
    ) {
      const settings =
        sanitizeSettings(
          req.body.settings
        );

      if (settings) {
        courier.settings =
          courier.settings || {};

        for (const [
          field,
          value,
        ] of Object.entries(
          settings
        )) {
          courier.settings[field] =
            value;
        }

        courier.markModified(
          "settings"
        );
      }
    }

    if (
      hasOwn(
        req.body,
        "isActive"
      )
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

      courier.isActive =
        isActive;

      if (!isActive) {
        courier.isDefault =
          false;
      }
    }

    if (
      hasOwn(
        req.body,
        "isDefault"
      )
    ) {
      const isDefault =
        parseBoolean(
          req.body.isDefault
        );

      if (
        typeof isDefault !==
        "boolean"
      ) {
        return sendValidationError(
          res,
          "isDefault must be true or false"
        );
      }

      if (
        isDefault &&
        !courier.isActive
      ) {
        return sendValidationError(
          res,
          "An inactive courier cannot be set as default"
        );
      }

      if (isDefault) {
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
              updatedBy:
                getCurrentUserId(req),
            },
          }
        );
      }

      courier.isDefault =
        isDefault;
    }

    courier.updatedBy =
      getCurrentUserId(req);

    await courier.save();

    return res.status(200).json({
      success: true,
      message:
        "Courier updated successfully",
      data: {
        courier,
      },
    });
  } catch (error) {
    return handleCourierError(
      error,
      res
    );
  }
};

/* =========================================================
   TOGGLE COURIER STATUS

   PATCH /api/couriers/:courierId/status
========================================================= */

const toggleCourierStatus =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req, res);

      if (!tenantId) {
        return;
      }

      const { courierId } =
        req.params;

      if (
        !isValidObjectId(
          courierId
        )
      ) {
        return sendValidationError(
          res,
          "Invalid courier ID"
        );
      }

      const courier =
        await Courier.findOne({
          _id: courierId,
          tenant: tenantId,
        });

      if (!courier) {
        return sendNotFoundError(
          res
        );
      }

      const requestedStatus =
        parseBoolean(
          req.body.isActive
        );

      const nextStatus =
        typeof requestedStatus ===
        "boolean"
          ? requestedStatus
          : !courier.isActive;

      courier.isActive =
        nextStatus;

      if (!nextStatus) {
        courier.isDefault =
          false;
      }

      courier.updatedBy =
        getCurrentUserId(req);

      await courier.save();

      return res.status(200).json({
        success: true,
        message: nextStatus
          ? "Courier activated successfully"
          : "Courier deactivated successfully",
        data: {
          courier,
        },
      });
    } catch (error) {
      return handleCourierError(
        error,
        res
      );
    }
  };

/* =========================================================
   SET DEFAULT COURIER

   PATCH /api/couriers/:courierId/default
========================================================= */

const setDefaultCourier =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req, res);

      if (!tenantId) {
        return;
      }

      const { courierId } =
        req.params;

      if (
        !isValidObjectId(
          courierId
        )
      ) {
        return sendValidationError(
          res,
          "Invalid courier ID"
        );
      }

      const courier =
        await Courier.findOne({
          _id: courierId,
          tenant: tenantId,
        });

      if (!courier) {
        return sendNotFoundError(
          res
        );
      }

      if (!courier.isActive) {
        return sendValidationError(
          res,
          "Inactive courier cannot be set as default"
        );
      }

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
            updatedBy:
              getCurrentUserId(req),
          },
        }
      );

      courier.isDefault = true;
      courier.updatedBy =
        getCurrentUserId(req);

      await courier.save();

      return res.status(200).json({
        success: true,
        message:
          "Default courier updated successfully",
        data: {
          courier,
        },
      });
    } catch (error) {
      return handleCourierError(
        error,
        res
      );
    }
  };

/* =========================================================
   DELETE COURIER

   DELETE /api/couriers/:courierId
========================================================= */

const deleteCourier = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { courierId } =
      req.params;

    if (
      !isValidObjectId(
        courierId
      )
    ) {
      return sendValidationError(
        res,
        "Invalid courier ID"
      );
    }

    const courier =
      await Courier.findOne({
        _id: courierId,
        tenant: tenantId,
      });

    if (!courier) {
      return sendNotFoundError(
        res
      );
    }

    await courier.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Courier deleted successfully",
      data: {
        deletedCourierId:
          courier._id,
      },
    });
  } catch (error) {
    return handleCourierError(
      error,
      res
    );
  }
};

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  createCourier,
  getCouriers,
  getCourierById,
  updateCourier,
  toggleCourierStatus,
  setDefaultCourier,
  deleteCourier,
};
