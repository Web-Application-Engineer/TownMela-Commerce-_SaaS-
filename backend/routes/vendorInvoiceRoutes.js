"use strict";

const express = require("express");

const {
  createVendorInvoice,
  getVendorInvoiceList,
  getVendorInvoiceById,
  updateVendorInvoice,
  performThreeWayMatching,
  changeVendorInvoiceStatus,
  deleteVendorInvoice,
  restoreVendorInvoice,
  getVendorInvoiceOutstandingSummary,
} = require(
  "../controllers/vendorInvoiceController"
);

const {
  validateCreateVendorInvoice,
  validateUpdateVendorInvoice,
  validateVendorInvoiceId,
  validateVendorInvoiceListQuery,
  validateVendorInvoiceDetailsQuery,
  validateVendorInvoiceMatching,
  validateVendorInvoiceStatusUpdate,
  validateVendorInvoiceDelete,
  validateVendorInvoiceRestore,
  validateVendorInvoiceOutstandingSummary,
} = require(
  "../validators/vendorInvoiceValidator"
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

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   EXPORT VALIDATION

   This gives a clear startup error if any imported
   controller, validator, or middleware is not a function.
========================================================= */

const assertFunction = (
  handler,
  handlerName,
  sourcePath
) => {
  if (typeof handler !== "function") {
    const receivedType =
      handler === null
        ? "null"
        : Array.isArray(handler)
          ? "array"
          : typeof handler;

    throw new TypeError(
      [
        `Invalid Express handler "${handlerName}"`,
        `imported from "${sourcePath}".`,
        `Expected a function but received ${receivedType}.`,
      ].join(" ")
    );
  }

  return handler;
};

[
  [
    protect,
    "protect",
    "../middleware/authMiddleware",
  ],
  [
    requireTenant,
    "requireTenant",
    "../middleware/requireTenant",
  ],
  [
    adminOnly,
    "adminOnly",
    "../middleware/authMiddleware",
  ],

  [
    createVendorInvoice,
    "createVendorInvoice",
    "../controllers/vendorInvoiceController",
  ],
  [
    getVendorInvoiceList,
    "getVendorInvoiceList",
    "../controllers/vendorInvoiceController",
  ],
  [
    getVendorInvoiceById,
    "getVendorInvoiceById",
    "../controllers/vendorInvoiceController",
  ],
  [
    updateVendorInvoice,
    "updateVendorInvoice",
    "../controllers/vendorInvoiceController",
  ],
  [
    performThreeWayMatching,
    "performThreeWayMatching",
    "../controllers/vendorInvoiceController",
  ],
  [
    changeVendorInvoiceStatus,
    "changeVendorInvoiceStatus",
    "../controllers/vendorInvoiceController",
  ],
  [
    deleteVendorInvoice,
    "deleteVendorInvoice",
    "../controllers/vendorInvoiceController",
  ],
  [
    restoreVendorInvoice,
    "restoreVendorInvoice",
    "../controllers/vendorInvoiceController",
  ],
  [
    getVendorInvoiceOutstandingSummary,
    "getVendorInvoiceOutstandingSummary",
    "../controllers/vendorInvoiceController",
  ],

  [
    validateCreateVendorInvoice,
    "validateCreateVendorInvoice",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateUpdateVendorInvoice,
    "validateUpdateVendorInvoice",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceId,
    "validateVendorInvoiceId",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceListQuery,
    "validateVendorInvoiceListQuery",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceDetailsQuery,
    "validateVendorInvoiceDetailsQuery",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceMatching,
    "validateVendorInvoiceMatching",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceStatusUpdate,
    "validateVendorInvoiceStatusUpdate",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceDelete,
    "validateVendorInvoiceDelete",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceRestore,
    "validateVendorInvoiceRestore",
    "../validators/vendorInvoiceValidator",
  ],
  [
    validateVendorInvoiceOutstandingSummary,
    "validateVendorInvoiceOutstandingSummary",
    "../validators/vendorInvoiceValidator",
  ],
].forEach(
  ([
    handler,
    handlerName,
    sourcePath,
  ]) => {
    assertFunction(
      handler,
      handlerName,
      sourcePath
    );
  }
);

/* =========================================================
   GLOBAL SECURITY

   All Vendor Invoice routes require:

   1. Authenticated user
   2. Valid tenant context
   3. Admin authorization

   adminOnly can later be replaced with granular
   Accounts Payable permissions.
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   CREATE VENDOR INVOICE

   POST /api/vendor-invoices
========================================================= */

router.post(
  "/",
  validateCreateVendorInvoice,
  createVendorInvoice
);

/* =========================================================
   GET VENDOR INVOICE LIST

   GET /api/vendor-invoices

   Supported filters may include:

   - page
   - limit
   - search
   - status
   - supplier
   - purchaseOrder
   - goodsReceived
   - paymentStatus
   - matchingStatus
   - approvalStatus
   - dateFrom
   - dateTo
   - dueDateFrom
   - dueDateTo
   - overdue
   - sortBy
   - sortOrder
========================================================= */

router.get(
  "/",
  validateVendorInvoiceListQuery,
  getVendorInvoiceList
);

/* =========================================================
   OUTSTANDING PAYABLE SUMMARY

   GET /api/vendor-invoices/outstanding-summary

   This fixed route must remain before
   /:vendorInvoiceId.
========================================================= */

router.get(
  "/outstanding-summary",
  validateVendorInvoiceOutstandingSummary,
  getVendorInvoiceOutstandingSummary
);

/* =========================================================
   RESTORE VENDOR INVOICE

   PATCH /api/vendor-invoices/:vendorInvoiceId/restore
========================================================= */

router.patch(
  "/:vendorInvoiceId/restore",
  validateVendorInvoiceId,
  validateVendorInvoiceRestore,
  restoreVendorInvoice
);

/* =========================================================
   PERFORM THREE-WAY MATCHING

   POST /api/vendor-invoices/:vendorInvoiceId/match

   Compares:

   1. Purchase Order
   2. Goods Received
   3. Vendor Invoice
========================================================= */

router.post(
  "/:vendorInvoiceId/match",
  validateVendorInvoiceId,
  validateVendorInvoiceMatching,
  performThreeWayMatching
);

/* =========================================================
   CHANGE VENDOR INVOICE STATUS

   PATCH /api/vendor-invoices/:vendorInvoiceId/status
========================================================= */

router.patch(
  "/:vendorInvoiceId/status",
  validateVendorInvoiceId,
  validateVendorInvoiceStatusUpdate,
  changeVendorInvoiceStatus
);

/* =========================================================
   GET VENDOR INVOICE DETAILS

   GET /api/vendor-invoices/:vendorInvoiceId
========================================================= */

router.get(
  "/:vendorInvoiceId",
  validateVendorInvoiceId,
  validateVendorInvoiceDetailsQuery,
  getVendorInvoiceById
);

/* =========================================================
   UPDATE VENDOR INVOICE

   PUT /api/vendor-invoices/:vendorInvoiceId

   PUT is used for a complete editable invoice update.
========================================================= */

router.put(
  "/:vendorInvoiceId",
  validateVendorInvoiceId,
  validateUpdateVendorInvoice,
  updateVendorInvoice
);

/* =========================================================
   PARTIAL UPDATE VENDOR INVOICE

   PATCH /api/vendor-invoices/:vendorInvoiceId

   This endpoint supports partial draft updates.
========================================================= */

router.patch(
  "/:vendorInvoiceId",
  validateVendorInvoiceId,
  validateUpdateVendorInvoice,
  updateVendorInvoice
);

/* =========================================================
   SOFT DELETE VENDOR INVOICE

   DELETE /api/vendor-invoices/:vendorInvoiceId
========================================================= */

router.delete(
  "/:vendorInvoiceId",
  validateVendorInvoiceId,
  validateVendorInvoiceDelete,
  deleteVendorInvoice
);

/* =========================================================
   EXPORT

   app.js must receive the Express router directly.
========================================================= */

module.exports = router;