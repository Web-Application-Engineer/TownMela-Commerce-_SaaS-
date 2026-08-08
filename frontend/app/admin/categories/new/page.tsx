"use client";

import Link from "next/link";

import {
  ArrowLeft,
  FolderPlus,
} from "lucide-react";

import CategoryForm from "@/src/components/Admin/Categories/CategoryForm";

/* =========================================================
   ADD CATEGORY PAGE
========================================================= */

export default function AddCategoryPage() {
  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/admin/categories"
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              font-extrabold
              text-gray-500
              transition
              hover:text-[#FF6900]
            "
          >
            <ArrowLeft
              size={17}
              className="shrink-0"
            />

            Back to Categories
          </Link>

          <div className="mt-4 flex items-start gap-3 sm:items-center">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-orange-50
                text-[#FF6900]
                sm:h-12
                sm:w-12
              "
            >
              <FolderPlus size={24} />
            </div>

            <div className="min-w-0">
              <span
                className="
                  inline-flex
                  max-w-full
                  rounded-full
                  border
                  border-orange-200
                  bg-orange-50
                  px-3
                  py-1
                  text-[10px]
                  font-extrabold
                  uppercase
                  tracking-[0.12em]
                  text-[#FF6900]
                  sm:text-[11px]
                  sm:tracking-[0.14em]
                "
              >
                Category Management
              </span>

              <h1
                className="
                  mt-2
                  break-words
                  text-2xl
                  font-black
                  text-[#0B1F3A]
                  sm:text-3xl
                "
              >
                Add New Category
              </h1>
            </div>
          </div>

          <p
            className="
              mt-3
              max-w-2xl
              text-sm
              leading-6
              text-gray-500
              sm:text-[15px]
            "
          >
            Create a new product category
            for the TownMela storefront.
            The category name and slug will
            be used across product pages,
            navigation and filters.
          </p>
        </div>
      </div>

      {/* ===================================================
          CATEGORY FORM
      =================================================== */}

      <CategoryForm mode="create" />
    </div>
  );
}