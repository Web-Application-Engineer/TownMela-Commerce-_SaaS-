"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");

const CourierShipment = require("../models/CourierShipment");
const Courier = require("../models/Courier");

/* =========================================================
   COURIER WEBHOOK CONTROLLER

   Suggested route:

   POST /api/webhooks/courier/:courierCode/:tenantId

   This controller:
   - isolates every lookup by tenant
   - validates the configured webhook secret
   - prevents duplicate event processing
   - identifies shipments safely
   - maps courier statuses to internal statuses
   - records webhook payload and status history
========================================================= */

const PROVIDER_CODE_ALIASES = Object.freeze({
  manual: "manual",
  custom: "manual",
  self: "manual",
  self_delivery: "manual",
  "self-delivery": "manual",

  steadfast: "steadfast",
  "stead-fast": "steadfast",
  stead_fast: "steadfast",

  pathao: "pathao",
  "pathao-courier": "pathao",
  pathao_courier: "pathao",

  redx: "redx",
  "red-x": "redx",
  red_x: "redx",

  paperfly: "paperfly",
  "paper-fly": "paperfly",
  paper_fly: "paperfly",
});

const TERMINAL_DELIVERY_STATUSES = new Set([
  "delivered",
  "returned",
  "cancelled",
]);

const DELIVERY_STATUS_PRIORITY = Object.freeze({
  pending: 10,
  booked: 20,
  picked_up: 30,
  in_transit: 40,
  out_for_delivery: 50,
  delivery_failed: 55,
  partially_delivered: 60,
  delivered: 70,
  returned: 80,
  cancelled: 90,
  unknown: 0,
});

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const normalizeProviderCode = (value) => {
  const normalized = normalizeString(value).toLowerCase();

  return PROVIDER_CODE_ALIASES[normalized] || normalized || null;
};

const normalizeStatusKey = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const createHttpError = (
  message,
  statusCode = 500,
  code = "COURIER_WEBHOOK_ERROR"
) => {
  const error = new Error(message);

  error.name = "CourierWebhookError";
  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const safeJsonHash = (value) => {
  let serialized;

  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = String(value);
  }

  return crypto
    .createHash("sha256")
    .update(serialized || "")
    .digest("hex");
};

const safeSecretCompare = (receivedValue, expectedValue) => {
  const received = Buffer.from(normalizeString(receivedValue));
  const expected = Buffer.from(normalizeString(expectedValue));

  if (!received.length || !expected.length) {
    return false;
  }

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
};

const getTenantId = (req) =>
  req.tenant?._id ||
  req.tenant?.id ||
  req.params?.tenantId ||
  req.query?.tenantId ||
  req.headers["x-tenant-id"] ||
  null;

const requireTenantId = (req) => {
  const tenantId = getTenantId(req);

  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    throw createHttpError(
      "A valid tenant identifier is required",
      400,
      "TENANT_ID_REQUIRED"
    );
  }

  return new mongoose.Types.ObjectId(tenantId);
};

const getConfiguredWebhookSecret = (courier) =>
  courier?.webhookSecret ||
  courier?.credentials?.webhookSecret ||
  courier?.credentials?.webhook_secret ||
  null;

const getReceivedWebhookSecret = (req) =>
  req.headers["x-webhook-secret"] ||
  req.headers["x-courier-webhook-secret"] ||
  req.headers["x-api-key"] ||
  req.query?.secret ||
  null;

const verifyWebhookSecret = (req, courier) => {
  const expectedSecret = getConfiguredWebhookSecret(courier);

  /*
    A webhook secret must be configured for production use.
    Set courier.webhookSecret or credentials.webhookSecret.
  */
  if (!expectedSecret) {
    throw createHttpError(
      "Webhook secret is not configured for this courier",
      503,
      "WEBHOOK_SECRET_NOT_CONFIGURED"
    );
  }

  const receivedSecret = getReceivedWebhookSecret(req);

  if (!safeSecretCompare(receivedSecret, expectedSecret)) {
    throw createHttpError(
      "Invalid webhook credentials",
      401,
      "INVALID_WEBHOOK_CREDENTIALS"
    );
  }
};

const extractWebhookEventId = (req, providerCode, payload) => {
  const suppliedEventId =
    req.headers["x-webhook-id"] ||
    req.headers["x-event-id"] ||
    payload?.event_id ||
    payload?.eventId ||
    payload?.id ||
    null;

  if (suppliedEventId) {
    return `${providerCode}:${normalizeString(suppliedEventId)}`;
  }

  return `${providerCode}:sha256:${safeJsonHash(payload)}`;
};

const extractShipmentIdentifiers = (payload = {}) => {
  const source =
    payload.consignment ||
    payload.data ||
    payload.order ||
    payload;

  return {
    consignmentId: normalizeString(
      source.consignment_id ||
        source.consignmentId ||
        payload.consignment_id ||
        payload.consignmentId
    ),

    trackingNumber: normalizeString(
      source.tracking_code ||
        source.tracking_number ||
        source.trackingNumber ||
        payload.tracking_code ||
        payload.tracking_number ||
        payload.trackingNumber
    ),

    orderNumber: normalizeString(
      source.invoice ||
        source.invoice_number ||
        source.order_number ||
        source.orderNumber ||
        payload.invoice ||
        payload.invoice_number ||
        payload.order_number ||
        payload.orderNumber
    ),

    shipmentNumber: normalizeString(
      source.shipment_number ||
        source.shipmentNumber ||
        payload.shipment_number ||
        payload.shipmentNumber
    ),
  };
};

const extractProviderStatus = (payload = {}) => {
  const source =
    payload.consignment ||
    payload.data ||
    payload.order ||
    payload;

  return normalizeString(
    source.delivery_status ||
      source.current_status ||
      source.status ||
      payload.delivery_status ||
      payload.current_status ||
      payload.status ||
      "unknown"
  );
};

const extractStatusMessage = (payload = {}, providerStatus) =>
  normalizeString(
    payload.message ||
      payload.status_message ||
      payload.statusMessage ||
      payload.data?.message
  ) || `Courier status updated to ${providerStatus}`;

const extractCurrentLocation = (payload = {}) =>
  normalizeString(
    payload.location ||
      payload.current_location ||
      payload.currentLocation ||
      payload.data?.location ||
      payload.data?.current_location
  ) || null;

const mapDeliveryStatus = (providerCode, status) => {
  const normalized = normalizeStatusKey(status);

  const commonMap = {
    pending: "pending",
    booked: "booked",
    created: "booked",
    confirmed: "booked",
    accepted: "booked",

    picked_up: "picked_up",
    picked: "picked_up",
    pickup_complete: "picked_up",

    in_transit: "in_transit",
    transit: "in_transit",
    on_the_way: "in_transit",

    out_for_delivery: "out_for_delivery",
    on_delivery: "out_for_delivery",

    delivered: "delivered",
    completed: "delivered",

    delivery_failed: "delivery_failed",
    failed_delivery: "delivery_failed",
    failed: "delivery_failed",

    returned: "returned",
    return: "returned",
    returned_to_merchant: "returned",

    partial_delivered: "partially_delivered",
    partially_delivered: "partially_delivered",

    cancelled: "cancelled",
    canceled: "cancelled",

    unknown: "unknown",
  };

  const steadfastMap = {
    in_review: "booked",
    hold: "pending",
    delivered_approval_pending: "out_for_delivery",
    partial_delivered_approval_pending: "partially_delivered",
    cancelled_approval_pending: "cancelled",
    unknown_approval_pending: "unknown",
  };

  if (providerCode === "steadfast" && steadfastMap[normalized]) {
    return steadfastMap[normalized];
  }

  return commonMap[normalized] || "unknown";
};

const buildShipmentLookup = ({
  tenantId,
  courierId,
  identifiers,
}) => {
  const conditions = [];

  if (identifiers.consignmentId) {
    conditions.push({
      consignmentId: identifiers.consignmentId,
    });
  }

  if (identifiers.trackingNumber) {
    conditions.push({
      trackingNumber: identifiers.trackingNumber,
    });
  }

  if (identifiers.shipmentNumber) {
    conditions.push({
      shipmentNumber: identifiers.shipmentNumber.toUpperCase(),
    });
  }

  if (identifiers.orderNumber) {
    conditions.push({
      orderNumber: identifiers.orderNumber,
    });
  }

  if (!conditions.length) {
    throw createHttpError(
      "Webhook payload does not contain a shipment identifier",
      400,
      "SHIPMENT_IDENTIFIER_MISSING"
    );
  }

  return {
    tenant: tenantId,
    courier: courierId,
    $or: conditions,
  };
};

const shouldApplyStatusTransition = (
  currentStatus,
  incomingStatus
) => {
  if (!currentStatus || currentStatus === "unknown") {
    return true;
  }

  if (currentStatus === incomingStatus) {
    return true;
  }

  if (TERMINAL_DELIVERY_STATUSES.has(currentStatus)) {
    return false;
  }

  const currentPriority =
    DELIVERY_STATUS_PRIORITY[currentStatus] || 0;

  const incomingPriority =
    DELIVERY_STATUS_PRIORITY[incomingStatus] || 0;

  return incomingPriority >= currentPriority;
};

const buildTimestampUpdates = (deliveryStatus, timestamp) => {
  switch (deliveryStatus) {
    case "picked_up":
      return { pickedUpAt: timestamp };

    case "out_for_delivery":
      return { outForDeliveryAt: timestamp };

    case "delivered":
      return { deliveredAt: timestamp };

    case "delivery_failed":
      return { failedAt: timestamp };

    case "cancelled":
      return { cancelledAt: timestamp };

    case "returned":
      return { returnedAt: timestamp };

    default:
      return {};
  }
};

const findCourier = async (tenantId, providerCode) => {
  const courier = await Courier.findOne({
    tenant: tenantId,
    code: providerCode,
    isActive: { $ne: false },
  }).select("+credentials +webhookSecret");

  if (!courier) {
    throw createHttpError(
      `Active courier configuration not found for provider "${providerCode}"`,
      404,
      "COURIER_CONFIGURATION_NOT_FOUND"
    );
  }

  return courier;
};

/* =========================================================
   MAIN WEBHOOK HANDLER
========================================================= */

const handleCourierWebhook = async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const providerCode = normalizeProviderCode(
      req.params?.courierCode ||
        req.body?.provider ||
        req.body?.courier
    );

    if (!providerCode) {
      throw createHttpError(
        "Courier provider code is required",
        400,
        "COURIER_CODE_REQUIRED"
      );
    }

    const courier = await findCourier(tenantId, providerCode);

    verifyWebhookSecret(req, courier);

    const payload = req.body || {};
    const eventId = extractWebhookEventId(
      req,
      providerCode,
      payload
    );

    const identifiers = extractShipmentIdentifiers(payload);

    const shipment = await CourierShipment.findOne(
      buildShipmentLookup({
        tenantId,
        courierId: courier._id,
        identifiers,
      })
    );

    if (!shipment) {
      throw createHttpError(
        "Shipment not found for the supplied webhook identifiers",
        404,
        "SHIPMENT_NOT_FOUND"
      );
    }

    const alreadyProcessed = shipment.statusHistory?.some(
      (historyItem) =>
        historyItem?.metadata?.webhookEventId === eventId
    );

    if (alreadyProcessed) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Webhook event was already processed",
        data: {
          shipmentId: shipment._id,
          shipmentNumber: shipment.shipmentNumber,
          eventId,
        },
      });
    }

    const providerStatus = extractProviderStatus(payload);
    const incomingDeliveryStatus = mapDeliveryStatus(
      providerCode,
      providerStatus
    );

    const applyTransition = shouldApplyStatusTransition(
      shipment.deliveryStatus,
      incomingDeliveryStatus
    );

    const occurredAt = new Date();
    const statusMessage = extractStatusMessage(
      payload,
      providerStatus
    );
    const currentLocation = extractCurrentLocation(payload);

    shipment.lastWebhookPayload = payload;
    shipment.lastSyncedAt = occurredAt;
    shipment.courierStatus = providerStatus;
    shipment.statusMessage = statusMessage;

    if (currentLocation) {
      shipment.currentLocation = currentLocation;
    }

    if (applyTransition) {
      shipment.deliveryStatus = incomingDeliveryStatus;

      const timestampUpdates = buildTimestampUpdates(
        incomingDeliveryStatus,
        occurredAt
      );

      for (const [fieldName, value] of Object.entries(
        timestampUpdates
      )) {
        if (!shipment[fieldName]) {
          shipment[fieldName] = value;
        }
      }

      if (incomingDeliveryStatus === "cancelled") {
        shipment.bookingStatus = "cancelled";
      } else if (
        shipment.bookingStatus === "pending" ||
        shipment.bookingStatus === "processing"
      ) {
        shipment.bookingStatus = "booked";
      }
    }

    shipment.addStatusHistory({
      bookingStatus: shipment.bookingStatus,
      deliveryStatus: applyTransition
        ? incomingDeliveryStatus
        : shipment.deliveryStatus,
      courierStatus: providerStatus,
      message: applyTransition
        ? statusMessage
        : `Ignored backward or terminal status transition: ${statusMessage}`,
      location: currentLocation,
      source: "webhook",
      metadata: {
        webhookEventId: eventId,
        provider: providerCode,
        transitionApplied: applyTransition,
        receivedAt: occurredAt,
      },
      occurredAt,
    });

    await shipment.save();

    return res.status(200).json({
      success: true,
      duplicate: false,
      message: applyTransition
        ? "Courier webhook processed successfully"
        : "Webhook recorded without changing the terminal shipment status",
      data: {
        shipmentId: shipment._id,
        shipmentNumber: shipment.shipmentNumber,
        provider: providerCode,
        courierStatus: providerStatus,
        deliveryStatus: shipment.deliveryStatus,
        eventId,
        transitionApplied: applyTransition,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   PROVIDER-SPECIFIC WRAPPERS

   These wrappers allow separate provider routes while still
   using the same central handler.
========================================================= */

const handleSteadfastWebhook = (req, res, next) => {
  req.params = {
    ...(req.params || {}),
    courierCode: "steadfast",
  };

  return handleCourierWebhook(req, res, next);
};

const handleManualWebhook = (req, res, next) => {
  req.params = {
    ...(req.params || {}),
    courierCode: "manual",
  };

  return handleCourierWebhook(req, res, next);
};

/* =========================================================
   HEALTH ENDPOINT
========================================================= */

const getWebhookHealth = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      service: "courier-webhook",
      status: "healthy",
      timestamp: new Date(),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  handleCourierWebhook,
  handleSteadfastWebhook,
  handleManualWebhook,
  getWebhookHealth,
};
