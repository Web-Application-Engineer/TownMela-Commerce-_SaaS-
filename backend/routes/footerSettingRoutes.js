"use strict";

const express = require("express");

const {
  getFooterSetting,
  updateFooterSetting,
} = require(
  "../controllers/footerSettingController"
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
   PUBLIC STOREFRONT FOOTER SETTINGS

   GET /api/footer-settings/public
========================================================= */

router.get(
  "/public",
  resolvePublicTenant,
  getFooterSetting
);

/* =========================================================
   ADMIN SECURITY
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   GET ADMIN FOOTER SETTINGS

   GET /api/footer-settings
========================================================= */

router.get(
  "/",
  getFooterSetting
);

/* =========================================================
   UPDATE FOOTER SETTINGS

   PATCH /api/footer-settings
========================================================= */

router.patch(
  "/",
  updateFooterSetting
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;