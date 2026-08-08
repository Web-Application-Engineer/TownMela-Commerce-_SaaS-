const crypto = require("crypto");
const mongoose = require("mongoose");

const FinancialEvent = require("../../models/FinancialEvent");
const ProfitCalculation = require("../../models/ProfitCalculation");
const SaleFinancialSnapshot = require(
  "../../models/SaleFinancialSnapshot"
);

/* =========================================================
   CONSTANTS
========================================================= */

const PROFIT_EVENT_TYPES = Object.freeze([
  "revenue",
  "discount",
  "refund",
  "cogs",
  "delivery_revenue",
  "courier_cost",
  "packaging_cost",
  "payment_fee",
  "marketplace_fee",
  "marketing_cost",
  "operating_expense",
  "financial_cost",
  "tax",
  "other_income",
  "other_expense",
]);

const DEFAULT_CALCULATION_VERSION = 1;
const DEFAULT_CURRENCY = "BDT";
const DEFAULT_SALES_CHANNEL = "website";
const SERVICE_VERSION = "2026.07.22-customer-objectid-fix";

/* =========================================================
   ERROR / VALIDATION HELPERS
========================================================= */

const createHttpError = (
  message,
  statusCode = 500,
  code = null
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
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
      `A valid ${fieldName} is required.`,
      400,
      "INVALID_OBJECT_ID"
    );
  }
};

const normalizeCurrency = (
  value
) => {
  if (typeof value !== "string") {
    return DEFAULT_CURRENCY;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : DEFAULT_CURRENCY;
};

const normalizeSalesChannel = (
  value
) => {
  if (typeof value !== "string") {
    return DEFAULT_SALES_CHANNEL;
  }

  const normalized =
    value.trim().toLowerCase();

  return normalized ||
    DEFAULT_SALES_CHANNEL;
};

/* =========================================================
   MONEY HELPERS
========================================================= */

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
    (toNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;

const roundPercent = (
  value
) =>
  Math.round(
    (toNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;

const toDecimal128 = (
  value
) =>
  mongoose.Types.Decimal128.fromString(
    roundMoney(value).toFixed(2)
  );

const calculateMarginPercent = (
  profit,
  revenue
) => {
  const normalizedRevenue =
    roundMoney(revenue);

  if (normalizedRevenue === 0) {
    return 0;
  }

  return roundPercent(
    (roundMoney(profit) /
      normalizedRevenue) *
      100
  );
};

/* =========================================================
   EVENT AGGREGATION
========================================================= */

const initializeEventTotals = () => ({
  revenue: 0,
  discount: 0,
  refund: 0,
  cogs: 0,
  deliveryRevenue: 0,
  courierCost: 0,
  packagingCost: 0,
  paymentFee: 0,
  marketplaceFee: 0,
  marketingCost: 0,
  operatingExpense: 0,
  financialCost: 0,
  tax: 0,
  otherIncome: 0,
  otherExpense: 0,
});

const getAbsoluteEventAmount = (
  event
) =>
  Math.abs(
    roundMoney(event.amount)
  );

const aggregateEvents = (
  events
) => {
  const totals =
    initializeEventTotals();

  for (const event of events) {
    const amount =
      getAbsoluteEventAmount(
        event
      );

    switch (event.eventType) {
      case "revenue":
        totals.revenue += amount;
        break;

      case "discount":
        totals.discount += amount;
        break;

      case "refund":
        totals.refund += amount;
        break;

      case "cogs":
        totals.cogs += amount;
        break;

      case "delivery_revenue":
        totals.deliveryRevenue +=
          amount;
        break;

      case "courier_cost":
        totals.courierCost +=
          amount;
        break;

      case "packaging_cost":
        totals.packagingCost +=
          amount;
        break;

      case "payment_fee":
        totals.paymentFee +=
          amount;
        break;

      case "marketplace_fee":
        totals.marketplaceFee +=
          amount;
        break;

      case "marketing_cost":
        totals.marketingCost +=
          amount;
        break;

      case "operating_expense":
        totals.operatingExpense +=
          amount;
        break;

      case "financial_cost":
        totals.financialCost +=
          amount;
        break;

      case "tax":
        totals.tax += amount;
        break;

      case "other_income":
        totals.otherIncome +=
          amount;
        break;

      case "other_expense":
        totals.otherExpense +=
          amount;
        break;

      default:
        break;
    }
  }

  for (
    const key of
    Object.keys(totals)
  ) {
    totals[key] =
      roundMoney(
        totals[key]
      );
  }

  return totals;
};

/* =========================================================
   PROFIT SUMMARY
========================================================= */

const buildProfitSummary = (
  eventTotals
) => {
  const grossRevenue =
    roundMoney(
      eventTotals.revenue +
        eventTotals.deliveryRevenue +
        eventTotals.otherIncome
    );

  const totalDiscount =
    roundMoney(
      eventTotals.discount +
        eventTotals.refund
    );

  const netRevenue =
    roundMoney(
      grossRevenue -
        totalDiscount
    );

  const cogs =
    roundMoney(
      eventTotals.cogs
    );

  const grossProfit =
    roundMoney(
      netRevenue - cogs
    );

  const courierCost =
    roundMoney(
      eventTotals.courierCost
    );

  const packagingCost =
    roundMoney(
      eventTotals.packagingCost
    );

  const paymentFee =
    roundMoney(
      eventTotals.paymentFee
    );

  const marketplaceFee =
    roundMoney(
      eventTotals.marketplaceFee
    );

  const marketingCost =
    roundMoney(
      eventTotals.marketingCost
    );

  const operatingExpense =
    roundMoney(
      eventTotals.operatingExpense +
        eventTotals.otherExpense
    );

  const financialCost =
    roundMoney(
      eventTotals.financialCost
    );

  const tax =
    roundMoney(
      eventTotals.tax
    );

  const netProfit =
    roundMoney(
      grossProfit -
        courierCost -
        packagingCost -
        paymentFee -
        marketplaceFee -
        marketingCost -
        operatingExpense -
        financialCost -
        tax
    );

  return {
    grossRevenue:
      toDecimal128(
        grossRevenue
      ),
    totalDiscount:
      toDecimal128(
        totalDiscount
      ),
    netRevenue:
      toDecimal128(
        netRevenue
      ),
    cogs:
      toDecimal128(cogs),
    grossProfit:
      toDecimal128(
        grossProfit
      ),
    courierCost:
      toDecimal128(
        courierCost
      ),
    packagingCost:
      toDecimal128(
        packagingCost
      ),
    paymentFee:
      toDecimal128(
        paymentFee
      ),
    marketplaceFee:
      toDecimal128(
        marketplaceFee
      ),
    marketingCost:
      toDecimal128(
        marketingCost
      ),
    operatingExpense:
      toDecimal128(
        operatingExpense
      ),
    financialCost:
      toDecimal128(
        financialCost
      ),
    tax:
      toDecimal128(tax),
    netProfit:
      toDecimal128(
        netProfit
      ),
    grossMarginPercent:
      toDecimal128(
        calculateMarginPercent(
          grossProfit,
          netRevenue
        )
      ),
    netMarginPercent:
      toDecimal128(
        calculateMarginPercent(
          netProfit,
          netRevenue
        )
      ),
  };
};

/* =========================================================
   SNAPSHOT MAPPING
========================================================= */

const resolveObjectIdReference = (
  value
) => {
  if (
    !value ||
    typeof value === "object" &&
      !(
        value instanceof
          mongoose.Types.ObjectId
      ) &&
      value?._bsontype !==
        "ObjectId"
  ) {
    return null;
  }

  return mongoose.isValidObjectId(
    value
  )
    ? new mongoose.Types.ObjectId(
        value
      )
    : null;
};

const resolveSnapshotCustomerId = (
  snapshot
) => {
  /*
    SaleFinancialSnapshot.customer একটি embedded customer object।
    ProfitCalculation.customer একটি Customer ObjectId reference।
    তাই embedded object কখনোই সরাসরি return করা যাবে না।
  */

  const embeddedCustomer =
    snapshot?.customer;

  const candidates = [
    embeddedCustomer?.customerId,
    snapshot?.customerId,
  ];

  for (
    const candidate of
    candidates
  ) {
    const objectId =
      resolveObjectIdReference(
        candidate
      );

    if (objectId) {
      return objectId;
    }
  }

  /*
    Guest order অথবা Customer collection reference না থাকলে
    ProfitCalculation.customer অবশ্যই null হবে।
  */

  return null;
};

const resolveOrderNumber = (
  snapshot,
  orderId
) => {
  const value =
    snapshot.orderNumber ||
    snapshot.order?.orderNumber ||
    String(orderId);

  return String(value)
    .trim()
    .toUpperCase();
};

/* =========================================================
   CHECKSUM
========================================================= */

const buildChecksum = ({
  tenantId,
  orderId,
  snapshotId,
  calculationVersion,
  eventIds,
  summary,
}) => {
  const checksumPayload = {
    tenantId:
      String(tenantId),
    orderId:
      String(orderId),
    snapshotId:
      String(snapshotId),
    calculationVersion,
    eventIds:
      eventIds
        .map((id) =>
          String(id)
        )
        .sort(),
    summary: Object.fromEntries(
      Object.entries(summary).map(
        ([key, value]) => [
          key,
          toNumber(value),
        ]
      )
    ),
  };

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        checksumPayload
      )
    )
    .digest("hex");
};

/* =========================================================
   DATA ACCESS
========================================================= */

const getFinalizedSnapshot = async ({
  tenantId,
  orderId,
  snapshotId = null,
  session = null,
}) => {
  const query = {
    tenant: tenantId,
    order: orderId,
    status: "finalized",
  };

  if (snapshotId) {
    assertObjectId(
      snapshotId,
      "snapshotId"
    );

    query._id =
      snapshotId;
  }

  const snapshot =
    await SaleFinancialSnapshot.findOne(
      query
    )
      .sort({
        snapshotVersion: -1,
      })
      .session(session || null);

  if (!snapshot) {
    throw createHttpError(
      "A finalized sale financial snapshot was not found for this order.",
      404,
      "FINALIZED_SNAPSHOT_NOT_FOUND"
    );
  }

  return snapshot;
};

const getPostedOrderEvents = async ({
  tenantId,
  orderId,
  snapshotId,
  session = null,
}) => {
  const query = {
    tenant: tenantId,
    order: orderId,
    status: "posted",
    eventType: {
      $in: PROFIT_EVENT_TYPES,
    },
  };

  /*
    Snapshot-specific events অগ্রাধিকার পাবে।
    Legacy order-level events-ও backward compatibility-এর জন্য
    অন্তর্ভুক্ত থাকবে।
  */

  if (snapshotId) {
    query.$or = [
      {
        saleFinancialSnapshot:
          snapshotId,
      },
      {
        saleFinancialSnapshot:
          null,
      },
      {
        saleFinancialSnapshot: {
          $exists: false,
        },
      },
    ];
  }

  return FinancialEvent.find(
    query
  )
    .sort({
      accountingDate: 1,
      createdAt: 1,
      _id: 1,
    })
    .session(session || null);
};

const getNextCalculationVersion = async ({
  tenantId,
  orderId,
  session = null,
}) => {
  const latest =
    await ProfitCalculation.findOne({
      tenant: tenantId,
      order: orderId,
    })
      .sort({
        calculationVersion: -1,
      })
      .select({
        calculationVersion: 1,
      })
      .session(session || null)
      .lean();

  return (
    Number(
      latest?.calculationVersion
    ) || 0
  ) + 1;
};

/* =========================================================
   MAIN CALCULATION WORKFLOW
========================================================= */

const calculateOrderProfit = async ({
  tenantId,
  orderId,
  snapshotId = null,
  forceRecalculate = false,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    orderId,
    "orderId"
  );

  const snapshot =
    await getFinalizedSnapshot({
      tenantId,
      orderId,
      snapshotId,
      session,
    });

  if (!forceRecalculate) {
    const existingCalculation =
      await ProfitCalculation.findOne({
        tenant: tenantId,
        order: orderId,
        saleFinancialSnapshot:
          snapshot._id,
        status: "completed",
      })
        .sort({
          calculationVersion: -1,
        })
        .session(session || null);

    if (existingCalculation) {
      return {
        calculation:
          existingCalculation,
        created: false,
        sourceEventCount:
          existingCalculation
            .sourceEventCount,
      };
    }
  }

  const events =
    await getPostedOrderEvents({
      tenantId,
      orderId,
      snapshotId:
        snapshot._id,
      session,
    });

  if (!events.length) {
    throw createHttpError(
      "No posted financial events were found for this order.",
      409,
      "POSTED_EVENTS_NOT_FOUND"
    );
  }

  const calculationVersion =
    await getNextCalculationVersion({
      tenantId,
      orderId,
      session,
    });

  const eventTotals =
    aggregateEvents(events);

  const summary =
    buildProfitSummary(
      eventTotals
    );

  const checksum =
    buildChecksum({
      tenantId,
      orderId,
      snapshotId:
        snapshot._id,
      calculationVersion,
      eventIds:
        events.map(
          (event) =>
            event._id
        ),
      summary,
    });

  const payload = {
    tenant: tenantId,
    order: orderId,
    orderNumber:
      resolveOrderNumber(
        snapshot,
        orderId
      ),
    saleFinancialSnapshot:
      snapshot._id,
    calculationVersion,
    status: "completed",
    currency:
      normalizeCurrency(
        snapshot.currency
      ),
    salesChannel:
      normalizeSalesChannel(
        snapshot.salesChannel ||
          snapshot.channel
      ),
    customer:
      resolveSnapshotCustomerId(
        snapshot
      ),
    calculatedAt:
      new Date(),
    summary,
    sourceEventCount:
      events.length,
    checksum,
    errorMessage: null,
  };

  let calculation;

  try {
    [calculation] =
      await ProfitCalculation.create(
        [payload],
        session
          ? { session }
          : undefined
      );
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateSafeCalculation =
        await ProfitCalculation.findOne({
          tenant: tenantId,
          order: orderId,
          saleFinancialSnapshot:
            snapshot._id,
          status: "completed",
        })
          .sort({
            calculationVersion: -1,
          })
          .session(session || null);

      if (
        duplicateSafeCalculation
      ) {
        return {
          calculation:
            duplicateSafeCalculation,
          created: false,
          sourceEventCount:
            duplicateSafeCalculation
              .sourceEventCount,
        };
      }
    }

    throw error;
  }

  await ProfitCalculation.updateMany(
    {
      tenant: tenantId,
      order: orderId,
      _id: {
        $ne:
          calculation._id,
      },
      status: "completed",
    },
    {
      $set: {
        status:
          "superseded",
      },
    },
    session
      ? { session }
      : undefined
  );

  return {
    calculation,
    created: true,
    sourceEventCount:
      events.length,
    eventTotals,
  };
};

/* =========================================================
   QUERY HELPERS
========================================================= */

const getLatestOrderProfit = async ({
  tenantId,
  orderId,
  completedOnly = true,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    orderId,
    "orderId"
  );

  const query = {
    tenant: tenantId,
    order: orderId,
  };

  if (completedOnly) {
    query.status =
      "completed";
  }

  return ProfitCalculation.findOne(
    query
  )
    .sort({
      calculationVersion: -1,
    })
    .session(session || null);
};

const getProfitCalculationHistory = async ({
  tenantId,
  orderId,
  limit = 20,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    orderId,
    "orderId"
  );

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  return ProfitCalculation.find({
    tenant: tenantId,
    order: orderId,
  })
    .sort({
      calculationVersion: -1,
    })
    .limit(safeLimit)
    .session(session || null);
};

/* =========================================================
   TRANSACTION WRAPPER
========================================================= */

const calculateOrderProfitInTransaction =
  async (options) => {
    const session =
      await mongoose.startSession();

    try {
      let result;

      await session.withTransaction(
        async () => {
          result =
            await calculateOrderProfit({
              ...options,
              session,
            });
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

const profitCalculationService = {
  SERVICE_VERSION,
  PROFIT_EVENT_TYPES,
  DEFAULT_CALCULATION_VERSION,
  DEFAULT_CURRENCY,
  DEFAULT_SALES_CHANNEL,
  aggregateEvents,
  buildProfitSummary,
  calculateOrderProfit,
  calculateProfitForOrder:
    calculateOrderProfit,
  calculateOrderProfitInTransaction,
  getLatestOrderProfit,
  getProfitCalculationHistory,
};

module.exports =
  profitCalculationService;

module.exports.default =
  profitCalculationService;
