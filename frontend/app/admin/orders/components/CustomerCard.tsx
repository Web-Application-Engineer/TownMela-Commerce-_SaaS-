import type { ComponentType } from "react";
import { Mail, Phone, User } from "lucide-react";

type Customer = {
  fullName?: string;
  phone?: string;
  email?: string;
};

type CustomerCardProps = {
  customer?: Customer;
  guestId?: string;
};

type IconComponent = ComponentType<{
  className?: string;
}>;

export default function CustomerCard({
  customer,
  guestId,
}: CustomerCardProps) {
  const customerName =
    customer?.fullName?.trim() || "Guest Customer";

  const customerInitial =
    customerName.charAt(0).toUpperCase() || "G";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
            <User className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-black text-slate-950">
              Customer Information
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Customer contact and identity details
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#FF6900]">
          Guest Order
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black uppercase text-white">
            {customerInitial}
          </div>

          <div className="min-w-0">
            <p className="break-words text-base font-black text-slate-950">
              {customerName}
            </p>

            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Order customer
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <InfoRow
          icon={Phone}
          label="Phone Number"
          value={customer?.phone || "Not provided"}
        />

        <InfoRow
          icon={Mail}
          label="Email Address"
          value={customer?.email || "Not provided"}
        />

        {guestId && (
          <InfoRow
            icon={User}
            label="Guest ID"
            value={guestId}
          />
        )}
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}