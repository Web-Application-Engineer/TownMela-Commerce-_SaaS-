"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

/*
 * Local development fallback only.
 *
 * Live tenant domains should be resolved by the backend
 * from the current domain.
 */
const DEFAULT_TENANT_ID = (
  process.env.NEXT_PUBLIC_TENANT_ID ??
  ""
).trim();

/* =========================================================
   TYPES
========================================================= */

export type HeaderMenuItem = {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

export type HeaderSettings = {
  businessName: string;

  logo: string;

  mobileLogo: string;

  phone: string;

  email: string;

  announcementText: string;

  announcementEnabled: boolean;

  menus: HeaderMenuItem[];

  searchEnabled: boolean;

  wishlistEnabled: boolean;

  accountEnabled: boolean;

  cartEnabled: boolean;

  isActive: boolean;
};

type HeaderSettingsResponse = {
  success: boolean;

  message?: string;

  data?: Partial<HeaderSettings>;
};

type HeaderSettingsContextValue = {
  settings: HeaderSettings;

  isLoading: boolean;

  refreshHeaderSettings:
    () => Promise<void>;
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultHeaderSettings:
  HeaderSettings = {
  businessName: "TownMela",

  logo: "",

  mobileLogo: "",

  phone: "",

  email: "",

  announcementText: "",

  announcementEnabled: false,

  menus: [],

  searchEnabled: true,

  wishlistEnabled: true,

  accountEnabled: true,

  cartEnabled: true,

  isActive: true,
};

/* =========================================================
   CONTEXT
========================================================= */

const HeaderSettingsContext =
  createContext<
    HeaderSettingsContextValue | undefined
  >(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export function HeaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    settings,
    setSettings,
  ] =
    useState<HeaderSettings>(
      defaultHeaderSettings,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /* =======================================================
     LOAD PUBLIC HEADER SETTINGS
  ======================================================= */

  const refreshHeaderSettings =
    useCallback(async () => {
      try {
        setIsLoading(true);

        const headers:
          HeadersInit = {
          Accept:
            "application/json",
        };

        /*
         * On localhost the backend cannot resolve a custom
         * tenant domain, so NEXT_PUBLIC_TENANT_ID is used.
         *
         * On live tenant domains this header can stay absent
         * and resolvePublicTenant can use the current host.
         */
        const currentHostname =
          typeof window !== "undefined"
            ? window.location.hostname
            : "";

        const isLocalRequest =
          [
            "localhost",
            "127.0.0.1",
            "::1",
          ].includes(
            currentHostname,
          );

        if (
          isLocalRequest &&
          DEFAULT_TENANT_ID
        ) {
          headers[
            "X-Tenant-Id"
          ] =
            DEFAULT_TENANT_ID;
        }

        const headerApiBaseUrl =
          typeof window !== "undefined" &&
          !isLocalRequest
            ? window.location.origin
            : API_BASE_URL;

        const response =
          await fetch(
            `${headerApiBaseUrl}/api/header-settings/public`,
            {
              method: "GET",

              headers,

              cache:
                "no-store",

              credentials:
                "include",
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | HeaderSettingsResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load header settings.",
          );
        }

        const data =
          payload.data ||
          {};

        setSettings({
          ...defaultHeaderSettings,

          ...data,

          menus:
            Array.isArray(
              data.menus,
            )
              ? data.menus
              : [],
        });
      } catch (error) {
        console.error(
          "Public header settings load error:",
          error,
        );

        /*
         * Keep a safe fallback if the tenant header
         * configuration cannot be loaded.
         */
        setSettings(
          defaultHeaderSettings,
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void refreshHeaderSettings();
  }, [
    refreshHeaderSettings,
  ]);

  /* =======================================================
     REFRESH AFTER HEADER MANAGEMENT UPDATE
  ======================================================= */

  useEffect(() => {
    const handleHeaderSettingsUpdated =
      () => {
        void refreshHeaderSettings();
      };

    window.addEventListener(
      "header-settings-updated",
      handleHeaderSettingsUpdated,
    );

    return () => {
      window.removeEventListener(
        "header-settings-updated",
        handleHeaderSettingsUpdated,
      );
    };
  }, [
    refreshHeaderSettings,
  ]);

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <HeaderSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshHeaderSettings,
      }}
    >
      {children}
    </HeaderSettingsContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useHeaderSettings() {
  const context =
    useContext(
      HeaderSettingsContext,
    );

  if (!context) {
    throw new Error(
      "useHeaderSettings must be used inside HeaderSettingsProvider.",
    );
  }

  return context;
}