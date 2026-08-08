"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

type TenantSubscription = {
  plan?: string;
  status?: string;
  isTrial?: boolean;
  trialDays?: number;
  trialEndsAt?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
};

type Tenant = {
  _id?: string;
  tenantId?: string;
  businessName?: string;
  storeName?: string;
  slug?: string;
  domain?: string;
  customDomain?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: string;
  isDeleted?: boolean;
  subscription?: TenantSubscription;
  createdAt?: string;
  updatedAt?: string;
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

const extractTenant = (payload: unknown): Tenant | null => {
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;

  if (
    value.tenant &&
    typeof value.tenant === "object" &&
    !Array.isArray(value.tenant)
  ) {
    return value.tenant as Tenant;
  }

  if (
    value.data &&
    typeof value.data === "object" &&
    !Array.isArray(value.data)
  ) {
    const data = value.data as Record<string, unknown>;

    if (
      data.tenant &&
      typeof data.tenant === "object" &&
      !Array.isArray(data.tenant)
    ) {
      return data.tenant as Tenant;
    }

    if ("_id" in data || "tenantId" in data) {
      return data as Tenant;
    }
  }

  if ("_id" in value || "tenantId" in value) {
    return value as Tenant;
  }

  return null;
};

const formatDate = (value?: string | null, includeTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};

const statusClass = (status?: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "trial":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "suspended":
      return "bg-red-50 text-red-700 ring-red-200";
    case "expired":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "inactive":
    case "cancelled":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
};

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <div className="mt-2 break-words text-sm font-medium text-slate-900">
      {value || "—"}
    </div>
  </div>
);

export default function TenantDetailsPage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();

  const tenantId = Array.isArray(params?.tenantId)
    ? params.tenantId[0]
    : params?.tenantId;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showRenewal, setShowRenewal] = useState(false);
  const [durationDays, setDurationDays] = useState("30");
  const [autoRenew, setAutoRenew] = useState(false);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) {
      setError("Tenant ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${encodeURIComponent(tenantId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to load tenant details.")
        );
      }

      const extracted = extractTenant(payload);

      if (!extracted) {
        throw new Error("Tenant data was not found in the API response.");
      }

      setTenant(extracted);
    } catch (requestError) {
      setTenant(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load tenant details."
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchTenant();
  }, [fetchTenant]);

  const daysRemaining = useMemo(() => {
    const expiry =
      tenant?.subscription?.isTrial
        ? tenant.subscription.trialEndsAt
        : tenant?.subscription?.expiresAt;

    if (!expiry) return null;

    const difference = new Date(expiry).getTime() - Date.now();

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }, [tenant]);

  const updateStatus = async (nextAction: "activate" | "suspend") => {
    if (!tenantId) return;

    const confirmed = window.confirm(
      nextAction === "suspend"
        ? "Are you sure you want to suspend this tenant?"
        : "Are you sure you want to activate this tenant?"
    );

    if (!confirmed) return;

    setAction(nextAction);
    setError("");
    setSuccess("");

    try {
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${encodeURIComponent(
          tenantId
        )}/${nextAction}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          credentials: "include",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            nextAction === "suspend"
              ? "Unable to suspend tenant."
              : "Unable to activate tenant."
          )
        );
      }

      setSuccess(
        nextAction === "suspend"
          ? "Tenant suspended successfully."
          : "Tenant activated successfully."
      );

      await fetchTenant();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Tenant status update failed."
      );
    } finally {
      setAction("");
    }
  };

  const renewSubscription = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!tenantId) return;

    const parsedDuration = Number(durationDays);

    if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
      setError("Duration days must be greater than zero.");
      return;
    }

    setAction("renew");
    setError("");
    setSuccess("");

    try {
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${encodeURIComponent(
          tenantId
        )}/subscription/renew`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          credentials: "include",
          body: JSON.stringify({
            durationDays: parsedDuration,
            autoRenew,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to renew subscription.")
        );
      }

      setSuccess("Subscription renewed successfully.");
      setShowRenewal(false);

      await fetchTenant();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Subscription renewal failed."
      );
    } finally {
      setAction("");
    }
  };

  const deleteTenant = async () => {
    if (!tenantId) return;

    const confirmed = window.confirm(
      "Delete this tenant? This action performs a soft delete."
    );

    if (!confirmed) return;

    setAction("delete");
    setError("");
    setSuccess("");

    try {
      const authToken = getToken();

      if (!authToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants/${encodeURIComponent(tenantId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          credentials: "include",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to delete tenant."));
      }

      router.push("/admin/tenants");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Tenant deletion failed."
      );
    } finally {
      setAction("");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Loading tenant details...
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Tenant could not be loaded
          </h1>
          <p className="mt-2 text-sm text-red-700">
            {error || "Tenant not found."}
          </p>
          <Link
            href="/admin/tenants"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Tenants
          </Link>
        </div>
      </main>
    );
  }

  const resourceId = tenant._id || tenant.tenantId || tenantId;
  const subscriptionStatus =
    tenant.subscription?.status ||
    (tenant.subscription?.isTrial ? "trial" : "unknown");

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin/tenants"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              ← Back to Tenants
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {tenant.storeName || tenant.businessName || "Tenant Details"}
              </h1>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(
                  tenant.status
                )}`}
              >
                {tenant.status || "unknown"}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {tenant.businessName || "—"} · Tenant ID: {resourceId}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/tenants/${resourceId}/edit`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Edit Tenant
            </Link>

            <button
              type="button"
              onClick={() => setShowRenewal((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Renew Subscription
            </button>

            {tenant.status === "suspended" ? (
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => void updateStatus("activate")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {action === "activate" ? "Activating..." : "Activate"}
              </button>
            ) : (
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => void updateStatus("suspend")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {action === "suspend" ? "Suspending..." : "Suspend"}
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {showRenewal ? (
          <form
            onSubmit={renewSubscription}
            className="mb-6 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subscription Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(event) => setAutoRenew(event.target.checked)}
                />
                Auto Renew
              </label>

              <button
                type="submit"
                disabled={action === "renew"}
                className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {action === "renew" ? "Renewing..." : "Confirm Renewal"}
              </button>

              <button
                type="button"
                onClick={() => setShowRenewal(false)}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Tenant Status</p>
            <p className="mt-2 text-xl font-bold capitalize text-slate-900">
              {tenant.status || "Unknown"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Subscription Plan
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {tenant.subscription?.plan || "Standard"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Subscription Status
            </p>
            <p className="mt-2 text-xl font-bold capitalize text-slate-900">
              {subscriptionStatus}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Days Remaining
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {daysRemaining === null
                ? "—"
                : daysRemaining < 0
                  ? "Expired"
                  : daysRemaining}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Tenant Information
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem label="Business Name" value={tenant.businessName} />
              <InfoItem label="Store Name" value={tenant.storeName} />
              <InfoItem label="Slug" value={tenant.slug} />
              <InfoItem
                label="Domain"
                value={tenant.customDomain || tenant.domain}
              />
              <InfoItem label="Created" value={formatDate(tenant.createdAt, true)} />
              <InfoItem label="Updated" value={formatDate(tenant.updatedAt, true)} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Owner Information
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem label="Owner Name" value={tenant.ownerName} />
              <InfoItem label="Phone" value={tenant.ownerPhone} />
              <InfoItem
                label="Email"
                value={
                  tenant.ownerEmail ? (
                    <a
                      href={`mailto:${tenant.ownerEmail}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {tenant.ownerEmail}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Subscription Details
              </h2>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(
                  subscriptionStatus
                )}`}
              >
                {subscriptionStatus}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                label="Plan"
                value={tenant.subscription?.plan || "Standard"}
              />
              <InfoItem
                label="Trial"
                value={tenant.subscription?.isTrial ? "Yes" : "No"}
              />
              <InfoItem
                label="Trial Days"
                value={tenant.subscription?.trialDays ?? "—"}
              />
              <InfoItem
                label="Auto Renew"
                value={tenant.subscription?.autoRenew ? "Enabled" : "Disabled"}
              />
              <InfoItem
                label="Started At"
                value={formatDate(tenant.subscription?.startsAt, true)}
              />
              <InfoItem
                label="Trial Ends At"
                value={formatDate(tenant.subscription?.trialEndsAt, true)}
              />
              <InfoItem
                label="Expires At"
                value={formatDate(tenant.subscription?.expiresAt, true)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
            <p className="mt-2 text-sm text-slate-500">
              Deleting a tenant performs a soft delete. The tenant data remains
              in the database but will no longer be available normally.
            </p>

            <button
              type="button"
              disabled={Boolean(action)}
              onClick={() => void deleteTenant()}
              className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {action === "delete" ? "Deleting..." : "Delete Tenant"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
