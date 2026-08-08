"use client";

import { ImageIcon } from "lucide-react";

import type {
  HomepageBanner,
} from "../types/homepage";

import MainHeroBannerCard from "./MainHeroBannerCard";
import SideBannerCard from "./SideBannerCard";

/* =========================================================
   PROPS
========================================================= */

type HeroSectionManagementProps = {
  mainHeroBanners: HomepageBanner[];
  rightTopBanners: HomepageBanner[];
  rightBottomBanners: HomepageBanner[];

  onAddMainHeroBanner: () => void;
  onUpdateMainHeroBanner: (
    updatedBanner: HomepageBanner
  ) => void;
  onDeleteMainHeroBanner: (
    bannerId: HomepageBanner["id"]
  ) => void;

  onAddRightTopBanner: () => void;
  onUpdateRightTopBanner: (
    updatedBanner: HomepageBanner
  ) => void;
  onDeleteRightTopBanner: (
    bannerId: HomepageBanner["id"]
  ) => void;

  onAddRightBottomBanner: () => void;
  onUpdateRightBottomBanner: (
    updatedBanner: HomepageBanner
  ) => void;
  onDeleteRightBottomBanner: (
    bannerId: HomepageBanner["id"]
  ) => void;
};

/* =========================================================
   HERO SECTION MANAGEMENT
========================================================= */

export default function HeroSectionManagement({
  mainHeroBanners,
  rightTopBanners,
  rightBottomBanners,

  onAddMainHeroBanner,
  onUpdateMainHeroBanner,
  onDeleteMainHeroBanner,

  onAddRightTopBanner,
  onUpdateRightTopBanner,
  onDeleteRightTopBanner,

  onAddRightBottomBanner,
  onUpdateRightBottomBanner,
  onDeleteRightBottomBanner,
}: HeroSectionManagementProps) {
  const totalBannerPositions =
    mainHeroBanners.length +
    rightTopBanners.length +
    rightBottomBanners.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ===================================================
          SECTION HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <ImageIcon size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#0B1F3A]">
              Hero Section Management
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
              Manage the main hero carousel, right-side top banner and
              right-side bottom carousel banners.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
          {totalBannerPositions} Banner Positions
        </span>
      </div>

      {/* ===================================================
          BANNER MANAGEMENT CARDS
      =================================================== */}

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        <MainHeroBannerCard
          banners={mainHeroBanners}
          onAddBanner={onAddMainHeroBanner}
          onUpdateBanner={
            onUpdateMainHeroBanner
          }
          onDeleteBanner={
            onDeleteMainHeroBanner
          }
        />

        <div className="space-y-5">
          <SideBannerCard
            title="Right Side Top Banner"
            description="Manage the top promotional banner shown on the homepage."
            addButtonLabel="Add Top Banner"
            banners={rightTopBanners}
            onAddBanner={onAddRightTopBanner}
            onUpdateBanner={
              onUpdateRightTopBanner
            }
            onDeleteBanner={
              onDeleteRightTopBanner
            }
          />

          <SideBannerCard
            title="Right Side Bottom Banners"
            description="Manage the rotating promotional banners displayed below the top banner."
            addButtonLabel="Add Bottom Banner"
            banners={rightBottomBanners}
            onAddBanner={onAddRightBottomBanner}
            onUpdateBanner={
              onUpdateRightBottomBanner
            }
            onDeleteBanner={
              onDeleteRightBottomBanner
            }
          />
        </div>
      </div>
    </section>
  );
}