import type {
  FormState,
  ProductFormInitialData,
} from "../types/productForm";

/* =========================================================
   CREATE PRODUCT SLUG
========================================================= */

export function createSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================================================
   NORMALIZE STRING LIST
========================================================= */

export function normalizeStringList(
  values: string[],
) {
  return [
    ...new Set(
      values
        .map((value) =>
          String(value).trim(),
        )
        .filter(Boolean),
    ),
  ];
}

/* =========================================================
   GET INITIAL CATEGORY ID
========================================================= */

export function getInitialCategoryId(
  category:
    ProductFormInitialData["category"],
) {
  if (!category) {
    return "";
  }

  if (
    typeof category === "string"
  ) {
    return category;
  }

  return category._id || "";
}

/* =========================================================
   CREATE INITIAL FORM STATE
========================================================= */

export function createInitialFormState(
  initialData?: ProductFormInitialData,
): FormState {
  return {
    name:
      initialData?.name || "",

    slug:
      initialData?.slug || "",

    price:
      initialData?.price !==
      undefined
        ? String(initialData.price)
        : "",

    oldPrice:
      initialData?.oldPrice !==
      undefined
        ? String(
            initialData.oldPrice,
          )
        : "",

    stock:
      initialData?.stock !==
      undefined
        ? String(initialData.stock)
        : "",

    category:
      getInitialCategoryId(
        initialData?.category,
      ),

    /* =====================================================
       HOMEPAGE PRODUCT SECTION
    ===================================================== */

    homepageSection:
      initialData?.homepageSection ||
      "",

    image:
      initialData?.image || "",

    description:
      initialData?.description ||
      "",
  };
}