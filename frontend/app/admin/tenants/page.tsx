"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

type TenantStatus = "active" | "inactive" | "suspended";
type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

type TenantSubscription = {
  plan?: string;
  status?: SubscriptionStatus | string;
  isTrial?: boolean;
  trialEndsAt?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
};

type Tenant = {
  _id: string;
  tenantId?: string;
  businessName?: string;
  storeName?: string;
  slug?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: TenantStatus | string;
  subscription?: TenantSubscription;
  createdAt?: string;
  updatedAt?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const getToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    ""
  );
};

const extractTenants = (payload: unknown): Tenant[] => {
  if (Array.isArray(payload)) return payload as Tenant[];

  if (!payload || typeof payload !== "object") return [];

  const value = payload as Record<string, unknown>;

  const candidates = [
    value.tenants,
    value.data,
    value.results,
    value.items,
    value.docs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Tenant[];
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;

      for (const key of ["tenants", "results", "items", "docs"]) {
        if (Array.isArray(nested[key])) {
          return nested[key] as Tenant[];
        }
      }
    }
  }

  return [];
};

const extractPagination = (
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  tenantCount: number
): Pagination => {
  const fallback: Pagination = {
    page: fallbackPage,
    limit: fallbackLimit,
    total: tenantCount,
    totalPages: Math.max(1, Math.ceil(tenantCount / fallbackLimit)),
  };

  if (!payload || typeof payload !== "object") return fallback;

  const value = payload as Record<string, unknown>;
  const sources = [
    value.pagination,
    value.meta,
    value.data && typeof value.data === "object"
      ? (value.data as Record<string, unknown>).pagination
      : null,
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    const pagination = source as Record<string, unknown>;
    const page = Number(
      pagination.page ?? pagination.currentPage ?? fallback.page
    );
    const limit = Number(
      pagination.limit ?? pagination.pageSize ?? fallback.limit
    );
    const total = Number(
      pagination.total ??
        pagination.totalItems ??
        pagination.totalDocs ??
        fallback.total
    );
    const totalPages = Number(
      pagination.totalPages ??
        pagination.pages ??
        Math.max(1, Math.ceil(total / limit))
    );

    return {
      page: Number.isFinite(page) ? page : fallback.page,
      limit: Number.isFinite(limit) ? limit : fallback.limit,
      total: Number.isFinite(total) ? total : fallback.total,
      totalPages: Number.isFinite(totalPages)
        ? Math.max(1, totalPages)
        : fallback.totalPages,
    };
  }

  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }

  return fallback;
};

const getStatusClass = (status?: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "suspended":
      return "bg-red-50 text-red-700 ring-red-200";
    case "inactive":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "trial":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "expired":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (appliedSearch) params.set("search", appliedSearch);
      if (status) params.set("status", status);

      const response = await fetch(
        `${API_BASE_URL}/api/tenants?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to load tenants.")
        );
      }

      const list = extractTenants(payload);

      setTenants(list);
      setPagination(extractPagination(payload, page, limit, list.length));
    } catch (requestError) {
      setTenants([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load tenants."
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, limit, page, status]);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const summary = useMemo(() => {
    return tenants.reduce(
      (result, tenant) => {
        result.total += 1;

        if (tenant.status === "active") result.active += 1;
        if (tenant.status === "suspended") result.suspended += 1;
        if (
          tenant.subscription?.status === "trial" ||
          tenant.subscription?.isTrial
        ) {
          result.trial += 1;
        }

        return result;
      },
      {
        total: 0,
        active: 0,
        suspended: 0,
        trial: 0,
      }
    );
  }, [tenants]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const updateTenantStatus = async (
    tenant: Tenant,
    nextStatus: "active" | "suspended"
  ) => {
    const id = tenant._id || tenant.tenantId;

    if (!id) return;

    const confirmed = window.confirm(
      nextStatus === "suspended"
        ? `Suspend ${tenant.storeName || tenant.businessName || "this tenant"}?`
        : `Activate ${tenant.storeName || tenant.businessName || "this tenant"}?`
    );

    if (!confirmed) return;

    setActionId(id);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const endpoint =
        nextStatus === "suspended"
          ? `/api/tenants/${id}/suspend`
          : `/api/tenants/${id}/activate`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            nextStatus === "suspended"
              ? "Unable to suspend tenant."
              : "Unable to activate tenant."
          )
        );
      }

      await fetchTenants();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Tenant status update failed."
      );
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Platform Management
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Tenants
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage tenant stores, trial status and subscriptions.
            </p>
          </div>

          <Link
            href="/admin/tenants/create"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Create Tenant
          </Link>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Visible Tenants", summary.total],
            ["Active", summary.active],
            ["On Trial", summary.trial],
            ["Suspended", summary.suspended],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <form
              onSubmit={submitSearch}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search business, store, owner or email"
                className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                type="submit"
                className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => void fetchTenants()}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </form>
          </div>

          {error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-5">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Tenant",
                    "Owner",
                    "Tenant Status",
                    "Subscription",
                    "Expiry",
                    "Created",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-sm text-slate-500"
                    >
                      Loading tenants...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center"
                    >
                      <p className="font-semibold text-slate-800">
                        No tenants found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Create your first tenant or change the filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const id = tenant._id || tenant.tenantId || "";
                    const subscriptionStatus =
                      tenant.subscription?.status ||
                      (tenant.subscription?.isTrial ? "trial" : "unknown");

                    return (
                      <tr key={id} className="align-top hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/tenants/${id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {tenant.storeName ||
                              tenant.businessName ||
                              "Unnamed Tenant"}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {tenant.businessName || tenant.slug || id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {tenant.ownerName || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {tenant.ownerEmail || tenant.ownerPhone || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusClass(
                              tenant.status
                            )}`}
                          >
                            {tenant.status || "unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {tenant.subscription?.plan || "Standard"}
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusClass(
                              subscriptionStatus
                            )}`}
                          >
                            {subscriptionStatus}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            tenant.subscription?.isTrial
                              ? tenant.subscription?.trialEndsAt
                              : tenant.subscription?.expiresAt
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(tenant.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex min-w-44 flex-wrap gap-2">
                            <Link
                              href={`/admin/tenants/${id}`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              View
                            </Link>

                            <Link
                              href={`/admin/tenants/${id}/edit`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </Link>

                            {tenant.status === "suspended" ? (
                              <button
                                type="button"
                                disabled={actionId === id}
                                onClick={() =>
                                  void updateTenantStatus(tenant, "active")
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionId === id ? "Working..." : "Activate"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionId === id}
                                onClick={() =>
                                  void updateTenantStatus(tenant, "suspended")
                                }
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionId === id ? "Working..." : "Suspend"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Total: {pagination.total} tenant
              {pagination.total === 1 ? "" : "s"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="px-2 text-sm font-medium text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={loading || page >= pagination.totalPages}
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1)
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
