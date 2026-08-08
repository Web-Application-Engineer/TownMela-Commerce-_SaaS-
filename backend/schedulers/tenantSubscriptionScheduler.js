"use strict";

const tenantService = require(
  "../services/tenantService"
);

/* =====================================================
   CONFIGURATION
===================================================== */

const DEFAULT_INTERVAL_MINUTES = 60;

let timer = null;
let isRunning = false;

const getIntervalMilliseconds = () => {
  const configuredMinutes = Number(
    process.env.TENANT_SUBSCRIPTION_CHECK_INTERVAL_MINUTES ||
      DEFAULT_INTERVAL_MINUTES
  );

  const intervalMinutes =
    Number.isFinite(configuredMinutes) &&
    configuredMinutes >= 1
      ? configuredMinutes
      : DEFAULT_INTERVAL_MINUTES;

  return intervalMinutes * 60 * 1000;
};

/* =====================================================
   RUN ONE CHECK
===================================================== */

const runTenantSubscriptionCheck = async () => {
  if (isRunning) {
    return {
      skipped: true,
      reason:
        "Previous tenant subscription check is still running",
    };
  }

  isRunning = true;

  try {
    const result =
      await tenantService.suspendExpiredTenants();

    console.log(
      "[Tenant Subscription Scheduler]",
      {
        checkedAt:
          result.checkedAt,
        matchedCount:
          result.matchedCount,
        modifiedCount:
          result.modifiedCount,
      }
    );

    return {
      skipped: false,
      ...result,
    };
  } catch (error) {
    console.error(
      "[Tenant Subscription Scheduler] Failed:",
      error
    );

    return {
      skipped: false,
      failed: true,
      error,
    };
  } finally {
    isRunning = false;
  }
};

/* =====================================================
   START SCHEDULER
===================================================== */

const startTenantSubscriptionScheduler = () => {
  if (timer) {
    return timer;
  }

  const intervalMilliseconds =
    getIntervalMilliseconds();

  /*
   * Run once at server startup so an already-expired trial is
   * suspended without waiting for the first interval.
   */
  void runTenantSubscriptionCheck();

  timer = setInterval(
    () => {
      void runTenantSubscriptionCheck();
    },
    intervalMilliseconds
  );

  /*
   * Allows Node.js to exit normally during graceful shutdown.
   */
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  console.log(
    "[Tenant Subscription Scheduler] Started",
    {
      intervalMinutes:
        intervalMilliseconds / 60000,
    }
  );

  return timer;
};

/* =====================================================
   STOP SCHEDULER
===================================================== */

const stopTenantSubscriptionScheduler = () => {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;

  console.log(
    "[Tenant Subscription Scheduler] Stopped"
  );
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  runTenantSubscriptionCheck,
  startTenantSubscriptionScheduler,
  stopTenantSubscriptionScheduler,
};
