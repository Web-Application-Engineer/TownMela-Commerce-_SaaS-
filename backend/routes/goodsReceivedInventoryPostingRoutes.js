"use strict";

const express = require("express");

const controllerModule = require(
  "../controllers/goodsReceivedInventoryPostingController"
);

const validatorModule = require(
  "../validators/goodsReceivedInventoryPostingValidator"
);

const authMiddlewareModule = require(
  "../middleware/authMiddleware"
);

const requireTenantModule = require(
  "../middleware/requireTenant"
);

/* =========================================================
   MODULE EXPORT RESOLVER

   Supports both:

   module.exports = handler

   and:

   module.exports = {
     handler,
   }

   This also produces a clear startup error when an expected
   middleware/controller export is missing or is not a function.
========================================================= */

const resolveFunction = (
  source,
  exportName,
  modulePath
) => {
  const candidate =
    typeof source === "function" &&
    !exportName
      ? source
      : source?.[exportName];

  if (typeof candidate !== "function") {
    const receivedType =
      candidate === null
        ? "null"
        : Array.isArray(candidate)
          ? "array"
          : typeof candidate;

    throw new TypeError(
      [
        `Invalid function export "${exportName || "default"}"`,
        `from ${modulePath}.`,
        `Expected a function but received ${receivedType}.`,
        exportName
          ? `Make sure the file exports it with: module.exports = { ${exportName} };`
          : "Make sure the file exports the middleware function directly.",
      ].join(" ")
    );
  }

  return candidate;
};

/* =========================================================
   CONTROLLERS
========================================================= */

const previewGoodsReceivedInventoryPosting =
  resolveFunction(
    controllerModule,
    "previewGoodsReceivedInventoryPosting",
    "../controllers/goodsReceivedInventoryPostingController"
  );

const postGoodsReceivedInventory =
  resolveFunction(
    controllerModule,
    "postGoodsReceivedInventory",
    "../controllers/goodsReceivedInventoryPostingController"
  );

const getGoodsReceivedInventoryPosting =
  resolveFunction(
    controllerModule,
    "getGoodsReceivedInventoryPosting",
    "../controllers/goodsReceivedInventoryPostingController"
  );

const getPendingInventoryPostingQueue =
  resolveFunction(
    controllerModule,
    "getPendingInventoryPostingQueue",
    "../controllers/goodsReceivedInventoryPostingController"
  );

/* =========================================================
   VALIDATORS
========================================================= */

const validateGoodsReceivedId =
  resolveFunction(
    validatorModule,
    "validateGoodsReceivedId",
    "../validators/goodsReceivedInventoryPostingValidator"
  );

const validateInventoryPostingPreview =
  resolveFunction(
    validatorModule,
    "validateInventoryPostingPreview",
    "../validators/goodsReceivedInventoryPostingValidator"
  );

const validatePostGoodsReceivedInventory =
  resolveFunction(
    validatorModule,
    "validatePostGoodsReceivedInventory",
    "../validators/goodsReceivedInventoryPostingValidator"
  );

const validateInventoryPostingDetails =
  resolveFunction(
    validatorModule,
    "validateInventoryPostingDetails",
    "../validators/goodsReceivedInventoryPostingValidator"
  );

const validateInventoryPostingQueueQuery =
  resolveFunction(
    validatorModule,
    "validateInventoryPostingQueueQuery",
    "../validators/goodsReceivedInventoryPostingValidator"
  );

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

const protect = resolveFunction(
  authMiddlewareModule,
  "protect",
  "../middleware/authMiddleware"
);

const adminOnly = resolveFunction(
  authMiddlewareModule,
  "adminOnly",
  "../middleware/authMiddleware"
);

const requireTenant =
  typeof requireTenantModule === "function"
    ? requireTenantModule
    : resolveFunction(
        requireTenantModule,
        "requireTenant",
        "../middleware/requireTenant"
      );

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   GLOBAL SECURITY

   All routes require:
   1. Authenticated user
   2. Valid tenant context
   3. Admin authorization
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   PENDING INVENTORY POSTING QUEUE

   GET /api/goods-received-inventory-posting/queue

   This static route must remain before /:goodsReceivedId.
========================================================= */

router.get(
  "/queue",
  validateInventoryPostingQueueQuery,
  getPendingInventoryPostingQueue
);

/* =========================================================
   INVENTORY POSTING PREVIEW

   GET /api/goods-received-inventory-posting/:goodsReceivedId/preview
========================================================= */

router.get(
  "/:goodsReceivedId/preview",
  validateGoodsReceivedId,
  validateInventoryPostingPreview,
  previewGoodsReceivedInventoryPosting
);

/* =========================================================
   POST GOODS RECEIPT TO INVENTORY

   POST /api/goods-received-inventory-posting/:goodsReceivedId/post
========================================================= */

router.post(
  "/:goodsReceivedId/post",
  validateGoodsReceivedId,
  validatePostGoodsReceivedInventory,
  postGoodsReceivedInventory
);

/* =========================================================
   GET INVENTORY POSTING DETAILS

   GET /api/goods-received-inventory-posting/:goodsReceivedId

   Generic parameter routes must remain last.
========================================================= */

router.get(
  "/:goodsReceivedId",
  validateGoodsReceivedId,
  validateInventoryPostingDetails,
  getGoodsReceivedInventoryPosting
);

/* =========================================================
   EXPORT

   app.js expects the router itself, not { router }.
========================================================= */

module.exports = router;
