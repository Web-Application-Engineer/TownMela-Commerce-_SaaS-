"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Customer = {
  fullName?: string;
  phone?: string;
  email?: string;
};

type OrderItem = {
  _id?: string;
  quantity?: number;
};

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customer?: Customer;
  items?: OrderItem[];
  totalAmount?: number;
  grandTotal?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  status?: string;
  createdAt: string;
};

type OrdersTableProps = {
  orders: AdminOrder[];
  page: number;
  limit: number;
  totalOrders: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

/* =========================================================
   HELPERS
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

function getCustomerName(order: AdminOrder) {
  return order.customer?.fullName?.trim() || "Guest Customer";
}

function getCustomerPhone(order: AdminOrder) {
  return order.customer?.phone?.trim() || "No phone";
}

function getOrderStatus(order: AdminOrder) {
  return order.orderStatus || order.status || "Pending";
}

function getOrderTotal(order: AdminOrder) {
  return Number(order.totalAmount ?? order.grandTotal ?? 0);
}

function getStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
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
   COMPONENT
========================================================= */

export default function OrdersTable({
  orders,
  page,
  limit,
  totalOrders,
  totalPages,
  onPageChange,
  onLimitChange,
}: OrdersTableProps) {
  const startItem =
    totalOrders === 0 ? 0 : (page - 1) * limit + 1;

  const endItem = Math.min(page * limit, totalOrders);

  return (
    <>
      {/* =================================================
          DESKTOP / LAPTOP TABLE
      ================================================= */}

      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Order
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Customer
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Order Status
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Payment
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Total
                </th>

                <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  Created
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const currentOrderStatus =
                  getOrderStatus(order);

                const currentPaymentStatus =
                  order.paymentStatus || "Pending";

                return (
                  <tr
                    key={order._id}
                    className="transition hover:bg-orange-50/30"
                  >
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">
                        {order.orderNumber}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {order.items?.length || 0} item
                        {order.items?.length === 1 ? "" : "s"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">
                        {getCustomerName(order)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {getCustomerPhone(order)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                          currentOrderStatus,
                        )}`}
                      >
                        {currentOrderStatus}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                            currentPaymentStatus,
                          )}`}
                        >
                          {currentPaymentStatus}
                        </span>

                        <p className="text-xs font-semibold text-slate-500">
                          {order.paymentMethod || "COD"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">
                        {formatCurrency(
                          getOrderTotal(order),
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {formatDate(order.createdAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-[#FF6900] transition hover:border-[#FF6900] hover:bg-[#FF6900] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          MOBILE / TABLET CARDS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {orders.map((order) => {
          const currentOrderStatus =
            getOrderStatus(order);

          const currentPaymentStatus =
            order.paymentStatus || "Pending";

          return (
            <article
              key={order._id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Order Number
                  </p>

                  <h2 className="mt-1 break-all text-base font-black text-slate-950">
                    {order.orderNumber}
                  </h2>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                    currentOrderStatus,
                  )}`}
                >
                  {currentOrderStatus}
                </span>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Customer
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {getCustomerName(order)}
                  </p>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {getCustomerPhone(order)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Total Amount
                    </p>

                    <p className="mt-1 font-black text-slate-950">
                      {formatCurrency(
                        getOrderTotal(order),
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Items
                    </p>

                    <p className="mt-1 font-black text-slate-950">
                      {order.items?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Payment
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                          currentPaymentStatus,
                        )}`}
                      >
                        {currentPaymentStatus}
                      </span>

                      <span className="text-xs font-bold text-slate-500">
                        {order.paymentMethod || "COD"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/orders/${order._id}`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-4 text-sm font-bold text-white transition hover:bg-[#e85f00]"
                >
                  <Eye className="h-4 w-4" />
                  View Order Details
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {/* =================================================
          PAGINATION
      ================================================= */}

      <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-900">
              {startItem}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {endItem}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-900">
              {totalOrders}
            </span>{" "}
            orders
          </p>

          <select
            value={limit}
            onChange={(event) =>
              onLimitChange(Number(event.target.value))
            }
            aria-label="Orders per page"
            className="min-h-10 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#FF6900] focus:ring-4 focus:ring-orange-100"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() =>
              onPageChange(Math.max(page - 1, 1))
            }
            disabled={page <= 1}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-black text-white">
            {page}
          </span>

          <button
            type="button"
            onClick={() =>
              onPageChange(
                Math.min(page + 1, totalPages),
              )
            }
            disabled={page >= totalPages}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}