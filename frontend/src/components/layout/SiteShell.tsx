"use client";

import type {
  ReactNode,
} from "react";

import {
  usePathname,
} from "next/navigation";

import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";

import CartDrawer from "@/src/components/Cart/CartDrawer";

import LoginRequiredNotice from "@/src/components/Auth/LoginRequiredNotice";

/* =========================================================
   TYPES
========================================================= */

type SiteShellProps = {
  children: ReactNode;
};

/* =========================================================
   SITE SHELL

   Storefront routes:
   - Header
   - Footer
   - Cart Drawer

   Admin routes:
   - No storefront Header
   - No storefront Footer
   - No storefront Cart Drawer
========================================================= */

export default function SiteShell({
  children,
}: SiteShellProps) {
  const pathname =
    usePathname();

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/",
    );

  /* =======================================================
     ADMIN ROUTES
  ======================================================= */

  if (isAdminRoute) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    );
  }

  /* =======================================================
     STOREFRONT ROUTES
  ======================================================= */

  return (
    <>
      <Header />

      <LoginRequiredNotice />

      <div className="w-full bg-[#17181D]">
        <main
          className="
            mx-auto
            min-h-screen
            w-full
            max-w-[1450px]
            overflow-hidden
            bg-[#17181D]
          "
        >
          {children}
        </main>

        <Footer />
      </div>

      <CartDrawer />
    </>
  );
}