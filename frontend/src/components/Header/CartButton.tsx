"use client";

import { ShoppingCart } from "lucide-react";

type CartButtonProps = {
  cartCount: number;
  onClick: () => void;
  mobile?: boolean;
};

export default function CartButton({
  cartCount,
  onClick,
  mobile = false,
}: CartButtonProps) {
  const safeCartCount = Math.max(
    0,
    Math.floor(Number(cartCount) || 0)
  );

  const displayedCartCount =
    safeCartCount > 99
      ? "99+"
      : safeCartCount;

  const commonLabel = `Shopping cart with ${safeCartCount} ${
    safeCartCount === 1 ? "item" : "items"
  }`;

  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={commonLabel}
        className="
          relative flex h-10 w-10 shrink-0
          items-center justify-center rounded-md
          bg-[#2b2c33] transition-colors
          hover:bg-[#35363d]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#FF6900]
          focus-visible:ring-offset-2
          focus-visible:ring-offset-[#2b2c33]
          lg:hidden
        "
      >
        <ShoppingCart
          size={20}
          aria-hidden="true"
        />

        {safeCartCount > 0 && (
          <span
            aria-hidden="true"
            className="
              absolute -right-1.5 -top-1.5
              flex h-5 min-w-5 items-center
              justify-center rounded-full
              bg-[#FF6900] px-1 text-[10px]
              font-bold leading-none text-white
            "
          >
            {displayedCartCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={commonLabel}
      className="
        relative rounded-md bg-[#2b2c33] p-3
        transition-colors hover:bg-[#35363d]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#FF6900]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[#2b2c33]
      "
    >
      <ShoppingCart
        size={20}
        aria-hidden="true"
      />

      {safeCartCount > 0 && (
        <span
          aria-hidden="true"
          className="
            absolute -right-2 -top-2
            flex h-5 min-w-5 items-center
            justify-center rounded-full
            bg-[#FF6900] px-1 text-[11px]
            font-bold leading-none text-white
          "
        >
          {displayedCartCount}
        </span>
      )}
    </button>
  );
}