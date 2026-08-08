"use strict";

const {
  createGoodsReceived,
  getGoodsReceivedList,
  getGoodsReceivedById,
  updateGoodsReceived,
  changeGoodsReceivedStatus,
  deleteGoodsReceived,
  restoreGoodsReceived,
} = require(
  "../services/purchasing/goodsReceivedService"
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

const ensureTenantContext = (req) => {
  const tenantId =
    resolveTenantId(req);

  if (!tenantId) {
    throw createHttpError(
      403,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  return tenantId;
};

const ensureRequestContext = (req) => {
  const tenantId =
    resolveTenantId(req);

  const userId =
    resolveUserId(req);

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

/* =========================================================
   BOOLEAN PARSER
========================================================= */

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue =
    String(value)
      .trim()
      .toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return fallback;
};

/* =========================================================
   RESPONSE HELPER
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

const asyncController = (
  controller
) => {
  return async (
    req,
    res,
    next
  ) => {
    try {
      await controller(
        req,
        res,
        next
      );
    } catch (error) {
      next(error);
    }
  };
};

/* =========================================================
   CREATE GOODS RECEIPT

   POST /api/goods-received
========================================================= */

const createGoodsReceivedController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const result =
        await createGoodsReceived({
          tenantId,
          userId,
          payload: req.body,
        });

      return sendSuccess(res, {
        statusCode: 201,

        message:
          "Goods receipt created successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   GET GOODS RECEIPTS

   GET /api/goods-received
========================================================= */

const getGoodsReceivedListController =
  asyncController(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const result =
        await getGoodsReceivedList({
          tenantId,
          query: req.query,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipts retrieved successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   GET GOODS RECEIPT BY ID

   GET /api/goods-received/:goodsReceivedId
========================================================= */

const getGoodsReceivedByIdController =
  asyncController(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const includeItems =
        parseBoolean(
          req.query.includeItems,
          true
        );

      const includeDeleted =
        parseBoolean(
          req.query.includeDeleted,
          false
        );

      const result =
        await getGoodsReceivedById({
          tenantId,

          goodsReceivedId:
            req.params
              .goodsReceivedId,

          includeItems,
          includeDeleted,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt retrieved successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   UPDATE GOODS RECEIPT

   PUT   /api/goods-received/:goodsReceivedId
   PATCH /api/goods-received/:goodsReceivedId
========================================================= */

const updateGoodsReceivedController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const result =
        await updateGoodsReceived({
          tenantId,

          goodsReceivedId:
            req.params
              .goodsReceivedId,

          userId,
          payload: req.body,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt updated successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   CHANGE GOODS RECEIPT STATUS

   PATCH /api/goods-received/:goodsReceivedId/status
========================================================= */

const changeGoodsReceivedStatusController =
  asyncController(
    async (req, res) => {
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
        await changeGoodsReceivedStatus({
          tenantId,

          goodsReceivedId:
            req.params
              .goodsReceivedId,

          userId,
          status,
          reason,
          note,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt status updated successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   DELETE GOODS RECEIPT

   DELETE /api/goods-received/:goodsReceivedId
========================================================= */

const deleteGoodsReceivedController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const result =
        await deleteGoodsReceived({
          tenantId,

          goodsReceivedId:
            req.params
              .goodsReceivedId,

          userId,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt deleted successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   RESTORE GOODS RECEIPT

   PATCH /api/goods-received/:goodsReceivedId/restore
========================================================= */

const restoreGoodsReceivedController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const result =
        await restoreGoodsReceived({
          tenantId,

          goodsReceivedId:
            req.params
              .goodsReceivedId,

          userId,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt restored successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createGoodsReceived:
    createGoodsReceivedController,

  getGoodsReceivedList:
    getGoodsReceivedListController,

  getGoodsReceivedById:
    getGoodsReceivedByIdController,

  updateGoodsReceived:
    updateGoodsReceivedController,

  changeGoodsReceivedStatus:
    changeGoodsReceivedStatusController,

  deleteGoodsReceived:
    deleteGoodsReceivedController,

  restoreGoodsReceived:
    restoreGoodsReceivedController,
};