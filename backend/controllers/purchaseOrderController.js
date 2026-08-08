"use strict";

const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  changePurchaseOrderStatus,
  deletePurchaseOrder,
  restorePurchaseOrder,
} = require(
  "../services/purchasing/purchaseOrderService"
);

/* =========================================================
   REQUEST CONTEXT HELPERS
========================================================= */

const resolveTenantId = (req) => {
  return (
    req.tenantId ||
    req.tenant?._id ||
    req.tenant?.id ||
    req.user?.tenantId ||
    req.user?.tenant?._id ||
    req.user?.tenant ||
    null
  );
};

const resolveUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.auth?.userId ||
    null
  );
};

/* =========================================================
   ERROR HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const ensureRequestContext = (req) => {
  const tenantId = resolveTenantId(req);
  const userId = resolveUserId(req);

  if (!tenantId) {
    throw createHttpError(
      403,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  if (!userId) {
    throw createHttpError(
      401,
      "Authenticated user context is required",
      "USER_CONTEXT_REQUIRED"
    );
  }

  return {
    tenantId,
    userId,
  };
};

const ensureTenantContext = (req) => {
  const tenantId = resolveTenantId(req);

  if (!tenantId) {
    throw createHttpError(
      403,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  return tenantId;
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message,
    data = null,
    requestId = null,
  }
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return res
    .status(statusCode)
    .json(response);
};

/* =========================================================
   ASYNC CONTROLLER WRAPPER
========================================================= */

const asyncController = (controller) => {
  return async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/* =========================================================
   CREATE PURCHASE ORDER

   POST /api/purchase-orders
========================================================= */

const createPurchaseOrderController =
  asyncController(async (req, res) => {
    const {
      tenantId,
      userId,
    } = ensureRequestContext(req);

    const result =
      await createPurchaseOrder({
        tenantId,
        userId,
        payload: req.body,
      });

    return sendSuccess(res, {
      statusCode: 201,

      message:
        "Purchase order created successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   GET PURCHASE ORDERS

   GET /api/purchase-orders
========================================================= */

const getPurchaseOrdersController =
  asyncController(async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const result =
      await getPurchaseOrders({
        tenantId,
        query: req.query,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase orders retrieved successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   GET PURCHASE ORDER BY ID

   GET /api/purchase-orders/:purchaseOrderId
========================================================= */

const getPurchaseOrderByIdController =
  asyncController(async (req, res) => {
    const tenantId =
      ensureTenantContext(req);

    const includeItems =
      req.query.includeItems !==
      "false";

    const includeDeleted =
      req.query.includeDeleted ===
      "true";

    const result =
      await getPurchaseOrderById({
        tenantId,

        purchaseOrderId:
          req.params.purchaseOrderId,

        includeItems,
        includeDeleted,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase order retrieved successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   UPDATE PURCHASE ORDER

   PUT   /api/purchase-orders/:purchaseOrderId
   PATCH /api/purchase-orders/:purchaseOrderId
========================================================= */

const updatePurchaseOrderController =
  asyncController(async (req, res) => {
    const {
      tenantId,
      userId,
    } = ensureRequestContext(req);

    const result =
      await updatePurchaseOrder({
        tenantId,

        purchaseOrderId:
          req.params.purchaseOrderId,

        userId,

        payload: req.body,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase order updated successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   CHANGE PURCHASE ORDER STATUS

   PATCH /api/purchase-orders/:purchaseOrderId/status
========================================================= */

const changePurchaseOrderStatusController =
  asyncController(async (req, res) => {
    const {
      tenantId,
      userId,
    } = ensureRequestContext(req);

    const {
      status,
      reason,
      note,
    } = req.body;

    const result =
      await changePurchaseOrderStatus({
        tenantId,

        purchaseOrderId:
          req.params.purchaseOrderId,

        userId,
        status,
        reason,
        note,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase order status updated successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   DELETE PURCHASE ORDER

   DELETE /api/purchase-orders/:purchaseOrderId
========================================================= */

const deletePurchaseOrderController =
  asyncController(async (req, res) => {
    const {
      tenantId,
      userId,
    } = ensureRequestContext(req);

    const result =
      await deletePurchaseOrder({
        tenantId,

        purchaseOrderId:
          req.params.purchaseOrderId,

        userId,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase order deleted successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   RESTORE PURCHASE ORDER

   PATCH /api/purchase-orders/:purchaseOrderId/restore
========================================================= */

const restorePurchaseOrderController =
  asyncController(async (req, res) => {
    const {
      tenantId,
      userId,
    } = ensureRequestContext(req);

    const result =
      await restorePurchaseOrder({
        tenantId,

        purchaseOrderId:
          req.params.purchaseOrderId,

        userId,
      });

    return sendSuccess(res, {
      statusCode: 200,

      message:
        "Purchase order restored successfully",

      data: result,

      requestId:
        req.requestId,
    });
  });

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createPurchaseOrder:
    createPurchaseOrderController,

  getPurchaseOrders:
    getPurchaseOrdersController,

  getPurchaseOrderById:
    getPurchaseOrderByIdController,

  updatePurchaseOrder:
    updatePurchaseOrderController,

  changePurchaseOrderStatus:
    changePurchaseOrderStatusController,

  deletePurchaseOrder:
    deletePurchaseOrderController,

  restorePurchaseOrder:
    restorePurchaseOrderController,
};