"use strict";

const mongoose = require("mongoose");

const CheckoutSetting = require(
  "../models/CheckoutSetting"
);

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
  } = {}
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res
    .status(statusCode)
    .json(response);
};

const sendError = (
  res,
  error
) => {
  const statusCode =
    Number.isInteger(
      error?.statusCode
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  if (statusCode === 500) {
    console.error(
      "Checkout setting controller error:",
      error
    );
  }

  return res
    .status(statusCode)
    .json({
      success: false,
      message:
        statusCode === 500
          ? "Internal server error"
          : error?.message ||
            "Request failed",
    });
};

/* =========================================================
   HELPERS
========================================================= */

const createControllerError = (
  message,
  statusCode = 400
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const resolveTenantId = (
  req
) => {
  const tenantId =
    req.tenantId ||
    req.tenant?._id ||
    req.tenant?.id ||
    req.user?.tenantId ||
    req.user?.tenant ||
    req.admin?.tenantId ||
    req.admin?.tenant ||
    req.get(
      "X-Tenant-Id"
    ) ||
    "";

  const normalizedTenantId =
    String(
      tenantId || ""
    ).trim();

  if (
    !normalizedTenantId
  ) {
    throw createControllerError(
      "Tenant context is required",
      400
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      normalizedTenantId
    )
  ) {
    throw createControllerError(
      "Invalid tenant ID",
      400
    );
  }

  return normalizedTenantId;
};

const normalizeString = (
  value,
  maxLength
) =>
  String(
    value ?? ""
  )
    .trim()
    .slice(
      0,
      maxLength
    );

const ALLOWED_UPDATE_FIELDS =
  [
    "supportPhone",
    "whatsappNumber",
    "deliveryArea",
    "deliveryTime",
    "codText",
    "collectionPoint",
    "orderInstruction",
    "returnPolicy",
    "warrantyText",
    "soldByText",
    "isActive",
  ];

/* =========================================================
   GET CHECKOUT SETTINGS
========================================================= */

/**
 * GET /api/checkout-settings
 *
 * Returns the checkout settings for the active tenant.
 *
 * If no document exists yet, one is created automatically
 * with safe default values.
 */
const getCheckoutSettings =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req
        );

      const settings =
        await CheckoutSetting
          .getOrCreateForTenant(
            tenantId
          );

      return sendSuccess(
        res,
        {
          message:
            "Checkout settings fetched successfully",

          data: {
            settings,
          },
        }
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   UPDATE CHECKOUT SETTINGS
========================================================= */

/**
 * PATCH /api/checkout-settings
 *
 * Updates only the active tenant's checkout settings.
 *
 * One tenant can never update another tenant's document
 * because the lookup is always scoped by tenant ID.
 */
const updateCheckoutSettings =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req
        );

      const payload =
        req.body &&
        typeof req.body ===
          "object"
          ? req.body
          : {};

      const updateData = {};

      for (
        const field of
        ALLOWED_UPDATE_FIELDS
      ) {
        if (
          payload[field] ===
          undefined
        ) {
          continue;
        }

        if (
          field ===
          "isActive"
        ) {
          updateData.isActive =
            Boolean(
              payload.isActive
            );

          continue;
        }

        const maxLengthMap = {
          supportPhone: 30,
          whatsappNumber: 30,
          deliveryArea: 2000,
          deliveryTime: 1000,
          codText: 2000,
          collectionPoint: 2000,
          orderInstruction: 3000,
          returnPolicy: 3000,
          warrantyText: 3000,
          soldByText: 200,
        };

        updateData[field] =
          normalizeString(
            payload[field],
            maxLengthMap[
              field
            ]
          );
      }

      const settings =
        await CheckoutSetting
          .findOneAndUpdate(
            {
              tenant:
                tenantId,
            },

            {
              $set:
                updateData,

              $setOnInsert: {
                tenant:
                  tenantId,
              },
            },

            {
              new: true,
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert:
                true,
            }
          );

      return sendSuccess(
        res,
        {
          message:
            "Checkout settings updated successfully",

          data: {
            settings,
          },
        }
      );
    } catch (error) {
      if (
        error?.name ===
        "ValidationError"
      ) {
        error.statusCode =
          400;
      }

      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getCheckoutSettings,
  updateCheckoutSettings,
};
