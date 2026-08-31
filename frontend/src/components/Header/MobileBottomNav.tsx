"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Home,
  PackageSearch,
  ShoppingBag,
  ShoppingCart,
  Tags,
} from "lucide-react";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

import {
  prefetchOffersSourceData,
} from "@/src/utils/offersPrefetch";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Offers",
    href: "/offers",
    icon: Tags,
  },
  {
    label: "Shop",
    href: "/shop",
    icon: ShoppingBag,
  },
  {
    label: "Tracking",
    href: "/order-tracking",
    icon: PackageSearch,
  },
  {
    label: "Cart",
    href: "/cart",
    icon: ShoppingCart,
  },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  const {
    tenantId,
    isLoading:
      isTenantLoading,
  } =
    useStorefrontTenant();

  const [
    isVisible,
    setIsVisible,
  ] = useState(true);

  const lastScrollYRef =
    useRef(0);

  const scrollStopTimerRef =
    useRef<
      ReturnType<typeof setTimeout> |
      null
    >(null);

  /* =======================================================
     HIDE WHILE SCROLLING / SHOW WHEN SCROLL STOPS
  ======================================================= */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    lastScrollYRef.current =
      window.scrollY;

    const clearScrollStopTimer =
      () => {
        if (
          scrollStopTimerRef.current
        ) {
          clearTimeout(
            scrollStopTimerRef.current,
          );

          scrollStopTimerRef.current =
            null;
        }
      };

    const showNavigation =
      () => {
        setIsVisible(true);
      };

    const handleScroll =
      () => {
        /*
         * This behavior is mobile-only.
         * Keep the state visible when the viewport reaches tablet size.
         */
        if (
          window.matchMedia(
            "(min-width: 768px)",
          ).matches
        ) {
          clearScrollStopTimer();
          showNavigation();
          return;
        }

        const currentScrollY =
          Math.max(
            0,
            window.scrollY,
          );

        const scrollDistance =
          Math.abs(
            currentScrollY -
              lastScrollYRef.current,
          );

        /*
         * Keep the navigation visible at the very top.
         * Ignore tiny 1px Safari/browser-toolbar movements.
         */
        if (
          currentScrollY <= 8
        ) {
          showNavigation();
        } else if (
          scrollDistance >= 2
        ) {
          setIsVisible(false);
        }

        lastScrollYRef.current =
          currentScrollY;

        clearScrollStopTimer();

        /*
         * Browsers do not emit a dedicated "scroll stopped" event.
         * 100ms without another scroll event is treated as stopped.
         * This feels immediate while avoiding flicker during momentum scroll.
         */
        scrollStopTimerRef.current =
          setTimeout(
            () => {
              showNavigation();

              scrollStopTimerRef.current =
                null;
            },
            120,
          );
      };

    const handleResize =
      () => {
        if (
          window.matchMedia(
            "(min-width: 768px)",
          ).matches
        ) {
          clearScrollStopTimer();
          showNavigation();
        }
      };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      handleResize,
      {
        passive: true,
      },
    );

    return () => {
      clearScrollStopTimer();

      window.removeEventListener(
        "scroll",
        handleScroll,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  /* =======================================================
     PREFETCH OFFERS DATA
  ======================================================= */

  useEffect(() => {
    if (
      isTenantLoading ||
      !tenantId ||
      pathname === "/offers"
    ) {
      return;
    }

    /*
     * Start shortly after the storefront becomes interactive.
     * By the time the customer taps Offers, the product and
     * campaign payloads are usually already in memory/session cache.
     */
    const timer =
      window.setTimeout(
        () => {
          void prefetchOffersSourceData(
            tenantId,
          ).catch(
            () => {
              /*
               * Prefetch failure must never affect the current page.
               * OffersPage will retry normally when opened.
               */
            },
          );
        },
        180,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    isTenantLoading,
    pathname,
    tenantId,
  ]);

  const warmOffersCache =
    () => {
      if (
        isTenantLoading ||
        !tenantId
      ) {
        return;
      }

      void prefetchOffersSourceData(
        tenantId,
      ).catch(
        () => {
          // OffersPage will retry if needed.
        },
      );
    };

  /*
   * A route change should always restore the navigation immediately.
   */
  useEffect(() => {
    if (
      scrollStopTimerRef.current
    ) {
      clearTimeout(
        scrollStopTimerRef.current,
      );

      scrollStopTimerRef.current =
        null;
    }

    setIsVisible(true);
  }, [
    pathname,
  ]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className={`
        fixed
        inset-x-0
        bottom-0
        z-[80]
        border-t
        border-gray-200
        bg-white/95
        shadow-[0_-6px_18px_rgba(15,23,42,0.08)]
        backdrop-blur
        will-change-[transform,opacity]
        transition-[transform,opacity]
        duration-300
        ease-[cubic-bezier(0.22,1,0.36,1)]
        md:hidden

        ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[115%] opacity-0"
        }
      `}
      style={{
        paddingBottom:
          "env(safe-area-inset-bottom)",
      }}
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              onPointerEnter={
                item.href ===
                "/offers"
                  ? warmOffersCache
                  : undefined
              }
              onPointerDown={
                item.href ===
                "/offers"
                  ? warmOffersCache
                  : undefined
              }
              onFocus={
                item.href ===
                "/offers"
                  ? warmOffersCache
                  : undefined
              }
              className={`
                flex
                min-w-0
                flex-col
                items-center
                justify-center
                gap-1
                px-1
                py-2
                text-center
                transition-colors
                ${
                  active
                    ? "text-[#FF6900]"
                    : "text-[#0B1F3A]"
                }
              `}
            >
              <Icon
                size={20}
                strokeWidth={2.2}
                aria-hidden="true"
              />

              <span
                className="
                  max-w-full
                  truncate
                  text-[10px]
                  font-semibold
                  leading-tight
                  sm:text-[11px]
                "
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
