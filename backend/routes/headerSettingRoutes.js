"use strict";

const express = require("express");

const {
  getHeaderSetting,
  updateHeaderSetting,
} = require(
  "../controllers/headerSettingController"
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const requireTenant = require(
  "../middleware/requireTenant"
);

const resolvePublicTenant = require(
  "../middleware/resolvePublicTenant"
);

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   PUBLIC STOREFRONT HEADER SETTINGS

   GET /api/header-settings/public

   Public read-only route.
   Tenant is resolved from:

   1. X-Tenant-Id
   2. Custom domain / request host
   3. Localhost default tenant
========================================================= */

router.get(
  "/public",
  resolvePublicTenant,
  getHeaderSetting
);

/* =========================================================
   ADMIN SECURITY

   The routes below require:

   1. Authenticated user
   2. Valid tenant context
   3. Admin authorization
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   GET ADMIN HEADER SETTINGS

   GET /api/header-settings
========================================================= */

router.get(
  "/",
  getHeaderSetting
);

/* =========================================================
   UPDATE HEADER SETTINGS

   PATCH /api/header-settings
========================================================= */

router.patch(
  "/",
  updateHeaderSetting
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;