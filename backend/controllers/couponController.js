const mongoose = require(
  "mongoose",
);

const Coupon = require(
  "../models/Coupon",
);

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const normalizeCouponCode = (
  value,
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase();
};

const parseNumber = (
  value,
  fallback = 0,
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : fallback;
};

const parseNullableNumber = (
  value,
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : null;
};

const parseBoolean = (
  value,
  fallback = true,
) => {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
};

const getTenantId = (
  req,
) => {
  const tenantId =
    req.tenantId ||
    req.tenant?._id ||
    req.tenant ||
    req.headers?.[
      "x-tenant-id"
    ] ||
    "";

  const normalizedTenantId =
    String(tenantId).trim();

  if (
    !mongoose.Types.ObjectId.isValid(
      normalizedTenantId,
    )
  ) {
    return "";
  }

  return normalizedTenantId;
};

const requireTenantId = (
  req,
  res,
) => {
  const tenantId =
    getTenantId(req);

  if (!tenantId) {
    res.status(400).json({
      success: false,
      message:
        "A valid tenant ID is required",
    });

    return null;
  }

  return tenantId;
};

const validateCouponInput = ({
  code,
  discountType,
  discountValue,
  minOrderAmount,
  maxDiscountAmount,
  expiresAt,
  requireCode = true,
}) => {
  if (
    requireCode &&
    !code
  ) {
    return "Coupon code is required";
  }

  if (
    code &&
    !/^[A-Z0-9_-]+$/.test(
      code,
    )
  ) {
    return "Coupon code can contain only letters, numbers, underscore and hyphen";
  }

  if (
    discountType &&
    ![
      "percentage",
      "fixed",
    ].includes(
      discountType,
    )
  ) {
    return "Discount type must be percentage or fixed";
  }

  if (
    discountValue !==
      undefined &&
    discountValue !== null
  ) {
    if (
      !Number.isFinite(
        discountValue,
      ) ||
      discountValue <= 0
    ) {
      return "Discount value must be greater than 0";
    }

    if (
      discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      return "Percentage discount cannot exceed 100";
    }
  }

  if (
    minOrderAmount !==
      undefined &&
    minOrderAmount !== null &&
    (
      !Number.isFinite(
        minOrderAmount,
      ) ||
      minOrderAmount < 0
    )
  ) {
    return "Minimum order amount cannot be negative";
  }

  if (
    maxDiscountAmount !==
      undefined &&
    maxDiscountAmount !==
      null &&
    (
      !Number.isFinite(
        maxDiscountAmount,
      ) ||
      maxDiscountAmount < 0
    )
  ) {
    return "Maximum discount amount cannot be negative";
  }

  if (expiresAt) {
    const expiryDate =
      new Date(expiresAt);

    if (
      Number.isNaN(
        expiryDate.getTime(),
      )
    ) {
      return "Invalid coupon expiry date";
    }
  }

  return null;
};

/* =========================================================
   CREATE COUPON
   POST /api/coupons
   ADMIN ONLY
========================================================= */

const createCoupon = async (
  req,
  res,
) => {
  try {
    const tenantId =
      requireTenantId(
        req,
        res,
      );

    if (!tenantId) {
      return;
    }

    const cleanCode =
      normalizeCouponCode(
        req.body.code,
      );

    const discountType =
      typeof req.body
        .discountType ===
      "string"
        ? req.body.discountType
            .trim()
            .toLowerCase()
        : "";

    const discountValue =
      parseNumber(
        req.body
          .discountValue,
        NaN,
      );

    const minOrderAmount =
      parseNumber(
        req.body
          .minOrderAmount,
        0,
      );

    const maxDiscountAmount =
      parseNullableNumber(
        req.body
          .maxDiscountAmount,
      );

    const isActive =
      parseBoolean(
        req.body.isActive,
        true,
      );

    const expiresAt =
      req.body.expiresAt;

    if (
      !cleanCode ||
      !discountType ||
      !Number.isFinite(
        discountValue,
      ) ||
      !expiresAt
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Code, discount type, discount value and expiry date are required",
        });
    }

    const validationError =
      validateCouponInput({
        code: cleanCode,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        expiresAt,
      });

    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            validationError,
        });
    }

    const expiryDate =
      new Date(expiresAt);

    if (
      expiryDate <=
      new Date()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Coupon expiry date must be in the future",
        });
    }

    const existingCoupon =
      await Coupon.findOne({
        tenant: tenantId,
        code: cleanCode,
      });

    if (existingCoupon) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Coupon code already exists for this tenant",
        });
    }

    const coupon =
      await Coupon.create({
        tenant: tenantId,
        code: cleanCode,
        discountType,
        discountValue,
        minOrderAmount,

        maxDiscountAmount:
          discountType ===
          "percentage"
            ? maxDiscountAmount
            : null,

        isActive,
        expiresAt:
          expiryDate,
      });

    return res
      .status(201)
      .json({
        success: true,
        message:
          "Coupon created successfully",
        coupon,
      });
  } catch (error) {
    console.error(
      "Create coupon error:",
      error,
    );

    if (
      error?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Coupon code already exists for this tenant",
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to create coupon",
        error:
          error.message,
      });
  }
};

/* =========================================================
   GET ALL COUPONS
   GET /api/coupons
   ADMIN ONLY
========================================================= */

const getAllCoupons = async (
  req,
  res,
) => {
  try {
    const tenantId =
      requireTenantId(
        req,
        res,
      );

    if (!tenantId) {
      return;
    }

    const page = Math.max(
      parseInt(
        req.query.page,
        10,
      ) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        parseInt(
          req.query.limit,
          10,
        ) || 10,
        1,
      ),
      100,
    );

    const skip =
      (page - 1) *
      limit;

    const search =
      typeof req.query
        .search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query
        .status === "string"
        ? req.query.status
            .trim()
            .toLowerCase()
        : "all";

    const discountType =
      typeof req.query
        .discountType ===
      "string"
        ? req.query.discountType
            .trim()
            .toLowerCase()
        : "all";

    const now = new Date();

    const filter = {
      tenant: tenantId,
    };

    if (search) {
      filter.code = {
        $regex: search,
        $options: "i",
      };
    }

    if (
      [
        "percentage",
        "fixed",
      ].includes(
        discountType,
      )
    ) {
      filter.discountType =
        discountType;
    }

    if (
      status === "active"
    ) {
      filter.isActive = true;
      filter.expiresAt = {
        $gt: now,
      };
    }

    if (
      status === "inactive"
    ) {
      filter.isActive = false;
    }

    if (
      status === "expired"
    ) {
      filter.expiresAt = {
        $lte: now,
      };
    }

    const summaryBaseFilter = {
      tenant: tenantId,
    };

    const [
      coupons,
      totalCoupons,
      totalAllCoupons,
      totalActive,
      totalInactive,
      totalExpired,
    ] = await Promise.all([
      Coupon.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Coupon.countDocuments(
        filter,
      ),

      Coupon.countDocuments(
        summaryBaseFilter,
      ),

      Coupon.countDocuments({
        ...summaryBaseFilter,
        isActive: true,
        expiresAt: {
          $gt: now,
        },
      }),

      Coupon.countDocuments({
        ...summaryBaseFilter,
        isActive: false,
      }),

      Coupon.countDocuments({
        ...summaryBaseFilter,
        expiresAt: {
          $lte: now,
        },
      }),
    ]);

    const formattedCoupons =
      coupons.map(
        (coupon) => ({
          ...coupon,

          status:
            coupon.expiresAt <=
            now
              ? "expired"
              : coupon.isActive
                ? "active"
                : "inactive",
        }),
      );

    return res
      .status(200)
      .json({
        success: true,
        coupons:
          formattedCoupons,

        summary: {
          totalCoupons:
            totalAllCoupons,
          activeCoupons:
            totalActive,
          inactiveCoupons:
            totalInactive,
          expiredCoupons:
            totalExpired,
        },

        pagination: {
          currentPage:
            page,
          totalPages:
            Math.max(
              Math.ceil(
                totalCoupons /
                  limit,
              ),
              1,
            ),
          totalItems:
            totalCoupons,
          limit,
          hasNextPage:
            page *
              limit <
            totalCoupons,
          hasPreviousPage:
            page > 1,
        },
      });
  } catch (error) {
    console.error(
      "Get coupons error:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to load coupons",
        error:
          error.message,
      });
  }
};

/* =========================================================
   GET SINGLE COUPON
   GET /api/coupons/:couponId
   ADMIN ONLY
========================================================= */

const getSingleCoupon =
  async (req, res) => {
    try {
      const tenantId =
        requireTenantId(
          req,
          res,
        );

      if (!tenantId) {
        return;
      }

      const {
        couponId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          couponId,
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid coupon ID",
          });
      }

      const coupon =
        await Coupon.findOne({
          _id: couponId,
          tenant: tenantId,
        });

      if (!coupon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Coupon not found",
          });
      }

      const now =
        new Date();

      return res
        .status(200)
        .json({
          success: true,

          coupon: {
            ...coupon.toObject(),

            status:
              coupon.expiresAt <=
              now
                ? "expired"
                : coupon.isActive
                  ? "active"
                  : "inactive",
          },
        });
    } catch (error) {
      console.error(
        "Get single coupon error:",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to load coupon",
          error:
            error.message,
        });
    }
  };

/* =========================================================
   UPDATE COUPON
   PUT /api/coupons/:couponId
   ADMIN ONLY
========================================================= */

const updateCoupon = async (
  req,
  res,
) => {
  try {
    const tenantId =
      requireTenantId(
        req,
        res,
      );

    if (!tenantId) {
      return;
    }

    const {
      couponId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        couponId,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid coupon ID",
        });
    }

    const coupon =
      await Coupon.findOne({
        _id: couponId,
        tenant: tenantId,
      });

    if (!coupon) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Coupon not found",
        });
    }

    const cleanCode =
      req.body.code !==
      undefined
        ? normalizeCouponCode(
            req.body.code,
          )
        : coupon.code;

    const discountType =
      req.body
        .discountType !==
      undefined
        ? String(
            req.body
              .discountType,
          )
            .trim()
            .toLowerCase()
        : coupon.discountType;

    const discountValue =
      req.body
        .discountValue !==
      undefined
        ? parseNumber(
            req.body
              .discountValue,
            NaN,
          )
        : coupon.discountValue;

    const minOrderAmount =
      req.body
        .minOrderAmount !==
      undefined
        ? parseNumber(
            req.body
              .minOrderAmount,
            NaN,
          )
        : coupon.minOrderAmount;

    const maxDiscountAmount =
      req.body
        .maxDiscountAmount !==
      undefined
        ? parseNullableNumber(
            req.body
              .maxDiscountAmount,
          )
        : coupon.maxDiscountAmount;

    const isActive =
      req.body.isActive !==
      undefined
        ? parseBoolean(
            req.body
              .isActive,
            coupon.isActive,
          )
        : coupon.isActive;

    const expiresAt =
      req.body.expiresAt !==
      undefined
        ? req.body
            .expiresAt
        : coupon.expiresAt;

    const validationError =
      validateCouponInput({
        code: cleanCode,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        expiresAt,
      });

    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            validationError,
        });
    }

    const existingCoupon =
      await Coupon.findOne({
        tenant: tenantId,
        code: cleanCode,

        _id: {
          $ne: couponId,
        },
      });

    if (existingCoupon) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Coupon code already exists for this tenant",
        });
    }

    coupon.code =
      cleanCode;

    coupon.discountType =
      discountType;

    coupon.discountValue =
      discountValue;

    coupon.minOrderAmount =
      minOrderAmount;

    coupon.maxDiscountAmount =
      discountType ===
      "percentage"
        ? maxDiscountAmount
        : null;

    coupon.isActive =
      isActive;

    coupon.expiresAt =
      new Date(expiresAt);

    await coupon.save();

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Coupon updated successfully",
        coupon,
      });
  } catch (error) {
    console.error(
      "Update coupon error:",
      error,
    );

    if (
      error?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Coupon code already exists for this tenant",
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to update coupon",
        error:
          error.message,
      });
  }
};

/* =========================================================
   DELETE COUPON
   DELETE /api/coupons/:couponId
   ADMIN ONLY
========================================================= */

const deleteCoupon = async (
  req,
  res,
) => {
  try {
    const tenantId =
      requireTenantId(
        req,
        res,
      );

    if (!tenantId) {
      return;
    }

    const {
      couponId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        couponId,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid coupon ID",
        });
    }

    const coupon =
      await Coupon.findOneAndDelete({
        _id: couponId,
        tenant: tenantId,
      });

    if (!coupon) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Coupon not found",
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Coupon deleted successfully",
        deletedCoupon: {
          _id: coupon._id,
          code: coupon.code,
        },
      });
  } catch (error) {
    console.error(
      "Delete coupon error:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to delete coupon",
        error:
          error.message,
      });
  }
};

/* =========================================================
   APPLY / VALIDATE COUPON
   POST /api/coupons/apply
   PUBLIC
========================================================= */

const applyCoupon = async (
  req,
  res,
) => {
  try {
    const tenantId =
      requireTenantId(
        req,
        res,
      );

    if (!tenantId) {
      return;
    }

    const cleanCode =
      normalizeCouponCode(
        req.body.code,
      );

    const orderAmount =
      parseNumber(
        req.body
          .orderAmount,
        NaN,
      );

    if (
      !cleanCode ||
      !Number.isFinite(
        orderAmount,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Coupon code and order amount are required",
        });
    }

    if (orderAmount <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Order amount must be greater than 0",
        });
    }

    const coupon =
      await Coupon.findOne({
        tenant: tenantId,
        code: cleanCode,
      });

    if (!coupon) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Invalid coupon code",
        });
    }

    if (!coupon.isActive) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Coupon is currently inactive",
        });
    }

    const now = new Date();

    if (
      coupon.expiresAt <=
      now
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Coupon has expired",
        });
    }

    if (
      orderAmount <
      coupon.minOrderAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            `Minimum order amount for this coupon is ৳${coupon.minOrderAmount}`,
        });
    }

    let discountAmount = 0;

    if (
      coupon.discountType ===
      "percentage"
    ) {
      discountAmount =
        (
          orderAmount *
          coupon.discountValue
        ) / 100;

      if (
        coupon.maxDiscountAmount !==
          null &&
        coupon.maxDiscountAmount !==
          undefined &&
        discountAmount >
          coupon.maxDiscountAmount
      ) {
        discountAmount =
          coupon.maxDiscountAmount;
      }
    } else {
      discountAmount =
        coupon.discountValue;
    }

    discountAmount =
      Math.min(
        discountAmount,
        orderAmount,
      );

    discountAmount =
      Math.round(
        discountAmount *
          100,
      ) / 100;

    const finalAmount =
      Math.max(
        Math.round(
          (
            orderAmount -
            discountAmount
          ) *
            100,
        ) / 100,
        0,
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Coupon applied successfully",

        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discountType:
            coupon.discountType,
          discountValue:
            coupon.discountValue,
          minOrderAmount:
            coupon.minOrderAmount,
          maxDiscountAmount:
            coupon.maxDiscountAmount,
          expiresAt:
            coupon.expiresAt,
        },

        orderAmount,
        discountAmount,
        finalAmount,
      });
  } catch (error) {
    console.error(
      "Apply coupon error:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to apply coupon",
        error:
          error.message,
      });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createCoupon,
  getAllCoupons,
  getSingleCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,

  // Backward compatibility
  validateCoupon:
    applyCoupon,
};
