"use strict";

const express = require("express");

const resolvePublicTenant =
  require(
    "../middleware/resolvePublicTenant"
  );

const {
  getHomepageProductSectionSetting,
  updateHomepageProductSectionSetting,
} = require(
  "../controllers/homepageProductSectionSettingController"
);

const {
  protect,
  requireTenant,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   PUBLIC ROUTE

   Storefront homepage থেকে tenant-specific
   product section titles load করবে.

   GET /api/homepage-product-section-settings
========================================================= */

router.get(
  "/",
  resolvePublicTenant,
  getHomepageProductSectionSetting
);

/* =========================================================
   ADMIN ROUTE

   Tenant Admin / SuperAdmin selected tenant-এর
   homepage product section titles update করবে.

   PUT /api/homepage-product-section-settings
========================================================= */

router.put(
  "/",
  protect,
  requireTenant,
  adminOnly,
  updateHomepageProductSectionSetting
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;