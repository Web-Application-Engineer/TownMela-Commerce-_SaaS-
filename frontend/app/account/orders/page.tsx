"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const FALLBACK_TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

type OrderItem = {
  _id?: string;
  name?: string;
  quantity?: number;
};

type Order = {
  _id: string;
  orderNumber?: string;
  totalAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt?: string;
  items?: OrderItem[];
};

type OrdersApiResponse = {
  success?: boolean;
  message?: string;
  page?: number;
  limit?: number;
  totalOrders?: number;
  totalPages?: number;
  orders?: Order[];
};

function getGuestId() {
  return (
    localStorage.getItem("guestId") ??
    localStorage.getItem("guest_id") ??
    localStorage.getItem("townmela_guest_id") ??
    ""
  ).trim();
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getStatusClass(status?: string) {
  const normalizedStatus =
    String(status || "Pending").toLowerCase();

  if (
    normalizedStatus === "delivered" ||
    normalizedStatus === "paid"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "failed"
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    normalizedStatus === "processing" ||
    normalizedStatus === "shipped"
  ) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasGuestId, setHasGuestId] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const guestId = getGuestId();

        const tenantId =
          localStorage.getItem("tenantId") ??
          FALLBACK_TENANT_ID;

        if (!guestId) {
          setHasGuestId(false);
          return;
        }

        if (!tenantId) {
          throw new Error(
            "Tenant configuration is missing.",
          );
        }

        const query = new URLSearchParams({
          guestId,
          page: "1",
          limit: "100",
        });

        const response = await fetch(
          `${API_BASE_URL}/api/orders/my-orders?${query.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "X-Tenant-Id": tenantId,
            },
            credentials: "include",
            cache: "no-store",
          },
        );

        const data: OrdersApiResponse =
          await response.json().catch(() => ({
            success: false,
            message:
              "An unexpected server response was received.",
          }));

        if (!response.ok) {
          throw new Error(
            data.message ??
              "Unable to load your orders.",
          );
        }

        setOrders(
          Array.isArray(data.orders)
            ? data.orders
            : [],
        );
      } catch (error) {
        console.error(
          "My orders loading error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your orders.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#FF6900]">
              Customer Orders
            </p>

            <h1 className="mt-2 text-3xl font-black text-[#172033] sm:text-4xl">
              My Orders
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
              Orders placed from this browser will appear here.
            </p>
          </div>

          <Link
            href="/account"
            className="inline-flex w-fit items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:border-[#FF6900]/40 hover:text-[#FF6900]"
          >
            Back to account
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          !hasGuestId && (
            <div className="rounded-3xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-2xl font-black text-[#172033]">
                No order history found
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-500">
                No Guest ID was found in this browser. You can still find an
                order using the existing Track Order page.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/order-tracking"
                  className="inline-flex rounded-2xl bg-[#172033] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#FF6900]"
                >
                  Track order
                </Link>

                <Link
                  href="/shop"
                  className="inline-flex rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-[#172033] transition hover:border-[#FF6900]/40 hover:text-[#FF6900]"
                >
                  Start shopping
                </Link>
              </div>
            </div>
          )}

        {!isLoading &&
          !errorMessage &&
          hasGuestId &&
          orders.length === 0 && (
            <div className="rounded-3xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
              <h2 className="text-2xl font-black text-[#172033]">
                No orders yet
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500">
                Orders placed from this browser will appear here.
              </p>

              <Link
                href="/shop"
                className="mt-6 inline-flex rounded-2xl bg-[#FF6900] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#e55f00]"
              >
                Start shopping
              </Link>
            </div>
          )}

        {!isLoading &&
          !errorMessage &&
          orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order._id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr_0.9fr_auto] lg:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                        Order
                      </p>

                      <h2 className="mt-1 text-lg font-black text-[#172033]">
                        {order.orderNumber ??
                          `#${order._id.slice(-8).toUpperCase()}`}
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                        {order.items?.length
                          ? ` • ${order.items.length} item${order.items.length > 1 ? "s" : ""}`
                          : ""}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
                        Total
                      </p>

                      <p className="mt-1 font-black text-[#172033]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                          order.orderStatus,
                        )}`}
                      >
                        {order.orderStatus ?? "Pending"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                          order.paymentStatus,
                        )}`}
                      >
                        {order.paymentStatus ?? "Pending"}
                      </span>
                    </div>

                    <Link
                      href={`/order-tracking?orderNumber=${encodeURIComponent(
                        order.orderNumber ?? "",
                      )}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#172033] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#FF6900]"
                    >
                      Track order
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}