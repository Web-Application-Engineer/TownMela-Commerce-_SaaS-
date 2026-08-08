"use client";

import Link from "next/link";

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PackageCheck,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type StatusHistoryItem = {
  _id?: string;
  bookingStatus?: string | null;
  deliveryStatus?: string | null;
  courierStatus?: string | null;
  message?: string | null;
  location?: string | null;
  source?: string;
  occurredAt?: string;
};

type ShipmentRecord = {
  _id?: string;
  id?: string;
  shipmentNumber?: string;
  orderNumber?: string;
  courierCode?: string;
  shipmentType?: string;
  packageType?: string;
  bookingStatus?: string;
  deliveryStatus?: string;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  currentLocation?: string | null;
  statusMessage?: string | null;
  cancellationReason?: string | null;
  paymentMethod?: string;
  weight?: number;
  weightUnit?: string;
  isActive?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  bookedAt?: string | null;
  deliveredAt?: string | null;
  expectedDeliveryAt?: string | null;
  lastSyncedAt?: string | null;

  recipient?: {
    name?: string;
    phone?: string;
    alternatePhone?: string | null;
    email?: string | null;
    addressLine?: string;
    area?: string | null;
    city?: string;
    district?: string | null;
    division?: string | null;
    postalCode?: string | null;
    country?: string;
    deliveryInstructions?: string | null;
  };

  pricing?: {
    orderAmount?: number;
    codAmount?: number;
    shippingCharge?: number;
    courierCharge?: number;
    collectionAmount?: number;
    collectedAmount?: number;
    returnCharge?: number;
    currency?: string;
  };

  courier?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        code?: string;
        providerType?: string;
      }
    | null;

  order?:
    | string
    | {
        _id?: string;
        id?: string;
        orderNumber?: string;
        status?: string;
        paymentStatus?: string;
      }
    | null;

  statusHistory?: StatusHistoryItem[];
};

type ShipmentResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    shipment?: ShipmentRecord;
  };
};

type TrackingResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    shipment?: {
      statusHistory?: StatusHistoryItem[];
    };
  };
};

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
  return payload?.message || payload?.error || fallback;
}

function formatLabel(value?: string | null): string {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(
  value?: number,
  currency = "BDT",
): string {
  const amount =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : 0;

  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `BDT ${amount.toLocaleString("en-BD")}`;
  }
}

function statusTone(
  value?: string | null,
): "success" | "danger" | "neutral" {
  if (
    value === "booked" ||
    value === "delivered"
  ) {
    return "success";
  }

  if (
    value === "failed" ||
    value === "delivery_failed" ||
    value === "returned" ||
    value === "cancelled"
  ) {
    return "danger";
  }

  return "neutral";
}

/* =========================================================
   PAGE
========================================================= */

export default function CourierShipmentDetailsPage() {
  const params = useParams<{
    shipmentId: string;
  }>();

  const {
    selectedTenantId,
  } = useTenant();

  const shipmentId =
    typeof params.shipmentId === "string"
      ? params.shipmentId
      : "";

  const [
    shipment,
    setShipment,
  ] =
    useState<ShipmentRecord | null>(
      null,
    );

  const [
    trackingHistory,
    setTrackingHistory,
  ] =
    useState<StatusHistoryItem[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    busyAction,
    setBusyAction,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const loadShipment =
    useCallback(async () => {
      if (!selectedTenantId) {
        setShipment(null);
        setTrackingHistory([]);
        setError(
          "Please select a tenant before continuing.",
        );
        setIsLoading(false);
        return;
      }

      if (!shipmentId) {
        setShipment(null);
        setTrackingHistory([]);
        setError(
          "Shipment identifier is missing.",
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [
          shipmentResponse,
          trackingResponse,
        ] = await Promise.all([
          tenantFetch(
            `/api/courier-shipments/${encodeURIComponent(
              shipmentId,
            )}`,
            {
              method: "GET",
              cache: "no-store",
            },
          ),

          tenantFetch(
            `/api/courier-shipments/${encodeURIComponent(
              shipmentId,
            )}/tracking`,
            {
              method: "GET",
              cache: "no-store",
            },
          ),
        ]);

        const shipmentPayload =
          (await shipmentResponse
            .json()
            .catch(
              () => null,
            )) as
            | ShipmentResponse
            | null;

        const trackingPayload =
          (await trackingResponse
            .json()
            .catch(
              () => null,
            )) as
            | TrackingResponse
            | null;

        if (!shipmentResponse.ok) {
          throw new Error(
            getErrorMessage(
              shipmentPayload,
              "Unable to load courier shipment.",
            ),
          );
        }

        const loadedShipment =
          shipmentPayload?.data
            ?.shipment;

        if (!loadedShipment) {
          throw new Error(
            "Shipment data was not found in the server response.",
          );
        }

        setShipment(
          loadedShipment,
        );

        if (trackingResponse.ok) {
          setTrackingHistory(
            trackingPayload?.data
              ?.shipment
              ?.statusHistory ||
              loadedShipment.statusHistory ||
              [],
          );
        } else {
          setTrackingHistory(
            loadedShipment.statusHistory ||
              [],
          );
        }
      } catch (loadError) {
        setShipment(null);
        setTrackingHistory([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong while loading the shipment.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      selectedTenantId,
      shipmentId,
    ]);

  useEffect(() => {
    void loadShipment();
  }, [loadShipment]);

  const courierName =
    useMemo(() => {
      if (
        shipment?.courier &&
        typeof shipment.courier ===
          "object"
      ) {
        return (
          shipment.courier.name ||
          shipment.courier.code ||
          "Courier"
        );
      }

      return (
        shipment?.courierCode ||
        "Courier"
      );
    }, [shipment]);

  const runAction = async (
    action:
      | "book"
      | "sync"
      | "archive"
      | "restore"
      | "cancel",
  ) => {
    if (!shipment) {
      return;
    }

    let reason = "";

    if (action === "cancel") {
      const enteredReason =
        window.prompt(
          "Enter the cancellation reason:",
        );

      if (!enteredReason?.trim()) {
        return;
      }

      reason =
        enteredReason.trim();
    }

    if (
      action === "archive" &&
      !window.confirm(
        "Archive this courier shipment?",
      )
    ) {
      return;
    }

    if (
      action === "restore" &&
      !window.confirm(
        "Restore this courier shipment?",
      )
    ) {
      return;
    }

    setBusyAction(action);
    setError(null);
    setMessage(null);

    try {
      let path = "";
      let method = "POST";
      let body:
        | string
        | undefined;

      if (action === "book") {
        path =
          `/api/courier-shipments/${shipmentId}/book`;
      }

      if (action === "sync") {
        path =
          `/api/courier-shipments/${shipmentId}/sync`;
      }

      if (
        action === "archive" ||
        action === "restore"
      ) {
        path =
          `/api/courier-shipments/${shipmentId}/archive`;

        method = "PATCH";

        body =
          JSON.stringify({
            isArchived:
              action ===
              "archive",
          });
      }

      if (action === "cancel") {
        path =
          `/api/courier-shipments/${shipmentId}/cancel`;

        method = "PATCH";

        body =
          JSON.stringify({
            reason,
          });
      }

      const response =
        await tenantFetch(
          path,
          {
            method,
            ...(body
              ? {
                  body,
                }
              : {}),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as
          | ShipmentResponse
          | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            "Shipment action failed.",
          ),
        );
      }

      setMessage(
        payload?.message ||
          "Shipment updated successfully.",
      );

      window.dispatchEvent(
        new Event(
          "courier-shipments-updated",
        ),
      );

      await loadShipment();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Shipment action failed.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[520px] max-w-[1500px] items-center justify-center">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <LoaderCircle
              size={42}
              className="mx-auto animate-spin text-[#FF6900]"
            />

            <h1 className="mt-5 text-xl font-black text-gray-900">
              Loading Shipment
            </h1>
          </div>
        </div>
      </main>
    );
  }

  if (!shipment) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle
              size={34}
              className="mx-auto text-red-500"
            />

            <h1 className="mt-4 text-xl font-black text-gray-900">
              Shipment Could Not Be Loaded
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error ||
                "Courier shipment was not found."}
            </p>

            <Link
              href="/admin/courier-shipments"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6900] px-5 text-sm font-extrabold text-white"
            >
              Back to Shipments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const currency =
    shipment.pricing
      ?.currency ||
    "BDT";

  const canBook =
    !shipment.isArchived &&
    shipment.bookingStatus !==
      "booked" &&
    shipment.bookingStatus !==
      "processing" &&
    shipment.deliveryStatus !==
      "delivered" &&
    shipment.deliveryStatus !==
      "returned" &&
    shipment.deliveryStatus !==
      "cancelled";

  const canSync =
    shipment.bookingStatus ===
      "booked" ||
    Boolean(
      shipment.trackingNumber ||
        shipment.consignmentId,
    );

  const canCancel =
    shipment.deliveryStatus !==
      "delivered" &&
    shipment.deliveryStatus !==
      "cancelled" &&
    shipment.bookingStatus !==
      "cancelled";

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6">
          <Link
            href="/admin/courier-shipments"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
          >
            <ArrowLeft size={17} />
            Back to Shipments
          </Link>

          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white">
                <PackageCheck size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
                  {shipment.shipmentNumber ||
                    "Courier Shipment"}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Order{" "}
                  {shipment.orderNumber ||
                    "-"}{" "}
                  · {courierName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/courier-shipments/${shipmentId}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-[#FF6900] transition hover:bg-orange-100"
              >
                <PencilLine size={17} />
                Manage Shipment
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadShipment()
                }
                disabled={
                  Boolean(
                    busyAction,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:opacity-50"
              >
                <RefreshCw size={17} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "book",
                  )
                }
                disabled={
                  !canBook ||
                  Boolean(
                    busyAction,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Truck size={17} />
                {busyAction ===
                "book"
                  ? "Booking..."
                  : "Book Shipment"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "sync",
                  )
                }
                disabled={
                  !canSync ||
                  Boolean(
                    busyAction,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#17181d] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw size={17} />
                {busyAction ===
                "sync"
                  ? "Syncing..."
                  : "Sync"}
              </button>

              {shipment.isArchived ? (
                <button
                  type="button"
                  onClick={() =>
                    void runAction(
                      "restore",
                    )
                  }
                  disabled={
                    Boolean(
                      busyAction,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700 disabled:opacity-40"
                >
                  <RotateCcw
                    size={17}
                  />
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void runAction(
                      "archive",
                    )
                  }
                  disabled={
                    Boolean(
                      busyAction,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 disabled:opacity-40"
                >
                  <Archive
                    size={17}
                  />
                  Archive
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "cancel",
                  )
                }
                disabled={
                  !canCancel ||
                  Boolean(
                    busyAction,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <XCircle size={17} />
                Cancel
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Booking Status"
            value={formatLabel(
              shipment.bookingStatus,
            )}
          />

          <SummaryCard
            label="Delivery Status"
            value={formatLabel(
              shipment.deliveryStatus,
            )}
          />

          <SummaryCard
            label="Tracking Number"
            value={
              shipment.trackingNumber ||
              shipment.consignmentId ||
              "-"
            }
          />

          <SummaryCard
            label="COD Amount"
            value={formatCurrency(
              shipment.pricing
                ?.codAmount,
              currency,
            )}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <InfoCard title="Shipment Information">
            <InfoRow
              label="Shipment Number"
              value={
                shipment.shipmentNumber
              }
            />
            <InfoRow
              label="Order Number"
              value={
                shipment.orderNumber
              }
            />
            <InfoRow
              label="Courier"
              value={courierName}
            />
            <InfoRow
              label="Shipment Type"
              value={formatLabel(
                shipment.shipmentType,
              )}
            />
            <InfoRow
              label="Package Type"
              value={formatLabel(
                shipment.packageType,
              )}
            />
            <InfoRow
              label="Payment Method"
              value={formatLabel(
                shipment.paymentMethod,
              )}
            />
            <InfoRow
              label="Weight"
              value={`${shipment.weight ?? 0} ${shipment.weightUnit || "kg"}`}
            />
            <InfoRow
              label="Created"
              value={formatDate(
                shipment.createdAt,
              )}
            />
          </InfoCard>

          <InfoCard title="Recipient">
            <InfoRow
              label="Name"
              value={
                shipment.recipient
                  ?.name
              }
            />
            <InfoRow
              label="Phone"
              value={
                shipment.recipient
                  ?.phone
              }
            />
            <InfoRow
              label="Alternate Phone"
              value={
                shipment.recipient
                  ?.alternatePhone
              }
            />
            <InfoRow
              label="Email"
              value={
                shipment.recipient
                  ?.email
              }
            />
            <InfoRow
              label="Address"
              value={
                shipment.recipient
                  ?.addressLine
              }
            />
            <InfoRow
              label="Area / City"
              value={[
                shipment.recipient
                  ?.area,
                shipment.recipient
                  ?.city,
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <InfoRow
              label="District"
              value={
                shipment.recipient
                  ?.district
              }
            />
            <InfoRow
              label="Country"
              value={
                shipment.recipient
                  ?.country
              }
            />
          </InfoCard>

          <InfoCard title="Pricing">
            <InfoRow
              label="Order Amount"
              value={formatCurrency(
                shipment.pricing
                  ?.orderAmount,
                currency,
              )}
            />
            <InfoRow
              label="COD Amount"
              value={formatCurrency(
                shipment.pricing
                  ?.codAmount,
                currency,
              )}
            />
            <InfoRow
              label="Shipping Charge"
              value={formatCurrency(
                shipment.pricing
                  ?.shippingCharge,
                currency,
              )}
            />
            <InfoRow
              label="Courier Charge"
              value={formatCurrency(
                shipment.pricing
                  ?.courierCharge,
                currency,
              )}
            />
            <InfoRow
              label="Collection Amount"
              value={formatCurrency(
                shipment.pricing
                  ?.collectionAmount,
                currency,
              )}
            />
            <InfoRow
              label="Collected Amount"
              value={formatCurrency(
                shipment.pricing
                  ?.collectedAmount,
                currency,
              )}
            />
          </InfoCard>

          <InfoCard title="Tracking">
            <InfoRow
              label="Courier Status"
              value={
                shipment.courierStatus
              }
            />
            <InfoRow
              label="Current Location"
              value={
                shipment.currentLocation
              }
            />
            <InfoRow
              label="Status Message"
              value={
                shipment.statusMessage
              }
            />
            <InfoRow
              label="Expected Delivery"
              value={formatDate(
                shipment.expectedDeliveryAt,
              )}
            />
            <InfoRow
              label="Booked At"
              value={formatDate(
                shipment.bookedAt,
              )}
            />
            <InfoRow
              label="Delivered At"
              value={formatDate(
                shipment.deliveredAt,
              )}
            />
            <InfoRow
              label="Last Synced"
              value={formatDate(
                shipment.lastSyncedAt,
              )}
            />
            <InfoRow
              label="Archived"
              value={
                shipment.isArchived
                  ? "Yes"
                  : "No"
              }
            />
          </InfoCard>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-black text-gray-900">
              Tracking Timeline
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest shipment events from admin actions, courier APIs and webhooks.
            </p>
          </div>

          {trackingHistory.length ? (
            <div className="divide-y divide-gray-100">
              {trackingHistory.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item._id ||
                      `${item.occurredAt}-${index}`
                    }
                    className="flex gap-4 px-5 py-4"
                  >
                    <div className="mt-1">
                      <StatusIcon
                        value={
                          item.deliveryStatus ||
                          item.bookingStatus
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-black text-gray-900">
                        {item.message ||
                          formatLabel(
                            item.deliveryStatus ||
                              item.bookingStatus,
                          )}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatLabel(
                          item.source,
                        )}
                        {item.location
                          ? ` · ${item.location}`
                          : ""}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        {formatDate(
                          item.occurredAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              No tracking history is available yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   PRESENTATION
========================================================= */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black text-gray-900">
        {value}
      </p>
    </article>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-lg font-black text-gray-900">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-gray-100 px-5">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <p className="text-sm font-bold text-gray-500">
        {label}
      </p>

      <p className="break-words text-sm font-semibold text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

function StatusIcon({
  value,
}: {
  value?: string | null;
}) {
  const tone =
    statusTone(value);

  if (tone === "success") {
    return (
      <CheckCircle2
        size={20}
        className="text-emerald-600"
      />
    );
  }

  if (tone === "danger") {
    return (
      <XCircle
        size={20}
        className="text-red-600"
      />
    );
  }

  return (
    <Clock3
      size={20}
      className="text-gray-400"
    />
  );
}
