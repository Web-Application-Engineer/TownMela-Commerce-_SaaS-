"use strict";

const express = require("express");

const {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  getDefaultWarehouse,
  getActiveWarehouses,
  updateWarehouse,
  setDefaultWarehouse,
  changeWarehouseStatus,
  deleteWarehouse,
  restoreWarehouse,
  checkWarehouseCodeAvailability,
  getWarehouseSummary,
} = require(
  "../controllers/warehouseController"
);

const {
  validateCreateWarehouse,
  validateUpdateWarehouse,
  validateWarehouseId,
  validateWarehouseQuery,
  validateSetDefaultWarehouse,
  validateWarehouseStatus,
} = require(
  "../validators/warehouseValidator"
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

const router = express.Router();

/* =========================================================
   GLOBAL SECURITY MIDDLEWARE
========================================================= */

/*
 * Every warehouse route requires:
 *
 * 1. Valid authenticated user
 * 2. Valid tenant context
 * 3. Admin permission
 */
router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   STATIC ROUTES
========================================================= */

/**
 * @route   GET /api/warehouses/summary
 * @desc    Get warehouse summary for the active tenant
 * @access  Private/Admin
 */
router.get(
  "/summary",
  getWarehouseSummary
);

/**
 * @route   GET /api/warehouses/default
 * @desc    Get the tenant's default active warehouse
 * @access  Private/Admin
 */
router.get(
  "/default",
  getDefaultWarehouse
);

/**
 * @route   GET /api/warehouses/active
 * @desc    Get active warehouses for dropdowns and selectors
 * @access  Private/Admin
 *
 * Optional query parameters:
 *
 * allowPurchasing=true
 * allowSalesFulfillment=true
 * allowTransfers=true
 * allowReturns=true
 */
router.get(
  "/active",
  getActiveWarehouses
);

/**
 * @route   GET /api/warehouses/code-availability
 * @desc    Check whether a warehouse code is available
 * @access  Private/Admin
 *
 * Example:
 *
 * /api/warehouses/code-availability?code=WH-001
 *
 * During update:
 *
 * /api/warehouses/code-availability
 * ?code=WH-001
 * &excludeWarehouseId=WAREHOUSE_ID
 */
router.get(
  "/code-availability",
  checkWarehouseCodeAvailability
);

/* =========================================================
   ROOT ROUTES
========================================================= */

/**
 * @route   GET /api/warehouses
 * @desc    Get paginated tenant warehouse list
 * @access  Private/Admin
 *
 * @route   POST /api/warehouses
 * @desc    Create a new warehouse
 * @access  Private/Admin
 */
router
  .route("/")
  .get(
    validateWarehouseQuery,
    getWarehouses
  )
  .post(
    validateCreateWarehouse,
    createWarehouse
  );

/* =========================================================
   PARAMETER MIDDLEWARE
========================================================= */

/*
 * All routes containing :warehouseId pass through
 * the warehouse ID validator automatically.
 */
router.param(
  "warehouseId",
  (
    req,
    res,
    next,
    warehouseId
  ) => {
    req.params.warehouseId =
      warehouseId;

    return validateWarehouseId(
      req,
      res,
      next
    );
  }
);

/* =========================================================
   RESTORE ROUTE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/restore
 * @desc    Restore a soft-deleted warehouse
 * @access  Private/Admin
 *
 * Optional body:
 *
 * {
 *   "makeDefault": true
 * }
 */
router.patch(
  "/:warehouseId/restore",
  restoreWarehouse
);

/* =========================================================
   DEFAULT WAREHOUSE ROUTE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/default
 * @desc    Set a warehouse as tenant default
 * @access  Private/Admin
 *
 * Body:
 *
 * {
 *   "isDefault": true
 * }
 */
router.patch(
  "/:warehouseId/default",
  validateSetDefaultWarehouse,
  setDefaultWarehouse
);

/* =========================================================
   STATUS ROUTE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/status
 * @desc    Change warehouse operational status
 * @access  Private/Admin
 *
 * Body example:
 *
 * {
 *   "status": "Maintenance",
 *   "reason": "Annual maintenance"
 * }
 */
router.patch(
  "/:warehouseId/status",
  validateWarehouseStatus,
  changeWarehouseStatus
);

/* =========================================================
   SINGLE WAREHOUSE ROUTES
========================================================= */

/**
 * @route   GET /api/warehouses/:warehouseId
 * @desc    Get warehouse details
 * @access  Private/Admin
 *
 * @route   PATCH /api/warehouses/:warehouseId
 * @desc    Update warehouse
 * @access  Private/Admin
 *
 * @route   DELETE /api/warehouses/:warehouseId
 * @desc    Soft-delete warehouse
 * @access  Private/Admin
 */
router
  .route("/:warehouseId")
  .get(
    getWarehouseById
  )
  .patch(
    validateUpdateWarehouse,
    updateWarehouse
  )
  .delete(
    deleteWarehouse
  );

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;