"use client";

import Link from "next/link";

import {
  ArrowLeft,
  PackagePlus,
} from "lucide-react";

import ProductForm from "@/src/components/Admin/Products/ProductForm";

/* =========================================================
   ADD PRODUCT PAGE
========================================================= */

export default function AddProductPage() {
  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
          >
            <ArrowLeft size={17} />

            Back to Products
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
              <PackagePlus size={24} />
            </div>

            <div>
              <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
                Product Management
              </span>

              <h1 className="mt-2 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Add New Product
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Add product information, pricing,
            stock, category, images, features,
            sizes and colors.
          </p>
        </div>
      </div>

      {/* ===================================================
          PRODUCT FORM
      =================================================== */}

      <ProductForm mode="create" />
    </div>
  );
}