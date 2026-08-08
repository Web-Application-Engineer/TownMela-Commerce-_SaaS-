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

   Category API এবং populated showcase category উভয়ের জন্য।
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
   CATEGORY SHOWCASE KEYS
========================================================= */

export type CategoryShowcaseKey =
  | "showcaseOne"
  | "showcaseTwo"
  | "showcaseThree";

export type CategoryShowcaseSlotKey =
  | "categoryOne"
  | "categoryTwo"
  | "categoryThree";

export type CategoryShowcaseNumber =
  | 1
  | 2
  | 3;

export type CategoryShowcasePositionNumber =
  | 1
  | 2
  | 3;

/* =========================================================
   BACKEND POPULATED CATEGORY SLOT TYPES

   GET API response-এ প্রতিটি showcase section-এর মধ্যে:

   - title
   - categoryOne
   - categoryTwo
   - categoryThree

   থাকবে।
========================================================= */

export type CategoryShowcasePopulatedSlot =
  HomepageCategory | null;

export type CategoryShowcaseSlots = {
  title: string;

  categoryOne:
    CategoryShowcasePopulatedSlot;

  categoryTwo:
    CategoryShowcasePopulatedSlot;

  categoryThree:
    CategoryShowcasePopulatedSlot;
};

/* =========================================================
   BACKEND UPDATE SLOT TYPES

   PUT API request-এ প্রতিটি showcase section-এর জন্য:

   - title
   - category ID অথবা null

   পাঠানো হবে।
========================================================= */

export type CategoryShowcaseUpdateSlots = {
  title: string;

  categoryOne: string | null;

  categoryTwo: string | null;

  categoryThree: string | null;
};

/* =========================================================
   HOMEPAGE CATEGORY SHOWCASE CONFIG

   Backend document-এর exact structure।
========================================================= */

export type HomepageCategoryShowcaseConfig = {
  _id: string;

  key:
    "homepage-category-showcase";

  showcaseOne:
    CategoryShowcaseSlots;

  showcaseTwo:
    CategoryShowcaseSlots;

  showcaseThree:
    CategoryShowcaseSlots;

  createdAt?: string;

  updatedAt?: string;
};

/* =========================================================
   CATEGORY SHOWCASE API RESPONSE TYPES
========================================================= */

export type GetHomepageCategoryShowcasesResponse = {
  success: boolean;

  showcaseConfig:
    HomepageCategoryShowcaseConfig;

  message?: string;
};

export type UpdateHomepageCategoryShowcasesPayload = {
  showcaseOne:
    CategoryShowcaseUpdateSlots;

  showcaseTwo:
    CategoryShowcaseUpdateSlots;

  showcaseThree:
    CategoryShowcaseUpdateSlots;
};

export type UpdateHomepageCategoryShowcasesResponse = {
  success: boolean;

  message: string;

  showcaseConfig:
    HomepageCategoryShowcaseConfig;
};

/* =========================================================
   ADMIN UI CATEGORY SHOWCASE POSITION

   Admin component-এর প্রতিটি fixed position-এর জন্য।
========================================================= */

export type CategoryShowcasePosition = {
  id: string;

  slotKey:
    CategoryShowcaseSlotKey;

  position:
    CategoryShowcasePositionNumber;

  categoryId: string;

  categoryName: string;

  categorySlug: string;

  thumbnail: string;

  active: boolean;
};

/* =========================================================
   ADMIN UI CATEGORY SHOWCASE

   title:
   Admin Dashboard card-এর fixed management heading।

   sectionTitle:
   Customer-facing homepage showcase title।
========================================================= */

export type CategoryShowcase = {
  id:
    CategoryShowcaseNumber;

  key:
    CategoryShowcaseKey;

  title: string;

  sectionTitle: string;

  description: string;

  order:
    CategoryShowcaseNumber;

  active: boolean;

  positions:
    CategoryShowcasePosition[];
};

/* =========================================================
   COMPLETE HOMEPAGE SETTINGS TYPE
========================================================= */

export type HomepageSettings = {
  mainHeroBanners:
    HomepageBanner[];

  rightTopBanners:
    HomepageBanner[];

  rightBottomBanners:
    HomepageBanner[];

  popularCategories:
    PopularCategoryItem[];

  categoryShowcases:
    CategoryShowcase[];
};