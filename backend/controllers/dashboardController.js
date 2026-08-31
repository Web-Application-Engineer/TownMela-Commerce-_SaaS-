const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/product");
const Category = require("../models/Category");
const Coupon = require("../models/Coupon");
const BusinessMetricDaily = require("../models/BusinessMetricDaily");
const ProfitCalculation = require("../models/ProfitCalculation");

/* =========================================================
   DASHBOARD CONFIGURATION
========================================================= */

const LOW_STOCK_LIMIT = 5;
const RECENT_ORDER_LIMIT = 8;
const LOW_STOCK_PRODUCT_LIMIT = 8;
const SALES_OVERVIEW_DAYS = 30;
const DEFAULT_CURRENCY = "BDT";
const MAX_RECENT_LIMIT = 50;

/* =========================================================
   COMMON HELPERS
========================================================= */

const createHttpError = (statusCode, message, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

const asyncHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("Dashboard controller error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code || "VALIDATION_ERROR",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid identifier or query value",
        code: "CAST_ERROR",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load dashboard data",
      code: error.code || "DASHBOARD_CONTROLLER_ERROR",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

const resolveTenantId = (req) => {
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

  if (!mongoose.isValidObjectId(candidate)) {
    throw createHttpError(
      400,
      "Invalid tenant context",
      "INVALID_TENANT_CONTEXT"
    );
  }

  return new mongoose.Types.ObjectId(candidate);
};

const normalizeCurrency = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_CURRENCY;
  }

  const normalized = value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : DEFAULT_CURRENCY;
};

const parsePositiveInteger = (value, fallback, maximum) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (
    value instanceof mongoose.Types.Decimal128 ||
    value?._bsontype === "Decimal128"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) =>
  Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const roundPercent = (value) =>
  Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const calculatePercent = (numerator, denominator) => {
  const normalizedDenominator = toNumber(denominator);

  if (normalizedDenominator === 0) {
    return 0;
  }

  return roundPercent(
    (toNumber(numerator) / normalizedDenominator) * 100
  );
};

const calculateGrowthPercent = (currentValue, previousValue) => {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return roundPercent(
    ((current - previous) / Math.abs(previous)) * 100
  );
};

const serializeDecimalValues = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    value instanceof mongoose.Types.Decimal128 ||
    value?._bsontype === "Decimal128"
  ) {
    return toNumber(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeDecimalValues);
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeDecimalValues(nestedValue),
      ])
    );
  }

  return value;
};

/* =========================================================
   DATE HELPERS
========================================================= */

const startOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const startOfUtcMonth = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcMonth = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const subtractUtcDays = (value, days) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

const previousMonthRange = (value = new Date()) => {
  const currentMonthStart = startOfUtcMonth(value);
  const previousMonthEnd = new Date(currentMonthStart.getTime() - 1);

  return {
    startDate: startOfUtcMonth(previousMonthEnd),
    endDate: endOfUtcMonth(previousMonthEnd),
  };
};

/* =========================================================
   LEGACY SALES OVERVIEW HELPERS
========================================================= */

const createEmptySalesOverview = (
  numberOfDays = SALES_OVERVIEW_DAYS
) => {
  const salesOverview = [];
  const today = startOfUtcDay();

  for (
    let dayOffset = numberOfDays - 1;
    dayOffset >= 0;
    dayOffset -= 1
  ) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - dayOffset);

    salesOverview.push({
      date: date.toISOString().slice(0, 10),
      sales: 0,
      orders: 0,
    });
  }

  return salesOverview;
};

const mergeSalesOverview = (aggregatedSales = []) => {
  const emptySalesOverview = createEmptySalesOverview();

  const salesMap = new Map(
    aggregatedSales.map((item) => [
      item.date,
      {
        sales: toNumber(item.sales),
        orders: Number(item.orders || 0),
      },
    ])
  );

  return emptySalesOverview.map((item) => {
    const matchedSales = salesMap.get(item.date);

    return {
      date: item.date,
      sales: matchedSales?.sales || 0,
      orders: matchedSales?.orders || 0,
    };
  });
};

/* =========================================================
   BUSINESS METRIC HELPERS
========================================================= */

const createMetricAccumulator = () => ({
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
});

const aggregateMetrics = (metrics = []) => {
  const totals = createMetricAccumulator();

  for (const metric of metrics) {
    const sales = metric.sales || {};
    const profit = metric.profit || {};
    const inventory = metric.inventory || {};
    const customers = metric.customers || {};

    totals.orders += Number(sales.orders || 0);
    totals.deliveredOrders += Number(sales.deliveredOrders || 0);
    totals.cancelledOrders += Number(sales.cancelledOrders || 0);
    totals.grossRevenue += toNumber(sales.grossRevenue);
    totals.discount += toNumber(sales.discount);
    totals.netRevenue += toNumber(sales.netRevenue);
    totals.cogs += toNumber(profit.cogs);
    totals.grossProfit += toNumber(profit.grossProfit);
    totals.courierCost += toNumber(profit.courierCost);
    totals.packagingCost += toNumber(profit.packagingCost);
    totals.paymentFee += toNumber(profit.paymentFee);
    totals.marketingCost += toNumber(profit.marketingCost);
    totals.operatingExpense += toNumber(profit.operatingExpense);
    totals.tax += toNumber(profit.tax);
    totals.netProfit += toNumber(profit.netProfit);
    totals.productsSold += Number(inventory.productsSold || 0);
    totals.unitsSold += Number(inventory.unitsSold || 0);
    totals.inventoryLoss += toNumber(inventory.inventoryLoss);
    totals.newCustomers += Number(customers.newCustomers || 0);
    totals.returningCustomers += Number(customers.returningCustomers || 0);
  }

  [
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
  ].forEach((key) => {
    totals[key] = roundMoney(totals[key]);
  });

  totals.grossMarginPercent = calculatePercent(
    totals.grossProfit,
    totals.netRevenue
  );

  totals.netMarginPercent = calculatePercent(
    totals.netProfit,
    totals.netRevenue
  );

  totals.averageOrderValue =
    totals.deliveredOrders > 0
      ? roundMoney(totals.netRevenue / totals.deliveredOrders)
      : 0;

  totals.deliverySuccessRate = calculatePercent(
    totals.deliveredOrders,
    totals.orders
  );

  totals.cancellationRate = calculatePercent(
    totals.cancelledOrders,
    totals.orders
  );

  totals.repeatCustomerRate = calculatePercent(
    totals.returningCustomers,
    totals.newCustomers + totals.returningCustomers
  );

  return totals;
};

const getMetricsBetween = (tenantId, startDate, endDate) =>
  BusinessMetricDaily.find({
    tenant: tenantId,
    metricDate: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .sort({ metricDate: 1 })
    .lean();

const buildDailyChart = (metrics = []) =>
  metrics.map((metric) => ({
    date: metric.metricDate,
    sales: roundMoney(metric.sales?.netRevenue),
    grossRevenue: roundMoney(metric.sales?.grossRevenue),
    profit: roundMoney(metric.profit?.netProfit),
    grossProfit: roundMoney(metric.profit?.grossProfit),
    orders: Number(metric.sales?.orders || 0),
    deliveredOrders: Number(metric.sales?.deliveredOrders || 0),
    cancelledOrders: Number(metric.sales?.cancelledOrders || 0),
    newCustomers: Number(metric.customers?.newCustomers || 0),
    returningCustomers: Number(
      metric.customers?.returningCustomers || 0
    ),
  }));

const getOrderStatusCounts = async (tenantId) => {
  const rows = await Order.aggregate([
    {
      $match: {
        tenant: tenantId,
      },
    },
    {
      $group: {
        _id: {
          $toLower: {
            $ifNull: ["$orderStatus", "$status"],
          },
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const counts = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };

  for (const row of rows) {
    const key = String(row._id || "").trim().toLowerCase();

    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] = Number(row.count || 0);
    }
  }

  return counts;
};

const getPaymentStatusCounts = async (tenantId) => {
  const rows = await Order.aggregate([
    {
      $match: {
        tenant: tenantId,
      },
    },
    {
      $group: {
        _id: {
          $toLower: {
            $ifNull: ["$paymentStatus", "unknown"],
          },
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const counts = {
    paid: 0,
    pending: 0,
    unpaid: 0,
    refunded: 0,
    failed: 0,
    unknown: 0,
  };

  for (const row of rows) {
    const key = String(row._id || "unknown").trim().toLowerCase();

    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] = Number(row.count || 0);
    } else {
      counts.unknown += Number(row.count || 0);
    }
  }

  return counts;
};

/* =========================================================
   BACKWARD-COMPATIBLE ADMIN DASHBOARD SUMMARY

   GET /api/dashboard/stats
========================================================= */

const getDashboardStats = asyncHandler(async (req, res) => {
  const tenantId = resolveTenantId(req);
  const now = new Date();

  const salesStartDate = startOfUtcDay(now);
  salesStartDate.setUTCDate(
    salesStartDate.getUTCDate() - (SALES_OVERVIEW_DAYS - 1)
  );

  const tenantFilter = {
    tenant: tenantId,
  };

  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalProducts,
    totalCategories,
    totalUsers,
    activeCoupons,
    totalSalesResult,
    salesOverviewResult,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    Order.countDocuments(tenantFilter),

    Order.countDocuments({
      ...tenantFilter,
      orderStatus: "Pending",
    }),

    Order.countDocuments({
      ...tenantFilter,
      orderStatus: "Processing",
    }),

    Order.countDocuments({
      ...tenantFilter,
      orderStatus: "Shipped",
    }),

    Order.countDocuments({
      ...tenantFilter,
      orderStatus: "Delivered",
    }),

    Order.countDocuments({
      ...tenantFilter,
      orderStatus: "Cancelled",
    }),

    Product.countDocuments(tenantFilter),

    Category.countDocuments(tenantFilter),

    User.countDocuments({
      ...tenantFilter,
      role: "user",
    }),

    Coupon.countDocuments({
      ...tenantFilter,
      isActive: true,
      expiresAt: {
        $gt: now,
      },
    }),

    Order.aggregate([
      {
        $match: {
          tenant: tenantId,
          orderStatus: "Delivered",
        },
      },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: "$totalAmount",
          },
        },
      },
    ]),

    Order.aggregate([
      {
        $match: {
          tenant: tenantId,
          orderStatus: "Delivered",
          createdAt: {
            $gte: salesStartDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          sales: {
            $sum: "$totalAmount",
          },
          orders: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sales: 1,
          orders: 1,
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]),

    Order.find(tenantFilter)
      .select(
        [
          "orderNumber",
          "customer.fullName",
          "customer.phone",
          "items",
          "subtotalAmount",
          "deliveryCharge",
          "discountAmount",
          "totalAmount",
          "paymentMethod",
          "paymentStatus",
          "orderStatus",
          "createdAt",
        ].join(" ")
      )
      .sort({
        createdAt: -1,
      })
      .limit(RECENT_ORDER_LIMIT)
      .lean(),

    Product.find({
      ...tenantFilter,
      stock: {
        $lte: LOW_STOCK_LIMIT,
      },
    })
      .select(
        [
          "name",
          "slug",
          "image",
          "price",
          "oldPrice",
          "stock",
          "category",
          "createdAt",
        ].join(" ")
      )
      .populate("category", "name slug")
      .sort({
        stock: 1,
        createdAt: -1,
      })
      .limit(LOW_STOCK_PRODUCT_LIMIT)
      .lean(),
  ]);

  const totalSales =
    totalSalesResult.length > 0
      ? toNumber(totalSalesResult[0].totalSales)
      : 0;

  const salesOverview = mergeSalesOverview(salesOverviewResult);

  const formattedRecentOrders = recentOrders.map((order) => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    customer: {
      fullName: order.customer?.fullName || "",
      phone: order.customer?.phone || "",
    },
    itemCount: Array.isArray(order.items)
      ? order.items.reduce(
          (totalQuantity, item) =>
            totalQuantity + Number(item.quantity || 0),
          0
        )
      : 0,
    subtotalAmount: toNumber(order.subtotalAmount),
    deliveryCharge: toNumber(order.deliveryCharge),
    discountAmount: toNumber(order.discountAmount),
    totalAmount: toNumber(order.totalAmount),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
  }));

  const formattedLowStockProducts = lowStockProducts.map(
    (product) => ({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: toNumber(product.price),
      oldPrice: toNumber(product.oldPrice),
      stock: Number(product.stock || 0),
      category: product.category
        ? {
            _id: product.category._id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
    })
  );

  return res.status(200).json({
    success: true,
    stats: {
      totalSales,
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      totalCategories,
      totalUsers,
      activeCoupons,
    },
    orderStatus: {
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
    salesOverview,
    recentOrders: formattedRecentOrders,
    lowStockProducts: formattedLowStockProducts,
    meta: {
      salesOverviewDays: SALES_OVERVIEW_DAYS,
      recentOrderLimit: RECENT_ORDER_LIMIT,
      lowStockLimit: LOW_STOCK_LIMIT,
      generatedAt: new Date(),
    },
  });
});

/* =========================================================
   EXECUTIVE DASHBOARD

   GET /api/dashboard
========================================================= */

const getExecutiveDashboard = asyncHandler(async (req, res) => {
  const tenantId = resolveTenantId(req);
  const currency = normalizeCurrency(req.query.currency);

  const recentLimit = parsePositiveInteger(
    req.query.recentLimit,
    RECENT_ORDER_LIMIT,
    MAX_RECENT_LIMIT
  );

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);
  const yesterdayStart = startOfUtcDay(subtractUtcDays(now, 1));
  const yesterdayEnd = endOfUtcDay(subtractUtcDays(now, 1));
  const monthStart = startOfUtcMonth(now);
  const monthEnd = endOfUtcMonth(now);

  const {
    startDate: previousMonthStart,
    endDate: previousMonthEnd,
  } = previousMonthRange(now);

  const chartStart = startOfUtcDay(
    subtractUtcDays(now, SALES_OVERVIEW_DAYS - 1)
  );

  const [
    todayMetrics,
    yesterdayMetrics,
    monthMetrics,
    previousMonthMetrics,
    lifetimeMetrics,
    chartMetrics,
    orderStatusCounts,
    paymentStatusCounts,
    recentOrders,
    recentDeliveredOrders,
    recentProfitCalculations,
    lowStockProducts,
  ] = await Promise.all([
    getMetricsBetween(tenantId, todayStart, todayEnd),
    getMetricsBetween(tenantId, yesterdayStart, yesterdayEnd),
    getMetricsBetween(tenantId, monthStart, monthEnd),
    getMetricsBetween(
      tenantId,
      previousMonthStart,
      previousMonthEnd
    ),
    BusinessMetricDaily.find({
      tenant: tenantId,
    })
      .sort({
        metricDate: 1,
      })
      .lean(),
    getMetricsBetween(tenantId, chartStart, todayEnd),
    getOrderStatusCounts(tenantId),
    getPaymentStatusCounts(tenantId),

    Order.find({
      tenant: tenantId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(recentLimit)
      .select({
        orderNumber: 1,
        customer: 1,
        totalAmount: 1,
        currency: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        orderStatus: 1,
        status: 1,
        createdAt: 1,
        deliveredAt: 1,
      })
      .lean(),

    Order.find({
      tenant: tenantId,
      $or: [
        { orderStatus: "Delivered" },
        { orderStatus: "delivered" },
        { status: "Delivered" },
        { status: "delivered" },
      ],
    })
      .sort({
        deliveredAt: -1,
        updatedAt: -1,
      })
      .limit(recentLimit)
      .select({
        orderNumber: 1,
        customer: 1,
        totalAmount: 1,
        currency: 1,
        paymentStatus: 1,
        deliveredAt: 1,
        updatedAt: 1,
      })
      .lean(),

    ProfitCalculation.find({
      tenant: tenantId,
      status: "completed",
    })
      .sort({
        calculatedAt: -1,
        createdAt: -1,
      })
      .limit(recentLimit)
      .select({
        order: 1,
        orderNumber: 1,
        currency: 1,
        salesChannel: 1,
        summary: 1,
        calculatedAt: 1,
      })
      .lean(),

    Product.find({
      tenant: tenantId,
      stock: {
        $lte: LOW_STOCK_LIMIT,
      },
    })
      .select({
        name: 1,
        slug: 1,
        image: 1,
        price: 1,
        oldPrice: 1,
        stock: 1,
        category: 1,
      })
      .populate("category", "name slug")
      .sort({
        stock: 1,
        createdAt: -1,
      })
      .limit(LOW_STOCK_PRODUCT_LIMIT)
      .lean(),
  ]);

  const today = aggregateMetrics(todayMetrics);
  const yesterday = aggregateMetrics(yesterdayMetrics);
  const thisMonth = aggregateMetrics(monthMetrics);
  const lastMonth = aggregateMetrics(previousMonthMetrics);
  const lifetime = aggregateMetrics(lifetimeMetrics);

  const response = {
    success: true,
    generatedAt: new Date(),
    currency,
    periods: {
      today: {
        startDate: todayStart,
        endDate: todayEnd,
      },
      yesterday: {
        startDate: yesterdayStart,
        endDate: yesterdayEnd,
      },
      thisMonth: {
        startDate: monthStart,
        endDate: monthEnd,
      },
      lastMonth: {
        startDate: previousMonthStart,
        endDate: previousMonthEnd,
      },
      chart: {
        startDate: chartStart,
        endDate: todayEnd,
      },
    },
    kpis: {
      today: {
        sales: today.netRevenue,
        profit: today.netProfit,
        orders: today.orders,
        deliveredOrders: today.deliveredOrders,
        cancelledOrders: today.cancelledOrders,
        averageOrderValue: today.averageOrderValue,
      },
      yesterday: {
        sales: yesterday.netRevenue,
        profit: yesterday.netProfit,
        orders: yesterday.orders,
      },
      thisMonth: {
        sales: thisMonth.netRevenue,
        profit: thisMonth.netProfit,
        orders: thisMonth.orders,
        deliveredOrders: thisMonth.deliveredOrders,
        cancelledOrders: thisMonth.cancelledOrders,
        grossMarginPercent: thisMonth.grossMarginPercent,
        netMarginPercent: thisMonth.netMarginPercent,
        averageOrderValue: thisMonth.averageOrderValue,
        deliverySuccessRate: thisMonth.deliverySuccessRate,
      },
      lastMonth: {
        sales: lastMonth.netRevenue,
        profit: lastMonth.netProfit,
        orders: lastMonth.orders,
      },
      lifetime: {
        grossRevenue: lifetime.grossRevenue,
        netRevenue: lifetime.netRevenue,
        grossProfit: lifetime.grossProfit,
        netProfit: lifetime.netProfit,
        totalOrders: lifetime.orders,
        deliveredOrders: lifetime.deliveredOrders,
        cancelledOrders: lifetime.cancelledOrders,
        averageOrderValue: lifetime.averageOrderValue,
        grossMarginPercent: lifetime.grossMarginPercent,
        netMarginPercent: lifetime.netMarginPercent,
        deliverySuccessRate: lifetime.deliverySuccessRate,
        cancellationRate: lifetime.cancellationRate,
        repeatCustomerRate: lifetime.repeatCustomerRate,
      },
    },
    growth: {
      todayVsYesterday: {
        salesPercent: calculateGrowthPercent(
          today.netRevenue,
          yesterday.netRevenue
        ),
        profitPercent: calculateGrowthPercent(
          today.netProfit,
          yesterday.netProfit
        ),
        ordersPercent: calculateGrowthPercent(
          today.orders,
          yesterday.orders
        ),
      },
      thisMonthVsLastMonth: {
        salesPercent: calculateGrowthPercent(
          thisMonth.netRevenue,
          lastMonth.netRevenue
        ),
        profitPercent: calculateGrowthPercent(
          thisMonth.netProfit,
          lastMonth.netProfit
        ),
        ordersPercent: calculateGrowthPercent(
          thisMonth.orders,
          lastMonth.orders
        ),
      },
    },
    summaries: {
      revenue: {
        grossRevenue: lifetime.grossRevenue,
        discount: lifetime.discount,
        netRevenue: lifetime.netRevenue,
      },
      profit: {
        cogs: lifetime.cogs,
        grossProfit: lifetime.grossProfit,
        courierCost: lifetime.courierCost,
        packagingCost: lifetime.packagingCost,
        paymentFee: lifetime.paymentFee,
        marketingCost: lifetime.marketingCost,
        operatingExpense: lifetime.operatingExpense,
        tax: lifetime.tax,
        inventoryLoss: lifetime.inventoryLoss,
        netProfit: lifetime.netProfit,
      },
      orders: {
        ...orderStatusCounts,
        total: Object.values(orderStatusCounts).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        ),
      },
      payments: paymentStatusCounts,
      customers: {
        newCustomers: lifetime.newCustomers,
        returningCustomers: lifetime.returningCustomers,
        repeatCustomerRate: lifetime.repeatCustomerRate,
      },
      inventory: {
        productsSold: lifetime.productsSold,
        unitsSold: lifetime.unitsSold,
        inventoryLoss: lifetime.inventoryLoss,
      },
    },
    charts: {
      daily: buildDailyChart(chartMetrics),
    },
    recent: {
      orders: recentOrders,
      deliveredOrders: recentDeliveredOrders,
      profitCalculations: recentProfitCalculations,
    },
    alerts: {
      lowStockProducts,
      lowStockLimit: LOW_STOCK_LIMIT,
    },
  };

  return res.status(200).json(serializeDecimalValues(response));
});

/* =========================================================
   COMPACT KPI ENDPOINT

   GET /api/dashboard/kpis
========================================================= */

const getDashboardKpis = asyncHandler(async (req, res) => {
  const tenantId = resolveTenantId(req);
  const now = new Date();

  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);
  const monthEnd = endOfUtcMonth(now);

  const [todayMetrics, monthMetrics, lifetimeMetrics] =
    await Promise.all([
      getMetricsBetween(tenantId, todayStart, todayEnd),
      getMetricsBetween(tenantId, monthStart, monthEnd),
      BusinessMetricDaily.find({
        tenant: tenantId,
      }).lean(),
    ]);

  const today = aggregateMetrics(todayMetrics);
  const thisMonth = aggregateMetrics(monthMetrics);
  const lifetime = aggregateMetrics(lifetimeMetrics);

  return res.status(200).json({
    success: true,
    generatedAt: new Date(),
    currency: normalizeCurrency(req.query.currency),
    kpis: {
      todaySales: today.netRevenue,
      todayProfit: today.netProfit,
      todayOrders: today.orders,
      monthSales: thisMonth.netRevenue,
      monthProfit: thisMonth.netProfit,
      monthOrders: thisMonth.orders,
      totalRevenue: lifetime.netRevenue,
      totalNetProfit: lifetime.netProfit,
      averageOrderValue: lifetime.averageOrderValue,
      grossMarginPercent: lifetime.grossMarginPercent,
      netMarginPercent: lifetime.netMarginPercent,
      deliverySuccessRate: lifetime.deliverySuccessRate,
    },
  });
});

/* =========================================================
   EXPORT CONTROLLER
========================================================= */

module.exports = {
  getDashboardStats,
  getExecutiveDashboard,
  getDashboardKpis,
};
