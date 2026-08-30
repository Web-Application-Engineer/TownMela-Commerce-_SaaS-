"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PackageSearch,
  ShoppingBag,
  ShoppingCart,
  Tags,
} from "lucide-react";

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
      className="
        fixed
        inset-x-0
        bottom-0
        z-[80]
        border-t
        border-gray-200
        bg-white/95
        shadow-[0_-6px_18px_rgba(15,23,42,0.08)]
        backdrop-blur
        md:hidden
      "
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
