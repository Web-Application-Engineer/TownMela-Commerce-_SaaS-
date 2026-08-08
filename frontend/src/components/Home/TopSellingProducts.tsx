"use client";

import ProductCarousel from "../Products/ProductCarousel";

import type {
  Product,
} from "../../types/product";

/* =========================================================
   COMPONENT PROPS
========================================================= */

type TopSellingProductsProps = {
  initialProducts: Product[];
  initialError?: string | null;
};

/* =========================================================
   TOP SELLING PRODUCTS

   Product layout:
   src/components/Products/ProductCard.tsx

   Cart and Buy Now logic:
   src/hooks/useProductActions.ts

   Carousel behavior:
   src/components/Products/ProductCarousel.tsx
========================================================= */

export default function TopSellingProducts({
  initialProducts,
  initialError = null,
}: TopSellingProductsProps) {
  /* =======================================================
     ERROR UI
  ======================================================= */

  if (initialError) {
    return (
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="font-medium text-red-600">
              {initialError}
            </p>

            <p className="mt-1 text-sm text-red-500">
              Please make sure the
              TownMela backend server is
              running.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     SHARED CAROUSEL
  ======================================================= */

  return (
    <ProductCarousel
      products={initialProducts}
      title="Top Selling"
      showAllText="Show All"
      showAllLink="/shop"
      autoSlide
      autoSlideInterval={4000}
      emptyMessage="No products found."
    />
  );
}