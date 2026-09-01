"use client";

import Link from "next/link";
import { useTenant } from "@/src/context/TenantContext";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

const PAGE_SIZE = 20;

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

interface GoodsReceivedReference {
  _id?: string;
  id?: string;
  goodsReceivedNumber?: string;
  grnNumber?: string;
  receiptNumber?: string;
}

interface InventoryPostingQueueItem {
  _id?: string;
  id?: string;

  goodsReceivedId?: string;
  goodsReceived?: GoodsReceivedReference | string | null;

  goodsReceivedNumber?: string;
  grnNumber?: string;
  receiptNumber?: string;

  supplier?: EntityReference | string | null;
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
  warehouseName?: string;
  warehouseSnapshot?: {
    warehouseName?: string | null;
    warehouseCode?: string | null;
    address?: string | null;
  };

  status?: string;
  postingStatus?: string;
  inventoryPostingStatus?: string;
  inventoryPosting?: {
    status?: string;
    postedQuantity?: number;
    postedValue?: number;
    postingReference?: string | null;
    postedAt?: string | null;
  };

  receivingSummary?: {
    itemCount?: number;
    totalAcceptedQuantity?: number;
    totalReceivedQuantity?: number;
    totalRejectedQuantity?: number;
  };

  financialSummary?: {
    grandTotal?: number;
  };

  itemCount?: number;
  totalItems?: number;
  totalQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;

  currency?: string;
  totalValue?: number;
  inventoryValue?: number;

  createdAt?: string;
  updatedAt?: string;
}

interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface QueueApiResponse {
  success?: boolean;
  message?: string;
  data?:
    | InventoryPostingQueueItem[]
    | {
        queue?: InventoryPostingQueueItem[];
        pendingItems?: InventoryPostingQueueItem[];
        items?: InventoryPostingQueueItem[];
        results?: InventoryPostingQueueItem[];
        goodsReceived?: InventoryPostingQueueItem[];
        goodsReceipts?: InventoryPostingQueueItem[];
        pagination?: PaginationMeta;
        meta?: PaginationMeta;
      };
  queue?: InventoryPostingQueueItem[];
  pendingItems?: InventoryPostingQueueItem[];
  items?: InventoryPostingQueueItem[];
  results?: InventoryPostingQueueItem[];
  goodsReceipts?: InventoryPostingQueueItem[];
  pagination?: PaginationMeta;
  meta?: PaginationMeta;
  errors?: Array<{
    message?: string;
  }>;
}

interface ActionApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  errors?: Array<{
    message?: string;
  }>;
}

interface PreviewState {
  item: InventoryPostingQueueItem;
  data: unknown;
}

interface PostDialogState {
  item: InventoryPostingQueueItem;
  postingDate: string;
  remarks: string;
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
  tenantId?: string | null,
  {
    includeJson = false,
  }: {
    includeJson?: boolean;
  } = {},
): Headers => {
  const headers = new Headers();

  headers.set(
    "Accept",
    "application/json",
  );

  if (includeJson) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

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
  tenantId?: string | null,
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
      "Tenant context is missing. Please log out and sign in again.",
    );
  }

  return {
    token,
    tenantId,
  };
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const getTodayInputValue = (): string => {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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

const extractQueue = (
  result: QueueApiResponse,
): InventoryPostingQueueItem[] => {
  if (
    Array.isArray(result.data)
  ) {
    return result.data;
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    const data =
      result.data;

    return (
      data.goodsReceipts ||
      data.queue ||
      data.pendingItems ||
      data.items ||
      data.results ||
      data.goodsReceived ||
      []
    );
  }

  return (
    result.goodsReceipts ||
    result.queue ||
    result.pendingItems ||
    result.items ||
    result.results ||
    []
  );
};

const extractPagination = (
  result: QueueApiResponse,
): PaginationMeta => {
  if (
    result.data &&
    !Array.isArray(result.data) &&
    typeof result.data ===
      "object"
  ) {
    return (
      result.data.pagination ||
      result.data.meta ||
      result.pagination ||
      result.meta ||
      {}
    );
  }

  return (
    result.pagination ||
    result.meta ||
    {}
  );
};

const getGoodsReceivedId = (
  item: InventoryPostingQueueItem,
): string => {
  if (
    item.goodsReceived &&
    typeof item.goodsReceived ===
      "object"
  ) {
    return (
      item.goodsReceived._id ||
      item.goodsReceived.id ||
      item.goodsReceivedId ||
      ""
    );
  }

  if (
    typeof item.goodsReceived ===
      "string"
  ) {
    return item.goodsReceived;
  }

  return (
    item.goodsReceivedId ||
    item._id ||
    item.id ||
    ""
  );
};

const getGrnNumber = (
  item: InventoryPostingQueueItem,
): string => {
  if (
    item.goodsReceived &&
    typeof item.goodsReceived ===
      "object"
  ) {
    return (
      item.goodsReceived
        .goodsReceivedNumber ||
      item.goodsReceived
        .grnNumber ||
      item.goodsReceived
        .receiptNumber ||
      item.goodsReceivedNumber ||
      item.grnNumber ||
      item.receiptNumber ||
      "—"
    );
  }

  return (
    item.goodsReceivedNumber ||
    item.grnNumber ||
    item.receiptNumber ||
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

  return (
    fallback ||
    "—"
  );
};

const getPostingStatus = (
  item: InventoryPostingQueueItem,
): string =>
  item.inventoryPosting?.status ||
  item.postingStatus ||
  item.inventoryPostingStatus ||
  "Not Posted";

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
  const status =
    String(value || "")
      .toLowerCase()
      .trim();

  if (
    (
      status.includes("post") &&
      !status.includes("not posted")
    ) ||
    status.includes("complete") ||
    status.includes("success")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status.includes("fail") ||
    status.includes("reject") ||
    status.includes("cancel")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status.includes("process")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
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

const getPreviewItems = (
  previewData: unknown,
): Array<Record<string, unknown>> => {
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

  for (
    const candidate of candidates
  ) {
    if (
      Array.isArray(candidate)
    ) {
      return candidate.filter(
        (
          item,
        ): item is Record<
          string,
          unknown
        > =>
          Boolean(item) &&
          typeof item ===
            "object",
      );
    }
  }

  if (
    data.preview &&
    typeof data.preview ===
      "object"
  ) {
    return getPreviewItems(
      data.preview,
    );
  }

  return [];
};

const getPreviewSummary = (
  previewData: unknown,
): Record<string, unknown> => {
  if (
    !previewData ||
    typeof previewData !==
      "object"
  ) {
    return {};
  }

  const data =
    previewData as Record<
      string,
      unknown
    >;

  if (
    data.postingSummary &&
    typeof data.postingSummary ===
      "object"
  ) {
    return data.postingSummary as Record<
      string,
      unknown
    >;
  }

  if (
    data.summary &&
    typeof data.summary ===
      "object"
  ) {
    return data.summary as Record<
      string,
      unknown
    >;
  }

  return data;
};

const readString = (
  record: Record<
    string,
    unknown
  >,
  keys: string[],
): string => {
  for (const key of keys) {
    const value =
      record[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return "—";
};

const readNumber = (
  record: Record<
    string,
    unknown
  >,
  keys: string[],
): number => {
  for (const key of keys) {
    const value =
      Number(record[key]);

    if (
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return 0;
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

          <div className="flex flex-wrap items-center gap-3">
            {actions}

            <Link
              href="/admin/supplier-and-purchase"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Supplier &amp;
              Purchase
            </Link>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

function LoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

      <p className="mt-4 text-sm font-medium text-slate-600">
        {label}
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
        Unable to load data
      </h2>

      <p className="mt-2 text-sm text-red-700">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">
        No inventory posting records found
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        No pending or posted goods received records were returned for the
        selected tenant and filters.
      </p>

      <Link
        href="/admin/supplier-and-purchase/goods-received"
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
      >
        View Goods Received
      </Link>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function InventoryPostingPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const activeRequestRef =
    useRef<AbortController | null>(
      null,
    );

  const requestSequenceRef =
    useRef(0);

  const [
    items,
    setItems,
  ] = useState<
    InventoryPostingQueueItem[]
  >([]);

  const [
    pagination,
    setPagination,
  ] =
    useState<PaginationMeta>({});

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
    success,
    setSuccess,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    previewLoadingId,
    setPreviewLoadingId,
  ] = useState("");

  const [
    preview,
    setPreview,
  ] = useState<
    PreviewState | null
  >(null);

  const [
    postDialog,
    setPostDialog,
  ] = useState<
    PostDialogState | null
  >(null);

  const [
    postingId,
    setPostingId,
  ] = useState("");

  const loadQueue =
    useCallback(
      async ({
        silent = false,
      }: {
        silent?: boolean;
      } = {}) => {
        const requestId =
          requestSequenceRef.current + 1;

        requestSequenceRef.current =
          requestId;

        activeRequestRef.current?.abort();

        const controller =
          new AbortController();

        activeRequestRef.current =
          controller;

        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          ensureRequestContext(
            selectedTenantId,
          );

          const query =
            new URLSearchParams();

          query.set(
            "page",
            String(page),
          );

          query.set(
            "limit",
            String(PAGE_SIZE),
          );

          if (
            appliedSearch.trim()
          ) {
            query.set(
              "search",
              appliedSearch.trim(),
            );
          }

          if (status) {
            query.set(
              "status",
              status,
            );
          }

          const queueResponse =
            await fetch(
              `${API_URL}/api/goods-received-inventory-posting/queue?${query.toString()}`,
              {
                method: "GET",
                headers:
                  createHeaders(
                    selectedTenantId,
                  ),
                credentials:
                  "include",
                cache: "no-store",
                signal:
                  controller.signal,
              },
            );

          const queueResult =
            (await queueResponse
              .json()
              .catch(
                () => ({}),
              )) as QueueApiResponse;

          if (!queueResponse.ok) {
            throw new Error(
              getErrorMessage(
                queueResult,
                `Failed to load inventory posting queue (${queueResponse.status}).`,
              ),
            );
          }

          if (
            controller.signal.aborted ||
            requestSequenceRef.current !==
              requestId
          ) {
            return;
          }

          const queueItems =
            extractQueue(
              queueResult,
            );

          const goodsReceivedQuery =
            new URLSearchParams();

          goodsReceivedQuery.set(
            "page",
            String(page),
          );

          goodsReceivedQuery.set(
            "limit",
            String(PAGE_SIZE),
          );

          const allResponse =
            await fetch(
              `${API_URL}/api/goods-received?${goodsReceivedQuery.toString()}`,
              {
                method: "GET",
                headers:
                  createHeaders(
                    selectedTenantId,
                  ),
                credentials:
                  "include",
                cache: "no-store",
                signal:
                  controller.signal,
              },
            );

          const allResult =
            (await allResponse
              .json()
              .catch(
                () => ({}),
              )) as QueueApiResponse;

          if (
            controller.signal.aborted ||
            requestSequenceRef.current !==
              requestId
          ) {
            return;
          }

          if (!allResponse.ok) {
            setItems(queueItems);

            setPagination(
              extractPagination(
                queueResult,
              ),
            );
          } else {
            const allItems =
              extractQueue(
                allResult,
              );

            setItems(
              allItems.length > 0
                ? allItems
                : queueItems,
            );

            setPagination(
              extractPagination(
                allResult,
              ),
            );
          }
        } catch (
          requestError
        ) {
          if (
            requestError instanceof DOMException &&
            requestError.name === "AbortError"
          ) {
            return;
          }

          if (
            requestSequenceRef.current !==
            requestId
          ) {
            return;
          }

          setItems([]);
          setPagination({});

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load inventory posting queue.",
          );
        } finally {
          if (
            requestSequenceRef.current ===
              requestId &&
            !controller.signal.aborted
          ) {
            setLoading(false);
            setRefreshing(false);
          }

          if (
            activeRequestRef.current ===
            controller
          ) {
            activeRequestRef.current =
              null;
          }
        }
      },
      [
        appliedSearch,
        page,
        selectedTenantId,
        status,
      ],
    );

  useEffect(() => {
    activeRequestRef.current?.abort();

    setItems([]);
    setPagination({});
    setError("");
    setSuccess("");
    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setPage(1);
    setPreviewLoadingId("");
    setPreview(null);
    setPostDialog(null);
    setPostingId("");

    if (selectedTenantId) {
      void loadQueue();
    } else {
      setLoading(false);
      setRefreshing(false);
    }

    return () => {
      activeRequestRef.current?.abort();
    };
  }, [
    loadQueue,
    selectedTenantId,
  ]);

  const visibleItems =
    useMemo(() => {
      const normalizedSearch =
        appliedSearch
          .trim()
          .toLowerCase();

      const normalizedStatus =
        String(status || "")
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          if (normalizedSearch) {
            const searchableText = [
              getGrnNumber(item),
              getEntityName(
                item.supplier,
                item.supplierSnapshot
                  ?.businessName ||
                  item.supplierName,
              ),
              getEntityName(
                item.warehouse,
                item.warehouseSnapshot
                  ?.warehouseName ||
                  item.warehouseName,
              ),
              getPostingStatus(item),
            ]
              .join(" ")
              .toLowerCase();

            if (
              !searchableText.includes(
                normalizedSearch,
              )
            ) {
              return false;
            }
          }

          if (normalizedStatus) {
            return (
              String(
                getPostingStatus(item),
              )
                .trim()
                .toLowerCase() ===
              normalizedStatus
            );
          }

          return true;
        },
      );
    }, [
      appliedSearch,
      items,
      status,
    ]);

  const summary =
    useMemo(() => {
      const totalQuantity =
        visibleItems.reduce(
          (total, item) =>
            total +
            Number(
              item.receivingSummary
                ?.totalAcceptedQuantity ??
                item.totalQuantity ??
                item.acceptedQuantity ??
                0,
            ),
          0,
        );

      const totalValue =
        visibleItems.reduce(
          (total, item) =>
            total +
            Number(
              item.financialSummary
                ?.grandTotal ??
                item.inventoryPosting
                  ?.postedValue ??
                item.inventoryValue ??
                item.totalValue ??
                0,
            ),
          0,
        );

      const totalRecords =
        pagination.total ??
        items.length;

      return {
        totalRecords,
        visibleRecords:
          visibleItems.length,
        totalQuantity,
        totalValue,
      };
    }, [
      items.length,
      pagination.total,
      visibleItems,
    ]);

  const totalPages =
    Math.max(
      1,
      Number(
        pagination.totalPages ||
          Math.ceil(
            Number(
              pagination.total ||
                items.length,
            ) / PAGE_SIZE,
          ) ||
          1,
      ),
    );

  const currentPage =
    Number(
      pagination.page ||
        page,
    );

  const handleSearchSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setPage(1);
    setAppliedSearch(
      search.trim(),
    );
  };

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setPage(1);
  };

  const openPreview = async (
    item: InventoryPostingQueueItem,
  ) => {
    const goodsReceivedId =
      getGoodsReceivedId(item);

    if (!goodsReceivedId) {
      setError(
        "Goods received ID is unavailable for this queue record.",
      );

      return;
    }

    try {
      setPreviewLoadingId(
        goodsReceivedId,
      );
      setError("");
      setSuccess("");

      ensureRequestContext(selectedTenantId);

      const response =
        await fetch(
          `${API_URL}/api/goods-received-inventory-posting/${goodsReceivedId}/preview`,
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
          )) as ActionApiResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to load inventory posting preview (${response.status}).`,
          ),
        );
      }

      setPreview({
        item,
        data:
          result.data ?? result,
      });
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Failed to load inventory posting preview.",
      );
    } finally {
      setPreviewLoadingId("");
    }
  };

  const openPostDialog = (
    item: InventoryPostingQueueItem,
  ) => {
    const goodsReceivedId =
      getGoodsReceivedId(item);

    if (!goodsReceivedId) {
      setError(
        "Goods received ID is unavailable for this queue record.",
      );

      return;
    }

    setError("");
    setSuccess("");

    setPostDialog({
      item,
      postingDate:
        getTodayInputValue(),
      remarks: "",
    });
  };

  const submitPosting = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!postDialog) {
      return;
    }

    const goodsReceivedId =
      getGoodsReceivedId(
        postDialog.item,
      );

    if (!goodsReceivedId) {
      setError(
        "Goods received ID is unavailable for this queue record.",
      );

      return;
    }

    try {
      setPostingId(
        goodsReceivedId,
      );
      setError("");
      setSuccess("");

      ensureRequestContext(selectedTenantId);

      const payload = {
        postingDate:
          postDialog.postingDate
            ? new Date(
                `${postDialog.postingDate}T00:00:00`,
              ).toISOString()
            : undefined,

        remarks:
          postDialog.remarks
            .trim() ||
          undefined,
      };

      const response =
        await fetch(
          `${API_URL}/api/goods-received-inventory-posting/${goodsReceivedId}/post`,
          {
            method: "POST",

            headers:
              createHeaders(
                selectedTenantId,
                {
                  includeJson:
                    true,
                },
              ),

            credentials:
              "include",

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as ActionApiResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to post goods receipt to inventory (${response.status}).`,
          ),
        );
      }

      setSuccess(
        result.message ||
          `${getGrnNumber(
            postDialog.item,
          )} was posted to inventory successfully.`,
      );

      setPostDialog(null);
      setPreview(null);

      await loadQueue({
        silent: true,
      });
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Failed to post goods receipt to inventory.",
      );
    } finally {
      setPostingId("");
    }
  };

  const previewItems =
    preview
      ? getPreviewItems(
          preview.data,
        )
      : [];

  const previewSummary =
    preview
      ? getPreviewSummary(
          preview.data,
        )
      : {};

  return (
    <PageShell
      title="Inventory Posting"
      eyebrow="Inventory Control"
      description="Review pending and posted goods received records, preview stock movements, post approved quantities, and open completed posting details."
      actions={
        <button
          type="button"
          onClick={() =>
            void loadQueue({
              silent: true,
            })
          }
          disabled={
            refreshing ||
            loading
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh Records"}
        </button>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700"
        >
          {success}
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Records"
          value={
            summary.totalRecords
          }
          description="Pending and posted records for the selected tenant."
        />

        <SummaryCard
          label="Visible Records"
          value={
            summary.visibleRecords
          }
          description="Records displayed on this page."
        />

        <SummaryCard
          label="Visible Quantity"
          value={
            summary.totalQuantity.toLocaleString(
              "en-BD",
            )
          }
          description="Accepted or posting quantity in the visible records."
        />

        <SummaryCard
          label="Visible Value"
          value={formatMoney(
            summary.totalValue,
            items[0]?.currency ||
              "BDT",
          )}
          description="Estimated inventory value in the visible queue."
        />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={
            handleSearchSubmit
          }
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]"
        >
          <div>
            <label
              htmlFor="inventory-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Search Records
            </label>

            <input
              id="inventory-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search GRN, supplier or warehouse"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label
              htmlFor="posting-status"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Posting Status
            </label>

            <select
              id="posting-status"
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target
                    .value,
                );

                setPage(1);
              }}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">
                All Posting Statuses
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Processing">
                Processing
              </option>

              <option value="Posted">
                Posted
              </option>

              <option value="Failed">
                Failed
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="min-h-11 self-end rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Search
          </button>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="min-h-11 self-end rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </form>
      </section>

      {loading ? (
        <LoadingState label="Loading inventory posting records..." />
      ) : error &&
        items.length === 0 ? (
        <ErrorState
          message={error}
          onRetry={() =>
            void loadQueue()
          }
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {[
                    "Goods Received",
                    "Supplier",
                    "Warehouse",
                    "Quantity",
                    "Inventory Value",
                    "Posting Status",
                    "Created",
                    "Updated",
                    "Actions",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleItems.map(
                  (
                    item,
                    index,
                  ) => {
                    const goodsReceivedId =
                      getGoodsReceivedId(
                        item,
                      );

                    const itemStatus =
                      getPostingStatus(
                        item,
                      );

                    const isPosted =
                      String(itemStatus)
                        .trim()
                        .toLowerCase() ===
                      "posted";

                    return (
                      <tr
                        key={
                          item._id ||
                          item.id ||
                          goodsReceivedId ||
                          index
                        }
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {getGrnNumber(
                              item,
                            )}
                          </p>

                          {goodsReceivedId ? (
                            <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                              {
                                goodsReceivedId
                              }
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {getEntityName(
                            item.supplier,
                            item.supplierSnapshot
                              ?.businessName ||
                              item.supplierName,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {getEntityName(
                            item.warehouse,
                            item.warehouseSnapshot
                              ?.warehouseName ||
                              item.warehouseName,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                          {Number(
                            item.receivingSummary
                              ?.totalAcceptedQuantity ??
                              item.totalQuantity ??
                              item.acceptedQuantity ??
                              item.receivingSummary
                                ?.itemCount ??
                              item.itemCount ??
                              item.totalItems ??
                              0,
                          ).toLocaleString(
                            "en-BD",
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {formatMoney(
                            item.financialSummary
                              ?.grandTotal ??
                              item.inventoryPosting
                                ?.postedValue ??
                              item.inventoryValue ??
                              item.totalValue ??
                              0,
                            item.currency ||
                              "BDT",
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              itemStatus,
                            )}`}
                          >
                            {formatStatusLabel(
                              itemStatus,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            item.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            item.updatedAt,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void openPreview(
                                  item,
                                )
                              }
                              disabled={
                                !goodsReceivedId ||
                                previewLoadingId ===
                                  goodsReceivedId
                              }
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {previewLoadingId ===
                              goodsReceivedId
                                ? "Loading..."
                                : "Preview"}
                            </button>

                            {isPosted ? (
                              <Link
                                href={`/admin/supplier-and-purchase/inventory-posting/${goodsReceivedId}`}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                              >
                                View Posting
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openPostDialog(
                                    item,
                                  )
                                }
                                disabled={
                                  !goodsReceivedId ||
                                  postingId ===
                                    goodsReceivedId
                                }
                                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {postingId ===
                                goodsReceivedId
                                  ? "Posting..."
                                  : "Post Inventory"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-800">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {totalPages}
              </span>
              {pagination.total !==
              undefined
                ? ` · ${pagination.total} total record(s)`
                : ""}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                  )
                }
                disabled={
                  currentPage <=
                    1 ||
                  pagination.hasPreviousPage ===
                    false
                }
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.min(
                        totalPages,
                        current + 1,
                      ),
                  )
                }
                disabled={
                  currentPage >=
                    totalPages ||
                  pagination.hasNextPage ===
                    false
                }
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {preview ? (
        <Modal
          title={`Inventory Posting Preview — ${getGrnNumber(
            preview.item,
          )}`}
          description="Review the stock movement before posting it permanently."
          onClose={() =>
            setPreview(null)
          }
        >
          <div className="space-y-6 p-5 sm:p-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Status"
                value={formatStatusLabel(
                  readString(
                    previewSummary,
                    [
                      "status",
                      "postingStatus",
                    ],
                  ),
                )}
                description="Current posting status."
              />

              <SummaryCard
                label="Items"
                value={
                  previewItems.length ||
                  readNumber(
                    previewSummary,
                    [
                      "itemCount",
                      "totalItems",
                    ],
                  )
                }
                description="Inventory lines included in this posting."
              />

              <SummaryCard
                label="Quantity"
                value={readNumber(
                  previewSummary,
                  [
                    "totalQuantity",
                    "acceptedQuantity",
                    "postingQuantity",
                  ],
                ).toLocaleString(
                  "en-BD",
                )}
                description="Total quantity to be added into stock."
              />

              <SummaryCard
                label="Inventory Value"
                value={formatMoney(
                  readNumber(
                    previewSummary,
                    [
                      "totalPostingValue",
                      "inventoryValue",
                      "totalValue",
                      "postingValue",
                    ],
                  ),
                  readString(
                    previewSummary,
                    ["currency"],
                  ) === "—"
                    ? "BDT"
                    : readString(
                        previewSummary,
                        ["currency"],
                      ),
                )}
                description="Estimated value of the stock movement."
              />
            </section>

            {previewItems.length >
            0 ? (
              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Product",
                          "SKU",
                          "Quantity",
                          "Unit Cost",
                          "Line Value",
                          "Warehouse",
                        ].map(
                          (
                            heading,
                          ) => (
                            <th
                              key={
                                heading
                              }
                              className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                            >
                              {
                                heading
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {previewItems.map(
                        (
                          item,
                          index,
                        ) => {
                          const quantity =
                            readNumber(
                              item,
                              [
                                "postableQuantity",
                                "postingQuantity",
                                "acceptedQuantity",
                                "quantity",
                                "receivedQuantity",
                              ],
                            );

                          const unitCost =
                            readNumber(
                              item,
                              [
                                "unitCost",
                                "unitPrice",
                                "costPrice",
                              ],
                            );

                          const lineValue =
                            readNumber(
                              item,
                              [
                                "totalCost",
                                "lineValue",
                                "totalValue",
                                "inventoryValue",
                              ],
                            ) ||
                            quantity *
                              unitCost;

                          return (
                            <tr
                              key={
                                String(
                                  item._id ||
                                    item.id ||
                                    index,
                                )
                              }
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {(() => {
                                  const snapshot =
                                    item.productSnapshot;

                                  if (
                                    snapshot &&
                                    typeof snapshot ===
                                      "object" &&
                                    !Array.isArray(
                                      snapshot,
                                    )
                                  ) {
                                    const productName =
                                      (
                                        snapshot as Record<
                                          string,
                                          unknown
                                        >
                                      ).productName;

                                    if (
                                      typeof productName ===
                                        "string" &&
                                      productName.trim()
                                    ) {
                                      return productName;
                                    }
                                  }

                                  return readString(
                                    item,
                                    [
                                      "productName",
                                      "name",
                                      "itemName",
                                    ],
                                  );
                                })()}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-600">
                                {(() => {
                                  const snapshot =
                                    item.productSnapshot;

                                  if (
                                    snapshot &&
                                    typeof snapshot ===
                                      "object" &&
                                    !Array.isArray(
                                      snapshot,
                                    )
                                  ) {
                                    const sku =
                                      (
                                        snapshot as Record<
                                          string,
                                          unknown
                                        >
                                      ).sku;

                                    if (
                                      typeof sku ===
                                        "string" &&
                                      sku.trim()
                                    ) {
                                      return sku;
                                    }
                                  }

                                  return readString(
                                    item,
                                    [
                                      "sku",
                                      "productSku",
                                      "code",
                                    ],
                                  );
                                })()}
                              </td>

                              <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                                {quantity.toLocaleString(
                                  "en-BD",
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700">
                                {formatMoney(
                                  unitCost,
                                  readString(
                                    item,
                                    [
                                      "currency",
                                    ],
                                  ) ===
                                    "—"
                                    ? "BDT"
                                    : readString(
                                        item,
                                        [
                                          "currency",
                                        ],
                                      ),
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {formatMoney(
                                  lineValue,
                                  readString(
                                    item,
                                    [
                                      "currency",
                                    ],
                                  ) ===
                                    "—"
                                    ? "BDT"
                                    : readString(
                                        item,
                                        [
                                          "currency",
                                        ],
                                      ),
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-600">
                                {readString(
                                  item,
                                  [
                                    "warehouseName",
                                    "warehouse",
                                    "locationName",
                                  ],
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">
                  Preview loaded
                  successfully.
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The backend did not
                  return a recognized item
                  array, but the posting
                  can still be processed
                  through the confirmation
                  action.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setPreview(null)
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const selectedItem =
                    preview.item;

                  setPreview(null);

                  openPostDialog(
                    selectedItem,
                  );
                }}
                className="min-h-11 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Continue to Posting
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {postDialog ? (
        <Modal
          title={`Post Inventory — ${getGrnNumber(
            postDialog.item,
          )}`}
          description="This action will update inventory stock for the current tenant."
          onClose={() => {
            if (!postingId) {
              setPostDialog(null);
            }
          }}
        >
          <form
            onSubmit={
              submitPosting
            }
            className="space-y-5 p-5 sm:p-6"
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Confirm that the goods
              received inspection and
              accepted quantities are
              correct before posting.
            </div>

            <div>
              <label
                htmlFor="posting-date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Posting Date
              </label>

              <input
                id="posting-date"
                type="date"
                max={
                  getTodayInputValue()
                }
                value={
                  postDialog.postingDate
                }
                onChange={(event) =>
                  setPostDialog(
                    (
                      current,
                    ) =>
                      current
                        ? {
                            ...current,
                            postingDate:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
                disabled={
                  Boolean(
                    postingId,
                  )
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="posting-remarks"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Remarks
              </label>

              <textarea
                id="posting-remarks"
                rows={5}
                maxLength={2000}
                value={
                  postDialog.remarks
                }
                onChange={(event) =>
                  setPostDialog(
                    (
                      current,
                    ) =>
                      current
                        ? {
                            ...current,
                            remarks:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
                disabled={
                  Boolean(
                    postingId,
                  )
                }
                placeholder="Optional inventory posting remarks"
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  postDialog
                    .remarks.length
                }
                /2000
              </p>
            </div>

            <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setPostDialog(null)
                }
                disabled={
                  Boolean(
                    postingId,
                  )
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  Boolean(
                    postingId,
                  ) ||
                  !postDialog.postingDate
                }
                className="min-h-11 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {postingId
                  ? "Posting Inventory..."
                  : "Confirm and Post"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}