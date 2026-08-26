"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";

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

type AboutValueItem = {
  title: string;
  description: string;
  icon: string;
};

type AboutJourneyStep = {
  title: string;
  description: string;
};

type AboutPage = {
  menuTitle: string;

  banner: {
    image: string;
    altText: string;
    label: string;
  };

  hero: {
    badge: string;
    title: string;
    highlightedTitle: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };

  intro: {
    eyebrow: string;
    title: string;
    paragraphOne: string;
    paragraphTwo: string;
  };

  values: {
    eyebrow: string;
    title: string;
    description: string;
    items: AboutValueItem[];
  };

  commitment: {
    eyebrow: string;
    title: string;
    description: string;
    items: string[];
  };

  journey: {
    eyebrow: string;
    title: string;
    description: string;
    steps: AboutJourneyStep[];
  };

  notice: {
    title: string;
    description: string;
  };

  cta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };

  seo: {
    metaTitle: string;
    metaDescription: string;
  };
};

type AboutPageResponse = {
  success?: boolean;
  message?: string;
  data?: {
    pageKey?: string;
    page?: Partial<AboutPage>;
  };
};

/* =========================================================
   EMPTY PAGE SHAPE
========================================================= */

const emptyAboutPage: AboutPage = {
  menuTitle: "About Us",

  banner: {
    image: "",
    altText: "",
    label: "",
  },

  hero: {
    badge: "",
    title: "",
    highlightedTitle: "",
    description: "",
    primaryButtonText: "",
    primaryButtonLink: "",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },

  intro: {
    eyebrow: "",
    title: "",
    paragraphOne: "",
    paragraphTwo: "",
  },

  values: {
    eyebrow: "",
    title: "",
    description: "",
    items: [],
  },

  commitment: {
    eyebrow: "",
    title: "",
    description: "",
    items: [],
  },

  journey: {
    eyebrow: "",
    title: "",
    description: "",
    steps: [],
  },

  notice: {
    title: "",
    description: "",
  },

  cta: {
    eyebrow: "",
    title: "",
    description: "",
    primaryButtonText: "",
    primaryButtonLink: "",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },

  seo: {
    metaTitle: "",
    metaDescription: "",
  },
};

/* =========================================================
   CURRENT STOREFRONT CONTENT FALLBACK

   This keeps the existing About Us design/content visible
   until the tenant saves its first About Us CMS content.
========================================================= */

const fallbackAboutPage: AboutPage = {
  menuTitle: "About Us",

  banner: {
    image: "",
    altText: "",
    label: "",
  },

  hero: {
    badge: "About Our Store",
    title: "Shopping made simpler,",
    highlightedTitle:
      "better and more reliable.",
    description:
      "We are committed to creating a modern shopping experience where customers can confidently discover products, place orders and get the support they need — every step of the way.",
    primaryButtonText:
      "Explore Products",
    primaryButtonLink:
      "/shop",
    secondaryButtonText:
      "Contact Us",
    secondaryButtonLink:
      "/contact-us",
  },

  intro: {
    eyebrow: "Who We Are",
    title:
      "Built around a better customer experience.",
    paragraphOne:
      "We believe online shopping should be easy to understand and effortless to use. From browsing products to completing checkout, our goal is to provide customers with a seamless and dependable experience.",
    paragraphTwo:
      "We continually work to improve the way products are presented, orders are handled and customer questions are supported. Clear information, convenient shopping and dependable service remain at the heart of what we do.",
  },

  values: {
    eyebrow:
      "What Matters To Us",
    title:
      "A shopping experience you can trust.",
    description:
      "Our approach is built around the things that matter most when shopping online.",
    items: [
      {
        title:
          "Quality & Reliability",
        description:
          "We focus on delivering a dependable shopping experience with carefully presented products and clear information.",
        icon: "shield",
      },
      {
        title:
          "Customer First",
        description:
          "Every part of the shopping journey is designed to make discovering, ordering and receiving products easier.",
        icon: "users",
      },
      {
        title:
          "Secure Shopping",
        description:
          "We aim to provide a smooth and secure environment throughout the browsing, checkout and order process.",
        icon: "lock",
      },
    ],
  },

  commitment: {
    eyebrow:
      "Our Commitment",
    title:
      "Confidence at every stage of your order.",
    description:
      "From product discovery to post-purchase support, we focus on making every interaction clear, convenient and customer-friendly.",
    items: [
      "Simple and convenient product discovery",
      "Clear product and order information",
      "Reliable customer support experience",
      "Transparent delivery and service policies",
    ],
  },

  journey: {
    eyebrow:
      "Your Shopping Journey",
    title:
      "Simple from discovery to delivery.",
    description:
      "Our storefront is designed to keep the entire buying experience straightforward and convenient.",
    steps: [
      {
        title: "Discover",
        description:
          "Browse products and categories with ease.",
      },
      {
        title: "Choose",
        description:
          "Review the information you need before ordering.",
      },
      {
        title: "Order",
        description:
          "Complete your purchase through a simple checkout.",
      },
      {
        title: "Support",
        description:
          "Reach us whenever you need assistance.",
      },
    ],
  },

  notice: {
    title:
      "Important Store Information",
    description:
      "Product availability, pricing, delivery information and customer service policies may be updated from time to time. Please review the latest information shown on product, cart and checkout pages before completing an order.",
  },

  cta: {
    eyebrow:
      "We're Here To Help",
    title:
      "Have a question about a product?",
    description:
      "Our customer support options are available to help you with product information, orders and other shopping-related questions.",
    primaryButtonText:
      "Contact Us",
    primaryButtonLink:
      "/contact-us",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },

  seo: {
    metaTitle: "",
    metaDescription: "",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeAboutPage(
  page?: Partial<AboutPage> | null,
): AboutPage {
  return {
    ...emptyAboutPage,
    ...(page ?? {}),

    banner: {
      ...emptyAboutPage.banner,
      ...(page?.banner ?? {}),
    },

    hero: {
      ...emptyAboutPage.hero,
      ...(page?.hero ?? {}),
    },

    intro: {
      ...emptyAboutPage.intro,
      ...(page?.intro ?? {}),
    },

    values: {
      ...emptyAboutPage.values,
      ...(page?.values ?? {}),
      items:
        Array.isArray(
          page?.values?.items,
        )
          ? page.values.items.map(
              (item) => ({
                title:
                  item?.title ?? "",
                description:
                  item?.description ?? "",
                icon:
                  item?.icon ?? "",
              }),
            )
          : [],
    },

    commitment: {
      ...emptyAboutPage.commitment,
      ...(page?.commitment ?? {}),
      items:
        Array.isArray(
          page?.commitment?.items,
        )
          ? page.commitment.items
          : [],
    },

    journey: {
      ...emptyAboutPage.journey,
      ...(page?.journey ?? {}),
      steps:
        Array.isArray(
          page?.journey?.steps,
        )
          ? page.journey.steps.map(
              (step) => ({
                title:
                  step?.title ?? "",
                description:
                  step?.description ??
                  "",
              }),
            )
          : [],
    },

    notice: {
      ...emptyAboutPage.notice,
      ...(page?.notice ?? {}),
    },

    cta: {
      ...emptyAboutPage.cta,
      ...(page?.cta ?? {}),
    },

    seo: {
      ...emptyAboutPage.seo,
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

function hasVisualCmsContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.banner.image) ||
      hasText(page.banner.label) ||
      hasText(page.hero.badge) ||
      hasText(page.hero.title) ||
      hasText(
        page.hero.highlightedTitle,
      ) ||
      hasText(
        page.hero.description,
      ) ||
      hasText(
        page.hero.primaryButtonText,
      ) ||
      hasText(
        page.hero.secondaryButtonText,
      ) ||
      hasText(
        page.intro.eyebrow,
      ) ||
      hasText(page.intro.title) ||
      hasText(
        page.intro.paragraphOne,
      ) ||
      hasText(
        page.intro.paragraphTwo,
      ) ||
      hasText(
        page.values.eyebrow,
      ) ||
      hasText(page.values.title) ||
      hasText(
        page.values.description,
      ) ||
      page.values.items.length > 0 ||
      hasText(
        page.commitment.eyebrow,
      ) ||
      hasText(
        page.commitment.title,
      ) ||
      hasText(
        page.commitment.description,
      ) ||
      page.commitment.items.length >
        0 ||
      hasText(
        page.journey.eyebrow,
      ) ||
      hasText(
        page.journey.title,
      ) ||
      hasText(
        page.journey.description,
      ) ||
      page.journey.steps.length >
        0 ||
      hasText(page.notice.title) ||
      hasText(
        page.notice.description,
      ) ||
      hasText(page.cta.eyebrow) ||
      hasText(page.cta.title) ||
      hasText(
        page.cta.description,
      ) ||
      hasText(
        page.cta.primaryButtonText,
      ) ||
      hasText(
        page.cta.secondaryButtonText,
      )
  );
}

function hasIntroContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.intro.eyebrow) ||
      hasText(page.intro.title) ||
      hasText(
        page.intro.paragraphOne,
      ) ||
      hasText(
        page.intro.paragraphTwo,
      )
  );
}

function hasCommitmentContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(
      page.commitment.eyebrow,
    ) ||
      hasText(
        page.commitment.title,
      ) ||
      hasText(
        page.commitment.description,
      ) ||
      page.commitment.items.length >
        0
  );
}

function hasValuesContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.values.eyebrow) ||
      hasText(page.values.title) ||
      hasText(
        page.values.description,
      ) ||
      page.values.items.length > 0
  );
}

function hasJourneyContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.journey.eyebrow) ||
      hasText(page.journey.title) ||
      hasText(
        page.journey.description,
      ) ||
      page.journey.steps.length >
        0
  );
}

function hasNoticeContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.notice.title) ||
      hasText(
        page.notice.description,
      )
  );
}

function hasCtaContent(
  page: AboutPage,
) {
  return Boolean(
    hasText(page.cta.eyebrow) ||
      hasText(page.cta.title) ||
      hasText(
        page.cta.description,
      ) ||
      hasText(
        page.cta.primaryButtonText,
      ) ||
      hasText(
        page.cta.secondaryButtonText,
      )
  );
}

function renderValueIcon(
  iconKey: string,
  index: number,
) {
  const normalized =
    String(iconKey || "")
      .trim()
      .toLowerCase();

  if (
    [
      "users",
      "user",
      "customer",
      "customers",
      "people",
    ].includes(normalized)
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle
          cx="9"
          cy="7"
          r="4"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M16 11a4 4 0 0 0 0-8m6 18v-2a4 4 0 0 0-3-3.87"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    [
      "lock",
      "secure",
      "security",
      "safe",
    ].includes(normalized)
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="10"
          width="16"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 10V7a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 14v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (
    [
      "shield",
      "quality",
      "reliable",
      "reliability",
    ].includes(normalized) ||
    index % 3 === 0
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m9 12 2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (index % 3 === 1) {
    return renderValueIcon(
      "users",
      index,
    );
  }

  return renderValueIcon(
    "lock",
    index,
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AboutUsPage() {
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
    useState<AboutPage | null>(
      null,
    );

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

    const loadAboutPage =
      async () => {
        try {
          setIsPageLoading(true);

          const response =
            await fetch(
              `${API_BASE_URL}/api/tenants/footer-pages/public/about-us`,
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
              | AboutPageResponse
              | null;

          if (
            !response.ok ||
            !payload?.success
          ) {
            throw new Error(
              payload?.message ||
                "Failed to load About Us page.",
            );
          }

          setCmsPage(
            normalizeAboutPage(
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
            "About Us page load error:",
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

    void loadAboutPage();

    return () => {
      controller.abort();
    };
  }, [
    isTenantLoading,
    tenantId,
  ]);

  /* =======================================================
     LOAD TENANT-SPECIFIC OFFER PRODUCTS

     Uses the exact same offer rules as /offers:
     - normal discounted products (oldPrice > price)
     - live Stock Clearance campaign products
     - campaign-controlled products do not fall back into
       normal offers when the campaign is closed/ended
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
                  cache: "no-store",
                  credentials:
                    "include",
                  signal:
                    abortController.signal,
                  headers,
                },
              ),

              fetch(
                `${API_BASE_URL}/api/stock-clearance`,
                {
                  method: "GET",
                  cache: "no-store",
                  credentials:
                    "include",
                  signal:
                    abortController.signal,
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
            "About Us offer products loading error:",
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

  const page =
    useMemo(() => {
      if (!cmsPage) {
        return fallbackAboutPage;
      }

      if (
        !hasVisualCmsContent(
          cmsPage,
        )
      ) {
        return {
          ...fallbackAboutPage,

          menuTitle:
            cmsPage.menuTitle ||
            fallbackAboutPage.menuTitle,

          seo: {
            ...fallbackAboutPage.seo,
            ...cmsPage.seo,
          },
        };
      }

      return cmsPage;
    }, [
      cmsPage,
    ]);

  /* =======================================================
     CLIENT-SIDE SEO FOR THIS CLIENT PAGE
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

  const showIntro =
    hasIntroContent(page);

  const showCommitment =
    hasCommitmentContent(page);

  const showValues =
    hasValuesContent(page);

  const showJourney =
    hasJourneyContent(page);

  const showNotice =
    hasNoticeContent(page);

  const showCta =
    hasCtaContent(page);

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isTenantLoading ||
    isPageLoading
  ) {
    return (
      <main className="min-h-screen bg-white">
        <section className="border-b border-slate-200 bg-[#F8FAFC]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-4xl animate-pulse">
              <div className="h-9 w-44 rounded-full bg-slate-200" />
              <div className="mt-6 h-12 max-w-3xl rounded-xl bg-slate-200 sm:h-16" />
              <div className="mt-4 h-12 max-w-2xl rounded-xl bg-slate-100" />
              <div className="mt-7 h-20 max-w-2xl rounded-xl bg-slate-100" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#F8FAFC]">
        {page.banner.image ? (
          <>
            <img
              src={
                page.banner.image
              }
              alt={
                page.banner.altText ||
                ""
              }
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div
              className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10"
              aria-hidden="true"
            />
          </>
        ) : null}

        {/* Decorative Background */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-orange-100/60 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-[320px] w-[320px] rounded-full bg-slate-200/60 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            {page.hero.badge ||
            page.banner.label ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-[#FF6900]" />

                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#E85F00] sm:text-sm">
                  {page.hero.badge ||
                    page.banner.label}
                </span>
              </div>
            ) : null}

            {page.hero.title ||
            page.hero
              .highlightedTitle ? (
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-white/90 sm:text-5xl lg:text-6xl">
                {page.hero.title}

                {page.hero
                  .highlightedTitle ? (
                  <span className="block text-[#FF7A1A]/90">
                    {
                      page.hero
                        .highlightedTitle
                    }
                  </span>
                ) : null}
              </h1>
            ) : null}

            {page.hero.description ? (
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-100/80 sm:text-lg">
                {
                  page.hero
                    .description
                }
              </p>
            ) : null}

            {page.hero
              .primaryButtonText ||
            page.hero
              .secondaryButtonText ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {page.hero
                  .primaryButtonText &&
                page.hero
                  .primaryButtonLink ? (
                  <Link
                    href={
                      page.hero
                        .primaryButtonLink
                    }
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-6 py-3 text-sm font-extrabold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#E85F00]"
                  >
                    {
                      page.hero
                        .primaryButtonText
                    }

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12h14m-6-6 6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ) : null}

                {page.hero
                  .secondaryButtonText &&
                page.hero
                  .secondaryButtonLink ? (
                  <Link
                    href={
                      page.hero
                        .secondaryButtonLink
                    }
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-extrabold text-[#0B1F3A] transition duration-200 hover:border-slate-400 hover:bg-slate-50"
                  >
                    {
                      page.hero
                        .secondaryButtonText
                    }
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ================= INTRO ================= */}
      {showIntro ||
      showCommitment ? (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div
            className={
              showIntro &&
              showCommitment
                ? "grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
                : "mx-auto max-w-3xl"
            }
          >
            {/* Left */}
            {showIntro ? (
              <div>
                {page.intro
                  .eyebrow ? (
                  <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-[#FF6900]">
                    {
                      page.intro
                        .eyebrow
                    }
                  </p>
                ) : null}

                {page.intro.title ? (
                  <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight text-[#0B1F3A] sm:text-4xl">
                    {
                      page.intro
                        .title
                    }
                  </h2>
                ) : null}

                {page.intro
                  .paragraphOne ? (
                  <p className="mt-6 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                    {
                      page.intro
                        .paragraphOne
                    }
                  </p>
                ) : null}

                {page.intro
                  .paragraphTwo ? (
                  <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                    {
                      page.intro
                        .paragraphTwo
                    }
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Right */}
            {showCommitment ? (
              <div className="relative overflow-hidden rounded-[28px] bg-[#0B1F3A] p-7 sm:p-9">
                <div
                  className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#FF6900]/20 blur-3xl"
                  aria-hidden="true"
                />

                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 12h18M12 3v18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {page.commitment
                    .eyebrow ? (
                    <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">
                      {
                        page
                          .commitment
                          .eyebrow
                      }
                    </p>
                  ) : null}

                  {page.commitment
                    .title ? (
                    <h3 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
                      {
                        page
                          .commitment
                          .title
                      }
                    </h3>
                  ) : null}

                  {page.commitment
                    .description ? (
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      {
                        page
                          .commitment
                          .description
                      }
                    </p>
                  ) : null}

                  {page.commitment
                    .items.length >
                  0 ? (
                    <div className="mt-7 space-y-4">
                      {page.commitment.items.map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={`${item}-${index}`}
                            className="flex items-start gap-3"
                          >
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6900]/15 text-[#FF8B3D]">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              >
                                <path
                                  d="m5 12 4 4L19 6"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>

                            <p className="text-sm font-medium leading-6 text-slate-200">
                              {
                                item
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ================= VALUES ================= */}
      {showValues ? (
        <section className="border-y border-slate-200 bg-[#F8FAFC]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              {page.values
                .eyebrow ? (
                <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-[#FF6900]">
                  {
                    page.values
                      .eyebrow
                  }
                </p>
              ) : null}

              {page.values.title ? (
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0B1F3A] sm:text-4xl">
                  {
                    page.values
                      .title
                  }
                </h2>
              ) : null}

              {page.values
                .description ? (
                <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                  {
                    page.values
                      .description
                  }
                </p>
              ) : null}
            </div>

            {page.values.items
              .length > 0 ? (
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {page.values.items.map(
                  (
                    feature,
                    index,
                  ) => (
                    <div
                      key={`${feature.title}-${index}`}
                      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900] transition duration-300 group-hover:bg-[#FF6900] group-hover:text-white">
                        {renderValueIcon(
                          feature.icon,
                          index,
                        )}
                      </div>

                      {feature.title ? (
                        <h3 className="mt-5 text-lg font-black text-[#0B1F3A]">
                          {
                            feature.title
                          }
                        </h3>
                      ) : null}

                      {feature.description ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {
                            feature.description
                          }
                        </p>
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ================= SHOPPING JOURNEY ================= */}
      {showJourney ? (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                {page.journey
                  .eyebrow ? (
                  <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-[#FF6900]">
                    {
                      page
                        .journey
                        .eyebrow
                    }
                  </p>
                ) : null}

                {page.journey
                  .title ? (
                  <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#0B1F3A]">
                    {
                      page
                        .journey
                        .title
                    }
                  </h2>
                ) : null}

                {page.journey
                  .description ? (
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {
                      page
                        .journey
                        .description
                    }
                  </p>
                ) : null}
              </div>

              {page.journey.steps
                .length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {page.journey.steps.map(
                    (
                      step,
                      index,
                    ) => (
                      <div
                        key={`${step.title}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B1F3A] text-xs font-black text-white">
                            {String(
                              index +
                                1,
                            ).padStart(
                              2,
                              "0",
                            )}
                          </span>

                          <div>
                            {step.title ? (
                              <h3 className="font-black text-[#0B1F3A]">
                                {
                                  step.title
                                }
                              </h3>
                            ) : null}

                            {step.description ? (
                              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                                {
                                  step.description
                                }
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= INFORMATION NOTICE ================= */}
      {showNotice ? (
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="flex flex-col gap-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-6 sm:flex-row sm:items-start sm:p-7">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 11v5m0-8h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              {page.notice.title ? (
                <h3 className="text-base font-black text-[#0B1F3A]">
                  {
                    page.notice
                      .title
                  }
                </h3>
              ) : null}

              {page.notice
                .description ? (
                <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
                  {
                    page.notice
                      .description
                  }
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= CTA ================= */}
      {showCta ? (
        <section className="bg-[#0B1F3A]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#FF6900]/20 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative max-w-2xl">
                {page.cta
                  .eyebrow ? (
                  <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-orange-300">
                    {
                      page.cta
                        .eyebrow
                    }
                  </p>
                ) : null}

                {page.cta.title ? (
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {
                      page.cta
                        .title
                    }
                  </h2>
                ) : null}

                {page.cta
                  .description ? (
                  <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                    {
                      page.cta
                        .description
                    }
                  </p>
                ) : null}
              </div>

              {page.cta
                .primaryButtonText ||
              page.cta
                .secondaryButtonText ? (
                <div className="relative mt-7 flex shrink-0 flex-wrap gap-3 lg:mt-0">
                  {page.cta
                    .primaryButtonText &&
                  page.cta
                    .primaryButtonLink ? (
                    <Link
                      href={
                        page.cta
                          .primaryButtonLink
                      }
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-7 py-3 text-sm font-extrabold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#E85F00]"
                    >
                      {
                        page.cta
                          .primaryButtonText
                      }

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12h14m-6-6 6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  ) : null}

                  {page.cta
                    .secondaryButtonText &&
                  page.cta
                    .secondaryButtonLink ? (
                    <Link
                      href={
                        page.cta
                          .secondaryButtonLink
                      }
                      className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-7 py-3 text-sm font-extrabold text-white transition duration-200 hover:bg-white/[0.1]"
                    >
                      {
                        page.cta
                          .secondaryButtonText
                      }
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= SPECIAL OFFERS ================= */}
      {offerProducts.length > 0 ? (
        <section className="border-t border-slate-200 bg-[#F7F8FA] py-8 sm:py-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
            <RelatedProductsCarousel
              products={offerProducts}
              title="Special Offers"
              showAllText="Show All"
              showAllLink="/offers"
              autoSlide
              autoSlideInterval={4000}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
