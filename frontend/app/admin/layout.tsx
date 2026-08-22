"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { LoaderCircle } from "lucide-react";

import AdminHeader from "@/src/components/Admin/AdminHeader";
import AdminSidebar from "@/src/components/Admin/AdminSidebar";
import { TenantProvider } from "@/src/context/TenantContext";

type AdminRole =
  | "admin"
  | "superadmin";

export type AdminUser = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: AdminRole;
  tenantId?: string | null;
  tenant?: string | null;
  mustChangePassword?: boolean;
};

const ADMIN_TOKEN_KEY =
  "townmelaAdminToken";

const ADMIN_USER_KEY =
  "townmelaAdminUser";

const clearAdminSession = () => {
  [
    ADMIN_TOKEN_KEY,
    ADMIN_USER_KEY,
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "selectedTenantId",
    "activeTenantId",
    "tenantId",
    "tenant_id",
  ].forEach((key) =>
    localStorage.removeItem(key),
  );
};

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublicSuperAdminAuthPage =
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  const isTenantPasswordChangePage =
    pathname ===
    "/admin/tenant-change-password";

  const [
    isChecking,
    setIsChecking,
  ] = useState(true);

  const [
    adminUser,
    setAdminUser,
  ] = useState<AdminUser | null>(
    null,
  );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  /* =======================================================
     AUTH CHECK
  ======================================================= */

  useEffect(() => {
    /*
      Super Admin login / forgot-password / reset-password
      pages are public authentication pages.

      এখানে token check, redirect, header, sidebar
      অথবা TenantProvider চালানো হবে না।
    */

    if (isPublicSuperAdminAuthPage) {
      setIsChecking(false);
      setAdminUser(null);
      return;
    }

    const token =
      localStorage.getItem(
        ADMIN_TOKEN_KEY,
      );

    const storedUser =
      localStorage.getItem(
        ADMIN_USER_KEY,
      );

    if (!token || !storedUser) {
      clearAdminSession();

      router.replace("/login");
      return;
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser,
        ) as AdminUser;

      const normalizedRole =
        String(
          parsedUser?.role || "",
        )
          .trim()
          .toLowerCase();

      if (
        !parsedUser?._id ||
        ![
          "admin",
          "superadmin",
        ].includes(
          normalizedRole,
        )
      ) {
        throw new Error(
          "Invalid admin session.",
        );
      }

      const normalizedUser:
        AdminUser = {
        ...parsedUser,

        role:
          normalizedRole as AdminRole,

        tenantId:
          parsedUser.tenantId ??
          parsedUser.tenant ??
          localStorage.getItem(
            "tenantId",
          ) ??
          null,
      };

      /*
        Tenant Admin অবশ্যই একটি tenant-এর সাথে যুক্ত থাকবে।

        Super Admin-এর tenantId প্রয়োজন নেই।
      */

      if (
        normalizedUser.role ===
          "admin" &&
        !normalizedUser.tenantId
      ) {
        throw new Error(
          "No tenant is assigned to this tenant admin account.",
        );
      }

      /*
        New Tenant Admin accounts are created with a temporary
        password and mustChangePassword = true.

        Until that password is replaced, the Tenant Admin is
        forced to the dedicated password-change page.
      */

      if (
        normalizedUser.role ===
          "admin" &&
        normalizedUser
          .mustChangePassword ===
          true &&
        !isTenantPasswordChangePage
      ) {
        router.replace(
          "/admin/tenant-change-password",
        );

        return;
      }

      setAdminUser(
        normalizedUser,
      );

      setIsChecking(false);
    } catch (error) {
      console.error(
        "Admin session error:",
        error,
      );

      clearAdminSession();

      router.replace("/login");
    }
  }, [
    isPublicSuperAdminAuthPage,
    isTenantPasswordChangePage,
    router,
  ]);

  /* =======================================================
     CLOSE SIDEBAR AFTER ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /* =======================================================
     PUBLIC SUPER ADMIN AUTH PAGES
  ======================================================= */

  if (isPublicSuperAdminAuthPage) {
    return children;
  }

  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (
    isChecking ||
    !adminUser
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="text-center">
          <LoaderCircle
            size={42}
            className="mx-auto animate-spin text-[#FF6900]"
          />

          <p className="mt-5 font-semibold text-gray-600">
            Loading Admin Panel...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     PROTECTED ROLE-BASED ADMIN AREA
  ======================================================= */

  return (
    <TenantProvider
      adminUser={adminUser}
    >
      <div className="min-h-screen bg-[#F4F6F9]">
        <AdminSidebar
          pathname={pathname}
          sidebarOpen={
            sidebarOpen
          }
          setSidebarOpen={
            setSidebarOpen
          }
          adminUser={
            adminUser
          }
        />

        <div className="lg:pl-[280px]">
          <AdminHeader
            adminUser={
              adminUser
            }
            sidebarOpen={
              sidebarOpen
            }
            setSidebarOpen={
              setSidebarOpen
            }
          />

          <main className="p-4 sm:p-5 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
