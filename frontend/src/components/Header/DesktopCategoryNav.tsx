"use client";

import Link from "next/link";

import {
  getCategorySlug,
  isPathActive,
} from "./headerHelpers";

import type {
  Category,
} from "./headerTypes";

/* =========================================================
   TYPES
========================================================= */

type DesktopCategoryNavProps = {
  categories: Category[];
  isLoading: boolean;
  pathname: string;
};

/* =========================================================
   DESKTOP CATEGORY NAVIGATION
========================================================= */

export default function DesktopCategoryNav({
  categories,
  isLoading,
  pathname,
}: DesktopCategoryNavProps) {
  return (
    <nav
      aria-label="Product categories"
      className="
        hidden
        w-full
        border-t
        border-white/5
        bg-black
        lg:block
      "
    >
      <div
        className="
          mx-auto
          flex
          min-h-12
          w-full
          max-w-[1485px]
          items-center
          justify-between
          gap-8
          overflow-x-auto
          px-3
          py-3
          sm:px-4
          lg:px-5
        "
      >
        {isLoading ? (
          <>
            {Array.from({
              length: 8,
            }).map(
              (_, index) => (
                <span
                  key={index}
                  className="
                    h-4
                    w-20
                    shrink-0
                    animate-pulse
                    rounded-full
                    bg-white/15
                  "
                />
              ),
            )}
          </>
        ) : (
          <>
            {categories.map(
              (category) => {
                const categorySlug =
                  getCategorySlug(
                    category,
                  );

                const categoryHref =
                  `/category/${categorySlug}`;

                const isActive =
                  isPathActive(
                    pathname,
                    categoryHref,
                  );

                return (
                  <Link
                    key={
                      category._id ||
                      categorySlug
                    }
                    href={
                      categoryHref
                    }
                    className={`
                      shrink-0
                      whitespace-nowrap
                      text-sm
                      font-medium
                      transition-colors
                      duration-200

                      ${
                        isActive
                          ? "text-[#FFDF00]"
                          : "text-white hover:text-[#FFDF00]"
                      }
                    `}
                  >
                    {category.name}
                  </Link>
                );
              },
            )}

            <Link
              href="/shop"
              className={`
                shrink-0
                whitespace-nowrap
                text-sm
                font-semibold
                transition-colors

                ${
                  isPathActive(
                    pathname,
                    "/shop",
                  )
                    ? "text-[#FFDF00]"
                    : "text-white hover:text-[#FFDF00]"
                }
              `}
            >
              Shop
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}