"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ChevronDown,
  Filter,
  PackageCheck,
  PackageX,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ProductGrid from "../Products/ProductGrid";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

import type {
  Product,
  ProductsApiResponse,
} from "../../types/product";

import {
  formatProductPrice,
  getProductCategoryId,
  getProductLink,
  isProductInStock,
} from "../../utils/productHelpers";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   LOCAL SHOP TYPES
========================================================= */

type Category = {
  _id: string;
  name: string;
  slug?: string;
};

type CategoriesApiResponse =
  | Category[]
  | {
      success?: boolean;
      categories?: Category[];
      message?: string;
    };

type ShopData = {
  products: Product[];
  categories: Category[];
};

type ShopDataCacheEntry =
  ShopData & {
    timestamp: number;
  };

/*
 * Short in-memory cache:
 * Shop -> Category -> Subcategory navigation can reuse the same
 * tenant data instead of showing a full loading skeleton each time.
 */
const SHOP_DATA_CACHE_TTL_MS =
  30_000;

const shopDataCache =
  new Map<
    string,
    ShopDataCacheEntry
  >();

const shopDataRequests =
  new Map<
    string,
    Promise<ShopData>
  >();

function extractProducts(
  payload:
    | ProductsApiResponse
    | null,
): Product[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(
    payload.products,
  )
    ? payload.products
    : [];
}

function extractCategories(
  payload:
    | CategoriesApiResponse
    | null,
): Category[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(
    payload.categories,
  )
    ? payload.categories
    : [];
}

async function fetchShopData(
  tenantId: string,
): Promise<ShopData> {
  const existingRequest =
    shopDataRequests.get(
      tenantId,
    );

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    (async () => {
      const headers:
        HeadersInit = {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        "X-Tenant-Id":
          tenantId,
      };

      /*
       * Products and categories start together.
       *
       * The products endpoint uses a lightweight storefront payload.
       * We intentionally do NOT use cache: "no-store" here so the
       * browser can honor the short tenant-aware backend cache.
       */
      const [
        productsResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/products?storefront=shop`,
          {
            method: "GET",
            headers,
            credentials:
              "include",
          },
        ),

        fetch(
          `${API_BASE_URL}/api/categories`,
          {
            method: "GET",
            headers,
            credentials:
              "include",
          },
        ),
      ]);

      const [
        productsPayload,
        categoriesPayload,
      ] = await Promise.all([
        productsResponse
          .json()
          .catch(
            () => null,
          ) as Promise<
            ProductsApiResponse |
            null
          >,

        categoriesResponse
          .json()
          .catch(
            () => null,
          ) as Promise<
            CategoriesApiResponse |
            null
          >,
      ]);

      if (
        !productsResponse.ok
      ) {
        const apiMessage =
          productsPayload &&
          !Array.isArray(
            productsPayload,
          )
            ? productsPayload.message
            : undefined;

        throw new Error(
          apiMessage ||
            `Products could not be loaded. Status: ${productsResponse.status}`,
        );
      }

      const products =
        extractProducts(
          productsPayload,
        );

      let categories:
        Category[] = [];

      if (
        categoriesResponse.ok
      ) {
        categories =
          extractCategories(
            categoriesPayload,
          );
      } else {
        console.warn(
          "Categories could not be loaded separately. Product category data will be used.",
        );
      }

      return {
        products,
        categories,
      };
    })();

  shopDataRequests.set(
    tenantId,
    request,
  );

  try {
    return await request;
  } finally {
    shopDataRequests.delete(
      tenantId,
    );
  }
}

type StockFilter =
  | "all"
  | "in-stock"
  | "out-of-stock";

type SortOption =
  | "default"
  | "newest"
  | "price-low-high"
  | "price-high-low"
  | "top-rated";

const CATEGORY_NOT_FOUND_ID =
  "__category-not-found__";

const SORT_OPTIONS: Array<{
  value: SortOption;
  label: string;
}> = [
  {
    value: "default",
    label: "Default Sorting",
  },
  {
    value: "newest",
    label: "New Arrivals",
  },
  {
    value: "price-low-high",
    label: "Price Low to High",
  },
  {
    value: "price-high-low",
    label: "Price High to Low",
  },
  {
    value: "top-rated",
    label: "Top Rated",
  },
];

type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
  count: number;
};

type PriceBounds = {
  min: number;
  max: number;
};

type StockCounts = {
  all: number;
  inStock: number;
  outOfStock: number;
};

type ShopFilterSidebarProps = {
  priceBounds: PriceBounds;
  draftMinPrice: number;
  draftMaxPrice: number;
  categories: CategoryOption[];
  selectedCategory: string;
  stockFilter: StockFilter;
  stockCounts: StockCounts;
  topProducts: Product[];
  hasActiveFilters: boolean;

  onDraftMinPriceChange: (
    value: number,
  ) => void;

  onDraftMaxPriceChange: (
    value: number,
  ) => void;

  onApplyPrice: () => void;

  onCategoryChange: (
    categoryId: string,
  ) => void;

  onStockFilterChange: (
    value: StockFilter,
  ) => void;

  onResetFilters: () => void;
};

/* =========================================================
   SHOP ROUTE AND FILTER HELPERS
========================================================= */

function normalizeCategorySlug(
  value: string,
) {
  let decodedValue = value;

  try {
    decodedValue =
      decodeURIComponent(value);
  } catch {
    decodedValue = value;
  }

  return decodedValue
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(
      /[^\p{L}\p{N}]+/gu,
      "-",
    )
    .replace(/^-+|-+$/g, "");
}

function transformLastSlugPart(
  slug: string,
  transform: (
    value: string,
  ) => string,
) {
  const parts = slug.split("-");

  const lastPart =
    parts.at(-1) ?? "";

  parts[parts.length - 1] =
    transform(lastPart);

  return parts.join("-");
}

function singularizeEnglishWord(
  value: string,
) {
  if (
    value.endsWith("ies") &&
    value.length > 3
  ) {
    return `${value.slice(0, -3)}y`;
  }

  if (
    /(ches|shes|sses|xes|zes)$/.test(
      value,
    )
  ) {
    return value.slice(0, -2);
  }

  if (
    value.endsWith("s") &&
    !value.endsWith("ss")
  ) {
    return value.slice(0, -1);
  }

  return value;
}

function pluralizeEnglishWord(
  value: string,
) {
  if (
    /[^aeiou]y$/.test(value)
  ) {
    return `${value.slice(0, -1)}ies`;
  }

  if (
    /(s|x|z|ch|sh)$/.test(value)
  ) {
    return `${value}es`;
  }

  return `${value}s`;
}

function getSlugVariants(
  value: string,
) {
  const normalizedSlug =
    normalizeCategorySlug(value);

  const variants =
    new Set<string>();

  if (!normalizedSlug) {
    return variants;
  }

  variants.add(normalizedSlug);

  /*
    Singular/plural fallback is applied only
    to English-style slugs. This allows both
    "phone" and "phones" to resolve correctly.
  */
  if (
    /^[a-z0-9-]+$/.test(
      normalizedSlug,
    )
  ) {
    const singularSlug =
      transformLastSlugPart(
        normalizedSlug,
        singularizeEnglishWord,
      );

    variants.add(singularSlug);

    variants.add(
      transformLastSlugPart(
        singularSlug,
        pluralizeEnglishWord,
      ),
    );
  }

  return variants;
}

function createCategoryLabel(
  value: string,
) {
  const normalizedSlug =
    normalizeCategorySlug(value);

  if (!normalizedSlug) {
    return "Category";
  }

  return normalizedSlug
    .split("-")
    .filter(Boolean)
    .map(
      (word) =>
        `${word
          .charAt(0)
          .toLocaleUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(" ");
}

function getSortLabel(
  sortOption: SortOption,
) {
  return (
    SORT_OPTIONS.find(
      (option) =>
        option.value === sortOption,
    )?.label ??
    "Default Sorting"
  );
}


/* =========================================================
   STAR RATING
========================================================= */

function RatingStars({
  rating,
  compact = false,
}: {
  rating: number;
  compact?: boolean;
}) {
  const safeRating = Math.max(
    0,
    Math.min(5, rating),
  );

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <Star
            key={index}
            size={compact ? 11 : 14}
            className={
              index <
              Math.round(safeRating)
                ? "fill-[#F4C018] text-[#F4C018]"
                : "fill-gray-200 text-gray-200"
            }
          />
        ))}
      </div>

      <span
        className={
          compact
            ? "text-[11px] font-semibold text-gray-500"
            : "text-sm font-medium text-[#111827]"
        }
      >
        ({safeRating.toFixed(1)})
      </span>
    </div>
  );
}

/* =========================================================
   FILTER SIDEBAR
========================================================= */

function ShopFilterSidebar({
  priceBounds,
  draftMinPrice,
  draftMaxPrice,
  categories,
  selectedCategory,
  stockFilter,
  stockCounts,
  topProducts,
  hasActiveFilters,
  onDraftMinPriceChange,
  onDraftMaxPriceChange,
  onApplyPrice,
  onCategoryChange,
  onStockFilterChange,
  onResetFilters,
}: ShopFilterSidebarProps) {
  const priceDifference = Math.max(
    priceBounds.max - priceBounds.min,
    1,
  );

  const minPosition =
    ((draftMinPrice -
      priceBounds.min) /
      priceDifference) *
    100;

  const maxPosition =
    ((draftMaxPrice -
      priceBounds.min) /
      priceDifference) *
    100;

  const rangeStep =
    priceDifference > 5000
      ? 100
      : priceDifference > 1000
        ? 10
        : 1;

  const sliderMaximum =
    priceBounds.max >
    priceBounds.min
      ? priceBounds.max
      : priceBounds.min + 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Sidebar Heading */}

      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={18}
            className="text-[#FF6900]"
          />

          <h2 className="text-base font-extrabold text-[#0B1F3A]">
            Shop Filters
          </h2>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-[#FF6900]"
          >
            <RotateCcw size={13} />

            Reset
          </button>
        )}
      </div>

      {/* Price Filter */}

      <div className="border-b border-gray-200 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-[#0B1F3A]">
            Filter By Price
          </h3>

          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-[#FF6900]">
            Range
          </span>
        </div>

        <div className="mt-5">
          <div className="relative h-7">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200" />

            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#FF6900]"
              style={{
                left: `${Math.max(
                  0,
                  Math.min(
                    100,
                    minPosition,
                  ),
                )}%`,

                right: `${Math.max(
                  0,
                  100 -
                    Math.min(
                      100,
                      maxPosition,
                    ),
                )}%`,
              }}
            />

            <input
              type="range"
              min={priceBounds.min}
              max={sliderMaximum}
              step={rangeStep}
              value={draftMinPrice}
              aria-label="Minimum price"
              onChange={(event) => {
                const nextValue =
                  Number(
                    event.target.value,
                  );

                onDraftMinPriceChange(
                  Math.min(
                    nextValue,
                    draftMaxPrice,
                  ),
                );
              }}
              className="townmela-price-range absolute left-0 top-1/2 z-20 h-0 w-full -translate-y-1/2"
            />

            <input
              type="range"
              min={priceBounds.min}
              max={sliderMaximum}
              step={rangeStep}
              value={draftMaxPrice}
              aria-label="Maximum price"
              onChange={(event) => {
                const nextValue =
                  Number(
                    event.target.value,
                  );

                onDraftMaxPriceChange(
                  Math.max(
                    nextValue,
                    draftMinPrice,
                  ),
                );
              }}
              className="townmela-price-range absolute left-0 top-1/2 z-30 h-0 w-full -translate-y-1/2"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Minimum
              </span>

              <span className="mt-1 block text-xs font-extrabold text-[#0B1F3A]">
                {formatProductPrice(
                  draftMinPrice,
                )}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Maximum
              </span>

              <span className="mt-1 block text-xs font-extrabold text-[#0B1F3A]">
                {formatProductPrice(
                  draftMaxPrice,
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onApplyPrice}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-[#FF6900] px-4 text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-[#E85F00]"
          >
            Apply Price Filter
          </button>
        </div>
      </div>

      {/* Product Categories */}

      <div className="border-b border-gray-200 px-5 py-5">
        <h3 className="text-sm font-extrabold text-[#0B1F3A]">
          Product Categories
        </h3>

        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() =>
              onCategoryChange("all")
            }
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
              selectedCategory ===
              "all"
                ? "bg-orange-50 text-[#FF6900]"
                : "text-gray-600 hover:bg-gray-50 hover:text-[#FF6900]"
            }`}
          >
            <span>All Categories</span>

          <span
            className={`shrink-0 text-xs font-bold tabular-nums ${
              selectedCategory === "all"
                ? "text-[#FF6900]"
                : "text-gray-600"
            }`}
          >
            {stockCounts.all}
          </span>
          </button>

          {categories.map(
            (category) => {
              const isSelected =
                selectedCategory ===
                category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    onCategoryChange(
                      category.id,
                    )
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                    isSelected
                      ? "bg-orange-50 text-[#FF6900]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#FF6900]"
                  }`}
                >
                  <span className="line-clamp-2">
                    {category.name}
                  </span>

                <span
                  className={`shrink-0 text-xs font-bold tabular-nums ${
                    isSelected
                      ? "text-[#FF6900]"
                      : "text-gray-600"
                  }`}
                >
                  {category.count}
                </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Product Stock */}

      <div className="border-b border-gray-200 px-5 py-5">
        <h3 className="text-sm font-extrabold text-[#0B1F3A]">
          Product Stock
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() =>
              onStockFilterChange(
                "all",
              )
            }
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold transition ${
              stockFilter === "all"
                ? "border-[#FF6900] bg-orange-50 text-[#FF6900]"
                : "border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={15} />

              All Products
            </span>

            <span>
              {stockCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onStockFilterChange(
                "in-stock",
              )
            }
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold transition ${
              stockFilter ===
              "in-stock"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <PackageCheck
                size={15}
              />

              In Stock
            </span>

            <span>
              {stockCounts.inStock}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onStockFilterChange(
                "out-of-stock",
              )
            }
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-xs font-bold transition ${
              stockFilter ===
              "out-of-stock"
                ? "border-red-400 bg-red-50 text-red-600"
                : "border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <PackageX size={15} />

              Out of Stock
            </span>

            <span>
              {stockCounts.outOfStock}
            </span>
          </button>
        </div>
      </div>

      {/* Top Related Products */}

      <div className="px-5 py-5">
        <h3 className="text-sm font-extrabold text-[#0B1F3A]">
          Top Related Products
        </h3>

        {topProducts.length > 0 ? (
          <div className="mt-4 divide-y divide-gray-200">
            {topProducts.map(
              (product) => {
                const productLink =
                  getProductLink(
                    product,
                  );

                return (
                  <Link
                    key={product._id}
                    href={productLink}
                    className="group flex gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      {product.image ? (
                        <Image
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                          fill
                          sizes="64px"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 text-xs font-bold leading-5 text-[#0B1F3A] transition group-hover:text-[#FF6900]">
                        {product.name}
                      </h4>

                      <div className="mt-1">
                        <RatingStars
                          rating={
                            product.rating ??
                            5
                          }
                          compact
                        />
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-extrabold text-[#FF6900]">
                          {formatProductPrice(
                            product.price,
                          )}
                        </span>

                        {product.oldPrice !==
                          undefined &&
                          product.oldPrice >
                            product.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              {formatProductPrice(
                                product.oldPrice,
                              )}
                            </span>
                          )}
                      </div>
                    </div>
                  </Link>
                );
              },
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-gray-500">
            Top products will appear
            here.
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SHOP PAGE
========================================================= */

type ShopPageClientProps = {
  categorySlug?: string;
};

export default function ShopPageClient({
  categorySlug,
}: ShopPageClientProps) {
  const {
    tenant,
    tenantId,
    isLoading:
      isTenantLoading,
  } = useStorefrontTenant();

  /*
   * IMPORTANT:
   * This breadcrumb shows ONLY the Tenant Store Name.
   * Business Name / Header Business Name are intentionally
   * not used here.
   */
  const storefrontName =
    tenant?.storeName?.trim() ||
    "TownMela";

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [
    stockFilter,
    setStockFilter,
  ] = useState<StockFilter>("all");

  const [
    sortOption,
    setSortOption,
  ] = useState<SortOption>(
    "default",
  );

  const [
    isSortOpen,
    setIsSortOpen,
  ] = useState(false);

  const sortDropdownRef =
    useRef<HTMLDivElement>(null);

  const [
    draftMinPrice,
    setDraftMinPrice,
  ] = useState(0);

  const [
    draftMaxPrice,
    setDraftMaxPrice,
  ] = useState(0);

  const [
    appliedMinPrice,
    setAppliedMinPrice,
  ] = useState(0);

  const [
    appliedMaxPrice,
    setAppliedMaxPrice,
  ] = useState(0);

  const [
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
  ] = useState(false);

  /* =======================================================
     LOAD PRODUCTS AND CATEGORIES
  ======================================================= */

  useEffect(() => {
    /*
     * Wait only for storefront tenant resolution.
     * This makes the request tenant-correct on localhost
     * and on every custom storefront domain.
     */
    if (isTenantLoading) {
      return;
    }

    if (!tenantId) {
      setProducts([]);
      setCategories([]);
      setErrorMessage(
        "Store tenant could not be resolved.",
      );
      setIsLoading(false);
      return;
    }

    let isComponentActive =
      true;

    const cachedEntry =
      shopDataCache.get(
        tenantId,
      );

    const hasCachedData =
      Boolean(cachedEntry);

    if (cachedEntry) {
      /*
       * Render cached Shop data immediately.
       * This is what makes Shop -> Category -> Subcategory
       * navigation feel instant.
       */
      setProducts(
        cachedEntry.products,
      );

      setCategories(
        cachedEntry.categories,
      );

      setErrorMessage("");
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setErrorMessage("");
    }

    const cacheIsFresh =
      cachedEntry
        ? Date.now() -
            cachedEntry.timestamp <
          SHOP_DATA_CACHE_TTL_MS
        : false;

    if (cacheIsFresh) {
      return () => {
        isComponentActive =
          false;
      };
    }

    const loadShopData =
      async () => {
        try {
          /*
           * If stale cache exists, refresh quietly in the
           * background instead of bringing back the skeleton.
           */
          if (!hasCachedData) {
            setIsLoading(true);
          }

          const shopData =
            await fetchShopData(
              tenantId,
            );

          shopDataCache.set(
            tenantId,
            {
              ...shopData,
              timestamp:
                Date.now(),
            },
          );

          if (
            !isComponentActive
          ) {
            return;
          }

          setProducts(
            shopData.products,
          );

          setCategories(
            shopData.categories,
          );

          setErrorMessage("");
        } catch (error) {
          console.error(
            "Shop data loading error:",
            error,
          );

          if (
            !isComponentActive
          ) {
            return;
          }

          /*
           * Preserve already-rendered cached data if a
           * background refresh fails.
           */
          if (!hasCachedData) {
            setProducts([]);
            setCategories([]);

            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Products could not be loaded.",
            );
          }
        } finally {
          if (
            isComponentActive &&
            !hasCachedData
          ) {
            setIsLoading(false);
          }
        }
      };

    void loadShopData();

    return () => {
      isComponentActive =
        false;
    };
  }, [
    isTenantLoading,
    tenantId,
  ]);

  /* =======================================================
     PRICE BOUNDS
  ======================================================= */

  const priceBounds =
    useMemo<PriceBounds>(() => {
      if (products.length === 0) {
        return {
          min: 0,
          max: 0,
        };
      }

      const prices = products.map(
        (product) => product.price,
      );

      return {
        min: Math.floor(
          Math.min(...prices),
        ),

        max: Math.ceil(
          Math.max(...prices),
        ),
      };
    }, [products]);

  useEffect(() => {
    setDraftMinPrice(
      priceBounds.min,
    );

    setDraftMaxPrice(
      priceBounds.max,
    );

    setAppliedMinPrice(
      priceBounds.min,
    );

    setAppliedMaxPrice(
      priceBounds.max,
    );
  }, [
    priceBounds.min,
    priceBounds.max,
  ]);

  /* =======================================================
     CATEGORY OPTIONS WITH COUNTS
  ======================================================= */

  const categoryOptions =
    useMemo<CategoryOption[]>(() => {
      const categoryLookup =
        new Map<string, Category>(
          categories.map(
            (
              category,
            ): [string, Category] => [
              category._id,
              category,
            ],
          ),
        );

      const categoryMap =
        new Map<
          string,
          CategoryOption
        >();

      /*
        API categories are added first so a
        category page can resolve correctly
        even when that category has 0 products.
      */
      categories.forEach(
        (category) => {
          categoryMap.set(
            category._id,
            {
              id: category._id,
              name: category.name,
              slug: category.slug,
              count: 0,
            },
          );
        },
      );

      products.forEach((product) => {
        const categoryId =
          getProductCategoryId(
            product.category,
          );

        if (!categoryId) {
          return;
        }

        const apiCategory =
          categoryLookup.get(
            categoryId,
          );

        const populatedCategory =
          typeof product.category ===
          "object"
            ? product.category
            : undefined;

        const categoryName =
          populatedCategory?.name ??
          apiCategory?.name ??
          `Category ${categoryId.slice(
            -4,
          )}`;

        const categorySlugValue =
          populatedCategory?.slug ??
          apiCategory?.slug;

        const existingCategory =
          categoryMap.get(
            categoryId,
          );

        if (existingCategory) {
          existingCategory.count += 1;

          if (
            !existingCategory.slug &&
            categorySlugValue
          ) {
            existingCategory.slug =
              categorySlugValue;
          }

          if (
            existingCategory.name.startsWith(
              "Category ",
            ) &&
            categoryName
          ) {
            existingCategory.name =
              categoryName;
          }

          return;
        }

        categoryMap.set(
          categoryId,
          {
            id: categoryId,
            name: categoryName,
            slug:
              categorySlugValue,
            count: 1,
          },
        );
      });

      return Array.from(
        categoryMap.values(),
      ).sort((first, second) =>
        first.name.localeCompare(
          second.name,
        ),
      );
    }, [categories, products]);

  /* =======================================================
     ROUTE CATEGORY MATCHING
  ======================================================= */

  const normalizedRouteSlug =
    normalizeCategorySlug(
      categorySlug ?? "",
    );

  const isShopRoute =
    !categorySlug ||
    normalizedRouteSlug === "shop";

  const matchedCategory =
    useMemo(() => {
      if (isShopRoute) {
        return null;
      }

      const routeVariants =
        getSlugVariants(
          categorySlug ?? "",
        );

      return (
        categoryOptions.find(
          (category) => {
            const categoryValues = [
              category.slug,
              category.name,
            ].filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            );

            return categoryValues.some(
              (categoryValue) => {
                const categoryVariants =
                  getSlugVariants(
                    categoryValue,
                  );

                return Array.from(
                  routeVariants,
                ).some(
                  (routeVariant) =>
                    categoryVariants.has(
                      routeVariant,
                    ),
                );
              },
            );
          },
        ) ?? null
      );
    }, [
      categoryOptions,
      categorySlug,
      isShopRoute,
    ]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isShopRoute) {
      setSelectedCategory("all");
      return;
    }

    setSelectedCategory(
      matchedCategory?.id ??
        CATEGORY_NOT_FOUND_ID,
    );
  }, [
    isLoading,
    isShopRoute,
    matchedCategory,
  ]);

  /* =======================================================
     STOCK COUNTS
  ======================================================= */

  const stockCounts =
    useMemo<StockCounts>(() => {
      const inStock =
        products.filter(
          isProductInStock,
        ).length;

      return {
        all: products.length,
        inStock,

        outOfStock:
          products.length -
          inStock,
      };
    }, [products]);

  /* =======================================================
     TOP RELATED PRODUCTS
  ======================================================= */

  const topProducts =
    useMemo(() => {
      return [...products]
        .sort(
          (
            firstProduct,
            secondProduct,
          ) => {
            const ratingDifference =
              (secondProduct.rating ??
                5) -
              (firstProduct.rating ??
                5);

            if (
              ratingDifference !== 0
            ) {
              return ratingDifference;
            }

            return (
              secondProduct.price -
              firstProduct.price
            );
          },
        )
        .slice(0, 5);
    }, [products]);

  /* =======================================================
     FILTERED AND SORTED PRODUCTS
  ======================================================= */

  const visibleProducts =
    useMemo(() => {
      const filteredProducts =
        products.filter((product) => {
          const categoryId =
            getProductCategoryId(
              product.category,
            );

          const matchesCategory =
            selectedCategory ===
              "all" ||
            categoryId ===
              selectedCategory;

          const productIsInStock =
            isProductInStock(
              product,
            );

          const matchesStock =
            stockFilter === "all" ||
            (stockFilter ===
              "in-stock" &&
              productIsInStock) ||
            (stockFilter ===
              "out-of-stock" &&
              !productIsInStock);

          const matchesPrice =
            product.price >=
              appliedMinPrice &&
            product.price <=
              appliedMaxPrice;

          return (
            matchesCategory &&
            matchesStock &&
            matchesPrice
          );
        });

      const sortedProducts = [
        ...filteredProducts,
      ];

      switch (sortOption) {
        case "newest":
          sortedProducts.sort(
            (
              firstProduct,
              secondProduct,
            ) => {
              const firstTime =
                firstProduct.createdAt
                  ? new Date(
                      firstProduct.createdAt,
                    ).getTime()
                  : 0;

              const secondTime =
                secondProduct.createdAt
                  ? new Date(
                      secondProduct.createdAt,
                    ).getTime()
                  : 0;

              if (
                secondTime !==
                firstTime
              ) {
                return (
                  secondTime -
                  firstTime
                );
              }

              return secondProduct._id.localeCompare(
                firstProduct._id,
              );
            },
          );
          break;

        case "price-low-high":
          sortedProducts.sort(
            (
              firstProduct,
              secondProduct,
            ) =>
              firstProduct.price -
              secondProduct.price,
          );
          break;

        case "price-high-low":
          sortedProducts.sort(
            (
              firstProduct,
              secondProduct,
            ) =>
              secondProduct.price -
              firstProduct.price,
          );
          break;

        case "top-rated":
          sortedProducts.sort(
            (
              firstProduct,
              secondProduct,
            ) =>
              (secondProduct.rating ??
                5) -
              (firstProduct.rating ??
                5),
          );
          break;

        default:
          break;
      }

      return sortedProducts;
    }, [
      appliedMaxPrice,
      appliedMinPrice,
      products,
      selectedCategory,
      sortOption,
      stockFilter,
    ]);

  /* =======================================================
     DYNAMIC PAGE TITLE
  ======================================================= */

  const selectedCategoryOption =
    categoryOptions.find(
      (category) =>
        category.id ===
        selectedCategory,
    );

  const pageTitle =
    selectedCategory === "all"
      ? "Shop"
      : selectedCategoryOption?.name ??
        matchedCategory?.name ??
        createCategoryLabel(
          categorySlug ?? "",
        );

  const defaultCategoryId =
    isShopRoute
      ? "all"
      : matchedCategory?.id ??
        CATEGORY_NOT_FOUND_ID;

  /* =======================================================
     FILTER FUNCTIONS
  ======================================================= */

  const handleApplyPrice = () => {
    const nextMinimum =
      Math.min(
        draftMinPrice,
        draftMaxPrice,
      );

    const nextMaximum =
      Math.max(
        draftMinPrice,
        draftMaxPrice,
      );

    setAppliedMinPrice(
      nextMinimum,
    );

    setAppliedMaxPrice(
      nextMaximum,
    );
  };

  const handleResetFilters = () => {
    setSelectedCategory(
      defaultCategoryId,
    );

    setStockFilter("all");
    setSortOption("default");

    setDraftMinPrice(
      priceBounds.min,
    );

    setDraftMaxPrice(
      priceBounds.max,
    );

    setAppliedMinPrice(
      priceBounds.min,
    );

    setAppliedMaxPrice(
      priceBounds.max,
    );
  };

  const hasActiveFilters =
    selectedCategory !==
      defaultCategoryId ||
    stockFilter !== "all" ||
    appliedMinPrice !==
      priceBounds.min ||
    appliedMaxPrice !==
      priceBounds.max ||
    sortOption !== "default";

  /* =======================================================
     SORT DROPDOWN BEHAVIOR
  ======================================================= */

  useEffect(() => {
    if (!isSortOpen) {
      return;
    }

    const handleOutsideClick = (
      event: globalThis.MouseEvent,
    ) => {
      const clickedNode =
        event.target as Node;

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(
          clickedNode,
        )
      ) {
        setIsSortOpen(false);
      }
    };

    const handleEscape = (
      event: globalThis.KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isSortOpen]);

  /* =======================================================
     MOBILE FILTER DRAWER
  ======================================================= */

  useEffect(() => {
    if (!isMobileFiltersOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsMobileFiltersOpen(
          false,
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isMobileFiltersOpen]);

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-[#F7F8FA] pb-24 md:pb-10">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-orange-100" />

              <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />

              <div className="h-8 w-16 animate-pulse rounded-full bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
              <div className="hidden min-h-[760px] animate-pulse rounded-2xl border border-gray-200 bg-white lg:block" />

              <div>
                <div className="mb-4 h-16 animate-pulse rounded-2xl border border-gray-200 bg-white" />

                <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({
                      length: 8,
                    }).map(
                      (_, index) => (
                        <div
                          key={index}
                          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3"
                        >
                          <div className="aspect-[4/4.2] rounded-[5px] bg-gray-200" />

                          <div className="mx-auto mt-3 h-5 w-3/4 rounded bg-gray-200" />

                          <div className="mx-auto mt-3 h-4 w-1/2 rounded bg-gray-200" />

                          <div className="mx-auto mt-4 h-4 w-1/2 rounded bg-gray-200" />

                          <div className="mt-5 h-11 rounded-full bg-gray-200" />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     ERROR UI
  ======================================================= */

  if (errorMessage) {
    return (
      <main className="min-h-screen w-full bg-[#F7F8FA] pb-24 md:pb-10">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <p className="font-bold text-red-600">
                {errorMessage}
              </p>

              <p className="mt-2 text-sm text-red-500">
                Please make sure the
                TownMela backend server
                is running.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="min-h-screen w-full bg-[#F7F8FA] pb-24 md:pb-10">
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          {/* Page Header */}

<div className="mb-5 flex w-full min-w-0 items-center gap-1.5 overflow-hidden sm:gap-3">
  {/* ===============================================
      RESPONSIVE TENANT / CATEGORY HEADER
  =============================================== */}

  <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
    <span
      title={storefrontName}
      className="max-w-[92px] shrink-0 truncate whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#FF6900] sm:max-w-[180px] sm:px-3 sm:text-xs sm:tracking-[0.14em]"
    >
      {storefrontName}
    </span>

    <span className="shrink-0 text-xs font-semibold text-blue-500 sm:text-sm">
      /
    </span>

    <h1
      title={pageTitle}
      className="min-w-0 flex-1 truncate rounded-full border border-orange-500 bg-[#4C5B6F] px-2 py-1.5 text-center text-[10px] font-bold tracking-[0.06em] text-white sm:flex-none sm:px-3 sm:text-left sm:text-xs sm:tracking-[0.14em]"
    >
      {pageTitle}
    </h1>
  </div>

  {/* Product Count */}

  <div className="shrink-0 whitespace-nowrap rounded-full border border-orange-500 bg-[#4C5B6F] px-2 py-1.5 text-[10px] font-bold tracking-[0.06em] text-white sm:px-3 sm:text-xs sm:tracking-[0.14em]">
    <span className="tabular-nums">
      {visibleProducts.length}
    </span>{" "}
    {visibleProducts.length === 1
      ? "Product"
      : "Products"}
  </div>
</div>

          {/* Shop Layout */}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
            {/* Desktop Left Sidebar */}

            <aside className="hidden lg:block">
              <div className="sticky top-5">
                <ShopFilterSidebar
                  priceBounds={
                    priceBounds
                  }
                  draftMinPrice={
                    draftMinPrice
                  }
                  draftMaxPrice={
                    draftMaxPrice
                  }
                  categories={
                    categoryOptions
                  }
                  selectedCategory={
                    selectedCategory
                  }
                  stockFilter={
                    stockFilter
                  }
                  
                  stockCounts={
                    stockCounts
                  }
                  topProducts={
                    topProducts
                  }
                  hasActiveFilters={
                    hasActiveFilters
                  }
                  onDraftMinPriceChange={
                    setDraftMinPrice
                  }
                  onDraftMaxPriceChange={
                    setDraftMaxPrice
                  }
                  onApplyPrice={
                    handleApplyPrice
                  }
                  onCategoryChange={
                    setSelectedCategory
                  }
                  onStockFilterChange={
                    setStockFilter
                  }
                  onResetFilters={
                    handleResetFilters
                  }
                />
              </div>
            </aside>

            {/* Products Area */}

            <div className="min-w-0">
              {/* Results Toolbar */}

              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsMobileFiltersOpen(
                        true,
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] lg:hidden"
                  >
                    <Filter size={17} />

                    Filters
                  </button>

                  <p className="text-sm font-semibold text-gray-500">
                    Showing{" "}
                    <span className="font-extrabold text-[#0B1F3A]">
                      {
                        visibleProducts.length
                      }
                    </span>{" "}
                    of{" "}
                    <span className="font-extrabold text-[#0B1F3A]">
                      {products.length}
                    </span>{" "}
                    products
                  </p>
                </div>

                {/* Default Sorting */}

                <div
                  ref={sortDropdownRef}
                  className="relative w-full sm:w-[220px]"
                >
                  <span className="sr-only">
                    Sort products
                  </span>

                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={
                      isSortOpen
                    }
                    onClick={() =>
                      setIsSortOpen(
                        (
                          currentValue,
                        ) =>
                          !currentValue,
                      )
                    }
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-[#FF6900] bg-white px-4 text-left text-sm font-semibold text-[#0B1F3A] outline-none transition hover:border-[#E85F00] focus:ring-2 focus:ring-[#FF6900]/15"
                  >
                    <span className="truncate">
                      {getSortLabel(
                        sortOption,
                      )}
                    </span>

                    <ChevronDown
                      size={17}
                      className={`shrink-0 text-gray-500 transition-transform duration-300 ${
                        isSortOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {isSortOpen && (
                    <div
                      role="listbox"
                      aria-label="Sort products"
                      className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-orange-200 bg-white p-1.5 shadow-xl"
                    >
                      {SORT_OPTIONS.map(
                        (option) => {
                          const isSelected =
                            sortOption ===
                            option.value;

                          return (
                            <button
                              key={
                                option.value
                              }
                              type="button"
                              role="option"
                              aria-selected={
                                isSelected
                              }
                              onClick={() => {
                                setSortOption(
                                  option.value,
                                );

                                setIsSortOpen(
                                  false,
                                );
                              }}
                              className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                                isSelected
                                  ? "bg-[#FF6900] text-white"
                                  : "text-[#0B1F3A] hover:bg-orange-50 hover:text-[#FF6900]"
                              }`}
                            >
                              {
                                option.label
                              }
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Grid Container */}

              <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
                {visibleProducts.length ===
                0 ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                      <SlidersHorizontal
                        size={28}
                      />
                    </div>

                    <h2 className="mt-5 text-xl font-extrabold text-[#0B1F3A]">
                      No matching products
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                      Try changing the
                      category, stock, price
                      range or sorting
                      selection.
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleResetFilters
                      }
                      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:bg-[#E85F00]"
                    >
                      <RotateCcw
                        size={16}
                      />

                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <ProductGrid
                    products={visibleProducts}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filter Drawer */}

      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() =>
              setIsMobileFiltersOpen(
                false,
              )
            }
            className="absolute inset-0 bg-[#0B1F3A]/55 backdrop-blur-[2px]"
          />

          <aside className="absolute bottom-0 left-0 top-0 w-[min(90vw,350px)] overflow-y-auto bg-[#F7F8FA] shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={18}
                  className="text-[#FF6900]"
                />

                <h2 className="font-extrabold text-[#0B1F3A]">
                  Filters
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsMobileFiltersOpen(
                    false,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-orange-50 hover:text-[#FF6900]"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3">
              <ShopFilterSidebar
                priceBounds={
                  priceBounds
                }
                draftMinPrice={
                  draftMinPrice
                }
                draftMaxPrice={
                  draftMaxPrice
                }
                categories={
                  categoryOptions
                }
                selectedCategory={
                  selectedCategory
                }
                stockFilter={
                  stockFilter
                }
                stockCounts={
                  stockCounts
                }
                topProducts={
                  topProducts
                }
                hasActiveFilters={
                  hasActiveFilters
                }
                onDraftMinPriceChange={
                  setDraftMinPrice
                }
                onDraftMaxPriceChange={
                  setDraftMaxPrice
                }
                onApplyPrice={
                  handleApplyPrice
                }
                onCategoryChange={
                  setSelectedCategory
                }
                onStockFilterChange={
                  setStockFilter
                }
                onResetFilters={
                  handleResetFilters
                }
              />
            </div>
          </aside>
        </div>
      )}

      {/* Dual Range Slider Styling */}

      <style jsx global>{`
        .townmela-price-range {
          appearance: none;
          pointer-events: none;
          background: transparent;
          outline: none;
        }

        .townmela-price-range::-webkit-slider-thumb {
          width: 18px;
          height: 18px;
          appearance: none;
          pointer-events: auto;
          cursor: pointer;
          border: 3px solid #ffffff;
          border-radius: 9999px;
          background: #ff6900;
          box-shadow:
            0 0 0 1px rgba(255, 105, 0, 0.35),
            0 4px 12px rgba(255, 105, 0, 0.3);
        }

        .townmela-price-range::-moz-range-thumb {
          width: 13px;
          height: 13px;
          pointer-events: auto;
          cursor: pointer;
          border: 3px solid #ffffff;
          border-radius: 9999px;
          background: #ff6900;
          box-shadow:
            0 0 0 1px rgba(255, 105, 0, 0.35),
            0 4px 12px rgba(255, 105, 0, 0.3);
        }

        .townmela-price-range::-moz-range-track {
          background: transparent;
          border: 0;
        }
      `}</style>
    </main>
  );
}