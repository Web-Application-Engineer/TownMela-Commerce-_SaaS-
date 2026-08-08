const mongoose = require("mongoose");

const FinancialEvent = require("../../models/FinancialEvent");
const SaleFinancialSnapshot = require(
  "../../models/SaleFinancialSnapshot"
);

/* =========================================================
   CONSTANTS
========================================================= */

const EVENT_DIRECTION_MAP = Object.freeze({
  revenue: "credit",
  discount: "debit",
  refund: "debit",
  cogs: "debit",
  delivery_revenue: "credit",
  courier_cost: "debit",
  packaging_cost: "debit",
  marketplace_fee: "debit",
  payment_fee: "debit",
  marketing_cost: "debit",
  operating_expense: "debit",
  financial_cost: "debit",
  tax: "credit",
  inventory_loss: "debit",
  inventory_adjustment: "debit",
  other_income: "credit",
  other_expense: "debit",
});

const ZERO_DECIMAL =
  mongoose.Types.Decimal128.fromString("0");

/* =========================================================
   HELPERS
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

const normalizeOptionalString = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
};

const normalizeCurrency = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "BDT";
  }

  const normalizedValue =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(
    normalizedValue
  )
    ? normalizedValue
    : "BDT";
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
    value &&
    typeof value === "object" &&
    value._bsontype === "Decimal128"
  ) {
    return Number(
      value.toString()
    );
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
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

const toDecimal128 = (
  value
) => {
  const roundedValue =
    roundMoney(value);

  return mongoose.Types.Decimal128.fromString(
    roundedValue.toFixed(2)
  );
};

const isPositiveAmount = (
  value
) =>
  roundMoney(value) > 0;

const oppositeDirection = (
  direction
) => {
  if (direction === "credit") {
    return "debit";
  }

  if (direction === "debit") {
    return "credit";
  }

  throw createHttpError(
    "Invalid financial event direction.",
    422,
    "INVALID_EVENT_DIRECTION"
  );
};

const buildIdempotencyKey = ({
  sourceType,
  sourceId,
  eventType,
  eventVersion = 1,
  suffix = null,
}) => {
  const parts = [
    sourceType,
    String(sourceId),
    eventType,
    `v${eventVersion}`,
  ];

  if (suffix) {
    parts.push(
      String(suffix)
        .trim()
        .toLowerCase()
    );
  }

  return parts.join(":");
};

const normalizeAccountingDate = (
  value
) => {
  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(
          value || Date.now()
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createHttpError(
      "A valid accountingDate is required.",
      400,
      "INVALID_ACCOUNTING_DATE"
    );
  }

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const getDefaultDirection = (
  eventType
) => {
  const direction =
    EVENT_DIRECTION_MAP[
      eventType
    ];

  if (!direction) {
    throw createHttpError(
      `Unsupported financial event type: ${eventType}`,
      422,
      "UNSUPPORTED_EVENT_TYPE"
    );
  }

  return direction;
};

const getCustomerId = (
  snapshot
) =>
  snapshot.customer?.customerId ||
  null;

const getOccurredAt = (
  snapshot
) =>
  snapshot.orderDeliveredAt ||
  snapshot.orderConfirmedAt ||
  snapshot.orderCreatedAt ||
  snapshot.finalizedAt ||
  snapshot.createdAt ||
  new Date();

const getAccountingDate = (
  snapshot
) =>
  normalizeAccountingDate(
    snapshot.orderDeliveredAt ||
      snapshot.orderConfirmedAt ||
      snapshot.orderCreatedAt ||
      snapshot.finalizedAt ||
      snapshot.createdAt
  );

const createDuplicateSafe = async ({
  payload,
  session = null,
}) => {
  try {
    const [createdEvent] =
      await FinancialEvent.create(
        [payload],
        session
          ? { session }
          : undefined
      );

    return {
      event: createdEvent,
      created: true,
    };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existingEvent =
      await FinancialEvent.findOne({
        tenant: payload.tenant,
        idempotencyKey:
          payload.idempotencyKey,
      }).session(
        session || null
      );

    if (!existingEvent) {
      throw error;
    }

    return {
      event: existingEvent,
      created: false,
    };
  }
};

/* =========================================================
   GENERIC EVENT CREATION
========================================================= */

const createEvent = async ({
  tenantId,
  idempotencyKey,
  eventType,
  direction = null,
  amount,
  currency = "BDT",
  sourceType,
  sourceId,
  orderId = null,
  orderNumber = null,
  saleFinancialSnapshotId = null,
  expenseId = null,
  productId = null,
  variantId = null,
  customerId = null,
  courierId = null,
  salesChannel = null,
  accountingDate,
  occurredAt = new Date(),
  calculationVersion = 1,
  eventVersion = 1,
  relatedEntities = [],
  metadata = {},
  status = "pending",
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    sourceId,
    "sourceId"
  );

  if (
    !idempotencyKey ||
    typeof idempotencyKey !==
      "string" ||
    !idempotencyKey.trim()
  ) {
    throw createHttpError(
      "A valid idempotencyKey is required.",
      400,
      "INVALID_IDEMPOTENCY_KEY"
    );
  }

  const normalizedAmount =
    roundMoney(amount);

  if (
    normalizedAmount < 0
  ) {
    throw createHttpError(
      "Financial event amount cannot be negative.",
      422,
      "NEGATIVE_EVENT_AMOUNT"
    );
  }

  const payload = {
    tenant: tenantId,
    idempotencyKey:
      idempotencyKey.trim(),
    eventType,
    direction:
      direction ||
      getDefaultDirection(
        eventType
      ),
    status,
    amount:
      toDecimal128(
        normalizedAmount
      ),
    currency:
      normalizeCurrency(
        currency
      ),
    sourceType,
    sourceId,
    order: orderId,
    orderNumber:
      normalizeOptionalString(
        orderNumber
      ),
    saleFinancialSnapshot:
      saleFinancialSnapshotId,
    expense: expenseId,
    product: productId,
    variant: variantId,
    customer: customerId,
    courier: courierId,
    salesChannel:
      normalizeOptionalString(
        salesChannel
      )?.toLowerCase() ||
      null,
    accountingDate:
      normalizeAccountingDate(
        accountingDate
      ),
    occurredAt:
      occurredAt ||
      new Date(),
    postedAt:
      status === "posted"
        ? new Date()
        : null,
    calculationVersion,
    eventVersion,
    relatedEntities:
      Array.isArray(
        relatedEntities
      )
        ? relatedEntities
        : [],
    reversalOf: null,
    reversedBy: null,
    failureReason: null,
    metadata: {
      generatedBy:
        metadata.generatedBy ||
        null,
      requestId:
        normalizeOptionalString(
          metadata.requestId
        ),
      batchId:
        normalizeOptionalString(
          metadata.batchId
        ),
      notes:
        normalizeOptionalString(
          metadata.notes
        ),
      tags:
        Array.isArray(
          metadata.tags
        )
          ? metadata.tags
          : [],
    },
  };

  return createDuplicateSafe({
    payload,
    session,
  });
};

/* =========================================================
   SNAPSHOT EVENT GENERATION
========================================================= */

const buildSnapshotEventDefinitions = (
  snapshot
) => {
  const totals =
    snapshot.totals || {};

  return [
    {
      eventType: "revenue",
      amount:
        totals.grossRevenue,
    },
    {
      eventType: "discount",
      amount:
        totals.totalDiscountAmount,
    },
    {
      eventType:
        "delivery_revenue",
      amount:
        totals.deliveryRevenue,
    },
    {
      eventType: "tax",
      amount:
        totals.taxAmount,
    },
    {
      eventType: "cogs",
      amount: totals.cogs,
    },
    {
      eventType: "refund",
      amount:
        totals.amountRefunded,
    },
  ].filter(
    ({ amount }) =>
      isPositiveAmount(
        amount
      )
  );
};

const createEventsFromSnapshot = async ({
  tenantId,
  snapshotId,
  postImmediately = true,
  generatedBy = null,
  requestId = null,
  batchId = null,
  notes = null,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    snapshotId,
    "snapshotId"
  );

  const snapshot =
    await SaleFinancialSnapshot.findOne(
      {
        _id: snapshotId,
        tenant: tenantId,
      }
    ).session(
      session || null
    );

  if (!snapshot) {
    throw createHttpError(
      "Sale financial snapshot not found.",
      404,
      "SNAPSHOT_NOT_FOUND"
    );
  }

  if (
    snapshot.status !==
    "finalized"
  ) {
    throw createHttpError(
      "Only a finalized sale financial snapshot can generate financial events.",
      409,
      "SNAPSHOT_NOT_FINALIZED"
    );
  }

  const definitions =
    buildSnapshotEventDefinitions(
      snapshot
    );

  const accountingDate =
    getAccountingDate(
      snapshot
    );

  const occurredAt =
    getOccurredAt(
      snapshot
    );

  const results = [];

  for (
    const definition of
    definitions
  ) {
    const eventVersion =
      snapshot.snapshotVersion ||
      1;

    const result =
      await createEvent({
        tenantId,
        idempotencyKey:
          buildIdempotencyKey({
            sourceType:
              "sale_financial_snapshot",
            sourceId:
              snapshot._id,
            eventType:
              definition.eventType,
            eventVersion,
          }),
        eventType:
          definition.eventType,
        amount:
          definition.amount,
        currency:
          snapshot.currency,
        sourceType:
          "sale_financial_snapshot",
        sourceId:
          snapshot._id,
        orderId:
          snapshot.order,
        orderNumber:
          snapshot.orderNumber,
        saleFinancialSnapshotId:
          snapshot._id,
        customerId:
          getCustomerId(
            snapshot
          ),
        salesChannel:
          snapshot.salesChannel,
        accountingDate,
        occurredAt,
        calculationVersion:
          snapshot.calculationVersion ||
          1,
        eventVersion,
        status:
          postImmediately
            ? "posted"
            : "pending",
        relatedEntities: [
          {
            entityType:
              "order",
            entityId:
              snapshot.order,
            label:
              snapshot.orderNumber,
          },
          {
            entityType:
              "sale_financial_snapshot",
            entityId:
              snapshot._id,
            label: `Snapshot v${snapshot.snapshotVersion}`,
          },
        ],
        metadata: {
          generatedBy,
          requestId,
          batchId,
          notes,
          tags: [
            "sale",
            "snapshot",
            definition.eventType,
          ],
        },
        session,
      });

    results.push({
      event:
        result.event,
      created:
        result.created,
    });
  }

  return {
    snapshot,
    events:
      results.map(
        (result) =>
          result.event
      ),
    createdCount:
      results.filter(
        (result) =>
          result.created
      ).length,
    existingCount:
      results.filter(
        (result) =>
          !result.created
      ).length,
  };
};

/* =========================================================
   EVENT POSTING
========================================================= */

const postEvent = async ({
  tenantId,
  eventId,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    eventId,
    "eventId"
  );

  const event =
    await FinancialEvent.findOne({
      _id: eventId,
      tenant: tenantId,
    }).session(
      session || null
    );

  if (!event) {
    throw createHttpError(
      "Financial event not found.",
      404,
      "FINANCIAL_EVENT_NOT_FOUND"
    );
  }

  if (
    event.status ===
    "posted"
  ) {
    return event;
  }

  if (
    event.status ===
    "reversed"
  ) {
    throw createHttpError(
      "A reversed financial event cannot be posted.",
      409,
      "EVENT_ALREADY_REVERSED"
    );
  }

  if (
    event.status ===
    "failed"
  ) {
    throw createHttpError(
      "A failed financial event cannot be posted directly.",
      409,
      "EVENT_FAILED"
    );
  }

  event.status = "posted";
  event.postedAt =
    new Date();
  event.failureReason =
    null;

  await event.save({
    session:
      session ||
      undefined,
  });

  return event;
};

const markEventFailed = async ({
  tenantId,
  eventId,
  reason,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    eventId,
    "eventId"
  );

  const event =
    await FinancialEvent.findOne({
      _id: eventId,
      tenant: tenantId,
    }).session(
      session || null
    );

  if (!event) {
    throw createHttpError(
      "Financial event not found.",
      404,
      "FINANCIAL_EVENT_NOT_FOUND"
    );
  }

  if (
    event.status ===
      "posted" ||
    event.status ===
      "reversed"
  ) {
    throw createHttpError(
      "Posted or reversed financial events cannot be marked as failed.",
      409,
      "IMMUTABLE_EVENT_STATUS"
    );
  }

  event.status = "failed";
  event.failureReason =
    normalizeOptionalString(
      reason
    ) ||
    "Financial event processing failed.";

  await event.save({
    session:
      session ||
      undefined,
  });

  return event;
};

/* =========================================================
   EVENT REVERSAL
========================================================= */

const reverseEvent = async ({
  tenantId,
  eventId,
  reason,
  generatedBy = null,
  requestId = null,
  session = null,
}) => {
  assertObjectId(
    tenantId,
    "tenantId"
  );

  assertObjectId(
    eventId,
    "eventId"
  );

  const originalEvent =
    await FinancialEvent.findOne({
      _id: eventId,
      tenant: tenantId,
    }).session(
      session || null
    );

  if (!originalEvent) {
    throw createHttpError(
      "Financial event not found.",
      404,
      "FINANCIAL_EVENT_NOT_FOUND"
    );
  }

  if (
    originalEvent.status ===
    "reversed"
  ) {
    const existingReversal =
      originalEvent.reversedBy
        ? await FinancialEvent.findOne({
            _id:
              originalEvent.reversedBy,
            tenant: tenantId,
          }).session(
            session || null
          )
        : null;

    return {
      originalEvent,
      reversalEvent:
        existingReversal,
      created: false,
    };
  }

  if (
    originalEvent.status !==
    "posted"
  ) {
    throw createHttpError(
      "Only a posted financial event can be reversed.",
      409,
      "EVENT_NOT_POSTED"
    );
  }

  const reversalKey =
    `${originalEvent.idempotencyKey}:reversal`;

  const reversalPayload = {
    tenant:
      originalEvent.tenant,
    idempotencyKey:
      reversalKey,
    eventType:
      originalEvent.eventType,
    direction:
      oppositeDirection(
        originalEvent.direction
      ),
    status: "posted",
    amount:
      originalEvent.amount,
    currency:
      originalEvent.currency,
    sourceType:
      originalEvent.sourceType,
    sourceId:
      originalEvent.sourceId,
    order:
      originalEvent.order,
    orderNumber:
      originalEvent.orderNumber,
    saleFinancialSnapshot:
      originalEvent.saleFinancialSnapshot,
    expense:
      originalEvent.expense,
    product:
      originalEvent.product,
    variant:
      originalEvent.variant,
    customer:
      originalEvent.customer,
    courier:
      originalEvent.courier,
    salesChannel:
      originalEvent.salesChannel,
    accountingDate:
      normalizeAccountingDate(
        new Date()
      ),
    occurredAt:
      new Date(),
    postedAt:
      new Date(),
    calculationVersion:
      originalEvent.calculationVersion,
    eventVersion:
      originalEvent.eventVersion +
      1,
    relatedEntities: [
      ...(originalEvent.relatedEntities ||
        []),
      {
        entityType:
          "financial_event",
        entityId:
          originalEvent._id,
        label:
          "Reversal of original event",
      },
    ],
    reversalOf:
      originalEvent._id,
    reversedBy: null,
    failureReason: null,
    metadata: {
      generatedBy,
      requestId:
        normalizeOptionalString(
          requestId
        ),
      batchId: null,
      notes:
        normalizeOptionalString(
          reason
        ) ||
        "Financial event reversal",
      tags: [
        "reversal",
        originalEvent.eventType,
      ],
    },
  };

  const result =
    await createDuplicateSafe({
      payload:
        reversalPayload,
      session,
    });

  originalEvent.status =
    "reversed";
  originalEvent.reversedBy =
    result.event._id;

  await originalEvent.save({
    session:
      session ||
      undefined,
  });

  return {
    originalEvent,
    reversalEvent:
      result.event,
    created:
      result.created,
  };
};

/* =========================================================
   QUERIES
========================================================= */

const getOrderLedger = async ({
  tenantId,
  orderId,
  status = null,
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

  if (status) {
    query.status =
      status;
  }

  return FinancialEvent.find(
    query
  )
    .sort({
      accountingDate: 1,
      createdAt: 1,
    })
    .session(
      session || null
    );
};

const getPostedEventsForDateRange =
  async ({
    tenantId,
    startDate,
    endDate,
    eventTypes = [],
    salesChannel = null,
    session = null,
  }) => {
    assertObjectId(
      tenantId,
      "tenantId"
    );

    const start =
      normalizeAccountingDate(
        startDate
      );

    const end =
      normalizeAccountingDate(
        endDate
      );

    end.setUTCDate(
      end.getUTCDate() + 1
    );

    const query = {
      tenant: tenantId,
      status: "posted",
      accountingDate: {
        $gte: start,
        $lt: end,
      },
    };

    if (
      Array.isArray(
        eventTypes
      ) &&
      eventTypes.length
    ) {
      query.eventType = {
        $in: eventTypes,
      };
    }

    if (salesChannel) {
      query.salesChannel =
        String(
          salesChannel
        )
          .trim()
          .toLowerCase();
    }

    return FinancialEvent.find(
      query
    )
      .sort({
        accountingDate: 1,
        createdAt: 1,
      })
      .session(
        session || null
      );
  };

/* =========================================================
   TRANSACTION WRAPPERS
========================================================= */

const createEventsFromSnapshotInTransaction =
  async (options) => {
    const session =
      await mongoose.startSession();

    try {
      let result;

      await session.withTransaction(
        async () => {
          result =
            await createEventsFromSnapshot({
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

const reverseEventInTransaction =
  async (options) => {
    const session =
      await mongoose.startSession();

    try {
      let result;

      await session.withTransaction(
        async () => {
          result =
            await reverseEvent({
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

module.exports = {
  ZERO_DECIMAL,
  EVENT_DIRECTION_MAP,
  buildIdempotencyKey,
  createEvent,
  createEventsFromSnapshot,
  createEventsFromSnapshotInTransaction,
  postEvent,
  markEventFailed,
  reverseEvent,
  reverseEventInTransaction,
  getOrderLedger,
  getPostedEventsForDateRange,
};
