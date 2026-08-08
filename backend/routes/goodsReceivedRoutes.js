"use strict";

const express = require("express");

const {
  createGoodsReceived,
  getGoodsReceivedList,
  getGoodsReceivedById,
  updateGoodsReceived,
  changeGoodsReceivedStatus,
  deleteGoodsReceived,
  restoreGoodsReceived,
} = require("../controllers/goodsReceivedController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const requireTenant = require("../middleware/requireTenant");

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   GLOBAL ROUTE SECURITY
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   COLLECTION ROUTES

   GET  /api/goods-received
   POST /api/goods-received
========================================================= */

router
  .route("/")
  .get(getGoodsReceivedList)
  .post(createGoodsReceived);

/* =========================================================
   RESTORE ROUTE

   PATCH /api/goods-received/:goodsReceivedId/restore
========================================================= */

router.patch(
  "/:goodsReceivedId/restore",
  restoreGoodsReceived
);

/* =========================================================
   STATUS ROUTE

   PATCH /api/goods-received/:goodsReceivedId/status
========================================================= */

router.patch(
  "/:goodsReceivedId/status",
  changeGoodsReceivedStatus
);

/* =========================================================
   SINGLE GOODS RECEIPT ROUTES

   GET    /api/goods-received/:goodsReceivedId
   PUT    /api/goods-received/:goodsReceivedId
   PATCH  /api/goods-received/:goodsReceivedId
   DELETE /api/goods-received/:goodsReceivedId
========================================================= */

router
  .route("/:goodsReceivedId")
  .get(getGoodsReceivedById)
  .put(updateGoodsReceived)
  .patch(updateGoodsReceived)
  .delete(deleteGoodsReceived);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;