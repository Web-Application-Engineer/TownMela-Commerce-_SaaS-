"use strict";

const express = require("express");

const resolvePublicTenant = require("../middleware/resolvePublicTenant");

const {
  createProduct,
  getProducts,
  searchProducts,
  getProductsByCategory,
  filterProductsByPrice,
  sortProducts,
  getPaginatedProducts,
  getFilteredProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  protect,
  requireTenant,
  adminOnly,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

const adminProductAccess = [
  protect,
  requireTenant,
  adminOnly,
];

const productUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 4 },
]);

router.post(
  "/",
  ...adminProductAccess,
  productUpload,
  createProduct
);

router.get("/", resolvePublicTenant, getProducts);
router.get("/search", resolvePublicTenant, searchProducts);
router.get(
  "/category/:categoryId",
  resolvePublicTenant,
  getProductsByCategory
);
router.get(
  "/filter/price",
  resolvePublicTenant,
  filterProductsByPrice
);
router.get(
  "/sort/products",
  resolvePublicTenant,
  sortProducts
);
router.get(
  "/pagination/products",
  resolvePublicTenant,
  getPaginatedProducts
);
router.get(
  "/filter/all",
  resolvePublicTenant,
  getFilteredProducts
);
router.get("/:id", resolvePublicTenant, getProduct);

router.put(
  "/:id",
  ...adminProductAccess,
  productUpload,
  updateProduct
);

router.delete(
  "/:id",
  ...adminProductAccess,
  deleteProduct
);

module.exports = router;
