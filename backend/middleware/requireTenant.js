"use strict";

const mongoose = require(
  "mongoose",
);

/* =========================================================
   ERROR HELPER
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code,
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

/* =========================================================
   VALUE HELPERS
========================================================= */

const normalizeId = (
  value,
) => {
  if (!value) {
    return "";
  }

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    typeof value ===
    "object"
  ) {
    const nestedId =
      value._id ||
      value.id ||
      value.tenantId ||
      "";

    return normalizeId(
      nestedId,
    );
  }

  return String(value).trim();
};

const normalizeRole = (
  value,
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getAuthenticatedRole = (
  req,
) =>
  normalizeRole(
    req.user?.role ||
      req.admin?.role ||
      req.auth?.role ||
      "",
  );

const getAuthenticatedTenantId = (
  req,
) =>
  normalizeId(
    req.user?.tenant?._id ||
      req.user?.tenant?.id ||
      req.user?.tenant ||
      req.user?.tenantId ||
      req.admin?.tenant?._id ||
      req.admin?.tenant ||
      req.admin?.tenantId ||
      req.auth?.tenantId ||
      "",
  );

const getResolvedTenantId = (
  req,
) =>
  normalizeId(
    req.tenant?._id ||
      req.tenant?.id ||
      req.tenant ||
      req.tenantId ||
      "",
  );

const getHeaderTenantId = (
  req,
) =>
  normalizeId(
    req.get?.(
      "X-Tenant-Id",
    ) ||
      req.headers?.[
        "x-tenant-id"
      ] ||
      "",
  );

/* =========================================================
   REMOVE CLIENT TENANT PAYLOAD

   Tenant body/query/params থেকে trusted হবে না।
========================================================= */

const removeClientTenantFields = (
  req,
) => {
  if (
    req.body &&
    typeof req.body ===
      "object" &&
    !Array.isArray(
      req.body,
    )
  ) {
    delete req.body.tenant;
    delete req.body.tenantId;
  }

  if (
    req.query &&
    typeof req.query ===
      "object"
  ) {
    delete req.query.tenant;
    delete req.query.tenantId;
  }
};

/* =========================================================
   REQUIRE TENANT MIDDLEWARE

   Tenant Admin:
   - নিজের authenticated tenant-এ locked থাকবে।
   - X-Tenant-Id দিয়ে tenant বদলাতে পারবে না।

   Super Admin:
   - Global Tenant Switcher-এর X-Tenant-Id ব্যবহার করবে.

   Domain/storefront middleware:
   - আগে req.tenant বা req.tenantId set করলে সেটিও গ্রহণ করবে.
========================================================= */

const requireTenant = (
  req,
  res,
  next,
) => {
  try {
    const role =
      getAuthenticatedRole(
        req,
      );

    const authenticatedTenantId =
      getAuthenticatedTenantId(
        req,
      );

    const resolvedTenantId =
      getResolvedTenantId(
        req,
      );

    const headerTenantId =
      getHeaderTenantId(
        req,
      );

    const isSuperAdmin =
      role ===
        "superadmin" ||
      role ===
        "super_admin" ||
      role ===
        "platform_owner";

    let tenantCandidate =
      "";

    /*
     * Tenant admins must always use the tenant assigned
     * to their authenticated account.
     */

    if (!isSuperAdmin) {
      tenantCandidate =
        authenticatedTenantId ||
        resolvedTenantId;

      if (
        headerTenantId &&
        tenantCandidate &&
        headerTenantId !==
          tenantCandidate
      ) {
        throw createHttpError(
          403,
          "You cannot access another tenant",
          "TENANT_ACCESS_DENIED",
        );
      }
    }

    /*
     * Super Admin selects an active tenant through
     * the Global Tenant Switcher.
     */

    if (isSuperAdmin) {
      tenantCandidate =
        headerTenantId ||
        resolvedTenantId;
    }

    /*
     * Fallback for requests where role is not attached
     * but a trusted upstream middleware resolved tenant.
     */

    if (!tenantCandidate) {
      tenantCandidate =
        resolvedTenantId ||
        authenticatedTenantId;
    }

    if (!tenantCandidate) {
      throw createHttpError(
        403,
        isSuperAdmin
          ? "Please select a tenant before continuing"
          : "Tenant context is required",
        "TENANT_CONTEXT_REQUIRED",
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        tenantCandidate,
      )
    ) {
      throw createHttpError(
        403,
        "Invalid tenant context",
        "INVALID_TENANT_CONTEXT",
      );
    }

    const tenantObjectId =
      new mongoose.Types.ObjectId(
        tenantCandidate,
      );

    /*
     * All downstream controllers and services use
     * the same trusted tenant context.
     */

    req.tenantId =
      tenantObjectId;

    /*
     * Preserve an existing populated tenant object.
     * Otherwise create a minimal normalized tenant context.
     */

    if (
      !req.tenant ||
      typeof req.tenant !==
        "object"
    ) {
      req.tenant = {
        _id: tenantObjectId,
        id:
          tenantObjectId.toString(),
      };
    }

    removeClientTenantFields(
      req,
    );

    return next();
  } catch (error) {
    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        code:
          error.code ||
          "TENANT_VALIDATION_FAILED",

        message:
          error.message ||
          "Tenant validation failed",
      });
  }
};

module.exports =
  requireTenant;