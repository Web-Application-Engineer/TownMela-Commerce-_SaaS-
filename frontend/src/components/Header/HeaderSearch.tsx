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
   HEADER SEARCH
========================================================= */

export default function HeaderSearch() {
  const router = useRouter();

  const containerRef =
    useRef<HTMLFormElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    searchSuggestions,
    setSearchSuggestions,
  ] = useState<
    SearchSuggestionProduct[]
  >([]);

  const [
    isSearchLoading,
    setIsSearchLoading,
  ] = useState(false);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    activeSuggestionIndex,
    setActiveSuggestionIndex,
  ] = useState(-1);

  const normalizedSearchKeyword =
    searchKeyword.trim();

  const visibleSearchSuggestions =
    useMemo(
      () =>
        searchSuggestions.slice(
          0,
          6,
        ),
      [searchSuggestions],
    );

  /* =======================================================
     CLOSE SUGGESTIONS
  ======================================================= */

  const closeSearchSuggestions =
    useCallback(() => {
      setIsSearchOpen(false);
      setActiveSuggestionIndex(-1);
    }, []);

  /* =======================================================
     SUBMIT SEARCH
  ======================================================= */

  const handleSearchSubmit = (
    event?:
      FormEvent<HTMLFormElement>,
  ) => {
    event?.preventDefault();

    if (!normalizedSearchKeyword) {
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
      getProductHref(product),
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
      event.key === "ArrowDown"
    ) {
      event.preventDefault();

      if (
        !isSearchOpen &&
        visibleSearchSuggestions
          .length > 0
      ) {
        setIsSearchOpen(true);
      }

      setActiveSuggestionIndex(
        (currentIndex) =>
          Math.min(
            currentIndex + 1,
            visibleSearchSuggestions
              .length - 1,
          ),
      );

      return;
    }

    if (
      event.key === "ArrowUp"
    ) {
      event.preventDefault();

      setActiveSuggestionIndex(
        (currentIndex) =>
          Math.max(
            currentIndex - 1,
            -1,
          ),
      );

      return;
    }

    if (
      event.key === "Escape"
    ) {
      closeSearchSuggestions();

      return;
    }

    if (
      event.key === "Enter" &&
      activeSuggestionIndex >= 0 &&
      visibleSearchSuggestions[
        activeSuggestionIndex
      ]
    ) {
      event.preventDefault();

      handleSuggestionSelect(
        visibleSearchSuggestions[
          activeSuggestionIndex
        ],
      );
    }
  };

  /* =======================================================
     LIVE SEARCH API
  ======================================================= */

  useEffect(() => {
    if (
      normalizedSearchKeyword.length <
      2
    ) {
      setSearchSuggestions([]);
      setIsSearchLoading(false);
      setActiveSuggestionIndex(-1);

      return;
    }

    const abortController =
      new AbortController();

    const debounceTimer =
      window.setTimeout(
        async () => {
          try {
            setIsSearchLoading(true);

            const response =
              await fetch(
                `${API_BASE_URL}/api/products/search?keyword=${encodeURIComponent(
                  normalizedSearchKeyword,
                )}`,
                {
                  method: "GET",
                  cache: "no-store",

                  signal:
                    abortController.signal,

                  headers: {
                    Accept:
                      "application/json",

                    "Content-Type":
                      "application/json",
                  },
                },
              );

            const data:
              SearchProductsResponse =
              await response.json();

            if (!response.ok) {
              const message =
                Array.isArray(data)
                  ? undefined
                  : data.message;

              throw new Error(
                message ||
                  "Search suggestions could not be loaded.",
              );
            }

            const productList =
              Array.isArray(data)
                ? data
                : Array.isArray(
                      data.products,
                    )
                  ? data.products
                  : [];

            setSearchSuggestions(
              productList,
            );

            setIsSearchOpen(true);

            setActiveSuggestionIndex(
              -1,
            );
          } catch (error) {
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

            setIsSearchOpen(true);

            setActiveSuggestionIndex(
              -1,
            );
          } finally {
            if (
              !abortController.signal
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
     OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent,
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

  return (
    <form
      ref={containerRef}
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
      <input
        ref={inputRef}
        type="search"
        value={searchKeyword}
        onChange={(event) => {
          const nextValue =
            event.target.value;

          setSearchKeyword(
            nextValue,
          );

          if (
            nextValue.trim().length >=
            2
          ) {
            setIsSearchOpen(true);
          }
        }}
        onFocus={() => {
          if (
            normalizedSearchKeyword.length >=
            2
          ) {
            setIsSearchOpen(true);
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
        <Search size={20} />
      </button>

      {isSearchOpen &&
        normalizedSearchKeyword.length >=
          2 && (
          <div
            id="townmela-search-suggestions"
            role="listbox"
            className="
              absolute
              left-0
              right-0
              top-full
              z-[200]
              mt-2
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
              bg-white
              text-[#0B1F3A]
              shadow-2xl
            "
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-400">
                Product Suggestions
              </p>
            </div>

            {isSearchLoading ? (
              <div className="flex items-center gap-3 px-4 py-5 text-sm font-semibold text-gray-500">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-[#FF6900]" />

                Searching
                products...
              </div>
            ) : visibleSearchSuggestions
                .length > 0 ? (
              <div className="max-h-[360px] overflow-y-auto py-1">
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
                          gap-3
                          px-4
                          py-3
                          text-left
                          transition

                          ${
                            isActive
                              ? "bg-orange-50"
                              : "hover:bg-gray-50"
                          }
                        `}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
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

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-[#0B1F3A]">
                            {
                              product.name
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-[#FF6900]">
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
                                <span className="text-xs text-gray-400 line-through">
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
              <div className="px-4 py-5 text-sm font-semibold text-gray-500">
                No matching products
                found.
              </div>
            )}

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
                px-4
                py-3
                text-sm
                font-extrabold
                text-[#FF6900]
                transition
                hover:bg-orange-100
              "
            >
              <span>
                View all results for
                “
                {
                  normalizedSearchKeyword
                }
                ”
              </span>

              <ChevronRight
                size={17}
              />
            </button>
          </div>
        )}
    </form>
  );
}