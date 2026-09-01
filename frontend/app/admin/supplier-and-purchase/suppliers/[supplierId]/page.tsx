"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(/\/+$/, "")
    : (
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000"
      ).replace(/\/+$/, "");

/* =========================================================
   TYPES
========================================================= */

interface SupplierAddress {
  addressLine1?: string | null;
  addressLine2?: string | null;
  area?: string | null;
  district?: string | null;
  division?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface SupplierBankAccount {
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  swiftCode?: string | null;
}

interface SupplierMobileBanking {
  provider?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
}

interface Supplier {
  _id: string;
  tenant?: string;

  supplierCode?: string;
  businessName?: string;
  displayName?: string;
  supplierType?: string;

  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  website?: string | null;

  address?: SupplierAddress;

  taxIdentificationNumber?: string | null;
  businessIdentificationNumber?: string | null;
  tradeLicenseNumber?: string | null;

  currency?: string;
  paymentTerm?: string;
  customPaymentTermDays?: number | null;

  creditLimit?: number;
  openingBalance?: number;
  currentBalance?: number;
  totalPurchaseAmount?: number;
  totalPaidAmount?: number;
  totalReturnAmount?: number;

  bankAccount?: SupplierBankAccount;
  mobileBanking?: SupplierMobileBanking;

  notes?: string | null;
  tags?: string[];

  status?: string;
  isDeleted?: boolean;

  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}


interface EntityReference {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  businessName?: string;
  supplierName?: string;
  warehouseName?: string;
  code?: string;
}

interface PurchaseOrderRecord {
  _id?: string;
  supplier?: string | EntityReference | null;
  supplierId?: string;
  supplierSnapshot?: {
    businessName?: string | null;
  };
  status?: string;
  currency?: string;
  totalAmount?: number;
  grandTotal?: number;
  financialSummary?: {
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    grandTotal?: number;
  };
  createdAt?: string;
}

interface GoodsReceivedRecord {
  _id?: string;
  supplier?: string | EntityReference | null;
  supplierId?: string;
  supplierSnapshot?: {
    businessName?: string | null;
  };
  status?: string;
  currency?: string;
  financialSummary?: {
    subtotal?: number;
    grandTotal?: number;
  };
  receivingSummary?: {
    totalReceivedQuantity?: number;
    totalAcceptedQuantity?: number;
    totalRejectedQuantity?: number;
  };
  inventoryPosting?: {
    status?: string;
    postedValue?: number;
  };
  createdAt?: string;
}

interface RelatedListApiResponse<T> {
  success?: boolean;
  message?: string;
  data?:
    | T[]
    | {
        purchaseOrders?: T[];
        orders?: T[];
        goodsReceipts?: T[];
        goodsReceived?: T[];
        records?: T[];
        results?: T[];
        items?: T[];
      };
  purchaseOrders?: T[];
  orders?: T[];
  goodsReceipts?: T[];
  goodsReceived?: T[];
  records?: T[];
  results?: T[];
  items?: T[];
}

interface SupplierMetrics {
  purchaseOrderCount: number;
  goodsReceivedCount: number;
  totalPurchaseOrderValue: number;
  totalReceivedValue: number;
  currentBalance: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;
}

interface SuppliersApiResponse {
  success?: boolean;
  message?: string;

  suppliers?: Supplier[];

  data?:
    | Supplier[]
    | {
        suppliers?: Supplier[];
        records?: Supplier[];
        results?: Supplier[];
        items?: Supplier[];
      };

  errors?: Array<{
    message?: string;
  }>;
}

/* =========================================================
   STORAGE AND REQUEST HELPERS
========================================================= */

const getStorageValue = (
  keys: string[],
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of keys) {
    const value =
      window.localStorage.getItem(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getAccessToken = (): string =>
  getStorageValue([
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "townmelaAdminToken",
  ]);

const getTenantId = (): string =>
  getStorageValue([
    "tenantId",
    "tenant_id",
    "activeTenantId",
    "currentTenantId",
  ]);

const ensureRequestContext = () => {
  if (!getAccessToken()) {
    throw new Error(
      "Your admin session is missing or expired. Please log in again.",
    );
  }

  if (!getTenantId()) {
    throw new Error(
      "Tenant context is missing. Please log out and sign in again.",
    );
  }
};

const createHeaders = (): Headers => {
  const headers =
    new Headers();

  headers.set(
    "Accept",
    "application/json",
  );

  headers.set(
    "Authorization",
    `Bearer ${getAccessToken()}`,
  );

  headers.set(
    "X-Tenant-Id",
    getTenantId(),
  );

  return headers;
};

/* =========================================================
   DATA HELPERS
========================================================= */

const getErrorMessage = (
  result: unknown,
  fallback: string,
): string => {
  if (
    result &&
    typeof result === "object"
  ) {
    const record =
      result as {
        message?: string;
        errors?: Array<{
          message?: string;
        }>;
      };

    const validationMessage =
      Array.isArray(record.errors)
        ? record.errors
            .map(
              (item) =>
                item?.message,
            )
            .filter(Boolean)
            .join(", ")
        : "";

    return (
      validationMessage ||
      record.message ||
      fallback
    );
  }

  return fallback;
};

const extractSuppliers = (
  result: SuppliersApiResponse,
): Supplier[] => {
  if (
    Array.isArray(
      result.suppliers,
    )
  ) {
    return result.suppliers;
  }

  if (
    Array.isArray(result.data)
  ) {
    return result.data;
  }

  if (
    result.data &&
    typeof result.data === "object"
  ) {
    return (
      result.data.suppliers ||
      result.data.records ||
      result.data.results ||
      result.data.items ||
      []
    );
  }

  return [];
};

const normalizeText = (
  value?: string | null,
): string =>
  typeof value === "string" &&
  value.trim()
    ? value.trim()
    : "—";

const toSafeNumber = (
  value: unknown,
): number => {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
};

const formatMoney = (
  value: unknown,
  currency = "BDT",
): string => {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      toSafeNumber(value),
    );
  } catch {
    return `${currency} ${toSafeNumber(
      value,
    ).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const formatDateTime = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const getStatusClassName = (
  status?: string | null,
): string => {
  const value =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    value === "active"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value === "inactive" ||
    value === "disabled"
  ) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (
    value.includes("blocked") ||
    value.includes("suspended")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getFullAddress = (
  address?: SupplierAddress,
): string => {
  if (!address) {
    return "—";
  }

  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.area,
    address.district,
    address.division,
    address.postalCode,
    address.country,
  ]
    .map(
      (item) =>
        typeof item === "string"
          ? item.trim()
          : "",
    )
    .filter(Boolean);

  return parts.length
    ? parts.join(", ")
    : "—";
};

const getPaymentTermLabel = (
  supplier: Supplier,
): string => {
  const paymentTerm =
    normalizeText(
      supplier.paymentTerm,
    );

  if (
    supplier.paymentTerm ===
      "Custom" &&
    supplier.customPaymentTermDays
  ) {
    return `${supplier.customPaymentTermDays} day(s)`;
  }

  return paymentTerm;
};


const extractRelatedRecords = <T,>(
  result: RelatedListApiResponse<T>,
): T[] => {
  const topLevel =
    result.purchaseOrders ||
    result.orders ||
    result.goodsReceipts ||
    result.goodsReceived ||
    result.records ||
    result.results ||
    result.items;

  if (Array.isArray(topLevel)) {
    return topLevel;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (
    result.data &&
    typeof result.data === "object"
  ) {
    return (
      result.data.purchaseOrders ||
      result.data.orders ||
      result.data.goodsReceipts ||
      result.data.goodsReceived ||
      result.data.records ||
      result.data.results ||
      result.data.items ||
      []
    );
  }

  return [];
};

const getReferenceId = (
  value:
    | string
    | EntityReference
    | null
    | undefined,
  fallback?: string,
): string => {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value._id ||
      value.id ||
      fallback ||
      ""
    );
  }

  return fallback || "";
};

const belongsToSupplier = (
  supplierId: string,
  supplierReference:
    | string
    | EntityReference
    | null
    | undefined,
  fallbackSupplierId?: string,
): boolean =>
  getReferenceId(
    supplierReference,
    fallbackSupplierId,
  ) === supplierId;

const getPurchaseOrderValue = (
  record: PurchaseOrderRecord,
): number =>
  toSafeNumber(
    record.financialSummary
      ?.grandTotal ??
      record.grandTotal ??
      record.totalAmount,
  );

const getGoodsReceivedValue = (
  record: GoodsReceivedRecord,
): number =>
  toSafeNumber(
    record.inventoryPosting
      ?.postedValue ??
      record.financialSummary
        ?.grandTotal ??
      record.financialSummary
        ?.subtotal,
  );


/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: ReactNode;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 text-xl font-black text-slate-900">
        {value}
      </div>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[190px_1fr]">
      <dt className="text-sm font-semibold text-slate-500">
        {label}
      </dt>

      <dd className="break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function SupplierDetailsPage() {
  const params =
    useParams<{
      supplier?: string;
      supplierId?: string;
    }>();

  const router =
    useRouter();

  const supplierId =
    typeof params.supplier ===
      "string"
      ? params.supplier
      : typeof params.supplierId ===
          "string"
        ? params.supplierId
        : "";

  const [
    supplier,
    setSupplier,
  ] = useState<Supplier | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    metrics,
    setMetrics,
  ] = useState<SupplierMetrics>({
    purchaseOrderCount: 0,
    goodsReceivedCount: 0,
    totalPurchaseOrderValue: 0,
    totalReceivedValue: 0,
    currentBalance: 0,
    totalAcceptedQuantity: 0,
    totalRejectedQuantity: 0,
  });

  const loadSupplier =
    useCallback(
      async ({
        silent = false,
      }: {
        silent?: boolean;
      } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          ensureRequestContext();

          if (!supplierId) {
            throw new Error(
              "Supplier ID is missing.",
            );
          }

          const suppliersResponse =
            await fetch(
              `${API_URL}/api/suppliers?limit=100`,
              {
                method: "GET",
                headers:
                  createHeaders(),
                credentials:
                  "include",
                cache: "no-store",
              },
            );

          const suppliersResult =
            (await suppliersResponse
              .json()
              .catch(
                () => ({}),
              )) as SuppliersApiResponse;

          if (
            !suppliersResponse.ok
          ) {
            throw new Error(
              getErrorMessage(
                suppliersResult,
                `Failed to load supplier (${suppliersResponse.status}).`,
              ),
            );
          }

          const suppliers =
            extractSuppliers(
              suppliersResult,
            );

          const matchedSupplier =
            suppliers.find(
              (item) =>
                item._id ===
                supplierId,
            );

          if (!matchedSupplier) {
            throw new Error(
              "Supplier was not found for the selected tenant.",
            );
          }

          setSupplier(
            matchedSupplier,
          );

          const [
            purchaseOrdersResult,
            goodsReceivedResult,
          ] = await Promise.allSettled([
            fetch(
              `${API_URL}/api/purchase-orders?limit=100`,
              {
                method: "GET",
                headers:
                  createHeaders(),
                credentials:
                  "include",
                cache: "no-store",
              },
            ).then(async (response) => {
              const json =
                (await response
                  .json()
                  .catch(
                    () => ({}),
                  )) as RelatedListApiResponse<PurchaseOrderRecord>;

              if (!response.ok) {
                throw new Error(
                  getErrorMessage(
                    json,
                    `Purchase orders request failed (${response.status}).`,
                  ),
                );
              }

              return json;
            }),

            fetch(
              `${API_URL}/api/goods-received?limit=100`,
              {
                method: "GET",
                headers:
                  createHeaders(),
                credentials:
                  "include",
                cache: "no-store",
              },
            ).then(async (response) => {
              const json =
                (await response
                  .json()
                  .catch(
                    () => ({}),
                  )) as RelatedListApiResponse<GoodsReceivedRecord>;

              if (!response.ok) {
                throw new Error(
                  getErrorMessage(
                    json,
                    `Goods received request failed (${response.status}).`,
                  ),
                );
              }

              return json;
            }),

          ]);

          const purchaseOrders =
            purchaseOrdersResult.status ===
            "fulfilled"
              ? extractRelatedRecords(
                  purchaseOrdersResult.value,
                ).filter((record) =>
                  belongsToSupplier(
                    supplierId,
                    record.supplier,
                    record.supplierId,
                  ),
                )
              : [];

          const goodsReceipts =
            goodsReceivedResult.status ===
            "fulfilled"
              ? extractRelatedRecords(
                  goodsReceivedResult.value,
                ).filter((record) =>
                  belongsToSupplier(
                    supplierId,
                    record.supplier,
                    record.supplierId,
                  ),
                )
              : [];


          const liveMetrics =
            {
              purchaseOrderCount:
                purchaseOrders.length,

              goodsReceivedCount:
                goodsReceipts.length,

              totalPurchaseOrderValue:
                purchaseOrders.reduce(
                  (total, record) =>
                    total +
                    getPurchaseOrderValue(
                      record,
                    ),
                  0,
                ),

              totalReceivedValue:
                goodsReceipts.reduce(
                  (total, record) =>
                    total +
                    getGoodsReceivedValue(
                      record,
                    ),
                  0,
                ),

              currentBalance:
                toSafeNumber(
                  matchedSupplier.currentBalance,
                ),

              totalAcceptedQuantity:
                goodsReceipts.reduce(
                  (total, record) =>
                    total +
                    toSafeNumber(
                      record.receivingSummary
                        ?.totalAcceptedQuantity,
                    ),
                  0,
                ),

              totalRejectedQuantity:
                goodsReceipts.reduce(
                  (total, record) =>
                    total +
                    toSafeNumber(
                      record.receivingSummary
                        ?.totalRejectedQuantity,
                    ),
                  0,
                ),
            };

          setMetrics(
            liveMetrics,
          );


        } catch (
          requestError
        ) {
          setSupplier(null);

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load supplier.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [supplierId],
    );

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const currency =
    supplier?.currency ||
    "BDT";

  const netBalance =
    useMemo(
      () =>
        toSafeNumber(
          supplier?.currentBalance,
        ),
      [
        supplier?.currentBalance,
      ],
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-96 max-w-[1200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading supplier
            details...
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    !supplier
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-800">
            Unable to load supplier
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              "Supplier data was not found."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadSupplier()
              }
              className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Try Again
            </button>

            <Link
              href="/admin/supplier-and-purchase/suppliers"
              className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-700"
            >
              Back to Suppliers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Breadcrumb */}

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

          <span className="font-semibold text-slate-800">
            {normalizeText(
              supplier.supplierCode,
            )}
          </span>
        </nav>

        {/* Header */}

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Supplier Profile
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {supplier.businessName ||
                supplier.displayName ||
                "Supplier"}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review supplier business,
              contact, payment, financial
              and settlement information.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void loadSupplier({
                  silent: true,
                })
              }
              disabled={
                loading ||
                refreshing
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back
            </button>

            <Link
              href="/admin/supplier-and-purchase/suppliers"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              All Suppliers
            </Link>
          </div>
        </header>

        {/* Summary */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Supplier Status"
            value={
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getStatusClassName(
                  supplier.status,
                )}`}
              >
                {normalizeText(
                  supplier.status,
                )}
              </span>
            }
            description="Current supplier account status."
          />

          <SummaryCard
            label="Current Balance"
            value={formatMoney(
              netBalance,
              currency,
            )}
            description="Current supplier payable balance."
          />

          <SummaryCard
            label="Total Purchases"
            value={formatMoney(
              metrics.totalPurchaseOrderValue ||
                supplier.totalPurchaseAmount,
              currency,
            )}
            description="Live total calculated from purchase orders."
          />

          <SummaryCard
            label="Received Value"
            value={formatMoney(
              metrics.totalReceivedValue,
              currency,
            )}
            description="Live accepted goods received value."
          />
        </section>

        {/* Main Information */}

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Business Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Supplier Code"
                value={normalizeText(
                  supplier.supplierCode,
                )}
              />

              <DetailRow
                label="Business Name"
                value={normalizeText(
                  supplier.businessName,
                )}
              />

              <DetailRow
                label="Display Name"
                value={normalizeText(
                  supplier.displayName,
                )}
              />

              <DetailRow
                label="Supplier Type"
                value={normalizeText(
                  supplier.supplierType,
                )}
              />

              <DetailRow
                label="Status"
                value={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClassName(
                      supplier.status,
                    )}`}
                  >
                    {normalizeText(
                      supplier.status,
                    )}
                  </span>
                }
              />

              <DetailRow
                label="Website"
                value={
                  supplier.website ? (
                    <a
                      href={
                        supplier.website.startsWith(
                          "http",
                        )
                          ? supplier.website
                          : `https://${supplier.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-600 hover:underline"
                    >
                      {supplier.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailRow
                label="Full Address"
                value={getFullAddress(
                  supplier.address,
                )}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Contact Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Contact Person"
                value={normalizeText(
                  supplier.contactPerson,
                )}
              />

              <DetailRow
                label="Designation"
                value={normalizeText(
                  supplier.designation,
                )}
              />

              <DetailRow
                label="Phone"
                value={
                  supplier.phone ? (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-orange-600 hover:underline"
                    >
                      {supplier.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailRow
                label="Alternate Phone"
                value={
                  supplier.alternatePhone ? (
                    <a
                      href={`tel:${supplier.alternatePhone}`}
                      className="text-orange-600 hover:underline"
                    >
                      {supplier.alternatePhone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailRow
                label="Email"
                value={
                  supplier.email ? (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-orange-600 hover:underline"
                    >
                      {supplier.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailRow
                label="Country"
                value={normalizeText(
                  supplier.address
                    ?.country,
                )}
              />
            </dl>
          </section>
        </div>

        {/* Payment and Compliance */}

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Payment &amp; Financial
              Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Currency"
                value={currency}
              />

              <DetailRow
                label="Payment Term"
                value={getPaymentTermLabel(
                  supplier,
                )}
              />

              <DetailRow
                label="Opening Balance"
                value={formatMoney(
                  supplier.openingBalance,
                  currency,
                )}
              />

              <DetailRow
                label="Current Balance"
                value={formatMoney(
                  netBalance,
                  currency,
                )}
              />

              <DetailRow
                label="Total Purchases"
                value={formatMoney(
                  metrics.totalPurchaseOrderValue ||
                    supplier.totalPurchaseAmount,
                  currency,
                )}
              />

              <DetailRow
                label="Total Paid"
                value={formatMoney(
                  supplier.totalPaidAmount,
                  currency,
                )}
              />

              <DetailRow
                label="Total Returns"
                value={formatMoney(
                  supplier.totalReturnAmount,
                  currency,
                )}
              />

              <DetailRow
                label="Credit Limit"
                value={formatMoney(
                  supplier.creditLimit,
                  currency,
                )}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Compliance Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Tax Identification Number"
                value={normalizeText(
                  supplier.taxIdentificationNumber,
                )}
              />

              <DetailRow
                label="Business Identification Number"
                value={normalizeText(
                  supplier.businessIdentificationNumber,
                )}
              />

              <DetailRow
                label="Trade License Number"
                value={normalizeText(
                  supplier.tradeLicenseNumber,
                )}
              />

              <DetailRow
                label="Created At"
                value={formatDateTime(
                  supplier.createdAt,
                )}
              />

              <DetailRow
                label="Last Updated"
                value={formatDateTime(
                  supplier.updatedAt,
                )}
              />

              <DetailRow
                label="Created By"
                value={normalizeText(
                  supplier.createdBy,
                )}
              />

              <DetailRow
                label="Updated By"
                value={normalizeText(
                  supplier.updatedBy,
                )}
              />
            </dl>
          </section>
        </div>

        {/* Live Activity */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Live Supplier Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Calculated from current purchase orders and goods received records.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Purchase Orders"
              value={metrics.purchaseOrderCount}
              description="Purchase orders linked to this supplier."
            />

            <SummaryCard
              label="Goods Received"
              value={metrics.goodsReceivedCount}
              description="Goods received records linked to this supplier."
            />

            <SummaryCard
              label="Received Value"
              value={formatMoney(
                metrics.totalReceivedValue,
                currency,
              )}
              description="Accepted goods received value."
            />

            <SummaryCard
              label="Accepted Quantity"
              value={metrics.totalAcceptedQuantity.toLocaleString(
                "en-US",
              )}
              description={`Rejected quantity: ${metrics.totalRejectedQuantity.toLocaleString(
                "en-US",
              )}`}
            />
          </div>
        </section>

        {/* Settlement Details */}

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Bank Account
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Account Name"
                value={normalizeText(
                  supplier.bankAccount
                    ?.accountName,
                )}
              />

              <DetailRow
                label="Account Number"
                value={normalizeText(
                  supplier.bankAccount
                    ?.accountNumber,
                )}
              />

              <DetailRow
                label="Bank Name"
                value={normalizeText(
                  supplier.bankAccount
                    ?.bankName,
                )}
              />

              <DetailRow
                label="Branch Name"
                value={normalizeText(
                  supplier.bankAccount
                    ?.branchName,
                )}
              />

              <DetailRow
                label="Routing Number"
                value={normalizeText(
                  supplier.bankAccount
                    ?.routingNumber,
                )}
              />

              <DetailRow
                label="SWIFT Code"
                value={normalizeText(
                  supplier.bankAccount
                    ?.swiftCode,
                )}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Mobile Banking
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Provider"
                value={normalizeText(
                  supplier.mobileBanking
                    ?.provider,
                )}
              />

              <DetailRow
                label="Account Name"
                value={normalizeText(
                  supplier.mobileBanking
                    ?.accountName,
                )}
              />

              <DetailRow
                label="Account Number"
                value={normalizeText(
                  supplier.mobileBanking
                    ?.accountNumber,
                )}
              />
            </dl>
          </section>
        </div>

        {/* Notes and tags */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Notes &amp; Tags
          </h2>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Notes
              </p>

              <div className="mt-2 min-h-28 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {supplier.notes ||
                  "No supplier notes were provided."}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-500">
                Tags
              </p>

              {supplier.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {supplier.tags.map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <div className="mt-2 min-h-28 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No tags were assigned.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Related actions */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Related Records
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open supplier-related
            purchase and receiving
            records.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/admin/supplier-and-purchase/purchase-orders?supplierId=${encodeURIComponent(
                supplier._id,
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View Purchase Orders
            </Link>

            <Link
              href={`/admin/supplier-and-purchase/goods-received?supplierId=${encodeURIComponent(
                supplier._id,
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
            >
              View Goods Received
            </Link>

          </div>
        </section>
      </div>
    </main>
  );
}