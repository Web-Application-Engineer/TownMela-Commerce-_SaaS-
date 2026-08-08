"use client";

import {
  Search,
  SearchX,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import ProductGrid from "@/src/components/Products/ProductGrid";

import type {
  Product,
  ProductsApiResponse,
} from "../../src/types/product";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   SEARCH PAGE
========================================================= */

export default function SearchPage() {
  const searchParams =
    useSearchParams();

  const keyword =
    searchParams.get("q")?.trim() ??
    "";

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     LOAD SEARCH RESULTS
  ======================================================= */

  useEffect(() => {
    let isComponentActive = true;

    const loadSearchResults =
      async () => {
        if (!keyword) {
          setProducts([]);
          setErrorMessage("");
          setIsLoading(false);

          return;
        }

        try {
          setIsLoading(true);
          setErrorMessage("");

          const response = await fetch(
            `${API_BASE_URL}/api/products/search?keyword=${encodeURIComponent(
              keyword,
            )}`,
            {
              method: "GET",
              cache: "no-store",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },
            },
          );

          const data:
            ProductsApiResponse =
            await response.json();

          if (!response.ok) {
            const apiMessage =
              Array.isArray(data)
                ? undefined
                : data.message;

            throw new Error(
              apiMessage ||
                `Search results could not be loaded. Status: ${response.status}`,
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

          if (isComponentActive) {
            setProducts(productList);
          }
        } catch (error) {
          console.error(
            "Search results loading error:",
            error,
          );

          if (isComponentActive) {
            setProducts([]);

            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Search results could not be loaded.",
            );
          }
        } finally {
          if (isComponentActive) {
            setIsLoading(false);
          }
        }
      };

    void loadSearchResults();

    return () => {
      isComponentActive = false;
    };
  }, [keyword]);

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-[#F7F8FA]">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-orange-100" />

                <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />

                <div className="h-8 w-20 animate-pulse rounded-full bg-gray-200" />
              </div>

              <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
            </div>

            <div className="mb-4 h-24 animate-pulse rounded-2xl border border-gray-200 bg-white" />

            <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({
                  length: 8,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3"
                    >
                      <div className="aspect-[4/4.2] rounded-[5px] bg-gray-200" />

                      <div className="mx-auto mt-3 h-5 w-3/4 rounded bg-gray-200" />

                      <div className="mx-auto mt-3 h-4 w-1/2 rounded bg-gray-200" />

                      <div className="mx-auto mt-4 h-4 w-1/2 rounded bg-gray-200" />

                      <div className="mt-5 h-11 rounded-full bg-gray-200" />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     ERROR UI
  ======================================================= */

  if (errorMessage) {
    return (
      <main className="min-h-screen w-full bg-[#F7F8FA]">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <p className="font-bold text-red-600">
                {errorMessage}
              </p>

              <p className="mt-2 text-sm text-red-500">
                Please make sure the
                TownMela backend server
                is running.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="min-h-screen w-full bg-[#F7F8FA]">
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          {/* Page Header */}

          <div className="mb-5 flex w-full flex-nowrap items-center justify-between gap-3 overflow-x-auto">
            <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-[#FF6900]">
                TownMela
              </span>

              <span className="text-sm font-semibold text-blue-500">
                /
              </span>

              <h1 className="rounded-full border border-orange-500 bg-[#4C5B6F] px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-white">
                Search
              </h1>
            </div>

            <div className="shrink-0 whitespace-nowrap rounded-full border border-orange-500 bg-[#4C5B6F] px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-white">
              <span className="tabular-nums">
                {products.length}
              </span>{" "}
              {products.length === 1
                ? "Product"
                : "Products"}
            </div>
          </div>

          {/* Search Summary */}

          <div className="mb-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                  <Search size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                    Search Results
                  </h2>

                  {keyword ? (
                    <p className="mt-1 text-sm text-gray-500">
                      Showing results for{" "}
                      <span className="font-extrabold text-[#FF6900]">
                        “{keyword}”
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">
                      Enter a product name
                      in the search box
                      above.
                    </p>
                  )}
                </div>
              </div>

              {keyword && (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                  {products.length} results
                </span>
              )}
            </div>
          </div>

          {/* Search Results */}

          {!keyword ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                <Search size={28} />
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#0B1F3A]">
                Search TownMela
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Use the search bar in the
                header to find products by
                name, description or slug.
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                <SearchX size={28} />
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#0B1F3A]">
                No Products Found
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                No products matched
                “{keyword}”. Try another
                product name or keyword.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
              <ProductGrid
                products={products}
                emptyMessage="No matching products were found."
                className="lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}