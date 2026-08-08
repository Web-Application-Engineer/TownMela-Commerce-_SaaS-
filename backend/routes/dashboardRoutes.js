const express = require("express");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getExecutiveDashboard,
  getDashboardKpis,
} = require("../controllers/dashboardController");

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   DASHBOARD ROUTES

   Base path:
   /api/dashboard
========================================================= */

/**
 * @route   GET /api/dashboard
 * @desc    Get full executive dashboard data
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  adminOnly,
  getExecutiveDashboard
);

/**
 * @route   GET /api/dashboard/kpis
 * @desc    Get compact dashboard KPI data
 * @access  Private/Admin
 */
router.get(
  "/kpis",
  protect,
  adminOnly,
  getDashboardKpis
);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get legacy dashboard statistics
 * @access  Private/Admin
 *
 * This route is preserved for backward compatibility
 * with the existing frontend.
 */
router.get(
  "/stats",
  protect,
  adminOnly,
  getDashboardStats
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
