const Order = require(
  "../models/Order"
);

/* =========================================================
   CUSTOMER MODULE OVERVIEW

   TownMela storefront is guest-only.

   Therefore, customer information is generated from
   Order snapshots instead of a separate Customer model.

   Customers are grouped primarily by phone number.
========================================================= */

/* =========================================================
   NORMALIZE TEXT
========================================================= */

const normalizeText = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
};

/* =========================================================
   NORMALIZE PHONE
========================================================= */

const normalizePhone = (
  value
) => {
  const cleanValue =
    normalizeText(value);

  if (!cleanValue) {
    return "";
  }

  return cleanValue.replace(
    /[^\d+]/g,
    ""
  );
};

/* =========================================================
   PARSE POSITIVE INTEGER
========================================================= */

const parsePositiveInteger = (
  value,
  fallbackValue
) => {
  const parsedValue =
    Number.parseInt(
      String(value),
      10
    );

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallbackValue;
  }

  return parsedValue;
};

/* =========================================================
   ESCAPE REGULAR EXPRESSION
========================================================= */

const escapeRegExp = (
  value
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

/* =========================================================
   VALID ORDER STATUS
========================================================= */

const getValidOrderStatus = (
  value
) => {
  const cleanStatus =
    normalizeText(value);

  const allowedStatuses = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  if (
    allowedStatuses.includes(
      cleanStatus
    )
  ) {
    return cleanStatus;
  }

  return "";
};

/* =========================================================
   CUSTOMER GROUP KEY

   Customer phone exists:
   → group orders using phone

   Phone does not exist:
   → group using guestId
========================================================= */

const buildCustomerKeyExpression =
  () => {
    return {
      $let: {
        vars: {
          cleanPhone: {
            $trim: {
              input: {
                $ifNull: [
                  "$customer.phone",
                  "",
                ],
              },
            },
          },
        },

        in: {
          $cond: [
            {
              $ne: [
                "$$cleanPhone",
                "",
              ],
            },

            {
              $toLower:
                "$$cleanPhone",
            },

            {
              $concat: [
                "guest:",
                {
                  $ifNull: [
                    "$guestId",
                    {
                      $toString:
                        "$_id",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
  };

/* =========================================================
   BUILD CUSTOMER SEARCH FILTER
========================================================= */

const buildCustomerMatch = ({
  search,
  orderStatus,
}) => {
  const match = {};

  if (orderStatus) {
    match.orderStatus =
      orderStatus;
  }

  if (search) {
    const safeSearch =
      escapeRegExp(search);

    match.$or = [
      {
        "customer.fullName": {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        "customer.phone": {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        "customer.email": {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        orderNumber: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  return match;
};

/* =========================================================
   BUILD CUSTOMER SORT
========================================================= */

const buildCustomerSort = (
  sortBy,
  sortOrder
) => {
  const allowedSortFields = {
    latest:
      "lastOrderDate",

    oldest:
      "firstOrderDate",

    orders:
      "totalOrders",

    spent:
      "totalSpent",

    name:
      "fullName",
  };

  const sortField =
    allowedSortFields[
      sortBy
    ] || "lastOrderDate";

  const sortDirection =
    String(
      sortOrder
    ).toLowerCase() ===
    "asc"
      ? 1
      : -1;

  return {
    [sortField]:
      sortDirection,

    customerId: 1,
  };
};

/* =========================================================
   GET ALL CUSTOMERS

   METHOD:
   GET /api/customers

   QUERY PARAMETERS:

   page
   limit
   search
   orderStatus
   sortBy
   sortOrder

   Examples:

   /api/customers?page=1&limit=10

   /api/customers?search=017

   /api/customers?orderStatus=Delivered

   /api/customers?sortBy=spent&sortOrder=desc
========================================================= */

const getAllCustomers =
  async (
    req,
    res
  ) => {
    try {
      const page =
        parsePositiveInteger(
          req.query.page,
          1
        );

      const requestedLimit =
        parsePositiveInteger(
          req.query.limit,
          10
        );

      /*
        Maximum 100 customer records
        can be returned per request.
      */

      const limit =
        Math.min(
          requestedLimit,
          100
        );

      const skip =
        (page - 1) *
        limit;

      const search =
        normalizeText(
          req.query.search
        );

      const orderStatus =
        getValidOrderStatus(
          req.query
            .orderStatus
        );

      const sortBy =
        normalizeText(
          req.query.sortBy
        ) || "latest";

      const sortOrder =
        normalizeText(
          req.query.sortOrder
        ).toLowerCase() ===
        "asc"
          ? "asc"
          : "desc";

      const matchStage =
        buildCustomerMatch({
          search,
          orderStatus,
        });

      const sortStage =
        buildCustomerSort(
          sortBy,
          sortOrder
        );

      const pipeline = [
        /*
          Search and status filter
        */

        {
          $match:
            matchStage,
        },

        /*
          Newest orders first.

          After grouping:
          $first = latest order
          $last = oldest order
        */

        {
          $sort: {
            createdAt: -1,
            _id: -1,
          },
        },

        /*
          Generate customer grouping key.
        */

        {
          $addFields: {
            customerKey:
              buildCustomerKeyExpression(),
          },
        },

        /*
          Group all orders belonging
          to the same customer.
        */

        {
          $group: {
            _id:
              "$customerKey",

            fullName: {
              $first:
                "$customer.fullName",
            },

            phone: {
              $first:
                "$customer.phone",
            },

            email: {
              $first:
                "$customer.email",
            },

            guestId: {
              $first:
                "$guestId",
            },

            latestShippingAddress: {
              $first:
                "$shippingAddress",
            },

            firstOrderDate: {
              $last:
                "$createdAt",
            },

            lastOrderDate: {
              $first:
                "$createdAt",
            },

            latestOrderId: {
              $first:
                "$_id",
            },

            latestOrderNumber: {
              $first:
                "$orderNumber",
            },

            latestOrderStatus: {
              $first:
                "$orderStatus",
            },

            latestPaymentStatus: {
              $first:
                "$paymentStatus",
            },

            totalOrders: {
              $sum: 1,
            },

            /*
              Cancelled order amount is
              excluded from totalSpent.
            */

            totalSpent: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$orderStatus",
                      "Cancelled",
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },
                        deliveredOrders: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "Delivered",
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            pendingOrders: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "Pending",
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            processingOrders: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "Processing",
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            shippedOrders: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "Shipped",
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            cancelledOrders: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "Cancelled",
                    ],
                  },

                  1,

                  0,
                ],
              },
            },
          },
        },

        /*
          Prepare clean customer response.
        */

        {
          $project: {
            _id: 0,

            customerId:
              "$_id",

            fullName: {
              $ifNull: [
                "$fullName",
                "Unknown Customer",
              ],
            },

            phone: {
              $ifNull: [
                "$phone",
                "",
              ],
            },

            email: {
              $ifNull: [
                "$email",
                null,
              ],
            },

            guestId: {
              $ifNull: [
                "$guestId",
                null,
              ],
            },

            latestShippingAddress: 1,

            firstOrderDate: 1,

            lastOrderDate: 1,

            latestOrderId: 1,

            latestOrderNumber: 1,

            latestOrderStatus: 1,

            latestPaymentStatus: 1,

            totalOrders: 1,

            totalSpent: {
              $round: [
                "$totalSpent",
                2,
              ],
            },

            deliveredOrders: 1,

            pendingOrders: 1,

            processingOrders: 1,

            shippedOrders: 1,

            cancelledOrders: 1,
          },
        },

        /*
          Return paginated customers,
          total count and summary
          using a single database query.
        */

        {
          $facet: {
            customers: [
              {
                $sort:
                  sortStage,
              },

              {
                $skip:
                  skip,
              },

              {
                $limit:
                  limit,
              },
            ],

            metadata: [
              {
                $count:
                  "totalCustomers",
              },
            ],

            summary: [
              {
                $group: {
                  _id: null,

                  totalCustomers: {
                    $sum: 1,
                  },

                  totalOrders: {
                    $sum:
                      "$totalOrders",
                  },

                  totalSpent: {
                    $sum:
                      "$totalSpent",
                  },

                  totalDeliveredOrders: {
                    $sum:
                      "$deliveredOrders",
                  },

                  totalPendingOrders: {
                    $sum:
                      "$pendingOrders",
                  },

                  totalProcessingOrders: {
                    $sum:
                      "$processingOrders",
                  },

                  totalShippedOrders: {
                    $sum:
                      "$shippedOrders",
                  },

                  totalCancelledOrders: {
                    $sum:
                      "$cancelledOrders",
                  },
                },
              },
            ],
          },
        },
      ];

      const [
        result,
      ] =
        await Order.aggregate(
          pipeline
        );

      const customers =
        result?.customers ??
        [];

      const totalCustomers =
        result?.metadata?.[0]
          ?.totalCustomers ??
        0;

      const summary =
        result?.summary?.[0] ??
        {
          totalCustomers: 0,

          totalOrders: 0,

          totalSpent: 0,

          totalDeliveredOrders: 0,

          totalPendingOrders: 0,

          totalProcessingOrders: 0,

          totalShippedOrders: 0,

          totalCancelledOrders: 0,
        };

      const totalPages =
        totalCustomers === 0
          ? 0
          : Math.ceil(
              totalCustomers /
                limit
            );

      return res
        .status(200)
        .json({
          success: true,

          customers,

          pagination: {
            page,

            limit,

            totalCustomers,

            totalPages,

            hasPreviousPage:
              page > 1,

            hasNextPage:
              page <
              totalPages,
          },

          summary: {
            totalCustomers:
              Number(
                summary
                  .totalCustomers
              ) || 0,

            totalOrders:
              Number(
                summary
                  .totalOrders
              ) || 0,

            totalSpent:
              Number(
                Number(
                  summary
                    .totalSpent
                ).toFixed(2)
              ) || 0,

            totalDeliveredOrders:
              Number(
                summary
                  .totalDeliveredOrders
              ) || 0,

            totalPendingOrders:
              Number(
                summary
                  .totalPendingOrders
              ) || 0,

            totalProcessingOrders:
              Number(
                summary
                  .totalProcessingOrders
              ) || 0,

            totalShippedOrders:
              Number(
                summary
                  .totalShippedOrders
              ) || 0,

            totalCancelledOrders:
              Number(
                summary
                  .totalCancelledOrders
              ) || 0,
          },

          filters: {
            search,

            orderStatus:
              orderStatus ||
              null,

            sortBy,

            sortOrder,
          },
        });
    } catch (error) {
      console.error(
        "Get all customers error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to load customers",
        });
    }
  };

/* =========================================================
   BUILD FLEXIBLE PHONE PATTERN

   Example:

   01712345678

   Will also match:

   01712-345678
   01712 345678
   (01712) 345678
========================================================= */

const buildFlexiblePhonePattern = (
  phone
) => {
  const phoneDigits =
    phone.replace(
      /\D/g,
      ""
    );

  if (!phoneDigits) {
    return "";
  }

  return phoneDigits
    .split("")
    .map(
      (digit) =>
        escapeRegExp(
          digit
        )
    )
    .join(
      "[\\s\\-()]*"
    );
};

/* =========================================================
   BUILD UNIQUE CUSTOMER ADDRESSES
========================================================= */

const buildUniqueAddresses = (
  orders
) => {
  const addresses = [];

  const addressKeys =
    new Set();

  for (
    const order of orders
  ) {
    const address =
      order.shippingAddress;

    if (!address) {
      continue;
    }

    const addressKey = [
      address.division,
      address.district,
      address.area,
      address.address,
      address.postalCode,
    ]
      .map((value) =>
        normalizeText(
          value
        ).toLowerCase()
      )
      .join("|");

    if (
      !addressKey ||
      addressKeys.has(
        addressKey
      )
    ) {
      continue;
    }

    addressKeys.add(
      addressKey
    );

    addresses.push({
      division:
        address.division,

      district:
        address.district,

      area:
        address.area,

      address:
        address.address,

      postalCode:
        address.postalCode ??
        null,

      lastUsedAt:
        order.createdAt,
    });
  }

  return addresses;
};

/* =========================================================
   CALCULATE TOTAL ITEMS
========================================================= */

const calculateTotalItems = (
  orders
) => {
  return orders.reduce(
    (
      customerTotal,
      order
    ) => {
      const orderItems =
        Array.isArray(
          order.items
        )
          ? order.items
          : [];

      const orderTotal =
        orderItems.reduce(
          (
            itemTotal,
            item
          ) => {
            return (
              itemTotal +
              (
                Number(
                  item.quantity
                ) || 0
              )
            );
          },
          0
        );

      return (
        customerTotal +
        orderTotal
      );
    },
    0
  );
};
/* =========================================================
   CALCULATE CUSTOMER TOTAL SPENT

   Cancelled orders are excluded.
========================================================= */

const calculateTotalSpent = (
  orders
) => {
  return orders.reduce(
    (
      total,
      order
    ) => {
      if (
        order.orderStatus ===
        "Cancelled"
      ) {
        return total;
      }

      return (
        total +
        (
          Number(
            order.totalAmount
          ) || 0
        )
      );
    },
    0
  );
};

/* =========================================================
   GET SINGLE CUSTOMER

   METHOD:
   GET /api/customers/:customerId

   customerId normally contains
   the customer phone number.

   Fallback format:

   guest:guest_xxxxxxxx
========================================================= */

const getSingleCustomer =
  async (
    req,
    res
  ) => {
    try {
      const rawCustomerId =
        normalizeText(
          req.params
            .customerId
        );

      let customerId = "";

      try {
        customerId =
          decodeURIComponent(
            rawCustomerId
          );
      } catch (error) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid customer ID",
          });
      }

      if (!customerId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Customer ID is required",
          });
      }

      let customerMatch = {};

      /*
        Fallback customer key based
        on guest ID.
      */

      if (
        customerId.startsWith(
          "guest:"
        )
      ) {
        const guestId =
          normalizeText(
            customerId.slice(
              "guest:".length
            )
          );

        if (!guestId) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid customer ID",
            });
        }

        customerMatch = {
          guestId,
        };
      } else {
        /*
          Customer key based on phone.
        */

        const normalizedPhone =
          normalizePhone(
            customerId
          );

        if (
          !normalizedPhone
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid customer ID",
            });
        }

        const flexiblePhonePattern =
          buildFlexiblePhonePattern(
            normalizedPhone
          );

        if (
          !flexiblePhonePattern
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid customer phone",
            });
        }

        customerMatch = {
          "customer.phone": {
            $regex:
              `^\\+?[\\s\\-()]*${flexiblePhonePattern}$`,

            $options: "i",
          },
        };
      }

      /*
        Load complete order history
        for this customer.
      */

      const orders =
        await Order.find(
          customerMatch
        )
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .lean();

      if (
        orders.length === 0
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Customer not found",
          });
      }

      const latestOrder =
        orders[0];

      const oldestOrder =
        orders[
          orders.length - 1
        ];

      /*
        Separate orders by status.
      */

      const deliveredOrders =
        orders.filter(
          (order) =>
            order.orderStatus ===
            "Delivered"
        );

      const pendingOrders =
        orders.filter(
          (order) =>
            order.orderStatus ===
            "Pending"
        );

      const processingOrders =
        orders.filter(
          (order) =>
            order.orderStatus ===
            "Processing"
        );

      const shippedOrders =
        orders.filter(
          (order) =>
            order.orderStatus ===
            "Shipped"
        );

      const cancelledOrders =
        orders.filter(
          (order) =>
            order.orderStatus ===
            "Cancelled"
        );

      const activeOrders =
        orders.filter(
          (order) =>
            order.orderStatus !==
            "Cancelled"
        );

      /*
        Calculate customer statistics.
      */

      const totalSpent =
        calculateTotalSpent(
          orders
        );

      const totalItems =
        calculateTotalItems(
          orders
        );

      const averageOrderValue =
        activeOrders.length ===
        0
          ? 0
          : Number(
              (
                totalSpent /
                activeOrders.length
              ).toFixed(2)
            );

      /*
        Remove duplicate shipping
        addresses.
      */

      const addresses =
        buildUniqueAddresses(
          orders
        );

      /*
        Build clean customer details.
      */

      const customer = {
        customerId,

        fullName:
          latestOrder
            .customer
            ?.fullName ||
          "Unknown Customer",

        phone:
          latestOrder
            .customer
            ?.phone ||
          "",

        email:
          latestOrder
            .customer
            ?.email ??
          null,

        guestId:
          latestOrder
            .guestId ??
          null,

        firstOrderDate:
          oldestOrder
            .createdAt,

        lastOrderDate:
          latestOrder
            .createdAt,

        latestShippingAddress:
          latestOrder
            .shippingAddress ??
          null,

        addresses,

        statistics: {
          totalOrders:
            orders.length,

          totalItems,

          totalSpent:
            Number(
              totalSpent.toFixed(
                2
              )
            ),

          averageOrderValue,

          deliveredOrders:
            deliveredOrders
              .length,

          pendingOrders:
            pendingOrders
              .length,

          processingOrders:
            processingOrders
              .length,

          shippedOrders:
            shippedOrders
              .length,

          cancelledOrders:
            cancelledOrders
              .length,
        },

        latestOrder: {
          _id:
            latestOrder
              ._id,

          orderNumber:
            latestOrder
              .orderNumber,

          orderStatus:
            latestOrder
              .orderStatus,

          paymentMethod:
            latestOrder
              .paymentMethod,

          paymentStatus:
            latestOrder
              .paymentStatus,

          subtotalAmount:
            latestOrder
              .subtotalAmount,

          deliveryCharge:
            latestOrder
              .deliveryCharge,

          discountAmount:
            latestOrder
              .discountAmount,

          totalAmount:
            latestOrder
              .totalAmount,

          createdAt:
            latestOrder
              .createdAt,
        },
      };

      /*
        Prepare clean customer
        order history.
      */

      const customerOrders =
        orders.map(
          (order) => ({
            _id:
              order._id,

            orderNumber:
              order
                .orderNumber,

            items:
              order.items,

            subtotalAmount:
              order
                .subtotalAmount,

            deliveryCharge:
              order
                .deliveryCharge,

            discountAmount:
              order
                .discountAmount,

            couponCode:
              order
                .couponCode ??
              null,

            totalAmount:
              order
                .totalAmount,

            paymentMethod:
              order
                .paymentMethod,

            paymentStatus:
              order
                .paymentStatus,

            orderStatus:
              order
                .orderStatus,

            shippingAddress:
              order
                .shippingAddress,

            customerNote:
              order
                .customerNote ??
              null,

            statusHistory:
              order
                .statusHistory,

            createdAt:
              order
                .createdAt,

            updatedAt:
              order
                .updatedAt,
          })
        );

      return res
        .status(200)
        .json({
          success: true,

          customer,

          orders:
            customerOrders,
        });
    } catch (error) {
      console.error(
        "Get single customer error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to load customer details",
        });
    }
  };
  /* =========================================================
   GET CUSTOMER SUMMARY

   METHOD:
   GET /api/customers/summary

   Returns overall customer statistics
   generated from Order collection.
========================================================= */

const getCustomerSummary =
  async (
    req,
    res
  ) => {
    try {
      const [
        summary,
      ] =
        await Order.aggregate([
          {
            $sort: {
              createdAt: -1,
              _id: -1,
            },
          },

          {
            $addFields: {
              customerKey:
                buildCustomerKeyExpression(),
            },
          },

          {
            $group: {
              _id:
                "$customerKey",

              totalOrders: {
                $sum: 1,
              },

              totalSpent: {
                $sum: {
                  $cond: [
                    {
                      $ne: [
                        "$orderStatus",
                        "Cancelled",
                      ],
                    },

                    "$totalAmount",

                    0,
                  ],
                },
              },

              deliveredOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$orderStatus",
                        "Delivered",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              pendingOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$orderStatus",
                        "Pending",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              processingOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$orderStatus",
                        "Processing",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              shippedOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$orderStatus",
                        "Shipped",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              cancelledOrders: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$orderStatus",
                        "Cancelled",
                      ],
                    },

                    1,

                    0,
                  ],
                },
              },

              firstOrderDate: {
                $min:
                  "$createdAt",
              },

              lastOrderDate: {
                $max:
                  "$createdAt",
              },
            },
          },

          {
            $group: {
              _id: null,

              totalCustomers: {
                $sum: 1,
              },

              totalOrders: {
                $sum:
                  "$totalOrders",
              },

              totalSpent: {
                $sum:
                  "$totalSpent",
              },

              totalDeliveredOrders: {
                $sum:
                  "$deliveredOrders",
              },

              totalPendingOrders: {
                $sum:
                  "$pendingOrders",
              },

              totalProcessingOrders: {
                $sum:
                  "$processingOrders",
              },

              totalShippedOrders: {
                $sum:
                  "$shippedOrders",
              },

              totalCancelledOrders: {
                $sum:
                  "$cancelledOrders",
              },

              firstCustomerOrderDate: {
                $min:
                  "$firstOrderDate",
              },

              latestCustomerOrderDate: {
                $max:
                  "$lastOrderDate",
              },
            },
          },

          {
            $project: {
              _id: 0,

              totalCustomers: 1,

              totalOrders: 1,

              totalSpent: {
                $round: [
                  "$totalSpent",
                  2,
                ],
              },

              totalDeliveredOrders: 1,

              totalPendingOrders: 1,

              totalProcessingOrders: 1,

              totalShippedOrders: 1,

              totalCancelledOrders: 1,

              averageOrdersPerCustomer: {
                $cond: [
                  {
                    $eq: [
                      "$totalCustomers",
                      0,
                    ],
                  },

                  0,

                  {
                    $round: [
                      {
                        $divide: [
                          "$totalOrders",
                          "$totalCustomers",
                        ],
                      },

                      2,
                    ],
                  },
                ],
              },

              averageSpentPerCustomer: {
                $cond: [
                  {
                    $eq: [
                      "$totalCustomers",
                      0,
                    ],
                  },

                  0,

                  {
                    $round: [
                      {
                        $divide: [
                          "$totalSpent",
                          "$totalCustomers",
                        ],
                      },

                      2,
                    ],
                  },
                ],
              },

              firstCustomerOrderDate: 1,

              latestCustomerOrderDate: 1,
            },
          },
        ]);

      return res
        .status(200)
        .json({
          success: true,

          summary:
            summary || {
              totalCustomers: 0,

              totalOrders: 0,

              totalSpent: 0,

              totalDeliveredOrders: 0,

              totalPendingOrders: 0,

              totalProcessingOrders: 0,

              totalShippedOrders: 0,

              totalCancelledOrders: 0,

              averageOrdersPerCustomer: 0,

              averageSpentPerCustomer: 0,

              firstCustomerOrderDate: null,

              latestCustomerOrderDate: null,
            },
        });
    } catch (error) {
      console.error(
        "Get customer summary error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Failed to load customer summary",
        });
    }
  };

/* =========================================================
   EXPORT CUSTOMER CONTROLLER
========================================================= */

module.exports = {
  getAllCustomers,

  getSingleCustomer,

  getCustomerSummary,
};