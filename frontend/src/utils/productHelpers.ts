import type {
  Product,
  ProductCategory,
} from "../types/product";

/* =========================================================
   PRICE FORMATTER
========================================================= */

export function formatProductPrice(
  price: number,
) {
  const safePrice =
    Number.isFinite(price)
      ? Math.round(price)
      : 0;

  return `Tk. ${safePrice.toLocaleString(
    "en-US",
  )}`;
}

/* =========================================================
   CHECK VALID PRODUCT OPTIONS
========================================================= */

export function hasValidOptions(
  options?: string[],
) {
  return (
    Array.isArray(options) &&
    options.some(
      (option) =>
        typeof option === "string" &&
        option.trim().length > 0,
    )
  );
}

/* =========================================================
   CHECK WHETHER VARIANT SELECTION IS REQUIRED

   Product-এর Size অথবা Color থাকলে Product Details
   page থেকে option select করতে হবে।
========================================================= */

export function requiresVariantSelection(
  product: Product,
) {
  return (
    hasValidOptions(product.sizes) ||
    hasValidOptions(product.colors)
  );
}

/* =========================================================
   PRODUCT DETAILS LINK
========================================================= */

export function getProductLink(
  product: Product,
) {
  return product.slug
    ? `/product/${product.slug}`
    : `/product/${product._id}`;
}

/* =========================================================
   STOCK CHECK
========================================================= */

export function isProductInStock(
  product: Product,
) {
  return (
    product.stock === undefined ||
    product.stock > 0
  );
}

/* =========================================================
   CATEGORY ID
========================================================= */

export function getProductCategoryId(
  category?: ProductCategory,
) {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    return category;
  }

  return category._id;
}

/* =========================================================
   DISCOUNT CHECK
========================================================= */

export function hasProductDiscount(
  product: Product,
) {
  return (
    typeof product.oldPrice ===
      "number" &&
    product.oldPrice > product.price
  );
}

/* =========================================================
   DISCOUNT PERCENTAGE
========================================================= */

export function getDiscountPercentage(
  product: Product,
) {
  if (
    !hasProductDiscount(product) ||
    !product.oldPrice
  ) {
    return 0;
  }

  return Math.round(
    ((product.oldPrice -
      product.price) /
      product.oldPrice) *
      100,
  );
}

/* =========================================================
   SAFE PRODUCT RATING
========================================================= */

export function getProductRating(
  product: Product,
) {
  const rating =
    Number(product.rating ?? 5);

  return Math.max(
    0,
    Math.min(5, rating),
  );
}