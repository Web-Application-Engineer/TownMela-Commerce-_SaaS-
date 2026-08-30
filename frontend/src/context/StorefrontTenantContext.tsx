"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const LOCAL_TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ??
  "";

/* =========================================================
   TYPES
========================================================= */

export type StorefrontTenant = {
  _id: string;
  tenantId?: string;

  businessName?: string;
  storeName?: string;
  customDomain?: string;

  branding?: {
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    storeTitle?: string;
    storeTagline?: string;
  };

  status?: string;

  subscription?: {
    plan?: string;
    status?: string;
    isTrial?: boolean;
    trialEndsAt?: string | null;
    expiresAt?: string | null;
  };
};

type StorefrontTenantResponse = {
  success?: boolean;
  message?: string;
  data?: {
    tenant?: StorefrontTenant;
  };
};

type StorefrontTenantContextValue = {
  tenant: StorefrontTenant | null;
  tenantId: string;
  hostname: string;
  isLoading: boolean;
  error: string;
  refreshStorefrontTenant: () => Promise<void>;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeHostname(
  value: string,
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .trim();
}

function isLocalHostname(
  hostname: string,
) {
  return [
    "localhost",
    "127.0.0.1",
    "::1",
  ].includes(hostname);
}

function getStoredAdminToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const tokenKeys = [
    "townmelaAdminToken",
    "accessToken",
    "token",
    "authToken",
    "jwt",
  ];

  for (
    const key of tokenKeys
  ) {
    const value =
      window.localStorage.getItem(
        key,
      );

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractTenant(
  payload:
    | StorefrontTenantResponse
    | null,
) {
  const tenant =
    payload?.data?.tenant;

  if (
    !tenant ||
    typeof tenant !== "object"
  ) {
    return null;
  }

  const tenantId =
    String(
      tenant._id ||
        tenant.tenantId ||
        "",
    ).trim();

  if (!tenantId) {
    return null;
  }

  return {
    ...tenant,
    _id: tenantId,
  } satisfies StorefrontTenant;
}

/* =========================================================
   CONTEXT
========================================================= */

const StorefrontTenantContext =
  createContext<
    StorefrontTenantContextValue | undefined
  >(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export function StorefrontTenantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    tenant,
    setTenant,
  ] =
    useState<
      StorefrontTenant | null
    >(null);

  const [
    hostname,
    setHostname,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const refreshStorefrontTenant =
    useCallback(async () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const currentHostname =
          normalizeHostname(
            window.location.hostname,
          );

        setHostname(
          currentHostname,
        );

        /* =================================================
           LOCAL DEVELOPMENT

           On localhost only, reuse the existing
           NEXT_PUBLIC_TENANT_ID environment value.

           IMPORTANT:
           This fallback is intentionally NOT used on
           custom production domains, so one tenant cannot
           accidentally override another tenant by build env.
        ================================================= */

        if (
          isLocalHostname(
            currentHostname,
          )
        ) {
          const localTenantId =
            String(
              LOCAL_TENANT_ID,
            ).trim();

          if (!localTenantId) {
            throw new Error(
              "NEXT_PUBLIC_TENANT_ID is required for localhost storefront development.",
            );
          }

          /*
           * LOCALHOST MUST LOAD THE REAL TENANT RECORD.
           *
           * Previously only {_id} was stored here, so fields such
           * as tenant.storeName were unavailable and storefront
           * components fell back to Header Business Name.
           *
           * We now load the actual tenant record so Store Name is
           * available exactly like it is on a custom domain.
           */

          const token =
            getStoredAdminToken();

          const localResponse =
            await fetch(
              `${API_BASE_URL}/api/tenants/${encodeURIComponent(
                localTenantId,
              )}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",

                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),

                  "X-Tenant-Id":
                    localTenantId,
                },
                cache:
                  "no-store",
                credentials:
                  "include",
              },
            );

          const localPayload =
            (await localResponse
              .json()
              .catch(
                () => null,
              )) as
              | StorefrontTenantResponse
              | null;

          const localTenant =
            extractTenant(
              localPayload,
            );

          if (
            localResponse.ok &&
            localPayload?.success &&
            localTenant
          ) {
            setTenant(
              localTenant,
            );

            return;
          }

          /*
           * Keep localhost storefront usable even when the
           * protected tenant-details route is unavailable.
           * In that case only the tenant ID is retained.
           */
          setTenant({
            _id:
              localTenantId,
          });

          return;
        }

        /* =================================================
           CUSTOM DOMAIN

           Resolve the active tenant from the storefront
           hostname using the existing public backend route.
        ================================================= */

        const response =
          await fetch(
            `${API_BASE_URL}/api/tenants/domain/${encodeURIComponent(
              currentHostname,
            )}`,
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
            | StorefrontTenantResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Store tenant could not be resolved.",
          );
        }

        const resolvedTenant =
          extractTenant(
            payload,
          );

        if (!resolvedTenant) {
          throw new Error(
            "Store tenant information was not found.",
          );
        }

        setTenant(
          resolvedTenant,
        );
      } catch (tenantError) {
        console.error(
          "Storefront tenant resolution error:",
          tenantError,
        );

        setTenant(null);

        setError(
          tenantError instanceof Error
            ? tenantError.message
            : "Store tenant could not be resolved.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void refreshStorefrontTenant();
  }, [
    refreshStorefrontTenant,
  ]);

  const tenantId =
    useMemo(
      () =>
        String(
          tenant?._id ||
            tenant?.tenantId ||
            "",
        ).trim(),
      [
        tenant,
      ],
    );

  const value =
    useMemo<
      StorefrontTenantContextValue
    >(
      () => ({
        tenant,
        tenantId,
        hostname,
        isLoading,
        error,
        refreshStorefrontTenant,
      }),
      [
        tenant,
        tenantId,
        hostname,
        isLoading,
        error,
        refreshStorefrontTenant,
      ],
    );

  return (
    <StorefrontTenantContext.Provider
      value={value}
    >
      {children}
    </StorefrontTenantContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useStorefrontTenant() {
  const context =
    useContext(
      StorefrontTenantContext,
    );

  if (!context) {
    throw new Error(
      "useStorefrontTenant must be used inside StorefrontTenantProvider.",
    );
  }

  return context;
}
