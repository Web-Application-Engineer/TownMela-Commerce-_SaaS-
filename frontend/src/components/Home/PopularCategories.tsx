"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  LoaderCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

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
  categoryId?: string | CategoryReference;
  categoryName?: string;
  categorySlug?: string;
  thumbnail?: string;
  image?: string;
  link?: string;
  order?: number;
  active?: boolean;
};

type PopularCategoriesApiResponse = {
  success?: boolean;
  popularCategories?: PopularCategoryApiItem[];
  data?: PopularCategoryApiItem[];
  message?: string;
};

type PopularCategory = {
  id: string;
  name: string;
  image: string;
  link: string;
  order: number;
};

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

const POPULAR_CATEGORIES_ENDPOINT =
  `${API_BASE_URL}/api/popular-categories?active=true`;

const FALLBACK_IMAGE =
  "/images/category-images/category-placeholder.webp";

const CARD_GAP = 12;

/* =========================================================
   HELPERS
========================================================= */

function getCategoryReference(
  item: PopularCategoryApiItem
): CategoryReference | null {
  if (
    item.categoryId &&
    typeof item.categoryId === "object"
  ) {
    return item.categoryId;
  }

  return null;
}

function normalizePopularCategory(
  item: PopularCategoryApiItem,
  index: number
): PopularCategory | null {
  const category = getCategoryReference(item);

  const rawCategoryId =
    typeof item.categoryId === "string"
      ? item.categoryId
      : category?._id || category?.id || "";

  const slug =
    item.categorySlug?.trim() ||
    category?.slug?.trim() ||
    "";

  const name =
    item.displayName?.trim() ||
    item.categoryName?.trim() ||
    category?.name?.trim() ||
    "";

  if (!name) {
    return null;
  }

  const image =
    item.thumbnail?.trim() ||
    item.image?.trim() ||
    category?.thumbnail?.trim() ||
    FALLBACK_IMAGE;

  const link =
    item.link?.trim() ||
    (slug
      ? `/category/${encodeURIComponent(slug)}`
      : rawCategoryId
        ? `/category/${encodeURIComponent(rawCategoryId)}`
        : "/shop");

  return {
    id: String(
      item._id ||
        item.id ||
        rawCategoryId ||
        `${name}-${index}`
    ),
    name,
    image,
    link,
    order:
      typeof item.order === "number"
        ? item.order
        : index,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function PopularCategories() {
  const [categories, setCategories] = useState<
    PopularCategory[]
  >([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [itemsPerView, setItemsPerView] =
    useState(6);

  const [isPaused, setIsPaused] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [failedImages, setFailedImages] =
    useState<Record<string, boolean>>({});

  /* =======================================================
     LOAD POPULAR CATEGORIES
  ======================================================= */

  const loadPopularCategories =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          POPULAR_CATEGORIES_ENDPOINT,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as
            PopularCategoriesApiResponse;

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message ||
              "Popular categories could not be loaded."
          );
        }

        const sourceItems = Array.isArray(
          result.popularCategories
        )
          ? result.popularCategories
          : Array.isArray(result.data)
            ? result.data
            : [];

        const normalizedCategories = sourceItems
          .filter((item) => item.active !== false)
          .map(normalizePopularCategory)
          .filter(
            (
              item
            ): item is PopularCategory =>
              item !== null
          )
          .sort((firstItem, secondItem) => {
            if (
              firstItem.order !== secondItem.order
            ) {
              return (
                firstItem.order -
                secondItem.order
              );
            }

            return firstItem.name.localeCompare(
              secondItem.name
            );
          });

        setCategories(normalizedCategories);
        setCurrentIndex(0);
      } catch (error) {
        setCategories([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Popular categories could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadPopularCategories();
  }, [loadPopularCategories]);

  /* =======================================================
     RESPONSIVE ITEMS PER VIEW
  ======================================================= */

  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth;

      if (width < 480) {
        setItemsPerView(1);
      } else if (width < 768) {
        setItemsPerView(2);
      } else if (width < 1024) {
        setItemsPerView(4);
      } else if (width < 1280) {
        setItemsPerView(5);
      } else {
        setItemsPerView(6);
      }
    };

    updateItemsPerView();

    window.addEventListener(
      "resize",
      updateItemsPerView
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateItemsPerView
      );
    };
  }, []);

  /* =======================================================
     CAROUSEL CALCULATIONS
  ======================================================= */

  const maxIndex = useMemo(
    () =>
      Math.max(
        categories.length - itemsPerView,
        0
      ),
    [categories.length, itemsPerView]
  );

  useEffect(() => {
    setCurrentIndex((previousIndex) =>
      Math.min(previousIndex, maxIndex)
    );
  }, [maxIndex]);

  useEffect(() => {
    if (
      isPaused ||
      isLoading ||
      maxIndex === 0
    ) {
      return;
    }

    const intervalId = window.setInterval(
      () => {
        setCurrentIndex((previousIndex) =>
          previousIndex >= maxIndex
            ? 0
            : previousIndex + 1
        );
      },
      3000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLoading, isPaused, maxIndex]);

  const handlePrevious = () => {
    setCurrentIndex((previousIndex) =>
      previousIndex <= 0
        ? maxIndex
        : previousIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((previousIndex) =>
      previousIndex >= maxIndex
        ? 0
        : previousIndex + 1
    );
  };

  const totalGap =
    CARD_GAP * (itemsPerView - 1);

  const cardWidth = `calc(
    (100% - ${totalGap}px) / ${itemsPerView}
  )`;

  const slideTransform = `translateX(
    calc(
      -${currentIndex} *
      (
        (100% - ${totalGap}px) / ${itemsPerView}
        + ${CARD_GAP}px
      )
    )
  )`;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="w-full px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
      <div className="mx-auto w-full max-w-[1450px]">
        {/* ===============================================
            SECTION HEADER
        =============================================== */}

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#0B1F3A] sm:text-2xl lg:text-3xl">
              Popular Categories
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Explore our most popular product
              categories
            </p>
          </div>

          {maxIndex > 0 && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handlePrevious}
                aria-label="Previous categories"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 hover:border-[#FF6900] hover:bg-[#FF6900] hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next categories"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 hover:border-[#FF6900] hover:bg-[#FF6900] hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* ===============================================
            LOADING STATE
        =============================================== */}

        {isLoading && (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <LoaderCircle
                size={32}
                className="animate-spin text-[#FF6900]"
              />

              <p className="mt-3 text-sm font-medium text-gray-500">
                Loading popular categories...
              </p>
            </div>
          </div>
        )}

        {/* ===============================================
            ERROR STATE
        =============================================== */}

        {!isLoading && errorMessage && (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm">
            <div>
              <p className="text-sm font-semibold text-red-600">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => {
                  void loadPopularCategories();
                }}
                className="mt-4 rounded-lg bg-[#FF6900] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#e95f00]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ===============================================
            EMPTY STATE
        =============================================== */}

        {!isLoading &&
          !errorMessage &&
          categories.length === 0 && (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="flex flex-col items-center">
                <ImageOff
                  size={34}
                  className="text-gray-300"
                />

                <p className="mt-3 text-sm font-semibold text-gray-600">
                  No popular categories are
                  available yet.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Add and activate categories from
                  Homepage Management.
                </p>
              </div>
            </div>
          )}

        {/* ===============================================
            CAROUSEL
        =============================================== */}

        {!isLoading &&
          !errorMessage &&
          categories.length > 0 && (
            <>
              <div
                className="relative rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4"
                onMouseEnter={() =>
                  setIsPaused(true)
                }
                onMouseLeave={() =>
                  setIsPaused(false)
                }
              >
                <div className="w-full overflow-hidden">
                  <div
                    className="flex transition-transform duration-700 ease-in-out"
                    style={{
                      gap: `${CARD_GAP}px`,
                      transform: slideTransform,
                    }}
                  >
                    {categories.map((category) => {
                      const imageSource =
                        failedImages[category.id]
                          ? FALLBACK_IMAGE
                          : category.image;

                      return (
                        <div
                          key={category.id}
                          className="flex-none"
                          style={{
                            width: cardWidth,
                          }}
                        >
                          <Link
                            href={category.link}
                            className="group block text-center"
                          >
                            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-100 bg-[#FFF8F3] transition-all duration-300 group-hover:border-[#FF6900] group-hover:shadow-md">
                              <Image
                                src={imageSource}
                                alt={category.name}
                                fill
                                sizes="(max-width: 479px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 25vw, (max-width: 1279px) 20vw, 16.67vw"
                                className="object-contain p-3 transition-transform duration-500 group-hover:scale-110"
                                onError={() => {
                                  setFailedImages(
                                    (previousImages) => ({
                                      ...previousImages,
                                      [category.id]: true,
                                    })
                                  );
                                }}
                              />

                              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[#FF6900]/0 transition-colors duration-300 group-hover:bg-[#FF6900]/10" />
                            </div>

                            <h3 className="mt-2 line-clamp-2 min-h-[40px] text-xs font-semibold text-[#0B1F3A] transition-colors duration-300 group-hover:text-[#FF6900] sm:text-sm">
                              {category.name}
                            </h3>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {maxIndex > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevious}
                      aria-label="Previous categories"
                      className="absolute left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition-all duration-300 hover:bg-[#FF6900] hover:text-white sm:hidden"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next categories"
                      className="absolute right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition-all duration-300 hover:bg-[#FF6900] hover:text-white sm:hidden"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {maxIndex > 0 && (
                <div className="mt-4 flex justify-center gap-1.5">
                  {Array.from({
                    length: maxIndex + 1,
                  }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Go to category slide ${
                        index + 1
                      }`}
                      onClick={() =>
                        setCurrentIndex(index)
                      }
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentIndex === index
                          ? "w-6 bg-[#FF6900]"
                          : "w-2 bg-[#FF6900]/30 hover:bg-[#FF6900]/60"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
      </div>
    </section>
  );
}