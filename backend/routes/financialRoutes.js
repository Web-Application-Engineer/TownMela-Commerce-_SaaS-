const express = require("express");

const {
  getDailyKpi,
  getMetricRange,
  getSalesSummary,
  getProfitSummary,
  getProfitAndLoss,
  getOrderProfit,
  listProfitCalculations,
  getOrderFinancialSnapshot,
  rebuildDailyMetrics,
} = require(
  "../controllers/financialController"
);

/* =========================================================
   ROUTER
========================================================= */

const router =
  express.Router();

/* =========================================================
   OPTIONAL MIDDLEWARE RESOLUTION

   TownMela-এর project structure অনুযায়ী auth/admin middleware
   file name ভিন্ন হতে পারে। Route file load হওয়া বন্ধ না করতে
   optional resolver ব্যবহার করা হয়েছে।

   Supported common exports:
   - protect
   - authenticate
   - requireAuth
   - adminOnly
   - authorizeAdmin
   - requireAdmin
========================================================= */

const passthroughMiddleware = (
  req,
  res,
  next
) => next();

const loadOptionalModule = (
  modulePaths
) => {
  for (
    const modulePath of
    modulePaths
  ) {
    try {
      return require(
        modulePath
      );
    } catch (error) {
      if (
        error.code !==
        "MODULE_NOT_FOUND"
      ) {
        throw error;
      }

      const missingModule =
        String(
          error.message || ""
        );

      /*
        Middleware file না পাওয়া গেলে next path try হবে।
        কিন্তু middleware file-এর ভিতরের dependency missing হলে
        প্রকৃত error suppress করা হবে না।
      */

      if (
        !missingModule.includes(
          modulePath
        )
      ) {
        throw error;
      }
    }
  }

  return null;
};

const resolveMiddleware = (
  loadedModule,
  exportNames
) => {
  if (
    typeof loadedModule ===
      "function"
  ) {
    return loadedModule;
  }

  const normalizedModule =
    loadedModule?.default ||
    loadedModule;

  for (
    const exportName of
    exportNames
  ) {
    if (
      typeof normalizedModule?.[
        exportName
      ] === "function"
    ) {
      return normalizedModule[
        exportName
      ];
    }
  }

  return passthroughMiddleware;
};

const authModule =
  loadOptionalModule([
    "../middleware/authMiddleware",
    "../middlewares/authMiddleware",
    "../middleware/auth",
    "../middlewares/auth",
  ]);

const adminModule =
  loadOptionalModule([
    "../middleware/adminMiddleware",
    "../middlewares/adminMiddleware",
    "../middleware/roleMiddleware",
    "../middlewares/roleMiddleware",
  ]);

const requireAuthentication =
  resolveMiddleware(
    authModule,
    [
      "protect",
      "authenticate",
      "requireAuth",
      "verifyToken",
      "auth",
    ]
  );

const requireAdmin =
  resolveMiddleware(
    adminModule ||
      authModule,
    [
      "adminOnly",
      "authorizeAdmin",
      "requireAdmin",
      "isAdmin",
      "admin",
    ]
  );

/* =========================================================
   ACCESS CONTROL

   Financial reports contain sensitive business information.
   All routes are protected and restricted to admin users when
   the project's auth/admin middleware is available.
========================================================= */

router.use(
  requireAuthentication,
  requireAdmin
);

/* =========================================================
   KPI AND METRICS
========================================================= */

/*
  GET /api/financial/kpi/daily
  GET /api/financial/kpi/daily?date=2026-07-22
  GET /api/financial/kpi/daily?date=2026-07-22&refresh=true
*/

router.get(
  "/kpi/daily",
  getDailyKpi
);

/*
  GET /api/financial/metrics
  GET /api/financial/metrics?startDate=2026-07-01&endDate=2026-07-31
*/

router.get(
  "/metrics",
  getMetricRange
);

/*
  POST /api/financial/metrics/rebuild

  Body:
  {
    "startDate": "2026-07-01",
    "endDate": "2026-07-31",
    "currency": "BDT"
  }
*/

router.post(
  "/metrics/rebuild",
  rebuildDailyMetrics
);

/* =========================================================
   SALES, PROFIT AND P&L REPORTS
========================================================= */

/*
  GET /api/financial/reports/sales
  GET /api/financial/reports/sales?startDate=2026-07-01&endDate=2026-07-31
*/

router.get(
  "/reports/sales",
  getSalesSummary
);

/*
  GET /api/financial/reports/profit
*/

router.get(
  "/reports/profit",
  getProfitSummary
);

/*
  GET /api/financial/reports/profit-and-loss
*/

router.get(
  "/reports/profit-and-loss",
  getProfitAndLoss
);

/*
  Backward-compatible compact alias:
  GET /api/financial/reports/pnl
*/

router.get(
  "/reports/pnl",
  getProfitAndLoss
);

/* =========================================================
   PROFIT CALCULATIONS
========================================================= */

/*
  GET /api/financial/profit-calculations
  Optional:
  ?page=1
  ?limit=20
  ?status=completed
  ?salesChannel=website
  ?orderId=<ObjectId>
  ?startDate=2026-07-01
  ?endDate=2026-07-31
*/

router.get(
  "/profit-calculations",
  listProfitCalculations
);

/*
  GET /api/financial/orders/:orderId/profit
  GET /api/financial/orders/:orderId/profit?includeHistory=true
*/

router.get(
  "/orders/:orderId/profit",
  getOrderProfit
);

/* =========================================================
   FINANCIAL SNAPSHOT
========================================================= */

/*
  GET /api/financial/orders/:orderId/snapshot
*/

router.get(
  "/orders/:orderId/snapshot",
  getOrderFinancialSnapshot
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
