"use strict";

const crypto = require("crypto");

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_RETENTION_DAYS = 365;
const DEFAULT_MAX_METADATA_BYTES = 32 * 1024;
const DEFAULT_MAX_PAYLOAD_BYTES = 128 * 1024;

const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "secret",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "apiKey",
  "api_key",
  "clientSecret",
  "client_secret",
  "merchantKey",
  "merchant_key",
  "cookie",
  "set-cookie",
]);

const ALLOWED_LEVELS = new Set([
  "info",
  "warning",
  "error",
  "critical",
]);

const ALLOWED_SOURCES = new Set([
  "api",
  "webhook",
  "scheduler",
  "retry_queue",
  "bulk_operation",
  "system",
  "manual",
]);

const normalizeString = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const createNoopLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

const safeJsonSize = (value) => {
  try {
    return Buffer.byteLength(
      JSON.stringify(value),
      "utf8"
    );
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

const truncateString = (value, maxLength = 1000) => {
  const normalized = normalizeString(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
};

const redactSensitiveData = (
  value,
  {
    depth = 0,
    maxDepth = 8,
    seen = new WeakSet(),
  } = {}
) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value === "string"
      ? truncateString(value, 5000)
      : value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (depth >= maxDepth) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR_REFERENCE]";
    }

    seen.add(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) =>
      redactSensitiveData(item, {
        depth: depth + 1,
        maxDepth,
        seen,
      })
    );
  }

  const output = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = "[REDACTED]";
      continue;
    }

    output[key] = redactSensitiveData(nestedValue, {
      depth: depth + 1,
      maxDepth,
      seen,
    });
  }

  return output;
};

class CourierAuditService {
  constructor(options = {}) {
    this.auditModel = options.auditModel || null;
    this.logger = options.logger || createNoopLogger();

    this.batchSize = toPositiveInteger(
      options.batchSize ??
        process.env.COURIER_AUDIT_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.retentionDays = toPositiveInteger(
      options.retentionDays ??
        process.env.COURIER_AUDIT_RETENTION_DAYS,
      DEFAULT_RETENTION_DAYS
    );

    this.maxMetadataBytes = toPositiveInteger(
      options.maxMetadataBytes ??
        process.env.COURIER_AUDIT_MAX_METADATA_BYTES,
      DEFAULT_MAX_METADATA_BYTES
    );

    this.maxPayloadBytes = toPositiveInteger(
      options.maxPayloadBytes ??
        process.env.COURIER_AUDIT_MAX_PAYLOAD_BYTES,
      DEFAULT_MAX_PAYLOAD_BYTES
    );
  }

  setDependencies({
    auditModel,
    logger,
  } = {}) {
    if (auditModel) {
      this.auditModel = auditModel;
    }

    if (logger) {
      this.logger = logger;
    }

    return this;
  }

  validateDependencies() {
    if (!this.auditModel) {
      throw new Error(
        "CourierAuditService requires auditModel"
      );
    }
  }

  normalizeLevel(level) {
    const normalized =
      normalizeString(level).toLowerCase();

    return ALLOWED_LEVELS.has(normalized)
      ? normalized
      : "info";
  }

  normalizeSource(source) {
    const normalized =
      normalizeString(source)
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    return ALLOWED_SOURCES.has(normalized)
      ? normalized
      : "system";
  }

  sanitizeBoundedObject(
    value,
    maxBytes,
    fallback = null
  ) {
    if (value === undefined || value === null) {
      return fallback;
    }

    const sanitized = redactSensitiveData(value);

    if (safeJsonSize(sanitized) <= maxBytes) {
      return sanitized;
    }

    return {
      truncated: true,
      reason: "payload_size_limit_exceeded",
      originalSizeBytes: safeJsonSize(sanitized),
      preview:
        typeof sanitized === "string"
          ? truncateString(sanitized, 2000)
          : "[OBJECT_TRUNCATED]",
    };
  }

  serializeError(error) {
    if (!error) {
      return null;
    }

    return {
      name:
        normalizeString(error.name) || "Error",

      message:
        truncateString(
          error.message ||
            "Unknown courier error",
          4000
        ),

      code:
        normalizeString(error.code) || null,

      statusCode:
        Number.isInteger(error.statusCode)
          ? error.statusCode
          : null,

      provider:
        normalizeString(error.provider) || null,

      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : truncateString(error.stack, 12000),

      details: this.sanitizeBoundedObject(
        error.details,
        this.maxMetadataBytes,
        null
      ),
    };
  }

  buildDocument(event = {}) {
    const eventType =
      normalizeString(event.eventType)
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    if (!eventType) {
      throw new Error(
        "Courier audit eventType is required"
      );
    }

    const occurredAt =
      event.occurredAt instanceof Date
        ? event.occurredAt
        : new Date();

    const document = {
      auditId:
        normalizeString(event.auditId) ||
        crypto.randomUUID(),

      eventType,

      level: this.normalizeLevel(event.level),

      source: this.normalizeSource(event.source),

      tenantId: event.tenantId || null,
      userId: event.userId || null,
      actorId: event.actorId || event.userId || null,

      actorType:
        normalizeString(event.actorType) || "system",

      shipmentId: event.shipmentId || null,

      orderId:
        event.orderId || null,

      courierCode:
        normalizeString(event.courierCode)
          .toLowerCase() || null,

      operation:
        normalizeString(event.operation)
          .toLowerCase()
          .replace(/[\s-]+/g, "_") || null,

      status:
        normalizeString(event.status)
          .toLowerCase()
          .replace(/[\s-]+/g, "_") || null,

      success:
        typeof event.success === "boolean"
          ? event.success
          : null,

      message:
        truncateString(event.message, 4000) || null,

      correlationId:
        normalizeString(event.correlationId) || null,

      requestId:
        normalizeString(event.requestId) || null,

      webhookId:
        normalizeString(event.webhookId) || null,

      retryJobId:
        event.retryJobId || null,

      bulkOperationId:
        event.bulkOperationId || null,

      ipAddress:
        normalizeString(event.ipAddress) || null,

      userAgent:
        truncateString(event.userAgent, 1000) || null,

      before: this.sanitizeBoundedObject(
        event.before,
        this.maxPayloadBytes,
        null
      ),

      after: this.sanitizeBoundedObject(
        event.after,
        this.maxPayloadBytes,
        null
      ),

      request: this.sanitizeBoundedObject(
        event.request,
        this.maxPayloadBytes,
        null
      ),

      response: this.sanitizeBoundedObject(
        event.response,
        this.maxPayloadBytes,
        null
      ),

      metadata: this.sanitizeBoundedObject(
        event.metadata,
        this.maxMetadataBytes,
        null
      ),

      error: this.serializeError(event.error),

      occurredAt,
      createdAt: new Date(),
    };

    return Object.fromEntries(
      Object.entries(document).filter(
        ([, value]) => value !== undefined
      )
    );
  }

  async record(event) {
    this.validateDependencies();

    const document = this.buildDocument(event);

    try {
      const created =
        await this.auditModel.create(document);

      return {
        success: true,
        auditId:
          created?.auditId ||
          document.auditId,
        record: created,
      };
    } catch (error) {
      this.logger.error(
        "Failed to persist courier audit event",
        {
          eventType: document.eventType,
          shipmentId:
            document.shipmentId
              ? String(document.shipmentId)
              : null,
          courierCode: document.courierCode,
          error: error.message,
        }
      );

      throw error;
    }
  }

  async recordMany(events = []) {
    this.validateDependencies();

    if (!Array.isArray(events)) {
      throw new Error(
        "Courier audit events must be an array"
      );
    }

    if (events.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        failedCount: 0,
      };
    }

    let insertedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (
      let offset = 0;
      offset < events.length;
      offset += this.batchSize
    ) {
      const batch = events
        .slice(offset, offset + this.batchSize)
        .map((event) => this.buildDocument(event));

      try {
        const result =
          await this.auditModel.insertMany(
            batch,
            {
              ordered: false,
            }
          );

        insertedCount += result.length;
      } catch (error) {
        const inserted =
          Array.isArray(error.insertedDocs)
            ? error.insertedDocs.length
            : 0;

        insertedCount += inserted;

        const writeErrors =
          Array.isArray(error.writeErrors)
            ? error.writeErrors.length
            : batch.length - inserted;

        failedCount += Math.max(writeErrors, 0);

        errors.push({
          offset,
          message: error.message,
          code: error.code || null,
        });

        this.logger.error(
          "Courier audit batch insert partially failed",
          {
            offset,
            batchSize: batch.length,
            inserted,
            failed: writeErrors,
            error: error.message,
          }
        );
      }
    }

    return {
      success: failedCount === 0,
      insertedCount,
      failedCount,
      errors,
    };
  }

  async recordShipmentCreated({
    shipment,
    tenantId,
    userId,
    courierCode,
    correlationId,
    source = "api",
    request,
    response,
    metadata,
  }) {
    return this.record({
      eventType: "shipment_created",
      operation: "create_shipment",
      source,
      tenantId,
      userId,
      shipmentId: shipment?._id,
      orderId: shipment?.orderId,
      courierCode,
      correlationId,
      success: true,
      status:
        shipment?.deliveryStatus ||
        shipment?.bookingStatus ||
        "created",
      message: "Courier shipment created",
      after: shipment,
      request,
      response,
      metadata,
    });
  }

  async recordShipmentStatusChanged({
    before,
    after,
    tenantId,
    userId,
    courierCode,
    correlationId,
    source = "system",
    metadata,
  }) {
    return this.record({
      eventType: "shipment_status_changed",
      operation: "sync_shipment",
      source,
      tenantId,
      userId,
      shipmentId: after?._id || before?._id,
      orderId: after?.orderId || before?.orderId,
      courierCode:
        courierCode ||
        after?.courierCode ||
        before?.courierCode,
      correlationId,
      success: true,
      status:
        after?.deliveryStatus ||
        after?.bookingStatus ||
        null,
      message: "Courier shipment status changed",
      before,
      after,
      metadata,
    });
  }

  async recordShipmentCancelled({
    shipment,
    tenantId,
    userId,
    courierCode,
    correlationId,
    source = "api",
    request,
    response,
    metadata,
  }) {
    return this.record({
      eventType: "shipment_cancelled",
      operation: "cancel_shipment",
      source,
      tenantId,
      userId,
      shipmentId: shipment?._id,
      orderId: shipment?.orderId,
      courierCode,
      correlationId,
      success: true,
      status: "cancelled",
      message: "Courier shipment cancelled",
      after: shipment,
      request,
      response,
      metadata,
    });
  }

  async recordWebhookReceived({
    tenantId,
    shipmentId,
    courierCode,
    webhookId,
    correlationId,
    payload,
    success = true,
    error = null,
    metadata,
  }) {
    return this.record({
      eventType: "webhook_received",
      operation: "webhook",
      source: "webhook",
      tenantId,
      shipmentId,
      courierCode,
      webhookId,
      correlationId,
      success,
      level: success ? "info" : "error",
      message: success
        ? "Courier webhook received"
        : "Courier webhook processing failed",
      request: payload,
      error,
      metadata,
    });
  }

  async recordRetry({
    tenantId,
    shipmentId,
    courierCode,
    retryJobId,
    operation,
    correlationId,
    status,
    success,
    error,
    metadata,
  }) {
    return this.record({
      eventType: "courier_retry",
      operation,
      source: "retry_queue",
      tenantId,
      shipmentId,
      courierCode,
      retryJobId,
      correlationId,
      status,
      success,
      level: success ? "info" : "warning",
      message: success
        ? "Courier retry completed"
        : "Courier retry failed or rescheduled",
      error,
      metadata,
    });
  }

  async recordApiError({
    tenantId,
    userId,
    shipmentId,
    courierCode,
    operation,
    correlationId,
    request,
    response,
    error,
    source = "api",
    metadata,
  }) {
    return this.record({
      eventType: "courier_api_error",
      operation,
      source,
      tenantId,
      userId,
      shipmentId,
      courierCode,
      correlationId,
      success: false,
      level: "error",
      message:
        error?.message ||
        "Courier API operation failed",
      request,
      response,
      error,
      metadata,
    });
  }

  async find({
    tenantId,
    shipmentId,
    orderId,
    courierCode,
    eventType,
    operation,
    level,
    source,
    success,
    from,
    to,
    page = 1,
    limit = 50,
    sort = { occurredAt: -1, _id: -1 },
  } = {}) {
    this.validateDependencies();

    const safePage = toPositiveInteger(page, 1);
    const safeLimit = Math.min(
      toPositiveInteger(limit, 50),
      250
    );

    const query = {};

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (shipmentId) {
      query.shipmentId = shipmentId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    if (courierCode) {
      query.courierCode =
        normalizeString(courierCode).toLowerCase();
    }

    if (eventType) {
      query.eventType =
        normalizeString(eventType)
          .toLowerCase()
          .replace(/[\s-]+/g, "_");
    }

    if (operation) {
      query.operation =
        normalizeString(operation)
          .toLowerCase()
          .replace(/[\s-]+/g, "_");
    }

    if (level) {
      query.level = this.normalizeLevel(level);
    }

    if (source) {
      query.source = this.normalizeSource(source);
    }

    if (typeof success === "boolean") {
      query.success = success;
    }

    if (from || to) {
      query.occurredAt = {};

      if (from) {
        query.occurredAt.$gte =
          from instanceof Date
            ? from
            : new Date(from);
      }

      if (to) {
        query.occurredAt.$lte =
          to instanceof Date
            ? to
            : new Date(to);
      }
    }

    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.auditModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      this.auditModel.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getShipmentTimeline(
    shipmentId,
    {
      tenantId,
      limit = 250,
    } = {}
  ) {
    if (!shipmentId) {
      throw new Error(
        "shipmentId is required"
      );
    }

    return this.find({
      tenantId,
      shipmentId,
      page: 1,
      limit,
      sort: {
        occurredAt: 1,
        _id: 1,
      },
    });
  }

  async cleanupExpired() {
    this.validateDependencies();

    const cutoff = new Date(
      Date.now() -
        this.retentionDays *
          24 *
          60 *
          60 *
          1000
    );

    if (
      typeof this.auditModel.deleteExpiredBefore !==
      "function"
    ) {
      throw new Error(
        "CourierAuditService requires auditModel.deleteExpiredBefore"
      );
    }

    const result =
      await this.auditModel.deleteExpiredBefore(
        cutoff
      );

    return {
      success: true,
      cutoff,
      deletedCount:
        result.deletedCount || 0,
    };
  }

  async health() {
    const startedAt = Date.now();

    try {
      this.validateDependencies();

      if (
        this.auditModel.db &&
        typeof this.auditModel.db.readyState === "number" &&
        this.auditModel.db.readyState !== 1
      ) {
        throw new Error(
          "Audit database connection is not ready"
        );
      }

      return {
        success: true,
        status: "healthy",
        service: "courier_audit",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        status: "unhealthy",
        service: "courier_audit",
        message: error.message,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date(),
      };
    }
  }
}

module.exports = CourierAuditService;
