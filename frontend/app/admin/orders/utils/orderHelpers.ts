/* =========================================================
   ORDER HELPERS
========================================================= */

export function formatCurrency(amount?: number) {
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

export function formatDate(dateString?: string) {
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

export function getStatusClass(status?: string) {
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

export function getLineTotal(item: {
  quantity?: number;
  price?: number;
  lineTotal?: number;
}) {
  if (typeof item.lineTotal === "number") {
    return item.lineTotal;
  }

  return Number(item.price || 0) * Number(item.quantity || 0);
}