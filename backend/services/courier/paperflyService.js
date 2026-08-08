"use strict";

const crypto = require("crypto");

const PROVIDER_CODE = "paperfly";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_CURRENCY = "BDT";

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
  submitted: "booked",
  placed: "booked",
  booked: "booked",
  confirmed: "booked",
  pickup_requested: "booked",
  assigned_for_pickup: "booked",
  picked_up: "picked_up",
  pickup_completed: "picked_up",
  received_at_hub: "in_transit",
  in_transit: "in_transit",
  transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivery_in_progress: "out_for_delivery",
  delivered: "delivered",
  completed: "delivered",
  partial_delivery: "partially_delivered",
  partially_delivered: "partially_delivered",
  delivery_failed: "delivery_failed",
  failed_delivery: "delivery_failed",
  returned: "returned",
  return_completed: "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
});

const TERMINAL_STATUSES = new Set([
  "delivered",
  "returned",
  "cancelled",
]);

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

const normalizeNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(parsed, 0);
};

const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const deepClone = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
};

const removeUndefined = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(removeUndefined)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [
          key,
          removeUndefined(nestedValue),
        ])
    );
  }

  return value;
};

const maskSensitiveData = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const clone = deepClone(value);

  const sensitiveKeys = new Set([
    "authorization",
    "api_key",
    "apiKey",
    "api_token",
    "apiToken",
    "access_token",
    "accessToken",
    "password",
    "username",
    "merchant_key",
    "merchantKey",
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

class PaperflyCourierService {
  constructor(options = {}) {
    this.baseUrl = normalizeString(
      options.baseUrl || process.env.PAPERFLY_BASE_URL
    ).replace(/\/+$/, "");

    this.apiKey = normalizeString(
      options.apiKey ||
        process.env.PAPERFLY_API_KEY ||
        process.env.PAPERFLY_ACCESS_TOKEN
    );

    this.username = normalizeString(
      options.username || process.env.PAPERFLY_USERNAME
    );

    this.password = normalizeString(
      options.password || process.env.PAPERFLY_PASSWORD
    );

    this.merchantCode = normalizeString(
      options.merchantCode ||
        process.env.PAPERFLY_MERCHANT_CODE
    );

    this.authenticationType = normalizeString(
      options.authenticationType ||
        process.env.PAPERFLY_AUTH_TYPE ||
        "bearer"
    ).toLowerCase();

    this.timeoutMs = normalizeNonNegativeNumber(
      options.timeoutMs || process.env.PAPERFLY_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );

    this.maxRetries = normalizePositiveInteger(
      options.maxRetries ?? process.env.PAPERFLY_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    );

    this.paths = Object.freeze({
      createShipment: normalizeString(
        options.createShipmentPath ||
          process.env.PAPERFLY_CREATE_SHIPMENT_PATH
      ),

      trackShipment: normalizeString(
        options.trackShipmentPath ||
          process.env.PAPERFLY_TRACK_SHIPMENT_PATH
      ),

      cancelShipment: normalizeString(
        options.cancelShipmentPath ||
          process.env.PAPERFLY_CANCEL_SHIPMENT_PATH
      ),

      calculateCharge: normalizeString(
        options.calculateChargePath ||
          process.env.PAPERFLY_CALCULATE_CHARGE_PATH
      ),

      health: normalizeString(
        options.healthPath ||
          process.env.PAPERFLY_HEALTH_PATH
      ),
    });
  }

  createServiceError(
    message,
    statusCode = 500,
    code = "PAPERFLY_SERVICE_ERROR",
    details = null
  ) {
    const error = new Error(message);

    error.name = "PaperflyCourierServiceError";
    error.provider = PROVIDER_CODE;
    error.statusCode = statusCode;
    error.code = code;

    if (details !== null) {
      error.details = details;
    }

    return error;
  }

  validateConfiguration({
    requireCreatePath = false,
    requireTrackPath = false,
    requireMerchantCode = false,
  } = {}) {
    const missing = [];

    if (!this.baseUrl) {
      missing.push("PAPERFLY_BASE_URL");
    }

    const hasBasicCredentials =
      this.username && this.password;

    const hasTokenCredential =
      Boolean(this.apiKey);

    if (
      this.authenticationType === "basic" &&
      !hasBasicCredentials
    ) {
      missing.push(
        "PAPERFLY_USERNAME",
        "PAPERFLY_PASSWORD"
      );
    } else if (
      this.authenticationType !== "basic" &&
      !hasTokenCredential
    ) {
      missing.push("PAPERFLY_API_KEY");
    }

    if (
      requireMerchantCode &&
      !this.merchantCode
    ) {
      missing.push("PAPERFLY_MERCHANT_CODE");
    }

    if (
      requireCreatePath &&
      !this.paths.createShipment
    ) {
      missing.push(
        "PAPERFLY_CREATE_SHIPMENT_PATH"
      );
    }

    if (
      requireTrackPath &&
      !this.paths.trackShipment
    ) {
      missing.push(
        "PAPERFLY_TRACK_SHIPMENT_PATH"
      );
    }

    if (missing.length > 0) {
      throw this.createServiceError(
        `Missing Paperfly configuration: ${[
          ...new Set(missing),
        ].join(", ")}`,
        503,
        "PAPERFLY_CONFIGURATION_MISSING",
        {
          missing: [...new Set(missing)],
        }
      );
    }
  }

  buildAuthorizationHeader() {
    if (this.authenticationType === "basic") {
      const credentials = Buffer.from(
        `${this.username}:${this.password}`,
        "utf8"
      ).toString("base64");

      return `Basic ${credentials}`;
    }

    if (
      this.authenticationType === "token"
    ) {
      return `Token ${this.apiKey}`;
    }

    if (
      this.authenticationType === "apikey"
    ) {
      return this.apiKey;
    }

    return `Bearer ${this.apiKey}`;
  }

  buildUrl(path, pathParameters = {}) {
    let resolvedPath = normalizeString(path);

    for (const [key, value] of Object.entries(pathParameters)) {
      resolvedPath = resolvedPath.replaceAll(
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

  getRetryDelay(response, retryCount) {
    const retryAfter = response?.headers?.get("retry-after");

    if (retryAfter) {
      const seconds = Number(retryAfter);

      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, 30000);
      }
    }

    return Math.min(500 * 2 ** retryCount, 5000);
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
        "Paperfly API endpoint is not configured",
        501,
        "PAPERFLY_ENDPOINT_NOT_CONFIGURED"
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
          url.searchParams.set(key, String(value));
        }
      }
    }

    const requestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization:
        this.buildAuthorizationHeader(),
      "X-Correlation-Id": correlationId,
      ...headers,
    };

    if (
      this.authenticationType === "apikey"
    ) {
      requestHeaders["X-API-Key"] =
        this.apiKey;

      delete requestHeaders.Authorization;
    }

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
            : JSON.stringify(removeUndefined(body)),
        signal: controller.signal,
      });

      const data =
        await this.parseResponse(response);

      const durationMs =
        Date.now() - startedAt;

      if (
        RETRYABLE_STATUS_CODES.has(
          response.status
        ) &&
        retryCount < this.maxRetries
      ) {
        await sleep(
          this.getRetryDelay(
            response,
            retryCount
          )
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
            `Paperfly API request failed with status ${response.status}`,
          response.status,
          "PAPERFLY_API_REQUEST_FAILED",
          {
            response:
              maskSensitiveData(data),
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
            Math.min(
              500 * 2 ** retryCount,
              5000
            )
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
          "Paperfly API request timed out",
          504,
          "PAPERFLY_REQUEST_TIMEOUT",
          { correlationId }
        );
      }

      if (
        !error.statusCode &&
        retryCount < this.maxRetries
      ) {
        await sleep(
          Math.min(
            500 * 2 ** retryCount,
            5000
          )
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
          "Paperfly network request failed",
        502,
        "PAPERFLY_NETWORK_ERROR",
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
        shipment?.parcelId ||
        shipment?.paperflyOrderId
    );
  }

  extractApiData(response) {
    return (
      response?.data?.data ||
      response?.data?.result ||
      response?.data ||
      {}
    );
  }

  mapDeliveryStatus(status) {
    return (
      STATUS_MAP[
        normalizeStatusKey(status)
      ] || "unknown"
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
          shipment.shipmentNumber ||
          shipment.referenceNumber
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

      district: normalizeString(
        recipient.district ||
          recipient.districtName
      ),

      area: normalizeString(
        recipient.area ||
          recipient.areaName ||
          recipient.thana ||
          recipient.upazila
      ),

      codAmount:
        normalizeNonNegativeNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),

      weight:
        normalizeNonNegativeNumber(
          shipment.weight ||
            shipment.parcel?.weight ||
            0.5,
          0.5
        ),

      quantity:
        normalizePositiveInteger(
          shipment.itemQuantity ||
            shipment.parcel?.itemQuantity ||
            1,
          1
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

    if (normalized.weight <= 0) {
      errors.push(
        "Parcel weight must be greater than 0"
      );
    }

    if (normalized.quantity < 1) {
      errors.push(
        "Item quantity must be at least 1"
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

    const normalized =
      validation.normalized;

    const parcel =
      shipment.parcel || {};

    return removeUndefined({
      merchantCode:
        this.merchantCode || undefined,

      merchant_code:
        this.merchantCode || undefined,

      orderNumber:
        normalized.orderNumber,

      order_number:
        normalized.orderNumber,

      invoiceNumber:
        normalized.orderNumber,

      invoice_number:
        normalized.orderNumber,

      recipientName:
        normalized.recipientName,

      recipient_name:
        normalized.recipientName,

      recipientPhone:
        normalized.recipientPhone,

      recipient_phone:
        normalized.recipientPhone,

      recipientAddress:
        normalized.recipientAddress,

      recipient_address:
        normalized.recipientAddress,

      district:
        normalized.district || undefined,

      area:
        normalized.area || undefined,

      cashCollection:
        normalized.codAmount,

      cash_collection:
        normalized.codAmount,

      codAmount:
        normalized.codAmount,

      cod_amount:
        normalized.codAmount,

      weight:
        normalized.weight,

      parcelWeight:
        normalized.weight,

      parcel_weight:
        normalized.weight,

      quantity:
        normalized.quantity,

      itemDescription:
        normalizeString(
          shipment.itemDescription ||
            parcel.description ||
            shipment.description
        ) || "E-commerce parcel",

      item_description:
        normalizeString(
          shipment.itemDescription ||
            parcel.description ||
            shipment.description
        ) || "E-commerce parcel",

      specialInstruction:
        normalizeString(
          shipment.specialInstruction ||
            shipment.instructions ||
            parcel.specialInstruction
        ) || undefined,

      special_instruction:
        normalizeString(
          shipment.specialInstruction ||
            shipment.instructions ||
            parcel.specialInstruction
        ) || undefined,

      declaredValue:
        normalizeNonNegativeNumber(
          shipment.pricing?.declaredValue ??
            shipment.declaredValue ??
            shipment.totalAmount,
          0
        ),

      declared_value:
        normalizeNonNegativeNumber(
          shipment.pricing?.declaredValue ??
            shipment.declaredValue ??
            shipment.totalAmount,
          0
        ),
    });
  }

  async createShipment(shipment) {
    this.validateConfiguration({
      requireCreatePath: true,
    });

    const payload =
      await this.buildCreatePayload(
        shipment
      );

    const response =
      await this.request({
        method: "POST",
        path:
          this.paths.createShipment,
        body: payload,
      });

    const data =
      this.extractApiData(response);

    const trackingId =
      normalizeString(
        data.trackingId ||
          data.tracking_id ||
          data.trackingNumber ||
          data.tracking_number ||
          data.orderId ||
          data.order_id ||
          data.parcelId ||
          data.parcel_id ||
          data.id
      );

    if (!trackingId) {
      throw this.createServiceError(
        "Paperfly create-shipment response did not contain a tracking ID",
        502,
        "PAPERFLY_CREATE_RESPONSE_INVALID",
        maskSensitiveData(
          response.data
        )
      );
    }

    const providerStatus =
      normalizeString(
        data.status ||
          data.orderStatus ||
          data.order_status ||
          data.deliveryStatus ||
          "submitted"
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
          "Shipment booked with Paperfly",

        bookedAt: new Date(),
      },

      raw: response.data,

      apiLog: {
        action: "create_shipment",
        method: "POST",
        endpoint:
          this.paths.createShipment,
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
    this.validateConfiguration({
      requireTrackPath: true,
    });

    const trackingId =
      this.getTrackingId(shipment);

    if (!trackingId) {
      throw this.createServiceError(
        "Paperfly tracking ID is required",
        400,
        "PAPERFLY_TRACKING_ID_REQUIRED"
      );
    }

    const response =
      await this.request({
        method: "GET",
        path:
          this.paths.trackShipment,
        pathParameters: {
          trackingId,
          trackingNumber: trackingId,
          orderId: trackingId,
        },
        query: {
          trackingId,
          tracking_id: trackingId,
        },
      });

    const data =
      this.extractApiData(response);

    const providerStatus =
      normalizeString(
        data.status ||
          data.orderStatus ||
          data.order_status ||
          data.deliveryStatus ||
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
            data.currentLocation ||
              data.current_location ||
              data.location
          ) || null,

        statusMessage:
          normalizeString(
            data.statusMessage ||
              data.status_message ||
              data.message
          ) ||
          `Paperfly status: ${providerStatus}`,

        trackingUrl:
          normalizeString(
            data.trackingUrl ||
              data.tracking_url
          ) || null,

        checkedAt: new Date(),
      },

      raw: response.data,

      apiLog: {
        action: "track_shipment",
        method: "GET",
        endpoint:
          this.paths.trackShipment,
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
    const existingStatus =
      this.mapDeliveryStatus(
        shipment?.courierStatus ||
          shipment?.deliveryStatus
      );

    if (
      TERMINAL_STATUSES.has(
        existingStatus
      )
    ) {
      return {
        success: true,
        provider: PROVIDER_CODE,
        skipped: true,
        reason:
          "Shipment already has a terminal delivery status",
        shipment: {
          bookingStatus:
            shipment.bookingStatus,
          deliveryStatus:
            shipment.deliveryStatus,
          trackingNumber:
            this.getTrackingId(
              shipment
            ),
          courierStatus:
            shipment.courierStatus,
          statusMessage:
            shipment.statusMessage,
          lastSyncedAt: new Date(),
        },
      };
    }

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

    if (
      !this.paths.cancelShipment
    ) {
      throw this.createServiceError(
        "Paperfly cancellation endpoint is not configured or unavailable",
        501,
        "PAPERFLY_CANCELLATION_NOT_SUPPORTED"
      );
    }

    const trackingId =
      this.getTrackingId(shipment);

    if (!trackingId) {
      throw this.createServiceError(
        "Paperfly tracking ID is required for cancellation",
        400,
        "PAPERFLY_TRACKING_ID_REQUIRED"
      );
    }

    const currentStatus =
      this.mapDeliveryStatus(
        shipment?.courierStatus ||
          shipment?.deliveryStatus
      );

    if (
      TERMINAL_STATUSES.has(
        currentStatus
      )
    ) {
      throw this.createServiceError(
        `Shipment cannot be cancelled after reaching "${currentStatus}" status`,
        409,
        "PAPERFLY_SHIPMENT_NOT_CANCELLABLE"
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
        path:
          this.paths.cancelShipment,
        pathParameters: {
          trackingId,
          trackingNumber: trackingId,
          orderId: trackingId,
        },
        body: {
          trackingId,
          tracking_id: trackingId,
          orderId: trackingId,
          order_id: trackingId,
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
          this.paths.cancelShipment,
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

    if (
      !this.paths.calculateCharge
    ) {
      throw this.createServiceError(
        "Paperfly charge calculation endpoint is not configured or unavailable",
        501,
        "PAPERFLY_CHARGE_CALCULATION_NOT_SUPPORTED"
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

    const payload = removeUndefined({
      merchantCode:
        this.merchantCode || undefined,

      merchant_code:
        this.merchantCode || undefined,

      district:
        recipient.district ||
        recipient.districtName ||
        undefined,

      area:
        recipient.area ||
        recipient.areaName ||
        recipient.thana ||
        recipient.upazila ||
        undefined,

      weight:
        normalizeNonNegativeNumber(
          shipment.weight ||
            shipment.parcel?.weight ||
            0.5,
          0.5
        ),

      codAmount:
        normalizeNonNegativeNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),

      cod_amount:
        normalizeNonNegativeNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),
    });

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
      normalizeNonNegativeNumber(
        data.charge ||
          data.deliveryCharge ||
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
          payload.codAmount,

        currency:
          normalizeString(
            data.currency
          ).toUpperCase() ||
          DEFAULT_CURRENCY,

        calculatedBy:
          "paperfly_api",
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
          "PAPERFLY_HEALTH_CHECK_FAILED",
        message: error.message,
        latencyMs:
          Date.now() - startedAt,
        timestamp: new Date(),
      };
    }
  }
}

module.exports =
  new PaperflyCourierService();
