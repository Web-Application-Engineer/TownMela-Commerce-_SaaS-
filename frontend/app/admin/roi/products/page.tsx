"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Filter,
  LoaderCircle,
  PackageSearch,
  Percent,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type DateRange =
  | "today"
  | "7d"
  | "30d"
  | "90d";

type ProductPerformance =
  | "all"
  | "high-profit"
  | "profitable"
  | "low-margin"
  | "loss"
  | "no-sales"
  | "cost-missing";

type ROIProduct = {
  _id: string;
  name: string;
  sku?: string;
  slug?: string;
  image?: string;
  categoryName?: string;
  soldQuantity: number;
  orderCount: number;
  revenue: number;
  productCost: number;
  allocatedCost: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
  roiPercent: number;
  performance?: Exclude<
    ProductPerformance,
    "all"
  >;
  hasCost?: boolean;
};

type ROIProductSummary = {
  totalProducts: number;
  profitableProducts: number;
  lossProducts: number;
  noSalesProducts: number;
  costMissingProducts: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ROIProductsResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    _id?: string;
    productId?: string;
    name?: string;
    sku?: string;
    slug?: string;
    image?: string;
    category?: string | { name?: string };
    soldQuantity?: number;
    orders?: number;
    orderCount?: number;
    revenue?: number;
    grossRevenue?: number;
    productCost?: number;
    allocatedCost?: number;
    totalCost?: number;
    netProfit?: number;
    marginPercent?: number;
    roiPercent?: number;
    performance?: string;
    hasCost?: boolean;
  }>;
  meta?: {
    pagination?: Partial<Pagination>;
    settings?: {
      currency?: string;
    };
    filters?: {
      startDate?: string | null;
      endDate?: string | null;
      dateField?: string;
    };
  };
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultSummary:
  ROIProductSummary = {
    totalProducts: 0,
    profitableProducts: 0,
    lossProducts: 0,
    noSalesProducts: 0,
    costMissingProducts: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
  };

const rangeOptions: Array<{
  label: string;
  value: DateRange;
}> = [
  {
    label: "Today",
    value: "today",
  },
  {
    label: "7 Days",
    value: "7d",
  },
  {
    label: "30 Days",
    value: "30d",
  },
  {
    label: "90 Days",
    value: "90d",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const numberValue = (
  value: unknown,
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatNumber = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-US",
  ).format(numberValue(value));

const formatCurrency = (
  value: number,
  currency = "BDT",
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numberValue(value));

const formatPercent = (
  value: number,
) =>
  `${numberValue(value).toFixed(1)}%`;

const getStoredValue = (
  keys: string[],
) => {
  for (const key of keys) {
    const value =
      localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "";
};


const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildDateRangeParams = (range: DateRange) => {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (range === "7d") {
    startDate.setDate(startDate.getDate() - 6);
  } else if (range === "30d") {
    startDate.setDate(startDate.getDate() - 29);
  } else if (range === "90d") {
    startDate.setDate(startDate.getDate() - 89);
  }

  return {
    startDate: toDateInputValue(startDate),
    endDate: toDateInputValue(endDate),
  };
};

const normalizePerformance = (
  product: ROIProduct,
): Exclude<
  ProductPerformance,
  "all"
> => {
    
if (product.performance) {
  return product.performance;
}

  if (product.hasCost === false) {
    return "cost-missing";
  }

  if (
    numberValue(
      product.soldQuantity,
    ) <= 0
  ) {
    return "no-sales";
  }

  if (
    numberValue(
      product.netProfit,
    ) < 0
  ) {
    return "loss";
  }

  if (
    numberValue(
      product.marginPercent,
    ) < 10
  ) {
    return "low-margin";
  }

  if (
    numberValue(
      product.roiPercent,
    ) >= 50
  ) {
    return "high-profit";
  }

  return "profitable";
};

const getPerformanceLabel = (
  performance: Exclude<
    ProductPerformance,
    "all"
  >,
) => {
  switch (performance) {
    case "high-profit":
      return "High Profit";
    case "profitable":
      return "Profitable";
    case "low-margin":
      return "Low Margin";
    case "loss":
      return "Loss";
    case "no-sales":
      return "No Sales";
    case "cost-missing":
      return "Cost Missing";
    default:
      return "Unknown";
  }
};

const getPerformanceClass = (
  performance: Exclude<
    ProductPerformance,
    "all"
  >,
) => {
  switch (performance) {
    case "high-profit":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "profitable":
      return "border-green-200 bg-green-50 text-green-700";
    case "low-margin":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "loss":
      return "border-red-200 bg-red-50 text-red-700";
    case "no-sales":
      return "border-gray-200 bg-gray-50 text-gray-600";
    case "cost-missing":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
};

const getProfitClass = (
  value: number,
) => {
  if (value > 0) {
    return "text-emerald-700";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-gray-600";
};

/* =========================================================
   SKELETON
========================================================= */

function SkeletonBox({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 ${className}`}
    />
  );
}

/* =========================================================
   PRODUCT PROFITABILITY PAGE
========================================================= */

export default function ROIProductsPage() {
  const router = useRouter();

  const [
    products,
    setProducts,
  ] = useState<ROIProduct[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<ROIProductSummary>(
      defaultSummary,
    );

  const [
    currency,
    setCurrency,
  ] = useState("BDT");

  const [
    selectedRange,
    setSelectedRange,
  ] =
    useState<DateRange>("30d");

  const [
    selectedPerformance,
    setSelectedPerformance,
  ] =
    useState<ProductPerformance>(
      "all",
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalRecords,
    setTotalRecords,
  ] = useState(0);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const limit = 20;

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const loadProducts =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const token =
          getStoredValue([
            "townmelaAdminToken",
            "accessToken",
            "token",
            "authToken",
            "jwt",
          ]);

        const tenantId =
          getStoredValue([
            "tenantId",
            "tenant_id",
            "activeTenantId",
          ]);

        if (!token) {
          router.replace(
            "/admin/login",
          );

          return;
        }

        if (!tenantId) {
          throw new Error(
            "Tenant ID was not found in browser storage. Please log in again.",
          );
        }

        const headers: HeadersInit = {
          Accept: "application/json",
          Authorization:
            `Bearer ${token}`,
        };

        headers["X-Tenant-Id"] =
          tenantId;

        const dateRange = buildDateRangeParams(selectedRange);

        const query = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dateField: "createdAt",
          search: searchTerm.trim(),
          page: String(currentPage),
          limit: String(limit),
          sort: "-netProfit",
        });

        if (selectedPerformance !== "all") {
          query.set("performance", selectedPerformance);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/roi/products?${query.toString()}`,
          {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          },
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem(
            "townmelaAdminToken",
          );

          localStorage.removeItem(
            "townmelaAdminUser",
          );

          router.replace(
            "/admin/login",
          );

          return;
        }

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as ROIProductsResponse | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load product profitability data.",
          );
        }

        const rows = Array.isArray(payload.data)
          ? payload.data
          : [];

        const mappedProducts: ROIProduct[] = rows.map((product, index) => {
          const categoryName =
            typeof product.category === "string"
              ? product.category
              : product.category?.name || "";

          return {
            _id: String(
              product._id || product.productId || `product-${index}`,
            ),
            name: String(product.name || "Unnamed product"),
            sku: product.sku ? String(product.sku) : undefined,
            slug: product.slug ? String(product.slug) : undefined,
            image: product.image ? String(product.image) : undefined,
            categoryName,
            soldQuantity: numberValue(product.soldQuantity),
            orderCount: numberValue(
              product.orderCount ?? product.orders,
            ),
            revenue: numberValue(
              product.revenue ?? product.grossRevenue,
            ),
            productCost: numberValue(product.productCost),
            allocatedCost: numberValue(product.allocatedCost),
            totalCost: numberValue(product.totalCost),
            netProfit: numberValue(product.netProfit),
            marginPercent: numberValue(product.marginPercent),
            roiPercent: numberValue(product.roiPercent),
            performance:
              product.performance as ROIProduct["performance"],
            hasCost: product.hasCost !== false,
          };
        });

        setProducts(mappedProducts);

        const responseCurrency =
          payload.meta?.settings?.currency || "BDT";

        setCurrency(responseCurrency);

        const profitableProducts = mappedProducts.filter(
          (product) => product.netProfit > 0,
        ).length;

        const lossProducts = mappedProducts.filter(
          (product) => product.netProfit < 0,
        ).length;

        const noSalesProducts = mappedProducts.filter(
          (product) => product.soldQuantity <= 0,
        ).length;

        const costMissingProducts = mappedProducts.filter(
          (product) => product.hasCost === false,
        ).length;

        const totalRevenue = mappedProducts.reduce(
          (total, product) => total + product.revenue,
          0,
        );

        const totalCost = mappedProducts.reduce(
          (total, product) => total + product.totalCost,
          0,
        );

        const totalProfit = mappedProducts.reduce(
          (total, product) => total + product.netProfit,
          0,
        );

        const pagination = payload.meta?.pagination;

        setSummary({
          totalProducts: numberValue(
            pagination?.total ?? mappedProducts.length,
          ),
          profitableProducts,
          lossProducts,
          noSalesProducts,
          costMissingProducts,
          totalRevenue,
          totalCost,
          totalProfit,
        });

        setTotalPages(
          Math.max(numberValue(pagination?.totalPages), 1),
        );

        setTotalRecords(
          numberValue(pagination?.total ?? mappedProducts.length),
        );
      } catch (error) {
        console.error(
          "ROI products load error:",
          error,
        );

        setProducts([]);
        setSummary(defaultSummary);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading product profitability.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      currentPage,
      router,
      searchTerm,
      selectedPerformance,
      selectedRange,
    ]);

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        void loadProducts();
      }, 250);

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedPerformance,
    selectedRange,
  ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(
      () => [
        {
          title:
            "Products Analysed",
          value: formatNumber(
            summary.totalProducts,
          ),
          description:
            "Products included in ROI",
          icon: Boxes,
        },
        {
          title:
            "Profitable Products",
          value: formatNumber(
            summary.profitableProducts,
          ),
          description:
            "Products with positive profit",
          icon: TrendingUp,
        },
        {
          title:
            "Loss Products",
          value: formatNumber(
            summary.lossProducts,
          ),
          description:
            "Products with negative profit",
          icon: TrendingDown,
        },
        {
          title: "No Sales",
          value: formatNumber(
            summary.noSalesProducts,
          ),
          description:
            "Products without delivered sales",
          icon: PackageSearch,
        },
        {
          title:
            "Cost Missing",
          value: formatNumber(
            summary.costMissingProducts,
          ),
          description:
            "Products requiring cost setup",
          icon: AlertCircle,
        },
        {
          title:
            "Total Revenue",
          value: formatCurrency(
            summary.totalRevenue,
            currency,
          ),
          description:
            "Revenue from filtered products",
          icon:
            CircleDollarSign,
        },
        {
          title: "Total Cost",
          value: formatCurrency(
            summary.totalCost,
            currency,
          ),
          description:
            "Product and allocated costs",
          icon: WalletCards,
        },
        {
          title: "Net Profit",
          value: formatCurrency(
            summary.totalProfit,
            currency,
          ),
          description:
            "Revenue minus total cost",
          icon:
            summary.totalProfit < 0
              ? TrendingDown
              : TrendingUp,
        },
      ],
      [
        currency,
        summary,
      ],
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading &&
    products.length === 0
  ) {
    return (
      <div className="mx-auto w-full max-w-[1450px]">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBox className="h-7 w-44 rounded-full" />

            <SkeletonBox className="mt-4 h-9 w-80 max-w-full" />

            <SkeletonBox className="mt-3 h-5 w-[520px] max-w-full" />
          </div>

          <SkeletonBox className="h-12 w-44" />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 8,
          }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <SkeletonBox className="h-4 w-28" />

              <SkeletonBox className="mt-4 h-8 w-32" />

              <SkeletonBox className="mt-5 h-4 w-40" />
            </div>
          ))}
        </section>

        <SkeletonBox className="mt-6 h-[540px] w-full" />

        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-sm font-bold text-gray-500 shadow-sm">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#FF6900]"
          />

          Loading product
          profitability...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Link
            href="/admin/roi"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
          >
            <ArrowLeft
              size={17}
            />

            ROI Overview
          </Link>

          <span className="mt-4 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            ROI & Profitability
          </span>

          <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            Product Profitability
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Identify profitable,
            low-margin and loss-making
            products using delivered
            order data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-xl border border-gray-200 bg-white p-1">
            {rangeOptions.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() =>
                    setSelectedRange(
                      option.value,
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${
                    selectedRange ===
                    option.value
                      ? "bg-[#0B1F3A] text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-[#FF6900]"
                  }`}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadProducts()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:text-[#FF6900]"
          >
            <RefreshCcw
              size={17}
            />

            Refresh
          </button>
        </div>
      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {errorMessage && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="font-extrabold text-amber-800">
                Product
                profitability data is
                unavailable
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                {errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadProducts()
            }
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-extrabold text-amber-700"
          >
            <RefreshCcw
              size={16}
            />

            Try Again
          </button>
        </section>
      )}

      {/* ===================================================
          STATISTICS
      =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map(
          (item) => {
            const Icon =
              item.icon;

            return (
              <article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-500">
                      {item.title}
                    </p>

                    <p className="mt-3 break-words text-2xl font-black text-[#0B1F3A]">
                      {item.value}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                    <Icon
                      size={23}
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-gray-400">
                  {
                    item.description
                  }
                </p>
              </article>
            );
          },
        )}
      </section>

      {/* ===================================================
          FILTERS
      =================================================== */}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px_auto]">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Search product name or SKU..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="relative block">
            <Filter
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <select
              value={
                selectedPerformance
              }
              onChange={(event) =>
                setSelectedPerformance(
                  event.target
                    .value as ProductPerformance,
                )
              }
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-extrabold text-gray-600 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">
                All Products
              </option>

              <option value="high-profit">
                High Profit
              </option>

              <option value="profitable">
                Profitable
              </option>

              <option value="low-margin">
                Low Margin
              </option>

              <option value="loss">
                Loss
              </option>

              <option value="no-sales">
                No Sales
              </option>

              <option value="cost-missing">
                Cost Missing
              </option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");

              setSelectedPerformance(
                "all",
              );

              setSelectedRange(
                "30d",
              );
            }}
            className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-5 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#FF6900]"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {/* ===================================================
          PRODUCT TABLE
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Product Performance
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing{" "}
              {formatNumber(
                products.length,
              )}{" "}
              of{" "}
              {formatNumber(
                totalRecords,
              )}{" "}
              products.
            </p>
          </div>

          {isLoading && (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
              <LoaderCircle
                size={17}
                className="animate-spin text-[#FF6900]"
              />

              Refreshing...
            </span>
          )}
        </div>

        {products.length > 0 ? (
          <>
            {/* Desktop table */}

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1320px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Product",
                      "Sold",
                      "Orders",
                      "Revenue",
                      "Product Cost",
                      "Allocated Cost",
                      "Total Cost",
                      "Net Profit",
                      "Margin",
                      "ROI",
                      "Performance",
                      "Action",
                    ].map(
                      (heading) => (
                        <th
                          key={
                            heading
                          }
                          className="px-5 py-4 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-gray-500"
                        >
                          {
                            heading
                          }
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {products.map(
                    (product) => {
                      const performance =
                        normalizePerformance(
                          product,
                        );

                      const hasCost =
                        product.hasCost !==
                        false;

                      return (
                        <tr
                          key={
                            product._id
                          }
                          className="border-b border-gray-100 transition last:border-b-0 hover:bg-orange-50/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                {product.image ? (
                                  <img
                                    src={
                                      product.image
                                    }
                                    alt={
                                      product.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Boxes
                                    size={
                                      21
                                    }
                                    className="text-gray-300"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[230px] truncate font-extrabold text-[#0B1F3A]">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="mt-1 max-w-[230px] truncate text-xs text-gray-400">
                                  {product.sku ||
                                    "No SKU"}
                                  {product.categoryName
                                    ? ` • ${product.categoryName}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatNumber(
                              product.soldQuantity,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatNumber(
                              product.orderCount,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {formatCurrency(
                              product.revenue,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {hasCost
                              ? formatCurrency(
                                  product.productCost,
                                  currency,
                                )
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatCurrency(
                              product.allocatedCost,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {hasCost
                              ? formatCurrency(
                                  product.totalCost,
                                  currency,
                                )
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            {hasCost ? (
                              <span
                                className={`text-sm font-black ${getProfitClass(
                                  product.netProfit,
                                )}`}
                              >
                                {formatCurrency(
                                  product.netProfit,
                                  currency,
                                )}
                              </span>
                            ) : (
                              <span className="text-sm font-extrabold text-violet-600">
                                Cost Missing
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-extrabold text-gray-600">
                            {hasCost
                              ? formatPercent(
                                  product.marginPercent,
                                )
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {hasCost
                              ? formatPercent(
                                  product.roiPercent,
                                )
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getPerformanceClass(
                                performance,
                              )}`}
                            >
                              {getPerformanceLabel(
                                performance,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={
                                product.slug
                                  ? `/admin/products/${product._id}/edit`
                                  : `/admin/products/${product._id}/edit`
                              }
                              className="inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]"
                            >
                              View

                              <ArrowRight
                                size={
                                  15
                                }
                              />
                            </Link>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/tablet cards */}

            <div className="grid gap-4 p-4 xl:hidden">
              {products.map(
                (product) => {
                  const performance =
                    normalizePerformance(
                      product,
                    );

                  const hasCost =
                    product.hasCost !==
                    false;

                  return (
                    <article
                      key={
                        product._id
                      }
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                          {product.image ? (
                            <img
                              src={
                                product.image
                              }
                              alt={
                                product.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Boxes
                              size={23}
                              className="text-gray-300"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-[#0B1F3A]">
                            {
                              product.name
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-400">
                            {product.sku ||
                              "No SKU"}
                          </p>

                          <span
                            className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getPerformanceClass(
                              performance,
                            )}`}
                          >
                            {getPerformanceLabel(
                              performance,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                            Revenue
                          </p>

                          <p className="mt-1 font-black text-[#0B1F3A]">
                            {formatCurrency(
                              product.revenue,
                              currency,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                            Total Cost
                          </p>

                          <p className="mt-1 font-black text-[#0B1F3A]">
                            {hasCost
                              ? formatCurrency(
                                  product.totalCost,
                                  currency,
                                )
                              : "Cost Missing"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                            Net Profit
                          </p>

                          <p
                            className={`mt-1 font-black ${
                              hasCost
                                ? getProfitClass(
                                    product.netProfit,
                                  )
                                : "text-violet-600"
                            }`}
                          >
                            {hasCost
                              ? formatCurrency(
                                  product.netProfit,
                                  currency,
                                )
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                            ROI / Margin
                          </p>

                          <p className="mt-1 font-black text-[#0B1F3A]">
                            {hasCost
                              ? `${formatPercent(
                                  product.roiPercent,
                                )} / ${formatPercent(
                                  product.marginPercent,
                                )}`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                        <span className="text-xs font-bold text-gray-500">
                          {formatNumber(
                            product.soldQuantity,
                          )}{" "}
                          sold •{" "}
                          {formatNumber(
                            product.orderCount,
                          )}{" "}
                          orders
                        </span>

                        <Link
                          href={`/admin/products/${product._id}/edit`}
                          className="inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]"
                        >
                          View Product

                          <ArrowRight
                            size={
                              15
                            }
                          />
                        </Link>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[290px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <PackageSearch
                size={29}
              />
            </div>

            <h3 className="mt-5 text-lg font-black text-[#0B1F3A]">
              No product
              profitability records
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              Products matching the
              selected filters will
              appear here after
              delivered orders are
              calculated.
            </p>
          </div>
        )}

        {/* =================================================
            PAGINATION
        ================================================= */}

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-500">
              Page{" "}
              {formatNumber(
                currentPage,
              )}{" "}
              of{" "}
              {formatNumber(
                totalPages,
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  currentPage <= 1
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        page - 1,
                        1,
                      ),
                  )
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        page + 1,
                        totalPages,
                      ),
                  )
                }
                className="rounded-xl bg-[#FF6900] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}