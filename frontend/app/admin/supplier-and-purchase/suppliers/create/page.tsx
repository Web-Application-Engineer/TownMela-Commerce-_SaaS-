"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

type SupplierFormState = {
  supplierCode: string;
  businessName: string;
  displayName: string;
  supplierType: string;
  phone: string;
  email: string;
  currency: string;
  paymentTerm: string;
  creditLimit: string;
  openingBalance: string;
  status: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

const initialForm: SupplierFormState = {
  supplierCode: "",
  businessName: "",
  displayName: "",
  supplierType: "Local",
  phone: "",
  email: "",
  currency: "BDT",
  paymentTerm: "Immediate",
  creditLimit: "0",
  openingBalance: "0",
  status: "Active",
};

const getStorageValue = (
  keys: string[]
): string => {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (
    const key of keys
  ) {
    const value =
      window.localStorage.getItem(
        key
      );

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
};

const safelyParseJson = (
  value: string | null
): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(value);

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    return null;
  }

  return null;
};

const readNestedString = (
  source: unknown,
  paths: string[][]
): string => {
  for (const path of paths) {
    let current: unknown =
      source;

    for (const key of path) {
      if (
        !current ||
        typeof current !==
          "object" ||
        Array.isArray(current)
      ) {
        current =
          undefined;
        break;
      }

      current = (
        current as Record<
          string,
          unknown
        >
      )[key];
    }

    if (
      typeof current ===
        "string" &&
      current.trim()
    ) {
      return current.trim();
    }
  }

  return "";
};

const decodeJwtPayload = (
  token: string
): Record<string, unknown> | null => {
  if (
    typeof window ===
      "undefined" ||
    !token
  ) {
    return null;
  }

  try {
    const payload =
      token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      normalized.padEnd(
        Math.ceil(
          normalized.length /
            4
        ) * 4,
        "="
      );

    const decoded =
      window.atob(padded);

    const parsed =
      JSON.parse(decoded);

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    return null;
  }

  return null;
};

const getAccessToken = (): string => {
  const directToken =
    getStorageValue([
      "accessToken",
      "token",
      "authToken",
      "jwt",
    ]);

  if (directToken) {
    return directToken;
  }

  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const sessionKeys = [
    "auth",
    "authData",
    "authSession",
    "session",
    "userSession",
  ];

  for (
    const key of sessionKeys
  ) {
    const parsed =
      safelyParseJson(
        window.localStorage.getItem(
          key
        )
      );

    const token =
      readNestedString(
        parsed,
        [
          ["accessToken"],
          ["token"],
          ["authToken"],
          ["jwt"],
          ["data", "accessToken"],
          ["data", "token"],
        ]
      );

    if (token) {
      return token;
    }
  }

  return "";
};

const getTenantId = (): string => {
  const directTenantId =
    getStorageValue([
      "activeTenantId",
      "tenantId",
      "tenant_id",
      "currentTenantId",
    ]);

  if (directTenantId) {
    return directTenantId;
  }

  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const sessionKeys = [
    "auth",
    "authData",
    "authSession",
    "session",
    "userSession",
    "user",
    "currentUser",
    "tenant",
    "activeTenant",
  ];

  const tenantPaths = [
    ["tenantId"],
    ["tenant_id"],
    ["activeTenantId"],
    ["currentTenantId"],
    ["tenant", "_id"],
    ["tenant", "id"],
    ["data", "tenantId"],
    ["data", "tenant_id"],
    ["data", "activeTenantId"],
    ["data", "tenant", "_id"],
    ["data", "tenant", "id"],
    ["user", "tenantId"],
    ["user", "tenant_id"],
    ["user", "tenant", "_id"],
    ["user", "tenant", "id"],
  ];

  for (
    const key of sessionKeys
  ) {
    const parsed =
      safelyParseJson(
        window.localStorage.getItem(
          key
        )
      );

    const tenantId =
      readNestedString(
        parsed,
        tenantPaths
      );

    if (tenantId) {
      window.localStorage.setItem(
        "tenantId",
        tenantId
      );

      window.localStorage.setItem(
        "activeTenantId",
        tenantId
      );

      return tenantId;
    }
  }

  const token =
    getAccessToken();

  const jwtPayload =
    decodeJwtPayload(token);

  const tokenTenantId =
    readNestedString(
      jwtPayload,
      [
        ["tenantId"],
        ["tenant_id"],
        ["activeTenantId"],
        ["tenant", "_id"],
        ["tenant", "id"],
        ["user", "tenantId"],
        ["user", "tenant_id"],
      ]
    );

  if (tokenTenantId) {
    window.localStorage.setItem(
      "tenantId",
      tokenTenantId
    );

    window.localStorage.setItem(
      "activeTenantId",
      tokenTenantId
    );

    return tokenTenantId;
  }

  return "";
};

const createRequestHeaders =
  (): Headers => {
    const headers =
      new Headers();

    headers.set(
      "Accept",
      "application/json"
    );

    headers.set(
      "Content-Type",
      "application/json"
    );

    const token =
      getAccessToken();

    const tenantId =
      getTenantId();

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

const toNonNegativeNumber = (
  value: string
): number => {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 0
  ) {
    return 0;
  }

  return parsed;
};

export default function CreateSupplierPage() {
  const router =
    useRouter();

  const [
    form,
    setForm,
  ] =
    useState<SupplierFormState>(
      initialForm
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const canSubmit =
    useMemo(() => {
      return Boolean(
        form.supplierCode.trim() &&
          form.businessName.trim() &&
          form.displayName.trim() &&
          form.supplierType.trim() &&
          form.currency.trim() &&
          form.paymentTerm.trim() &&
          form.status.trim()
      );
    }, [form]);

  const updateField = (
    field: keyof SupplierFormState,
    value: string
  ) => {
    setForm(
      (
        current
      ) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const token =
        getAccessToken();

      const tenantId =
        getTenantId();

      if (!token) {
        setError(
          "Your login session is missing or expired. Please log in again."
        );
        return;
      }

      if (!tenantId) {
        setError(
          "Tenant context was not found in the saved login session. Please log out and log in again."
        );
        return;
      }

      if (!canSubmit) {
        setError(
          "Please complete all required fields."
        );
        return;
      }

      try {
        setSubmitting(true);

        const payload = {
          supplierCode:
            form.supplierCode.trim(),

          businessName:
            form.businessName.trim(),

          displayName:
            form.displayName.trim(),

          supplierType:
            form.supplierType,

          phone:
            form.phone.trim(),

          email:
            form.email.trim(),

          currency:
            form.currency,

          paymentTerm:
            form.paymentTerm,

          creditLimit:
            toNonNegativeNumber(
              form.creditLimit
            ),

          openingBalance:
            toNonNegativeNumber(
              form.openingBalance
            ),

          status:
            form.status,
        };

        const response =
          await fetch(
            `${API_URL}/api/suppliers`,
            {
              method: "POST",
              headers:
                createRequestHeaders(),
              credentials:
                "include",
              body: JSON.stringify(
                payload
              ),
            }
          );

        const result =
          (await response
            .json()
            .catch(
              () => ({})
            )) as ApiResponse;

        if (!response.ok) {
          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Your login session is missing or expired. Please log in again."
            );
          }

          if (
            response.status ===
            403
          ) {
            throw new Error(
              result.message ||
                "You do not have permission to create suppliers."
            );
          }

          throw new Error(
            result.message ||
              `Failed to create supplier (${response.status}).`
          );
        }

        setSuccess(
          result.message ||
            "Supplier created successfully."
        );

        window.setTimeout(
          () => {
            router.push(
              "/admin/supplier-and-purchase/suppliers"
            );

            router.refresh();
          },
          700
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Failed to create supplier."
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link
            href="/admin"
            className="transition hover:text-orange-600"
          >
            Admin
          </Link>

          <span>/</span>

          <Link
            href="/admin/supplier-and-purchase"
            className="transition hover:text-orange-600"
          >
            Supplier &amp; Purchase
          </Link>

          <span>/</span>

          <Link
            href="/admin/supplier-and-purchase/suppliers"
            className="transition hover:text-orange-600"
          >
            Suppliers
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-800">
            Add Supplier
          </span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Supplier Management
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Add Supplier
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create a tenant-specific supplier profile for purchase orders,
              goods receiving, inventory posting, and vendor invoices.
            </p>
          </div>

          <Link
            href="/admin/supplier-and-purchase/suppliers"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Suppliers
          </Link>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Supplier Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the supplier identity and contact details.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Supplier Code"
                required
              >
                <input
                  type="text"
                  value={
                    form.supplierCode
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "supplierCode",
                      event.target
                        .value
                    )
                  }
                  placeholder="SUP-001"
                  className={inputClassName}
                />
              </Field>

              <Field
                label="Supplier Type"
                required
              >
                <select
                  value={
                    form.supplierType
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "supplierType",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Local">
                    Local
                  </option>

                  <option value="International">
                    International
                  </option>

                  <option value="Manufacturer">
                    Manufacturer
                  </option>

                  <option value="Distributor">
                    Distributor
                  </option>

                  <option value="Wholesaler">
                    Wholesaler
                  </option>
                </select>
              </Field>

              <Field
                label="Business Name"
                required
              >
                <input
                  type="text"
                  value={
                    form.businessName
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "businessName",
                      event.target
                        .value
                    )
                  }
                  placeholder="ABC Traders"
                  className={inputClassName}
                />
              </Field>

              <Field
                label="Display Name"
                required
              >
                <input
                  type="text"
                  value={
                    form.displayName
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "displayName",
                      event.target
                        .value
                    )
                  }
                  placeholder="ABC Traders"
                  className={inputClassName}
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  value={
                    form.phone
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "phone",
                      event.target
                        .value
                    )
                  }
                  placeholder="01700000000"
                  className={inputClassName}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "email",
                      event.target
                        .value
                    )
                  }
                  placeholder="supplier@example.com"
                  className={inputClassName}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Purchasing Terms
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure currency, payment terms, credit limits, and status.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Currency"
                required
              >
                <select
                  value={
                    form.currency
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "currency",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                >
                  <option value="BDT">
                    BDT
                  </option>

                  <option value="USD">
                    USD
                  </option>

                  <option value="EUR">
                    EUR
                  </option>

                  <option value="GBP">
                    GBP
                  </option>
                </select>
              </Field>

              <Field
                label="Payment Term"
                required
              >
                <select
                  value={
                    form.paymentTerm
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "paymentTerm",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Immediate">
                    Immediate
                  </option>

                  <option value="Net 7">
                    Net 7
                  </option>

                  <option value="Net 15">
                    Net 15
                  </option>

                  <option value="Net 30">
                    Net 30
                  </option>

                  <option value="Net 45">
                    Net 45
                  </option>

                  <option value="Net 60">
                    Net 60
                  </option>
                </select>
              </Field>

              <Field label="Credit Limit">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.creditLimit
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "creditLimit",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                />
              </Field>

              <Field label="Opening Balance">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.openingBalance
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "openingBalance",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                />
              </Field>

              <Field
                label="Status"
                required
              >
                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "status",
                      event.target
                        .value
                    )
                  }
                  className={inputClassName}
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                  <option value="Blocked">
                    Blocked
                  </option>
                </select>
              </Field>
            </div>
          </section>

          <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/admin/supplier-and-purchase/suppliers"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                !canSubmit
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Saving Supplier..."
                : "Save Supplier"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}