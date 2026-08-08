"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  LoaderCircle,
  Mail,
  PackageCheck,
  RefreshCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
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

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   CONSTANTS
========================================================= */

const ADMIN_TOKEN_KEY =
  "townmelaAdminToken";

const CUSTOMER_LIMIT = 10;

const ORDER_STATUSES = [
  "All",
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

const SORT_OPTIONS = [
  {
    value: "latest",
    label: "Latest Customer",
  },
  {
    value: "oldest",
    label: "Oldest Customer",
  },
  {
    value: "orders",
    label: "Most Orders",
  },
  {
    value: "spent",
    label: "Highest Spending",
  },
  {
    value: "name",
    label: "Customer Name",
  },
] as const;

/* =========================================================
   TYPES
========================================================= */

type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

type PaymentStatus =
  | "Pending"
  | "Paid";

type ShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  postalCode?: string | null;
};

type Customer = {
  customerId: string;

  fullName: string;
  phone: string;
  email?: string | null;
  guestId?: string | null;

  latestShippingAddress?:
    | ShippingAddress
    | null;

  firstOrderDate?: string;
  lastOrderDate?: string;

  latestOrderId?: string;
  latestOrderNumber?: string;

  latestOrderStatus?:
    | OrderStatus
    | null;

  latestPaymentStatus?:
    | PaymentStatus
    | null;

  totalOrders: number;
  totalSpent: number;

  deliveredOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
};

type CustomerPagination = {
  page: number;
  limit: number;
  totalCustomers: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type CustomerSummary = {
  totalCustomers: number;
  totalOrders: number;
  totalSpent: number;

  totalDeliveredOrders: number;
  totalPendingOrders: number;
  totalProcessingOrders?: number;
  totalShippedOrders?: number;
  totalCancelledOrders: number;

  averageOrdersPerCustomer?: number;
  averageSpentPerCustomer?: number;

  firstCustomerOrderDate?: string | null;
  latestCustomerOrderDate?: string | null;
};

type CustomersResponse = {
  success?: boolean;
  message?: string;

  customers?: Customer[];

  pagination?: CustomerPagination;

  summary?: CustomerSummary;

  filters?: {
    search?: string;
    orderStatus?: string | null;
    sortBy?: string;
    sortOrder?: string;
  };
};

type CustomerSummaryResponse = {
  success?: boolean;
  message?: string;
  summary?: CustomerSummary;
};

type SortValue =
  (typeof SORT_OPTIONS)[number]["value"];

type FilterStatus =
  (typeof ORDER_STATUSES)[number];

/* =========================================================
   EMPTY VALUES
========================================================= */

const EMPTY_PAGINATION:
  CustomerPagination = {
    page: 1,
    limit: CUSTOMER_LIMIT,
    totalCustomers: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };

const EMPTY_SUMMARY:
  CustomerSummary = {
    totalCustomers: 0,
    totalOrders: 0,
    totalSpent: 0,

    totalDeliveredOrders: 0,
    totalPendingOrders: 0,
    totalProcessingOrders: 0,
    totalShippedOrders: 0,
    totalCancelledOrders: 0,

    averageOrdersPerCustomer: 0,
    averageSpentPerCustomer: 0,

    firstCustomerOrderDate: null,
    latestCustomerOrderDate: null,
  };

/* =========================================================
   FORMAT HELPERS
========================================================= */

const formatCurrency = (
  value: number,
) => {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    },
  ).format(safeValue);
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
};

const formatAddress = (
  address?:
    | ShippingAddress
    | null,
) => {
  if (!address) {
    return "No address available";
  }

  const parts = [
    address.address,
    address.area,
    address.district,
    address.division,
  ].filter(Boolean);

  return (
    parts.join(", ") ||
    "No address available"
  );
};

/* =========================================================
   STATUS STYLES
========================================================= */

const getOrderStatusClassName = (
  status?:
    | OrderStatus
    | null,
) => {
  switch (status) {
    case "Delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Processing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Shipped":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

/* =========================================================
   SUMMARY CARD
========================================================= */

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
};

function SummaryCard({
  title,
  value,
  description,
  icon,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold leading-5 text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   CUSTOMERS PAGE
========================================================= */

export default function CustomersPage() {
  const router = useRouter();

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<CustomerSummary>(
      EMPTY_SUMMARY,
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<CustomerPagination>(
      EMPTY_PAGINATION,
    );

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    orderStatus,
    setOrderStatus,
  ] =
    useState<FilterStatus>(
      "All",
    );

  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortValue>(
      "latest",
    );

  const [
    sortOrder,
    setSortOrder,
  ] = useState<
    "asc" | "desc"
  >("desc");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     AUTH TOKEN
  ======================================================= */

  const getAdminToken =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "";
      }

      return (
        localStorage.getItem(
          ADMIN_TOKEN_KEY,
        ) ?? ""
      );
    }, []);

  /* =======================================================
     HANDLE UNAUTHORIZED
  ======================================================= */

  const handleUnauthorized =
    useCallback(() => {
      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.removeItem(
          ADMIN_TOKEN_KEY,
        );

        localStorage.removeItem(
          "townmelaAdminUser",
        );
      }

      router.replace(
        "/admin/login",
      );
    }, [router]);

  /* =======================================================
     LOAD CUSTOMERS
  ======================================================= */

  const loadCustomers =
    useCallback(
      async (
        showRefreshLoader =
          false,
      ) => {
        const token =
          getAdminToken();

        if (!token) {
          handleUnauthorized();
          return;
        }

        try {
          if (
            showRefreshLoader
          ) {
            setIsRefreshing(
              true,
            );
          } else {
            setIsLoading(true);
          }

          setErrorMessage("");

          const params =
            new URLSearchParams({
              page:
                String(page),

              limit:
                String(
                  CUSTOMER_LIMIT,
                ),

              sortBy,

              sortOrder,
            });

          if (searchQuery) {
            params.set(
              "search",
              searchQuery,
            );
          }

          if (
            orderStatus !==
            "All"
          ) {
            params.set(
              "orderStatus",
              orderStatus,
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/customers?${params.toString()}`,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                cache: "no-store",
              },
            );

          const data:
            CustomersResponse =
            await response.json();

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            handleUnauthorized();
            return;
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Failed to load customers.",
            );
          }

          setCustomers(
            Array.isArray(
              data.customers,
            )
              ? data.customers
              : [],
          );

          setPagination(
            data.pagination ??
              EMPTY_PAGINATION,
          );

          if (data.summary) {
            setSummary(
              data.summary,
            );
          }
        } catch (error) {
          console.error(
            "Load customers error:",
            error,
          );

          setCustomers([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading customers.",
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        getAdminToken,
        handleUnauthorized,
        orderStatus,
        page,
        searchQuery,
        sortBy,
        sortOrder,
      ],
    );

  /* =======================================================
     LOAD CUSTOMER SUMMARY
  ======================================================= */

  const loadCustomerSummary =
    useCallback(async () => {
      const token =
        getAdminToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/api/customers/summary`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            },
          );

        const data:
          CustomerSummaryResponse =
          await response.json();

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          handleUnauthorized();
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load customer summary.",
          );
        }

        setSummary(
          data.summary ??
            EMPTY_SUMMARY,
        );
      } catch (error) {
        console.error(
          "Load customer summary error:",
          error,
        );
      }
    }, [
      getAdminToken,
      handleUnauthorized,
    ]);

  /* =======================================================
     INITIAL LOAD AND FILTER LOAD
  ======================================================= */

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadCustomerSummary();
  }, [loadCustomerSummary]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch = (
    event:
      React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setPage(1);

    setSearchQuery(
      searchInput.trim(),
    );
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh =
    async () => {
      await Promise.all([
        loadCustomers(true),
        loadCustomerSummary(),
      ]);
    };

  /* =======================================================
     PAGE NUMBERS
  ======================================================= */

  const visiblePages =
    useMemo(() => {
      const totalPages =
        pagination.totalPages;

      if (totalPages <= 1) {
        return [];
      }

      const startPage =
        Math.max(
          1,
          page - 2,
        );

      const endPage =
        Math.min(
          totalPages,
          startPage + 4,
        );

      const correctedStart =
        Math.max(
          1,
          endPage - 4,
        );

      return Array.from(
        {
          length:
            endPage -
            correctedStart +
            1,
        },
        (_, index) =>
          correctedStart +
          index,
      );
    }, [
      page,
      pagination.totalPages,
    ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="w-full">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <Users
                size={24}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Customers
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Review guest customer
                information, spending,
                order activity and latest
                delivery status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
            disabled={
              isRefreshing ||
              isLoading
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={18}
              className={
                isRefreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Data
          </button>
        </div>
      </section>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Customers"
          value={String(
            summary.totalCustomers ??
              0,
          )}
          description="Unique customers from order records"
          icon={
            <UserRound
              size={23}
            />
          }
        />

        <SummaryCard
          title="Total Orders"
          value={String(
            summary.totalOrders ??
              0,
          )}
          description="Orders placed by all customers"
          icon={
            <ShoppingBag
              size={23}
            />
          }
        />

        <SummaryCard
          title="Total Customer Value"
          value={formatCurrency(
            summary.totalSpent ??
              0,
          )}
          description="Cancelled order values excluded"
          icon={
            <CircleDollarSign
              size={23}
            />
          }
        />

        <SummaryCard
          title="Delivered Orders"
          value={String(
            summary.totalDeliveredOrders ??
              0,
          )}
          description={`Pending: ${
            summary.totalPendingOrders ??
            0
          }`}
          icon={
            <PackageCheck
              size={23}
            />
          }
        />
      </section>

      {/* =================================================
          FILTERS
      ================================================= */}

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[#0B1F3A]">
          <SlidersHorizontal
            size={18}
            className="text-[#FF6900]"
          />

          Customer Filters
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_210px_220px_150px]">
          {/* Search */}

          <form
            onSubmit={
              handleSearch
            }
            className="relative"
          >
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={
                searchInput
              }
              onChange={(
                event,
              ) =>
                setSearchInput(
                  event.target
                    .value,
                )
              }
              placeholder="Search name, phone, email or order..."
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-24 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10"
            />

            {searchInput && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                aria-label="Clear search"
                className="absolute right-[76px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
              >
                <X
                  size={17}
                />
              </button>
            )}

            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#FF6900] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#E85F00]"
            >
              Search
            </button>
          </form>

          {/* Status */}

          <select
            value={
              orderStatus
            }
            onChange={(
              event,
            ) => {
              setOrderStatus(
                event.target
                  .value as FilterStatus,
              );

              setPage(1);
            }}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10"
          >
            {ORDER_STATUSES.map(
              (status) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {status ===
                  "All"
                    ? "All Order Status"
                    : status}
                </option>
              ),
            )}
          </select>

          {/* Sort */}

          <select
            value={sortBy}
            onChange={(
              event,
            ) => {
              setSortBy(
                event.target
                  .value as SortValue,
              );

              setPage(1);
            }}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10"
          >
            {SORT_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>

          {/* Sort Order */}

          <button
            type="button"
            onClick={() => {
              setSortOrder(
                (
                  current,
                ) =>
                  current ===
                  "desc"
                    ? "asc"
                    : "desc",
              );

              setPage(1);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
          >
            <ArrowDownUp
              size={18}
            />

            {sortOrder ===
            "desc"
              ? "Descending"
              : "Ascending"}
          </button>
        </div>

        {(searchQuery ||
          orderStatus !==
            "All") && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400">
              Active filters:
            </span>

            {searchQuery && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-[#FF6900]"
              >
                Search:
                {searchQuery}

                <X
                  size={13}
                />
              </button>
            )}

            {orderStatus !==
              "All" && (
              <button
                type="button"
                onClick={() => {
                  setOrderStatus(
                    "All",
                  );

                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-600"
              >
                Status:
                {orderStatus}

                <X
                  size={13}
                />
              </button>
            )}
          </div>
        )}
      </section>

      {/* =================================================
          CONTENT
      ================================================= */}

      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Customer List
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-400">
              Showing{" "}
              {customers.length} of{" "}
              {
                pagination.totalCustomers
              }{" "}
              customers
            </p>
          </div>

          {pagination.totalPages >
            0 && (
            <p className="text-xs font-bold text-gray-500">
              Page {page} of{" "}
              {
                pagination.totalPages
              }
            </p>
          )}
        </div>

        {/* Loading */}

        {isLoading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <LoaderCircle
              size={34}
              className="animate-spin text-[#FF6900]"
            />

            <p className="mt-4 text-sm font-extrabold text-[#0B1F3A]">
              Loading customers...
            </p>
          </div>
        )}

        {/* Error */}

        {!isLoading &&
          errorMessage && (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertCircle
                  size={27}
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-[#0B1F3A]">
                Could not load customers
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadCustomers()
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
              >
                <RefreshCcw
                  size={18}
                />

                Try Again
              </button>
            </div>
          )}

        {/* Empty */}

        {!isLoading &&
          !errorMessage &&
          customers.length ===
            0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Users
                  size={30}
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-[#0B1F3A]">
                No customers found
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                No customer matches the
                current search or filter
                settings.
              </p>

              {(searchQuery ||
                orderStatus !==
                  "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput(
                      "",
                    );

                    setSearchQuery(
                      "",
                    );

                    setOrderStatus(
                      "All",
                    );

                    setPage(1);
                  }}
                  className="mt-5 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

        {/* Desktop Table */}

        {!isLoading &&
          !errorMessage &&
          customers.length >
            0 && (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-[#F8F9FB]">
                    <tr className="border-b border-gray-200">
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Customer
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Contact
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                        Orders
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                        Total Spent
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Latest Order
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {customers.map(
                      (
                        customer,
                      ) => (
                        <tr
                          key={
                            customer.customerId
                          }
                          className="transition hover:bg-orange-50/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1F3A] text-sm font-black text-white">
                                {customer.fullName
                                  ?.charAt(
                                    0,
                                  )
                                  .toUpperCase() ||
                                  "C"}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[190px] truncate text-sm font-black text-[#0B1F3A]">
                                  {
                                    customer.fullName
                                  }
                                </p>

                                <p className="mt-1 text-xs font-semibold text-gray-400">
                                  Since{" "}
                                  {formatDate(
                                    customer.firstOrderDate,
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-[#0B1F3A]">
                              {
                                customer.phone
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                              <Mail
                                size={
                                  13
                                }
                              />

                              <span className="max-w-[180px] truncate">
                                {customer.email ||
                                  "No email"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                              {
                                customer.totalOrders
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <p className="text-sm font-black text-[#0B1F3A]">
                              {formatCurrency(
                                customer.totalSpent,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-[#0B1F3A]">
                              {customer.latestOrderNumber ||
                                "—"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-400">
                              {formatDate(
                                customer.lastOrderDate,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getOrderStatusClassName(
                                customer.latestOrderStatus,
                              )}`}
                            >
                              {customer.latestOrderStatus ||
                                "Pending"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <Link
                              href={`/admin/customers/${encodeURIComponent(
                                customer.customerId,
                              )}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-[#FF6900] hover:bg-orange-50 hover:text-[#FF6900]"
                              aria-label={`View ${customer.fullName}`}
                            >
                              <Eye
                                size={
                                  18
                                }
                              />
                            </Link>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}

              <div className="divide-y divide-gray-100 lg:hidden">
                {customers.map(
                  (
                    customer,
                  ) => (
                    <article
                      key={
                        customer.customerId
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1F3A] text-sm font-black text-white">
                          {customer.fullName
                            ?.charAt(
                              0,
                            )
                            .toUpperCase() ||
                            "C"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-[#0B1F3A]">
                                {
                                  customer.fullName
                                }
                              </h3>

                              <p className="mt-1 text-sm font-bold text-gray-600">
                                {
                                  customer.phone
                                }
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getOrderStatusClassName(
                                customer.latestOrderStatus,
                              )}`}
                            >
                              {customer.latestOrderStatus ||
                                "Pending"}
                            </span>
                          </div>

                          <p className="mt-2 truncate text-xs font-semibold text-gray-400">
                            {customer.email ||
                              "No email address"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F8F9FB] p-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            Total Orders
                          </p>

                          <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                            {
                              customer.totalOrders
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            Total Spent
                          </p>

                          <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                            {formatCurrency(
                              customer.totalSpent,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            Latest Order
                          </p>

                          <p className="mt-1 truncate text-xs font-black text-[#0B1F3A]">
                            {customer.latestOrderNumber ||
                              "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            Last Ordered
                          </p>

                          <p className="mt-1 text-xs font-black text-[#0B1F3A]">
                            {formatDate(
                              customer.lastOrderDate,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="line-clamp-2 text-xs font-semibold leading-5 text-gray-500">
                          {formatAddress(
                            customer.latestShippingAddress,
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/admin/customers/${encodeURIComponent(
                          customer.customerId,
                        )}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
                      >
                        <Eye
                          size={17}
                        />

                        View Customer
                      </Link>
                    </article>
                  ),
                )}
              </div>
            </>
          )}

        {/* Pagination */}

        {!isLoading &&
          !errorMessage &&
          customers.length >
            0 &&
          pagination.totalPages >
            1 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs font-semibold text-gray-500">
                Showing page{" "}
                <span className="font-black text-[#0B1F3A]">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-black text-[#0B1F3A]">
                  {
                    pagination.totalPages
                  }
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage(
                      (
                        current,
                      ) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={16}
                  />

                  Previous
                </button>

                {visiblePages.map(
                  (
                    pageNumber,
                  ) => (
                    <button
                      key={
                        pageNumber
                      }
                      type="button"
                      onClick={() =>
                        setPage(
                          pageNumber,
                        )
                      }
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black transition ${
                        page ===
                        pageNumber
                          ? "bg-[#FF6900] text-white"
                          : "border border-gray-200 bg-white text-[#0B1F3A] hover:border-[#FF6900] hover:text-[#FF6900]"
                      }`}
                    >
                      {
                        pageNumber
                      }
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage(
                      (
                        current,
                      ) =>
                        Math.min(
                          pagination.totalPages,
                          current +
                            1,
                        ),
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next

                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </div>
          )}
      </section>
    </main>
  );
}