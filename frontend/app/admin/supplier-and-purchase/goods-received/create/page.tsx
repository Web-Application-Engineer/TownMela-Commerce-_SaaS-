"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
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

interface PurchaseOrderItem {
  _id?: string;
  id?: string;

  product?: {
    _id?: string;
    id?: string;
    name?: string;
    productName?: string;
    sku?: string;
  } | string | null;

  productId?: string;
  productName?: string;
  name?: string;
  sku?: string;
  description?: string;

  orderedQuantity?: number;
  quantity?: number;
  receivedQuantity?: number;
  pendingQuantity?: number;

  unitPrice?: number;
  unitCost?: number;
  costPrice?: number;

  taxRate?: number;
  discountAmount?: number;
  lineTotal?: number;
  total?: number;
}

interface PurchaseOrder {
  _id: string;
  id?: string;

  purchaseOrderNumber?: string;
  poNumber?: string;
  orderNumber?: string;

  supplier?: EntityReference | string | null;
  supplierId?: string;
  supplierName?: string;

  warehouse?: EntityReference | string | null;
  warehouseId?: string;
  warehouseName?: string;

  currency?: string;
  status?: string;

  orderDate?: string;
  expectedDeliveryDate?: string;

  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;

  items?: PurchaseOrderItem[];
}

interface Warehouse {
  _id: string;
  id?: string;
  name?: string;
  warehouseName?: string;
  code?: string;
  status?: string;
  isActive?: boolean;
  address?: string;
}

interface GoodsReceivedItemForm {
  id: string;

  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  description: string;

  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  pendingQuantity: number;

  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;

  unitCost: number;
  taxRate: number;
  discountAmount: number;

  batchNumber: string;
  expiryDate: string;
  remarks: string;
}

interface GoodsReceivedForm {
  purchaseOrderId: string;
  warehouseId: string;

  receivedDate: string;
  supplierDeliveryNote: string;
  supplierInvoiceNumber: string;
  challanNumber: string;
  vehicleNumber: string;
  receivedBy: string;

  inspectionStatus: string;
  status: string;

  notes: string;
}

interface PurchaseOrderApiResponse {
  success?: boolean;
  message?: string;
  data?:
    | PurchaseOrder[]
    | {
        purchaseOrder?: PurchaseOrder;
        purchaseOrders?: PurchaseOrder[];
        orders?: PurchaseOrder[];
        results?: PurchaseOrder[];
        items?: PurchaseOrderItem[] | PurchaseOrder[];
      };
  purchaseOrder?: PurchaseOrder;
  purchaseOrders?: PurchaseOrder[];
  orders?: PurchaseOrder[];
  results?: PurchaseOrder[];
  items?: PurchaseOrderItem[] | PurchaseOrder[];
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

interface WarehouseApiResponse {
  success?: boolean;
  message?: string;
  data?:
    | Warehouse[]
    | {
        warehouses?: Warehouse[];
        results?: Warehouse[];
        items?: Warehouse[];
      };
  warehouses?: Warehouse[];
  results?: Warehouse[];
  items?: Warehouse[];
  errors?: Array<{
    message?: string;
  }>;
}

interface CreateGoodsReceivedApiResponse {
  success?: boolean;
  message?: string;

  goodsReceived?: {
    _id?: string;
    id?: string;
    goodsReceivedNumber?: string;
    grnNumber?: string;
    receiptNumber?: string;
  };

  data?: {
    _id?: string;
    id?: string;
    goodsReceivedNumber?: string;
    grnNumber?: string;
    receiptNumber?: string;
    goodsReceived?: {
      _id?: string;
      id?: string;
      goodsReceivedNumber?: string;
      grnNumber?: string;
      receiptNumber?: string;
    };
  };

  errors?: Array<{
    field?: string;
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

const createHeaders = ({
  includeJson = false,
}: {
  includeJson?: boolean;
} = {}): Headers => {
  const headers =
    new Headers();

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

const ensureRequestContext = () => {
  const token =
    getAccessToken();

  const tenantId =
    getTenantId();

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
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

const getTodayInputValue = (): string => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createRowId = (): string =>
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

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

const roundMoney = (
  value: number,
): number =>
  Math.round(
    (value +
      Number.EPSILON) *
      100,
  ) / 100;

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

    const validationMessage =
      Array.isArray(record.errors)
        ? record.errors
            .map((item) => {
              const message = item?.message?.trim();
              if (!message) return "";
              return item.field
                ? `${item.field}: ${message}`
                : message;
            })
            .filter(Boolean)
            .join(" | ")
        : "";

    return (
      validationMessage ||
      record.message ||
      fallback
    );
  }

  return fallback;
};

const extractPurchaseOrders = (
  result: PurchaseOrderApiResponse,
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
      []
    );
  }

  return (
    result.purchaseOrders ||
    result.orders ||
    result.results ||
    []
  );
};

const extractPurchaseOrderDetails = (
  result: PurchaseOrderApiResponse,
): {
  purchaseOrder: PurchaseOrder | null;
  items: PurchaseOrderItem[];
} => {
  const data =
    result.data &&
    !Array.isArray(result.data) &&
    typeof result.data === "object"
      ? result.data
      : null;

  return {
    purchaseOrder:
      data?.purchaseOrder ||
      result.purchaseOrder ||
      null,
    items: Array.isArray(
      data?.items || result.items,
    )
      ? ((data?.items ||
          result.items) as PurchaseOrderItem[])
      : [],
  };
};

const extractWarehouses = (
  result: WarehouseApiResponse,
): Warehouse[] => {
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
    return (
      result.data.warehouses ||
      result.data.results ||
      result.data.items ||
      []
    );
  }

  return (
    result.warehouses ||
    result.results ||
    result.items ||
    []
  );
};

const getPurchaseOrderNumber = (
  purchaseOrder: PurchaseOrder,
): string =>
  purchaseOrder.purchaseOrderNumber ||
  purchaseOrder.poNumber ||
  purchaseOrder.orderNumber ||
  "Purchase Order";

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

const getWarehouseName = (
  warehouse: Warehouse,
): string =>
  warehouse.warehouseName ||
  warehouse.name ||
  warehouse.code ||
  "Unnamed Warehouse";

const getProductId = (
  item: PurchaseOrderItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product._id ||
      item.product.id ||
      item.productId ||
      ""
    );
  }

  if (
    typeof item.product ===
      "string"
  ) {
    return item.product;
  }

  return item.productId || "";
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
  item: PurchaseOrderItem,
): string => {
  if (
    item.product &&
    typeof item.product ===
      "object"
  ) {
    return (
      item.product.sku ||
      item.sku ||
      ""
    );
  }

  return item.sku || "";
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

const buildItemsFromPurchaseOrder = (
  purchaseOrder: PurchaseOrder,
): GoodsReceivedItemForm[] => {
  const purchaseItems =
    Array.isArray(
      purchaseOrder.items,
    )
      ? purchaseOrder.items
      : [];

  return purchaseItems.map(
    (item) => {
      const orderedQuantity =
        Math.max(
          0,
          toSafeNumber(
            item.orderedQuantity ??
              item.quantity,
          ),
        );

      const previouslyReceivedQuantity =
        Math.max(
          0,
          toSafeNumber(
            item.receivedQuantity,
          ),
        );

      const calculatedPending =
        Math.max(
          0,
          orderedQuantity -
            previouslyReceivedQuantity,
        );

      const pendingQuantity =
        item.pendingQuantity !==
        undefined
          ? Math.max(
              0,
              toSafeNumber(
                item.pendingQuantity,
              ),
            )
          : calculatedPending;

      const unitCost =
        Math.max(
          0,
          toSafeNumber(
            item.unitCost ??
              item.unitPrice ??
              item.costPrice,
          ),
        );

      return {
        id: createRowId(),

        purchaseOrderItemId:
          item._id ||
          item.id ||
          "",

        productId:
          getProductId(item),

        productName:
          getProductName(item),

        sku:
          getProductSku(item),

        description:
          item.description ||
          "",

        orderedQuantity,

        previouslyReceivedQuantity,

        pendingQuantity,

        receivedQuantity:
          pendingQuantity,

        acceptedQuantity:
          pendingQuantity,

        rejectedQuantity: 0,

        unitCost,

        taxRate:
          Math.max(
            0,
            toSafeNumber(
              item.taxRate,
            ),
          ),

        discountAmount:
          Math.max(
            0,
            toSafeNumber(
              item.discountAmount,
            ),
          ),

        batchNumber: "",
        expiryDate: "",
        remarks: "",
      };
    },
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function CreateGoodsReceivedPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const purchaseOrderIdFromQuery =
    searchParams.get(
      "purchaseOrderId",
    ) || "";

  const [
    form,
    setForm,
  ] =
    useState<GoodsReceivedForm>({
      purchaseOrderId: "",
      warehouseId: "",

      receivedDate:
        getTodayInputValue(),

      supplierDeliveryNote:
        "",

      supplierInvoiceNumber:
        "",

      challanNumber: "",
      vehicleNumber: "",
      receivedBy: "",

      inspectionStatus:
        "Completed",

      status: "Completed",

      notes: "",
    });

  const [
    purchaseOrders,
    setPurchaseOrders,
  ] = useState<
    PurchaseOrder[]
  >([]);

  const [
    warehouses,
    setWarehouses,
  ] = useState<
    Warehouse[]
  >([]);

  const [
    selectedPurchaseOrder,
    setSelectedPurchaseOrder,
  ] = useState<
    PurchaseOrder | null
  >(null);

  const [
    items,
    setItems,
  ] = useState<
    GoodsReceivedItemForm[]
  >([]);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true);

  const [
    loadingPurchaseOrder,
    setLoadingPurchaseOrder,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const currency =
    selectedPurchaseOrder?.currency ||
    "BDT";

  const loadPurchaseOrderDetails =
    useCallback(
      async (
        purchaseOrderId: string,
        fallbackOrder:
          | PurchaseOrder
          | null = null,
      ) => {
        if (!purchaseOrderId) {
          setSelectedPurchaseOrder(null);
          setItems([]);
          return;
        }

        try {
          setLoadingPurchaseOrder(true);
          setError("");
          ensureRequestContext();

          const response = await fetch(
            `${API_URL}/api/purchase-orders/${purchaseOrderId}?includeItems=true`,
            {
              method: "GET",
              headers: createHeaders(),
              credentials: "include",
              cache: "no-store",
            },
          );

          const result =
            (await response
              .json()
              .catch(() => ({}))) as PurchaseOrderApiResponse;

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                result,
                `Failed to load purchase order details (${response.status}).`,
              ),
            );
          }

          const extracted =
            extractPurchaseOrderDetails(result);

          const purchaseOrder =
            extracted.purchaseOrder ||
            fallbackOrder;

          if (!purchaseOrder) {
            throw new Error(
              "Purchase order details were not found.",
            );
          }

          const mergedOrder: PurchaseOrder = {
            ...fallbackOrder,
            ...purchaseOrder,
            items: extracted.items,
          };

          setSelectedPurchaseOrder(
            mergedOrder,
          );

          setItems(
            buildItemsFromPurchaseOrder(
              mergedOrder,
            ).filter(
              (item) =>
                item.pendingQuantity > 0,
            ),
          );

          const warehouseId =
            mergedOrder.warehouseId ||
            (mergedOrder.warehouse &&
            typeof mergedOrder.warehouse ===
              "object"
              ? mergedOrder.warehouse._id ||
                mergedOrder.warehouse.id ||
                ""
              : "");

          setForm((current) => ({
            ...current,
            purchaseOrderId,
            warehouseId:
              warehouseId ||
              current.warehouseId,
          }));
        } catch (requestError) {
          setSelectedPurchaseOrder(
            fallbackOrder,
          );
          setItems([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load purchase order items.",
          );
        } finally {
          setLoadingPurchaseOrder(false);
        }
      },
      [],
    );

  const loadOptions =
    useCallback(async () => {
      try {
        setLoadingOptions(
          true,
        );
        setError("");

        ensureRequestContext();

        const [
          purchaseOrderResponse,
          warehouseResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/purchase-orders?limit=100`,
            {
              method: "GET",
              headers:
                createHeaders(),
              credentials:
                "include",
              cache:
                "no-store",
            },
          ),

          fetch(
            `${API_URL}/api/warehouses?limit=100`,
            {
              method: "GET",
              headers:
                createHeaders(),
              credentials:
                "include",
              cache:
                "no-store",
            },
          ),
        ]);

        const [
          purchaseOrderResult,
          warehouseResult,
        ] = await Promise.all([
          purchaseOrderResponse
            .json()
            .catch(
              () => ({}),
            ) as Promise<PurchaseOrderApiResponse>,

          warehouseResponse
            .json()
            .catch(
              () => ({}),
            ) as Promise<WarehouseApiResponse>,
        ]);

        if (
          !purchaseOrderResponse.ok
        ) {
          throw new Error(
            getErrorMessage(
              purchaseOrderResult,
              `Failed to load purchase orders (${purchaseOrderResponse.status}).`,
            ),
          );
        }

        const eligiblePurchaseOrders =
          extractPurchaseOrders(
            purchaseOrderResult,
          ).filter(
            (purchaseOrder) => {
              const status =
                String(
                  purchaseOrder.status ||
                    "",
                )
                  .toLowerCase()
                  .trim();

              return ![
                "cancelled",
                "canceled",
                "closed",
                "fully received",
                "fully_received",
              ].includes(status);
            },
          );

        setPurchaseOrders(
          eligiblePurchaseOrders,
        );

        if (
          warehouseResponse.ok
        ) {
          const activeWarehouses =
            extractWarehouses(
              warehouseResult,
            ).filter(
              (warehouse) =>
                warehouse.isActive !==
                  false &&
                String(
                  warehouse.status ||
                    "",
                ).toLowerCase() !==
                  "inactive",
            );

          setWarehouses(
            activeWarehouses,
          );
        } else {
          setWarehouses([]);
        }

        const initialPurchaseOrderId =
          purchaseOrderIdFromQuery &&
          eligiblePurchaseOrders.some(
            (purchaseOrder) =>
              purchaseOrder._id ===
              purchaseOrderIdFromQuery,
          )
            ? purchaseOrderIdFromQuery
            : "";

        if (
          initialPurchaseOrderId
        ) {
          const selected =
            eligiblePurchaseOrders.find(
              (purchaseOrder) =>
                purchaseOrder._id ===
                initialPurchaseOrderId,
            ) || null;

          setForm((current) => ({
            ...current,
            purchaseOrderId:
              initialPurchaseOrderId,
          }));

          await loadPurchaseOrderDetails(
            initialPurchaseOrderId,
            selected,
          );
        }
      } catch (
        requestError
      ) {
        setPurchaseOrders([]);
        setWarehouses([]);
        setItems([]);

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Failed to load purchase order data.",
        );
      } finally {
        setLoadingOptions(
          false,
        );
      }
    }, [
      loadPurchaseOrderDetails,
      purchaseOrderIdFromQuery,
    ]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const totals =
    useMemo(() => {
      let orderedQuantity = 0;
      let receivedQuantity = 0;
      let acceptedQuantity = 0;
      let rejectedQuantity = 0;
      let subtotal = 0;
      let taxTotal = 0;
      let discountTotal = 0;

      for (const item of items) {
        const ordered =
          Math.max(
            0,
            toSafeNumber(
              item.orderedQuantity,
            ),
          );

        const received =
          Math.max(
            0,
            toSafeNumber(
              item.receivedQuantity,
            ),
          );

        const accepted =
          Math.max(
            0,
            toSafeNumber(
              item.acceptedQuantity,
            ),
          );

        const rejected =
          Math.max(
            0,
            toSafeNumber(
              item.rejectedQuantity,
            ),
          );

        const unitCost =
          Math.max(
            0,
            toSafeNumber(
              item.unitCost,
            ),
          );

        const taxRate =
          Math.max(
            0,
            toSafeNumber(
              item.taxRate,
            ),
          );

        const discountAmount =
          Math.max(
            0,
            toSafeNumber(
              item.discountAmount,
            ),
          );

        const lineSubtotal =
          accepted * unitCost;

        const taxableAmount =
          Math.max(
            0,
            lineSubtotal -
              discountAmount,
          );

        const lineTax =
          taxableAmount *
          (taxRate / 100);

        orderedQuantity +=
          ordered;

        receivedQuantity +=
          received;

        acceptedQuantity +=
          accepted;

        rejectedQuantity +=
          rejected;

        subtotal +=
          lineSubtotal;

        taxTotal += lineTax;

        discountTotal +=
          discountAmount;
      }

      const grandTotal =
        subtotal -
        discountTotal +
        taxTotal;

      return {
        orderedQuantity,
        receivedQuantity,
        acceptedQuantity,
        rejectedQuantity,

        subtotal:
          roundMoney(
            subtotal,
          ),

        taxTotal:
          roundMoney(
            taxTotal,
          ),

        discountTotal:
          roundMoney(
            discountTotal,
          ),

        grandTotal:
          roundMoney(
            Math.max(
              0,
              grandTotal,
            ),
          ),
      };
    }, [items]);

  const handleFormChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );

    setError("");
    setSuccess("");
  };

  const handlePurchaseOrderChange = async (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const purchaseOrderId =
      event.target.value;

    const selected =
      purchaseOrders.find(
        (purchaseOrder) =>
          purchaseOrder._id ===
          purchaseOrderId,
      ) || null;

    setForm((current) => ({
      ...current,
      purchaseOrderId,
    }));

    setSelectedPurchaseOrder(selected);
    setItems([]);
    setError("");
    setSuccess("");

    if (purchaseOrderId) {
      await loadPurchaseOrderDetails(
        purchaseOrderId,
        selected,
      );
    }
  };

  const handleItemChange = (
    rowId: string,
    field:
      | "receivedQuantity"
      | "acceptedQuantity"
      | "rejectedQuantity"
      | "unitCost"
      | "taxRate"
      | "discountAmount"
      | "batchNumber"
      | "expiryDate"
      | "remarks",
    value: string,
  ) => {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (
              item.id !== rowId
            ) {
              return item;
            }

            if (
              field ===
                "receivedQuantity" ||
              field ===
                "acceptedQuantity" ||
              field ===
                "rejectedQuantity" ||
              field ===
                "unitCost" ||
              field ===
                "taxRate" ||
              field ===
                "discountAmount"
            ) {
              const numericValue =
                Math.max(
                  0,
                  toSafeNumber(
                    value,
                  ),
                );

              if (
                field ===
                "receivedQuantity"
              ) {
                const nextAccepted =
                  Math.min(
                    numericValue,
                    Math.max(
                      0,
                      numericValue -
                        item.rejectedQuantity,
                    ),
                  );

                return {
                  ...item,

                  receivedQuantity:
                    numericValue,

                  acceptedQuantity:
                    nextAccepted,

                  rejectedQuantity:
                    Math.min(
                      item.rejectedQuantity,
                      numericValue,
                    ),
                };
              }

              if (
                field ===
                "acceptedQuantity"
              ) {
                return {
                  ...item,

                  acceptedQuantity:
                    numericValue,

                  rejectedQuantity:
                    Math.max(
                      0,
                      item.receivedQuantity -
                        numericValue,
                    ),
                };
              }

              if (
                field ===
                "rejectedQuantity"
              ) {
                return {
                  ...item,

                  rejectedQuantity:
                    numericValue,

                  acceptedQuantity:
                    Math.max(
                      0,
                      item.receivedQuantity -
                        numericValue,
                    ),
                };
              }

              return {
                ...item,
                [field]:
                  numericValue,
              };
            }

            return {
              ...item,
              [field]: value,
            };
          },
        ),
    );

    setError("");
    setSuccess("");
  };

  const receiveAllPending = () => {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) => ({
            ...item,

            receivedQuantity:
              item.pendingQuantity,

            acceptedQuantity:
              item.pendingQuantity,

            rejectedQuantity: 0,
          }),
        ),
    );
  };

  const clearReceivedQuantities = () => {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) => ({
            ...item,

            receivedQuantity: 0,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
          }),
        ),
    );
  };

  const purchaseOrderStatus =
    String(
      selectedPurchaseOrder?.status ||
        "",
    )
      .toLowerCase()
      .trim();

  const canReceivePurchaseOrder =
    [
      "approved",
      "ordered",
      "partially received",
    ].includes(
      purchaseOrderStatus,
    );

  const validateForm =
    (): string => {
      if (
        !form.purchaseOrderId
      ) {
        return "Please select a purchase order.";
      }

      if (!form.receivedDate) {
        return "Please select the received date.";
      }

      if (!canReceivePurchaseOrder) {
        return "The purchase order must be Approved, Ordered, or Partially Received before goods can be received.";
      }

      if (!form.warehouseId) {
        return "Please select a warehouse. The backend requires a warehouse for every goods received record.";
      }

      if (items.length === 0) {
        return "The selected purchase order has no receivable items.";
      }

      let hasReceivedQuantity =
        false;

      for (
        let index = 0;
        index < items.length;
        index += 1
      ) {
        const item =
          items[index];

        const receivedQuantity =
          toSafeNumber(
            item.receivedQuantity,
          );

        const acceptedQuantity =
          toSafeNumber(
            item.acceptedQuantity,
          );

        const rejectedQuantity =
          toSafeNumber(
            item.rejectedQuantity,
          );

        if (
          receivedQuantity > 0
        ) {
          hasReceivedQuantity =
            true;
        }

        if (
          receivedQuantity >
          item.pendingQuantity
        ) {
          return `Received quantity cannot exceed pending quantity for item ${
            index + 1
          }.`;
        }

        if (
          acceptedQuantity +
            rejectedQuantity !==
          receivedQuantity
        ) {
          return `Accepted quantity plus rejected quantity must equal received quantity for item ${
            index + 1
          }.`;
        }

        if (
          rejectedQuantity > 0 &&
          !item.remarks.trim()
        ) {
          return `Enter a rejection reason in Item Remarks for item ${
            index + 1
          }.`;
        }

        if (
          toSafeNumber(
            item.unitCost,
          ) < 0
        ) {
          return `Unit cost cannot be negative for item ${
            index + 1
          }.`;
        }

        const lineSubtotal =
          acceptedQuantity *
          toSafeNumber(
            item.unitCost,
          );

        if (
          toSafeNumber(
            item.discountAmount,
          ) >
          lineSubtotal
        ) {
          return `Discount cannot exceed accepted stock value for item ${
            index + 1
          }.`;
        }
      }

      if (
        !hasReceivedQuantity
      ) {
        return "Enter a received quantity for at least one item.";
      }

      return "";
    };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      ensureRequestContext();

      const supplierId =
        selectedPurchaseOrder?.supplierId ||
        (selectedPurchaseOrder?.supplier &&
        typeof selectedPurchaseOrder.supplier ===
          "object"
          ? selectedPurchaseOrder.supplier._id ||
            selectedPurchaseOrder.supplier.id ||
            ""
          : typeof selectedPurchaseOrder?.supplier ===
              "string"
            ? selectedPurchaseOrder.supplier
            : "");

      const normalizedItems =
        items
          .filter(
            (item) =>
              toSafeNumber(
                item.receivedQuantity,
              ) > 0,
          )
          .map((item) => {
            const receivedQuantity =
              Math.max(
                0,
                toSafeNumber(
                  item.receivedQuantity,
                ),
              );

            const acceptedQuantity =
              Math.max(
                0,
                toSafeNumber(
                  item.acceptedQuantity,
                ),
              );

            const rejectedQuantity =
              Math.max(
                0,
                toSafeNumber(
                  item.rejectedQuantity,
                ),
              );

            const batchInformation =
              item.batchNumber.trim() ||
              item.expiryDate
                ? {
                    batchNumber:
                      item.batchNumber.trim() ||
                      undefined,

                    expiryDate:
                      item.expiryDate ||
                      undefined,
                  }
                : undefined;

            return {
              purchaseOrderItem:
                item.purchaseOrderItemId ||
                undefined,

              product:
                item.productId,

              orderedQuantity:
                Math.max(
                  0,
                  toSafeNumber(
                    item.orderedQuantity,
                  ),
                ),

              receivedQuantity,

              acceptedQuantity,

              rejectedQuantity,

              unitCost:
                Math.max(
                  0,
                  toSafeNumber(
                    item.unitCost,
                  ),
                ),

              batchInformation,

              rejectionReason:
                rejectedQuantity > 0
                  ? item.remarks.trim()
                  : undefined,

              note:
                item.remarks.trim() ||
                undefined,
            };
          });

      /*
       * IMPORTANT:
       * This payload intentionally contains only fields accepted by
       * validateCreateGoodsReceived. Server-managed fields such as status,
       * totals, snapshots, posting state, and calculated line totals are not
       * submitted.
       */
      const payload = {
        purchaseOrder:
          form.purchaseOrderId,

        supplier:
          supplierId ||
          undefined,

        warehouse:
          form.warehouseId,

        source:
          "Purchase Order",

        receivedDate:
          new Date(
            `${form.receivedDate}T00:00:00`,
          ).toISOString(),

        supplierInvoiceNumber:
          form.supplierInvoiceNumber.trim() ||
          undefined,

        deliveryChallanNumber:
          form.challanNumber.trim() ||
          undefined,

        externalReferenceNumber:
          form.supplierDeliveryNote.trim() ||
          undefined,

        currency,

        exchangeRate: 1,

        transportInformation:
          form.vehicleNumber.trim()
            ? {
                vehicleNumber:
                  form.vehicleNumber.trim(),
              }
            : undefined,

        inspection: {
          required:
            form.inspectionStatus !==
            "Not Required",

          remarks:
            form.receivedBy.trim()
              ? `Received by: ${form.receivedBy.trim()}`
              : undefined,
        },

        receivingRemark:
          form.notes.trim() ||
          undefined,

        items:
          normalizedItems,
      };

      const response =
        await fetch(
          `${API_URL}/api/goods-received`,
          {
            method: "POST",

            headers:
              createHeaders({
                includeJson:
                  true,
              }),

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
          )) as CreateGoodsReceivedApiResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to create goods received record (${response.status}).`,
          ),
        );
      }

      const createdRecord =
        result.goodsReceived ||
        result.data?.goodsReceived ||
        result.data;

      const recordNumber =
        createdRecord
          ?.goodsReceivedNumber ||
        createdRecord
          ?.grnNumber ||
        createdRecord
          ?.receiptNumber ||
        "";

      setSuccess(
        recordNumber
          ? `${recordNumber} created successfully.`
          : "Goods received record created successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      window.setTimeout(() => {
        router.push(
          "/admin/supplier-and-purchase/goods-received",
        );

        router.refresh();
      }, 900);
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Failed to create goods received record.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            Create
          </span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Receiving
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Create Goods Received
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Receive products against
              an approved purchase
              order, record accepted and
              rejected quantities, and
              prepare the receipt for
              inventory posting.
            </p>
          </div>

          <Link
            href="/admin/supplier-and-purchase/goods-received"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Goods Received
          </Link>
        </header>

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

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Receipt Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the purchase
                order and provide the
                receiving details.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="purchaseOrderId"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Purchase Order
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <select
                  id="purchaseOrderId"
                  name="purchaseOrderId"
                  value={
                    form.purchaseOrderId
                  }
                  onChange={
                    handlePurchaseOrderChange
                  }
                  disabled={
                    loadingOptions ||
                    submitting
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading purchase orders..."
                      : "Select purchase order"}
                  </option>

                  {purchaseOrders.map(
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
                          purchaseOrder,
                        )}
                        {" — "}
                        {getEntityName(
                          purchaseOrder.supplier,
                          purchaseOrder.supplierName,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {!loadingOptions &&
                purchaseOrders.length ===
                  0 ? (
                  <p className="mt-2 text-sm text-amber-700">
                    No eligible purchase
                    orders were found.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="receivedDate"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Received Date
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="receivedDate"
                  name="receivedDate"
                  type="date"
                  max={
                    getTodayInputValue()
                  }
                  value={
                    form.receivedDate
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="warehouseId"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Warehouse
                  {warehouses.length >
                  0 ? (
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  ) : null}
                </label>

                <select
                  id="warehouseId"
                  name="warehouseId"
                  value={
                    form.warehouseId
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    loadingOptions ||
                    submitting
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading warehouses..."
                      : warehouses.length >
                          0
                        ? "Select warehouse"
                        : "No warehouse list available"}
                  </option>

                  {warehouses.map(
                    (warehouse) => (
                      <option
                        key={
                          warehouse._id
                        }
                        value={
                          warehouse._id
                        }
                      >
                        {getWarehouseName(
                          warehouse,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {!loadingOptions &&
                warehouses.length === 0 ? (
                  <p className="mt-2 text-sm font-medium text-amber-700">
                    No warehouse is available. Create an active warehouse
                    before submitting this receipt.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="supplierDeliveryNote"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Supplier Delivery Note
                </label>

                <input
                  id="supplierDeliveryNote"
                  name="supplierDeliveryNote"
                  type="text"
                  value={
                    form.supplierDeliveryNote
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Delivery note number"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="supplierInvoiceNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Supplier Invoice
                </label>

                <input
                  id="supplierInvoiceNumber"
                  name="supplierInvoiceNumber"
                  type="text"
                  value={
                    form.supplierInvoiceNumber
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Supplier invoice number"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="challanNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Challan Number
                </label>

                <input
                  id="challanNumber"
                  name="challanNumber"
                  type="text"
                  value={
                    form.challanNumber
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Supplier challan number"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="vehicleNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Vehicle Number
                </label>

                <input
                  id="vehicleNumber"
                  name="vehicleNumber"
                  type="text"
                  value={
                    form.vehicleNumber
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Delivery vehicle number"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="receivedBy"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Received By
                </label>

                <input
                  id="receivedBy"
                  name="receivedBy"
                  type="text"
                  value={
                    form.receivedBy
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Receiver name"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="inspectionStatus"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Inspection Status
                </label>

                <select
                  id="inspectionStatus"
                  name="inspectionStatus"
                  value={
                    form.inspectionStatus
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="Not Required">
                    Not Required
                  </option>

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="Rejected">
                    Rejected
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Receipt Status Preview
                </label>

                <select
                  id="status"
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    submitting
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                >
                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Received">
                    Received
                  </option>

                  <option value="Completed">
                    Completed
                  </option>
                </select>
              </div>
            </div>

            {loadingPurchaseOrder ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                Loading purchase order items...
              </div>
            ) : null}

            {selectedPurchaseOrder ? (
              <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Purchase Order
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {getPurchaseOrderNumber(
                      selectedPurchaseOrder,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Supplier
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {getEntityName(
                      selectedPurchaseOrder.supplier,
                      selectedPurchaseOrder.supplierName,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Currency
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {currency}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    PO Status
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedPurchaseOrder.status ||
                      "—"}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedPurchaseOrder &&
            !canReceivePurchaseOrder ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This purchase order is currently{" "}
                <strong>
                  {selectedPurchaseOrder.status ||
                    "Draft"}
                </strong>
                . Change it to Approved or Ordered before creating a goods received record.
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Received Items
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter received,
                  accepted and rejected
                  quantities for each
                  purchase order item.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    receiveAllPending
                  }
                  disabled={
                    items.length === 0 ||
                    submitting
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Receive All Pending
                </button>

                <button
                  type="button"
                  onClick={
                    clearReceivedQuantities
                  }
                  disabled={
                    items.length === 0 ||
                    submitting
                  }
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Quantities
                </button>
              </div>
            </div>

            {loadingPurchaseOrder ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-10 text-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />
                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Loading receivable purchase order items...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-10 text-center">
                <h3 className="text-base font-bold text-slate-800">
                  No receivable items found
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Select a purchase order with pending items. Items are loaded
                  automatically from the purchase-order details API.
                </p>
              </div>
            ) : (
              <div className="space-y-5 p-5 sm:p-6">
                {items.map(
                  (
                    item,
                    index,
                  ) => {
                    const acceptedValue =
                      item.acceptedQuantity *
                      item.unitCost;

                    return (
                      <article
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                      >
                        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {index +
                                1}
                              .{" "}
                              {
                                item.productName
                              }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              SKU:{" "}
                              {item.sku ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white px-4 py-2 text-right">
                            <p className="text-xs font-semibold text-slate-500">
                              Accepted Stock
                              Value
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatMoney(
                                acceptedValue,
                                currency,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Ordered
                            </label>

                            <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800">
                              {
                                item.orderedQuantity
                              }
                            </div>
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Previously
                              Received
                            </label>

                            <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800">
                              {
                                item.previouslyReceivedQuantity
                              }
                            </div>
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Pending
                            </label>

                            <div className="flex min-h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700">
                              {
                                item.pendingQuantity
                              }
                            </div>
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Received
                              <span className="ml-1 text-red-500">
                                *
                              </span>
                            </label>

                            <input
                              type="number"
                              min="0"
                              max={
                                item.pendingQuantity
                              }
                              step="0.01"
                              value={
                                item.receivedQuantity
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "receivedQuantity",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Accepted
                              <span className="ml-1 text-red-500">
                                *
                              </span>
                            </label>

                            <input
                              type="number"
                              min="0"
                              max={
                                item.receivedQuantity
                              }
                              step="0.01"
                              value={
                                item.acceptedQuantity
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "acceptedQuantity",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-emerald-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Rejected
                            </label>

                            <input
                              type="number"
                              min="0"
                              max={
                                item.receivedQuantity
                              }
                              step="0.01"
                              value={
                                item.rejectedQuantity
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "rejectedQuantity",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-red-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Unit Cost
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.unitCost
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "unitCost",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Tax %
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.taxRate
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "taxRate",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-2">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Discount
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.discountAmount
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "discountAmount",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-3">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Batch Number
                            </label>

                            <input
                              type="text"
                              value={
                                item.batchNumber
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "batchNumber",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              placeholder="Optional batch number"
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="xl:col-span-3">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Expiry Date
                            </label>

                            <input
                              type="date"
                              min={
                                form.receivedDate
                              }
                              value={
                                item.expiryDate
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "expiryDate",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>

                          <div className="md:col-span-2 xl:col-span-12">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Item Remarks
                            </label>

                            <input
                              type="text"
                              value={
                                item.remarks
                              }
                              onChange={(
                                event,
                              ) =>
                                handleItemChange(
                                  item.id,
                                  "remarks",
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                submitting
                              }
                              placeholder="Optional item inspection remarks"
                              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Additional Notes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add receiving,
                inspection or delivery
                notes.
              </p>

              <textarea
                id="notes"
                name="notes"
                rows={8}
                maxLength={3000}
                value={form.notes}
                onChange={
                  handleFormChange
                }
                disabled={
                  submitting
                }
                placeholder="Enter receiving notes"
                className="mt-5 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  form.notes.length
                }
                /3000
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Receipt Summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Items
                  </span>

                  <span className="font-semibold text-slate-900">
                    {
                      items.length
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Ordered Quantity
                  </span>

                  <span className="font-semibold text-slate-900">
                    {totals.orderedQuantity.toLocaleString(
                      "en-BD",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Received Quantity
                  </span>

                  <span className="font-semibold text-slate-900">
                    {totals.receivedQuantity.toLocaleString(
                      "en-BD",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Accepted Quantity
                  </span>

                  <span className="font-semibold text-emerald-700">
                    {totals.acceptedQuantity.toLocaleString(
                      "en-BD",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Rejected Quantity
                  </span>

                  <span className="font-semibold text-red-600">
                    {totals.rejectedQuantity.toLocaleString(
                      "en-BD",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatMoney(
                      totals.subtotal,
                      currency,
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
                      totals.discountTotal,
                      currency,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">
                    Tax
                  </span>

                  <span className="font-semibold text-slate-900">
                    {formatMoney(
                      totals.taxTotal,
                      currency,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-4">
                  <span className="text-sm font-semibold text-white">
                    Receipt Value
                  </span>

                  <span className="text-lg font-black text-white">
                    {formatMoney(
                      totals.grandTotal,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="flex flex-col-reverse justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:p-6">
            <Link
              href="/admin/supplier-and-purchase/goods-received"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingOptions ||
                loadingPurchaseOrder ||
                !form.purchaseOrderId ||
                !form.warehouseId ||
                !canReceivePurchaseOrder ||
                items.length === 0
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Creating Goods Received..."
                : "Create Goods Received"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}