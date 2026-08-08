"use strict";

const express = require("express");

const {
  getCourierSettings,
  updateCourierSettings,
  setDefaultCourierSetting,
  resetCourierSettings,
} = require(
  "../controllers/courierSettingController"
);

const {
  protect,
  adminOnly,
  requireTenant,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   PROTECT ALL COURIER SETTING ROUTES
========================================================= */

router.use(
  protect,
  adminOnly,
  requireTenant
);

/* =========================================================
   COURIER SETTING COLLECTION ROUTES
========================================================= */

router
  .route("/")
  .get(getCourierSettings)
  .put(updateCourierSettings);

/* =========================================================
   COURIER SETTING ACTION ROUTES
========================================================= */

router.patch(
  "/default-courier",
  setDefaultCourierSetting
);

router.post(
  "/reset",
  resetCourierSettings
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
