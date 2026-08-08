"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Filter,
  LoaderCircle,
  PackageCheck,
  Percent,
  RefreshCcw,
  Search,
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
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type ProfitStatus =
  | "all"
  | "profit"
  | "loss"
  | "break-even";

type DateRange =
  | "today"
  | "7d"
  | "30d"
  | "90d";

type ROIOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  itemCount: number;
  revenue: number;
  productCost: number;
  courierCost: number;
  packagingCost: number;
  gatewayFee: number;
  advertisingCost: number;
  discountAmount: number;
  refundAmount: number;
  totalCost: number;
  netProfit: number;
  roiPercent: number;
  marginPercent: number;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt: string;
};

type ROIOrderSummary = {
  totalOrders: number;
  profitableOrders: number;
  lossOrders: number;
  breakEvenOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageROI: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ROIOrdersResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    _id?: string;
    orderId?: string;
    orderNumber?: string;

    customer?: {
      fullName?: string;
      phone?: string;
    };

    itemCount?: number;
    netRevenue?: number;
    productCost?: number;
    courierCost?: number;
    packagingCost?: number;
    gatewayFee?: number;
    advertisingCost?: number;
    discountAmount?: number;
    refundAmount?: number;
    totalCost?: number;
    netProfit?: number;
    roiPercent?: number;
    marginPercent?: number;
    orderStatus?: string;
    paymentStatus?: string;
    createdAt?: string;
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

const defaultSummary: ROIOrderSummary = {
  totalOrders: 0,
  profitableOrders: 0,
  lossOrders: 0,
  breakEvenOrders: 0,
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  averageROI: 0,
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
    new Date(endDate);

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

  return {
    startDate:
      toDateInputValue(
        startDate,
      ),

    endDate:
      toDateInputValue(
        endDate,
      ),
  };
};

const getProfitStatus = (
  value: number,
): ProfitStatus => {
  if (value > 0) {
    return "profit";
  }

  if (value < 0) {
    return "loss";
  }

  return "break-even";
};

const getProfitBadgeClass = (
  value: number,
) => {
  if (value > 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value < 0) {
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
   ORDER PROFITABILITY PAGE
========================================================= */

export default function ROIOrdersPage() {
  const router =
    useRouter();

  /* =======================================================
     GLOBAL TENANT
  ======================================================= */

  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    orders,
    setOrders,
  ] =
    useState<ROIOrder[]>(
      [],
    );

  const [
    summary,
    setSummary,
  ] =
    useState<ROIOrderSummary>(
      defaultSummary,
    );

  const [
    currency,
    setCurrency,
  ] =
    useState("BDT");

  const [
    selectedRange,
    setSelectedRange,
  ] =
    useState<DateRange>(
      "30d",
    );

  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState<ProfitStatus>(
      "all",
    );

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(1);

  const [
    totalRecords,
    setTotalRecords,
  ] =
    useState(0);

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

  const limit = 20;

  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders =
    useCallback(
      async () => {
        /*
         * Wait until TenantContext finishes
         * loading / resolving the selected tenant.
         */
        if (
          loadingTenants
        ) {
          return;
        }

        /*
         * No active tenant:
         * clear any previously loaded tenant data.
         */
        if (
          !selectedTenantId
        ) {
          setOrders([]);

          setSummary(
            defaultSummary,
          );

          setCurrency(
            "BDT",
          );

          setTotalPages(
            1,
          );

          setTotalRecords(
            0,
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
           * Do not keep previous tenant rows visible
           * while the new tenant is loading.
           */
          setOrders([]);

          setSummary(
            defaultSummary,
          );

          setTotalPages(
            1,
          );

          setTotalRecords(
            0,
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

          const headers: HeadersInit =
            {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,

              "X-Tenant-Id":
                selectedTenantId,
            };

          const dateRange =
            buildDateRangeParams(
              selectedRange,
            );

          const query =
            new URLSearchParams(
              {
                startDate:
                  dateRange.startDate,

                endDate:
                  dateRange.endDate,

                dateField:
                  "createdAt",

                search:
                  searchTerm.trim(),

                page:
                  String(
                    currentPage,
                  ),

                limit:
                  String(
                    limit,
                  ),

                sort:
                  "-createdAt",
              },
            );

          if (
            selectedStatus ===
            "profit"
          ) {
            query.set(
              "profitable",
              "true",
            );
          } else if (
            selectedStatus ===
            "loss"
          ) {
            query.set(
              "profitable",
              "false",
            );

            query.set(
              "maxProfit",
              "-0.01",
            );
          } else if (
            selectedStatus ===
            "break-even"
          ) {
            query.set(
              "minProfit",
              "0",
            );

            query.set(
              "maxProfit",
              "0",
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/roi/orders?${query.toString()}`,
              {
                method:
                  "GET",

                headers,

                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          if (
            response.status ===
              401 ||
            response.status ===
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

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | ROIOrdersResponse
              | null;

          if (
            !response.ok ||
            !payload?.success
          ) {
            throw new Error(
              payload?.message ||
                "Failed to load order profitability data.",
            );
          }

          const rows =
            Array.isArray(
              payload.data,
            )
              ? payload.data
              : [];

          const mappedOrders: ROIOrder[] =
            rows.map(
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

                customerPhone:
                  order.customer
                    ?.phone ||
                  "—",

                itemCount:
                  numberValue(
                    order.itemCount,
                  ),

                revenue:
                  numberValue(
                    order.netRevenue,
                  ),

                productCost:
                  numberValue(
                    order.productCost,
                  ),

                courierCost:
                  numberValue(
                    order.courierCost,
                  ),

                packagingCost:
                  numberValue(
                    order.packagingCost,
                  ),

                gatewayFee:
                  numberValue(
                    order.gatewayFee,
                  ),

                advertisingCost:
                  numberValue(
                    order.advertisingCost,
                  ),

                discountAmount:
                  numberValue(
                    order.discountAmount,
                  ),

                refundAmount:
                  numberValue(
                    order.refundAmount,
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

                marginPercent:
                  numberValue(
                    order.marginPercent,
                  ),

                orderStatus:
                  order.orderStatus,

                paymentStatus:
                  order.paymentStatus,

                createdAt:
                  String(
                    order.createdAt ||
                      "",
                  ),
              }),
            );

          setOrders(
            mappedOrders,
          );

          const responseCurrency =
            payload.meta
              ?.settings
              ?.currency ||
            "BDT";

          setCurrency(
            responseCurrency,
          );

          const profitableOrders =
            mappedOrders.filter(
              (
                order,
              ) =>
                order.netProfit >
                0,
            ).length;

          const lossOrders =
            mappedOrders.filter(
              (
                order,
              ) =>
                order.netProfit <
                0,
            ).length;

          const breakEvenOrders =
            mappedOrders.filter(
              (
                order,
              ) =>
                order.netProfit ===
                0,
            ).length;

          const totalRevenue =
            mappedOrders.reduce(
              (
                total,
                order,
              ) =>
                total +
                order.revenue,
              0,
            );

          const totalCost =
            mappedOrders.reduce(
              (
                total,
                order,
              ) =>
                total +
                order.totalCost,
              0,
            );

          const totalProfit =
            mappedOrders.reduce(
              (
                total,
                order,
              ) =>
                total +
                order.netProfit,
              0,
            );

          const averageROI =
            mappedOrders.length >
            0
              ? mappedOrders.reduce(
                  (
                    total,
                    order,
                  ) =>
                    total +
                    order.roiPercent,
                  0,
                ) /
                mappedOrders.length
              : 0;

          const pagination =
            payload.meta
              ?.pagination;

          setSummary(
            {
              totalOrders:
                numberValue(
                  pagination
                    ?.total ??
                    mappedOrders.length,
                ),

              profitableOrders,

              lossOrders,

              breakEvenOrders,

              totalRevenue,

              totalCost,

              totalProfit,

              averageROI,
            },
          );

          setTotalPages(
            Math.max(
              numberValue(
                pagination
                  ?.totalPages,
              ),
              1,
            ),
          );

          setTotalRecords(
            numberValue(
              pagination
                ?.total ??
                mappedOrders.length,
            ),
          );
        } catch (
          error
        ) {
          console.error(
            "ROI orders load error:",
            error,
          );

          setOrders([]);

          setSummary(
            defaultSummary,
          );

          setCurrency(
            "BDT",
          );

          setTotalPages(
            1,
          );

          setTotalRecords(
            0,
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Something went wrong while loading order profitability.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        currentPage,
        loadingTenants,
        router,
        searchTerm,
        selectedRange,
        selectedStatus,
        selectedTenantId,
      ],
    );

  /* =======================================================
     AUTO LOAD
  ======================================================= */

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadOrders();
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    loadOrders,
  ]);

  /* =======================================================
     RESET PAGE WHEN FILTER / TENANT CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrentPage(
      1,
    );
  }, [
    searchTerm,
    selectedRange,
    selectedStatus,
    selectedTenantId,
  ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(
      () => [
        {
          title:
            "Delivered Orders",

          value:
            formatNumber(
              summary.totalOrders,
            ),

          description:
            "Orders included in ROI",

          icon:
            PackageCheck,
        },

        {
          title:
            "Profitable Orders",

          value:
            formatNumber(
              summary.profitableOrders,
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
              summary.lossOrders,
            ),

          description:
            "Orders with negative profit",

          icon:
            TrendingDown,
        },

        {
          title:
            "Total Revenue",

          value:
            formatCurrency(
              summary.totalRevenue,
              currency,
            ),

          description:
            "Revenue from filtered orders",

          icon:
            CircleDollarSign,
        },

        {
          title:
            "Total Cost",

          value:
            formatCurrency(
              summary.totalCost,
              currency,
            ),

          description:
            "Combined order costs",

          icon:
            WalletCards,
        },

        {
          title:
            "Net Profit",

          value:
            formatCurrency(
              summary.totalProfit,
              currency,
            ),

          description:
            "Revenue minus total cost",

          icon:
            summary.totalProfit <
            0
              ? TrendingDown
              : TrendingUp,
        },

        {
          title:
            "Average ROI",

          value:
            formatPercent(
              summary.averageROI,
            ),

          description:
            "Average return on cost",

          icon:
            Percent,
        },

        {
          title:
            "Break-even Orders",

          value:
            formatNumber(
              summary.breakEvenOrders,
            ),

          description:
            "No profit or loss",

          icon:
            ShoppingBag,
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
    orders.length === 0
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
                <SkeletonBox className="h-4 w-28" />

                <SkeletonBox className="mt-4 h-8 w-32" />

                <SkeletonBox className="mt-5 h-4 w-40" />
              </div>
            ),
          )}
        </section>

        <SkeletonBox className="mt-6 h-[520px] w-full" />

        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-sm font-bold text-gray-500 shadow-sm">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#FF6900]"
          />

          Loading order profitability...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* Header */}

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
            Order Profitability
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Review revenue,
            cost, profit,
            margin and ROI for
            each delivered order.
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
              void loadOrders()
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

      {/* Error */}

      {errorMessage && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="font-extrabold text-amber-800">
                Order profitability data is unavailable
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
              void loadOrders()
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

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Filters */}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
              placeholder="Search order number or customer..."
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
                selectedStatus
              }
              onChange={(
                event,
              ) =>
                setSelectedStatus(
                  event.target
                    .value as ProfitStatus,
                )
              }
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-extrabold text-gray-600 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">
                All Orders
              </option>

              <option value="profit">
                Profitable
              </option>

              <option value="loss">
                Loss
              </option>

              <option value="break-even">
                Break-even
              </option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearchTerm(
                "",
              );

              setSelectedStatus(
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

      {/* Table */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Delivered Order Profitability
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing{" "}
              {formatNumber(
                orders.length,
              )}{" "}
              of{" "}
              {formatNumber(
                totalRecords,
              )}{" "}
              records.
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

        {orders.length >
        0 ? (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1450px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Order",
                      "Customer",
                      "Revenue",
                      "Product Cost",
                      "Courier",
                      "Other Cost",
                      "Total Cost",
                      "Net Profit",
                      "Margin",
                      "ROI",
                      "Date",
                      "Action",
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
                  {orders.map(
                    (
                      order,
                    ) => {
                      const otherCost =
                        numberValue(
                          order.packagingCost,
                        ) +
                        numberValue(
                          order.gatewayFee,
                        ) +
                        numberValue(
                          order.advertisingCost,
                        ) +
                        numberValue(
                          order.discountAmount,
                        ) +
                        numberValue(
                          order.refundAmount,
                        );

                      const profitStatus =
                        getProfitStatus(
                          order.netProfit,
                        );

                      return (
                        <tr
                          key={
                            order._id
                          }
                          className="border-b border-gray-100 transition last:border-b-0 hover:bg-orange-50/40"
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

                            <p className="mt-1 text-xs text-gray-400">
                              {formatNumber(
                                order.itemCount,
                              )}{" "}
                              item(s)
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-[#0B1F3A]">
                              {order.customerName ||
                                "—"}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {order.customerPhone ||
                                "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {formatCurrency(
                              order.revenue,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatCurrency(
                              order.productCost,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatCurrency(
                              order.courierCost,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-gray-600">
                            {formatCurrency(
                              otherCost,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {formatCurrency(
                              order.totalCost,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getProfitBadgeClass(
                                order.netProfit,
                              )}`}
                            >
                              {formatCurrency(
                                order.netProfit,
                                currency,
                              )}
                            </span>

                            <p className="mt-1 text-[11px] font-bold capitalize text-gray-400">
                              {
                                profitStatus
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-extrabold text-gray-600">
                            {formatPercent(
                              order.marginPercent,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                            {formatPercent(
                              order.roiPercent,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-gray-500">
                            {formatDate(
                              order.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/admin/orders/${order._id}`}
                              className="inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]"
                            >
                              Details

                              <ArrowRight
                                size={15}
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

            <div className="grid gap-4 p-4 xl:hidden">
              {orders.map(
                (
                  order,
                ) => (
                  <article
                    key={
                      order._id
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="font-black text-[#0B1F3A] hover:text-[#FF6900]"
                        >
                          {
                            order.orderNumber
                          }
                        </Link>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(
                            order.createdAt,
                          )}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getProfitBadgeClass(
                          order.netProfit,
                        )}`}
                      >
                        {formatCurrency(
                          order.netProfit,
                          currency,
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          Customer
                        </p>

                        <p className="mt-1 font-bold text-[#0B1F3A]">
                          {order.customerName ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          Revenue
                        </p>

                        <p className="mt-1 font-black text-[#0B1F3A]">
                          {formatCurrency(
                            order.revenue,
                            currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          Total Cost
                        </p>

                        <p className="mt-1 font-black text-[#0B1F3A]">
                          {formatCurrency(
                            order.totalCost,
                            currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          ROI / Margin
                        </p>

                        <p className="mt-1 font-black text-[#0B1F3A]">
                          {formatPercent(
                            order.roiPercent,
                          )}
                          {" / "}
                          {formatPercent(
                            order.marginPercent,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                      <span className="text-xs font-bold text-gray-500">
                        {formatNumber(
                          order.itemCount,
                        )}{" "}
                        item(s)
                      </span>

                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]"
                      >
                        View Order

                        <ArrowRight
                          size={15}
                        />
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <ShoppingBag
                size={29}
              />
            </div>

            <h3 className="mt-5 text-lg font-black text-[#0B1F3A]">
              No profitability records found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              Delivered orders matching the selected filters will appear here.
            </p>
          </div>
        )}

        {/* Pagination */}

        {totalPages >
          1 && (
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
                  currentPage <=
                  1
                }
                onClick={() =>
                  setCurrentPage(
                    (
                      page,
                    ) =>
                      Math.max(
                        page -
                          1,
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
                    (
                      page,
                    ) =>
                      Math.min(
                        page +
                          1,
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