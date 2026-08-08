"use client";

import ProductCarousel from "./ProductCarousel";

import type {
  Product,
} from "../../types/product";

/* =========================================================
   RELATED PRODUCT TYPE

   Existing files that import RelatedProduct will continue
   working, while the actual shared type comes from
   src/types/products.ts.
========================================================= */

export type RelatedProduct =
  Product;

/* =========================================================
   COMPONENT PROPS
========================================================= */

type RelatedProductsCarouselProps = {
  products: RelatedProduct[];

  title?: string;
  showAllText?: string;
  showAllLink?: string;

  autoSlide?: boolean;
  autoSlideInterval?: number;

  className?: string;
};

/* =========================================================
   RELATED PRODUCTS CAROUSEL

   Product layout:
   src/components/Products/ProductCard.tsx

   Cart and Buy Now logic:
   src/hooks/useProductActions.ts

   Carousel behavior:
   src/components/Products/ProductCarousel.tsx
========================================================= */

export default function RelatedProductsCarousel({
  products,

  title = "Related Products",

  showAllText = "Show All",
  showAllLink = "/shop",

  autoSlide = true,
  autoSlideInterval = 4000,

  className = "",
}: RelatedProductsCarouselProps) {
  /*
    আগের component-এর মতো related product না থাকলে
    section render হবে না।
  */
  if (products.length === 0) {
    return null;
  }

  return (
    <ProductCarousel
      products={products}
      title={title}
      showAllText={showAllText}
      showAllLink={showAllLink}
      autoSlide={autoSlide}
      autoSlideInterval={
        autoSlideInterval
      }
      sectionClassName={`
        mt-4
        border-t
        border-gray-200
        ${className}
      `}
    />
  );
}