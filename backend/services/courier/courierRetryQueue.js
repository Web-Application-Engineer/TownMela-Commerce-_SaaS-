"use strict";

const crypto = require("crypto");

const DEFAULT_POLL_INTERVAL_MS = 30 * 1000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 60 * 1000;
const DEFAULT_MAX_DELAY_MS = 60 * 60 * 1000;
const DEFAULT_LOCK_TTL_MS = 25 * 1000;
const DEFAULT_RETENTION_DAYS = 30;

const RETRYABLE_HTTP_STATUS_CODES = new Set([
  408,
  409,
  425,
  429,
  500,
  502,
  503,
  504,
]);

const NON_RETRYABLE_ERROR_CODES = new Set([
  "SHIPMENT_VALIDATION_FAILED",
  "SHIPMENT_REQUIRED",
  "COURIER_NOT_SUPPORTED",
  "COURIER_PROVIDER_NOT_FOUND",
  "PAPERFLY_CONFIGURATION_MISSING",
  "PATHAO_CONFIGURATION_MISSING",
  "REDX_CONFIGURATION_MISSING",
  "STEADFAST_CONFIGURATION_MISSING",
  "INVALID_COURIER_PROVIDER",
  "AUTHENTICATION_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
]);

const SUPPORTED_OPERATIONS = new Set([
  "create_shipment",
  "sync_shipment",
  "track_shipment",
  "cancel_shipment",
  "calculate_charge",
]);

const normalizeString = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const normalizeOperation = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const toNonNegativeInteger = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(
    String(value).trim().toLowerCase()
  );
};

const createNoopLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

class CourierRetryQueue {
  constructor(options = {}) {
    this.queueModel = options.queueModel || null;
    this.shipmentModel = options.shipmentModel || null;
    this.courierFactory = options.courierFactory || null;
    this.logger = options.logger || createNoopLogger();
    this.lockCollection = options.lockCollection || null;

    this.instanceId =
      normalizeString(options.instanceId) ||
      `${process.pid}-${crypto.randomUUID()}`;

    this.pollIntervalMs = toPositiveInteger(
      options.pollIntervalMs ??
        process.env.COURIER_RETRY_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS
    );

    this.batchSize = toPositiveInteger(
      options.batchSize ??
        process.env.COURIER_RETRY_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.concurrency = toPositiveInteger(
      options.concurrency ??
        process.env.COURIER_RETRY_CONCURRENCY,
      DEFAULT_CONCURRENCY
    );

    this.maxRetries = toNonNegativeInteger(
      options.maxRetries ??
        process.env.COURIER_RETRY_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    );

    this.baseDelayMs = toPositiveInteger(
      options.baseDelayMs ??
        process.env.COURIER_RETRY_BASE_DELAY_MS,
      DEFAULT_BASE_DELAY_MS
    );

    this.maxDelayMs = toPositiveInteger(
      options.maxDelayMs ??
        process.env.COURIER_RETRY_MAX_DELAY_MS,
      DEFAULT_MAX_DELAY_MS
    );

    this.lockTtlMs = toPositiveInteger(
      options.lockTtlMs ??
        process.env.COURIER_RETRY_LOCK_TTL_MS,
      DEFAULT_LOCK_TTL_MS
    );

    this.retentionDays = toPositiveInteger(
      options.retentionDays ??
        process.env.COURIER_RETRY_RETENTION_DAYS,
      DEFAULT_RETENTION_DAYS
    );

    this.enabled = toBoolean(
      options.enabled ??
        process.env.COURIER_RETRY_ENABLED,
      true
    );

    this.runImmediately = toBoolean(
      options.runImmediately ??
        process.env.COURIER_RETRY_RUN_IMMEDIATELY,
      true
    );

    this.timer = null;
    this.running = false;
    this.stopping = false;
    this.activeRunPromise = null;
    this.lockKey = "courier-retry-queue";
  }

  setDependencies({
    queueModel,
    shipmentModel,
    courierFactory,
    logger,
    lockCollection,
  } = {}) {
    if (queueModel) {
      this.queueModel = queueModel;
    }

    if (shipmentModel) {
      this.shipmentModel = shipmentModel;
    }

    if (courierFactory) {
      this.courierFactory = courierFactory;
    }

    if (logger) {
      this.logger = logger;
    }

    if (lockCollection) {
      this.lockCollection = lockCollection;
    }

    return this;
  }

  validateDependencies() {
    if (!this.queueModel) {
      throw new Error(
        "CourierRetryQueue requires queueModel"
      );
    }

    if (!this.shipmentModel) {
      throw new Error(
        "CourierRetryQueue requires shipmentModel"
      );
    }

    if (!this.courierFactory) {
      throw new Error(
        "CourierRetryQueue requires courierFactory"
      );
    }
  }

  start() {
    if (!this.enabled) {
      this.logger.info(
        "Courier retry queue is disabled"
      );

      return false;
    }

    this.validateDependencies();

    if (this.timer) {
      return false;
    }

    this.stopping = false;

    this.timer = setInterval(() => {
      this.runOnce().catch((error) => {
        this.logger.error(
          "Courier retry queue execution failed",
          {
            error: error.message,
            stack: error.stack,
          }
        );
      });
    }, this.pollIntervalMs);

    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }

    this.logger.info(
      "Courier retry queue started",
      {
        instanceId: this.instanceId,
        pollIntervalMs: this.pollIntervalMs,
        batchSize: this.batchSize,
        concurrency: this.concurrency,
      }
    );

    if (this.runImmediately) {
      this.runOnce().catch((error) => {
        this.logger.error(
          "Initial courier retry run failed",
          {
            error: error.message,
            stack: error.stack,
          }
        );
      });
    }

    return true;
  }

  async stop({
    waitForActiveRun = true,
  } = {}) {
    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (
      waitForActiveRun &&
      this.activeRunPromise
    ) {
      await this.activeRunPromise.catch(() => {});
    }

    this.logger.info(
      "Courier retry queue stopped",
      {
        instanceId: this.instanceId,
      }
    );

    return true;
  }

  async enqueue({
    tenantId,
    shipmentId,
    courierCode,
    operation,
    payload = null,
    error = null,
    idempotencyKey = null,
    availableAt = null,
    metadata = null,
  }) {
    this.validateDependencies();

    const normalizedOperation =
      normalizeOperation(operation);

    if (!SUPPORTED_OPERATIONS.has(normalizedOperation)) {
      throw new Error(
        `Unsupported courier retry operation: ${normalizedOperation}`
      );
    }

    if (!shipmentId) {
      throw new Error(
        "shipmentId is required to enqueue a courier retry"
      );
    }

    const normalizedCourierCode =
      normalizeString(courierCode).toLowerCase();

    if (!normalizedCourierCode) {
      throw new Error(
        "courierCode is required to enqueue a courier retry"
      );
    }

    if (!this.isRetryableError(error)) {
      return {
        enqueued: false,
        reason: "non_retryable_error",
      };
    }

    const deduplicationKey =
      normalizeString(idempotencyKey) ||
      this.buildDeduplicationKey({
        tenantId,
        shipmentId,
        courierCode: normalizedCourierCode,
        operation: normalizedOperation,
      });

    const now = new Date();
    const nextAvailableAt =
      availableAt instanceof Date
        ? availableAt
        : new Date(
            Date.now() + this.calculateRetryDelay(0)
          );

    const update = {
      $setOnInsert: {
        tenantId: tenantId || null,
        shipmentId,
        courierCode: normalizedCourierCode,
        operation: normalizedOperation,
        payload,
        metadata,
        deduplicationKey,
        status: "pending",
        retryCount: 0,
        maxRetries: this.maxRetries,
        createdAt: now,
      },
      $set: {
        availableAt: nextAvailableAt,
        updatedAt: now,
        lastError: this.serializeError(error),
      },
    };

    const result =
      await this.queueModel.findOneAndUpdate(
        {
          deduplicationKey,
          status: {
            $in: ["pending", "processing"],
          },
        },
        update,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

    return {
      enqueued: true,
      duplicate: Boolean(
        result?.createdAt &&
        new Date(result.createdAt).getTime() !==
          now.getTime()
      ),
      job: result,
    };
  }

  buildDeduplicationKey({
    tenantId,
    shipmentId,
    courierCode,
    operation,
  }) {
    return [
      normalizeString(tenantId) || "global",
      normalizeString(shipmentId),
      normalizeString(courierCode).toLowerCase(),
      normalizeOperation(operation),
    ].join(":");
  }

  isRetryableError(error) {
    if (!error) {
      return true;
    }

    const code = normalizeString(error.code).toUpperCase();

    if (NON_RETRYABLE_ERROR_CODES.has(code)) {
      return false;
    }

    const statusCode = Number(error.statusCode);

    if (Number.isInteger(statusCode)) {
      if (statusCode >= 400 && statusCode < 500) {
        return RETRYABLE_HTTP_STATUS_CODES.has(statusCode);
      }

      if (statusCode >= 500) {
        return true;
      }
    }

    if (
      error.name === "AbortError" ||
      code.includes("TIMEOUT") ||
      code.includes("NETWORK") ||
      code.includes("ECONNRESET") ||
      code.includes("ETIMEDOUT")
    ) {
      return true;
    }

    return true;
  }

  serializeError(error) {
    if (!error) {
      return null;
    }

    return {
      name: normalizeString(error.name) || "Error",
      message:
        normalizeString(error.message) ||
        "Unknown courier error",
      code: normalizeString(error.code) || null,
      statusCode: Number.isInteger(error.statusCode)
        ? error.statusCode
        : null,
      occurredAt: new Date(),
    };
  }

  calculateRetryDelay(retryCount) {
    const exponent = Math.min(
      Math.max(retryCount, 0),
      8
    );

    const exponentialDelay = Math.min(
      this.baseDelayMs * 2 ** exponent,
      this.maxDelayMs
    );

    const jitter = Math.floor(
      Math.random() * Math.min(15000, this.baseDelayMs)
    );

    return Math.min(
      exponentialDelay + jitter,
      this.maxDelayMs
    );
  }

  async runOnce() {
    if (!this.enabled || this.stopping) {
      return {
        skipped: true,
        reason: "queue_disabled_or_stopping",
      };
    }

    if (this.running) {
      return {
        skipped: true,
        reason: "local_run_in_progress",
      };
    }

    this.running = true;
    this.activeRunPromise = this.executeRun();

    try {
      return await this.activeRunPromise;
    } finally {
      this.running = false;
      this.activeRunPromise = null;
    }
  }

  async executeRun() {
    this.validateDependencies();

    const runId = crypto.randomUUID();
    const startedAt = Date.now();

    const lockAcquired =
      await this.acquireDistributedLock(runId);

    if (!lockAcquired) {
      return {
        skipped: true,
        reason: "distributed_lock_unavailable",
        runId,
      };
    }

    const summary = {
      runId,
      scanned: 0,
      succeeded: 0,
      retried: 0,
      deadLettered: 0,
      failed: 0,
      startedAt: new Date(startedAt),
      finishedAt: null,
      durationMs: 0,
    };

    try {
      const jobs = await this.claimDueJobs(runId);

      summary.scanned = jobs.length;

      const results =
        await this.processWithConcurrency(
          jobs,
          this.concurrency,
          (job) => this.processJob(job, runId)
        );

      for (const result of results) {
        if (result.status === "succeeded") {
          summary.succeeded += 1;
        } else if (result.status === "retried") {
          summary.retried += 1;
        } else if (result.status === "dead_lettered") {
          summary.deadLettered += 1;
        } else {
          summary.failed += 1;
        }
      }

      await this.cleanupCompletedJobs();

      return summary;
    } finally {
      summary.finishedAt = new Date();
      summary.durationMs = Date.now() - startedAt;

      await this.releaseDistributedLock(runId);

      this.logger.info(
        "Courier retry queue run completed",
        summary
      );
    }
  }

  async claimDueJobs(runId) {
    const now = new Date();

    const candidates = await this.queueModel
      .find({
        status: "pending",
        availableAt: { $lte: now },
        retryCount: { $lt: this.maxRetries },
      })
      .sort({
        availableAt: 1,
        createdAt: 1,
        _id: 1,
      })
      .limit(this.batchSize)
      .lean();

    const claimed = [];

    for (const candidate of candidates) {
      const result =
        await this.queueModel.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "pending",
            availableAt: { $lte: now },
          },
          {
            $set: {
              status: "processing",
              lockedBy: this.instanceId,
              lockedAt: now,
              runId,
              updatedAt: now,
            },
          },
          {
            new: true,
          }
        );

      if (result) {
        claimed.push(
          typeof result.toObject === "function"
            ? result.toObject()
            : result
        );
      }
    }

    return claimed;
  }

  async processJob(job, runId) {
    try {
      const shipment =
        await this.shipmentModel
          .findById(job.shipmentId)
          .lean();

      if (!shipment) {
        await this.markDeadLetter(
          job,
          new Error("Shipment not found"),
          runId,
          "shipment_not_found"
        );

        return {
          status: "dead_lettered",
          jobId: job._id,
        };
      }

      const service =
        await this.resolveCourierService(
          job.courierCode
        );

      const result = await this.executeOperation({
        service,
        operation: job.operation,
        shipment,
        payload: job.payload,
      });

      await this.markSucceeded(
        job,
        result,
        runId
      );

      return {
        status: "succeeded",
        jobId: job._id,
      };
    } catch (error) {
      const nextRetryCount =
        toNonNegativeInteger(job.retryCount, 0) + 1;

      if (
        !this.isRetryableError(error) ||
        nextRetryCount >= this.maxRetries
      ) {
        await this.markDeadLetter(
          job,
          error,
          runId,
          !this.isRetryableError(error)
            ? "non_retryable_error"
            : "max_retries_exceeded"
        );

        return {
          status: "dead_lettered",
          jobId: job._id,
        };
      }

      await this.rescheduleJob(
        job,
        error,
        nextRetryCount,
        runId
      );

      return {
        status: "retried",
        jobId: job._id,
      };
    }
  }

  async resolveCourierService(courierCode) {
    if (
      typeof this.courierFactory.getService === "function"
    ) {
      return this.courierFactory.getService(courierCode);
    }

    if (
      typeof this.courierFactory.create === "function"
    ) {
      return this.courierFactory.create(courierCode);
    }

    if (
      typeof this.courierFactory.resolve === "function"
    ) {
      return this.courierFactory.resolve(courierCode);
    }

    if (typeof this.courierFactory === "function") {
      return this.courierFactory(courierCode);
    }

    throw new Error(
      "Unsupported courierFactory interface"
    );
  }

  async executeOperation({
    service,
    operation,
    shipment,
    payload,
  }) {
    switch (normalizeOperation(operation)) {
      case "create_shipment":
        return service.createShipment(
          payload || shipment
        );

      case "sync_shipment":
        return service.syncShipment(shipment);

      case "track_shipment":
        return service.trackShipment(shipment);

      case "cancel_shipment":
        return service.cancelShipment(
          shipment,
          null,
          payload || {}
        );

      case "calculate_charge":
        return service.calculateCharge(
          payload || shipment
        );

      default:
        throw new Error(
          `Unsupported retry operation: ${operation}`
        );
    }
  }

  async markSucceeded(job, result, runId) {
    const now = new Date();

    await this.queueModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          completedAt: now,
          updatedAt: now,
          runId,
          lockedBy: null,
          lockedAt: null,
          lastResult: this.sanitizeResult(result),
        },
      }
    );
  }

  sanitizeResult(result) {
    if (!result || typeof result !== "object") {
      return result;
    }

    return {
      success: result.success !== false,
      provider:
        normalizeString(result.provider) || null,
      skipped: Boolean(result.skipped),
      reason:
        normalizeString(result.reason) || null,
    };
  }

  async rescheduleJob(
    job,
    error,
    retryCount,
    runId
  ) {
    const now = new Date();
    const delayMs =
      this.calculateRetryDelay(retryCount);

    await this.queueModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "pending",
          retryCount,
          availableAt: new Date(
            Date.now() + delayMs
          ),
          updatedAt: now,
          runId,
          lockedBy: null,
          lockedAt: null,
          lastError: this.serializeError(error),
        },
      }
    );

    this.logger.warn(
      "Courier retry job rescheduled",
      {
        jobId: String(job._id),
        shipmentId: String(job.shipmentId),
        courierCode: job.courierCode,
        operation: job.operation,
        retryCount,
        delayMs,
        error: error.message,
      }
    );
  }

  async markDeadLetter(
    job,
    error,
    runId,
    reason
  ) {
    const now = new Date();

    await this.queueModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "dead_letter",
          deadLetteredAt: now,
          updatedAt: now,
          runId,
          lockedBy: null,
          lockedAt: null,
          deadLetterReason: reason,
          lastError: this.serializeError(error),
        },
        $inc: {
          retryCount: 1,
        },
      }
    );

    this.logger.error(
      "Courier retry job moved to dead letter",
      {
        jobId: String(job._id),
        shipmentId: String(job.shipmentId),
        courierCode: job.courierCode,
        operation: job.operation,
        reason,
        error: error.message,
      }
    );
  }

  async retryDeadLetter(jobId) {
    const now = new Date();

    const result =
      await this.queueModel.findOneAndUpdate(
        {
          _id: jobId,
          status: "dead_letter",
        },
        {
          $set: {
            status: "pending",
            retryCount: 0,
            availableAt: now,
            updatedAt: now,
            deadLetterReason: null,
            deadLetteredAt: null,
            lockedBy: null,
            lockedAt: null,
          },
        },
        {
          new: true,
        }
      );

    return result;
  }

  async cleanupCompletedJobs() {
    const cutoff = new Date(
      Date.now() -
        this.retentionDays * 24 * 60 * 60 * 1000
    );

    return this.queueModel.deleteMany({
      status: "completed",
      completedAt: { $lte: cutoff },
    });
  }

  async processWithConcurrency(
    items,
    concurrency,
    worker
  ) {
    const results = new Array(items.length);
    let index = 0;

    const runners = Array.from(
      {
        length: Math.min(
          concurrency,
          items.length
        ),
      },
      async () => {
        while (true) {
          const currentIndex = index++;

          if (currentIndex >= items.length) {
            return;
          }

          results[currentIndex] =
            await worker(items[currentIndex]);
        }
      }
    );

    await Promise.all(runners);

    return results;
  }

  async acquireDistributedLock(runId) {
    if (!this.lockCollection) {
      return true;
    }

    const now = new Date();
    const expiresAt = new Date(
      Date.now() + this.lockTtlMs
    );

    try {
      const result =
        await this.lockCollection.findOneAndUpdate(
          {
            _id: this.lockKey,
            $or: [
              { expiresAt: { $lte: now } },
              { owner: this.instanceId },
            ],
          },
          {
            $set: {
              owner: this.instanceId,
              runId,
              acquiredAt: now,
              expiresAt,
            },
          },
          {
            upsert: true,
            returnDocument: "after",
            returnOriginal: false,
          }
        );

      const document = result?.value || result;

      return (
        document?.owner === this.instanceId &&
        document?.runId === runId
      );
    } catch (error) {
      if (error?.code === 11000) {
        return false;
      }

      throw error;
    }
  }

  async releaseDistributedLock(runId) {
    if (!this.lockCollection) {
      return true;
    }

    try {
      await this.lockCollection.deleteOne({
        _id: this.lockKey,
        owner: this.instanceId,
        runId,
      });

      return true;
    } catch (error) {
      this.logger.warn(
        "Failed to release courier retry distributed lock",
        {
          runId,
          instanceId: this.instanceId,
          error: error.message,
        }
      );

      return false;
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      running: this.running,
      stopping: this.stopping,
      scheduled: Boolean(this.timer),
      instanceId: this.instanceId,
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
      concurrency: this.concurrency,
      maxRetries: this.maxRetries,
      lockEnabled: Boolean(this.lockCollection),
    };
  }
}

module.exports = CourierRetryQueue;
