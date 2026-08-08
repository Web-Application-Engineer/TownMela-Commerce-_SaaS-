"use strict";

const express = require("express");

const router = express.Router();

const roiController = require("../controllers/roiController");

const {
  validateQuery,
  validateSettings,
} = require("../validators/roiValidator");

const {
  protect,
  adminOnly,
  requireTenant,
} = require("../middleware/authMiddleware");

router.use(protect);
router.use(requireTenant);
router.use(adminOnly);

/* =========================================================
   VALIDATION ERROR HELPER
========================================================= */

const createValidationError = (
  message,
  code,
  validationErrors = []
) => {
  const error = new Error(message);

  error.statusCode = 400;
  error.code = code;
  error.validationErrors =
    Array.isArray(validationErrors)
      ? validationErrors
      : [validationErrors];

  return error;
};

/* =========================================================
   QUERY VALIDATION
========================================================= */

const validateQueryMiddleware = (
  req,
  res,
  next
) => {
  try {
    const result = validateQuery(
      req.query || {}
    );

    if (!result?.valid) {
      return next(
        createValidationError(
          "Invalid ROI query parameters",
          "ROI_QUERY_VALIDATION_FAILED",
          result?.errors || []
        )
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   SETTINGS VALIDATION
========================================================= */

const validateSettingsMiddleware = (
  req,
  res,
  next
) => {
  try {
    const result = validateSettings(
      req.body || {}
    );

    if (!result?.valid) {
      return next(
        createValidationError(
          "Invalid ROI settings",
          "ROI_SETTINGS_VALIDATION_FAILED",
          result?.errors || []
        )
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   AUTHENTICATION AND AUTHORIZATION
========================================================= */

/*
  There is no separate requireTenant middleware in this project.

  The updated ROI controller reads and validates tenant context
  from the following sources, in this order:

  1. X-Tenant-Id request header
  2. req.tenant / req.tenantId
  3. req.user.tenant

  Therefore, only authentication and admin authorization are
  applied here.
*/

router.use(protect);
router.use(adminOnly);

/* =========================================================
   DASHBOARD
========================================================= */

/**
 * GET /api/roi/dashboard
 */
router.get(
  "/dashboard",
  validateQueryMiddleware,
  roiController.getDashboard
);

/* =========================================================
   ORDER PROFITABILITY
========================================================= */

/**
 * GET /api/roi/orders
 */
router.get(
  "/orders",
  validateQueryMiddleware,
  roiController.getOrders
);

/* =========================================================
   PRODUCT PROFITABILITY
========================================================= */

/**
 * GET /api/roi/products
 */
router.get(
  "/products",
  validateQueryMiddleware,
  roiController.getProducts
);

/* =========================================================
   SETTINGS
========================================================= */

/**
 * GET /api/roi/settings
 */
router.get(
  "/settings",
  roiController.getSettings
);

/**
 * PATCH /api/roi/settings
 */
router.patch(
  "/settings",
  express.json(),
  validateSettingsMiddleware,
  roiController.updateSettings
);

/* =========================================================
   HEALTH CHECK
========================================================= */

/**
 * GET /api/roi/health
 */
router.get(
  "/health",
  roiController.getHealth
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
