/* =========================================================
   HOMEPAGE BANNER TYPES
========================================================= */

export type HomepageBannerType =
  | "main"
  | "sideTop"
  | "sideBottom";

export type HomepageBanner = {
  id: string | number;
  title: string;
  image: string;
  link: string;
  altText: string;
  order: number;
  active: boolean;
  type: HomepageBannerType;
};

/* =========================================================
   POPULAR CATEGORY TYPES
========================================================= */

export type PopularCategoryItem = {
  id: string | number;
  displayName: string;
  categoryId: string;
  categoryName: string;
  thumbnail: string;
  order: number;
  active: boolean;
};

/* =========================================================
   SHARED CATEGORY TYPE
========================================================= */

export type HomepageCategory = {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  featured?: boolean;
  status?: boolean;
};

/* =========================================================
   DYNAMIC CATEGORY SHOWCASE TYPES
========================================================= */

export type CategoryShowcaseKey = string;

export type CategoryShowcaseSlotKey =
  | "categoryOne"
  | "categoryTwo"
  | "categoryThree";

export type CategoryShowcasePositionNumber = 1 | 2 | 3;

export type CategoryShowcasePopulatedSlot =
  HomepageCategory | null;

export type CategoryShowcaseSlots = {
  key?: string;
  title: string;
  active?: boolean;
  order?: number;
  layoutOrder?: number;
  categoryOne: CategoryShowcasePopulatedSlot;
  categoryTwo: CategoryShowcasePopulatedSlot;
  categoryThree: CategoryShowcasePopulatedSlot;
};

export type HomepageCategoryShowcaseItem = {
  _id?: string;
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder: number;
  categoryOne: CategoryShowcasePopulatedSlot;
  categoryTwo: CategoryShowcasePopulatedSlot;
  categoryThree: CategoryShowcasePopulatedSlot;
};

export type CategoryShowcaseUpdateSlots = {
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder: number;
  categoryOne: string | null;
  categoryTwo: string | null;
  categoryThree: string | null;
};

export type HomepageCategoryShowcaseConfig = {
  _id: string;
  key: "homepage-category-showcase";
  showcases: HomepageCategoryShowcaseItem[];

  /* Legacy fields remain available for backward compatibility. */
  showcaseOne: CategoryShowcaseSlots;
  showcaseTwo: CategoryShowcaseSlots;
  showcaseThree: CategoryShowcaseSlots;

  createdAt?: string;
  updatedAt?: string;
};

export type GetHomepageCategoryShowcasesResponse = {
  success: boolean;
  showcaseConfig: HomepageCategoryShowcaseConfig;
  message?: string;
};

export type UpdateHomepageCategoryShowcasesPayload = {
  showcases: CategoryShowcaseUpdateSlots[];
};

export type UpdateHomepageCategoryShowcasesResponse = {
  success: boolean;
  message: string;
  showcaseConfig: HomepageCategoryShowcaseConfig;
};

/* =========================================================
   ADMIN UI CATEGORY SHOWCASE TYPES
========================================================= */

export type CategoryShowcasePosition = {
  id: string;
  slotKey: CategoryShowcaseSlotKey;
  position: CategoryShowcasePositionNumber;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  thumbnail: string;
  active: boolean;
};

export type CategoryShowcase = {
  id: string | number;
  key: CategoryShowcaseKey;
  title: string;
  sectionTitle: string;
  description: string;
  order: number;
  layoutOrder: number;
  active: boolean;
  positions: CategoryShowcasePosition[];
};

/* =========================================================
   COMPLETE HOMEPAGE SETTINGS TYPE
========================================================= */

export type HomepageSettings = {
  mainHeroBanners: HomepageBanner[];
  rightTopBanners: HomepageBanner[];
  rightBottomBanners: HomepageBanner[];
  popularCategories: PopularCategoryItem[];
  categoryShowcases: CategoryShowcase[];
};
