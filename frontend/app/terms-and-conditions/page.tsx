"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

import type {
  Product,
  ProductsApiResponse,
} from "@/src/types/product";

import {
  applyStockClearanceDiscount,
  getCampaignProductIds,
  getConfiguredCampaignProductIds,
  getProductIdentity,
  type StockClearanceApiResponse,
} from "@/src/utils/stockClearance";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

/* =========================================================
   TYPES
========================================================= */

type SimpleContentPage = {
  menuTitle: string;

  pageTitle: string;

  subtitle: string;

  banner: {
    image: string;
    altText: string;
  };

  content: string;

  seo: {
    metaTitle: string;
    metaDescription: string;
  };
};

type ContentPageResponse = {
  success?: boolean;
  message?: string;

  data?: {
    pageKey?: string;
    page?: Partial<SimpleContentPage>;
  };
};

/* =========================================================
   FALLBACK
========================================================= */

const fallbackTermsPage: SimpleContentPage = {
  menuTitle: "Terms & Conditions",

  pageTitle: "Terms & Conditions",

  subtitle:
    "These general terms describe the conditions that apply when using the store and placing an order.",

  banner: {
    image: "",
    altText: "Terms & Conditions",
  },

  content:
    "Store Use\nCustomers should use the website lawfully and provide accurate information when placing orders or contacting the store.\n\nProduct Information\nThe store aims to keep product descriptions, prices and availability accurate, but information may be updated or corrected when necessary.\n\nOrders\nAn order may require confirmation before it is treated as accepted. The store may contact the customer if additional information is needed.\n\nDelivery\nDelivery time may vary depending on location, courier operations, holidays or other circumstances outside the store's direct control.\n\nReturns & Refunds\nReturns and refunds are subject to the Return & Refund Policy and any product-specific conditions shown on the store.\n\nChanges\nThese terms may be updated when store operations, services or requirements change.",

  seo: {
    metaTitle: "",
    metaDescription: "",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function normalizePage(
  page?:
    | Partial<SimpleContentPage>
    | null,
): SimpleContentPage {
  return {
    ...fallbackTermsPage,
    ...(page ?? {}),

    banner: {
      ...fallbackTermsPage.banner,
      ...(page?.banner ?? {}),
    },

    seo: {
      ...fallbackTermsPage.seo,
      ...(page?.seo ?? {}),
    },
  };
}

function hasText(
  value: unknown,
) {
  return Boolean(
    String(value ?? "").trim(),
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function TermsAndConditionsPage() {
  const {
    tenantId,
    isLoading:
      isTenantLoading,
  } =
    useStorefrontTenant();

  const [
    cmsPage,
    setCmsPage,
  ] =
    useState<
      SimpleContentPage | null
    >(null);

  const [
    isPageLoading,
    setIsPageLoading,
  ] =
    useState(true);

  const [
    offerProducts,
    setOfferProducts,
  ] =
    useState<Product[]>([]);

  /* =======================================================
     LOAD CONTACT PAGE
  ======================================================= */

  useEffect(() => {
    if (isTenantLoading) {
      return;
    }

    if (!tenantId) {
      setCmsPage(null);
      setIsPageLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const loadPage =
      async () => {
        try {
          setIsPageLoading(true);

          const response =
            await fetch(
              `${API_BASE_URL}/api/tenants/footer-pages/public/terms-and-conditions`,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  "X-Tenant-Id":
                    tenantId,
                },

                cache:
                  "no-store",

                signal:
                  controller.signal,
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () => null,
              )) as
              | ContentPageResponse
              | null;

          if (
            !response.ok ||
            !payload?.success
          ) {
            throw new Error(
              payload?.message ||
                "Failed to load Terms & Conditions page.",
            );
          }

          setCmsPage(
            normalizePage(
              payload.data?.page,
            ),
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
            "Terms & Conditions page load error:",
            error,
          );

          setCmsPage(null);
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setIsPageLoading(
              false,
            );
          }
        }
      };

    void loadPage();

    return () => {
      controller.abort();
    };
  }, [
    isTenantLoading,
    tenantId,
  ]);

  /* =======================================================
     LOAD TENANT-SPECIFIC OFFER PRODUCTS
  ======================================================= */

  useEffect(() => {
    if (isTenantLoading) {
      return;
    }

    if (!tenantId) {
      setOfferProducts([]);
      return;
    }

    const abortController =
      new AbortController();

    let isComponentActive =
      true;

    const loadOfferProducts =
      async () => {
        try {
          const headers:
            HeadersInit = {
            Accept:
              "application/json",

            "X-Tenant-Id":
              tenantId,
          };

          const [
            productsResponse,
            campaignResponse,
          ] =
            await Promise.all([
              fetch(
                `${API_BASE_URL}/api/products`,
                {
                  method: "GET",
                  cache:
                    "no-store",
                  credentials:
                    "include",
                  signal:
                    abortController
                      .signal,
                  headers,
                },
              ),

              fetch(
                `${API_BASE_URL}/api/stock-clearance`,
                {
                  method: "GET",
                  cache:
                    "no-store",
                  credentials:
                    "include",
                  signal:
                    abortController
                      .signal,
                  headers,
                },
              ),
            ]);

          const productsData =
            (await productsResponse
              .json()
              .catch(
                () => null,
              )) as
              | ProductsApiResponse
              | Product[]
              | null;

          const campaignData =
            (await campaignResponse
              .json()
              .catch(
                () => null,
              )) as
              | StockClearanceApiResponse
              | null;

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
                `Products could not be loaded. Status: ${productsResponse.status}`,
            );
          }

          if (
            !campaignResponse.ok ||
            !campaignData?.success
          ) {
            throw new Error(
              campaignData?.message ||
                `Stock clearance campaign could not be loaded. Status: ${campaignResponse.status}`,
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

          const configuredCampaignProductIds =
            getConfiguredCampaignProductIds(
              activeCampaign,
            );

          const campaignProductIds =
            getCampaignProductIds(
              activeCampaign,
            );

          const normalOffers =
            productList.filter(
              (product) => {
                const productId =
                  getProductIdentity(
                    product,
                  );

                if (
                  productId &&
                  configuredCampaignProductIds.has(
                    productId,
                  )
                ) {
                  return false;
                }

                return (
                  Number(
                    product.oldPrice,
                  ) >
                  Number(
                    product.price,
                  )
                );
              },
            );

          const campaignOffers =
            activeCampaign?.status ===
            "live"
              ? productList
                  .filter(
                    (product) =>
                      campaignProductIds.has(
                        getProductIdentity(
                          product,
                        ),
                      ),
                  )
                  .map(
                    (product) =>
                      applyStockClearanceDiscount(
                        product,
                        activeCampaign,
                      ),
                  )
              : [];

          const merged =
            new Map<
              string,
              Product
            >();

          for (
            const product of
            normalOffers
          ) {
            const id =
              getProductIdentity(
                product,
              );

            if (id) {
              merged.set(
                id,
                product,
              );
            }
          }

          for (
            const product of
            campaignOffers
          ) {
            const id =
              getProductIdentity(
                product,
              );

            if (id) {
              merged.set(
                id,
                product,
              );
            }
          }

          if (isComponentActive) {
            setOfferProducts(
              Array.from(
                merged.values(),
              ),
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
            "Terms & Conditions offer products loading error:",
            error,
          );

          if (isComponentActive) {
            setOfferProducts([]);
          }
        }
      };

    void loadOfferProducts();

    return () => {
      isComponentActive =
        false;

      abortController.abort();
    };
  }, [
    isTenantLoading,
    tenantId,
  ]);

  /* =======================================================
     PAGE DATA
  ======================================================= */

  const page =
    useMemo(
      () =>
        cmsPage ??
        fallbackTermsPage,
      [
        cmsPage,
      ],
    );

  /* =======================================================
     CLIENT-SIDE SEO
  ======================================================= */

  useEffect(() => {
    const metaTitle =
      page.seo.metaTitle.trim();

    const metaDescription =
      page.seo.metaDescription.trim();

    if (
      !metaTitle &&
      !metaDescription
    ) {
      return;
    }

    const previousTitle =
      document.title;

    const existingMeta =
      document.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );

    const previousDescription =
      existingMeta?.getAttribute(
        "content",
      ) ?? null;

    let descriptionMeta =
      existingMeta;

    let createdMeta =
      false;

    if (metaTitle) {
      document.title =
        metaTitle;
    }

    if (metaDescription) {
      if (!descriptionMeta) {
        descriptionMeta =
          document.createElement(
            "meta",
          );

        descriptionMeta.setAttribute(
          "name",
          "description",
        );

        document.head.appendChild(
          descriptionMeta,
        );

        createdMeta = true;
      }

      descriptionMeta.setAttribute(
        "content",
        metaDescription,
      );
    }

    return () => {
      if (metaTitle) {
        document.title =
          previousTitle;
      }

      if (
        metaDescription &&
        descriptionMeta
      ) {
        if (createdMeta) {
          descriptionMeta.remove();
        } else if (
          previousDescription !==
          null
        ) {
          descriptionMeta.setAttribute(
            "content",
            previousDescription,
          );
        }
      }
    };
  }, [
    page.seo.metaTitle,
    page.seo.metaDescription,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isTenantLoading ||
    isPageLoading
  ) {
    return (
      <main className="min-h-screen bg-white">
        <section className="bg-[#0B1F3A]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-3xl animate-pulse">
              <div className="h-8 w-36 rounded-full bg-white/10" />
              <div className="mt-6 h-14 max-w-xl rounded-xl bg-white/10" />
              <div className="mt-5 h-16 max-w-2xl rounded-xl bg-white/10" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#0B1F3A]">
        {page.banner.image ? (
          <>
            <img
              src={
                page.banner.image
              }
              alt={
                page.banner.altText ||
                page.pageTitle
              }
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div
              className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"
              aria-hidden="true"
            />
          </>
        ) : null}

        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FF6900]/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#FF6900]" />

              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#E85F00]/90 sm:text-sm">
                Customer Info
              </span>
            </div>

            {hasText(
              page.pageTitle,
            ) ? (
              <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-white/90 sm:text-5xl lg:text-6xl">
                {
                  page.pageTitle
                }
              </h1>
            ) : null}

            {hasText(
              page.subtitle,
            ) ? (
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-100/80 sm:text-lg">
                {
                  page.subtitle
                }
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid gap-7 lg:grid-cols-[0.86fr_1.14fr]">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[24px] bg-[#0B1F3A] p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6900] text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 3h7l4 4v14H7V3Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 3v5h5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m9.5 14 1.7 1.7 3.8-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">
                  Terms & Conditions
                </p>

                <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
                  Clear terms for using the store and placing orders.
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Please review these terms together with the information shown
                  during checkout, payment, delivery and customer support.
                </p>
              </div>
            </aside>

            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 3h7l4 4v14H7V3Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 3v5h5M10 12h5M10 16h5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
                    Terms Details
                  </p>

                  <h2 className="mt-1 text-xl font-black text-[#0B1F3A] sm:text-2xl">
                    {page.pageTitle}
                  </h2>
                </div>
              </div>

              {hasText(
                page.content,
              ) ? (
                <div className="mt-7 whitespace-pre-line text-sm leading-8 text-slate-600 sm:text-base">
                  {
                    page.content
                  }
                </div>
              ) : (
                <p className="mt-7 text-sm leading-8 text-slate-500 sm:text-base">
                  Terms & Conditions content will appear here after it is added from
                  Footer Management.
                </p>
              )}
            </article>
          </div>
        </div>
      </section>

      {/* ================= SPECIAL OFFERS ================= */}
      {offerProducts.length >
      0 ? (
        <section className="border-t border-slate-200 bg-[#F7F8FA] py-8 sm:py-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
            <RelatedProductsCarousel
              products={
                offerProducts
              }
              title="Special Offers"
              showAllText="Show All"
              showAllLink="/offers"
              autoSlide
              autoSlideInterval={
                4000
              }
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
