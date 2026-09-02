"use client";

import { useCallback, useEffect, useState } from "react";

import { useTenant } from "@/src/context/TenantContext";

import CategoryShowcaseManagement from "./CategoryShowcaseManagement";
import HeroSectionManagement from "./HeroSectionManagement";
import PopularCategoryManagement from "./PopularCategoryManagement";
import HomepageSectionBuilder from "./HomepageSectionBuilder";

import type {
  CategoryShowcase,
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
   HOMEPAGE PRODUCT SECTION API TYPES
========================================================= */

type HomepageProductSectionItem = {
  id?: string;
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder: number;
};

type HomepageProductSectionSettingsApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    sections?: HomepageProductSectionItem[];
    isActive?: boolean;
  };
};

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = `${
  (
    typeof window !== "undefined"
      ? window.location.origin
      : (
          process.env.NEXT_PUBLIC_API_URL ??
          "http://localhost:5000"
        )
  ).replace(/\/$/, "")
}/api`;

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

const getAdminHeaders = (tenantIdOverride = "") => {
  const token = getAdminToken();

  const normalizedTenantId =
    tenantIdOverride.trim();

  const tenantId =
    isValidTenantId(normalizedTenantId)
      ? normalizedTenantId
      : getActiveTenantId();

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

const DEFAULT_SHOWCASE_DEFINITIONS = [
  {
    id: 1,
    key: "showcaseOne",
    title: "Homepage Category Showcase One",
    sectionTitle: "Explore Categories",
    description:
      "Manage the three categories displayed in this homepage showcase.",
    order: 1,
    layoutOrder: 2,
  },
  {
    id: 2,
    key: "showcaseTwo",
    title: "Homepage Category Showcase Two",
    sectionTitle: "Featured Categories",
    description:
      "Manage the three categories displayed in this homepage showcase.",
    order: 2,
    layoutOrder: 4,
  },
  {
    id: 3,
    key: "showcaseThree",
    title: "Homepage Category Showcase Three",
    sectionTitle: "More Categories",
    description:
      "Manage the three categories displayed in this homepage showcase.",
    order: 3,
    layoutOrder: 6,
  },
] as const;

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

const createEmptyPositions = (
  showcaseKey: string,
): CategoryShowcasePosition[] =>
  POSITION_DEFINITIONS.map((positionDefinition) => ({
    id: `${showcaseKey}-${positionDefinition.slotKey}`,
    slotKey: positionDefinition.slotKey,
    position: positionDefinition.position,
    categoryId: "",
    categoryName: "No category selected",
    categorySlug: "",
    thumbnail: "",
    active: false,
  }));

const createEmptyCategoryShowcases = (): CategoryShowcase[] =>
  DEFAULT_SHOWCASE_DEFINITIONS.map((definition) => ({
    ...definition,
    active: true,
    positions: createEmptyPositions(definition.key),
  }));

const mapSlotToPosition = (
  showcaseKey: string,
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

const mapShowcaseToAdminData = (
  showcase: CategoryShowcaseSlots & {
    _id?: string;
    key?: string;
    active?: boolean;
    order?: number;
    layoutOrder?: number;
  },
  index: number,
): CategoryShowcase => {
  const fallback = DEFAULT_SHOWCASE_DEFINITIONS[index];
  const key =
    showcase.key?.trim() ||
    fallback?.key ||
    `showcase-${index + 1}`;
  const sectionTitle =
    showcase.title?.trim() ||
    fallback?.sectionTitle ||
    `Category Showcase ${index + 1}`;

  return {
    id: showcase._id || key,
    key,
    title:
      fallback?.title ||
      `Homepage Category Showcase ${index + 1}`,
    sectionTitle,
    description:
      fallback?.description ||
      "Manage the three categories displayed in this homepage showcase.",
    order: Math.max(1, Number(showcase.order) || index + 1),
    layoutOrder: Math.max(
      1,
      Number(showcase.layoutOrder) || index * 2 + 2,
    ),
    active: showcase.active !== false,
    positions: POSITION_DEFINITIONS.map((positionDefinition) =>
      mapSlotToPosition(
        key,
        positionDefinition.slotKey,
        positionDefinition.position,
        showcase,
      ),
    ),
  };
};

const convertShowcaseConfigToAdminData = (
  showcaseConfig: HomepageCategoryShowcaseConfig,
): CategoryShowcase[] => {
  const dynamicShowcases = Array.isArray(showcaseConfig.showcases)
    ? showcaseConfig.showcases
    : [];

  if (dynamicShowcases.length > 0) {
    return dynamicShowcases
      .map((showcase, index) =>
        mapShowcaseToAdminData(showcase, index),
      )
      .sort((a, b) => a.order - b.order);
  }

  return DEFAULT_SHOWCASE_DEFINITIONS.map((definition, index) => {
    const legacySlots =
      showcaseConfig[definition.key] || {
        title: definition.sectionTitle,
        categoryOne: null,
        categoryTwo: null,
        categoryThree: null,
      };

    return mapShowcaseToAdminData(
      {
        ...legacySlots,
        key: definition.key,
        active: true,
        order: definition.order,
        layoutOrder: definition.layoutOrder,
      },
      index,
    );
  });
};

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
  categoryShowcases: CategoryShowcase[],
): UpdateHomepageCategoryShowcasesPayload => ({
  showcases: categoryShowcases
    .map((showcase, index) => ({
      key: showcase.key.trim() || `showcase-${index + 1}`,
      title:
        showcase.sectionTitle.trim() ||
        `Category Showcase ${index + 1}`,
      active: showcase.active !== false,
      order: index + 1,
      layoutOrder: Math.max(
        1,
        Number(showcase.layoutOrder) || index + 1,
      ),
      categoryOne: getCategoryIdForSlot(
        showcase,
        "categoryOne",
      ),
      categoryTwo: getCategoryIdForSlot(
        showcase,
        "categoryTwo",
      ),
      categoryThree: getCategoryIdForSlot(
        showcase,
        "categoryThree",
      ),
    }))
    .sort((a, b) => a.order - b.order),
});

const getNextLayoutOrder = (
  productSections: HomepageProductSectionItem[],
  categoryShowcases: CategoryShowcase[],
) =>
  Math.max(
    0,
    ...productSections.map((section) =>
      Number(section.layoutOrder) || 0,
    ),
    ...categoryShowcases.map((showcase) =>
      Number(showcase.layoutOrder) || 0,
    ),
  ) + 1;

const normalizeHomepageLayout = (
  productSections: HomepageProductSectionItem[],
  categoryShowcases: CategoryShowcase[],
) => {
  const nextProducts = productSections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));

  const nextShowcases = categoryShowcases.map((showcase, index) => ({
    ...showcase,
    order: index + 1,
  }));

  const layout = [
    ...nextProducts.map((section) => ({
      type: "product" as const,
      key: section.key,
      layoutOrder: section.layoutOrder,
    })),
    ...nextShowcases.map((showcase) => ({
      type: "category" as const,
      key: showcase.key,
      layoutOrder: showcase.layoutOrder,
    })),
  ].sort((a, b) => a.layoutOrder - b.layoutOrder);

  const orderMap = new Map(
    layout.map((item, index) => [
      `${item.type}:${item.key}`,
      index + 1,
    ]),
  );

  return {
    productSections: nextProducts.map((section) => ({
      ...section,
      layoutOrder:
        orderMap.get(`product:${section.key}`) ||
        section.layoutOrder,
    })),
    categoryShowcases: nextShowcases.map((showcase) => ({
      ...showcase,
      layoutOrder:
        orderMap.get(`category:${showcase.key}`) ||
        showcase.layoutOrder,
    })),
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

  const [productSections, setProductSections] =
    useState<HomepageProductSectionItem[]>([]);
  const [isLoadingProductSections, setIsLoadingProductSections] = useState(true);
  const [isSavingProductSections, setIsSavingProductSections] = useState(false);
  const [productSectionError, setProductSectionError] = useState("");
  const [productSectionsActive, setProductSectionsActive] = useState(true);

  /* =======================================================
     LOAD HOMEPAGE BANNERS
  ======================================================= */

  const loadHomepageBanners = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingHomepageBanners(true);
      setHomepageBannerError("");

      const response = await fetch(`${API_URL}/homepage-banners`, {
        method: "GET",
        headers: getAdminHeaders(selectedTenantId),
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
          headers: getAdminHeaders(selectedTenantId),
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
        headers: getAdminHeaders(selectedTenantId),
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
        headers: getAdminHeaders(selectedTenantId),
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
     LOAD HOMEPAGE PRODUCT SECTIONS
  ======================================================= */

  const loadProductSections = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingProductSections(true);
      setProductSectionError("");

      const response = await fetch(
        `${API_URL}/homepage-product-section-settings`,
        {
          method: "GET",
          headers: getAdminHeaders(selectedTenantId),
          cache: "no-store",
          signal,
        },
      );

      const data =
        await readJsonResponse<HomepageProductSectionSettingsApiResponse>(
          response,
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load homepage product sections.",
        );
      }

      const sections = Array.isArray(data.data?.sections)
        ? data.data.sections
            .map((section, index) => ({
              id: section.id,
              key: section.key?.trim() || `section-${index + 1}`,
              title: section.title?.trim() || `Section ${index + 1}`,
              active: section.active !== false,
              order: Math.max(1, Number(section.order) || index + 1),
              layoutOrder: Math.max(
                1,
                Number(section.layoutOrder) || index * 2 + 1,
              ),
            }))
            .sort((a, b) => a.order - b.order)
        : [];

      setProductSections(sections);
      setProductSectionsActive(data.data?.isActive !== false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      console.error("Failed to load homepage product sections:", error);
      setProductSections([]);
      setProductSectionError(
        error instanceof Error
          ? error.message
          : "Failed to load homepage product sections.",
      );
    } finally {
      if (!signal?.aborted) setIsLoadingProductSections(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProductSections(controller.signal);
    return () => controller.abort();
  }, [loadProductSections]);

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
        headers: getAdminHeaders(selectedTenantId),
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
        headers: getAdminHeaders(selectedTenantId),
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
      headers: getAdminHeaders(selectedTenantId),
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
        headers: getAdminHeaders(selectedTenantId),
      },
    );

    const data = (await response.json()) as PopularCategoriesApiResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to delete popular category.");
    }

    await loadPopularCategories();
  };

  /* =======================================================
     CATEGORY SHOWCASE SAVE
  ======================================================= */

  const saveCategoryShowcases = async (
    nextShowcases: CategoryShowcase[],
  ) => {
    const response = await fetch(
      `${API_URL}/homepage-category-showcases`,
      {
        method: "PUT",
        headers: getAdminHeaders(selectedTenantId),
        body: JSON.stringify(
          convertAdminDataToPayload(nextShowcases),
        ),
      },
    );

    const data =
      await readJsonResponse<HomepageCategoryShowcasesApiResponse>(
        response,
      );

    if (!response.ok || !data.success || !data.showcaseConfig) {
      throw new Error(
        data.message ||
          "Failed to update homepage category showcases.",
      );
    }

    setCategoryShowcases(
      convertShowcaseConfigToAdminData(data.showcaseConfig),
    );

    window.dispatchEvent(
      new CustomEvent("homepage:category-showcases-updated"),
    );

    return data;
  };

  const handleUpdateCategoryShowcase = async (
    updatedShowcase: CategoryShowcase,
  ) => {
    if (isSavingCategoryShowcases) {
      return;
    }

    const nextShowcases = categoryShowcases.map((showcase) =>
      showcase.key === updatedShowcase.key
        ? updatedShowcase
        : showcase,
    );

    try {
      setIsSavingCategoryShowcases(true);
      setCategoryShowcaseError("");
      await saveCategoryShowcases(nextShowcases);
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
     HOMEPAGE SECTION BUILDER
  ======================================================= */

  const handleAddProductSection = () => {
    const nextOrder = productSections.length + 1;
    const timestamp = Date.now();

    setProductSections((currentSections) => [
      ...currentSections,
      {
        key: `section-${timestamp}`,
        title: `New Product Section ${nextOrder}`,
        active: true,
        order: nextOrder,
        layoutOrder: getNextLayoutOrder(
          currentSections,
          categoryShowcases,
        ),
      },
    ]);
  };

  const handleAddCategoryShowcase = async () => {
    if (isSavingCategoryShowcases) {
      return;
    }

    const nextOrder = categoryShowcases.length + 1;
    const timestamp = Date.now();
    const key = `showcase-${timestamp}`;

    const newShowcase: CategoryShowcase = {
      id: `draft-${timestamp}`,
      key,
      title: `Homepage Category Showcase ${nextOrder}`,
      sectionTitle: `New Category Showcase ${nextOrder}`,
      description:
        "Manage the three categories displayed in this homepage showcase.",
      order: nextOrder,
      layoutOrder: getNextLayoutOrder(
        productSections,
        categoryShowcases,
      ),
      active: true,
      positions: createEmptyPositions(key),
    };

    const nextShowcases = [
      ...categoryShowcases,
      newShowcase,
    ];

    try {
      setIsSavingCategoryShowcases(true);
      setCategoryShowcaseError("");

      await saveCategoryShowcases(nextShowcases);
    } catch (error) {
      console.error("Failed to add category showcase:", error);

      setCategoryShowcaseError(
        error instanceof Error
          ? error.message
          : "Failed to add homepage category showcase.",
      );
    } finally {
      setIsSavingCategoryShowcases(false);
    }
  };

  const handleDeleteCategoryShowcase = async (
    showcase: CategoryShowcase,
  ) => {
    if (isSavingCategoryShowcases) {
      return;
    }

    if (categoryShowcases.length <= 1) {
      window.alert("At least one category showcase must remain.");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${showcase.sectionTitle}" from Category Placement Management?`,
    );

    if (!shouldDelete) {
      return;
    }

    const nextShowcases = categoryShowcases
      .filter((item) => item.key !== showcase.key)
      .map((item, index) => ({
        ...item,
        order: index + 1,
      }));

    try {
      setIsSavingCategoryShowcases(true);
      setCategoryShowcaseError("");

      await saveCategoryShowcases(nextShowcases);
    } catch (error) {
      console.error("Failed to delete category showcase:", error);

      setCategoryShowcaseError(
        error instanceof Error
          ? error.message
          : "Failed to delete homepage category showcase.",
      );
    } finally {
      setIsSavingCategoryShowcases(false);
    }
  };

  const handleUpdateProductSection = (
    key: string,
    changes: Partial<HomepageProductSectionItem>,
  ) => {
    setProductSections((currentSections) =>
      currentSections.map((section) =>
        section.key === key
          ? { ...section, ...changes }
          : section,
      ),
    );
  };

  const handleUpdateCategoryShowcaseMeta = (
    key: string,
    changes: Partial<CategoryShowcase>,
  ) => {
    setCategoryShowcases((currentShowcases) =>
      currentShowcases.map((showcase) =>
        showcase.key === key
          ? { ...showcase, ...changes }
          : showcase,
      ),
    );
  };

  const handleMoveHomepageSection = (
    type: "product" | "category",
    key: string,
    direction: "up" | "down",
  ) => {
    const normalized = normalizeHomepageLayout(
      productSections,
      categoryShowcases,
    );

    const layout = [
      ...normalized.productSections.map((section) => ({
        type: "product" as const,
        key: section.key,
        layoutOrder: section.layoutOrder,
      })),
      ...normalized.categoryShowcases.map((showcase) => ({
        type: "category" as const,
        key: showcase.key,
        layoutOrder: showcase.layoutOrder,
      })),
    ].sort((a, b) => a.layoutOrder - b.layoutOrder);

    const currentIndex = layout.findIndex(
      (item) => item.type === type && item.key === key,
    );
    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= layout.length
    ) {
      return;
    }

    const nextLayout = [...layout];
    const [moved] = nextLayout.splice(currentIndex, 1);
    nextLayout.splice(targetIndex, 0, moved);

    const orderMap = new Map(
      nextLayout.map((item, index) => [
        `${item.type}:${item.key}`,
        index + 1,
      ]),
    );

    setProductSections(
      normalized.productSections.map((section) => ({
        ...section,
        layoutOrder:
          orderMap.get(`product:${section.key}`) ||
          section.layoutOrder,
      })),
    );

    setCategoryShowcases(
      normalized.categoryShowcases.map((showcase) => ({
        ...showcase,
        layoutOrder:
          orderMap.get(`category:${showcase.key}`) ||
          showcase.layoutOrder,
      })),
    );
  };

  const handleDeleteHomepageSection = (
    type: "product" | "category",
    key: string,
  ) => {
    const nextProducts =
      type === "product"
        ? productSections.filter((section) => section.key !== key)
        : productSections;

    const nextShowcases =
      type === "category"
        ? categoryShowcases.filter((showcase) => showcase.key !== key)
        : categoryShowcases;

    const normalized = normalizeHomepageLayout(
      nextProducts,
      nextShowcases,
    );

    setProductSections(normalized.productSections);
    setCategoryShowcases(normalized.categoryShowcases);
  };

  const handleSaveHomepageSections = async () => {
    if (isSavingProductSections || isSavingCategoryShowcases) {
      return;
    }

    const normalized = normalizeHomepageLayout(
      productSections,
      categoryShowcases,
    );

    const invalidProductIndex =
      normalized.productSections.findIndex(
        (section) => !section.title.trim(),
      );

    if (invalidProductIndex !== -1) {
      setProductSectionError(
        `Product section ${invalidProductIndex + 1} title is required.`,
      );
      return;
    }

    const invalidShowcaseIndex =
      normalized.categoryShowcases.findIndex(
        (showcase) => !showcase.sectionTitle.trim(),
      );

    if (invalidShowcaseIndex !== -1) {
      setProductSectionError(
        `Category showcase ${invalidShowcaseIndex + 1} title is required.`,
      );
      return;
    }

    try {
      setIsSavingProductSections(true);
      setIsSavingCategoryShowcases(true);
      setProductSectionError("");
      setCategoryShowcaseError("");

      const productResponse = await fetch(
        `${API_URL}/homepage-product-section-settings`,
        {
          method: "PUT",
          headers: getAdminHeaders(selectedTenantId),
          body: JSON.stringify({
            sections: normalized.productSections.map(
              (section, index) => ({
                key:
                  section.key.trim() ||
                  `section-${index + 1}`,
                title: section.title.trim(),
                active: section.active !== false,
                order: index + 1,
                layoutOrder: section.layoutOrder,
              }),
            ),
            isActive: productSectionsActive,
          }),
        },
      );

      const productData =
        await readJsonResponse<HomepageProductSectionSettingsApiResponse>(
          productResponse,
        );

      if (!productResponse.ok || !productData.success) {
        throw new Error(
          productData.message ||
            "Failed to save homepage product sections.",
        );
      }

      await saveCategoryShowcases(
        normalized.categoryShowcases,
      );

      await loadProductSections();

      window.dispatchEvent(
        new CustomEvent("homepage:product-sections-updated"),
      );
    } catch (error) {
      console.error("Failed to save homepage section layout:", error);
      setProductSectionError(
        error instanceof Error
          ? error.message
          : "Failed to save homepage section layout.",
      );
    } finally {
      setIsSavingProductSections(false);
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

      <HomepageSectionBuilder
        productSections={productSections}
        categoryShowcases={categoryShowcases}
        productSectionsActive={productSectionsActive}
        isLoading={
          isLoadingProductSections || isLoadingCategoryShowcases
        }
        isSaving={
          isSavingProductSections || isSavingCategoryShowcases
        }
        errorMessage={
          productSectionError || categoryShowcaseError
        }
        onToggleProductSectionsActive={() =>
          setProductSectionsActive((value) => !value)
        }
        onAddProductSection={handleAddProductSection}
        onAddCategoryShowcase={handleAddCategoryShowcase}
        onUpdateProductSection={handleUpdateProductSection}
        onUpdateCategoryShowcase={handleUpdateCategoryShowcaseMeta}
        onMoveSection={handleMoveHomepageSection}
        onDeleteSection={handleDeleteHomepageSection}
        onSave={handleSaveHomepageSections}
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
          onAddCategoryShowcase={handleAddCategoryShowcase}
          onDeleteCategoryShowcase={handleDeleteCategoryShowcase}
        />
      )}
    </div>
  );
}