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
  Menu,
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

  const showAnnouncement =
    settings.isActive &&
    settings.announcementEnabled &&
    Boolean(
      settings.announcementText?.trim(),
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
            <div className="mx-auto w-full max-w-[1490px] px-3 py-2 text-center text-xs font-bold text-white sm:px-4 sm:text-sm lg:px-5">
              {
                settings.announcementText
              }
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

              <Logo />

             {settings.searchEnabled && (
            <HeaderSearch />
            )}

{settings.cartEnabled && (
  <CartButton
    mobile
    cartCount={cartCount}
    onClick={openCartDrawer}
  />
)}

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