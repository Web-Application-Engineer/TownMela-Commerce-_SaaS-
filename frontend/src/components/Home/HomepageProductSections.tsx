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

import CategoryShowcaseOne from "./CategoryShowcaseOne";
import CategoryShowcaseTwo from "./CategoryShowcaseTwo";
import CategoryShowcaseThree from "./CategoryShowcaseThree";

import type {
  Product,
} from "../../types/product";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  (
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
};

type HomepageProductSectionResponse = {
  success: boolean;
  message?: string;

  data?: {
    sections?: HomepageProductSection[];
    isActive?: boolean;
  };
};

type HomepageProductSectionsProps = {
  initialProducts: Product[];
  initialError?: string | null;
};

/* =========================================================
   DEFAULT SECTION ORDER
========================================================= */

const DEFAULT_SECTIONS: HomepageProductSection[] = [
  {
    key: "topselling",
    title: "Top Selling",
    active: true,
    order: 1,
  },

  {
    key: "exclusive",
    title: "Exclusive",
    active: true,
    order: 2,
  },

  {
    key: "newarrival",
    title: "New Arrival",
    active: true,
    order: 3,
  },

  {
    key: "fashionstyle",
    title: "Fashion & Style",
    active: true,
    order: 4,
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

const isValidTenantId = (
  value: string,
) =>
  /^[a-f\d]{24}$/i.test(
    value,
  );

const getActiveTenantId =
  () => {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    for (
      const key of
      TENANT_STORAGE_KEYS
    ) {
      const tenantId =
        window.localStorage
          .getItem(key)
          ?.trim() || "";

      if (
        isValidTenantId(
          tenantId,
        )
      ) {
        return tenantId;
      }
    }

    return "";
  };

/* =========================================================
   SUPPORTED SECTION KEYS
========================================================= */

const normalizeSectionKey = (
  value: string,
) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "",
    );

/* =========================================================
   COMPONENT
========================================================= */

export default function HomepageProductSections({
  initialProducts,
  initialError = null,
}: HomepageProductSectionsProps) {
  const [
    sections,
    setSections,
  ] =
    useState<HomepageProductSection[]>(
      DEFAULT_SECTIONS,
    );

  const [
    sectionsActive,
    setSectionsActive,
  ] =
    useState(true);

  /* =======================================================
     LOAD SECTION ORDER
  ======================================================= */

  const loadSections =
    useCallback(
      async () => {
        try {
          const tenantId =
            getActiveTenantId();

          const response =
            await fetch(
              `${API_BASE_URL}/api/homepage-product-section-settings`,
              {
                method:
                  "GET",

                headers: {
                  Accept:
                    "application/json",

                  ...(tenantId
                    ? {
                        "X-Tenant-Id":
                          tenantId,
                      }
                    : {}),
                },

                cache:
                  "no-store",
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | HomepageProductSectionResponse
              | null;

          if (
            !response.ok ||
            !payload?.success
          ) {
            return;
          }

          setSectionsActive(
            payload.data
              ?.isActive !==
              false,
          );

          const apiSections =
            Array.isArray(
              payload.data
                ?.sections,
            )
              ? payload.data
                  .sections
              : [];

          if (
            apiSections.length ===
            0
          ) {
            setSections(
              DEFAULT_SECTIONS,
            );

            return;
          }

          setSections(
            [...apiSections]
              .map(
                (
                  section,
                  index,
                ) => ({
                  ...section,

                  key:
                    normalizeSectionKey(
                      section.key,
                    ),

                  order:
                    Math.max(
                      1,
                      Number(
                        section.order,
                      ) ||
                        index +
                          1,
                    ),

                  active:
                    section.active !==
                    false,
                }),
              )
              .sort(
                (
                  firstSection,
                  secondSection,
                ) =>
                  firstSection.order -
                  secondSection.order,
              ),
          );
        } catch (
          error
        ) {
          console.error(
            "Failed to load homepage product section order:",
            error,
          );
        }
      },
      [],
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadSections();
  }, [
    loadSections,
  ]);

  /* =======================================================
     REFRESH AFTER ADMIN SAVE
  ======================================================= */

  useEffect(() => {
    const handleUpdated =
      () => {
        void loadSections();
      };

    window.addEventListener(
      "homepage:product-sections-updated",
      handleUpdated,
    );

    return () => {
      window.removeEventListener(
        "homepage:product-sections-updated",
        handleUpdated,
      );
    };
  }, [
    loadSections,
  ]);

  /* =======================================================
     SUPPORTED + ACTIVE SECTIONS
  ======================================================= */

  const visibleSections =
    useMemo(
      () =>
        sections.filter(
          (section) =>
            section.active !==
              false &&
            [
              "topselling",
              "exclusive",
              "newarrival",
              "fashionstyle",
            ].includes(
              normalizeSectionKey(
                section.key,
              ),
            ),
        ),
      [
        sections,
      ],
    );

  /* =======================================================
     PRODUCTS BY HOMEPAGE SECTION

     Each homepage product section receives only products
     assigned to that section during product create/edit.
  ======================================================= */

  const productsBySection =
    useMemo(() => {
      const groupedProducts:
        Record<string, Product[]> = {
          topselling: [],
          exclusive: [],
          newarrival: [],
          fashionstyle: [],
        };

      for (const product of initialProducts) {
        const normalizedProductSection =
          normalizeSectionKey(
            product.homepageSection || "",
          );

        if (
          Object.prototype.hasOwnProperty.call(
            groupedProducts,
            normalizedProductSection,
          )
        ) {
          groupedProducts[
            normalizedProductSection
          ].push(product);
        }
      }

      return groupedProducts;
    }, [initialProducts]);

  /* =======================================================
     RENDER PRODUCT SECTION
  ======================================================= */

  const renderProductSection =
    (
      section:
        HomepageProductSection,
    ) => {
      const normalizedKey =
        normalizeSectionKey(
          section.key,
        );

      switch (
        normalizedKey
      ) {
        case "topselling":
          return (
            <TopSellingProducts
              key={
                section.key
              }
              initialProducts={
                productsBySection.topselling
              }
              initialError={
                initialError
              }
            />
          );

        case "exclusive":
          return (
            <ExclusiveProducts
              key={
                section.key
              }
              initialProducts={
                productsBySection.exclusive
              }
              initialError={
                initialError
              }
            />
          );

        case "newarrival":
          return (
            <NewArrival
              key={
                section.key
              }
              initialProducts={
                productsBySection.newarrival
              }
              initialError={
                initialError
              }
            />
          );

        case "fashionstyle":
          return (
            <WomenFashion
              key={
                section.key
              }
              initialProducts={
                productsBySection.fashionstyle
              }
              initialError={
                initialError
              }
            />
          );

        default:
          return null;
      }
    };

  /* =======================================================
     DISABLED
  ======================================================= */

  if (
    !sectionsActive
  ) {
    return null;
  }

  /* =======================================================
     OUTPUT

     Product slot 1
     Showcase One
     Product slot 2
     Showcase Two
     Product slot 3
     Showcase Three
     Product slot 4
  ======================================================= */

  return (
    <>
      {visibleSections[0] &&
        renderProductSection(
          visibleSections[0],
        )}

      <CategoryShowcaseOne />

      {visibleSections[1] &&
        renderProductSection(
          visibleSections[1],
        )}

      <CategoryShowcaseTwo />

      {visibleSections[2] &&
        renderProductSection(
          visibleSections[2],
        )}

      <CategoryShowcaseThree />

      {visibleSections[3] &&
        renderProductSection(
          visibleSections[3],
        )}

      {visibleSections
        .slice(4)
        .map(
          (
            section,
          ) =>
            renderProductSection(
              section,
            ),
        )}
    </>
  );
}