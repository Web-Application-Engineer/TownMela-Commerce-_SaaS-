"use client";

import {
  PanelBottom,
} from "lucide-react";

/* =========================================================
   FOOTER MANAGEMENT HEADER
========================================================= */

export default function FooterHeader() {
  return (
    <div className="mb-6 sm:mb-7">
      <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
        <PanelBottom size={14} />

        Storefront
      </span>

      <h1 className="mt-3 text-2xl font-black tracking-tight text-[#0B1F3A] sm:text-3xl">
        Footer Management
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
        Manage your store footer information,
        contact details, social links and useful links.
      </p>
    </div>
  );
}