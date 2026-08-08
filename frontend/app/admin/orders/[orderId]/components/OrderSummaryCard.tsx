import { ReceiptText } from "lucide-react";

import { formatCurrency } from "../../utils/orderHelpers";

/* =========================================================
   TYPES
========================================================= */

type OrderSummaryCardProps = {
  subtotal: number;
  deliveryCharge: number;
  discountAmount?: number;
  couponCode?: string;
  totalAmount: number;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function OrderSummaryCard({
  subtotal,
  deliveryCharge,
  discountAmount = 0,
  couponCode,
  totalAmount,
}: OrderSummaryCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          <ReceiptText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">
            Order Summary
          </h2>

          <p className="text-xs text-slate-500">
            Complete order price breakdown
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SummaryRow
          label="Subtotal"
          value={formatCurrency(subtotal)}
        />

        <SummaryRow
          label="Delivery Charge"
          value={formatCurrency(deliveryCharge)}
        />

        {discountAmount > 0 && (
          <SummaryRow
            label="Discount"
            value={`- ${formatCurrency(discountAmount)}`}
            valueClassName="text-emerald-600"
          />
        )}

        {couponCode && (
          <SummaryRow
            label="Coupon Code"
            value={couponCode}
          />
        )}

        <div className="border-t border-dashed border-slate-200 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-black text-slate-950">
              Grand Total
            </span>

            <span className="text-xl font-black text-[#FF6900]">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-950 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          Amount Payable
        </p>

        <p className="mt-1 text-2xl font-black text-white">
          {formatCurrency(totalAmount)}
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span
        className={`break-all text-right text-sm font-black ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}