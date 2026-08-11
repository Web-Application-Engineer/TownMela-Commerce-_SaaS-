"use client";

import {
  useEffect,
  useState,
} from "react";

import ProductGrid from "@/src/components/Products/ProductGrid";

import type {
  Product,
  ProductsApiResponse,
} from "../../src/types/product";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

/* =========================================================
   PUBLIC TENANT CONFIGURATION

   Localhost development:
   NEXT_PUBLIC_TENANT_ID will be sent as X-Tenant-Id.

   Live storefront:
   Backend/domain tenant resolution can be used.
========================================================= */

const TENANT_ID =
  (
    process.env.NEXT_PUBLIC_TENANT_ID ??
    ""
  ).trim();

/* =========================================================
   OFFERS PAGE
========================================================= */

export default function OffersPage() {
  const [
    products,
    setProducts,
  ] =
    useState<Product[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     LOAD DISCOUNTED PRODUCTS
  ======================================================= */

  useEffect(() => {
    const abortController =
      new AbortController();

    let isComponentActive =
      true;

    const loadDiscountedProducts =
      async () => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );

          /* ===============================================
             PUBLIC PRODUCT HEADERS
          =============================================== */

          const headers:
            HeadersInit = {
            Accept:
              "application/json",
          };

          /*
           * Localhost development fallback.
           *
           * Public storefront must not depend on admin
           * selectedTenantId or admin authentication.
           */
          if (TENANT_ID) {
            headers[
              "X-Tenant-Id"
            ] =
              TENANT_ID;
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/products`,
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
              | ProductsApiResponse
              | null;

          if (
            !response.ok
          ) {
            const apiMessage =
              data &&
              !Array.isArray(
                data,
              )
                ? data.message
                : undefined;

            throw new Error(
              apiMessage ||
                `Products could not be loaded. Status: ${response.status}`,
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

          /* ===============================================
             ONLY DISCOUNTED PRODUCTS
          =============================================== */

          const discountedProducts =
            productList.filter(
              (
                product,
              ) =>
                Number(
                  product.oldPrice,
                ) >
                Number(
                  product.price,
                ),
            );

          if (
            isComponentActive
          ) {
            setProducts(
              discountedProducts,
            );
          }
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
            "Offers products loading error:",
            error,
          );

          if (
            isComponentActive
          ) {
            setProducts(
              [],
            );

            setErrorMessage(
              error instanceof
                Error
                ? error.message
                : "Discounted products could not be loaded.",
            );
          }
        } finally {
          if (
            isComponentActive &&
            !abortController
              .signal
              .aborted
          ) {
            setIsLoading(
              false,
            );
          }
        }
      };

    void loadDiscountedProducts();

    return () => {
      isComponentActive =
        false;

      abortController.abort();
    };
  }, []);

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-[#F7F8FA]">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            {/* PAGE HEADER SKELETON */}

            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-orange-100" />

                <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />

                <div className="h-8 w-20 animate-pulse rounded-full bg-gray-200" />
              </div>

              <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
            </div>

            {/* INFORMATION SKELETON */}

            <div className="mb-4 h-24 animate-pulse rounded-2xl border border-gray-200 bg-white" />

            {/* PRODUCT GRID SKELETON */}

            <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({
                  length: 8,
                }).map(
                  (
                    _,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
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
                {
                  errorMessage
                }
              </p>

              <p className="mt-2 text-sm text-red-500">
                Offers could not be
                loaded right now.
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
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="mb-5 flex w-full flex-nowrap items-center justify-between gap-3 overflow-x-auto">
            <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-[#FF6900]">
                TownMela
              </span>

              <span className="text-sm font-semibold text-blue-500">
                /
              </span>

              <h1 className="rounded-full border border-orange-500 bg-[#4C5B6F] px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-white">
                Offers
              </h1>
            </div>

            <div className="shrink-0 whitespace-nowrap rounded-full border border-orange-500 bg-[#4C5B6F] px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-white">
              <span className="tabular-nums">
                {
                  products.length
                }
              </span>{" "}
              {products.length ===
              1
                ? "Offer"
                : "Offers"}
            </div>
          </div>

          {/* =================================================
              OFFERS INFORMATION
          ================================================= */}

          <div className="mb-4 rounded-2xl border border-orange-100 bg-white px-4 py-4 shadow-sm sm:px-5">
            <h2 className="text-lg font-extrabold text-[#0B1F3A]">
              Exclusive Offers
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Explore all TownMela
              products currently
              available at a discounted
              price.
            </p>
          </div>

          {/* =================================================
              PRODUCT GRID
          ================================================= */}

          <div className="rounded-2xl bg-gray-200 p-3 sm:p-4">
            <ProductGrid
              products={
                products
              }
              emptyMessage="No discounted products are available right now."
              className="lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
            />
          </div>
        </div>
      </section>
    </main>
  );
}