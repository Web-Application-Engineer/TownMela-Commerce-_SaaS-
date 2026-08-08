"use client";

import {
  ChevronRight,
  GalleryHorizontalEnd,
  Home,
  LayoutDashboard,
} from "lucide-react";

/* =========================================================
   HOMEPAGE HEADER
========================================================= */

export default function HomepageHeader() {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-orange-50 via-white to-white p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* =================================================
              LEFT CONTENT
          ================================================= */}

          <div className="min-w-0">
            {/* BREADCRUMB */}

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <Home size={13} />

                Admin
              </span>

              <ChevronRight size={13} />

              <span className="inline-flex items-center gap-1.5">
                <LayoutDashboard size={13} />

                Dashboard
              </span>

              <ChevronRight size={13} />

              <span className="text-[#FF6900]">
                Homepage Management
              </span>
            </div>

            {/* TITLE AREA */}

            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF6900] text-white shadow-sm shadow-orange-200 sm:h-14 sm:w-14">
                <GalleryHorizontalEnd
                  size={24}
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6900]">
                  TownMela Admin
                </p>

                <h1 className="mt-1 text-2xl font-black leading-tight text-[#0B1F3A] sm:text-3xl lg:text-[34px]">
                  Homepage Management
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                  Manage homepage hero banners,
                  promotional banners, popular
                  categories and category showcase
                  sections from one place.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              CURRENT MODULE CARD
          ================================================= */}

          <div className="w-full shrink-0 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:w-auto sm:min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                <LayoutDashboard size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Current Module
                </p>

                <p className="mt-1 truncate text-sm font-black text-[#0B1F3A]">
                  Homepage Content
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5">
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Management Status
                </p>

                <p className="mt-0.5 text-xs font-black text-green-700">
                  Ready to Configure
                </p>
              </div>

              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          BOTTOM INFO BAR
      =================================================== */}

      <div className="flex flex-col gap-2 border-t border-gray-100 bg-white px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          Changes are currently stored in the
          frontend management state.
        </p>

        <span className="w-fit rounded-full bg-orange-50 px-3 py-1 font-bold text-[#FF6900]">
          Homepage Settings
        </span>
      </div>
    </section>
  );
}