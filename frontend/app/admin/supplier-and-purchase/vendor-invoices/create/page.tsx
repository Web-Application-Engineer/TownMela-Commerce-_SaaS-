"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

/* =========================================================
   TYPES
========================================================= */

interface Supplier {
  _id: string;
  supplierCode?: string;
  code?: string;
  businessName?: string;
  displayName?: string;
  name?: string;
  supplierName?: string;
  supplierType?: string;
  email?: string;
  phone?: string;
  currency?: string;
  status?: string;
  isDeleted?: boolean;
}

interface PurchaseOrder {
  _id: string;
  purchaseOrderNumber?: string;
  poNumber?: string;
  supplier?: string | Supplier;
  status?: string;
  currency?: string;
  grandTotal?: number;
  totalAmount?: number;
}

interface GoodsReceived {
  _id: string;
  goodsReceivedNumber?: string;
  grnNumber?: string;
  receiptNumber?: string;
  purchaseOrder?: string | PurchaseOrder;
  status?: string;
}

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
}

interface CreateVendorInvoicePayload {
  supplier: string;
  supplierId: string;
  purchaseOrder?: string;
  purchaseOrderId?: string;
  goodsReceived?: string;
  goodsReceivedId?: string;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  notes?: string;
  items: Array<{
    productId?: string;
    productName?: string;
    description?: string;
    invoicedQuantity: number;
    invoiceQuantity: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountAmount: number;
  }>;
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
  ]);

const getTenantId = (): string =>
  getStorageValue([
    "tenantId",
    "tenant_id",
    "activeTenantId",
  ]);

const createEmptyItem = (): InvoiceItem => ({
  id:
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  productId: "",
  productName: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
  taxRate: "0",
  discountAmount: "0",
});

const parseNumber = (
  value: string
): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatMoney = (
  value: number,
  currency = "BDT"
): string => {
  try {
    return new Intl.NumberFormat(
      "en-BD",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(value);
  } catch {
    return `৳${value.toLocaleString(
      "en-BD"
    )}`;
  }
};

const getSupplierName = (supplier: Supplier): string =>
  supplier.displayName ||
  supplier.businessName ||
  supplier.name ||
  supplier.supplierName ||
  "Unnamed supplier";

const getPurchaseOrderNumber = (
  purchaseOrder: PurchaseOrder
): string =>
  purchaseOrder.purchaseOrderNumber ||
  purchaseOrder.poNumber ||
  "Purchase Order";

const getGoodsReceivedNumber = (
  goodsReceived: GoodsReceived
): string =>
  goodsReceived.goodsReceivedNumber ||
  goodsReceived.grnNumber ||
  goodsReceived.receiptNumber ||
  "Goods Received";

const extractArray = <T,>(
  result: unknown,
  keys: string[]
): T[] => {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    return [];
  }

  const record =
    result as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (
    record.data &&
    typeof record.data === "object"
  ) {
    const data =
      record.data as Record<
        string,
        unknown
      >;

    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key] as T[];
      }
    }
  }

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
};

/* =========================================================
   PAGE
========================================================= */

export default function CreateVendorInvoicePage() {
  const router = useRouter();

  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>([]);

  const [
    purchaseOrders,
    setPurchaseOrders,
  ] = useState<PurchaseOrder[]>([]);

  const [
    goodsReceivedList,
    setGoodsReceivedList,
  ] = useState<GoodsReceived[]>([]);

  const [
    supplierId,
    setSupplierId,
  ] = useState("");

  const [
    purchaseOrderId,
    setPurchaseOrderId,
  ] = useState("");

  const [
    goodsReceivedId,
    setGoodsReceivedId,
  ] = useState("");

  const [
    supplierInvoiceNumber,
    setSupplierInvoiceNumber,
  ] = useState("");

  const [
    invoiceDate,
    setInvoiceDate,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 10)
  );

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    currency,
    setCurrency,
  ] = useState("BDT");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    items,
    setItems,
  ] = useState<InvoiceItem[]>([
    createEmptyItem(),
  ]);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    optionWarnings,
    setOptionWarnings,
  ] = useState<string[]>([]);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /* =========================================================
     LOAD FORM OPTIONS
  ========================================================= */

  const loadOptions =
    useCallback(async () => {
      try {
        setLoadingOptions(true);
        setError("");
        setOptionWarnings([]);

        const token = getAccessToken();
        const tenantId = getTenantId();

        const headers = new Headers();
        headers.set("Accept", "application/json");

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        if (tenantId) {
          headers.set("X-Tenant-Id", tenantId);
        }

        const requestOptions: RequestInit = {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        };

        const results = await Promise.allSettled([
          fetch(
            `${API_URL}/api/suppliers?limit=100`,
            requestOptions
          ),
          fetch(
            `${API_URL}/api/purchase-orders?limit=100`,
            requestOptions
          ),
          fetch(
            `${API_URL}/api/goods-received?limit=100`,
            requestOptions
          ),
        ]);

        const warnings: string[] = [];

        const supplierResponse =
          results[0].status === "fulfilled"
            ? results[0].value
            : null;

        if (!supplierResponse) {
          throw new Error(
            "Unable to connect to the supplier service."
          );
        }

        const supplierResult = await supplierResponse
          .json()
          .catch(() => ({}));

        if (!supplierResponse.ok) {
          throw new Error(
            (supplierResult as { message?: string }).message ||
              `Failed to load suppliers (${supplierResponse.status}).`
          );
        }

        const supplierList = extractArray<Supplier>(
          supplierResult,
          ["suppliers", "results", "items"]
        );

        setSuppliers(
          supplierList.filter((supplier) => {
            const normalizedStatus = String(
              supplier.status || ""
            )
              .trim()
              .toLowerCase();

            return (
              supplier.isDeleted !== true &&
              normalizedStatus !== "inactive" &&
              normalizedStatus !== "disabled"
            );
          })
        );

        const purchaseOrderResponse =
          results[1].status === "fulfilled"
            ? results[1].value
            : null;

        if (purchaseOrderResponse) {
          const purchaseOrderResult =
            await purchaseOrderResponse
              .json()
              .catch(() => ({}));

          if (purchaseOrderResponse.ok) {
            setPurchaseOrders(
              extractArray<PurchaseOrder>(
                purchaseOrderResult,
                [
                  "purchaseOrders",
                  "orders",
                  "results",
                  "items",
                ]
              )
            );
          } else {
            setPurchaseOrders([]);
            warnings.push(
              (purchaseOrderResult as { message?: string })
                .message ||
                "Purchase orders could not be loaded."
            );
          }
        } else {
          setPurchaseOrders([]);
          warnings.push(
            "Purchase orders could not be loaded."
          );
        }

        const goodsReceivedResponse =
          results[2].status === "fulfilled"
            ? results[2].value
            : null;

        if (goodsReceivedResponse) {
          const goodsReceivedResult =
            await goodsReceivedResponse
              .json()
              .catch(() => ({}));

          if (goodsReceivedResponse.ok) {
            setGoodsReceivedList(
              extractArray<GoodsReceived>(
                goodsReceivedResult,
                [
                  "goodsReceived",
                  "goodsReceivedList",
                  "receipts",
                  "results",
                  "items",
                ]
              )
            );
          } else {
            setGoodsReceivedList([]);

            if (goodsReceivedResponse.status !== 404) {
              warnings.push(
                (goodsReceivedResult as { message?: string })
                  .message ||
                  "Goods received records could not be loaded."
              );
            }
          }
        } else {
          setGoodsReceivedList([]);
        }

        setOptionWarnings(warnings);
      } catch (requestError) {
        setSuppliers([]);
        setPurchaseOrders([]);
        setGoodsReceivedList([]);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load form options."
        );
      } finally {
        setLoadingOptions(false);
      }
    }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  /* =========================================================
     FILTERED OPTIONS
  ========================================================= */

  const filteredPurchaseOrders =
    useMemo(() => {
      if (!supplierId) {
        return purchaseOrders;
      }

      return purchaseOrders.filter(
        (purchaseOrder) => {
          const purchaseOrderSupplier =
            purchaseOrder.supplier;

          if (
            typeof purchaseOrderSupplier ===
            "string"
          ) {
            return (
              purchaseOrderSupplier ===
              supplierId
            );
          }

          return (
            purchaseOrderSupplier?._id ===
            supplierId
          );
        }
      );
    }, [
      purchaseOrders,
      supplierId,
    ]);

  const filteredGoodsReceived =
    useMemo(() => {
      if (!purchaseOrderId) {
        return goodsReceivedList;
      }

      return goodsReceivedList.filter(
        (goodsReceived) => {
          const purchaseOrder =
            goodsReceived.purchaseOrder;

          if (
            typeof purchaseOrder ===
            "string"
          ) {
            return (
              purchaseOrder ===
              purchaseOrderId
            );
          }

          return (
            purchaseOrder?._id ===
            purchaseOrderId
          );
        }
      );
    }, [
      goodsReceivedList,
      purchaseOrderId,
    ]);

  /* =========================================================
     CALCULATIONS
  ========================================================= */

  const totals = useMemo(() => {
    return items.reduce(
      (
        currentTotals,
        item
      ) => {
        const quantity =
          parseNumber(item.quantity);

        const unitPrice =
          parseNumber(item.unitPrice);

        const discount =
          parseNumber(
            item.discountAmount
          );

        const taxRate =
          parseNumber(item.taxRate);

        const grossAmount =
          quantity * unitPrice;

        const taxableAmount =
          Math.max(
            0,
            grossAmount - discount
          );

        const taxAmount =
          taxableAmount *
          (taxRate / 100);

        const lineTotal =
          taxableAmount + taxAmount;

        currentTotals.subtotal +=
          grossAmount;

        currentTotals.discount +=
          discount;

        currentTotals.tax +=
          taxAmount;

        currentTotals.grandTotal +=
          lineTotal;

        return currentTotals;
      },
      {
        subtotal: 0,
        discount: 0,
        tax: 0,
        grandTotal: 0,
      }
    );
  }, [items]);

  /* =========================================================
     ITEM ACTIONS
  ========================================================= */

  const updateItem = (
    itemId: string,
    field: keyof Omit<
      InvoiceItem,
      "id"
    >,
    value: string
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(),
    ]);
  };

  const removeItem = (
    itemId: string
  ) => {
    setItems((currentItems) => {
      if (
        currentItems.length === 1
      ) {
        return currentItems;
      }

      return currentItems.filter(
        (item) =>
          item.id !== itemId
      );
    });
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateForm =
    (): string => {
      if (!supplierId) {
        return "Please select a supplier.";
      }

      if (
        !supplierInvoiceNumber.trim()
      ) {
        return "Supplier invoice number is required.";
      }

      if (!invoiceDate) {
        return "Invoice date is required.";
      }

      if (!dueDate) {
        return "Due date is required.";
      }

      if (
        new Date(dueDate) <
        new Date(invoiceDate)
      ) {
        return "Due date cannot be earlier than invoice date.";
      }

      if (items.length === 0) {
        return "At least one invoice item is required.";
      }

      for (
        let index = 0;
        index < items.length;
        index += 1
      ) {
        const item =
          items[index];

        if (
          !item.productName.trim() &&
          !item.description.trim()
        ) {
          return `Item ${
            index + 1
          }: Product name or description is required.`;
        }

        if (
          parseNumber(
            item.quantity
          ) <= 0
        ) {
          return `Item ${
            index + 1
          }: Quantity must be greater than zero.`;
        }

        if (
          parseNumber(
            item.unitPrice
          ) < 0
        ) {
          return `Item ${
            index + 1
          }: Unit price cannot be negative.`;
        }

        if (
          parseNumber(
            item.taxRate
          ) < 0
        ) {
          return `Item ${
            index + 1
          }: Tax rate cannot be negative.`;
        }

        if (
          parseNumber(
            item.discountAmount
          ) < 0
        ) {
          return `Item ${
            index + 1
          }: Discount cannot be negative.`;
        }
      }

      return "";
    };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const token =
        getAccessToken();

      const tenantId =
        getTenantId();

      const payload: CreateVendorInvoicePayload =
        {
          supplier: supplierId,
          supplierId,
          supplierInvoiceNumber:
            supplierInvoiceNumber.trim(),
          invoiceDate,
          dueDate,
          currency,
          notes:
            notes.trim() ||
            undefined,
          items: items.map(
            (item) => ({
              productId:
                item.productId ||
                undefined,

              productName:
                item.productName.trim() ||
                undefined,

              description:
                item.description.trim() ||
                undefined,

              invoicedQuantity:
                parseNumber(
                  item.quantity
                ),

              invoiceQuantity:
                parseNumber(
                  item.quantity
                ),

              quantity:
                parseNumber(
                  item.quantity
                ),

              unitPrice:
                parseNumber(
                  item.unitPrice
                ),

              taxRate:
                parseNumber(
                  item.taxRate
                ),

              discountAmount:
                parseNumber(
                  item.discountAmount
                ),
            })
          ),
        };

      if (purchaseOrderId) {
        payload.purchaseOrder =
          purchaseOrderId;
        payload.purchaseOrderId =
          purchaseOrderId;
      }

      if (goodsReceivedId) {
        payload.goodsReceived =
          goodsReceivedId;
        payload.goodsReceivedId =
          goodsReceivedId;
      }

      if (
        !payload.supplier ||
        !payload.supplierId
      ) {
        throw new Error(
          "Supplier selection was not included in the request payload."
        );
      }

      // Helpful during integration testing. Remove after the API contract is stable.
      console.debug(
        "Create vendor invoice payload:",
        payload
      );

      const headers =
        new Headers();

      headers.set(
        "Content-Type",
        "application/json"
      );

      headers.set(
        "Accept",
        "application/json"
      );

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

      const response =
        await fetch(
          `${API_URL}/api/vendor-invoices`,
          {
            method: "POST",
            headers,
            credentials:
              "include",
            body: JSON.stringify(
              payload
            ),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        const validationErrors =
          Array.isArray(
            result.errors
          )
            ? result.errors
                .map(
                  (
                    item: {
                      message?: string;
                    }
                  ) =>
                    item.message
                )
                .filter(Boolean)
                .join(", ")
            : "";

        throw new Error(
          validationErrors ||
            result.message ||
            result.error ||
            result.code ||
            `Failed to create vendor invoice (${response.status}).`
        );
      }

      setSuccessMessage(
        "Vendor invoice created successfully."
      );

      const createdInvoiceId =
        result.data?._id ||
        result.data?.vendorInvoice?._id ||
        result.vendorInvoice?._id ||
        result._id;

      window.setTimeout(() => {
        if (createdInvoiceId) {
          router.push(
            `/admin/supplier-and-purchase/vendor-invoices/${createdInvoiceId}`
          );
        } else {
          router.push(
            "/admin/supplier-and-purchase/vendor-invoices"
          );
        }

        router.refresh();
      }, 700);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create vendor invoice."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
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
            Create
          </span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Accounts Payable
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Vendor Invoice
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Record a supplier invoice and
              connect it with the relevant
              purchase order and goods received
              record.
            </p>
          </div>

          <Link
            href="/admin/supplier-and-purchase/vendor-invoices"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Invoices
          </Link>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        {optionWarnings.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Some optional references are unavailable:
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5">
              {optionWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Basic Information */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Invoice Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add supplier, invoice number and
                invoice dates.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Supplier" required>
                <select
                  value={supplierId}
                  disabled={loadingOptions}
                  onChange={(event) => {
                    const selectedSupplierId =
                      event.target.value;

                    setSupplierId(
                      selectedSupplierId
                    );
                    setError("");
                    setPurchaseOrderId("");
                    setGoodsReceivedId("");

                    const selectedSupplier =
                      suppliers.find(
                        (supplier) =>
                          supplier._id ===
                          selectedSupplierId
                      );

                    if (selectedSupplier?.currency) {
                      setCurrency(
                        selectedSupplier.currency
                      );
                    }
                  }}
                  className={inputClassName}
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading suppliers..."
                      : "Select supplier"}
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier._id}
                        value={supplier._id}
                      >
                        {getSupplierName(
                          supplier
                        )}
                        {supplier.supplierCode ||
                        supplier.code
                          ? ` — ${
                              supplier.supplierCode ||
                              supplier.code
                            }`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Supplier Invoice Number"
                required
              >
                <input
                  type="text"
                  value={
                    supplierInvoiceNumber
                  }
                  onChange={(event) => {
                    setSupplierInvoiceNumber(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Example: INV-2026-001"
                  className={inputClassName}
                />
              </Field>

              <Field label="Currency">
                <select
                  value={currency}
                  onChange={(event) =>
                    setCurrency(
                      event.target.value
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
                label="Invoice Date"
                required
              >
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => {
                    setInvoiceDate(
                      event.target.value
                    );
                    setError("");
                  }}
                  className={inputClassName}
                />
              </Field>

              <Field label="Due Date" required>
                <input
                  type="date"
                  value={dueDate}
                  min={invoiceDate}
                  onChange={(event) => {
                    setDueDate(
                      event.target.value
                    );
                    setError("");
                  }}
                  className={inputClassName}
                />
              </Field>
            </div>
          </section>

          {/* Reference Information */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Purchase References
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                These references support
                three-way invoice matching.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Purchase Order">
                <select
                  value={purchaseOrderId}
                  disabled={!supplierId}
                  onChange={(event) => {
                    setPurchaseOrderId(
                      event.target.value
                    );
                    setGoodsReceivedId("");
                  }}
                  className={inputClassName}
                >
                  <option value="">
                    No purchase order selected
                  </option>

                  {filteredPurchaseOrders.map(
                    (purchaseOrder) => (
                      <option
                        key={
                          purchaseOrder._id
                        }
                        value={
                          purchaseOrder._id
                        }
                      >
                        {getPurchaseOrderNumber(
                          purchaseOrder
                        )}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Goods Received">
                <select
                  value={goodsReceivedId}
                  disabled={!purchaseOrderId}
                  onChange={(event) =>
                    setGoodsReceivedId(
                      event.target.value
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    No goods received selected
                  </option>

                  {filteredGoodsReceived.map(
                    (goodsReceived) => (
                      <option
                        key={goodsReceived._id}
                        value={
                          goodsReceived._id
                        }
                      >
                        {getGoodsReceivedNumber(
                          goodsReceived
                        )}
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>
          </section>

          {/* Invoice Items */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Invoice Items
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add product quantity, price,
                  discount and tax information.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
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
                      Tax %
                    </TableHeading>

                    <TableHeading align="right">
                      Line Total
                    </TableHeading>

                    <TableHeading align="right">
                      Action
                    </TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map(
                    (item, index) => {
                      const quantity =
                        parseNumber(
                          item.quantity
                        );

                      const unitPrice =
                        parseNumber(
                          item.unitPrice
                        );

                      const discount =
                        parseNumber(
                          item.discountAmount
                        );

                      const taxableAmount =
                        Math.max(
                          0,
                          quantity *
                            unitPrice -
                            discount
                        );

                      const taxAmount =
                        taxableAmount *
                        (parseNumber(
                          item.taxRate
                        ) /
                          100);

                      const lineTotal =
                        taxableAmount +
                        taxAmount;

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={
                                item.productName
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "productName",
                                  event.target
                                    .value
                                )
                              }
                              placeholder={`Item ${
                                index + 1
                              }`}
                              className={tableInputClassName}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={
                                item.description
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "description",
                                  event.target
                                    .value
                                )
                              }
                              placeholder="Description"
                              className={tableInputClassName}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0.0001"
                              step="0.0001"
                              value={
                                item.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  event.target
                                    .value
                                )
                              }
                              className={`${tableInputClassName} text-right`}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitPrice
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "unitPrice",
                                  event.target
                                    .value
                                )
                              }
                              className={`${tableInputClassName} text-right`}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.discountAmount
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "discountAmount",
                                  event.target
                                    .value
                                )
                              }
                              className={`${tableInputClassName} text-right`}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.taxRate
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  item.id,
                                  "taxRate",
                                  event.target
                                    .value
                                )
                              }
                              className={`${tableInputClassName} text-right`}
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-slate-900">
                            {formatMoney(
                              lineTotal,
                              currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              disabled={
                                items.length ===
                                1
                              }
                              onClick={() =>
                                removeItem(
                                  item.id
                                )
                              }
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Notes and Summary */}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={7}
                  placeholder="Invoice remarks, payment instructions or internal notes..."
                  className={`${inputClassName} min-h-40 py-3`}
                />
              </Field>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Invoice Summary
              </h2>

              <div className="mt-5 space-y-4">
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(
                    totals.subtotal,
                    currency
                  )}
                />

                <SummaryRow
                  label="Discount"
                  value={`- ${formatMoney(
                    totals.discount,
                    currency
                  )}`}
                />

                <SummaryRow
                  label="Tax"
                  value={formatMoney(
                    totals.tax,
                    currency
                  )}
                />

                <div className="border-t border-slate-200 pt-4">
                  <SummaryRow
                    label="Grand Total"
                    value={formatMoney(
                      totals.grandTotal,
                      currency
                    )}
                    strong
                  />
                </div>
              </div>
            </aside>
          </section>

          {/* Actions */}

          <footer className="flex flex-col-reverse justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row">
            <Link
              href="/admin/supplier-and-purchase/vendor-invoices"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingOptions
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Creating Invoice..."
                : "Create Vendor Invoice"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const tableInputClassName =
  "h-10 w-full min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

function Field({
  label,
  required = false,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
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
      className={`whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  strong?: boolean;
}

function SummaryRow({
  label,
  value,
  strong = false,
}: SummaryRowProps) {
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
            ? "text-xl font-bold text-slate-900"
            : "text-sm font-semibold text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}