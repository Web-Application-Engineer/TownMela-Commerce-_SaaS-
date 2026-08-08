"use strict";

const mongoose = require("mongoose");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
} = require("../services/purchasing/supplierService");

/* =========================================================
   HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

const resolveTenantId = (req) => {
  const candidate =
    req.tenant?._id ||
    req.tenant?.id ||
    req.tenantId ||
    req.user?.tenant?._id ||
    req.user?.tenant ||
    req.user?.tenantId ||
    req.auth?.tenantId ||
    null;

  if (!candidate) {
    throw createHttpError(
      400,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      candidate
    )
  ) {
    throw createHttpError(
      400,
      "Invalid tenant context",
      "INVALID_TENANT_CONTEXT"
    );
  }

  return new mongoose.Types.ObjectId(
    candidate
  );
};

const resolveUserId = (req) => {
  const candidate =
    req.user?._id ||
    req.user?.id ||
    req.auth?.userId ||
    null;

  if (!candidate) {
    throw createHttpError(
      401,
      "Authenticated user context is required",
      "USER_CONTEXT_REQUIRED"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      candidate
    )
  ) {
    throw createHttpError(
      401,
      "Invalid authenticated user context",
      "INVALID_USER_CONTEXT"
    );
  }

  return new mongoose.Types.ObjectId(
    candidate
  );
};

const sendErrorResponse = (
  res,
  error,
  fallbackMessage
) => {
  console.error(
    fallbackMessage,
    error
  );

  if (error.code === 11000) {
    const duplicateField =
      Object.keys(
        error.keyPattern || {}
      ).find(
        (field) =>
          field !== "tenant"
      ) || "record";

    return res.status(409).json({
      success: false,
      code: "DUPLICATE_RECORD",
      message:
        duplicateField ===
        "supplierCode"
          ? "Supplier code already exists"
          : "A duplicate supplier record already exists",
    });
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    const errors =
      Object.values(
        error.errors || {}
      ).map((item) => ({
        field: item.path,
        message: item.message,
      }));

    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message:
        error.message ||
        "Supplier validation failed",
      errors,
    });
  }

  if (
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_IDENTIFIER",
      message:
        "Invalid supplier identifier",
    });
  }

  return res
    .status(
      error.statusCode || 500
    )
    .json({
      success: false,
      code:
        error.code ||
        "SUPPLIER_OPERATION_FAILED",
      message:
        error.message ||
        fallbackMessage,
    });
};

/* =========================================================
   CREATE SUPPLIER

   POST /api/suppliers
========================================================= */

const createSupplierController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const userId =
        resolveUserId(req);

      const supplier =
        await createSupplier({
          tenantId,
          userId,
          payload: req.body,
        });

      return res.status(201).json({
        success: true,
        message:
          "Supplier created successfully",
        supplier,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Create supplier error"
      );
    }
  };

/* =========================================================
   GET SUPPLIER LIST

   GET /api/suppliers

   Supported query parameters:

   ?page=1
   ?limit=20
   ?search=Rahman
   ?status=Active
   ?supplierType=Local
   ?sortBy=createdAt
   ?sortOrder=desc
========================================================= */

const getSuppliersController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const result =
        await getSuppliers({
          tenantId,
          queryParams: req.query,
        });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Get suppliers error"
      );
    }
  };

/* =========================================================
   GET SINGLE SUPPLIER

   GET /api/suppliers/:supplierId
========================================================= */

const getSupplierByIdController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const supplier =
        await getSupplierById({
          tenantId,
          supplierId:
            req.params.supplierId,
        });

      return res.status(200).json({
        success: true,
        supplier,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Get supplier error"
      );
    }
  };

/* =========================================================
   UPDATE SUPPLIER

   PUT /api/suppliers/:supplierId
   PATCH /api/suppliers/:supplierId
========================================================= */

const updateSupplierController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const userId =
        resolveUserId(req);

      const supplier =
        await updateSupplier({
          tenantId,
          supplierId:
            req.params.supplierId,
          userId,
          payload: req.body,
        });

      return res.status(200).json({
        success: true,
        message:
          "Supplier updated successfully",
        supplier,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Update supplier error"
      );
    }
  };

/* =========================================================
   SOFT DELETE SUPPLIER

   DELETE /api/suppliers/:supplierId
========================================================= */

const deleteSupplierController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const userId =
        resolveUserId(req);

      const supplier =
        await deleteSupplier({
          tenantId,
          supplierId:
            req.params.supplierId,
          userId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Supplier deleted successfully",
        supplier: {
          _id: supplier._id,
          supplierCode:
            supplier.supplierCode,
          businessName:
            supplier.businessName,
          status:
            supplier.status,
          isDeleted:
            supplier.isDeleted,
          deletedAt:
            supplier.deletedAt,
        },
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Delete supplier error"
      );
    }
  };

/* =========================================================
   RESTORE SUPPLIER

   PATCH /api/suppliers/:supplierId/restore
========================================================= */

const restoreSupplierController =
  async (req, res) => {
    try {
      const tenantId =
        resolveTenantId(req);

      const userId =
        resolveUserId(req);

      const supplier =
        await restoreSupplier({
          tenantId,
          supplierId:
            req.params.supplierId,
          userId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Supplier restored successfully",
        supplier,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        error,
        "Restore supplier error"
      );
    }
  };

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  createSupplier:
    createSupplierController,

  getSuppliers:
    getSuppliersController,

  getSupplierById:
    getSupplierByIdController,

  updateSupplier:
    updateSupplierController,

  deleteSupplier:
    deleteSupplierController,

  restoreSupplier:
    restoreSupplierController,
};