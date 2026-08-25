"use strict";

const express =
  require("express");

const resolvePublicTenant =
  require(
    "../middleware/resolvePublicTenant"
  );

const {
  protect,
  requireTenant,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const {
  getPublicStockClearanceCampaign,
  getAdminStockClearanceCampaign,
  updateStockClearanceCampaign,
  closeStockClearanceCampaign,
} = require(
  "../controllers/stockClearanceController"
);

const router =
  express.Router();

/* =========================================================
   PUBLIC
========================================================= */

router.get(
  "/",
  resolvePublicTenant,
  getPublicStockClearanceCampaign,
);

/* =========================================================
   ADMIN GET
========================================================= */

router.get(
  "/admin",
  protect,
  requireTenant,
  adminOnly,
  getAdminStockClearanceCampaign,
);

/* =========================================================
   ADMIN SAVE
========================================================= */

router.put(
  "/",
  protect,
  requireTenant,
  adminOnly,
  updateStockClearanceCampaign,
);

/* =========================================================
   ADMIN CLOSE
========================================================= */

router.patch(
  "/close",
  protect,
  requireTenant,
  adminOnly,
  closeStockClearanceCampaign,
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
