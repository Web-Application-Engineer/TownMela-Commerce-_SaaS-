const tenantService = require("../services/tenantService");

/* =====================================================
   RESPONSE HELPERS
===================================================== */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
    meta = null,
  } = {}
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, error) => {
  const statusCode =
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const message =
    statusCode === 500
      ? "Internal server error"
      : error?.message || "Request failed";

  if (statusCode === 500) {
    console.error("Tenant controller error:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/* =====================================================
   CREATE TENANT
===================================================== */

/**
 * POST /api/tenants
 *
 * A newly created tenant receives:
 * - Standard plan
 * - 7-day free trial
 * - subscription.status = "trial"
 * - tenant.status = "active"
 */
const createTenant = async (req, res) => {
  try {
    const createdBy =
      req.user?._id ||
      req.user?.id ||
      req.admin?._id ||
      req.admin?.id ||
      null;

    const tenant = await tenantService.createTenant(
      req.body,
      createdBy
    );

    return sendSuccess(res, {
      statusCode: 201,
      message:
        "Tenant created successfully with a 7-day Standard trial",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   GET TENANT LIST
===================================================== */

/**
 * GET /api/tenants
 *
 * Supported query parameters:
 * - page
 * - limit
 * - search
 * - status
 * - subscriptionStatus
 * - plan
 * - sortBy
 * - sortOrder
 *
 * Expired trial tenants are suspended before the list is returned.
 */
const getTenants = async (req, res) => {
  try {
    const result = await tenantService.getTenants(req.query);

    return sendSuccess(res, {
      message: "Tenants fetched successfully",
      data: {
        tenants: result.tenants,
      },
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   GET TENANT BY ID
===================================================== */

/**
 * GET /api/tenants/:tenantId
 *
 * The service checks trial/subscription expiry before returning
 * the tenant. An expired tenant is automatically suspended.
 */
const getTenantById = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(
      req.params.tenantId
    );

    return sendSuccess(res, {
      message: "Tenant fetched successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   UPDATE TENANT
===================================================== */

/**
 * PATCH /api/tenants/:tenantId
 *
 * Subscription and status changes should use their dedicated
 * endpoints instead of this general update endpoint.
 */
const updateTenant = async (req, res) => {
  try {
    const tenant = await tenantService.updateTenant(
      req.params.tenantId,
      req.body
    );

    return sendSuccess(res, {
      message: "Tenant updated successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   UPDATE TENANT STATUS
===================================================== */

/**
 * PATCH /api/tenants/:tenantId/status
 *
 * Request body:
 * {
 *   "status": "active" | "inactive" | "suspended"
 * }
 *
 * An expired tenant cannot be activated until its subscription
 * is renewed.
 */
const updateTenantStatus = async (req, res) => {
  try {
    const tenant = await tenantService.updateTenantStatus(
      req.params.tenantId,
      req.body?.status
    );

    return sendSuccess(res, {
      message: "Tenant status updated successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   RENEW SUBSCRIPTION
===================================================== */

/**
 * PATCH /api/tenants/:tenantId/subscription/renew
 *
 * Request body example:
 * {
 *   "durationDays": 30,
 *   "autoRenew": false
 * }
 *
 * Or:
 * {
 *   "startsAt": "2026-08-01T00:00:00.000Z",
 *   "expiresAt": "2026-09-01T00:00:00.000Z",
 *   "autoRenew": false
 * }
 *
 * Renewal ends the free trial and activates the Standard plan.
 */
const renewSubscription = async (req, res) => {
  try {
    const tenant = await tenantService.renewSubscription(
      req.params.tenantId,
      req.body
    );

    return sendSuccess(res, {
      message:
        "Tenant Standard subscription renewed successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   SUSPEND TENANT
===================================================== */

/**
 * PATCH /api/tenants/:tenantId/suspend
 */
const suspendTenant = async (req, res) => {
  try {
    const tenant = await tenantService.suspendTenant(
      req.params.tenantId
    );

    return sendSuccess(res, {
      message: "Tenant suspended successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   ACTIVATE TENANT
===================================================== */

/**
 * PATCH /api/tenants/:tenantId/activate
 *
 * Activation succeeds only when:
 * - the 7-day trial is still valid, or
 * - the paid subscription has not expired.
 */
const activateTenant = async (req, res) => {
  try {
    const tenant = await tenantService.activateTenant(
      req.params.tenantId
    );

    return sendSuccess(res, {
      message: "Tenant activated successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   SOFT DELETE TENANT
===================================================== */

/**
 * DELETE /api/tenants/:tenantId
 *
 * This is a soft delete. Tenant data remains in the database.
 */
const softDeleteTenant = async (req, res) => {
  try {
    const tenant = await tenantService.softDeleteTenant(
      req.params.tenantId
    );

    return sendSuccess(res, {
      message: "Tenant deleted successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   GET TENANT BY DOMAIN
===================================================== */

/**
 * GET /api/tenants/domain/:domain
 *
 * Returns only a tenant whose store and trial/subscription
 * are currently active.
 */
const getTenantByDomain = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantByDomain(
      req.params.domain
    );

    return sendSuccess(res, {
      message: "Tenant resolved successfully",
      data: {
        tenant,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   SUSPEND ALL EXPIRED TENANTS
===================================================== */

/**
 * POST /api/tenants/subscriptions/suspend-expired
 *
 * Intended for:
 * - a protected platform-owner endpoint, or
 * - an internal scheduler/cron job.
 *
 * It suspends:
 * - expired 7-day trials
 * - expired paid subscriptions
 */
const suspendExpiredTenants = async (req, res) => {
  try {
    const result =
      await tenantService.suspendExpiredTenants();

    return sendSuccess(res, {
      message:
        "Expired tenant subscriptions checked successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  updateTenantStatus,
  renewSubscription,
  suspendTenant,
  activateTenant,
  softDeleteTenant,
  getTenantByDomain,
  suspendExpiredTenants,
};
