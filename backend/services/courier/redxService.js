"use strict";

const crypto = require("crypto");

const PROVIDER_CODE = "redx";
const DEFAULT_BASE_URL = "https://openapi.redx.com.bd/v1.0.0-beta";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_CURRENCY = "BDT";

const DEFAULT_PATHS = Object.freeze({
  createParcel: "/parcel",
  trackParcel: "/parcel/track/{trackingId}",
  cancelParcel: "",
  calculateCharge: "",
  health: "",
});

const RETRYABLE_STATUS_CODES = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
]);

const STATUS_MAP = Object.freeze({
  pending: "pending",
  created: "booked",
  confirmed: "booked",
  pickup_pending: "booked",
  pickup_assigned: "booked",
  picked_up: "picked_up",
  pickup_completed: "picked_up",
  in_transit: "in_transit",
  at_hub: "in_transit",
  hub_received: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivery_in_progress: "out_for_delivery",
  delivered: "delivered",
  completed: "delivered",
  partial_delivered: "partially_delivered",
  partially_delivered: "partially_delivered",
  delivery_failed: "delivery_failed",
  failed: "delivery_failed",
  returned: "returned",
  return_completed: "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
});

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const normalizeStatusKey = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(parsed, 0);
};

const maskSensitiveData = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = JSON.parse(JSON.stringify(value));
  const sensitiveKeys = new Set([
    "authorization",
    "access_token",
    "accessToken",
    "api_token",
    "apiToken",
    "token",
  ]);

  const visit = (target) => {
    if (!target || typeof target !== "object") {
      return;
    }

    for (const [key, nestedValue] of Object.entries(target)) {
      if (sensitiveKeys.has(key)) {
        target[key] = "[REDACTED]";
      } else if (nestedValue && typeof nestedValue === "object") {
        visit(nestedValue);
      }
    }
  };

  visit(clone);

  return clone;
};

class RedxCourierService {
  constructor(options = {}) {
    this.baseUrl = normalizeString(
      options.baseUrl ||
        process.env.REDX_BASE_URL ||
        DEFAULT_BASE_URL
    ).replace(/\/+$/, "");

    this.accessToken = normalizeString(
      options.accessToken ||
        process.env.REDX_ACCESS_TOKEN ||
        process.env.REDX_API_TOKEN
    );

    this.pickupStoreId = normalizeString(
      options.pickupStoreId ||
        process.env.REDX_PICKUP_STORE_ID
    );

    this.timeoutMs = normalizePositiveNumber(
      options.timeoutMs ||
        process.env.REDX_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.maxRetries = normalizePositiveNumber(
      options.maxRetries ??
        process.env.REDX_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    );

    this.paths = Object.freeze({
      createParcel:
        normalizeString(
          options.createParcelPath ||
            process.env.REDX_CREATE_PARCEL_PATH
        ) || DEFAULT_PATHS.createParcel,

      trackParcel:
        normalizeString(
          options.trackParcelPath ||
            process.env.REDX_TRACK_PARCEL_PATH
        ) || DEFAULT_PATHS.trackParcel,

      cancelParcel: normalizeString(
        options.cancelParcelPath ||
          process.env.REDX_CANCEL_PARCEL_PATH
      ),

      calculateCharge: normalizeString(
        options.calculateChargePath ||
          process.env.REDX_CALCULATE_CHARGE_PATH
      ),

      health: normalizeString(
        options.healthPath ||
          process.env.REDX_HEALTH_PATH
      ),
    });
  }

  createServiceError(
    message,
    statusCode = 500,
    code = "REDX_SERVICE_ERROR",
    details = null
  ) {
    const error = new Error(message);

    error.name = "RedxCourierServiceError";
    error.provider = PROVIDER_CODE;
    error.statusCode = statusCode;
    error.code = code;

    if (details !== null) {
      error.details = details;
    }

    return error;
  }

  validateConfiguration({
    requirePickupStoreId = false,
  } = {}) {
    const missing = [];

    if (!this.baseUrl) {
      missing.push("REDX_BASE_URL");
    }

    if (!this.accessToken) {
      missing.push("REDX_ACCESS_TOKEN");
    }

    if (
      requirePickupStoreId &&
      !this.pickupStoreId
    ) {
      missing.push("REDX_PICKUP_STORE_ID");
    }

    if (missing.length > 0) {
      throw this.createServiceError(
        `Missing RedX configuration: ${missing.join(", ")}`,
        503,
        "REDX_CONFIGURATION_MISSING",
        { missing }
      );
    }
  }

  buildUrl(path, pathParameters = {}) {
    let resolvedPath = normalizeString(path);

    for (const [key, value] of Object.entries(pathParameters)) {
      resolvedPath = resolvedPath.replace(
        `{${key}}`,
        encodeURIComponent(String(value))
      );
    }

    if (/^https?:\/\//i.test(resolvedPath)) {
      return resolvedPath;
    }

    return `${this.baseUrl}/${resolvedPath.replace(/^\/+/, "")}`;
  }

  async parseResponse(response) {
    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json().catch(() => null);
    }

    const text = await response.text().catch(() => "");

    return text ? { message: text } : null;
  }

  async request({
    method = "GET",
    path,
    pathParameters,
    query,
    body,
    headers = {},
    retryCount = 0,
    correlationId = crypto.randomUUID(),
  }) {
    this.validateConfiguration();

    if (!path) {
      throw this.createServiceError(
        "RedX API endpoint is not configured",
        501,
        "REDX_ENDPOINT_NOT_CONFIGURED"
      );
    }

    const url = new URL(
      this.buildUrl(path, pathParameters)
    );

    if (query && typeof query === "object") {
      for (const [key, value] of Object.entries(query)) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          url.searchParams.set(
            key,
            String(value)
          );
        }
      }
    }

    const requestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "X-Correlation-Id": correlationId,
      ...headers,
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs
    );

    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body:
          body === undefined || body === null
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await this.parseResponse(response);
      const durationMs = Date.now() - startedAt;

      if (
        RETRYABLE_STATUS_CODES.has(
          response.status
        ) &&
        retryCount < this.maxRetries
      ) {
        await sleep(
          500 * 2 ** retryCount
        );

        return this.request({
          method,
          path,
          pathParameters,
          query,
          body,
          headers,
          retryCount: retryCount + 1,
          correlationId,
        });
      }

      if (!response.ok) {
        throw this.createServiceError(
          data?.message ||
            data?.error ||
            data?.detail ||
            `RedX API request failed with status ${response.status}`,
          response.status,
          "REDX_API_REQUEST_FAILED",
          {
            response: maskSensitiveData(data),
            correlationId,
            durationMs,
          }
        );
      }

      return {
        success: true,
        statusCode: response.status,
        data,
        correlationId,
        durationMs,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        if (retryCount < this.maxRetries) {
          await sleep(
            500 * 2 ** retryCount
          );

          return this.request({
            method,
            path,
            pathParameters,
            query,
            body,
            headers,
            retryCount: retryCount + 1,
            correlationId,
          });
        }

        throw this.createServiceError(
          "RedX API request timed out",
          504,
          "REDX_REQUEST_TIMEOUT",
          { correlationId }
        );
      }

      if (
        !error.statusCode &&
        retryCount < this.maxRetries
      ) {
        await sleep(
          500 * 2 ** retryCount
        );

        return this.request({
          method,
          path,
          pathParameters,
          query,
          body,
          headers,
          retryCount: retryCount + 1,
          correlationId,
        });
      }

      if (error.provider === PROVIDER_CODE) {
        throw error;
      }

      throw this.createServiceError(
        error.message ||
          "RedX network request failed",
        502,
        "REDX_NETWORK_ERROR",
        { correlationId }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  getRecipient(shipment) {
    return shipment?.recipient || {};
  }

  getTrackingId(shipment) {
    return normalizeString(
      shipment?.trackingId ||
        shipment?.trackingNumber ||
        shipment?.courierReference ||
        shipment?.bookingId ||
        shipment?.parcelId
    );
  }

  mapDeliveryStatus(status) {
    const normalized =
      normalizeStatusKey(status);

    return (
      STATUS_MAP[normalized] ||
      "unknown"
    );
  }

  extractApiData(response) {
    return (
      response?.data?.data ||
      response?.data ||
      {}
    );
  }

  async validateShipment(shipment) {
    if (
      !shipment ||
      typeof shipment !== "object"
    ) {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const recipient =
      this.getRecipient(shipment);

    const normalized = {
      orderNumber: normalizeString(
        shipment.orderNumber ||
          shipment.shipmentNumber
      ),

      recipientName: normalizeString(
        recipient.name
      ),

      recipientPhone: normalizeString(
        recipient.phone
      ),

      recipientAddress: normalizeString(
        recipient.addressLine ||
          recipient.address ||
          recipient.fullAddress
      ),

      areaId: normalizeString(
        recipient.areaId ||
          shipment.areaId
      ),

      cashCollectionAmount:
        normalizePositiveNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),

      parcelWeight:
        normalizePositiveNumber(
          shipment.weight ||
            shipment.parcel?.weight ||
            0.5,
          0.5
        ),
    };

    const errors = [];

    if (!normalized.orderNumber) {
      errors.push(
        "Order number is required"
      );
    }

    if (!normalized.recipientName) {
      errors.push(
        "Recipient name is required"
      );
    }

    if (!normalized.recipientPhone) {
      errors.push(
        "Recipient phone is required"
      );
    }

    if (!normalized.recipientAddress) {
      errors.push(
        "Recipient address is required"
      );
    }

    if (!normalized.areaId) {
      errors.push(
        "RedX delivery area ID is required"
      );
    }

    if (normalized.parcelWeight <= 0) {
      errors.push(
        "Parcel weight must be greater than 0"
      );
    }

    if (errors.length > 0) {
      const error =
        this.createServiceError(
          errors.join(", "),
          400,
          "SHIPMENT_VALIDATION_FAILED",
          { errors }
        );

      error.validationErrors = errors;

      throw error;
    }

    return {
      success: true,
      provider: PROVIDER_CODE,
      message:
        "Shipment validation successful",
      normalized,
    };
  }

  async buildCreatePayload(shipment) {
    const validation =
      await this.validateShipment(
        shipment
      );

    const parcel =
      shipment.parcel || {};

    return {
      customer_name:
        validation.normalized
          .recipientName,

      customer_phone:
        validation.normalized
          .recipientPhone,

      delivery_area:
        validation.normalized.areaId,

      delivery_area_id:
        validation.normalized.areaId,

      customer_address:
        validation.normalized
          .recipientAddress,

      merchant_invoice_id:
        validation.normalized
          .orderNumber,

      cash_collection_amount:
        validation.normalized
          .cashCollectionAmount,

      parcel_weight:
        validation.normalized
          .parcelWeight,

      parcel_type:
        normalizeString(
          shipment.parcelType ||
            parcel.type
        ) || "parcel",

      instruction:
        normalizeString(
          shipment.specialInstruction ||
            shipment.instructions ||
            parcel.specialInstruction
        ) || undefined,

      value:
        normalizePositiveNumber(
          shipment.pricing?.declaredValue ??
            shipment.declaredValue ??
            shipment.totalAmount,
          0
        ),

      pickup_store_id:
        Number(this.pickupStoreId),
    };
  }

  async createShipment(shipment) {
    this.validateConfiguration({
      requirePickupStoreId: true,
    });

    const payload =
      await this.buildCreatePayload(
        shipment
      );

    const response =
      await this.request({
        method: "POST",
        path: this.paths.createParcel,
        body: payload,
      });

    const data =
      this.extractApiData(response);

    const trackingId =
      normalizeString(
        data.tracking_id ||
          data.trackingId ||
          data.tracking_number ||
          data.parcel_id ||
          data.id
      );

    if (!trackingId) {
      throw this.createServiceError(
        "RedX create-parcel response did not contain a tracking ID",
        502,
        "REDX_CREATE_RESPONSE_INVALID",
        maskSensitiveData(
          response.data
        )
      );
    }

    const providerStatus =
      normalizeString(
        data.status ||
          data.parcel_status ||
          "created"
      );

    const mappedStatus =
      this.mapDeliveryStatus(
        providerStatus
      );

    return {
      success: true,
      provider: PROVIDER_CODE,

      shipment: {
        bookingStatus: "booked",

        deliveryStatus:
          mappedStatus === "unknown"
            ? "booked"
            : mappedStatus,

        bookingId: trackingId,
        trackingId,
        trackingNumber: trackingId,
        courierReference: trackingId,
        courierStatus: providerStatus,

        statusMessage:
          normalizeString(
            data.message
          ) ||
          "Shipment booked with RedX",

        bookedAt: new Date(),
      },

      raw: response.data,

      apiLog: {
        action: "create_shipment",
        method: "POST",
        endpoint:
          this.paths.createParcel,
        request:
          maskSensitiveData(payload),
        response:
          maskSensitiveData(
            response.data
          ),
        statusCode:
          response.statusCode,
        correlationId:
          response.correlationId,
        durationMs:
          response.durationMs,
        success: true,
      },
    };
  }

  async trackShipment(shipment) {
    this.validateConfiguration();

    const trackingId =
      this.getTrackingId(shipment);

    if (!trackingId) {
      throw this.createServiceError(
        "RedX tracking ID is required",
        400,
        "REDX_TRACKING_ID_REQUIRED"
      );
    }

    const response =
      await this.request({
        method: "GET",
        path: this.paths.trackParcel,
        pathParameters: {
          trackingId,
        },
      });

    const data =
      this.extractApiData(response);

    const providerStatus =
      normalizeString(
        data.status ||
          data.parcel_status ||
          data.delivery_status ||
          "unknown"
      );

    return {
      success: true,
      provider: PROVIDER_CODE,

      tracking: {
        trackingId,
        trackingNumber: trackingId,

        bookingStatus:
          shipment?.bookingStatus ||
          "booked",

        deliveryStatus:
          this.mapDeliveryStatus(
            providerStatus
          ),

        courierStatus:
          providerStatus,

        currentLocation:
          normalizeString(
            data.current_location ||
              data.location
          ) || null,

        statusMessage:
          normalizeString(
            data.status_message ||
              data.message
          ) ||
          `RedX status: ${providerStatus}`,

        trackingUrl:
          normalizeString(
            data.tracking_url ||
              data.trackingUrl
          ) || null,

        checkedAt: new Date(),
      },

      raw: response.data,

      apiLog: {
        action: "track_shipment",
        method: "GET",
        endpoint:
          this.paths.trackParcel,
        request: { trackingId },
        response:
          maskSensitiveData(
            response.data
          ),
        statusCode:
          response.statusCode,
        correlationId:
          response.correlationId,
        durationMs:
          response.durationMs,
        success: true,
      },
    };
  }

  async syncShipment(shipment) {
    const tracked =
      await this.trackShipment(
        shipment
      );

    return {
      success: true,
      provider: PROVIDER_CODE,

      shipment: {
        bookingStatus:
          tracked.tracking
            .bookingStatus,

        deliveryStatus:
          tracked.tracking
            .deliveryStatus,

        trackingId:
          tracked.tracking.trackingId,

        trackingNumber:
          tracked.tracking
            .trackingNumber,

        courierStatus:
          tracked.tracking
            .courierStatus,

        currentLocation:
          tracked.tracking
            .currentLocation,

        statusMessage:
          tracked.tracking
            .statusMessage,

        lastSyncedAt: new Date(),
      },

      raw: tracked.raw,
      apiLog: tracked.apiLog,
    };
  }

  async cancelShipment(
    shipment,
    courier = null,
    options = {}
  ) {
    this.validateConfiguration();

    if (!this.paths.cancelParcel) {
      throw this.createServiceError(
        "RedX cancellation endpoint is not configured or unavailable",
        501,
        "REDX_CANCELLATION_NOT_SUPPORTED"
      );
    }

    const trackingId =
      this.getTrackingId(shipment);

    if (!trackingId) {
      throw this.createServiceError(
        "RedX tracking ID is required for cancellation",
        400,
        "REDX_TRACKING_ID_REQUIRED"
      );
    }

    const reason =
      normalizeString(
        options.reason
      ) ||
      normalizeString(
        shipment?.cancellationReason
      ) ||
      "Cancelled by merchant";

    const response =
      await this.request({
        method: "POST",
        path: this.paths.cancelParcel,
        pathParameters: {
          trackingId,
        },
        body: {
          tracking_id: trackingId,
          reason,
        },
      });

    return {
      success: true,
      provider: PROVIDER_CODE,
      remoteCancellation: true,

      shipment: {
        bookingStatus: "cancelled",
        deliveryStatus: "cancelled",
        courierStatus: "cancelled",
        statusMessage: reason,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },

      raw: response.data,

      apiLog: {
        action: "cancel_shipment",
        method: "POST",
        endpoint:
          this.paths.cancelParcel,
        request: {
          trackingId,
          reason,
        },
        response:
          maskSensitiveData(
            response.data
          ),
        statusCode:
          response.statusCode,
        correlationId:
          response.correlationId,
        durationMs:
          response.durationMs,
        success: true,
      },
    };
  }

  async calculateCharge(shipment) {
    this.validateConfiguration();

    if (!this.paths.calculateCharge) {
      throw this.createServiceError(
        "RedX charge calculation endpoint is not configured or unavailable",
        501,
        "REDX_CHARGE_CALCULATION_NOT_SUPPORTED"
      );
    }

    if (
      !shipment ||
      typeof shipment !== "object"
    ) {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const recipient =
      this.getRecipient(shipment);

    const payload = {
      delivery_area_id:
        recipient.areaId ||
        shipment.areaId,

      parcel_weight:
        normalizePositiveNumber(
          shipment.weight ||
            shipment.parcel?.weight ||
            0.5,
          0.5
        ),

      cash_collection_amount:
        normalizePositiveNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),
    };

    const response =
      await this.request({
        method: "POST",
        path:
          this.paths.calculateCharge,
        body: payload,
      });

    const data =
      this.extractApiData(response);

    const charge =
      normalizePositiveNumber(
        data.charge ||
          data.delivery_charge ||
          data.price,
        0
      );

    return {
      success: true,
      provider: PROVIDER_CODE,

      charge: {
        shippingCharge: charge,
        courierCharge: charge,

        codAmount:
          payload.cash_collection_amount,

        currency:
          normalizeString(
            data.currency
          ).toUpperCase() ||
          DEFAULT_CURRENCY,

        calculatedBy: "redx_api",
      },

      raw: response.data,

      apiLog: {
        action:
          "calculate_charge",
        method: "POST",
        endpoint:
          this.paths
            .calculateCharge,
        request: payload,
        response:
          maskSensitiveData(
            response.data
          ),
        statusCode:
          response.statusCode,
        correlationId:
          response.correlationId,
        durationMs:
          response.durationMs,
        success: true,
      },
    };
  }

  async health() {
    const startedAt = Date.now();

    try {
      this.validateConfiguration();

      if (this.paths.health) {
        await this.request({
          method: "GET",
          path: this.paths.health,
        });
      }

      return {
        success: true,
        provider: PROVIDER_CODE,
        status: "healthy",
        configured: true,
        remotelyVerified:
          Boolean(this.paths.health),
        latencyMs:
          Date.now() - startedAt,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        provider: PROVIDER_CODE,
        status: "unhealthy",
        configured: false,
        remotelyVerified: false,
        code:
          error.code ||
          "REDX_HEALTH_CHECK_FAILED",
        message: error.message,
        latencyMs:
          Date.now() - startedAt,
        timestamp: new Date(),
      };
    }
  }
}

module.exports =
  new RedxCourierService();
