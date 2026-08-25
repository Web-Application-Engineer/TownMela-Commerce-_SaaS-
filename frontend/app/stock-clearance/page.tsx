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
      <main className="min-h-screen bg-[#F7F8FA] px-3 py-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-5 h-96 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-3 py-8">
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
      <section className="px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            {campaign?.campaignBanner ? (
              <div className="relative aspect-[16/5] w-full bg-gray-100">
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
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="px-4 py-7 text-center sm:px-6 sm:py-8">
              <div className="mx-auto w-full max-w-[620px] rounded-[28px] border border-orange-100 bg-white px-4 py-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:px-7 sm:py-6">
                <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[#FF6900] sm:text-xs">
                  LIMITED TIME OFFER
                </div>

                <h1 className="mt-3 text-2xl font-black uppercase tracking-[0.04em] text-[#0B1F3A] sm:text-3xl">
                  {campaign?.name ||
                    "STOCK CLEARANCE DISCOUNT"}
                </h1>

                {campaign?.timerEnabled &&
                campaign.countdownTarget &&
                (isScheduled ||
                  isLive) ? (
                  <div className="mt-5">
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
                  <p className="mt-4 text-sm font-semibold text-gray-500">
                    No Stock Clearance campaign is active right now.
                  </p>
                ) : null}

                {isScheduled ? (
                  <p className="mt-4 text-sm font-semibold text-gray-500">
                    Campaign products will appear automatically when the offer starts.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {isLive ? (
            <div className="mt-5 rounded-2xl bg-gray-200 p-3 sm:p-4">
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
