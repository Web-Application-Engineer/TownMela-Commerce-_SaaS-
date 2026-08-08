"use strict";

const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
} = require("../controllers/supplierController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const requireTenant = require("../middleware/requireTenant");

const router = express.Router();

/* =========================================================
   GLOBAL SUPPLIER ROUTE SECURITY

   সব Supplier endpoint-এর জন্য:
   1. User authenticated হতে হবে
   2. Tenant context থাকতে হবে
   3. User tenant admin/authorized admin হতে হবে
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   SUPPLIER COLLECTION ROUTES

   POST /api/suppliers
   GET  /api/suppliers
========================================================= */

router
  .route("/")
  .post(createSupplier)
  .get(getSuppliers);

/* =========================================================
   RESTORE SUPPLIER

   PATCH /api/suppliers/:supplierId/restore

   এই route অবশ্যই /:supplierId route-এর আগে থাকবে।
========================================================= */

router.patch(
  "/:supplierId/restore",
  restoreSupplier
);

/* =========================================================
   SINGLE SUPPLIER ROUTES

   GET    /api/suppliers/:supplierId
   PUT    /api/suppliers/:supplierId
   PATCH  /api/suppliers/:supplierId
   DELETE /api/suppliers/:supplierId
========================================================= */

router
  .route("/:supplierId")
  .get(getSupplierById)
  .put(updateSupplier)
  .patch(updateSupplier)
  .delete(deleteSupplier);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;