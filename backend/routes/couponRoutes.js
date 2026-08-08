"use strict";

const express = require(
  "express",
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

const {
  createCoupon,
  getAllCoupons,
  getSingleCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} = require(
  "../controllers/couponController",
);

const router =
  express.Router();

/* =========================================================
   PUBLIC COUPON ROUTES
========================================================= */

/*
  Apply coupon during Guest Checkout

  POST /api/coupons/apply

  Public storefront tenant resolution should be handled
  through the storefront/domain tenant middleware.
*/

router.post(
  "/apply",
  applyCoupon,
);

/*
  Backward-compatible route

  POST /api/coupons/validate
*/

router.post(
  "/validate",
  applyCoupon,
);

/* =========================================================
   ADMIN COUPON ROUTES
========================================================= */

/*
  Middleware order:

  1. protect
     Authenticates the current admin.

  2. requireTenant
     Resolves and validates the trusted tenant context,
     then sets req.tenantId.

  3. adminOnly
     Confirms that the authenticated user has admin access.
*/

/* =========================================================
   GET ALL COUPONS

   GET /api/coupons
========================================================= */

router.get(
  "/",
  protect,
  requireTenant,
  adminOnly,
  getAllCoupons,
);

/* =========================================================
   CREATE COUPON

   POST /api/coupons
========================================================= */

router.post(
  "/",
  protect,
  requireTenant,
  adminOnly,
  createCoupon,
);

/* =========================================================
   GET SINGLE COUPON

   GET /api/coupons/:couponId
========================================================= */

router.get(
  "/:couponId",
  protect,
  requireTenant,
  adminOnly,
  getSingleCoupon,
);

/* =========================================================
   UPDATE COUPON

   PUT /api/coupons/:couponId
========================================================= */

router.put(
  "/:couponId",
  protect,
  requireTenant,
  adminOnly,
  updateCoupon,
);

/* =========================================================
   DELETE COUPON

   DELETE /api/coupons/:couponId
========================================================= */

router.delete(
  "/:couponId",
  protect,
  requireTenant,
  adminOnly,
  deleteCoupon,
);

/* =========================================================
   EXPORTS
========================================================= */

module.exports = router;