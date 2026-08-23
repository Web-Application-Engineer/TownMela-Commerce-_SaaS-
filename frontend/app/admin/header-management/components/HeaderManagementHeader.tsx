"use client";

import {
  Store,
} from "lucide-react";

/* =========================================================
   HEADER MANAGEMENT HEADER
========================================================= */

export default function HeaderManagementHeader() {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
          <Store size={14} />

          Storefront
        </span>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-[#0B1F3A] sm:text-3xl">
          Header Management
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Manage your store logo, announcement bar and contact information.
        </p>
      </div>
    </div>
  );
}