"use client";

import Link from "next/link";
import { useTenant } from "@/src/context/TenantContext";
import {
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

const PAGE_LIMIT = 100;

/* =========================================================
   TYPES
========================================================= */

interface SupplierReference {
  _id?: string;
  id?: string;
  displayName?: string;
  businessName?: string;
  name?: string;
  supplierCode?: string;
}

interface PurchaseOrder {
  _id: string;
  id?: string;

  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;

  supplier?:
    | SupplierReference
    | string
    | null;

  supplierSnapshot?: {
    supplierCode?: string;
    businessName?: string;
  };

  orderDate?: string;
  expectedDeliveryDate?: string;

  currency?: string;
  grandTotal?: number;
  totalAmount?: number;

  itemCount?: number;
  totalOrderedQuantity?: number;

  status?: string;
  paymentStatus?: string;

  receivingSummary?: {
    totalOrderedQuantity?: number;
    totalReceivedQuantity?: number;
    totalRejectedQuantity?: number;
    totalPendingQuantity?: number;
  };
}

interface ValidationError {
  field?: string;
  message?: string;
}

interface PurchaseOrderListResponse {
  success?: boolean;
  message?: string;
  errors?: ValidationError[];

  data?:
    | PurchaseOrder[]
    | {
        purchaseOrders?: PurchaseOrder[];
        orders?: PurchaseOrder[];
        results?: PurchaseOrder[];
        items?: PurchaseOrder[];
        pagination?: {
          page?: number;
          limit?: number;
          total?: number;
          totalPages?: number;
        };
      };

  purchaseOrders?: PurchaseOrder[];
  orders?: PurchaseOrder[];
  results?: PurchaseOrder[];
  items?: PurchaseOrder[];
}

interface PurchaseOrderStatusResponse {
  success?: boolean;
  message?: string;
  errors?: ValidationError[];
  data?: unknown;
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
  if (!getAccessToken()) {
    throw new Error(
      "Your admin session has expired. Please log in again.",
    );
  }

  if (!tenantId) {
    throw new Error(
      "Tenant context is missing. Please log out and sign in again.",
    );
  }
};

/* =========================================================
   HELPERS
========================================================= */

const extractPurchaseOrders = (
  result: PurchaseOrderListResponse,
): PurchaseOrder[] => {
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
      result.data.results ||
      result.data.items ||
      []
    );
  }

  return (
    result.purchaseOrders ||
    result.orders ||
    result.results ||
    result.items ||
    []
  );
};

const getApiErrorMessage = (
  result:
    | PurchaseOrderListResponse
    | PurchaseOrderStatusResponse,
  fallback: string,
): string => {
  if (
    Array.isArray(result.errors) &&
    result.errors.length > 0
  ) {
    const details =
      result.errors
        .map((error) => {
          const message =
            error.message?.trim();

          if (!message) {
            return "";
          }

          return error.field
            ? `${error.field}: ${message}`
            : message;
        })
        .filter(Boolean)
        .join(" | ");

    if (details) {
      return details;
    }
  }

  return (
    result.message ||
    fallback
  );
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

const getSupplierName = (
  order: PurchaseOrder,
): string => {
  if (
    order.supplier &&
    typeof order.supplier === "object"
  ) {
    return (
      order.supplier.displayName ||
      order.supplier.businessName ||
      order.supplier.name ||
      order.supplier.supplierCode ||
      order.supplierSnapshot?.businessName ||
      order.supplierSnapshot?.supplierCode ||
      "—"
    );
  }

  return (
    order.supplierSnapshot?.businessName ||
    order.supplierSnapshot?.supplierCode ||
    "—"
  );
};

const getOrderNumber = (
  order: PurchaseOrder,
): string =>
  order.purchaseOrderNumber ||
  order.poNumber ||
  order.orderNumber ||
  "Purchase Order";

const normalizeStatus = (
  status?: string,
): string =>
  String(status || "Draft")
    .trim()
    .toLowerCase();

const getStatusClassName = (
  status?: string,
): string => {
  const normalized =
    normalizeStatus(status);

  if (
    normalized === "approved" ||
    normalized === "ordered" ||
    normalized === "received" ||
    normalized === "closed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalized === "pending approval" ||
    normalized === "partially received"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
};

const canApprove = (
  order: PurchaseOrder,
): boolean =>
  [
    "draft",
    "pending approval",
  ].includes(
    normalizeStatus(order.status),
  );

const canMarkOrdered = (
  order: PurchaseOrder,
): boolean =>
  normalizeStatus(order.status) ===
  "approved";

const canCreateGoodsReceived = (
  order: PurchaseOrder,
): boolean =>
  [
    "ordered",
    "partially received",
  ].includes(
    normalizeStatus(order.status),
  ) &&
  Number(
    order.receivingSummary
      ?.totalPendingQuantity ??
      order.totalOrderedQuantity ??
      0,
  ) > 0;

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
            Supplier &amp; Purchase
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
              Back to Supplier &amp; Purchase
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

/* =========================================================
   PAGE
========================================================= */

export default function PurchaseOrdersPage() {
  const { selectedTenantId } = useTenant();

  const activeRequestRef =
    useRef<AbortController | null>(
      null,
    );

  const [
    orders,
    setOrders,
  ] = useState<
    PurchaseOrder[]
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
    processingOrderId,
    setProcessingOrderId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const loadOrders =
    useCallback(
      async ({
        silent = false,
      }: {
        silent?: boolean;
      } = {}) => {
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

          const response =
            await fetch(
              `${API_URL}/api/purchase-orders?limit=${PAGE_LIMIT}`,
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

          const result =
            (await response
              .json()
              .catch(
                () => ({}),
              )) as PurchaseOrderListResponse;

          if (!response.ok) {
            throw new Error(
              getApiErrorMessage(
                result,
                `Failed to load purchase orders (${response.status}).`,
              ),
            );
          }

          if (
            controller.signal.aborted
          ) {
            return;
          }

          setOrders(
            extractPurchaseOrders(
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

          setOrders([]);

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load purchase orders.",
          );
        } finally {
          if (
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
      [selectedTenantId],
    );

  useEffect(() => {
    activeRequestRef.current?.abort();

    setOrders([]);
    setError("");
    setSuccess("");
    setProcessingOrderId("");

    if (selectedTenantId) {
      void loadOrders();
    } else {
      setLoading(false);
      setRefreshing(false);
    }

    return () => {
      activeRequestRef.current?.abort();
    };
  }, [
    loadOrders,
    selectedTenantId,
  ]);

  const summary =
    useMemo(() => {
      const total =
        orders.length;

      const draft =
        orders.filter(
          (order) =>
            normalizeStatus(
              order.status,
            ) === "draft",
        ).length;

      const approvedOrOrdered =
        orders.filter((order) =>
          [
            "approved",
            "ordered",
            "partially received",
          ].includes(
            normalizeStatus(
              order.status,
            ),
          ),
        ).length;

      const totalValue =
        orders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.grandTotal ??
                order.totalAmount ??
                0,
            ),
          0,
        );

      return {
        total,
        draft,
        approvedOrOrdered,
        totalValue,
      };
    }, [orders]);

  const updateStatus = async (
    order: PurchaseOrder,
    status: string,
  ) => {
    try {
      setProcessingOrderId(
        order._id,
      );
      setError("");
      setSuccess("");

     ensureRequestContext(selectedTenantId);

      const response =
        await fetch(
          `${API_URL}/api/purchase-orders/${order._id}/status`,
          {
            method: "PATCH",
            headers:
              createHeaders(selectedTenantId, {
                includeJson:
                  true,
              }),
            credentials:
              "include",
            body:
              JSON.stringify({
                status,
                note:
                  status === "Approved"
                    ? "Purchase order approved from admin purchase-order list."
                    : "Purchase order marked as ordered from admin purchase-order list.",
              }),
          },
        );

      const result =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as PurchaseOrderStatusResponse;

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            `Failed to update purchase order status (${response.status}).`,
          ),
        );
      }

      setSuccess(
        `${getOrderNumber(
          order,
        )} changed to ${status}.`,
      );

      await loadOrders({
        silent: true,
      });
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update purchase order status.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setProcessingOrderId("");
    }
  };

  return (
    <PageShell
      title="Purchase Orders"
      eyebrow="Purchasing"
      description="Review purchase orders, approve drafts, mark approved orders as ordered, and continue directly to goods receiving."
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              void loadOrders({
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

          <Link
            href="/admin/supplier-and-purchase/purchase-orders/create"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
          >
            + Add Purchase Order
          </Link>
        </>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
        >
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
        >
          <p className="text-sm font-semibold text-emerald-700">
            {success}
          </p>
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Orders"
          value={summary.total}
          description="Purchase orders loaded for the active tenant."
        />

        <SummaryCard
          label="Draft Orders"
          value={summary.draft}
          description="Orders waiting for approval."
        />

        <SummaryCard
          label="Ready for Receiving"
          value={summary.approvedOrOrdered}
          description="Approved, ordered, or partially received orders."
        />

        <SummaryCard
          label="Total Order Value"
          value={formatMoney(
            summary.totalValue,
            orders[0]?.currency ||
              "BDT",
          )}
          description="Combined value of loaded purchase orders."
        />
      </section>

      {loading ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading purchase orders...
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            No purchase orders found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create the first purchase order for this tenant.
          </p>

          <Link
            href="/admin/supplier-and-purchase/purchase-orders/create"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
          >
            Create Purchase Order
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {[
                    "Purchase Order",
                    "Supplier",
                    "Order Date",
                    "Expected Delivery",
                    "Items",
                    "Pending Qty",
                    "Total",
                    "Payment",
                    "Status",
                    "Actions",
                  ].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {orders.map(
                  (order) => {
                    const processing =
                      processingOrderId ===
                      order._id;

                    const pendingQuantity =
                      Number(
                        order.receivingSummary
                          ?.totalPendingQuantity ??
                          order.totalOrderedQuantity ??
                          0,
                      );

                    return (
                      <tr
                        key={order._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/supplier-and-purchase/purchase-orders/${order._id}`}
                            className="text-sm font-bold text-slate-900 transition hover:text-orange-600"
                          >
                            {getOrderNumber(
                              order,
                            )}
                          </Link>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {getSupplierName(
                            order,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            order.orderDate,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            order.expectedDeliveryDate,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                          {Number(
                            order.itemCount ||
                              0,
                          ).toLocaleString(
                            "en-BD",
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-amber-700">
                          {pendingQuantity.toLocaleString(
                            "en-BD",
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-900">
                          {formatMoney(
                            order.grandTotal ??
                              order.totalAmount,
                            order.currency ||
                              "BDT",
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {order.paymentStatus ||
                              "Unpaid"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                              order.status,
                            )}`}
                          >
                            {order.status ||
                              "Draft"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/supplier-and-purchase/purchase-orders/${order._id}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                            >
                              View
                            </Link>

                            {canApprove(
                              order,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void updateStatus(
                                    order,
                                    "Approved",
                                  )
                                }
                                disabled={
                                  processing
                                }
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processing
                                  ? "Updating..."
                                  : "Approve"}
                              </button>
                            ) : null}

                            {canMarkOrdered(
                              order,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void updateStatus(
                                    order,
                                    "Ordered",
                                  )
                                }
                                disabled={
                                  processing
                                }
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {processing
                                  ? "Updating..."
                                  : "Mark Ordered"}
                              </button>
                            ) : null}

                            {canCreateGoodsReceived(
                              order,
                            ) ? (
                              <Link
                                href={`/admin/supplier-and-purchase/goods-received/create?purchaseOrderId=${order._id}`}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-bold text-white transition hover:bg-orange-700"
                              >
                                Receive Goods
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageShell>
  );
}