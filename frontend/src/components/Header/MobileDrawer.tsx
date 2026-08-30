"use client";

import Link from "next/link";
import { createPortal } from "react-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  ChevronRight,
  MapPin,
  PackageSearch,
  X,
  Zap,
} from "lucide-react";

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

type MobileDrawerProps = {
  isOpen: boolean;
  top: number;
  pathname: string;
  categories: Category[];
  isCategoriesLoading: boolean;
  onClose: () => void;
};

/* =========================================================
   CATEGORY HIERARCHY HELPER
========================================================= */

function getParentCategoryId(
  category: Category,
) {
  const parent = category.parent;

  if (!parent) {
    return "";
  }

  if (typeof parent === "string") {
    return parent.trim();
  }

  return parent._id?.trim() ?? "";
}

/* =========================================================
   MOBILE DRAWER
========================================================= */

export default function MobileDrawer({
  isOpen,
  top,
  pathname,
  categories,
  isCategoriesLoading,
  onClose,
}: MobileDrawerProps) {
  const [
    isMounted,
    setIsMounted,
  ] = useState(false);

  const [
    expandedCategoryId,
    setExpandedCategoryId,
  ] = useState("");

  /* =======================================================
     CLIENT MOUNT
  ======================================================= */

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* =======================================================
     BODY LOCK AND ESCAPE
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: globalThis.KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    isOpen,
    onClose,
  ]);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeSubcategory =
      categories.find(
        (category) => {
          const parentId =
            getParentCategoryId(
              category,
            );

          if (!parentId) {
            return false;
          }

          return isPathActive(
            pathname,
            `/category/${getCategorySlug(
              category,
            )}`,
          );
        },
      );

    if (activeSubcategory) {
      setExpandedCategoryId(
        getParentCategoryId(
          activeSubcategory,
        ),
      );
    }
  }, [
    categories,
    isOpen,
    pathname,
  ]);

  if (
    !isMounted ||
    !isOpen
  ) {
    return null;
  }

  return createPortal(
    <div
      className="
        fixed
        inset-x-0
        bottom-0
        z-[9999]
        lg:hidden
      "
      style={{
        top: `${top}px`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Product category menu"
    >
      {/* ===================================================
          OVERLAY
      =================================================== */}

      <button
        type="button"
        aria-label="Close category menu"
        onClick={onClose}
        className="
          absolute
          inset-0
          bg-black/60
          backdrop-blur-[2px]
        "
      />

      {/* ===================================================
          DRAWER
      =================================================== */}

      <aside
        className="
          absolute
          inset-y-0
          left-0
          flex
          w-[88%]
          max-w-[360px]
          flex-col
          overflow-hidden
          bg-white
          text-black
          shadow-2xl
        "
      >
        {/* =================================================
            DRAWER HEADER
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-200
            bg-white
            px-5
            py-4
          "
        >
          <h2
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-orange-200
              bg-gradient-to-r
              from-orange-50
              to-white
              px-4
              py-2
              text-sm
              font-extrabold
              tracking-wide
              text-[#0B1F3A]
              shadow-sm
            "
          >
            Product Categories
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-gray-100
              text-gray-600
              transition-colors
              hover:bg-orange-50
              hover:text-[#FF6900]
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            SCROLLABLE CONTENT
        ================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* ===============================================
              OFFERS AND ORDER TRACKING
          =============================================== */}

          <div className="border-b border-gray-200">
            <Link
              href="/offers"
              onClick={onClose}
              className={`
                flex
                w-full
                items-center
                justify-between
                px-6
                py-3.5
                text-[15px]
                font-semibold
                transition-colors

                ${
                  isPathActive(
                    pathname,
                    "/offers",
                  )
                    ? "bg-orange-50 text-[#FF6900]"
                    : "text-[#FF6900] hover:bg-orange-50"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <Zap
                  size={18}
                  strokeWidth={3}
                  className="
                    shrink-0
                    animate-pulse
                    fill-current
                  "
                />

                Offers
              </span>

              <ChevronRight
                size={17}
              />
            </Link>

            <Link
              href="/order-tracking"
              onClick={onClose}
              className={`
                flex
                w-full
                items-center
                justify-between
                px-6
                py-3.5
                text-[15px]
                font-semibold
                transition-colors

                ${
                  isPathActive(
                    pathname,
                    "/order-tracking",
                  )
                    ? "bg-orange-50 text-[#FF6900]"
                    : "text-[#0B1F3A] hover:bg-orange-50 hover:text-[#FF6900]"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <PackageSearch
                  size={18}
                  strokeWidth={2.5}
                  className="shrink-0"
                />

                Track Order
              </span>

              <ChevronRight
                size={17}
              />
            </Link>
          </div>

          {/* ===============================================
              CATEGORIES
          =============================================== */}

          <div className="py-2">
            {isCategoriesLoading ? (
              <div className="space-y-3 px-6 py-3">
                {Array.from({
                  length: 6,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="
                        h-5
                        animate-pulse
                        rounded-full
                        bg-gray-200
                      "
                    />
                  ),
                )}
              </div>
            ) : (
              mainCategories.map(
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

                  const hasSubcategories =
                    subcategories.length > 0;

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

                  const isExpanded =
                    expandedCategoryId ===
                    category._id;

                  if (
                    !hasSubcategories
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
                        onClick={
                          onClose
                        }
                        className={`
                          flex
                          w-full
                          items-center
                          justify-between
                          px-6
                          py-3.5
                          text-[15px]
                          font-semibold
                          transition-colors

                          ${
                            isActive
                              ? "bg-orange-50 text-[#FF6900]"
                              : "text-[#0B1F3A] hover:bg-orange-50 hover:text-[#FF6900]"
                          }
                        `}
                      >
                        <span>
                          {
                            category.name
                          }
                        </span>

                        <ChevronRight
                          size={17}
                        />
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={
                        category._id ||
                        categorySlug
                      }
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <div
                        className={`
                          flex
                          w-full
                          items-stretch
                          transition-colors

                          ${
                            isActive
                              ? "bg-orange-50 text-[#FF6900]"
                              : "text-[#0B1F3A] hover:bg-orange-50 hover:text-[#FF6900]"
                          }
                        `}
                      >
                        {/* =====================================
                            MOBILE ONLY (<768px)
                            Parent text = open parent category
                            Arrow = expand / collapse subcategory
                        ===================================== */}

                        <Link
                          href={
                            categoryHref
                          }
                          onClick={
                            onClose
                          }
                          className="
                            flex
                            min-w-0
                            flex-1
                            items-center
                            px-6
                            py-3.5
                            text-[15px]
                            font-semibold
                            md:hidden
                          "
                        >
                          <span className="truncate">
                            {
                              category.name
                            }
                          </span>
                        </Link>

                        <button
                          type="button"
                          aria-label={`${
                            isExpanded
                              ? "Hide"
                              : "Show"
                          } subcategories for ${
                            category.name
                          }`}
                          aria-expanded={
                            isExpanded
                          }
                          onClick={() => {
                            setExpandedCategoryId(
                              (
                                currentId,
                              ) =>
                                currentId ===
                                category._id
                                  ? ""
                                  : category._id,
                            );
                          }}
                          className="
                            flex
                            w-14
                            shrink-0
                            items-center
                            justify-center
                            border-l
                            border-gray-100
                            md:hidden
                          "
                        >
                          <ChevronRight
                            size={17}
                            className={`
                              shrink-0
                              transition-transform
                              duration-200
                              ${
                                isExpanded
                                  ? "rotate-90"
                                  : ""
                              }
                            `}
                          />
                        </button>

                        {/* =====================================
                            TABLET ONLY (>=768px and <1024px)
                            Keep the previous whole-row expand
                            behavior unchanged.
                        ===================================== */}

                        <button
                          type="button"
                          aria-expanded={
                            isExpanded
                          }
                          onClick={() => {
                            setExpandedCategoryId(
                              (
                                currentId,
                              ) =>
                                currentId ===
                                category._id
                                  ? ""
                                  : category._id,
                            );
                          }}
                          className="
                            hidden
                            w-full
                            items-center
                            justify-between
                            px-6
                            py-3.5
                            text-left
                            text-[15px]
                            font-semibold
                            md:flex
                            lg:hidden
                          "
                        >
                          <span>
                            {
                              category.name
                            }
                          </span>

                          <ChevronRight
                            size={17}
                            className={`
                              shrink-0
                              transition-transform
                              duration-200
                              ${
                                isExpanded
                                  ? "rotate-90"
                                  : ""
                              }
                            `}
                          />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="bg-gray-50/80 py-1">
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
                                  onClick={
                                    onClose
                                  }
                                  className={`
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    py-3
                                    pl-10
                                    pr-6
                                    text-sm
                                    font-semibold
                                    transition-colors

                                    ${
                                      isChildActive
                                        ? "bg-orange-50 text-[#FF6900]"
                                        : "text-gray-600 hover:bg-orange-50 hover:text-[#FF6900]"
                                    }
                                  `}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      aria-hidden="true"
                                      className="shrink-0 text-[#FF6900]"
                                    >
                                      ↳
                                    </span>

                                    <span className="truncate">
                                      {
                                        subcategory.name
                                      }
                                    </span>
                                  </span>

                                  <ChevronRight
                                    size={15}
                                    className="shrink-0"
                                  />
                                </Link>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              )
            )}
          </div>

          {/* ===============================================
              SHOW ALL PRODUCTS
          =============================================== */}

          <div className="border-t border-gray-200 px-6 py-4">
            <Link
              href="/shop"
              onClick={onClose}
              className="
                flex
                w-full
                items-center
                justify-between
                rounded-xl
                border
                border-[#FF6900]
                bg-orange-50
                px-4
                py-3
                text-sm
                font-bold
                text-[#FF6900]
                transition
                hover:bg-[#FF6900]
                hover:text-white
              "
            >
              Show All Products

              <ChevronRight
                size={18}
              />
            </Link>
          </div>

          {/* ===============================================
              STORE INFORMATION
          =============================================== */}

          <div
            className="
              mx-6
              rounded-xl
              bg-gray-50
              p-4
              text-xs
            "
          >
            <p className="text-gray-500">
              Find Us On
            </p>

            <p className="mt-1 font-semibold text-blue-500">
              TownMela Store Locator
            </p>
          </div>

          {/* ===============================================
              STORE LOCATOR
          =============================================== */}

          <div className="px-6 pb-6 pt-4">
            <button
              type="button"
              className="
                flex
                w-full
                items-center
                justify-between
                rounded-xl
                bg-[#FF6900]
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition-colors
                hover:bg-[#E85F00]
              "
            >
              <span className="flex items-center gap-2">
                <MapPin size={17} />

                Store Locator
              </span>

              <ChevronRight
                size={18}
              />
            </button>
          </div>
        </div>
      </aside>
    </div>,

    document.body,
  );
}