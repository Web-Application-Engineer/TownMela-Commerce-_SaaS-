"use strict";

/* =========================================================
   STEADFAST COURIER SERVICE
========================================================= */

const DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT_MS = 30000;
const PROVIDER_CODE = "steadfast";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

/* Must remain compatible with CourierShipment.deliveryStatus enum. */
const STATUS_MAP = Object.freeze({
  pending: "pending",
  in_review: "booked",
  hold: "pending",
  delivered_approval_pending: "in_transit",
  partial_delivered_approval_pending: "in_transit",
  cancelled_approval_pending: "pending",
  unknown_approval_pending: "unknown",
  delivered: "delivered",
  partial_delivered: "partially_delivered",
  cancelled: "cancelled",
  unknown: "unknown",
});

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const toNonNegativeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : fallback;
};

class SteadfastCourierService {
  constructor() {
    this.provider = PROVIDER_CODE;
    this.circuit = {
      state: "closed",
      consecutiveFailures: 0,
      openedAt: null,
    };
  }

  /* =====================================================
     INTERNAL HELPERS
  ===================================================== */

  normalizeBaseUrl(baseUrl) {
    return String(baseUrl || DEFAULT_BASE_URL)
      .trim()
      .replace(/\/+$/, "");
  }

  createRequestId() {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${PROVIDER_CODE}-${Date.now()}-${randomPart}`;
  }

  getCredentials(courier) {
    const credentials = courier?.credentials || {};
    const apiKey = credentials.apiKey || credentials.api_key;
    const secretKey =
      credentials.secretKey || credentials.secret || credentials.secret_key;

    if (!apiKey || !String(apiKey).trim()) {
      throw this.createServiceError("Steadfast API key is missing", {
        code: "STEADFAST_API_KEY_MISSING",
        statusCode: 500,
      });
    }

    if (!secretKey || !String(secretKey).trim()) {
      throw this.createServiceError("Steadfast secret key is missing", {
        code: "STEADFAST_SECRET_KEY_MISSING",
        statusCode: 500,
      });
    }

    return {
      apiKey: String(apiKey).trim(),
      secretKey: String(secretKey).trim(),
    };
  }

  getHeaders(courier, requestId) {
    const { apiKey, secretKey } = this.getCredentials(courier);

    return {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Request-Id": requestId,
    };
  }

  createServiceError(message, details = {}) {
    const error = new Error(message);
    error.name = details.name || "SteadfastCourierError";
    error.code = details.code || "STEADFAST_COURIER_ERROR";
    error.statusCode = details.statusCode || 500;
    error.provider = PROVIDER_CODE;

    if (details.apiResponse !== undefined) error.apiResponse = details.apiResponse;
    if (details.apiLog !== undefined) error.apiLog = details.apiLog;
    if (details.validationErrors) error.validationErrors = details.validationErrors;
    if (details.cause) error.cause = details.cause;

    return error;
  }

  extractErrorMessage(responseData, fallbackMessage) {
    if (typeof responseData === "string") return responseData;

    const firstError = responseData?.errors?.[0];
    if (typeof firstError === "string") return firstError;
    if (firstError?.message) return firstError.message;

    return (
      responseData?.message ||
      responseData?.error_description ||
      responseData?.error ||
      fallbackMessage
    );
  }

  sanitizeForLog(value) {
    if (value === null || value === undefined) return value;

    const clone = (() => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return "[Unserializable payload]";
      }
    })();

    const mask = (input) => {
      if (Array.isArray(input)) {
        input.forEach(mask);
        return;
      }

      if (!input || typeof input !== "object") return;

      for (const [key, child] of Object.entries(input)) {
        const normalizedKey = key.toLowerCase();

        if (
          normalizedKey.includes("secret") ||
          normalizedKey.includes("api_key") ||
          normalizedKey.includes("apikey") ||
          normalizedKey.includes("token") ||
          normalizedKey.includes("authorization")
        ) {
          input[key] = "[REDACTED]";
          continue;
        }

        if (normalizedKey.includes("phone") && typeof child === "string") {
          input[key] = child.length > 4 ? `*******${child.slice(-4)}` : "****";
          continue;
        }

        mask(child);
      }
    };

    mask(clone);
    return clone;
  }

  buildApiLog({
    method,
    endpoint,
    url,
    body,
    statusCode = null,
    success = false,
    response = null,
    errorMessage = null,
    startedAt,
    finishedAt = new Date(),
    requestId,
    retryCount = 0,
    timedOut = false,
  }) {
    return {
      provider: PROVIDER_CODE,
      action: endpoint,
      method,
      endpoint,
      url,
      requestId,
      requestBody: this.sanitizeForLog(body ?? null),
      requestPayload: this.sanitizeForLog(body ?? null),
      statusCode,
      success,
      response: this.sanitizeForLog(response),
      responsePayload: this.sanitizeForLog(response),
      error: errorMessage,
      errorMessage,
      retryCount,
      timedOut,
      startedAt,
      requestedAt: startedAt,
      finishedAt,
      respondedAt: finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }

  assertCircuitAvailable() {
    if (this.circuit.state !== "open") return;

    const elapsed = Date.now() - this.circuit.openedAt;
    if (elapsed >= CIRCUIT_RESET_TIMEOUT_MS) {
      this.circuit.state = "half_open";
      return;
    }

    throw this.createServiceError(
      "Steadfast API is temporarily unavailable. Please try again shortly.",
      {
        name: "SteadfastCircuitOpenError",
        code: "STEADFAST_CIRCUIT_OPEN",
        statusCode: 503,
      }
    );
  }

  recordRequestSuccess() {
    this.circuit.state = "closed";
    this.circuit.consecutiveFailures = 0;
    this.circuit.openedAt = null;
  }

  recordRequestFailure() {
    this.circuit.consecutiveFailures += 1;

    if (this.circuit.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuit.state = "open";
      this.circuit.openedAt = Date.now();
    }
  }

  shouldRetry(error, statusCode, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    if (error?.name === "AbortError") return true;
    if (statusCode && RETRYABLE_STATUS_CODES.has(statusCode)) return true;

    return Boolean(
      error &&
        ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT"].includes(
          error.code
        )
    );
  }

  getRetryDelay(attempt, response) {
    const retryAfter = response?.headers?.get?.("retry-after");

    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }

    const exponentialDelay = DEFAULT_RETRY_DELAY_MS * 2 ** attempt;
    const jitter = Math.floor(Math.random() * 250);
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
  }

  /* =====================================================
     STANDARD API REQUEST
  ===================================================== */

  async request({
    courier,
    endpoint,
    method = "GET",
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
  }) {
    this.assertCircuitAvailable();

    const baseUrl = this.normalizeBaseUrl(courier?.apiBaseUrl);
    const cleanEndpoint = String(endpoint || "").replace(/^\/+/, "");

    if (!cleanEndpoint) {
      throw this.createServiceError("Steadfast API endpoint is required", {
        code: "STEADFAST_ENDPOINT_REQUIRED",
        statusCode: 500,
      });
    }

    const url = `${baseUrl}/${cleanEndpoint}`;
    const normalizedMethod = String(method || "GET").trim().toUpperCase();
    const requestId = this.createRequestId();
    const startedAt = new Date();
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response;

      try {
        response = await fetch(url, {
          method: normalizedMethod,
          headers: this.getHeaders(courier, requestId),
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        const rawText = await response.text();
        let responseData = {};

        if (rawText) {
          try {
            responseData = JSON.parse(rawText);
          } catch {
            responseData = { rawResponse: rawText };
          }
        }

        if (!response.ok) {
          const apiLog = this.buildApiLog({
            method: normalizedMethod,
            endpoint: `/${cleanEndpoint}`,
            url,
            body,
            statusCode: response.status,
            success: false,
            response: responseData,
            errorMessage: this.extractErrorMessage(
              responseData,
              `Steadfast API request failed with status ${response.status}`
            ),
            startedAt,
            requestId,
            retryCount: attempt,
          });

          const error = this.createServiceError(apiLog.errorMessage, {
            code: "STEADFAST_API_REQUEST_FAILED",
            statusCode: response.status,
            apiResponse: responseData,
            apiLog,
          });

          if (this.shouldRetry(error, response.status, attempt, maxRetries)) {
            await sleep(this.getRetryDelay(attempt, response));
            continue;
          }

          this.recordRequestFailure();
          throw error;
        }

        this.recordRequestSuccess();

        return {
          data: responseData,
          apiLog: this.buildApiLog({
            method: normalizedMethod,
            endpoint: `/${cleanEndpoint}`,
            url,
            body,
            statusCode: response.status,
            success: true,
            response: responseData,
            startedAt,
            requestId,
            retryCount: attempt,
          }),
        };
      } catch (error) {
        lastError = error;

        if (error.provider === PROVIDER_CODE && error.apiLog) {
          throw error;
        }

        const timedOut = error.name === "AbortError";
        const statusCode = timedOut ? 504 : 503;

        if (this.shouldRetry(error, null, attempt, maxRetries)) {
          await sleep(this.getRetryDelay(attempt, response));
          continue;
        }

        this.recordRequestFailure();

        const message = timedOut
          ? `Steadfast API request timed out after ${timeoutMs}ms`
          : `Unable to connect to Steadfast API. ${error.message}`;

        const apiLog = this.buildApiLog({
          method: normalizedMethod,
          endpoint: `/${cleanEndpoint}`,
          url,
          body,
          statusCode,
          success: false,
          response: null,
          errorMessage: message,
          startedAt,
          requestId,
          retryCount: attempt,
          timedOut,
        });

        throw this.createServiceError(message, {
          name: timedOut ? "SteadfastTimeoutError" : "SteadfastNetworkError",
          code: timedOut ? "STEADFAST_REQUEST_TIMEOUT" : "STEADFAST_NETWORK_ERROR",
          statusCode,
          apiLog,
          cause: error,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError;
  }

  /* =====================================================
     SHIPMENT DATA HELPERS
  ===================================================== */

  buildRecipientAddress(recipient = {}) {
    const values = [
      recipient.addressLine,
      recipient.address,
      recipient.area,
      recipient.city,
      recipient.district,
      recipient.division,
      recipient.postalCode,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean);

    return [...new Set(values)].join(", ");
  }

  normalizePhone(phone) {
    if (!phone) return "";

    let normalized = String(phone).trim().replace(/[\s\-()]/g, "");

    if (normalized.startsWith("+88")) normalized = normalized.slice(3);
    else if (normalized.startsWith("88") && normalized.length === 13) {
      normalized = normalized.slice(2);
    }

    return normalized;
  }

  getInvoice(shipment) {
    return String(
      shipment?.orderNumber || shipment?.invoice || shipment?.shipmentNumber || shipment?._id || ""
    ).trim();
  }

  getCodAmount(shipment) {
    const amount =
      shipment?.pricing?.codAmount ??
      shipment?.codAmount ??
      shipment?.pricing?.collectionAmount ??
      shipment?.collectionAmount ??
      0;

    return toNonNegativeNumber(amount);
  }

  getTrackingUrl(trackingNumber) {
    return trackingNumber
      ? `https://steadfast.com.bd/t/${encodeURIComponent(trackingNumber)}`
      : null;
  }

  /* =====================================================
     REQUIRED FACTORY INTERFACE
  ===================================================== */

  async validateShipment(shipment, courier) {
    if (!shipment) {
      throw this.createServiceError("Shipment is required", {
        code: "SHIPMENT_REQUIRED",
        statusCode: 400,
      });
    }

    this.getCredentials(courier);

    const invoice = this.getInvoice(shipment);
    const recipient = shipment.recipient || {};
    const recipientName = String(recipient.name || "").trim();
    const recipientPhone = this.normalizePhone(recipient.phone);
    const recipientAddress = this.buildRecipientAddress(recipient);
    const codAmount = this.getCodAmount(shipment);
    const errors = [];

    if (!invoice) errors.push("Invoice or order number is required");
    if (invoice.length > 100) errors.push("Invoice cannot exceed 100 characters");
    if (!recipientName) errors.push("Recipient name is required");
    if (recipientName.length > 100) errors.push("Recipient name cannot exceed 100 characters");

    if (!recipientPhone) errors.push("Recipient phone is required");
    else if (!/^01[3-9]\d{8}$/.test(recipientPhone)) {
      errors.push("Recipient phone must be a valid 11-digit Bangladesh mobile number");
    }

    if (!recipientAddress) errors.push("Recipient address is required");
    if (recipientAddress.length > 250) {
      errors.push("Recipient address cannot exceed 250 characters");
    }

    if (!Number.isFinite(codAmount) || codAmount < 0) {
      errors.push("COD amount must be zero or greater");
    }

    if (errors.length) {
      throw this.createServiceError(errors.join(", "), {
        name: "SteadfastValidationError",
        code: "STEADFAST_SHIPMENT_VALIDATION_FAILED",
        statusCode: 400,
        validationErrors: errors,
      });
    }

    return {
      success: true,
      provider: PROVIDER_CODE,
      normalized: { invoice, recipientName, recipientPhone, recipientAddress, codAmount },
    };
  }

  async buildCreatePayload(shipment, courier) {
    const validation = await this.validateShipment(shipment, courier);
    const recipient = shipment.recipient || {};
    const totalLot = Math.max(
      1,
      Math.floor(toNonNegativeNumber(shipment.totalLot ?? shipment.packageCount ?? 1, 1))
    );

    return {
      invoice: validation.normalized.invoice,
      recipient_name: validation.normalized.recipientName,
      recipient_phone: validation.normalized.recipientPhone,
      recipient_address: validation.normalized.recipientAddress,
      cod_amount: validation.normalized.codAmount,
      alternative_phone:
        this.normalizePhone(recipient.alternatePhone || recipient.alternativePhone) || undefined,
      recipient_email: recipient.email || undefined,
      note: shipment.specialInstructions || recipient.deliveryInstructions || undefined,
      item_description: shipment.itemDescription || undefined,
      total_lot: totalLot,
      delivery_type: shipment.deliveryType === "point" ? 1 : 0,
    };
  }

  async createShipment(shipment, courier) {
    const payload = await this.buildCreatePayload(shipment, courier);
    const { data, apiLog } = await this.request({
      courier,
      endpoint: "/create_order",
      method: "POST",
      body: payload,
    });

    if (data?.status && ![200, "200", "success"].includes(data.status)) {
      throw this.createServiceError(
        this.extractErrorMessage(data, "Steadfast rejected the shipment"),
        {
          code: "STEADFAST_SHIPMENT_REJECTED",
          statusCode: 422,
          apiResponse: data,
          apiLog,
        }
      );
    }

    const consignment = data?.consignment || data?.data || {};
    const consignmentId = consignment.consignment_id ?? consignment.id ?? data?.consignment_id;
    const trackingCode = consignment.tracking_code ?? data?.tracking_code;
    const providerStatus = consignment.status || data?.delivery_status || "pending";

    if (!consignmentId && !trackingCode) {
      throw this.createServiceError("Steadfast returned an invalid booking response", {
        code: "STEADFAST_INVALID_BOOKING_RESPONSE",
        statusCode: 502,
        apiResponse: data,
        apiLog,
      });
    }

    return {
      success: true,
      provider: PROVIDER_CODE,
      shipment: {
        bookingStatus: "booked",
        deliveryStatus: this.mapDeliveryStatus(providerStatus),
        bookingId: consignmentId ? String(consignmentId) : null,
        consignmentId: consignmentId ? String(consignmentId) : null,
        trackingNumber: trackingCode ? String(trackingCode) : null,
        courierReference: trackingCode
          ? String(trackingCode)
          : consignmentId
            ? String(consignmentId)
            : null,
        courierStatus: String(providerStatus),
        statusMessage: data?.message || "Shipment booked with Steadfast",
        bookedAt: new Date(),
        trackingUrl: this.getTrackingUrl(trackingCode),
      },
      raw: data,
      apiLog,
    };
  }

  async trackShipment(shipment, courier) {
    if (!shipment) {
      throw this.createServiceError("Shipment is required", {
        code: "SHIPMENT_REQUIRED",
        statusCode: 400,
      });
    }

    let endpoint;

    if (shipment.consignmentId) {
      endpoint = `/status_by_cid/${encodeURIComponent(shipment.consignmentId)}`;
    } else if (shipment.trackingNumber) {
      endpoint = `/status_by_trackingcode/${encodeURIComponent(shipment.trackingNumber)}`;
    } else {
      const invoice = this.getInvoice(shipment);
      if (!invoice) {
        throw this.createServiceError(
          "Consignment ID, tracking number, or invoice is required",
          { code: "STEADFAST_TRACKING_IDENTIFIER_REQUIRED", statusCode: 400 }
        );
      }
      endpoint = `/status_by_invoice/${encodeURIComponent(invoice)}`;
    }

    const { data, apiLog } = await this.request({ courier, endpoint, method: "GET" });
    const responseData = data?.data || data;
    const providerStatus =
      responseData?.delivery_status || responseData?.status || data?.delivery_status || "unknown";
    const consignmentId = shipment.consignmentId || responseData?.consignment_id || null;
    const trackingNumber = shipment.trackingNumber || responseData?.tracking_code || null;

    return {
      success: true,
      provider: PROVIDER_CODE,
      tracking: {
        consignmentId: consignmentId ? String(consignmentId) : null,
        trackingNumber: trackingNumber ? String(trackingNumber) : null,
        courierStatus: String(providerStatus),
        deliveryStatus: this.mapDeliveryStatus(providerStatus),
        statusMessage: data?.message || `Steadfast status: ${providerStatus}`,
        trackingUrl: this.getTrackingUrl(trackingNumber),
        checkedAt: new Date(),
      },
      raw: data,
      apiLog,
    };
  }

  async syncShipment(shipment, courier) {
    const result = await this.trackShipment(shipment, courier);

    return {
      success: true,
      provider: PROVIDER_CODE,
      shipment: {
        deliveryStatus: result.tracking.deliveryStatus,
        courierStatus: result.tracking.courierStatus,
        statusMessage: result.tracking.statusMessage,
        lastSyncedAt: new Date(),
        trackingNumber: result.tracking.trackingNumber,
        consignmentId: result.tracking.consignmentId,
        trackingUrl: result.tracking.trackingUrl,
      },
      raw: result.raw,
      apiLog: result.apiLog,
    };
  }

  async cancelShipment(shipment, courier, options = {}) {
    if (!shipment) {
      throw this.createServiceError("Shipment is required", {
        code: "SHIPMENT_REQUIRED",
        statusCode: 400,
      });
    }

    this.getCredentials(courier);

    return {
      success: true,
      provider: PROVIDER_CODE,
      remoteCancellation: false,
      shipment: {
        bookingStatus: "cancelled",
        deliveryStatus: "cancelled",
        courierStatus: "local_cancelled",
        statusMessage:
          options.reason ||
          "Shipment marked as cancelled locally. Cancel it from the Steadfast merchant panel if it was already booked.",
        cancelledAt: new Date(),
      },
    };
  }

  async calculateCharge(shipment) {
    if (!shipment) {
      throw this.createServiceError("Shipment is required", {
        code: "SHIPMENT_REQUIRED",
        statusCode: 400,
      });
    }

    return {
      success: true,
      provider: PROVIDER_CODE,
      charge: {
        shippingCharge: toNonNegativeNumber(shipment?.pricing?.shippingCharge),
        courierCharge: toNonNegativeNumber(shipment?.pricing?.courierCharge),
        codAmount: this.getCodAmount(shipment),
        currency: String(shipment?.pricing?.currency || "BDT").toUpperCase(),
        calculatedBy: "stored_pricing",
      },
    };
  }

  /* =====================================================
     OPTIONAL PROVIDER METHODS
  ===================================================== */

  async getBalance(courier) {
    const { data, apiLog } = await this.request({
      courier,
      endpoint: "/get_balance",
      method: "GET",
    });

    const balance = toNonNegativeNumber(
      data?.current_balance ?? data?.balance ?? data?.data?.current_balance
    );

    return {
      success: true,
      provider: PROVIDER_CODE,
      balance,
      currency: "BDT",
      raw: data,
      apiLog,
    };
  }

  async health(courier) {
    try {
      const balanceResult = await this.getBalance(courier);
      return {
        success: true,
        provider: PROVIDER_CODE,
        status: "healthy",
        balance: balanceResult.balance,
        circuitState: this.circuit.state,
        timestamp: new Date(),
        apiLog: balanceResult.apiLog,
      };
    } catch (error) {
      return {
        success: false,
        provider: PROVIDER_CODE,
        status: "unhealthy",
        message: error.message,
        code: error.code || null,
        circuitState: this.circuit.state,
        timestamp: new Date(),
        apiLog: error.apiLog || null,
      };
    }
  }

  mapDeliveryStatus(status) {
    const normalizedStatus = String(status || "unknown")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return STATUS_MAP[normalizedStatus] || "unknown";
  }
}

module.exports = new SteadfastCourierService();
