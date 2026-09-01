"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
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
  email?: string;
  phone?: string;
  code?: string;
  supplierCode?: string;
}

interface PurchaseOrderItem {
  _id?: string;
  id?: string;

  product?: EntityReference | string | null;
  variant?: EntityReference | string | null;

  productId?: string;
  productName?: string;
  variantName?: string;
  sku?: string;
  description?: string;

  orderedQuantity?: number;
  quantity?: number;

  receivedQuantity?: number;
  rejectedQuantity?: number;
  pendingQuantity?: number;

  unitPrice?: number;
  unitCost?: number;

  discountType?: string;
  discountValue?: number;
  discountAmount?: number;

  taxType?: string;
  taxValue?: number;
  taxRate?: number;
  taxAmount?: number;

  subtotal?: number;
  lineTotal?: number;
  total?: number;

  note?: string;
}

interface StatusHistoryItem {
  _id?: string;
  fromStatus?: string;
  toStatus?: string;
  changedAt?: string;
  changedBy?: EntityReference | string | null;
  reason?: string | null;
  note?: string | null;
}

interface PurchaseOrder {
  _id: string;
  id?: string;
  tenant?: string;

  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;

  supplier?: EntityReference | string | null;

  supplierSnapshot?: {
    supplierCode?: string | null;
    businessName?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    currency?: string | null;
  };

  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string | null;

  referenceNumber?: string | null;
  supplierInvoiceNumber?: string | null;

  source?: string;
  priority?: string;
  status?: string;
  paymentStatus?: string;

  currency?: string;
  exchangeRate?: number;

  itemCount?: number;
  totalOrderedQuantity?: number;

  subtotal?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingAmount?: number;
  otherChargeAmount?: number;
  adjustmentAmount?: number;
  grandTotal?: number;
  baseCurrencyGrandTotal?: number;

  paidAmount?: number;
  refundedAmount?: number;
  dueAmount?: number;

  paymentTerm?: string;
  paymentDueDate?: string | null;

  internalNote?: string | null;
  supplierNote?: string | null;
  termsAndConditions?: string | null;

  deliveryAddress?: {
    recipientName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    area?: string | null;
    district?: string | null;
    division?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };

  approval?: {
    requestedAt?: string | null;
    requestedBy?: EntityReference | string | null;
    approvedAt?: string | null;
    approvedBy?: EntityReference | string | null;
    rejectedAt?: string | null;
    rejectedBy?: EntityReference | string | null;
    rejectionReason?: string | null;
  };

  receivingSummary?: {
    totalOrderedQuantity?: number;
    totalReceivedQuantity?: number;
    totalRejectedQuantity?: number;
    totalPendingQuantity?: number;
    firstReceivedAt?: string | null;
    lastReceivedAt?: string | null;
    completedAt?: string | null;
  };

  statusHistory?: StatusHistoryItem[];

  attachments?: Array<{
    _id?: string;
    name?: string;
    filename?: string;
    url?: string;
  }>;

  items?: PurchaseOrderItem[];

  createdBy?: EntityReference | string | null;
  updatedBy?: EntityReference | string | null;

  createdAt?: string;
  updatedAt?: string;

  isDeleted?: boolean;
}

interface PurchaseOrderApiResponse {
  success?: boolean;
  message?: string;

  data?:
    | PurchaseOrder
    | {
        purchaseOrder?: PurchaseOrder;
        order?: PurchaseOrder;
        items?: PurchaseOrderItem[];
      };

  purchaseOrder?: PurchaseOrder;
  order?: PurchaseOrder;
  items?: PurchaseOrderItem[];

  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

/* =========================================================
   STORAGE HELPERS
========================================================= */

const getStorageValue = (
  keys: string[],
): string => {
  if (
    typeof window === "undefined"
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

const createHeaders =
  (): Headers => {
    const headers =
      new Headers();

    headers.set(
      "Accept",
      "application/json",
    );

    const token =
      getAccessToken();

    const tenantId =
      getTenantId();

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

const ensureRequestContext =
  () => {
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

/* =========================================================
   GENERAL HELPERS
========================================================= */

const toSafeNumber = (
  value: unknown,
): number => {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatMoney = (
  value: unknown,
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
      toSafeNumber(value),
    );
  } catch {
    return `${currency} ${toSafeNumber(
      value,
    ).toLocaleString("en-BD")}`;
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
    "en-BD",
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
    "en-BD",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const getEntityName = (
  value:
    | EntityReference
    | string
    | null
    | undefined,
  fallback = "—",
): string => {
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value.displayName ||
      value.businessName ||
      value.name ||
      value.supplierCode ||
      value.code ||
      fallback
    );
  }

  return fallback;
};

const getEntityId = (
  value:
    | EntityReference
    | string
    | null
    | undefined,
): string => {
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value._id ||
      value.id ||
      ""
    );
  }

  return typeof value ===
    "string"
    ? value
    : "";
};

const getProductName = (
  item: PurchaseOrderItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.name ||
      item.product.displayName ||
      item.product.businessName ||
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
  item: PurchaseOrderItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.code ||
      item.sku ||
      "—"
    );
  }

  return item.sku || "—";
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
          field?: string;
          message?: string;
        }>;
      };

    const errors =
      Array.isArray(
        record.errors,
      )
        ? record.errors
            .map((error) =>
              error.field
                ? `${error.field}: ${error.message || ""}`
                : error.message || "",
            )
            .filter(Boolean)
            .join(" | ")
        : "";

    return (
      errors ||
      record.message ||
      fallback
    );
  }

  return fallback;
};

const extractPurchaseOrder = (
  result: PurchaseOrderApiResponse,
): PurchaseOrder | null => {
  if (
    result.data &&
    typeof result.data ===
      "object" &&
    !Array.isArray(result.data)
  ) {
    if (
      "purchaseOrder" in
        result.data &&
      result.data.purchaseOrder
    ) {
      return {
        ...result.data.purchaseOrder,
        items:
          result.data.items ||
          result.data.purchaseOrder
            .items ||
          [],
      };
    }

    if (
      "order" in
        result.data &&
      result.data.order
    ) {
      return {
        ...result.data.order,
        items:
          result.data.items ||
          result.data.order.items ||
          [],
      };
    }

    if (
      "_id" in result.data
    ) {
      return result.data as PurchaseOrder;
    }
  }

  if (result.purchaseOrder) {
    return {
      ...result.purchaseOrder,
      items:
        result.items ||
        result.purchaseOrder.items ||
        [],
    };
  }

  if (result.order) {
    return {
      ...result.order,
      items:
        result.items ||
        result.order.items ||
        [],
    };
  }

  return null;
};

const getStatusClass = (
  status?: string,
): string => {
  const value =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    [
      "approved",
      "ordered",
      "completed",
      "fully received",
      "paid",
    ].includes(value)
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "draft",
      "pending",
      "unpaid",
      "partially received",
    ].includes(value)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    [
      "cancelled",
      "canceled",
      "rejected",
      "closed",
    ].includes(value)
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const getAddressText = (
  address:
    | PurchaseOrder["deliveryAddress"]
    | undefined,
): string => {
  if (!address) {
    return "—";
  }

  const parts = [
    address.recipientName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    address.area,
    address.district,
    address.division,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.length
    ? parts.join(", ")
    : "—";
};

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  if (emphasis) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-4">
        <span className="text-sm font-semibold text-white">
          {label}
        </span>

        <span className="text-lg font-black text-white">
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function PurchaseOrderDetailsPage() {
  const params =
    useParams<{
      purchaseOrderId: string;
    }>();

  const router =
    useRouter();

  const purchaseOrderId =
    params.purchaseOrderId;

  const [
    purchaseOrder,
    setPurchaseOrder,
  ] =
    useState<PurchaseOrder | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadPurchaseOrder =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        ensureRequestContext();

        if (!purchaseOrderId) {
          throw new Error(
            "Purchase order identifier is missing.",
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/purchase-orders/${purchaseOrderId}?includeItems=true`,
            {
              method: "GET",
              headers:
                createHeaders(),
              credentials:
                "include",
              cache:
                "no-store",
            },
          );

        const result =
          (await response
            .json()
            .catch(
              () => ({}),
            )) as PurchaseOrderApiResponse;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              result,
              `Failed to load purchase order (${response.status}).`,
            ),
          );
        }

        const extracted =
          extractPurchaseOrder(
            result,
          );

        if (!extracted) {
          throw new Error(
            "Purchase order data was not found in the API response.",
          );
        }

        setPurchaseOrder(
          extracted,
        );
      } catch (
        requestError
      ) {
        setPurchaseOrder(null);

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Failed to load purchase order.",
        );
      } finally {
        setLoading(false);
      }
    }, [purchaseOrderId]);

  useEffect(() => {
    void loadPurchaseOrder();
  }, [loadPurchaseOrder]);

  const items =
    useMemo(
      () =>
        Array.isArray(
          purchaseOrder?.items,
        )
          ? purchaseOrder.items
          : [],
      [purchaseOrder],
    );

  const supplierName =
    getEntityName(
      purchaseOrder?.supplier,
      purchaseOrder
        ?.supplierSnapshot
        ?.businessName ||
        "—",
    );

  const supplierId =
    getEntityId(
      purchaseOrder?.supplier,
    );

  const canReceive =
    [
      "approved",
      "ordered",
      "partially received",
    ].includes(
      String(
        purchaseOrder?.status ||
          "",
      )
        .trim()
        .toLowerCase(),
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[65vh] max-w-[1600px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading purchase order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    error ||
    !purchaseOrder
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Purchase Order Not Available
            </h1>

            <p className="mt-3 text-sm leading-6 text-red-700">
              {error ||
                "Purchase order could not be loaded."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void loadPurchaseOrder()
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Try Again
              </button>

              <Link
                href="/admin/supplier-and-purchase/purchase-orders"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Purchase Orders
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const orderNumber =
    purchaseOrder.purchaseOrderNumber ||
    purchaseOrder.poNumber ||
    purchaseOrder.orderNumber ||
    "Purchase Order";

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

          <Link
            href="/admin/supplier-and-purchase/purchase-orders"
            className="transition hover:text-orange-600"
          >
            Purchase Orders
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-800">
            {orderNumber}
          </span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Purchase Order
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {orderNumber}
              </h1>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                  purchaseOrder.status,
                )}`}
              >
                {purchaseOrder.status ||
                  "Unknown"}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Created{" "}
              {formatDateTime(
                purchaseOrder.createdAt,
              )}
              {" · "}
              Last updated{" "}
              {formatDateTime(
                purchaseOrder.updatedAt,
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/supplier-and-purchase/purchase-orders"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back
            </Link>

            <Link
              href={`/admin/supplier-and-purchase/purchase-orders/${purchaseOrder._id}/edit`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-300 bg-orange-50 px-5 text-sm font-bold text-orange-700 shadow-sm transition hover:bg-orange-100"
            >
              Edit Purchase Order
            </Link>

            {canReceive ? (
              <Link
                href={`/admin/supplier-and-purchase/goods-received/create?purchaseOrderId=${purchaseOrder._id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                Receive Goods
              </Link>
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Order Information
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem
                  label="Order Number"
                  value={orderNumber}
                />

                <InfoItem
                  label="Order Date"
                  value={formatDate(
                    purchaseOrder.orderDate,
                  )}
                />

                <InfoItem
                  label="Expected Delivery"
                  value={formatDate(
                    purchaseOrder.expectedDeliveryDate,
                  )}
                />

                <InfoItem
                  label="Actual Delivery"
                  value={formatDate(
                    purchaseOrder.actualDeliveryDate,
                  )}
                />

                <InfoItem
                  label="Priority"
                  value={
                    purchaseOrder.priority ||
                    "Normal"
                  }
                />

                <InfoItem
                  label="Source"
                  value={
                    purchaseOrder.source ||
                    "—"
                  }
                />

                <InfoItem
                  label="Reference"
                  value={
                    purchaseOrder.referenceNumber ||
                    "—"
                  }
                />

                <InfoItem
                  label="Supplier Invoice"
                  value={
                    purchaseOrder.supplierInvoiceNumber ||
                    "—"
                  }
                />

                <InfoItem
                  label="Currency"
                  value={
                    purchaseOrder.currency ||
                    "BDT"
                  }
                />

                <InfoItem
                  label="Exchange Rate"
                  value={
                    purchaseOrder.exchangeRate ||
                    1
                  }
                />

                <InfoItem
                  label="Payment Term"
                  value={
                    purchaseOrder.paymentTerm ||
                    "—"
                  }
                />

                <InfoItem
                  label="Payment Due"
                  value={formatDate(
                    purchaseOrder.paymentDueDate,
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Supplier Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Supplier snapshot captured when the purchase order was created.
                  </p>
                </div>

                {supplierId ? (
                  <Link
                    href={`/admin/supplier-and-purchase/suppliers/${supplierId}`}
                    className="text-sm font-bold text-orange-600 hover:text-orange-700"
                  >
                    View Supplier
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem
                  label="Supplier"
                  value={
                    supplierName
                  }
                />

                <InfoItem
                  label="Supplier Code"
                  value={
                    purchaseOrder
                      .supplierSnapshot
                      ?.supplierCode ||
                    (typeof purchaseOrder.supplier ===
                      "object"
                      ? purchaseOrder.supplier
                          ?.supplierCode
                      : "") ||
                    "—"
                  }
                />

                <InfoItem
                  label="Contact Person"
                  value={
                    purchaseOrder
                      .supplierSnapshot
                      ?.contactPerson ||
                    "—"
                  }
                />

                <InfoItem
                  label="Phone"
                  value={
                    purchaseOrder
                      .supplierSnapshot
                      ?.phone ||
                    (typeof purchaseOrder.supplier ===
                      "object"
                      ? purchaseOrder.supplier
                          ?.phone
                      : "") ||
                    "—"
                  }
                />

                <InfoItem
                  label="Email"
                  value={
                    purchaseOrder
                      .supplierSnapshot
                      ?.email ||
                    (typeof purchaseOrder.supplier ===
                      "object"
                      ? purchaseOrder.supplier
                          ?.email
                      : "") ||
                    "—"
                  }
                />

                <InfoItem
                  label="Supplier Currency"
                  value={
                    purchaseOrder
                      .supplierSnapshot
                      ?.currency ||
                    purchaseOrder.currency ||
                    "BDT"
                  }
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Purchase Order Items
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {items.length} item
                  {items.length === 1
                    ? ""
                    : "s"}{" "}
                  in this purchase order.
                </p>
              </div>

              {items.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No purchase order items were returned by the API.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          #
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Product
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Ordered
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Received
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Pending
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Unit Cost
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Discount
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Tax
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Line Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map(
                        (
                          item,
                          index,
                        ) => {
                          const ordered =
                            toSafeNumber(
                              item.orderedQuantity ??
                                item.quantity,
                            );

                          const received =
                            toSafeNumber(
                              item.receivedQuantity,
                            );

                          const pending =
                            item.pendingQuantity !==
                            undefined
                              ? toSafeNumber(
                                  item.pendingQuantity,
                                )
                              : Math.max(
                                  0,
                                  ordered -
                                    received,
                                );

                          const unitCost =
                            toSafeNumber(
                              item.unitCost ??
                                item.unitPrice,
                            );

                          const discount =
                            toSafeNumber(
                              item.discountAmount,
                            );

                          const tax =
                            toSafeNumber(
                              item.taxAmount,
                            );

                          const lineTotal =
                            toSafeNumber(
                              item.lineTotal ??
                                item.total ??
                                item.subtotal ??
                                ordered *
                                  unitCost -
                                  discount +
                                  tax,
                            );

                          return (
                            <tr
                              key={
                                item._id ||
                                item.id ||
                                `${index}`
                              }
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-slate-900">
                                  {getProductName(
                                    item,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  SKU:{" "}
                                  {getProductSku(
                                    item,
                                  )}
                                </p>

                                {item.description ? (
                                  <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                                    {
                                      item.description
                                    }
                                  </p>
                                ) : null}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                                {ordered.toLocaleString(
                                  "en-BD",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                                {received.toLocaleString(
                                  "en-BD",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-amber-700">
                                {pending.toLocaleString(
                                  "en-BD",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                                {formatMoney(
                                  unitCost,
                                  purchaseOrder.currency ||
                                    "BDT",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-red-600">
                                {formatMoney(
                                  discount,
                                  purchaseOrder.currency ||
                                    "BDT",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                                {formatMoney(
                                  tax,
                                  purchaseOrder.currency ||
                                    "BDT",
                                )}
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-black text-slate-900">
                                {formatMoney(
                                  lineTotal,
                                  purchaseOrder.currency ||
                                    "BDT",
                                )}
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

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Delivery Address
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {getAddressText(
                    purchaseOrder.deliveryAddress,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Notes
                </h2>

                <div className="mt-4 space-y-4">
                  <InfoItem
                    label="Internal Note"
                    value={
                      purchaseOrder.internalNote ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Supplier Note"
                    value={
                      purchaseOrder.supplierNote ||
                      "—"
                    }
                  />

                  <InfoItem
                    label="Terms & Conditions"
                    value={
                      purchaseOrder.termsAndConditions ||
                      "—"
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Status History
              </h2>

              {!purchaseOrder
                .statusHistory
                ?.length ? (
                <p className="mt-4 text-sm text-slate-500">
                  No status history is available.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {purchaseOrder.statusHistory.map(
                    (
                      history,
                      index,
                    ) => (
                      <div
                        key={
                          history._id ||
                          `${index}`
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row">
                          <p className="text-sm font-bold text-slate-900">
                            {history.fromStatus ||
                              "—"}
                            {" → "}
                            {history.toStatus ||
                              "—"}
                          </p>

                          <p className="text-xs font-semibold text-slate-500">
                            {formatDateTime(
                              history.changedAt,
                            )}
                          </p>
                        </div>

                        {history.note ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {history.note}
                          </p>
                        ) : null}

                        {history.reason ? (
                          <p className="mt-2 text-sm text-red-700">
                            Reason:{" "}
                            {history.reason}
                          </p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Financial Summary
              </h2>

              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(
                    purchaseOrder.subtotal,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Discount"
                  value={`-${formatMoney(
                    purchaseOrder.discountAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}`}
                />

                <SummaryRow
                  label="Tax"
                  value={formatMoney(
                    purchaseOrder.taxAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Shipping"
                  value={formatMoney(
                    purchaseOrder.shippingAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Other Charges"
                  value={formatMoney(
                    purchaseOrder.otherChargeAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Adjustment"
                  value={formatMoney(
                    purchaseOrder.adjustmentAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Grand Total"
                  value={formatMoney(
                    purchaseOrder.grandTotal,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                  emphasis
                />

                <SummaryRow
                  label="Paid"
                  value={formatMoney(
                    purchaseOrder.paidAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />

                <SummaryRow
                  label="Due"
                  value={formatMoney(
                    purchaseOrder.dueAmount,
                    purchaseOrder.currency ||
                      "BDT",
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Receiving Summary
              </h2>

              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Ordered Quantity"
                  value={toSafeNumber(
                    purchaseOrder
                      .receivingSummary
                      ?.totalOrderedQuantity ??
                      purchaseOrder.totalOrderedQuantity,
                  ).toLocaleString(
                    "en-BD",
                  )}
                />

                <SummaryRow
                  label="Received Quantity"
                  value={toSafeNumber(
                    purchaseOrder
                      .receivingSummary
                      ?.totalReceivedQuantity,
                  ).toLocaleString(
                    "en-BD",
                  )}
                />

                <SummaryRow
                  label="Rejected Quantity"
                  value={toSafeNumber(
                    purchaseOrder
                      .receivingSummary
                      ?.totalRejectedQuantity,
                  ).toLocaleString(
                    "en-BD",
                  )}
                />

                <SummaryRow
                  label="Pending Quantity"
                  value={toSafeNumber(
                    purchaseOrder
                      .receivingSummary
                      ?.totalPendingQuantity,
                  ).toLocaleString(
                    "en-BD",
                  )}
                />

                <SummaryRow
                  label="First Received"
                  value={formatDateTime(
                    purchaseOrder
                      .receivingSummary
                      ?.firstReceivedAt,
                  )}
                />

                <SummaryRow
                  label="Last Received"
                  value={formatDateTime(
                    purchaseOrder
                      .receivingSummary
                      ?.lastReceivedAt,
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Approval
              </h2>

              <div className="mt-5 space-y-4">
                <InfoItem
                  label="Approved At"
                  value={formatDateTime(
                    purchaseOrder
                      .approval
                      ?.approvedAt,
                  )}
                />

                <InfoItem
                  label="Rejected At"
                  value={formatDateTime(
                    purchaseOrder
                      .approval
                      ?.rejectedAt,
                  )}
                />

                <InfoItem
                  label="Rejection Reason"
                  value={
                    purchaseOrder
                      .approval
                      ?.rejectionReason ||
                    "—"
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Audit Information
              </h2>

              <div className="mt-5 space-y-4">
                <InfoItem
                  label="Created By"
                  value={getEntityName(
                    purchaseOrder.createdBy,
                    "—",
                  )}
                />

                <InfoItem
                  label="Created At"
                  value={formatDateTime(
                    purchaseOrder.createdAt,
                  )}
                />

                <InfoItem
                  label="Updated By"
                  value={getEntityName(
                    purchaseOrder.updatedBy,
                    "—",
                  )}
                />

                <InfoItem
                  label="Updated At"
                  value={formatDateTime(
                    purchaseOrder.updatedAt,
                  )}
                />
              </div>
            </section>

            <button
              type="button"
              onClick={() =>
                router.refresh()
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Refresh Purchase Order
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}