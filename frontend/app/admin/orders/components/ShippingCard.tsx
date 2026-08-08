import { MapPin } from "lucide-react";

type ShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  postalCode?: string;
};

type ShippingCardProps = {
  shippingAddress?: ShippingAddress;
};

function getFullAddress(address?: ShippingAddress) {
  if (!address) {
    return "Shipping address পাওয়া যায়নি";
  }

  const parts = [
    address.address,
    address.area,
    address.district,
    address.division,
    address.postalCode,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Shipping address পাওয়া যায়নি";
}

export default function ShippingCard({
  shippingAddress,
}: ShippingCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
          <MapPin className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-black text-slate-950">
            Shipping Address
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Complete order delivery destination
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-500">
          Street Address
        </p>

        <p className="mt-2 whitespace-pre-line break-words text-sm font-bold leading-7 text-slate-800">
          {shippingAddress?.address ||
            "Street address not provided"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SmallInfoBox
          label="Area / Police Station"
          value={shippingAddress?.area || "Not provided"}
        />

        <SmallInfoBox
          label="District"
          value={shippingAddress?.district || "Not provided"}
        />

        <SmallInfoBox
          label="Division"
          value={shippingAddress?.division || "Not provided"}
        />

        <SmallInfoBox
          label="Postal Code"
          value={shippingAddress?.postalCode || "Not provided"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
          Full Delivery Address
        </p>

        <p className="mt-2 break-words text-sm font-semibold leading-7 text-white">
          {getFullAddress(shippingAddress)}
        </p>
      </div>
    </section>
  );
}

function SmallInfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}