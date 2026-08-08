const mongoose = require("mongoose");

const BusinessMetricDaily = require(
  "../models/BusinessMetricDaily"
);
const ProfitCalculation = require(
  "../models/ProfitCalculation"
);
const SaleFinancialSnapshot = require(
  "../models/SaleFinancialSnapshot"
);

const businessMetricAggregationService = require(
  "../services/financial/businessMetricAggregationService"
);
const profitCalculationService = require(
  "../services/financial/profitCalculationService"
);

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_CURRENCY = "BDT";

/* =========================================================
   COMMON HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code = null
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

const asyncHandler = (
  handler
) =>
  async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(
        "Financial controller error:",
        error
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code:
            error.code ||
            "VALIDATION_ERROR",
        });
      }

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid identifier or query value",
          code: "CAST_ERROR",
        });
      }

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Server error",
          code:
            error.code ||
            "FINANCIAL_CONTROLLER_ERROR",
        });
    }
  };

const resolveTenantId = (
  req
) => {
  const candidate =
    req.tenant?._id ||
    req.tenant?.id ||
    req.tenantId ||
    req.user?.tenant?._id ||
    req.user?.tenant ||
    req.user?.tenantId ||
    req.auth?.tenantId ||
    req.headers?.["x-tenant-id"] ||
    process.env.DEFAULT_TENANT_ID ||
    null;

  if (!candidate) {
    throw createHttpError(
      400,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
  }

  if (
    !mongoose.isValidObjectId(
      candidate
    )
  ) {
    throw createHttpError(
      400,
      "Invalid tenant context",
      "INVALID_TENANT_CONTEXT"
    );
  }

  return new mongoose.Types.ObjectId(
    candidate
  );
};

const assertObjectId = (
  value,
  fieldName
) => {
  if (
    !value ||
    !mongoose.isValidObjectId(value)
  ) {
    throw createHttpError(
      400,
      `A valid ${fieldName} is required`,
      "INVALID_OBJECT_ID"
    );
  }
};

const parsePositiveInteger = (
  value,
  fallback,
  maximum = null
) => {
  const parsed = Number(value);

  const normalized =
    Number.isInteger(parsed) &&
    parsed > 0
      ? parsed
      : fallback;

  return maximum
    ? Math.min(
        normalized,
        maximum
      )
    : normalized;
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    ["true", "1", "yes"].includes(
      normalized
    )
  ) {
    return true;
  }

  if (
    ["false", "0", "no"].includes(
      normalized
    )
  ) {
    return false;
  }

  return fallback;
};

const normalizeCurrency = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return DEFAULT_CURRENCY;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalized
  )
    ? normalized
    : DEFAULT_CURRENCY;
};

const parseDate = (
  value,
  fieldName,
  {
    endOfDay = false,
    required = false,
  } = {}
) => {
  if (!value) {
    if (required) {
      throw createHttpError(
        400,
        `${fieldName} is required`,
        "DATE_REQUIRED"
      );
    }

    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be a valid date`,
      "INVALID_DATE"
    );
  }

  if (endOfDay) {
    date.setUTCHours(
      23,
      59,
      59,
      999
    );
  } else {
    date.setUTCHours(
      0,
      0,
      0,
      0
    );
  }

  return date;
};

const resolveDateRange = (
  query,
  {
    defaultDays = 30,
    maximumDays = 366,
  } = {}
) => {
  const endDate =
    parseDate(
      query.endDate,
      "endDate",
      {
        endOfDay: true,
      }
    ) || (() => {
      const date = new Date();
      date.setUTCHours(
        23,
        59,
        59,
        999
      );
      return date;
    })();

  const startDate =
    parseDate(
      query.startDate,
      "startDate"
    ) || (() => {
      const date =
        new Date(endDate);
      date.setUTCDate(
        date.getUTCDate() -
          (defaultDays - 1)
      );
      date.setUTCHours(
        0,
        0,
        0,
        0
      );
      return date;
    })();

  if (
    startDate > endDate
  ) {
    throw createHttpError(
      400,
      "startDate cannot be later than endDate",
      "INVALID_DATE_RANGE"
    );
  }

  const dayCount =
    Math.floor(
      (
        endDate.getTime() -
        startDate.getTime()
      ) /
        86400000
    ) + 1;

  if (
    dayCount > maximumDays
  ) {
    throw createHttpError(
      400,
      `Date range cannot exceed ${maximumDays} days`,
      "DATE_RANGE_TOO_LARGE"
    );
  }

  return {
    startDate,
    endDate,
    dayCount,
  };
};

const toNumber = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (
    value instanceof
      mongoose.Types.Decimal128 ||
    value?._bsontype ===
      "Decimal128"
  ) {
    const parsed =
      Number(value.toString());

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const roundMoney = (
  value
) =>
  Math.round(
    (
      toNumber(value) +
      Number.EPSILON
    ) * 100
  ) / 100;

const roundPercent = (
  value
) =>
  Math.round(
    (
      toNumber(value) +
      Number.EPSILON
    ) * 100
  ) / 100;

const calculateMarginPercent = (
  profit,
  revenue
) => {
  const normalizedRevenue =
    roundMoney(revenue);

  if (
    normalizedRevenue === 0
  ) {
    return 0;
  }

  return roundPercent(
    (
      roundMoney(profit) /
      normalizedRevenue
    ) * 100
  );
};

const serializeDecimalValues = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    value instanceof
      mongoose.Types.Decimal128 ||
    value?._bsontype ===
      "Decimal128"
  ) {
    return toNumber(value);
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      serializeDecimalValues
    );
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  if (
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, nestedValue]) => [
          key,
          serializeDecimalValues(
            nestedValue
          ),
        ]
      )
    );
  }

  return value;
};

const sumMetricRange = (
  metrics
) => {
  const totals = {
    orders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    grossRevenue: 0,
    discount: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    courierCost: 0,
    packagingCost: 0,
    paymentFee: 0,
    marketingCost: 0,
    operatingExpense: 0,
    tax: 0,
    netProfit: 0,
    productsSold: 0,
    unitsSold: 0,
    inventoryLoss: 0,
    newCustomers: 0,
    returningCustomers: 0,
  };

  for (
    const metric of metrics
  ) {
    const sales =
      metric.sales || {};

    const profit =
      metric.profit || {};

    const inventory =
      metric.inventory || {};

    const customers =
      metric.customers || {};

    totals.orders +=
      Number(
        sales.orders || 0
      );

    totals.deliveredOrders +=
      Number(
        sales.deliveredOrders || 0
      );

    totals.cancelledOrders +=
      Number(
        sales.cancelledOrders || 0
      );

    totals.grossRevenue +=
      toNumber(
        sales.grossRevenue
      );

    totals.discount +=
      toNumber(
        sales.discount
      );

    totals.netRevenue +=
      toNumber(
        sales.netRevenue
      );

    totals.cogs +=
      toNumber(
        profit.cogs
      );

    totals.grossProfit +=
      toNumber(
        profit.grossProfit
      );

    totals.courierCost +=
      toNumber(
        profit.courierCost
      );

    totals.packagingCost +=
      toNumber(
        profit.packagingCost
      );

    totals.paymentFee +=
      toNumber(
        profit.paymentFee
      );

    totals.marketingCost +=
      toNumber(
        profit.marketingCost
      );

    totals.operatingExpense +=
      toNumber(
        profit.operatingExpense
      );

    totals.tax +=
      toNumber(
        profit.tax
      );

    totals.netProfit +=
      toNumber(
        profit.netProfit
      );

    totals.productsSold +=
      Number(
        inventory.productsSold || 0
      );

    totals.unitsSold +=
      Number(
        inventory.unitsSold || 0
      );

    totals.inventoryLoss +=
      toNumber(
        inventory.inventoryLoss
      );

    totals.newCustomers +=
      Number(
        customers.newCustomers || 0
      );

    totals.returningCustomers +=
      Number(
        customers.returningCustomers || 0
      );
  }

  for (
    const key of [
      "grossRevenue",
      "discount",
      "netRevenue",
      "cogs",
      "grossProfit",
      "courierCost",
      "packagingCost",
      "paymentFee",
      "marketingCost",
      "operatingExpense",
      "tax",
      "netProfit",
      "inventoryLoss",
    ]
  ) {
    totals[key] =
      roundMoney(
        totals[key]
      );
  }

  totals.grossMarginPercent =
    calculateMarginPercent(
      totals.grossProfit,
      totals.netRevenue
    );

  totals.netMarginPercent =
    calculateMarginPercent(
      totals.netProfit,
      totals.netRevenue
    );

  totals.averageOrderValue =
    totals.deliveredOrders > 0
      ? roundMoney(
          totals.netRevenue /
            totals.deliveredOrders
        )
      : 0;

  totals.deliverySuccessRate =
    totals.orders > 0
      ? roundPercent(
          (
            totals.deliveredOrders /
            totals.orders
          ) * 100
        )
      : 0;

  return totals;
};

/* =========================================================
   GET DAILY KPI
========================================================= */

const getDailyKpi =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const metricDate =
        parseDate(
          req.query.date ||
            new Date(),
          "date"
        );

      const refresh =
        parseBoolean(
          req.query.refresh,
          false
        );

      let metric;

      if (refresh) {
        const result =
          await businessMetricAggregationService.upsertDailyMetricsInTransaction(
            {
              tenantId,
              metricDate,
              currency:
                normalizeCurrency(
                  req.query.currency
                ),
            }
          );

        metric =
          result.metric;
      } else {
        metric =
          await businessMetricAggregationService.getDailyMetric(
            {
              tenantId,
              metricDate,
            }
          );
      }

      if (!metric) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Daily business metric was not found",
            code:
              "DAILY_METRIC_NOT_FOUND",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          metric:
            serializeDecimalValues(
              metric.toObject
                ? metric.toObject()
                : metric
            ),
        });
    }
  );

/* =========================================================
   GET METRIC RANGE
========================================================= */

const getMetricRange =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const {
        startDate,
        endDate,
        dayCount,
      } =
        resolveDateRange(
          req.query
        );

      const metrics =
        await businessMetricAggregationService.getMetricRange(
          {
            tenantId,
            startDate,
            endDate,
          }
        );

      const serializedMetrics =
        serializeDecimalValues(
          metrics.map(
            (metric) =>
              metric.toObject
                ? metric.toObject()
                : metric
          )
        );

      return res
        .status(200)
        .json({
          success: true,
          range: {
            startDate,
            endDate,
            dayCount,
          },
          count:
            serializedMetrics.length,
          metrics:
            serializedMetrics,
        });
    }
  );

/* =========================================================
   GET SALES SUMMARY
========================================================= */

const getSalesSummary =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const {
        startDate,
        endDate,
        dayCount,
      } =
        resolveDateRange(
          req.query
        );

      const metrics =
        await BusinessMetricDaily.find({
          tenant: tenantId,
          metricDate: {
            $gte:
              startDate,
            $lte:
              endDate,
          },
        })
          .sort({
            metricDate: 1,
          })
          .lean();

      const totals =
        sumMetricRange(
          metrics
        );

      return res
        .status(200)
        .json({
          success: true,
          range: {
            startDate,
            endDate,
            dayCount,
          },
          summary: {
            orders:
              totals.orders,
            deliveredOrders:
              totals.deliveredOrders,
            cancelledOrders:
              totals.cancelledOrders,
            grossRevenue:
              totals.grossRevenue,
            discount:
              totals.discount,
            netRevenue:
              totals.netRevenue,
            averageOrderValue:
              totals.averageOrderValue,
            deliverySuccessRate:
              totals.deliverySuccessRate,
            productsSold:
              totals.productsSold,
            unitsSold:
              totals.unitsSold,
            newCustomers:
              totals.newCustomers,
            returningCustomers:
              totals.returningCustomers,
          },
          daily:
            serializeDecimalValues(
              metrics.map(
                (metric) => ({
                  metricDate:
                    metric.metricDate,
                  currency:
                    metric.currency,
                  ...metric.sales,
                })
              )
            ),
        });
    }
  );

/* =========================================================
   GET PROFIT SUMMARY
========================================================= */

const getProfitSummary =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const {
        startDate,
        endDate,
        dayCount,
      } =
        resolveDateRange(
          req.query
        );

      const metrics =
        await BusinessMetricDaily.find({
          tenant: tenantId,
          metricDate: {
            $gte:
              startDate,
            $lte:
              endDate,
          },
        })
          .sort({
            metricDate: 1,
          })
          .lean();

      const totals =
        sumMetricRange(
          metrics
        );

      return res
        .status(200)
        .json({
          success: true,
          range: {
            startDate,
            endDate,
            dayCount,
          },
          summary: {
            netRevenue:
              totals.netRevenue,
            cogs:
              totals.cogs,
            grossProfit:
              totals.grossProfit,
            courierCost:
              totals.courierCost,
            packagingCost:
              totals.packagingCost,
            paymentFee:
              totals.paymentFee,
            marketingCost:
              totals.marketingCost,
            operatingExpense:
              totals.operatingExpense,
            tax:
              totals.tax,
            inventoryLoss:
              totals.inventoryLoss,
            netProfit:
              totals.netProfit,
            grossMarginPercent:
              totals.grossMarginPercent,
            netMarginPercent:
              totals.netMarginPercent,
          },
          daily:
            serializeDecimalValues(
              metrics.map(
                (metric) => ({
                  metricDate:
                    metric.metricDate,
                  currency:
                    metric.currency,
                  ...metric.profit,
                })
              )
            ),
        });
    }
  );

/* =========================================================
   GET P&L SUMMARY
========================================================= */

const getProfitAndLoss =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const {
        startDate,
        endDate,
        dayCount,
      } =
        resolveDateRange(
          req.query
        );

      const metrics =
        await BusinessMetricDaily.find({
          tenant: tenantId,
          metricDate: {
            $gte:
              startDate,
            $lte:
              endDate,
          },
        })
          .sort({
            metricDate: 1,
          })
          .lean();

      const totals =
        sumMetricRange(
          metrics
        );

      const totalOperatingCosts =
        roundMoney(
          totals.courierCost +
            totals.packagingCost +
            totals.paymentFee +
            totals.marketingCost +
            totals.operatingExpense +
            totals.tax +
            totals.inventoryLoss
        );

      return res
        .status(200)
        .json({
          success: true,
          range: {
            startDate,
            endDate,
            dayCount,
          },
          currency:
            normalizeCurrency(
              req.query.currency
            ),
          profitAndLoss: {
            revenue: {
              grossRevenue:
                totals.grossRevenue,
              discounts:
                totals.discount,
              netRevenue:
                totals.netRevenue,
            },
            costOfSales: {
              cogs:
                totals.cogs,
            },
            grossProfit: {
              amount:
                totals.grossProfit,
              marginPercent:
                totals.grossMarginPercent,
            },
            operatingCosts: {
              courierCost:
                totals.courierCost,
              packagingCost:
                totals.packagingCost,
              paymentFee:
                totals.paymentFee,
              marketingCost:
                totals.marketingCost,
              operatingExpense:
                totals.operatingExpense,
              tax:
                totals.tax,
              inventoryLoss:
                totals.inventoryLoss,
              total:
                totalOperatingCosts,
            },
            netProfit: {
              amount:
                totals.netProfit,
              marginPercent:
                totals.netMarginPercent,
            },
          },
        });
    }
  );

/* =========================================================
   GET ORDER PROFIT
========================================================= */

const getOrderProfit =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const orderId =
        req.params.orderId;

      assertObjectId(
        orderId,
        "orderId"
      );

      const includeHistory =
        parseBoolean(
          req.query.includeHistory,
          false
        );

      const calculation =
        await profitCalculationService.getLatestOrderProfit(
          {
            tenantId,
            orderId,
            completedOnly: true,
          }
        );

      if (!calculation) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Completed profit calculation was not found for this order",
            code:
              "ORDER_PROFIT_NOT_FOUND",
          });
      }

      let history = null;

      if (includeHistory) {
        history =
          await profitCalculationService.getProfitCalculationHistory(
            {
              tenantId,
              orderId,
              limit:
                parsePositiveInteger(
                  req.query.historyLimit,
                  20,
                  MAX_LIMIT
                ),
            }
          );
      }

      return res
        .status(200)
        .json({
          success: true,
          calculation:
            serializeDecimalValues(
              calculation.toObject
                ? calculation.toObject()
                : calculation
            ),
          history:
            history
              ? serializeDecimalValues(
                  history.map(
                    (item) =>
                      item.toObject
                        ? item.toObject()
                        : item
                  )
                )
              : undefined,
        });
    }
  );

/* =========================================================
   LIST PROFIT CALCULATIONS
========================================================= */

const listProfitCalculations =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const page =
        parsePositiveInteger(
          req.query.page,
          DEFAULT_PAGE
        );

      const limit =
        parsePositiveInteger(
          req.query.limit,
          DEFAULT_LIMIT,
          MAX_LIMIT
        );

      const skip =
        (page - 1) * limit;

      const query = {
        tenant: tenantId,
      };

      if (
        req.query.status
      ) {
        query.status =
          String(
            req.query.status
          )
            .trim()
            .toLowerCase();
      }

      if (
        req.query.salesChannel
      ) {
        query.salesChannel =
          String(
            req.query.salesChannel
          )
            .trim()
            .toLowerCase();
      }

      if (
        req.query.orderId
      ) {
        assertObjectId(
          req.query.orderId,
          "orderId"
        );

        query.order =
          req.query.orderId;
      }

      const {
        startDate,
        endDate,
      } =
        resolveDateRange(
          req.query,
          {
            defaultDays: 90,
            maximumDays: 366,
          }
        );

      query.calculatedAt = {
        $gte:
          startDate,
        $lte:
          endDate,
      };

      const [
        calculations,
        total,
      ] =
        await Promise.all([
          ProfitCalculation.find(
            query
          )
            .sort({
              calculatedAt: -1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          ProfitCalculation.countDocuments(
            query
          ),
        ]);

      return res
        .status(200)
        .json({
          success: true,
          page,
          limit,
          total,
          totalPages:
            Math.ceil(
              total / limit
            ),
          calculations:
            serializeDecimalValues(
              calculations
            ),
        });
    }
  );

/* =========================================================
   GET SNAPSHOT
========================================================= */

const getOrderFinancialSnapshot =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const orderId =
        req.params.orderId;

      assertObjectId(
        orderId,
        "orderId"
      );

      const snapshot =
        await SaleFinancialSnapshot.findOne({
          tenant: tenantId,
          order: orderId,
        })
          .sort({
            snapshotVersion: -1,
          })
          .lean();

      if (!snapshot) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Financial snapshot was not found for this order",
            code:
              "FINANCIAL_SNAPSHOT_NOT_FOUND",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          snapshot:
            serializeDecimalValues(
              snapshot
            ),
        });
    }
  );

/* =========================================================
   REBUILD DAILY METRICS
========================================================= */

const rebuildDailyMetrics =
  asyncHandler(
    async (req, res) => {
      const tenantId =
        resolveTenantId(req);

      const startDate =
        parseDate(
          req.body.startDate ||
            req.query.startDate,
          "startDate",
          {
            required: true,
          }
        );

      const endDate =
        parseDate(
          req.body.endDate ||
            req.query.endDate,
          "endDate",
          {
            required: true,
          }
        );

      if (
        startDate > endDate
      ) {
        throw createHttpError(
          400,
          "startDate cannot be later than endDate",
          "INVALID_DATE_RANGE"
        );
      }

      const results =
        await businessMetricAggregationService.rebuildDateRangeInTransaction(
          {
            tenantId,
            startDate,
            endDate,
            currency:
              normalizeCurrency(
                req.body.currency ||
                  req.query.currency
              ),
          }
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Daily business metrics rebuilt successfully",
          rebuiltDays:
            results.length,
          metrics:
            serializeDecimalValues(
              results.map(
                (result) =>
                  result.metric?.toObject
                    ? result.metric.toObject()
                    : result.metric
              )
            ),
        });
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getDailyKpi,
  getMetricRange,
  getSalesSummary,
  getProfitSummary,
  getProfitAndLoss,
  getOrderProfit,
  listProfitCalculations,
  getOrderFinancialSnapshot,
  rebuildDailyMetrics,
};
