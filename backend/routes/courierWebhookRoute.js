"use strict";

const express = require("express");

const {
  handleCourierWebhook,
  getWebhookHealth,
} = require("../controllers/courierWebhookController");

const router = express.Router();

/* =========================================================
   PARAMETER VALIDATION
========================================================= */

router.param("courierCode", (req, res, next, courierCode) => {
  const normalizedCode =
    typeof courierCode === "string"
      ? courierCode.trim().toLowerCase()
      : "";

  if (
    !normalizedCode ||
    normalizedCode.length > 50 ||
    !/^[a-z0-9_-]+$/.test(normalizedCode)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid courier provider code",
    });
  }

  req.params.courierCode = normalizedCode;

  return next();
});

router.param("tenantId", (req, res, next, tenantId) => {
  const normalizedTenantId =
    typeof tenantId === "string"
      ? tenantId.trim()
      : "";

  if (
    !normalizedTenantId ||
    !/^[a-f\d]{24}$/i.test(normalizedTenantId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid tenant identifier",
    });
  }

  req.params.tenantId = normalizedTenantId;

  return next();
});

/* =========================================================
   HEALTH CHECK

   Mounted example:
   /api/webhooks/courier/health
========================================================= */

router.get("/health", getWebhookHealth);

/* =========================================================
   COURIER WEBHOOK

   Public endpoint secured by the webhook secret validated
   inside courierWebhookController.

   POST /api/webhooks/courier/:courierCode/:tenantId
========================================================= */

router.post(
  "/:courierCode/:tenantId",
  express.json({
    limit: "256kb",
    strict: true,
    type: ["application/json", "application/*+json"],
  }),
  handleCourierWebhook
);

module.exports = router;
