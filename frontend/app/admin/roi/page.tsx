"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  Percent,
  RefreshCcw,
  Settings2,
  ShoppingBag,
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

import {
  useTenant,
} from "@/src/context/TenantContext";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : (
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:5000"
      ).replace(/\/$/, "");

/* =========================================================
   TYPES
========================================================= */

type DateRange =
  | "today"
  | "7d"
  | "30d"
  | "90d";

type ROIStats = {
  netRevenue: number;
  totalCost: number;
  netProfit: number;
  roiPercent: number;
  deliveredOrders: number;
  profitableOrders: number;
  lossOrders: number;
  averageProfitPerOrder: number;
};

type ProfitTrendItem = {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
};

type ProfitableProduct = {
  _id: string;
  name: string;
  sku?: string;
  soldQuantity: number;
  revenue: number;
  totalCost: number;
  netProfit: number;
  marginPercent: number;
  roiPercent: number;
};

type LossOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  revenue: number;
  totalCost: number;
  netProfit: number;
  roiPercent: number;
  createdAt: string;
};

type BackendOrderRow = {
  _id?: string;
  orderId?: string;
  orderNumber?: string;

  customer?: {
    fullName?: string;
  };

  netRevenue?: number;
  totalCost?: number;
  netProfit?: number;
  roiPercent?: number;
  createdAt?: string;
};

type BackendDashboardData = {
  summary?: {
    deliveredOrders?: number;
    profitableOrders?: number;
    lossOrders?: number;
    totalRevenue?: number;
    netRevenue?: number;
    totalCost?: number;
    netProfit?: number;
    averageProfit?: number;
    averageProfitPerOrder?: number;
    roiPercent?: number;
  };

  trend?: ProfitTrendItem[];

  topLossOrders?: BackendOrderRow[];

  recentOrders?: BackendOrderRow[];

  settings?: {
    currency?: string;
  };

  generatedAt?: string;
};

type DashboardApiResponse = {
  success: boolean;
  message?: string;
  data?: BackendDashboardData;
};

type ProductApiRow = {
  _id?: string;
  productId?: string;
  name?: string;
  sku?: string;
  soldQuantity?: number;
  revenue?: number;
  grossRevenue?: number;
  totalCost?: number;
  netProfit?: number;
  marginPercent?: number;
  roiPercent?: number;
};

type ProductsApiResponse = {
  success: boolean;
  message?: string;
  data?: ProductApiRow[];
};

type ROIDashboardViewModel = {
  currency: string;
  stats: ROIStats;
  profitTrend: ProfitTrendItem[];
  topProducts: ProfitableProduct[];
  lossOrders: LossOrder[];
  generatedAt: string;
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultStats: ROIStats = {
  netRevenue: 0,
  totalCost: 0,
  netProfit: 0,
  roiPercent: 0,
  deliveredOrders: 0,
  profitableOrders: 0,
  lossOrders: 0,
  averageProfitPerOrder: 0,
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
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
};

const formatNumber = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-US",
  ).format(
    numberValue(value),
  );

const formatCurrency = (
  value: number,
  currency = "BDT",
) =>
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    },
  ).format(
    numberValue(value),
  );

const formatPercent = (
  value: number,
) =>
  `${numberValue(
    value,
  ).toFixed(1)}%`;

const formatDate = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
};

const formatShortDate = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(date);
};

const getStoredValue = (
  keys: string[],
) => {
  for (
    const key of keys
  ) {
    const value =
      localStorage.getItem(
        key,
      );

    if (value) {
      return value;
    }
  }

  return "";
};

const toDateInputValue = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
};

const buildDateRangeParams = (
  range: DateRange,
) => {
  const endDate =
    new Date();

  const startDate =
    new Date(
      endDate,
    );

  if (
    range === "7d"
  ) {
    startDate.setDate(
      startDate.getDate() -
        6,
    );
  } else if (
    range === "30d"
  ) {
    startDate.setDate(
      startDate.getDate() -
        29,
    );
  } else if (
    range === "90d"
  ) {
    startDate.setDate(
      startDate.getDate() -
        89,
    );
  }

  return new URLSearchParams(
    {
      startDate:
        toDateInputValue(
          startDate,
        ),

      endDate:
        toDateInputValue(
          endDate,
        ),

      dateField:
        "createdAt",
    },
  );
};

const getProfitBadgeClass = (
  value: number,
) => {
  if (
    value > 0
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value < 0
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
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
   ROI DASHBOARD PAGE
========================================================= */

export default function ROIDashboardPage() {
  const router =
    useRouter();

  /* =======================================================
     GLOBAL TENANT
  ======================================================= */

  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  /* =======================================================
     STATES
  ======================================================= */

  const [
    selectedRange,
    setSelectedRange,
  ] =
    useState<DateRange>(
      "30d",
    );

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<ROIDashboardViewModel | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     LOAD ROI DASHBOARD
  ======================================================= */

  const loadROIDashboard =
    useCallback(
      async () => {
        /*
         * Wait until TenantContext has finished
         * resolving the active tenant.
         */
        if (
          loadingTenants
        ) {
          return;
        }

        /*
         * No tenant selected:
         * immediately remove previous tenant data.
         */
        if (
          !selectedTenantId
        ) {
          setDashboardData(
            null,
          );

          setErrorMessage(
            "",
          );

          setIsLoading(
            false,
          );

          return;
        }

        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );

          /*
           * Prevent data belonging to the previous
           * tenant from remaining visible while
           * the newly selected tenant is loading.
           */
          setDashboardData(
            null,
          );

          const token =
            getStoredValue([
              "townmelaAdminToken",
              "accessToken",
              "token",
              "authToken",
              "jwt",
            ]);

          if (!token) {
            router.replace(
              "/admin/login",
            );

            return;
          }

          /*
           * IMPORTANT:
           * selectedTenantId comes directly from
           * TenantContext.
           *
           * We intentionally do NOT read tenant ID
           * from localStorage here.
           */
          const headers: HeadersInit =
            {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,

              "X-Tenant-Id":
                selectedTenantId,
            };

          const queryParams =
            buildDateRangeParams(
              selectedRange,
            );

          const dashboardUrl =
            `${API_BASE_URL}/api/roi/dashboard?${queryParams.toString()}`;

          const productParams =
            new URLSearchParams(
              queryParams,
            );

          productParams.set(
            "page",
            "1",
          );

          productParams.set(
            "limit",
            "6",
          );

          productParams.set(
            "sort",
            "-netProfit",
          );

          const productsUrl =
            `${API_BASE_URL}/api/roi/products?${productParams.toString()}`;

          const [
            dashboardResponse,
            productsResponse,
          ] =
            await Promise.all([
              fetch(
                dashboardUrl,
                {
                  method:
                    "GET",

                  headers,

                  credentials:
                    "include",

                  cache:
                    "no-store",
                },
              ),

              fetch(
                productsUrl,
                {
                  method:
                    "GET",

                  headers,

                  credentials:
                    "include",

                  cache:
                    "no-store",
                },
              ),
            ]);

          /* =================================================
             AUTHORIZATION
          ================================================= */

          if (
            dashboardResponse.status ===
              401 ||
            dashboardResponse.status ===
              403 ||
            productsResponse.status ===
              401 ||
            productsResponse.status ===
              403
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

          /* =================================================
             PARSE RESPONSES
          ================================================= */

          const dashboardPayload =
            (await dashboardResponse
              .json()
              .catch(
                () =>
                  null,
              )) as
              | DashboardApiResponse
              | null;

          const productsPayload =
            (await productsResponse
              .json()
              .catch(
                () =>
                  null,
              )) as
              | ProductsApiResponse
              | null;

          if (
            !dashboardResponse.ok ||
            !dashboardPayload?.success
          ) {
            throw new Error(
              dashboardPayload
                ?.message ||
                "Failed to load ROI dashboard data.",
            );
          }

          const dashboard =
            dashboardPayload.data;

          const summary =
            dashboard?.summary;

          const settings =
            dashboard?.settings;

          /* =================================================
             MAP PRODUCT PROFITABILITY
          ================================================= */

          const mappedProducts: ProfitableProduct[] =
            productsResponse.ok &&
            productsPayload?.success
              ? (
                  productsPayload.data ??
                  []
                ).map(
                  (
                    product,
                    index,
                  ) => ({
                    _id:
                      String(
                        product._id ||
                          product.productId ||
                          `product-${index}`,
                      ),

                    name:
                      String(
                        product.name ||
                          "Unnamed product",
                      ),

                    sku:
                      product.sku
                        ? String(
                            product.sku,
                          )
                        : undefined,

                    soldQuantity:
                      numberValue(
                        product.soldQuantity,
                      ),

                    revenue:
                      numberValue(
                        product.revenue ??
                          product.grossRevenue,
                      ),

                    totalCost:
                      numberValue(
                        product.totalCost,
                      ),

                    netProfit:
                      numberValue(
                        product.netProfit,
                      ),

                    marginPercent:
                      numberValue(
                        product.marginPercent,
                      ),

                    roiPercent:
                      numberValue(
                        product.roiPercent,
                      ),
                  }),
                )
              : [];

          /* =================================================
             MAP LOSS ORDERS
          ================================================= */

          const mappedLossOrders: LossOrder[] =
            (
              dashboard?.topLossOrders ??
              []
            ).map(
              (
                order,
                index,
              ) => ({
                _id:
                  String(
                    order._id ||
                      order.orderId ||
                      `order-${index}`,
                  ),

                orderNumber:
                  String(
                    order.orderNumber ||
                      "Unknown order",
                  ),

                customerName:
                  order.customer
                    ?.fullName ||
                  "—",

                revenue:
                  numberValue(
                    order.netRevenue,
                  ),

                totalCost:
                  numberValue(
                    order.totalCost,
                  ),

                netProfit:
                  numberValue(
                    order.netProfit,
                  ),

                roiPercent:
                  numberValue(
                    order.roiPercent,
                  ),

                createdAt:
                  String(
                    order.createdAt ||
                      "",
                  ),
              }),
            );

          /* =================================================
             SET VIEW MODEL
          ================================================= */

          setDashboardData(
            {
              currency:
                String(
                  settings
                    ?.currency ||
                    "BDT",
                ),

              stats: {
                netRevenue:
                  numberValue(
                    summary
                      ?.netRevenue ??
                      summary
                        ?.totalRevenue,
                  ),

                totalCost:
                  numberValue(
                    summary
                      ?.totalCost,
                  ),

                netProfit:
                  numberValue(
                    summary
                      ?.netProfit,
                  ),

                roiPercent:
                  numberValue(
                    summary
                      ?.roiPercent,
                  ),

                deliveredOrders:
                  numberValue(
                    summary
                      ?.deliveredOrders,
                  ),

                profitableOrders:
                  numberValue(
                    summary
                      ?.profitableOrders,
                  ),

                lossOrders:
                  numberValue(
                    summary
                      ?.lossOrders,
                  ),

                averageProfitPerOrder:
                  numberValue(
                    summary
                      ?.averageProfitPerOrder ??
                      summary
                        ?.averageProfit,
                  ),
              },

              profitTrend:
                (
                  dashboard?.trend ??
                  []
                ).map(
                  (
                    item,
                  ) => ({
                    date:
                      String(
                        item.date ||
                          "",
                      ),

                    revenue:
                      numberValue(
                        item.revenue,
                      ),

                    cost:
                      numberValue(
                        item.cost,
                      ),

                    profit:
                      numberValue(
                        item.profit,
                      ),
                  }),
                ),

              topProducts:
                mappedProducts,

              lossOrders:
                mappedLossOrders,

              generatedAt:
                String(
                  dashboard
                    ?.generatedAt ||
                    new Date().toISOString(),
                ),
            },
          );
        } catch (
          error
        ) {
          console.error(
            "ROI dashboard load error:",
            error,
          );

          setDashboardData(
            null,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Something went wrong while loading ROI data.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        loadingTenants,
        router,
        selectedRange,
        selectedTenantId,
      ],
    );

  /* =======================================================
     AUTOMATIC TENANT / RANGE RELOAD
  ======================================================= */

  useEffect(() => {
    void loadROIDashboard();
  }, [
    loadROIDashboard,
  ]);

  /* =======================================================
     VIEW DATA
  ======================================================= */

  const currency =
    dashboardData
      ?.currency ||
    "BDT";

  const stats: ROIStats =
    dashboardData
      ?.stats ??
    defaultStats;

  const profitTrend =
    dashboardData
      ?.profitTrend ??
    [];

  const topProducts =
    dashboardData
      ?.topProducts ??
    [];

  const lossOrders =
    dashboardData
      ?.lossOrders ??
    [];

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(
      () => [
        {
          title:
            "Net Revenue",

          value:
            formatCurrency(
              stats.netRevenue,
              currency,
            ),

          description:
            "Sales after discount and refund",

          icon:
            CircleDollarSign,
        },

        {
          title:
            "Total Cost",

          value:
            formatCurrency(
              stats.totalCost,
              currency,
            ),

          description:
            "Product and operating costs",

          icon:
            WalletCards,
        },

        {
          title:
            "Net Profit",

          value:
            formatCurrency(
              stats.netProfit,
              currency,
            ),

          description:
            "Revenue minus total cost",

          icon:
            stats.netProfit <
            0
              ? TrendingDown
              : TrendingUp,
        },

        {
          title:
            "ROI",

          value:
            formatPercent(
              stats.roiPercent,
            ),

          description:
            "Return on total cost",

          icon:
            Percent,
        },

        {
          title:
            "Delivered Orders",

          value:
            formatNumber(
              stats.deliveredOrders,
            ),

          description:
            "Orders included in calculation",

          icon:
            PackageCheck,
        },

        {
          title:
            "Profitable Orders",

          value:
            formatNumber(
              stats.profitableOrders,
            ),

          description:
            "Orders with positive profit",

          icon:
            TrendingUp,
        },

        {
          title:
            "Loss Orders",

          value:
            formatNumber(
              stats.lossOrders,
            ),

          description:
            "Orders requiring attention",

          icon:
            TrendingDown,
        },

        {
          title:
            "Average Profit / Order",

          value:
            formatCurrency(
              stats.averageProfitPerOrder,
              currency,
            ),

          description:
            "Average delivered-order profit",

          icon:
            ShoppingBag,
        },
      ],
      [
        currency,
        stats,
      ],
    );

  /* =======================================================
     CHART DATA
  ======================================================= */

  const chartData =
    useMemo(
      () => {
        const maximumValue =
          Math.max(
            ...profitTrend.map(
              (
                item,
              ) =>
                Math.max(
                  numberValue(
                    item.revenue,
                  ),

                  numberValue(
                    item.cost,
                  ),
                ),
            ),
            1,
          );

        return profitTrend.map(
          (
            item,
          ) => ({
            ...item,

            revenueHeight:
              Math.max(
                item.revenue >
                  0
                  ? 6
                  : 1,

                Math.round(
                  (
                    numberValue(
                      item.revenue,
                    ) /
                    maximumValue
                  ) *
                    100,
                ),
              ),

            costHeight:
              Math.max(
                item.cost >
                  0
                  ? 6
                  : 1,

                Math.round(
                  (
                    numberValue(
                      item.cost,
                    ) /
                    maximumValue
                  ) *
                    100,
                ),
              ),
          }),
        );
      },
      [
        profitTrend,
      ],
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading
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
          }).map(
            (
              _,
              index,
            ) => (
              <div
                key={
                  index
                }
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SkeletonBox className="h-4 w-28" />

                    <SkeletonBox className="mt-4 h-8 w-32" />
                  </div>

                  <SkeletonBox className="h-12 w-12 rounded-2xl" />
                </div>

                <SkeletonBox className="mt-5 h-4 w-40" />
              </div>
            ),
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <SkeletonBox className="h-[390px] w-full" />

          <SkeletonBox className="h-[390px] w-full" />
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            ROI & Profitability
          </span>

          <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            Profitability Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Track revenue,
            business costs,
            net profit and ROI
            from delivered
            orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-xl border border-gray-200 bg-white p-1">
            {rangeOptions.map(
              (
                option,
              ) => (
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
                  {
                    option.label
                  }
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadROIDashboard()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:text-[#FF6900]"
          >
            <RefreshCcw
              size={17}
            />

            Refresh
          </button>

          <Link
            href="/admin/roi/settings"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
          >
            <Settings2
              size={18}
            />

            Cost Settings
          </Link>
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
                ROI data is not
                available yet
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                {
                  errorMessage
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadROIDashboard()
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

      <section
        aria-label="ROI statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statistics.map(
          (
            item,
          ) => {
            const Icon =
              item.icon;

            return (
              <article
                key={
                  item.title
                }
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-500">
                      {
                        item.title
                      }
                    </p>

                    <p className="mt-3 break-words text-2xl font-black text-[#0B1F3A]">
                      {
                        item.value
                      }
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                    <Icon
                      size={
                        23
                      }
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
          CHART + TOOLS
      =================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-black text-[#0B1F3A]">
                Revenue vs Cost
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Daily revenue
                and cost
                comparison.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#FF6900]" />

                Revenue
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-[#0B1F3A]" />

                Cost
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {chartData.length >
            0 ? (
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[720px]">
                  <div className="flex h-[270px] items-end gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 pb-4 pt-6">
                    {chartData.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item.date}-${index}`}
                          className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          <div className="pointer-events-none mb-2 hidden whitespace-nowrap rounded-lg bg-[#0B1F3A] px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block">
                            Profit:{" "}
                            {formatCurrency(
                              item.profit,
                              currency,
                            )}
                          </div>

                          <div className="flex h-[190px] w-full items-end justify-center gap-1">
                            <div
                              title={`Revenue: ${formatCurrency(
                                item.revenue,
                                currency,
                              )}`}
                              className="w-2/5 rounded-t-md bg-[#FF6900]"
                              style={{
                                height:
                                  `${item.revenueHeight}%`,
                              }}
                            />

                            <div
                              title={`Cost: ${formatCurrency(
                                item.cost,
                                currency,
                              )}`}
                              className="w-2/5 rounded-t-md bg-[#0B1F3A]"
                              style={{
                                height:
                                  `${item.costHeight}%`,
                              }}
                            />
                          </div>

                          <span className="mt-2 whitespace-nowrap text-[10px] font-semibold text-gray-400">
                            {formatShortDate(
                              item.date,
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[290px] flex-col items-center justify-center px-5 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                  <BarChart3
                    size={
                      30
                    }
                  />
                </div>

                <h3 className="mt-5 text-lg font-black text-[#0B1F3A]">
                  No profit trend
                  data
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Revenue and cost
                  trend will appear
                  after delivered
                  orders are
                  calculated.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Profitability Tools */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-5">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Profitability
              Tools
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review detailed
              ROI information.
            </p>
          </div>

          <div className="space-y-3 p-5">
            {[
              {
                title:
                  "Order Profitability",

                description:
                  "Review profit or loss per delivered order.",

                href:
                  "/admin/roi/orders",

                icon:
                  ShoppingBag,
              },

              {
                title:
                  "Product Profitability",

                description:
                  "Find high-profit and low-margin products.",

                href:
                  "/admin/roi/products",

                icon:
                  Boxes,
              },

              {
                title:
                  "Cost Settings",

                description:
                  "Set packaging, gateway and advertising costs.",

                href:
                  "/admin/roi/settings",

                icon:
                  Settings2,
              },
            ].map(
              (
                item,
              ) => {
                const Icon =
                  item.icon;

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                      <Icon
                        size={
                          20
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-[#0B1F3A]">
                        {
                          item.title
                        }
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {
                          item.description
                        }
                      </p>
                    </div>

                    <ArrowRight
                      size={
                        17
                      }
                      className="mt-1 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#FF6900]"
                    />
                  </Link>
                );
              },
            )}
          </div>
        </section>
      </div>

      {/* ===================================================
          TOP PROFITABLE PRODUCTS
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Top Profitable
              Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Products generating
              the highest net
              profit.
            </p>
          </div>

          <Link
            href="/admin/roi/products"
            className="inline-flex w-fit items-center gap-1 text-sm font-extrabold text-[#FF6900]"
          >
            View all products

            <ArrowRight
              size={
                16
              }
            />
          </Link>
        </div>

        {topProducts.length >
        0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    "Product",
                    "Sold",
                    "Revenue",
                    "Cost",
                    "Net Profit",
                    "Margin",
                    "ROI",
                  ].map(
                    (
                      heading,
                    ) => (
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
                {topProducts
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      product,
                    ) => (
                      <tr
                        key={
                          product._id
                        }
                        className="border-b border-gray-100 transition last:border-b-0 hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-[#0B1F3A]">
                            {
                              product.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {product.sku ||
                              "No SKU"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {formatNumber(
                            product.soldQuantity,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                          {formatCurrency(
                            product.revenue,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {formatCurrency(
                            product.totalCost,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getProfitBadgeClass(
                              product.netProfit,
                            )}`}
                          >
                            {formatCurrency(
                              product.netProfit,
                              currency,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-gray-600">
                          {formatPercent(
                            product.marginPercent,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                          {formatPercent(
                            product.roiPercent,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[230px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <Boxes
                size={
                  26
                }
              />
            </div>

            <h3 className="mt-4 font-black text-[#0B1F3A]">
              No product
              profitability data
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              Product performance
              will appear after ROI
              calculation is
              available.
            </p>
          </div>
        )}
      </section>

      {/* ===================================================
          RECENT LOSS ORDERS
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Recent Loss
              Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Delivered orders
              where total cost
              exceeded revenue.
            </p>
          </div>

          <Link
            href="/admin/roi/orders?status=loss"
            className="inline-flex w-fit items-center gap-1 text-sm font-extrabold text-[#FF6900]"
          >
            Review loss orders

            <ArrowRight
              size={
                16
              }
            />
          </Link>
        </div>

        {lossOrders.length >
        0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    "Order",
                    "Customer",
                    "Revenue",
                    "Total Cost",
                    "Net Loss",
                    "ROI",
                    "Date",
                  ].map(
                    (
                      heading,
                    ) => (
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
                {lossOrders
                  .slice(
                    0,
                    6,
                  )
                  .map(
                    (
                      order,
                    ) => (
                      <tr
                        key={
                          order._id
                        }
                        className="border-b border-gray-100 transition last:border-b-0 hover:bg-red-50/30"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="font-extrabold text-[#0B1F3A] transition hover:text-[#FF6900]"
                          >
                            {
                              order.orderNumber
                            }
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {order.customerName ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {formatCurrency(
                            order.revenue,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {formatCurrency(
                            order.totalCost,
                            currency,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700">
                            {formatCurrency(
                              order.netProfit,
                              currency,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-red-600">
                          {formatPercent(
                            order.roiPercent,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-500">
                          {formatDate(
                            order.createdAt,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <PackageCheck
                size={
                  26
                }
              />
            </div>

            <h3 className="mt-4 font-black text-[#0B1F3A]">
              No loss orders
              found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              Loss-making
              delivered orders
              will be listed
              here.
            </p>
          </div>
        )}
      </section>

      {/* ===================================================
          LAST UPDATED
      =================================================== */}

      {dashboardData
        ?.generatedAt && (
        <p className="mt-5 text-right text-xs font-semibold text-gray-400">
          Last updated:{" "}
          {new Intl.DateTimeFormat(
            "en-US",
            {
              dateStyle:
                "medium",

              timeStyle:
                "short",
            },
          ).format(
            new Date(
              dashboardData.generatedAt,
            ),
          )}
        </p>
      )}
    </div>
  );
}