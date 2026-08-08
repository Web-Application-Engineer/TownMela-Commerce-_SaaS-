"use strict";

const mongoose = require("mongoose");

const roiService = require("../services/roiService");

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message,
    data = null,
    meta = null,
  }
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta !== null) {
    response.meta = meta;
  }

  return res
    .status(statusCode)
    .json(response);
};

/* =========================================================
   ERROR HELPERS
========================================================= */

const createControllerError = (
  message,
  statusCode = 400,
  code = "ROI_CONTROLLER_ERROR",
  details = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
};

/* =========================================================
   REQUEST CONTEXT HELPERS
========================================================= */

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return String(value._id).trim();
  }

  if (
    typeof value === "object" &&
    value.id
  ) {
    return String(value.id).trim();
  }

  return String(value).trim();
};

const getTenantId = (req) => {
  /*
    TownMela admin frontend and Postman explicitly send X-Tenant-Id.
    Therefore, the header receives first priority.
  */
  const headerTenantId = normalizeIdValue(
    req.get("X-Tenant-Id")
  );

  const middlewareTenantId = normalizeIdValue(
    req.tenant?._id ||
    req.tenant?.id ||
    req.tenantId
  );

  const userTenantId = normalizeIdValue(
    req.user?.tenant?._id ||
    req.user?.tenant?.id ||
    req.user?.tenant
  );

  const tenantId =
    headerTenantId ||
    middlewareTenantId ||
    userTenantId;

  if (!tenantId) {
    throw createControllerError(
      "Tenant context is required",
      400,
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  if (!mongoose.isValidObjectId(tenantId)) {
    throw createControllerError(
      "A valid tenant ID is required",
      400,
      "INVALID_TENANT_ID",
      {
        receivedTenantId: tenantId,
        source: headerTenantId
          ? "X-Tenant-Id"
          : middlewareTenantId
            ? "tenant middleware"
            : "authenticated user",
      }
    );
  }

  return tenantId;
};

const getUserId = (req) => {
  const userId = normalizeIdValue(
    req.user?._id ||
    req.user?.id
  );

  if (!userId) {
    return null;
  }

  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return userId;
};

/* =========================================================
   ASYNC WRAPPER
========================================================= */

const asyncController = (
  controller
) =>
  function wrappedController(
    req,
    res,
    next
  ) {
    Promise.resolve(
      controller(req, res, next)
    ).catch(next);
  };

/* =========================================================
   DASHBOARD
========================================================= */

/**
 * GET /api/roi/dashboard
 */
const getDashboard = asyncController(
  async (req, res) => {
    const result =
      await roiService.getDashboard({
        tenantId: getTenantId(req),
        query: req.query || {},
      });

    return sendSuccess(res, {
      message:
        "ROI dashboard retrieved successfully",
      data: result,
    });
  }
);

/* =========================================================
   ORDER PROFITABILITY
========================================================= */

/**
 * GET /api/roi/orders
 */
const getOrders = asyncController(
  async (req, res) => {
    const result =
      await roiService.getOrders({
        tenantId: getTenantId(req),
        query: req.query || {},
      });

    const {
      data,
      pagination,
      settings,
      filters,
    } = result;

    return sendSuccess(res, {
      message:
        "ROI order profitability retrieved successfully",
      data,
      meta: {
        pagination,
        settings,
        filters,
      },
    });
  }
);

/* =========================================================
   PRODUCT PROFITABILITY
========================================================= */

/**
 * GET /api/roi/products
 */
const getProducts = asyncController(
  async (req, res) => {
    const result =
      await roiService.getProducts({
        tenantId: getTenantId(req),
        query: req.query || {},
      });

    const {
      data,
      pagination,
      settings,
      filters,
    } = result;

    return sendSuccess(res, {
      message:
        "ROI product profitability retrieved successfully",
      data,
      meta: {
        pagination,
        settings,
        filters,
      },
    });
  }
);

/* =========================================================
   SETTINGS
========================================================= */

/**
 * GET /api/roi/settings
 */
const getSettings = asyncController(
  async (req, res) => {
    const settings =
      await roiService.getSettings({
        tenantId: getTenantId(req),
      });

    return sendSuccess(res, {
      message:
        "ROI settings retrieved successfully",
      data: settings,
    });
  }
);

/**
 * PATCH /api/roi/settings
 */
const updateSettings = asyncController(
  async (req, res) => {
    const settings =
      await roiService.updateSettings({
        tenantId: getTenantId(req),
        payload: req.body || {},
        userId: getUserId(req),
      });

    return sendSuccess(res, {
      message:
        "ROI settings updated successfully",
      data: settings,
    });
  }
);

/* =========================================================
   HEALTH
========================================================= */

/**
 * GET /api/roi/health
 */
const getHealth = asyncController(
  async (req, res) => {
    const health =
      await roiService.getHealth({
        tenantId: getTenantId(req),
      });

    const statusCode =
      health.database === "connected"
        ? 200
        : 503;

    return sendSuccess(res, {
      statusCode,
      message:
        statusCode === 200
          ? "ROI module is healthy"
          : "ROI module health check detected an issue",
      data: health,
    });
  }
);

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getDashboard,
  getOrders,
  getProducts,
  getSettings,
  updateSettings,
  getHealth,
};
