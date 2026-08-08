import type {
  ProductCategory,
} from "../types/product";

export function formatPrice(
  value?: number,
) {
  return `৳${Number(
    value || 0,
  ).toLocaleString("en-BD")}`;
}

export function getCategoryName(
  category:
    | ProductCategory
    | string
    | null
    | undefined,
) {
  if (!category) {
    return "Uncategorized";
  }

  if (
    typeof category === "string"
  ) {
    return category;
  }

  return (
    category.name ||
    "Uncategorized"
  );
}