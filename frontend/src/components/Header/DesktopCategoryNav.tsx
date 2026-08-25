"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

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
   CATEGORY HIERARCHY HELPERS
========================================================= */

function getParentCategoryId(
  category: Category,
) {
  const parent =
    category.parent;

  if (!parent) {
    return "";
  }

  if (typeof parent === "string") {
    return parent.trim();
  }

  return parent._id?.trim() ?? "";
}

/* =========================================================
   DESKTOP CATEGORY NAVIGATION
========================================================= */

export default function DesktopCategoryNav({
  categories,
  isLoading,
  pathname,
}: DesktopCategoryNavProps) {
  const [
    openCategoryId,
    setOpenCategoryId,
  ] = useState("");

  useEffect(() => {
    setOpenCategoryId("");
  }, [pathname]);

  const mainCategories =
    categories.filter(
      (category) =>
        !getParentCategoryId(
          category,
        ),
    );

  const subcategoriesByParent =
    new Map<
      string,
      Category[]
    >();

  categories.forEach(
    (category) => {
      const parentId =
        getParentCategoryId(
          category,
        );

      if (!parentId) {
        return;
      }

      const currentChildren =
        subcategoriesByParent.get(
          parentId,
        ) ?? [];

      currentChildren.push(
        category,
      );

      subcategoriesByParent.set(
        parentId,
        currentChildren,
      );
    },
  );

  return (
    <nav
      aria-label="Product categories"
      className="
        relative
        z-40
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
          overflow-visible
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
            {mainCategories.map(
              (category) => {
                const categorySlug =
                  getCategorySlug(
                    category,
                  );

                const categoryHref =
                  `/category/${categorySlug}`;

                const subcategories =
                  subcategoriesByParent.get(
                    category._id,
                  ) ?? [];

                const isCategoryActive =
                  isPathActive(
                    pathname,
                    categoryHref,
                  );

                const isSubcategoryActive =
                  subcategories.some(
                    (subcategory) =>
                      isPathActive(
                        pathname,
                        `/category/${getCategorySlug(
                          subcategory,
                        )}`,
                      ),
                  );

                const isActive =
                  isCategoryActive ||
                  isSubcategoryActive;

                if (
                  subcategories.length ===
                  0
                ) {
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
                }

                return (
                  <div
                    key={
                      category._id ||
                      categorySlug
                    }
                    className="
                      relative
                      shrink-0
                    "
                    onMouseEnter={() =>
                      setOpenCategoryId(
                        category._id,
                      )
                    }
                    onMouseLeave={() =>
                      setOpenCategoryId(
                        "",
                      )
                    }
                    onFocusCapture={() =>
                      setOpenCategoryId(
                        category._id,
                      )
                    }
                    onBlurCapture={(
                      event,
                    ) => {
                      const nextTarget =
                        event.relatedTarget as
                          | Node
                          | null;

                      if (
                        !event.currentTarget.contains(
                          nextTarget,
                        )
                      ) {
                        setOpenCategoryId(
                          "",
                        );
                      }
                    }}
                  >
                    <Link
                      href={
                        categoryHref
                      }
                      onClick={() =>
                        setOpenCategoryId(
                          "",
                        )
                      }
                      className={`
                        inline-flex
                        items-center
                        gap-1.5
                        whitespace-nowrap
                        text-sm
                        font-medium
                        transition-colors
                        duration-200

                        ${
                          isActive ||
                          openCategoryId ===
                            category._id
                            ? "text-[#FFDF00]"
                            : "text-white hover:text-[#FFDF00]"
                        }
                      `}
                    >
                      <span>
                        {category.name}
                      </span>

                      <span
                        aria-hidden="true"
                        className={`
                          text-[10px]
                          transition-transform
                          duration-200
                          ${
                            openCategoryId ===
                            category._id
                              ? "rotate-180"
                              : ""
                          }
                        `}
                      >
                        ▼
                      </span>
                    </Link>

                    <div
                      className={`
                        absolute
                        left-0
                        top-full
                        z-[80]
                        min-w-[220px]
                        pt-3
                        transition-all
                        duration-200
                        ${
                          openCategoryId ===
                          category._id
                            ? "visible translate-y-0 opacity-100"
                            : "invisible translate-y-2 opacity-0"
                        }
                      `}
                    >
                      <div
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-white/10
                          bg-[#17181D]/90
                          py-2
                          shadow-2xl
                          backdrop-blur-md
                        "
                      >
                        {subcategories.map(
                          (
                            subcategory,
                          ) => {
                            const subcategorySlug =
                              getCategorySlug(
                                subcategory,
                              );

                            const subcategoryHref =
                              `/category/${subcategorySlug}`;

                            const isChildActive =
                              isPathActive(
                                pathname,
                                subcategoryHref,
                              );

                            return (
                              <Link
                                key={
                                  subcategory._id ||
                                  subcategorySlug
                                }
                                href={
                                  subcategoryHref
                                }
                                onClick={() =>
                                  setOpenCategoryId(
                                    "",
                                  )
                                }
                                className={`
                                  block
                                  whitespace-nowrap
                                  px-4
                                  py-2.5
                                  text-sm
                                  font-medium
                                  transition-colors
                                  duration-200

                                  ${
                                    isChildActive
                                      ? "bg-white/10 text-[#FFDF00]"
                                      : "text-white hover:bg-white/10 hover:text-[#FFDF00]"
                                  }
                                `}
                              >
                                {
                                  subcategory.name
                                }
                              </Link>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
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