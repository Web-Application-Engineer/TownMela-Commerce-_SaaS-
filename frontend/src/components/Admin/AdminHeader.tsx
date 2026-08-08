"use client";

import {
  Bell,
  Menu,
  Search,
  UserCircle2,
} from "lucide-react";

import TenantSwitcher from "@/src/components/Admin/TenantSwitcher";

type AdminUser = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "admin" | "superadmin";
  tenantId?: string | null;
};

type AdminHeaderProps = {
  adminUser: AdminUser;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
};

export default function AdminHeader({
  adminUser,
  sidebarOpen,
  setSidebarOpen,
}: AdminHeaderProps) {
  const isSuperAdmin =
    adminUser.role === "superadmin";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
            aria-label={
              sidebarOpen
                ? "Close admin sidebar"
                : "Open admin sidebar"
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:border-[#FF6900] hover:text-[#FF6900] lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-[#0B1F3A]">
              {isSuperAdmin
                ? "Super Admin Dashboard"
                : "Tenant Admin Dashboard"}
            </h1>

            <p className="mt-0.5 truncate text-sm text-gray-500">
              Welcome back, {adminUser.name}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {isSuperAdmin && (
            <div className="hidden w-[300px] xl:block">
              <TenantSwitcher />
            </div>
          )}

          <button
            type="button"
            aria-label="Search"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:border-[#FF6900] hover:text-[#FF6900] md:flex"
          >
            <Search size={19} />
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 transition hover:border-[#FF6900] hover:text-[#FF6900]"
          >
            <Bell size={19} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FF6900]" />
          </button>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <UserCircle2
              size={40}
              className="text-[#FF6900]"
            />

            <div className="hidden max-w-[180px] sm:block">
              <p className="truncate text-sm font-bold text-[#0B1F3A]">
                {adminUser.name}
              </p>

              <p className="truncate text-xs text-gray-500">
                {adminUser.email ??
                  adminUser.phone ??
                  (isSuperAdmin
                    ? "Platform Owner"
                    : "Tenant Administrator")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="border-t border-gray-100 px-5 py-3 xl:hidden lg:px-8">
          <TenantSwitcher />
        </div>
      )}
    </header>
  );
}
