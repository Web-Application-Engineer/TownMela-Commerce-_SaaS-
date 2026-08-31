const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/product");
const Coupon = require("../models/Coupon");

const {
  getLiveStockClearanceCampaign,
  getStockClearanceUnitPrice,
} = require(
  "../services/stockClearancePricingService"
);

const unwrapServiceModule = (
  loadedModule
) =>
  loadedModule?.default ||
  loadedModule;

const requireServiceFunction = (
  service,
  functionNames,
  serviceName
) => {
  for (
    const functionName of
    functionNames
  ) {
    if (
      typeof service?.[
        functionName
      ] === "function"
    ) {
      return service[
        functionName
      ].bind(service);
    }
  }

  throw new Error(
    `${serviceName} does not export any supported function: ${functionNames.join(", ")}`
  );
};

const saleFinancialSnapshotService =
  unwrapServiceModule(
    require(
      "../services/financial/saleFinancialSnapshotService"
    )
  );

const financialEventService =
  unwrapServiceModule(
    require(
      "../services/financial/financialEventService"
    )
  );

const profitCalculationService =
  unwrapServiceModule(
    require(
      "../services/financial/profitCalculationService"
    )
  );

const businessMetricAggregationService =
  unwrapServiceModule(
    require(
      "../services/financial/businessMetricAggregationService"
    )
  );

const createSaleFinancialSnapshot =
  requireServiceFunction(
    saleFinancialSnapshotService,
    [
      "createSnapshot",
      "createSaleFinancialSnapshot",
      "generateSnapshot",
    ],
    "saleFinancialSnapshotService"
  );

const createFinancialEventsFromSnapshot =
  requireServiceFunction(
    financialEventService,
    [
      "createEventsFromSnapshot",
      "generateEventsFromSnapshot",
    ],
    "financialEventService"
  );

const calculateOrderProfit =
  requireServiceFunction(
    profitCalculationService,
    [
      "calculateOrderProfit",
      "calculateProfitForOrder",
    ],
    "profitCalculationService"
  );

const upsertDailyBusinessMetrics =
  requireServiceFunction(
    businessMetricAggregationService,
    [
      "upsertDailyMetrics",
      "aggregateAndUpsertDailyMetrics",
    ],
    "businessMetricAggregationService"
  );

/* =========================================================
   CONFIGURATION
========================================================= */

/*
  Delivery charge frontend থেকে বিশ্বাস করা হবে না।
  Backend-এর .env থেকে নেওয়া হবে।

  Example:
  DELIVERY_CHARGE=80
*/

const configuredDeliveryCharge = Number(
  process.env.DELIVERY_CHARGE ?? 0
);

const DEFAULT_DELIVERY_CHARGE =
  Number.isFinite(configuredDeliveryCharge) &&
  configuredDeliveryCharge >= 0
    ? configuredDeliveryCharge
    : 0;

/* =========================================================
   COMMON HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue || null;
};

const normalizeRequiredString = (
  value
) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizePhone = (phone) => {
  if (typeof phone !== "string") {
    return "";
  }

  return phone
    .trim()
    .replace(/[\s\-()]/g, "");
};

const isValidPhone = (phone) => {
  return /^\+?[0-9]{7,15}$/.test(
    phone
  );
};

const isValidGuestId = (guestId) => {
  return /^guest_[a-zA-Z0-9_-]{8,120}$/.test(
    String(guestId || "").trim()
  );
};

const normalizeQuantity = (
  quantity
) => {
  const parsedQuantity = Number(
    quantity
  );

  if (
    !Number.isInteger(
      parsedQuantity
    ) ||
    parsedQuantity < 1
  ) {
    return null;
  }

  return parsedQuantity;
};

const roundMoney = (amount) => {
  return (
    Math.round(
      (Number(amount) +
        Number.EPSILON) *
        100
    ) / 100
  );
};

const escapeRegExp = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};


const modelHasPath = (
  model,
  path
) => {
  return Boolean(
    model?.schema?.path(path)
  );
};

const applyTenantScope = (
  model,
  query,
  tenantId
) => {
  if (
    tenantId &&
    modelHasPath(model, "tenant")
  ) {
    query.tenant = tenantId;
  }

  return query;
};

const resolveTenantId = (
  req,
  {
    required = modelHasPath(
      Order,
      "tenant"
    ),
  } = {}
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
    if (required) {
      throw createHttpError(
        400,
        "Tenant context is required"
      );
    }

    return null;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      candidate
    )
  ) {
    throw createHttpError(
      400,
      "Invalid tenant context"
    );
  }

  return new mongoose.Types.ObjectId(
    candidate
  );
};

const setDocumentPathIfSupported = (
  document,
  path,
  value
) => {
  if (
    document?.schema?.path(path)
  ) {
    document.set(path, value);
    return true;
  }

  return false;
};


const resolveEnumCompatibleValue = (
  document,
  path,
  requestedValue
) => {
  const schemaPath =
    document?.schema?.path(path);

  const enumValues =
    schemaPath?.enumValues || [];

  if (!enumValues.length) {
    return requestedValue;
  }

  if (
    enumValues.includes(
      requestedValue
    )
  ) {
    return requestedValue;
  }

  const aliases = {
    processing: [
      "processing",
      "pending",
      "in_progress",
      "started",
    ],
    completed: [
      "completed",
      "success",
      "succeeded",
      "processed",
      "done",
    ],
    failed: [
      "failed",
      "error",
      "errored",
    ],
  };

  const candidates =
    aliases[requestedValue] || [
      requestedValue,
    ];

  return (
    candidates.find(
      (candidate) =>
        enumValues.includes(
          candidate
        )
    ) ||
    null
  );
};

const setEnumPathIfSupported = (
  document,
  path,
  requestedValue
) => {
  if (
    !document?.schema?.path(path)
  ) {
    return false;
  }

  const compatibleValue =
    resolveEnumCompatibleValue(
      document,
      path,
      requestedValue
    );

  if (
    compatibleValue === null
  ) {
    return false;
  }

  document.set(
    path,
    compatibleValue
  );

  return true;
};

const setLifecycleTimestamp = (
  order,
  orderStatus,
  timestamp
) => {
  const statusFieldMap = {
    Processing: [
      "processingAt",
      "lifecycle.processingAt",
    ],
    Shipped: [
      "shippedAt",
      "lifecycle.shippedAt",
    ],
    Delivered: [
      "deliveredAt",
      "lifecycle.deliveredAt",
    ],
    Cancelled: [
      "cancelledAt",
      "lifecycle.cancelledAt",
    ],
  };

  const supportedPaths =
    statusFieldMap[orderStatus] || [];

  for (const path of supportedPaths) {
    if (
      setDocumentPathIfSupported(
        order,
        path,
        timestamp
      )
    ) {
      break;
    }
  }
};

const getOrderMetricDate = (
  order
) => {
  return (
    order.deliveredAt ||
    order.lifecycle?.deliveredAt ||
    new Date()
  );
};

const getProductUnitCost = (
  product
) => {
  const candidates = [
    product.unitCost,
    product.costPrice,
    product.purchasePrice,
    product.buyingPrice,
    product.averageCost,
    product.cost,
  ];

  for (const candidate of candidates) {
    const numericValue =
      Number(candidate);

    if (
      Number.isFinite(numericValue) &&
      numericValue >= 0
    ) {
      return roundMoney(
        numericValue
      );
    }
  }

  return 0;
};

const updateFinancialProcessingMetadata = ({
  order,
  status,
  snapshot = null,
  calculation = null,
  error = null,
  processedAt = new Date(),
}) => {
  /*
    Order schema-তে financialProcessing.status-এর enum project
    অনুযায়ী ভিন্ন হতে পারে। তাই unsupported value force করা হবে না।
  */

  setEnumPathIfSupported(
    order,
    "financialProcessing.status",
    status
  );

  const values = {
    "financialProcessing.snapshot":
      snapshot?._id || null,
    "financialProcessing.snapshotId":
      snapshot?._id || null,
    "financialProcessing.profitCalculation":
      calculation?._id || null,
    "financialProcessing.profitCalculationId":
      calculation?._id || null,
    "financialProcessing.processedAt":
      processedAt,
    "financialProcessing.lastProcessedAt":
      processedAt,
    "financialProcessing.lastError":
      error
        ? String(
            error.message || error
          )
        : null,
  };

  for (
    const [path, value] of
    Object.entries(values)
  ) {
    setDocumentPathIfSupported(
      order,
      path,
      value
    );
  }
};

const processDeliveredOrderFinancials =
  async ({
    order,
    tenantId,
    session,
    actorId = null,
    requestId = null,
  }) => {
    if (
      !tenantId ||
      !mongoose.Types.ObjectId.isValid(
        tenantId
      )
    ) {
      throw createHttpError(
        400,
        "A valid tenant is required for financial processing"
      );
    }

    updateFinancialProcessingMetadata({
      order,
      status: "processing",
    });

    await order.save({
      session,
    });

    try {
      /*
        createSnapshot({ finalize: true }) নিজেই existing finalized
        snapshot খুঁজে idempotently return করে। তাই controller থেকে
        getLatestSnapshot export-এর উপর dependency রাখা হচ্ছে না।
      */

      const snapshot =
        await createSaleFinancialSnapshot({
          tenantId,
          orderId: order._id,
          finalize: true,
          generatedBy:
            actorId,
          requestId,
          notes:
            "Generated automatically when order was delivered",
          source:
            "order_delivered",
          session,
        });

      await createFinancialEventsFromSnapshot({
        tenantId,
        snapshotId:
          snapshot._id,
        postImmediately: true,
        generatedBy:
          actorId,
        requestId,
        notes:
          "Generated automatically when order was delivered",
        session,
      });

      const profitResult =
        await calculateOrderProfit({
          tenantId,
          orderId: order._id,
          snapshotId:
            snapshot._id,
          forceRecalculate: false,
          session,
        });

      await upsertDailyBusinessMetrics({
        tenantId,
        metricDate:
          getOrderMetricDate(
            order
          ),
        currency:
          order.currency ||
          snapshot.currency ||
          "BDT",
        calculationVersion:
          profitResult.calculation
            ?.calculationVersion ||
          1,
        session,
      });

      updateFinancialProcessingMetadata({
        order,
        status: "completed",
        snapshot,
        calculation:
          profitResult.calculation,
      });

      await order.save({
        session,
      });

      return {
        snapshot,
        calculation:
          profitResult.calculation,
      };
    } catch (error) {
      updateFinancialProcessingMetadata({
        order,
        status: "failed",
        error,
      });

      await order.save({
        session,
      });

      throw error;
    }
  };

/* =========================================================
   PRODUCT VARIANT HELPERS
========================================================= */

const getAvailableOptions = (
  product,
  fieldName
) => {
  if (
    !Array.isArray(
      product?.[fieldName]
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      product[fieldName]
        .filter(
          (value) =>
            typeof value ===
            "string"
        )
        .map((value) =>
          value.trim()
        )
        .filter(Boolean)
    ),
  ];
};

const resolveSelectedOption = ({
  product,
  fieldName,
  selectedValue,
  optionName,
}) => {
  const normalizedValue =
    normalizeOptionalString(
      selectedValue
    );

  const availableOptions =
    getAvailableOptions(
      product,
      fieldName
    );

  /*
    Product-এর option থাকলে selection
    অবশ্যই Cart Item-এ থাকতে হবে।
  */

  if (
    availableOptions.length > 0
  ) {
    if (!normalizedValue) {
      throw createHttpError(
        400,
        `Please select a product ${optionName}`
      );
    }

    const matchingOption =
      availableOptions.find(
        (option) =>
          option.toLowerCase() ===
          normalizedValue.toLowerCase()
      );

    if (!matchingOption) {
      throw createHttpError(
        400,
        `The selected product ${optionName} is not available`
      );
    }

    return matchingOption;
  }

  /*
    Product-এর option না থাকলে selected
    value গ্রহণ করা হবে না।
  */

  if (normalizedValue) {
    throw createHttpError(
      400,
      `This product does not have ${optionName} options`
    );
  }

  return null;
};

/* =========================================================
   UNIQUE ORDER NUMBER GENERATOR

   Example:
   TM-20260714-A8F4C2
========================================================= */

const generateUniqueOrderNumber =
  async ({
    tenantId,
    session,
  }) => {
    const datePart = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const randomPart =
        crypto
          .randomBytes(3)
          .toString("hex")
          .toUpperCase();

      const orderNumber =
        `TM-${datePart}-${randomPart}`;

      const orderNumberQuery =
        applyTenantScope(
          Order,
          {
            orderNumber,
          },
          tenantId
        );

      const existingOrder =
        await Order.exists(
          orderNumberQuery
        ).session(session);

      if (!existingOrder) {
        return orderNumber;
      }
    }

    throw createHttpError(
      500,
      "Could not generate a unique order number"
    );
  };

/* =========================================================
   COUPON VALIDATION AND CALCULATION
========================================================= */

const calculateCouponDiscount =
  async ({
    couponCode,
    subtotalAmount,
    tenantId,
    session,
  }) => {
    const normalizedCouponCode =
      normalizeOptionalString(
        couponCode
      );

    if (!normalizedCouponCode) {
      return {
        discountAmount: 0,
        appliedCouponCode: null,
      };
    }

    const couponQuery =
      applyTenantScope(
        Coupon,
        {
          code: normalizedCouponCode.toUpperCase(),
        },
        tenantId
      );

    const coupon =
      await Coupon.findOne(
        couponQuery
      ).session(session);

    if (!coupon) {
      throw createHttpError(
        404,
        "Invalid coupon code"
      );
    }

    if (!coupon.isActive) {
      throw createHttpError(
        400,
        "Coupon is inactive"
      );
    }

    if (
      coupon.expiresAt &&
      new Date(coupon.expiresAt) <
        new Date()
    ) {
      throw createHttpError(
        400,
        "Coupon has expired"
      );
    }

    const minimumOrderAmount =
      Number(
        coupon.minOrderAmount || 0
      );

    if (
      subtotalAmount <
      minimumOrderAmount
    ) {
      throw createHttpError(
        400,
        `Minimum order amount is ${minimumOrderAmount}`
      );
    }

    let discountAmount = 0;

    if (
      coupon.discountType ===
      "percentage"
    ) {
      discountAmount =
        (subtotalAmount *
          Number(
            coupon.discountValue
          )) /
        100;

      const maxDiscountAmount =
        Number(
          coupon.maxDiscountAmount ||
            0
        );

      if (
        maxDiscountAmount > 0 &&
        discountAmount >
          maxDiscountAmount
      ) {
        discountAmount =
          maxDiscountAmount;
      }
    }

    if (
      coupon.discountType ===
      "fixed"
    ) {
      discountAmount = Number(
        coupon.discountValue || 0
      );
    }

    discountAmount = Math.min(
      Math.max(
        roundMoney(
          discountAmount
        ),
        0
      ),
      subtotalAmount
    );

    return {
      discountAmount,
      appliedCouponCode:
        coupon.code,
    };
  };

/* =========================================================
   PLACE GUEST COD ORDER

   Expected Body:

   {
     "guestId": "guest_xxxxxxxx",

     "customer": {
       "fullName": "Customer Name",
       "phone": "01700000000",
       "email": "customer@email.com"
     },

     "shippingAddress": {
       "division": "Dhaka",
       "district": "Dhaka",
       "area": "Uttara",
       "address": "House 10, Road 5",
       "postalCode": "1230"
     },

     "couponCode": "SAVE10",
     "customerNote": "Call before delivery",
     "paymentMethod": "COD"
   }
========================================================= */

const placeOrder = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    let tenantId =
      resolveTenantId(
        req,
        {
          required: false,
        }
      );

    const {
      guestId,
      customer,
      shippingAddress,
      couponCode,
      customerNote,
      paymentMethod = "COD",
    } = req.body;

    const normalizedGuestId =
      String(
        guestId || ""
      ).trim();

    /* =====================================================
       VALIDATE GUEST ID
    ===================================================== */

    if (
      !isValidGuestId(
        normalizedGuestId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid Guest ID is required",
      });
    }

    /* =====================================================
       VALIDATE PAYMENT METHOD
    ===================================================== */

    if (
      String(paymentMethod)
        .trim()
        .toUpperCase() !== "COD"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only Cash On Delivery is currently available",
      });
    }

    /* =====================================================
       VALIDATE CUSTOMER
    ===================================================== */

    if (
      !customer ||
      typeof customer !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer information is required",
      });
    }

    const fullName =
      normalizeRequiredString(
        customer.fullName
      );

    const phone =
      normalizePhone(
        customer.phone
      );

    const email =
      normalizeOptionalString(
        customer.email
      );

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message:
          "Customer full name is required",
      });
    }

    if (
      !phone ||
      !isValidPhone(phone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid customer phone number is required",
      });
    }

    /* =====================================================
       VALIDATE SHIPPING ADDRESS
    ===================================================== */

    if (
      !shippingAddress ||
      typeof shippingAddress !==
        "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Shipping address is required",
      });
    }

    const division =
      normalizeRequiredString(
        shippingAddress.division
      );

    const district =
      normalizeRequiredString(
        shippingAddress.district
      );

    const area =
      normalizeRequiredString(
        shippingAddress.area
      );

    const address =
      normalizeRequiredString(
        shippingAddress.address
      );

    const postalCode =
      normalizeOptionalString(
        shippingAddress.postalCode
      );

    if (
      !division ||
      !district ||
      !area ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Division, district, area and full address are required",
      });
    }

    let createdOrder = null;

    /* =====================================================
       DATABASE TRANSACTION

       Order create, stock deduction এবং Cart clear—
       সব একসঙ্গে সফল হবে অথবা সব rollback হবে।
    ===================================================== */

    await session.withTransaction(
      async () => {
        /* =================================================
           FIND GUEST CART
        ================================================= */

        const cartQuery =
          applyTenantScope(
            Cart,
            {
              guestId:
                normalizedGuestId,
            },
            tenantId
          );

        const cart =
          await Cart.findOne(
            cartQuery
          ).session(session);

        if (
          !cart ||
          !Array.isArray(
            cart.items
          ) ||
          cart.items.length === 0
        ) {
          throw createHttpError(
            400,
            "Cart is empty"
          );
        }

        /*
          Public checkout route-এ authenticated tenant context
          না থাকলে Cart-এর tenant ব্যবহার করা হবে।
        */

        if (
          !tenantId &&
          cart.tenant
        ) {
          tenantId =
            new mongoose.Types.ObjectId(
              cart.tenant
            );
        }

        /*
          Legacy single-store data-তে Cart-এ tenant না থাকলে
          প্রথম Product থেকে tenant resolve করা হবে।
        */

        if (
          !tenantId &&
          cart.items[0]?.product
        ) {
          const tenantSourceProduct =
            await Product.findById(
              cart.items[0].product
            )
              .select({
                tenant: 1,
              })
              .session(session);

          if (
            tenantSourceProduct?.tenant
          ) {
            tenantId =
              new mongoose.Types.ObjectId(
                tenantSourceProduct.tenant
              );
          }
        }

        if (
          modelHasPath(
            Order,
            "tenant"
          ) &&
          !tenantId
        ) {
          throw createHttpError(
            400,
            "Store context could not be resolved. Configure DEFAULT_TENANT_ID or attach tenant middleware to the public order route"
          );
        }

        const stockClearanceCampaign =
          await getLiveStockClearanceCampaign({
            tenantId,
            session,
          });

        let subtotalAmount = 0;
        const orderItems = [];

        /* =================================================
           VALIDATE CART ITEMS AND CREATE SNAPSHOTS
        ================================================= */

        for (
          const cartItem of cart.items
        ) {
          const productId =
            cartItem.product;

          if (
            !productId ||
            !mongoose.Types.ObjectId.isValid(
              productId
            )
          ) {
            throw createHttpError(
              400,
              "Cart contains an invalid product"
            );
          }

          const productQuery =
            applyTenantScope(
              Product,
              {
                _id: productId,
              },
              tenantId
            );

          const product =
            await Product.findOne(
              productQuery
            ).session(session);

          if (!product) {
            throw createHttpError(
              404,
              "A product in your cart is no longer available"
            );
          }

          const quantity =
            normalizeQuantity(
              cartItem.quantity
            );

          if (!quantity) {
            throw createHttpError(
              400,
              `${product.name} has an invalid quantity`
            );
          }

          if (
            typeof product.stock ===
              "number" &&
            product.stock < quantity
          ) {
            throw createHttpError(
              400,
              product.stock < 1
                ? `${product.name} is out of stock`
                : `${product.name} has only ${product.stock} items left in stock`
            );
          }

          /*
            Checkout-এর সময় আবার Size এবং Color validate
            করা হচ্ছে, যাতে পুরোনো বা invalid Cart data
            দিয়ে Order তৈরি না হয়।
          */

          const selectedSize =
            resolveSelectedOption({
              product,
              fieldName: "sizes",
              selectedValue:
                cartItem.selectedSize,
              optionName: "size",
            });

          const selectedColor =
            resolveSelectedOption({
              product,
              fieldName:
                "colors",
              selectedValue:
                cartItem.selectedColor,
              optionName: "color",
            });

          const price =
            getStockClearanceUnitPrice(
              product,
              stockClearanceCampaign
            );

          const unitCost =
            getProductUnitCost(
              product
            );

          const lineTotal =
            roundMoney(
              price * quantity
            );

          subtotalAmount =
            roundMoney(
              subtotalAmount +
                lineTotal
            );

          orderItems.push({
            product:
              product._id,

            name: product.name,

            slug:
              normalizeOptionalString(
                product.slug
              ),

            image:
              normalizeRequiredString(
                product.image
              ),

            quantity,
            price,
            unitPrice: price,
            unitCost,
            costPrice: unitCost,
            lineTotal,

            selectedSize,
            selectedColor,
          });
        }

        /* =================================================
           CALCULATE COUPON
        ================================================= */

        const {
          discountAmount,
          appliedCouponCode,
        } =
          await calculateCouponDiscount(
            {
              couponCode,
              subtotalAmount,
              tenantId,
              session,
            }
          );

        const deliveryCharge =
          roundMoney(
            DEFAULT_DELIVERY_CHARGE
          );

        const totalAmount =
          roundMoney(
            subtotalAmount -
              discountAmount +
              deliveryCharge
          );

        /* =================================================
           GENERATE ORDER NUMBER
        ================================================= */

        const orderNumber =
          await generateUniqueOrderNumber({
            tenantId,
            session,
          });

        /* =================================================
           ATOMIC STOCK DEDUCTION

           Database condition নিশ্চিত করবে যে stock
           ইতোমধ্যে অন্য Order-এ শেষ হয়ে গেলে এই Order
           তৈরি হবে না।
        ================================================= */

        for (
          const item of orderItems
        ) {
          const updatedProduct =
            await Product.findOneAndUpdate(
              applyTenantScope(
                Product,
                {
                  _id: item.product,

                  stock: {
                    $gte:
                      item.quantity,
                  },
                },
                tenantId
              ),

              {
                $inc: {
                  stock:
                    -item.quantity,
                },
              },

              {
                new: true,
                session,
              }
            );

          if (!updatedProduct) {
            throw createHttpError(
              400,
              `${item.name} does not have enough stock`
            );
          }
        }

        /* =================================================
           CREATE ORDER
        ================================================= */

        const orderPayload = {
            orderNumber,

            currency:
              "BDT",

            salesChannel:
              "website",

            guestId:
              normalizedGuestId,

            customer: {
              fullName,
              phone,
              email,
            },

            shippingAddress: {
              division,
              district,
              area,
              address,
              postalCode,
            },

            items: orderItems,

            subtotalAmount,
            deliveryCharge,
            discountAmount,

            couponCode:
              appliedCouponCode,

            totalAmount,

            paymentMethod:
              "COD",

            paymentStatus:
              "Pending",

            orderStatus:
              "Pending",

            statusHistory: [
              {
                status:
                  "Pending",

                note:
                  "Order placed successfully",

                changedAt:
                  new Date(),
              },
            ],

            customerNote:
              normalizeOptionalString(
                customerNote
              ),
          };

        if (
          modelHasPath(
            Order,
            "tenant"
          )
        ) {
          orderPayload.tenant =
            tenantId;
        }

        const order =
          new Order(
            orderPayload
          );

        await order.save({
          session,
        });

        /* =================================================
           CLEAR GUEST CART
        ================================================= */

        cart.items = [];

        await cart.save({
          session,
        });

        createdOrder = order;
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Order placed successfully",
      order: createdOrder,
    });
  } catch (error) {
    console.error(
      "Place order error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Order number conflict. Please try again",
      });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
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
      });
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   GET GUEST ORDERS

   Supported examples:

   GET /api/orders/guest/:guestId
   GET /api/orders/my?guestId=guest_xxxxxxxx
========================================================= */

const getGuestOrders = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(
        req,
        {
          required: false,
        }
      );

    const guestId =
      String(
        req.params.guestId ||
          req.query.guestId ||
          ""
      ).trim();

    if (!isValidGuestId(guestId)) {
      return res.status(400).json({
        success: false,
        message:
          "A valid Guest ID is required",
      });
    }

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) ||
          20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const [orders, totalOrders] =
      await Promise.all([
        Order.find(
          applyTenantScope(
            Order,
            {
              guestId,
            },
            tenantId
          )
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments(
          applyTenantScope(
            Order,
            {
              guestId,
            },
            tenantId
          )
        ),
      ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalOrders,

      totalPages: Math.ceil(
        totalOrders / limit
      ),

      orders,
    });
  } catch (error) {
    console.error(
      "Get guest orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/*
  পুরোনো route/controller name সাময়িকভাবে
  compatible রাখার জন্য।
*/

const getMyOrders =
  getGuestOrders;

/* =========================================================
   GET ALL ORDERS — ADMIN

   Optional query parameters:

   ?status=Pending
   ?search=TM-20260714
   ?page=1
   ?limit=20
========================================================= */

const getAllOrders = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(req);

    const {
      status,
      search,
    } = req.query;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) ||
          20,
        1
      ),
      100
    );

    const query =
      applyTenantScope(
        Order,
        {},
        tenantId
      );

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (status) {
      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status",
        });
      }

      query.orderStatus = status;
    }

    if (search) {
      const safeSearch =
        escapeRegExp(
          String(search).trim()
        );

      query.$or = [
        {
          orderNumber: {
            $regex:
              safeSearch,
            $options: "i",
          },
        },

        {
          "customer.fullName": {
            $regex:
              safeSearch,
            $options: "i",
          },
        },

        {
          "customer.phone": {
            $regex:
              safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const skip =
      (page - 1) * limit;

    const [orders, totalOrders] =
      await Promise.all([
        Order.find(query)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments(
          query
        ),
      ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalOrders,

      totalPages: Math.ceil(
        totalOrders / limit
      ),

      orders,
    });
  } catch (error) {
    console.error(
      "Get all orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   GET SINGLE ORDER

   Supports:
   - MongoDB Order ID
   - Public Order Number
========================================================= */

const getSingleOrder = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(
        req,
        {
          required: false,
        }
      );

    const identifier =
      String(
        req.params.orderId || ""
      ).trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message:
          "Order identifier is required",
      });
    }

    const query =
      mongoose.Types.ObjectId.isValid(
        identifier
      )
        ? {
            $or: [
              {
                _id: identifier,
              },

              {
                orderNumber:
                  identifier.toUpperCase(),
              },
            ],
          }
        : {
            orderNumber:
              identifier.toUpperCase(),
          };

    const order =
      await Order.findOne(
        applyTenantScope(
          Order,
          query,
          tenantId
        )
      ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get single order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   PUBLIC ORDER TRACKING

   POST /api/orders/track

   Body:
   {
     "orderNumber": "TM-20260714-A8F4C2",
     "phone": "01700000000"
   }
========================================================= */

const trackOrder = async (
  req,
  res
) => {
  try {
    const tenantId =
      resolveTenantId(
        req,
        {
          required: false,
        }
      );

    const orderNumber =
      normalizeRequiredString(
        req.body.orderNumber ||
          req.query.orderNumber
      ).toUpperCase();

    const phone =
      normalizePhone(
        req.body.phone ||
          req.query.phone
      );

    if (
      !orderNumber ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order number and phone number are required",
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message:
          "A valid phone number is required",
      });
    }

    const order =
      await Order.findOne(
        applyTenantScope(
          Order,
          {
            orderNumber,
            "customer.phone":
              phone,
          },
          tenantId
        )
      ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "No order was found with the provided order number and phone number",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Track order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   UPDATE ORDER STATUS — ADMIN
========================================================= */

const updateOrderStatus =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const tenantId =
        resolveTenantId(req);

      const {
        orderStatus,
        note,
      } = req.body;

      const orderId =
        req.params.orderId;

      const allowedStatuses = [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ];

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid order ID",
          });
      }

      if (
        !allowedStatuses.includes(
          orderStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid order status",
          });
      }

      let updatedOrder = null;
      let financialResult = null;
      let statusChanged = false;

      await session.withTransaction(
        async () => {
          const order =
            await Order.findOne(
              applyTenantScope(
                Order,
                {
                  _id: orderId,
                },
                tenantId
              )
            ).session(session);

          if (!order) {
            throw createHttpError(
              404,
              "Order not found"
            );
          }

          const effectiveTenantId =
            order.tenant ||
            tenantId;

          /*
            Delivered status-এর একই request পুনরায় এলে
            financial pipeline idempotently retry করা হবে।
          */

          if (
            order.orderStatus ===
            orderStatus
          ) {
            if (
              orderStatus !==
              "Delivered"
            ) {
              throw createHttpError(
                400,
                `Order is already ${orderStatus}`
              );
            }

            financialResult =
              await processDeliveredOrderFinancials({
                order,
                tenantId:
                  effectiveTenantId,
                session,
                actorId:
                  req.user?._id ||
                  req.user?.id ||
                  null,
                requestId:
                  req.id ||
                  req.requestId ||
                  req.headers?.[
                    "x-request-id"
                  ] ||
                  null,
              });

            updatedOrder = order;
            return;
          }

          /*
            Standard forward-only status flow।
          */

          const validTransitions = {
            Pending: [
              "Processing",
              "Cancelled",
            ],

            Processing: [
              "Shipped",
              "Cancelled",
            ],

            Shipped: [
              "Delivered",
            ],

            Delivered: [],
            Cancelled: [],
          };

          const allowedNextStatuses =
            validTransitions[
              order.orderStatus
            ] || [];

          if (
            !allowedNextStatuses.includes(
              orderStatus
            )
          ) {
            throw createHttpError(
              400,
              `Order status cannot be changed from ${order.orderStatus} to ${orderStatus}`
            );
          }

          const statusChangedAt =
            new Date();

          /* ===============================================
             RESTORE STOCK WHEN CANCELLED
          =============================================== */

          if (
            orderStatus ===
            "Cancelled"
          ) {
            for (
              const item of order.items
            ) {
              await Product.updateOne(
                applyTenantScope(
                  Product,
                  {
                    _id:
                      item.product,
                  },
                  effectiveTenantId
                ),

                {
                  $inc: {
                    stock:
                      item.quantity,
                  },
                },

                {
                  session,
                }
              );
            }

            order.paymentStatus =
              "Pending";
          }

          /*
            COD order delivered হলে payment Paid হবে।
          */

          if (
            orderStatus ===
              "Delivered" &&
            order.paymentMethod ===
              "COD"
          ) {
            order.paymentStatus =
              "Paid";
          }

          order.orderStatus =
            orderStatus;

          setLifecycleTimestamp(
            order,
            orderStatus,
            statusChangedAt
          );

          order.statusHistory.push({
            status: orderStatus,

            note:
              normalizeOptionalString(
                note
              ),

            changedAt:
              statusChangedAt,
          });

          await order.save({
            session,
          });

          statusChanged = true;

          if (
            orderStatus ===
            "Delivered"
          ) {
            financialResult =
              await processDeliveredOrderFinancials({
                order,
                tenantId:
                  effectiveTenantId,
                session,
                actorId:
                  req.user?._id ||
                  req.user?.id ||
                  null,
                requestId:
                  req.id ||
                  req.requestId ||
                  req.headers?.[
                    "x-request-id"
                  ] ||
                  null,
              });
          }

          updatedOrder = order;
        }
      );

      return res.status(200).json({
        success: true,

        message:
          statusChanged
            ? "Order status updated successfully"
            : "Order financial processing completed successfully",

        order: updatedOrder,

        financial:
          financialResult
            ? {
                snapshotId:
                  financialResult
                    .snapshot?._id ||
                  null,
                profitCalculationId:
                  financialResult
                    .calculation?._id ||
                  null,
              }
            : null,
      });
    } catch (error) {
      console.error(
        "Update order status error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "A financial record conflict occurred. Please retry the request",
          });
      }

      if (
        error.name ===
        "ValidationError"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              error.message,
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
        });
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  placeOrder,
  getMyOrders,
  getGuestOrders,
  getAllOrders,
  getSingleOrder,
  trackOrder,
  updateOrderStatus,
};