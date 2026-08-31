"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

type TenantStatus = "active" | "inactive" | "suspended";

type Tenant = {
  _id?: string;
  tenantId?: string;
  businessName?: string;
  storeName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  customDomain?: string;
  status?: string;
};

type TenantResponse = {
  success?: boolean;
  message?: string;
  data?: { tenant?: Tenant };
};

type FormState = {
  businessName: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  customDomain: string;
  status: TenantStatus;
};

const emptyForm: FormState = {
  businessName: "",
  storeName: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  customDomain: "",
  status: "active",
};

function getToken() {
  if (typeof window === "undefined") return "";

  const keys = [
    "townmelaAdminToken",
    "accessToken",
    "token",
    "authToken",
    "adminToken",
    "jwt",
  ];

  for (const key of keys) {
    const value = window.localStorage.getItem(key)?.trim() || "";
    if (value) return value;
  }

  return "";
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .trim();
}

function normalizeStatus(value: unknown): TenantStatus {
  const status = String(value || "").toLowerCase();

  if (status === "inactive" || status === "suspended") {
    return status;
  }

  return "active";
}

function getMessage(payload: TenantResponse | null, fallback: string) {
  return payload?.message?.trim() || fallback;
}

export default function EditTenantPage() {
  const params = useParams<{ tenantId: string }>();

  const tenantId = useMemo(
    () => String(params?.tenantId || "").trim(),
    [params],
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [originalStatus, setOriginalStatus] =
    useState<TenantStatus>("active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!tenantId) {
      setError("Tenant ID was not found.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadTenant = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          throw new Error(
            "Authentication token not found. Please log in again.",
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/api/tenants/${encodeURIComponent(tenantId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response
          .json()
          .catch(() => null)) as TenantResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            getMessage(payload, "Unable to load tenant."),
          );
        }

        const tenant = payload.data?.tenant;

        if (!tenant) {
          throw new Error("Tenant information was not found.");
        }

        const status = normalizeStatus(tenant.status);

        setForm({
          businessName: tenant.businessName || "",
          storeName: tenant.storeName || "",
          ownerName: tenant.ownerName || "",
          ownerEmail: tenant.ownerEmail || "",
          ownerPhone: tenant.ownerPhone || "",
          customDomain: tenant.customDomain || "",
          status,
        });

        setOriginalStatus(status);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load tenant.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadTenant();

    return () => controller.abort();
  }, [tenantId]);

  const updateField = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!tenantId || saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token not found. Please log in again.",
        );
      }

      const businessName = form.businessName.trim();
      const storeName = form.storeName.trim();
      const ownerName = form.ownerName.trim();
      const ownerEmail = form.ownerEmail.trim().toLowerCase();
      const ownerPhone = form.ownerPhone.trim();
      const customDomain = normalizeDomain(form.customDomain);

      if (!businessName) throw new Error("Business Name is required.");
      if (!storeName) throw new Error("Store Name is required.");
      if (!ownerName) throw new Error("Owner Name is required.");
      if (!ownerEmail) throw new Error("Owner Email is required.");

      const updateResponse = await fetch(
        `${API_BASE_URL}/api/tenants/${encodeURIComponent(tenantId)}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            businessName,
            storeName,
            ownerName,
            ownerEmail,
            ownerPhone,
            customDomain,
          }),
        },
      );

      const updatePayload = (await updateResponse
        .json()
        .catch(() => null)) as TenantResponse | null;

      if (!updateResponse.ok || !updatePayload?.success) {
        throw new Error(
          getMessage(updatePayload, "Unable to update tenant."),
        );
      }

      if (form.status !== originalStatus) {
        const statusResponse = await fetch(
          `${API_BASE_URL}/api/tenants/${encodeURIComponent(
            tenantId,
          )}/status`,
          {
            method: "PATCH",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({ status: form.status }),
          },
        );

        const statusPayload = (await statusResponse
          .json()
          .catch(() => null)) as TenantResponse | null;

        if (!statusResponse.ok || !statusPayload?.success) {
          throw new Error(
            getMessage(
              statusPayload,
              "Tenant details were saved, but status could not be updated.",
            ),
          );
        }

        setOriginalStatus(form.status);
      }

      setForm((current) => ({
        ...current,
        businessName,
        storeName,
        ownerName,
        ownerEmail,
        ownerPhone,
        customDomain,
      }));

      setSuccess("Tenant updated successfully.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update tenant.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-950">
          Edit Tenant
        </h1>

        <div className="mt-7 rounded-2xl border border-slate-300 bg-white p-6 text-sm font-medium text-slate-600">
          Loading tenant...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-950">
        Edit Tenant
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5 rounded-2xl border border-slate-300 bg-white p-6"
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        <div>
          <label htmlFor="businessName" className="mb-2 block text-sm font-semibold text-slate-950">
            Business Name
          </label>
          <input
            id="businessName"
            value={form.businessName}
            onChange={(event) =>
              updateField("businessName", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div>
          <label htmlFor="storeName" className="mb-2 block text-sm font-semibold text-slate-950">
            Store Name
          </label>
          <input
            id="storeName"
            value={form.storeName}
            onChange={(event) =>
              updateField("storeName", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div>
          <label htmlFor="ownerName" className="mb-2 block text-sm font-semibold text-slate-950">
            Owner Name
          </label>
          <input
            id="ownerName"
            value={form.ownerName}
            onChange={(event) =>
              updateField("ownerName", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div>
          <label htmlFor="ownerEmail" className="mb-2 block text-sm font-semibold text-slate-950">
            Owner Email
          </label>
          <input
            id="ownerEmail"
            type="email"
            value={form.ownerEmail}
            onChange={(event) =>
              updateField("ownerEmail", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div>
          <label htmlFor="ownerPhone" className="mb-2 block text-sm font-semibold text-slate-950">
            Owner Phone
          </label>
          <input
            id="ownerPhone"
            type="tel"
            value={form.ownerPhone}
            onChange={(event) =>
              updateField("ownerPhone", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label htmlFor="customDomain" className="mb-2 block text-sm font-semibold text-slate-950">
            Custom Domain
          </label>
          <input
            id="customDomain"
            type="text"
            inputMode="url"
            value={form.customDomain}
            onChange={(event) =>
              updateField("customDomain", event.target.value)
            }
            onBlur={() =>
              setForm((current) => ({
                ...current,
                customDomain: normalizeDomain(current.customDomain),
              }))
            }
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-slate-400 px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            শুধু domain name দিন, যেমন
            {" "}
            <span className="font-semibold text-slate-700">
              bananitravel.com
            </span>
            . https://, www বা page path দেবেন না।
          </p>
        </div>

        <div>
          <label htmlFor="status" className="mb-2 block text-sm font-semibold text-slate-950">
            Status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value)
            }
            className="h-12 w-full rounded-xl border border-slate-400 bg-white px-4 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <Link
            href="/admin/tenants"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
