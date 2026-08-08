"use client";

import Link from "next/link";

const modules = [
  {
    title: "Suppliers",
    description:
      "Manage supplier profiles, contacts, status, credit terms, and purchasing relationships.",
    href: "/admin/supplier-and-purchase/suppliers",
  },
  {
    title: "Purchase Orders",
    description:
      "Create, review, approve, and track purchase orders.",
    href: "/admin/supplier-and-purchase/purchase-orders",
  },
  {
    title: "Goods Received",
    description:
      "Record received products against approved purchase orders.",
    href: "/admin/supplier-and-purchase/goods-received",
  },
  {
    title: "Inventory Posting",
    description:
      "Post inspected received items into inventory stock.",
    href: "/admin/supplier-and-purchase/inventory-posting",
  },
  {
    title: "Vendor Invoices",
    description:
      "Manage supplier invoices, matching, outstanding balances, and invoice status.",
    href: "/admin/supplier-and-purchase/vendor-invoices",
  },
];

export default function SupplierAndPurchasePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-600">
            Purchasing Management
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Supplier &amp; Purchase
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage suppliers, purchase orders, goods receiving,
            inventory posting, and vendor invoices from one place.
          </p>
        </div>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-xl font-bold text-orange-600">
                {module.title.charAt(0)}
              </div>

              <h2 className="text-lg font-semibold text-slate-900 transition group-hover:text-orange-600">
                {module.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {module.description}
              </p>

              <div className="mt-5 text-sm font-semibold text-orange-600">
                Open module →
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}