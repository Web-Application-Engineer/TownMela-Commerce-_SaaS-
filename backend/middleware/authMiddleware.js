"use strict";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendErrorResponse = (
  res,
  statusCode,
  message,
  code = null,
  details = null
) => {
  const response = {
    success: false,
    message,
  };

  if (code) {
    response.code = code;
  }

  if (details !== null) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

const sendUnauthorizedResponse = (
  res,
  message = "Authentication is required",
  code = "UNAUTHORIZED"
) => sendErrorResponse(res, 401, message, code);

const sendForbiddenResponse = (
  res,
  message = "You do not have permission to perform this action",
  code = "FORBIDDEN"
) => sendErrorResponse(res, 403, message, code);

/* =========================================================
   GENERAL HELPERS
========================================================= */

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

const normalizeObjectIdValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && value._id) {
    return String(value._id).trim();
  }

  if (typeof value === "object" && value.id) {
    return String(value.id).trim();
  }

  return String(value).trim();
};

const isValidObjectId = (value) => {
  const normalizedValue = normalizeObjectIdValue(value);

  return Boolean(
    normalizedValue &&
      mongoose.isValidObjectId(normalizedValue)
  );
};

const clearAuthContext = (req) => {
  req.user = null;
  req.tenant = null;
  req.tenantId = null;
  req.auth = null;
};

/* =========================================================
   TOKEN HELPERS
========================================================= */

const extractBearerToken = (req) => {
  const authorizationHeader = req.get("Authorization");

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const parts = authorizationHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim() || null;
};

const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    const error = new Error("JWT_SECRET is not configured");
    error.code = "JWT_SECRET_MISSING";
    throw error;
  }

  return secret;
};

const resolveTokenUserId = (decoded) => {
  if (!decoded || typeof decoded !== "object") {
    return null;
  }

  const rawUserId =
    decoded.id ??
    decoded.userId ??
    decoded._id ??
    decoded.sub ??
    null;

  const userId = normalizeObjectIdValue(rawUserId);

  return isValidObjectId(userId) ? userId : null;
};

const resolveTokenTenantId = (decoded) => {
  if (!decoded || typeof decoded !== "object") {
    return null;
  }

  const candidates = [
    decoded.tenantId,
    decoded.tenant_id,
    decoded.activeTenantId,
    decoded.tenant,
    decoded.organizationId,
    decoded.companyId,
  ];

  for (const candidate of candidates) {
    const tenantId = normalizeObjectIdValue(candidate);

    if (tenantId && isValidObjectId(tenantId)) {
      return tenantId;
    }
  }

  return null;
};

/* =========================================================
   TENANT HELPERS
========================================================= */

const resolveUserTenantId = (user) => {
  const candidates = [
    user?.activeTenantId,
    user?.tenantId,
    user?.tenant_id,
    user?.tenant?._id,
    user?.tenant?.id,
    user?.tenant,
    user?.organizationId,
    user?.organization?._id,
    user?.organization,
    user?.companyId,
    user?.company?._id,
    user?.company,
  ];

  for (const candidate of candidates) {
    const tenantId = normalizeObjectIdValue(candidate);

    if (tenantId && isValidObjectId(tenantId)) {
      return tenantId;
    }
  }

  return null;
};

const resolveHeaderTenantId = (req) => {
  const tenantId = normalizeObjectIdValue(
    req.get("X-Tenant-Id")
  );

  if (!tenantId) {
    return null;
  }

  return isValidObjectId(tenantId) ? tenantId : null;
};

const applyTenantContext = (req, tenantId) => {
  req.tenantId = tenantId || null;

  req.tenant = tenantId
    ? {
        _id: tenantId,
        id: tenantId,
      }
    : null;
};

/* =========================================================
   LOAD AUTHENTICATED USER
========================================================= */

const buildAuthSelection = () => {
  const selection = [];

  const optionalSelectedFields = [
    "tenant",
    "tenantId",
    "tenant_id",
    "activeTenantId",
    "organization",
    "organizationId",
    "company",
    "companyId",
    "isDeleted",
    "isActive",
    "role",
  ];

  for (const field of optionalSelectedFields) {
    if (User.schema.path(field)) {
      selection.push(`+${field}`);
    }
  }

  return selection.join(" ");
};

const loadAuthenticatedUser = async (userId) => {
  const query = User.findById(userId);
  const selection = buildAuthSelection();

  if (selection) {
    query.select(selection);
  }

  return query.exec();
};

/* =========================================================
   PROTECT ROUTES
========================================================= */

const protect = async (req, res, next) => {
  clearAuthContext(req);

  try {
    const token = extractBearerToken(req);

    if (!token) {
      return sendUnauthorizedResponse(
        res,
        "Not authorized, no token",
        "AUTH_TOKEN_REQUIRED"
      );
    }

    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    const userId = resolveTokenUserId(decoded);

    if (!userId) {
      return sendUnauthorizedResponse(
        res,
        "Invalid token payload",
        "INVALID_TOKEN_PAYLOAD"
      );
    }

    const user = await loadAuthenticatedUser(userId);

    if (!user) {
      return sendUnauthorizedResponse(
        res,
        "User not found",
        "AUTH_USER_NOT_FOUND"
      );
    }

    if (user.isDeleted === true) {
      return sendUnauthorizedResponse(
        res,
        "This account is no longer available",
        "ACCOUNT_DELETED"
      );
    }

    if (user.isActive === false) {
      return sendForbiddenResponse(
        res,
        "This account has been disabled",
        "ACCOUNT_DISABLED"
      );
    }

    const rawHeaderTenantId = normalizeObjectIdValue(
      req.get("X-Tenant-Id")
    );

    if (
      rawHeaderTenantId &&
      !isValidObjectId(rawHeaderTenantId)
    ) {
      return sendErrorResponse(
        res,
        400,
        "A valid tenant ID is required.",
        "INVALID_TENANT_ID",
        {
          source: "X-Tenant-Id header",
          receivedTenantId: rawHeaderTenantId,
        }
      );
    }

    const headerTenantId = resolveHeaderTenantId(req);
    const userTenantId = resolveUserTenantId(user);
    const tokenTenantId = resolveTokenTenantId(decoded);

    /*
      Each TownMela account currently belongs to one tenant.
      The tenant stored on the authenticated user is the trusted source.
    */

    if (
      headerTenantId &&
      userTenantId &&
      headerTenantId !== userTenantId
    ) {
      return sendForbiddenResponse(
        res,
        "You do not have access to the requested tenant",
        "TENANT_ACCESS_DENIED"
      );
    }

    if (
      tokenTenantId &&
      userTenantId &&
      tokenTenantId !== userTenantId
    ) {
      return sendUnauthorizedResponse(
        res,
        "Your tenant access has changed. Please log in again",
        "TOKEN_TENANT_MISMATCH"
      );
    }

const userRole = normalizeRole(
  user.role || decoded.role
);

let resolvedTenantId = null;

/*
  Super Admin:
  Header থেকে selected tenant ব্যবহার করবে।

  Tenant Admin:
  নিজের User/JWT tenant ছাড়া অন্য tenant
  ব্যবহার করতে পারবে না।
*/

if (userRole === "superadmin") {
  resolvedTenantId =
    headerTenantId || null;
} else {
  resolvedTenantId =
    userTenantId ||
    tokenTenantId ||
    null;
}

req.user = user;

req.auth = {
  userId,
  role: userRole,
  tenantId: resolvedTenantId,
  tokenTenantId,
  userTenantId,
  headerTenantId,
};

applyTenantContext(
  req,
  resolvedTenantId
);

    return next();
  } catch (error) {
    clearAuthContext(req);

    if (error?.name === "TokenExpiredError") {
      return sendUnauthorizedResponse(
        res,
        "Session expired. Please log in again",
        "TOKEN_EXPIRED"
      );
    }

    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "NotBeforeError"
    ) {
      return sendUnauthorizedResponse(
        res,
        "Not authorized, invalid token",
        "INVALID_TOKEN"
      );
    }

    if (error?.name === "CastError") {
      return sendUnauthorizedResponse(
        res,
        "Invalid authentication identity",
        "INVALID_AUTH_IDENTITY"
      );
    }

    if (error?.code === "JWT_SECRET_MISSING") {
      console.error(
        "Authentication configuration error:",
        error.message
      );

      return sendErrorResponse(
        res,
        500,
        "Authentication service is not configured",
        "AUTH_CONFIGURATION_ERROR"
      );
    }

    console.error("Auth middleware error:", error);

    return sendErrorResponse(
      res,
      500,
      "Authentication service failed",
      "AUTH_SERVICE_ERROR"
    );
  }
};

/* =========================================================
   ROLE AUTHORIZATION
========================================================= */

const allowRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return sendUnauthorizedResponse(
        res,
        "Authentication is required",
        "AUTHENTICATION_REQUIRED"
      );
    }

    const normalizedAllowedRoles = allowedRoles
      .map(normalizeRole)
      .filter(Boolean);

    if (normalizedAllowedRoles.length === 0) {
      console.error(
        "Authorization configuration error: no valid roles were supplied."
      );

      return sendErrorResponse(
        res,
        500,
        "Authorization service is not configured",
        "AUTHORIZATION_CONFIGURATION_ERROR"
      );
    }

    const userRole = normalizeRole(
      req.user.role || req.auth?.role
    );

    if (
      !userRole ||
      !normalizedAllowedRoles.includes(userRole)
    ) {
      return sendForbiddenResponse(
        res,
        "You do not have permission to perform this action",
        "ROLE_ACCESS_DENIED"
      );
    }

    return next();
  };

const adminOnly = (req, res, next) =>
  allowRoles(
    "admin",
    "superadmin"
  )(req, res, next);

/* =========================================================
   REQUIRE TENANT CONTEXT
========================================================= */

const requireTenant = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorizedResponse(
      res,
      "Authentication is required",
      "AUTHENTICATION_REQUIRED"
    );
  }

  const tenantId = normalizeObjectIdValue(
    req.tenantId ||
      req.tenant?._id ||
      req.tenant?.id
  );

  if (!tenantId || !isValidObjectId(tenantId)) {
    return sendErrorResponse(
      res,
      400,
      "A valid tenant ID is required.",
      "INVALID_TENANT_ID"
    );
  }

  req.tenantId = tenantId;
  req.tenant = {
    _id: tenantId,
    id: tenantId,
  };

  return next();
};

/* =========================================================
   OPTIONAL AUTHENTICATION
========================================================= */

const optionalProtect = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    clearAuthContext(req);
    return next();
  }

  return protect(req, res, next);
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  protect,
  optionalProtect,
  adminOnly,
  allowRoles,
  requireTenant,
};
