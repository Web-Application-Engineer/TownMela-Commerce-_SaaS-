"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import StockClearanceHeroTimer from "./StockClearance/StockClearanceHeroTimer";
import StockClearancePopup from "./StockClearance/StockClearancePopup";

/* =========================================================
   HOMEPAGE BANNER TYPES
========================================================= */

type HomepageBannerType =
  | "main"
  | "sideTop"
  | "sideBottom";

export type HomepageBanner = {
  _id: string;
  title: string;
  image: string;
  link: string;
  altText: string;
  order: number;
  active: boolean;
  type: HomepageBannerType;
};

type HomepageBannersApiResponse = {
  success: boolean;
  homepageBanners?: HomepageBanner[];
  message?: string;
};

type DisplayBanner = {
  id: string;
  title: string;
  image: string;
  alt: string;
  link: string;
};

type HeroProps = {
  initialBanners?: HomepageBanner[];
  initialError?: string | null;
};

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

/* =========================================================
   RESPONSE HELPER
========================================================= */

const readJsonResponse = async <T,>(
  response: Response
): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      "The server returned an invalid JSON response."
    );
  }
};

/* =========================================================
   BANNER HELPERS
========================================================= */

const sortBannersByOrder = (
  banners: HomepageBanner[]
) =>
  [...banners].sort(
    (firstBanner, secondBanner) => {
      const orderDifference =
        Number(firstBanner.order) -
        Number(secondBanner.order);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return firstBanner.title.localeCompare(
        secondBanner.title
      );
    }
  );

const getActiveSortedBanners = (
  banners: HomepageBanner[]
) =>
  sortBannersByOrder(
    banners.filter(
      (banner) =>
        banner.active === true &&
        Boolean(banner._id) &&
        Boolean(
          banner.image?.trim()
        )
    )
  );

const mapToDisplayBanner = (
  banner: HomepageBanner
): DisplayBanner => ({
  id: banner._id,
  title:
    banner.title?.trim() ||
    "TownMela Offer",
  image: banner.image.trim(),
  alt:
    banner.altText?.trim() ||
    banner.title?.trim() ||
    "TownMela promotional banner",
  link:
    banner.link?.trim() ||
    "/shop",
});

/* =========================================================
   HERO COMPONENT
========================================================= */

export default function Hero({
  initialBanners,
  initialError = null,
}: HeroProps) {
  const hasInitialBannerPayload =
    initialBanners !== undefined;

  const initialSortedBanners =
    hasInitialBannerPayload
      ? getActiveSortedBanners(
          initialBanners
        )
      : [];

  /* =======================================================
     API BANNER STATES
  ======================================================= */

  const [
    mainBanners,
    setMainBanners,
  ] = useState<HomepageBanner[]>(
    () =>
      initialSortedBanners.filter(
        (banner) =>
          banner.type === "main"
      )
  );

  const [
    rightTopBanners,
    setRightTopBanners,
  ] = useState<HomepageBanner[]>(
    () =>
      initialSortedBanners.filter(
        (banner) =>
          banner.type ===
          "sideTop"
      )
  );

  const [
    rightBottomBanners,
    setRightBottomBanners,
  ] = useState<HomepageBanner[]>(
    () =>
      initialSortedBanners.filter(
        (banner) =>
          banner.type ===
          "sideBottom"
      )
  );

  const [
    isLoadingBanners,
    setIsLoadingBanners,
  ] = useState(
    !hasInitialBannerPayload
  );

  const [
    bannerLoadError,
    setBannerLoadError,
  ] = useState(
    initialError || ""
  );

  /* =======================================================
     CURRENT SLIDE STATES
  ======================================================= */

  const [
    leftSlide,
    setLeftSlide,
  ] = useState(0);

  const [
    bottomSlide,
    setBottomSlide,
  ] = useState(0);

  /* =======================================================
     PAUSE STATES
  ======================================================= */

  const [
    pauseLeft,
    setPauseLeft,
  ] = useState(false);

  const [
    pauseBottom,
    setPauseBottom,
  ] = useState(false);

  /* =======================================================
     LOAD ACTIVE HOMEPAGE BANNERS
  ======================================================= */

  useEffect(() => {
    if (
      hasInitialBannerPayload
    ) {
      return;
    }

    const controller =
      new AbortController();

    const loadHomepageBanners =
      async () => {
        try {
          setIsLoadingBanners(true);
          setBannerLoadError("");

const response = await fetch(
  `${API_URL}/api/homepage-banners?active=true`,
  {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(TENANT_ID
        ? {
            "X-Tenant-Id":
              TENANT_ID,
          }
        : {}),
    },
    cache: "no-store",
    signal: controller.signal,
  }
);

          const data =
            await readJsonResponse<HomepageBannersApiResponse>(
              response
            );

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Failed to load homepage banners."
            );
          }

          const sortedBanners =
            getActiveSortedBanners(
              Array.isArray(
                data.homepageBanners
              )
                ? data.homepageBanners
                : []
            );

          setMainBanners(
            sortedBanners.filter(
              (banner) =>
                banner.type === "main"
            )
          );

          setRightTopBanners(
            sortedBanners.filter(
              (banner) =>
                banner.type ===
                "sideTop"
            )
          );

          setRightBottomBanners(
            sortedBanners.filter(
              (banner) =>
                banner.type ===
                "sideBottom"
            )
          );
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Failed to load homepage banners:",
            error
          );

          setMainBanners([]);
          setRightTopBanners([]);
          setRightBottomBanners([]);

          setBannerLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load homepage banners."
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setIsLoadingBanners(
              false
            );
          }
        }
      };

    void loadHomepageBanners();

    return () => {
      controller.abort();
    };
  }, [
    hasInitialBannerPayload,
  ]);

  /* =======================================================
     DISPLAY BANNER ADAPTERS
  ======================================================= */

  const leftBanners =
    useMemo<DisplayBanner[]>(
      () =>
        mainBanners.map(
          mapToDisplayBanner
        ),
      [mainBanners]
    );

  const bottomRightBanners =
    useMemo<DisplayBanner[]>(
      () =>
        rightBottomBanners.map(
          mapToDisplayBanner
        ),
      [rightBottomBanners]
    );

  const rightTopBanner =
    useMemo<DisplayBanner | null>(
      () => {
        const firstBanner =
          rightTopBanners[0];

        return firstBanner
          ? mapToDisplayBanner(
              firstBanner
            )
          : null;
      },
      [rightTopBanners]
    );

  /* =======================================================
     RESET INVALID SLIDE INDEXES
  ======================================================= */

  useEffect(() => {
    if (
      leftBanners.length === 0
    ) {
      setLeftSlide(0);
      return;
    }

    setLeftSlide(
      (currentSlide) =>
        Math.min(
          currentSlide,
          leftBanners.length - 1
        )
    );
  }, [leftBanners.length]);

  useEffect(() => {
    if (
      bottomRightBanners.length ===
      0
    ) {
      setBottomSlide(0);
      return;
    }

    setBottomSlide(
      (currentSlide) =>
        Math.min(
          currentSlide,
          bottomRightBanners.length -
            1
        )
    );
  }, [bottomRightBanners.length]);

  /* =======================================================
     LEFT MAIN CAROUSEL AUTO SLIDE
  ======================================================= */

  useEffect(() => {
    if (
      pauseLeft ||
      leftBanners.length <= 1
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setLeftSlide(
          (previousSlide) =>
            (previousSlide + 1) %
            leftBanners.length
        );
      }, 4000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    pauseLeft,
    leftBanners.length,
  ]);

  /* =======================================================
     RIGHT BOTTOM CAROUSEL AUTO SLIDE
  ======================================================= */

  useEffect(() => {
    if (
      pauseBottom ||
      bottomRightBanners.length <=
        1
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setBottomSlide(
          (previousSlide) =>
            (previousSlide + 1) %
            bottomRightBanners.length
        );
      }, 3500);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    pauseBottom,
    bottomRightBanners.length,
  ]);

  return (
    <section className="w-full px-3 py-3 sm:px-4 lg:px-5">
      <div
        className="
          mx-auto
          grid
          w-full
          max-w-[1450px]
          grid-cols-1
          gap-3
          lg:grid-cols-[3fr_1fr]
        "
      >
        {/* =================================================
            LEFT MAIN CAROUSEL
        ================================================= */}

        <div
          className="
            relative
            aspect-[1080/550]
            w-full
            overflow-hidden
            rounded-md
            bg-gray-100
          "
          onMouseEnter={() =>
            setPauseLeft(true)
          }
          onMouseLeave={() =>
            setPauseLeft(false)
          }
        >
          {isLoadingBanners && (
            <div
              className="
                absolute
                inset-0
                z-30
                flex
                items-center
                justify-center
                bg-gray-100
              "
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <span
                  className="
                    h-9
                    w-9
                    animate-spin
                    rounded-full
                    border-4
                    border-gray-200
                    border-t-[#FF6900]
                  "
                />

                <p className="text-sm font-semibold text-gray-500">
                  Loading homepage
                  banners...
                </p>
              </div>
            </div>
          )}

          {!isLoadingBanners &&
            bannerLoadError && (
              <div
                className="
                  absolute
                  inset-0
                  z-30
                  flex
                  items-center
                  justify-center
                  bg-red-50
                  px-5
                  text-center
                "
              >
                <div>
                  <p className="text-sm font-bold text-red-600">
                    Unable to load
                    homepage banners
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-500">
                    {bannerLoadError}
                  </p>
                </div>
              </div>
            )}

          {!isLoadingBanners &&
            !bannerLoadError &&
            leftBanners.length ===
              0 && (
              <div
                className="
                  absolute
                  inset-0
                  z-20
                  flex
                  items-center
                  justify-center
                  bg-gradient-to-br
                  from-orange-50
                  via-white
                  to-gray-100
                  px-5
                  text-center
                "
              >
                <div>
                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-full
                      bg-[#FF6900]/10
                      text-xl
                      font-black
                      text-[#FF6900]
                    "
                  >
                    TM
                  </div>

                  <p className="mt-3 text-base font-black text-[#0B1F3A]">
                    No active main
                    banner
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Add and activate a
                    main banner from
                    Homepage Management.
                  </p>
                </div>
              </div>
            )}

          {!isLoadingBanners &&
            !bannerLoadError &&
            leftBanners.length > 0 && (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  h-full
                  w-full
                  transition-transform
                  duration-700
                  ease-in-out
                "
                style={{
                  transform: `translateX(-${
                    leftSlide * 100
                  }%)`,
                }}
              >
                {leftBanners.map(
                  (
                    banner,
                    index
                  ) => (
                    <Link
                      key={banner.id}
                      href={
                        banner.link
                      }
                      className="
                        relative
                        block
                        h-full
                        min-w-full
                        flex-none
                      "
                      aria-label={
                        banner.alt
                      }
                    >
                      <Image
                        src={
                          banner.image
                        }
                        alt={
                          banner.alt
                        }
                        fill
                        priority={
                          index === 0
                        }
                        sizes="
                          (max-width: 1023px) 100vw,
                          (max-width: 1450px) 75vw,
                          1080px
                        "
                        className="object-cover"
                      />
                    </Link>
                  )
                )}
              </div>
            )}

          {!isLoadingBanners &&
            !bannerLoadError &&
            leftBanners.length > 1 && (
              <div
                className="
                  absolute
                  bottom-3
                  left-1/2
                  z-30
                  flex
                  -translate-x-1/2
                  items-center
                  gap-2
                  rounded-full
                  bg-black/10
                  px-3
                  py-2
                  backdrop-blur-sm
                "
              >
                {leftBanners.map(
                  (
                    banner,
                    index
                  ) => (
                    <button
                      key={
                        banner.id
                      }
                      type="button"
                      aria-label={`Go to main banner ${
                        index + 1
                      }`}
                      aria-current={
                        leftSlide ===
                        index
                          ? "true"
                          : undefined
                      }
                      onClick={() =>
                        setLeftSlide(
                          index
                        )
                      }
                      className={`
                        h-2.5
                        rounded-full
                        transition-all
                        duration-300
                        ${
                          leftSlide ===
                          index
                            ? "w-7 bg-[#FF6900]"
                            : "w-2.5 bg-white/70 hover:bg-white"
                        }
                      `}
                    />
                  )
                )}
              </div>
            )}
        </div>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div
          className="
            grid
            h-full
            grid-cols-1
            gap-3
            sm:grid-cols-2
            lg:grid-cols-1
            lg:grid-rows-2
          "
        >
          {/* ===============================================
              RIGHT TOP DYNAMIC BANNER
          =============================================== */}

          <div
            className="
              group
              relative
              aspect-[360/269]
              w-full
              overflow-hidden
              rounded-xl
              border
              border-white/50
              bg-white
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-lg
              lg:aspect-auto
              lg:h-full
              lg:min-h-0
            "
          >
            {isLoadingBanners && (
              <div
                className="
                  absolute
                  inset-0
                  z-30
                  flex
                  items-center
                  justify-center
                  bg-gray-100
                "
              >
                <span
                  className="
                    h-8
                    w-8
                    animate-spin
                    rounded-full
                    border-4
                    border-gray-200
                    border-t-[#FF6900]
                  "
                />
              </div>
            )}

            {!isLoadingBanners &&
              bannerLoadError && (
                <div
                  className="
                    absolute
                    inset-0
                    z-30
                    flex
                    items-center
                    justify-center
                    bg-red-50
                    px-4
                    text-center
                  "
                >
                  <p className="text-sm font-semibold text-red-600">
                    Unable to load
                    banner
                  </p>
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              !rightTopBanner && (
                <div
                  className="
                    absolute
                    inset-0
                    z-20
                    flex
                    items-center
                    justify-center
                    bg-gradient-to-br
                    from-orange-50
                    via-white
                    to-gray-100
                    px-4
                    text-center
                  "
                >
                  <div>
                    <div
                      className="
                        mx-auto
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-full
                        bg-[#FF6900]/10
                        text-sm
                        font-black
                        text-[#FF6900]
                      "
                    >
                      TM
                    </div>

                    <p className="mt-3 text-sm font-bold text-[#0B1F3A]">
                      No active right top
                      banner
                    </p>
                  </div>
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              rightTopBanner && (
                <Link
                  href="/offers"
                  className="
                    relative
                    block
                    h-full
                    w-full
                    overflow-hidden
                    rounded-xl
                  "
                  aria-label={
                    rightTopBanner.alt
                  }
                >
                  <Image
                    src={
                      rightTopBanner.image
                    }
                    alt={
                      rightTopBanner.alt
                    }
                    fill
                    sizes="
                      (max-width: 639px) 100vw,
                      (max-width: 1023px) 50vw,
                      360px
                    "
                    className="
                      object-cover
                      transition-transform
                      duration-500
                      ease-out
                      group-hover:scale-105
                    "
                  />

                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-0
                      bg-black/0
                      transition-colors
                      duration-300
                      group-hover:bg-black/10
                    "
                  />

                </Link>
              )}

            <StockClearanceHeroTimer />
          </div>

          {/* ===============================================
              RIGHT BOTTOM DYNAMIC CAROUSEL
          =============================================== */}

          <div
            className="
              group
              relative
              aspect-[360/269]
              w-full
              overflow-hidden
              rounded-2xl
              border
              border-white/50
              bg-white
              shadow-[0_12px_35px_rgba(15,23,42,0.12)]
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-[0_18px_45px_rgba(15,23,42,0.18)]
              lg:aspect-auto
              lg:h-full
              lg:min-h-0
            "
            onMouseEnter={() =>
              setPauseBottom(true)
            }
            onMouseLeave={() =>
              setPauseBottom(false)
            }
          >
            {isLoadingBanners && (
              <div
                className="
                  absolute
                  inset-0
                  z-40
                  flex
                  items-center
                  justify-center
                  bg-gray-100
                "
              >
                <span
                  className="
                    h-8
                    w-8
                    animate-spin
                    rounded-full
                    border-4
                    border-gray-200
                    border-t-[#FF6900]
                  "
                />
              </div>
            )}

            {!isLoadingBanners &&
              bannerLoadError && (
                <div
                  className="
                    absolute
                    inset-0
                    z-40
                    flex
                    items-center
                    justify-center
                    bg-red-50
                    px-4
                    text-center
                  "
                >
                  <p className="text-sm font-semibold text-red-600">
                    Unable to load
                    banner
                  </p>
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              bottomRightBanners.length ===
                0 && (
                <div
                  className="
                    absolute
                    inset-0
                    z-30
                    flex
                    items-center
                    justify-center
                    bg-gradient-to-br
                    from-orange-50
                    via-white
                    to-gray-100
                    px-4
                    text-center
                  "
                >
                  <div>
                    <div
                      className="
                        mx-auto
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-full
                        bg-[#FF6900]/10
                        text-sm
                        font-black
                        text-[#FF6900]
                      "
                    >
                      TM
                    </div>

                    <p className="mt-3 text-sm font-bold text-[#0B1F3A]">
                      No active right
                      bottom banner
                    </p>
                  </div>
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              bottomRightBanners.length >
                0 && (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    h-full
                    w-full
                    transition-transform
                    duration-700
                    ease-in-out
                  "
                  style={{
                    transform: `translateX(-${
                      bottomSlide *
                      100
                    }%)`,
                  }}
                >
                  {bottomRightBanners.map(
                    (
                      banner,
                      index
                    ) => (
                      <Link
                        key={
                          banner.id
                        }
                        href={
                          banner.link
                        }
                        className="
                          relative
                          block
                          h-full
                          min-w-full
                          flex-none
                          overflow-hidden
                        "
                        aria-label={
                          banner.alt
                        }
                      >
                        <Image
                          src={
                            banner.image
                          }
                          alt={
                            banner.alt
                          }
                          fill
                          sizes="
                            (max-width: 639px) 100vw,
                            (max-width: 1023px) 50vw,
                            360px
                          "
                          className="
                            object-cover
                            transition-transform
                            duration-700
                            ease-out
                            group-hover:scale-105
                          "
                        />

                      </Link>
                    )
                  )}
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              bottomRightBanners.length >
                1 && (
                <div
                  className="
                    absolute
                    right-3
                    top-3
                    z-30
                    flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-white/40
                    bg-black/25
                    px-2.5
                    py-2
                    shadow-sm
                    backdrop-blur-md
                  "
                >
                  {bottomRightBanners.map(
                    (
                      banner,
                      index
                    ) => (
                      <button
                        key={
                          banner.id
                        }
                        type="button"
                        aria-label={`Go to small banner ${
                          index + 1
                        }`}
                        aria-current={
                          bottomSlide ===
                          index
                            ? "true"
                            : undefined
                        }
                        onClick={() =>
                          setBottomSlide(
                            index
                          )
                        }
                        className={`
                          h-2
                          rounded-full
                          transition-all
                          duration-300
                          ${
                            bottomSlide ===
                            index
                              ? "w-6 bg-[#FF6900]"
                              : "w-2 bg-white/70 hover:bg-white"
                          }
                        `}
                      />
                    )
                  )}
                </div>
              )}

            {!isLoadingBanners &&
              !bannerLoadError &&
              bottomRightBanners.length >
                0 && (
                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    z-20
                    rounded-2xl
                    ring-1
                    ring-inset
                    ring-white/30
                  "
                />
              )}
          </div>
        </div>
      </div>

      <StockClearancePopup />
    </section>
  );
}