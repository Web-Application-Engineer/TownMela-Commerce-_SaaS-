"use client";

/* =========================================================
   TYPES
========================================================= */

export type SettingsSection =
  | "general"
  | "branding"
  | "orders"
  | "inventory"
  | "notifications"
  | "security"
  | "users"
  | "billing"
  | "integrations";

export type SettingsApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type SettingsSectionResponse<T> = {
  tenant: string;
  section: SettingsSection;
  settings: T;
  schemaVersion: number;
  version: number;
  updatedAt: string;
};

export type FullSettingsResponse = {
  tenant: string;
  schemaVersion: number;
  isActive: boolean;
  archivedAt: string | null;

  general: Record<string, unknown>;
  branding: Record<string, unknown>;
  orders: Record<string, unknown>;
  inventory: Record<string, unknown>;
  notifications: Record<string, unknown>;
  security: Record<string, unknown>;
  users: Record<string, unknown>;
  billing: Record<string, unknown>;
  integrations: Record<string, unknown>;

  audit?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
  id: string;
  version: number;
};

export type ApiErrorDetails = {
  field?: string;
  message?: string;
  code?: string;
};

export class SettingsApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetails[];

  constructor({
    message,
    status = 500,
    code = "SETTINGS_REQUEST_FAILED",
    details = [],
  }: {
    message: string;
    status?: number;
    code?: string;
    details?: ApiErrorDetails[];
  }) {
    super(message);

    this.name = "SettingsApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(/\/+$/, "")
    : (
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000"
      ).replace(/\/+$/, "");

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

const readFirstStorageValue = (
  keys: string[]
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of keys) {
    const value = window.localStorage
      .getItem(key)
      ?.trim();

    if (value) {
      return value;
    }
  }

  return "";
};

export const getAccessToken = (): string =>
  readFirstStorageValue([
    "accessToken",
    "token",
    "authToken",
    "jwt",
  ]);

export const getTenantId = (): string =>
  readFirstStorageValue([
    "tenantId",
    "tenant_id",
    "activeTenantId",
  ]);

/* =========================================================
   REQUEST HELPERS
========================================================= */

const buildHeaders = (
  additionalHeaders?: HeadersInit
): Headers => {
  const headers = new Headers(
    additionalHeaders
  );

  headers.set(
    "Content-Type",
    "application/json"
  );

  headers.set(
    "Accept",
    "application/json"
  );

  const token = getAccessToken();
  const tenantId = getTenantId();

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  if (tenantId) {
    headers.set(
      "X-Tenant-Id",
      tenantId
    );
  }

  return headers;
};

const parseJsonSafely = async (
  response: Response
): Promise<Record<string, unknown>> => {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    return {};
  }

  try {
    return (await response.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
};

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,

      headers: buildHeaders(
        options.headers
      ),

      credentials: "include",
      cache: "no-store",
    }
  );

  const payload =
    await parseJsonSafely(response);

  if (!response.ok) {
    const details = Array.isArray(
      payload.errors
    )
      ? (payload.errors as ApiErrorDetails[])
      : [];

    throw new SettingsApiError({
      status: response.status,

      code:
        typeof payload.code === "string"
          ? payload.code
          : "SETTINGS_REQUEST_FAILED",

      message:
        typeof payload.message === "string"
          ? payload.message
          : "Settings request failed",

      details,
    });
  }

  return payload as T;
};

/* =========================================================
   READ REQUESTS
========================================================= */

export const getAllSettings =
  async (): Promise<
    SettingsApiResponse<FullSettingsResponse>
  > =>
    request<
      SettingsApiResponse<FullSettingsResponse>
    >("/api/settings", {
      method: "GET",
    });

export const getSettingsSection =
  async <T>(
    section: SettingsSection
  ): Promise<
    SettingsApiResponse<
      SettingsSectionResponse<T>
    >
  > =>
    request<
      SettingsApiResponse<
        SettingsSectionResponse<T>
      >
    >(`/api/settings/${section}`, {
      method: "GET",
    });

/* =========================================================
   UPDATE REQUESTS
========================================================= */

export const updateSettingsSection =
  async <T extends Record<string, unknown>>(
    section: SettingsSection,
    updates: T,
    version?: number | null
  ): Promise<
    SettingsApiResponse<
      SettingsSectionResponse<T>
    >
  > => {
    const headers = new Headers();

    if (
      typeof version === "number" &&
      Number.isInteger(version)
    ) {
      headers.set(
        "If-Match",
        String(version)
      );
    }

    return request<
      SettingsApiResponse<
        SettingsSectionResponse<T>
      >
    >(`/api/settings/${section}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });
  };

export const updateMultipleSettings =
  async <
    T extends Partial<
      Record<
        SettingsSection,
        Record<string, unknown>
      >
    >
  >(
    updates: T,
    version?: number | null
  ): Promise<
    SettingsApiResponse<FullSettingsResponse>
  > => {
    const headers = new Headers();

    if (
      typeof version === "number" &&
      Number.isInteger(version)
    ) {
      headers.set(
        "If-Match",
        String(version)
      );
    }

    return request<
      SettingsApiResponse<FullSettingsResponse>
    >("/api/settings", {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });
  };

/* =========================================================
   RESET REQUEST
========================================================= */

export const resetSettingsSection =
  async <T>(
    section: SettingsSection,
    version?: number | null
  ): Promise<
    SettingsApiResponse<
      SettingsSectionResponse<T>
    >
  > => {
    const headers = new Headers();

    if (
      typeof version === "number" &&
      Number.isInteger(version)
    ) {
      headers.set(
        "If-Match",
        String(version)
      );
    }

    return request<
      SettingsApiResponse<
        SettingsSectionResponse<T>
      >
    >(`/api/settings/${section}/reset`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
  };

/* =========================================================
   ERROR MESSAGE HELPER
========================================================= */

export const getSettingsErrorMessage = (
  error: unknown
): string => {
  if (
    error instanceof SettingsApiError
  ) {
    const firstFieldError =
      error.details[0]?.message;

    return (
      firstFieldError ||
      error.message
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while processing settings.";
};

export const isSettingsVersionConflict = (
  error: unknown
): boolean =>
  error instanceof SettingsApiError &&
  (
    error.status === 409 ||
    error.code === "SETTINGS_VERSION_CONFLICT" ||
    error.code === "SETTINGS_UPDATE_CONFLICT"
  );