"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  PencilLine,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type BookingStatus =
  | "pending"
  | "processing"
  | "booked"
  | "failed"
  | "cancelled";

type DeliveryStatus =
  | "pending"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned"
  | "partially_delivered"
  | "cancelled"
  | "unknown";

type CourierSummary = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
};

type OrderSummary = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
};

type CourierOption = {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
};

type CouriersResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    couriers?: CourierSummary[];
  };
};

type ShipmentApiRecord = {
  _id?: string;
  id?: string;
  shipmentNumber?: string;
  orderNumber?: string;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  courierReference?: string | null;
  bookingStatus?: string;
  deliveryStatus?: string;
  shipmentType?: string;
  paymentMethod?: string;
  isActive?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  expectedDeliveryAt?: string | null;
  bookedAt?: string | null;
  deliveredAt?: string | null;

  recipient?: {
    name?: string;
    phone?: string;
    city?: string;
    district?: string;
  };

  pricing?: {
    orderAmount?: number;
    codAmount?: number;
    shippingCharge?: number;
    courierCharge?: number;
    collectionAmount?: number;
    collectedAmount?: number;
    currency?: string;
  };

  courier?: CourierSummary | string | null;
  order?: OrderSummary | string | null;
};

type Shipment = {
  id: string;
  shipmentNumber: string;
  orderNumber: string;
  courierName: string;
  courierCode: string;
  recipientName: string;
  recipientPhone: string;
  trackingNumber: string;
  bookingStatus: BookingStatus;
  deliveryStatus: DeliveryStatus;
  shipmentType: string;
  paymentMethod: string;
  codAmount: number;
  currency: string;
  isArchived: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalShipments: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ShipmentsResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    shipments?: ShipmentApiRecord[];
    pagination?: Partial<Pagination>;
  };
};

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  totalShipments: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const BOOKING_STATUS_OPTIONS: Array<{
  value: "all" | BookingStatus;
  label: string;
}> = [
  { value: "all", label: "All Booking Status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "booked", label: "Booked" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const DELIVERY_STATUS_OPTIONS: Array<{
  value: "all" | DeliveryStatus;
  label: string;
}> = [
  { value: "all", label: "All Delivery Status" },
  { value: "pending", label: "Pending" },
  { value: "booked", label: "Booked" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "delivery_failed", label: "Delivery Failed" },
  { value: "returned", label: "Returned" },
  { value: "partially_delivered", label: "Partially Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unknown", label: "Unknown" },
];

/* =========================================================
   HELPERS
========================================================= */

function getErrorMessage(
  payload:
    | {
        message?: string;
        error?: string;
      }
    | null,
  fallback: string,
): string {
  return (
    payload?.message ||
    payload?.error ||
    fallback
  );
}

function normalizeBookingStatus(
  value?: string,
): BookingStatus {
  return [
    "pending",
    "processing",
    "booked",
    "failed",
    "cancelled",
  ].includes(value ?? "")
    ? (value as BookingStatus)
    : "pending";
}

function normalizeDeliveryStatus(
  value?: string,
): DeliveryStatus {
  return [
    "pending",
    "booked",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "delivery_failed",
    "returned",
    "partially_delivered",
    "cancelled",
    "unknown",
  ].includes(value ?? "")
    ? (value as DeliveryStatus)
    : "unknown";
}

function resolveCourier(
  courier: ShipmentApiRecord["courier"],
): {
  name: string;
  code: string;
} {
  if (
    courier &&
    typeof courier === "object"
  ) {
    return {
      name:
        courier.name?.trim() ||
        "Courier",
      code:
        courier.code?.trim() ||
        "-",
    };
  }

  return {
    name: "Courier",
    code: "-",
  };
}

function normalizeCourierOption(
  record: CourierSummary,
): CourierOption | null {
  const id =
    record._id ||
    record.id ||
    "";

  if (!id) {
    return null;
  }

  return {
    id,
    name:
      record.name?.trim() ||
      "Unnamed Courier",
    code:
      record.code?.trim() ||
      "-",
    isDefault:
      false,
  };
}

function escapeCsvValue(
  value: string | number,
): string {
  const text =
    String(value ?? "");

  if (
    /[",\n]/.test(text)
  ) {
    return `"${text.replace(
      /"/g,
      '""',
    )}"`;
  }

  return text;
}

function normalizeShipment(
  record: ShipmentApiRecord,
): Shipment | null {
  const id =
    record._id ||
    record.id ||
    "";

  if (!id) {
    return null;
  }

  const courier =
    resolveCourier(
      record.courier,
    );

  return {
    id,

    shipmentNumber:
      record.shipmentNumber?.trim() ||
      id,

    orderNumber:
      record.orderNumber?.trim() ||
      "-",

    courierName:
      courier.name,

    courierCode:
      courier.code,

    recipientName:
      record.recipient?.name?.trim() ||
      "-",

    recipientPhone:
      record.recipient?.phone?.trim() ||
      "-",

    trackingNumber:
      record.trackingNumber?.trim() ||
      record.consignmentId?.trim() ||
      "-",

    bookingStatus:
      normalizeBookingStatus(
        record.bookingStatus,
      ),

    deliveryStatus:
      normalizeDeliveryStatus(
        record.deliveryStatus,
      ),

    shipmentType:
      record.shipmentType?.trim() ||
      "forward",

    paymentMethod:
      record.paymentMethod?.trim() ||
      "cod",

    codAmount:
      typeof record.pricing?.codAmount ===
        "number" &&
      Number.isFinite(
        record.pricing.codAmount,
      )
        ? record.pricing.codAmount
        : 0,

    currency:
      record.pricing?.currency?.trim() ||
      "BDT",

    isArchived:
      Boolean(
        record.isArchived,
      ),

    createdAt:
      record.createdAt || "",
  };
}

function formatDate(
  value: string,
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
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
}

function formatCurrency(
  amount: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(
      "en-BD",
      {
        style: "currency",
        currency:
          currency || "BDT",
        maximumFractionDigits: 0,
      },
    ).format(amount);
  } catch {
    return `BDT ${amount.toLocaleString(
      "en-BD",
    )}`;
  }
}

function formatLabel(
  value: string,
): string {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function CourierShipmentsPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const [
    shipments,
    setShipments,
  ] =
    useState<Shipment[]>([]);

  const [
    couriers,
    setCouriers,
  ] =
    useState<CourierOption[]>([]);

  const [
    pagination,
    setPagination,
  ] =
    useState<Pagination>(
      DEFAULT_PAGINATION,
    );

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    bookingStatus,
    setBookingStatus,
  ] =
    useState<
      "all" | BookingStatus
    >("all");

  const [
    deliveryStatus,
    setDeliveryStatus,
  ] =
    useState<
      "all" | DeliveryStatus
    >("all");

  const [
    courierId,
    setCourierId,
  ] = useState("all");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("all");

  const [
    dateFrom,
    setDateFrom,
  ] = useState("");

  const [
    dateTo,
    setDateTo,
  ] = useState("");

  const [
    showArchived,
    setShowArchived,
  ] = useState(false);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const loadShipments =
    useCallback(
      async (
        showRefreshState = false,
      ) => {
        if (!selectedTenantId) {
          setShipments([]);
          setPagination(
            DEFAULT_PAGINATION,
          );

          setError(
            "Please select a tenant before continuing.",
          );

          setIsLoading(false);
          setIsRefreshing(false);

          return;
        }

        if (showRefreshState) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError(null);

        try {
          const query =
            new URLSearchParams();

          query.set(
            "page",
            String(page),
          );

          query.set(
            "limit",
            "20",
          );

          query.set(
            "isArchived",
            String(
              showArchived,
            ),
          );

          if (searchQuery) {
            query.set(
              "search",
              searchQuery,
            );
          }

          if (
            bookingStatus !==
            "all"
          ) {
            query.set(
              "bookingStatus",
              bookingStatus,
            );
          }

          if (
            deliveryStatus !==
            "all"
          ) {
            query.set(
              "deliveryStatus",
              deliveryStatus,
            );
          }

          if (
            courierId !==
            "all"
          ) {
            query.set(
              "courierId",
              courierId,
            );
          }

          if (
            paymentMethod !==
            "all"
          ) {
            query.set(
              "paymentMethod",
              paymentMethod,
            );
          }

          if (dateFrom) {
            query.set(
              "dateFrom",
              dateFrom,
            );
          }

          if (dateTo) {
            query.set(
              "dateTo",
              dateTo,
            );
          }

          const response =
            await tenantFetch(
              `/api/courier-shipments?${query.toString()}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () => null,
              )) as
              | ShipmentsResponse
              | null;

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                payload,
                "Unable to load courier shipments.",
              ),
            );
          }

          const normalizedShipments =
            (
              payload?.data
                ?.shipments || []
            )
              .map(
                normalizeShipment,
              )
              .filter(
                (
                  shipment,
                ): shipment is Shipment =>
                  Boolean(
                    shipment,
                  ),
              );

          const apiPagination =
            payload?.data
              ?.pagination;

          setShipments(
            normalizedShipments,
          );

          setPagination({
            page:
              apiPagination?.page ??
              page,

            limit:
              apiPagination?.limit ??
              20,

            totalShipments:
              apiPagination
                ?.totalShipments ??
              normalizedShipments.length,

            totalPages:
              apiPagination
                ?.totalPages ??
              1,

            hasNextPage:
              Boolean(
                apiPagination
                  ?.hasNextPage,
              ),

            hasPreviousPage:
              Boolean(
                apiPagination
                  ?.hasPreviousPage,
              ),
          });
        } catch (loadError) {
          setShipments([]);
          setPagination(
            DEFAULT_PAGINATION,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Something went wrong while loading courier shipments.",
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        bookingStatus,
        courierId,
        dateFrom,
        dateTo,
        deliveryStatus,
        page,
        paymentMethod,
        searchQuery,
        selectedTenantId,
        showArchived,
      ],
    );

  const loadCouriers =
    useCallback(
      async () => {
        if (!selectedTenantId) {
          setCouriers([]);
          return;
        }

        try {
          const response =
            await tenantFetch(
              "/api/couriers?limit=100&isActive=true",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () => null,
              )) as
              | CouriersResponse
              | null;

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                payload,
                "Unable to load courier providers.",
              ),
            );
          }

          setCouriers(
            (
              payload?.data
                ?.couriers || []
            )
              .map(
                normalizeCourierOption,
              )
              .filter(
                (
                  courier,
                ): courier is CourierOption =>
                  Boolean(
                    courier,
                  ),
              ),
          );
        } catch (loadError) {
          setCouriers([]);

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load courier providers.",
          );
        }
      },
      [selectedTenantId],
    );

  useEffect(() => {
    setShipments([]);
    setPagination(
      DEFAULT_PAGINATION,
    );
    setSearchInput("");
    setSearchQuery("");
    setBookingStatus("all");
    setDeliveryStatus("all");
    setCourierId("all");
    setPaymentMethod("all");
    setDateFrom("");
    setDateTo("");
    setShowArchived(false);
    setPage(1);
    setError(null);

    void loadCouriers();
  }, [
    loadCouriers,
    selectedTenantId,
  ]);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    const handleShipmentsUpdated =
      () => {
        void loadShipments(true);
      };

    window.addEventListener(
      "courier-shipments-updated",
      handleShipmentsUpdated,
    );

    return () => {
      window.removeEventListener(
        "courier-shipments-updated",
        handleShipmentsUpdated,
      );
    };
  }, [loadShipments]);

  const summary =
    useMemo(
      () => {
        return shipments.reduce(
          (
            current,
            shipment,
          ) => {
            current.visible += 1;

            if (
              shipment.bookingStatus ===
              "booked"
            ) {
              current.booked += 1;
            }

            if (
              shipment.deliveryStatus ===
              "delivered"
            ) {
              current.delivered += 1;
            }

            if (
              shipment.deliveryStatus ===
                "in_transit" ||
              shipment.deliveryStatus ===
                "out_for_delivery" ||
              shipment.deliveryStatus ===
                "picked_up"
            ) {
              current.inProgress += 1;
            }

            return current;
          },
          {
            visible: 0,
            booked: 0,
            delivered: 0,
            inProgress: 0,
          },
        );
      },
      [shipments],
    );

  const handleSearch = (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setPage(1);
    setSearchQuery(
      searchInput.trim(),
    );
  };

  const handleClearFilters =
    () => {
      setSearchInput("");
      setSearchQuery("");
      setBookingStatus("all");
      setDeliveryStatus("all");
      setCourierId("all");
      setPaymentMethod("all");
      setDateFrom("");
      setDateTo("");
      setShowArchived(false);
      setPage(1);
    };

  const handleExportCsv =
    () => {
      if (!shipments.length) {
        setError(
          "There are no visible shipments to export.",
        );
        return;
      }

      const headers = [
        "Shipment Number",
        "Order Number",
        "Courier",
        "Recipient",
        "Phone",
        "Tracking",
        "Booking Status",
        "Delivery Status",
        "Payment Method",
        "COD Amount",
        "Currency",
        "Created At",
      ];

      const rows =
        shipments.map(
          (shipment) => [
            shipment.shipmentNumber,
            shipment.orderNumber,
            shipment.courierName,
            shipment.recipientName,
            shipment.recipientPhone,
            shipment.trackingNumber,
            formatLabel(
              shipment.bookingStatus,
            ),
            formatLabel(
              shipment.deliveryStatus,
            ),
            formatLabel(
              shipment.paymentMethod,
            ),
            shipment.codAmount,
            shipment.currency,
            formatDate(
              shipment.createdAt,
            ),
          ],
        );

      const csv =
        [
          headers,
          ...rows,
        ]
          .map((row) =>
            row
              .map(
                escapeCsvValue,
              )
              .join(","),
          )
          .join("\n");

      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8;",
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href = url;
      link.download =
        `courier-shipments-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url,
      );
    };

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link
              href="/admin/couriers"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
            >
              <ArrowLeft
                size={17}
              />
              Back to Couriers
            </Link>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg shadow-orange-500/20">
                <PackageCheck
                  size={24}
                />
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  Courier Shipments
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  View and monitor shipments for the currently selected tenant.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={
                handleExportCsv
              }
              disabled={
                !shipments.length
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Export CSV
            </button>

            <Link
              href="/admin/courier-shipments/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600"
            >
              <PackageCheck size={17} />
              Create Shipment
            </Link>

          <button
            type="button"
            onClick={() =>
              void loadShipments(
                true,
              )
            }
            disabled={
              isRefreshing ||
              !selectedTenantId
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                isRefreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Shipments"
            value={String(
              pagination.totalShipments,
            )}
            icon={
              <PackageCheck
                size={21}
              />
            }
          />

          <StatCard
            title="Visible Booked"
            value={String(
              summary.booked,
            )}
            icon={
              <CheckCircle2
                size={21}
              />
            }
          />

          <StatCard
            title="Visible In Progress"
            value={String(
              summary.inProgress,
            )}
            icon={
              <Clock3
                size={21}
              />
            }
          />

          <StatCard
            title="Visible Delivered"
            value={String(
              summary.delivered,
            )}
            icon={
              <Truck
                size={21}
              />
            }
          />
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={
              handleSearch
            }
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={
                  searchInput
                }
                onChange={(
                  event,
                ) =>
                  setSearchInput(
                    event.target
                      .value,
                  )
                }
                placeholder="Shipment, order, tracking, recipient..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <select
              value={
                bookingStatus
              }
              onChange={(
                event,
              ) => {
                setPage(1);
                setBookingStatus(
                  event.target
                    .value as
                    | "all"
                    | BookingStatus,
                );
              }}
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              {BOOKING_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                deliveryStatus
              }
              onChange={(
                event,
              ) => {
                setPage(1);
                setDeliveryStatus(
                  event.target
                    .value as
                    | "all"
                    | DeliveryStatus,
                );
              }}
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              {DELIVERY_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                courierId
              }
              onChange={(
                event,
              ) => {
                setPage(1);
                setCourierId(
                  event.target
                    .value,
                );
              }}
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">
                All Couriers
              </option>

              {couriers.map(
                (courier) => (
                  <option
                    key={
                      courier.id
                    }
                    value={
                      courier.id
                    }
                  >
                    {courier.name} ({courier.code})
                  </option>
                ),
              )}
            </select>

            <select
              value={
                paymentMethod
              }
              onChange={(
                event,
              ) => {
                setPage(1);
                setPaymentMethod(
                  event.target
                    .value,
                );
              }}
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">
                All Payment Methods
              </option>
              <option value="cod">
                COD
              </option>
              <option value="prepaid">
                Prepaid
              </option>
              <option value="partial">
                Partial
              </option>
            </select>

            <label className="block">
              <span className="mb-1 block text-xs font-extrabold text-gray-500">
                From Date
              </span>

              <input
                type="date"
                value={
                  dateFrom
                }
                onChange={(
                  event,
                ) => {
                  setPage(1);
                  setDateFrom(
                    event.target
                      .value,
                  );
                }}
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-extrabold text-gray-500">
                To Date
              </span>

              <input
                type="date"
                value={
                  dateTo
                }
                min={
                  dateFrom ||
                  undefined
                }
                onChange={(
                  event,
                ) => {
                  setPage(1);
                  setDateTo(
                    event.target
                      .value,
                  );
                }}
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 md:self-end">
              <input
                type="checkbox"
                checked={
                  showArchived
                }
                onChange={(
                  event,
                ) => {
                  setPage(1);
                  setShowArchived(
                    event.target
                      .checked,
                  );
                }}
                className="h-4 w-4 accent-[#FF6900]"
              />

              Archived
            </label>

            <div className="flex gap-2 md:self-end">
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#17181d] px-5 text-sm font-extrabold text-white transition hover:bg-gray-800"
              >
                Search
              </button>

              <button
                type="button"
                onClick={
                  handleClearFilters
                }
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-600 transition hover:border-[#FF6900] hover:text-[#FF6900]"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Shipment List
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Showing {shipments.length} of{" "}
                {pagination.totalShipments} shipment
                {pagination.totalShipments !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
              <CalendarDays
                size={15}
              />

              Page {pagination.page} of{" "}
              {pagination.totalPages}
            </div>
          </div>

          {isLoading ? (
            <ShipmentListSkeleton />
          ) : shipments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
                    <th className="px-5 py-3">
                      Shipment
                    </th>
                    <th className="px-5 py-3">
                      Courier
                    </th>
                    <th className="px-5 py-3">
                      Recipient
                    </th>
                    <th className="px-5 py-3">
                      Tracking
                    </th>
                    <th className="px-5 py-3">
                      Booking
                    </th>
                    <th className="px-5 py-3">
                      Delivery
                    </th>
                    <th className="px-5 py-3">
                      COD
                    </th>
                    <th className="px-5 py-3">
                      Created
                    </th>
                    <th className="px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {shipments.map(
                    (shipment) => (
                      <tr
                        key={
                          shipment.id
                        }
                        className="align-top transition hover:bg-gray-50/70"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/courier-shipments/${shipment.id}`}
                            className="font-black text-gray-900 transition hover:text-[#FF6900]"
                          >
                            {shipment.shipmentNumber}
                          </Link>

                          <p className="mt-1 text-xs font-semibold text-gray-400">
                            Order:{" "}
                            {
                              shipment.orderNumber
                            }
                          </p>

                          <p className="mt-1 text-xs capitalize text-gray-400">
                            {
                              shipment.shipmentType
                            }{" "}
                            ·{" "}
                            {
                              shipment.paymentMethod
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-800">
                            {
                              shipment.courierName
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {
                              shipment.courierCode
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-800">
                            {
                              shipment.recipientName
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {
                              shipment.recipientPhone
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                          {
                            shipment.trackingNumber
                          }
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={
                              shipment.bookingStatus
                            }
                            tone={
                              shipment.bookingStatus ===
                              "booked"
                                ? "success"
                                : shipment.bookingStatus ===
                                    "failed" ||
                                  shipment.bookingStatus ===
                                    "cancelled"
                                  ? "danger"
                                  : "neutral"
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={
                              shipment.deliveryStatus
                            }
                            tone={
                              shipment.deliveryStatus ===
                              "delivered"
                                ? "success"
                                : shipment.deliveryStatus ===
                                      "delivery_failed" ||
                                    shipment.deliveryStatus ===
                                      "returned" ||
                                    shipment.deliveryStatus ===
                                      "cancelled"
                                  ? "danger"
                                  : "neutral"
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-gray-800">
                          {formatCurrency(
                            shipment.codAmount,
                            shipment.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                          {formatDate(
                            shipment.createdAt,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/courier-shipments/${shipment.id}`}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900]"
                            >
                              <Eye size={14} />
                              View
                            </Link>

                            <Link
                              href={`/admin/courier-shipments/${shipment.id}/edit`}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#17181d] px-3 text-xs font-extrabold text-white transition hover:bg-gray-800"
                            >
                              <PencilLine size={14} />
                              Manage
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <PackageCheck
                  size={28}
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-gray-900">
                No courier shipments found
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                No shipments match the current tenant, search or filters.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-500">
              Total{" "}
              {
                pagination.totalShipments
              }{" "}
              shipment
              {pagination.totalShipments !==
              1
                ? "s"
                : ""}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage ||
                  isLoading
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1,
                      ),
                  )
                }
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#FF6900] px-3 text-sm font-black text-white">
                {
                  pagination.page
                }
              </span>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage ||
                  isLoading
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1,
                  )
                }
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   PRESENTATION
========================================================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({
  value,
  tone,
}: {
  value: string;
  tone:
    | "success"
    | "danger"
    | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "danger"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}
    >
      {tone === "success" ? (
        <CheckCircle2
          size={13}
        />
      ) : tone === "danger" ? (
        <XCircle
          size={13}
        />
      ) : (
        <Clock3 size={13} />
      )}

      {formatLabel(value)}
    </span>
  );
}

function ShipmentListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3, 4].map(
        (item) => (
          <div
            key={item}
            className="grid animate-pulse gap-4 px-5 py-5 md:grid-cols-4 xl:grid-cols-9"
          >
            {Array.from({
              length: 9,
            }).map(
              (
                _value,
                index,
              ) => (
                <div
                  key={index}
                  className="h-10 rounded-lg bg-gray-100"
                />
              ),
            )}
          </div>
        ),
      )}
    </div>
  );
}
