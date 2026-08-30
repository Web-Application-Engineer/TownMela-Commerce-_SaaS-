import Hero from "@/src/components/Hero";
import PopularCategories from "@/src/components/Home/PopularCategories";
import HomepageProductSections from "@/src/components/Home/HomepageProductSections";
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

type HomepageProductSection = {
  id?: string;
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder?: number;
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

function getPublicHeaders(): HeadersInit {
  return {
    Accept: "application/json",

    ...(TENANT_ID
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

async function getProducts(): Promise<ProductsResult> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/products?homepage=true`,
        {
          headers:
            getPublicHeaders(),

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

async function getHomepageBanners(): Promise<BannersResult> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/homepage-banners?active=true`,
        {
          method:
            "GET",
          headers:
            getPublicHeaders(),
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

async function getPopularCategories(): Promise<PopularCategoriesResult> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/popular-categories?active=true`,
        {
          method:
            "GET",
          headers:
            getPublicHeaders(),
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

async function getHomepageLayout(): Promise<HomepageLayoutResult> {
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
        `${API_BASE_URL}/api/homepage-product-section-settings`,
        {
          method: "GET",
          headers: getPublicHeaders(),
          next: {
            revalidate: 5,
          },
        },
      ),

      fetch(
        `${API_BASE_URL}/api/homepage-category-showcases`,
        {
          method: "GET",
          headers: getPublicHeaders(),
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
  const [
    productsResult,
    bannersResult,
    popularCategoriesResult,
    homepageLayoutResult,
  ] =
    await Promise.all([
      getProducts(),
      getHomepageBanners(),
      getPopularCategories(),
      getHomepageLayout(),
    ]);

  return (
    <main className="min-h-screen bg-[#f5f5f5]">
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
