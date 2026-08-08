"use client";

import OrdersStats from "./components/OrdersStats";
import OrdersFilter from "./components/OrdersFilter";
import OrdersTable from "./components/OrdersTable";
import LoadingState from "./components/LoadingState";
import EmptyState from "./components/EmptyState";

import {
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";
import { FormEvent, useCallback, useEffect, useState } from "react";

/* =========================================================
   TYPES
========================================================= */

type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

type Customer = {
  fullName?: string;
  phone?: string;
  email?: string;
};

type ShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  postalCode?: string;
};

type OrderItem = {
  _id?: string;
  product?: string;
  name?: string;
  slug?: string;
  image?: string;
  quantity?: number;
  price?: number;
  lineTotal?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
};

type Order = {
  _id: string;
  orderNumber: string;
  customer?: Customer;
  shippingAddress?: ShippingAddress;
  items?: OrderItem[];
  totalAmount?: number;
  grandTotal?: number;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus | string;
  orderStatus?: OrderStatus | string;
  status?: OrderStatus | string;
  createdAt: string;
  updatedAt?: string;
};

type OrdersApiResponse = {
  success?: boolean;
  message?: string;
  orders?: Order[];
  page?: number;
  currentPage?: number;
  limit?: number;
  totalOrders?: number;
  totalPages?: number;
};

/* =========================================================
   FILTER OPTIONS
========================================================= */

const ORDER_STATUS_OPTIONS = [
  "All",
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUS_OPTIONS = [
  "All",
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function formatCurrency(amount?: number) {
  const safeAmount = Number(amount || 0);

  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(safeAmount)
    .replace("BDT", "৳");
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getCustomerName(order: Order) {
  return order.customer?.fullName?.trim() || "Guest Customer";
}

function getCustomerPhone(order: Order) {
  return order.customer?.phone?.trim() || "No phone";
}

function getOrderStatus(order: Order) {
  return order.orderStatus || order.status || "Pending";
}

function getOrderTotal(order: Order) {
  return Number(order.totalAmount ?? order.grandTotal ?? 0);
}

function getStatusClass(status?: string) {
  const normalizedStatus = status?.toLowerCase();

  switch (normalizedStatus) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "processing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "shipped":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "refunded":
      return "border-slate-200 bg-slate-100 text-slate-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [customerSearchInput, setCustomerSearchInput] =
    useState("");

  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [orderStatus, setOrderStatus] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

  const fetchOrders = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const queryParams = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (orderSearch.trim()) {
          queryParams.set("orderNumber", orderSearch.trim());
        }

        if (customerSearch.trim()) {
          queryParams.set("search", customerSearch.trim());
        }

        if (orderStatus !== "All") {
          queryParams.set("status", orderStatus);
        }

        if (paymentStatus !== "All") {
          queryParams.set("paymentStatus", paymentStatus);
        }

        const response = await tenantFetch(
          `/api/orders?${queryParams.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data: OrdersApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Orders load করা সম্ভব হয়নি।",
          );
        }

        const receivedOrders = Array.isArray(data.orders)
          ? data.orders
          : [];

        /*
          Backend search/filter support না থাকলেও current response-এর
          মধ্যে fallback filtering কাজ করবে।
        */

        const filteredOrders = receivedOrders.filter((order) => {
          const normalizedOrderSearch = orderSearch
            .trim()
            .toLowerCase();

          const normalizedCustomerSearch = customerSearch
            .trim()
            .toLowerCase();

          const currentOrderStatus = getOrderStatus(order);
          const currentPaymentStatus =
            order.paymentStatus || "Pending";

          const matchesOrderNumber =
            !normalizedOrderSearch ||
            order.orderNumber
              ?.toLowerCase()
              .includes(normalizedOrderSearch);

          const customerText = [
            getCustomerName(order),
            getCustomerPhone(order),
            order.customer?.email || "",
          ]
            .join(" ")
            .toLowerCase();

          const matchesCustomer =
            !normalizedCustomerSearch ||
            customerText.includes(normalizedCustomerSearch);

          const matchesOrderStatus =
            orderStatus === "All" ||
            currentOrderStatus.toLowerCase() ===
              orderStatus.toLowerCase();

          const matchesPaymentStatus =
            paymentStatus === "All" ||
            currentPaymentStatus.toLowerCase() ===
              paymentStatus.toLowerCase();

          return (
            matchesOrderNumber &&
            matchesCustomer &&
            matchesOrderStatus &&
            matchesPaymentStatus
          );
        });

        setOrders(filteredOrders);
        setTotalOrders(
          Number(data.totalOrders ?? receivedOrders.length),
        );
        setTotalPages(
          Math.max(Number(data.totalPages ?? 1), 1),
        );
      } catch (fetchError) {
        const errorMessage =
          fetchError instanceof Error
            ? fetchError.message
            : "Orders load করার সময় সমস্যা হয়েছে।";

        setError(errorMessage);
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      customerSearch,
      limit,
      orderSearch,
      orderStatus,
      page,
      paymentStatus,
    ],
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleTenantChanged =
      () => {
        setPage(1);
        void fetchOrders(true);
      };

    window.addEventListener(
      "tenant-changed",
      handleTenantChanged,
    );

    return () => {
      window.removeEventListener(
        "tenant-changed",
        handleTenantChanged,
      );
    };
  }, [fetchOrders]);

useEffect(() => {
  function refreshOrders() {
    void fetchOrders(true);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      refreshOrders();
    }
  }

  window.addEventListener("focus", refreshOrders);
  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );

  return () => {
    window.removeEventListener("focus", refreshOrders);
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
  };
}, [fetchOrders]);

  /* =======================================================
     SEARCH SUBMIT
  ======================================================= */

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setOrderSearch(orderSearchInput.trim());
    setCustomerSearch(customerSearchInput.trim());
  }

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  function resetFilters() {
    setOrderSearchInput("");
    setCustomerSearchInput("");

    setOrderSearch("");
    setCustomerSearch("");

    setOrderStatus("All");
    setPaymentStatus("All");
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(orderSearch) ||
    Boolean(customerSearch) ||
    orderStatus !== "All" ||
    paymentStatus !== "All";

  const startItem =
    totalOrders === 0 ? 0 : (page - 1) * limit + 1;

  const endItem = Math.min(page * limit, totalOrders);

  /* =======================================================
     LOADING STATE
  ======================================================= */

if (loading) {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        <LoadingState />
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#FF6900]">
              Admin Dashboard
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Orders Management
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Customer orders দেখুন, search করুন এবং order
              details manage করুন।
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-200 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCcw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <OrdersStats
        totalOrders={totalOrders}
        currentPage={page}
        totalPages={totalPages}
        showingOrders={orders.length}
        />

        {/* =================================================
            SEARCH AND FILTERS
        ================================================= */}

            <OrdersFilter
            orderSearchInput={orderSearchInput}
            customerSearchInput={customerSearchInput}
            orderSearch={orderSearch}
            customerSearch={customerSearch}
            orderStatus={orderStatus}
            paymentStatus={paymentStatus}
            onOrderSearchInputChange={setOrderSearchInput}
            onCustomerSearchInputChange={setCustomerSearchInput}
            onOrderStatusChange={(value) => {
                setPage(1);
                setOrderStatus(value);
            }}
            onPaymentStatusChange={(value) => {
                setPage(1);
                setPaymentStatus(value);
            }}
            onSearchSubmit={handleSearchSubmit}
            onResetFilters={resetFilters}
            />

        {/* =================================================
            ERROR STATE
        ================================================= */}

        {error && (
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-bold text-red-800">
                  Orders load করা যায়নি
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

{!error && orders.length === 0 && (
  <EmptyState
    hasActiveFilters={hasActiveFilters}
    onResetFilters={resetFilters}
  />
)}

        {/* =================================================
            DESKTOP / LAPTOP TABLE
        ================================================= */}
{!error && orders.length > 0 && (
  <OrdersTable
    orders={orders}
    page={page}
    limit={limit}
    totalOrders={totalOrders}
    totalPages={totalPages}
    onPageChange={setPage}
    onLimitChange={(newLimit) => {
      setLimit(newLimit);
      setPage(1);
    }}
  />
)}
      </div>
    </main>
  );
}