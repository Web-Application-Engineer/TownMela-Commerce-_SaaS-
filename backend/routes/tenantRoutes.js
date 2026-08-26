const express = require("express");

const tenantController = require("../controllers/tenantController");
const footerPageController = require("../controllers/footerPageController");

const {
  protect,
  adminOnly,
  allowRoles,
  requireTenant,
} = require("../middleware/authMiddleware");

const resolvePublicTenant = require(
  "../middleware/resolvePublicTenant"
);

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
   PUBLIC STOREFRONT CONTENT PAGE
===================================================== */

/**
 * GET /api/tenants/footer-pages/public/:pageKey
 *
 * Supported pageKey values:
 * - about-us
 * - contact-us
 * - privacy-policy
 * - terms-and-conditions
 * - return-refund-policy
 * - customer-support
 *
 * resolvePublicTenant supports:
 * - X-Tenant-Id
 * - custom request domain
 * - localhost default tenant
 */
router.get(
  "/footer-pages/public/:pageKey",
  resolvePublicTenant,
  footerPageController.getPublicFooterPage
);

/* =====================================================
   PROTECTED TENANT MANAGEMENT
===================================================== */

/**
 * All routes below are protected.
 *
 * IMPORTANT:
 * Existing tenant-management protection is preserved.
 */
router.use(protect, adminOnly);

/* =====================================================
   FOOTER MANAGEMENT
===================================================== */

/**
 * GET /api/tenants/footer-pages
 *
 * Tenant Admin:
 * - Uses the tenant from the authenticated account.
 *
 * Super Admin:
 * - Uses the selected tenant from X-Tenant-Id.
 */
router.get(
  "/footer-pages",
  requireTenant,
  footerPageController.getFooterPages
);

/**
 * PATCH /api/tenants/footer-pages/:pageKey
 *
 * Supported pageKey values:
 * - about-us
 * - contact-us
 * - privacy-policy
 * - terms-and-conditions
 * - return-refund-policy
 * - customer-support
 */
router.patch(
  "/footer-pages/:pageKey",
  requireTenant,
  footerPageController.updateFooterPage
);

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
 * PATCH /api/tenants/:tenantId/trial/extend
 *
 * Super Admin only.
 *
 * Example body:
 * {
 *   "additionalDays": 7
 * }
 */
router.patch(
  "/:tenantId/trial/extend",
  allowRoles("superadmin"),
  tenantController.extendTrial
);

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
 *
 * The backend service blocks suspension of the default TownMela tenant.
 */
router.patch(
  "/:tenantId/suspend",
  tenantController.suspendTenant
);

/**
 * PATCH /api/tenants/:tenantId/activate
 *
 * An expired tenant cannot be activated until the Standard
 * subscription is renewed or its trial is extended.
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
