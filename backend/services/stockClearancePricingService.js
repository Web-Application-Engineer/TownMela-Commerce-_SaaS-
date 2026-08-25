"use strict";

const StockClearanceCampaign = require(
  "../models/StockClearanceCampaign"
);

/* =========================================================
   MONEY
========================================================= */

const roundMoney = (amount) =>
  Math.round(
    (Number(amount) + Number.EPSILON) * 100
  ) / 100;

/* =========================================================
   CAMPAIGN STATUS
========================================================= */

const isCampaignLive = (
  campaign,
  now = new Date()
) => {
  if (
    !campaign ||
    campaign.enabled !== true
  ) {
    return false;
  }

  const startsAt =
    campaign.startsAt
      ? new Date(campaign.startsAt)
      : null;

  const endsAt =
    campaign.endsAt
      ? new Date(campaign.endsAt)
      : null;

  return Boolean(
    startsAt &&
      !Number.isNaN(startsAt.getTime()) &&
      endsAt &&
      !Number.isNaN(endsAt.getTime()) &&
      startsAt <= now &&
      now < endsAt
  );
};

/* =========================================================
   LIVE CAMPAIGN FOR ONE TENANT
========================================================= */

const getLiveStockClearanceCampaign =
  async ({
    tenantId,
    session = null,
  }) => {
    if (!tenantId) {
      return null;
    }

    const now = new Date();

    let query =
      StockClearanceCampaign.findOne({
        tenant: tenantId,
        enabled: true,
        startsAt: {
          $lte: now,
        },
        endsAt: {
          $gt: now,
        },
      });

    if (session) {
      query =
        query.session(session);
    }

    return query.lean();
  };

/* =========================================================
   PRODUCT MEMBERSHIP
========================================================= */

const isProductInStockClearanceCampaign = (
  product,
  campaign
) => {
  if (
    !product ||
    !campaign ||
    !Array.isArray(campaign.products)
  ) {
    return false;
  }

  const productId =
    String(
      product._id ||
        product.id ||
        ""
    ).trim();

  if (!productId) {
    return false;
  }

  return campaign.products.some(
    (campaignProductId) =>
      String(
        campaignProductId?._id ||
          campaignProductId ||
          ""
      ).trim() === productId
  );
};

/* =========================================================
   AUTHORITATIVE CAMPAIGN UNIT PRICE
========================================================= */

const getStockClearanceUnitPrice = (
  product,
  campaign
) => {
  const basePrice =
    Math.max(
      0,
      Number(product?.price) || 0
    );

  if (
    !isCampaignLive(campaign) ||
    !isProductInStockClearanceCampaign(
      product,
      campaign
    )
  ) {
    return roundMoney(basePrice);
  }

  const discountValue =
    Math.max(
      0,
      Number(
        campaign.discountValue
      ) || 0
    );

  if (
    campaign.discountType ===
    "fixed"
  ) {
    return roundMoney(
      Math.max(
        0,
        basePrice - discountValue
      )
    );
  }

  const percentage =
    Math.min(
      100,
      discountValue
    );

  return roundMoney(
    Math.max(
      0,
      basePrice *
        (1 - percentage / 100)
    )
  );
};

/* =========================================================
   CART RESPONSE PRICING

   No Product document is updated.
   Only the JSON returned to storefront is adjusted.
========================================================= */

const applyStockClearancePricingToCart =
  async (cart) => {
    if (!cart) {
      return cart;
    }

    const plainCart =
      typeof cart.toObject ===
      "function"
        ? cart.toObject()
        : JSON.parse(
            JSON.stringify(cart)
          );

    const items =
      Array.isArray(
        plainCart.items
      )
        ? plainCart.items
        : [];

    const fallbackTenantId =
      String(
        plainCart.tenant || ""
      ).trim();

    const tenantIds = [
      ...new Set(
        items
          .map((item) =>
            String(
              item?.product?.tenant ||
                fallbackTenantId ||
                ""
            ).trim()
          )
          .filter(Boolean)
      ),
    ];

    if (tenantIds.length === 0) {
      return plainCart;
    }

    const now = new Date();

    const campaigns =
      await StockClearanceCampaign
        .find({
          tenant: {
            $in: tenantIds,
          },
          enabled: true,
          startsAt: {
            $lte: now,
          },
          endsAt: {
            $gt: now,
          },
        })
        .lean();

    const campaignByTenant =
      new Map(
        campaigns.map(
          (campaign) => [
            String(
              campaign.tenant
            ),
            campaign,
          ]
        )
      );

    plainCart.items =
      items.map((item) => {
        const product =
          item?.product;

        if (
          !product ||
          typeof product !==
            "object"
        ) {
          return item;
        }

        const tenantId =
          String(
            product.tenant ||
              fallbackTenantId ||
              ""
          ).trim();

        const campaign =
          campaignByTenant.get(
            tenantId
          );

        if (
          !campaign ||
          !isProductInStockClearanceCampaign(
            product,
            campaign
          )
        ) {
          return item;
        }

        const originalPrice =
          roundMoney(
            Number(product.price) || 0
          );

        const campaignPrice =
          getStockClearanceUnitPrice(
            product,
            campaign
          );

        return {
          ...item,
          product: {
            ...product,
            oldPrice:
              originalPrice,
            price:
              campaignPrice,
          },
        };
      });

    return plainCart;
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getLiveStockClearanceCampaign,
  getStockClearanceUnitPrice,
  applyStockClearancePricingToCart,
};
