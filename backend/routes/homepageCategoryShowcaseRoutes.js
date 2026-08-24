"use strict";

const express = require("express");

const resolvePublicTenant = require(
  "../middleware/resolvePublicTenant"
);

const {
  getHomepageCategoryShowcases,
  updateHomepageCategoryShowcases,
} = require(
  "../controllers/homepageCategoryShowcaseController"
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

   Storefront loads tenant-specific dynamic category showcases.
   GET /api/homepage-category-showcases
========================================================= */

router.get(
  "/",
  resolvePublicTenant,
  getHomepageCategoryShowcases
);

/* =========================================================
   ADMIN ROUTE

   Tenant Admin / SuperAdmin can save any number of showcase
   sections, while each showcase keeps three category slots.
   PUT /api/homepage-category-showcases
========================================================= */

router.put(
  "/",
  protect,
  requireTenant,
  adminOnly,
  updateHomepageCategoryShowcases
);

module.exports = router;
