"use strict";

const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/product");
const CourierShipment = require("../models/CourierShipment");
const ROISetting = require("../models/roiSettingModel");

const {
  normalizeSettings,
  calculateOrderProfitability,
  calculateProductLineProfitability,
  createEmptyProductSummary,
  mergeProductSummary,
  getPerformanceLabel,
  calculateDashboardSummary,
  roundMoney,
  toFiniteNumber,
  safeArray,
} = require("../utils/roiCalculator");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const DEFAULT_SORT = "-createdAt";

const ALLOWED_ORDER_SORT_FIELDS = new Set([
  "createdAt",
  "deliveredAt",
  "orderNumber",
  "totalAmount",
  "netRevenue",
  "totalCost",
  "netProfit",
  "marginPercent",
  "roiPercent",
]);

const ALLOWED_PRODUCT_SORT_FIELDS = new Set([
  "name",
  "soldQuantity",
  "orders",
  "grossRevenue",
  "revenue",
  "productCost",
  "allocatedCost",
  "totalCost",
  "netProfit",
  "marginPercent",
  "roiPercent",
]);

/* =========================================================
   BASIC HELPERS
========================================================= */

const createServiceError = (
  message,
  statusCode = 500,
  code = "ROI_SERVICE_ERROR",
  details = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
};

const assertValidObjectId = (
  value,
  fieldName = "ID"
) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(
      `${fieldName} is invalid`,
      400,
      "INVALID_OBJECT_ID"
    );
  }

  return new mongoose.Types.ObjectId(value);
};

const parsePositiveInteger = (
  value,
  fallback,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

const parsePagination = ({
  page,
  limit,
} = {}) => {
  const safePage = parsePositiveInteger(
    page,
    DEFAULT_PAGE
  );

  const safeLimit = parsePositiveInteger(
    limit,
    DEFAULT_LIMIT,
    MAX_LIMIT
  );

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const escapeRegex = (value) =>
  String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const normalizeSearch = (value) =>
  String(value || "").trim();

const normalizeStatusList = (value) => {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",");

  return [
    ...new Set(
      rawValues
        .map((status) =>
          String(status || "").trim()
        )
        .filter(Boolean)
    ),
  ];
};

const parseBoolean = (
  value,
  fallback = null
) => {
  if (
    value === true ||
    String(value).toLowerCase() === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    String(value).toLowerCase() === "false"
  ) {
    return false;
  }

  return fallback;
};

const normalizeDate = (
  value,
  endOfDay = false
) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createServiceError(
      `Invalid date: ${value}`,
      400,
      "INVALID_DATE"
    );
  }

  if (endOfDay) {
    date.setHours(
      23,
      59,
      59,
      999
    );
  } else {
    date.setHours(
      0,
      0,
      0,
      0
    );
  }

  return date;
};

const parseDateRange = ({
  startDate,
  endDate,
} = {}) => {
  const start = normalizeDate(
    startDate,
    false
  );

  const end = normalizeDate(
    endDate,
    true
  );

  if (
    start &&
    end &&
    start > end
  ) {
    throw createServiceError(
      "Start date cannot be after end date",
      400,
      "INVALID_DATE_RANGE"
    );
  }

  return {
    startDate: start,
    endDate: end,
  };
};

const buildDateFilter = ({
  startDate,
  endDate,
  dateField = "createdAt",
}) => {
  if (!startDate && !endDate) {
    return {};
  }

  const range = {};

  if (startDate) {
    range.$gte = startDate;
  }

  if (endDate) {
    range.$lte = endDate;
  }

  return {
    [dateField]: range,
  };
};

const parseSort = ({
  sort = DEFAULT_SORT,
  allowedFields,
  fallbackField = "createdAt",
  fallbackDirection = -1,
} = {}) => {
  const rawSort = String(
    sort || ""
  ).trim();

  const descending =
    rawSort.startsWith("-");

  const field = rawSort.replace(
    /^[-+]/,
    ""
  );

  if (
    !field ||
    !allowedFields.has(field)
  ) {
    return {
      field: fallbackField,
      direction:
        fallbackDirection,
    };
  }

  return {
    field,
    direction:
      descending ? -1 : 1,
  };
};

const compareValues = (
  left,
  right,
  direction
) => {
  const a =
    left === null ||
    left === undefined
      ? ""
      : left;

  const b =
    right === null ||
    right === undefined
      ? ""
      : right;

  if (
    typeof a === "string" ||
    typeof b === "string"
  ) {
    return (
      String(a).localeCompare(
        String(b),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      ) * direction
    );
  }

  return (
    (
      toFiniteNumber(a, 0) -
      toFiniteNumber(b, 0)
    ) * direction
  );
};

const paginateArray = (
  rows,
  {
    page,
    limit,
  }
) => {
  const total = rows.length;
  const totalPages =
    total === 0
      ? 0
      : Math.ceil(
          total / limit
        );

  const start =
    (page - 1) * limit;

  return {
    data: rows.slice(
      start,
      start + limit
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage:
        page < totalPages,
      hasPreviousPage:
        page > 1 &&
        totalPages > 0,
    },
  };
};

const getPlainObject = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value.toObject ===
    "function"
  ) {
    return value.toObject({
      virtuals: true,
    });
  }

  return value;
};

/* =========================================================
   SETTINGS
========================================================= */

const getOrCreateSettings = async (
  tenantId
) => {
  const tenantObjectId =
    assertValidObjectId(
      tenantId,
      "Tenant ID"
    );

  let settings = null;

  if (
    typeof ROISetting
      .findOrCreateForTenant ===
    "function"
  ) {
    settings =
      await ROISetting.findOrCreateForTenant(
        tenantObjectId
      );
  } else {
    settings =
      await ROISetting.findOne({
        tenant:
          tenantObjectId,
      });

    if (!settings) {
      const defaults =
        typeof ROISetting
          .getDefaults ===
        "function"
          ? ROISetting.getDefaults()
          : {};

      settings =
        await ROISetting.create({
          ...defaults,
          tenant:
            tenantObjectId,
        });
    }
  }

  return settings;
};

const getSettings = async ({
  tenantId,
} = {}) => {
  const settings =
    await getOrCreateSettings(
      tenantId
    );

  return getPlainObject(
    settings
  );
};

const updateSettings = async ({
  tenantId,
  payload = {},
  userId = null,
} = {}) => {
  const tenantObjectId =
    assertValidObjectId(
      tenantId,
      "Tenant ID"
    );

  const allowedFields = [
    "currency",
    "packagingCostPerOrder",
    "advertisingCostPerOrder",
    "transportCostPerOrder",
    "overheadCostPerOrder",
    "handlingCostPerOrder",
    "processingCostPerOrder",
    "otherCostPerOrder",
    "gatewayFeePercent",
    "includeCourierCost",
    "includePackagingCost",
    "includeGatewayFee",
    "includeAdvertisingCost",
    "includeTransportCost",
    "includeOverheadCost",
    "includeHandlingCost",
    "includeProcessingCost",
    "includeOtherCost",
    "includeDiscount",
    "includeRefund",
    "eligibleOrderStatuses",
    "isActive",
  ];

  const update = {};

  for (const field of allowedFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      update[field] =
        payload[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      update,
      "currency"
    )
  ) {
    update.currency =
      String(
        update.currency || ""
      )
        .trim()
        .toUpperCase();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      update,
      "eligibleOrderStatuses"
    )
  ) {
    update.eligibleOrderStatuses =
      normalizeStatusList(
        update
          .eligibleOrderStatuses
      );
  }

  const booleanFields = [
    "includeCourierCost",
    "includePackagingCost",
    "includeGatewayFee",
    "includeAdvertisingCost",
    "includeTransportCost",
    "includeOverheadCost",
    "includeHandlingCost",
    "includeProcessingCost",
    "includeOtherCost",
    "includeDiscount",
    "includeRefund",
    "isActive",
  ];

  for (const field of booleanFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        update,
        field
      )
    ) {
      const parsed =
        parseBoolean(
          update[field],
          null
        );

      if (parsed === null) {
        throw createServiceError(
          `${field} must be a boolean`,
          400,
          "INVALID_BOOLEAN"
        );
      }

      update[field] = parsed;
    }
  }

  if (userId) {
    update.updatedBy =
      assertValidObjectId(
        userId,
        "User ID"
      );
  }

  const existing =
    await getOrCreateSettings(
      tenantObjectId
    );

  Object.assign(
    existing,
    update
  );

  await existing.save();

  return getPlainObject(
    existing
  );
};

/* =========================================================
   ORDER QUERY HELPERS
========================================================= */

const buildEligibleOrderStatuses = (
  settings,
  status
) => {
  const requestedStatuses =
    normalizeStatusList(status);

  if (
    requestedStatuses.length >
    0
  ) {
    return requestedStatuses;
  }

  return normalizeStatusList(
    normalizeSettings(settings)
      .eligibleOrderStatuses
  );
};

const buildOrderMongoFilter = ({
  tenantId,
  settings,
  search,
  status,
  paymentStatus,
  startDate,
  endDate,
  dateField = "createdAt",
  productId = null,
} = {}) => {
  const tenantObjectId =
    assertValidObjectId(
      tenantId,
      "Tenant ID"
    );

  const filter = {
    tenant:
      tenantObjectId,
  };

  const eligibleStatuses =
    buildEligibleOrderStatuses(
      settings,
      status
    );

  if (
    eligibleStatuses.length >
    0
  ) {
    filter.orderStatus = {
      $in: eligibleStatuses,
    };
  }

  const paymentStatuses =
    normalizeStatusList(
      paymentStatus
    );

  if (
    paymentStatuses.length >
    0
  ) {
    filter.paymentStatus = {
      $in: paymentStatuses,
    };
  }

  Object.assign(
    filter,
    buildDateFilter({
      startDate,
      endDate,
      dateField,
    })
  );

  const normalizedSearch =
    normalizeSearch(search);

  if (normalizedSearch) {
    const regex = new RegExp(
      escapeRegex(
        normalizedSearch
      ),
      "i"
    );

    filter.$or = [
      {
        orderNumber:
          regex,
      },
      {
        "customer.fullName":
          regex,
      },
      {
        "customer.phone":
          regex,
      },
      {
        "customer.email":
          regex,
      },
    ];
  }

  if (productId) {
    filter["items.product"] =
      assertValidObjectId(
        productId,
        "Product ID"
      );
  }

  return filter;
};

const findLatestShipmentsByOrder = async ({
  tenantId,
  orderIds,
} = {}) => {
  if (
    !Array.isArray(orderIds) ||
    orderIds.length === 0
  ) {
    return new Map();
  }

  const tenantObjectId =
    assertValidObjectId(
      tenantId,
      "Tenant ID"
    );

  const shipments =
    await CourierShipment.find({
      tenant:
        tenantObjectId,
      order: {
        $in: orderIds,
      },
      shipmentType:
        "forward",
      isArchived: {
        $ne: true,
      },
    })
      .select({
        order: 1,
        shipmentNumber: 1,
        courierCode: 1,
        trackingNumber: 1,
        deliveryStatus: 1,
        deliveredAt: 1,
        createdAt: 1,
        "pricing.courierCharge": 1,
        "pricing.shippingCharge": 1,
        "pricing.returnCharge": 1,
        "pricing.currency": 1,
      })
      .sort({
        createdAt: -1,
      })
      .lean();

  const shipmentMap =
    new Map();

  for (const shipment of shipments) {
    const orderKey =
      String(
        shipment.order
      );

    if (
      !shipmentMap.has(
        orderKey
      )
    ) {
      shipmentMap.set(
        orderKey,
        shipment
      );
    }
  }

  return shipmentMap;
};

const mapOrderRow = ({
  order,
  shipment,
  settings,
} = {}) => {
  const profitability =
    calculateOrderProfitability({
      order,
      shipment,
      settings,
    });

  return {
    _id: order._id,
    orderId: order._id,
    orderNumber:
      order.orderNumber,
    orderStatus:
      order.orderStatus,
    paymentStatus:
      order.paymentStatus,

    customer: {
      fullName:
        order.customer
          ?.fullName || "",
      phone:
        order.customer
          ?.phone || "",
      email:
        order.customer
          ?.email || "",
    },

    createdAt:
      order.createdAt,
    deliveredAt:
      order.deliveredAt ||
      shipment?.deliveredAt ||
      null,

    totalAmount:
      roundMoney(
        order.totalAmount
      ),

    paidAmount:
      roundMoney(
        order.paidAmount
      ),

    refundedAmount:
      roundMoney(
        order.refundedAmount
      ),

    shipment: shipment
      ? {
          shipmentNumber:
            shipment
              .shipmentNumber,
          courierCode:
            shipment
              .courierCode,
          trackingNumber:
            shipment
              .trackingNumber,
          deliveryStatus:
            shipment
              .deliveryStatus,
          courierCharge:
            roundMoney(
              shipment
                ?.pricing
                ?.courierCharge
            ),
        }
      : null,

    ...profitability,
  };
};

const fetchProfitabilityRows = async ({
  tenantId,
  settings,
  filter,
} = {}) => {
  const orders =
    await Order.find(filter)
      .select({
        tenant: 1,
        orderNumber: 1,
        items: 1,
        customer: 1,
        subtotalAmount: 1,
        deliveryCharge: 1,
        itemDiscountAmount: 1,
        couponDiscountAmount: 1,
        manualDiscountAmount: 1,
        shippingDiscountAmount: 1,
        discountAmount: 1,
        taxAmount: 1,
        totalAmount: 1,
        paidAmount: 1,
        refundedAmount: 1,
        orderStatus: 1,
        paymentStatus: 1,
        deliveredAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean();

  const orderIds =
    orders.map(
      (order) =>
        order._id
    );

  const shipmentMap =
    await findLatestShipmentsByOrder({
      tenantId,
      orderIds,
    });

  return orders.map(
    (order) =>
      mapOrderRow({
        order,
        shipment:
          shipmentMap.get(
            String(
              order._id
            )
          ) || null,
        settings,
      })
  );
};

/* =========================================================
   ORDERS
========================================================= */

const getOrders = async ({
  tenantId,
  query = {},
} = {}) => {
  const settingsDocument =
    await getOrCreateSettings(
      tenantId
    );

  const settings =
    normalizeSettings(
      getPlainObject(
        settingsDocument
      )
    );

  const {
    page,
    limit,
  } = parsePagination(
    query
  );

  const {
    startDate,
    endDate,
  } = parseDateRange(
    query
  );

  const dateField =
    query.dateField ===
    "deliveredAt"
      ? "deliveredAt"
      : "createdAt";

  const filter =
    buildOrderMongoFilter({
      tenantId,
      settings,
      search:
        query.search,
      status:
        query.status,
      paymentStatus:
        query.paymentStatus,
      startDate,
      endDate,
      dateField,
      productId:
        query.productId,
    });

  let rows =
    await fetchProfitabilityRows({
      tenantId,
      settings,
      filter,
    });

  const profitable =
    parseBoolean(
      query.profitable,
      null
    );

  if (
    profitable !== null
  ) {
    rows = rows.filter(
      (row) =>
        profitable
          ? row.netProfit > 0
          : row.netProfit <= 0
    );
  }

  const hasUnresolvedCost =
    parseBoolean(
      query.hasUnresolvedCost,
      null
    );

  if (
    hasUnresolvedCost !==
    null
  ) {
    rows = rows.filter(
      (row) =>
        Boolean(
          row.hasUnresolvedCost
        ) ===
        hasUnresolvedCost
    );
  }

  const minProfit =
    query.minProfit ===
      undefined ||
    query.minProfit === ""
      ? null
      : Number(
          query.minProfit
        );

  const maxProfit =
    query.maxProfit ===
      undefined ||
    query.maxProfit === ""
      ? null
      : Number(
          query.maxProfit
        );

  if (
    minProfit !== null &&
    Number.isFinite(
      minProfit
    )
  ) {
    rows = rows.filter(
      (row) =>
        row.netProfit >=
        minProfit
    );
  }

  if (
    maxProfit !== null &&
    Number.isFinite(
      maxProfit
    )
  ) {
    rows = rows.filter(
      (row) =>
        row.netProfit <=
        maxProfit
    );
  }

  const {
    field,
    direction,
  } = parseSort({
    sort:
      query.sort ||
      DEFAULT_SORT,
    allowedFields:
      ALLOWED_ORDER_SORT_FIELDS,
    fallbackField:
      "createdAt",
    fallbackDirection:
      -1,
  });

  rows.sort(
    (left, right) =>
      compareValues(
        left[field],
        right[field],
        direction
      )
  );

  const result =
    paginateArray(rows, {
      page,
      limit,
    });

  return {
    ...result,
    settings: {
      currency:
        settings.currency,
      eligibleOrderStatuses:
        settings
          .eligibleOrderStatuses,
    },
    filters: {
      startDate,
      endDate,
      dateField,
    },
  };
};

/* =========================================================
   PRODUCT PROFITABILITY
========================================================= */

const getProductKey = (
  item
) => {
  if (item?.product) {
    return String(
      item.product
    );
  }

  const fallbackName =
    String(
      item?.name || ""
    )
      .trim()
      .toLowerCase();

  const fallbackSku =
    String(
      item?.sku || ""
    )
      .trim()
      .toLowerCase();

  return [
    "snapshot",
    fallbackSku,
    fallbackName,
  ].join(":");
};

const getProducts = async ({
  tenantId,
  query = {},
} = {}) => {
  const settingsDocument =
    await getOrCreateSettings(
      tenantId
    );

  const settings =
    normalizeSettings(
      getPlainObject(
        settingsDocument
      )
    );

  const {
    page,
    limit,
  } = parsePagination(
    query
  );

  const {
    startDate,
    endDate,
  } = parseDateRange(
    query
  );

  const dateField =
    query.dateField ===
    "deliveredAt"
      ? "deliveredAt"
      : "createdAt";

  const filter =
    buildOrderMongoFilter({
      tenantId,
      settings,
      status:
        query.status,
      paymentStatus:
        query.paymentStatus,
      startDate,
      endDate,
      dateField,
      productId:
        query.productId,
    });

  const orders =
    await Order.find(filter)
      .select({
        orderNumber: 1,
        items: 1,
        subtotalAmount: 1,
        deliveryCharge: 1,
        itemDiscountAmount: 1,
        couponDiscountAmount: 1,
        manualDiscountAmount: 1,
        shippingDiscountAmount: 1,
        discountAmount: 1,
        taxAmount: 1,
        totalAmount: 1,
        paidAmount: 1,
        refundedAmount: 1,
        orderStatus: 1,
        paymentStatus: 1,
        deliveredAt: 1,
        createdAt: 1,
      })
      .lean();

  const shipmentMap =
    await findLatestShipmentsByOrder({
      tenantId,
      orderIds:
        orders.map(
          (order) =>
            order._id
        ),
    });

  const productMap =
    new Map();

  for (const order of orders) {
    const shipment =
      shipmentMap.get(
        String(order._id)
      ) || null;

    const orderProfitability =
      calculateOrderProfitability({
        order,
        shipment,
        settings,
      });

    const seenInOrder =
      new Set();

    for (
      const item of safeArray(
        order.items
      )
    ) {
      const line =
        calculateProductLineProfitability({
          item,
          order,
          orderProfitability,
        });

      const key =
        getProductKey(
          item
        );

      if (
        !productMap.has(
          key
        )
      ) {
        productMap.set(
          key,
          createEmptyProductSummary({
            productId:
              item.product ||
              null,
            name:
              item.name ||
              "",
            slug:
              item.slug ||
              null,
            sku:
              item.sku ||
              null,
            image:
              item.image ||
              "",
            currency:
              settings.currency,
          })
        );
      }

      const summary =
        productMap.get(
          key
        );

      const merged =
        mergeProductSummary(
          summary,
          line
        );

      /*
        mergeProductSummary counts each line as an order.
        Multiple variants/duplicate lines of one product in the
        same order must count as one order only.
      */
      if (
        seenInOrder.has(
          key
        )
      ) {
        merged.orders =
          Math.max(
            merged.orders - 1,
            0
          );
      } else {
        seenInOrder.add(
          key
        );
      }

      productMap.set(
        key,
        merged
      );
    }
  }

  let rows = [
    ...productMap.values(),
  ].map((row) => ({
    ...row,
    performance:
      getPerformanceLabel({
        soldQuantity:
          row.soldQuantity,
        netProfit:
          row.netProfit,
        marginPercent:
          row.marginPercent,
        roiPercent:
          row.roiPercent,
        hasCost:
          row.hasCost,
      }),
  }));

  const productIds =
    rows
      .map((row) =>
        row.productId
      )
      .filter(
        (id) =>
          mongoose.isValidObjectId(
            id
          )
      );

  if (
    productIds.length > 0
  ) {
    const products =
      await Product.find({
        _id: {
          $in: productIds,
        },
      })
        .select({
          name: 1,
          slug: 1,
          image: 1,
          images: 1,
          price: 1,
          stock: 1,
          category: 1,
        })
        .lean();

    const productDetailsMap =
      new Map(
        products.map(
          (product) => [
            String(
              product._id
            ),
            product,
          ]
        )
      );

    rows = rows.map(
      (row) => {
        const product =
          productDetailsMap.get(
            String(
              row.productId
            )
          );

        if (!product) {
          return row;
        }

        return {
          ...row,
          name:
            product.name ||
            row.name,
          slug:
            product.slug ||
            row.slug,
          image:
            product.image ||
            product.images?.[0] ||
            row.image,
          currentPrice:
            roundMoney(
              product.price
            ),
          currentStock:
            toFiniteNumber(
              product.stock,
              0
            ),
          category:
            product.category ||
            null,
        };
      }
    );
  }

  const search =
    normalizeSearch(
      query.search
    ).toLowerCase();

  if (search) {
    rows = rows.filter(
      (row) =>
        [
          row.name,
          row.slug,
          row.sku,
        ].some((value) =>
          String(
            value || ""
          )
            .toLowerCase()
            .includes(
              search
            )
        )
    );
  }

  const performance =
    normalizeStatusList(
      query.performance
    );

  if (
    performance.length > 0
  ) {
    rows = rows.filter(
      (row) =>
        performance.includes(
          row.performance
        )
    );
  }

  const hasCost =
    parseBoolean(
      query.hasCost,
      null
    );

  if (hasCost !== null) {
    rows = rows.filter(
      (row) =>
        row.hasCost ===
        hasCost
    );
  }

  const {
    field,
    direction,
  } = parseSort({
    sort:
      query.sort ||
      "-netProfit",
    allowedFields:
      ALLOWED_PRODUCT_SORT_FIELDS,
    fallbackField:
      "netProfit",
    fallbackDirection:
      -1,
  });

  rows.sort(
    (left, right) =>
      compareValues(
        left[field],
        right[field],
        direction
      )
  );

  const result =
    paginateArray(rows, {
      page,
      limit,
    });

  return {
    ...result,
    settings: {
      currency:
        settings.currency,
      eligibleOrderStatuses:
        settings
          .eligibleOrderStatuses,
    },
    filters: {
      startDate,
      endDate,
      dateField,
    },
  };
};

/* =========================================================
   DASHBOARD
========================================================= */

const buildDailyTrend = (
  rows
) => {
  const trendMap =
    new Map();

  for (const row of rows) {
    const sourceDate =
      row.deliveredAt ||
      row.createdAt;

    if (!sourceDate) {
      continue;
    }

    const date =
      new Date(
        sourceDate
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      continue;
    }

    const key =
      date
        .toISOString()
        .slice(0, 10);

    if (
      !trendMap.has(
        key
      )
    ) {
      trendMap.set(
        key,
        {
          date: key,
          orders: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        }
      );
    }

    const entry =
      trendMap.get(
        key
      );

    entry.orders += 1;
    entry.revenue =
      roundMoney(
        entry.revenue +
          row.netRevenue
      );
    entry.cost =
      roundMoney(
        entry.cost +
          row.totalCost
      );
    entry.profit =
      roundMoney(
        entry.profit +
          row.netProfit
      );
  }

  return [
    ...trendMap.values(),
  ].sort((left, right) =>
    left.date.localeCompare(
      right.date
    )
  );
};

const getDashboard = async ({
  tenantId,
  query = {},
} = {}) => {
  const settingsDocument =
    await getOrCreateSettings(
      tenantId
    );

  const settings =
    normalizeSettings(
      getPlainObject(
        settingsDocument
      )
    );

  const {
    startDate,
    endDate,
  } = parseDateRange(
    query
  );

  const dateField =
    query.dateField ===
    "deliveredAt"
      ? "deliveredAt"
      : "createdAt";

  const filter =
    buildOrderMongoFilter({
      tenantId,
      settings,
      status:
        query.status,
      paymentStatus:
        query.paymentStatus,
      startDate,
      endDate,
      dateField,
    });

  const rows =
    await fetchProfitabilityRows({
      tenantId,
      settings,
      filter,
    });

  const summary =
    calculateDashboardSummary(
      rows
    );

  const topProfitableOrders =
    [...rows]
      .sort(
        (left, right) =>
          right.netProfit -
          left.netProfit
      )
      .slice(0, 5);

  const topLossOrders =
    [...rows]
      .filter(
        (row) =>
          row.netProfit < 0
      )
      .sort(
        (left, right) =>
          left.netProfit -
          right.netProfit
      )
      .slice(0, 5);

  const recentOrders =
    [...rows]
      .sort(
        (left, right) =>
          new Date(
            right.createdAt
          ).getTime() -
          new Date(
            left.createdAt
          ).getTime()
      )
      .slice(0, 10);

  const costBreakdown =
    rows.reduce(
      (totals, row) => {
        totals.productCost +=
          row.productCost;
        totals.courierCost +=
          row.courierCost;
        totals.packagingCost +=
          row.packagingCost;
        totals.gatewayFee +=
          row.gatewayFee;
        totals.advertisingCost +=
          row.advertisingCost;
        totals.transportCost +=
          row.transportCost;
        totals.overheadCost +=
          row.overheadCost;
        totals.handlingCost +=
          row.handlingCost;
        totals.processingCost +=
          row.processingCost;
        totals.otherCost +=
          row.otherCost;

        return totals;
      },
      {
        productCost: 0,
        courierCost: 0,
        packagingCost: 0,
        gatewayFee: 0,
        advertisingCost: 0,
        transportCost: 0,
        overheadCost: 0,
        handlingCost: 0,
        processingCost: 0,
        otherCost: 0,
      }
    );

  for (
    const key of Object.keys(
      costBreakdown
    )
  ) {
    costBreakdown[key] =
      roundMoney(
        costBreakdown[key]
      );
  }

  return {
    summary,
    costBreakdown,
    trend:
      buildDailyTrend(
        rows
      ),
    topProfitableOrders,
    topLossOrders,
    recentOrders,
    dataQuality: {
      ordersWithMissingCost:
        rows.filter(
          (row) =>
            row.hasUnresolvedCost
        ).length,
      missingCostItemCount:
        rows.reduce(
          (total, row) =>
            total +
            toFiniteNumber(
              row.unresolvedCostItemCount,
              0
            ),
          0
        ),
    },
    settings: {
      currency:
        settings.currency,
      eligibleOrderStatuses:
        settings
          .eligibleOrderStatuses,
    },
    filters: {
      startDate,
      endDate,
      dateField,
    },
  };
};

/* =========================================================
   HEALTH
========================================================= */

const getHealth = async ({
  tenantId,
} = {}) => {
  const tenantObjectId =
    assertValidObjectId(
      tenantId,
      "Tenant ID"
    );

  const [
    settingsExists,
    orderCount,
    shipmentCount,
  ] = await Promise.all([
    ROISetting.exists({
      tenant:
        tenantObjectId,
    }),
    Order.countDocuments({
      tenant:
        tenantObjectId,
    }),
    CourierShipment.countDocuments({
      tenant:
        tenantObjectId,
      isArchived: {
        $ne: true,
      },
    }),
  ]);

  return {
    status: "ok",
    module: "roi",
    database:
      mongoose.connection
        .readyState === 1
        ? "connected"
        : "disconnected",
    settingsConfigured:
      Boolean(
        settingsExists
      ),
    orderCount,
    shipmentCount,
    checkedAt:
      new Date(),
  };
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getDashboard,
  getOrders,
  getProducts,
  getSettings,
  updateSettings,
  getHealth,

  // Exported for controlled reuse and testing.
  buildOrderMongoFilter,
  findLatestShipmentsByOrder,
  mapOrderRow,
};
