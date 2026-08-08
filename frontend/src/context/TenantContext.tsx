"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

type AdminUser = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "admin" | "superadmin";
  tenantId?: string | null;
  tenant?: string | null;
};

export type TenantSummary = {
  _id: string;
  tenantId?: string;
  businessName?: string;
  storeName?: string;
  tenantCode?: string;
  ownerName?: string;
  ownerEmail?: string;
  status?: string;
  subscription?: {
    plan?: string;
    status?: string;
    isTrial?: boolean;
    trialEndsAt?: string | null;
    expiresAt?: string | null;
  };
};

type TenantContextValue = {
  tenants: TenantSummary[];
  selectedTenant: TenantSummary | null;
  selectedTenantId: string;
  loadingTenants: boolean;
  tenantError: string;
  canSwitchTenant: boolean;
  selectTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
  clearTenantSelection: () => void;
};

const TenantContext =
  createContext<TenantContextValue | null>(
    null,
  );

const getAdminToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem(
      "townmelaAdminToken",
    ) || ""
  );
};

const saveTenantId = (
  tenantId: string,
) => {
  localStorage.setItem(
    "tenantId",
    tenantId,
  );
  localStorage.setItem(
    "selectedTenantId",
    tenantId,
  );
  localStorage.setItem(
    "activeTenantId",
    tenantId,
  );
};

const removeSwitchableTenantIds = () => {
  localStorage.removeItem(
    "selectedTenantId",
  );
  localStorage.removeItem(
    "activeTenantId",
  );
};

const clearAdminSession = () => {
  [
    "townmelaAdminToken",
    "townmelaAdminUser",
    "accessToken",
    "token",
    "authToken",
    "jwt",
  ].forEach((key) =>
    localStorage.removeItem(key),
  );
};

const extractTenants = (
  payload: unknown,
): TenantSummary[] => {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return [];
  }

  const value =
    payload as Record<
      string,
      unknown
    >;

  if (Array.isArray(value.tenants)) {
    return value.tenants as TenantSummary[];
  }

  if (
    value.data &&
    typeof value.data === "object" &&
    !Array.isArray(value.data)
  ) {
    const data =
      value.data as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(data.tenants)
    ) {
      return data.tenants as TenantSummary[];
    }
  }

  return [];
};

const getApiMessage = (
  payload: unknown,
  fallback: string,
) => {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (
      payload as {
        message?: unknown;
      }
    ).message === "string"
  ) {
    return (
      payload as {
        message: string;
      }
    ).message;
  }

  return fallback;
};

export function TenantProvider({
  children,
  adminUser,
}: {
  children: React.ReactNode;
  adminUser: AdminUser;
}) {
  const router = useRouter();
  const isSuperAdmin =
    adminUser.role === "superadmin";

  const fixedTenantId = String(
    adminUser.tenantId ||
      adminUser.tenant ||
      "",
  ).trim();

  const [tenants, setTenants] =
    useState<TenantSummary[]>([]);

  const [
    selectedTenantId,
    setSelectedTenantId,
  ] = useState("");

  const [
    loadingTenants,
    setLoadingTenants,
  ] = useState(true);

  const [
    tenantError,
    setTenantError,
  ] = useState("");

  const refreshTenants =
    useCallback(async () => {
      try {
        setLoadingTenants(true);
        setTenantError("");

        /*
         * Tenant admins are permanently locked to the tenant
         * stored in their authenticated admin session.
         */
        if (!isSuperAdmin) {
          if (!fixedTenantId) {
            throw new Error(
              "No tenant is assigned to this tenant admin account.",
            );
          }

          saveTenantId(
            fixedTenantId,
          );

          setSelectedTenantId(
            fixedTenantId,
          );

          setTenants([
            {
              _id: fixedTenantId,
              tenantId:
                fixedTenantId,
              businessName:
                adminUser.name,
              ownerName:
                adminUser.name,
              ownerEmail:
                adminUser.email,
              status: "active",
            },
          ]);

          return;
        }

        const token =
          getAdminToken();

        if (!token) {
          clearAdminSession();
          router.replace("/login");
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/api/tenants?limit=100&status=active`,
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "include",
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const payload =
          await response
            .json()
            .catch(
              () => null,
            );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          clearAdminSession();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            getApiMessage(
              payload,
              "Tenant list could not be loaded.",
            ),
          );
        }

        const activeTenants =
          extractTenants(
            payload,
          ).filter(
            (tenant) =>
              tenant.status ===
                "active" &&
              [
                "trial",
                "active",
              ].includes(
                tenant.subscription
                  ?.status ?? "",
              ),
          );

        setTenants(
          activeTenants,
        );

        const storedTenantId =
          (
            localStorage.getItem(
              "selectedTenantId",
            ) ||
            localStorage.getItem(
              "activeTenantId",
            ) ||
            localStorage.getItem(
              "tenantId",
            ) ||
            ""
          ).trim();

        const storedTenantExists =
          activeTenants.some(
            (tenant) =>
              (
                tenant._id ||
                tenant.tenantId
              ) ===
              storedTenantId,
          );

        if (
          storedTenantExists
        ) {
          saveTenantId(
            storedTenantId,
          );
          setSelectedTenantId(
            storedTenantId,
          );
          return;
        }

        if (
          activeTenants.length === 1
        ) {
          const tenantId =
            activeTenants[0]._id ||
            activeTenants[0]
              .tenantId ||
            "";

          if (tenantId) {
            saveTenantId(
              tenantId,
            );
            setSelectedTenantId(
              tenantId,
            );
            return;
          }
        }

        removeSwitchableTenantIds();
        setSelectedTenantId(
          "",
        );
      } catch (error) {
        console.error(
          "Tenant context load error:",
          error,
        );

        setTenants([]);
        setSelectedTenantId(
          "",
        );
        setTenantError(
          error instanceof Error
            ? error.message
            : "Unable to load tenants.",
        );
      } finally {
        setLoadingTenants(
          false,
        );
      }
    }, [
      adminUser.email,
      adminUser.name,
      fixedTenantId,
      isSuperAdmin,
      router,
    ]);

  useEffect(() => {
    void refreshTenants();
  }, [refreshTenants]);

  const selectTenant =
    useCallback(
      (tenantId: string) => {
        /*
         * A tenant admin cannot change the tenant context.
         */
        if (!isSuperAdmin) {
          if (fixedTenantId) {
            saveTenantId(
              fixedTenantId,
            );
            setSelectedTenantId(
              fixedTenantId,
            );
          }

          return;
        }

        const normalizedTenantId =
          tenantId.trim();

        if (
          !normalizedTenantId
        ) {
          removeSwitchableTenantIds();
          setSelectedTenantId(
            "",
          );

          window.dispatchEvent(
            new CustomEvent(
              "tenant-changed",
              {
                detail: {
                  tenantId: "",
                },
              },
            ),
          );

          return;
        }

        const isKnownTenant =
          tenants.some(
            (tenant) =>
              (
                tenant._id ||
                tenant.tenantId
              ) ===
              normalizedTenantId,
          );

        if (!isKnownTenant) {
          return;
        }

        saveTenantId(
          normalizedTenantId,
        );
        setSelectedTenantId(
          normalizedTenantId,
        );

        window.dispatchEvent(
          new CustomEvent(
            "tenant-changed",
            {
              detail: {
                tenantId:
                  normalizedTenantId,
              },
            },
          ),
        );
      },
      [
        fixedTenantId,
        isSuperAdmin,
        tenants,
      ],
    );

  const clearTenantSelection =
    useCallback(() => {
      if (isSuperAdmin) {
        selectTenant("");
      }
    }, [
      isSuperAdmin,
      selectTenant,
    ]);

  const selectedTenant =
    useMemo(
      () =>
        tenants.find(
          (tenant) =>
            (
              tenant._id ||
              tenant.tenantId
            ) ===
            selectedTenantId,
        ) ?? null,
      [
        selectedTenantId,
        tenants,
      ],
    );

  const contextValue =
    useMemo<TenantContextValue>(
      () => ({
        tenants,
        selectedTenant,
        selectedTenantId,
        loadingTenants,
        tenantError,
        canSwitchTenant:
          isSuperAdmin,
        selectTenant,
        refreshTenants,
        clearTenantSelection,
      }),
      [
        tenants,
        selectedTenant,
        selectedTenantId,
        loadingTenants,
        tenantError,
        isSuperAdmin,
        selectTenant,
        refreshTenants,
        clearTenantSelection,
      ],
    );

  return (
    <TenantContext.Provider
      value={contextValue}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context =
    useContext(
      TenantContext,
    );

  if (!context) {
    throw new Error(
      "useTenant must be used inside TenantProvider.",
    );
  }

  return context;
}
