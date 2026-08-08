"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
} from "lucide-react";

import CustomerCard from "./components/CustomerCard";
import OrderedProducts from "./components/OrderedProducts";
import OrderHeader from "./components/OrderHeader";
import OrderSummaryCard from "./components/OrderSummaryCard";
import PaymentCard from "./components/PaymentCard";
import ShippingCard from "./components/ShippingCard";
import StatusTimeline from "../components/StatusTimeline";
import StatusUpdateCard, {
  type OrderStatus,
} from "./components/StatusUpdateCard";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Refunded";

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
  product?: string | { _id?: string };
  name?: string;
  slug?: string;
  image?: string;
  quantity?: number;
  price?: number;
  lineTotal?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
};

type StatusHistoryItem = {
  _id?: string;
  status?: string;
  note?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Order = {
  _id: string;
  orderNumber: string;
  guestId?: string;

  customer?: Customer;
  shippingAddress?: ShippingAddress;
  items?: OrderItem[];

  subtotal?: number;
  shippingCost?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  totalAmount?: number;
  grandTotal?: number;

  paymentMethod?: string;
  paymentStatus?: PaymentStatus | string;
  transactionId?: string;
  paidAt?: string;

  orderStatus?: OrderStatus | string;
  status?: OrderStatus | string;
  statusHistory?: StatusHistoryItem[];

  createdAt?: string;
  updatedAt?: string;
};

type SingleOrderApiResponse = {
  success?: boolean;
  message?: string;
  order?: Order;
};

type UpdateStatusApiResponse = {
  success?: boolean;
  message?: string;
  order?: Order;
};

/* =========================================================
   LOCAL HELPERS
========================================================= */

function getAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function getOrderStatus(order?: Order): OrderStatus {
  const status =
    order?.orderStatus ||
    order?.status ||
    "Pending";

  const allowedStatuses: OrderStatus[] = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  return allowedStatuses.includes(
    status as OrderStatus,
  )
    ? (status as OrderStatus)
    : "Pending";
}

function getPaymentStatus(order?: Order) {
  return order?.paymentStatus || "Pending";
}

function getOrderTotal(order?: Order) {
  return Number(
    order?.totalAmount ??
      order?.grandTotal ??
      0,
  );
}

function getShippingCost(order?: Order) {
  return Number(
    order?.shippingCost ??
      order?.deliveryCharge ??
      0,
  );
}

function getSubtotal(order?: Order) {
  if (typeof order?.subtotal === "number") {
    return order.subtotal;
  }

  return (order?.items || []).reduce(
    (total, item) => {
      const lineTotal =
        typeof item.lineTotal === "number"
          ? item.lineTotal
          : Number(item.price || 0) *
            Number(item.quantity || 0);

      return total + lineTotal;
    },
    0,
  );
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId =
    typeof params.orderId === "string"
      ? params.orderId
      : "";

  const [order, setOrder] =
    useState<Order | null>(null);

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus>("Pending");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  /* =======================================================
     FETCH SINGLE ORDER
  ======================================================= */

  const fetchOrder = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (!orderId) {
          throw new Error(
            "সঠিক order ID পাওয়া যায়নি।",
          );
        }

        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setSuccessMessage("");

        const token = getAdminToken();

        if (!token) {
          throw new Error(
            "Admin token পাওয়া যায়নি। অনুগ্রহ করে আবার admin login করুন।",
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/api/orders/${orderId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          },
        );

        const data: SingleOrderApiResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Order details load করা সম্ভব হয়নি।",
          );
        }

        if (!data.order) {
          throw new Error(
            "Order পাওয়া যায়নি।",
          );
        }

        setOrder(data.order);
        setSelectedStatus(
          getOrderStatus(data.order),
        );
      } catch (fetchError) {
        setOrder(null);

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Order load করার সময় সমস্যা হয়েছে।",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* =======================================================
     UPDATE ORDER STATUS
  ======================================================= */

  async function handleStatusUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!order) {
      return;
    }

    const previousStatus =
      getOrderStatus(order);

    if (selectedStatus === previousStatus) {
      setError(
        "বর্তমান status থেকে ভিন্ন একটি নতুন status নির্বাচন করুন।",
      );

      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");
      setSuccessMessage("");

      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin token পাওয়া যায়নি। অনুগ্রহ করে আবার admin login করুন।",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/orders/${order._id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        body: JSON.stringify({
        orderStatus: selectedStatus,
        }),
        },
      );

      const data: UpdateStatusApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Order status update করা সম্ভব হয়নি।",
        );
      }

      if (data.order) {
        const updatedStatus =
          getOrderStatus(data.order);

        setOrder(data.order);
        setSelectedStatus(updatedStatus);
      } else {
        const changedAt =
          new Date().toISOString();

        setOrder((previousOrder) => {
          if (!previousOrder) {
            return previousOrder;
          }

          return {
            ...previousOrder,
            orderStatus: selectedStatus,
            status: selectedStatus,
            updatedAt: changedAt,
            statusHistory: [
              ...(previousOrder.statusHistory ||
                []),
              {
                status: selectedStatus,
                changedAt,
              },
            ],
          };
        });

        setSelectedStatus(selectedStatus);
      }

      setSuccessMessage(
        `Order status সফলভাবে ${previousStatus} থেকে ${selectedStatus} করা হয়েছে।`,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Order status update করার সময় সমস্যা হয়েছে।",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-[#FF6900]" />

              <h2 className="mt-4 text-lg font-black text-slate-950">
                Order details load হচ্ছে
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR / NOT FOUND STATE
  ======================================================= */

  if (error && !order) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-[#FF6900]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-3xl border border-red-200 bg-white px-5 py-14 text-center shadow-sm sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-950">
              Order details পাওয়া যায়নি
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {error}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => fetchOrder()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:bg-[#e85f00]"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </button>

              <Link
                href="/admin/orders"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6900]"
              >
                <ArrowLeft className="h-4 w-4" />
                All Orders
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const currentStatus =
    getOrderStatus(order);

  const paymentStatus =
    getPaymentStatus(order);

  const subtotal =
    getSubtotal(order);

  const shippingCost =
    getShippingCost(order);

  const discountAmount = Number(
    order.discountAmount || 0,
  );

  const orderTotal =
    getOrderTotal(order);

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/orders"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-[#FF6900]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>

          <button
            type="button"
            onClick={() => fetchOrder(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-200 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCcw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh Details"}
          </button>
        </div>

        {/* =================================================
            ORDER HEADER
        ================================================= */}

        <OrderHeader
          orderNumber={order.orderNumber}
          createdAt={order.createdAt}
          productCount={
            order.items?.length || 0
          }
          paymentMethod={
            order.paymentMethod
          }
          orderTotal={orderTotal}
          currentStatus={currentStatus}
          paymentStatus={paymentStatus}
        />

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <p className="text-sm font-semibold leading-6 text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <p className="text-sm font-semibold leading-6 text-emerald-700">
              {successMessage}
            </p>
          </div>
        )}

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
          {/* ===============================================
              LEFT COLUMN
          =============================================== */}

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <CustomerCard
                customer={order.customer}
                guestId={order.guestId}
              />

              <ShippingCard
                shippingAddress={
                  order.shippingAddress
                }
              />
            </div>

            <OrderedProducts
              items={order.items}
            />

            <StatusTimeline
              history={order.statusHistory}
              currentStatus={currentStatus}
              createdAt={order.createdAt}
              updatedAt={order.updatedAt}
            />
          </div>

          {/* ===============================================
              RIGHT COLUMN
          =============================================== */}

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <StatusUpdateCard
              currentStatus={currentStatus}
              selectedStatus={selectedStatus}
              updatingStatus={updatingStatus}
              onStatusChange={(status) => {
                setSelectedStatus(status);
                setError("");
                setSuccessMessage("");
              }}
              onSubmit={handleStatusUpdate}
            />

            <PaymentCard
              paymentMethod={
                order.paymentMethod
              }
              paymentStatus={paymentStatus}
              transactionId={
                order.transactionId
              }
              paidAt={order.paidAt}
            />

            <OrderSummaryCard
              subtotal={subtotal}
              deliveryCharge={shippingCost}
              discountAmount={
                discountAmount
              }
              totalAmount={orderTotal}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}