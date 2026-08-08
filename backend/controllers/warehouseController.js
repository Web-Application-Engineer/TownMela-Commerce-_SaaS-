"use strict";

const warehouseService = require(
  "../services/inventory/warehouseService"
);

/* =========================================================
   ASYNC HANDLER
========================================================= */

const asyncHandler = (handler) => {
  return function warehouseAsyncHandler(
    req,
    res,
    next
  ) {
    Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
};

/* =========================================================
   REQUEST CONTEXT HELPERS
========================================================= */

const getObjectIdValue = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (value._id) {
    return String(value._id);
  }

  if (value.id) {
    return String(value.id);
  }

  return String(value);
};

const resolveTenantId = (req) => {
  const tenantId =
    req.tenantId ||
    req.tenant?._id ||
    req.tenant?.id ||
    req.tenant ||
    req.user?.activeTenantId ||
    req.user?.tenantId ||
    req.user?.tenant_id ||
    req.user?.tenant?._id ||
    req.user?.tenant?.id ||
    req.user?.tenant ||
    req.user?.organizationId ||
    req.user?.companyId;

  return getObjectIdValue(
    tenantId
  );
};

const resolveUserId = (req) => {
  const userId =
    req.user?._id ||
    req.user?.id ||
    req.userId ||
    req.auth?.userId;

  return getObjectIdValue(
    userId
  );
};

const resolveWarehouseId = (
  req
) => {
  return (
    req.params?.warehouseId ||
    req.params?.id ||
    null
  );
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
    meta = undefined,
  } = {}
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return res
    .status(statusCode)
    .json(response);
};

const sendCreated = (
  res,
  {
    message,
    data,
  }
) => {
  return sendSuccess(res, {
    statusCode: 201,
    message,
    data,
  });
};

/* =========================================================
   CONTEXT VALIDATION
========================================================= */

const ensureTenantContext = (
  req
) => {
  const tenantId =
    resolveTenantId(req);

  if (!tenantId) {
    const error = new Error(
      "Tenant context is required"
    );

    error.statusCode = 400;
    error.code =
      "TENANT_CONTEXT_REQUIRED";

    throw error;
  }

  return tenantId;
};

const ensureUserContext = (
  req
) => {
  const userId =
    resolveUserId(req);

  if (!userId) {
    const error = new Error(
      "Authenticated user context is required"
    );

    error.statusCode = 401;
    error.code =
      "AUTHENTICATED_USER_REQUIRED";

    throw error;
  }

  return userId;
};

const ensureWarehouseId = (
  req
) => {
  const warehouseId =
    resolveWarehouseId(req);

  if (!warehouseId) {
    const error = new Error(
      "Warehouse identifier is required"
    );

    error.statusCode = 400;
    error.code =
      "WAREHOUSE_ID_REQUIRED";

    throw error;
  }

  return warehouseId;
};

/* =========================================================
   QUERY HELPERS
========================================================= */

const parseBooleanQuery = (
  value,
  fallback = undefined
) => {
  if (
    value === true ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false"
  ) {
    return false;
  }

  return fallback;
};

/* =========================================================
   CREATE WAREHOUSE
========================================================= */

/**
 * @route   POST /api/warehouses
 * @access  Private/Admin
 */
const createWarehouse = asyncHandler(
  async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const userId =
      ensureUserContext(req);

    const warehouse =
      await warehouseService.createWarehouse(
        {
          tenantId,
          userId,
          payload: req.body,
        }
      );

    return sendCreated(res, {
      message:
        "Warehouse created successfully",
      data: {
        warehouse,
      },
    });
  }
);

/* =========================================================
   LIST WAREHOUSES
========================================================= */

/**
 * @route   GET /api/warehouses
 * @access  Private/Admin
 */
const getWarehouses = asyncHandler(
  async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const result =
      await warehouseService.getWarehouses(
        {
          tenantId,
          query:
            req.validatedQuery ||
            req.query ||
            {},
        }
      );

    return sendSuccess(res, {
      message:
        "Warehouses retrieved successfully",
      data: {
        warehouses:
          result.warehouses,
      },
      meta: {
        pagination:
          result.pagination,
      },
    });
  }
);

/* =========================================================
   GET WAREHOUSE BY ID
========================================================= */

/**
 * @route   GET /api/warehouses/:warehouseId
 * @access  Private/Admin
 */
const getWarehouseById =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const warehouseId =
        ensureWarehouseId(req);

      const includeDeleted =
        parseBooleanQuery(
          req.query?.includeDeleted,
          false
        );

      const warehouse =
        await warehouseService.getWarehouseById(
          {
            tenantId,
            warehouseId,
            includeDeleted,
          }
        );

      return sendSuccess(res, {
        message:
          "Warehouse retrieved successfully",
        data: {
          warehouse,
        },
      });
    }
  );

/* =========================================================
   GET DEFAULT WAREHOUSE
========================================================= */

/**
 * @route   GET /api/warehouses/default
 * @access  Private/Admin
 */
const getDefaultWarehouse =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const warehouse =
        await warehouseService.getDefaultWarehouse(
          {
            tenantId,
          }
        );

      return sendSuccess(res, {
        message: warehouse
          ? "Default warehouse retrieved successfully"
          : "No default warehouse found",
        data: {
          warehouse:
            warehouse || null,
        },
      });
    }
  );

/* =========================================================
   GET ACTIVE WAREHOUSES
========================================================= */

/**
 * @route   GET /api/warehouses/active
 * @access  Private/Admin
 */
const getActiveWarehouses =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const warehouses =
        await warehouseService.getActiveWarehouses(
          {
            tenantId,

            allowPurchasing:
              req.query
                ?.allowPurchasing,

            allowSalesFulfillment:
              req.query
                ?.allowSalesFulfillment,

            allowTransfers:
              req.query
                ?.allowTransfers,

            allowReturns:
              req.query
                ?.allowReturns,
          }
        );

      return sendSuccess(res, {
        message:
          "Active warehouses retrieved successfully",
        data: {
          warehouses,
        },
        meta: {
          total:
            warehouses.length,
        },
      });
    }
  );

/* =========================================================
   UPDATE WAREHOUSE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId
 * @access  Private/Admin
 */
const updateWarehouse = asyncHandler(
  async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const userId =
      ensureUserContext(req);

    const warehouseId =
      ensureWarehouseId(req);

    const warehouse =
      await warehouseService.updateWarehouse(
        {
          tenantId,
          warehouseId,
          userId,
          payload: req.body,
        }
      );

    return sendSuccess(res, {
      message:
        "Warehouse updated successfully",
      data: {
        warehouse,
      },
    });
  }
);

/* =========================================================
   SET DEFAULT WAREHOUSE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/default
 * @access  Private/Admin
 */
const setDefaultWarehouse =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const userId =
        ensureUserContext(req);

      const warehouseId =
        ensureWarehouseId(req);

      const warehouse =
        await warehouseService.setDefaultWarehouse(
          {
            tenantId,
            warehouseId,
            userId,
          }
        );

      return sendSuccess(res, {
        message:
          "Default warehouse updated successfully",
        data: {
          warehouse,
        },
      });
    }
  );

/* =========================================================
   CHANGE WAREHOUSE STATUS
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/status
 * @access  Private/Admin
 */
const changeWarehouseStatus =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const userId =
        ensureUserContext(req);

      const warehouseId =
        ensureWarehouseId(req);

      const warehouse =
        await warehouseService.changeWarehouseStatus(
          {
            tenantId,
            warehouseId,
            userId,
            status:
              req.body.status,
            reason:
              req.body.reason ||
              null,
          }
        );

      return sendSuccess(res, {
        message:
          "Warehouse status updated successfully",
        data: {
          warehouse,
        },
      });
    }
  );

/* =========================================================
   SOFT DELETE WAREHOUSE
========================================================= */

/**
 * @route   DELETE /api/warehouses/:warehouseId
 * @access  Private/Admin
 */
const deleteWarehouse = asyncHandler(
  async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const userId =
      ensureUserContext(req);

    const warehouseId =
      ensureWarehouseId(req);

    const warehouse =
      await warehouseService.deleteWarehouse(
        {
          tenantId,
          warehouseId,
          userId,
        }
      );

    return sendSuccess(res, {
      message:
        "Warehouse deleted successfully",
      data: {
        warehouse,
      },
    });
  }
);

/* =========================================================
   RESTORE WAREHOUSE
========================================================= */

/**
 * @route   PATCH /api/warehouses/:warehouseId/restore
 * @access  Private/Admin
 */
const restoreWarehouse =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const userId =
        ensureUserContext(req);

      const warehouseId =
        ensureWarehouseId(req);

      const makeDefault =
        parseBooleanQuery(
          req.body?.makeDefault,
          false
        );

      const warehouse =
        await warehouseService.restoreWarehouse(
          {
            tenantId,
            warehouseId,
            userId,
            makeDefault,
          }
        );

      return sendSuccess(res, {
        message:
          "Warehouse restored successfully",
        data: {
          warehouse,
        },
      });
    }
  );

/* =========================================================
   CHECK CODE AVAILABILITY
========================================================= */

/**
 * @route   GET /api/warehouses/code-availability
 * @access  Private/Admin
 *
 * Query:
 * ?code=WH-001
 * &excludeWarehouseId=<id>
 */
const checkWarehouseCodeAvailability =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const code =
        req.query?.code;

      if (
        !code ||
        !String(code).trim()
      ) {
        const error =
          new Error(
            "Warehouse code is required"
          );

        error.statusCode = 400;
        error.code =
          "WAREHOUSE_CODE_REQUIRED";

        throw error;
      }

      const result =
        await warehouseService.checkWarehouseCodeAvailability(
          {
            tenantId,
            code,

            excludeWarehouseId:
              req.query
                ?.excludeWarehouseId ||
              null,
          }
        );

      return sendSuccess(res, {
        message: result.available
          ? "Warehouse code is available"
          : "Warehouse code is already in use",
        data: result,
      });
    }
  );

/* =========================================================
   WAREHOUSE SUMMARY
========================================================= */

/**
 * @route   GET /api/warehouses/summary
 * @access  Private/Admin
 */
const getWarehouseSummary =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const summary =
        await warehouseService.getWarehouseSummary(
          {
            tenantId,
          }
        );

      return sendSuccess(res, {
        message:
          "Warehouse summary retrieved successfully",
        data: {
          summary,
        },
      });
    }
  );

/* =========================================================
   MODULE EXPORTS
========================================================= */

module.exports = {
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
};