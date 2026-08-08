"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useHeaderSettings,
} from "@/src/context/HeaderSettingsContext";

/* =========================================================
   HEADER LOGO
========================================================= */

export default function Logo() {
  const {
    settings,
    isLoading,
  } = useHeaderSettings();

  const businessName =
    settings.businessName?.trim() ||
    "TownMela";

  const desktopLogo =
    settings.logo?.trim() ||
    "";

  const mobileLogo =
    settings.mobileLogo?.trim() ||
    desktopLogo;

  /* =======================================================
     LOADING FALLBACK
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <div className="h-8 w-28 animate-pulse rounded-md bg-white/10" />

        <span
          className="
            hidden
            border-l
            border-gray-500
            pl-3
            text-sm
            text-gray-300
            sm:block
          "
        >
          SINCE 2026
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link
        href="/"
        aria-label={`${businessName} home`}
        className="flex shrink-0 items-center"
      >
        {/* =================================================
            MOBILE LOGO
        ================================================= */}

        {mobileLogo ? (
          <Image
            src={mobileLogo}
            alt={`${businessName} logo`}
            width={140}
            height={48}
            priority
            className="
              h-9
              w-auto
              max-w-[130px]
              object-contain
              sm:hidden
            "
          />
        ) : (
          <span
            className="
              text-xl
              font-black
              tracking-tight
              text-white
              sm:hidden
            "
          >
            {businessName}
          </span>
        )}

        {/* =================================================
            DESKTOP LOGO
        ================================================= */}

        {desktopLogo ? (
          <Image
            src={desktopLogo}
            alt={`${businessName} logo`}
            width={180}
            height={60}
            priority
            className="
              hidden
              h-10
              w-auto
              max-w-[170px]
              object-contain
              sm:block
            "
          />
        ) : (
          <span
            className="
              hidden
              text-2xl
              font-black
              tracking-tight
              text-white
              sm:block
            "
          >
            {businessName}
          </span>
        )}
      </Link>

      <span
        className="
          hidden
          border-l
          border-gray-500
          pl-3
          text-sm
          text-gray-300
          sm:block
        "
      >
        SINCE 2026
      </span>
    </div>
  );
}