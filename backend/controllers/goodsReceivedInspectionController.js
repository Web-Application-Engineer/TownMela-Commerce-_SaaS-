"use strict";

const {
  getGoodsReceivedInspection,
  startGoodsReceivedInspection,
  completeGoodsReceivedInspection,
  resetGoodsReceivedInspection,
} = require(
  "../services/purchasing/goodsReceivedInspectionService"
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
   ERROR HELPER
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

/* =========================================================
   REQUEST CONTEXT VALIDATION
========================================================= */

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
   SUCCESS RESPONSE HELPER
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
    response.requestId =
      requestId;
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
   GET GOODS RECEIVED INSPECTION

   GET
   /api/goods-received/:goodsReceivedId/inspection
========================================================= */

const getGoodsReceivedInspectionController =
  asyncController(
    async (req, res) => {
      const tenantId =
        ensureTenantContext(req);

      const {
        goodsReceivedId,
      } = req.params;

      const result =
        await getGoodsReceivedInspection({
          tenantId,
          goodsReceivedId,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods received inspection retrieved successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   START GOODS RECEIVED INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/start
========================================================= */

const startGoodsReceivedInspectionController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const {
        goodsReceivedId,
      } = req.params;

      const result =
        await startGoodsReceivedInspection({
          tenantId,
          goodsReceivedId,
          userId,
          payload: req.body || {},
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods received inspection started successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   COMPLETE GOODS RECEIVED INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/complete

   Expected body:

   {
     "items": [
       {
         "goodsReceivedItemId": "...",
         "inspectedQuantity": 60,
         "passedQuantity": 60,
         "failedQuantity": 0,
         "qualityGrade": "A",
         "remarks": ""
       }
     ],
     "note": ""
   }
========================================================= */

const completeGoodsReceivedInspectionController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const {
        goodsReceivedId,
      } = req.params;

      const result =
        await completeGoodsReceivedInspection({
          tenantId,
          goodsReceivedId,
          userId,
          payload: req.body,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods received inspection completed successfully",

        data: result,

        requestId:
          req.requestId,
      });
    }
  );

/* =========================================================
   RESET GOODS RECEIVED INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/reset
========================================================= */

const resetGoodsReceivedInspectionController =
  asyncController(
    async (req, res) => {
      const {
        tenantId,
        userId,
      } = ensureRequestContext(req);

      const {
        goodsReceivedId,
      } = req.params;

      const result =
        await resetGoodsReceivedInspection({
          tenantId,
          goodsReceivedId,
          userId,
          payload: req.body || {},
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods received inspection reset successfully",

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
  getGoodsReceivedInspection:
    getGoodsReceivedInspectionController,

  startGoodsReceivedInspection:
    startGoodsReceivedInspectionController,

  completeGoodsReceivedInspection:
    completeGoodsReceivedInspectionController,

  resetGoodsReceivedInspection:
    resetGoodsReceivedInspectionController,
};