"use strict";

const express = require(
  "express",
);

const {
  createCourier,
  getCouriers,
  getCourierById,
  updateCourier,
  toggleCourierStatus,
  setDefaultCourier,
  deleteCourier,
} = require(
  "../controllers/courierController",
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware",
);

const requireTenant = require(
  "../middleware/requireTenant",
);

const router =
  express.Router();

/* =========================================================
   PROTECT ALL COURIER ROUTES

   Middleware order:
   1. protect
   2. requireTenant
   3. adminOnly
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly,
);

/* =========================================================
   COURIER COLLECTION ROUTES
========================================================= */

router
  .route("/")
  .get(getCouriers)
  .post(createCourier);

/* =========================================================
   COURIER ACTION ROUTES

   Keep these routes before /:courierId.
========================================================= */

router.patch(
  "/:courierId/status",
  toggleCourierStatus,
);

router.patch(
  "/:courierId/default",
  setDefaultCourier,
);

/* =========================================================
   SINGLE COURIER ROUTES
========================================================= */

router
  .route("/:courierId")
  .get(getCourierById)
  .put(updateCourier)
  .delete(deleteCourier);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
