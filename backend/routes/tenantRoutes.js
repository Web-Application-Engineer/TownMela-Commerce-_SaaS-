const express = require("express");

const tenantController = require("../controllers/tenantController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =====================================================
   PUBLIC TENANT DOMAIN RESOLUTION
===================================================== */

/**
 * Resolve a storefront tenant from its custom domain.
 *
 * Public endpoint because the storefront must resolve its tenant
 * before a customer signs in or uses guest checkout.
 *
 * GET /api/tenants/domain/:domain
 */
router.get(
  "/domain/:domain",
  tenantController.getTenantByDomain
);

/* =====================================================
   PROTECTED TENANT MANAGEMENT
===================================================== */

/**
 * All routes below are protected.
 *
 * IMPORTANT:
 * These tenant-management endpoints should be available only to the
 * TownMela platform owner/admin. If your project later has a separate
 * platformOwnerOnly middleware, add it here after protect.
 */
router.use(protect, adminOnly);

/* =====================================================
   EXPIRED SUBSCRIPTION PROCESSING
===================================================== */

/**
 * This route must be declared before "/:tenantId" so Express does not
 * treat "subscriptions" as a tenantId.
 *
 * POST /api/tenants/subscriptions/suspend-expired
 */
router.post(
  "/subscriptions/suspend-expired",
  tenantController.suspendExpiredTenants
);

/* =====================================================
   TENANT COLLECTION ROUTES
===================================================== */

/**
 * POST /api/tenants
 * Create a tenant with:
 * - Standard subscription plan
 * - 7-day free trial
 */
router.post("/", tenantController.createTenant);

/**
 * GET /api/tenants
 * Get tenant list with search, filters, sorting, and pagination.
 */
router.get("/", tenantController.getTenants);

/* =====================================================
   TENANT-SPECIFIC ACTION ROUTES
===================================================== */

/**
 * PATCH /api/tenants/:tenantId/subscription/renew
 *
 * Example body:
 * {
 *   "durationDays": 30,
 *   "autoRenew": false
 * }
 */
router.patch(
  "/:tenantId/subscription/renew",
  tenantController.renewSubscription
);

/**
 * PATCH /api/tenants/:tenantId/status
 *
 * Body:
 * {
 *   "status": "active" | "inactive" | "suspended"
 * }
 */
router.patch(
  "/:tenantId/status",
  tenantController.updateTenantStatus
);

/**
 * PATCH /api/tenants/:tenantId/suspend
 */
router.patch(
  "/:tenantId/suspend",
  tenantController.suspendTenant
);

/**
 * PATCH /api/tenants/:tenantId/activate
 *
 * An expired tenant cannot be activated until the Standard
 * subscription is renewed.
 */
router.patch(
  "/:tenantId/activate",
  tenantController.activateTenant
);

/* =====================================================
   TENANT RESOURCE ROUTES
===================================================== */

/**
 * GET /api/tenants/:tenantId
 */
router.get(
  "/:tenantId",
  tenantController.getTenantById
);

/**
 * PATCH /api/tenants/:tenantId
 */
router.patch(
  "/:tenantId",
  tenantController.updateTenant
);

/**
 * DELETE /api/tenants/:tenantId
 *
 * Performs a soft delete.
 */
router.delete(
  "/:tenantId",
  tenantController.softDeleteTenant
);

/* =====================================================
   EXPORT
===================================================== */

module.exports = router;
