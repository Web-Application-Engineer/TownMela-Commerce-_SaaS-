const express = require("express");

const resolvePublicTenant =
  require(
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

   Homepage থেকে selected showcase categories load করবে।

   GET /api/homepage-category-showcases
========================================================= */

router.get(
  "/",
  resolvePublicTenant,
  getHomepageCategoryShowcases
);

/* =========================================================
   ADMIN ROUTE

   Admin Dashboard থেকে fixed ৯টি category slot update করবে।

   PUT /api/homepage-category-showcases
========================================================= */

router.put(
  "/",
  protect,
  requireTenant,
  adminOnly,
  updateHomepageCategoryShowcases
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;