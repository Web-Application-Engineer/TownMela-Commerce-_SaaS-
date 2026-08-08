"use client";

import Link from "next/link";

import {
  useTenant,
} from "@/src/context/TenantContext";

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

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT_MS = 15000;

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

interface PurchaseOrderReference {
  _id?: string;
  id?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;
}

interface GoodsReceived {
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
  supplierName?: string;

  supplierSnapshot?: {
    supplierCode?: string;
    businessName?: string;
    displayName?: string;
  };

  warehouse?: EntityReference | string | null;
  warehouseName?: string;

  warehouseSnapshot?: {
    warehouseName?: string;
    code?: string;
  };

  receivedDate?: string;
  receivedAt?: string;
  deliveryDate?: string;

  itemCount?: number;
  totalItems?: number;
  totalQuantity?: number;
  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;

  currency?: string;
  totalAmount?: number;
  totalValue?: number;

  postingStatus?: string;
  inventoryPostingStatus?: string;
  inventoryPosting?: {
    status?: string;
  };

  inspectionStatus?: string;
  inspection?: {
    status?: string;
  };

  status?: string;

  receivingSummary?: {
    itemCount?: number;
    totalAcceptedQuantity?: number;
    totalReceivedQuantity?: number;
    totalRejectedQuantity?: number;
  };

  financialSummary?: {
    grandTotal?: number;
  };

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

interface GoodsReceivedApiResponse {
  success?: boolean;
  message?: string;

  data?:
    | GoodsReceived[]
    | {
        goodsReceived?: GoodsReceived[];
        goodsReceivedList?: GoodsReceived[];
        goodsReceipts?: GoodsReceived[];
        receipts?: GoodsReceived[];
        results?: GoodsReceived[];
        items?: GoodsReceived[];
        pagination?: PaginationMeta;
        meta?: PaginationMeta;
      };

  goodsReceived?: GoodsReceived[];
  goodsReceivedList?: GoodsReceived[];
  goodsReceipts?: GoodsReceived[];
  receipts?: GoodsReceived[];
  results?: GoodsReceived[];
  items?: GoodsReceived[];

  pagination?: PaginationMeta;
  meta?: PaginationMeta;

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
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (const key of keys) {
    const value =
      window.localStorage.getItem(
        key,
      );

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getAccessToken =
  (): string =>
    getStorageValue([
      "accessToken",
      "token",
      "authToken",
      "jwt",
      "townmelaAdminToken",
    ]);


const createHeaders =
  (
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

const readJsonSafely =
  async (
    response: Response,
  ): Promise<GoodsReceivedApiResponse> => {
    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json",
        )
    ) {
      return {};
    }

    return (await response
      .json()
      .catch(
        () => ({}),
      )) as GoodsReceivedApiResponse;
  };

const ensureRequestContext =
  (
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
    typeof result ===
      "object"
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

const extractRecords = (
  result: GoodsReceivedApiResponse,
): GoodsReceived[] => {
  if (
    Array.isArray(
      result.data,
    )
  ) {
    return result.data;
  }

  if (
    result.data &&
    typeof result.data ===
      "object"
  ) {
    return (
      result.data
        .goodsReceipts ||
      result.data
        .goodsReceived ||
      result.data
        .goodsReceivedList ||
      result.data.receipts ||
      result.data.results ||
      result.data.items ||
      []
    );
  }

  return (
    result.goodsReceipts ||
    result.goodsReceived ||
    result.goodsReceivedList ||
    result.receipts ||
    result.results ||
    result.items ||
    []
  );
};

const extractPagination = (
  result: GoodsReceivedApiResponse,
): PaginationMeta => {
  if (
    result.data &&
    !Array.isArray(
      result.data,
    ) &&
    typeof result.data ===
      "object"
  ) {
    return (
      result.data
        .pagination ||
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

const getGrnNumber = (
  record: GoodsReceived,
): string =>
  record.goodsReceivedNumber ||
  record.grnNumber ||
  record.receiptNumber ||
  "Goods Received";

const getPoNumber = (
  record: GoodsReceived,
): string => {
  if (
    record.purchaseOrder &&
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
    record.purchaseOrderNumber ||
    record.poNumber ||
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

  return fallback || "—";
};

const getSupplierName = (
  record: GoodsReceived,
): string =>
  record.supplierSnapshot
    ?.businessName ||
  record.supplierSnapshot
    ?.displayName ||
  getEntityName(
    record.supplier,
    record.supplierName,
  );

const getWarehouseName = (
  record: GoodsReceived,
): string =>
  record.warehouseSnapshot
    ?.warehouseName ||
  getEntityName(
    record.warehouse,
    record.warehouseName,
  );

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
        maximumFractionDigits:
          2,
      },
    ).format(
      Number(value || 0),
    );
  } catch {
    return `${currency} ${Number(
      value || 0,
    ).toLocaleString(
      "en-BD",
    )}`;
  }
};

const formatStatusLabel = (
  value?: string,
): string => {
  const normalized =
    String(
      value || "Pending",
    )
      .replace(
        /[_-]+/g,
        " ",
      )
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
    status.includes(
      "complete",
    ) ||
    status.includes(
      "approved",
    ) ||
    status.includes(
      "accepted",
    ) ||
    status.includes(
      "passed",
    ) ||
    (
      status.includes(
        "posted",
      ) &&
      !status.includes(
        "not posted",
      )
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status.includes(
      "reject",
    ) ||
    status.includes(
      "cancel",
    ) ||
    status.includes(
      "fail",
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status.includes(
      "process",
    ) ||
    status.includes(
      "inspect",
    )
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    status.includes(
      "partial",
    )
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getInspectionStatus = (
  record: GoodsReceived,
): string =>
  record.inspection?.status ||
  record.inspectionStatus ||
  "Not Required";

const getPostingStatus = (
  record: GoodsReceived,
): string =>
  record.inventoryPosting
    ?.status ||
  record.inventoryPostingStatus ||
  record.postingStatus ||
  "Not Posted";

const normalizeComparableStatus =
  (
    value?: string,
  ): string =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(
        /[_-]+/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      );

const getInspectionActionLabel =
  (
    record: GoodsReceived,
  ): string => {
    const status =
      normalizeComparableStatus(
        getInspectionStatus(
          record,
        ),
      );

    if (
      status ===
      "in progress"
    ) {
      return "Continue Inspection";
    }

    if (
      status === "passed" ||
      status ===
        "not required"
    ) {
      return "View Inspection";
    }

    if (
      status ===
        "partially passed" ||
      status === "failed"
    ) {
      return "Review Inspection";
    }

    return "Start Inspection";
  };

const canPostInventory = (
  record: GoodsReceived,
): boolean => {
  const receiptStatus =
    normalizeComparableStatus(
      record.status,
    );

  const inspectionStatus =
    normalizeComparableStatus(
      getInspectionStatus(
        record,
      ),
    );

  const postingStatus =
    normalizeComparableStatus(
      getPostingStatus(
        record,
      ),
    );

  const receiptIsPostable =
    [
      "accepted",
      "partially accepted",
      "completed",
    ].includes(
      receiptStatus,
    );

  const inspectionIsComplete =
    [
      "not required",
      "passed",
      "partially passed",
    ].includes(
      inspectionStatus,
    );

  const postingIsOpen =
    ![
      "posted",
      "reversed",
    ].includes(
      postingStatus,
    );

  return (
    receiptIsPostable &&
    inspectionIsComplete &&
    postingIsOpen
  );
};

const getItemCount = (
  record: GoodsReceived,
): number =>
  Number(
    record.receivingSummary
      ?.itemCount ??
      record.itemCount ??
      record.totalItems ??
      0,
  ) || 0;

const getReceivedQuantity = (
  record: GoodsReceived,
): number =>
  Number(
    record.receivingSummary
      ?.totalReceivedQuantity ??
      record.receivedQuantity ??
      record.totalQuantity ??
      0,
  ) || 0;

const getAcceptedQuantity = (
  record: GoodsReceived,
): number =>
  Number(
    record.receivingSummary
      ?.totalAcceptedQuantity ??
      record.acceptedQuantity ??
      record.receivingSummary
        ?.totalReceivedQuantity ??
      record.receivedQuantity ??
      record.totalQuantity ??
      0,
  ) || 0;

const getRejectedQuantity = (
  record: GoodsReceived,
): number =>
  Number(
    record.receivingSummary
      ?.totalRejectedQuantity ??
      record.rejectedQuantity ??
      0,
  ) || 0;

const getReceiptValue = (
  record: GoodsReceived,
): number =>
  Number(
    record.financialSummary
      ?.grandTotal ??
      record.totalValue ??
      record.totalAmount ??
      0,
  ) || 0;

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
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
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
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {eyebrow}
            </p>

            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {actions}

            <Link
              href="/admin/supplier-and-purchase"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
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
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black text-slate-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function LoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
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
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
      <h2 className="font-bold text-red-800">
        Unable to load data
      </h2>

      <p className="mt-2 break-words text-sm text-red-700">
        {message}
      </p>

      <button
        type="button"
        onClick={
          onRetry
        }
        className="mt-4 min-h-11 w-full rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 sm:w-auto"
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <h2 className="text-lg font-bold text-slate-800">
        No goods received
        records
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Create a goods received
        record against an approved
        purchase order to continue
        the receiving and inventory
        posting workflow.
      </p>

      <Link
        href="/admin/supplier-and-purchase/goods-received/create"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 sm:w-auto"
      >
        + Create Goods Received
      </Link>
    </div>
  );
}

function MobileInfo({
  label,
  value,
  description,
  valueClassName = "",
}: {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-semibold text-slate-800 ${valueClassName}`}
      >
        {value}
      </p>

      {description ? (
        <p className="mt-1 break-words text-xs text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function MobileStatus({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <span
        className={`inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-bold ${getStatusClassName(
          value,
        )}`}
      >
        <span className="truncate">
          {formatStatusLabel(
            value,
          )}
        </span>
      </span>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function GoodsReceivedPage() {
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
    records,
    setRecords,
  ] =
    useState<GoodsReceived[]>(
      [],
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<PaginationMeta>(
      {},
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
    inspectionStatus,
    setInspectionStatus,
  ] = useState("");

  const [
    postingStatus,
    setPostingStatus,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const loadRecords =
    useCallback(
      async ({
        silent = false,
      }: {
        silent?: boolean;
      } = {}) => {
        const requestId =
          requestSequenceRef.current +
          1;

        requestSequenceRef.current =
          requestId;

        activeRequestRef.current?.abort();

        const controller =
          new AbortController();

        activeRequestRef.current =
          controller;

        const timeoutId =
          window.setTimeout(
            () =>
              controller.abort(),
            REQUEST_TIMEOUT_MS,
          );

        try {
          if (silent) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(true);
          }

          setError("");

          ensureRequestContext(selectedTenantId);

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

          const response =
            await fetch(
              `${API_URL}/api/goods-received?${query.toString()}`,
              {
                method: "GET",
                headers:
                  createHeaders(selectedTenantId),
                credentials:
                  "include",
                cache:
                  "no-store",
                signal:
                  controller.signal,
              },
            );

          const result =
            await readJsonSafely(
              response,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              getErrorMessage(
                result,
                `Failed to load goods received records (${response.status} ${response.statusText || "Request Error"}).`,
              ),
            );
          }

          if (
            requestSequenceRef.current !==
            requestId
          ) {
            return;
          }

          setRecords(
            extractRecords(
              result,
            ),
          );

          setPagination(
            extractPagination(
              result,
            ),
          );
        } catch (
          requestError
        ) {
          if (
            requestSequenceRef.current !==
            requestId
          ) {
            return;
          }

          if (
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            setError(
              `The request took longer than ${
                REQUEST_TIMEOUT_MS /
                1000
              } seconds or was cancelled. Confirm that the backend is running at ${API_URL}, then try again.`,
            );
          } else {
            setError(
              requestError instanceof
                Error
                ? requestError.message
                : "Failed to load goods received records.",
            );
          }

          setRecords([]);
          setPagination({});
        } finally {
          window.clearTimeout(
            timeoutId,
          );

          if (
            requestSequenceRef.current ===
            requestId
          ) {
            setLoading(false);
            setRefreshing(
              false,
            );
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
      ],
    );

  useEffect(() => {
    activeRequestRef.current?.abort();

    setRecords([]);
    setPagination({});
    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setInspectionStatus("");
    setPostingStatus("");
    setPage(1);
    setError("");

    if (selectedTenantId) {
      void loadRecords();
    } else {
      setLoading(false);
    }

    return () => {
      activeRequestRef.current?.abort();
    };
  }, [
    loadRecords,
    selectedTenantId,
  ]);

  const filteredRecords =
    useMemo(() => {
      return records.filter(
        (record) => {
          const matchesStatus =
            !status ||
            normalizeComparableStatus(
              record.status,
            ) ===
              normalizeComparableStatus(
                status,
              );

          const matchesInspection =
            !inspectionStatus ||
            normalizeComparableStatus(
              getInspectionStatus(
                record,
              ),
            ) ===
              normalizeComparableStatus(
                inspectionStatus,
              );

          const matchesPosting =
            !postingStatus ||
            normalizeComparableStatus(
              getPostingStatus(
                record,
              ),
            ) ===
              normalizeComparableStatus(
                postingStatus,
              );

          return (
            matchesStatus &&
            matchesInspection &&
            matchesPosting
          );
        },
      );
    }, [
      records,
      status,
      inspectionStatus,
      postingStatus,
    ]);

  const summary =
    useMemo(() => {
      const totalRecords =
        pagination.total ??
        records.length;

      const acceptedQuantity =
        filteredRecords.reduce(
          (
            total,
            record,
          ) =>
            total +
            getAcceptedQuantity(
              record,
            ),
          0,
        );

      const rejectedQuantity =
        filteredRecords.reduce(
          (
            total,
            record,
          ) =>
            total +
            getRejectedQuantity(
              record,
            ),
          0,
        );

      const totalValue =
        filteredRecords.reduce(
          (
            total,
            record,
          ) =>
            total +
            getReceiptValue(
              record,
            ),
          0,
        );

      return {
        totalRecords,
        acceptedQuantity,
        rejectedQuantity,
        totalValue,
      };
    }, [
      pagination.total,
      records.length,
      filteredRecords,
    ]);

  const currentPage =
    Number(
      pagination.page ||
        page,
    );

  const totalPages =
    Math.max(
      1,
      Number(
        pagination.totalPages ||
          Math.ceil(
            Number(
              pagination.total ||
                records.length,
            ) / PAGE_SIZE,
          ) ||
          1,
      ),
    );

  const handleSearch = (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextSearch =
      search.trim();

    if (
      page === 1 &&
      appliedSearch ===
        nextSearch
    ) {
      void loadRecords();
      return;
    }

    setPage(1);
    setAppliedSearch(
      nextSearch,
    );
  };

  const clearFilters = () => {
    const shouldReload =
      page === 1 &&
      appliedSearch === "";

    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setInspectionStatus("");
    setPostingStatus("");
    setPage(1);
    setError("");

    if (shouldReload) {
      void loadRecords();
    }
  };

  return (
    <PageShell
      title="Goods Received"
      eyebrow="Receiving"
      description="Create and review tenant-specific goods receipts against approved purchase orders, including inspection quantities and inventory posting progress."
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              void loadRecords({
                silent: true,
              })
            }
            disabled={
              refreshing ||
              loading
            }
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <Link
            href="/admin/supplier-and-purchase/goods-received/create"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 sm:w-auto"
          >
            + Create Goods Received
          </Link>
        </>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 break-words rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 sm:px-5"
        >
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Total Records"
          value={
            summary.totalRecords
          }
          description="Goods receipts for the selected tenant."
        />

        <SummaryCard
          label="Accepted Quantity"
          value={summary.acceptedQuantity.toLocaleString(
            "en-BD",
          )}
          description="Accepted or received quantity on this page."
        />

        <SummaryCard
          label="Rejected Quantity"
          value={summary.rejectedQuantity.toLocaleString(
            "en-BD",
          )}
          description="Rejected quantity on this page."
        />

        <SummaryCard
          label="Receipt Value"
          value={formatMoney(
            summary.totalValue,
            records[0]
              ?.currency ||
              "BDT",
          )}
          description="Total receipt value on this page."
        />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          onSubmit={
            handleSearch
          }
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_190px_180px_auto_auto]"
        >
          <div className="sm:col-span-2 xl:col-span-1">
            <label
              htmlFor="goods-received-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Search
            </label>

            <input
              id="goods-received-search"
              type="search"
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search GRN, PO, supplier or warehouse"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <FilterSelect
            id="record-status"
            label="Status"
            value={status}
            onChange={
              setStatus
            }
            options={[
              ["", "All Statuses"],
              [
                "Draft",
                "Draft",
              ],
              [
                "Received",
                "Received",
              ],
              [
                "Under Inspection",
                "Under Inspection",
              ],
              [
                "Accepted",
                "Accepted",
              ],
              [
                "Partially Accepted",
                "Partially Accepted",
              ],
              [
                "Rejected",
                "Rejected",
              ],
              [
                "Completed",
                "Completed",
              ],
              [
                "Cancelled",
                "Cancelled",
              ],
            ]}
          />

          <FilterSelect
            id="inspection-status"
            label="Inspection"
            value={
              inspectionStatus
            }
            onChange={
              setInspectionStatus
            }
            options={[
              [
                "",
                "All Inspections",
              ],
              [
                "Pending",
                "Pending",
              ],
              [
                "In Progress",
                "In Progress",
              ],
              [
                "Not Required",
                "Not Required",
              ],
              [
                "Passed",
                "Passed",
              ],
              [
                "Partially Passed",
                "Partially Passed",
              ],
              [
                "Failed",
                "Failed",
              ],
            ]}
          />

          <FilterSelect
            id="posting-status"
            label="Posting"
            value={
              postingStatus
            }
            onChange={
              setPostingStatus
            }
            options={[
              [
                "",
                "All Posting Statuses",
              ],
              [
                "Not Posted",
                "Not Posted",
              ],
              [
                "Partially Posted",
                "Partially Posted",
              ],
              [
                "Posted",
                "Posted",
              ],
              [
                "Failed",
                "Failed",
              ],
              [
                "Reversed",
                "Reversed",
              ],
            ]}
          />

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
        <LoadingState label="Loading goods received records..." />
      ) : error &&
        records.length ===
          0 ? (
        <ErrorState
          message={error}
          onRetry={() =>
            void loadRecords()
          }
        />
      ) : records.length ===
          0 &&
        !appliedSearch ? (
        <EmptyState />
      ) : filteredRecords.length ===
        0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h2 className="text-lg font-bold text-slate-800">
            No matching goods
            received records
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            No records on this page
            match the selected search,
            status, inspection, and
            posting filters. Clear or
            change the filters to
            continue.
          </p>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Goods Received
                Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing{" "}
                {
                  filteredRecords.length
                }{" "}
                record(s) on this page.
              </p>
            </div>

            <p className="text-xs font-semibold text-slate-400">
              Page {currentPage} of{" "}
              {totalPages}
            </p>
          </div>

          {/* =================================================
              MOBILE CARD VIEW
          ================================================= */}

          <div className="space-y-4 p-3 md:hidden">
            {filteredRecords.map(
              (record) => {
                const recordId =
                  record._id ||
                  record.id ||
                  "";

                const inspection =
                  getInspectionStatus(
                    record,
                  );

                const posting =
                  getPostingStatus(
                    record,
                  );

                const postingAllowed =
                  canPostInventory(
                    record,
                  );

                return (
                  <article
                    key={
                      recordId
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/70 p-4">
                      {recordId ? (
                        <Link
                          href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                            recordId,
                          )}`}
                          className="block break-words text-sm font-black text-orange-600 hover:underline"
                        >
                          {getGrnNumber(
                            record,
                          )}
                        </Link>
                      ) : (
                        <p className="break-words text-sm font-black text-slate-900">
                          {getGrnNumber(
                            record,
                          )}
                        </p>
                      )}

                      {recordId ? (
                        <p className="mt-1 break-all text-[11px] text-slate-400">
                          {recordId}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <MobileInfo
                        label="Received Date"
                        value={formatDate(
                          record.receivedDate ||
                            record.receivedAt ||
                            record.deliveryDate ||
                            record.createdAt,
                        )}
                      />

                      <MobileInfo
                        label="Purchase Order"
                        value={getPoNumber(
                          record,
                        )}
                      />

                      <MobileInfo
                        label="Supplier"
                        value={getSupplierName(
                          record,
                        )}
                        description={
                          record.supplierSnapshot
                            ?.supplierCode
                        }
                      />

                      <MobileInfo
                        label="Warehouse"
                        value={getWarehouseName(
                          record,
                        )}
                      />

                      <MobileInfo
                        label="Items"
                        value={getItemCount(
                          record,
                        ).toLocaleString(
                          "en-BD",
                        )}
                      />

                      <MobileInfo
                        label="Received"
                        value={getReceivedQuantity(
                          record,
                        ).toLocaleString(
                          "en-BD",
                        )}
                      />

                      <MobileInfo
                        label="Accepted"
                        value={getAcceptedQuantity(
                          record,
                        ).toLocaleString(
                          "en-BD",
                        )}
                        valueClassName="text-emerald-700"
                      />

                      <MobileInfo
                        label="Rejected"
                        value={getRejectedQuantity(
                          record,
                        ).toLocaleString(
                          "en-BD",
                        )}
                        valueClassName="text-red-600"
                      />

                      <div className="sm:col-span-2">
                        <MobileInfo
                          label="Receipt Value"
                          value={formatMoney(
                            getReceiptValue(
                              record,
                            ),
                            record.currency ||
                              "BDT",
                          )}
                          valueClassName="font-black text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-3">
                      <MobileStatus
                        label="Receipt Status"
                        value={
                          record.status ||
                          "Received"
                        }
                      />

                      <MobileStatus
                        label="Inspection"
                        value={
                          inspection
                        }
                      />

                      <MobileStatus
                        label="Inventory Posting"
                        value={
                          posting
                        }
                      />
                    </div>

                    <div className="grid gap-2 border-t border-slate-100 bg-slate-50/40 p-4">
                      {recordId ? (
                        <>
                          <Link
                            href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                              recordId,
                            )}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                          >
                            View Details
                          </Link>

                          <Link
                            href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                              recordId,
                            )}/inspection`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-center text-sm font-bold text-orange-700 transition hover:bg-orange-100"
                          >
                            {getInspectionActionLabel(
                              record,
                            )}
                          </Link>

                          {postingAllowed ? (
                            <Link
                              href={`/admin/supplier-and-purchase/inventory-posting/create?goodsReceivedId=${encodeURIComponent(
                                recordId,
                              )}`}
                              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-4 text-center text-sm font-bold text-white transition hover:bg-orange-700"
                            >
                              Post Inventory
                            </Link>
                          ) : normalizeComparableStatus(
                              posting,
                            ) ===
                            "posted" ? (
                            <Link
                              href="/admin/supplier-and-purchase/inventory-posting"
                              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-center text-sm font-bold text-white transition hover:bg-emerald-700"
                            >
                              View Posting
                            </Link>
                          ) : (
                            <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-center text-sm font-bold text-slate-400">
                              Inventory Posting
                              Not Available
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-center text-sm font-bold text-slate-400">
                          Actions Unavailable
                        </span>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>

          {/* =================================================
              TABLET / LAPTOP / DESKTOP TABLE
          ================================================= */}

          <div className="hidden w-full overflow-x-auto overscroll-x-contain md:block">
            <table className="w-full min-w-[1450px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {[
                    "GRN",
                    "Purchase Order",
                    "Supplier",
                    "Warehouse",
                    "Received Date",
                    "Accepted",
                    "Rejected",
                    "Receipt Value",
                    "Inspection",
                    "Posting",
                    "Status",
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
                {filteredRecords.map(
                  (record) => {
                    const recordId =
                      record._id ||
                      record.id ||
                      "";

                    const inspection =
                      getInspectionStatus(
                        record,
                      );

                    const posting =
                      getPostingStatus(
                        record,
                      );

                    return (
                      <tr
                        key={
                          recordId
                        }
                        className="align-top transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          {recordId ? (
                            <Link
                              href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                                recordId,
                              )}`}
                              className="font-bold text-orange-600 hover:underline"
                            >
                              {getGrnNumber(
                                record,
                              )}
                            </Link>
                          ) : (
                            <p className="font-bold text-slate-900">
                              {getGrnNumber(
                                record,
                              )}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-slate-400">
                            {getItemCount(
                              record,
                            ).toLocaleString(
                              "en-BD",
                            )}{" "}
                            item(s)
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {getPoNumber(
                            record,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {getSupplierName(
                              record,
                            )}
                          </p>

                          {record.supplierSnapshot
                            ?.supplierCode ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                record
                                  .supplierSnapshot
                                  .supplierCode
                              }
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {getWarehouseName(
                            record,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            record.receivedDate ||
                              record.receivedAt ||
                              record.deliveryDate ||
                              record.createdAt,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                          {getAcceptedQuantity(
                            record,
                          ).toLocaleString(
                            "en-BD",
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-red-600">
                          {getRejectedQuantity(
                            record,
                          ).toLocaleString(
                            "en-BD",
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {formatMoney(
                            getReceiptValue(
                              record,
                            ),
                            record.currency ||
                              "BDT",
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              inspection,
                            )}`}
                          >
                            {formatStatusLabel(
                              inspection,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              posting,
                            )}`}
                          >
                            {formatStatusLabel(
                              posting,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              record.status,
                            )}`}
                          >
                            {formatStatusLabel(
                              record.status ||
                                "Received",
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="grid min-w-[145px] gap-2">
                            {recordId ? (
                              <>
                                <Link
                                  href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                                    recordId,
                                  )}`}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                >
                                  View Details
                                </Link>

                                <Link
                                  href={`/admin/supplier-and-purchase/goods-received/${encodeURIComponent(
                                    recordId,
                                  )}/inspection`}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 text-center text-xs font-bold text-orange-700 transition hover:bg-orange-100"
                                >
                                  {getInspectionActionLabel(
                                    record,
                                  )}
                                </Link>

                                {canPostInventory(
                                  record,
                                ) ? (
                                  <Link
                                    href={`/admin/supplier-and-purchase/inventory-posting/create?goodsReceivedId=${encodeURIComponent(
                                      recordId,
                                    )}`}
                                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-orange-600 px-3 text-center text-xs font-bold text-white transition hover:bg-orange-700"
                                  >
                                    Post Inventory
                                  </Link>
                                ) : normalizeComparableStatus(
                                    posting,
                                  ) ===
                                  "posted" ? (
                                  <Link
                                    href="/admin/supplier-and-purchase/inventory-posting"
                                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-center text-xs font-bold text-white transition hover:bg-emerald-700"
                                  >
                                    View Posting
                                  </Link>
                                ) : (
                                  <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-xs font-bold text-slate-400">
                                    Not Available
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-400">
                                Unavailable
                              </span>
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

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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

            <div className="grid grid-cols-2 gap-2 sm:flex">
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
    </PageShell>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: Array<
    [string, string]
  >;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
      >
        {options.map(
          ([
            optionValue,
            optionLabel,
          ]) => (
            <option
              key={
                `${id}-${optionValue || "all"}`
              }
              value={
                optionValue
              }
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
