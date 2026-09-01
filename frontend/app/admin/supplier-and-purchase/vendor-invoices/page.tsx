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

type InvoiceStatus =
  | "draft"
  | "pending"
  | "matched"
  | "approved"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "rejected"
  | string;

interface Supplier {
  _id?: string;
  id?: string;
  name?: string;
  supplierName?: string;
  code?: string;
}

interface PurchaseOrder {
  _id?: string;
  id?: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
}

interface VendorInvoice {
  _id?: string;
  id?: string;

  invoiceNumber?: string;
  vendorInvoiceNumber?: string;
  supplierInvoiceNumber?: string;

  supplier?: Supplier | string | null;
  supplierName?: string;

  purchaseOrder?: PurchaseOrder | string | null;
  purchaseOrderNumber?: string;
  poNumber?: string;

  invoiceDate?: string;
  dueDate?: string;

  currency?: string;

  grandTotal?: number;
  totalAmount?: number;
  invoiceTotal?: number;

  paidAmount?: number;

  outstandingAmount?: number;
  balanceDue?: number;
  dueAmount?: number;

  status?: InvoiceStatus;
  matchingStatus?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface VendorInvoiceListMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface VendorInvoiceApiResponse {
  success?: boolean;
  message?: string;

  data?:
    | VendorInvoice[]
    | {
        vendorInvoices?: VendorInvoice[];
        invoices?: VendorInvoice[];
        results?: VendorInvoice[];
        items?: VendorInvoice[];
        pagination?: VendorInvoiceListMeta;
        meta?: VendorInvoiceListMeta;
      };

  vendorInvoices?: VendorInvoice[];
  invoices?: VendorInvoice[];
  results?: VendorInvoice[];

  pagination?: VendorInvoiceListMeta;
  meta?: VendorInvoiceListMeta;
}

interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  overdueCount: number;
}

/* =========================================================
   HELPERS
========================================================= */

const getStorageValue = (
  keys: string[]
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of keys) {
    const value =
      window.localStorage.getItem(key);

    if (
      typeof value === "string" &&
      value.trim()
    ) {
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

const extractInvoices = (
  result: VendorInvoiceApiResponse
): VendorInvoice[] => {
  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (
    result.data &&
    !Array.isArray(result.data)
  ) {
    if (
      Array.isArray(
        result.data.vendorInvoices
      )
    ) {
      return result.data.vendorInvoices;
    }

    if (
      Array.isArray(
        result.data.invoices
      )
    ) {
      return result.data.invoices;
    }

    if (
      Array.isArray(
        result.data.results
      )
    ) {
      return result.data.results;
    }

    if (
      Array.isArray(
        result.data.items
      )
    ) {
      return result.data.items;
    }
  }

  if (
    Array.isArray(
      result.vendorInvoices
    )
  ) {
    return result.vendorInvoices;
  }

  if (
    Array.isArray(
      result.invoices
    )
  ) {
    return result.invoices;
  }

  if (
    Array.isArray(
      result.results
    )
  ) {
    return result.results;
  }

  return [];
};

const extractPagination = (
  result: VendorInvoiceApiResponse
): VendorInvoiceListMeta => {
  if (
    result.data &&
    !Array.isArray(result.data)
  ) {
    return (
      result.data.pagination ||
      result.data.meta ||
      {}
    );
  }

  return (
    result.pagination ||
    result.meta ||
    {}
  );
};

const getSupplierName = (
  invoice: VendorInvoice
): string => {
  if (
    invoice.supplier &&
    typeof invoice.supplier ===
      "object"
  ) {
    return (
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

const getInvoiceNumber = (
  invoice: VendorInvoice
): string =>
  invoice.invoiceNumber ||
  invoice.vendorInvoiceNumber ||
  invoice.supplierInvoiceNumber ||
  "—";

const getInvoiceTotal = (
  invoice: VendorInvoice
): number =>
  Number(
    invoice.grandTotal ??
      invoice.totalAmount ??
      invoice.invoiceTotal ??
      0
  );

const getPaidAmount = (
  invoice: VendorInvoice
): number =>
  Number(
    invoice.paidAmount ??
      Math.max(
        0,
        getInvoiceTotal(invoice) -
          getOutstandingAmount(
            invoice
          )
      )
  );

function getOutstandingAmount(
  invoice: VendorInvoice
): number {
  return Number(
    invoice.outstandingAmount ??
      invoice.balanceDue ??
      invoice.dueAmount ??
      getInvoiceTotal(invoice)
  );
}

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

const getStatusLabel = (
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

const getStatusClassName = (
  status?: string
): string => {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "approved":
    case "matched":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "pending":
    case "partially_paid":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "overdue":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const isInvoiceOverdue = (
  invoice: VendorInvoice
): boolean => {
  if (
    normalizeStatus(
      invoice.status
    ) === "overdue"
  ) {
    return true;
  }

  if (
    !invoice.dueDate ||
    getOutstandingAmount(
      invoice
    ) <= 0
  ) {
    return false;
  }

  const dueDate =
    new Date(
      invoice.dueDate
    );

  return (
    !Number.isNaN(
      dueDate.getTime()
    ) &&
    dueDate.getTime() <
      Date.now()
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function VendorInvoicesPage() {
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
    invoices,
    setInvoices,
  ] = useState<
    VendorInvoice[]
  >([]);

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
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] =
    useState<VendorInvoiceListMeta>(
      {}
    );

  const pageSize = 20;

  const loadInvoices =
    useCallback(
      async (
        showRefreshState = false,
      ) => {
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

        try {
          if (
            showRefreshState
          ) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const token =
            getAccessToken();

          if (!token) {
            throw new Error(
              "Your login session is missing or expired. Please log in again.",
            );
          }

          if (
            !selectedTenantId
          ) {
            throw new Error(
              "Please select a tenant before continuing.",
            );
          }

          const query =
            new URLSearchParams();

          query.set(
            "page",
            String(currentPage),
          );

          query.set(
            "limit",
            String(pageSize),
          );

          query.set(
            "sortBy",
            "createdAt",
          );

          query.set(
            "sortOrder",
            "desc",
          );

          if (
            search.trim()
          ) {
            query.set(
              "search",
              search.trim(),
            );
          }

          if (
            statusFilter !==
            "all"
          ) {
            query.set(
              "status",
              statusFilter,
            );
          }

          const headers =
            new Headers();

          headers.set(
            "Accept",
            "application/json",
          );

          headers.set(
            "Authorization",
            `Bearer ${token}`,
          );

          headers.set(
            "X-Tenant-Id",
            selectedTenantId,
          );

          const response =
            await fetch(
              `${API_URL}/api/vendor-invoices?${query.toString()}`,
              {
                method: "GET",
                headers,
                credentials:
                  "include",
                cache: "no-store",
                signal:
                  controller.signal,
              },
            );

          let result:
            VendorInvoiceApiResponse =
            {};

          try {
            result =
              (await response.json()) as VendorInvoiceApiResponse;
          } catch {
            result = {};
          }

          if (
            controller.signal.aborted ||
            requestSequenceRef.current !==
              requestId
          ) {
            return;
          }

          if (!response.ok) {
            if (
              response.status ===
              401
            ) {
              throw new Error(
                "Your login session is missing or expired. Please log in again.",
              );
            }

            if (
              response.status ===
              403
            ) {
              throw new Error(
                result.message ||
                  "You do not have permission to view vendor invoices.",
              );
            }

            throw new Error(
              result.message ||
                `Failed to load vendor invoices (${response.status}).`,
            );
          }

          setInvoices(
            extractInvoices(
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
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            return;
          }

          if (
            requestSequenceRef.current !==
            requestId
          ) {
            return;
          }

          setInvoices([]);
          setPagination({});

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load vendor invoices.",
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
        currentPage,
        search,
        selectedTenantId,
        statusFilter,
      ],
    );

  useEffect(() => {
    activeRequestRef.current?.abort();

    setInvoices([]);
    setPagination({});
    setError("");

    if (!selectedTenantId) {
      setLoading(false);
      setRefreshing(false);

      return () => {
        activeRequestRef.current?.abort();
      };
    }

    const debounceTimer =
      window.setTimeout(
        () => {
          void loadInvoices();
        },
        search ? 400 : 0,
      );

    return () => {
      window.clearTimeout(
        debounceTimer,
      );

      activeRequestRef.current?.abort();
    };
  }, [
    loadInvoices,
    search,
    selectedTenantId,
  ]);

  const summary =
    useMemo<InvoiceSummary>(
      () => {
        return invoices.reduce<InvoiceSummary>(
          (
            totals,
            invoice
          ) => {
            totals.totalInvoices +=
              1;

            totals.totalAmount +=
              getInvoiceTotal(
                invoice
              );

            totals.paidAmount +=
              getPaidAmount(
                invoice
              );

            totals.outstandingAmount +=
              getOutstandingAmount(
                invoice
              );

            if (
              isInvoiceOverdue(
                invoice
              )
            ) {
              totals.overdueCount +=
                1;
            }

            return totals;
          },
          {
            totalInvoices: 0,
            totalAmount: 0,
            paidAmount: 0,
            outstandingAmount: 0,
            overdueCount: 0,
          }
        );
      },
      [invoices]
    );

  const totalPages =
    Math.max(
      1,
      Number(
        pagination.totalPages ??
          1
      )
    );

  const canGoPrevious =
    currentPage > 1;

  const canGoNext =
    pagination.hasNextPage ??
    currentPage <
      totalPages;

  const handleRefresh =
    () => {
      void loadInvoices(
        true,
      );
    };

  const handleSearchChange = (
    value: string
  ) => {
    setCurrentPage(1);
    setSearch(value);
  };

  const handleStatusChange = (
    value: string
  ) => {
    setCurrentPage(1);
    setStatusFilter(
      value
    );
  };

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

          <span className="font-medium text-slate-800">
            Vendor Invoices
          </span>
        </nav>

        {/* Page Header */}

        <header className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Accounts Payable
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Vendor Invoices
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage supplier invoices,
              three-way matching,
              approval status and
              outstanding payable
              balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={
                loading ||
                refreshing
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/supplier-and-purchase/suppliers/create"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-100"
            >
              + Add Supplier
            </Link>

            <Link
              href="/admin/supplier-and-purchase/vendor-invoices/create"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              Create Vendor Invoice
            </Link>
          </div>
        </header>

        {/* Summary Cards */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Invoices"
            value={String(
              summary.totalInvoices
            )}
            description="Current page"
          />

          <SummaryCard
            label="Invoice Value"
            value={formatMoney(
              summary.totalAmount
            )}
            description="Current page total"
          />

          <SummaryCard
            label="Paid"
            value={formatMoney(
              summary.paidAmount
            )}
            description="Recorded payments"
          />

          <SummaryCard
            label="Outstanding"
            value={formatMoney(
              summary.outstandingAmount
            )}
            description="Unpaid balance"
          />

          <SummaryCard
            label="Overdue"
            value={String(
              summary.overdueCount
            )}
            description="Past due invoices"
            danger={
              summary.overdueCount >
              0
            }
          />
        </section>

        {/* Filters */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div>
              <label
                htmlFor="vendor-invoice-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>

              <input
                id="vendor-invoice-search"
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  handleSearchChange(
                    event.target
                      .value
                  )
                }
                placeholder="Invoice number, supplier or PO..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label
                htmlFor="vendor-invoice-status"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>

              <select
                id="vendor-invoice-status"
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  handleStatusChange(
                    event.target
                      .value
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              >
                <option value="all">
                  All statuses
                </option>

                <option value="draft">
                  Draft
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="matched">
                  Matched
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="partially_paid">
                  Partially Paid
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="overdue">
                  Overdue
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all"
                  );
                  setCurrentPage(
                    1
                  );
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:w-auto"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        {/* Content */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && (
            <LoadingState />
          )}

          {!loading &&
            error && (
              <ErrorState
                message={
                  error
                }
                onRetry={
                  handleRefresh
                }
              />
            )}

          {!loading &&
            !error &&
            invoices.length ===
              0 && (
              <EmptyState />
            )}

          {!loading &&
            !error &&
            invoices.length >
              0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[1150px] w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHeading>
                          Invoice
                        </TableHeading>

                        <TableHeading>
                          Supplier
                        </TableHeading>

                        <TableHeading>
                          Purchase Order
                        </TableHeading>

                        <TableHeading>
                          Invoice Date
                        </TableHeading>

                        <TableHeading>
                          Due Date
                        </TableHeading>

                        <TableHeading align="right">
                          Total
                        </TableHeading>

                        <TableHeading align="right">
                          Paid
                        </TableHeading>

                        <TableHeading align="right">
                          Outstanding
                        </TableHeading>

                        <TableHeading>
                          Status
                        </TableHeading>

                        <TableHeading align="right">
                          Action
                        </TableHeading>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {invoices.map(
                        (
                          invoice,
                          index
                        ) => {
                          const invoiceId =
                            invoice._id ||
                            invoice.id ||
                            `invoice-${index}`;

                          const currency =
                            invoice.currency ||
                            "BDT";

                          return (
                            <tr
                              key={
                                invoiceId
                              }
                              className="transition hover:bg-slate-50/80"
                            >
                              <td className="whitespace-nowrap px-5 py-4">
                                <div className="font-semibold text-slate-900">
                                  {getInvoiceNumber(
                                    invoice
                                  )}
                                </div>

                                {invoice.matchingStatus && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    Matching:{" "}
                                    {
                                      invoice.matchingStatus
                                    }
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-700">
                                {getSupplierName(
                                  invoice
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                {getPurchaseOrderNumber(
                                  invoice
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                {formatDate(
                                  invoice.invoiceDate
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                <span
                                  className={
                                    isInvoiceOverdue(
                                      invoice
                                    )
                                      ? "font-semibold text-red-600"
                                      : ""
                                  }
                                >
                                  {formatDate(
                                    invoice.dueDate
                                  )}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-slate-800">
                                {formatMoney(
                                  getInvoiceTotal(
                                    invoice
                                  ),
                                  currency
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-emerald-700">
                                {formatMoney(
                                  getPaidAmount(
                                    invoice
                                  ),
                                  currency
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                                {formatMoney(
                                  getOutstandingAmount(
                                    invoice
                                  ),
                                  currency
                                )}
                              </td>

                              <td className="whitespace-nowrap px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                                    invoice.status
                                  )}`}
                                >
                                  {getStatusLabel(
                                    invoice.status
                                  )}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right">
                                {invoice._id ||
                                invoice.id ? (
                                  <Link
                                    href={`/admin/supplier-and-purchase/vendor-invoices/${invoice._id || invoice.id}`}
                                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                  >
                                    View
                                  </Link>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Unavailable
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={
                    currentPage
                  }
                  totalPages={
                    totalPages
                  }
                  total={
                    pagination.total
                  }
                  canGoPrevious={
                    canGoPrevious
                  }
                  canGoNext={
                    canGoNext
                  }
                  onPrevious={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        Math.max(
                          1,
                          page -
                            1
                        )
                    )
                  }
                  onNext={() =>
                    setCurrentPage(
                      (
                        page
                      ) =>
                        page +
                        1
                    )
                  }
                />
              </>
            )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
  danger?: boolean;
}

function SummaryCard({
  label,
  value,
  description,
  danger = false,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 break-words text-2xl font-bold ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}

interface TableHeadingProps {
  children: ReactNode;
  align?: "left" | "right";
}

function TableHeading({
  children,
  align = "left",
}: TableHeadingProps) {
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

function LoadingState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-10 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

      <p className="mt-4 text-sm font-medium text-slate-700">
        Loading vendor
        invoices...
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-base font-bold text-red-800">
        Unable to load vendor
        invoices
      </h2>

      <p className="mt-2 text-sm leading-6 text-red-700">
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
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-xl font-bold text-orange-600">
        VI
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        No vendor invoices
        found
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create your first
        vendor invoice to
        begin tracking supplier
        payable balances and
        invoice matching.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/admin/supplier-and-purchase/suppliers/create"
          className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
        >
          + Add Supplier
        </Link>

        <Link
          href="/admin/supplier-and-purchase/vendor-invoices/create"
          className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Create Vendor Invoice
        </Link>
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total?: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

function Pagination({
  currentPage,
  totalPages,
  total,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: PaginationProps) {
  return (
    <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
      <p className="text-sm text-slate-500">
        Page{" "}
        <span className="font-semibold text-slate-800">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-800">
          {Math.max(
            1,
            totalPages
          )}
        </span>

        {typeof total ===
          "number" && (
          <>
            {" "}
            ·{" "}
            <span className="font-semibold text-slate-800">
              {total}
            </span>{" "}
            total
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={
            onPrevious
          }
          disabled={
            !canGoPrevious
          }
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={
            onNext
          }
          disabled={
            !canGoNext
          }
          className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </footer>
  );
}