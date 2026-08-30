"use strict";

const express = require("express");

const {
  getPublicSocialContactSettings,
  getSocialContactSettings,
  updateSocialContactSettings,
} = require(
  "../controllers/socialContactSettingController"
);

const {
  protect,
  adminOnly,
  requireTenant,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

/* =========================================================
   PUBLIC STOREFRONT ROUTE

   Tenant is supplied through X-Tenant-Id by the storefront.
========================================================= */

router.get(
  "/public",
  getPublicSocialContactSettings
);

/* =========================================================
   ADMIN ROUTES

   Tenant Admin:
   - protect() resolves their own tenant from the account/JWT.

   Super Admin:
   - protect() resolves the selected X-Tenant-Id.

   requireTenant() then guarantees a valid tenant context.
========================================================= */

router.use(
  protect,
  adminOnly,
  requireTenant
);

router.get(
  "/",
  getSocialContactSettings
);

router.patch(
  "/",
  updateSocialContactSettings
);

module.exports = router;
