"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

/* =========================================================
   LOCAL TENANT HELPERS
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
   HOOK
========================================================= */

export default function useHomepageProductSectionTitle(
  sectionKey: string,
  fallbackTitle: string,
) {
  const [
    title,
    setTitle,
  ] =
    useState(
      fallbackTitle,
    );

  const [
    active,
    setActive,
  ] =
    useState(true);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /* =======================================================
     LOAD SECTION TITLE
  ======================================================= */

  const loadSectionTitle =
    useCallback(
      async () => {
        try {
          setIsLoading(true);

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
            throw new Error(
              payload?.message ||
                "Failed to load homepage product section settings.",
            );
          }

          if (
            payload.data
              ?.isActive ===
            false
          ) {
            setTitle(
              fallbackTitle,
            );

            setActive(
              false,
            );

            return;
          }

          const sections =
            Array.isArray(
              payload.data
                ?.sections,
            )
              ? payload.data
                  .sections
              : [];

          const matchedSection =
            sections.find(
              (
                section,
              ) =>
                String(
                  section.key ||
                    "",
                ).trim() ===
                sectionKey,
            );

          if (
            !matchedSection
          ) {
            setTitle(
              fallbackTitle,
            );

            setActive(
              true,
            );

            return;
          }

          setTitle(
            matchedSection.title
              ?.trim() ||
              fallbackTitle,
          );

          setActive(
            matchedSection.active !==
              false,
          );
        } catch (
          error
        ) {
          console.error(
            `Failed to load homepage section "${sectionKey}":`,
            error,
          );

          setTitle(
            fallbackTitle,
          );

          setActive(
            true,
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        fallbackTitle,
        sectionKey,
      ],
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadSectionTitle();
  }, [
    loadSectionTitle,
  ]);

  /* =======================================================
     ADMIN SETTINGS UPDATED
  ======================================================= */

  useEffect(() => {
    const handleUpdated =
      () => {
        void loadSectionTitle();
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
    loadSectionTitle,
  ]);

  /* =======================================================
     TENANT SWITCH / STORAGE CHANGE
  ======================================================= */

  useEffect(() => {
    const handleStorageChange =
      (
        event: StorageEvent,
      ) => {
        if (
          !event.key ||
          TENANT_STORAGE_KEYS.includes(
            event.key as
              (typeof TENANT_STORAGE_KEYS)[number],
          )
        ) {
          void loadSectionTitle();
        }
      };

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, [
    loadSectionTitle,
  ]);

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    title,
    active,
    isLoading,
    refresh:
      loadSectionTitle,
  };
}