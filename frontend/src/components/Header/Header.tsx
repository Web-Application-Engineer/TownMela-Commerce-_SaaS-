"use client";

import {
  usePathname,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Mail,
  Menu,
  Phone,
  Truck,
} from "lucide-react";

import {
  useCartDrawer,
} from "@/src/context/CartDrawerContext";

import {
  useHeaderSettings,
} from "@/src/context/HeaderSettingsContext";

import {
  getOrCreateGuestId,
} from "@/src/utils/guestCart";

import CartButton from "./CartButton";
import DesktopActions from "./DesktopActions";
import DesktopCategoryNav from "./DesktopCategoryNav";
import HeaderSearch from "./HeaderSearch";
import Logo from "./Logo";
import MobileDrawer from "./MobileDrawer";

import {
  API_BASE_URL,
  fallbackCategories,
  prepareCategories,
} from "./headerHelpers";

import type {
  CartResponse,
  CategoriesResponse,
  Category,
} from "./headerTypes";

/* =========================================================
   HEADER COMPONENT
========================================================= */

export default function Header() {
  const pathname =
    usePathname();

  const {
    openCartDrawer,
  } = useCartDrawer();

  const {
    settings,
  } = useHeaderSettings();

  const mainHeaderRef =
    useRef<HTMLDivElement>(null);

  const [
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
  ] = useState(false);

  const [
    mobileDrawerTop,
    setMobileDrawerTop,
  ] = useState(64);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    isCategoriesLoading,
    setIsCategoriesLoading,
  ] = useState(true);

  const [
    cartCount,
    setCartCount,
  ] = useState(0);

  /* =======================================================
     HEADER SETTINGS
  ======================================================= */

  const announcementPhone =
    settings.phone?.trim() || "";

  const announcementText =
    settings.announcementText?.trim() || "";

  const announcementEmail =
    settings.email?.trim() || "";

  const showAnnouncement =
    settings.isActive &&
    settings.announcementEnabled &&
    Boolean(
      announcementPhone ||
        announcementText ||
        announcementEmail,
    );

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories =
    useCallback(async () => {
      try {
        setIsCategoriesLoading(
          true,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/categories`,
            {
              method: "GET",
              cache: "no-store",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },
            },
          );

        const data:
          CategoriesResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            Array.isArray(data)
              ? "Categories could not be loaded."
              : data.message ||
                  "Categories could not be loaded.",
          );
        }

        const categoryList =
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data.categories,
                )
              ? data.categories
              : [];

        const cleanCategories =
          prepareCategories(
            categoryList,
          );

        setCategories(
          cleanCategories.length > 0
            ? cleanCategories
            : fallbackCategories,
        );
      } catch (error) {
        console.error(
          "Header category loading error:",
          error,
        );

        setCategories(
          fallbackCategories,
        );
      } finally {
        setIsCategoriesLoading(
          false,
        );
      }
    }, []);

  /* =======================================================
     LOAD CART COUNT
  ======================================================= */

  const fetchCartCount =
    useCallback(async () => {
      try {
        const guestId =
          getOrCreateGuestId();

        if (!guestId) {
          setCartCount(0);
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/api/cart/${guestId}`,
            {
              method: "GET",
              cache: "no-store",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },
            },
          );

        const data:
          CartResponse =
          await response.json();

        if (
          response.status === 404
        ) {
          setCartCount(0);
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to fetch cart.",
          );
        }

        const totalQuantity =
          data.cart?.items?.reduce(
            (
              total,
              item,
            ) =>
              total +
              Number(
                item.quantity || 0,
              ),
            0,
          ) ?? 0;

        setCartCount(
          totalQuantity,
        );
      } catch (error) {
        console.error(
          "Guest cart count fetch error:",
          error,
        );

        setCartCount(0);
      }
    }, []);

  /* =======================================================
     CATEGORY EFFECT
  ======================================================= */

  useEffect(() => {
    void loadCategories();

    const handleCategoriesUpdated =
      () => {
        void loadCategories();
      };

    window.addEventListener(
      "categories-updated",
      handleCategoriesUpdated,
    );

    return () => {
      window.removeEventListener(
        "categories-updated",
        handleCategoriesUpdated,
      );
    };
  }, [
    loadCategories,
  ]);

  /* =======================================================
     CART EFFECT
  ======================================================= */

  useEffect(() => {
    void fetchCartCount();

    const handleCartUpdated =
      () => {
        void fetchCartCount();
      };

    const handleStorageChange = (
      event: StorageEvent,
    ) => {
      if (
        event.key ===
        "townmelaGuestId"
      ) {
        void fetchCartCount();
      }
    };

    window.addEventListener(
      "cart-updated",
      handleCartUpdated,
    );

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        handleCartUpdated,
      );

      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, [
    fetchCartCount,
  ]);

  /* =======================================================
     CLOSE DRAWER AFTER ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setIsMobileDrawerOpen(
      false,
    );
  }, [
    pathname,
  ]);

  /* =======================================================
     CALCULATE MOBILE DRAWER TOP
  ======================================================= */

  useEffect(() => {
    const updateDrawerTop =
      () => {
        const mainHeader =
          mainHeaderRef.current;

        if (!mainHeader) {
          return;
        }

        const bottomPosition =
          mainHeader
            .getBoundingClientRect()
            .bottom;

        setMobileDrawerTop(
          Math.max(
            0,
            Math.ceil(
              bottomPosition,
            ),
          ),
        );
      };

    updateDrawerTop();

    window.addEventListener(
      "resize",
      updateDrawerTop,
    );

    let resizeObserver:
      | ResizeObserver
      | null = null;

    if (
      typeof ResizeObserver !==
      "undefined"
    ) {
      resizeObserver =
        new ResizeObserver(
          updateDrawerTop,
        );

      if (
        mainHeaderRef.current
      ) {
        resizeObserver.observe(
          mainHeaderRef.current,
        );
      }
    }

    return () => {
      window.removeEventListener(
        "resize",
        updateDrawerTop,
      );

      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-50
          w-full
          bg-[#17181d]
          text-white
          shadow
        "
      >
        {/* =================================================
            TENANT ANNOUNCEMENT BAR
        ================================================= */}

        {showAnnouncement && (
          <div className="w-full bg-[#FF6900]">
            <div
              className="
                mx-auto
                grid
                w-full
                max-w-[1490px]
                grid-cols-1
                items-center
                min-h-[40px]
                gap-1
                px-3
                pt-2
                pb-2
                text-xs
                font-bold
                text-white
                sm:grid-cols-3
                sm:gap-3
                sm:px-4
                sm:text-sm
                lg:px-5
              "
            >
              {/* LEFT: PHONE */}
              <div className="flex min-w-0 items-center justify-center sm:justify-start">
                {announcementPhone ? (
                  <a
                    href={`tel:${announcementPhone.replace(
                      /\s+/g,
                      "",
                    )}`}
                    className="inline-flex min-h-[26px] min-w-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#17181d] shadow-sm transition hover:bg-white"
                    aria-label={`Call ${announcementPhone}`}
                  >
                    <Phone
                      size={15}
                      className="shrink-0 text-[#FF6900]"
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {announcementPhone}
                    </span>
                  </a>
                ) : null}
              </div>

              {/* CENTER: ANNOUNCEMENT */}
              <div className="flex min-w-0 items-center justify-center text-center">
                {announcementText ? (
                  <div className="inline-flex min-w-0 items-center justify-center gap-1.5">
                    <Truck
                      size={15}
                      className="shrink-0"
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {announcementText}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* RIGHT: EMAIL */}
              <div className="flex min-w-0 items-center justify-center sm:justify-end">
                {announcementEmail ? (
                  <a
                    href={`mailto:${announcementEmail}`}
                    className="inline-flex min-h-[26px] min-w-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#17181d] shadow-sm transition hover:bg-white"
                    aria-label={`Email ${announcementEmail}`}
                  >
                    <Mail
                      size={15}
                      className="shrink-0 text-[#FF6900]"
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {announcementEmail}
                    </span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            MAIN HEADER
        ================================================= */}

        <div
          ref={mainHeaderRef}
          className="w-full bg-[#17181d]"
        >
          <div className="mx-auto w-full max-w-[1490px]">
            <div
              className="
                flex
                items-center
                gap-3
                px-3
                py-3
                sm:px-4
                lg:grid
                lg:grid-cols-[240px_minmax(0,1fr)_auto]
                lg:gap-3
                lg:px-5
              "
            >
              <button
                type="button"
                onClick={() =>
                  setIsMobileDrawerOpen(
                    true,
                  )
                }
                aria-label="Open category menu"
                aria-expanded={
                  isMobileDrawerOpen
                }
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  transition-colors
                  hover:bg-[#2b2c33]
                  lg:hidden
                "
              >
                <Menu size={25} />
              </button>

              <div className="flex min-w-0 shrink-0 items-center">
                <Logo />
              </div>

              <div
                className="
                  min-w-0
                  flex-1
                  lg:-ml-12
                  lg:w-[calc(100%+3rem)]
                  lg:flex-none
                "
              >
                {settings.searchEnabled && (
                  <HeaderSearch />
                )}
              </div>

              {settings.cartEnabled && (
                <CartButton
                  mobile
                  cartCount={cartCount}
                  onClick={openCartDrawer}
                />
              )}

              <div className="flex shrink-0 items-center justify-end">
                <DesktopActions
                  pathname={
                    pathname
                  }
                  cartCount={
                    cartCount
                  }
                  onOpenCart={
                    openCartDrawer
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DesktopCategoryNav
          categories={
            categories
          }
          isLoading={
            isCategoriesLoading
          }
          pathname={
            pathname
          }
        />
      </header>

      <MobileDrawer
        isOpen={
          isMobileDrawerOpen
        }
        top={
          mobileDrawerTop
        }
        pathname={
          pathname
        }
        categories={
          categories
        }
        isCategoriesLoading={
          isCategoriesLoading
        }
        onClose={() =>
          setIsMobileDrawerOpen(
            false,
          )
        }
      />
    </>
  );
}