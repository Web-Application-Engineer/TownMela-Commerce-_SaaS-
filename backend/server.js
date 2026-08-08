"use strict";

const dns = require("dns");
const mongoose = require("mongoose");

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const CourierShipment = require("./models/CourierShipment");
const CourierAuditLog = require("./models/CourierAuditLog");
const CourierRetryJob = require("./models/CourierRetryJob");

const courierFactory = require(
  "./services/courier/courierFactory"
);
const CourierAuditService = require(
  "./services/courier/courierAuditService"
);
const CourierRetryQueue = require(
  "./services/courier/courierRetryQueue"
);
const CourierSyncScheduler = require(
  "./services/courier/courierSyncScheduler"
);

const {
  startTenantSubscriptionScheduler,
  stopTenantSubscriptionScheduler,
} = require(
  "./schedulers/tenantSubscriptionScheduler"
);

/* =========================================================
   DNS CONFIGURATION

   Optional custom DNS servers can be supplied through:

   DNS_SERVERS=1.1.1.1,1.0.0.1

   If DNS_SERVERS is omitted, the operating system's DNS
   configuration remains unchanged.
========================================================= */

const configureDns = () => {
  const configuredServers = String(
    process.env.DNS_SERVERS || ""
  )
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (configuredServers.length > 0) {
    dns.setServers(configuredServers);
  }
};

/* =========================================================
   SERVER CONFIGURATION
========================================================= */

const DEFAULT_PORT = 5000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return fallback;
  }

  return parsedValue;
};

const parsePort = (value) => {
  const parsedPort = Number(value);

  if (
    !Number.isInteger(parsedPort) ||
    parsedPort < 1 ||
    parsedPort > 65535
  ) {
    return DEFAULT_PORT;
  }

  return parsedPort;
};

const PORT = parsePort(process.env.PORT);

const SHUTDOWN_TIMEOUT_MS = parsePositiveInteger(
  process.env.SHUTDOWN_TIMEOUT_MS,
  DEFAULT_SHUTDOWN_TIMEOUT_MS
);

let server = null;
let isShuttingDown = false;

let courierAuditService = null;
let courierRetryQueue = null;
let courierSyncScheduler = null;

/* =========================================================
   LOGGING HELPERS
========================================================= */

const logError = (label, error) => {
  console.error(label, {
    name: error?.name,
    code: error?.code,
    message: error?.message || String(error),
    stack:
      process.env.NODE_ENV === "production"
        ? undefined
        : error?.stack,
  });
};

const courierLogger = {
  debug(message, metadata) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, metadata || "");
    }
  },

  info(message, metadata) {
    console.info(message, metadata || "");
  },

  warn(message, metadata) {
    console.warn(message, metadata || "");
  },

  error(message, metadata) {
    console.error(message, metadata || "");
  },
};

/* =========================================================
   COURIER BACKGROUND SERVICES
========================================================= */

const initializeCourierServices = () => {
  const lockCollection = mongoose.connection.collection(
    "courier_background_locks"
  );

  courierAuditService = new CourierAuditService({
    auditModel: CourierAuditLog,
    logger: courierLogger,
  });

  courierRetryQueue = new CourierRetryQueue({
    queueModel: CourierRetryJob,
    shipmentModel: CourierShipment,
    courierFactory,
    logger: courierLogger,
    lockCollection,
  });

  courierSyncScheduler = new CourierSyncScheduler({
    shipmentModel: CourierShipment,
    courierFactory,
    logger: courierLogger,
    lockCollection,
  });

  app.locals.courierAuditService = courierAuditService;
  app.locals.courierRetryQueue = courierRetryQueue;
  app.locals.courierSyncScheduler = courierSyncScheduler;

  courierRetryQueue.start();
  courierSyncScheduler.start();

  console.log(
    "Courier audit, retry queue and sync scheduler initialized"
  );
};

const stopCourierServices = async () => {
  const stopTasks = [];

  if (
    courierSyncScheduler &&
    typeof courierSyncScheduler.stop === "function"
  ) {
    stopTasks.push(
      courierSyncScheduler.stop({
        waitForActiveRun: true,
      })
    );
  }

  if (
    courierRetryQueue &&
    typeof courierRetryQueue.stop === "function"
  ) {
    stopTasks.push(
      courierRetryQueue.stop({
        waitForActiveRun: true,
      })
    );
  }

  if (stopTasks.length === 0) {
    return;
  }

  const results = await Promise.allSettled(stopTasks);

  const failures = results.filter(
    (result) => result.status === "rejected"
  );

  if (failures.length > 0) {
    const error = new Error(
      `${failures.length} courier background service(s) failed to stop`
    );

    error.code = "COURIER_SERVICE_SHUTDOWN_FAILED";
    error.causes = failures.map(
      (failure) => failure.reason
    );

    throw error;
  }
};

/* =========================================================
   TENANT SUBSCRIPTION SCHEDULER
========================================================= */

const initializeTenantSubscriptionScheduler = () => {
  startTenantSubscriptionScheduler();

  console.log(
    "Tenant subscription scheduler initialized"
  );
};

const stopTenantServices = async () => {
  stopTenantSubscriptionScheduler();
};

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    const activeServer = server;

    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      server = null;
      resolve();
    });

    if (
      typeof activeServer.closeIdleConnections ===
      "function"
    ) {
      activeServer.closeIdleConnections();
    }
  });

const closeDatabaseConnection = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
  }
};

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  const forceExitTimer = setTimeout(() => {
    console.error(
      "Forced shutdown after graceful shutdown timeout"
    );

    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  forceExitTimer.unref();

  try {
    await closeHttpServer();
    console.log("HTTP server closed");

    await stopTenantServices();
    console.log(
      "Tenant subscription scheduler stopped"
    );

    await stopCourierServices();
    console.log(
      "Courier background services stopped"
    );

    await closeDatabaseConnection();
    console.log("Database connection closed");

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExitTimer);

    logError("Graceful shutdown failed:", error);

    process.exit(1);
  }
};

/* =========================================================
   PROCESS EVENT HANDLERS
========================================================= */

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT", 0);
});

process.on("unhandledRejection", (reason) => {
  logError(
    "Unhandled promise rejection:",
    reason instanceof Error
      ? reason
      : new Error(String(reason))
  );

  void shutdown("UNHANDLED_REJECTION", 1);
});

process.on("uncaughtException", (error) => {
  logError("Uncaught exception:", error);

  void shutdown("UNCAUGHT_EXCEPTION", 1);
});

/* =========================================================
   START SERVER
========================================================= */

const startServer = async () => {
  try {
    configureDns();

    await connectDB();

    initializeCourierServices();
    initializeTenantSubscriptionScheduler();

    server = app.listen(PORT, () => {
      console.log(
        `TownMela API server running on port ${PORT}`
      );
    });

    server.on("error", (error) => {
      logError("HTTP server error:", error);

      void shutdown("HTTP_SERVER_ERROR", 1);
    });
  } catch (error) {
    logError("Server startup failed:", error);

    await stopTenantServices().catch(
      (stopError) => {
        logError(
          "Tenant scheduler cleanup after startup failure failed:",
          stopError
        );
      }
    );

    await stopCourierServices().catch(
      (stopError) => {
        logError(
          "Courier service cleanup after startup failure failed:",
          stopError
        );
      }
    );

    await closeDatabaseConnection().catch(
      (closeError) => {
        logError(
          "Database cleanup after startup failure failed:",
          closeError
        );
      }
    );

    process.exit(1);
  }
};

void startServer();
