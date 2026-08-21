"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
  Tags,
  TicketPercent,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  Percent,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

import {
  useTenant,
} from "@/src/context/TenantContext";

/* =========================================================
   TYPES
========================================================= */

type DashboardStats = {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  activeCoupons: number;
};

type OrderStatusSummary = {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

type SalesOverviewItem = {
  date: string;
  sales: number;
  orders: number;
};

type RecentOrder = {
  _id: string;
  orderNumber: string;

  customer: {
    fullName: string;
    phone: string;
  };

  itemCount: number;

  subtotalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  totalAmount: number;

  paymentMethod: string;
  paymentStatus:
    | "Pending"
    | "Paid";

  orderStatus:
    | "Pending"
    | "Processing"
    | "Shipped"
    | "Delivered"
    | "Cancelled";

  createdAt: string;
};

type LowStockCategory = {
  _id: string;
  name: string;
  slug: string;
};

type LowStockProduct = {
  _id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  oldPrice: number;
  stock: number;
  category:
    | LowStockCategory
    | null;
};

type DashboardMeta = {
  salesOverviewDays: number;
  recentOrderLimit: number;
  lowStockLimit: number;
  generatedAt: string;
};

type DashboardResponse = {
  success: boolean;
  message?: string;

  stats: DashboardStats;

  orderStatus:
    OrderStatusSummary;

  salesOverview:
    SalesOverviewItem[];

  recentOrders:
    RecentOrder[];

  lowStockProducts:
    LowStockProduct[];

  meta: DashboardMeta;
};


type ExecutivePeriodKpis = {
  sales: number;
  profit: number;
  orders: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  averageOrderValue?: number;
  grossMarginPercent?: number;
  netMarginPercent?: number;
  deliverySuccessRate?: number;
};

type ExecutiveLifetimeKpis = {
  grossRevenue: number;
  netRevenue: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  deliverySuccessRate: number;
  cancellationRate: number;
  repeatCustomerRate: number;
};

type ExecutiveDailyChartItem = {
  date: string;
  sales: number;
  grossRevenue: number;
  profit: number;
  grossProfit: number;
  orders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  newCustomers: number;
  returningCustomers: number;
};

type ExecutiveDashboardResponse = {
  success: boolean;
  message?: string;
  generatedAt: string;
  currency: string;
  kpis: {
    today: ExecutivePeriodKpis;
    yesterday: ExecutivePeriodKpis;
    thisMonth: ExecutivePeriodKpis;
    lastMonth: ExecutivePeriodKpis;
    lifetime: ExecutiveLifetimeKpis;
  };
  growth: {
    todayVsYesterday: {
      salesPercent: number;
      profitPercent: number;
      ordersPercent: number;
    };
    thisMonthVsLastMonth: {
      salesPercent: number;
      profitPercent: number;
      ordersPercent: number;
    };
  };
  summaries: {
    revenue: {
      grossRevenue: number;
      discount: number;
      netRevenue: number;
    };
    profit: {
      cogs: number;
      grossProfit: number;
      courierCost: number;
      packagingCost: number;
      paymentFee: number;
      marketingCost: number;
      operatingExpense: number;
      tax: number;
      inventoryLoss: number;
      netProfit: number;
    };
    customers: {
      newCustomers: number;
      returningCustomers: number;
      repeatCustomerRate: number;
    };
    inventory: {
      productsSold: number;
      unitsSold: number;
      inventoryLoss: number;
    };
  };
  charts: {
    daily: ExecutiveDailyChartItem[];
  };
};

/* =========================================================
   DEFAULT VALUES
========================================================= */

const defaultStats:
  DashboardStats = {
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalUsers: 0,
    activeCoupons: 0,
  };

const defaultOrderStatus:
  OrderStatusSummary = {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

/* =========================================================
   QUICK ACTIONS
========================================================= */

const quickActions = [
  {
    title: "Manage Orders",
    description:
      "View orders, details and update delivery status.",
    href: "/admin/orders",
    icon: ShoppingBag,
  },

  {
    title: "Add Product",
    description:
      "Create a new product with pricing, stock and variants.",
    href: "/admin/products/new",
    icon: Boxes,
  },

  {
    title: "Manage Categories",
    description:
      "Create, update and organize product categories.",
    href: "/admin/categories",
    icon: Tags,
  },

  {
    title: "Courier Management",
    description:
      "Create parcels and monitor courier delivery status.",
    href: "/admin/couriers",
    icon: Truck,
  },
];

/* =========================================================
   FORMAT HELPERS
========================================================= */

const formatCurrency = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    },
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  );

const formatNumber = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-BD",
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  );

const formatDate = (
  value: string,
) => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-BD",
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
  const date = new Date(
    `${value}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(date);
};

/* =========================================================
   STATUS STYLES
========================================================= */

const getOrderStatusClassName = (
  status: RecentOrder["orderStatus"],
) => {
  switch (status) {
    case "Pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Processing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Shipped":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
};

const getPaymentStatusClassName = (
  status:
    RecentOrder["paymentStatus"],
) => {
  if (status === "Paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

/* =========================================================
   SKELETON COMPONENT
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
   ADMIN DASHBOARD PAGE
========================================================= */

export default function AdminDashboardPage() {
  const router = useRouter();

  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<DashboardResponse | null>(
      null,
    );

  const [
    executiveData,
    setExecutiveData,
  ] =
    useState<ExecutiveDashboardResponse | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  const loadDashboardData =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        /*
          Wait until TenantProvider finishes resolving the
          active tenant. This is important for Super Admin
          because TownMela can be selected automatically
          immediately after login.
        */

        if (loadingTenants) {
          return;
        }

        if (!selectedTenantId) {
          setDashboardData(null);
          setExecutiveData(null);

          throw new Error(
            "Please select a tenant from the header before loading dashboard data.",
          );
        }

        const [
          executiveResponse,
          legacyResponse,
        ] = await Promise.all([
          tenantFetch(
            "/api/dashboard",
            {
              method: "GET",
              cache: "no-store",
            },
          ),

          tenantFetch(
            "/api/dashboard/stats",
            {
              method: "GET",
              cache: "no-store",
            },
          ),
        ]);

        const [
          executivePayload,
          legacyPayload,
        ] = await Promise.all([
          executiveResponse
            .json()
            .catch(
              () => null,
            ) as Promise<ExecutiveDashboardResponse | null>,

          legacyResponse
            .json()
            .catch(
              () => null,
            ) as Promise<DashboardResponse | null>,
        ]);

        /*
          Only an expired/invalid authentication session
          should clear the admin session.

          A 403 response may be a tenant-access problem and
          should be shown without logging the user out.
        */

        if (
          executiveResponse.status === 401 ||
          legacyResponse.status === 401
        ) {
          [
            "townmelaAdminToken",
            "townmelaAdminUser",
            "accessToken",
            "token",
            "authToken",
            "jwt",
          ].forEach((key) =>
            localStorage.removeItem(
              key,
            ),
          );

          router.replace(
            "/login",
          );

          return;
        }

        if (
          !legacyResponse.ok ||
          !legacyPayload?.success
        ) {
          throw new Error(
            legacyPayload?.message ||
              "Failed to load dashboard data.",
          );
        }

        setDashboardData(
          legacyPayload,
        );

        if (
          executiveResponse.ok &&
          executivePayload?.success
        ) {
          setExecutiveData(
            executivePayload,
          );
        } else {
          setExecutiveData(
            null,
          );
        }
      } catch (error) {
        console.error(
          "Dashboard load error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      loadingTenants,
      router,
      selectedTenantId,
    ]);

  useEffect(() => {
    if (loadingTenants) {
      return;
    }

    void loadDashboardData();
  }, [
    loadingTenants,
    loadDashboardData,
  ]);

  /* =======================================================
     NORMALIZED DASHBOARD DATA
  ======================================================= */

  const stats =
    dashboardData?.stats ??
    defaultStats;

  const orderStatus =
    dashboardData?.orderStatus ??
    defaultOrderStatus;

  const salesOverview =
    executiveData?.charts.daily?.length
      ? executiveData.charts.daily.map(
          (item) => ({
            date: item.date.slice(0, 10),
            sales: item.sales,
            orders: item.deliveredOrders,
          }),
        )
      : dashboardData?.salesOverview ??
        [];

  const recentOrders =
    dashboardData?.recentOrders ??
    [];

  const lowStockProducts =
    dashboardData?.lowStockProducts ??
    [];

  /* =======================================================
     STATISTICS CARDS
  ======================================================= */

  const statistics =
    useMemo(
      () => [
        {
          title: "Total Orders",
          value: formatNumber(
            stats.totalOrders,
          ),
          description:
            "All customer orders",
          icon: ShoppingBag,
        },

        {
          title: "Total Sales",
          value: formatCurrency(
            stats.totalSales,
          ),
          description:
            "Delivered order revenue",
          icon:
            CircleDollarSign,
        },

        {
          title: "Pending Orders",
          value: formatNumber(
            stats.pendingOrders,
          ),
          description:
            "Waiting for processing",
          icon: Clock3,
        },

        {
          title:
            "Delivered Orders",
          value: formatNumber(
            stats.deliveredOrders,
          ),
          description:
            "Successfully delivered",
          icon: PackageCheck,
        },

        {
          title: "Total Products",
          value: formatNumber(
            stats.totalProducts,
          ),
          description:
            "Products in the catalogue",
          icon: Boxes,
        },

        {
          title:
            "Total Categories",
          value: formatNumber(
            stats.totalCategories,
          ),
          description:
            "Available product categories",
          icon: Tags,
        },

        {
          title: "Customers",
          value: formatNumber(
            stats.totalUsers,
          ),
          description:
            "Registered customer accounts",
          icon: Users,
        },

        {
          title:
            "Active Coupons",
          value: formatNumber(
            stats.activeCoupons,
          ),
          description:
            "Currently valid discount coupons",
          icon: TicketPercent,
        },
      ],
      [stats],
    );

  const executiveStatistics =
    useMemo(
      () => {
        if (!executiveData) {
          return [];
        }

        const {
          today,
          thisMonth,
          lifetime,
        } = executiveData.kpis;

        return [
          {
            title: "Today Sales",
            value: formatCurrency(
              today.sales,
            ),
            description: `${executiveData.growth.todayVsYesterday.salesPercent}% vs yesterday`,
            icon: CircleDollarSign,
          },
          {
            title: "Today Profit",
            value: formatCurrency(
              today.profit,
            ),
            description: `${executiveData.growth.todayVsYesterday.profitPercent}% vs yesterday`,
            icon: WalletCards,
          },
          {
            title: "Today Orders",
            value: formatNumber(
              today.orders,
            ),
            description: `${executiveData.growth.todayVsYesterday.ordersPercent}% vs yesterday`,
            icon: ShoppingBag,
          },
          {
            title: "Monthly Sales",
            value: formatCurrency(
              thisMonth.sales,
            ),
            description: `${executiveData.growth.thisMonthVsLastMonth.salesPercent}% vs last month`,
            icon: TrendingUp,
          },
          {
            title: "Monthly Profit",
            value: formatCurrency(
              thisMonth.profit,
            ),
            description: `${executiveData.growth.thisMonthVsLastMonth.profitPercent}% vs last month`,
            icon: CircleDollarSign,
          },
          {
            title: "Average Order Value",
            value: formatCurrency(
              lifetime.averageOrderValue,
            ),
            description:
              "Lifetime delivered-order average",
            icon: WalletCards,
          },
          {
            title: "Gross Margin",
            value: `${lifetime.grossMarginPercent}%`,
            description:
              "Gross profit as a share of revenue",
            icon: Percent,
          },
          {
            title: "Net Margin",
            value: `${lifetime.netMarginPercent}%`,
            description:
              "Net profit as a share of revenue",
            icon: TrendingUp,
          },
        ];
      },
      [executiveData],
    );

  /* =======================================================
     SALES CHART DATA
  ======================================================= */

  const salesChartData =
    useMemo(() => {
      const maximumSales =
        Math.max(
          ...salesOverview.map(
            (item) =>
              item.sales,
          ),
          1,
        );

      return salesOverview.map(
        (item) => ({
          ...item,

          heightPercentage:
            Math.max(
              item.sales > 0
                ? 8
                : 2,

              Math.round(
                (item.sales /
                  maximumSales) *
                  100,
              ),
            ),
        }),
      );
    }, [salesOverview]);

  const last30DaysSales =
    useMemo(
      () =>
        salesOverview.reduce(
          (total, item) =>
            total +
            Number(
              item.sales || 0,
            ),
          0,
        ),
      [salesOverview],
    );

  const last30DaysOrders =
    useMemo(
      () =>
        salesOverview.reduce(
          (total, item) =>
            total +
            Number(
              item.orders || 0,
            ),
          0,
        ),
      [salesOverview],
    );

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1450px]">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBox className="h-7 w-24 rounded-full" />

            <SkeletonBox className="mt-4 h-9 w-72 max-w-full" />

            <SkeletonBox className="mt-3 h-5 w-[460px] max-w-full" />
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SkeletonBox className="h-4 w-28" />

                  <SkeletonBox className="mt-4 h-8 w-24" />
                </div>

                <SkeletonBox className="h-12 w-12 rounded-2xl" />
              </div>

              <SkeletonBox className="mt-5 h-4 w-36" />
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBox className="h-7 w-40" />

            <SkeletonBox className="mt-3 h-4 w-72" />

            <SkeletonBox className="mt-8 h-[300px] w-full" />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBox className="h-7 w-36" />

            <SkeletonBox className="mt-3 h-4 w-52" />

            <div className="mt-8 space-y-4">
              {Array.from({
                length: 5,
              }).map(
                (_, index) => (
                  <SkeletonBox
                    key={index}
                    className="h-14 w-full"
                  />
                ),
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-sm font-bold text-gray-500 shadow-sm">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#FF6900]"
          />

          Loading dashboard data...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR STATE
  ======================================================= */

  if (
    errorMessage &&
    !dashboardData
  ) {
    return (
      <div className="mx-auto w-full max-w-[1450px]">
        <section className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-red-200 bg-white px-5 py-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle
              size={31}
            />
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#0B1F3A]">
            Dashboard data could not be loaded
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadDashboardData()
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
          >
            <RefreshCcw
              size={18}
            />

            Try Again
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            Overview
          </span>

          <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            Dashboard Overview
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Monitor TownMela sales,
            orders, products and
            business activity from one
            place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void loadDashboardData()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:text-[#FF6900]"
          >
            <RefreshCcw
              size={17}
            />

            Refresh
          </button>

          <Link
            href="/admin/orders"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
          >
            View All Orders

            <ArrowRight
              size={18}
            />
          </Link>
        </div>
      </div>

      {executiveStatistics.length > 0 && (
        <section
          aria-label="Executive dashboard KPIs"
          className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {executiveStatistics.map(
            (item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white">
                      <Icon size={23} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    {item.description}
                  </p>
                </article>
              );
            },
          )}
        </section>
      )}

      {/* ===================================================
          LEGACY BUSINESS STATISTICS
      =================================================== */}

      <section
        aria-label="Dashboard statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
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
          MAIN DASHBOARD GRID
      =================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* =================================================
            SALES OVERVIEW
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-black text-[#0B1F3A]">
                Sales Overview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Delivered order
                revenue from the last
                30 days.
              </p>
            </div>

            <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">
              Last 30 days
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-orange-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF6900]">
                  Revenue
                </p>

                <p className="mt-2 text-2xl font-black text-[#0B1F3A]">
                  {formatCurrency(
                    last30DaysSales,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-500">
                  Delivered Orders
                </p>

                <p className="mt-2 text-2xl font-black text-[#0B1F3A]">
                  {formatNumber(
                    last30DaysOrders,
                  )}
                </p>
              </div>
            </div>

            {salesChartData.length >
            0 ? (
              <div className="mt-7 overflow-x-auto pb-2">
                <div className="min-w-[720px]">
                  <div className="flex h-[260px] items-end gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 pb-4 pt-6">
                    {salesChartData.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            item.date
                          }
                          className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          <div className="pointer-events-none mb-2 hidden whitespace-nowrap rounded-lg bg-[#0B1F3A] px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block">
                            {formatCurrency(
                              item.sales,
                            )}
                            {" • "}
                            {
                              item.orders
                            }{" "}
                            order
                          </div>

                          <div className="flex h-[190px] w-full items-end">
                            <div
                              title={`${item.date}: ${formatCurrency(
                                item.sales,
                              )}`}
                              className="w-full rounded-t-lg bg-[#FF6900] transition hover:opacity-80"
                              style={{
                                height: `${item.heightPercentage}%`,
                              }}
                            />
                          </div>

                          {index %
                            3 ===
                          0 ? (
                            <span className="mt-2 whitespace-nowrap text-[10px] font-semibold text-gray-400">
                              {formatShortDate(
                                item.date,
                              )}
                            </span>
                          ) : (
                            <span className="mt-2 h-[15px]" />
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                  <CircleDollarSign
                    size={30}
                  />
                </div>

                <h3 className="mt-5 text-lg font-black text-[#0B1F3A]">
                  No sales data
                  available
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Delivered order sales
                  will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            ORDER STATUS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-5">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Order Status
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current order
              distribution.
            </p>
          </div>

          <div className="space-y-4 p-5">
            {[
              {
                label: "Pending",
                value:
                  orderStatus.pending,
              },

              {
                label: "Processing",
                value:
                  orderStatus.processing,
              },

              {
                label: "Shipped",
                value:
                  orderStatus.shipped,
              },

              {
                label: "Delivered",
                value:
                  orderStatus.delivered,
              },

              {
                label: "Cancelled",
                value:
                  orderStatus.cancelled,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3"
              >
                <span className="text-sm font-bold text-gray-600">
                  {item.label}
                </span>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-xs font-black text-[#0B1F3A] shadow-sm">
                  {formatNumber(
                    item.value,
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===================================================
          QUICK ACTIONS
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Access frequently used
            admin tools.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {quickActions.map(
            (action) => {
              const Icon =
                action.icon;

              return (
                <Link
                  key={
                    action.href
                  }
                  href={
                    action.href
                  }
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                    <Icon
                      size={21}
                    />
                  </div>

                  <h3 className="mt-4 font-black text-[#0B1F3A]">
                    {
                      action.title
                    }
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {
                      action.description
                    }
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]">
                    Open

                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              );
            },
          )}
        </div>
      </section>

      {/* ===================================================
          RECENT ORDERS
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Recent Orders
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest customer orders
              received by TownMela.
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="inline-flex w-fit items-center gap-1 text-sm font-extrabold text-[#FF6900]"
          >
            View all

            <ArrowRight
              size={16}
            />
          </Link>
        </div>

        {recentOrders.length >
        0 ? (
          <>
            {/* Desktop Table */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Order",
                      "Customer",
                      "Items",
                      "Total",
                      "Payment",
                      "Status",
                      "Date",
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
                  {recentOrders.map(
                    (order) => (
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
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-[#0B1F3A]">
                            {
                              order
                                .customer
                                .fullName
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {
                              order
                                .customer
                                .phone
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-gray-600">
                          {
                            order.itemCount
                          }
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-[#0B1F3A]">
                          {formatCurrency(
                            order.totalAmount,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500">
                              {
                                order.paymentMethod
                              }
                            </p>

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getPaymentStatusClassName(
                                order.paymentStatus,
                              )}`}
                            >
                              {
                                order.paymentStatus
                              }
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getOrderStatusClassName(
                              order.orderStatus,
                            )}`}
                          >
                            {
                              order.orderStatus
                            }
                          </span>
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

            {/* Mobile Cards */}

            <div className="grid gap-4 p-4 lg:hidden">
              {recentOrders.map(
                (order) => (
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
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getOrderStatusClassName(
                          order.orderStatus,
                        )}`}
                      >
                        {
                          order.orderStatus
                        }
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          Customer
                        </p>

                        <p className="mt-1 font-bold text-[#0B1F3A]">
                          {
                            order
                              .customer
                              .fullName
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            order
                              .customer
                              .phone
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-400">
                          Order Total
                        </p>

                        <p className="mt-1 font-black text-[#0B1F3A]">
                          {formatCurrency(
                            order.totalAmount,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            order.itemCount
                          }{" "}
                          item(s)
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getPaymentStatusClassName(
                          order.paymentStatus,
                        )}`}
                      >
                        {
                          order.paymentMethod
                        }
                        {" • "}
                        {
                          order.paymentStatus
                        }
                      </span>

                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="inline-flex items-center gap-1 text-sm font-extrabold text-[#FF6900]"
                      >
                        Details

                        <ArrowRight
                          size={
                            15
                          }
                        />
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <ShoppingBag
                size={26}
              />
            </div>

            <h3 className="mt-4 font-black text-[#0B1F3A]">
              No orders found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              New customer orders will
              appear here.
            </p>
          </div>
        )}
      </section>

      {/* ===================================================
          LOW STOCK PRODUCTS
      =================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Low Stock Products
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Products with stock level
              at or below{" "}
              {dashboardData?.meta
                .lowStockLimit ?? 5}
              .
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex w-fit items-center gap-1 text-sm font-extrabold text-[#FF6900]"
          >
            Manage products

            <ArrowRight
              size={16}
            />
          </Link>
        </div>

        {lowStockProducts.length >
        0 ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {lowStockProducts.map(
              (product) => (
                <article
                  key={
                    product._id
                  }
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {product.image ? (
                      <img
                        src={
                          product.image.startsWith(
                            "http",
                          )
                            ? product.image
                            : product.image
                        }
                        alt={
                          product.name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Boxes
                        size={25}
                        className="text-gray-300"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${product._id}/edit`}
                      className="line-clamp-1 font-black text-[#0B1F3A] transition hover:text-[#FF6900]"
                    >
                      {
                        product.name
                      }
                    </Link>

                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-gray-400">
                      {product.category
                        ?.name ||
                        "Uncategorized"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-black text-[#0B1F3A]">
                        {formatCurrency(
                          product.price,
                        )}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          product.stock ===
                          0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {
                          product.stock
                        }{" "}
                        in stock
                      </span>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <PackageCheck
                size={26}
              />
            </div>

            <h3 className="mt-4 font-black text-[#0B1F3A]">
              Stock levels look good
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              There are currently no
              products below the low
              stock limit.
            </p>
          </div>
        )}
      </section>

      {/* ===================================================
          LAST UPDATED
      =================================================== */}

      {(executiveData?.generatedAt ||
        dashboardData?.meta.generatedAt) && (
        <p className="mt-5 text-right text-xs font-semibold text-gray-400">
          Last updated:{" "}
          {new Intl.DateTimeFormat(
            "en-BD",
            {
              dateStyle:
                "medium",
              timeStyle:
                "short",
            },
          ).format(
            new Date(
              executiveData?.generatedAt ||
                dashboardData?.meta.generatedAt ||
                new Date().toISOString(),
            ),
          )}
        </p>
      )}
    </div>
  );
}