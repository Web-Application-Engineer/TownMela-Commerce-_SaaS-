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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

export type FooterLink = {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

export type FooterSettings = {
  businessName: string;
  logo: string;
  description: string;

  phone: string;
  email: string;
  address: string;

  facebook: string;
  instagram: string;
  youtube: string;
  linkedin: string;

  googleMapUrl: string;

  footerLinks: FooterLink[];

  copyrightText: string;

  isActive: boolean;
};

type FooterSettingsResponse = {
  success: boolean;
  message?: string;
  data?: Partial<FooterSettings>;
};

type FooterSettingsContextValue = {
  settings: FooterSettings;
  isLoading: boolean;
  refreshFooterSettings: () => Promise<void>;
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultFooterSettings: FooterSettings = {
  businessName: "TownMela",
  logo: "",
  description: "",

  phone: "",
  email: "",
  address: "",

  facebook: "",
  instagram: "",
  youtube: "",
  linkedin: "",

  googleMapUrl: "",

  footerLinks: [],

  copyrightText: "",

  isActive: true,
};

/* =========================================================
   CONTEXT
========================================================= */

const FooterSettingsContext =
  createContext<
    FooterSettingsContextValue | undefined
  >(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export function FooterSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    settings,
    setSettings,
  ] =
    useState<FooterSettings>(
      defaultFooterSettings,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  /* =======================================================
     LOAD PUBLIC FOOTER SETTINGS
  ======================================================= */

  const refreshFooterSettings =
    useCallback(async () => {
      try {
        setIsLoading(true);

        const response =
          await fetch(
            `${API_BASE_URL}/api/footer-settings/public`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },

              cache:
                "no-store",
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | FooterSettingsResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load footer settings.",
          );
        }

        const data =
          payload.data ?? {};

        setSettings({
          ...defaultFooterSettings,
          ...data,

          footerLinks:
            Array.isArray(
              data.footerLinks,
            )
              ? data.footerLinks
              : [],
        });
      } catch (error) {
        console.error(
          "Public footer settings load error:",
          error,
        );

        setSettings(
          defaultFooterSettings,
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void refreshFooterSettings();
  }, [
    refreshFooterSettings,
  ]);

  /* =======================================================
     REFRESH AFTER ADMIN UPDATE
  ======================================================= */

  useEffect(() => {
    const handleFooterSettingsUpdated =
      () => {
        void refreshFooterSettings();
      };

    window.addEventListener(
      "footer-settings-updated",
      handleFooterSettingsUpdated,
    );

    return () => {
      window.removeEventListener(
        "footer-settings-updated",
        handleFooterSettingsUpdated,
      );
    };
  }, [
    refreshFooterSettings,
  ]);

  return (
    <FooterSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshFooterSettings,
      }}
    >
      {children}
    </FooterSettingsContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useFooterSettings() {
  const context =
    useContext(
      FooterSettingsContext,
    );

  if (!context) {
    throw new Error(
      "useFooterSettings must be used inside FooterSettingsProvider.",
    );
  }

  return context;
}