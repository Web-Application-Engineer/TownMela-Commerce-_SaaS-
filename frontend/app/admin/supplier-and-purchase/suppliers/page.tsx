"use client";

import Link from "next/link";

import { useTenant } from "@/src/context/TenantContext";
import { useCallback, useEffect, useState } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const getStorageValue = (keys: string[]): string => {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  return "";
};

const getAccessToken = (): string =>
  getStorageValue(["accessToken", "token", "authToken", "jwt"]);

const createHeaders = (tenantId: string): Headers => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  const token = getAccessToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  return headers;
};

const extractArray = <T,>(
  result: unknown,
  keys: string[]
): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (!result || typeof result !== "object") return [];

  const record = result as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(nested[key])) return nested[key] as T[];
    }
  }

  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  return [];
};

const formatDate = (value?: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMoney = (
  value?: number,
  currency = "BDT"
): string => {
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `৳${Number(value || 0).toLocaleString("en-BD")}`;
  }
};

function PageShell({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-orange-600">
            Admin
          </Link>
          <span>/</span>
          <Link
            href="/admin/supplier-and-purchase"
            className="hover:text-orange-600"
          >
            Supplier &amp; Purchase
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">{title}</span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {actions}

            <Link
              href="/admin/supplier-and-purchase"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Supplier &amp; Purchase
            </Link>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />
      <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="font-bold text-red-800">Unable to load data</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
      {message}
    </div>
  );
}

interface Supplier {
  _id: string;
  supplierCode?: string;
  businessName?: string;
  displayName?: string;
  supplierType?: string;
  phone?: string;
  email?: string;
  currency?: string;
  paymentTerm?: string;
  currentBalance?: number;
  status?: string;
}

export default function SuppliersPage() {
  const { selectedTenantId } = useTenant();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!selectedTenantId) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/suppliers?limit=100`,
        {
          headers: createHeaders(selectedTenantId),
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to load suppliers (${response.status}).`
        );
      }

      setSuppliers(
        extractArray<Supplier>(result, [
          "suppliers",
          "results",
          "items",
        ])
      );
    } catch (requestError) {
      setSuppliers([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    setSuppliers([]);
    setError("");

    if (selectedTenantId) {
      void loadSuppliers();
    } else {
      setLoading(false);
    }
  }, [loadSuppliers, selectedTenantId]);

  return (
    <PageShell
      title="Suppliers"
      eyebrow="Supplier Management"
      description="Manage supplier profiles, contact details, purchasing terms and balances."
      actions={
        <Link
          href="/admin/supplier-and-purchase/suppliers/create"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          + Add Supplier
        </Link>
      }
    >
      {loading ? (
        <LoadingState label="Loading suppliers..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadSuppliers()} />
      ) : suppliers.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl font-bold text-orange-600">
            S
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            No suppliers found
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Add your first supplier to begin creating purchase orders,
            receiving goods, and managing vendor invoices.
          </p>

          <Link
            href="/admin/supplier-and-purchase/suppliers/create"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            + Add Supplier
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {[
                    "Code",
                    "Supplier",
                    "Type",
                    "Phone",
                    "Email",
                    "Currency",
                    "Payment Term",
                    "Balance",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {supplier.supplierCode || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-800">
                      {supplier.displayName ||
                        supplier.businessName ||
                        "Unnamed supplier"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.supplierType || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.phone || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.email || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.currency || "BDT"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {supplier.paymentTerm || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {formatMoney(
                        supplier.currentBalance,
                        supplier.currency || "BDT"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {supplier.status || "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageShell>
  );
}