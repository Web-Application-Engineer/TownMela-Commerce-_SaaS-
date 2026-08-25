import type {
  Product,
} from "../types/product";

export type StockClearanceStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "closed";

export type StockClearanceCampaign = {
  _id?: string;
  name: string;
  enabled: boolean;
  status: StockClearanceStatus;
  startsAt: string | null;
  endsAt: string | null;
  countdownTarget: string | null;
  discountType:
    | "percentage"
    | "fixed";
  discountValue: number;
  timerEnabled: boolean;
  popupEnabled: boolean;
  popupBanner: string;
  popupAltText: string;
  campaignBanner: string;
  products: string[];
};

export type StockClearanceApiResponse = {
  success: boolean;
  campaign:
    | StockClearanceCampaign
    | null;
  message?: string;
};

export const getProductIdentity = (
  product: Product,
) =>
  String(
    (product as Product & {
      _id?: string;
      id?: string;
    })._id ||
      (product as Product & {
        id?: string;
      }).id ||
      "",
  ).trim();

export const calculateStockClearancePrice = (
  product: Product,
  campaign:
    | StockClearanceCampaign
    | null,
) => {
  const basePrice =
    Math.max(
      0,
      Number(
        product.price,
      ) || 0,
    );

  if (
    !campaign ||
    campaign.status !== "live"
  ) {
    return basePrice;
  }

  const discountValue =
    Math.max(
      0,
      Number(
        campaign.discountValue,
      ) || 0,
    );

  if (
    campaign.discountType ===
    "fixed"
  ) {
    return Math.max(
      0,
      basePrice -
        discountValue,
    );
  }

  return Math.max(
    0,
    basePrice *
      (1 -
        Math.min(
          100,
          discountValue,
        ) /
          100),
  );
};

export const applyStockClearanceDiscount = (
  product: Product,
  campaign:
    | StockClearanceCampaign
    | null,
): Product => {
  if (
    !campaign ||
    campaign.status !== "live"
  ) {
    return product;
  }

  const originalPrice =
    Math.max(
      0,
      Number(
        product.price,
      ) || 0,
    );

  const campaignPrice =
    calculateStockClearancePrice(
      product,
      campaign,
    );

  return {
    ...product,
    price:
      Number(
        campaignPrice.toFixed(
          2,
        ),
      ),
    oldPrice:
      originalPrice,
  };
};

export const getConfiguredCampaignProductIds = (
  campaign:
    | StockClearanceCampaign
    | null,
) =>
  new Set(
    (
      campaign?.products ||
      []
    ).map((value) =>
      String(
        value,
      ).trim(),
    ),
  );

export const getCampaignProductIds = (
  campaign:
    | StockClearanceCampaign
    | null,
) =>
  campaign?.status === "live"
    ? getConfiguredCampaignProductIds(
        campaign,
      )
    : new Set<string>()