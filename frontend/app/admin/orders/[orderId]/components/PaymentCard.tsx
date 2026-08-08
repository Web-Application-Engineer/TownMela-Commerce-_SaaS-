import { CreditCard } from "lucide-react";

import { getStatusClass } from "../../utils/orderHelpers";

/* =========================================================
   TYPES
========================================================= */

type PaymentCardProps = {
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  paidAt?: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function PaymentCard({
  paymentMethod = "COD",
  paymentStatus = "Pending",
  transactionId,
  paidAt,
}: PaymentCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          <CreditCard className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-black text-slate-950">
            Payment Information
          </h2>

          <p className="text-xs text-slate-500">
            Payment method and current status
          </p>
        </div>
      </div>

      {/* =================================================
          PAYMENT DETAILS
      ================================================= */}

      <div className="space-y-4">
        <PaymentRow
          label="Payment Method"
          value={paymentMethod}
        />

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-500">
            Payment Status
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
              paymentStatus,
            )}`}
          >
            {paymentStatus}
          </span>
        </div>

        {transactionId && (
          <PaymentRow
            label="Transaction ID"
            value={transactionId}
          />
        )}

        {paidAt && (
          <PaymentRow
            label="Paid At"
            value={paidAt}
          />
        )}
      </div>

      {/* =================================================
          COD INFORMATION
      ================================================= */}

      {paymentMethod.toUpperCase() === "COD" && (
        <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-orange-500">
            Cash On Delivery
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Customer delivery গ্রহণের সময় payment সম্পন্ন করবেন।
          </p>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   PAYMENT ROW
========================================================= */

function PaymentRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>

      <span className="break-all text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}