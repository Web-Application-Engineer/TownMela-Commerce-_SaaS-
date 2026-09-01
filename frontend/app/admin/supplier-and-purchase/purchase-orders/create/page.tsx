"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   API CONFIGURATION
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
  _id: string;
  supplierCode?: string;
  businessName?: string;
  displayName?: string;
  name?: string;
  currency?: string;
  paymentTerm?: string;
  status?: string;
  isActive?: boolean;
}

interface Product {
  _id: string;
  name?: string;
  productName?: string;
  title?: string;
  sku?: string;
  productCode?: string;
  costPrice?: number;
  purchasePrice?: number;
  price?: number;
  status?: string;
  isActive?: boolean;
}

type DiscountType = "None" | "Percentage" | "Fixed";
type TaxType = "None" | "Percentage" | "Fixed";

interface PurchaseOrderItem {
  id: string;
  product: string;
  variant: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  unitCost: number;
  discountType: DiscountType;
  discountValue: number;
  taxType: TaxType;
  taxValue: number;
  expectedDeliveryDate: string;
  note: string;
}

interface DeliveryAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  area: string;
  district: string;
  division: string;
  postalCode: string;
  country: string;
}

interface PurchaseOrderForm {
  supplier: string;
  orderDate: string;
  expectedDeliveryDate: string;
  referenceNumber: string;
  supplierInvoiceNumber: string;
  source: string;
  priority: string;
  currency: string;
  exchangeRate: number;
  discountType: DiscountType;
  discountValue: number;
  taxAmount: number;
  shippingAmount: number;
  otherChargeAmount: number;
  adjustmentAmount: number;
  paymentTerm: string;
  paymentDueDate: string;
  internalNote: string;
  supplierNote: string;
  termsAndConditions: string;
  deliveryAddress: DeliveryAddress;
}

interface ValidationError {
  field?: string;
  message?: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: ValidationError[];
  purchaseOrder?: {
    _id?: string;
    purchaseOrderNumber?: string;
    poNumber?: string;
  };
  data?: {
    _id?: string;
    purchaseOrderNumber?: string;
    poNumber?: string;
  };
}

/* =========================================================
   STORAGE HELPERS
========================================================= */

const getStorageValue = (keys: string[]): string => {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value?.trim()) return value.trim();
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

const createHeaders = (includeJson = false): Headers => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  const tenantId = getTenantId();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  return headers;
};

const ensureRequestContext = (): void => {
  if (!getAccessToken()) {
    throw new Error(
      "Your admin session has expired. Please log in again.",
    );
  }

  if (!getTenantId()) {
    throw new Error(
      "Tenant context is missing. Please log out and sign in again.",
    );
  }
};

/* =========================================================
   DATE HELPERS
========================================================= */

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getToday = (): string => toDateInputValue(new Date());

const getDefaultDeliveryDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateInputValue(date);
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const createItemId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createEmptyItem = (
  expectedDeliveryDate = getDefaultDeliveryDate(),
): PurchaseOrderItem => ({
  id: createItemId(),
  product: "",
  variant: "",
  productName: "",
  sku: "",
  orderedQuantity: 1,
  unitCost: 0,
  discountType: "None",
  discountValue: 0,
  taxType: "None",
  taxValue: 0,
  expectedDeliveryDate,
  note: "",
});

const initialForm: PurchaseOrderForm = {
  supplier: "",
  orderDate: getToday(),
  expectedDeliveryDate: getDefaultDeliveryDate(),
  referenceNumber: "",
  supplierInvoiceNumber: "",
  source: "",
  priority: "",
  currency: "BDT",
  exchangeRate: 1,
  discountType: "None",
  discountValue: 0,
  taxAmount: 0,
  shippingAmount: 0,
  otherChargeAmount: 0,
  adjustmentAmount: 0,
  paymentTerm: "Immediate",
  paymentDueDate: "",
  internalNote: "",
  supplierNote: "",
  termsAndConditions: "",
  deliveryAddress: {
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    area: "",
    district: "",
    division: "",
    postalCode: "",
    country: "Bangladesh",
  },
};

const toSafeNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const extractArray = <T,>(result: unknown, keys: string[]): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (!result || typeof result !== "object") return [];

  const record = result as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(nested[key])) {
        return nested[key] as T[];
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

const removeUndefined = <T extends Record<string, unknown>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
};

const getSupplierName = (supplier: Supplier): string =>
  supplier.displayName ||
  supplier.businessName ||
  supplier.name ||
  supplier.supplierCode ||
  "Unnamed Supplier";

const getProductName = (product: Product): string =>
  product.productName ||
  product.name ||
  product.title ||
  product.sku ||
  product.productCode ||
  "Unnamed Product";

const getProductSku = (product: Product): string =>
  product.sku || product.productCode || "";

const getProductCost = (product: Product): number =>
  Math.max(
    0,
    toSafeNumber(
      product.purchasePrice ?? product.costPrice ?? product.price ?? 0,
    ),
  );

const getApiErrorMessage = (
  result: ApiResponse,
  fallback: string,
): string => {
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    const detailedMessage = result.errors
      .map((item) => {
        const message = item.message?.trim();
        if (!message) return "";

        return item.field ? `${item.field}: ${message}` : message;
      })
      .filter(Boolean)
      .join(" | ");

    if (detailedMessage) return detailedMessage;
  }

  return result.message || fallback;
};

const formatMoney = (value: number, currency = "BDT"): string => {
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function CreatePurchaseOrderPage() {
  const router = useRouter();

  const [form, setForm] = useState<PurchaseOrderForm>(initialForm);
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    createEmptyItem(initialForm.expectedDeliveryDate),
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* =======================================================
     LOAD SUPPLIERS AND PRODUCTS
  ======================================================= */

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setError("");

      ensureRequestContext();

      const [supplierResponse, productResponse] = await Promise.all([
        fetch(`${API_URL}/api/suppliers?limit=100`, {
          method: "GET",
          headers: createHeaders(),
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/products?limit=100`, {
          method: "GET",
          headers: createHeaders(),
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const [supplierResult, productResult] = await Promise.all([
        supplierResponse.json().catch(() => ({})),
        productResponse.json().catch(() => ({})),
      ]);

      if (!supplierResponse.ok) {
        throw new Error(
          getApiErrorMessage(
            supplierResult as ApiResponse,
            `Failed to load suppliers (${supplierResponse.status}).`,
          ),
        );
      }

      if (!productResponse.ok) {
        throw new Error(
          getApiErrorMessage(
            productResult as ApiResponse,
            `Failed to load products (${productResponse.status}).`,
          ),
        );
      }

      const supplierList = extractArray<Supplier>(supplierResult, [
        "suppliers",
        "results",
        "items",
      ]);

      const productList = extractArray<Product>(productResult, [
        "products",
        "results",
        "items",
      ]);

      setSuppliers(
        supplierList.filter(
          (supplier) =>
            supplier.isActive !== false &&
            String(supplier.status || "").toLowerCase() !== "inactive",
        ),
      );

      setProducts(
        productList.filter(
          (product) =>
            product.isActive !== false &&
            String(product.status || "").toLowerCase() !== "inactive",
        ),
      );
    } catch (requestError) {
      setSuppliers([]);
      setProducts([]);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load purchase order options.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  /* =======================================================
     TOTAL CALCULATIONS
  ======================================================= */

  const totals = useMemo(() => {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let itemTaxTotal = 0;

    for (const item of items) {
      const quantity = Math.max(0, toSafeNumber(item.orderedQuantity));
      const unitCost = Math.max(0, toSafeNumber(item.unitCost));
      const lineSubtotal = quantity * unitCost;

      const discountValue = Math.max(0, toSafeNumber(item.discountValue));

      const itemDiscount =
        item.discountType === "Percentage"
          ? lineSubtotal * (discountValue / 100)
          : item.discountType === "Fixed"
            ? discountValue
            : 0;

      const taxableAmount = Math.max(0, lineSubtotal - itemDiscount);
      const taxValue = Math.max(0, toSafeNumber(item.taxValue));

      const itemTax =
        item.taxType === "Percentage"
          ? taxableAmount * (taxValue / 100)
          : item.taxType === "Fixed"
            ? taxValue
            : 0;

      subtotal += lineSubtotal;
      itemDiscountTotal += itemDiscount;
      itemTaxTotal += itemTax;
    }

    const orderDiscountValue = Math.max(
      0,
      toSafeNumber(form.discountValue),
    );

    const orderDiscount =
      form.discountType === "Percentage"
        ? subtotal * (orderDiscountValue / 100)
        : form.discountType === "Fixed"
          ? orderDiscountValue
          : 0;

    const extraTax = Math.max(0, toSafeNumber(form.taxAmount));
    const shipping = Math.max(0, toSafeNumber(form.shippingAmount));
    const otherCharge = Math.max(0, toSafeNumber(form.otherChargeAmount));
    const adjustment = toSafeNumber(form.adjustmentAmount);

    const grandTotal =
      subtotal -
      itemDiscountTotal -
      orderDiscount +
      itemTaxTotal +
      extraTax +
      shipping +
      otherCharge +
      adjustment;

    return {
      subtotal: roundMoney(subtotal),
      itemDiscountTotal: roundMoney(itemDiscountTotal),
      orderDiscount: roundMoney(orderDiscount),
      totalDiscount: roundMoney(itemDiscountTotal + orderDiscount),
      itemTaxTotal: roundMoney(itemTaxTotal),
      extraTax: roundMoney(extraTax),
      totalTax: roundMoney(itemTaxTotal + extraTax),
      shipping: roundMoney(shipping),
      otherCharge: roundMoney(otherCharge),
      adjustment: roundMoney(adjustment),
      grandTotal: roundMoney(Math.max(0, grandTotal)),
    };
  }, [form, items]);

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const handleFormChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        [
          "exchangeRate",
          "discountValue",
          "taxAmount",
          "shippingAmount",
          "otherChargeAmount",
          "adjustmentAmount",
        ].includes(name)
          ? toSafeNumber(value)
          : value,
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleAddressChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      deliveryAddress: {
        ...current.deliveryAddress,
        [name]: value,
      },
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleSupplierChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const supplierId = event.target.value;

    const selectedSupplier = suppliers.find(
      (supplier) => supplier._id === supplierId,
    );

    setForm((current) => ({
      ...current,
      supplier: supplierId,
      currency: selectedSupplier?.currency || current.currency || "BDT",
      paymentTerm:
        selectedSupplier?.paymentTerm ||
        current.paymentTerm ||
        "Immediate",
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleExpectedDeliveryDateChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      expectedDeliveryDate: value,
    }));

    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        expectedDeliveryDate:
          !item.expectedDeliveryDate ||
          item.expectedDeliveryDate === form.expectedDeliveryDate
            ? value
            : item.expectedDeliveryDate,
      })),
    );

    setError("");
    setSuccessMessage("");
  };

  const handleItemProductChange = (
    itemId: string,
    productId: string,
  ) => {
    const selectedProduct = products.find(
      (product) => product._id === productId,
    );

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              product: productId,
              productName: selectedProduct
                ? getProductName(selectedProduct)
                : "",
              sku: selectedProduct ? getProductSku(selectedProduct) : "",
              unitCost: selectedProduct
                ? getProductCost(selectedProduct)
                : item.unitCost,
            }
          : item,
      ),
    );

    setError("");
    setSuccessMessage("");
  };

  const handleItemChange = (
    itemId: string,
    field: keyof Omit<PurchaseOrderItem, "id">,
    value: string,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) return item;

        if (
          [
            "orderedQuantity",
            "unitCost",
            "discountValue",
            "taxValue",
          ].includes(field)
        ) {
          return {
            ...item,
            [field]: Math.max(0, toSafeNumber(value)),
          };
        }

        if (field === "discountType" && value === "None") {
          return {
            ...item,
            discountType: "None",
            discountValue: 0,
          };
        }

        if (field === "taxType" && value === "None") {
          return {
            ...item,
            taxType: "None",
            taxValue: 0,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );

    setError("");
    setSuccessMessage("");
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(form.expectedDeliveryDate),
    ]);
  };

  const removeItem = (itemId: string) => {
    setItems((currentItems) => {
      if (currentItems.length <= 1) return currentItems;

      return currentItems.filter((item) => item.id !== itemId);
    });
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = (): string => {
    if (!form.supplier) {
      return "Please select a supplier.";
    }

    if (!form.orderDate) {
      return "Please select an order date.";
    }

    if (!form.expectedDeliveryDate) {
      return "Please select an expected delivery date.";
    }

    if (
      new Date(form.expectedDeliveryDate).getTime() <
      new Date(form.orderDate).getTime()
    ) {
      return "Expected delivery date cannot be earlier than the order date.";
    }

    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      return "Currency must be a valid 3-letter code.";
    }

    if (toSafeNumber(form.exchangeRate) <= 0) {
      return "Exchange rate must be greater than zero.";
    }

    if (
      form.discountType === "Percentage" &&
      toSafeNumber(form.discountValue) > 100
    ) {
      return "Order discount percentage cannot exceed 100.";
    }

    if (
      form.discountType === "None" &&
      toSafeNumber(form.discountValue) !== 0
    ) {
      return "Order discount value must be zero when discount type is None.";
    }

    if (
      form.paymentDueDate &&
      new Date(form.paymentDueDate).getTime() <
        new Date(form.orderDate).getTime()
    ) {
      return "Payment due date cannot be earlier than the order date.";
    }

    if (items.length === 0) {
      return "Please add at least one purchase order item.";
    }

    const productKeys = new Set<string>();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];

      if (!item.product) {
        return `Please select a product for item ${index + 1}.`;
      }

      const duplicateKey = `${item.product}:${item.variant || "no-variant"}`;

      if (productKeys.has(duplicateKey)) {
        return `The same product and variant cannot be added more than once.`;
      }

      productKeys.add(duplicateKey);

      if (toSafeNumber(item.orderedQuantity) <= 0) {
        return `Ordered quantity must be greater than zero for item ${
          index + 1
        }.`;
      }

      if (toSafeNumber(item.unitCost) < 0) {
        return `Unit cost cannot be negative for item ${index + 1}.`;
      }

      if (
        item.discountType === "Percentage" &&
        toSafeNumber(item.discountValue) > 100
      ) {
        return `Discount percentage cannot exceed 100 for item ${
          index + 1
        }.`;
      }

      if (
        item.discountType === "None" &&
        toSafeNumber(item.discountValue) !== 0
      ) {
        return `Discount value must be zero when discount type is None for item ${
          index + 1
        }.`;
      }

      if (
        item.taxType === "Percentage" &&
        toSafeNumber(item.taxValue) > 100
      ) {
        return `Tax percentage cannot exceed 100 for item ${index + 1}.`;
      }

      if (
        item.taxType === "None" &&
        toSafeNumber(item.taxValue) !== 0
      ) {
        return `Tax value must be zero when tax type is None for item ${
          index + 1
        }.`;
      }

      if (
        item.expectedDeliveryDate &&
        new Date(item.expectedDeliveryDate).getTime() <
          new Date(form.orderDate).getTime()
      ) {
        return `Expected delivery date cannot be earlier than the order date for item ${
          index + 1
        }.`;
      }
    }

    return "";
  };

  /* =======================================================
     SUBMIT PURCHASE ORDER
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      ensureRequestContext();

      const normalizedAddress = removeUndefined({
        recipientName:
          form.deliveryAddress.recipientName.trim() || undefined,
        phone: form.deliveryAddress.phone.trim() || undefined,
        addressLine1:
          form.deliveryAddress.addressLine1.trim() || undefined,
        addressLine2:
          form.deliveryAddress.addressLine2.trim() || undefined,
        area: form.deliveryAddress.area.trim() || undefined,
        district: form.deliveryAddress.district.trim() || undefined,
        division: form.deliveryAddress.division.trim() || undefined,
        postalCode: form.deliveryAddress.postalCode.trim() || undefined,
        country: form.deliveryAddress.country.trim() || undefined,
      });

      const normalizedItems = items.map((item) =>
        removeUndefined({
          product: item.product,
          variant: item.variant.trim() || undefined,
          orderedQuantity: Math.max(
            0,
            toSafeNumber(item.orderedQuantity),
          ),
          unitCost: Math.max(0, toSafeNumber(item.unitCost)),
          discountType:
            item.discountType !== "None"
              ? item.discountType
              : undefined,
          discountValue:
            item.discountType !== "None"
              ? Math.max(
                  0,
                  toSafeNumber(item.discountValue),
                )
              : undefined,
          taxType:
            item.taxType !== "None"
              ? item.taxType
              : undefined,
          taxValue:
            item.taxType !== "None"
              ? Math.max(0, toSafeNumber(item.taxValue))
              : undefined,
          expectedDeliveryDate: item.expectedDeliveryDate || undefined,
          note: item.note.trim() || undefined,
        }),
      );

      /*
       * IMPORTANT:
       * Only fields accepted by purchaseOrderValidator.js are included.
       * status, supplierId, calculated totals, productName, SKU and other
       * server-managed fields are intentionally not sent.
       * "None" is a UI-only option. When selected, discount/tax fields
       * are omitted because the backend enum may only allow Fixed and
       * Percentage.
       */
      const payload = removeUndefined({
        supplier: form.supplier,
        orderDate: form.orderDate,
        expectedDeliveryDate: form.expectedDeliveryDate,
        referenceNumber: form.referenceNumber.trim() || undefined,
        supplierInvoiceNumber:
          form.supplierInvoiceNumber.trim() || undefined,
        source: form.source || undefined,
        priority: form.priority || undefined,
        currency: form.currency.trim().toUpperCase(),
        exchangeRate: Math.max(0, toSafeNumber(form.exchangeRate)),
        discountType:
          form.discountType !== "None"
            ? form.discountType
            : undefined,
        discountValue:
          form.discountType !== "None"
            ? Math.max(0, toSafeNumber(form.discountValue))
            : undefined,
        taxAmount: Math.max(0, toSafeNumber(form.taxAmount)),
        shippingAmount: Math.max(
          0,
          toSafeNumber(form.shippingAmount),
        ),
        otherChargeAmount: Math.max(
          0,
          toSafeNumber(form.otherChargeAmount),
        ),
        adjustmentAmount: toSafeNumber(form.adjustmentAmount),
        deliveryAddress:
          Object.keys(normalizedAddress).length > 0
            ? normalizedAddress
            : undefined,
        paymentTerm: form.paymentTerm.trim() || undefined,
        paymentDueDate: form.paymentDueDate || undefined,
        internalNote: form.internalNote.trim() || undefined,
        supplierNote: form.supplierNote.trim() || undefined,
        termsAndConditions:
          form.termsAndConditions.trim() || undefined,
        items: normalizedItems,
      });

      const response = await fetch(`${API_URL}/api/purchase-orders`, {
        method: "POST",
        headers: createHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result: ApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            result,
            `Failed to create purchase order (${response.status}).`,
          ),
        );
      }

      const createdOrder = result.purchaseOrder || result.data;

      const orderNumber =
        createdOrder?.purchaseOrderNumber || createdOrder?.poNumber || "";

      setSuccessMessage(
        orderNumber
          ? `Purchase order ${orderNumber} created successfully.`
          : "Purchase order created successfully.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });

      window.setTimeout(() => {
        router.push(
          "/admin/supplier-and-purchase/purchase-orders",
        );
        router.refresh();
      }, 900);
    } catch (requestError) {
      console.error("Create purchase order error:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while creating the purchase order.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     PAGE UI
  ======================================================= */

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
            href="/admin/supplier-and-purchase/purchase-orders"
            className="transition hover:text-orange-600"
          >
            Purchase Orders
          </Link>

          <span>/</span>

          <span className="font-medium text-slate-800">Create</span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Purchasing
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Purchase Order
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Create a tenant-specific purchase order using fields accepted
              by the backend purchase-order validator.
            </p>
          </div>

          <Link
            href="/admin/supplier-and-purchase/purchase-orders"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Purchase Orders
          </Link>
        </header>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="whitespace-pre-wrap text-sm font-semibold text-red-700">
              {error}
            </p>
          </div>
        ) : null}

        {successMessage ? (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
          >
            <p className="text-sm font-semibold text-emerald-700">
              {successMessage}
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Purchase Order Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the supplier and provide the primary order
                information.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="supplier"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Supplier <span className="text-red-500">*</span>
                </label>

                <select
                  id="supplier"
                  name="supplier"
                  value={form.supplier}
                  onChange={handleSupplierChange}
                  disabled={loadingOptions || submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading suppliers..."
                      : "Select supplier"}
                  </option>

                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {getSupplierName(supplier)}
                      {supplier.supplierCode
                        ? ` (${supplier.supplierCode})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Currency <span className="text-red-500">*</span>
                </label>

                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="BDT">BDT — Bangladeshi Taka</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="exchangeRate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Exchange Rate
                </label>

                <input
                  id="exchangeRate"
                  name="exchangeRate"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={form.exchangeRate}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="orderDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Order Date <span className="text-red-500">*</span>
                </label>

                <input
                  id="orderDate"
                  name="orderDate"
                  type="date"
                  value={form.orderDate}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="expectedDeliveryDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Expected Delivery <span className="text-red-500">*</span>
                </label>

                <input
                  id="expectedDeliveryDate"
                  name="expectedDeliveryDate"
                  type="date"
                  min={form.orderDate}
                  value={form.expectedDeliveryDate}
                  onChange={handleExpectedDeliveryDateChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="paymentTerm"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Payment Term
                </label>

                <select
                  id="paymentTerm"
                  name="paymentTerm"
                  value={form.paymentTerm}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Cash">Cash</option>
                  <option value="Advance">Advance</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="paymentDueDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Payment Due Date
                </label>

                <input
                  id="paymentDueDate"
                  name="paymentDueDate"
                  type="date"
                  min={form.orderDate}
                  value={form.paymentDueDate}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="referenceNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reference Number
                </label>

                <input
                  id="referenceNumber"
                  name="referenceNumber"
                  type="text"
                  maxLength={100}
                  value={form.referenceNumber}
                  onChange={handleFormChange}
                  disabled={submitting}
                  placeholder="Supplier quotation or reference"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="supplierInvoiceNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Supplier Invoice Number
                </label>

                <input
                  id="supplierInvoiceNumber"
                  name="supplierInvoiceNumber"
                  type="text"
                  maxLength={100}
                  value={form.supplierInvoiceNumber}
                  onChange={handleFormChange}
                  disabled={submitting}
                  placeholder="Optional supplier invoice"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="source"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Source
                </label>

                <input
                  id="source"
                  name="source"
                  type="text"
                  value={form.source}
                  onChange={handleFormChange}
                  disabled={submitting}
                  placeholder="Leave blank to use backend default"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Enter only a value supported by PURCHASE_ORDER_SOURCES.
                </p>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Priority
                </label>

                <input
                  id="priority"
                  name="priority"
                  type="text"
                  value={form.priority}
                  onChange={handleFormChange}
                  disabled={submitting}
                  placeholder="Leave blank to use backend default"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Enter only a value supported by PURCHASE_ORDER_PRIORITIES.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Delivery Address
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                The backend accepts deliveryAddress as a structured object.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["recipientName", "Recipient Name", "Receiver or company"],
                ["phone", "Phone", "Contact number"],
                ["addressLine1", "Address Line 1", "Street and building"],
                ["addressLine2", "Address Line 2", "Optional address details"],
                ["area", "Area", "Area or locality"],
                ["district", "District", "District"],
                ["division", "Division", "Division"],
                ["postalCode", "Postal Code", "Postal code"],
                ["country", "Country", "Country"],
              ].map(([name, label, placeholder]) => (
                <div
                  key={name}
                  className={
                    name === "addressLine1" || name === "addressLine2"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <label
                    htmlFor={name}
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    {label}
                  </label>

                  <input
                    id={name}
                    name={name}
                    type="text"
                    value={
                      form.deliveryAddress[
                        name as keyof DeliveryAddress
                      ]
                    }
                    onChange={handleAddressChange}
                    disabled={submitting}
                    placeholder={placeholder}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Purchase Items
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select valid products and enter quantities, costs, discounts,
                  taxes and item delivery dates.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={submitting}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {items.map((item, index) => {
                const lineSubtotal =
                  toSafeNumber(item.orderedQuantity) *
                  toSafeNumber(item.unitCost);

                const discount =
                  item.discountType === "Percentage"
                    ? lineSubtotal *
                      (toSafeNumber(item.discountValue) / 100)
                    : item.discountType === "Fixed"
                      ? toSafeNumber(item.discountValue)
                      : 0;

                const taxableAmount = Math.max(
                  0,
                  lineSubtotal - discount,
                );

                const tax =
                  item.taxType === "Percentage"
                    ? taxableAmount * (toSafeNumber(item.taxValue) / 100)
                    : item.taxType === "Fixed"
                      ? toSafeNumber(item.taxValue)
                      : 0;

                const lineTotal = taxableAmount + tax;

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          Item {index + 1}
                        </h3>

                        {item.productName ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.productName}
                            {item.sku ? ` · ${item.sku}` : ""}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1 || submitting}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-5">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Product <span className="text-red-500">*</span>
                        </label>

                        <select
                          value={item.product}
                          onChange={(event) =>
                            handleItemProductChange(
                              item.id,
                              event.target.value,
                            )
                          }
                          disabled={loadingOptions || submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        >
                          <option value="">
                            {loadingOptions
                              ? "Loading products..."
                              : "Select product"}
                          </option>

                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {getProductName(product)}
                              {getProductSku(product)
                                ? ` (${getProductSku(product)})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Variant ObjectId
                        </label>

                        <input
                          type="text"
                          value={item.variant}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "variant",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          placeholder="Optional"
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Quantity <span className="text-red-500">*</span>
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.orderedQuantity}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "orderedQuantity",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-3">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Unit Cost <span className="text-red-500">*</span>
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "unitCost",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Discount Type
                        </label>

                        <select
                          value={item.discountType}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "discountType",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        >
                          <option value="None">None</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Fixed">Fixed</option>
                        </select>
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Discount Value
                        </label>

                        <input
                          type="number"
                          min="0"
                          max={
                            item.discountType === "Percentage"
                              ? 100
                              : undefined
                          }
                          step="0.01"
                          value={item.discountValue}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "discountValue",
                              event.target.value,
                            )
                          }
                          disabled={
                            submitting || item.discountType === "None"
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Tax Type
                        </label>

                        <select
                          value={item.taxType}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "taxType",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        >
                          <option value="None">None</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Fixed">Fixed</option>
                        </select>
                      </div>

                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Tax Value
                        </label>

                        <input
                          type="number"
                          min="0"
                          max={
                            item.taxType === "Percentage" ? 100 : undefined
                          }
                          step="0.01"
                          value={item.taxValue}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "taxValue",
                              event.target.value,
                            )
                          }
                          disabled={submitting || item.taxType === "None"}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-3">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Item Delivery Date
                        </label>

                        <input
                          type="date"
                          min={form.orderDate}
                          value={item.expectedDeliveryDate}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "expectedDeliveryDate",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="xl:col-span-3">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Line Total
                        </label>

                        <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900">
                          {formatMoney(
                            roundMoney(lineTotal),
                            form.currency,
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2 xl:col-span-12">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Item Note
                        </label>

                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={item.note}
                          onChange={(event) =>
                            handleItemChange(
                              item.id,
                              "note",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                          placeholder="Optional item note"
                          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}

              {!loadingOptions && products.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  No active products were found. A valid product ObjectId is
                  required by the backend validator.
                </div>
              ) : null}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Order Adjustments
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Order Discount Type
                    </label>

                    <select
                      name="discountType"
                      value={form.discountType}
                      onChange={(event) => {
                        handleFormChange(event);

                        if (event.target.value === "None") {
                          setForm((current) => ({
                            ...current,
                            discountType: "None",
                            discountValue: 0,
                          }));
                        }
                      }}
                      disabled={submitting}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    >
                      <option value="None">None</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Fixed">Fixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Order Discount Value
                    </label>

                    <input
                      name="discountValue"
                      type="number"
                      min="0"
                      max={
                        form.discountType === "Percentage" ? 100 : undefined
                      }
                      step="0.01"
                      value={form.discountValue}
                      onChange={handleFormChange}
                      disabled={submitting || form.discountType === "None"}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    />
                  </div>

                  {[
                    ["taxAmount", "Additional Tax Amount"],
                    ["shippingAmount", "Shipping Amount"],
                    ["otherChargeAmount", "Other Charge Amount"],
                    ["adjustmentAmount", "Adjustment Amount"],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        {label}
                      </label>

                      <input
                        name={name}
                        type="number"
                        min={name === "adjustmentAmount" ? undefined : "0"}
                        step="0.01"
                        value={
                          form[name as keyof Pick<
                            PurchaseOrderForm,
                            | "taxAmount"
                            | "shippingAmount"
                            | "otherChargeAmount"
                            | "adjustmentAmount"
                          >]
                        }
                        onChange={handleFormChange}
                        disabled={submitting}
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Notes and Terms
                </h2>

                <div className="mt-5 space-y-5">
                  <div>
                    <label
                      htmlFor="internalNote"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Internal Note
                    </label>

                    <textarea
                      id="internalNote"
                      name="internalNote"
                      rows={4}
                      maxLength={3000}
                      value={form.internalNote}
                      onChange={handleFormChange}
                      disabled={submitting}
                      placeholder="Internal purchasing note"
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="supplierNote"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Supplier Note
                    </label>

                    <textarea
                      id="supplierNote"
                      name="supplierNote"
                      rows={4}
                      maxLength={3000}
                      value={form.supplierNote}
                      onChange={handleFormChange}
                      disabled={submitting}
                      placeholder="Instructions visible to the supplier"
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="termsAndConditions"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Terms and Conditions
                    </label>

                    <textarea
                      id="termsAndConditions"
                      name="termsAndConditions"
                      rows={5}
                      maxLength={5000}
                      value={form.termsAndConditions}
                      onChange={handleFormChange}
                      disabled={submitting}
                      placeholder="Purchase order terms and conditions"
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Order Summary
              </h2>

              <div className="mt-5 space-y-4">
                {[
                  ["Items", String(items.length)],
                  ["Subtotal", formatMoney(totals.subtotal, form.currency)],
                  [
                    "Item Discounts",
                    `-${formatMoney(
                      totals.itemDiscountTotal,
                      form.currency,
                    )}`,
                  ],
                  [
                    "Order Discount",
                    `-${formatMoney(
                      totals.orderDiscount,
                      form.currency,
                    )}`,
                  ],
                  [
                    "Item Tax",
                    formatMoney(totals.itemTaxTotal, form.currency),
                  ],
                  [
                    "Additional Tax",
                    formatMoney(totals.extraTax, form.currency),
                  ],
                  [
                    "Shipping",
                    formatMoney(totals.shipping, form.currency),
                  ],
                  [
                    "Other Charges",
                    formatMoney(totals.otherCharge, form.currency),
                  ],
                  [
                    "Adjustment",
                    formatMoney(totals.adjustment, form.currency),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-900">
                      {value}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-4">
                  <span className="text-sm font-semibold text-white">
                    Estimated Grand Total
                  </span>

                  <span className="text-lg font-black text-white">
                    {formatMoney(totals.grandTotal, form.currency)}
                  </span>
                </div>

                <p className="text-xs leading-5 text-slate-400">
                  Final totals are calculated and stored by the backend
                  service. Calculated frontend totals are not submitted.
                </p>
              </div>
            </section>
          </div>

          <section className="flex flex-col-reverse justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:p-6">
            <Link
              href="/admin/supplier-and-purchase/purchase-orders"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingOptions ||
                suppliers.length === 0 ||
                products.length === 0
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Creating Purchase Order..."
                : "Create Purchase Order"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
