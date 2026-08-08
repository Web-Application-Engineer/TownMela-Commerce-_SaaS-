"use client";

import type {
  ElementType,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Boxes,
  Building2,
  ChevronRight,
  CircleDollarSign,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LogOut,
  Package,
  PanelBottom,
  PanelTop,
  Settings,
  Tags,
  TicketPercent,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  isPathActive,
} from "@/src/components/Header/headerHelpers";

/* =========================================================
   TYPES
========================================================= */

type AdminRole =
  | "admin"
  | "superadmin";

type AdminUser = {
  _id: string;
  name: string;
  role: AdminRole;
  tenantId?: string | null;
};

type AdminSidebarProps = {
  pathname: string;

  sidebarOpen: boolean;

  setSidebarOpen: (
    open: boolean,
  ) => void;

  adminUser: AdminUser;
};

type MenuItem = {
  label: string;
  href: string;
  icon: ElementType;
  roles: AdminRole[];
};

/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Tenants",
    href: "/admin/tenants",
    icon: Building2,
    roles: [
      "superadmin",
    ],
  },

  {
    label: "Orders",
    href: "/admin/orders",
    icon: Package,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Products + Stock",
    href: "/admin/products",
    icon: Boxes,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Product Categories",
    href: "/admin/categories",
    icon: Tags,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Homepage Management",
    href:
      "/admin/homepage-management",
    icon:
      GalleryHorizontalEnd,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Header Management",
    href:
      "/admin/header-management",
    icon: PanelTop,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Footer Management",
    href:
      "/admin/footer-management",
    icon: PanelBottom,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Coupons",
    href: "/admin/coupons",
    icon: TicketPercent,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Couriers",
    href: "/admin/couriers",
    icon: Truck,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label:
      "Supplier & Purchase",
    href:
      "/admin/supplier-and-purchase",
    icon:
      CircleDollarSign,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label:
      "ROI & Profitability",
    href: "/admin/roi",
    icon: TrendingUp,
    roles: [
      "admin",
      "superadmin",
    ],
  },

  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: [
      "admin",
      "superadmin",
    ],
  },
];

/* =========================================================
   ADMIN SIDEBAR
========================================================= */

export default function AdminSidebar({
  pathname,
  sidebarOpen,
  setSidebarOpen,
  adminUser,
}: AdminSidebarProps) {
  const router =
    useRouter();

  const visibleMenuItems =
    menuItems.filter(
      (item) =>
        item.roles.includes(
          adminUser.role,
        ),
    );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    () => {
      /*
       * Remove all supported admin-token and tenant keys
       * so logout works with current and older login flows.
       */

      [
        "townmelaAdminToken",
        "townmelaAdminUser",
        "accessToken",
        "token",
        "authToken",
        "jwt",
        "selectedTenantId",
        "activeTenantId",
        "tenantId",
        "tenant_id",
      ].forEach(
        (key) =>
          localStorage.removeItem(
            key,
          ),
      );

      setSidebarOpen(
        false,
      );

      router.replace(
        "/login",
      );

      router.refresh();
    };

  return (
    <>
      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin sidebar"
          onClick={() =>
            setSidebarOpen(
              false,
            )
          }
          className="
            fixed
            inset-0
            z-40
            bg-black/50
            backdrop-blur-[1px]
            lg:hidden
          "
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          w-[280px]
          flex-col
          bg-[#17181d]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:translate-x-0

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* =================================================
            SIDEBAR HEADER
        ================================================= */}

        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/admin/dashboard"
            onClick={() =>
              setSidebarOpen(
                false,
              )
            }
            className="text-2xl font-black tracking-tight"
          >
            Town
            <span className="text-[#FF6900]">
              Mela
            </span>

            <span className="ml-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
              {adminUser.role ===
              "superadmin"
                ? "Super Admin"
                : "Admin"}
            </span>
          </Link>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                false,
              )
            }
            aria-label="Close sidebar"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              bg-white/5
              text-gray-300
              transition
              hover:bg-white/10
              hover:text-white
              lg:hidden
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            MENU
        ================================================= */}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
            Management
          </p>

          <nav className="mt-3 space-y-1">
            {visibleMenuItems.map(
              (item) => {
                const Icon =
                  item.icon;

                const active =
                  isPathActive(
                    pathname,
                    item.href,
                  );

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={() =>
                      setSidebarOpen(
                        false,
                      )
                    }
                    className={`
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      px-3
                      py-3
                      text-sm
                      font-semibold
                      transition

                      ${
                        active
                          ? "bg-[#FF6900]/80 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        size={19}
                        strokeWidth={
                          2.2
                        }
                      />

                      {
                        item.label
                      }
                    </span>

                    <ChevronRight
                      size={16}
                      className={
                        active
                          ? "text-white"
                          : "text-gray-500"
                      }
                    />
                  </Link>
                );
              },
            )}
          </nav>
        </div>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="
              flex
              w-full
              cursor-pointer
              items-center
              justify-center
              gap-2
              rounded-xl
              border-2
              border-amber-200
              bg-red-500/10
              px-4
              py-3
              text-sm
              font-extrabold
              text-red-300
              transition
              hover:bg-[#FF6900]/40
              hover:text-white
            "
          >
            <LogOut
              size={18}
            />

            Logout
          </button>
        </div>
      </aside>
    </>
  );
}