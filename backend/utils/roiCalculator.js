"use strict";

/* =========================================================
   ROI CALCULATOR

   Pure utility module.
   - No database access
   - No Express dependency
   - Safe against null/undefined/NaN
   - Uses Number values for compatibility with existing models
========================================================= */

/* =========================================================
   NUMBER HELPERS
========================================================= */

const toFiniteNumber = (
  value,
  fallback = 0
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const nonNegativeNumber = (
  value
) =>
  Math.max(
    toFiniteNumber(value, 0),
    0
  );

const roundMoney = (
  value,
  precision = 2
) => {
  const safePrecision = Math.min(
    Math.max(
      Math.trunc(
        toFiniteNumber(
          precision,
          2
        )
      ),
      0
    ),
    8
  );

  const multiplier =
    10 ** safePrecision;

  return (
    Math.round(
      (
        toFiniteNumber(
          value,
          0
        ) +
        Number.EPSILON
      ) *
        multiplier
    ) / multiplier
  );
};

const roundPercent = (
  value,
  precision = 2
) =>
  roundMoney(
    value,
    precision
  );

const safeDivide = (
  numerator,
  denominator,
  fallback = 0
) => {
  const safeNumerator =
    toFiniteNumber(
      numerator,
      0
    );

  const safeDenominator =
    toFiniteNumber(
      denominator,
      0
    );

  if (
    safeDenominator === 0
  ) {
    return fallback;
  }

  return (
    safeNumerator /
    safeDenominator
  );
};

const clamp = (
  value,
  min,
  max
) =>
  Math.min(
    Math.max(
      toFiniteNumber(
        value,
        min
      ),
      min
    ),
    max
  );

/* =========================================================
   ARRAY HELPERS
========================================================= */

const safeArray = (
  value
) =>
  Array.isArray(value)
    ? value
    : [];

const sumBy = (
  items,
  selector
) =>
  safeArray(items).reduce(
    (
      total,
      item,
      index
    ) => {
      try {
        return (
          total +
          toFiniteNumber(
            selector(
              item,
              index
            ),
            0
          )
        );
      } catch {
        return total;
      }
    },
    0
  );

/* =========================================================
   SETTINGS NORMALIZATION
========================================================= */

const DEFAULT_ROI_SETTINGS = {
  currency: "BDT",

  packagingCostPerOrder: 0,
  advertisingCostPerOrder: 0,
  transportCostPerOrder: 0,
  overheadCostPerOrder: 0,
  handlingCostPerOrder: 0,
  processingCostPerOrder: 0,
  otherCostPerOrder: 0,
  gatewayFeePercent: 0,

  includeCourierCost: true,
  includePackagingCost: true,
  includeGatewayFee: true,
  includeAdvertisingCost: true,
  includeTransportCost: true,
  includeOverheadCost: true,
  includeHandlingCost: true,
  includeProcessingCost: true,
  includeOtherCost: true,
  includeDiscount: true,
  includeRefund: true,

  eligibleOrderStatuses: [
    "Delivered",
    "Completed",
  ],

  isActive: true,
};

const normalizeSettings = (
  settings = {}
) => {
  const eligibleStatuses =
    safeArray(
      settings
        .eligibleOrderStatuses
    )
      .map((status) =>
        String(
          status || ""
        ).trim()
      )
      .filter(Boolean);

  return {
    currency:
      String(
        settings.currency ||
          DEFAULT_ROI_SETTINGS.currency
      )
        .trim()
        .toUpperCase() ||
      DEFAULT_ROI_SETTINGS.currency,

    packagingCostPerOrder:
      nonNegativeNumber(
        settings
          .packagingCostPerOrder
      ),

    advertisingCostPerOrder:
      nonNegativeNumber(
        settings
          .advertisingCostPerOrder
      ),

    transportCostPerOrder:
      nonNegativeNumber(settings.transportCostPerOrder),

    overheadCostPerOrder:
      nonNegativeNumber(settings.overheadCostPerOrder),

    handlingCostPerOrder:
      nonNegativeNumber(settings.handlingCostPerOrder),

    processingCostPerOrder:
      nonNegativeNumber(settings.processingCostPerOrder),

    otherCostPerOrder:
      nonNegativeNumber(settings.otherCostPerOrder),

    gatewayFeePercent:
      clamp(
        settings
          .gatewayFeePercent,
        0,
        100
      ),

    includeCourierCost:
      settings
        .includeCourierCost !==
      false,

    includePackagingCost:
      settings
        .includePackagingCost !==
      false,

    includeGatewayFee:
      settings
        .includeGatewayFee !==
      false,

    includeAdvertisingCost:
      settings
        .includeAdvertisingCost !==
      false,

    includeTransportCost:
      settings.includeTransportCost !== false,

    includeOverheadCost:
      settings.includeOverheadCost !== false,

    includeHandlingCost:
      settings.includeHandlingCost !== false,

    includeProcessingCost:
      settings.includeProcessingCost !== false,

    includeOtherCost:
      settings.includeOtherCost !== false,

    includeDiscount:
      settings
        .includeDiscount !==
      false,

    includeRefund:
      settings
        .includeRefund !==
      false,

    eligibleOrderStatuses:
      eligibleStatuses.length > 0
        ? [
            ...new Set(
              eligibleStatuses
            ),
          ]
        : [
            ...DEFAULT_ROI_SETTINGS
              .eligibleOrderStatuses,
          ],

    isActive:
      settings.isActive !==
      false,
  };
};

/* =========================================================
   ORDER ITEM CALCULATIONS
========================================================= */

const getItemQuantity = (
  item
) =>
  Math.max(
    Math.trunc(
      nonNegativeNumber(
        item?.quantity
      )
    ),
    0
  );

const getItemUnitPrice = (
  item
) =>
  nonNegativeNumber(
    item?.price ??
      item?.unitPrice
  );

const getItemLineRevenue = (
  item
) => {
  const explicitLineTotal =
    toFiniteNumber(
      item?.lineTotal,
      Number.NaN
    );

  if (
    Number.isFinite(
      explicitLineTotal
    )
  ) {
    return nonNegativeNumber(
      explicitLineTotal
    );
  }

  return roundMoney(
    getItemUnitPrice(
      item
    ) *
      getItemQuantity(
        item
      )
  );
};

const getItemDiscount = (
  item
) =>
  nonNegativeNumber(
    item?.itemDiscountAmount
  );

const getItemUnitCost = (
  item
) => {
  const explicitUnitCost =
    toFiniteNumber(
      item?.unitCost,
      Number.NaN
    );

  if (
    Number.isFinite(
      explicitUnitCost
    )
  ) {
    return nonNegativeNumber(
      explicitUnitCost
    );
  }

  const quantity =
    getItemQuantity(
      item
    );

  const lineCogs =
    toFiniteNumber(
      item?.lineCogs,
      Number.NaN
    );

  if (
    Number.isFinite(
      lineCogs
    ) &&
    quantity > 0
  ) {
    return nonNegativeNumber(
      safeDivide(
        lineCogs,
        quantity,
        0
      )
    );
  }

  return 0;
};

const getItemLineCogs = (
  item
) => {
  const explicitLineCogs =
    toFiniteNumber(
      item?.lineCogs,
      Number.NaN
    );

  if (
    Number.isFinite(
      explicitLineCogs
    )
  ) {
    return nonNegativeNumber(
      explicitLineCogs
    );
  }

  return roundMoney(
    getItemUnitCost(
      item
    ) *
      getItemQuantity(
        item
      )
  );
};

const isItemCostResolved = (
  item
) => {
  const unitCost =
    toFiniteNumber(
      item?.unitCost,
      Number.NaN
    );

  const lineCogs =
    toFiniteNumber(
      item?.lineCogs,
      Number.NaN
    );

  return (
    (
      Number.isFinite(
        unitCost
      ) &&
      unitCost >= 0
    ) ||
    (
      Number.isFinite(
        lineCogs
      ) &&
      lineCogs >= 0
    )
  );
};

const calculateOrderItems = (
  items
) => {
  const normalizedItems =
    safeArray(items);

  const quantity =
    sumBy(
      normalizedItems,
      (item) =>
        getItemQuantity(
          item
        )
    );

  const grossItemRevenue =
    sumBy(
      normalizedItems,
      (item) =>
        getItemLineRevenue(
          item
        )
    );

  const itemDiscount =
    sumBy(
      normalizedItems,
      (item) =>
        getItemDiscount(
          item
        )
    );

  const netItemRevenue =
    Math.max(
      grossItemRevenue -
        itemDiscount,
      0
    );

  const productCost =
    sumBy(
      normalizedItems,
      (item) =>
        getItemLineCogs(
          item
        )
    );

  const unresolvedCostItemCount =
    normalizedItems.filter(
      (item) =>
        !isItemCostResolved(
          item
        )
    ).length;

  return {
    itemCount:
      normalizedItems.length,

    quantity,

    grossItemRevenue:
      roundMoney(
        grossItemRevenue
      ),

    itemDiscount:
      roundMoney(
        itemDiscount
      ),

    netItemRevenue:
      roundMoney(
        netItemRevenue
      ),

    productCost:
      roundMoney(
        productCost
      ),

    unresolvedCostItemCount,

    hasUnresolvedCost:
      unresolvedCostItemCount >
      0,
  };
};

/* =========================================================
   ORDER FINANCIAL HELPERS
========================================================= */

const calculateOrderDiscount = (
  order
) => {
  const explicitDiscount =
    toFiniteNumber(
      order?.discountAmount,
      Number.NaN
    );

  const breakdownDiscount =
    nonNegativeNumber(
      order
        ?.itemDiscountAmount
    ) +
    nonNegativeNumber(
      order
        ?.couponDiscountAmount
    ) +
    nonNegativeNumber(
      order
        ?.manualDiscountAmount
    ) +
    nonNegativeNumber(
      order
        ?.shippingDiscountAmount
    );

  if (
    breakdownDiscount > 0
  ) {
    return roundMoney(
      breakdownDiscount
    );
  }

  if (
    Number.isFinite(
      explicitDiscount
    )
  ) {
    return roundMoney(
      nonNegativeNumber(
        explicitDiscount
      )
    );
  }

  return roundMoney(
    sumBy(
      order?.items,
      (item) =>
        getItemDiscount(
          item
        )
    )
  );
};

const calculateOrderGrossRevenue = (
  order
) => {
  const totalAmount =
    toFiniteNumber(
      order?.totalAmount,
      Number.NaN
    );

  if (
    Number.isFinite(
      totalAmount
    )
  ) {
    return roundMoney(
      nonNegativeNumber(
        totalAmount
      )
    );
  }

  const subtotal =
    toFiniteNumber(
      order?.subtotalAmount,
      Number.NaN
    );

  const itemRevenue =
    calculateOrderItems(
      order?.items
    ).grossItemRevenue;

  const baseSubtotal =
    Number.isFinite(
      subtotal
    )
      ? nonNegativeNumber(
          subtotal
        )
      : itemRevenue;

  const deliveryCharge =
    nonNegativeNumber(
      order?.deliveryCharge
    );

  const taxAmount =
    nonNegativeNumber(
      order?.taxAmount
    );

  const discount =
    calculateOrderDiscount(
      order
    );

  return roundMoney(
    Math.max(
      baseSubtotal +
        deliveryCharge +
        taxAmount -
        discount,
      0
    )
  );
};

const calculateRefundAmount = (
  order,
  settings
) => {
  if (
    !settings.includeRefund
  ) {
    return 0;
  }

  return roundMoney(
    nonNegativeNumber(
      order?.refundedAmount
    )
  );
};

const calculateNetRevenue = (
  order,
  settings
) => {
  const grossRevenue =
    calculateOrderGrossRevenue(
      order
    );

  const refundAmount =
    calculateRefundAmount(
      order,
      settings
    );

  /*
    totalAmount in the existing Order model already represents
    final payable amount after discount. Therefore discount is
    not deducted a second time here.
  */

  return roundMoney(
    Math.max(
      grossRevenue -
        refundAmount,
      0
    )
  );
};

const calculateProductCost = (
  order
) =>
  roundMoney(
    calculateOrderItems(
      order?.items
    ).productCost
  );

const calculateCourierCost = ({
  shipment,
  settings,
}) => {
  if (
    !settings
      .includeCourierCost
  ) {
    return 0;
  }

  return roundMoney(
    nonNegativeNumber(
      shipment?.pricing
        ?.courierCharge
    )
  );
};

const calculatePackagingCost = (
  settings
) => {
  if (
    !settings
      .includePackagingCost
  ) {
    return 0;
  }

  return roundMoney(
    settings
      .packagingCostPerOrder
  );
};

const calculateAdvertisingCost = (
  settings
) => {
  if (
    !settings
      .includeAdvertisingCost
  ) {
    return 0;
  }

  return roundMoney(
    settings
      .advertisingCostPerOrder
  );
};

const calculateGatewayFee = ({
  order,
  netRevenue,
  settings,
}) => {
  if (
    !settings
      .includeGatewayFee
  ) {
    return 0;
  }

  const rate =
    clamp(
      settings
        .gatewayFeePercent,
      0,
      100
    );

  /*
    Gateway fee is applied to net collected revenue.
    For COD this can remain 0 through settings.
  */

  const feeBase =
    Math.max(
      toFiniteNumber(
        netRevenue,
        calculateNetRevenue(
          order,
          settings
        )
      ),
      0
    );

  return roundMoney(
    feeBase *
      safeDivide(
        rate,
        100,
        0
      )
  );
};

const calculateTransportCost = (
  settings
) => {
  if (!settings.includeTransportCost) {
    return 0;
  }

  return roundMoney(
    settings.transportCostPerOrder
  );
};

const calculateOverheadCost = (
  settings
) => {
  if (!settings.includeOverheadCost) {
    return 0;
  }

  return roundMoney(
    settings.overheadCostPerOrder
  );
};

const calculateHandlingCost = (
  settings
) => {
  if (!settings.includeHandlingCost) {
    return 0;
  }

  return roundMoney(
    settings.handlingCostPerOrder
  );
};

const calculateProcessingCost = (
  settings
) => {
  if (!settings.includeProcessingCost) {
    return 0;
  }

  return roundMoney(
    settings.processingCostPerOrder
  );
};

const calculateConfiguredOtherCost = (
  settings
) => {
  if (!settings.includeOtherCost) {
    return 0;
  }

  return roundMoney(
    settings.otherCostPerOrder
  );
};

const calculateOtherCost = (
  values = []
) =>
  roundMoney(
    sumBy(
      values,
      (value) =>
        nonNegativeNumber(
          value
        )
    )
  );

const calculateTotalCost = ({
  productCost = 0,
  courierCost = 0,
  packagingCost = 0,
  gatewayFee = 0,
  advertisingCost = 0,
  transportCost = 0,
  overheadCost = 0,
  handlingCost = 0,
  processingCost = 0,
  otherCost = 0,
}) =>
  roundMoney(
    nonNegativeNumber(
      productCost
    ) +
      nonNegativeNumber(
        courierCost
      ) +
      nonNegativeNumber(
        packagingCost
      ) +
      nonNegativeNumber(
        gatewayFee
      ) +
      nonNegativeNumber(
        advertisingCost
      ) +
      nonNegativeNumber(
        transportCost
      ) +
      nonNegativeNumber(
        overheadCost
      ) +
      nonNegativeNumber(
        handlingCost
      ) +
      nonNegativeNumber(
        processingCost
      ) +
      nonNegativeNumber(
        otherCost
      )
  );

const calculateGrossProfit = ({
  netRevenue,
  productCost,
}) =>
  roundMoney(
    toFiniteNumber(
      netRevenue,
      0
    ) -
      nonNegativeNumber(
        productCost
      )
  );

const calculateNetProfit = ({
  netRevenue,
  totalCost,
}) =>
  roundMoney(
    toFiniteNumber(
      netRevenue,
      0
    ) -
      nonNegativeNumber(
        totalCost
      )
  );

const calculateMarginPercent = ({
  netProfit,
  netRevenue,
}) => {
  if (
    toFiniteNumber(
      netRevenue,
      0
    ) <= 0
  ) {
    return 0;
  }

  return roundPercent(
    safeDivide(
      netProfit,
      netRevenue,
      0
    ) * 100
  );
};

const calculateROIPercent = ({
  netProfit,
  totalCost,
}) => {
  if (
    toFiniteNumber(
      totalCost,
      0
    ) <= 0
  ) {
    return 0;
  }

  return roundPercent(
    safeDivide(
      netProfit,
      totalCost,
      0
    ) * 100
  );
};

/* =========================================================
   ORDER PROFITABILITY
========================================================= */

const calculateOrderProfitability = ({
  order,
  shipment = null,
  settings = {},
  otherCosts = [],
}) => {
  const normalizedSettings =
    normalizeSettings(
      settings
    );

  const itemSummary =
    calculateOrderItems(
      order?.items
    );

  const grossRevenue =
    calculateOrderGrossRevenue(
      order
    );

  const refundAmount =
    calculateRefundAmount(
      order,
      normalizedSettings
    );

  const netRevenue =
    calculateNetRevenue(
      order,
      normalizedSettings
    );

  const discountAmount =
    normalizedSettings
      .includeDiscount
      ? calculateOrderDiscount(
          order
        )
      : 0;

  const productCost =
    calculateProductCost(
      order
    );

  const courierCost =
    calculateCourierCost({
      shipment,
      settings:
        normalizedSettings,
    });

  const packagingCost =
    calculatePackagingCost(
      normalizedSettings
    );

  const advertisingCost =
    calculateAdvertisingCost(
      normalizedSettings
    );

  const gatewayFee =
    calculateGatewayFee({
      order,
      netRevenue,
      settings:
        normalizedSettings,
    });

  const transportCost =
    calculateTransportCost(
      normalizedSettings
    );

  const overheadCost =
    calculateOverheadCost(
      normalizedSettings
    );

  const handlingCost =
    calculateHandlingCost(
      normalizedSettings
    );

  const processingCost =
    calculateProcessingCost(
      normalizedSettings
    );

  const otherCost =
    roundMoney(
      calculateConfiguredOtherCost(
        normalizedSettings
      ) +
      calculateOtherCost(
        otherCosts
      )
    );

  const totalCost =
    calculateTotalCost({
      productCost,
      courierCost,
      packagingCost,
      gatewayFee,
      advertisingCost,
      transportCost,
      overheadCost,
      handlingCost,
      processingCost,
      otherCost,
    });

  const grossProfit =
    calculateGrossProfit({
      netRevenue,
      productCost,
    });

  const netProfit =
    calculateNetProfit({
      netRevenue,
      totalCost,
    });

  const marginPercent =
    calculateMarginPercent({
      netProfit,
      netRevenue,
    });

  const roiPercent =
    calculateROIPercent({
      netProfit,
      totalCost,
    });

  return {
    currency:
      order?.currency ||
      normalizedSettings
        .currency,

    grossRevenue,
    discountAmount,
    refundAmount,
    netRevenue,

    productCost,
    courierCost,
    packagingCost,
    gatewayFee,
    advertisingCost,
    transportCost,
    overheadCost,
    handlingCost,
    processingCost,
    otherCost,
    totalCost,

    grossProfit,
    netProfit,
    marginPercent,
    roiPercent,

    itemCount:
      itemSummary.itemCount,

    quantity:
      itemSummary.quantity,

    unresolvedCostItemCount:
      itemSummary
        .unresolvedCostItemCount,

    hasUnresolvedCost:
      itemSummary
        .hasUnresolvedCost,

    isProfitable:
      netProfit > 0,

    isLoss:
      netProfit < 0,

    isBreakEven:
      netProfit === 0,
  };
};

/* =========================================================
   PRODUCT PROFITABILITY
========================================================= */

const allocateOrderLevelCost = ({
  orderCost,
  itemRevenue,
  orderItemRevenue,
  itemQuantity,
  orderQuantity,
}) => {
  const safeOrderCost =
    nonNegativeNumber(
      orderCost
    );

  if (
    safeOrderCost === 0
  ) {
    return 0;
  }

  if (
    toFiniteNumber(
      orderItemRevenue,
      0
    ) > 0
  ) {
    return roundMoney(
      safeOrderCost *
        safeDivide(
          itemRevenue,
          orderItemRevenue,
          0
        )
    );
  }

  if (
    toFiniteNumber(
      orderQuantity,
      0
    ) > 0
  ) {
    return roundMoney(
      safeOrderCost *
        safeDivide(
          itemQuantity,
          orderQuantity,
          0
        )
    );
  }

  return 0;
};

const calculateProductLineProfitability = ({
  item,
  order,
  orderProfitability,
}) => {
  const quantity =
    getItemQuantity(
      item
    );

  const grossRevenue =
    getItemLineRevenue(
      item
    );

  const itemDiscount =
    getItemDiscount(
      item
    );

  const netRevenue =
    roundMoney(
      Math.max(
        grossRevenue -
          itemDiscount,
        0
      )
    );

  const productCost =
    getItemLineCogs(
      item
    );

  const orderItemsSummary =
    calculateOrderItems(
      order?.items
    );

  const allocatedCourierCost =
    allocateOrderLevelCost({
      orderCost:
        orderProfitability
          ?.courierCost,
      itemRevenue:
        netRevenue,
      orderItemRevenue:
        orderItemsSummary
          .netItemRevenue,
      itemQuantity:
        quantity,
      orderQuantity:
        orderItemsSummary
          .quantity,
    });

  const allocatedPackagingCost =
    allocateOrderLevelCost({
      orderCost:
        orderProfitability
          ?.packagingCost,
      itemRevenue:
        netRevenue,
      orderItemRevenue:
        orderItemsSummary
          .netItemRevenue,
      itemQuantity:
        quantity,
      orderQuantity:
        orderItemsSummary
          .quantity,
    });

  const allocatedGatewayFee =
    allocateOrderLevelCost({
      orderCost:
        orderProfitability
          ?.gatewayFee,
      itemRevenue:
        netRevenue,
      orderItemRevenue:
        orderItemsSummary
          .netItemRevenue,
      itemQuantity:
        quantity,
      orderQuantity:
        orderItemsSummary
          .quantity,
    });

  const allocatedAdvertisingCost =
    allocateOrderLevelCost({
      orderCost:
        orderProfitability
          ?.advertisingCost,
      itemRevenue:
        netRevenue,
      orderItemRevenue:
        orderItemsSummary
          .netItemRevenue,
      itemQuantity:
        quantity,
      orderQuantity:
        orderItemsSummary
          .quantity,
    });

  const allocatedTransportCost =
    allocateOrderLevelCost({
      orderCost: orderProfitability?.transportCost,
      itemRevenue: netRevenue,
      orderItemRevenue: orderItemsSummary.netItemRevenue,
      itemQuantity: quantity,
      orderQuantity: orderItemsSummary.quantity,
    });

  const allocatedOverheadCost =
    allocateOrderLevelCost({
      orderCost: orderProfitability?.overheadCost,
      itemRevenue: netRevenue,
      orderItemRevenue: orderItemsSummary.netItemRevenue,
      itemQuantity: quantity,
      orderQuantity: orderItemsSummary.quantity,
    });

  const allocatedHandlingCost =
    allocateOrderLevelCost({
      orderCost: orderProfitability?.handlingCost,
      itemRevenue: netRevenue,
      orderItemRevenue: orderItemsSummary.netItemRevenue,
      itemQuantity: quantity,
      orderQuantity: orderItemsSummary.quantity,
    });

  const allocatedProcessingCost =
    allocateOrderLevelCost({
      orderCost: orderProfitability?.processingCost,
      itemRevenue: netRevenue,
      orderItemRevenue: orderItemsSummary.netItemRevenue,
      itemQuantity: quantity,
      orderQuantity: orderItemsSummary.quantity,
    });

  const allocatedOtherCost =
    allocateOrderLevelCost({
      orderCost:
        orderProfitability
          ?.otherCost,
      itemRevenue:
        netRevenue,
      orderItemRevenue:
        orderItemsSummary
          .netItemRevenue,
      itemQuantity:
        quantity,
      orderQuantity:
        orderItemsSummary
          .quantity,
    });

  const allocatedCost =
    roundMoney(
      allocatedCourierCost +
        allocatedPackagingCost +
        allocatedGatewayFee +
        allocatedAdvertisingCost +
        allocatedTransportCost +
        allocatedOverheadCost +
        allocatedHandlingCost +
        allocatedProcessingCost +
        allocatedOtherCost
    );

  const totalCost =
    roundMoney(
      productCost +
        allocatedCost
    );

  const netProfit =
    calculateNetProfit({
      netRevenue,
      totalCost,
    });

  const marginPercent =
    calculateMarginPercent({
      netProfit,
      netRevenue,
    });

  const roiPercent =
    calculateROIPercent({
      netProfit,
      totalCost,
    });

  return {
    product:
      item?.product || null,

    variant:
      item?.variant || null,

    name:
      item?.name || "",

    slug:
      item?.slug || null,

    sku:
      item?.sku || null,

    image:
      item?.image || "",

    quantity,

    unitPrice:
      getItemUnitPrice(
        item
      ),

    grossRevenue,
    discountAmount:
      roundMoney(
        itemDiscount
      ),
    netRevenue,

    unitCost:
      roundMoney(
        getItemUnitCost(
          item
        )
      ),

    productCost:
      roundMoney(
        productCost
      ),

    allocatedCourierCost,
    allocatedPackagingCost,
    allocatedGatewayFee,
    allocatedAdvertisingCost,
    allocatedTransportCost,
    allocatedOverheadCost,
    allocatedHandlingCost,
    allocatedProcessingCost,
    allocatedOtherCost,
    allocatedCost,

    totalCost,
    netProfit,
    marginPercent,
    roiPercent,

    hasCost:
      isItemCostResolved(
        item
      ),

    costingMethod:
      item?.costingMethod ||
      "unresolved",

    costSource:
      item?.costSource ||
      "unresolved",
  };
};

/* =========================================================
   PRODUCT SUMMARY AGGREGATION
========================================================= */

const createEmptyProductSummary = ({
  productId = null,
  name = "",
  slug = null,
  sku = null,
  image = "",
  currency = "BDT",
} = {}) => ({
  productId,
  name,
  slug,
  sku,
  image,
  currency,

  soldQuantity: 0,
  orders: 0,

  grossRevenue: 0,
  discountAmount: 0,
  revenue: 0,

  productCost: 0,
  allocatedCost: 0,
  totalCost: 0,

  netProfit: 0,
  marginPercent: 0,
  roiPercent: 0,

  hasCost: true,
  unresolvedCostLines: 0,
});

const mergeProductSummary = (
  summary,
  line
) => {
  const next = {
    ...summary,
  };

  next.soldQuantity +=
    nonNegativeNumber(
      line?.quantity
    );

  next.orders += 1;

  next.grossRevenue +=
    nonNegativeNumber(
      line?.grossRevenue
    );

  next.discountAmount +=
    nonNegativeNumber(
      line?.discountAmount
    );

  next.revenue +=
    nonNegativeNumber(
      line?.netRevenue
    );

  next.productCost +=
    nonNegativeNumber(
      line?.productCost
    );

  next.allocatedCost +=
    nonNegativeNumber(
      line?.allocatedCost
    );

  next.totalCost +=
    nonNegativeNumber(
      line?.totalCost
    );

  next.netProfit +=
    toFiniteNumber(
      line?.netProfit,
      0
    );

  if (
    line?.hasCost === false
  ) {
    next.hasCost = false;
    next.unresolvedCostLines += 1;
  }

  next.grossRevenue =
    roundMoney(
      next.grossRevenue
    );

  next.discountAmount =
    roundMoney(
      next.discountAmount
    );

  next.revenue =
    roundMoney(
      next.revenue
    );

  next.productCost =
    roundMoney(
      next.productCost
    );

  next.allocatedCost =
    roundMoney(
      next.allocatedCost
    );

  next.totalCost =
    roundMoney(
      next.totalCost
    );

  next.netProfit =
    roundMoney(
      next.netProfit
    );

  next.marginPercent =
    calculateMarginPercent({
      netProfit:
        next.netProfit,
      netRevenue:
        next.revenue,
    });

  next.roiPercent =
    calculateROIPercent({
      netProfit:
        next.netProfit,
      totalCost:
        next.totalCost,
    });

  return next;
};

/* =========================================================
   PERFORMANCE LABEL
========================================================= */

const getPerformanceLabel = ({
  soldQuantity = 0,
  netProfit = 0,
  marginPercent = 0,
  roiPercent = 0,
  hasCost = true,
}) => {
  if (!hasCost) {
    return "cost-missing";
  }

  if (
    nonNegativeNumber(
      soldQuantity
    ) <= 0
  ) {
    return "no-sales";
  }

  if (
    toFiniteNumber(
      netProfit,
      0
    ) < 0
  ) {
    return "loss";
  }

  if (
    toFiniteNumber(
      marginPercent,
      0
    ) < 10
  ) {
    return "low-margin";
  }

  if (
    toFiniteNumber(
      roiPercent,
      0
    ) >= 50
  ) {
    return "high-profit";
  }

  return "profitable";
};

/* =========================================================
   DASHBOARD SUMMARY
========================================================= */

const calculateDashboardSummary = (
  profitabilityRows
) => {
  const rows =
    safeArray(
      profitabilityRows
    );

  const deliveredOrders =
    rows.length;

  const totalRevenue =
    sumBy(
      rows,
      (row) =>
        row?.netRevenue
    );

  const totalCost =
    sumBy(
      rows,
      (row) =>
        row?.totalCost
    );

  const netProfit =
    sumBy(
      rows,
      (row) =>
        row?.netProfit
    );

  const profitableOrders =
    rows.filter(
      (row) =>
        toFiniteNumber(
          row?.netProfit,
          0
        ) > 0
    ).length;

  const lossOrders =
    rows.filter(
      (row) =>
        toFiniteNumber(
          row?.netProfit,
          0
        ) < 0
    ).length;

  const breakEvenOrders =
    rows.filter(
      (row) =>
        toFiniteNumber(
          row?.netProfit,
          0
        ) === 0
    ).length;

  const averageProfit =
    deliveredOrders > 0
      ? safeDivide(
          netProfit,
          deliveredOrders,
          0
        )
      : 0;

  const marginPercent =
    calculateMarginPercent({
      netProfit,
      netRevenue:
        totalRevenue,
    });

  const roiPercent =
    calculateROIPercent({
      netProfit,
      totalCost,
    });

  return {
    deliveredOrders,
    profitableOrders,
    lossOrders,
    breakEvenOrders,

    totalRevenue:
      roundMoney(
        totalRevenue
      ),

    totalCost:
      roundMoney(
        totalCost
      ),

    netProfit:
      roundMoney(
        netProfit
      ),

    averageProfit:
      roundMoney(
        averageProfit
      ),

    marginPercent,
    roiPercent,
  };
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  DEFAULT_ROI_SETTINGS,

  toFiniteNumber,
  nonNegativeNumber,
  roundMoney,
  roundPercent,
  safeDivide,
  clamp,
  safeArray,
  sumBy,

  normalizeSettings,

  getItemQuantity,
  getItemUnitPrice,
  getItemLineRevenue,
  getItemDiscount,
  getItemUnitCost,
  getItemLineCogs,
  isItemCostResolved,
  calculateOrderItems,

  calculateOrderDiscount,
  calculateOrderGrossRevenue,
  calculateRefundAmount,
  calculateNetRevenue,
  calculateProductCost,
  calculateCourierCost,
  calculatePackagingCost,
  calculateAdvertisingCost,
  calculateGatewayFee,
  calculateTransportCost,
  calculateOverheadCost,
  calculateHandlingCost,
  calculateProcessingCost,
  calculateConfiguredOtherCost,
  calculateOtherCost,
  calculateTotalCost,
  calculateGrossProfit,
  calculateNetProfit,
  calculateMarginPercent,
  calculateROIPercent,

  calculateOrderProfitability,

  allocateOrderLevelCost,
  calculateProductLineProfitability,
  createEmptyProductSummary,
  mergeProductSummary,
  getPerformanceLabel,

  calculateDashboardSummary,
};
