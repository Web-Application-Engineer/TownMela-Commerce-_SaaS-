"use strict";

const vendorInvoiceService = require(
  "../services/purchasing/vendorInvoiceService"
);

/* =========================================================
   ASYNC HANDLER
========================================================= */

const asyncHandler = (handler) => {
  if (typeof handler !== "function") {
    throw new TypeError(
      "Controller handler must be a function"
    );
  }

  return function wrappedHandler(
    req,
    res,
    next
  ) {
    return Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
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
    meta = undefined,
  }
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

/* =========================================================
   REQUEST CONTEXT HELPERS
========================================================= */

const getTenantId = (req) => {
  const tenantId =
    req.tenantId ||
    req.tenant?._id ||
    req.tenant?.id ||
    null;

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

const getUserId = (req) => {
  const userId =
    req.user?._id ||
    req.user?.id ||
    null;

  if (!userId) {
    const error = new Error(
      "Authenticated user is required"
    );

    error.statusCode = 401;
    error.code =
      "AUTHENTICATED_USER_REQUIRED";

    throw error;
  }

  return userId;
};

/* =========================================================
   CREATE VENDOR INVOICE
========================================================= */

const createVendorInvoice =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .createVendorInvoice({
            tenantId:
              getTenantId(req),

            userId:
              getUserId(req),

            payload:
              req.body,
          });

      return sendSuccess(res, {
        statusCode: 201,

        message:
          "Vendor invoice created successfully",

        data: result,
      });
    }
  );

/* =========================================================
   GET VENDOR INVOICE LIST
========================================================= */

const getVendorInvoiceList =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .getVendorInvoiceList({
            tenantId:
              getTenantId(req),

            query:
              req.query,
          });

      return sendSuccess(res, {
        message:
          "Vendor invoices retrieved successfully",

        data:
          result.data,

        meta: {
          pagination:
            result.pagination,
        },
      });
    }
  );

/* =========================================================
   GET VENDOR INVOICE BY ID
========================================================= */

const getVendorInvoiceById =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .getVendorInvoiceById({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            includeDeleted:
              req.query
                .includeDeleted ===
              "true",
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice retrieved successfully",

        data: result,
      });
    }
  );

/* =========================================================
   UPDATE VENDOR INVOICE
========================================================= */

const updateVendorInvoice =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .updateVendorInvoice({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            userId:
              getUserId(req),

            payload:
              req.body,
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice updated successfully",

        data: result,
      });
    }
  );

/* =========================================================
   THREE-WAY MATCHING
========================================================= */

const performThreeWayMatching =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .performThreeWayMatching({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            userId:
              getUserId(req),

            payload:
              req.body || {},
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice matching completed successfully",

        data: result,
      });
    }
  );

/* =========================================================
   CHANGE VENDOR INVOICE STATUS
========================================================= */

const changeVendorInvoiceStatus =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .changeVendorInvoiceStatus({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            userId:
              getUserId(req),

            status:
              req.body.status,

            remarks:
              req.body.remarks ||
              null,
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice status updated successfully",

        data: result,
      });
    }
  );

/* =========================================================
   DELETE VENDOR INVOICE
========================================================= */

const deleteVendorInvoice =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .deleteVendorInvoice({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            userId:
              getUserId(req),

            reason:
              req.body?.reason ||
              null,
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice deleted successfully",

        data: result,
      });
    }
  );

/* =========================================================
   RESTORE VENDOR INVOICE
========================================================= */

const restoreVendorInvoice =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .restoreVendorInvoice({
            tenantId:
              getTenantId(req),

            vendorInvoiceId:
              req.params
                .vendorInvoiceId,

            userId:
              getUserId(req),
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice restored successfully",

        data: result,
      });
    }
  );

/* =========================================================
   GET OUTSTANDING SUMMARY
========================================================= */

const getVendorInvoiceOutstandingSummary =
  asyncHandler(
    async (req, res) => {
      const result =
        await vendorInvoiceService
          .getVendorInvoiceOutstandingSummary({
            tenantId:
              getTenantId(req),

            supplierId:
              req.query
                .supplier ||
              null,
          });

      return sendSuccess(res, {
        message:
          "Vendor invoice outstanding summary retrieved successfully",

        data: result,
      });
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createVendorInvoice,
  getVendorInvoiceList,
  getVendorInvoiceById,
  updateVendorInvoice,
  performThreeWayMatching,
  changeVendorInvoiceStatus,
  deleteVendorInvoice,
  restoreVendorInvoice,
  getVendorInvoiceOutstandingSummary,
};