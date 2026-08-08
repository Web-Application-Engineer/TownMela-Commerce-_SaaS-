"use client";

import Link from "next/link";
import {
  ChevronRight,
  FolderTree,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const RAW_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_URL.endsWith("/api")
  ? RAW_API_URL
  : `${RAW_API_URL}/api`;

const ENDPOINT =
  `${API_BASE_URL}/homepage-category-showcases`;

const UPDATED_EVENT =
  "homepage:category-showcases-updated";

const STORAGE_KEY =
  "townmela:category-showcases-updated";

const CHANNEL_NAME =
  "townmela-homepage-management";

/* =========================================================
   TYPES
========================================================= */

type ShowcaseCategory = {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  featured?: boolean;
  status?: boolean;
};

type ShowcaseSlots = {
  title?: string;
  categoryOne: ShowcaseCategory | null;
  categoryTwo: ShowcaseCategory | null;
  categoryThree: ShowcaseCategory | null;
};

type ShowcaseConfig = {
  _id: string;
  key: "homepage-category-showcase";
  showcaseOne: ShowcaseSlots;
  showcaseTwo: ShowcaseSlots;
  showcaseThree: ShowcaseSlots;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  success: boolean;
  showcaseConfig?: ShowcaseConfig;
  message?: string;
};

export type CategoryShowcaseKey =
  | "showcaseOne"
  | "showcaseTwo"
  | "showcaseThree";

type CategoryShowcaseProps = {
  showcaseKey: CategoryShowcaseKey;
  title?: string;
  showAllText?: string;
  showAllLink?: string;
  emptyMessage?: string;
};

/* =========================================================
   RESPONSE HELPER
========================================================= */

const readJsonResponse = async <T,>(
  response: Response
): Promise<T> => {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      text ||
        `Unexpected server response (${response.status}).`
    );
  }

  return (await response.json()) as T;
};

/* =========================================================
   SHARED CATEGORY SHOWCASE
========================================================= */

export default function CategoryShowcase({
  showcaseKey,
  title = "Explore Categories",
  showAllText = "Show All",
  showAllLink = "/categories",
  emptyMessage,
}: CategoryShowcaseProps) {
  const [showcaseSlots, setShowcaseSlots] =
    useState<ShowcaseSlots | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [failedImages, setFailedImages] =
    useState<Record<string, boolean>>({});

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadShowcase = useCallback(
    async (options?: {
      silent?: boolean;
      signal?: AbortSignal;
    }) => {
      const silent = options?.silent === true;

      try {
        if (!silent) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const response = await fetch(ENDPOINT, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: options?.signal,
        });

        const data =
          await readJsonResponse<ApiResponse>(
            response
          );

        if (
          !response.ok ||
          !data.success ||
          !data.showcaseConfig
        ) {
          throw new Error(
            data.message ||
              "Category showcase could not be loaded."
          );
        }

        setShowcaseSlots(
          data.showcaseConfig[showcaseKey]
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          `${showcaseKey} loading error:`,
          error
        );

        if (!silent) {
          setShowcaseSlots(null);
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the category showcase."
        );
      } finally {
        if (!silent && !options?.signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [showcaseKey]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadShowcase({
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [loadShowcase]);

  /* =======================================================
     LIVE SYNC
  ======================================================= */

  useEffect(() => {
    const refresh = () => {
      void loadShowcase({ silent: true });
    };

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (event.key === STORAGE_KEY) {
        refresh();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener(
      UPDATED_EVENT,
      refresh
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "focus",
      refresh
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    let channel: BroadcastChannel | null = null;

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(
        CHANNEL_NAME
      );

      channel.addEventListener(
        "message",
        refresh
      );
    }

    return () => {
      window.removeEventListener(
        UPDATED_EVENT,
        refresh
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      channel?.removeEventListener(
        "message",
        refresh
      );

      channel?.close();
    };
  }, [loadShowcase]);

  /* =======================================================
     ACTIVE CATEGORIES + DYNAMIC TITLE
  ======================================================= */

  const showcaseTitle =
    showcaseSlots?.title?.trim() ||
    title ||
    "Explore Categories";

  const categories = useMemo(() => {
    if (!showcaseSlots) {
      return [];
    }

    return [
      showcaseSlots.categoryOne,
      showcaseSlots.categoryTwo,
      showcaseSlots.categoryThree,
    ].filter(
      (
        category
      ): category is ShowcaseCategory =>
        Boolean(category?._id) &&
        category?.status !== false
    );
  }, [showcaseSlots]);

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (isLoading) {
    return (
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="flex min-h-[280px] flex-col items-center justify-center border border-gray-200 bg-[#E5E7EB] px-5 py-10 text-center">
            <LoaderCircle
              size={38}
              className="animate-spin text-[#FF6900]"
              aria-hidden="true"
            />

            <p className="mt-4 text-sm font-bold text-gray-500">
              Loading category showcase...
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     EMPTY OR ERROR STATE
  ======================================================= */

  if (categories.length === 0) {
    return (
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          <div className="flex min-h-[280px] flex-col items-center justify-center border border-gray-200 bg-[#E5E7EB] px-5 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <FolderTree
                size={29}
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
              No Category Found
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              {errorMessage ||
                emptyMessage ||
                "Select and save categories from the Admin Dashboard."}
            </p>

            {errorMessage && (
              <button
                type="button"
                onClick={() => {
                  void loadShowcase();
                }}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6900] px-4 text-sm font-bold text-white transition hover:bg-[#e85f00]"
              >
                <RefreshCw
                  size={16}
                  aria-hidden="true"
                />

                Try Again
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px] rounded-[10px] bg-[#E5E7EB] p-4 sm:p-5 lg:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#0B1F3A] sm:text-2xl lg:text-3xl">
              {showcaseTitle}
            </h2>
          </div>

          <Link
            href={showAllLink}
            className="
              group/show-all
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-1.5
              rounded-full
              border-2
              border-[#FF6900]
              bg-[#334155]
              px-4
              text-sm
              font-bold
              text-white
              transition-all
              duration-300
              hover:border-[#64748B]
              hover:bg-[#FFF7E8]
              hover:text-[#FF6900]
            "
          >
            {showAllText}

            <ChevronRight
              size={16}
              strokeWidth={2.4}
              aria-hidden="true"
              className="
                transition-transform
                duration-300
                group-hover/show-all:translate-x-0.5
              "
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const showImage =
              Boolean(category.thumbnail?.trim()) &&
              !failedImages[category._id];

            return (
              <Link
                key={category._id}
                href={`/category/${encodeURIComponent(
                  category.slug
                )}`}
                aria-label={`View ${category.name} category`}
                className="group relative block aspect-square w-full overflow-hidden bg-white"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-orange-50 text-[#FF6900]">
                  <FolderTree
                    size={48}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                {showImage && (
                  <img
                    src={category.thumbnail}
                    alt={category.name}
                    loading="lazy"
                    onError={() => {
                      setFailedImages(
                        (currentImages) => ({
                          ...currentImages,
                          [category._id]: true,
                        })
                      );
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-30" />

                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-5 sm:pb-6">
                  <h3 className="text-center text-lg font-bold text-[#FF6900] transition-colors duration-300 group-hover:text-[#0B1F3A]">
                    {category.name}
                  </h3>
                </div>

                <div className="pointer-events-none absolute inset-0 border border-white/10 transition-colors duration-300 group-hover:border-[#0B1F3A]/25" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}