const API_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : (
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:5000"
      ).replace(/\/$/, "");

export const getAdminToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("townmelaAdminToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
};

export const getSelectedTenantId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("selectedTenantId") ||
    localStorage.getItem("activeTenantId") ||
    localStorage.getItem("tenantId") ||
    localStorage.getItem("tenant_id") ||
    ""
  ).trim();
};

export const createAdminHeaders = () => {
  const token = getAdminToken();

  if (!token) {
    throw new Error(
      "Admin session not found. Please log in again.",
    );
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const createTenantHeaders = () => {
  const tenantId = getSelectedTenantId();

  if (!tenantId) {
    throw new Error(
      "Please select a tenant before continuing.",
    );
  }

  return {
    ...createAdminHeaders(),
    "X-Tenant-Id": tenantId,
  };
};

export const tenantFetch = (
  path: string,
  options: RequestInit = {},
) => {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  console.log("Tenant Fetch:", {
  path,
  tenantId: getSelectedTenantId(),
  headers: createTenantHeaders(),
});

  return fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    credentials: "include",
    headers: {
      ...createTenantHeaders(),
      ...(options.headers ?? {}),
    },
  });
};
