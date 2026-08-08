"use client";

import { Search, X } from "lucide-react";
import type { FormEvent } from "react";

type OrdersFilterProps = {
  orderSearchInput: string;
  customerSearchInput: string;
  orderSearch: string;
  customerSearch: string;
  orderStatus: string;
  paymentStatus: string;
  onOrderSearchInputChange: (value: string) => void;
  onCustomerSearchInputChange: (value: string) => void;
  onOrderStatusChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
};

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

export default function OrdersFilter({
  orderSearchInput,
  customerSearchInput,
  orderSearch,
  customerSearch,
  orderStatus,
  paymentStatus,
  onOrderSearchInputChange,
  onCustomerSearchInputChange,
  onOrderStatusChange,
  onPaymentStatusChange,
  onSearchSubmit,
  onResetFilters,
}: OrdersFilterProps) {
  const hasActiveFilters =
    Boolean(orderSearch) ||
    Boolean(customerSearch) ||
    orderStatus !== "All" ||
    paymentStatus !== "All";

  return (
    <form
      onSubmit={onSearchSubmit}
      className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto]">
        {/* Order number search */}

        <div>
          <label
            htmlFor="order-search"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Order Number
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="order-search"
              type="search"
              value={orderSearchInput}
              onChange={(event) =>
                onOrderSearchInputChange(event.target.value)
              }
              placeholder="যেমন: TM-20260714-A913AA"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </div>

        {/* Customer search */}

        <div>
          <label
            htmlFor="customer-search"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Customer / Phone
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="customer-search"
              type="search"
              value={customerSearchInput}
              onChange={(event) =>
                onCustomerSearchInputChange(event.target.value)
              }
              placeholder="নাম, ফোন অথবা email"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </div>

        {/* Order status */}

        <div>
          <label
            htmlFor="order-status"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Order Status
          </label>

          <select
            id="order-status"
            value={orderStatus}
            onChange={(event) =>
              onOrderStatusChange(event.target.value)
            }
            className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
          >
            {ORDER_STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </div>

        {/* Payment status */}

        <div>
          <label
            htmlFor="payment-status"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            Payment Status
          </label>

          <select
            id="payment-status"
            value={paymentStatus}
            onChange={(event) =>
              onPaymentStatusChange(event.target.value)
            }
            className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
          >
            {PAYMENT_STATUS_OPTIONS.map((paymentOption) => (
              <option key={paymentOption} value={paymentOption}>
                {paymentOption}
              </option>
            ))}
          </select>
        </div>

        {/* Search button */}

        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:bg-[#e85f00] focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500">
            Active filters:
          </span>

          {orderSearch && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Order: {orderSearch}
            </span>
          )}

          {customerSearch && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Customer: {customerSearch}
            </span>
          )}

          {orderStatus !== "All" && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Status: {orderStatus}
            </span>
          )}

          {paymentStatus !== "All" && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Payment: {paymentStatus}
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        </div>
      )}
    </form>
  );
}