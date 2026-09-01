"use client";

import Link from "next/link";
import { useTenant } from "@/src/context/TenantContext";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

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

interface Supplier {
  _id?: string;
  id?: string;
  displayName?: string;
  businessName?: string;
  name?: string;
  supplierName?: string;
  code?: string;
  supplierCode?: string;
  supplierType?: string;
  email?: string;
  phone?: string;
  currency?: string;
  status?: string;
  isDeleted?: boolean;
}

interface PurchaseOrder {
  _id?: string;
  id?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
  status?: string;
}

interface GoodsReceived {
  _id?: string;
  id?: string;
  goodsReceivedNumber?: string;
  grnNumber?: string;
  receiptNumber?: string;
  status?: string;
}

interface VendorInvoiceItem {
  _id?: string;
  id?: string;
  product?: {
    _id?: string;
    name?: string;
    productName?: string;
    sku?: string;
  } | string | null;

  productName?: string;
  description?: string;
  sku?: string;

  quantity?: number;
  invoiceQuantity?: number;
  invoicedQuantity?: number;

  unitPrice?: number;
  price?: number;

  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;

  subtotal?: number;
  lineTotal?: number;
  totalAmount?: number;
}

interface MatchingResult {
  status?: string;
  matched?: boolean;
  purchaseOrderMatched?: boolean;
  goodsReceivedMatched?: boolean;
  priceMatched?: boolean;
  quantityMatched?: boolean;
  varianceAmount?: number;
  quantityVariance?: number;
  priceVariance?: number;
  message?: string;
  matchedAt?: string;
}

interface VendorInvoice {
  _id?: string;
  id?: string;

  invoiceNumber?: string;
  vendorInvoiceNumber?: string;
  supplierInvoiceNumber?: string;

  supplier?: Supplier | string | null;
  supplierName?: string;

  purchaseOrder?:
    | PurchaseOrder
    | string
    | null;

  purchaseOrderNumber?: string;
  poNumber?: string;

  goodsReceived?:
    | GoodsReceived
    | string
    | null;

  goodsReceivedNumber?: string;
  grnNumber?: string;

  invoiceDate?: string;
  dueDate?: string;

  currency?: string;

  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  totalAmount?: number;

  paidAmount?: number;
  outstandingAmount?: number;
  balanceDue?: number;

  status?: string;
  matchingStatus?: string;
  paymentStatus?: string;

  notes?: string;
  internalNotes?: string;

  items?: VendorInvoiceItem[];
  matchingResult?: MatchingResult;

  createdAt?: string;
  updatedAt?: string;

  createdBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string | null;

  updatedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string | null;

  deletedAt?: string | null;
  isDeleted?: boolean;
}

interface FinancialTotals {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paid: number;
  outstanding: number;
}

interface CalculatedItemTotals {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

interface ApiResponse {
  success?: boolean;
  message?: string;

  data?:
    | VendorInvoice
    | {
        vendorInvoice?: VendorInvoice;
        invoice?: VendorInvoice;
      };

  vendorInvoice?: VendorInvoice;
  invoice?: VendorInvoice;

  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

/* =========================================================
   HELPERS
========================================================= */

const getStorageValue = (
  keys: string[]
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
        key
      );

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
};

const getAccessToken = (): string =>
  getStorageValue([
    "townmelaAdminToken",
    "accessToken",
    "token",
    "authToken",
    "jwt",
  ]);

const createHeaders = (
  tenantId?: string | null,
  includeContentType = false
): Headers => {
  const headers =
    new Headers();

  headers.set(
    "Accept",
    "application/json"
  );

  if (includeContentType) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const token =
    getAccessToken();

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

const extractInvoice = (
  result: ApiResponse
): VendorInvoice | null => {
  if (
    result.data &&
    typeof result.data ===
      "object" &&
    !Array.isArray(result.data)
  ) {
    if (
      "vendorInvoice" in
        result.data &&
      result.data.vendorInvoice
    ) {
      return result.data
        .vendorInvoice;
    }

    if (
      "invoice" in
        result.data &&
      result.data.invoice
    ) {
      return result.data.invoice;
    }

    if (
      "_id" in result.data ||
      "invoiceNumber" in
        result.data ||
      "supplierInvoiceNumber" in
        result.data
    ) {
      return result.data as VendorInvoice;
    }
  }

  return (
    result.vendorInvoice ||
    result.invoice ||
    null
  );
};

const getErrorMessage = (
  result: ApiResponse,
  fallback: string
): string => {
  if (
    Array.isArray(
      result.errors
    ) &&
    result.errors.length
  ) {
    const messages =
      result.errors
        .map(
          (item) =>
            item.message
        )
        .filter(Boolean);

    if (messages.length) {
      return messages.join(", ");
    }
  }

  return (
    result.message ||
    fallback
  );
};

const formatDate = (
  value?: string
): string => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
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
    }
  ).format(date);
};

const formatDateTime = (
  value?: string
): string => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
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
    }
  ).format(date);
};

const formatMoney = (
  amount: number,
  currency = "BDT"
): string => {
  try {
    return new Intl.NumberFormat(
      "en-BD",
      {
        style: "currency",
        currency:
          currency || "BDT",
        maximumFractionDigits: 2,
      }
    ).format(
      Number(amount || 0)
    );
  } catch {
    return `৳${Number(
      amount || 0
    ).toLocaleString("en-BD")}`;
  }
};

const normalizeStatus = (
  status?: string
): string =>
  String(
    status || "draft"
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const statusLabel = (
  status?: string
): string =>
  normalizeStatus(status)
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");

const statusClassName = (
  status?: string
): string => {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
    case "matched":
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "pending":
    case "pending_approval":
    case "partially_paid":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "overdue":
    case "rejected":
    case "failed":
    case "mismatch":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
    case "deleted":
      return "border-slate-300 bg-slate-100 text-slate-600";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
};

const getInvoiceNumber = (
  invoice: VendorInvoice
): string =>
  invoice.invoiceNumber ||
  invoice.vendorInvoiceNumber ||
  invoice.supplierInvoiceNumber ||
  "Vendor Invoice";

const getSupplierName = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.supplier &&
    typeof invoice.supplier ===
      "object"
  ) {
    return (
      invoice.supplier.displayName ||
      invoice.supplier.businessName ||
      invoice.supplier.name ||
      invoice.supplier
        .supplierName ||
      "—"
    );
  }

  return (
    invoice.supplierName ||
    "—"
  );
};

const getPurchaseOrderNumber = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.purchaseOrder &&
    typeof invoice.purchaseOrder ===
      "object"
  ) {
    return (
      invoice.purchaseOrder
        .purchaseOrderNumber ||
      invoice.purchaseOrder
        .poNumber ||
      "—"
    );
  }

  return (
    invoice.purchaseOrderNumber ||
    invoice.poNumber ||
    "—"
  );
};

const getPurchaseOrderId = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.purchaseOrder &&
    typeof invoice.purchaseOrder ===
      "object"
  ) {
    return (
      invoice.purchaseOrder._id ||
      invoice.purchaseOrder.id ||
      ""
    );
  }

  return typeof invoice.purchaseOrder ===
    "string"
    ? invoice.purchaseOrder
    : "";
};

const getGoodsReceivedNumber = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.goodsReceived &&
    typeof invoice.goodsReceived ===
      "object"
  ) {
    return (
      invoice.goodsReceived
        .goodsReceivedNumber ||
      invoice.goodsReceived
        .grnNumber ||
      invoice.goodsReceived
        .receiptNumber ||
      "—"
    );
  }

  return (
    invoice.goodsReceivedNumber ||
    invoice.grnNumber ||
    "—"
  );
};

const getGoodsReceivedId = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.goodsReceived &&
    typeof invoice.goodsReceived ===
      "object"
  ) {
    return (
      invoice.goodsReceived._id ||
      invoice.goodsReceived.id ||
      ""
    );
  }

  return typeof invoice.goodsReceived ===
    "string"
    ? invoice.goodsReceived
    : "";
};

const getProductName = (
  item: VendorInvoiceItem
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.name ||
      item.product
        .productName ||
      item.productName ||
      "—"
    );
  }

  return (
    item.productName ||
    item.description ||
    "—"
  );
};

const getQuantity = (
  item: VendorInvoiceItem
): number =>
  Number(
    item.invoiceQuantity ??
      item.invoicedQuantity ??
      item.quantity ??
      0
  );

const getUnitPrice = (
  item: VendorInvoiceItem
): number =>
  Number(
    item.unitPrice ??
      item.price ??
      0
  );

const getItemSubtotal = (
  item: VendorInvoiceItem
): number =>
  Number(
    item.subtotal ??
      getQuantity(item) *
        getUnitPrice(item)
  );

const getItemTotal = (
  item: VendorInvoiceItem
): number => {
  if (
    item.lineTotal !==
    undefined
  ) {
    return Number(
      item.lineTotal
    );
  }

  if (
    item.totalAmount !==
    undefined
  ) {
    return Number(
      item.totalAmount
    );
  }

  const subtotal =
    getItemSubtotal(item);

  const discount =
    Number(
      item.discountAmount ||
        0
    );

  const taxable =
    Math.max(
      0,
      subtotal - discount
    );

  const taxAmount =
    item.taxAmount !==
    undefined
      ? Number(
          item.taxAmount
        )
      : taxable *
        (Number(
          item.taxRate || 0
        ) /
          100);

  return (
    taxable + taxAmount
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function VendorInvoiceDetailsPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const activeRequestRef =
    useRef<AbortController | null>(
      null
    );

  const params =
    useParams<{
      vendorInvoiceId: string;
    }>();

  const router =
    useRouter();

  const vendorInvoiceId =
    Array.isArray(
      params.vendorInvoiceId
    )
      ? params.vendorInvoiceId[0]
      : params.vendorInvoiceId;

  const [
    invoice,
    setInvoice,
  ] =
    useState<VendorInvoice | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadInvoice =
    useCallback(
      async () => {
        if (
          !vendorInvoiceId
        ) {
          setInvoice(null);
          setError(
            "Vendor invoice ID is missing."
          );
          setLoading(false);
          return;
        }

        if (
          !selectedTenantId
        ) {
          setInvoice(null);
          setError(
            "Please select a tenant before continuing."
          );
          setLoading(false);
          return;
        }

        activeRequestRef.current?.abort();

        const controller =
          new AbortController();

        activeRequestRef.current =
          controller;

        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `${API_URL}/api/vendor-invoices/${vendorInvoiceId}`,
              {
                method: "GET",
                headers:
                  createHeaders(
                    selectedTenantId
                  ),
                credentials:
                  "include",
                cache:
                  "no-store",
                signal:
                  controller.signal,
              }
            );

          const result =
            (await response
              .json()
              .catch(
                () => ({})
              )) as ApiResponse;

          if (
            controller.signal.aborted
          ) {
            return;
          }

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                result,
                `Failed to load vendor invoice (${response.status}).`
              )
            );
          }

          const loadedInvoice =
            extractInvoice(
              result
            );

          if (!loadedInvoice) {
            throw new Error(
              "Vendor invoice was not found in the server response."
            );
          }

          setInvoice(
            loadedInvoice
          );
        } catch (
          requestError
        ) {
          if (
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            return;
          }

          setInvoice(null);

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load vendor invoice."
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setLoading(false);
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
        selectedTenantId,
        vendorInvoiceId,
      ]
    );

  useEffect(() => {
    activeRequestRef.current?.abort();

    setInvoice(null);
    setError("");
    setSuccessMessage("");
    setActionLoading("");

    if (
      selectedTenantId &&
      vendorInvoiceId
    ) {
      void loadInvoice();
    } else {
      setLoading(false);
    }

    return () => {
      activeRequestRef.current?.abort();
    };
  }, [
    loadInvoice,
    selectedTenantId,
    vendorInvoiceId,
  ]);

  const performAction =
    async ({
      actionName,
      endpoint,
      method,
      body,
      successMessage:
        actionSuccessMessage,
      redirectAfterSuccess = false,
    }: {
      actionName: string;
      endpoint: string;
      method:
        | "POST"
        | "PATCH"
        | "DELETE";
      body?: Record<
        string,
        unknown
      >;
      successMessage: string;
      redirectAfterSuccess?: boolean;
    }) => {
      try {
        if (
          !selectedTenantId
        ) {
          throw new Error(
            "Please select a tenant before continuing."
          );
        }

        setActionLoading(
          actionName
        );

        setError("");
        setSuccessMessage("");

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              method,
              headers:
                createHeaders(
                  selectedTenantId,
                  Boolean(body)
                ),
              credentials:
                "include",
              body: body
                ? JSON.stringify(
                    body
                  )
                : undefined,
            }
          );

        const result =
          (await response
            .json()
            .catch(
              () => ({})
            )) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              result,
              `Request failed (${response.status}).`
            )
          );
        }

        setSuccessMessage(
          actionSuccessMessage
        );

        if (
          redirectAfterSuccess
        ) {
          window.setTimeout(
            () => {
              router.push(
                "/admin/supplier-and-purchase/vendor-invoices"
              );

              router.refresh();
            },
            500
          );

          return;
        }

        const updatedInvoice =
          extractInvoice(
            result
          );

        if (updatedInvoice) {
          setInvoice(
            updatedInvoice
          );
        } else {
          await loadInvoice();
        }
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "The requested action failed."
        );
      } finally {
        setActionLoading("");
      }
    };

  const handleMatch = async () => {
    if (!invoice) {
      return;
    }

    const confirmed =
      window.confirm(
        "Run three-way matching for this vendor invoice?"
      );

    if (!confirmed) {
      return;
    }

    await performAction({
      actionName: "match",
      endpoint:
        `/api/vendor-invoices/${vendorInvoiceId}/match`,
      method: "POST",
      successMessage:
        "Three-way matching completed successfully.",
    });
  };

  const handleStatusUpdate =
    async (
      status: string
    ) => {
      const confirmed =
        window.confirm(
          `Change invoice status to "${statusLabel(
            status
          )}"?`
        );

      if (!confirmed) {
        return;
      }

      await performAction({
        actionName:
          `status-${status}`,
        endpoint:
          `/api/vendor-invoices/${vendorInvoiceId}/status`,
        method: "PATCH",
        body: {
          status,
        },
        successMessage:
          `Invoice status changed to ${statusLabel(
            status
          )}.`,
      });
    };

  const handleDelete =
    async () => {
      const confirmed =
        window.confirm(
          "Delete this vendor invoice? This action may soft-delete the record."
        );

      if (!confirmed) {
        return;
      }

      await performAction({
        actionName: "delete",
        endpoint:
          `/api/vendor-invoices/${vendorInvoiceId}`,
        method: "DELETE",
        successMessage:
          "Vendor invoice deleted successfully.",
        redirectAfterSuccess:
          true,
      });
    };

  const handleRestore =
    async () => {
      const confirmed =
        window.confirm(
          "Restore this vendor invoice?"
        );

      if (!confirmed) {
        return;
      }

      await performAction({
        actionName: "restore",
        endpoint:
          `/api/vendor-invoices/${vendorInvoiceId}/restore`,
        method: "PATCH",
        successMessage:
          "Vendor invoice restored successfully.",
      });
    };

  const totals =
    useMemo<FinancialTotals>(() => {
      if (!invoice) {
        return {
          subtotal: 0,
          discount: 0,
          tax: 0,
          grandTotal: 0,
          paid: 0,
          outstanding: 0,
        };
      }

      const items =
        invoice.items || [];

      const calculated =
        items.reduce<CalculatedItemTotals>(
          (
            currentTotals,
            item
          ) => {
            currentTotals.subtotal +=
              getItemSubtotal(
                item
              );

            currentTotals.discount +=
              Number(
                item.discountAmount ||
                  0
              );

            currentTotals.tax +=
              Number(
                item.taxAmount ??
                  0
              );

            currentTotals.grandTotal +=
              getItemTotal(
                item
              );

            return currentTotals;
          },
          {
            subtotal: 0,
            discount: 0,
            tax: 0,
            grandTotal: 0,
          }
        );

      return {
        subtotal:
          Number(
            invoice.subtotal
          ) ||
          calculated.subtotal,

        discount:
          Number(
            invoice.discountAmount
          ) ||
          calculated.discount,

        tax:
          Number(
            invoice.taxAmount
          ) ||
          calculated.tax,

        grandTotal:
          Number(
            invoice.grandTotal ??
              invoice.totalAmount
          ) ||
          calculated.grandTotal,

        paid:
          Number(
            invoice.paidAmount ||
              0
          ),

        outstanding:
          Number(
            invoice.outstandingAmount ??
              invoice.balanceDue ??
              0
          ),
      };
    }, [invoice]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (
    error &&
    !invoice
  ) {
    return (
      <PageContainer>
        <ErrorState
          message={error}
          onRetry={() =>
            void loadInvoice()
          }
        />
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer>
        <ErrorState
          message="Vendor invoice not found."
          onRetry={() =>
            void loadInvoice()
          }
        />
      </PageContainer>
    );
  }

  const currency =
    invoice.currency ||
    "BDT";

  const purchaseOrderId =
    getPurchaseOrderId(
      invoice
    );

  const goodsReceivedId =
    getGoodsReceivedId(
      invoice
    );

  const isDeleted =
    Boolean(
      invoice.isDeleted ||
        invoice.deletedAt
    );

  return (
    <PageContainer>
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
          href="/admin/supplier-and-purchase/vendor-invoices"
          className="transition hover:text-orange-600"
        >
          Vendor Invoices
        </Link>

        <span>/</span>

        <span className="font-medium text-slate-800">
          {getInvoiceNumber(
            invoice
          )}
        </span>
      </nav>

      {/* Header */}

      <header className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {getInvoiceNumber(
                invoice
              )}
            </h1>

            <StatusBadge
              status={
                isDeleted
                  ? "deleted"
                  : invoice.status
              }
            />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Supplier invoice:{" "}
            <span className="font-semibold text-slate-700">
              {invoice.supplierInvoiceNumber ||
                "—"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/supplier-and-purchase/vendor-invoices"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back
          </Link>

          {!isDeleted && (
            <Link
              href={`/admin/supplier-and-purchase/vendor-invoices/${vendorInvoiceId}/edit`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Edit Invoice
            </Link>
          )}

          {!isDeleted && (
            <button
              type="button"
              onClick={
                handleMatch
              }
              disabled={
                Boolean(
                  actionLoading
                )
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ===
              "match"
                ? "Matching..."
                : "Run Matching"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <MessageBox
          type="error"
          message={error}
        />
      )}

      {successMessage && (
        <MessageBox
          type="success"
          message={
            successMessage
          }
        />
      )}

      {/* Summary */}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Grand Total"
          value={formatMoney(
            totals.grandTotal,
            currency
          )}
        />

        <SummaryCard
          label="Paid Amount"
          value={formatMoney(
            totals.paid,
            currency
          )}
        />

        <SummaryCard
          label="Outstanding"
          value={formatMoney(
            totals.outstanding,
            currency
          )}
          danger={
            totals.outstanding >
            0
          }
        />

        <SummaryCard
          label="Due Date"
          value={formatDate(
            invoice.dueDate
          )}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Main Information */}

          <SectionCard
            title="Invoice Information"
            description="Supplier and purchase reference information."
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <InformationItem
                label="Supplier"
                value={getSupplierName(
                  invoice
                )}
              />

              <InformationItem
                label="Invoice Number"
                value={getInvoiceNumber(
                  invoice
                )}
              />

              <InformationItem
                label="Supplier Invoice"
                value={
                  invoice.supplierInvoiceNumber ||
                  "—"
                }
              />

              <InformationItem
                label="Invoice Date"
                value={formatDate(
                  invoice.invoiceDate
                )}
              />

              <InformationItem
                label="Due Date"
                value={formatDate(
                  invoice.dueDate
                )}
              />

              <InformationItem
                label="Currency"
                value={currency}
              />

              <InformationItem
                label="Purchase Order"
                value={getPurchaseOrderNumber(
                  invoice
                )}
                href={
                  purchaseOrderId
                    ? `/admin/supplier-and-purchase/purchase-orders/${purchaseOrderId}`
                    : undefined
                }
              />

              <InformationItem
                label="Goods Received"
                value={getGoodsReceivedNumber(
                  invoice
                )}
                href={
                  goodsReceivedId
                    ? `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}`
                    : undefined
                }
              />

              <InformationItem
                label="Payment Status"
                value={statusLabel(
                  invoice.paymentStatus ||
                    "unpaid"
                )}
              />
            </div>
          </SectionCard>

          {/* Items */}

          <SectionCard
            title="Invoice Items"
            description={`${invoice.items?.length || 0} item(s) recorded on this invoice.`}
            noPadding
          >
            {!invoice.items?.length ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No invoice items
                found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-y border-slate-200">
                      <TableHeading>
                        Product
                      </TableHeading>

                      <TableHeading>
                        Description
                      </TableHeading>

                      <TableHeading align="right">
                        Quantity
                      </TableHeading>

                      <TableHeading align="right">
                        Unit Price
                      </TableHeading>

                      <TableHeading align="right">
                        Discount
                      </TableHeading>

                      <TableHeading align="right">
                        Tax
                      </TableHeading>

                      <TableHeading align="right">
                        Total
                      </TableHeading>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map(
                      (
                        item,
                        index
                      ) => (
                        <tr
                          key={
                            item._id ||
                            item.id ||
                            index
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {getProductName(
                                item
                              )}
                            </p>

                            {(item.sku ||
                              (typeof item.product ===
                                "object" &&
                                item.product
                                  ?.sku)) && (
                              <p className="mt-1 text-xs text-slate-500">
                                SKU:{" "}
                                {item.sku ||
                                  (typeof item.product ===
                                    "object"
                                    ? item.product
                                        ?.sku
                                    : "")}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {item.description ||
                              "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                            {getQuantity(
                              item
                            ).toLocaleString()}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                            {formatMoney(
                              getUnitPrice(
                                item
                              ),
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                            {formatMoney(
                              Number(
                                item.discountAmount ||
                                  0
                              ),
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                            {formatMoney(
                              Number(
                                item.taxAmount ||
                                  0
                              ),
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                            {formatMoney(
                              getItemTotal(
                                item
                              ),
                              currency
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Notes */}

          <SectionCard
            title="Notes"
            description="Invoice remarks and internal information."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <InformationBlock
                label="Supplier Notes"
                value={
                  invoice.notes ||
                  "No notes provided."
                }
              />

              <InformationBlock
                label="Internal Notes"
                value={
                  invoice.internalNotes ||
                  "No internal notes provided."
                }
              />
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}

        <aside className="space-y-6">
          {/* Totals */}

          <SectionCard
            title="Financial Summary"
            description="Calculated invoice amounts."
          >
            <div className="space-y-4">
              <AmountRow
                label="Subtotal"
                value={formatMoney(
                  totals.subtotal,
                  currency
                )}
              />

              <AmountRow
                label="Discount"
                value={`- ${formatMoney(
                  totals.discount,
                  currency
                )}`}
              />

              <AmountRow
                label="Tax"
                value={formatMoney(
                  totals.tax,
                  currency
                )}
              />

              <div className="border-t border-slate-200 pt-4">
                <AmountRow
                  label="Grand Total"
                  value={formatMoney(
                    totals.grandTotal,
                    currency
                  )}
                  strong
                />
              </div>

              <AmountRow
                label="Paid"
                value={formatMoney(
                  totals.paid,
                  currency
                )}
              />

              <AmountRow
                label="Outstanding"
                value={formatMoney(
                  totals.outstanding,
                  currency
                )}
                strong
              />
            </div>
          </SectionCard>

          {/* Matching */}

          <SectionCard
            title="Three-Way Matching"
            description="Purchase order, goods received and invoice comparison."
          >
            <div className="space-y-3">
              <MatchingRow
                label="Overall Status"
                value={
                  invoice.matchingStatus ||
                  invoice.matchingResult
                    ?.status ||
                  "Not matched"
                }
              />

              <MatchingBoolean
                label="Purchase Order"
                value={
                  invoice.matchingResult
                    ?.purchaseOrderMatched
                }
              />

              <MatchingBoolean
                label="Goods Received"
                value={
                  invoice.matchingResult
                    ?.goodsReceivedMatched
                }
              />

              <MatchingBoolean
                label="Quantity"
                value={
                  invoice.matchingResult
                    ?.quantityMatched
                }
              />

              <MatchingBoolean
                label="Price"
                value={
                  invoice.matchingResult
                    ?.priceMatched
                }
              />

              {invoice.matchingResult
                ?.message && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  {
                    invoice.matchingResult
                      .message
                  }
                </p>
              )}

              {!isDeleted && (
                <button
                  type="button"
                  onClick={
                    handleMatch
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ===
                  "match"
                    ? "Running Matching..."
                    : "Run Three-Way Matching"}
                </button>
              )}
            </div>
          </SectionCard>

          {/* Status Actions */}

          {!isDeleted && (
            <SectionCard
              title="Status Actions"
              description="Move the invoice through its approval lifecycle."
            >
              <div className="grid gap-3">
                <StatusActionButton
                  label="Set Pending"
                  loading={
                    actionLoading ===
                    "status-pending"
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={() =>
                    void handleStatusUpdate(
                      "pending"
                    )
                  }
                />

                <StatusActionButton
                  label="Approve Invoice"
                  loading={
                    actionLoading ===
                    "status-approved"
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={() =>
                    void handleStatusUpdate(
                      "approved"
                    )
                  }
                  primary
                />

                <StatusActionButton
                  label="Reject Invoice"
                  loading={
                    actionLoading ===
                    "status-rejected"
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={() =>
                    void handleStatusUpdate(
                      "rejected"
                    )
                  }
                  danger
                />

                <StatusActionButton
                  label="Cancel Invoice"
                  loading={
                    actionLoading ===
                    "status-cancelled"
                  }
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                  onClick={() =>
                    void handleStatusUpdate(
                      "cancelled"
                    )
                  }
                />
              </div>
            </SectionCard>
          )}

          {/* Record Metadata */}

          <SectionCard
            title="Record Information"
            description="Creation and update history."
          >
            <div className="space-y-4">
              <InformationItem
                label="Created"
                value={formatDateTime(
                  invoice.createdAt
                )}
              />

              <InformationItem
                label="Updated"
                value={formatDateTime(
                  invoice.updatedAt
                )}
              />

              <InformationItem
                label="Created By"
                value={
                  typeof invoice.createdBy ===
                  "object"
                    ? invoice.createdBy
                        ?.name ||
                      invoice.createdBy
                        ?.email ||
                      "—"
                    : "—"
                }
              />
            </div>
          </SectionCard>

          {/* Delete / Restore */}

          <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-base font-bold text-red-800">
              {isDeleted
                ? "Restore Record"
                : "Danger Zone"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700">
              {isDeleted
                ? "Restore this vendor invoice so it becomes available again."
                : "Deleting this invoice may soft-delete it from normal listings."}
            </p>

            {isDeleted ? (
              <button
                type="button"
                onClick={
                  handleRestore
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                className="mt-4 h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ===
                "restore"
                  ? "Restoring..."
                  : "Restore Invoice"}
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                className="mt-4 h-11 w-full rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ===
                "delete"
                  ? "Deleting..."
                  : "Delete Invoice"}
              </button>
            )}
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function PageContainer({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        {children}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

      <p className="mt-4 text-sm font-medium text-slate-600">
        Loading vendor
        invoice...
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
    <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h1 className="text-xl font-bold text-red-800">
        Unable to load invoice
      </h1>

      <p className="mt-3 text-sm leading-6 text-red-700">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white"
        >
          Try Again
        </button>

        <Link
          href="/admin/supplier-and-purchase/vendor-invoices"
          className="rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700"
        >
          Back to Invoices
        </Link>
      </div>
    </div>
  );
}

function MessageBox({
  type,
  message,
}: {
  type:
    | "error"
    | "success";
  message: string;
}) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm font-medium ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-xl font-bold ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </article>
  );
}

function SectionCard({
  title,
  description,
  children,
  noPadding = false,
}: {
  title: string;
  description?: string;
  children:
    ReactNode;
  noPadding?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div
        className={
          noPadding
            ? ""
            : "p-5"
        }
      >
        {children}
      </div>
    </section>
  );
}

function InformationItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      {href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-sm font-semibold text-orange-600 hover:underline"
        >
          {value}
        </Link>
      ) : (
        <p className="mt-2 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      )}
    </div>
  );
}

function InformationBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children:
    ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(
        status
      )}`}
    >
      {statusLabel(
        status
      )}
    </span>
  );
}

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-bold text-slate-900"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-lg font-bold text-slate-900"
            : "text-sm font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function MatchingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <StatusBadge
        status={value}
      />
    </div>
  );
}

function MatchingBoolean({
  label,
  value,
}: {
  label: string;
  value?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          value === true
            ? "bg-emerald-50 text-emerald-700"
            : value === false
              ? "bg-red-50 text-red-700"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {value === true
          ? "Matched"
          : value === false
            ? "Mismatch"
            : "Not checked"}
      </span>
    </div>
  );
}

function StatusActionButton({
  label,
  onClick,
  disabled,
  loading,
  primary = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const className =
    danger
      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
      : primary
        ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 w-full rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading
        ? "Processing..."
        : label}
    </button>
  );
}