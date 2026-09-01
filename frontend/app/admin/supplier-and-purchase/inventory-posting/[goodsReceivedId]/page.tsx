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

interface UserReference {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
}

interface PurchaseOrderReference {
  _id?: string;
  id?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;
}

interface ProductSnapshot {
  productName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  variantName?: string | null;
  unitName?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
}

interface InventoryPostingItem {
  _id?: string;
  id?: string;
  product?: EntityReference | string | null;
  productName?: string;
  sku?: string;
  productSnapshot?: ProductSnapshot;

  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  postedQuantity?: number;

  unitCost?: number;
  unitPrice?: number;
  costPrice?: number;

  subtotal?: number;
  lineTotal?: number;
  totalValue?: number;
  inventoryValue?: number;

  warehouse?: EntityReference | string | null;
  warehouseName?: string;
  storageLocation?: string | null;
  rackNumber?: string | null;
  binNumber?: string | null;

  batchInformation?: {
    batchNumber?: string | null;
    lotNumber?: string | null;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    supplierBatchNumber?: string | null;
  };

  inspection?: {
    status?: string;
    qualityGrade?: string;
  };

  inventoryPosting?: {
    status?: string;
    stockTransaction?: string | null;
    postedQuantity?: number;
    postedAt?: string | null;
    postedBy?: UserReference | string | null;
    postingReference?: string | null;
    inventoryStock?: string | null;
    failureReason?: string | null;
  };
}

interface GoodsReceivedRecord {
  _id: string;
  id?: string;

  goodsReceivedNumber?: string;
  grnNumber?: string;
  receiptNumber?: string;

  purchaseOrder?: PurchaseOrderReference | string | null;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;

  supplier?: EntityReference | string | null;
  supplierId?: string;
  supplierName?: string;
  supplierSnapshot?: {
    supplierCode?: string | null;
    businessName?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    currency?: string | null;
  };

  warehouse?: EntityReference | string | null;
  warehouseId?: string;
  warehouseName?: string;
  warehouseSnapshot?: {
    warehouseName?: string | null;
    warehouseCode?: string | null;
    address?: string | null;
  };

  status?: string;
  receivedDate?: string;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;

  currency?: string;

  inspection?: {
    status?: string;
    required?: boolean;
    startedAt?: string | null;
    completedAt?: string | null;
    inspectedBy?: UserReference | string | null;
    remarks?: string | null;
  };

  receivingSummary?: {
    itemCount?: number;
    totalOrderedQuantity?: number;
    totalReceivedQuantity?: number;
    totalAcceptedQuantity?: number;
    totalRejectedQuantity?: number;
    totalDamagedQuantity?: number;
  };

  financialSummary?: {
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    grandTotal?: number;
  };

  inventoryPosting?: {
    status?: string;
    postedAt?: string | null;
    postedBy?: UserReference | string | null;
    reversedAt?: string | null;
    reversedBy?: UserReference | string | null;
    reversalReason?: string | null;
    stockTransactionIds?: string[];
    postingReference?: string | null;
    postedQuantity?: number;
    postedValue?: number;
    failureReason?: string | null;
    remarks?: string | null;
  };

  statusHistory?: Array<{
    _id?: string;
    fromStatus?: string;
    toStatus?: string;
    changedBy?: UserReference | string;
    changedAt?: string;
    reason?: string | null;
    note?: string | null;
  }>;

  items?: InventoryPostingItem[];
}

interface GoodsReceivedApiResponse {
  success?: boolean;
  message?: string;
  data?:
    | GoodsReceivedRecord
    | {
        goodsReceived?: GoodsReceivedRecord;
        record?: GoodsReceivedRecord;
        items?: InventoryPostingItem[];
      };
  goodsReceived?: GoodsReceivedRecord;
  record?: GoodsReceivedRecord;
  items?: InventoryPostingItem[];
  errors?: Array<{
    message?: string;
  }>;
}

interface PreviewApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
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
   GENERAL HELPERS
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

const extractRecord = (
  result: GoodsReceivedApiResponse,
): GoodsReceivedRecord | null => {
  const topLevel =
    result.goodsReceived ||
    result.record ||
    null;

  if (topLevel) {
    return {
      ...topLevel,
      items:
        result.items ||
        topLevel.items ||
        [],
    };
  }

  if (
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
  ) {
    if (
      "goodsReceived" in result.data &&
      result.data.goodsReceived
    ) {
      return {
        ...result.data.goodsReceived,
        items:
          result.data.items ||
          result.data.goodsReceived.items ||
          [],
      };
    }

    if (
      "record" in result.data &&
      result.data.record
    ) {
      return {
        ...result.data.record,
        items:
          result.data.items ||
          result.data.record.items ||
          [],
      };
    }

    if ("_id" in result.data) {
      return result.data as GoodsReceivedRecord;
    }
  }

  return null;
};

const normalizeStatus = (
  value?: string | null,
): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

const formatStatusLabel = (
  value?: string | null,
): string => {
  const normalized =
    String(value || "Pending")
      .replace(/[_-]+/g, " ")
      .trim();

  return normalized.replace(
    /\b\w/g,
    (letter) =>
      letter.toUpperCase(),
  );
};

const getStatusClassName = (
  value?: string | null,
): string => {
  const status =
    normalizeStatus(value);

  if (
    status === "posted" ||
    status === "completed" ||
    status === "accepted" ||
    status === "passed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status.includes("reject") ||
    status.includes("fail") ||
    status.includes("cancel") ||
    status.includes("reverse")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status.includes("progress") ||
    status.includes("process")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    status.includes("partial")
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getGrnNumber = (
  record?: GoodsReceivedRecord | null,
): string =>
  record?.goodsReceivedNumber ||
  record?.grnNumber ||
  record?.receiptNumber ||
  "Inventory Posting";

const getPoNumber = (
  record?: GoodsReceivedRecord | null,
): string => {
  if (
    record?.purchaseOrder &&
    typeof record.purchaseOrder ===
      "object"
  ) {
    return (
      record.purchaseOrder
        .purchaseOrderNumber ||
      record.purchaseOrder.poNumber ||
      record.purchaseOrder.orderNumber ||
      record.purchaseOrderNumber ||
      record.poNumber ||
      "—"
    );
  }

  return (
    record?.purchaseOrderNumber ||
    record?.poNumber ||
    "—"
  );
};

const getEntityName = (
  value:
    | EntityReference
    | string
    | null
    | undefined,
  fallback?: string,
): string => {
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value.displayName ||
      value.businessName ||
      value.supplierName ||
      value.warehouseName ||
      value.name ||
      value.code ||
      fallback ||
      "—"
    );
  }

  return fallback || "—";
};

const getUserDisplay = (
  value:
    | UserReference
    | string
    | null
    | undefined,
): string => {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() || "—";
  }

  const name =
    value.displayName ||
    value.name ||
    "";

  const email =
    value.email ||
    "";

  if (name && email) {
    return `${name} (${email})`;
  }

  return (
    name ||
    email ||
    value._id ||
    value.id ||
    "—"
  );
};

const getProductName = (
  item: InventoryPostingItem,
): string => {
  if (
    item.productSnapshot
      ?.productName
  ) {
    return item.productSnapshot
      .productName;
  }

  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.name ||
      item.product.displayName ||
      item.productName ||
      "Unnamed Product"
    );
  }

  return (
    item.productName ||
    "Unnamed Product"
  );
};

const getProductSku = (
  item: InventoryPostingItem,
): string =>
  item.productSnapshot?.sku ||
  item.productSnapshot?.barcode ||
  item.sku ||
  "—";

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
  value?: number,
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
      Number(value || 0),
    );
  } catch {
    return `${currency} ${Number(
      value || 0,
    ).toLocaleString("en-US")}`;
  }
};

const formatDate = (
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
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
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
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const extractPreviewItems = (
  previewData: unknown,
): InventoryPostingItem[] => {
  if (
    !previewData ||
    typeof previewData !==
      "object"
  ) {
    return [];
  }

  const data =
    previewData as Record<
      string,
      unknown
    >;

  const candidates = [
    data.items,
    data.postingItems,
    data.inventoryItems,
    data.receivedItems,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as InventoryPostingItem[];
    }
  }

  if (
    data.preview &&
    typeof data.preview ===
      "object"
  ) {
    return extractPreviewItems(
      data.preview,
    );
  }

  return [];
};

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
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-semibold text-slate-500">
        {label}
      </dt>

      <dd className="text-sm font-semibold text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function InventoryPostingDetailsPage() {
  const params =
    useParams<{
      goodsReceivedId: string;
    }>();

  const router =
    useRouter();

  const goodsReceivedId =
    Array.isArray(
      params.goodsReceivedId,
    )
      ? params.goodsReceivedId[0]
      : params.goodsReceivedId;

  const [
    record,
    setRecord,
  ] = useState<
    GoodsReceivedRecord | null
  >(null);

  const [
    previewData,
    setPreviewData,
  ] = useState<unknown>(null);

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

  const loadDetails =
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

          if (!goodsReceivedId) {
            throw new Error(
              "Goods received ID is missing.",
            );
          }

          const response =
            await fetch(
              `${API_URL}/api/goods-received/${goodsReceivedId}`,
              {
                method: "GET",
                headers:
                  createHeaders(),
                credentials:
                  "include",
                cache: "no-store",
              },
            );

          const result =
            (await response
              .json()
              .catch(
                () => ({}),
              )) as GoodsReceivedApiResponse;

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                result,
                `Failed to load inventory posting details (${response.status}).`,
              ),
            );
          }

          const loadedRecord =
            extractRecord(result);

          if (!loadedRecord) {
            throw new Error(
              "Goods received record was not found.",
            );
          }

          setRecord(
            loadedRecord,
          );

          /*
           * Preview is optional. Some backends allow preview for posted
           * records and some reject it. The page still works from the
           * Goods Received detail response if preview is unavailable.
           */
          try {
            const previewResponse =
              await fetch(
                `${API_URL}/api/goods-received-inventory-posting/${goodsReceivedId}/preview`,
                {
                  method: "GET",
                  headers:
                    createHeaders(),
                  credentials:
                    "include",
                  cache: "no-store",
                },
              );

            const previewResult =
              (await previewResponse
                .json()
                .catch(
                  () => ({}),
                )) as PreviewApiResponse;

            if (
              previewResponse.ok
            ) {
              setPreviewData(
                previewResult.data ??
                  previewResult,
              );
            } else {
              setPreviewData(null);
            }
          } catch {
            setPreviewData(null);
          }
        } catch (
          requestError
        ) {
          setRecord(null);

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load inventory posting details.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [goodsReceivedId],
    );

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const items =
    useMemo(() => {
      if (
        Array.isArray(
          record?.items,
        ) &&
        record.items.length > 0
      ) {
        return record.items;
      }

      return extractPreviewItems(
        previewData,
      );
    }, [
      previewData,
      record?.items,
    ]);

  const posting =
    record?.inventoryPosting;

  const postingStatus =
    posting?.status ||
    "Not Posted";

  const isPosted =
    normalizeStatus(
      postingStatus,
    ) === "posted";

  const currency =
    record?.currency ||
    "BDT";

  const postedQuantity =
    toSafeNumber(
      posting?.postedQuantity ??
        record?.receivingSummary
          ?.totalAcceptedQuantity,
    );

  const postedValue =
    toSafeNumber(
      posting?.postedValue ??
        record?.financialSummary
          ?.grandTotal,
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-96 max-w-[1600px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading inventory posting
            details...
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    !record
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-800">
            Unable to load
            inventory posting details
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              "The requested record was not found."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadDetails()
              }
              className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Try Again
            </button>

            <Link
              href="/admin/supplier-and-purchase/goods-received"
              className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-700"
            >
              Back to Goods Received
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
            href="/admin/supplier-and-purchase/inventory-posting"
            className="transition hover:text-orange-600"
          >
            Inventory Posting
          </Link>

          <span>/</span>

          <span className="font-semibold text-slate-800">
            {getGrnNumber(
              record,
            )}
          </span>
        </nav>

        {/* Header */}

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Inventory Control
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {getGrnNumber(
                record,
              )}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review inventory posting
              status, posting reference,
              posted quantities, value,
              item movements and audit
              information.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void loadDetails({
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

            <Link
              href={`/admin/supplier-and-purchase/goods-received/${record._id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View GRN
            </Link>

            <Link
              href="/admin/supplier-and-purchase/inventory-posting"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Posting Queue
            </Link>
          </div>
        </header>

        {/* Summary */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Posting Status"
            value={
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getStatusClassName(
                  postingStatus,
                )}`}
              >
                {formatStatusLabel(
                  postingStatus,
                )}
              </span>
            }
            description="Current inventory posting status."
          />

          <SummaryCard
            label="Posted Quantity"
            value={postedQuantity.toLocaleString(
              "en-US",
            )}
            description="Quantity added to tenant inventory."
          />

          <SummaryCard
            label="Posted Value"
            value={formatMoney(
              postedValue,
              currency,
            )}
            description="Total value posted into inventory."
          />

          <SummaryCard
            label="Posting Reference"
            value={
              posting?.postingReference ||
              "—"
            }
            description="Unique posting transaction reference."
          />
        </section>

        {!isPosted ? (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            This goods receipt has not
            been posted yet. Use the
            Inventory Posting Queue to
            preview and post the approved
            quantities.
          </section>
        ) : null}

        {/* Main Details */}

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Posting Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="Posting Status"
                value={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClassName(
                      postingStatus,
                    )}`}
                  >
                    {formatStatusLabel(
                      postingStatus,
                    )}
                  </span>
                }
              />

              <DetailRow
                label="Posting Reference"
                value={
                  posting?.postingReference ||
                  "—"
                }
              />

              <DetailRow
                label="Posted At"
                value={formatDateTime(
                  posting?.postedAt,
                )}
              />

              <DetailRow
                label="Posted By"
                value={getUserDisplay(
                  posting?.postedBy,
                )}
              />

              <DetailRow
                label="Posted Quantity"
                value={postedQuantity.toLocaleString(
                  "en-US",
                )}
              />

              <DetailRow
                label="Posted Value"
                value={formatMoney(
                  postedValue,
                  currency,
                )}
              />

              <DetailRow
                label="Remarks"
                value={
                  posting?.remarks ||
                  "—"
                }
              />

              <DetailRow
                label="Failure Reason"
                value={
                  posting?.failureReason ||
                  "—"
                }
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Goods Received
              Information
            </h2>

            <dl className="mt-4">
              <DetailRow
                label="GRN Number"
                value={getGrnNumber(
                  record,
                )}
              />

              <DetailRow
                label="Receipt Status"
                value={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClassName(
                      record.status,
                    )}`}
                  >
                    {formatStatusLabel(
                      record.status ||
                        "Pending",
                    )}
                  </span>
                }
              />

              <DetailRow
                label="Inspection Status"
                value={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClassName(
                      record.inspection
                        ?.status,
                    )}`}
                  >
                    {formatStatusLabel(
                      record.inspection
                        ?.status ||
                        "Not Required",
                    )}
                  </span>
                }
              />

              <DetailRow
                label="Purchase Order"
                value={getPoNumber(
                  record,
                )}
              />

              <DetailRow
                label="Supplier"
                value={
                  record.supplierSnapshot
                    ?.businessName ||
                  getEntityName(
                    record.supplier,
                    record.supplierName,
                  )
                }
              />

              <DetailRow
                label="Warehouse"
                value={
                  record.warehouseSnapshot
                    ?.warehouseName ||
                  getEntityName(
                    record.warehouse,
                    record.warehouseName,
                  )
                }
              />

              <DetailRow
                label="Received Date"
                value={formatDate(
                  record.receivedDate ||
                    record.receivedAt,
                )}
              />

              <DetailRow
                label="Currency"
                value={currency}
              />
            </dl>
          </section>
        </div>

        {/* Stock Transaction IDs */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Stock Transactions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Inventory transaction
                references generated by
                this posting.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {
                posting
                  ?.stockTransactionIds
                  ?.length || 0
              }{" "}
              transaction(s)
            </span>
          </div>

          {posting
            ?.stockTransactionIds
            ?.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {posting.stockTransactionIds.map(
                (
                  transactionId,
                ) => (
                  <article
                    key={
                      transactionId
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Transaction ID
                    </p>

                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {
                        transactionId
                      }
                    </p>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No stock transaction IDs
              were returned for this
              posting.
            </div>
          )}
        </section>

        {/* Items */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Posted Inventory Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Product quantities, costs,
              values, inspection results
              and inventory posting
              references.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center p-10 text-center text-sm text-slate-500">
              No inventory posting item
              details were returned by
              the backend.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px]">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Product",
                      "SKU",
                      "Received",
                      "Accepted",
                      "Posted",
                      "Unit Cost",
                      "Line Value",
                      "Inspection",
                      "Posting Status",
                      "Stock Transaction",
                      "Location",
                    ].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map(
                    (
                      item,
                      index,
                    ) => {
                      const acceptedQuantity =
                        toSafeNumber(
                          item.acceptedQuantity,
                        );

                      const itemPostedQuantity =
                        toSafeNumber(
                          item.inventoryPosting
                            ?.postedQuantity ??
                            item.postedQuantity ??
                            acceptedQuantity,
                        );

                      const unitCost =
                        toSafeNumber(
                          item.unitCost ??
                            item.unitPrice ??
                            item.costPrice,
                        );

                      const lineValue =
                        toSafeNumber(
                          item.lineTotal ??
                            item.subtotal ??
                            item.inventoryValue ??
                            item.totalValue,
                        ) ||
                        itemPostedQuantity *
                          unitCost;

                      const location =
                        [
                          item.storageLocation,
                          item.rackNumber
                            ? `Rack ${item.rackNumber}`
                            : "",
                          item.binNumber
                            ? `Bin ${item.binNumber}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                        "—";

                      return (
                        <tr
                          key={
                            item._id ||
                            item.id ||
                            index
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {getProductName(
                                item,
                              )}
                            </p>

                            {item
                              .productSnapshot
                              ?.variantName ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  item
                                    .productSnapshot
                                    .variantName
                                }
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getProductSku(
                              item,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                            {toSafeNumber(
                              item.receivedQuantity,
                            ).toLocaleString(
                              "en-US",
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                            {acceptedQuantity.toLocaleString(
                              "en-US",
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-bold text-blue-700">
                            {itemPostedQuantity.toLocaleString(
                              "en-US",
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatMoney(
                              unitCost,
                              currency,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-black text-slate-900">
                            {formatMoney(
                              lineValue,
                              currency,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClassName(
                                item.inspection
                                  ?.status,
                              )}`}
                            >
                              {formatStatusLabel(
                                item.inspection
                                  ?.status ||
                                  "Not Required",
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClassName(
                                item.inventoryPosting
                                  ?.status,
                              )}`}
                            >
                              {formatStatusLabel(
                                item.inventoryPosting
                                  ?.status ||
                                  postingStatus,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {item
                              .inventoryPosting
                              ?.stockTransaction ||
                              "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {location}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Audit Trail */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Audit Trail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Goods receipt status changes
            related to receiving,
            inspection and inventory
            posting.
          </p>

          {record.statusHistory
            ?.length ? (
            <div className="mt-5 space-y-3">
              {[...record.statusHistory]
                .reverse()
                .map(
                  (
                    history,
                    index,
                  ) => (
                    <article
                      key={
                        history._id ||
                        index
                      }
                      className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[170px_1fr_220px]"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Changed At
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDateTime(
                            history.changedAt,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {formatStatusLabel(
                            history.fromStatus ||
                              "Unknown",
                          )}
                          {" → "}
                          {formatStatusLabel(
                            history.toStatus ||
                              "Unknown",
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {history.note ||
                            history.reason ||
                            "No note provided."}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Changed By
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                          {getUserDisplay(
                            history.changedBy,
                          )}
                        </p>
                      </div>
                    </article>
                  ),
                )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No audit history was
              returned.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}