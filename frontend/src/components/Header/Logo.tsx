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

  if (
    isLoading &&
    !desktopLogo &&
    !mobileLogo
  ) {
    return (
      <div className="flex shrink-0 items-center sm:w-[240px]">
        <div className="h-8 w-28 animate-pulse rounded-md bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center sm:w-[240px]">
      <Link
        href="/"
        aria-label={`${businessName} home`}
        className="flex w-full shrink-0 items-center"
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
            width={240}
            height={52}
            priority
            className="
              hidden
              h-[52px]
              w-full
              max-w-[240px]
              object-contain
              object-left
              sm:block
            "
          />
        ) : (
          <span
            className="
              hidden
              w-full
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
    </div>
  );
}