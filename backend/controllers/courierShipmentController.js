const CourierShipment = require(
  "../models/CourierShipment"
);

const CourierFactory = require(
  "../services/courier/courierFactory"
);

const mongoose = require("mongoose");

const Courier = require(
  "../models/Courier"
);

const Order = require(
  "../models/Order"
);

/* =========================================================
   CONSTANTS
========================================================= */

const BOOKING_STATUSES = [
  "pending",
  "processing",
  "booked",
  "failed",
  "cancelled",
];

const DELIVERY_STATUSES = [
  "pending",
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "returned",
  "partially_delivered",
  "cancelled",
  "unknown",
];

const TERMINAL_DELIVERY_STATUSES = [
  "delivered",
  "returned",
  "cancelled",
];

const SHIPMENT_TYPES = [
  "forward",
  "return",
  "exchange",
];

const PAYMENT_METHODS = [
  "cod",
  "prepaid",
  "partial",
];

const PACKAGE_TYPES = [
  "parcel",
  "document",
  "fragile",
  "other",
];

const WEIGHT_UNITS = [
  "kg",
  "gram",
];

const DIMENSION_UNITS = [
  "cm",
  "inch",
];

const STATUS_SOURCES = [
  "system",
  "admin",
  "courier_api",
  "webhook",
  "manual",
];

/* =========================================================
   COMMON HELPERS
========================================================= */

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const normalizeString = (
  value,
  fallback = null
) => {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue ||
    fallback;
};

const normalizePhone = (
  value,
  fallback = null
) => {
  const normalizedValue =
    normalizeString(
      value,
      fallback
    );

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .replace(/\s+/g, "")
    .replace(/-/g, "");
};

const toSafeNumber = (
  value,
  fallback = 0
) => {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(parsedValue)
  ) {
    return fallback;
  }

  return parsedValue;
};

const getAuthenticatedUserId = (
  req
) =>
  req.user?._id ||
  req.user?.id ||
  null;


const getTenantId = (req) =>
  req.tenantId ||
  req.tenant?._id ||
  req.tenant?.id ||
  req.user?.tenant?._id ||
  req.user?.tenant?.id ||
  req.user?.tenant ||
  req.user?.tenantId ||
  null;

const requireTenantId = (
  req,
  res
) => {
  const tenantId =
    getTenantId(req);

  if (
    !tenantId ||
    !isValidObjectId(tenantId)
  ) {
    res.status(403).json({
      success: false,
      message:
        "Tenant context could not be determined",
    });

    return null;
  }

  return tenantId;
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const normalizedValue =
    value.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return fallback;
};

const parseOptionalDate = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsedDate =
    new Date(value);

  return Number.isNaN(
    parsedDate.getTime()
  )
    ? null
    : parsedDate;
};


const buildProviderApiLog = (
  apiLog,
  action
) => {
  if (!apiLog) {
    return null;
  }

  return {
    action,
    method:
      apiLog.method || null,
    endpoint:
      apiLog.endpoint ||
      apiLog.url ||
      null,
    requestPayload:
      apiLog.requestPayload ??
      apiLog.requestBody ??
      null,
    responsePayload:
      apiLog.responsePayload ??
      apiLog.response ??
      null,
    statusCode:
      apiLog.statusCode ?? null,
    success:
      Boolean(apiLog.success),
    errorMessage:
      apiLog.errorMessage ||
      apiLog.error ||
      null,
    requestedAt:
      apiLog.requestedAt ||
      apiLog.startedAt ||
      new Date(),
    respondedAt:
      apiLog.respondedAt ||
      apiLog.finishedAt ||
      new Date(),
  };
};

const applyProviderShipmentData = (
  shipment,
  providerShipment = {}
) => {
  const stringFields = [
    "bookingId",
    "consignmentId",
    "trackingNumber",
    "courierReference",
    "courierStatus",
    "currentLocation",
    "statusMessage",
    "failureReason",
  ];

  for (const field of stringFields) {
    if (
      providerShipment[field] !==
      undefined
    ) {
      shipment[field] =
        normalizeString(
          providerShipment[field]
        );
    }
  }

  if (
    providerShipment.bookingStatus &&
    BOOKING_STATUSES.includes(
      providerShipment.bookingStatus
    )
  ) {
    shipment.bookingStatus =
      providerShipment.bookingStatus;
  }

  if (
    providerShipment.deliveryStatus &&
    DELIVERY_STATUSES.includes(
      providerShipment.deliveryStatus
    )
  ) {
    shipment.deliveryStatus =
      providerShipment.deliveryStatus;
  }

  const dateFields = [
    "bookedAt",
    "pickedUpAt",
    "outForDeliveryAt",
    "deliveredAt",
    "failedAt",
    "cancelledAt",
    "returnedAt",
    "expectedDeliveryAt",
    "lastSyncedAt",
  ];

  for (const field of dateFields) {
    if (providerShipment[field]) {
      const parsedDate = new Date(
        providerShipment[field]
      );

      if (
        !Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        shipment[field] = parsedDate;
      }
    }
  }
};

const buildPagination = ({
  page,
  limit,
  total,
}) => {
  const totalPages = Math.max(
    Math.ceil(total / limit),
    1
  );

  return {
    page,
    limit,
    totalShipments: total,
    totalPages,
    hasNextPage:
      page < totalPages,
    hasPreviousPage:
      page > 1,
  };
};

/* =========================================================
   ORDER DATA EXTRACTION HELPERS

   বিভিন্ন Order schema naming support করার জন্য defensive
   fallback ব্যবহার করা হয়েছে।
========================================================= */

const getOrderNumber = (order) =>
  normalizeString(
    order.orderNumber ||
      order.invoiceNumber ||
      order.orderId ||
      order._id?.toString()
  );

const getOrderItems = (order) => {
  if (
    Array.isArray(order.items)
  ) {
    return order.items;
  }

  if (
    Array.isArray(
      order.orderItems
    )
  ) {
    return order.orderItems;
  }

  if (
    Array.isArray(
      order.products
    )
  ) {
    return order.products;
  }

  return [];
};

const buildPackageItems = (
  order,
  suppliedItems
) => {
  const sourceItems =
    Array.isArray(suppliedItems) &&
    suppliedItems.length > 0
      ? suppliedItems
      : getOrderItems(order);

  return sourceItems.map(
    (item) => {
      const quantity = Math.max(
        toSafeNumber(
          item.quantity ||
            item.qty,
          1
        ),
        1
      );

      const unitPrice = Math.max(
        toSafeNumber(
          item.unitPrice ??
            item.price ??
            item.salePrice,
          0
        ),
        0
      );

      const totalPrice = Math.max(
        toSafeNumber(
          item.totalPrice ??
            item.subtotal,
          quantity * unitPrice
        ),
        0
      );

      return {
        product:
          item.product?._id ||
          item.product ||
          item.productId ||
          null,

        name:
          normalizeString(
            item.name ||
              item.productName ||
              item.title ||
              item.product?.name,
            "Product"
          ),

        sku:
          normalizeString(
            item.sku ||
              item.product?.sku
          ),

        quantity,
        unitPrice,
        totalPrice,
      };
    }
  );
};

const getOrderAddress = (
  order
) =>
  order.shippingAddress ||
  order.deliveryAddress ||
  order.address ||
  order.customerAddress ||
  {};

const buildRecipientSnapshot = (
  order,
  suppliedRecipient = {}
) => {
  const orderAddress =
    getOrderAddress(order);

  const customer =
    order.customer ||
    order.user ||
    {};

  const recipient = {
    name:
      normalizeString(
        suppliedRecipient.name ||
          orderAddress.name ||
          orderAddress.fullName ||
          order.customerName ||
          customer.name
      ),

    phone:
      normalizePhone(
        suppliedRecipient.phone ||
          orderAddress.phone ||
          order.customerPhone ||
          order.phone ||
          customer.phone
      ),

    alternatePhone:
      normalizePhone(
        suppliedRecipient.alternatePhone ||
          orderAddress.alternatePhone ||
          orderAddress.secondaryPhone
      ),

    email:
      normalizeString(
        suppliedRecipient.email ||
          orderAddress.email ||
          order.customerEmail ||
          customer.email
      ),

    addressLine:
      normalizeString(
        suppliedRecipient.addressLine ||
          suppliedRecipient.address ||
          orderAddress.addressLine ||
          orderAddress.address ||
          orderAddress.street
      ),

    area:
      normalizeString(
        suppliedRecipient.area ||
          orderAddress.area ||
          orderAddress.thana ||
          orderAddress.upazila
      ),

    city:
      normalizeString(
        suppliedRecipient.city ||
          orderAddress.city ||
          orderAddress.district ||
          orderAddress.area
      ),

    district:
      normalizeString(
        suppliedRecipient.district ||
          orderAddress.district
      ),

    division:
      normalizeString(
        suppliedRecipient.division ||
          orderAddress.division
      ),

    postalCode:
      normalizeString(
        suppliedRecipient.postalCode ||
          orderAddress.postalCode ||
          orderAddress.zipCode
      ),

    country:
      normalizeString(
        suppliedRecipient.country ||
          orderAddress.country,
        "Bangladesh"
      ),

    deliveryInstructions:
      normalizeString(
        suppliedRecipient
          .deliveryInstructions ||
          orderAddress
            .deliveryInstructions ||
          order.notes ||
          order.customerNote
      ),
  };

  return recipient;
};

const getOrderAmount = (
  order
) =>
  Math.max(
    toSafeNumber(
      order.totalAmount ??
        order.grandTotal ??
        order.total ??
        order.payableAmount,
      0
    ),
    0
  );

const getOrderShippingCharge = (
  order
) =>
  Math.max(
    toSafeNumber(
      order.shippingCharge ??
        order.deliveryCharge ??
        order.shippingFee,
      0
    ),
    0
  );

const getOrderPaymentMethod = (
  order
) => {
  const paymentMethod =
    normalizeString(
      order.paymentMethod ||
        order.paymentType,
      "cod"
    ).toLowerCase();

  if (
    [
      "cash_on_delivery",
      "cash on delivery",
      "cod",
    ].includes(paymentMethod)
  ) {
    return "cod";
  }

  if (
    [
      "partial",
      "partially_paid",
    ].includes(paymentMethod)
  ) {
    return "partial";
  }

  return "prepaid";
};

/* =========================================================
   QUERY HELPERS
========================================================= */

const findShipmentByIdentifier =
  async (
    identifier,
    tenantId,
    options = {}
  ) => {
    const {
      populate = true,
      includePrivateFields = false,
    } = options;

    const conditions = [
      {
        shipmentNumber:
          identifier
            .trim()
            .toUpperCase(),
      },
      {
        trackingNumber:
          identifier.trim(),
      },
      {
        consignmentId:
          identifier.trim(),
      },
    ];

    if (
      isValidObjectId(identifier)
    ) {
      conditions.unshift({
        _id: identifier,
      });
    }

    let query =
      CourierShipment.findOne({
        tenant: tenantId,
        $or: conditions,
      });

    if (
      includePrivateFields
    ) {
      query = query.select(
        "+apiLogs +lastApiResponse +lastWebhookPayload"
      );
    }

    if (populate) {
      query = query
        .populate(
          "courier",
          "name code providerType logo isActive isDefault"
        )
        .populate(
          "order",
          "orderNumber status paymentStatus totalAmount grandTotal"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "updatedBy",
          "name email role"
        );
    }

    return query;
  };

/* =========================================================
   CREATE COURIER SHIPMENT

   POST /api/courier-shipments
========================================================= */

const createCourierShipment =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        orderId,
        courierId,
        shipmentType =
          "forward",
        packageType =
          "parcel",
        recipient = {},
        items,
        itemDescription,
        specialInstructions,
        weight = 0,
        weightUnit = "kg",
        dimensions,
        paymentMethod,
        pricing = {},
        expectedDeliveryAt,
        merchantInvoiceNumber,
        externalReference,
      } = req.body;

      if (
        !SHIPMENT_TYPES.includes(
          shipmentType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid shipment type",
        });
      }

      if (
        !PACKAGE_TYPES.includes(
          packageType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid package type",
        });
      }

      if (
        !WEIGHT_UNITS.includes(
          weightUnit
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid weight unit",
        });
      }

      if (
        dimensions?.unit &&
        !DIMENSION_UNITS.includes(
          dimensions.unit
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid dimension unit",
        });
      }

      if (
        paymentMethod &&
        !PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }

      const parsedExpectedDeliveryAt =
        parseOptionalDate(
          expectedDeliveryAt
        );

      if (
        expectedDeliveryAt &&
        !parsedExpectedDeliveryAt
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expectedDeliveryAt value",
        });
      }

      if (!orderId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Order ID is required",
          });
      }

      if (
        !isValidObjectId(orderId)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid order ID",
          });
      }

      if (!courierId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Courier ID is required",
          });
      }

      if (
        !isValidObjectId(
          courierId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid courier ID",
          });
      }

      const [
        order,
        courier,
      ] = await Promise.all([
        Order.findOne({
          _id: orderId,
          tenant: tenantId,
        }),
        Courier.findOne({
          _id: courierId,
          tenant: tenantId,
        }).select(
          "+credentials"
        ),
      ]);

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Order not found",
          });
      }

      if (!courier) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier not found",
          });
      }

      if (!courier.isActive) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected courier is inactive",
          });
      }

      const orderNumber =
        getOrderNumber(order);

      if (!orderNumber) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Order number could not be determined",
          });
      }

      const recipientSnapshot =
        buildRecipientSnapshot(
          order,
          recipient
        );

      const missingRecipientFields =
        [];

      if (
        !recipientSnapshot.name
      ) {
        missingRecipientFields.push(
          "name"
        );
      }

      if (
        !recipientSnapshot.phone
      ) {
        missingRecipientFields.push(
          "phone"
        );
      }

      if (
        !recipientSnapshot
          .addressLine
      ) {
        missingRecipientFields.push(
          "addressLine"
        );
      }

      if (
        !recipientSnapshot.city
      ) {
        missingRecipientFields.push(
          "city"
        );
      }

      if (
        missingRecipientFields.length >
        0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              `Missing recipient information: ${missingRecipientFields.join(
                ", "
              )}`,
          });
      }

      const shipmentItems =
        buildPackageItems(
          order,
          items
        );

      const resolvedPaymentMethod =
        paymentMethod ||
        getOrderPaymentMethod(
          order
        );

      const orderAmount =
        Math.max(
          toSafeNumber(
            pricing.orderAmount,
            getOrderAmount(order)
          ),
          0
        );

      const shippingCharge =
        Math.max(
          toSafeNumber(
            pricing.shippingCharge,
            getOrderShippingCharge(
              order
            )
          ),
          0
        );

      const codAmount =
        Math.max(
          toSafeNumber(
            pricing.codAmount,
            resolvedPaymentMethod ===
              "cod"
              ? orderAmount
              : 0
          ),
          0
        );

      const userId =
        getAuthenticatedUserId(
          req
        );

      const shipment =
        await CourierShipment.create(
          {
            tenant: tenantId,

            order: order._id,
            orderNumber,

            courier:
              courier._id,

            courierCode:
              courier.code,

            shipmentType,
            packageType,

            merchantInvoiceNumber:
              normalizeString(
                merchantInvoiceNumber,
                orderNumber
              ),

            externalReference:
              normalizeString(
                externalReference
              ),

            recipient:
              recipientSnapshot,

            items:
              shipmentItems,

            itemDescription:
              normalizeString(
                itemDescription
              ),

            specialInstructions:
              normalizeString(
                specialInstructions
              ),

            weight: Math.max(
              toSafeNumber(
                weight,
                0
              ),
              0
            ),

            weightUnit,

            dimensions: {
              length: Math.max(
                toSafeNumber(
                  dimensions?.length,
                  0
                ),
                0
              ),

              width: Math.max(
                toSafeNumber(
                  dimensions?.width,
                  0
                ),
                0
              ),

              height: Math.max(
                toSafeNumber(
                  dimensions?.height,
                  0
                ),
                0
              ),

              unit:
                dimensions?.unit ||
                "cm",
            },

            paymentMethod:
              resolvedPaymentMethod,

            pricing: {
              orderAmount,

              codAmount,

              shippingCharge,

              courierCharge:
                Math.max(
                  toSafeNumber(
                    pricing
                      .courierCharge,
                    0
                  ),
                  0
                ),

              collectionAmount:
                Math.max(
                  toSafeNumber(
                    pricing
                      .collectionAmount,
                    codAmount
                  ),
                  0
                ),

              collectedAmount:
                Math.max(
                  toSafeNumber(
                    pricing
                      .collectedAmount,
                    0
                  ),
                  0
                ),

              returnCharge:
                Math.max(
                  toSafeNumber(
                    pricing
                      .returnCharge,
                    0
                  ),
                  0
                ),

              currency:
                normalizeString(
                  pricing.currency,
                  "BDT"
                ).toUpperCase(),
            },

            bookingStatus:
              "pending",

            deliveryStatus:
              "pending",

            expectedDeliveryAt:
              parsedExpectedDeliveryAt,

            createdBy:
              userId,

            updatedBy:
              userId,

            statusHistory: [
              {
                bookingStatus:
                  "pending",

                deliveryStatus:
                  "pending",

                message:
                  "Shipment created",

                source:
                  "admin",

                changedBy:
                  userId,

                occurredAt:
                  new Date(),
              },
            ],
          }
        );

      await shipment.populate([
        {
          path: "courier",
          select:
            "name code providerType logo isActive isDefault",
        },
        {
          path: "order",
          select:
            "orderNumber status paymentStatus totalAmount grandTotal",
        },
        {
          path: "createdBy",
          select:
            "name email role",
        },
        {
          path: "updatedBy",
          select:
            "name email role",
        },
      ]);

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Courier shipment created successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "A shipment with the same unique courier reference already exists",
          });
      }

      return next(error);
    }
  };

/* =========================================================
   GET ALL COURIER SHIPMENTS

   GET /api/courier-shipments
========================================================= */

const getCourierShipments =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const page = Math.max(
        parseInt(
          req.query.page,
          10
        ) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          parseInt(
            req.query.limit,
            10
          ) || 20,
          1
        ),
        100
      );

      const skip =
        (page - 1) * limit;

      const {
        search,
        courierId,
        courierCode,
        orderId,
        bookingStatus,
        deliveryStatus,
        shipmentType,
        paymentMethod,
        isActive,
        isArchived = "false",
        dateFrom,
        dateTo,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filter = {
        tenant: tenantId,
      };

      if (courierId) {
        if (
          !isValidObjectId(
            courierId
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid courier ID",
            });
        }

        filter.courier =
          courierId;
      }

      if (orderId) {
        if (
          !isValidObjectId(
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

        filter.order =
          orderId;
      }

      if (courierCode) {
        filter.courierCode =
          normalizeString(
            courierCode
          ).toLowerCase();
      }

      if (bookingStatus) {
        if (
          !BOOKING_STATUSES.includes(
            bookingStatus
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid booking status",
            });
        }

        filter.bookingStatus =
          bookingStatus;
      }

      if (deliveryStatus) {
        if (
          !DELIVERY_STATUSES.includes(
            deliveryStatus
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid delivery status",
            });
        }

        filter.deliveryStatus =
          deliveryStatus;
      }

      if (shipmentType) {
        if (
          !SHIPMENT_TYPES.includes(
            shipmentType
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid shipment type",
          });
        }

        filter.shipmentType =
          shipmentType;
      }

      if (paymentMethod) {
        if (
          !PAYMENT_METHODS.includes(
            paymentMethod
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment method",
          });
        }

        filter.paymentMethod =
          paymentMethod;
      }

      if (
        isActive !==
        undefined
      ) {
        if (
          !["true", "false"].includes(
            String(isActive).toLowerCase()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "isActive must be true or false",
          });
        }

        filter.isActive =
          parseBoolean(isActive);
      }

      if (
        isArchived !==
        undefined
      ) {
        if (
          !["true", "false"].includes(
            String(isArchived).toLowerCase()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "isArchived must be true or false",
          });
        }

        filter.isArchived =
          parseBoolean(isArchived);
      }

      if (
        dateFrom ||
        dateTo
      ) {
        filter.createdAt = {};

        if (dateFrom) {
          const startDate =
            new Date(dateFrom);

          if (
            Number.isNaN(
              startDate.getTime()
            )
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Invalid dateFrom value",
              });
          }

          filter.createdAt.$gte =
            startDate;
        }

        if (dateTo) {
          const endDate =
            new Date(dateTo);

          if (
            Number.isNaN(
              endDate.getTime()
            )
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Invalid dateTo value",
              });
          }

          endDate.setHours(
            23,
            59,
            59,
            999
          );

          filter.createdAt.$lte =
            endDate;
        }
      }

      if (
        search &&
        search.trim()
      ) {
        const escapedSearch =
          search
            .trim()
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        filter.$or = [
          {
            shipmentNumber:
              searchRegex,
          },
          {
            orderNumber:
              searchRegex,
          },
          {
            trackingNumber:
              searchRegex,
          },
          {
            consignmentId:
              searchRegex,
          },
          {
            courierReference:
              searchRegex,
          },
          {
            "recipient.name":
              searchRegex,
          },
          {
            "recipient.phone":
              searchRegex,
          },
        ];
      }

      const allowedSortFields =
        [
          "createdAt",
          "updatedAt",
          "bookedAt",
          "deliveredAt",
          "expectedDeliveryAt",
          "shipmentNumber",
        ];

      const resolvedSortBy =
        allowedSortFields.includes(
          sortBy
        )
          ? sortBy
          : "createdAt";

      const resolvedSortOrder =
        sortOrder === "asc"
          ? 1
          : -1;

      const [
        shipments,
        total,
      ] = await Promise.all([
        CourierShipment.find(
          filter
        )
          .populate(
            "courier",
            "name code providerType logo isActive isDefault"
          )
          .populate(
            "order",
            "orderNumber status paymentStatus totalAmount grandTotal"
          )
          .sort({
            [resolvedSortBy]:
              resolvedSortOrder,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        CourierShipment.countDocuments(
          filter
        ),
      ]);

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Courier shipments retrieved successfully",
          data: {
            shipments,
            pagination:
              buildPagination({
                page,
                limit,
                total,
              }),
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SINGLE COURIER SHIPMENT

   GET /api/courier-shipments/:shipmentId
========================================================= */

const getCourierShipmentById =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      if (
        !shipmentId ||
        !shipmentId.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Shipment identifier is required",
          });
      }

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: true,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Courier shipment retrieved successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE SHIPMENT STATUS

   PATCH /api/courier-shipments/:shipmentId/status
========================================================= */

const updateCourierShipmentStatus =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      const {
        bookingStatus,
        deliveryStatus,
        courierStatus,
        trackingNumber,
        consignmentId,
        bookingId,
        courierReference,
        currentLocation,
        statusMessage,
        failureReason,
        deliveryAttempts,
        collectedAmount,
        expectedDeliveryAt,
        source = "admin",
        metadata = null,
      } = req.body;

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      if (
        bookingStatus &&
        !BOOKING_STATUSES.includes(
          bookingStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid booking status",
          });
      }

      if (
        deliveryStatus &&
        !DELIVERY_STATUSES.includes(
          deliveryStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid delivery status",
          });
      }

      if (
        shipment.deliveryStatus ===
          "delivered" &&
        deliveryStatus &&
        deliveryStatus !==
          "delivered"
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "A delivered shipment cannot be moved to another status",
          });
      }

      if (
        bookingStatus
      ) {
        shipment.bookingStatus =
          bookingStatus;
      }

      if (
        deliveryStatus
      ) {
        shipment.deliveryStatus =
          deliveryStatus;
      }

      if (
        courierStatus !==
        undefined
      ) {
        shipment.courierStatus =
          normalizeString(
            courierStatus
          );
      }

      if (
        trackingNumber !==
        undefined
      ) {
        shipment.trackingNumber =
          normalizeString(
            trackingNumber
          );
      }

      if (
        consignmentId !==
        undefined
      ) {
        shipment.consignmentId =
          normalizeString(
            consignmentId
          );
      }

      if (
        bookingId !==
        undefined
      ) {
        shipment.bookingId =
          normalizeString(
            bookingId
          );
      }

      if (
        courierReference !==
        undefined
      ) {
        shipment.courierReference =
          normalizeString(
            courierReference
          );
      }

      if (
        currentLocation !==
        undefined
      ) {
        shipment.currentLocation =
          normalizeString(
            currentLocation
          );
      }

      if (
        statusMessage !==
        undefined
      ) {
        shipment.statusMessage =
          normalizeString(
            statusMessage
          );
      }

      if (
        failureReason !==
        undefined
      ) {
        shipment.failureReason =
          normalizeString(
            failureReason
          );
      }

      if (
        deliveryAttempts !==
        undefined
      ) {
        shipment.deliveryAttempts =
          Math.max(
            toSafeNumber(
              deliveryAttempts,
              shipment.deliveryAttempts
            ),
            0
          );
      }

      if (
        collectedAmount !==
        undefined
      ) {
        shipment.pricing.collectedAmount =
          Math.max(
            toSafeNumber(
              collectedAmount,
              shipment.pricing
                .collectedAmount
            ),
            0
          );
      }

      if (
        expectedDeliveryAt !==
        undefined
      ) {
        if (
          expectedDeliveryAt ===
          null
        ) {
          shipment.expectedDeliveryAt =
            null;
        } else {
          const parsedDate =
            new Date(
              expectedDeliveryAt
            );

          if (
            Number.isNaN(
              parsedDate.getTime()
            )
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Invalid expectedDeliveryAt value",
              });
          }

          shipment.expectedDeliveryAt =
            parsedDate;
        }
      }

      shipment.updatedBy =
        getAuthenticatedUserId(
          req
        );

      shipment.addStatusHistory(
        {
          bookingStatus:
            bookingStatus ||
            null,

          deliveryStatus:
            deliveryStatus ||
            null,

          courierStatus:
            normalizeString(
              courierStatus
            ),

          message:
            normalizeString(
              statusMessage,
              "Shipment status updated"
            ),

          location:
            normalizeString(
              currentLocation
            ),

          source:
            STATUS_SOURCES.includes(
              source
            )
              ? source
              : "admin",

          metadata,

          changedBy:
            getAuthenticatedUserId(
              req
            ),

          occurredAt:
            new Date(),
        }
      );

      await shipment.save();

      await shipment.populate([
        {
          path: "courier",
          select:
            "name code providerType logo isActive isDefault",
        },
        {
          path: "order",
          select:
            "orderNumber status paymentStatus totalAmount grandTotal",
        },
        {
          path: "updatedBy",
          select:
            "name email role",
        },
      ]);

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Courier shipment status updated successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      if (
        error?.code === 11000
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Tracking number or consignment ID already exists for this courier",
          });
      }

      return next(error);
    }
  };

/* =========================================================
   ASSIGN OR CHANGE COURIER

   PATCH /api/courier-shipments/:shipmentId/courier
========================================================= */

const assignCourier =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      const {
        courierId,
        reason,
      } = req.body;

      if (
        !courierId ||
        !isValidObjectId(
          courierId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "A valid courier ID is required",
          });
      }

      const [
        shipment,
        courier,
      ] = await Promise.all([
        findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
          }
        ),

        Courier.findOne({
          _id: courierId,
          tenant: tenantId,
        }),
      ]);

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      if (!courier) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier not found",
          });
      }

      if (!courier.isActive) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected courier is inactive",
          });
      }

      if (
        TERMINAL_DELIVERY_STATUSES.includes(
          shipment.deliveryStatus
        )
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Courier cannot be changed for a completed shipment",
          });
      }

      if (
        shipment.bookingStatus ===
          "booked" ||
        shipment.trackingNumber ||
        shipment.consignmentId
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Booked shipment must be cancelled before changing courier",
          });
      }

      const previousCourier =
        shipment.courier;

      shipment.courier =
        courier._id;

      shipment.courierCode =
        courier.code;

      shipment.updatedBy =
        getAuthenticatedUserId(
          req
        );

      shipment.addStatusHistory(
        {
          bookingStatus:
            shipment.bookingStatus,

          deliveryStatus:
            shipment.deliveryStatus,

          message:
            normalizeString(
              reason,
              "Courier assigned or changed"
            ),

          source:
            "admin",

          metadata: {
            previousCourier:
              previousCourier?.toString?.() ||
              previousCourier,

            newCourier:
              courier._id.toString(),

            newCourierCode:
              courier.code,
          },

          changedBy:
            getAuthenticatedUserId(
              req
            ),
        }
      );

      await shipment.save();

      await shipment.populate([
        {
          path: "courier",
          select:
            "name code providerType logo isActive isDefault",
        },
        {
          path: "order",
          select:
            "orderNumber status paymentStatus totalAmount grandTotal",
        },
      ]);

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Courier assigned successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      return next(error);
    }
  };


/* =========================================================
   BOOK SHIPMENT WITH COURIER PROVIDER

   POST /api/courier-shipments/:shipmentId/book
========================================================= */

const bookCourierShipment =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const { shipmentId } =
        req.params;

      let shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
            includePrivateFields:
              true,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      if (shipment.isArchived) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Archived shipment cannot be booked",
          });
      }

      if (
        shipment.bookingStatus ===
          "processing"
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Shipment booking is already processing",
          });
      }

      if (
        shipment.bookingStatus ===
          "booked" ||
        shipment.consignmentId ||
        shipment.trackingNumber
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Shipment is already booked",
          });
      }

      if (
        TERMINAL_DELIVERY_STATUSES.includes(
          shipment.deliveryStatus
        )
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Completed or cancelled shipment cannot be booked",
          });
      }

      const courier =
        await Courier.findOne({
          _id: shipment.courier,
          tenant: tenantId,
        }).select(
          "+credentials.apiKey +credentials.apiSecret +credentials.clientId +credentials.clientSecret +credentials.username +credentials.password"
        );

      if (!courier) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Assigned courier not found",
          });
      }

      if (!courier.isActive) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Assigned courier is inactive",
          });
      }

      const courierCode =
        normalizeString(
          courier.code ||
            courier.providerType
        )?.toLowerCase();

      if (
        !CourierFactory.isSupported(
          courierCode
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              `Unsupported courier provider: ${courierCode}`,
            supportedProviders:
              CourierFactory.getSupportedProviders(),
          });
      }

      const service =
        CourierFactory.get(
          courierCode
        );

      const userId =
        getAuthenticatedUserId(
          req
        );

      const processingMessage =
        `Booking shipment with ${courier.name}`;

      shipment =
        await CourierShipment.findOneAndUpdate(
          {
            _id: shipment._id,
            tenant: tenantId,
            bookingStatus: {
              $in: [
                "pending",
                "failed",
              ],
            },
            consignmentId: null,
            trackingNumber: null,
            isArchived: false,
          },
          {
            $set: {
              bookingStatus:
                "processing",
              statusMessage:
                processingMessage,
              failureReason: null,
              updatedBy: userId,
            },
            $push: {
              statusHistory: {
                bookingStatus:
                  "processing",
                deliveryStatus:
                  shipment.deliveryStatus,
                courierStatus:
                  shipment.courierStatus,
                message:
                  processingMessage,
                source:
                  "courier_api",
                changedBy: userId,
                occurredAt:
                  new Date(),
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).select(
          "+apiLogs +lastApiResponse +lastWebhookPayload"
        );

      if (!shipment) {
        return res.status(409).json({
          success: false,
          message:
            "Shipment is already booked or being processed",
        });
      }

      let providerResult;

      try {
        providerResult =
          await service.createShipment(
            shipment,
            courier
          );
      } catch (providerError) {
        shipment.bookingStatus =
          "failed";
        shipment.failureReason =
          normalizeString(
            providerError.message,
            "Courier booking failed"
          );
        shipment.statusMessage =
          shipment.failureReason;
        shipment.failedAt =
          new Date();
        shipment.updatedBy =
          userId;

        const failedApiLog =
          buildProviderApiLog(
            providerError.apiLog,
            "create_shipment"
          );

        if (failedApiLog) {
          shipment.addApiLog(
            failedApiLog
          );
        }

        shipment.lastApiResponse =
          providerError.apiResponse ||
          null;

        shipment.addStatusHistory({
          bookingStatus:
            "failed",
          deliveryStatus:
            shipment.deliveryStatus,
          courierStatus:
            shipment.courierStatus,
          message:
            shipment.failureReason,
          source:
            "courier_api",
          metadata: {
            provider:
              courierCode,
            statusCode:
              providerError.statusCode ||
              null,
          },
          changedBy: userId,
          occurredAt:
            new Date(),
        });

        await shipment.save();

        return res
          .status(
            providerError.statusCode ||
              502
          )
          .json({
            success: false,
            message:
              shipment.failureReason,
            provider:
              courierCode,
          });
      }

      applyProviderShipmentData(
        shipment,
        providerResult.shipment ||
          {}
      );

      shipment.bookingStatus =
        shipment.bookingStatus ===
        "processing"
          ? "booked"
          : shipment.bookingStatus;

      if (
        shipment.deliveryStatus ===
        "pending"
      ) {
        shipment.deliveryStatus =
          "booked";
      }

      shipment.bookedAt =
        shipment.bookedAt ||
        new Date();
      shipment.lastSyncedAt =
        new Date();
      shipment.failureReason =
        null;
      shipment.updatedBy =
        userId;
      shipment.lastApiResponse =
        providerResult.raw ||
        providerResult.data ||
        null;

      const successApiLog =
        buildProviderApiLog(
          providerResult.apiLog,
          "create_shipment"
        );

      if (successApiLog) {
        shipment.addApiLog(
          successApiLog
        );
      }

      shipment.addStatusHistory({
        bookingStatus:
          shipment.bookingStatus,
        deliveryStatus:
          shipment.deliveryStatus,
        courierStatus:
          shipment.courierStatus,
        message:
          shipment.statusMessage ||
          `Shipment booked with ${courier.name}`,
        source:
          "courier_api",
        metadata: {
          provider:
            courierCode,
          consignmentId:
            shipment.consignmentId,
          trackingNumber:
            shipment.trackingNumber,
        },
        changedBy: userId,
        occurredAt:
          new Date(),
      });

      await shipment.save();

      await shipment.populate([
        {
          path: "courier",
          select:
            "name code providerType logo isActive isDefault",
        },
        {
          path: "order",
          select:
            "orderNumber status paymentStatus totalAmount grandTotal",
        },
        {
          path: "updatedBy",
          select:
            "name email role",
        },
      ]);

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Shipment booked successfully",
          provider:
            courierCode,
          data: {
            shipment,
          },
        });
    } catch (error) {
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Tracking number or consignment ID already exists for this courier",
          });
      }

      return next(error);
    }
  };

/* =========================================================
   SYNC SHIPMENT WITH COURIER PROVIDER

   POST /api/courier-shipments/:shipmentId/sync
========================================================= */

const syncCourierShipment =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const { shipmentId } =
        req.params;

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
            includePrivateFields:
              true,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      if (
        shipment.bookingStatus !==
          "booked" &&
        !shipment.consignmentId &&
        !shipment.trackingNumber
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Shipment must be booked before synchronization",
          });
      }

      const courier =
        await Courier.findOne({
          _id: shipment.courier,
          tenant: tenantId,
        }).select(
          "+credentials.apiKey +credentials.apiSecret +credentials.clientId +credentials.clientSecret +credentials.username +credentials.password"
        );

      if (!courier) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Assigned courier not found",
          });
      }

      const courierCode =
        normalizeString(
          courier.code ||
            courier.providerType
        )?.toLowerCase();

      if (
        !CourierFactory.isSupported(
          courierCode
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              `Unsupported courier provider: ${courierCode}`,
          });
      }

      const service =
        CourierFactory.get(
          courierCode
        );

      const syncMethod =
        typeof service.syncShipment ===
        "function"
          ? "syncShipment"
          : "trackShipment";

      let providerResult;

      try {
        providerResult =
          await service[syncMethod](
            shipment,
            courier
          );
      } catch (providerError) {
        shipment.syncAttempts =
          Number(
            shipment.syncAttempts ||
              0
          ) + 1;
        shipment.lastSyncedAt =
          new Date();
        shipment.statusMessage =
          normalizeString(
            providerError.message,
            "Shipment synchronization failed"
          );

        const failedApiLog =
          buildProviderApiLog(
            providerError.apiLog,
            "sync_shipment"
          );

        if (failedApiLog) {
          shipment.addApiLog(
            failedApiLog
          );
        }

        await shipment.save();

        return res
          .status(
            providerError.statusCode ||
              502
          )
          .json({
            success: false,
            message:
              shipment.statusMessage,
            provider:
              courierCode,
          });
      }

      const providerShipment =
        providerResult.shipment ||
        providerResult.tracking ||
        {};

      applyProviderShipmentData(
        shipment,
        providerShipment
      );

      shipment.lastSyncedAt =
        new Date();
      shipment.syncAttempts =
        Number(
          shipment.syncAttempts ||
            0
        ) + 1;
      shipment.updatedBy =
        getAuthenticatedUserId(
          req
        );
      shipment.lastApiResponse =
        providerResult.raw ||
        providerResult.data ||
        null;

      const apiLog =
        buildProviderApiLog(
          providerResult.apiLog,
          "sync_shipment"
        );

      if (apiLog) {
        shipment.addApiLog(
          apiLog
        );
      }

      shipment.addStatusHistory({
        bookingStatus:
          shipment.bookingStatus,
        deliveryStatus:
          shipment.deliveryStatus,
        courierStatus:
          shipment.courierStatus,
        message:
          shipment.statusMessage ||
          "Shipment synchronized",
        location:
          shipment.currentLocation,
        source:
          "courier_api",
        metadata: {
          provider:
            courierCode,
        },
        changedBy:
          getAuthenticatedUserId(
            req
          ),
        occurredAt:
          new Date(),
      });

      await shipment.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Shipment synchronized successfully",
          provider:
            courierCode,
          data: {
            shipment,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   CANCEL SHIPMENT

   PATCH /api/courier-shipments/:shipmentId/cancel
========================================================= */

const cancelCourierShipment =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      const {
        reason,
      } = req.body;

      if (
        !normalizeString(reason)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Cancellation reason is required",
          });
      }

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      if (
        shipment.deliveryStatus ===
        "delivered"
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Delivered shipment cannot be cancelled",
          });
      }

      if (
        shipment.bookingStatus ===
          "cancelled" ||
        shipment.deliveryStatus ===
          "cancelled"
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Shipment is already cancelled",
          });
      }

      shipment.bookingStatus =
        "cancelled";

      shipment.deliveryStatus =
        "cancelled";

      shipment.cancellationReason =
        normalizeString(reason);

      shipment.isActive = false;

      shipment.cancelledAt =
        shipment.cancelledAt ||
        new Date();

      shipment.updatedBy =
        getAuthenticatedUserId(
          req
        );

      shipment.addStatusHistory(
        {
          bookingStatus:
            "cancelled",

          deliveryStatus:
            "cancelled",

          message:
            normalizeString(
              reason
            ),

          source:
            "admin",

          changedBy:
            getAuthenticatedUserId(
              req
            ),

          occurredAt:
            new Date(),
        }
      );

      await shipment.save();

      await shipment.populate([
        {
          path: "courier",
          select:
            "name code providerType logo isActive isDefault",
        },
        {
          path: "order",
          select:
            "orderNumber status paymentStatus totalAmount grandTotal",
        },
      ]);

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Courier shipment cancelled successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SHIPMENT TRACKING TIMELINE

   GET /api/courier-shipments/:shipmentId/tracking
========================================================= */

const getShipmentTracking =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      const statusHistory = [
        ...(shipment.statusHistory ||
          []),
      ].sort(
        (first, second) =>
          new Date(
            second.occurredAt
          ).getTime() -
          new Date(
            first.occurredAt
          ).getTime()
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Shipment tracking retrieved successfully",
          data: {
            shipment: {
              _id:
                shipment._id,

              shipmentNumber:
                shipment.shipmentNumber,

              orderNumber:
                shipment.orderNumber,

              courierCode:
                shipment.courierCode,

              trackingNumber:
                shipment.trackingNumber,

              consignmentId:
                shipment.consignmentId,

              bookingStatus:
                shipment.bookingStatus,

              deliveryStatus:
                shipment.deliveryStatus,

              courierStatus:
                shipment.courierStatus,

              currentLocation:
                shipment.currentLocation,

              statusMessage:
                shipment.statusMessage,

              expectedDeliveryAt:
                shipment.expectedDeliveryAt,

              bookedAt:
                shipment.bookedAt,

              pickedUpAt:
                shipment.pickedUpAt,

              outForDeliveryAt:
                shipment.outForDeliveryAt,

              deliveredAt:
                shipment.deliveredAt,

              cancelledAt:
                shipment.cancelledAt,

              returnedAt:
                shipment.returnedAt,

              lastSyncedAt:
                shipment.lastSyncedAt,

              statusHistory,
            },
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   ARCHIVE SHIPMENT

   PATCH /api/courier-shipments/:shipmentId/archive
========================================================= */

const archiveCourierShipment =
  async (req, res, next) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res
        );

      if (!tenantId) {
        return;
      }
      const {
        shipmentId,
      } = req.params;

      const {
        isArchived = true,
      } = req.body;

      const shipment =
        await findShipmentByIdentifier(
          shipmentId,
          tenantId,
          {
            populate: false,
          }
        );

      if (!shipment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Courier shipment not found",
          });
      }

      shipment.isArchived =
        parseBoolean(
          isArchived,
          true
        );

      shipment.updatedBy =
        getAuthenticatedUserId(
          req
        );

      await shipment.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            shipment.isArchived
              ? "Courier shipment archived successfully"
              : "Courier shipment restored successfully",
          data: {
            shipment,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   EXPORT CONTROLLER FUNCTIONS
========================================================= */

module.exports = {
  createCourierShipment,
  getCourierShipments,
  getCourierShipmentById,
  bookCourierShipment,
  syncCourierShipment,
  updateCourierShipmentStatus,
  assignCourier,
  cancelCourierShipment,
  getShipmentTracking,
  archiveCourierShipment,
};