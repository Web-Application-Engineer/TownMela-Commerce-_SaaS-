const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../../models/Order");
const SaleFinancialSnapshot = require(
  "../../models/SaleFinancialSnapshot"
);

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_CURRENCY = "BDT";
const DEFAULT_SALES_CHANNEL = "website";
const DEFAULT_CALCULATION_VERSION = 1;

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

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
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
  const allowedChannels = new Set([
    "website",
    "facebook",
    "daraz",
    "shopify",
    "pos",
    "manual",
    "other",
  ]);

  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : DEFAULT_SALES_CHANNEL;

  return allowedChannels.has(normalized)
    ? normalized
    : DEFAULT_SALES_CHANNEL;
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
   ORDER VALUE HELPERS
========================================================= */

const getItemQuantity = (
  item
) => {
  const quantity = Number(
    item.quantity ??
      item.qty ??
      0
  );

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    throw createHttpError(
      "Snapshot item quantity must be a positive integer.",
      422,
      "INVALID_SNAPSHOT_ITEM_QUANTITY"
    );
  }

  return quantity;
};

const getItemUnitPrice = (
  item
) =>
  roundMoney(
    item.unitPrice ??
      item.price ??
      item.salePrice ??
      item.sellingPrice ??
      item.productPrice ??
      0
  );

const getItemUnitCost = (
  item
) =>
  roundMoney(
    item.unitCost ??
      item.costPrice ??
      item.purchasePrice ??
      item.costSnapshot ??
      item.productCost ??
      0
  );

const getItemDiscount = (
  item
) =>
  roundMoney(
    item.itemDiscountAmount ??
      item.discountAmount ??
      item.discount ??
      item.itemDiscount ??
      0
  );

const getOrderCouponDiscount = (
  order
) =>
  roundMoney(
    order.couponDiscountAmount ??
      order.discountAmount ??
      order.discount?.couponAmount ??
      order.discount?.amount ??
      0
  );

const getOrderManualDiscount = (
  order
) =>
  roundMoney(
    order.manualDiscountAmount ??
      order.discount?.manualAmount ??
      0
  );

const getOrderShippingDiscount = (
  order
) =>
  roundMoney(
    order.shippingDiscountAmount ??
      order.deliveryDiscountAmount ??
      order.discount?.shippingAmount ??
      0
  );

const getOrderDeliveryRevenue = (
  order
) =>
  roundMoney(
    order.deliveryCharge ??
      order.shippingCharge ??
      order.courierCharge ??
      order.shippingAmount ??
      0
  );

const getOrderTax = (
  order
) =>
  roundMoney(
    order.taxAmount ??
      order.tax ??
      order.vatAmount ??
      order.vat ??
      0
  );

const getAmountPaid = (
  order
) => {
  const explicitAmount =
    order.amountPaid ??
    order.paidAmount ??
    order.payment?.paidAmount;

  if (
    explicitAmount !== undefined &&
    explicitAmount !== null
  ) {
    return roundMoney(explicitAmount);
  }

  return String(
    order.paymentStatus || ""
  ).toLowerCase() === "paid"
    ? roundMoney(
        order.totalAmount ??
          order.grandTotal ??
          0
      )
    : 0;
};

const getAmountRefunded = (
  order
) =>
  roundMoney(
    order.amountRefunded ??
      order.refundedAmount ??
      order.payment?.refundedAmount ??
      0
  );

const allocateDiscount = (
  grossLineAmounts,
  discountAmount
) => {
  const totalGross =
    grossLineAmounts.reduce(
      (sum, amount) =>
        sum + roundMoney(amount),
      0
    );

  if (
    totalGross <= 0 ||
    discountAmount <= 0
  ) {
    return grossLineAmounts.map(
      () => 0
    );
  }

  let allocated = 0;

  return grossLineAmounts.map(
    (amount, index) => {
      if (
        index ===
        grossLineAmounts.length - 1
      ) {
        return roundMoney(
          discountAmount -
            allocated
        );
      }

      const lineAllocation =
        roundMoney(
          discountAmount *
            (roundMoney(amount) /
              totalGross)
        );

      allocated =
        roundMoney(
          allocated +
            lineAllocation
        );

      return lineAllocation;
    }
  );
};

/* =========================================================
   SOURCE MAPPING
========================================================= */

const resolveCustomer = (
  order
) => {
  const customer =
    order.customer &&
    typeof order.customer ===
      "object"
      ? order.customer
      : {};

  const fullName =
    normalizeOptionalString(
      customer.fullName ??
        customer.name ??
        order.customerName
    );

  const phone =
    normalizeOptionalString(
      customer.phone ??
        order.customerPhone
    );

  if (!fullName || !phone) {
    throw createHttpError(
      "Order customer full name and phone are required for financial snapshot generation.",
      422,
      "SNAPSHOT_CUSTOMER_DATA_MISSING"
    );
  }

  const possibleCustomerId =
    customer._id ??
    customer.customerId ??
    order.customerId ??
    null;

  return {
    customerId:
      possibleCustomerId &&
      mongoose.isValidObjectId(
        possibleCustomerId
      )
        ? possibleCustomerId
        : null,
    fullName,
    phone,
    email:
      normalizeOptionalString(
        customer.email ??
          order.customerEmail
      ),
  };
};

const resolveOrderItemId = (
  item
) => {
  const candidate =
    item._id ??
    item.orderItemId ??
    null;

  if (
    candidate &&
    mongoose.isValidObjectId(
      candidate
    )
  ) {
    return candidate;
  }

  return new mongoose.Types.ObjectId();
};

const resolveProductId = (
  item
) => {
  const candidate =
    item.product?._id ??
    item.product ??
    item.productId ??
    null;

  if (
    !candidate ||
    !mongoose.isValidObjectId(
      candidate
    )
  ) {
    throw createHttpError(
      "Every snapshot item must reference a valid product.",
      422,
      "SNAPSHOT_PRODUCT_MISSING"
    );
  }

  return candidate;
};

const resolveVariantId = (
  item
) => {
  const candidate =
    item.variant?._id ??
    item.variant ??
    item.variantId ??
    null;

  return (
    candidate &&
    mongoose.isValidObjectId(
      candidate
    )
  )
    ? candidate
    : null;
};

const resolveCostingMethod = (
  item
) => {
  const allowed = new Set([
    "weighted_average",
    "fifo",
    "standard",
    "manual",
    "unresolved",
  ]);

  const candidate =
    String(
      item.costingMethod ||
        ""
    )
      .trim()
      .toLowerCase();

  if (allowed.has(candidate)) {
    return candidate;
  }

  return getItemUnitCost(item) > 0
    ? "manual"
    : "unresolved";
};

const resolveCostSource = (
  item
) => {
  const allowed = new Set([
    "product",
    "variant",
    "inventory_cost_layer",
    "purchase",
    "manual",
    "unresolved",
  ]);

  const candidate =
    String(
      item.costSource ||
        ""
    )
      .trim()
      .toLowerCase();

  if (allowed.has(candidate)) {
    return candidate;
  }

  return getItemUnitCost(item) > 0
    ? "manual"
    : "unresolved";
};

/* =========================================================
   SNAPSHOT PAYLOAD
========================================================= */

const buildSnapshotPayload = (
  order,
  snapshotVersion,
  {
    generatedBy = null,
    requestId = null,
    notes = null,
    source = "order_delivered",
  } = {}
) => {
  const sourceItems =
    Array.isArray(order.items)
      ? order.items
      : [];

  if (!sourceItems.length) {
    throw createHttpError(
      "Order does not contain any items.",
      422,
      "ORDER_ITEMS_MISSING"
    );
  }

  const itemGrossAmounts =
    sourceItems.map(
      (item) =>
        roundMoney(
          getItemQuantity(item) *
            getItemUnitPrice(item)
        )
    );

  const couponDiscount =
    getOrderCouponDiscount(order);

  const manualDiscount =
    getOrderManualDiscount(order);

  const shippingDiscount =
    getOrderShippingDiscount(order);

  const orderLevelProductDiscount =
    roundMoney(
      couponDiscount +
        manualDiscount
    );

  const allocatedOrderDiscounts =
    allocateDiscount(
      itemGrossAmounts,
      orderLevelProductDiscount
    );

  const snapshotItems =
    sourceItems.map(
      (item, index) => {
        const quantity =
          getItemQuantity(item);

        const unitPrice =
          getItemUnitPrice(item);

        const unitCost =
          getItemUnitCost(item);

        const grossLineRevenue =
          itemGrossAmounts[index];

        const itemDiscountAmount =
          roundMoney(
            getItemDiscount(item) +
              allocatedOrderDiscounts[
                index
              ]
          );

        const netLineRevenue =
          roundMoney(
            Math.max(
              0,
              grossLineRevenue -
                itemDiscountAmount
            )
          );

        const lineCogs =
          roundMoney(
            unitCost * quantity
          );

        const grossProfit =
          roundMoney(
            netLineRevenue -
              lineCogs
          );

        return {
          orderItemId:
            resolveOrderItemId(
              item
            ),
          product:
            resolveProductId(
              item
            ),
          variant:
            resolveVariantId(
              item
            ),
          name:
            normalizeOptionalString(
              item.name ??
                item.productName ??
                item.title
            ) ||
            "Unnamed item",
          sku:
            normalizeOptionalString(
              item.sku ??
                item.variantSku ??
                item.productSku
            ),
          quantity,
          unitPrice:
            toDecimal128(
              unitPrice
            ),
          grossLineRevenue:
            toDecimal128(
              grossLineRevenue
            ),
          itemDiscountAmount:
            toDecimal128(
              itemDiscountAmount
            ),
          netLineRevenue:
            toDecimal128(
              netLineRevenue
            ),
          unitCost:
            toDecimal128(
              unitCost
            ),
          lineCogs:
            toDecimal128(
              lineCogs
            ),
          grossProfit:
            toDecimal128(
              grossProfit
            ),
          grossMarginPercent:
            toDecimal128(
              calculateMarginPercent(
                grossProfit,
                netLineRevenue
              )
            ),
          costingMethod:
            resolveCostingMethod(
              item
            ),
          costSource:
            resolveCostSource(
              item
            ),
          selectedSize:
            normalizeOptionalString(
              item.selectedSize
            ),
          selectedColor:
            normalizeOptionalString(
              item.selectedColor
            ),
        };
      }
    );

  const itemDiscountAmount =
    roundMoney(
      sourceItems.reduce(
        (sum, item) =>
          sum +
          getItemDiscount(item),
        0
      )
    );

  const grossProductRevenue =
    roundMoney(
      snapshotItems.reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.grossLineRevenue
          ),
        0
      )
    );

  const totalDiscountAmount =
    roundMoney(
      itemDiscountAmount +
        couponDiscount +
        manualDiscount +
        shippingDiscount
    );

  const netProductRevenue =
    roundMoney(
      snapshotItems.reduce(
        (sum, item) =>
          sum +
          toNumber(
            item.netLineRevenue
          ),
        0
      )
    );

  const deliveryRevenue =
    roundMoney(
      Math.max(
        0,
        getOrderDeliveryRevenue(
          order
        ) -
          shippingDiscount
      )
    );

  const taxAmount =
    getOrderTax(order);

  const grossRevenue =
    roundMoney(
      grossProductRevenue +
        getOrderDeliveryRevenue(
          order
        ) +
        taxAmount
    );

  const netRevenue =
    roundMoney(
      netProductRevenue +
        deliveryRevenue +
        taxAmount
    );

  const cogs =
    roundMoney(
      snapshotItems.reduce(
        (sum, item) =>
          sum +
          toNumber(item.lineCogs),
        0
      )
    );

  const grossProfit =
    roundMoney(
      netRevenue - cogs
    );

  const amountPaid =
    getAmountPaid(order);

  const amountRefunded =
    getAmountRefunded(order);

  const outstandingAmount =
    roundMoney(
      Math.max(
        0,
        netRevenue -
          amountPaid +
          amountRefunded
      )
    );

  const orderCreatedAt =
    order.createdAt ||
    new Date();

  const orderConfirmedAt =
    order.confirmedAt ||
    order.processingAt ||
    order.lifecycle
      ?.processingAt ||
    null;

  const orderDeliveredAt =
    order.deliveredAt ||
    order.lifecycle
      ?.deliveredAt ||
    (
      String(
        order.orderStatus ||
          order.status ||
          ""
      ).toLowerCase() ===
      "delivered"
        ? new Date()
        : null
    );

  const checksumPayload = {
    orderId: String(order._id),
    snapshotVersion,
    netRevenue,
    cogs,
    grossProfit,
    itemCount:
      snapshotItems.length,
  };

  const checksum =
    crypto
      .createHash("sha256")
      .update(
        JSON.stringify(
          checksumPayload
        )
      )
      .digest("hex");

  return {
    tenant: order.tenant,
    order: order._id,
    orderNumber:
      order.orderNumber ||
      order.invoiceNumber ||
      String(order._id),
    snapshotVersion,
    calculationVersion:
      DEFAULT_CALCULATION_VERSION,
    status: "draft",
    salesChannel:
      normalizeSalesChannel(
        order.salesChannel ||
          order.channel
      ),
    currency:
      normalizeCurrency(
        order.currency
      ),
    customer:
      resolveCustomer(order),
    items:
      snapshotItems,
    totals: {
      grossRevenue:
        toDecimal128(
          grossRevenue
        ),
      itemDiscountAmount:
        toDecimal128(
          itemDiscountAmount
        ),
      couponDiscountAmount:
        toDecimal128(
          couponDiscount
        ),
      manualDiscountAmount:
        toDecimal128(
          manualDiscount
        ),
      shippingDiscountAmount:
        toDecimal128(
          shippingDiscount
        ),
      totalDiscountAmount:
        toDecimal128(
          totalDiscountAmount
        ),
      netProductRevenue:
        toDecimal128(
          netProductRevenue
        ),
      deliveryRevenue:
        toDecimal128(
          deliveryRevenue
        ),
      taxAmount:
        toDecimal128(
          taxAmount
        ),
      netRevenue:
        toDecimal128(
          netRevenue
        ),
      cogs:
        toDecimal128(
          cogs
        ),
      grossProfit:
        toDecimal128(
          grossProfit
        ),
      grossMarginPercent:
        toDecimal128(
          calculateMarginPercent(
            grossProfit,
            netRevenue
          )
        ),
      amountPaid:
        toDecimal128(
          amountPaid
        ),
      amountRefunded:
        toDecimal128(
          amountRefunded
        ),
      outstandingAmount:
        toDecimal128(
          outstandingAmount
        ),
    },
    orderCreatedAt,
    orderConfirmedAt,
    orderDeliveredAt,
    finalizedAt: null,
    reversalSnapshot: null,
    reversedBySnapshot: null,
    sourceMetadata: {
      source,
      sourceVersion: 1,
      generatedBy:
        generatedBy &&
        mongoose.isValidObjectId(
          generatedBy
        )
          ? generatedBy
          : null,
      generatedAt:
        new Date(),
      requestId:
        normalizeOptionalString(
          requestId
        ),
      notes:
        normalizeOptionalString(
          notes
        ),
    },
    checksum,
  };
};

/* =========================================================
   DATA ACCESS
========================================================= */

const getNextSnapshotVersion = async ({
  tenantId,
  orderId,
  session = null,
}) => {
  const latest =
    await SaleFinancialSnapshot.findOne({
      tenant: tenantId,
      order: orderId,
    })
      .sort({
        snapshotVersion: -1,
      })
      .select({
        snapshotVersion: 1,
      })
      .session(session || null)
      .lean();

  return (
    Number(
      latest?.snapshotVersion
    ) || 0
  ) + 1;
};

const getLatestSnapshot = async ({
  tenantId,
  orderId,
  finalizedOnly = false,
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

  if (finalizedOnly) {
    query.status = "finalized";
  }

  return SaleFinancialSnapshot.findOne(
    query
  )
    .sort({
      snapshotVersion: -1,
    })
    .session(session || null);
};

/* =========================================================
   CREATE / FINALIZE
========================================================= */

const createSnapshot = async ({
  tenantId,
  orderId,
  finalize = false,
  generatedBy = null,
  requestId = null,
  notes = null,
  source = "order_delivered",
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

  const existingFinalized =
    finalize
      ? await getLatestSnapshot({
          tenantId,
          orderId,
          finalizedOnly: true,
          session,
        })
      : null;

  if (existingFinalized) {
    return existingFinalized;
  }

  const order =
    await Order.findOne({
      _id: orderId,
      tenant: tenantId,
    }).session(session || null);

  if (!order) {
    throw createHttpError(
      "Order not found for the specified tenant.",
      404,
      "ORDER_NOT_FOUND"
    );
  }

  const snapshotVersion =
    await getNextSnapshotVersion({
      tenantId,
      orderId,
      session,
    });

  const payload =
    buildSnapshotPayload(
      order,
      snapshotVersion,
      {
        generatedBy,
        requestId,
        notes,
        source,
      }
    );

  if (finalize) {
    payload.status =
      "finalized";
    payload.finalizedAt =
      new Date();
  }

  try {
    const [snapshot] =
      await SaleFinancialSnapshot.create(
        [payload],
        session
          ? { session }
          : undefined
      );

    return snapshot;
  } catch (error) {
    if (
      error?.code === 11000 &&
      finalize
    ) {
      const duplicateSafeSnapshot =
        await getLatestSnapshot({
          tenantId,
          orderId,
          finalizedOnly: true,
          session,
        });

      if (
        duplicateSafeSnapshot
      ) {
        return duplicateSafeSnapshot;
      }
    }

    throw error;
  }
};

const finalizeSnapshot = async ({
  tenantId,
  snapshotId,
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
    await SaleFinancialSnapshot.findOne({
      _id: snapshotId,
      tenant: tenantId,
    }).session(session || null);

  if (!snapshot) {
    throw createHttpError(
      "Financial snapshot not found.",
      404,
      "SNAPSHOT_NOT_FOUND"
    );
  }

  if (
    snapshot.status ===
    "reversed"
  ) {
    throw createHttpError(
      "A reversed snapshot cannot be finalized.",
      409,
      "SNAPSHOT_REVERSED"
    );
  }

  if (
    snapshot.status ===
    "finalized"
  ) {
    return snapshot;
  }

  snapshot.status =
    "finalized";
  snapshot.finalizedAt =
    new Date();

  await snapshot.save({
    session:
      session || undefined,
  });

  return snapshot;
};

/* =========================================================
   REVERSAL

   Enterprise model-এ reversed snapshot-এর জন্য একটি
   reversalSnapshot reference বাধ্যতামূলক। তাই caller-কে
   reversal snapshot ID দিতে হবে।
========================================================= */

const reverseSnapshot = async ({
  tenantId,
  snapshotId,
  reversalSnapshotId,
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

  assertObjectId(
    reversalSnapshotId,
    "reversalSnapshotId"
  );

  const snapshot =
    await SaleFinancialSnapshot.findOne({
      _id: snapshotId,
      tenant: tenantId,
    }).session(session || null);

  if (!snapshot) {
    throw createHttpError(
      "Financial snapshot not found.",
      404,
      "SNAPSHOT_NOT_FOUND"
    );
  }

  if (
    snapshot.status ===
    "reversed"
  ) {
    return snapshot;
  }

  if (
    snapshot.status !==
    "finalized"
  ) {
    throw createHttpError(
      "Only a finalized snapshot can be reversed.",
      409,
      "SNAPSHOT_NOT_FINALIZED"
    );
  }

  snapshot.status =
    "reversed";
  snapshot.reversalSnapshot =
    reversalSnapshotId;

  await snapshot.save({
    session:
      session || undefined,
  });

  return snapshot;
};

/* =========================================================
   TRANSACTION WRAPPER
========================================================= */

const createSnapshotInTransaction =
  async (options) => {
    const session =
      await mongoose.startSession();

    try {
      let snapshot;

      await session.withTransaction(
        async () => {
          snapshot =
            await createSnapshot({
              ...options,
              session,
            });
        }
      );

      return snapshot;
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

const saleFinancialSnapshotService = {
  DEFAULT_CURRENCY,
  DEFAULT_SALES_CHANNEL,
  DEFAULT_CALCULATION_VERSION,
  buildSnapshotPayload,
  createSnapshot,
  createSnapshotInTransaction,
  finalizeSnapshot,
  reverseSnapshot,
  getLatestSnapshot,

  /*
    Backward-compatible aliases prevent controller/service API drift
    during staged deployments.
  */
  createSaleFinancialSnapshot:
    createSnapshot,
  generateSnapshot:
    createSnapshot,
};

module.exports =
  saleFinancialSnapshotService;

module.exports.default =
  saleFinancialSnapshotService;
