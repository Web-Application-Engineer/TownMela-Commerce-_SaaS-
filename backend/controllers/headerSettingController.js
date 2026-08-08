"use strict";

const headerSettingService = require(
  "../services/headerSettingService"
);

/* =========================================================
   HELPERS
========================================================= */

const getTenantId = (req) =>
  req.tenantId ||
  req.tenant?._id ||
  null;

const getUserId = (req) =>
  req.user?.id ||
  req.user?._id ||
  null;

const sendError = (
  res,
  error
) => {
  const statusCode =
    Number(error?.statusCode) ||
    500;

  return res
    .status(statusCode)
    .json({
      success: false,

      message:
        error?.message ||
        "Something went wrong.",

      code:
        error?.code ||
        "HEADER_SETTING_ERROR",
    });
};

/* =========================================================
   GET HEADER SETTINGS
========================================================= */

const getHeaderSetting =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getTenantId(req);

      if (!tenantId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Tenant ID is required.",
            code:
              "TENANT_ID_REQUIRED",
          });
      }

      const data =
        await headerSettingService
          .getHeaderSetting({
            tenantId,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Header settings loaded successfully.",

          data,
        });
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   UPDATE HEADER SETTINGS
========================================================= */

const updateHeaderSetting =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getTenantId(req);

      const userId =
        getUserId(req);

      if (!tenantId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Tenant ID is required.",
            code:
              "TENANT_ID_REQUIRED",
          });
      }

      const data =
        await headerSettingService
          .updateHeaderSetting({
            tenantId,
            userId,
            payload:
              req.body || {},
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Header settings saved successfully.",

          data,
        });
    } catch (error) {
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
  getHeaderSetting,
  updateHeaderSetting,
};