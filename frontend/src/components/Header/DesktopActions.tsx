"use client";

import Link from "next/link";

import {
  PackageSearch,
  Zap,
} from "lucide-react";

import {
  useHeaderSettings,
} from "@/src/context/HeaderSettingsContext";

import CartButton from "./CartButton";

import {
  isPathActive,
} from "./headerHelpers";

/* =========================================================
   TYPES
========================================================= */

type DesktopActionsProps = {
  pathname: string;

  cartCount: number;

  onOpenCart: () => void;
};

/* =========================================================
   DESKTOP ACTIONS
========================================================= */

export default function DesktopActions({
  pathname,
  cartCount,
  onOpenCart,
}: DesktopActionsProps) {
  const {
    settings,
  } = useHeaderSettings();

  return (
    <div
      className="
        hidden
        shrink-0
        items-center
        gap-1
        lg:flex
      "
    >
      {/* ===================================================
          OFFERS
      =================================================== */}

      <Link
        href="/offers"
        className={`
          flex
          items-center
          gap-2
          rounded-md
          px-2
          py-2
          font-semibold
          transition-colors

          ${
            isPathActive(
              pathname,
              "/offers",
            )
              ? "bg-[#2b2c33] text-[#FFDF00]"
              : "text-[#FF6900] hover:bg-[#2b2c33] hover:text-[#FFDF00]"
          }
        `}
      >
        <Zap
          size={17}
          strokeWidth={3}
          className="
            shrink-0
            animate-pulse
            fill-current
          "
        />

        <span>
          Offers
        </span>
      </Link>

      {/* ===================================================
          TRACK ORDER
      =================================================== */}

      <Link
        href="/order-tracking"
        className={`
          flex
          items-center
          gap-2
          rounded-md
          px-2
          py-2
          text-sm
          font-semibold
          transition-colors

          ${
            isPathActive(
              pathname,
              "/order-tracking",
            )
              ? "bg-[#2b2c33] text-[#FFDF00]"
              : "text-white hover:bg-[#2b2c33] hover:text-[#FFDF00]"
          }
        `}
      >
        <PackageSearch
          size={18}
          strokeWidth={2.5}
          className="shrink-0"
        />

        <span>
          Order Tracking
        </span>
      </Link>

      {/* ===================================================
          CART

          Each tenant controls whether
          Cart is visible in its header.
      =================================================== */}

      {settings.cartEnabled && (
        <CartButton
          cartCount={cartCount}
          onClick={onOpenCart}
        />
      )}
    </div>
  );
}