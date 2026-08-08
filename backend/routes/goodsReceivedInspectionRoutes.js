"use strict";

const express = require("express");

const {
  getGoodsReceivedInspection,
  startGoodsReceivedInspection,
  completeGoodsReceivedInspection,
  resetGoodsReceivedInspection,
} = require(
  "../controllers/goodsReceivedInspectionController"
);

const {
  validateGoodsReceivedInspectionId,
  validateStartGoodsReceivedInspection,
  validateCompleteGoodsReceivedInspection,
  validateResetGoodsReceivedInspection,
} = require(
  "../validators/goodsReceivedInspectionValidator"
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
   GLOBAL SECURITY

   All inspection routes require:

   1. Authenticated user
   2. Valid tenant context
   3. Admin permission
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   GET INSPECTION DETAILS

   GET
   /api/goods-received/:goodsReceivedId/inspection
========================================================= */

router.get(
  "/:goodsReceivedId/inspection",

  validateGoodsReceivedInspectionId,

  getGoodsReceivedInspection
);

/* =========================================================
   START INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/start

   Optional body:
   {
     "remarks": "Inspection started",
     "note": "Optional note"
   }
========================================================= */

router.patch(
  "/:goodsReceivedId/inspection/start",

  validateGoodsReceivedInspectionId,

  validateStartGoodsReceivedInspection,

  startGoodsReceivedInspection
);

/* =========================================================
   COMPLETE INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/complete

   Body example:
   {
     "items": [
       {
         "goodsReceivedItemId": "ITEM_ID",
         "inspectedQuantity": 10,
         "passedQuantity": 8,
         "failedQuantity": 2,
         "damagedQuantity": 1,
         "qualityGrade": "B",
         "rejectionReason": "Damaged packaging",
         "damageDescription": "One unit damaged",
         "remarks": "Checked manually"
       }
     ],
     "remarks": "Inspection completed",
     "note": "Optional note"
   }
========================================================= */

router.patch(
  "/:goodsReceivedId/inspection/complete",

  validateGoodsReceivedInspectionId,

  validateCompleteGoodsReceivedInspection,

  completeGoodsReceivedInspection
);

/* =========================================================
   RESET INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/reset

   Optional body:
   {
     "reason": "Incorrect inspection result",
     "note": "Inspection needs to be repeated",
     "remarks": "Reset by admin"
   }
========================================================= */

router.patch(
  "/:goodsReceivedId/inspection/reset",

  validateGoodsReceivedInspectionId,

  validateResetGoodsReceivedInspection,

  resetGoodsReceivedInspection
);

/* =========================================================
   ROUTE NOT FOUND

   Handles unknown inspection route under this router.
========================================================= */

router.use(
  "/:goodsReceivedId/inspection",
  (req, res) => {
    return res.status(404).json({
      success: false,
      message:
        "Goods received inspection route was not found",
      code:
        "GOODS_RECEIVED_INSPECTION_ROUTE_NOT_FOUND",
    });
  }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;