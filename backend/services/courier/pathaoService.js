"use strict";

const crypto = require("crypto");

const PROVIDER_CODE = "pathao";
const DEFAULT_BASE_URL = "https://api-hermes.pathao.com";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TOKEN_SKEW_MS = 60000;
const DEFAULT_CURRENCY = "BDT";

const DEFAULT_PATHS = Object.freeze({
  token: "/aladdin/api/v1/issue-token",
  createOrder: "/aladdin/api/v1/orders",
  trackOrder: "/aladdin/api/v1/orders/{consignmentId}/info",
  pricePlan: "/aladdin/api/v1/merchant/price-plan",
  cancelOrder: "",
});

const STATUS_MAP = Object.freeze({
  pending: "pending",
  draft: "pending",
  initiated: "pending",
  created: "booked",
  confirmed: "booked",
  accepted: "booked",
  assigned_for_pickup: "booked",
  pickup_requested: "booked",
  picked_up: "picked_up",
  pickup_completed: "picked_up",
  in_transit: "in_transit",
  at_sorting_hub: "in_transit",
  on_the_way: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivery_in_progress: "out_for_delivery",
  delivered: "delivered",
  completed: "delivered",
  partial_delivered: "partially_delivered",
  partially_delivered: "partially_delivered",
  delivery_failed: "delivery_failed",
  failed_delivery: "delivery_failed",
  returned: "returned",
  return_completed: "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
});

const RETRYABLE_STATUS_CODES = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const normalizeString = (value) =>
  value === null || value === undefined
    ? ""
    : String(value).trim();

const normalizeStatusKey = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
};

const maskSensitiveData = (value) => {
  if (!value || typeof value !== "object") return value;

  const clone = JSON.parse(JSON.stringify(value));
  const sensitiveKeys = new Set([
    "password",
    "client_secret",
    "clientSecret",
    "access_token",
    "accessToken",
    "refresh_token",
    "refreshToken",
    "authorization",
  ]);

  const visit = (target) => {
    if (!target || typeof target !== "object") return;

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

class PathaoCourierService {
  constructor(options = {}) {
    this.baseUrl = normalizeString(
      options.baseUrl ||
        process.env.PATHAO_BASE_URL ||
        DEFAULT_BASE_URL
    ).replace(/\/+$/, "");

    this.clientId = normalizeString(
      options.clientId || process.env.PATHAO_CLIENT_ID
    );
    this.clientSecret = normalizeString(
      options.clientSecret || process.env.PATHAO_CLIENT_SECRET
    );
    this.username = normalizeString(
      options.username || process.env.PATHAO_USERNAME
    );
    this.password = normalizeString(
      options.password || process.env.PATHAO_PASSWORD
    );
    this.storeId = normalizeString(
      options.storeId || process.env.PATHAO_STORE_ID
    );

    this.timeoutMs = normalizePositiveNumber(
      options.timeoutMs || process.env.PATHAO_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS
    );
    this.maxRetries = normalizePositiveNumber(
      options.maxRetries ?? process.env.PATHAO_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    );

    this.paths = Object.freeze({
      token:
        normalizeString(
          options.tokenPath || process.env.PATHAO_TOKEN_PATH
        ) || DEFAULT_PATHS.token,
      createOrder:
        normalizeString(
          options.createOrderPath ||
            process.env.PATHAO_CREATE_ORDER_PATH
        ) || DEFAULT_PATHS.createOrder,
      trackOrder:
        normalizeString(
          options.trackOrderPath ||
            process.env.PATHAO_TRACK_ORDER_PATH
        ) || DEFAULT_PATHS.trackOrder,
      pricePlan:
        normalizeString(
          options.pricePlanPath ||
            process.env.PATHAO_PRICE_PLAN_PATH
        ) || DEFAULT_PATHS.pricePlan,
      cancelOrder: normalizeString(
        options.cancelOrderPath ||
          process.env.PATHAO_CANCEL_ORDER_PATH
      ),
    });

    this.tokenCache = {
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
    };

    this.tokenPromise = null;
  }

  createServiceError(
    message,
    statusCode = 500,
    code = "PATHAO_SERVICE_ERROR",
    details = null
  ) {
    const error = new Error(message);
    error.name = "PathaoCourierServiceError";
    error.provider = PROVIDER_CODE;
    error.statusCode = statusCode;
    error.code = code;
    if (details !== null) error.details = details;
    return error;
  }

  validateConfiguration({ requireStoreId = false } = {}) {
    const missing = [];

    if (!this.baseUrl) missing.push("PATHAO_BASE_URL");
    if (!this.clientId) missing.push("PATHAO_CLIENT_ID");
    if (!this.clientSecret) missing.push("PATHAO_CLIENT_SECRET");
    if (!this.username) missing.push("PATHAO_USERNAME");
    if (!this.password) missing.push("PATHAO_PASSWORD");
    if (requireStoreId && !this.storeId) {
      missing.push("PATHAO_STORE_ID");
    }

    if (missing.length) {
      throw this.createServiceError(
        `Missing Pathao configuration: ${missing.join(", ")}`,
        503,
        "PATHAO_CONFIGURATION_MISSING",
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

    if (/^https?:\/\//i.test(resolvedPath)) return resolvedPath;
    return `${this.baseUrl}/${resolvedPath.replace(/^\/+/, "")}`;
  }

  async parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";

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
    authenticated = true,
    retryCount = 0,
    correlationId = crypto.randomUUID(),
  }) {
    if (!path) {
      throw this.createServiceError(
        "Pathao API endpoint is not configured",
        501,
        "PATHAO_ENDPOINT_NOT_CONFIGURED"
      );
    }

    const url = new URL(this.buildUrl(path, pathParameters));

    if (query && typeof query === "object") {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const requestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Correlation-Id": correlationId,
      ...headers,
    };

    if (authenticated) {
      requestHeaders.Authorization =
        `Bearer ${await this.getAccessToken()}`;
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
            : JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await this.parseResponse(response);
      const durationMs = Date.now() - startedAt;

      if (
        response.status === 401 &&
        authenticated &&
        retryCount === 0
      ) {
        this.clearTokenCache();
        return this.request({
          method,
          path,
          pathParameters,
          query,
          body,
          headers,
          authenticated,
          retryCount: retryCount + 1,
          correlationId,
        });
      }

      if (
        RETRYABLE_STATUS_CODES.has(response.status) &&
        retryCount < this.maxRetries
      ) {
        await sleep(500 * 2 ** retryCount);
        return this.request({
          method,
          path,
          pathParameters,
          query,
          body,
          headers,
          authenticated,
          retryCount: retryCount + 1,
          correlationId,
        });
      }

      if (!response.ok) {
        throw this.createServiceError(
          data?.message ||
            data?.error ||
            `Pathao API request failed with status ${response.status}`,
          response.status,
          "PATHAO_API_REQUEST_FAILED",
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
          await sleep(500 * 2 ** retryCount);
          return this.request({
            method,
            path,
            pathParameters,
            query,
            body,
            headers,
            authenticated,
            retryCount: retryCount + 1,
            correlationId,
          });
        }

        throw this.createServiceError(
          "Pathao API request timed out",
          504,
          "PATHAO_REQUEST_TIMEOUT",
          { correlationId }
        );
      }

      if (!error.statusCode && retryCount < this.maxRetries) {
        await sleep(500 * 2 ** retryCount);
        return this.request({
          method,
          path,
          pathParameters,
          query,
          body,
          headers,
          authenticated,
          retryCount: retryCount + 1,
          correlationId,
        });
      }

      if (error.provider === PROVIDER_CODE) throw error;

      throw this.createServiceError(
        error.message || "Pathao network request failed",
        502,
        "PATHAO_NETWORK_ERROR",
        { correlationId }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  clearTokenCache() {
    this.tokenCache = {
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
    };
  }

  hasUsableAccessToken() {
    return Boolean(
      this.tokenCache.accessToken &&
        Date.now() + DEFAULT_TOKEN_SKEW_MS <
          this.tokenCache.expiresAt
    );
  }

  async issueToken() {
    this.validateConfiguration();

    const response = await this.request({
      method: "POST",
      path: this.paths.token,
      authenticated: false,
      body: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password,
        grant_type: "password",
      },
    });

    const tokenData = response.data?.data || response.data || {};
    const accessToken =
      tokenData.access_token || tokenData.accessToken;
    const expiresIn = normalizePositiveNumber(
      tokenData.expires_in || tokenData.expiresIn,
      3600
    );

    if (!accessToken) {
      throw this.createServiceError(
        "Pathao token response did not contain an access token",
        502,
        "PATHAO_TOKEN_RESPONSE_INVALID",
        maskSensitiveData(response.data)
      );
    }

    this.tokenCache = {
      accessToken,
      refreshToken:
        tokenData.refresh_token ||
        tokenData.refreshToken ||
        null,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return accessToken;
  }

  async getAccessToken() {
    if (this.hasUsableAccessToken()) {
      return this.tokenCache.accessToken;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.issueToken().finally(() => {
        this.tokenPromise = null;
      });
    }

    return this.tokenPromise;
  }

  getRecipient(shipment) {
    return shipment?.recipient || {};
  }

  getConsignmentId(shipment) {
    return normalizeString(
      shipment?.consignmentId ||
        shipment?.trackingNumber ||
        shipment?.courierReference ||
        shipment?.bookingId
    );
  }

  mapDeliveryStatus(status) {
    return STATUS_MAP[normalizeStatusKey(status)] || "unknown";
  }

  extractApiData(response) {
    return response?.data?.data || response?.data || {};
  }

  async validateShipment(shipment) {
    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const recipient = this.getRecipient(shipment);
    const errors = [];
    const normalized = {
      orderNumber: normalizeString(shipment.orderNumber),
      recipientName: normalizeString(recipient.name),
      recipientPhone: normalizeString(recipient.phone),
      recipientAddress: normalizeString(
        recipient.addressLine ||
          recipient.address ||
          recipient.fullAddress
      ),
      itemQuantity: normalizePositiveNumber(
        shipment.itemQuantity ||
          shipment.parcel?.itemQuantity ||
          1,
        1
      ),
      itemWeight: normalizePositiveNumber(
        shipment.weight ||
          shipment.parcel?.weight ||
          0.5,
        0.5
      ),
    };

    if (!normalized.orderNumber) errors.push("Order number is required");
    if (!normalized.recipientName) errors.push("Recipient name is required");
    if (!normalized.recipientPhone) errors.push("Recipient phone is required");
    if (!normalized.recipientAddress) {
      errors.push("Recipient full address is required");
    }
    if (normalized.itemQuantity < 1) {
      errors.push("Item quantity must be at least 1");
    }
    if (normalized.itemWeight <= 0) {
      errors.push("Item weight must be greater than 0");
    }

    if (errors.length) {
      const error = this.createServiceError(
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
      message: "Shipment validation successful",
      normalized,
    };
  }

  async buildCreatePayload(shipment) {
    const validation = await this.validateShipment(shipment);
    const pricing = shipment.pricing || {};
    const parcel = shipment.parcel || {};

    return {
      store_id: Number(this.storeId),
      merchant_order_id: validation.normalized.orderNumber,
      recipient_name: validation.normalized.recipientName,
      recipient_phone: validation.normalized.recipientPhone,
      recipient_address:
        validation.normalized.recipientAddress,
      delivery_type: Number(
        shipment.deliveryType ||
          parcel.deliveryType ||
          48
      ),
      item_type: Number(
        shipment.itemType ||
          parcel.itemType ||
          2
      ),
      special_instruction:
        normalizeString(
          shipment.specialInstruction ||
            shipment.instructions ||
            parcel.specialInstruction
        ) || undefined,
      item_quantity: validation.normalized.itemQuantity,
      item_weight: validation.normalized.itemWeight,
      item_description:
        normalizeString(
          parcel.description ||
            shipment.itemDescription ||
            shipment.description
        ) || "E-commerce parcel",
      amount_to_collect: normalizePositiveNumber(
        pricing.codAmount ??
          shipment.codAmount ??
          shipment.collectionAmount,
        0
      ),
    };
  }

  async createShipment(shipment) {
    this.validateConfiguration({ requireStoreId: true });

    const payload = await this.buildCreatePayload(shipment);
    const response = await this.request({
      method: "POST",
      path: this.paths.createOrder,
      body: payload,
    });

    const data = this.extractApiData(response);
    const consignmentId = normalizeString(
      data.consignment_id ||
        data.consignmentId ||
        data.tracking_code ||
        data.trackingNumber
    );

    if (!consignmentId) {
      throw this.createServiceError(
        "Pathao create-order response did not contain a consignment ID",
        502,
        "PATHAO_CREATE_RESPONSE_INVALID",
        maskSensitiveData(response.data)
      );
    }

    const providerStatus = normalizeString(
      data.order_status || data.status || "created"
    );
    const mappedStatus = this.mapDeliveryStatus(providerStatus);

    return {
      success: true,
      provider: PROVIDER_CODE,
      shipment: {
        bookingStatus: "booked",
        deliveryStatus:
          mappedStatus === "unknown" ? "booked" : mappedStatus,
        bookingId: consignmentId,
        trackingNumber: consignmentId,
        consignmentId,
        courierReference: consignmentId,
        courierStatus: providerStatus,
        statusMessage:
          normalizeString(data.message) ||
          "Shipment booked with Pathao",
        bookedAt: new Date(),
      },
      raw: response.data,
      apiLog: {
        action: "create_shipment",
        method: "POST",
        endpoint: this.paths.createOrder,
        request: maskSensitiveData(payload),
        response: maskSensitiveData(response.data),
        statusCode: response.statusCode,
        correlationId: response.correlationId,
        durationMs: response.durationMs,
        success: true,
      },
    };
  }

  async trackShipment(shipment) {
    this.validateConfiguration();

    const consignmentId = this.getConsignmentId(shipment);

    if (!consignmentId) {
      throw this.createServiceError(
        "Pathao consignment ID is required for tracking",
        400,
        "PATHAO_CONSIGNMENT_ID_REQUIRED"
      );
    }

    const response = await this.request({
      method: "GET",
      path: this.paths.trackOrder,
      pathParameters: { consignmentId },
    });

    const data = this.extractApiData(response);
    const providerStatus = normalizeString(
      data.order_status ||
        data.delivery_status ||
        data.status ||
        "unknown"
    );

    return {
      success: true,
      provider: PROVIDER_CODE,
      tracking: {
        trackingNumber: consignmentId,
        consignmentId,
        bookingStatus: shipment?.bookingStatus || "booked",
        deliveryStatus: this.mapDeliveryStatus(providerStatus),
        courierStatus: providerStatus,
        currentLocation:
          normalizeString(
            data.current_location || data.location
          ) || null,
        statusMessage:
          normalizeString(
            data.status_message || data.message
          ) || `Pathao status: ${providerStatus}`,
        trackingUrl:
          normalizeString(
            data.tracking_url || data.trackingUrl
          ) || null,
        checkedAt: new Date(),
      },
      raw: response.data,
      apiLog: {
        action: "track_shipment",
        method: "GET",
        endpoint: this.paths.trackOrder,
        request: { consignmentId },
        response: maskSensitiveData(response.data),
        statusCode: response.statusCode,
        correlationId: response.correlationId,
        durationMs: response.durationMs,
        success: true,
      },
    };
  }

  async syncShipment(shipment) {
    const tracked = await this.trackShipment(shipment);

    return {
      success: true,
      provider: PROVIDER_CODE,
      shipment: {
        bookingStatus: tracked.tracking.bookingStatus,
        deliveryStatus: tracked.tracking.deliveryStatus,
        trackingNumber: tracked.tracking.trackingNumber,
        consignmentId: tracked.tracking.consignmentId,
        courierStatus: tracked.tracking.courierStatus,
        currentLocation: tracked.tracking.currentLocation,
        statusMessage: tracked.tracking.statusMessage,
        lastSyncedAt: new Date(),
      },
      raw: tracked.raw,
      apiLog: tracked.apiLog,
    };
  }

  async cancelShipment(shipment, courier = null, options = {}) {
    this.validateConfiguration();

    if (!this.paths.cancelOrder) {
      throw this.createServiceError(
        "Pathao cancellation endpoint is not configured or unavailable",
        501,
        "PATHAO_CANCELLATION_NOT_SUPPORTED"
      );
    }

    const consignmentId = this.getConsignmentId(shipment);

    if (!consignmentId) {
      throw this.createServiceError(
        "Pathao consignment ID is required for cancellation",
        400,
        "PATHAO_CONSIGNMENT_ID_REQUIRED"
      );
    }

    const reason =
      normalizeString(options.reason) ||
      normalizeString(shipment?.cancellationReason) ||
      "Cancelled by merchant";

    const response = await this.request({
      method: "POST",
      path: this.paths.cancelOrder,
      pathParameters: { consignmentId },
      body: {
        consignment_id: consignmentId,
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
        endpoint: this.paths.cancelOrder,
        request: { consignmentId, reason },
        response: maskSensitiveData(response.data),
        statusCode: response.statusCode,
        correlationId: response.correlationId,
        durationMs: response.durationMs,
        success: true,
      },
    };
  }

  async calculateCharge(shipment) {
    this.validateConfiguration({ requireStoreId: true });

    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const recipient = this.getRecipient(shipment);
    const parcel = shipment.parcel || {};

    const query = {
      store_id: Number(this.storeId),
      item_type: Number(
        shipment.itemType || parcel.itemType || 2
      ),
      delivery_type: Number(
        shipment.deliveryType || parcel.deliveryType || 48
      ),
      item_weight: normalizePositiveNumber(
        shipment.weight || parcel.weight || 0.5,
        0.5
      ),
      recipient_city: recipient.cityId || undefined,
      recipient_zone: recipient.zoneId || undefined,
    };

    const response = await this.request({
      method: "GET",
      path: this.paths.pricePlan,
      query,
    });

    const data = this.extractApiData(response);
    const price = normalizePositiveNumber(
      data.price || data.delivery_charge || data.charge,
      0
    );

    return {
      success: true,
      provider: PROVIDER_CODE,
      charge: {
        shippingCharge: price,
        courierCharge: price,
        codAmount: normalizePositiveNumber(
          shipment.pricing?.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount,
          0
        ),
        currency:
          normalizeString(data.currency).toUpperCase() ||
          DEFAULT_CURRENCY,
        calculatedBy: "pathao_api",
      },
      raw: response.data,
      apiLog: {
        action: "calculate_charge",
        method: "GET",
        endpoint: this.paths.pricePlan,
        request: query,
        response: maskSensitiveData(response.data),
        statusCode: response.statusCode,
        correlationId: response.correlationId,
        durationMs: response.durationMs,
        success: true,
      },
    };
  }

  async health() {
    const startedAt = Date.now();

    try {
      this.validateConfiguration();
      await this.getAccessToken();

      return {
        success: true,
        provider: PROVIDER_CODE,
        status: "healthy",
        authenticated: true,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        provider: PROVIDER_CODE,
        status: "unhealthy",
        authenticated: false,
        code: error.code || "PATHAO_HEALTH_CHECK_FAILED",
        message: error.message,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date(),
      };
    }
  }
}

module.exports = new PathaoCourierService();
