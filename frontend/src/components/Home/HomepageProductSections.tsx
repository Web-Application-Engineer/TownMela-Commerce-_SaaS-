"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ExclusiveProducts from "./ExclusiveProducts";
import TopSellingProducts from "./TopSellingProducts";
import NewArrival from "./NewArrival";
import WomenFashion from "./FashionAndStyle";
import DynamicProductSection from "./DynamicProductSection";
import CategoryShowcase from "./CategoryShowcase";

import type { Product } from "../../types/product";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

/* =========================================================
   TYPES
========================================================= */

type HomepageProductSection = {
  id?: string;
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder?: number;
};

type HomepageProductSectionResponse = {
  success: boolean;
  message?: string;
  data?: {
    sections?: HomepageProductSection[];
    isActive?: boolean;
  };
};

type HomepageCategoryShowcaseItem = {
  _id?: string;
  key: string;
  title: string;
  active?: boolean;
  order?: number;
  layoutOrder?: number;
};

type HomepageCategoryShowcaseResponse = {
  success: boolean;
  message?: string;
  showcaseConfig?: {
    showcases?: HomepageCategoryShowcaseItem[];
    showcaseOne?: { title?: string };
    showcaseTwo?: { title?: string };
    showcaseThree?: { title?: string };
  };
};

type HomepageProductSectionsProps = {
  initialProducts: Product[];
  initialError?: string | null;
};

type HomepageLayoutItem =
  | {
      type: "product";
      key: string;
      layoutOrder: number;
      section: HomepageProductSection;
    }
  | {
      type: "category";
      key: string;
      layoutOrder: number;
      showcase: HomepageCategoryShowcaseItem;
    };

/* =========================================================
   DEFAULTS
========================================================= */

const DEFAULT_SECTIONS: HomepageProductSection[] = [
  {
    key: "topselling",
    title: "Top Selling",
    active: true,
    order: 1,
    layoutOrder: 1,
  },
  {
    key: "exclusive",
    title: "Exclusive",
    active: true,
    order: 2,
    layoutOrder: 3,
  },
  {
    key: "newarrival",
    title: "New Arrival",
    active: true,
    order: 3,
    layoutOrder: 5,
  },
  {
    key: "fashionstyle",
    title: "Fashion & Style",
    active: true,
    order: 4,
    layoutOrder: 7,
  },
];

const DEFAULT_SHOWCASES: HomepageCategoryShowcaseItem[] = [
  {
    key: "showcaseOne",
    title: "Explore Categories",
    active: true,
    order: 1,
    layoutOrder: 2,
  },
  {
    key: "showcaseTwo",
    title: "Featured Categories",
    active: true,
    order: 2,
    layoutOrder: 4,
  },
  {
    key: "showcaseThree",
    title: "More Categories",
    active: true,
    order: 3,
    layoutOrder: 6,
  },
];

/* =========================================================
   TENANT HELPERS
========================================================= */

const TENANT_STORAGE_KEYS = [
  "selectedTenantId",
  "activeTenantId",
  "tenantId",
  "tenant_id",
] as const;

const isValidTenantId = (value: string) =>
  /^[a-f\d]{24}$/i.test(value);

const getActiveTenantId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of TENANT_STORAGE_KEYS) {
    const tenantId =
      window.localStorage.getItem(key)?.trim() || "";

    if (isValidTenantId(tenantId)) {
      return tenantId;
    }
  }

  return "";
};

const getPublicHeaders = () => {
  const tenantId = getActiveTenantId();

  return {
    Accept: "application/json",
    ...(tenantId
      ? {
          "X-Tenant-Id": tenantId,
        }
      : {}),
  };
};

const normalizeSectionKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const legacyShowcasesFromResponse = (
  config: HomepageCategoryShowcaseResponse["showcaseConfig"],
): HomepageCategoryShowcaseItem[] => [
  {
    ...DEFAULT_SHOWCASES[0],
    title:
      config?.showcaseOne?.title?.trim() ||
      DEFAULT_SHOWCASES[0].title,
  },
  {
    ...DEFAULT_SHOWCASES[1],
    title:
      config?.showcaseTwo?.title?.trim() ||
      DEFAULT_SHOWCASES[1].title,
  },
  {
    ...DEFAULT_SHOWCASES[2],
    title:
      config?.showcaseThree?.title?.trim() ||
      DEFAULT_SHOWCASES[2].title,
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function HomepageProductSections({
  initialProducts,
  initialError = null,
}: HomepageProductSectionsProps) {
  const [sections, setSections] =
    useState<HomepageProductSection[]>(DEFAULT_SECTIONS);

  const [sectionsActive, setSectionsActive] =
    useState(true);

  const [categoryShowcases, setCategoryShowcases] =
    useState<HomepageCategoryShowcaseItem[]>(
      DEFAULT_SHOWCASES,
    );

  /* =======================================================
     LOAD TENANT HOMEPAGE CONTENT LAYOUT
  ======================================================= */

  const loadHomepageLayout = useCallback(async () => {
    try {
      const headers = getPublicHeaders();

      const [productResponse, categoryResponse] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/homepage-product-section-settings`,
            {
              method: "GET",
              headers,
              cache: "no-store",
            },
          ),
          fetch(
            `${API_BASE_URL}/api/homepage-category-showcases`,
            {
              method: "GET",
              headers,
              cache: "no-store",
            },
          ),
        ]);

      const productPayload =
        (await productResponse
          .json()
          .catch(() => null)) as
          | HomepageProductSectionResponse
          | null;

      const categoryPayload =
        (await categoryResponse
          .json()
          .catch(() => null)) as
          | HomepageCategoryShowcaseResponse
          | null;

      if (productResponse.ok && productPayload?.success) {
        setSectionsActive(
          productPayload.data?.isActive !== false,
        );

        const apiSections = Array.isArray(
          productPayload.data?.sections,
        )
          ? productPayload.data?.sections ?? []
          : [];

        setSections(
          apiSections.length > 0
            ? apiSections.map((section, index) => ({
                ...section,
                key: normalizeSectionKey(section.key),
                active: section.active !== false,
                order: Math.max(
                  1,
                  Number(section.order) || index + 1,
                ),
                layoutOrder: Math.max(
                  1,
                  Number(section.layoutOrder) ||
                    index * 2 + 1,
                ),
              }))
            : DEFAULT_SECTIONS,
        );
      }

      if (
        categoryResponse.ok &&
        categoryPayload?.success &&
        categoryPayload.showcaseConfig
      ) {
        const dynamicShowcases = Array.isArray(
          categoryPayload.showcaseConfig.showcases,
        )
          ? categoryPayload.showcaseConfig.showcases
          : [];

        setCategoryShowcases(
          (dynamicShowcases.length > 0
            ? dynamicShowcases
            : legacyShowcasesFromResponse(
                categoryPayload.showcaseConfig,
              )
          ).map((showcase, index) => ({
            ...showcase,
            key:
              showcase.key?.trim() ||
              `showcase-${index + 1}`,
            title:
              showcase.title?.trim() ||
              `Category Showcase ${index + 1}`,
            active: showcase.active !== false,
            order: Math.max(
              1,
              Number(showcase.order) || index + 1,
            ),
            layoutOrder: Math.max(
              1,
              Number(showcase.layoutOrder) ||
                index * 2 + 2,
            ),
          })),
        );
      }
    } catch (error) {
      console.error(
        "Failed to load homepage content layout:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    void loadHomepageLayout();
  }, [loadHomepageLayout]);

  useEffect(() => {
    const refresh = () => {
      void loadHomepageLayout();
    };

    window.addEventListener(
      "homepage:product-sections-updated",
      refresh,
    );
    window.addEventListener(
      "homepage:category-showcases-updated",
      refresh,
    );

    return () => {
      window.removeEventListener(
        "homepage:product-sections-updated",
        refresh,
      );
      window.removeEventListener(
        "homepage:category-showcases-updated",
        refresh,
      );
    };
  }, [loadHomepageLayout]);

  /* =======================================================
     PRODUCTS BY PRODUCT SECTION
  ======================================================= */

  const productsBySection = useMemo(() => {
    const groupedProducts: Record<string, Product[]> = {};

    for (const section of sections) {
      const key = normalizeSectionKey(section.key);

      if (key && !groupedProducts[key]) {
        groupedProducts[key] = [];
      }
    }

    for (const product of initialProducts) {
      const key = normalizeSectionKey(
        product.homepageSection || "",
      );

      if (key && groupedProducts[key]) {
        groupedProducts[key].push(product);
      }
    }

    return groupedProducts;
  }, [initialProducts, sections]);

  /* =======================================================
     GLOBAL HOMEPAGE CONTENT ORDER
  ======================================================= */

  const layoutItems = useMemo<HomepageLayoutItem[]>(() => {
    const productItems: HomepageLayoutItem[] =
      sectionsActive
        ? sections
            .filter((section) => section.active !== false)
            .map((section, index) => ({
              type: "product" as const,
              key: section.key,
              layoutOrder: Math.max(
                1,
                Number(section.layoutOrder) ||
                  index * 2 + 1,
              ),
              section,
            }))
        : [];

    const categoryItems: HomepageLayoutItem[] =
      categoryShowcases
        .filter((showcase) => showcase.active !== false)
        .map((showcase, index) => ({
          type: "category" as const,
          key: showcase.key,
          layoutOrder: Math.max(
            1,
            Number(showcase.layoutOrder) ||
              index * 2 + 2,
          ),
          showcase,
        }));

    return [...productItems, ...categoryItems].sort(
      (a, b) => a.layoutOrder - b.layoutOrder,
    );
  }, [
    categoryShowcases,
    sections,
    sectionsActive,
  ]);

  /* =======================================================
     PRODUCT SECTION RENDERER
  ======================================================= */

  const renderProductSection = (
    section: HomepageProductSection,
  ) => {
    const normalizedKey =
      normalizeSectionKey(section.key);

    switch (normalizedKey) {
      case "topselling":
        return (
          <TopSellingProducts
            key={section.key}
            initialProducts={
              productsBySection.topselling || []
            }
            initialError={initialError}
          />
        );

      case "exclusive":
        return (
          <ExclusiveProducts
            key={section.key}
            initialProducts={
              productsBySection.exclusive || []
            }
            initialError={initialError}
          />
        );

      case "newarrival":
        return (
          <NewArrival
            key={section.key}
            initialProducts={
              productsBySection.newarrival || []
            }
            initialError={initialError}
          />
        );

      case "fashionstyle":
        return (
          <WomenFashion
            key={section.key}
            initialProducts={
              productsBySection.fashionstyle || []
            }
            initialError={initialError}
          />
        );

      default:
        return (
          <DynamicProductSection
            key={section.key}
            title={section.title}
            products={
              productsBySection[normalizedKey] || []
            }
            initialError={initialError}
          />
        );
    }
  };

  return (
    <>
      {layoutItems.map((item) => {
        if (item.type === "product") {
          return renderProductSection(item.section);
        }

        return (
          <CategoryShowcase
            key={item.showcase.key}
            showcaseKey={item.showcase.key}
            title={item.showcase.title}
            showAllText="Show All"
            showAllLink="/categories"
            emptyMessage={`Select and save categories for ${item.showcase.title} from the Admin Dashboard.`}
          />
        );
      })}
    </>
  );
}
