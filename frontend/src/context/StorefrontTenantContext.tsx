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

/*
 * Storefront tenant resolution is needed by many pages before
 * their own API requests can start. A short session cache avoids
 * serial tenant-resolution waits on repeat navigation/refreshes.
 */
const TENANT_CACHE_TTL_MS =
  5 * 60 * 1000;

const TENANT_CACHE_PREFIX =
  "townmela:storefront-tenant:";

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

type CachedStorefrontTenant = {
  tenant: StorefrontTenant;
  timestamp: number;
};

function getTenantCacheKey(
  hostname: string,
) {
  return `${TENANT_CACHE_PREFIX}${hostname}`;
}

function readCachedTenant(
  hostname: string,
): StorefrontTenant | null {
  if (
    typeof window ===
    "undefined" ||
    !hostname
  ) {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        getTenantCacheKey(
          hostname,
        ),
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw,
      ) as CachedStorefrontTenant;

    const cachedTenantId =
      String(
        parsed?.tenant?._id ||
          parsed?.tenant?.tenantId ||
          "",
      ).trim();

    if (
      !cachedTenantId ||
      !Number.isFinite(
        Number(
          parsed?.timestamp,
        ),
      ) ||
      Date.now() -
        Number(
          parsed.timestamp,
        ) >
        TENANT_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(
        getTenantCacheKey(
          hostname,
        ),
      );

      return null;
    }

    return {
      ...parsed.tenant,
      _id:
        cachedTenantId,
    };
  } catch {
    return null;
  }
}

function writeCachedTenant(
  hostname: string,
  tenant: StorefrontTenant,
) {
  if (
    typeof window ===
    "undefined" ||
    !hostname
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getTenantCacheKey(
        hostname,
      ),
      JSON.stringify({
        tenant,
        timestamp:
          Date.now(),
      } satisfies CachedStorefrontTenant),
    );
  } catch {
    // Session cache is optional.
  }
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

      const currentHostname =
        normalizeHostname(
          window.location.hostname,
        );

      setHostname(
        currentHostname,
      );

      setError("");

      /*
       * LOCAL DEVELOPMENT
       *
       * NEXT_PUBLIC_TENANT_ID is already authoritative on localhost.
       * Make that tenant ID available IMMEDIATELY so Shop / Offers /
       * Stock Clearance requests can start without waiting for a
       * second tenant-details request first.
       */
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
          setTenant(null);
          setIsLoading(false);

          setError(
            "NEXT_PUBLIC_TENANT_ID is required for localhost storefront development.",
          );

          return;
        }

        const cachedTenant =
          readCachedTenant(
            currentHostname,
          );

        if (
          cachedTenant &&
          String(
            cachedTenant._id,
          ) ===
            localTenantId
        ) {
          setTenant(
            cachedTenant,
          );
        } else {
          /*
           * This single state update removes the previous serial
           * waterfall:
           * tenant details -> page API -> products.
           *
           * Pages can now begin their tenant-specific API calls now.
           */
          setTenant({
            _id:
              localTenantId,
          });
        }

        setIsLoading(false);

        /*
         * Full tenant details (Store Name, branding, etc.) are still
         * refreshed in the background and merged when available.
         */
        try {
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

            writeCachedTenant(
              currentHostname,
              localTenant,
            );
          }
        } catch (tenantError) {
          /*
           * Keep the immediate {_id} tenant usable.
           * A background metadata refresh must not block storefront.
           */
          console.warn(
            "Local storefront tenant metadata refresh error:",
            tenantError,
          );
        }

        return;
      }

      /*
       * CUSTOM DOMAIN
       *
       * Reuse a valid short session cache immediately. This makes
       * repeat navigation and reloads start page APIs without another
       * serial domain-resolution wait.
       */
      const cachedTenant =
        readCachedTenant(
          currentHostname,
        );

      if (cachedTenant) {
        setTenant(
          cachedTenant,
        );

        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        const response =
          await fetch(
            `${window.location.origin}/api/tenants/domain/${encodeURIComponent(
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

        writeCachedTenant(
          currentHostname,
          resolvedTenant,
        );
      } catch (tenantError) {
        console.error(
          "Storefront tenant resolution error:",
          tenantError,
        );

        /*
         * Keep an already-cached tenant available if background
         * revalidation fails. Only clear when no usable tenant exists.
         */
        if (!cachedTenant) {
          setTenant(null);

          setError(
            tenantError instanceof Error
              ? tenantError.message
              : "Store tenant could not be resolved.",
          );
        }
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
