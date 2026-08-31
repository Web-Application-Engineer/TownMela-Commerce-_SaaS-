"use strict";

const mongoose = require("mongoose");

const StockClearanceCampaign = require(
  "../models/StockClearanceCampaign"
);

const Product = require(
  "../models/product"
);

/* =========================================================
   REQUEST HELPERS
========================================================= */

const resolveTenantId = (req) =>
  String(
    req.tenantId ||
      req.tenant?._id ||
      req.tenant?.id ||
      req.auth?.tenantId ||
      req.user?.tenantId ||
      req.user?.tenant?._id ||
      req.user?.tenant ||
      "",
  ).trim();

const resolveUserId = (req) =>
  req.user?.id ||
  req.user?._id ||
  null;

const createError = (
  message,
  statusCode = 400,
  code = "STOCK_CLEARANCE_ERROR",
) => {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

const sendError = (
  res,
  error,
) => {
  const statusCode =
    Number(
      error?.statusCode,
    ) || 500;

  return res
    .status(statusCode)
    .json({
      success: false,

      message:
        error?.message ||
        "Something went wrong.",

      code:
        error?.code ||
        "STOCK_CLEARANCE_ERROR",
    });
};

/* =========================================================
   CAMPAIGN STATUS
========================================================= */

const getCampaignStatus = (
  campaign,
  now = new Date(),
) => {
  if (
    !campaign ||
    campaign.enabled !== true
  ) {
    return "closed";
  }

  const startsAt =
    campaign.startsAt
      ? new Date(
          campaign.startsAt,
        )
      : null;

  const endsAt =
    campaign.endsAt
      ? new Date(
          campaign.endsAt,
        )
      : null;

  if (
    !startsAt ||
    Number.isNaN(
      startsAt.getTime(),
    ) ||
    !endsAt ||
    Number.isNaN(
      endsAt.getTime(),
    )
  ) {
    return "closed";
  }

  if (now < startsAt) {
    return "scheduled";
  }

  if (now >= endsAt) {
    return "ended";
  }

  return "live";
};

const getCountdownTarget = (
  status,
  campaign,
) => {
  if (status === "scheduled") {
    return (
      campaign.startsAt ||
      null
    );
  }

  if (status === "live") {
    return (
      campaign.endsAt ||
      null
    );
  }

  return null;
};

/* =========================================================
   RESPONSE MAPPER

   Product data itself stays on the existing /api/products
   public endpoint. This API returns only selected product IDs,
   avoiding a second product serialization path.
========================================================= */

const mapCampaign = (
  campaign,
  {
    publicView = false,
  } = {},
) => {
  if (!campaign) {
    return null;
  }

  const plain =
    typeof campaign.toObject ===
    "function"
      ? campaign.toObject()
      : {
          ...campaign,
        };

  const status =
    getCampaignStatus(
      plain,
    );

  const productIds =
    Array.isArray(
      plain.products,
    )
      ? plain.products
          .map((value) =>
            String(
              value?._id ||
                value ||
                "",
            ).trim(),
          )
          .filter(Boolean)
      : [];

  return {
    _id:
      plain._id
        ? String(
            plain._id,
          )
        : undefined,

    name:
      String(
        plain.name ||
          "Stock Clearance Discount",
      ).trim(),

    enabled:
      plain.enabled ===
      true,

    status,

    startsAt:
      plain.startsAt ||
      null,

    endsAt:
      plain.endsAt ||
      null,

    countdownTarget:
      getCountdownTarget(
        status,
        plain,
      ),

    discountType:
      plain.discountType ===
      "fixed"
        ? "fixed"
        : "percentage",

    discountValue:
      Math.max(
        0,
        Number(
          plain.discountValue,
        ) || 0,
      ),

    timerEnabled:
      plain.timerEnabled !==
      false,

    popupEnabled:
      plain.popupEnabled !==
      false,

    popupBanner:
      String(
        plain.popupBanner ||
          "",
      ).trim(),

    popupAltText:
      String(
        plain.popupAltText ||
          "Stock Clearance Discount",
      ).trim(),

    campaignBanner:
      String(
        plain.campaignBanner ||
          "",
      ).trim(),

    /*
     * Keep configured product IDs in every campaign state.
     * Storefront renders them only while LIVE.
     * Offers uses them to keep closed campaign products
     * completely out of the normal Offers fallback.
     */
    products:
      productIds,

    createdAt:
      plain.createdAt,

    updatedAt:
      plain.updatedAt,
  };
};

/* =========================================================
   VALIDATION
========================================================= */

const validateDateRange = (
  startsAtValue,
  endsAtValue,
) => {
  const startsAt =
    startsAtValue
      ? new Date(
          startsAtValue,
        )
      : null;

  const endsAt =
    endsAtValue
      ? new Date(
          endsAtValue,
        )
      : null;

  if (
    !startsAt ||
    Number.isNaN(
      startsAt.getTime(),
    )
  ) {
    throw createError(
      "Valid campaign start date and time is required.",
      400,
      "INVALID_START_DATE",
    );
  }

  if (
    !endsAt ||
    Number.isNaN(
      endsAt.getTime(),
    )
  ) {
    throw createError(
      "Valid campaign end date and time is required.",
      400,
      "INVALID_END_DATE",
    );
  }

  if (
    endsAt <=
    startsAt
  ) {
    throw createError(
      "Campaign end date must be after the start date.",
      400,
      "INVALID_CAMPAIGN_RANGE",
    );
  }

  return {
    startsAt,
    endsAt,
  };
};

const validateDiscount = (
  discountTypeValue,
  discountValueValue,
) => {
  const discountType =
    discountTypeValue ===
    "fixed"
      ? "fixed"
      : "percentage";

  const discountValue =
    Number(
      discountValueValue,
    );

  if (
    !Number.isFinite(
      discountValue,
    ) ||
    discountValue < 0
  ) {
    throw createError(
      "A valid discount value is required.",
      400,
      "INVALID_DISCOUNT_VALUE",
    );
  }

  if (
    discountType ===
      "percentage" &&
    discountValue > 100
  ) {
    throw createError(
      "Percentage discount cannot exceed 100.",
      400,
      "INVALID_DISCOUNT_PERCENTAGE",
    );
  }

  return {
    discountType,
    discountValue,
  };
};

const normalizeProductIds =
  async (
    productIds,
    tenantId,
  ) => {
    if (
      !Array.isArray(
        productIds,
      )
    ) {
      throw createError(
        "Products must be an array.",
        400,
        "INVALID_PRODUCTS",
      );
    }

    const uniqueIds = [
      ...new Set(
        productIds
          .map((value) =>
            String(
              value?._id ||
                value?.id ||
                value ||
                "",
            ).trim(),
          )
          .filter(Boolean),
      ),
    ];

    for (
      const productId of
      uniqueIds
    ) {
      if (
        !mongoose.isValidObjectId(
          productId,
        )
      ) {
        throw createError(
          "One or more selected products are invalid.",
          400,
          "INVALID_PRODUCT_ID",
        );
      }
    }

    if (
      uniqueIds.length === 0
    ) {
      return [];
    }

    const products =
      await Product.find({
        _id: {
          $in: uniqueIds,
        },

        tenant:
          tenantId,

        isDeleted: {
          $ne: true,
        },
      })
        .select("_id")
        .lean();

    const validIds =
      new Set(
        products.map(
          (product) =>
            String(
              product._id,
            ),
        ),
      );

    const missing =
      uniqueIds.filter(
        (productId) =>
          !validIds.has(
            productId,
          ),
      );

    if (
      missing.length > 0
    ) {
      throw createError(
        "One or more selected products do not belong to this tenant or no longer exist.",
        400,
        "INVALID_TENANT_PRODUCTS",
      );
    }

    return uniqueIds;
  };

/* =========================================================
   PUBLIC GET
   GET /api/stock-clearance
========================================================= */

const getPublicStockClearanceCampaign =
  async (
    req,
    res,
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req,
        );

      if (!tenantId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Tenant ID is required.",

            code:
              "TENANT_ID_REQUIRED",
          });
      }

      const campaign =
        await StockClearanceCampaign
          .findOne({
            tenant:
              tenantId,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          campaign:
            mapCampaign(
              campaign,
              {
                publicView:
                  true,
              },
            ),
        });
    } catch (error) {
      return sendError(
        res,
        error,
      );
    }
  };

/* =========================================================
   ADMIN GET
   GET /api/stock-clearance/admin
========================================================= */

const getAdminStockClearanceCampaign =
  async (
    req,
    res,
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req,
        );

      if (!tenantId) {
        throw createError(
          "Tenant ID is required.",
          400,
          "TENANT_ID_REQUIRED",
        );
      }

      const campaign =
        await StockClearanceCampaign
          .findOne({
            tenant:
              tenantId,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          campaign:
            mapCampaign(
              campaign,
            ),
        });
    } catch (error) {
      return sendError(
        res,
        error,
      );
    }
  };

/* =========================================================
   ADMIN SAVE
   PUT /api/stock-clearance
========================================================= */

const updateStockClearanceCampaign =
  async (
    req,
    res,
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req,
        );

      if (!tenantId) {
        throw createError(
          "Tenant ID is required.",
          400,
          "TENANT_ID_REQUIRED",
        );
      }

      const payload =
        req.body ||
        {};

      const {
        startsAt,
        endsAt,
      } =
        validateDateRange(
          payload.startsAt,
          payload.endsAt,
        );

      const {
        discountType,
        discountValue,
      } =
        validateDiscount(
          payload.discountType,
          payload.discountValue,
        );

      const productIds =
        await normalizeProductIds(
          payload.products ||
            [],
          tenantId,
        );

      const campaign =
        await StockClearanceCampaign
          .findOneAndUpdate(
            {
              tenant:
                tenantId,
            },

            {
              $set: {
                name:
                  String(
                    payload.name ||
                      "Stock Clearance Discount",
                  ).trim() ||
                  "Stock Clearance Discount",

                enabled:
                  payload.enabled ===
                  true,

                startsAt,

                endsAt,

                discountType,

                discountValue,

                products:
                  productIds,

                timerEnabled:
                  payload.timerEnabled !==
                  false,

                popupEnabled:
                  payload.popupEnabled !==
                  false,

                popupBanner:
                  String(
                    payload.popupBanner ||
                      "",
                  ).trim(),

                popupAltText:
                  String(
                    payload.popupAltText ||
                      "Stock Clearance Discount",
                  ).trim(),

                campaignBanner:
                  String(
                    payload.campaignBanner ||
                      "",
                  ).trim(),

                updatedBy:
                  resolveUserId(
                    req,
                  ),
              },

              $setOnInsert: {
                tenant:
                  tenantId,
              },
            },

            {
              new: true,

              upsert:
                true,

              runValidators:
                true,

              setDefaultsOnInsert:
                true,
            },
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Stock clearance campaign saved successfully.",

          campaign:
            mapCampaign(
              campaign,
            ),
        });
    } catch (error) {
      return sendError(
        res,
        error,
      );
    }
  };

/* =========================================================
   ADMIN CLOSE
   PATCH /api/stock-clearance/close
========================================================= */

const closeStockClearanceCampaign =
  async (
    req,
    res,
  ) => {
    try {
      const tenantId =
        resolveTenantId(
          req,
        );

      if (!tenantId) {
        throw createError(
          "Tenant ID is required.",
          400,
          "TENANT_ID_REQUIRED",
        );
      }

      const campaign =
        await StockClearanceCampaign
          .findOneAndUpdate(
            {
              tenant:
                tenantId,
            },

            {
              $set: {
                enabled:
                  false,

                updatedBy:
                  resolveUserId(
                    req,
                  ),
              },
            },

            {
              new: true,
            },
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Stock clearance campaign closed successfully.",

          campaign:
            mapCampaign(
              campaign,
            ),
        });
    } catch (error) {
      return sendError(
        res,
        error,
      );
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  getPublicStockClearanceCampaign,
  getAdminStockClearanceCampaign,
  updateStockClearanceCampaign,
  closeStockClearanceCampaign,
};
