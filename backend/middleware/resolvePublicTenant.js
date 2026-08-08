"use strict";

const mongoose = require("mongoose");

const Tenant = require(
  "../models/tenantModel"
);

/* =========================================================
   HELPERS
========================================================= */

const normalizeText = (value) =>
  String(value || "").trim();

const normalizeHost = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .trim();

const isLocalHost = (host) =>
  [
    "localhost",
    "127.0.0.1",
    "::1",
  ].includes(host);

const sendError = (
  res,
  statusCode,
  message,
  code
) =>
  res.status(statusCode).json({
    success: false,
    code,
    message,
  });

/* =========================================================
   PUBLIC TENANT RESOLVER

   Resolution order:
   1. X-Tenant-Id header
   2. Custom domain / request host
   3. Localhost default tenant from .env
========================================================= */

const resolvePublicTenant =
  async (req, res, next) => {
    try {
      const headerTenantId =
        normalizeText(
          req.get("X-Tenant-Id")
        );

      const forwardedHost =
        normalizeText(
          req.get(
            "X-Forwarded-Host"
          )
        )
          .split(",")[0]
          .trim();

      const requestHost =
        normalizeHost(
          forwardedHost ||
            req.get("Host")
        );

      const localDefaultTenantId =
        normalizeText(
          process.env
            .NEXT_PUBLIC_TENANT_ID ||
            process.env
              .DEFAULT_TENANT_ID ||
            process.env
              .TOWNMELA_MASTER_TENANT_ID
        );

      let tenantQuery = null;

      if (headerTenantId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            headerTenantId
          )
        ) {
          return sendError(
            res,
            400,
            "A valid tenant ID is required.",
            "INVALID_TENANT_ID"
          );
        }

        tenantQuery = {
          _id: headerTenantId,
        };
      } else if (
        requestHost &&
        !isLocalHost(requestHost)
      ) {
        tenantQuery = {
          customDomain:
            requestHost,
        };
      } else if (
        localDefaultTenantId
      ) {
        if (
          !mongoose.Types.ObjectId.isValid(
            localDefaultTenantId
          )
        ) {
          return sendError(
            res,
            500,
            "The default tenant ID is invalid.",
            "INVALID_DEFAULT_TENANT_ID"
          );
        }

        tenantQuery = {
          _id:
            localDefaultTenantId,
        };
      }

      if (!tenantQuery) {
        return sendError(
          res,
          400,
          "Tenant context is required.",
          "TENANT_CONTEXT_REQUIRED"
        );
      }

      const tenant =
        await Tenant.findOne({
          ...tenantQuery,
          isDeleted: {
            $ne: true,
          },
        })
          .select(
            "_id status subscription customDomain"
          )
          .lean();

      if (!tenant) {
        return sendError(
          res,
          404,
          "Tenant store was not found.",
          "TENANT_NOT_FOUND"
        );
      }

      const subscriptionStatus =
        tenant.subscription
          ?.status;

      if (
        tenant.status !==
          "active" ||
        ![
          "trial",
          "active",
        ].includes(
          subscriptionStatus
        )
      ) {
        return sendError(
          res,
          403,
          "This tenant store is currently unavailable.",
          "TENANT_STORE_UNAVAILABLE"
        );
      }

      const tenantId =
        String(tenant._id);

      req.tenantId =
        tenantId;

      req.tenant = {
        _id: tenantId,
        id: tenantId,
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };

module.exports =
  resolvePublicTenant;
