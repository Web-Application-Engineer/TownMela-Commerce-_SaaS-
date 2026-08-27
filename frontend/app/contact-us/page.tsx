"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";

import {
  useFooterSettings,
} from "@/src/context/FooterSettingsContext";

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

type CheckoutSettingsResponse = {
  success?: boolean;
  message?: string;

  data?: {
    settings?: {
      whatsappNumber?: string;
      isActive?: boolean;
    };

    checkoutSettings?: {
      whatsappNumber?: string;
      isActive?: boolean;
    };
  };

  settings?: {
    whatsappNumber?: string;
    isActive?: boolean;
  };

  checkoutSettings?: {
    whatsappNumber?: string;
    isActive?: boolean;
  };
};

/* =========================================================
   FALLBACK
========================================================= */

const fallbackContactPage: SimpleContentPage = {
  menuTitle: "Contact Us",

  pageTitle: "Contact Us",

  subtitle:
    "Get in touch with the store for product, order, delivery or general customer support.",

  banner: {
    image: "",
    altText: "Contact Us",
  },

  content:
    "For the fastest support, use the phone, email or other contact information shown below.\n\nYou can contact the store regarding product details, order confirmation, delivery status, payment information, returns or refunds.",

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
    ...fallbackContactPage,
    ...(page ?? {}),

    banner: {
      ...fallbackContactPage.banner,
      ...(page?.banner ?? {}),
    },

    seo: {
      ...fallbackContactPage.seo,
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

function getTelHref(
  value: string,
) {
  const normalized =
    value
      .trim()
      .replace(/[^\d+]/g, "");

  return normalized
    ? `tel:${normalized}`
    : "#";
}

function getMailHref(
  value: string,
) {
  const normalized =
    value.trim();

  return normalized
    ? `mailto:${normalized}`
    : "#";
}

function getWhatsAppHref(
  value: string,
) {
  const digits =
    value.replace(/\D/g, "");

  return digits
    ? `https://wa.me/${digits}`
    : "#";
}

function getExternalHref(
  value: string,
) {
  const normalized =
    value.trim();

  if (!normalized) {
    return "#";
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    return normalized;
  }

  return `https://${normalized}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function ContactUsPage() {
  const {
    tenantId,
    isLoading:
      isTenantLoading,
  } =
    useStorefrontTenant();

  const {
    settings:
      footerSettings,
  } =
    useFooterSettings();

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

  const [
    whatsappNumber,
    setWhatsappNumber,
  ] =
    useState("");

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
              `${API_BASE_URL}/api/tenants/footer-pages/public/contact-us`,
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
                "Failed to load Contact Us page.",
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
            "Contact Us page load error:",
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
     LOAD TENANT-SPECIFIC WHATSAPP
  ======================================================= */

  useEffect(() => {
    if (isTenantLoading) {
      return;
    }

    if (!tenantId) {
      setWhatsappNumber("");
      return;
    }

    const controller =
      new AbortController();

    const loadWhatsapp =
      async () => {
        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/checkout-settings`,
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
              | CheckoutSettingsResponse
              | null;

          if (!response.ok) {
            throw new Error(
              payload?.message ||
                "WhatsApp settings could not be loaded.",
            );
          }

          const settings =
            payload?.data?.settings ||
            payload?.data?.checkoutSettings ||
            payload?.settings ||
            payload?.checkoutSettings;

          if (
            settings?.isActive ===
            false
          ) {
            setWhatsappNumber("");
            return;
          }

          setWhatsappNumber(
            String(
              settings?.whatsappNumber ||
                "",
            ).trim(),
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

          console.warn(
            "Contact Us WhatsApp loading error:",
            error,
          );

          setWhatsappNumber("");
        }
      };

    void loadWhatsapp();

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
            "Contact Us offer products loading error:",
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
        fallbackContactPage,
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

  const contactItems =
    [
      footerSettings.phone
        ? {
            label:
              "Phone",
            value:
              footerSettings.phone,
            href:
              getTelHref(
                footerSettings.phone,
              ),
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M5 4h3l2 5-2 1.5a15 15 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2C10.3 21 3 13.7 3 6a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          }
        : null,

      whatsappNumber
        ? {
            label:
              "WhatsApp",
            value:
              whatsappNumber,
            href:
              getWhatsAppHref(
                whatsappNumber,
              ),
            external:
              true,
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.8 8.4c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.1.4 0 .6.6 1.1 1.5 2 2.7 2.6.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.4.5 0 .5-.2 1.4-.8 1.9-.5.5-1.3.8-2.2.7-1.3-.2-3.2-.8-5.1-2.5-1.5-1.4-2.6-3.1-2.9-4.4-.2-.8 0-1.5.2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          }
        : null,

      footerSettings.email
        ? {
            label:
              "Email",
            value:
              footerSettings.email,
            href:
              getMailHref(
                footerSettings.email,
              ),
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m4 7 8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          }
        : null,

      footerSettings.address
        ? {
            label:
              "Address",
            value:
              footerSettings.address,
            href: "",
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            ),
          }
        : null,

      footerSettings.showGoogleMap &&
      footerSettings.googleMapUrl
        ? {
            label:
              "Google Map",
            value:
              footerSettings.googleMapCtaText?.trim() ||
              "Open Google Map",
            href:
              getExternalHref(
                footerSettings.googleMapUrl,
              ),
            external:
              true,
            icon: (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 3v15M15 6v15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ),
          }
        : null,
    ].filter(
      Boolean,
    ) as {
      label: string;
      value: string;
      href: string;
      external?: boolean;
      icon:
        React.ReactNode;
    }[];

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
          <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M4 5h16v11H8l-4 3V5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 9h8M8 12h5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-[#0B1F3A] sm:text-3xl">
                Customer Support
              </h2>

              {hasText(
                page.content,
              ) ? (
                <div className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                  {
                    page.content
                  }
                </div>
              ) : null}
            </article>

            <aside className="rounded-[24px] bg-[#0B1F3A] p-6 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">
                Contact Details
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                We&apos;re here to help.
              </h2>

              {contactItems.length >
              0 ? (
                <div className="mt-7 space-y-3">
                  {contactItems.map(
                    (item) => {
                      const content =
                        (
                          <>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-300">
                              {
                                item.icon
                              }
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                {
                                  item.label
                                }
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold leading-6 text-white">
                                {
                                  item.value
                                }
                              </p>
                            </div>
                          </>
                        );

                      return item.href ? (
                        <a
                          key={
                            item.label
                          }
                          href={
                            item.href
                          }
                          target={
                            item.external
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            item.external
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                        >
                          {
                            content
                          }
                        </a>
                      ) : (
                        <div
                          key={
                            item.label
                          }
                          className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                        >
                          {
                            content
                          }
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  Store contact details
                  will appear here when
                  they are added from
                  Footer Management.
                </p>
              )}
            </aside>
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
