"use strict";

const crypto = require("crypto");

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_LOCK_TTL_MS = 4 * 60 * 1000;
const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_STALE_AFTER_MS = 2 * 60 * 1000;

const ACTIVE_DELIVERY_STATUSES = Object.freeze([
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "partially_delivered",
]);

const TERMINAL_DELIVERY_STATUSES = new Set([
  "delivered",
  "returned",
  "cancelled",
]);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const normalizeString = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim();

const normalizeStatus = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const createNoopLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

class CourierSyncScheduler {
  constructor(options = {}) {
    this.shipmentModel =
      options.shipmentModel || null;

    this.courierFactory =
      options.courierFactory || null;

    this.logger =
      options.logger || createNoopLogger();

    this.lockCollection =
      options.lockCollection || null;

    this.instanceId =
      normalizeString(options.instanceId) ||
      `${process.pid}-${crypto.randomUUID()}`;

    this.intervalMs = toPositiveInteger(
      options.intervalMs ??
        process.env.COURIER_SYNC_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );

    this.batchSize = toPositiveInteger(
      options.batchSize ??
        process.env.COURIER_SYNC_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    );

    this.concurrency = toPositiveInteger(
      options.concurrency ??
        process.env.COURIER_SYNC_CONCURRENCY,
      DEFAULT_CONCURRENCY
    );

    this.lockTtlMs = toPositiveInteger(
      options.lockTtlMs ??
        process.env.COURIER_SYNC_LOCK_TTL_MS,
      DEFAULT_LOCK_TTL_MS
    );

    this.maxFailures = toNonNegativeInteger(
      options.maxFailures ??
        process.env.COURIER_SYNC_MAX_FAILURES,
      DEFAULT_MAX_FAILURES
    );

    this.staleAfterMs = toNonNegativeInteger(
      options.staleAfterMs ??
        process.env.COURIER_SYNC_STALE_AFTER_MS,
      DEFAULT_STALE_AFTER_MS
    );

    this.enabled = toBoolean(
      options.enabled ??
        process.env.COURIER_SYNC_ENABLED,
      true
    );

    this.runImmediately = toBoolean(
      options.runImmediately ??
        process.env.COURIER_SYNC_RUN_IMMEDIATELY,
      true
    );

    this.timer = null;
    this.running = false;
    this.stopping = false;
    this.activeRunPromise = null;
    this.lockKey = "courier-shipment-sync";
  }

  setDependencies({
    shipmentModel,
    courierFactory,
    logger,
    lockCollection,
  } = {}) {
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
    if (!this.shipmentModel) {
      throw new Error(
        "CourierSyncScheduler requires shipmentModel"
      );
    }

    if (!this.courierFactory) {
      throw new Error(
        "CourierSyncScheduler requires courierFactory"
      );
    }
  }

  start() {
    if (!this.enabled) {
      this.logger.info(
        "Courier sync scheduler is disabled"
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
          "Courier sync scheduler execution failed",
          {
            error: error.message,
            stack: error.stack,
          }
        );
      });
    }, this.intervalMs);

    if (
      typeof this.timer.unref === "function"
    ) {
      this.timer.unref();
    }

    this.logger.info(
      "Courier sync scheduler started",
      {
        instanceId: this.instanceId,
        intervalMs: this.intervalMs,
        batchSize: this.batchSize,
        concurrency: this.concurrency,
      }
    );

    if (this.runImmediately) {
      this.runOnce().catch((error) => {
        this.logger.error(
          "Initial courier sync run failed",
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
      await this.activeRunPromise.catch(
        () => {}
      );
    }

    this.logger.info(
      "Courier sync scheduler stopped",
      {
        instanceId: this.instanceId,
      }
    );

    return true;
  }

  async runOnce() {
    if (!this.enabled || this.stopping) {
      return {
        skipped: true,
        reason: "scheduler_disabled_or_stopping",
      };
    }

    if (this.running) {
      this.logger.warn(
        "Courier sync run skipped because another local run is active",
        {
          instanceId: this.instanceId,
        }
      );

      return {
        skipped: true,
        reason: "local_run_in_progress",
      };
    }

    this.running = true;

    this.activeRunPromise =
      this.executeRun();

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
      await this.acquireDistributedLock(
        runId
      );

    if (!lockAcquired) {
      this.logger.info(
        "Courier sync run skipped because distributed lock is held",
        {
          runId,
          instanceId: this.instanceId,
        }
      );

      return {
        skipped: true,
        reason: "distributed_lock_unavailable",
        runId,
      };
    }

    const summary = {
      runId,
      instanceId: this.instanceId,
      startedAt: new Date(startedAt),
      finishedAt: null,
      durationMs: 0,
      scanned: 0,
      processed: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
      batches: 0,
    };

    this.logger.info(
      "Courier sync run started",
      {
        runId,
        instanceId: this.instanceId,
      }
    );

    try {
      let cursor = null;

      while (!this.stopping) {
        const shipments =
          await this.findNextBatch(cursor);

        if (shipments.length === 0) {
          break;
        }

        summary.batches += 1;
        summary.scanned +=
          shipments.length;

        const results =
          await this.processWithConcurrency(
            shipments,
            this.concurrency,
            (shipment) =>
              this.processShipment(
                shipment,
                runId
              )
          );

        for (const result of results) {
          summary.processed += 1;

          if (result.status === "synced") {
            summary.synced += 1;
          } else if (
            result.status === "skipped"
          ) {
            summary.skipped += 1;
          } else {
            summary.failed += 1;
          }
        }

        cursor =
          shipments[
            shipments.length - 1
          ]?._id || null;

        if (
          shipments.length <
          this.batchSize
        ) {
          break;
        }

        await this.extendDistributedLock(
          runId
        );
      }

      return summary;
    } finally {
      summary.finishedAt = new Date();
      summary.durationMs =
        Date.now() - startedAt;

      await this.releaseDistributedLock(
        runId
      );

      this.logger.info(
        "Courier sync run completed",
        summary
      );
    }
  }

  async findNextBatch(cursor) {
    const cutoff = new Date(
      Date.now() - this.staleAfterMs
    );

    const query = {
      deliveryStatus: {
        $in: ACTIVE_DELIVERY_STATUSES,
      },

      $and: [
        {
          $or: [
            {
              nextSyncAt: {
                $exists: false,
              },
            },
            {
              nextSyncAt: null,
            },
            {
              nextSyncAt: {
                $lte: new Date(),
              },
            },
          ],
        },
        {
          $or: [
            {
              lastSyncedAt: {
                $exists: false,
              },
            },
            {
              lastSyncedAt: null,
            },
            {
              lastSyncedAt: {
                $lte: cutoff,
              },
            },
          ],
        },
      ],
    };

    if (cursor) {
      query._id = {
        $gt: cursor,
      };
    }

    if (this.maxFailures > 0) {
      query.$and.push({
        $or: [
          {
            syncFailureCount: {
              $exists: false,
            },
          },
          {
            syncFailureCount: {
              $lt: this.maxFailures,
            },
          },
        ],
      });
    }

    const projection = null;

    const result =
      this.shipmentModel
        .find(query, projection)
        .sort({ _id: 1 })
        .limit(this.batchSize)
        .lean();

    return result.exec
      ? result.exec()
      : result;
  }

  async processShipment(
    shipment,
    runId
  ) {
    const shipmentId =
      shipment?._id;

    const deliveryStatus =
      normalizeStatus(
        shipment?.deliveryStatus
      );

    if (
      TERMINAL_DELIVERY_STATUSES.has(
        deliveryStatus
      )
    ) {
      return {
        status: "skipped",
        shipmentId,
        reason: "terminal_status",
      };
    }

    const courierCode =
      normalizeString(
        shipment?.courierCode ||
          shipment?.courier ||
          shipment?.courierProvider ||
          shipment?.provider
      ).toLowerCase();

    if (!courierCode) {
      await this.recordFailure(
        shipmentId,
        new Error(
          "Courier provider is missing"
        ),
        runId
      );

      return {
        status: "failed",
        shipmentId,
        reason: "courier_missing",
      };
    }

    try {
      const service =
        await this.resolveCourierService(
          courierCode
        );

      if (
        !service ||
        typeof service.syncShipment !==
          "function"
      ) {
        throw new Error(
          `Courier service "${courierCode}" does not implement syncShipment`
        );
      }

      const result =
        await service.syncShipment(
          shipment
        );

      if (result?.skipped) {
        await this.recordSkippedSync(
          shipmentId,
          result.reason,
          runId
        );

        return {
          status: "skipped",
          shipmentId,
          reason:
            result.reason ||
            "provider_skipped",
        };
      }

      await this.applySyncResult(
        shipmentId,
        result,
        runId
      );

      return {
        status: "synced",
        shipmentId,
      };
    } catch (error) {
      await this.recordFailure(
        shipmentId,
        error,
        runId
      );

      this.logger.error(
        "Courier shipment sync failed",
        {
          runId,
          shipmentId:
            String(shipmentId),
          courierCode,
          error: error.message,
          code: error.code,
        }
      );

      return {
        status: "failed",
        shipmentId,
        error: error.message,
      };
    }
  }

  async resolveCourierService(
    courierCode
  ) {
    if (
      typeof this.courierFactory.getService ===
      "function"
    ) {
      return this.courierFactory.getService(
        courierCode
      );
    }

    if (
      typeof this.courierFactory.create ===
      "function"
    ) {
      return this.courierFactory.create(
        courierCode
      );
    }

    if (
      typeof this.courierFactory.resolve ===
      "function"
    ) {
      return this.courierFactory.resolve(
        courierCode
      );
    }

    if (
      typeof this.courierFactory ===
      "function"
    ) {
      return this.courierFactory(
        courierCode
      );
    }

    throw new Error(
      "Unsupported courierFactory interface"
    );
  }

  buildSyncUpdate(result, runId) {
    const shipment =
      result?.shipment || {};

    const update = {
      lastSyncedAt: new Date(),
      lastSyncRunId: runId,
      syncFailureCount: 0,
      lastSyncError: null,
      nextSyncAt: null,
    };

    const allowedFields = [
      "bookingStatus",
      "deliveryStatus",
      "trackingId",
      "trackingNumber",
      "courierReference",
      "courierStatus",
      "currentLocation",
      "statusMessage",
      "bookedAt",
      "pickedUpAt",
      "outForDeliveryAt",
      "deliveredAt",
      "returnedAt",
      "cancelledAt",
    ];

    for (const field of allowedFields) {
      if (
        shipment[field] !== undefined
      ) {
        update[field] =
          shipment[field];
      }
    }

    const mappedStatus =
      normalizeStatus(
        update.deliveryStatus
      );

    if (
      mappedStatus === "delivered" &&
      !update.deliveredAt
    ) {
      update.deliveredAt =
        new Date();
    }

    if (
      mappedStatus === "returned" &&
      !update.returnedAt
    ) {
      update.returnedAt =
        new Date();
    }

    if (
      mappedStatus === "cancelled" &&
      !update.cancelledAt
    ) {
      update.cancelledAt =
        new Date();
    }

    return update;
  }

  async applySyncResult(
    shipmentId,
    result,
    runId
  ) {
    const update =
      this.buildSyncUpdate(
        result,
        runId
      );

    await this.shipmentModel.updateOne(
      { _id: shipmentId },
      {
        $set: update,
      }
    );
  }

  async recordSkippedSync(
    shipmentId,
    reason,
    runId
  ) {
    await this.shipmentModel.updateOne(
      { _id: shipmentId },
      {
        $set: {
          lastSyncedAt: new Date(),
          lastSyncRunId: runId,
          lastSyncSkipReason:
            normalizeString(reason) ||
            "provider_skipped",
          nextSyncAt: null,
        },
      }
    );
  }

  async recordFailure(
    shipmentId,
    error,
    runId
  ) {
    const currentFailureCount =
      await this.getFailureCount(
        shipmentId
      );

    const nextFailureCount =
      currentFailureCount + 1;

    const delayMs =
      this.calculateRetryDelay(
        nextFailureCount
      );

    await this.shipmentModel.updateOne(
      { _id: shipmentId },
      {
        $set: {
          lastSyncAttemptAt:
            new Date(),
          lastSyncRunId: runId,
          lastSyncError: {
            message:
              normalizeString(
                error?.message
              ) ||
              "Unknown courier sync error",

            code:
              normalizeString(
                error?.code
              ) || null,

            statusCode:
              Number.isInteger(
                error?.statusCode
              )
                ? error.statusCode
                : null,

            occurredAt: new Date(),
          },

          nextSyncAt:
            nextFailureCount >=
            this.maxFailures &&
            this.maxFailures > 0
              ? null
              : new Date(
                  Date.now() +
                    delayMs
                ),
        },

        $inc: {
          syncFailureCount: 1,
        },
      }
    );
  }

  async getFailureCount(
    shipmentId
  ) {
    if (
      typeof this.shipmentModel
        .findById !== "function"
    ) {
      return 0;
    }

    const query =
      this.shipmentModel.findById(
        shipmentId
      );

    const selected =
      typeof query.select === "function"
        ? query.select(
            "syncFailureCount"
          )
        : query;

    const leanQuery =
      typeof selected.lean === "function"
        ? selected.lean()
        : selected;

    const document =
      leanQuery.exec
        ? await leanQuery.exec()
        : await leanQuery;

    return toNonNegativeInteger(
      document?.syncFailureCount,
      0
    );
  }

  calculateRetryDelay(
    failureCount
  ) {
    const baseDelayMs =
      Math.max(
        this.intervalMs,
        60 * 1000
      );

    const exponent =
      Math.min(
        Math.max(
          failureCount - 1,
          0
        ),
        6
      );

    const jitter =
      Math.floor(
        Math.random() * 15000
      );

    return (
      baseDelayMs *
        2 ** exponent +
      jitter
    );
  }

  async processWithConcurrency(
    items,
    concurrency,
    worker
  ) {
    const results = new Array(
      items.length
    );

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
          const currentIndex =
            index++;

          if (
            currentIndex >=
            items.length
          ) {
            return;
          }

          results[currentIndex] =
            await worker(
              items[currentIndex]
            );
        }
      }
    );

    await Promise.all(runners);

    return results;
  }

  async acquireDistributedLock(
    runId
  ) {
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
              {
                expiresAt: {
                  $lte: now,
                },
              },
              {
                owner: this.instanceId,
              },
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

      const document =
        result?.value || result;

      return (
        document?.owner ===
          this.instanceId &&
        document?.runId === runId
      );
    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return false;
      }

      throw error;
    }
  }

  async extendDistributedLock(
    runId
  ) {
    if (!this.lockCollection) {
      return true;
    }

    const result =
      await this.lockCollection.updateOne(
        {
          _id: this.lockKey,
          owner: this.instanceId,
          runId,
        },
        {
          $set: {
            expiresAt: new Date(
              Date.now() +
                this.lockTtlMs
            ),
          },
        }
      );

    return (
      result?.modifiedCount === 1 ||
      result?.matchedCount === 1
    );
  }

  async releaseDistributedLock(
    runId
  ) {
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
        "Failed to release courier sync distributed lock",
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
      intervalMs: this.intervalMs,
      batchSize: this.batchSize,
      concurrency: this.concurrency,
      lockEnabled:
        Boolean(this.lockCollection),
    };
  }
}

module.exports =
  CourierSyncScheduler;
