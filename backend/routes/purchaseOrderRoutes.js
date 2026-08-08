"use strict";

const express = require("express");

const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  changePurchaseOrderStatus,
  deletePurchaseOrder,
  restorePurchaseOrder,
} = require(
  "../controllers/purchaseOrderController"
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

const {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validatePurchaseOrderStatus,
  validatePurchaseOrderId,
  validatePurchaseOrderQuery,
} = require(
  "../validators/purchaseOrderValidator"
);

const router = express.Router();

/* =========================================================
   PURCHASE ORDER ROUTE SECURITY
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   COLLECTION ROUTES

   GET  /api/purchase-orders
   POST /api/purchase-orders
========================================================= */

router
  .route("/")
  .get(
    validatePurchaseOrderQuery,
    getPurchaseOrders
  )
  .post(
    validateCreatePurchaseOrder,
    createPurchaseOrder
  );

/* =========================================================
   RESTORE PURCHASE ORDER

   PATCH /api/purchase-orders/:purchaseOrderId/restore
========================================================= */

router.patch(
  "/:purchaseOrderId/restore",
  validatePurchaseOrderId,
  restorePurchaseOrder
);

/* =========================================================
   CHANGE PURCHASE ORDER STATUS

   PATCH /api/purchase-orders/:purchaseOrderId/status
========================================================= */

router.patch(
  "/:purchaseOrderId/status",
  validatePurchaseOrderId,
  validatePurchaseOrderStatus,
  changePurchaseOrderStatus
);

/* =========================================================
   SINGLE PURCHASE ORDER ROUTES

   GET    /api/purchase-orders/:purchaseOrderId
   PUT    /api/purchase-orders/:purchaseOrderId
   PATCH  /api/purchase-orders/:purchaseOrderId
   DELETE /api/purchase-orders/:purchaseOrderId
========================================================= */

router
  .route("/:purchaseOrderId")
  .get(
    validatePurchaseOrderId,
    validatePurchaseOrderQuery,
    getPurchaseOrderById
  )
  .put(
    validatePurchaseOrderId,
    validateUpdatePurchaseOrder,
    updatePurchaseOrder
  )
  .patch(
    validatePurchaseOrderId,
    validateUpdatePurchaseOrder,
    updatePurchaseOrder
  )
  .delete(
    validatePurchaseOrderId,
    deletePurchaseOrder
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;