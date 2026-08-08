"use client";

import ProductCard from "./ProductCard";

import type {
  ProductGridProps,
} from "../../types/product";

/* =========================================================
   SHARED PRODUCT GRID

   Shop Page:
   সব product responsive grid-এ দেখাবে।

   Category Page:
   selected category-এর সব product একই grid-এ দেখাবে।

   Related Products:
   related products একই ProductCard ব্যবহার করবে।

   Product layout বা cart logic এখানে থাকবে না।
   সব design ProductCard.tsx থেকে আসবে।
========================================================= */

export default function ProductGrid({
  products,
  emptyMessage = "No products found.",
  className = "",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center">
        <p className="text-sm font-semibold text-gray-500">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`
        grid
        grid-cols-1
        gap-3
        min-[520px]:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-2
        xl:grid-cols-3
        2xl:grid-cols-4
        ${className}
      `}
    >
      {products.map(
        (product, index) => (
          <ProductCard
            key={product._id}
            product={product}
            priority={index < 4}
            imageSizes="
              (max-width: 519px) 100vw,
              (max-width: 767px) 50vw,
              (max-width: 1023px) 33vw,
              (max-width: 1279px) 50vw,
              (max-width: 1535px) 33vw,
              25vw
            "
          />
        ),
      )}
    </div>
  );
}