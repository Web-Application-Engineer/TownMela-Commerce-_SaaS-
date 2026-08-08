"use strict";

const express = require(
  "express",
);

const {
  createCourierShipment,
  getCourierShipments,
  getCourierShipmentById,
  bookCourierShipment,
  syncCourierShipment,
  updateCourierShipmentStatus,
  assignCourier,
  cancelCourierShipment,
  getShipmentTracking,
  archiveCourierShipment,
} = require(
  "../controllers/courierShipmentController",
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
   PARAMETER VALIDATION
========================================================= */

/*
  shipmentId হতে পারে:

  - MongoDB ObjectId
  - Shipment number
  - Tracking number
  - Consignment ID

  তাই শুধু ObjectId validation করা যাবে না।
*/

router.param(
  "shipmentId",
  (
    req,
    res,
    next,
    shipmentId,
  ) => {
    const normalizedId =
      typeof shipmentId ===
      "string"
        ? shipmentId.trim()
        : "";

    if (!normalizedId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Shipment identifier is required",
        });
    }

    if (
      normalizedId.length >
      150
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid shipment identifier",
        });
    }

    req.params.shipmentId =
      normalizedId;

    return next();
  },
);

/* =========================================================
   ADMIN AUTHENTICATION AND TENANT CONTEXT

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
   SHIPMENT COLLECTION ROUTES
========================================================= */

/**
 * @route   POST /api/courier-shipments
 * @desc    Create a courier shipment
 * @access  Admin
 */

router.post(
  "/",
  createCourierShipment,
);

/**
 * @route   GET /api/courier-shipments
 * @desc    Get courier shipment list
 * @access  Admin
 */

router.get(
  "/",
  getCourierShipments,
);

/* =========================================================
   PROVIDER ACTION ROUTES

   এগুলো GET /:shipmentId route-এর আগে থাকবে।
========================================================= */

/**
 * @route   POST /api/courier-shipments/:shipmentId/book
 * @desc    Book shipment with courier provider
 * @access  Admin
 */

router.post(
  "/:shipmentId/book",
  bookCourierShipment,
);

/**
 * @route   POST /api/courier-shipments/:shipmentId/sync
 * @desc    Synchronize shipment with courier provider
 * @access  Admin
 */

router.post(
  "/:shipmentId/sync",
  syncCourierShipment,
);

/* =========================================================
   SHIPMENT UPDATE ROUTES
========================================================= */

/**
 * @route   PATCH /api/courier-shipments/:shipmentId/status
 * @desc    Update shipment status manually
 * @access  Admin
 */

router.patch(
  "/:shipmentId/status",
  updateCourierShipmentStatus,
);

/**
 * @route   PATCH /api/courier-shipments/:shipmentId/courier
 * @desc    Assign or change shipment courier
 * @access  Admin
 */

router.patch(
  "/:shipmentId/courier",
  assignCourier,
);

/**
 * @route   PATCH /api/courier-shipments/:shipmentId/cancel
 * @desc    Cancel a courier shipment
 * @access  Admin
 */

router.patch(
  "/:shipmentId/cancel",
  cancelCourierShipment,
);

/**
 * @route   PATCH /api/courier-shipments/:shipmentId/archive
 * @desc    Archive or restore a courier shipment
 * @access  Admin
 */

router.patch(
  "/:shipmentId/archive",
  archiveCourierShipment,
);

/* =========================================================
   SHIPMENT READ ROUTES
========================================================= */

/**
 * @route   GET /api/courier-shipments/:shipmentId/tracking
 * @desc    Get shipment tracking timeline
 * @access  Admin
 */

router.get(
  "/:shipmentId/tracking",
  getShipmentTracking,
);

/**
 * Dynamic route সবশেষে রাখতে হবে।
 *
 * @route   GET /api/courier-shipments/:shipmentId
 * @desc    Get a single courier shipment
 * @access  Admin
 */

router.get(
  "/:shipmentId",
  getCourierShipmentById,
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
