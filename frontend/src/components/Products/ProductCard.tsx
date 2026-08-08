"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Check,
  LoaderCircle,
  ShoppingCart,
  Star,
} from "lucide-react";

import type {
  ProductCardProps,
} from "../../types/product";

import {
  useProductActions,
} from "../../hooks/useProductActions";

import {
  formatProductPrice,
  getDiscountPercentage,
  getProductRating,
  hasProductDiscount,
} from "../../utils/productHelpers";

/* =========================================================
   STAR RATING COMPONENT
========================================================= */

function RatingStars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <Star
            key={index}
            size={14}
            className={
              index <
              Math.round(rating)
                ? "fill-[#F4C018] text-[#F4C018]"
                : "fill-gray-200 text-gray-200"
            }
          />
        ))}
      </div>

      <span className="text-sm font-medium text-[#111827]">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

/* =========================================================
   SHARED PRODUCT CARD

   Finalized ExclusiveProducts.tsx card-এর exact
   layout এবং style এখানে রাখা হয়েছে।

   Cart ও Buy Now behavior shared
   useProductActions hook থেকে আসবে।
========================================================= */

export default function ProductCard({
  product,
  priority = false,
  imageSizes = `
    (max-width: 519px) 100vw,
    (max-width: 767px) 50vw,
    (max-width: 1023px) 33vw,
    (max-width: 1279px) 25vw,
    20vw
  `,
  className = "",
}: ProductCardProps) {
  const {
    productLink,
    needsOptions,
    isOutOfStock,

    isAdding,
    isBuying,
    isAdded,

    handleCartButtonClick,
    handleBuyNow,
  } = useProductActions(
    product,
  );

  const productRating =
    getProductRating(
      product,
    );

  const hasDiscount =
    hasProductDiscount(
      product,
    );

  const discountPercentage =
    getDiscountPercentage(
      product,
    );

  const cartButtonLabel =
    isOutOfStock
      ? `${product.name} is out of stock`
      : needsOptions
        ? `Choose options for ${product.name}`
        : `Add ${product.name} to cart`;

  const cartButtonTitle =
    isOutOfStock
      ? "Out of stock"
      : needsOptions
        ? "Choose size or color"
        : "Add to cart";

  return (
    <article
      className={`
        rounded-2xl
        border
        border-gray-200
        bg-white
        p-3
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-md
        ${className}
      `}
    >
      {/* ===============================
          PRODUCT IMAGE AREA
      =============================== */}

      <div
        className="
          group
          relative
          mx-auto
          aspect-[4/4.2]
          w-full
          overflow-hidden
          rounded-[5px]
          bg-white
        "
      >
        {/* PRODUCT IMAGE */}

        <Link
          href={productLink}
          className="absolute inset-3 overflow-hidden rounded-[5px]"
          aria-label={`View ${product.name}`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority={priority}
              sizes={imageSizes}
              className="
                object-cover
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 px-3 text-center text-sm font-semibold text-gray-400">
              No Image
            </div>
          )}
        </Link>

        {/* DISCOUNT LABEL */}

        {hasDiscount && (
          <div
            className="
              absolute
              right-3
              top-16
              z-30
              flex
              h-11
              w-11
              flex-col
              items-center
              justify-center
              rounded-full
              bg-red-500
              text-center
              text-white
              shadow-md
            "
          >
            <span className="text-sm font-bold leading-none">
              {discountPercentage}%
            </span>

            <span className="mt-1 text-[10px] font-semibold leading-none">
              OFF
            </span>
          </div>
        )}

        {/* DESKTOP HOVER OVERLAY */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            hidden
            bg-black/0
            transition-all
            duration-300
            group-hover:bg-black/10
            lg:block
          "
        />

        {/* CART BUTTON */}

        <button
          type="button"
          onClick={
            handleCartButtonClick
          }
          disabled={
            isAdding ||
            isBuying ||
            isOutOfStock
          }
          aria-label={
            cartButtonLabel
          }
          title={
            cartButtonTitle
          }
          className="
            absolute
            right-3
            top-3
            z-30
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            bg-[#FF6900]
            text-white
            shadow-lg
            transition-all
            duration-300
            hover:bg-[#e85f00]
            disabled:cursor-not-allowed
            disabled:bg-gray-400
            disabled:opacity-70
          "
        >
          {isAdding ? (
            <LoaderCircle
              size={21}
              className="animate-spin"
            />
          ) : isAdded ? (
            <Check size={21} />
          ) : (
            <ShoppingCart
              size={20}
            />
          )}
        </button>
      </div>

      {/* ===============================
          PRODUCT NAME
      =============================== */}

      <Link href={productLink}>
        <h3
          className="
            mt-2
            line-clamp-2
            min-h-[44px]
            text-center
            text-[18px]
            font-semibold
            leading-6
            text-[#4B4B63]
            transition-colors
            duration-300
            hover:text-[#FF6900]
          "
        >
          {product.name}
        </h3>
      </Link>

      {/* ===============================
          PRICE AREA
      =============================== */}

      <div
        className="
          mt-1
          flex
          flex-wrap
          items-center
          justify-center
          gap-2
        "
      >
        <span className="text-[18px] font-bold text-[#FF6900]">
          {formatProductPrice(
            product.price,
          )}
        </span>

        {product.oldPrice !==
          undefined &&
          product.oldPrice >
            0 && (
            <span className="text-sm text-gray-400 line-through">
              {formatProductPrice(
                product.oldPrice,
              )}
            </span>
          )}
      </div>

      {/* ===============================
          RATING
      =============================== */}

      <div className="mt-3 flex justify-center">
        <RatingStars
          rating={
            productRating
          }
        />
      </div>

      {/* ===============================
          BUY NOW BUTTON
      =============================== */}

      <button
        type="button"
        onClick={
          handleBuyNow
        }
        disabled={
          isAdding ||
          isBuying ||
          isOutOfStock
        }
        className="
          mt-5
          flex
          h-11
          w-full
          items-center
          justify-center
          gap-2
          rounded-full
          border
          border-[#FF6900]
          bg-[#fef0e8]
          text-sm
          font-semibold
          text-[#FF6900]
          transition-all
          duration-300
          hover:bg-[#FF6900]
          hover:text-white
          disabled:cursor-not-allowed
          disabled:border-gray-300
          disabled:bg-gray-100
          disabled:text-gray-400
        "
      >
        {isBuying ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Processing...
          </>
        ) : (
          "Buy Now"
        )}
      </button>
    </article>
  );
}