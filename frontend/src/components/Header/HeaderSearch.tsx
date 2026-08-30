"use client";

import Image from "next/image";

import {
  useRouter,
} from "next/navigation";

import {
  ChevronRight,
  Search,
} from "lucide-react";

import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  API_BASE_URL,
  formatPrice,
  getProductHref,
} from "./headerHelpers";

import type {
  SearchProductsResponse,
  SearchSuggestionProduct,
} from "./headerTypes";

/* =========================================================
   LOCAL DEVELOPMENT TENANT FALLBACK

   Public storefront search must NOT use admin tenantFetch.

   On production storefronts, tenant should be resolved by
   the backend/domain infrastructure.

   On localhost, NEXT_PUBLIC_TENANT_ID can be used as the
   development tenant fallback.
========================================================= */

const FALLBACK_TENANT_ID =
  (
    process.env
      .NEXT_PUBLIC_TENANT_ID ??
    ""
  ).trim();

/* =========================================================
   HEADER SEARCH
========================================================= */

export default function HeaderSearch() {
  const router =
    useRouter();

  const containerRef =
    useRef<HTMLFormElement>(
      null,
    );

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    searchKeyword,
    setSearchKeyword,
  ] =
    useState("");

  const [
    searchSuggestions,
    setSearchSuggestions,
  ] =
    useState<
      SearchSuggestionProduct[]
    >([]);

  const [
    isSearchLoading,
    setIsSearchLoading,
  ] =
    useState(false);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] =
    useState(false);

  const [
    activeSuggestionIndex,
    setActiveSuggestionIndex,
  ] =
    useState(-1);

  const [
    mobileDropdownTop,
    setMobileDropdownTop,
  ] = useState(64);

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const normalizedSearchKeyword =
    searchKeyword.trim();

  const visibleSearchSuggestions =
    useMemo(
      () =>
        searchSuggestions.slice(
          0,
          6,
        ),
      [
        searchSuggestions,
      ],
    );

  /* =======================================================
     CLOSE SUGGESTIONS
  ======================================================= */

  const closeSearchSuggestions =
    useCallback(() => {
      setIsSearchOpen(
        false,
      );

      setActiveSuggestionIndex(
        -1,
      );
    }, []);

  /* =======================================================
     SUBMIT SEARCH
  ======================================================= */

  const handleSearchSubmit = (
    event?:
      FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();

    if (
      !normalizedSearchKeyword
    ) {
      closeSearchSuggestions();

      inputRef.current?.focus();

      return;
    }

    closeSearchSuggestions();

    router.push(
      `/search?q=${encodeURIComponent(
        normalizedSearchKeyword,
      )}`,
    );
  };

  /* =======================================================
     SELECT SUGGESTION
  ======================================================= */

  const handleSuggestionSelect = (
    product:
      SearchSuggestionProduct,
  ) => {
    closeSearchSuggestions();

    setSearchKeyword(
      product.name,
    );

    router.push(
      getProductHref(
        product,
      ),
    );
  };

  /* =======================================================
     KEYBOARD NAVIGATION
  ======================================================= */

  const handleSearchKeyDown = (
    event:
      KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();

      if (
        visibleSearchSuggestions
          .length === 0
      ) {
        return;
      }

      if (
        !isSearchOpen
      ) {
        setIsSearchOpen(
          true,
        );
      }

      setActiveSuggestionIndex(
        (
          currentIndex,
        ) =>
          Math.min(
            currentIndex + 1,
            visibleSearchSuggestions
              .length - 1,
          ),
      );

      return;
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();

      setActiveSuggestionIndex(
        (
          currentIndex,
        ) =>
          Math.max(
            currentIndex - 1,
            -1,
          ),
      );

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {
      closeSearchSuggestions();

      return;
    }

    if (
      event.key ===
        "Enter" &&
      activeSuggestionIndex >=
        0
    ) {
      const selectedProduct =
        visibleSearchSuggestions[
          activeSuggestionIndex
        ];

      if (
        selectedProduct
      ) {
        event.preventDefault();

        handleSuggestionSelect(
          selectedProduct,
        );
      }
    }
  };

  /* =======================================================
     LIVE SEARCH API

     IMPORTANT:

     This is a PUBLIC STOREFRONT request.

     Do not use:
     - admin token
     - selectedTenantId
     - tenantFetch()

     Local development can send NEXT_PUBLIC_TENANT_ID.
  ======================================================= */

  useEffect(() => {
    if (
      normalizedSearchKeyword
        .length < 2
    ) {
      setSearchSuggestions(
        [],
      );

      setIsSearchLoading(
        false,
      );

      setActiveSuggestionIndex(
        -1,
      );

      setIsSearchOpen(
        false,
      );

      return;
    }

    const abortController =
      new AbortController();

    const debounceTimer =
      window.setTimeout(
        async () => {
          try {
            setIsSearchLoading(
              true,
            );

            const headers:
              HeadersInit = {
              Accept:
                "application/json",
            };

            /*
             * Development fallback only.
             *
             * This lets localhost resolve the configured
             * development tenant without using admin storage.
             */
            if (
              FALLBACK_TENANT_ID
            ) {
              headers[
                "X-Tenant-Id"
              ] =
                FALLBACK_TENANT_ID;
            }

            const response =
              await fetch(
                `${API_BASE_URL}/api/products/search?keyword=${encodeURIComponent(
                  normalizedSearchKeyword,
                )}`,
                {
                  method:
                    "GET",

                  cache:
                    "no-store",

                  credentials:
                    "include",

                  signal:
                    abortController.signal,

                  headers,
                },
              );

            const data =
              (await response
                .json()
                .catch(
                  () => null,
                )) as
                | SearchProductsResponse
                | null;

            if (
              !response.ok
            ) {
              const message =
                data &&
                !Array.isArray(
                  data,
                )
                  ? data.message
                  : undefined;

              throw new Error(
                message ||
                  "Search suggestions could not be loaded.",
              );
            }

            const productList =
              Array.isArray(
                data,
              )
                ? data
                : data &&
                    Array.isArray(
                      data.products,
                    )
                  ? data.products
                  : [];

            setSearchSuggestions(
              productList,
            );

            setIsSearchOpen(
              true,
            );

            setActiveSuggestionIndex(
              -1,
            );
          } catch (
            error
          ) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "Header search suggestion error:",
              error,
            );

            setSearchSuggestions(
              [],
            );

            setIsSearchOpen(
              true,
            );

            setActiveSuggestionIndex(
              -1,
            );
          } finally {
            if (
              !abortController
                .signal
                .aborted
            ) {
              setIsSearchLoading(
                false,
              );
            }
          }
        },
        300,
      );

    return () => {
      window.clearTimeout(
        debounceTimer,
      );

      abortController.abort();
    };
  }, [
    normalizedSearchKeyword,
  ]);

  /* =======================================================
     MOBILE DROPDOWN POSITION
  ======================================================= */

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const updateMobileDropdownTop =
      () => {
        const container =
          containerRef.current;

        if (!container) {
          return;
        }

        const rect =
          container.getBoundingClientRect();

        setMobileDropdownTop(
          Math.max(
            0,
            Math.ceil(
              rect.bottom + 8,
            ),
          ),
        );
      };

    updateMobileDropdownTop();

    window.addEventListener(
      "resize",
      updateMobileDropdownTop,
    );

    window.addEventListener(
      "scroll",
      updateMobileDropdownTop,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateMobileDropdownTop,
      );

      window.removeEventListener(
        "scroll",
        updateMobileDropdownTop,
        true,
      );
    };
  }, [isSearchOpen]);

  /* =======================================================
     OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const handleOutsideClick = (
      event:
        MouseEvent,
    ) => {
      const clickedNode =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          clickedNode,
        )
      ) {
        closeSearchSuggestions();
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, [
    closeSearchSuggestions,
  ]);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <form
      ref={
        containerRef
      }
      onSubmit={
        handleSearchSubmit
      }
      role="search"
      className="
        relative
        flex
        min-w-0
        flex-1
        items-center
        rounded-full
        bg-white
        pl-4
        pr-1.5
      "
    >
      {/* =================================================
          SEARCH INPUT
      ================================================= */}

      <input
        ref={
          inputRef
        }
        type="search"
        value={
          searchKeyword
        }
        onChange={(
          event,
        ) => {
          const nextValue =
            event.target
              .value;

          setSearchKeyword(
            nextValue,
          );

          setActiveSuggestionIndex(
            -1,
          );

          if (
            nextValue
              .trim()
              .length >= 2
          ) {
            setIsSearchOpen(
              true,
            );
          } else {
            setIsSearchOpen(
              false,
            );
          }
        }}
        onFocus={() => {
          if (
            normalizedSearchKeyword
              .length >= 2
          ) {
            setIsSearchOpen(
              true,
            );
          }
        }}
        onKeyDown={
          handleSearchKeyDown
        }
        placeholder="Search products"
        aria-label="Search products"
        aria-expanded={
          isSearchOpen
        }
        aria-controls="townmela-search-suggestions"
        aria-autocomplete="list"
        autoComplete="off"
        className="
          w-full
          min-w-0
          bg-transparent
          py-2
          text-sm
          text-gray-800
          outline-none
          placeholder:text-gray-400
          sm:py-3
        "
      />

      {/* =================================================
          SEARCH BUTTON
      ================================================= */}

      <button
        type="submit"
        disabled={
          !normalizedSearchKeyword
        }
        aria-label="Submit product search"
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-full
          text-[#FF6900]
          transition
          hover:bg-orange-50
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        <Search
          size={20}
        />
      </button>

      {/* =================================================
          SEARCH SUGGESTIONS
      ================================================= */}

      {isSearchOpen &&
        normalizedSearchKeyword
          .length >= 2 && (
          <div
            id="townmela-search-suggestions"
            role="listbox"
            style={
              {
                "--mobile-search-dropdown-top":
                  `${mobileDropdownTop}px`,
              } as CSSProperties
            }
            className="
              fixed
              left-1/2
              top-[var(--mobile-search-dropdown-top)]
              z-[200]
              w-[calc(100vw-24px)]
              max-w-[520px]
              -translate-x-1/2
              overflow-hidden
              rounded-xl
              border
              border-gray-200
              bg-white
              text-[#0B1F3A]
              shadow-2xl
              md:absolute
              md:left-0
              md:right-0
              md:top-full
              md:mt-2
              md:w-auto
              md:max-w-none
              md:translate-x-0
              md:rounded-2xl
            "
          >
            {/* =============================================
                SUGGESTION HEADER
            ============================================= */}

            <div className="border-b border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-400">
                Product Suggestions
              </p>
            </div>

            {/* =============================================
                LOADING
            ============================================= */}

            {isSearchLoading ? (
              <div className="flex items-center gap-3 px-3 py-4 text-sm font-semibold text-gray-500 sm:px-4 sm:py-5">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-[#FF6900]" />

                Searching products...
              </div>
            ) : visibleSearchSuggestions
                .length > 0 ? (
              /* ===========================================
                  RESULTS
              =========================================== */

              <div className="max-h-[min(42dvh,360px)] overflow-y-auto overscroll-contain py-1 md:max-h-[360px]">
                {visibleSearchSuggestions.map(
                  (
                    product,
                    index,
                  ) => {
                    const isActive =
                      index ===
                      activeSuggestionIndex;

                    return (
                      <button
                        key={
                          product._id
                        }
                        type="button"
                        role="option"
                        aria-selected={
                          isActive
                        }
                        onMouseEnter={() =>
                          setActiveSuggestionIndex(
                            index,
                          )
                        }
                        onClick={() =>
                          handleSuggestionSelect(
                            product,
                          )
                        }
                        className={`
                          flex
                          w-full
                          items-center
                          gap-2.5
                          px-3
                          py-2.5
                          text-left
                          transition
                          sm:gap-3
                          sm:px-4
                          sm:py-3

                          ${
                            isActive
                              ? "bg-orange-50"
                              : "hover:bg-gray-50"
                          }
                        `}
                      >
                        {/* PRODUCT IMAGE */}

                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:h-12 sm:w-12 sm:rounded-xl">
                          {product.image ? (
                            <Image
                              src={
                                product.image
                              }
                              alt={
                                product.name
                              }
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* PRODUCT INFO */}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-extrabold leading-5 text-[#0B1F3A] sm:text-sm">
                            {
                              product.name
                            }
                          </p>

                          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 sm:mt-1">
                            <span className="whitespace-nowrap text-[13px] font-extrabold text-[#FF6900] sm:text-sm">
                              {formatPrice(
                                product.price,
                              )}
                            </span>

                            {product.oldPrice !==
                              undefined &&
                              Number(
                                product.oldPrice,
                              ) >
                                Number(
                                  product.price,
                                ) && (
                                <span className="whitespace-nowrap text-[11px] text-gray-400 line-through sm:text-xs">
                                  {formatPrice(
                                    product.oldPrice,
                                  )}
                                </span>
                              )}
                          </div>
                        </div>

                        <ChevronRight
                          size={17}
                          className="shrink-0 text-gray-400"
                        />
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              /* ===========================================
                  EMPTY RESULT
              =========================================== */

              <div className="px-3 py-4 text-sm font-semibold text-gray-500 sm:px-4 sm:py-5">
                No matching products
                found.
              </div>
            )}

            {/* =============================================
                VIEW ALL RESULTS
            ============================================= */}

            <button
              type="button"
              onClick={() =>
                handleSearchSubmit()
              }
              className="
                flex
                w-full
                items-center
                justify-between
                border-t
                border-gray-100
                bg-orange-50
                px-3
                py-2.5
                text-left
                sm:px-4
                sm:py-3
                text-sm
                font-extrabold
                text-[#FF6900]
                transition
                hover:bg-orange-100
              "
            >
              <span className="min-w-0 truncate">
                View all results for “
                {
                  normalizedSearchKeyword
                }
                ”
              </span>

              <ChevronRight
                size={17}
                className="ml-3 shrink-0"
              />
            </button>
          </div>
        )}
    </form>
  );
}