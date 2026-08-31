

import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import ProductCard from "./ProductCard";

import type {
  Product,
} from "../../types/product";

/* =========================================================
   COMPONENT PROPS
========================================================= */

type RelatedProductsCarouselProps = {
  products: Product[];

  title?: string;

  showAllText?: string;
  showAllLink?: string;

  autoSlide?: boolean;
  autoSlideInterval?: number;

  emptyMessage?: string;

  sectionClassName?: string;
};

/* =========================================================
   SHARED PRODUCT CAROUSEL

   Exclusive Products, New Arrival, Top Selling,
   Women Fashion এবং অন্যান্য carousel section
   এই component ব্যবহার করবে।

   Product layout ও Cart/Buy Now logic এখানে নেই।
   সব shared ProductCard.tsx থেকে আসবে।
========================================================= */

export default function RelatedProductsCarousel({
  products,

  title = "Products",

  showAllText = "Show All",
  showAllLink = "/shop",

  autoSlide = true,
  autoSlideInterval = 4000,

  emptyMessage = "No products found.",

  sectionClassName = "",
}: RelatedProductsCarouselProps) {
  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    itemsPerView,
    setItemsPerView,
  ] = useState(5);

  const [
    isPaused,
    setIsPaused,
  ] = useState(false);

  const cardGap = 12;

  /* =======================================================
     RESPONSIVE ITEMS PER VIEW
  ======================================================= */

  useEffect(() => {
    const updateItemsPerView =
      () => {
        const screenWidth =
          window.innerWidth;

        if (screenWidth < 520) {
          setItemsPerView(1);
        } else if (
          screenWidth < 768
        ) {
          setItemsPerView(2);
        } else if (
          screenWidth < 1024
        ) {
          setItemsPerView(3);
        } else if (
          screenWidth < 1280
        ) {
          setItemsPerView(4);
        } else {
          setItemsPerView(5);
        }
      };

    updateItemsPerView();

    window.addEventListener(
      "resize",
      updateItemsPerView,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateItemsPerView,
      );
    };
  }, []);

  /* =======================================================
     MAXIMUM CAROUSEL INDEX
  ======================================================= */

  const maxIndex = Math.max(
    products.length -
      itemsPerView,
    0,
  );

  /* =======================================================
     KEEP CURRENT INDEX VALID
  ======================================================= */

  useEffect(() => {
    setCurrentIndex(
      (previousIndex) =>
        Math.min(
          previousIndex,
          maxIndex,
        ),
    );
  }, [maxIndex]);

  /* =======================================================
     AUTO SLIDE
  ======================================================= */

  useEffect(() => {
    if (
      !autoSlide ||
      isPaused ||
      maxIndex === 0 ||
      products.length === 0
    ) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        setCurrentIndex(
          (previousIndex) =>
            previousIndex >=
            maxIndex
              ? 0
              : previousIndex +
                1,
        );
      }, autoSlideInterval);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    autoSlide,
    autoSlideInterval,
    isPaused,
    maxIndex,
    products.length,
  ]);

  /* =======================================================
     CAROUSEL MOVEMENT
  ======================================================= */

  const handlePrevious = () => {
    setCurrentIndex(
      (previousIndex) =>
        previousIndex <= 0
          ? maxIndex
          : previousIndex - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex(
      (previousIndex) =>
        previousIndex >=
        maxIndex
          ? 0
          : previousIndex + 1,
    );
  };

  /* =======================================================
     EXACT CARD WIDTH
  ======================================================= */

  const totalGap =
    cardGap *
    (itemsPerView - 1);

  const cardWidth = `calc(
    (100% - ${totalGap}px) /
    ${itemsPerView}
  )`;

  /* =======================================================
     EXACT SLIDE TRANSFORM
  ======================================================= */

  const slideTransform = `translateX(
    calc(
      -${currentIndex} *
      (
        (100% - ${totalGap}px) /
        ${itemsPerView}
        + ${cardGap}px
      )
    )
  )`;

  /* =======================================================
     RELATED PRODUCTS RESPONSIVE PRESENTATION
  ======================================================= */

  const isRelatedProductsSection =
    title
      .trim()
      .toLowerCase() ===
    "related products";

  /*
   * Product details currently passes "Show All".
   * For the Related Products section we display the
   * requested compact wording "See All" without changing
   * other usages such as Special Offers.
   */
  const resolvedShowAllText =
    isRelatedProductsSection &&
    showAllText
      .trim()
      .toLowerCase() ===
      "show all"
      ? "See All"
      : showAllText;

  /*
   * MobileBottomNav is fixed at the bottom of the viewport.
   * Give only Related Products extra safe space so the final
   * product card never sits underneath the navigation bar.
   */
  const sectionSpacingClass =
    isRelatedProductsSection
      ? "pt-5 pb-24 sm:pt-6 md:pb-10 lg:pt-8"
      : "py-6 lg:py-8";

  /* =======================================================
     EMPTY PRODUCTS UI
  ======================================================= */

  if (products.length === 0) {
    return (
      <section
        className={`w-full px-2 sm:px-4 lg:px-5 ${sectionSpacingClass} ${sectionClassName}`}
      >
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="font-semibold text-gray-700">
              {emptyMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <section
      className={`w-full px-2 sm:px-4 lg:px-5 ${sectionSpacingClass} ${sectionClassName}`}
    >
      <div className="mx-auto w-full max-w-[1450px] rounded-[10px] bg-gray-200 p-3 sm:p-4">
        {/* Section Header */}

        <div className="mb-4 flex w-full min-w-0 items-center justify-between gap-2 sm:mb-5 sm:gap-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold leading-tight text-[#0B1F3A] min-[390px]:text-xl sm:text-2xl lg:text-3xl">
            {title}
          </h2>

          <Link
            href={showAllLink}
            className="
              inline-flex
              min-h-9
              shrink-0
              items-center
              justify-center
              gap-1
              whitespace-nowrap
              rounded-full
              border-2
              border-[#FF6900]
              bg-[#0B1F3A]/70
              px-3
              py-1.5
              text-xs
              font-semibold
              leading-none
              text-white/90
              transition-all
              duration-200
              hover:border-[#0B1F3A]/70
              hover:bg-amber-50
              hover:text-[#FF6900]
              sm:min-h-10
              sm:px-4
              sm:py-2
              sm:text-sm
            "
          >
            {resolvedShowAllText}

            <ChevronRight
              size={15}
              className="shrink-0 sm:h-4 sm:w-4"
            />
          </Link>
        </div>

        {/* Product Carousel */}

        <div
          className="relative"
          onMouseEnter={() =>
            setIsPaused(true)
          }
          onMouseLeave={() =>
            setIsPaused(false)
          }
        >
          {/* Carousel Viewport */}

          <div className="w-full overflow-hidden">
            {/* Carousel Track */}

            <div
              className="
                flex
                py-3
                transition-transform
                duration-700
                ease-in-out
              "
              style={{
                gap: `${cardGap}px`,
                transform:
                  slideTransform,
              }}
            >
              {products.map(
                (
                  product,
                  index,
                ) => (
                  <div
                    key={
                      product._id
                    }
                    className="flex-none"
                    style={{
                      width:
                        cardWidth,
                    }}
                  >
                    <ProductCard
                      product={
                        product
                      }
                      priority={
                        index <
                        itemsPerView
                      }
                      className="h-full"
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Left Arrow */}

          {maxIndex > 0 && (
            <button
              type="button"
              onClick={
                handlePrevious
              }
              aria-label="Previous products"
              className="
                absolute
                left-1
                top-1/2
                z-30
                flex
                h-9
                w-9
                sm:left-2
                sm:h-11
                sm:w-11
                -translate-y-1/2
                items-center
                justify-center
                rounded-md
                border
                border-gray-200
                bg-white
                text-[#444]
                shadow-sm
                transition-all
                duration-300
                hover:border-[#FF6900]
                hover:bg-[#FF6900]
                hover:text-white
              "
            >
              <ChevronLeft
                size={22}
              />
            </button>
          )}

          {/* Right Arrow */}

          {maxIndex > 0 && (
            <button
              type="button"
              onClick={
                handleNext
              }
              aria-label="Next products"
              className="
                absolute
                right-1
                top-1/2
                z-30
                flex
                h-9
                w-9
                sm:right-2
                sm:h-11
                sm:w-11
                -translate-y-1/2
                items-center
                justify-center
                rounded-md
                border
                border-gray-200
                bg-white
                text-[#444]
                shadow-sm
                transition-all
                duration-300
                hover:border-[#FF6900]
                hover:bg-[#FF6900]
                hover:text-white
              "
            >
              <ChevronRight
                size={22}
              />
            </button>
          )}
        </div>

        {/* Pagination Dots */}

        {maxIndex > 0 && (
          <div className="mt-5 flex justify-center gap-1.5">
            {Array.from({
              length:
                maxIndex + 1,
            }).map(
              (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to product slide ${
                    index + 1
                  }`}
                  onClick={() =>
                    setCurrentIndex(
                      index,
                    )
                  }
                  className={`
                    h-2
                    rounded-full
                    transition-all
                    duration-300

                    ${
                      currentIndex ===
                      index
                        ? "w-6 bg-[#FF6900]"
                        : "w-2 bg-[#FF6900]/30 hover:bg-[#FF6900]/60"
                    }
                  `}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}