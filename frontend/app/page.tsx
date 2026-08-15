import Hero from "@/src/components/Hero";
import PopularCategories from "@/src/components/Home/PopularCategories";
import HomepageProductSections from "@/src/components/Home/HomepageProductSections";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TENANT CONFIGURATION
========================================================= */

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ??
  "";

/* =========================================================
   PRODUCT TYPE
========================================================= */

type Product = {
  _id: string;

  name: string;

  slug?: string;

  price: number;

  oldPrice?: number;

  rating?: number;

  description?: string;

  image: string;

  stock?: number;

  category?:
    | string
    | {
        _id: string;
        name: string;
        slug?: string;
      };
};

/* =========================================================
   PRODUCTS API RESPONSE
========================================================= */

type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      message?: string;
    };

type ProductsResult = {
  products: Product[];
  error: string | null;
};

/* =========================================================
   FETCH PRODUCTS ON SERVER
========================================================= */

async function getProducts(): Promise<ProductsResult> {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/products`,
        {
          headers: {
            Accept:
              "application/json",

            ...(TENANT_ID
              ? {
                  "X-Tenant-Id":
                    TENANT_ID,
                }
              : {}),
          },

          /*
           * Development এবং live product
           * update-এর জন্য fresh data.
           */
          cache:
            "no-store",
        },
      );

    if (
      !response.ok
    ) {
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
   HOME PAGE
========================================================= */

export default async function Home() {
  const {
    products,
    error,
  } =
    await getProducts();

  return (
    <main className="min-h-screen bg-[#f5f5f5]">
      <Hero />

      <PopularCategories />

      <HomepageProductSections
        initialProducts={
          products
        }
        initialError={
          error
        }
      />
    </main>
  );
}