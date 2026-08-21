"use strict";

const express =
  require("express");

const {
  getCheckoutSettings,
  updateCheckoutSettings,
} = require(
  "../controllers/checkoutSettingController"
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

/* =========================================================
   PUBLIC STOREFRONT READ

   Product details / storefront pages must be able to read
   checkout information without an admin login token.

   Tenant isolation is still enforced by the tenant ID
   resolved inside checkoutSettingController.
========================================================= */

/**
 * GET /api/checkout-settings
 *
 * Public read for the active storefront tenant.
 */
router.get(
  "/",
  getCheckoutSettings
);

/* =========================================================
   ADMIN-ONLY UPDATE
========================================================= */

/**
 * PATCH /api/checkout-settings
 *
 * Only authenticated admin / superadmin users may update
 * checkout settings.
 */
router.patch(
  "/",
  protect,
  adminOnly,
  updateCheckoutSettings
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
