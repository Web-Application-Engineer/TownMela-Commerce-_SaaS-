const express = require("express");

const resolvePublicTenant =
  require(
    "../middleware/resolvePublicTenant"
  );

const {
  protect,
  requireTenant,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  createPopularCategory,
  getPopularCategories,
  updatePopularCategory,
  deletePopularCategory,
} = require("../controllers/popularCategoryController");

const router = express.Router();

/* =========================================================
   PUBLIC ROUTE
========================================================= */

// Homepage থেকে popular categories দেখার জন্য
router.get(
  "/",
  resolvePublicTenant,
  getPopularCategories
);

/* =========================================================
   ADMIN ROUTES
========================================================= */

// নতুন popular category add
router.post(
  "/",
  protect,
  requireTenant,
  adminOnly,
  createPopularCategory
);

// Existing popular category update
router.put(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  updatePopularCategory
);

// Popular category delete
router.delete(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  deletePopularCategory
);

module.exports = router;