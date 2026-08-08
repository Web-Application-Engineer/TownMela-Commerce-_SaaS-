import Image from "next/image";
import { Package } from "lucide-react";

type OrderItem = {
  _id?: string;
  name?: string;
  slug?: string;
  image?: string;
  quantity?: number;
  price?: number;
  lineTotal?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
};

type OrderedProductsProps = {
  items?: OrderItem[];
};

function formatCurrency(amount?: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(Number(amount || 0))
    .replace("BDT", "৳");
}

function getLineTotal(item: OrderItem) {
  if (typeof item.lineTotal === "number") {
    return item.lineTotal;
  }

  return Number(item.price || 0) * Number(item.quantity || 0);
}

export default function OrderedProducts({
  items = [],
}: OrderedProductsProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ===============================================
          SECTION HEADER
      =============================================== */}

      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
            <Package className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-black text-slate-950">
              Ordered Products
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Product, variant, quantity and price details
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
          {items.length} Product{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ===============================================
          EMPTY STATE
      =============================================== */}

      {items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-7 w-7 text-slate-400" />
          </div>

          <h3 className="mt-4 font-black text-slate-900">
            কোনো product পাওয়া যায়নি
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            এই order-এ কোনো product item নেই।
          </p>
        </div>
      ) : (
        <>
          {/* =============================================
              DESKTOP / LAPTOP TABLE
          ============================================= */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[850px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Product
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Variant
                  </th>

                  <th className="px-5 py-4 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Quantity
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Unit Price
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr
                    key={item._id || `${item.name}-${index}`}
                    className="transition hover:bg-orange-50/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name || "Order product"}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-6 w-6 text-slate-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-black text-slate-950">
                            {item.name || "Unnamed Product"}
                          </h3>

                          {item.slug && (
                            <p className="mt-1 break-all text-xs font-medium text-slate-400">
                              {item.slug}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[220px] flex-wrap gap-2">
                        {item.selectedSize && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                            Size: {item.selectedSize}
                          </span>
                        )}

                        {item.selectedColor && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                            Color: {item.selectedColor}
                          </span>
                        )}

                        {!item.selectedSize &&
                          !item.selectedColor && (
                            <span className="text-xs font-semibold text-slate-400">
                              No variant
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-900">
                        {item.quantity || 0}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="font-black text-slate-800">
                        {formatCurrency(item.price)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="font-black text-[#FF6900]">
                        {formatCurrency(getLineTotal(item))}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* =============================================
              MOBILE / TABLET CARDS
          ============================================= */}

          <div className="divide-y divide-slate-100 lg:hidden">
            {items.map((item, index) => (
              <article
                key={item._id || `${item.name}-${index}`}
                className="p-4 sm:p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name || "Order product"}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-7 w-7 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-black leading-6 text-slate-950">
                      {item.name || "Unnamed Product"}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.selectedSize && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          Size: {item.selectedSize}
                        </span>
                      )}

                      {item.selectedColor && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          Color: {item.selectedColor}
                        </span>
                      )}

                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-[#FF6900]">
                        Qty: {item.quantity || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Unit Price
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-orange-400">
                      Subtotal
                    </p>

                    <p className="mt-1 font-black text-[#FF6900]">
                      {formatCurrency(getLineTotal(item))}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}