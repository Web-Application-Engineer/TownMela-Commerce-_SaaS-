"use client";

import Link from "next/link";

import {
  useTenant,
} from "@/src/context/TenantContext";
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
  email?: string;
  phone?: string;
  address?: string;
}

interface PurchaseOrderReference {
  _id?: string;
  id?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;
  status?: string;
}

interface ProductReference {
  _id?: string;
  id?: string;
  name?: string;
  productName?: string;
  sku?: string;
  code?: string;
}

interface GoodsReceivedItem {
  _id?: string;
  id?: string;

  purchaseOrderItem?: string;
  purchaseOrderItemId?: string;

  product?: ProductReference | string | null;
  productId?: string;
  productName?: string;
  name?: string;
  sku?: string;
  description?: string;

  orderedQuantity?: number;
  previouslyReceivedQuantity?: number;
  pendingQuantity?: number;
  receivedQuantity?: number;
  quantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;

  unitCost?: number;
  unitPrice?: number;
  costPrice?: number;

  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;

  subtotal?: number;
  lineTotal?: number;
  total?: number;

  batchNumber?: string;
  expiryDate?: string;
  warehouseName?: string;
  remarks?: string;
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

  warehouse?: EntityReference | string | null;
  warehouseId?: string;
  warehouseName?: string;

  receivedDate?: string;
  deliveryDate?: string;
  createdAt?: string;
  updatedAt?: string;

  supplierDeliveryNote?: string;
  deliveryNoteNumber?: string;
  supplierInvoiceNumber?: string;
  challanNumber?: string;
  vehicleNumber?: string;
  receivedBy?: string;

  status?: string;
  inspectionStatus?: string;
  postingStatus?: string;
  inventoryPostingStatus?: string;

  inspection?: {
    status?: string;
    required?: boolean;
  };

  inventoryPosting?: {
    status?: string;
    postedAt?: string | null;
    postedBy?: string | null;
    postingReference?: string | null;
  };

  receivingSummary?: {
    itemCount?: number;
    totalOrderedQuantity?: number;
    totalReceivedQuantity?: number;
    totalAcceptedQuantity?: number;
    totalRejectedQuantity?: number;
  };

  financialSummary?: {
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    grandTotal?: number;
  };

  currency?: string;

  itemCount?: number;
  totalItems?: number;

  totalOrderedQuantity?: number;
  totalReceivedQuantity?: number;
  receivedQuantity?: number;
  totalAcceptedQuantity?: number;
  acceptedQuantity?: number;
  totalRejectedQuantity?: number;
  rejectedQuantity?: number;

  subtotal?: number;
  discountAmount?: number;
  totalDiscount?: number;
  taxAmount?: number;
  totalTax?: number;
  totalAmount?: number;
  totalValue?: number;

  notes?: string;

  items?: GoodsReceivedItem[];
}

interface GoodsReceivedApiResponse {
  success?: boolean;
  message?: string;
  data?:
    | GoodsReceivedRecord
    | {
        goodsReceived?: GoodsReceivedRecord;
        record?: GoodsReceivedRecord;
        items?: GoodsReceivedItem[];
      };
  goodsReceived?: GoodsReceivedRecord;
  record?: GoodsReceivedRecord;
  items?: GoodsReceivedItem[];
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


const createHeaders = (
  tenantId: string,
): Headers => {
  const headers =
    new Headers();

  headers.set(
    "Accept",
    "application/json",
  );

  const token =
    getAccessToken();

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  if (tenantId) {
    headers.set(
      "X-Tenant-Id",
      tenantId,
    );
  }

  return headers;
};

const ensureRequestContext = (
  tenantId: string,
) => {
  const token =
    getAccessToken();

  if (!token) {
    throw new Error(
      "Your admin session is missing or expired. Please log in again.",
    );
  }

  if (!tenantId) {
    throw new Error(
      "Please select a tenant before continuing.",
    );
  }
};

/* =========================================================
   HELPERS
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
      Array.isArray(
        record.errors,
      )
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
  const topLevelRecord =
    result.goodsReceived ||
    result.record ||
    null;

  if (topLevelRecord) {
    return {
      ...topLevelRecord,
      items:
        result.items ||
        topLevelRecord.items ||
        [],
    };
  }

  if (
    result.data &&
    typeof result.data ===
      "object" &&
    !Array.isArray(result.data)
  ) {
    if (
      "goodsReceived" in
        result.data &&
      result.data.goodsReceived
    ) {
      return {
        ...result.data.goodsReceived,
        items:
          result.data.items ||
          result.data.goodsReceived
            .items ||
          [],
      };
    }

    if (
      "record" in
        result.data &&
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

const getGrnNumber = (
  record?: GoodsReceivedRecord | null,
): string =>
  record?.goodsReceivedNumber ||
  record?.grnNumber ||
  record?.receiptNumber ||
  "Goods Received";

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
      record.purchaseOrder
        .poNumber ||
      record.purchaseOrder
        .orderNumber ||
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

const getPurchaseOrderId = (
  record?: GoodsReceivedRecord | null,
): string => {
  if (
    record?.purchaseOrder &&
    typeof record.purchaseOrder ===
      "object"
  ) {
    return (
      record.purchaseOrder._id ||
      record.purchaseOrder.id ||
      record.purchaseOrderId ||
      ""
    );
  }

  if (
    typeof record?.purchaseOrder ===
      "string"
  ) {
    return record.purchaseOrder;
  }

  return (
    record?.purchaseOrderId ||
    ""
  );
};

const getEntityId = (
  value:
    | EntityReference
    | string
    | null
    | undefined,
  fallback?: string,
): string => {
  if (
    value &&
    typeof value ===
      "object"
  ) {
    return (
      value._id ||
      value.id ||
      fallback ||
      ""
    );
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return fallback || "";
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
    typeof value ===
      "object"
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

const getProductName = (
  item: GoodsReceivedItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.productName ||
      item.product.name ||
      item.productName ||
      item.name ||
      "Unnamed Product"
    );
  }

  return (
    item.productName ||
    item.name ||
    "Unnamed Product"
  );
};

const getProductSku = (
  item: GoodsReceivedItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.sku ||
      item.product.code ||
      item.sku ||
      "—"
    );
  }

  return item.sku || "—";
};

const formatDate = (
  value?: string,
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
  value?: string,
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

const formatMoney = (
  value?: number,
  currency = "BDT",
): string => {
  try {
    return new Intl.NumberFormat(
      "en-BD",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value || 0),
    );
  } catch {
    return `${currency} ${Number(
      value || 0,
    ).toLocaleString("en-BD")}`;
  }
};

const formatStatusLabel = (
  value?: string,
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
  value?: string,
): string => {
  const status = String(value || "")
    .toLowerCase()
    .trim();

  if (
    status === "not posted" ||
    status === "not required" ||
    status === "draft"
  ) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (
    status.includes("reject") ||
    status.includes("cancel") ||
    status.includes("fail") ||
    status.includes("blocked")
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
    status.includes("complete") ||
    status.includes("approved") ||
    status.includes("accepted") ||
    status.includes("passed") ||
    status === "posted"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

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

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

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
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
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
            Supplier &amp;
            Purchase
          </Link>

          <span>/</span>

          <Link
            href="/admin/supplier-and-purchase/goods-received"
            className="transition hover:text-orange-600"
          >
            Goods Received
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-800">
            {title}
          </span>
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

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {actions}

            <Link
              href="/admin/supplier-and-purchase/goods-received"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Goods Received
            </Link>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

      <p className="mt-4 text-sm font-medium text-slate-600">
        Loading goods received details...
      </p>
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
      <h2 className="font-bold text-red-800">
        Unable to load goods received
      </h2>

      <p className="mt-2 text-sm text-red-700">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        Try Again
      </button>
    </div>
  );
}

function InfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: ReactNode;
  description?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-2 text-xl font-black text-slate-900">
        {value}
      </div>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
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

export default function GoodsReceivedDetailsPage() {
  const {
    selectedTenantId,
  } = useTenant();

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

  const loadRecord =
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

          ensureRequestContext(selectedTenantId);

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
                  createHeaders(selectedTenantId),
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
                `Failed to load goods received details (${response.status}).`,
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
        } catch (
          requestError
        ) {
          setRecord(null);

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load goods received details.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        goodsReceivedId,
        selectedTenantId,
      ],
    );

  useEffect(() => {
    setRecord(null);
    setError("");

    if (selectedTenantId) {
      void loadRecord();
    } else {
      setLoading(false);
    }
  }, [
    loadRecord,
    selectedTenantId,
  ]);

  const items =
    useMemo(
      () =>
        Array.isArray(
          record?.items,
        )
          ? record.items
          : [],
      [record?.items],
    );

  const totals =
    useMemo(() => {
      const ordered =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.orderedQuantity,
            ),
          0,
        );

      const received =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.receivedQuantity ??
                item.quantity,
            ),
          0,
        );

      const accepted =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.acceptedQuantity,
            ),
          0,
        );

      const rejected =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.rejectedQuantity,
            ),
          0,
        );

      const subtotal =
        items.reduce(
          (total, item) => {
            const acceptedQuantity =
              toSafeNumber(
                item.acceptedQuantity,
              );

            const unitCost =
              toSafeNumber(
                item.unitCost ??
                  item.unitPrice ??
                  item.costPrice,
              );

            return (
              total +
              toSafeNumber(
                item.subtotal,
              ) ||
              total +
                acceptedQuantity *
                  unitCost
            );
          },
          0,
        );

      const discount =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.discountAmount,
            ),
          0,
        );

      const tax =
        items.reduce(
          (total, item) =>
            total +
            toSafeNumber(
              item.taxAmount,
            ),
          0,
        );

      const total =
        items.reduce(
          (sum, item) =>
            sum +
            toSafeNumber(
              item.lineTotal ??
                item.total,
            ),
          0,
        );

      return {
        ordered:
          record?.receivingSummary
            ?.totalOrderedQuantity ??
          record?.totalOrderedQuantity ??
          ordered,

        received:
          record?.receivingSummary
            ?.totalReceivedQuantity ??
          record?.totalReceivedQuantity ??
          record?.receivedQuantity ??
          received,

        accepted:
          record?.receivingSummary
            ?.totalAcceptedQuantity ??
          record?.totalAcceptedQuantity ??
          record?.acceptedQuantity ??
          accepted,

        rejected:
          record?.receivingSummary
            ?.totalRejectedQuantity ??
          record?.totalRejectedQuantity ??
          record?.rejectedQuantity ??
          rejected,

        subtotal:
          record?.financialSummary
            ?.subtotal ??
          record?.subtotal ??
          subtotal,

        discount:
          record?.financialSummary
            ?.discountAmount ??
          record?.totalDiscount ??
          record?.discountAmount ??
          discount,

        tax:
          record?.financialSummary
            ?.taxAmount ??
          record?.totalTax ??
          record?.taxAmount ??
          tax,

        total:
          record?.financialSummary
            ?.grandTotal ??
          record?.totalValue ??
          record?.totalAmount ??
          total,
      };
    }, [items, record]);

  const purchaseOrderId =
    getPurchaseOrderId(record);

  const supplierId =
    getEntityId(
      record?.supplier,
      record?.supplierId,
    );

  const inspectionStatus =
    record?.inspection?.status ||
    record?.inspectionStatus ||
    (record?.inspection?.required === false
      ? "Not Required"
      : "Pending");

  const normalizedInspectionStatus =
    String(inspectionStatus)
      .trim()
      .toLowerCase();

  const receiptStatus =
    String(record?.status || "")
      .trim()
      .toLowerCase();

  const postingStatus =
    record?.inventoryPosting?.status ||
    record?.postingStatus ||
    record?.inventoryPostingStatus ||
    "Not Posted";

  const normalizedPostingStatus =
    String(postingStatus)
      .trim()
      .toLowerCase();

  const inspectionButtonText =
    normalizedInspectionStatus === "pending"
      ? "Start Inspection"
      : normalizedInspectionStatus === "in progress"
        ? "Continue Inspection"
        : normalizedInspectionStatus === "failed"
          ? "Review Inspection"
          : normalizedInspectionStatus === "partially passed"
            ? "Review Inspection"
            : "View Inspection";

  const inspectionButtonClass =
    normalizedInspectionStatus === "pending"
      ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700"
      : normalizedInspectionStatus === "in progress"
        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        : normalizedInspectionStatus === "failed"
          ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
          : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700";

  const inspectionAllowsPosting = [
    "passed",
    "partially passed",
    "not required",
  ].includes(normalizedInspectionStatus);

  const receiptAllowsPosting = [
    "accepted",
    "partially accepted",
    "completed",
  ].includes(receiptStatus);

  const canPostInventory =
    Boolean(record?._id) &&
    normalizedPostingStatus === "not posted" &&
    inspectionAllowsPosting &&
    receiptAllowsPosting;

  const inventoryButtonText =
    normalizedPostingStatus === "posted"
      ? "Inventory Posted"
      : normalizedPostingStatus === "partially posted"
        ? "Inventory Partially Posted"
        : normalizedPostingStatus === "reversed"
          ? "Inventory Posting Reversed"
          : !inspectionAllowsPosting
            ? "Complete Inspection First"
            : !receiptAllowsPosting
              ? "Inventory Posting Blocked"
              : "Post Inventory";

  return (
    <PageShell
      title={
        record
          ? getGrnNumber(record)
          : "Goods Received Details"
      }
      eyebrow="Receiving"
      description="Review receipt information, inspection results, received quantities, costs, and inventory posting status."
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              void loadRecord({
                silent: true,
              })
            }
            disabled={
              refreshing ||
              loading
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          {record ? (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}/inspection`,
                )
              }
              className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold shadow-sm transition ${inspectionButtonClass}`}
            >
              {inspectionButtonText}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Print GRN
          </button>

          {record ? (
            canPostInventory ? (
              <Link
                href={`/admin/supplier-and-purchase/inventory-posting/create?goodsReceivedId=${encodeURIComponent(
                  record._id,
                )}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                {inventoryButtonText}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title={
                  !inspectionAllowsPosting
                    ? "Complete the inspection before posting inventory."
                    : "This goods receipt is not eligible for inventory posting."
                }
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-5 text-sm font-bold text-slate-500"
              >
                {inventoryButtonText}
              </button>
            )
          ) : null}
        </>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() =>
            void loadRecord()
          }
        />
      ) : !record ? (
        <ErrorState
          message="Goods received record was not found."
          onRetry={() =>
            router.push(
              "/admin/supplier-and-purchase/goods-received",
            )
          }
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Receipt Status"
              value={
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getStatusClassName(
                    record.status,
                  )}`}
                >
                  {formatStatusLabel(
                    record.status ||
                      "Received",
                  )}
                </span>
              }
              description="Current goods receipt status."
            />

            <InfoCard
              label="Inspection"
              value={
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getStatusClassName(
                    record.inspection?.status ||
                      record.inspectionStatus,
                  )}`}
                >
                  {formatStatusLabel(
                    record.inspection?.status ||
                      record.inspectionStatus ||
                      "Not Required",
                  )}
                </span>
              }
              description="Inspection result for the receipt."
            />

            <InfoCard
              label="Inventory Posting"
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

            <InfoCard
              label="Receipt Value"
              value={formatMoney(
                totals.total,
                record.currency ||
                  "BDT",
              )}
              description="Total accepted inventory value."
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Receipt Information
              </h2>

              <dl className="mt-4">
                <DetailRow
                  label="GRN Number"
                  value={getGrnNumber(
                    record,
                  )}
                />

                <DetailRow
                  label="Received Date"
                  value={formatDate(
                    record.receivedDate ||
                      record.deliveryDate,
                  )}
                />

                <DetailRow
                  label="Received By"
                  value={
                    record.receivedBy ||
                    "—"
                  }
                />

                <DetailRow
                  label="Supplier Delivery Note"
                  value={
                    record.supplierDeliveryNote ||
                    record.deliveryNoteNumber ||
                    "—"
                  }
                />

                <DetailRow
                  label="Supplier Invoice"
                  value={
                    record.supplierInvoiceNumber ||
                    "—"
                  }
                />

                <DetailRow
                  label="Challan Number"
                  value={
                    record.challanNumber ||
                    "—"
                  }
                />

                <DetailRow
                  label="Vehicle Number"
                  value={
                    record.vehicleNumber ||
                    "—"
                  }
                />

                <DetailRow
                  label="Created"
                  value={formatDateTime(
                    record.createdAt,
                  )}
                />

                <DetailRow
                  label="Last Updated"
                  value={formatDateTime(
                    record.updatedAt,
                  )}
                />
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Purchase Information
              </h2>

              <dl className="mt-4">
                <DetailRow
                  label="Purchase Order"
                  value={
                    purchaseOrderId ? (
                      <Link
                        href={`/admin/supplier-and-purchase/purchase-orders/${purchaseOrderId}`}
                        className="text-orange-600 hover:underline"
                      >
                        {getPoNumber(
                          record,
                        )}
                      </Link>
                    ) : (
                      getPoNumber(
                        record,
                      )
                    )
                  }
                />

                <DetailRow
                  label="Supplier"
                  value={
                    supplierId ? (
                      <Link
                        href={`/admin/supplier-and-purchase/suppliers/${supplierId}`}
                        className="text-orange-600 hover:underline"
                      >
                        {getEntityName(
                          record.supplier,
                          record.supplierName,
                        )}
                      </Link>
                    ) : (
                      getEntityName(
                        record.supplier,
                        record.supplierName,
                      )
                    )
                  }
                />

                <DetailRow
                  label="Warehouse"
                  value={getEntityName(
                    record.warehouse,
                    record.warehouseName,
                  )}
                />

                <DetailRow
                  label="Currency"
                  value={
                    record.currency ||
                    "BDT"
                  }
                />

                <DetailRow
                  label="Item Count"
                  value={
                    record.receivingSummary
                      ?.itemCount ??
                    record.itemCount ??
                    record.totalItems ??
                    items.length
                  }
                />
              </dl>
            </section>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Ordered Quantity"
              value={Number(
                totals.ordered,
              ).toLocaleString(
                "en-BD",
              )}
              description="Original ordered quantity."
            />

            <InfoCard
              label="Received Quantity"
              value={Number(
                totals.received,
              ).toLocaleString(
                "en-BD",
              )}
              description="Quantity physically received."
            />

            <InfoCard
              label="Accepted Quantity"
              value={
                <span className="text-emerald-700">
                  {Number(
                    totals.accepted,
                  ).toLocaleString(
                    "en-BD",
                  )}
                </span>
              }
              description="Quantity approved for stock."
            />

            <InfoCard
              label="Rejected Quantity"
              value={
                <span className="text-red-600">
                  {Number(
                    totals.rejected,
                  ).toLocaleString(
                    "en-BD",
                  )}
                </span>
              }
              description="Quantity rejected during inspection."
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Received Items
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Detailed receiving,
                inspection and valuation
                information for each
                product.
              </p>
            </div>

            {items.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center p-10 text-center text-sm text-slate-500">
                No received items were
                found for this record.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Product",
                        "SKU",
                        "Ordered",
                        "Previously Received",
                        "Pending",
                        "Received",
                        "Accepted",
                        "Rejected",
                        "Unit Cost",
                        "Tax",
                        "Discount",
                        "Line Total",
                        "Batch",
                        "Expiry",
                        "Remarks",
                      ].map(
                        (heading) => (
                          <th
                            key={
                              heading
                            }
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
                        const unitCost =
                          toSafeNumber(
                            item.unitCost ??
                              item.unitPrice ??
                              item.costPrice,
                          );

                        const acceptedQuantity =
                          toSafeNumber(
                            item.acceptedQuantity,
                          );

                        const calculatedLineTotal =
                          acceptedQuantity *
                            unitCost -
                          toSafeNumber(
                            item.discountAmount,
                          ) +
                          toSafeNumber(
                            item.taxAmount,
                          );

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

                              {item.description ? (
                                <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                                  {
                                    item.description
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
                                item.orderedQuantity,
                              ).toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {toSafeNumber(
                                item.previouslyReceivedQuantity,
                              ).toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-amber-700">
                              {toSafeNumber(
                                item.pendingQuantity,
                              ).toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                              {toSafeNumber(
                                item.receivedQuantity ??
                                  item.quantity,
                              ).toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                              {acceptedQuantity.toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-red-600">
                              {toSafeNumber(
                                item.rejectedQuantity,
                              ).toLocaleString(
                                "en-BD",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {formatMoney(
                                unitCost,
                                record.currency ||
                                  "BDT",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {toSafeNumber(
                                item.taxRate,
                              )}
                              %
                            </td>

                            <td className="px-4 py-4 text-sm text-red-600">
                              {formatMoney(
                                item.discountAmount,
                                record.currency ||
                                  "BDT",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-bold text-slate-900">
                              {formatMoney(
                                item.lineTotal ??
                                  item.total ??
                                  calculatedLineTotal,
                                record.currency ||
                                  "BDT",
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {item.batchNumber ||
                                "—"}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatDate(
                                item.expiryDate,
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {item.remarks ||
                                "—"}
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

          <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Notes
              </h2>

              <div className="mt-4 min-h-40 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {record.notes ||
                  "No additional notes were provided."}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Receipt Summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatMoney(
                      totals.subtotal,
                      record.currency ||
                        "BDT",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Discount
                  </span>

                  <span className="font-semibold text-red-600">
                    -
                    {formatMoney(
                      totals.discount,
                      record.currency ||
                        "BDT",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Tax
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatMoney(
                      totals.tax,
                      record.currency ||
                        "BDT",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-4">
                  <span className="text-sm font-semibold text-white">
                    Total Receipt Value
                  </span>

                  <span className="text-lg font-black text-white">
                    {formatMoney(
                      totals.total,
                      record.currency ||
                        "BDT",
                    )}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden sm:p-6">
            <div className="flex flex-col justify-end gap-3 sm:flex-row">
              {purchaseOrderId ? (
                <Link
                  href={`/admin/supplier-and-purchase/purchase-orders/${purchaseOrderId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View Purchase Order
                </Link>
              ) : null}

              {supplierId ? (
                <Link
                  href={`/admin/supplier-and-purchase/suppliers/${supplierId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View Supplier
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}/inspection`,
                  )
                }
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold shadow-sm transition ${inspectionButtonClass}`}
              >
                {inspectionButtonText}
              </button>

              {canPostInventory ? (
                <Link
                  href={`/admin/supplier-and-purchase/inventory-posting/create?goodsReceivedId=${encodeURIComponent(
                    record._id,
                  )}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
                >
                  Create Inventory Posting
                </Link>
              ) : normalizedPostingStatus === "posted" ||
                normalizedPostingStatus === "partially posted" ||
                normalizedPostingStatus === "reversed" ? (
                <Link
                  href="/admin/supplier-and-purchase/inventory-posting"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  View Inventory Posting
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-6 text-sm font-bold text-slate-500"
                >
                  {inventoryButtonText}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}