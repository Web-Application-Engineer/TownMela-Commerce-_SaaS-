import { headers } from "next/headers";

import Hero from "@/src/components/Hero";
import PopularCategories from "@/src/components/Home/PopularCategories";
import {
  HomepageProductSections,
  type HomepageProductSection,
} from "@/src/components/Home/HomepageProductSections";
import type { ShowcaseConfig } from "@/src/components/Home/CategoryShowcase";
import type { Product } from "@/src/types/product";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

/* =========================================================
   TENANT CONFIGURATION
========================================================= */

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ??
  "";

/* =========================================================
   TYPES
========================================================= */

type HomepageBannerType =
  | "main"
  | "sideTop"
  | "sideBottom";

type HomepageBanner = {
  _id: string;
  title: string;
  image: string;
  link: string;
  altText: string;
  order: number;
  active: boolean;
  type: HomepageBannerType;
};

type CategoryReference = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  thumbnail?: string;
};

type PopularCategoryApiItem = {
  _id?: string;
  id?: string | number;
  displayName?: string;
  category?: string | CategoryReference;
  categoryId?: string | CategoryReference;
  categoryName?: string;
  categorySlug?: string;
  slug?: string;
  thumbnail?: string;
  image?: string;
  link?: string;
  order?: number;
  active?: boolean;
};

type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      message?: string;
    };

type HomepageBannersApiResponse = {
  success?: boolean;
  homepageBanners?: HomepageBanner[];
  message?: string;
};

type PopularCategoriesApiResponse = {
  success?: boolean;
  popularCategories?: PopularCategoryApiItem[];
  data?: PopularCategoryApiItem[];
  message?: string;
};

type ProductsResult = {
  products: Product[];
  error: string | null;
};

type BannersResult = {
  banners: HomepageBanner[];
  error: string | null;
};

type PopularCategoriesResult = {
  items: PopularCategoryApiItem[];
  error: string | null;
};

type HomepageProductSectionResponse = {
  success?: boolean;
  message?: string;
  data?: {
    sections?: HomepageProductSection[];
    isActive?: boolean;
  };
};

type HomepageCategoryShowcaseResponse = {
  success?: boolean;
  message?: string;
  showcaseConfig?: ShowcaseConfig;
};

type HomepageLayoutResult = {
  sections: HomepageProductSection[];
  sectionsActive: boolean;
  showcaseConfig: ShowcaseConfig | null;
  showcaseError: string | null;
};

/* =========================================================
   SHARED PUBLIC REQUEST HEADERS
========================================================= */

function getPublicHeaders(
  useLocalTenantId = true,
): HeadersInit {
  return {
    Accept: "application/json",

    ...(useLocalTenantId && TENANT_ID
      ? {
          "X-Tenant-Id":
            TENANT_ID,
        }
      : {}),
  };
}

/* =========================================================
   FETCH PRODUCTS ON SERVER
========================================================= */

async function getProducts(apiBaseUrl = API_BASE_URL, useLocalTenantId = true): Promise<ProductsResult> {
  try {
    const response =
      await fetch(
        `${apiBaseUrl}/api/products?homepage=true`,
        {
          headers:
            getPublicHeaders(useLocalTenantId),

          /*
           * Homepage-only lightweight product response.
           * A tiny revalidation window avoids re-fetching the full
           * database result on every refresh while keeping updates fresh.
           */
          next: {
            revalidate: 5,
          },
        },
      );

    if (!response.ok) {
      let message =
        `Products could not be loaded. Status: ${response.status}`;

      try {
        const errorData =
          await response.json();

        if (
          errorData &&
          typeof errorData.message ===
            "string"
        ) {
          message =
            errorData.message;
        }
      } catch {
        // Keep default error message.
      }

      return {
        products: [],
        error:
          message,
      };
    }

    const data:
      ProductsApiResponse =
      await response.json();

    if (
      Array.isArray(
        data,
      )
    ) {
      return {
        products:
          data,
        error:
          null,
      };
    }

    if (
      Array.isArray(
        data.products,
      )
    ) {
      return {
        products:
          data.products,
        error:
          null,
      };
    }

    return {
      products: [],
      error:
        data.message ??
        "Products API returned an unexpected response.",
    };
  } catch (
    error
  ) {
    console.error(
      "Homepage products loading error:",
      error,
    );

    return {
      products: [],
      error:
        "Products could not be loaded. Please make sure the backend server is running.",
    };
  }
}

/* =========================================================
   FETCH HOMEPAGE BANNERS ON SERVER
========================================================= */

async function getHomepageBanners(apiBaseUrl = API_BASE_URL, useLocalTenantId = true): Promise<BannersResult> {
  try {
    const response =
      await fetch(
        `${apiBaseUrl}/api/homepage-banners?active=true`,
        {
          method:
            "GET",
          headers:
            getPublicHeaders(useLocalTenantId),
          cache:
            "no-store",
        },
      );

    const data =
      (await response
        .json()
        .catch(
          () => null,
        )) as
        | HomepageBannersApiResponse
        | null;

    if (
      !response.ok ||
      !data?.success
    ) {
      return {
        banners: [],
        error:
          data?.message ||
          "Homepage banners could not be loaded.",
      };
    }

    return {
      banners:
        Array.isArray(
          data.homepageBanners,
        )
          ? data.homepageBanners
          : [],
      error:
        null,
    };
  } catch (
    error
  ) {
    console.error(
      "Homepage banner preload error:",
      error,
    );

    return {
      banners: [],
      error:
        "Homepage banners could not be loaded.",
    };
  }
}

/* =========================================================
   FETCH POPULAR CATEGORIES ON SERVER
========================================================= */

async function getPopularCategories(apiBaseUrl = API_BASE_URL, useLocalTenantId = true): Promise<PopularCategoriesResult> {
  try {
    const response =
      await fetch(
        `${apiBaseUrl}/api/popular-categories?active=true`,
        {
          method:
            "GET",
          headers:
            getPublicHeaders(useLocalTenantId),
          cache:
            "no-store",
        },
      );

    const data =
      (await response
        .json()
        .catch(
          () => null,
        )) as
        | PopularCategoriesApiResponse
        | null;

    if (
      !response.ok ||
      data?.success === false
    ) {
      return {
        items: [],
        error:
          data?.message ||
          "Popular categories could not be loaded.",
      };
    }

    const items =
      Array.isArray(
        data?.popularCategories,
      )
        ? data!.popularCategories!
        : Array.isArray(
              data?.data,
            )
          ? data!.data!
          : [];

    return {
      items,
      error:
        null,
    };
  } catch (
    error
  ) {
    console.error(
      "Popular categories preload error:",
      error,
    );

    return {
      items: [],
      error:
        "Popular categories could not be loaded.",
    };
  }
}

/* =========================================================
   FETCH HOMEPAGE LAYOUT + CATEGORY SHOWCASE ON SERVER
========================================================= */

async function getHomepageLayout(apiBaseUrl = API_BASE_URL, useLocalTenantId = true): Promise<HomepageLayoutResult> {
  const defaultResult: HomepageLayoutResult = {
    sections: [],
    sectionsActive: true,
    showcaseConfig: null,
    showcaseError: null,
  };

  try {
    const [
      sectionsResponse,
      showcaseResponse,
    ] = await Promise.all([
      fetch(
        `${apiBaseUrl}/api/homepage-product-section-settings`,
        {
          method: "GET",
          headers: getPublicHeaders(useLocalTenantId),
          next: {
            revalidate: 5,
          },
        },
      ),

      fetch(
        `${apiBaseUrl}/api/homepage-category-showcases`,
        {
          method: "GET",
          headers: getPublicHeaders(useLocalTenantId),
          next: {
            revalidate: 5,
          },
        },
      ),
    ]);

    const [
      sectionsPayload,
      showcasePayload,
    ] = await Promise.all([
      sectionsResponse
        .json()
        .catch(() => null) as Promise<
          HomepageProductSectionResponse | null
        >,

      showcaseResponse
        .json()
        .catch(() => null) as Promise<
          HomepageCategoryShowcaseResponse | null
        >,
    ]);

    const sections =
      sectionsResponse.ok &&
      sectionsPayload?.success !== false &&
      Array.isArray(
        sectionsPayload?.data?.sections,
      )
        ? sectionsPayload!.data!.sections!
        : [];

    const showcaseConfig =
      showcaseResponse.ok &&
      showcasePayload?.success !== false &&
      showcasePayload?.showcaseConfig
        ? showcasePayload.showcaseConfig
        : null;

    return {
      sections,
      sectionsActive:
        sectionsPayload?.data?.isActive !== false,
      showcaseConfig,
      showcaseError:
        showcaseConfig
          ? null
          : showcasePayload?.message ||
            (!showcaseResponse.ok
              ? "Category showcases could not be loaded."
              : null),
    };
  } catch (error) {
    console.error(
      "Homepage layout preload error:",
      error,
    );

    return {
      ...defaultResult,
      showcaseError:
        "Category showcases could not be loaded.",
    };
  }
}

/* =========================================================
   HOME PAGE

   Performance:
   - Products, hero banners and popular categories start at
     the same time on the server.
   - Hero/PopularCategories receive initial data directly.
   - Their client components no longer wait for hydration and
     then start another first-load request.
========================================================= */

export default async function Home() {
  const incomingHeaders =
    await headers();

  const forwardedHost =
    incomingHeaders
      .get("x-forwarded-host")
      ?.split(",")[0]
      .trim();

  const requestHost =
    forwardedHost ||
    incomingHeaders.get("host") ||
    "";

  const hostname =
    requestHost
      .split(":")[0]
      .toLowerCase();

  const isLocalRequest =
    [
      "localhost",
      "127.0.0.1",
      "::1",
    ].includes(hostname);

  const forwardedProto =
    incomingHeaders
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();

  const requestApiBaseUrl =
    !isLocalRequest && requestHost
      ? `${forwardedProto || "https"}://${requestHost}`
      : API_BASE_URL;

  const useLocalTenantId =
    isLocalRequest;

  const [
    productsResult,
    bannersResult,
    popularCategoriesResult,
    homepageLayoutResult,
  ] =
    await Promise.all([
      getProducts(
        requestApiBaseUrl,
        useLocalTenantId,
      ),
      getHomepageBanners(
        requestApiBaseUrl,
        useLocalTenantId,
      ),
      getPopularCategories(
        requestApiBaseUrl,
        useLocalTenantId,
      ),
      getHomepageLayout(
        requestApiBaseUrl,
        useLocalTenantId,
      ),
    ]);

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-24 md:pb-10">
      <Hero
        initialBanners={
          bannersResult.banners
        }
        initialError={
          bannersResult.error
        }
      />

      <PopularCategories
        initialItems={
          popularCategoriesResult.items
        }
        initialError={
          popularCategoriesResult.error
        }
      />

      <HomepageProductSections
        initialProducts={
          productsResult.products
        }
        initialError={
          productsResult.error
        }
        initialSections={
          homepageLayoutResult.sections
        }
        initialSectionsActive={
          homepageLayoutResult.sectionsActive
        }
        initialCategoryShowcaseConfig={
          homepageLayoutResult.showcaseConfig
        }
        initialCategoryShowcaseError={
          homepageLayoutResult.showcaseError
        }
        initialLayoutLoaded
      />
    </main>
  );
}
