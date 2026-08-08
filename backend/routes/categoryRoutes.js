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
  createCategory,
  getCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

/* =========================================================
   PUBLIC CATEGORY ROUTES
========================================================= */

/*
  Get all categories

  GET /api/categories
*/

router.get(
  "/",
  resolvePublicTenant,
  getCategories,
);

/*
  Get a single category by MongoDB ID

  GET /api/categories/:id
*/

router.get(
  "/:id",
  resolvePublicTenant,
  getSingleCategory,
);

/* =========================================================
   PROTECTED ADMIN CATEGORY ROUTES
========================================================= */

/*
  Create a category

  POST /api/categories
*/

router.post(
  "/",
  protect,
  requireTenant,
  adminOnly,
  createCategory,
);

/*
  Update a category

  PUT /api/categories/:id
*/

router.put(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  updateCategory,
);

/*
  Delete a category

  DELETE /api/categories/:id
*/

router.delete(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  deleteCategory,
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;