"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

const DIGITAL_PLATFORM_LABEL =
  "Explore Digital Presence";

const DIGITAL_PLATFORM_URL =
  "https://www.sreste.com";

/* =========================================================
   TYPES
========================================================= */

export type FooterLink = {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

export type AdditionalSocialLink = {
  label: string;
  url: string;
  iconText: string;
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

  additionalSocialLinks:
    AdditionalSocialLink[];

  backgroundImage: string;

  popularCategoryHeading: string;
  popularCategoryLinks: FooterLink[];
  showPopularCategory: boolean;

  customerInfoHeading: string;
  customerInfoLinks: FooterLink[];
  showCustomerInfo: boolean;

  quickNavigationHeading: string;
  quickNavigationLinks: FooterLink[];
  showQuickNavigation: boolean;

  googleMapHeading: string;
  googleMapCtaText: string;
  googleMapUrl: string;
  showGoogleMap: boolean;

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
   QUICK NAVIGATION LEGACY ROUTE NORMALIZER

   Older saved footer settings may contain /support.
   The actual storefront page is /customer-support.
========================================================= */

function isDigitalPlatformLink(
  link: FooterLink,
) {
  const normalizedLabel =
    String(link.label || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const normalizedUrl =
    String(link.url || "")
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "");

  return (
    normalizedLabel ===
      DIGITAL_PLATFORM_LABEL.toLowerCase() ||
    normalizedUrl ===
      "https://www.sreste.com" ||
    normalizedUrl ===
      "https://sreste.com" ||
    normalizedUrl ===
      "www.sreste.com" ||
    normalizedUrl ===
      "sreste.com"
  );
}

function normalizeQuickNavigationLinks(
  links: FooterLink[],
): FooterLink[] {
  const normalizedLinks =
    links
      .filter((link) => {
        const normalizedUrl =
          String(link.url || "")
            .trim()
            .toLowerCase();

        const normalizedLabel =
          String(link.label || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        return !(
          normalizedUrl ===
            "/my-account" ||
          normalizedLabel ===
            "my account"
        );
      })
      .map((link) => {
        const normalizedUrl =
          String(link.url || "")
            .trim()
            .toLowerCase();

        const normalizedLabel =
          String(link.label || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        if (
          normalizedUrl ===
            "/support" ||
          normalizedLabel ===
            "support" ||
          normalizedLabel ===
            "customer support"
        ) {
          return {
            ...link,
            label:
              normalizedLabel ===
              "support"
                ? "Customer Support"
                : link.label,
            url:
              "/customer-support",
          };
        }

        if (
          isDigitalPlatformLink(
            link,
          )
        ) {
          return {
            ...link,
            label:
              DIGITAL_PLATFORM_LABEL,
            url:
              DIGITAL_PLATFORM_URL,
          };
        }

        return link;
      });

  if (
    !normalizedLinks.some(
      (link) =>
        isDigitalPlatformLink(
          link,
        ),
    )
  ) {
    normalizedLinks.push({
      label:
        DIGITAL_PLATFORM_LABEL,
      url:
        DIGITAL_PLATFORM_URL,
      enabled: true,
      order:
        normalizedLinks.length +
        1,
    });
  }

  return normalizedLinks;
}

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

  additionalSocialLinks: [],

  backgroundImage:
    "/images/real-dhaka.webp",

  popularCategoryHeading:
    "Popular Category",

  popularCategoryLinks:
    [
    { label: "Smart Gadgets", url: "/shop?category=smart-gadgets", enabled: true, order: 1 },
    { label: "Gents Fashion", url: "/shop?category=gents-fashion", enabled: true, order: 2 },
    { label: "Phone Accessories", url: "/shop?category=phone-accessories", enabled: true, order: 3 },
    { label: "Women Fashion", url: "/shop?category=women-fashion", enabled: true, order: 4 },
    { label: "Watches", url: "/shop?category=watches", enabled: true, order: 5 },
    { label: "Electronics", url: "/shop?category=electronics", enabled: true, order: 6 },
  ],

  showPopularCategory: true,

  customerInfoHeading:
    "Customer Info",

  customerInfoLinks:
    [
    { label: "Shop", url: "/shop", enabled: true, order: 1 },
    { label: "About Us", url: "/about-us", enabled: true, order: 2 },
    { label: "Contact Us", url: "/contact-us", enabled: true, order: 3 },
    { label: "Privacy Policy", url: "/privacy-policy", enabled: true, order: 4 },
    { label: "Terms & Conditions", url: "/terms-and-conditions", enabled: true, order: 5 },
    { label: "Return & Refund Policy", url: "/return-refund-policy", enabled: true, order: 6 },
  ],

  showCustomerInfo: true,

  quickNavigationHeading:
    "Quick Navigation",

  quickNavigationLinks:
    [
    { label: "Track Orders", url: "/order-tracking", enabled: true, order: 1 },
    { label: "Cart", url: "/cart", enabled: true, order: 2 },
    { label: "Checkout", url: "/checkout", enabled: true, order: 3 },
    { label: "Customer Support", url: "/customer-support", enabled: true, order: 4 },
    { label: DIGITAL_PLATFORM_LABEL, url: DIGITAL_PLATFORM_URL, enabled: true, order: 5 },
  ],

  showQuickNavigation: true,

  googleMapHeading:
    "Find us on Google Map",

  googleMapCtaText:
    "Find us on Google map",

  googleMapUrl: "",

  showGoogleMap: true,

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
  const {
    tenantId,
    isLoading:
      isTenantLoading,
  } =
    useStorefrontTenant();

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

  const refreshFooterSettings =
    useCallback(async () => {
      if (isTenantLoading) {
        return;
      }

      if (!tenantId) {
        setSettings(
          defaultFooterSettings,
        );

        setIsLoading(false);

        return;
      }

      try {
        setIsLoading(true);

        const footerApiBaseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : API_BASE_URL;

        const response =
          await fetch(
            `${footerApiBaseUrl}/api/footer-settings/public`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                "X-Tenant-Id":
                  tenantId,
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

          additionalSocialLinks:
            Array.isArray(
              data.additionalSocialLinks,
            )
              ? data.additionalSocialLinks
              : [],

          popularCategoryLinks:
            Array.isArray(
              data.popularCategoryLinks,
            )
              ? data.popularCategoryLinks
              : defaultFooterSettings
                  .popularCategoryLinks,

          customerInfoLinks:
            Array.isArray(
              data.customerInfoLinks,
            )
              ? data.customerInfoLinks
              : defaultFooterSettings
                  .customerInfoLinks,

          quickNavigationLinks:
            Array.isArray(
              data.quickNavigationLinks,
            )
              ? normalizeQuickNavigationLinks(
                  data.quickNavigationLinks,
                )
              : defaultFooterSettings
                  .quickNavigationLinks,

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
    }, [
      isTenantLoading,
      tenantId,
    ]);

  useEffect(() => {
    void refreshFooterSettings();
  }, [
    refreshFooterSettings,
  ]);

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
