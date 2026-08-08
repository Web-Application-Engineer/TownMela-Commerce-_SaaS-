"use strict";

const footerSettingService = require(
  "../services/footerSettingService"
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
        "FOOTER_SETTING_ERROR",
    });
};

/* =========================================================
   GET FOOTER SETTINGS
========================================================= */

const getFooterSetting =
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
        await footerSettingService
          .getFooterSetting({
            tenantId,
          });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Footer settings loaded successfully.",

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
   UPDATE FOOTER SETTINGS
========================================================= */

const updateFooterSetting =
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
        await footerSettingService
          .updateFooterSetting({
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
            "Footer settings saved successfully.",

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
  getFooterSetting,
  updateFooterSetting,
};