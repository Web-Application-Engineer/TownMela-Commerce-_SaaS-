import type {
  Category,
  SearchSuggestionProduct,
} from "./headerTypes";

/* =========================================================
   API CONFIGURATION
========================================================= */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   FALLBACK CATEGORIES
========================================================= */

export const fallbackCategories: Category[] = [
  {
    _id: "phones",
    name: "Phones",
    slug: "phones",
  },
  {
    _id: "fashion",
    name: "Fashion",
    slug: "fashion",
  },
  {
    _id: "mac",
    name: "Mac",
    slug: "mac",
  },
  {
    _id: "phone-accessories",
    name: "Phone Accessories",
    slug: "phone-accessories",
  },
  {
    _id: "tablets",
    name: "Tablets",
    slug: "tablets",
  },
  {
    _id: "cases-protectors",
    name: "Cases & Protectors",
    slug: "cases-protectors",
  },
  {
    _id: "watches",
    name: "Watches",
    slug: "watches",
  },
  {
    _id: "headphone-speaker",
    name: "Headphone & Speaker",
    slug: "headphone-speaker",
  },
  {
    _id: "pc-accessories",
    name: "PC Accessories",
    slug: "pc-accessories",
  },
  {
    _id: "camera",
    name: "Camera",
    slug: "camera",
  },
  {
    _id: "gadget",
    name: "Gadget",
    slug: "gadget",
  },
  {
    _id: "networking",
    name: "Networking",
    slug: "networking",
  },
  {
    _id: "gaming",
    name: "Gaming",
    slug: "gaming",
  },
  {
    _id: "drone",
    name: "Drone",
    slug: "drone",
  },
];

/* =========================================================
   SLUG HELPERS
========================================================= */

export function normalizeSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCategorySlug(
  category: Category,
) {
  return (
    category.slug?.trim() ||
    normalizeSlug(category.name)
  );
}

/* =========================================================
   PATH HELPERS
========================================================= */

export function normalizePath(
  value: string,
) {
  const normalizedValue =
    value.replace(/\/+$/g, "");

  return normalizedValue || "/";
}

export function isPathActive(
  pathname: string,
  href: string,
) {
  return (
    normalizePath(pathname) ===
    normalizePath(href)
  );
}

/* =========================================================
   CATEGORY PARENT PREPARATION
========================================================= */

function prepareCategoryParent(
  parent: Category["parent"],
): Category["parent"] {
  if (!parent) {
    return null;
  }

  if (typeof parent === "string") {
    const parentId =
      parent.trim();

    return parentId || null;
  }

  const parentId =
    typeof parent._id === "string"
      ? parent._id.trim()
      : "";

  if (!parentId) {
    return null;
  }

  const parentName =
    typeof parent.name === "string"
      ? parent.name.trim()
      : "";

  const parentSlug =
    typeof parent.slug === "string" &&
    parent.slug.trim()
      ? normalizeSlug(
          parent.slug,
        )
      : parentName
        ? normalizeSlug(
            parentName,
          )
        : "";

  return {
    _id: parentId,
    ...(parentName && {
      name: parentName,
    }),
    ...(parentSlug && {
      slug: parentSlug,
    }),
  };
}

/* =========================================================
   CATEGORY PREPARATION
========================================================= */

export function prepareCategories(
  categoryList: Category[],
) {
  const usedSlugs =
    new Set<string>();

  const cleanCategories:
    Category[] = [];

  categoryList.forEach(
    (category) => {
      const categoryName =
        typeof category?.name ===
        "string"
          ? category.name.trim()
          : "";

      if (!categoryName) {
        return;
      }

      const categorySlug =
        typeof category.slug ===
          "string" &&
        category.slug.trim()
          ? normalizeSlug(
              category.slug,
            )
          : normalizeSlug(
              categoryName,
            );

      if (
        !categorySlug ||
        usedSlugs.has(categorySlug)
      ) {
        return;
      }

      usedSlugs.add(categorySlug);

      cleanCategories.push({
        _id:
          typeof category._id ===
            "string" &&
          category._id.trim()
            ? category._id.trim()
            : categorySlug,

        name: categoryName,

        slug: categorySlug,

        parent:
          prepareCategoryParent(
            category.parent,
          ),
      });
    },
  );

  return cleanCategories;
}

/* =========================================================
   PRODUCT LINK HELPER
========================================================= */

export function getProductHref(
  product:
    SearchSuggestionProduct,
) {
  return product.slug
    ? `/product/${product.slug}`
    : `/product/${product._id}`;
}

/* =========================================================
   PRICE FORMATTER
========================================================= */

export function formatPrice(
  value: number,
) {
  return `৳${Number(
    value || 0,
  ).toLocaleString("en-BD")}`;
}