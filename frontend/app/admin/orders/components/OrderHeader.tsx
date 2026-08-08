import { CalendarDays } from "lucide-react";

import {
  formatCurrency,
  formatDate,
  getStatusClass,
} from "../utils/orderHelpers";

type OrderHeaderProps = {
  orderNumber: string;
  createdAt?: string;
  productCount: number;
  paymentMethod?: string;
  orderTotal: number;
  currentStatus: string;
  paymentStatus: string;
};

export default function OrderHeader({
  orderNumber,
  createdAt,
  productCount,
  paymentMethod,
  orderTotal,
  currentStatus,
  paymentStatus,
}: OrderHeaderProps) {
  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-5 py-6 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[#FF6900] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                Order Details
              </span>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                  currentStatus,
                )}`}
              >
                {currentStatus}
              </span>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                  paymentStatus,
                )}`}
              >
                Payment: {paymentStatus}
              </span>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Order Number
            </p>

            <h1 className="mt-1 break-all text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              #{orderNumber}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {formatDate(createdAt)}
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[620px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Placed On
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {formatDate(createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Products
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                {productCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Payment
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                {paymentMethod || "COD"}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-500">
                Grand Total
              </p>

              <p className="mt-1 text-lg font-black text-[#FF6900]">
                {formatCurrency(orderTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}