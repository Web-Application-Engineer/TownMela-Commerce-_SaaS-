"use client";

import { useCallback, useEffect, useState } from "react";

import { useTenant } from "@/src/context/TenantContext";

import CategoryShowcaseManagement from "./CategoryShowcaseManagement";
import HeroSectionManagement from "./HeroSectionManagement";
import PopularCategoryManagement from "./PopularCategoryManagement";

import type {
  CategoryShowcase,
  CategoryShowcaseKey,
  CategoryShowcasePosition,
  CategoryShowcaseSlotKey,
  CategoryShowcaseSlots,
  HomepageBanner,
  HomepageCategoryShowcaseConfig,
  PopularCategoryItem,
  UpdateHomepageCategoryShowcasesPayload,
} from "../types/homepage";

/* =========================================================
   HOMEPAGE BANNER API TYPES
========================================================= */

type HomepageBannerApiDocument = {
  _id: string;
  title: string;
  image: string;
  link: string;
  altText: string;
  order: number;
  active: boolean;
  type: HomepageBanner["type"];
};

type HomepageBannersApiResponse = {
  success: boolean;
  homepageBanners?: HomepageBannerApiDocument[];
  homepageBanner?: HomepageBannerApiDocument;
  message?: string;
};

/* =========================================================
   CATEGORY API TYPES
========================================================= */

type ActiveCategory = {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  featured: boolean;
  homepageSection: number;
  displayOrder: number;
  status: boolean;
};

type CategoriesApiResponse = {
  success: boolean;
  categories?: ActiveCategory[];
  message?: string;
};

type PopularCategoryApiDocument = {
  _id: string;
  category:
    | string
    | {
        _id: string;
        name?: string;
        slug?: string;
        thumbnail?: string;
        status?: boolean;
      };
  categoryName?: string;
  slug?: string;
  thumbnail?: string;
  order: number;
  active: boolean;
};

type PopularCategoriesApiResponse = {
  success: boolean;
  popularCategories?: PopularCategoryApiDocument[];
  popularCategory?: PopularCategoryApiDocument;
  message?: string;
};

/* =========================================================
   CATEGORY SHOWCASE API TYPES
========================================================= */

type HomepageCategoryShowcasesApiResponse = {
  success: boolean;
  showcaseConfig?: HomepageCategoryShowcaseConfig;
  message?: string;
};

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = `${(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "")}/api`;

const POPULAR_CATEGORIES_UPDATED_EVENT = "homepage:popular-categories-updated";

/* =========================================================
   AUTH + API HELPERS
========================================================= */

const STORAGE_TOKEN_KEYS = [
  "townmelaAdminToken",
  "accessToken",
  "token",
  "authToken",
  "adminToken",
  "jwt",
] as const;

const STORAGE_TENANT_KEYS = [
  "selectedTenantId",
  "activeTenantId",
  "tenantId",
  "tenant_id",
] as const;

const isValidTenantId = (value: string) =>
  /^[a-f\d]{24}$/i.test(value);

const getAdminToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of STORAGE_TOKEN_KEYS) {
    const token =
      window.localStorage
        .getItem(key)
        ?.trim() || "";

    if (token) {
      return token;
    }
  }

  return "";
};

const getActiveTenantId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of STORAGE_TENANT_KEYS) {
    const tenantId =
      window.localStorage
        .getItem(key)
        ?.trim() || "";

    if (isValidTenantId(tenantId)) {
      return tenantId;
    }
  }

  return "";
};

const getAdminHeaders = () => {
  const token = getAdminToken();
  const tenantId = getActiveTenantId();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),

    ...(tenantId
      ? {
          "X-Tenant-Id": tenantId,
        }
      : {}),
  };
};

const mapHomepageBannerDocument = (
  banner: HomepageBannerApiDocument,
): HomepageBanner => ({
  id: banner._id,
  title: banner.title?.trim() || "Untitled Banner",
  image: banner.image?.trim() || "",
  link: banner.link?.trim() || "/shop",
  altText: banner.altText?.trim() || banner.title?.trim() || "Homepage Banner",
  order: Math.max(1, Number(banner.order) || 1),
  active: banner.active === true,
  type: banner.type,
});

const isDatabaseId = (id: string | number) =>
  typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const mapPopularCategoryDocument = (
  item: PopularCategoryApiDocument,
): PopularCategoryItem => {
  const populatedCategory =
    typeof item.category === "object" ? item.category : null;

  const categoryId =
    typeof item.category === "string"
      ? item.category
      : (populatedCategory?._id ?? "");

  const categoryName =
    populatedCategory?.name?.trim() ||
    item.categoryName?.trim() ||
    "Unnamed Category";

  return {
    id: item._id,
    displayName: categoryName,
    categoryId,
    categoryName,
    thumbnail:
      populatedCategory?.thumbnail?.trim() || item.thumbnail?.trim() || "",
    order: Math.max(1, Number(item.order) || 1),
    active: item.active === true,
  };
};

/* =========================================================
   RESPONSE HELPER
========================================================= */

const readJsonResponse = async <T,>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server returned an invalid JSON response.");
  }
};

/* =========================================================
   CATEGORY SHOWCASE DEFINITIONS
========================================================= */

const SHOWCASE_DEFINITIONS = [
  {
    id: 1 as const,
    key: "showcaseOne" as const,
    title: "Homepage Category Showcase One",
    description:
      "Manage the three categories displayed in the first homepage showcase.",
    order: 1 as const,
  },
  {
    id: 2 as const,
    key: "showcaseTwo" as const,
    title: "Homepage Category Showcase Two",
    description:
      "Manage the three categories displayed in the second homepage showcase.",
    order: 2 as const,
  },
  {
    id: 3 as const,
    key: "showcaseThree" as const,
    title: "Homepage Category Showcase Three",
    description:
      "Manage the three categories displayed in the third homepage showcase.",
    order: 3 as const,
  },
];

const POSITION_DEFINITIONS = [
  {
    position: 1 as const,
    slotKey: "categoryOne" as const,
  },
  {
    position: 2 as const,
    slotKey: "categoryTwo" as const,
  },
  {
    position: 3 as const,
    slotKey: "categoryThree" as const,
  },
];

/* =========================================================
   CATEGORY SHOWCASE ADAPTER HELPERS
========================================================= */

const DEFAULT_SHOWCASE_SECTION_TITLES: Record<
  CategoryShowcaseKey,
  string
> = {
  showcaseOne: "Explore Categories",
  showcaseTwo: "Featured Categories",
  showcaseThree: "More Categories",
};

const createEmptyCategoryShowcases = (): CategoryShowcase[] =>
  SHOWCASE_DEFINITIONS.map((showcaseDefinition) => ({
    ...showcaseDefinition,

    sectionTitle:
      DEFAULT_SHOWCASE_SECTION_TITLES[
        showcaseDefinition.key
      ],

    active: true,

    positions: POSITION_DEFINITIONS.map(
      (positionDefinition) => ({
        id: `${showcaseDefinition.key}-${positionDefinition.slotKey}`,

        slotKey:
          positionDefinition.slotKey,

        position:
          positionDefinition.position,

        categoryId: "",

        categoryName:
          "No category selected",

        categorySlug: "",

        thumbnail: "",

        active: false,
      }),
    ),
  }));

const mapSlotToPosition = (
  showcaseKey: CategoryShowcaseKey,
  slotKey: CategoryShowcaseSlotKey,
  positionNumber: 1 | 2 | 3,
  slots: CategoryShowcaseSlots,
): CategoryShowcasePosition => {
  const category = slots[slotKey];

  return {
    id: `${showcaseKey}-${slotKey}`,
    slotKey,
    position: positionNumber,
    categoryId: category?._id ?? "",
    categoryName: category?.name ?? "No category selected",
    categorySlug: category?.slug ?? "",
    thumbnail: category?.thumbnail?.trim() ?? "",
    active: Boolean(category?._id) && category?.status !== false,
  };
};

const convertShowcaseConfigToAdminData = (
  showcaseConfig:
    HomepageCategoryShowcaseConfig,
): CategoryShowcase[] =>
  SHOWCASE_DEFINITIONS.map(
    (showcaseDefinition) => {
      const slots =
        showcaseConfig[
          showcaseDefinition.key
        ];

      return {
        ...showcaseDefinition,

        sectionTitle:
          slots.title?.trim() ||
          DEFAULT_SHOWCASE_SECTION_TITLES[
            showcaseDefinition.key
          ],

        active: true,

        positions:
          POSITION_DEFINITIONS.map(
            (positionDefinition) =>
              mapSlotToPosition(
                showcaseDefinition.key,
                positionDefinition.slotKey,
                positionDefinition.position,
                slots,
              ),
          ),
      };
    },
  );

const getCategoryIdForSlot = (
  showcase: CategoryShowcase | undefined,
  slotKey: CategoryShowcaseSlotKey,
) => {
  const position = showcase?.positions.find(
    (currentPosition) => currentPosition.slotKey === slotKey,
  );

  if (!position || !position.active || !position.categoryId) {
    return null;
  }

  return position.categoryId;
};

const convertAdminDataToPayload = (
  categoryShowcases:
    CategoryShowcase[],
): UpdateHomepageCategoryShowcasesPayload => {
  const getShowcase = (
    showcaseKey:
      CategoryShowcaseKey,
  ) =>
    categoryShowcases.find(
      (showcase) =>
        showcase.key === showcaseKey,
    );

  const buildSlots = (
    showcaseKey:
      CategoryShowcaseKey,
  ) => {
    const showcase =
      getShowcase(showcaseKey);

    return {
      title:
        showcase?.sectionTitle.trim() ||
        DEFAULT_SHOWCASE_SECTION_TITLES[
          showcaseKey
        ],

      categoryOne:
        getCategoryIdForSlot(
          showcase,
          "categoryOne",
        ),

      categoryTwo:
        getCategoryIdForSlot(
          showcase,
          "categoryTwo",
        ),

      categoryThree:
        getCategoryIdForSlot(
          showcase,
          "categoryThree",
        ),
    };
  };

  return {
    showcaseOne:
      buildSlots("showcaseOne"),

    showcaseTwo:
      buildSlots("showcaseTwo"),

    showcaseThree:
      buildSlots("showcaseThree"),
  };
};

/* =========================================================
   HOMEPAGE MANAGEMENT CLIENT
========================================================= */

export default function HomepageManagementClient() {
  const {
    selectedTenantId,
  } = useTenant();

  /* =======================================================
     STATES
  ======================================================= */

  const [mainHeroBanners, setMainHeroBanners] = useState<HomepageBanner[]>([]);

  const [rightTopBanners, setRightTopBanners] = useState<HomepageBanner[]>([]);

  const [rightBottomBanners, setRightBottomBanners] = useState<
    HomepageBanner[]
  >([]);

  const [isLoadingHomepageBanners, setIsLoadingHomepageBanners] =
    useState(true);

  const [homepageBannerError, setHomepageBannerError] = useState("");

  const [popularCategories, setPopularCategories] = useState<
    PopularCategoryItem[]
  >([]);

  const [isLoadingPopularCategories, setIsLoadingPopularCategories] =
    useState(true);

  const [popularCategoryError, setPopularCategoryError] = useState("");

  const [categoryShowcases, setCategoryShowcases] = useState<
    CategoryShowcase[]
  >(createEmptyCategoryShowcases);

  const [isLoadingCategoryShowcases, setIsLoadingCategoryShowcases] =
    useState(true);

  const [isSavingCategoryShowcases, setIsSavingCategoryShowcases] =
    useState(false);

  const [categoryShowcaseError, setCategoryShowcaseError] = useState("");

  const [activeCategories, setActiveCategories] = useState<ActiveCategory[]>(
    [],
  );

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [categoryLoadError, setCategoryLoadError] = useState("");

  /* =======================================================
     LOAD HOMEPAGE BANNERS
  ======================================================= */

  const loadHomepageBanners = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingHomepageBanners(true);
      setHomepageBannerError("");

      const response = await fetch(`${API_URL}/homepage-banners`, {
        method: "GET",
        headers: getAdminHeaders(),
        cache: "no-store",
        signal,
      });

      const data = await readJsonResponse<HomepageBannersApiResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load homepage banners.");
      }

      const banners = Array.isArray(data.homepageBanners)
        ? data.homepageBanners
            .map(mapHomepageBannerDocument)
            .sort(
              (firstBanner, secondBanner) =>
                firstBanner.order - secondBanner.order,
            )
        : [];

      setMainHeroBanners(banners.filter((banner) => banner.type === "main"));

      setRightTopBanners(banners.filter((banner) => banner.type === "sideTop"));

      setRightBottomBanners(
        banners.filter((banner) => banner.type === "sideBottom"),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Failed to load homepage banners:", error);

      setMainHeroBanners([]);
      setRightTopBanners([]);
      setRightBottomBanners([]);

      setHomepageBannerError(
        error instanceof Error
          ? error.message
          : "Failed to load homepage banners.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoadingHomepageBanners(false);
      }
    }
  }, [selectedTenantId]);

  useEffect(() => {
    const controller = new AbortController();

    void loadHomepageBanners(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadHomepageBanners]);

  /* =======================================================
     LOAD ACTIVE CATEGORIES
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    const fetchActiveCategories = async () => {
      try {
        setIsLoadingCategories(true);
        setCategoryLoadError("");

        const response = await fetch(`${API_URL}/categories?status=true`, {
          method: "GET",
          headers: getAdminHeaders(),
          cache: "no-store",
          signal: controller.signal,
        });

        const data = (await response.json()) as CategoriesApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load active categories.");
        }

        const categories = Array.isArray(data.categories)
          ? data.categories
              .filter((category) => category.status === true)
              .sort((firstCategory, secondCategory) => {
                const sectionDifference =
                  Number(firstCategory.homepageSection) -
                  Number(secondCategory.homepageSection);

                if (sectionDifference !== 0) {
                  return sectionDifference;
                }

                const orderDifference =
                  Number(firstCategory.displayOrder) -
                  Number(secondCategory.displayOrder);

                if (orderDifference !== 0) {
                  return orderDifference;
                }

                return firstCategory.name.localeCompare(secondCategory.name);
              })
          : [];

        setActiveCategories(categories);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load active categories:", error);

        setActiveCategories([]);

        setCategoryLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load active categories.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCategories(false);
        }
      }
    };

    void fetchActiveCategories();

    return () => {
      controller.abort();
    };
  }, [selectedTenantId]);

  /* =======================================================
     LOAD POPULAR CATEGORIES
  ======================================================= */

  const loadPopularCategories = async (signal?: AbortSignal) => {
    try {
      setIsLoadingPopularCategories(true);

      setPopularCategoryError("");

      const response = await fetch(`${API_URL}/popular-categories`, {
        method: "GET",
        headers: getAdminHeaders(),
        cache: "no-store",
        signal,
      });

      const data = (await response.json()) as PopularCategoriesApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load popular categories.");
      }

      const mappedCategories = Array.isArray(data.popularCategories)
        ? data.popularCategories
            .map(mapPopularCategoryDocument)
            .sort(
              (firstCategory, secondCategory) =>
                firstCategory.order - secondCategory.order,
            )
        : [];

      setPopularCategories(mappedCategories);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Failed to load popular categories:", error);

      setPopularCategories([]);

      setPopularCategoryError(
        error instanceof Error
          ? error.message
          : "Failed to load popular categories.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoadingPopularCategories(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    void loadPopularCategories(controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedTenantId]);

  /* =======================================================
     REFRESH POPULAR CATEGORIES AFTER DASHBOARD CHANGES
  ======================================================= */

  useEffect(() => {
    const handleRefresh = () => {
      void loadPopularCategories();
    };

    window.addEventListener(POPULAR_CATEGORIES_UPDATED_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(
        POPULAR_CATEGORIES_UPDATED_EVENT,
        handleRefresh,
      );
    };
  }, []);

  /* =======================================================
     LOAD CATEGORY SHOWCASES
  ======================================================= */

  const loadCategoryShowcases = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingCategoryShowcases(true);
      setCategoryShowcaseError("");

      const response = await fetch(`${API_URL}/homepage-category-showcases`, {
        method: "GET",
        headers: getAdminHeaders(),
        cache: "no-store",
        signal,
      });

      const data =
        await readJsonResponse<HomepageCategoryShowcasesApiResponse>(response);

      if (!response.ok || !data.success || !data.showcaseConfig) {
        throw new Error(
          data.message || "Failed to load homepage category showcases.",
        );
      }

      setCategoryShowcases(
        convertShowcaseConfigToAdminData(data.showcaseConfig),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Failed to load category showcases:", error);

      setCategoryShowcases(createEmptyCategoryShowcases());

      setCategoryShowcaseError(
        error instanceof Error
          ? error.message
          : "Failed to load homepage category showcases.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoadingCategoryShowcases(false);
      }
    }
  }, [selectedTenantId]);

  useEffect(() => {
    const controller = new AbortController();

    void loadCategoryShowcases(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadCategoryShowcases]);

  /* =======================================================
     HOMEPAGE BANNER HELPERS
  ======================================================= */

  const saveHomepageBanner = async (updatedBanner: HomepageBanner) => {
    const isExistingBanner = isDatabaseId(updatedBanner.id);

    const title = updatedBanner.title.trim();
    const image = updatedBanner.image.trim();
    const link = updatedBanner.link.trim() || "/shop";
    const altText = updatedBanner.altText.trim() || title || "Homepage Banner";

    if (!title) {
      throw new Error("Banner title is required.");
    }

    if (!image) {
      throw new Error("Please upload or provide a banner image.");
    }

    try {
      setHomepageBannerError("");

      const endpoint = isExistingBanner
        ? `${API_URL}/homepage-banners/${updatedBanner.id}`
        : `${API_URL}/homepage-banners`;

      const response = await fetch(endpoint, {
        method: isExistingBanner ? "PUT" : "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          title,
          image,
          link,
          altText,
          order: Math.max(1, Number(updatedBanner.order) || 1),
          active: updatedBanner.active === true,
          type: updatedBanner.type,
        }),
      });

      const data = await readJsonResponse<HomepageBannersApiResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Failed to ${isExistingBanner ? "update" : "create"} banner.`,
        );
      }

      await loadHomepageBanners();
    } catch (error) {
      console.error("Failed to save homepage banner:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to save homepage banner.";

      setHomepageBannerError(message);
      throw error;
    }
  };

  const deleteHomepageBanner = async (
    bannerId: HomepageBanner["id"],
    removeDraft: () => void,
  ) => {
    if (!isDatabaseId(bannerId)) {
      removeDraft();
      return;
    }

    try {
      setHomepageBannerError("");

      const response = await fetch(`${API_URL}/homepage-banners/${bannerId}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });

      const data = await readJsonResponse<HomepageBannersApiResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete homepage banner.");
      }

      await loadHomepageBanners();
    } catch (error) {
      console.error("Failed to delete homepage banner:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete homepage banner.";

      setHomepageBannerError(message);
      throw error;
    }
  };

  /* =======================================================
     MAIN HERO BANNER
  ======================================================= */

  const handleAddMainHeroBanner = () => {
    const hasUnsavedBanner = mainHeroBanners.some(
      (banner) => !isDatabaseId(banner.id),
    );

    if (hasUnsavedBanner) {
      window.alert(
        "Please complete or remove the current unsaved main hero banner first.",
      );
      return;
    }

    const newBanner: HomepageBanner = {
      id: Date.now(),
      title: `Main Hero Banner ${mainHeroBanners.length + 1}`,
      image: "",
      link: "/shop",
      altText: `Main Hero Banner ${mainHeroBanners.length + 1}`,
      order: mainHeroBanners.length + 1,
      active: true,
      type: "main",
    };

    setMainHeroBanners((currentBanners) => [...currentBanners, newBanner]);
  };

  const handleUpdateMainHeroBanner = async (updatedBanner: HomepageBanner) => {
    await saveHomepageBanner({ ...updatedBanner, type: "main" });
  };

  const handleDeleteMainHeroBanner = async (bannerId: HomepageBanner["id"]) => {
    await deleteHomepageBanner(bannerId, () => {
      setMainHeroBanners((currentBanners) =>
        currentBanners.filter((banner) => banner.id !== bannerId),
      );
    });
  };

  /* =======================================================
     RIGHT TOP BANNER
  ======================================================= */

  const handleAddRightTopBanner = () => {
    const hasUnsavedBanner = rightTopBanners.some(
      (banner) => !isDatabaseId(banner.id),
    );

    if (hasUnsavedBanner) {
      window.alert(
        "Please complete or remove the current unsaved right top banner first.",
      );
      return;
    }

    const newBanner: HomepageBanner = {
      id: Date.now(),
      title: `Right Top Banner ${rightTopBanners.length + 1}`,
      image: "",
      link: "/shop",
      altText: `Right Top Banner ${rightTopBanners.length + 1}`,
      order: rightTopBanners.length + 1,
      active: true,
      type: "sideTop",
    };

    setRightTopBanners((currentBanners) => [...currentBanners, newBanner]);
  };

  const handleUpdateRightTopBanner = async (updatedBanner: HomepageBanner) => {
    await saveHomepageBanner({ ...updatedBanner, type: "sideTop" });
  };

  const handleDeleteRightTopBanner = async (bannerId: HomepageBanner["id"]) => {
    await deleteHomepageBanner(bannerId, () => {
      setRightTopBanners((currentBanners) =>
        currentBanners.filter((banner) => banner.id !== bannerId),
      );
    });
  };

  /* =======================================================
     RIGHT BOTTOM BANNER
  ======================================================= */

  const handleAddRightBottomBanner = () => {
    const hasUnsavedBanner = rightBottomBanners.some(
      (banner) => !isDatabaseId(banner.id),
    );

    if (hasUnsavedBanner) {
      window.alert(
        "Please complete or remove the current unsaved right bottom banner first.",
      );
      return;
    }

    const newBanner: HomepageBanner = {
      id: Date.now(),
      title: `Right Bottom Banner ${rightBottomBanners.length + 1}`,
      image: "",
      link: "/shop",
      altText: `Right Bottom Banner ${rightBottomBanners.length + 1}`,
      order: rightBottomBanners.length + 1,
      active: true,
      type: "sideBottom",
    };

    setRightBottomBanners((currentBanners) => [...currentBanners, newBanner]);
  };

  const handleUpdateRightBottomBanner = async (
    updatedBanner: HomepageBanner,
  ) => {
    await saveHomepageBanner({ ...updatedBanner, type: "sideBottom" });
  };

  const handleDeleteRightBottomBanner = async (
    bannerId: HomepageBanner["id"],
  ) => {
    await deleteHomepageBanner(bannerId, () => {
      setRightBottomBanners((currentBanners) =>
        currentBanners.filter((banner) => banner.id !== bannerId),
      );
    });
  };

  /* =======================================================
     POPULAR CATEGORY
  ======================================================= */

  const handleAddPopularCategory = () => {
    const hasUnsavedCategory = popularCategories.some(
      (category) => !isDatabaseId(category.id),
    );

    if (hasUnsavedCategory) {
      window.alert(
        "Please complete or remove the current unsaved popular category first.",
      );

      return;
    }

    const newCategory: PopularCategoryItem = {
      id: Date.now(),
      displayName: "",
      categoryId: "",
      categoryName: "Select Category",
      thumbnail: "",
      order: popularCategories.length + 1,
      active: true,
    };

    setPopularCategories((currentCategories) => [
      ...currentCategories,
      newCategory,
    ]);
  };

  const handleUpdatePopularCategory = async (
    updatedCategory: PopularCategoryItem,
  ) => {
    const categoryId =
      typeof updatedCategory.categoryId === "string"
        ? updatedCategory.categoryId
        : "";

    if (!categoryId) {
      throw new Error("Please select an active category.");
    }

    const isExistingCategory = isDatabaseId(updatedCategory.id);

    const endpoint = isExistingCategory
      ? `${API_URL}/popular-categories/${updatedCategory.id}`
      : `${API_URL}/popular-categories`;

    const response = await fetch(endpoint, {
      method: isExistingCategory ? "PUT" : "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        categoryId,
        order: Math.max(1, Number(updatedCategory.order) || 1),
        active: updatedCategory.active === true,
      }),
    });

    const data = (await response.json()) as PopularCategoriesApiResponse;

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          `Failed to ${
            isExistingCategory ? "update" : "create"
          } popular category.`,
      );
    }

    await loadPopularCategories();
  };

  const handleDeletePopularCategory = async (
    categoryId: PopularCategoryItem["id"],
  ) => {
    /*
        Unsaved draft:
        remove only from local state.
      */

    if (!isDatabaseId(categoryId)) {
      setPopularCategories((currentCategories) =>
        currentCategories.filter((category) => category.id !== categoryId),
      );

      return;
    }

    const response = await fetch(
      `${API_URL}/popular-categories/${categoryId}`,
      {
        method: "DELETE",
        headers: getAdminHeaders(),
      },
    );

    const data = (await response.json()) as PopularCategoriesApiResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to delete popular category.");
    }

    await loadPopularCategories();
  };

  /* =======================================================
     CATEGORY SHOWCASE
  ======================================================= */

  const handleUpdateCategoryShowcase = async (
    updatedShowcase: CategoryShowcase,
  ) => {
    if (isSavingCategoryShowcases) {
      return;
    }

    const nextShowcases = categoryShowcases.map((showcase) =>
      showcase.id === updatedShowcase.id ? updatedShowcase : showcase,
    );

    try {
      setIsSavingCategoryShowcases(true);
      setCategoryShowcaseError("");

      const response = await fetch(`${API_URL}/homepage-category-showcases`, {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify(convertAdminDataToPayload(nextShowcases)),
      });

      const data =
        await readJsonResponse<HomepageCategoryShowcasesApiResponse>(response);

      if (!response.ok || !data.success || !data.showcaseConfig) {
        throw new Error(
          data.message || "Failed to update homepage category showcases.",
        );
      }

      setCategoryShowcases(
        convertShowcaseConfigToAdminData(data.showcaseConfig),
      );
    } catch (error) {
      console.error("Failed to update category showcases:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update homepage category showcases.";

      setCategoryShowcaseError(message);

      throw error;
    } finally {
      setIsSavingCategoryShowcases(false);
    }
  };

  /* =======================================================
     COMPONENT UI
  ======================================================= */

  return (
    <div
      className="space-y-6"
      data-active-category-count={activeCategories.length}
      data-categories-loading={isLoadingCategories}
      data-category-load-error={categoryLoadError || undefined}
    >
      {(isLoadingHomepageBanners || homepageBannerError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            homepageBannerError
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-orange-200 bg-orange-50 text-[#FF6900]"
          }`}
        >
          {homepageBannerError
            ? homepageBannerError
            : "Loading homepage banners..."}
        </div>
      )}

      <HeroSectionManagement
        mainHeroBanners={mainHeroBanners}
        rightTopBanners={rightTopBanners}
        rightBottomBanners={rightBottomBanners}
        onAddMainHeroBanner={handleAddMainHeroBanner}
        onUpdateMainHeroBanner={handleUpdateMainHeroBanner}
        onDeleteMainHeroBanner={handleDeleteMainHeroBanner}
        onAddRightTopBanner={handleAddRightTopBanner}
        onUpdateRightTopBanner={handleUpdateRightTopBanner}
        onDeleteRightTopBanner={handleDeleteRightTopBanner}
        onAddRightBottomBanner={handleAddRightBottomBanner}
        onUpdateRightBottomBanner={handleUpdateRightBottomBanner}
        onDeleteRightBottomBanner={handleDeleteRightBottomBanner}
      />

      {(isLoadingPopularCategories || popularCategoryError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            popularCategoryError
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-orange-200 bg-orange-50 text-[#FF6900]"
          }`}
        >
          {popularCategoryError
            ? popularCategoryError
            : "Loading popular categories..."}
        </div>
      )}

      <PopularCategoryManagement
        popularCategories={popularCategories}
        activeCategories={activeCategories}
        onAddPopularCategory={handleAddPopularCategory}
        onUpdatePopularCategory={handleUpdatePopularCategory}
        onDeletePopularCategory={handleDeletePopularCategory}
      />

      {isLoadingCategoryShowcases ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#FF6900]">
          Loading homepage category showcases...
        </div>
      ) : (
        <CategoryShowcaseManagement
          categoryShowcases={categoryShowcases}
          activeCategories={activeCategories}
          isSaving={isSavingCategoryShowcases}
          errorMessage={categoryShowcaseError}
          onUpdateCategoryShowcase={handleUpdateCategoryShowcase}
        />
      )}
    </div>
  );
}