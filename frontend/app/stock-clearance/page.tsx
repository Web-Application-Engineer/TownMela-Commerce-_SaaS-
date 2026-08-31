"use client";

import Image from "next/image";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import ProductGrid from "@/src/components/Products/ProductGrid";

import StockClearancePageCountdown from "@/src/components/StockClearance/StockClearancePageCountdown";

import type {
  Product,
  ProductsApiResponse,
} from "../../src/types/product";

import {
  applyStockClearanceDiscount,
  getCampaignProductIds,
  getProductIdentity,
  type StockClearanceApiResponse,
  type StockClearanceCampaign,
} from "../../src/utils/stockClearance";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const TENANT_ID =
  (
    process.env.NEXT_PUBLIC_TENANT_ID ??
    ""
  ).trim();

/* =========================================================
   PAGE
========================================================= */

export default function StockClearancePage() {
  const [
    campaign,
    setCampaign,
  ] =
    useState<
      StockClearanceCampaign |
      null
    >(null);

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

  const loadCampaign =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        const headers:
          HeadersInit = {
          Accept:
            "application/json",
        };

        if (TENANT_ID) {
          headers[
            "X-Tenant-Id"
          ] =
            TENANT_ID;
        }

        const [
          campaignResponse,
          productsResponse,
        ] =
          await Promise.all([
            fetch(
              `${API_BASE_URL}/api/stock-clearance`,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                credentials:
                  "include",

                signal,

                headers,
              },
            ),

            fetch(
              `${API_BASE_URL}/api/products`,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                credentials:
                  "include",

                signal,

                headers,
              },
            ),
          ]);

        const campaignData =
          (await campaignResponse
            .json()
            .catch(
              () => null,
            )) as
            | StockClearanceApiResponse
            | null;

        const productsData =
          (await productsResponse
            .json()
            .catch(
              () => null,
            )) as
            | ProductsApiResponse
            | Product[]
            | null;

        if (
          !campaignResponse.ok ||
          !campaignData?.success
        ) {
          throw new Error(
            campaignData?.message ||
              "Stock clearance campaign could not be loaded.",
          );
        }

        if (
          !productsResponse.ok
        ) {
          const apiMessage =
            productsData &&
            !Array.isArray(
              productsData,
            )
              ? productsData.message
              : undefined;

          throw new Error(
            apiMessage ||
              "Products could not be loaded.",
          );
        }

        const productList =
          Array.isArray(
            productsData,
          )
            ? productsData
            : productsData &&
                Array.isArray(
                  productsData.products,
                )
              ? productsData.products
              : [];

        const activeCampaign =
          campaignData.campaign;

        const campaignProductIds =
          getCampaignProductIds(
            activeCampaign,
          );

        const campaignProducts =
          activeCampaign?.status ===
          "live"
            ? productList
                .filter(
                  (
                    product,
                  ) =>
                    campaignProductIds.has(
                      getProductIdentity(
                        product,
                      ),
                    ),
                )
                .map(
                  (
                    product,
                  ) =>
                    applyStockClearanceDiscount(
                      product,
                      activeCampaign,
                    ),
                )
            : [];

        setCampaign(
          activeCampaign,
        );

        setProducts(
          campaignProducts,
        );
      },
      [],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const run =
      async () => {
        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );

          await loadCampaign(
            controller.signal,
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

          setCampaign(
            null,
          );

          setProducts(
            [],
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Stock clearance campaign could not be loaded.",
          );
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsLoading(
              false,
            );
          }
        }
      };

    void run();

    return () => {
      controller.abort();
    };
  }, [
    loadCampaign,
  ]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-2 pt-4 pb-24 sm:px-4 sm:pt-6 md:pb-10 lg:px-5 lg:pt-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-5 h-96 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-2 pt-4 pb-24 sm:px-4 sm:pt-6 md:pb-10 lg:px-5 lg:pt-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <p className="font-bold text-red-600">
              {
                errorMessage
              }
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isScheduled =
    campaign?.status ===
    "scheduled";

  const isLive =
    campaign?.status ===
    "live";

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <section className="px-2 pt-4 pb-24 sm:px-4 sm:pt-6 md:pb-10 lg:px-5 lg:pt-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            {campaign?.campaignBanner ? (
              <div className="relative aspect-[16/7] w-full bg-gray-100 sm:aspect-[16/6] lg:aspect-[16/5]">
                <Image
                  src={
                    campaign.campaignBanner
                  }
                  alt={
                    campaign.name ||
                    "Stock Clearance Discount"
                  }
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1450px) 96vw, 1450px"
                  className="object-cover object-center"
                />
              </div>
            ) : null}

            <div className="px-2.5 py-4 text-center min-[390px]:px-3 sm:px-6 sm:py-7 lg:py-8">
              <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-2xl border border-orange-100 bg-white px-3 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] min-[390px]:px-4 min-[390px]:py-5 sm:rounded-[28px] sm:px-7 sm:py-6">
                <div className="inline-flex max-w-full items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#FF6900] min-[390px]:px-4 min-[390px]:text-[10px] min-[390px]:tracking-[0.2em] sm:text-xs sm:tracking-[0.24em]">
                  LIMITED TIME OFFER
                </div>

                <h1 className="mt-3 break-words text-lg font-black uppercase leading-tight tracking-[0.02em] text-[#0B1F3A] min-[390px]:text-xl sm:text-2xl sm:tracking-[0.04em] lg:text-3xl">
                  {campaign?.name ||
                    "STOCK CLEARANCE DISCOUNT"}
                </h1>

                {campaign?.timerEnabled &&
                campaign.countdownTarget &&
                (isScheduled ||
                  isLive) ? (
                  <div className="mt-4 w-full min-w-0 sm:mt-5">
                    <StockClearancePageCountdown
                      target={
                        campaign.countdownTarget
                      }
                      label={
                        isScheduled
                          ? "STARTS IN"
                          : "ENDS IN"
                      }
                      onComplete={() => {
                        window.location.reload();
                      }}
                    />
                  </div>
                ) : null}

                {!isScheduled &&
                !isLive ? (
                  <p className="mx-auto mt-4 max-w-[520px] text-xs font-semibold leading-5 text-gray-500 sm:text-sm sm:leading-6">
                    No Stock Clearance campaign is active right now.
                  </p>
                ) : null}

                {isScheduled ? (
                  <p className="mx-auto mt-4 max-w-[520px] text-xs font-semibold leading-5 text-gray-500 sm:text-sm sm:leading-6">
                    Campaign products will appear automatically when the offer starts.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {isLive ? (
            <div className="mt-4 rounded-xl bg-gray-200 p-2 min-[390px]:p-2.5 sm:mt-5 sm:rounded-2xl sm:p-4">
              <ProductGrid
                products={
                  products
                }
                emptyMessage="No products are assigned to this Stock Clearance campaign."
                className="lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
              />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
