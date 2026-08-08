"use strict";

const {
  previewGoodsReceivedInventoryPosting,
  postGoodsReceivedInventory,
  getGoodsReceivedInventoryPosting,
  getPendingInventoryPostingQueue,
} = require(
  "../services/purchasing/goodsReceivedInventoryPostingService"
);

/* =========================================================
   RESPONSE HELPER
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message,
    data = null,
  }
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res
    .status(statusCode)
    .json(response);
};

/* =========================================================
   ASYNC HANDLER
========================================================= */

const asyncHandler = (
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
   REQUEST CONTEXT HELPERS
========================================================= */

const resolveTenantId = (req) => {
  const tenantId =
    req.tenantId ||
    req.tenant?._id ||
    req.tenant?.id ||
    req.user?.tenantId ||
    req.user?.tenant ||
    req.get?.("X-Tenant-Id");

  if (!tenantId) {
    const error = new Error(
      "Tenant context is required"
    );

    error.statusCode = 401;
    error.code =
      "TENANT_CONTEXT_REQUIRED";

    throw error;
  }

  return tenantId;
};

const resolveUserId = (req) => {
  const userId =
    req.user?._id ||
    req.user?.id ||
    req.admin?._id ||
    req.admin?.id;

  if (!userId) {
    const error = new Error(
      "Authenticated user context is required"
    );

    error.statusCode = 401;
    error.code =
      "USER_CONTEXT_REQUIRED";

    throw error;
  }

  return userId;
};

const resolveValidatedQuery = (
  req
) => {
  if (
    req.validatedQuery &&
    typeof req.validatedQuery ===
      "object" &&
    !Array.isArray(
      req.validatedQuery
    )
  ) {
    return req.validatedQuery;
  }

  return req.query || {};
};

/* =========================================================
   PREVIEW INVENTORY POSTING

   GET
   /api/goods-received-inventory-posting/
   :goodsReceivedId/preview
========================================================= */

const previewInventoryPosting =
  asyncHandler(
    async (req, res) => {
      const result =
        await previewGoodsReceivedInventoryPosting({
          tenantId:
            resolveTenantId(req),

          goodsReceivedId:
            req.params?.goodsReceivedId ||
            req.params?.id,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt inventory posting preview retrieved successfully",

        data: result,
      });
    }
  );

/* =========================================================
   POST GOODS RECEIPT TO INVENTORY

   POST
   /api/goods-received-inventory-posting/
   :goodsReceivedId/post
========================================================= */

const postInventory =
  asyncHandler(
    async (req, res) => {
      const result =
        await postGoodsReceivedInventory({
          tenantId:
            resolveTenantId(req),

          goodsReceivedId:
            req.params?.goodsReceivedId ||
            req.params?.id,

          userId:
            resolveUserId(req),

          payload:
            req.body || {},
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          result?.postingSummary
            ?.status === "Posted"
            ? "Goods receipt posted to inventory successfully"
            : "Goods receipt inventory posting processed successfully",

        data: result,
      });
    }
  );

/* =========================================================
   GET INVENTORY POSTING DETAILS

   GET
   /api/goods-received-inventory-posting/
   :goodsReceivedId
========================================================= */

const getInventoryPosting =
  asyncHandler(
    async (req, res) => {
      const result =
        await getGoodsReceivedInventoryPosting({
          tenantId:
            resolveTenantId(req),

          goodsReceivedId:
            req.params?.goodsReceivedId ||
            req.params?.id,
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Goods receipt inventory posting details retrieved successfully",

        data: result,
      });
    }
  );

/* =========================================================
   GET PENDING INVENTORY POSTING QUEUE

   GET
   /api/goods-received-inventory-posting/queue
========================================================= */

const getPendingPostingQueue =
  asyncHandler(
    async (req, res) => {
      const result =
        await getPendingInventoryPostingQueue({
          tenantId:
            resolveTenantId(req),

          query:
            resolveValidatedQuery(
              req
            ),
        });

      return sendSuccess(res, {
        statusCode: 200,

        message:
          "Pending inventory posting queue retrieved successfully",

        data: result,
      });
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  previewGoodsReceivedInventoryPosting:
    previewInventoryPosting,

  postGoodsReceivedInventory:
    postInventory,

  getGoodsReceivedInventoryPosting:
    getInventoryPosting,

  getPendingInventoryPostingQueue:
    getPendingPostingQueue,
};
