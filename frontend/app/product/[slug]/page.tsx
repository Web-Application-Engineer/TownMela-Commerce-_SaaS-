import { notFound } from "next/navigation";
import { headers } from "next/headers";

import ProductDetailsClient from "../../../src/components/ProductDetails/ProductDetailsClient";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

/* =========================================================
   PRODUCT TYPE
========================================================= */

export type Product = {
  _id: string;
  name: string;
  slug: string;

  price: number;
  oldPrice?: number;

  rating?: number;

  description?: string;
  features?: string[];

  image: string;
  images?: string[];

  sizes?: string[];
  colors?: string[];

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
   PRODUCTS API RESPONSE TYPE
========================================================= */

type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      results?: Product[];
      items?: Product[];
      data?: Product[];
      message?: string;
    };

/* =========================================================
   PAGE PROPS TYPE
========================================================= */

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

/* =========================================================
   FETCH ALL PRODUCTS
========================================================= */

async function getProducts(): Promise<Product[]> {
  try {
    const requestHeaders =
      await headers();

    const forwardedHost =
      requestHeaders
        .get("x-forwarded-host")
        ?.split(",")[0]
        ?.trim() ?? "";

    const host =
      forwardedHost ||
      requestHeaders
        .get("host")
        ?.trim() ||
      "";

    const normalizedHost =
      host.toLowerCase();

    const isLocalRequest =
      !normalizedHost ||
      normalizedHost.startsWith(
        "localhost"
      ) ||
      normalizedHost.startsWith(
        "127.0.0.1"
      ) ||
      normalizedHost.startsWith(
        "[::1]"
      ) ||
      normalizedHost.startsWith(
        "::1"
      );

    const forwardedProto =
      requestHeaders
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim();

    const protocol =
      forwardedProto ||
      (isLocalRequest
        ? "http"
        : "https");

    const apiBaseUrl =
      !isLocalRequest && host
        ? `${protocol}://${host}`.replace(
            /\/$/,
            ""
          )
        : API_BASE_URL;

    const tenantId =
      isLocalRequest
        ? TENANT_ID
        : "";

    if (
      isLocalRequest &&
      !tenantId
    ) {
      console.error(
        "NEXT_PUBLIC_TENANT_ID is missing for local development."
      );

      return [];
    }

    const response = await fetch(
      `${apiBaseUrl}/api/products`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
          ...(tenantId
            ? {
                "X-Tenant-Id":
                  tenantId,
              }
            : {}),
        },
        cache: "no-store",
      }
    );

    const data: ProductsApiResponse =
      await response.json();

    if (!response.ok) {
      const message =
        !Array.isArray(data) &&
        data.message
          ? data.message
          : `Failed to fetch products. Status: ${response.status}`;

      console.error(message);

      return [];
    }

    if (Array.isArray(data)) {
      return data;
    }

    return (
      data.products ??
      data.results ??
      data.items ??
      data.data ??
      []
    );
  } catch (error) {
    console.error(
      "Products fetch error:",
      error
    );

    return [];
  }
}

/* =========================================================
   GET CATEGORY ID
========================================================= */

function getCategoryId(
  product: Product
): string | undefined {
  if (!product.category) {
    return undefined;
  }

  if (
    typeof product.category === "object"
  ) {
    return product.category._id;
  }

  return product.category;
}

/* =========================================================
   PRODUCT PAGE
========================================================= */

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const decodedSlug =
    decodeURIComponent(slug);

  const products = await getProducts();

  const product = products.find(
    (item) =>
      item.slug === decodedSlug
  );

  if (!product) {
    console.error(
      `Product not found for slug: ${decodedSlug}`
    );

    notFound();
  }

  const currentCategoryId =
    getCategoryId(product);

  const relatedProducts =
    currentCategoryId
      ? products
          .filter((item) => {
            const itemCategoryId =
              getCategoryId(item);

            return (
              item._id !== product._id &&
              itemCategoryId ===
                currentCategoryId
            );
          })
          .slice(0, 5)
      : [];

  return (
    <ProductDetailsClient
      product={product}
      relatedProducts={
        relatedProducts
      }
    />
  );
}