const mongoose = require("mongoose");

const BusinessMetricDaily = require("../../models/BusinessMetricDaily");
const FinancialEvent = require("../../models/FinancialEvent");
const Order = require("../../models/Order");
const ProfitCalculation = require("../../models/ProfitCalculation");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_CURRENCY = "BDT";

const REVENUE_EVENT_TYPES = Object.freeze([
  "revenue",
  "delivery_revenue",
  "other_income",
]);

const DISCOUNT_EVENT_TYPES = Object.freeze([
  "discount",
  "refund",
]);

const COST_EVENT_MAP = Object.freeze({
  cogs: "cogs",
  courier_cost: "courierCost",
  packaging_cost: "packagingCost",
  payment_fee: "paymentFee",
  marketing_cost: "marketingCost",
  operating_expense: "operatingExpense",
  financial_cost: "financialCost",
  tax: "tax",
  marketplace_fee: "operatingExpense",
  other_expense: "operatingExpense",
  inventory_loss: "inventoryLoss",
});

/* =========================================================
   ERROR / VALIDATION HELPERS
========================================================= */

const createHttpError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

const assertObjectId = (value, fieldName) => {
  if (!value || !mongoose.isValidObjectId(value)) {
    throw createHttpError(
      `A valid ${fieldName} is required.`,
      400,
      "INVALID_OBJECT_ID"
    );
  }
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

/* =========================================================
   DATE HELPERS
========================================================= */

const normalizeMetricDate = (value) => {
  const date = value instanceof Date
    ? new Date(value)
    : new Date(value || Date.now());

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(
      "A valid metricDate is required.",
      400,
      "INVALID_METRIC_DATE"
    );
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getDateRange = (metricDate) => {
  const start = normalizeMetricDate(metricDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

/* =========================================================
   MONEY HELPERS
========================================================= */

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
  Math.round((toNumber(value) + Number.EPSILON) * 10000) / 10000;

const toDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(roundMoney(value).toFixed(2));

const toPercentDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(roundPercent(value).toFixed(4));

const calculateMarginPercent = (profit, revenue) => {
  const normalizedRevenue = roundMoney(revenue);

  if (normalizedRevenue === 0) {
    return 0;
  }

  return roundPercent((roundMoney(profit) / normalizedRevenue) * 100);
};

/* =========================================================
   AGGREGATION HELPERS
========================================================= */

const aggregateFinancialEvents = (events) => {
  const totals = {
    grossRevenue: 0,
    discount: 0,
    cogs: 0,
    courierCost: 0,
    packagingCost: 0,
    paymentFee: 0,
    marketingCost: 0,
    operatingExpense: 0,
    financialCost: 0,
    tax: 0,
    inventoryLoss: 0,
  };

  for (const event of events) {
    const amount = Math.abs(roundMoney(event.amount));

    if (REVENUE_EVENT_TYPES.includes(event.eventType)) {
      totals.grossRevenue += amount;
      continue;
    }

    if (DISCOUNT_EVENT_TYPES.includes(event.eventType)) {
      totals.discount += amount;
      continue;
    }

    const targetField = COST_EVENT_MAP[event.eventType];

    if (targetField) {
      totals[targetField] += amount;
    }
  }

  for (const key of Object.keys(totals)) {
    totals[key] = roundMoney(totals[key]);
  }

  return totals;
};

const aggregateProfitCalculations = (calculations) => {
  const totals = {
    cogs: 0,
    grossProfit: 0,
    courierCost: 0,
    packagingCost: 0,
    paymentFee: 0,
    marketingCost: 0,
    operatingExpense: 0,
    financialCost: 0,
    tax: 0,
    netProfit: 0,
  };

  for (const calculation of calculations) {
    const summary = calculation.summary || {};

    totals.cogs += toNumber(summary.cogs);
    totals.grossProfit += toNumber(summary.grossProfit);
    totals.courierCost += toNumber(summary.courierCost);
    totals.packagingCost += toNumber(summary.packagingCost);
    totals.paymentFee += toNumber(summary.paymentFee);
    totals.marketingCost += toNumber(summary.marketingCost);
    totals.operatingExpense +=
      toNumber(summary.operatingExpense) +
      toNumber(summary.marketplaceFee);
    totals.financialCost += toNumber(summary.financialCost);
    totals.tax += toNumber(summary.tax);
    totals.netProfit += toNumber(summary.netProfit);
  }

  for (const key of Object.keys(totals)) {
    totals[key] = roundMoney(totals[key]);
  }

  return totals;
};

const getOrderQuantityMetrics = (orders) => {
  let productsSold = 0;
  let unitsSold = 0;

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];

    productsSold += items.length;

    for (const item of items) {
      unitsSold += Math.max(
        0,
        toNumber(item.quantity ?? item.qty ?? 0)
      );
    }
  }

  return {
    productsSold,
    unitsSold: Math.round(unitsSold),
  };
};

const resolveCustomerReferenceId = (
  order
) => {
  const candidates = [
    order.customerId,
    order.customer?._id,
    order.customer?.customerId,
    (
      order.customer instanceof
        mongoose.Types.ObjectId ||
      order.customer?._bsontype ===
        "ObjectId"
    )
      ? order.customer
      : null,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      mongoose.isValidObjectId(
        candidate
      )
    ) {
      return String(candidate);
    }
  }

  return null;
};

const resolveGuestCustomerKey = (
  order
) => {
  const customer =
    order.customer &&
    typeof order.customer ===
      "object"
      ? order.customer
      : {};

  const phone =
    String(
      customer.phone ||
      order.customerPhone ||
      ""
    )
      .trim()
      .replace(/[\s\-()]/g, "");

  if (phone) {
    return `phone:${phone}`;
  }

  const email =
    String(
      customer.email ||
      order.customerEmail ||
      ""
    )
      .trim()
      .toLowerCase();

  if (email) {
    return `email:${email}`;
  }

  const guestId =
    String(
      order.guestId || ""
    ).trim();

  return guestId
    ? `guest:${guestId}`
    : null;
};

const getCustomerMetrics = (
  orders,
  startDate
) => {
  const customerIds =
    new Set();

  const guestCustomerKeys =
    new Set();

  for (const order of orders) {
    const customerId =
      resolveCustomerReferenceId(
        order
      );

    if (customerId) {
      customerIds.add(
        customerId
      );

      continue;
    }

    const guestCustomerKey =
      resolveGuestCustomerKey(
        order
      );

    if (guestCustomerKey) {
      guestCustomerKeys.add(
        guestCustomerKey
      );
    }
  }

  return {
    customerIds:
      [...customerIds],
    guestCustomerKeys:
      [...guestCustomerKeys],
    startDate,
  };
};

/* =========================================================
   DATA ACCESS
========================================================= */

const getDailyOrders = async ({
  tenantId,
  start,
  end,
  session = null,
}) =>
  Order.find({
    tenant: tenantId,
    createdAt: {
      $gte: start,
      $lt: end,
    },
  })
    .select({
      status: 1,
      orderStatus: 1,
      items: 1,
      customer: 1,
      customerId: 1,
      customerPhone: 1,
      customerEmail: 1,
      guestId: 1,
      createdAt: 1,
    })
    .session(session || null)
    .lean();

const getDailyPostedEvents = async ({
  tenantId,
  start,
  end,
  session = null,
}) =>
  FinancialEvent.find({
    tenant: tenantId,
    status: "posted",
    accountingDate: {
      $gte: start,
      $lt: end,
    },
  })
    .select({
      eventType: 1,
      amount: 1,
      currency: 1,
    })
    .session(session || null)
    .lean();

const getDailyProfitCalculations = async ({
  tenantId,
  start,
  end,
  session = null,
}) =>
  ProfitCalculation.find({
    tenant: tenantId,
    status: "completed",
    calculatedAt: {
      $gte: start,
      $lt: end,
    },
  })
    .select({
      summary: 1,
      currency: 1,
      calculatedAt: 1,
    })
    .session(session || null)
    .lean();

const getReturningCustomerCount = async ({
  tenantId,
  customerIds,
  guestCustomerKeys = [],
  start,
  session = null,
}) => {
  let returningCustomerCount = 0;

  const validCustomerObjectIds =
    customerIds
      .filter((customerId) =>
        mongoose.isValidObjectId(
          customerId
        )
      )
      .map((customerId) =>
        new mongoose.Types.ObjectId(
          String(customerId)
        )
      );

  if (
    validCustomerObjectIds.length
  ) {
    const previousCustomers =
      await Order.distinct(
        "customer",
        {
          tenant: tenantId,
          customer: {
            $in:
              validCustomerObjectIds,
          },
          createdAt: {
            $lt: start,
          },
        },
        session
          ? { session }
          : undefined
      );

    returningCustomerCount +=
      previousCustomers.length;
  }

  if (guestCustomerKeys.length) {
    const guestConditions =
      guestCustomerKeys.map(
        (customerKey) => {
          const [
            keyType,
            ...valueParts
          ] =
            customerKey.split(":");

          const value =
            valueParts.join(":");

          if (
            keyType === "phone"
          ) {
            return {
              "customer.phone":
                value,
            };
          }

          if (
            keyType === "email"
          ) {
            return {
              "customer.email":
                value,
            };
          }

          if (
            keyType === "guest"
          ) {
            return {
              guestId: value,
            };
          }

          return null;
        }
      )
      .filter(Boolean);

    if (guestConditions.length) {
      const previousGuestOrders =
        await Order.find({
          tenant: tenantId,
          createdAt: {
            $lt: start,
          },
          $or:
            guestConditions,
        })
          .select({
            customer: 1,
            customerPhone: 1,
            customerEmail: 1,
            guestId: 1,
          })
          .session(
            session || null
          )
          .lean();

      const previousGuestKeys =
        new Set(
          previousGuestOrders
            .map((order) =>
              resolveGuestCustomerKey(
                order
              )
            )
            .filter(Boolean)
        );

      returningCustomerCount +=
        guestCustomerKeys.filter(
          (key) =>
            previousGuestKeys.has(
              key
            )
        ).length;
    }
  }

  return returningCustomerCount;
};

/* =========================================================
   MAIN AGGREGATION
========================================================= */

const aggregateDailyMetrics = async ({
  tenantId,
  metricDate,
  currency = DEFAULT_CURRENCY,
  calculationVersion = 1,
  session = null,
}) => {
  assertObjectId(tenantId, "tenantId");

  const normalizedDate = normalizeMetricDate(metricDate);
  const { start, end } = getDateRange(normalizedDate);

  const [orders, events, profitCalculations] = await Promise.all([
    getDailyOrders({
      tenantId,
      start,
      end,
      session,
    }),
    getDailyPostedEvents({
      tenantId,
      start,
      end,
      session,
    }),
    getDailyProfitCalculations({
      tenantId,
      start,
      end,
      session,
    }),
  ]);

  const eventTotals = aggregateFinancialEvents(events);
  const profitTotals = aggregateProfitCalculations(profitCalculations);
  const quantityMetrics = getOrderQuantityMetrics(orders);
  const customerMetricInput = getCustomerMetrics(orders, start);

  const returningCustomers = await getReturningCustomerCount({
    tenantId,
    customerIds:
      customerMetricInput.customerIds,
    guestCustomerKeys:
      customerMetricInput.guestCustomerKeys,
    start,
    session,
  });

  const totalUniqueCustomers =
    customerMetricInput.customerIds.length +
    customerMetricInput.guestCustomerKeys.length;
  const newCustomers = Math.max(
    0,
    totalUniqueCustomers - returningCustomers
  );

  const deliveredOrders = orders.filter((order) =>
    ["delivered", "completed"].includes(
      String(
        order.orderStatus ||
        order.status ||
        ""
      ).toLowerCase()
    )
  ).length;

  const cancelledOrders = orders.filter((order) =>
    ["cancelled", "canceled", "returned"].includes(
      String(
        order.orderStatus ||
        order.status ||
        ""
      ).toLowerCase()
    )
  ).length;

  const netRevenue = roundMoney(
    eventTotals.grossRevenue - eventTotals.discount
  );

  const cogs =
    profitCalculations.length > 0
      ? profitTotals.cogs
      : eventTotals.cogs;

  const grossProfit =
    profitCalculations.length > 0
      ? profitTotals.grossProfit
      : roundMoney(netRevenue - cogs);

  const courierCost =
    profitCalculations.length > 0
      ? profitTotals.courierCost
      : eventTotals.courierCost;

  const packagingCost =
    profitCalculations.length > 0
      ? profitTotals.packagingCost
      : eventTotals.packagingCost;

  const paymentFee =
    profitCalculations.length > 0
      ? profitTotals.paymentFee
      : eventTotals.paymentFee;

  const marketingCost =
    profitCalculations.length > 0
      ? profitTotals.marketingCost
      : eventTotals.marketingCost;

  const operatingExpense =
    profitCalculations.length > 0
      ? profitTotals.operatingExpense
      : eventTotals.operatingExpense;

  const financialCost =
    profitCalculations.length > 0
      ? profitTotals.financialCost
      : eventTotals.financialCost;

  const tax =
    profitCalculations.length > 0
      ? profitTotals.tax
      : eventTotals.tax;

  const netProfit =
    profitCalculations.length > 0
      ? profitTotals.netProfit
      : roundMoney(
          grossProfit -
            courierCost -
            packagingCost -
            paymentFee -
            marketingCost -
            operatingExpense -
            financialCost -
            tax
        );

  const payload = {
    tenant: tenantId,
    metricDate: normalizedDate,
    currency: normalizeCurrency(currency),
    sales: {
      orders: orders.length,
      deliveredOrders,
      cancelledOrders,
      grossRevenue: toDecimal128(eventTotals.grossRevenue),
      discount: toDecimal128(eventTotals.discount),
      netRevenue: toDecimal128(netRevenue),
    },
    profit: {
      cogs: toDecimal128(cogs),
      grossProfit: toDecimal128(grossProfit),
      courierCost: toDecimal128(courierCost),
      packagingCost: toDecimal128(packagingCost),
      paymentFee: toDecimal128(paymentFee),
      marketingCost: toDecimal128(marketingCost),
      operatingExpense: toDecimal128(operatingExpense),
      tax: toDecimal128(tax),
      netProfit: toDecimal128(netProfit),
      grossMarginPercent: toPercentDecimal128(
        calculateMarginPercent(grossProfit, netRevenue)
      ),
      netMarginPercent: toPercentDecimal128(
        calculateMarginPercent(netProfit, netRevenue)
      ),
    },
    inventory: {
      productsSold: quantityMetrics.productsSold,
      unitsSold: quantityMetrics.unitsSold,
      inventoryLoss: toDecimal128(eventTotals.inventoryLoss),
    },
    customers: {
      newCustomers,
      returningCustomers,
    },
    calculationVersion,
    sourceEventCount: events.length,
    generatedAt: new Date(),
    checksum: null,
  };

  return {
    payload,
    source: {
      orderCount: orders.length,
      eventCount: events.length,
      profitCalculationCount: profitCalculations.length,
    },
  };
};

/* =========================================================
   UPSERT WORKFLOW
========================================================= */

const upsertDailyMetrics = async ({
  tenantId,
  metricDate,
  currency = DEFAULT_CURRENCY,
  calculationVersion = 1,
  session = null,
}) => {
  const { payload, source } = await aggregateDailyMetrics({
    tenantId,
    metricDate,
    currency,
    calculationVersion,
    session,
  });

  const metric = await BusinessMetricDaily.findOneAndUpdate(
    {
      tenant: tenantId,
      metricDate: payload.metricDate,
    },
    {
      $set: payload,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      session: session || undefined,
    }
  );

  return {
    metric,
    source,
  };
};

const rebuildDateRange = async ({
  tenantId,
  startDate,
  endDate,
  currency = DEFAULT_CURRENCY,
  calculationVersion = 1,
  session = null,
}) => {
  assertObjectId(tenantId, "tenantId");

  const start = normalizeMetricDate(startDate);
  const end = normalizeMetricDate(endDate);

  if (start > end) {
    throw createHttpError(
      "startDate cannot be later than endDate.",
      400,
      "INVALID_DATE_RANGE"
    );
  }

  const results = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const result = await upsertDailyMetrics({
      tenantId,
      metricDate: new Date(cursor),
      currency,
      calculationVersion,
      session,
    });

    results.push(result);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return results;
};

/* =========================================================
   QUERY HELPERS
========================================================= */

const getDailyMetric = async ({
  tenantId,
  metricDate,
  session = null,
}) => {
  assertObjectId(tenantId, "tenantId");

  return BusinessMetricDaily.findOne({
    tenant: tenantId,
    metricDate: normalizeMetricDate(metricDate),
  }).session(session || null);
};

const getMetricRange = async ({
  tenantId,
  startDate,
  endDate,
  session = null,
}) => {
  assertObjectId(tenantId, "tenantId");

  const start = normalizeMetricDate(startDate);
  const end = normalizeMetricDate(endDate);
  end.setUTCDate(end.getUTCDate() + 1);

  return BusinessMetricDaily.find({
    tenant: tenantId,
    metricDate: {
      $gte: start,
      $lt: end,
    },
  })
    .sort({ metricDate: 1 })
    .session(session || null);
};

/* =========================================================
   TRANSACTION WRAPPERS
========================================================= */

const upsertDailyMetricsInTransaction = async (options) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await upsertDailyMetrics({
        ...options,
        session,
      });
    });

    return result;
  } finally {
    await session.endSession();
  }
};

const rebuildDateRangeInTransaction = async (options) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await rebuildDateRange({
        ...options,
        session,
      });
    });

    return result;
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  DEFAULT_CURRENCY,
  aggregateFinancialEvents,
  aggregateProfitCalculations,
  aggregateDailyMetrics,
  upsertDailyMetrics,
  upsertDailyMetricsInTransaction,
  rebuildDateRange,
  rebuildDateRangeInTransaction,
  getDailyMetric,
  getMetricRange,
};
