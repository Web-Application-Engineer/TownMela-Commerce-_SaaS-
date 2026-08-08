"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  Save,
  Truck,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
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

type CourierApiRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

type ShipmentApiRecord = {
  _id?: string;
  id?: string;
  shipmentNumber?: string;
  orderNumber?: string;
  bookingStatus?: string;
  deliveryStatus?: string;
  courierStatus?: string | null;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  bookingId?: string | null;
  courierReference?: string | null;
  currentLocation?: string | null;
  statusMessage?: string | null;
  failureReason?: string | null;
  deliveryAttempts?: number;
  expectedDeliveryAt?: string | null;

  pricing?: {
    collectedAmount?: number;
  };

  courier?:
    | string
    | CourierApiRecord
    | null;
};

type ShipmentResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    shipment?: ShipmentApiRecord;
  };
};

type CouriersResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    couriers?: CourierApiRecord[];
  };
};

type CourierOption = {
  id: string;
  name: string;
  code: string;
  providerType: string;
  isDefault: boolean;
};

type StatusFormData = {
  bookingStatus: BookingStatus;
  deliveryStatus: DeliveryStatus;
  courierStatus: string;
  trackingNumber: string;
  consignmentId: string;
  bookingId: string;
  courierReference: string;
  currentLocation: string;
  statusMessage: string;
  failureReason: string;
  deliveryAttempts: string;
  collectedAmount: string;
  expectedDeliveryAt: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const BOOKING_OPTIONS: BookingStatus[] = [
  "pending",
  "processing",
  "booked",
  "failed",
  "cancelled",
];

const DELIVERY_OPTIONS: DeliveryStatus[] = [
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

function normalizeBookingStatus(
  value?: string,
): BookingStatus {
  return BOOKING_OPTIONS.includes(
    value as BookingStatus,
  )
    ? (value as BookingStatus)
    : "pending";
}

function normalizeDeliveryStatus(
  value?: string,
): DeliveryStatus {
  return DELIVERY_OPTIONS.includes(
    value as DeliveryStatus,
  )
    ? (value as DeliveryStatus)
    : "pending";
}

function normalizeCourier(
  record: CourierApiRecord,
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

    providerType:
      record.providerType?.trim() ||
      "manual",

    isDefault:
      Boolean(
        record.isDefault,
      ),
  };
}

function resolveCourierId(
  courier:
    ShipmentApiRecord["courier"],
): string {
  if (
    courier &&
    typeof courier === "object"
  ) {
    return (
      courier._id ||
      courier.id ||
      ""
    );
  }

  return typeof courier ===
    "string"
    ? courier
    : "";
}

function toDateTimeLocal(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60000,
    );

  return local
    .toISOString()
    .slice(0, 16);
}

function createStatusForm(
  shipment:
    ShipmentApiRecord,
): StatusFormData {
  return {
    bookingStatus:
      normalizeBookingStatus(
        shipment.bookingStatus,
      ),

    deliveryStatus:
      normalizeDeliveryStatus(
        shipment.deliveryStatus,
      ),

    courierStatus:
      shipment.courierStatus ||
      "",

    trackingNumber:
      shipment.trackingNumber ||
      "",

    consignmentId:
      shipment.consignmentId ||
      "",

    bookingId:
      shipment.bookingId ||
      "",

    courierReference:
      shipment.courierReference ||
      "",

    currentLocation:
      shipment.currentLocation ||
      "",

    statusMessage:
      shipment.statusMessage ||
      "",

    failureReason:
      shipment.failureReason ||
      "",

    deliveryAttempts:
      String(
        shipment.deliveryAttempts ??
          0,
      ),

    collectedAmount:
      String(
        shipment.pricing
          ?.collectedAmount ??
          0,
      ),

    expectedDeliveryAt:
      toDateTimeLocal(
        shipment.expectedDeliveryAt,
      ),
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function ManageCourierShipmentPage() {
  const params =
    useParams<{
      shipmentId: string;
    }>();

  const router =
    useRouter();

  const {
    selectedTenantId,
  } = useTenant();

  const shipmentId =
    typeof params.shipmentId ===
    "string"
      ? params.shipmentId
      : "";

  const [
    shipment,
    setShipment,
  ] =
    useState<ShipmentApiRecord | null>(
      null,
    );

  const [
    couriers,
    setCouriers,
  ] =
    useState<CourierOption[]>([]);

  const [
    selectedCourierId,
    setSelectedCourierId,
  ] = useState("");

  const [
    originalCourierId,
    setOriginalCourierId,
  ] = useState("");

  const [
    courierChangeReason,
    setCourierChangeReason,
  ] = useState("");

  const [
    formData,
    setFormData,
  ] =
    useState<StatusFormData | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSavingStatus,
    setIsSavingStatus,
  ] = useState(false);

  const [
    isAssigningCourier,
    setIsAssigningCourier,
  ] = useState(false);

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

  /* =======================================================
     LOAD PAGE DATA
  ======================================================= */

  const loadPageData =
    useCallback(
      async () => {
        if (!selectedTenantId) {
          setShipment(null);
          setCouriers([]);
          setFormData(null);

          setError(
            "Please select a tenant before continuing.",
          );

          setIsLoading(false);

          return;
        }

        if (!shipmentId) {
          setShipment(null);
          setCouriers([]);
          setFormData(null);

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
            couriersResponse,
          ] =
            await Promise.all([
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
                "/api/couriers?limit=100&isActive=true",
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

          const couriersPayload =
            (await couriersResponse
              .json()
              .catch(
                () => null,
              )) as
              | CouriersResponse
              | null;

          if (!shipmentResponse.ok) {
            throw new Error(
              getErrorMessage(
                shipmentPayload,
                "Unable to load courier shipment.",
              ),
            );
          }

          if (!couriersResponse.ok) {
            throw new Error(
              getErrorMessage(
                couriersPayload,
                "Unable to load courier providers.",
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

          const normalizedCouriers =
            (
              couriersPayload?.data
                ?.couriers || []
            )
              .map(
                normalizeCourier,
              )
              .filter(
                (
                  courier,
                ): courier is CourierOption =>
                  Boolean(
                    courier,
                  ),
              );

          const courierId =
            resolveCourierId(
              loadedShipment.courier,
            );

          setShipment(
            loadedShipment,
          );

          setCouriers(
            normalizedCouriers,
          );

          setOriginalCourierId(
            courierId,
          );

          setSelectedCourierId(
            courierId,
          );

          setCourierChangeReason(
            "",
          );

          setFormData(
            createStatusForm(
              loadedShipment,
            ),
          );
        } catch (loadError) {
          setShipment(null);
          setCouriers([]);
          setFormData(null);

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Something went wrong while loading the shipment.",
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        selectedTenantId,
        shipmentId,
      ],
    );

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  /* =======================================================
     DERIVED STATE
  ======================================================= */

  const courierChanged =
    useMemo(
      () =>
        Boolean(
          selectedCourierId &&
            selectedCourierId !==
              originalCourierId,
        ),
      [
        selectedCourierId,
        originalCourierId,
      ],
    );

  /* =======================================================
     STATUS FIELD UPDATE
  ======================================================= */

  const updateField = <
    K extends
      keyof StatusFormData,
  >(
    field: K,
    value:
      StatusFormData[K],
  ) => {
    setFormData(
      (current) =>
        current
          ? {
              ...current,
              [field]:
                value,
            }
          : current,
    );

    setError(null);
    setMessage(null);
  };

  /* =======================================================
     SAVE STATUS
  ======================================================= */

  const handleStatusSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        !formData ||
        !shipmentId
      ) {
        return;
      }

      if (!selectedTenantId) {
        setError(
          "Please select a tenant before continuing.",
        );

        return;
      }

      setIsSavingStatus(true);
      setError(null);
      setMessage(null);

      try {
        const response =
          await tenantFetch(
            `/api/courier-shipments/${encodeURIComponent(
              shipmentId,
            )}/status`,
            {
              method: "PATCH",

              body:
                JSON.stringify(
                  {
                    bookingStatus:
                      formData.bookingStatus,

                    deliveryStatus:
                      formData.deliveryStatus,

                    courierStatus:
                      formData.courierStatus.trim() ||
                      null,

                    trackingNumber:
                      formData.trackingNumber.trim() ||
                      null,

                    consignmentId:
                      formData.consignmentId.trim() ||
                      null,

                    bookingId:
                      formData.bookingId.trim() ||
                      null,

                    courierReference:
                      formData.courierReference.trim() ||
                      null,

                    currentLocation:
                      formData.currentLocation.trim() ||
                      null,

                    statusMessage:
                      formData.statusMessage.trim() ||
                      null,

                    failureReason:
                      formData.failureReason.trim() ||
                      null,

                    deliveryAttempts:
                      Math.max(
                        Number(
                          formData.deliveryAttempts,
                        ) || 0,
                        0,
                      ),

                    collectedAmount:
                      Math.max(
                        Number(
                          formData.collectedAmount,
                        ) || 0,
                        0,
                      ),

                    expectedDeliveryAt:
                      formData.expectedDeliveryAt
                        ? new Date(
                            formData.expectedDeliveryAt,
                          ).toISOString()
                        : null,

                    source:
                      "admin",
                  },
                ),
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
              "Unable to update shipment status.",
            ),
          );
        }

        const updatedShipment =
          payload?.data
            ?.shipment;

        if (updatedShipment) {
          setShipment(
            updatedShipment,
          );

          setFormData(
            createStatusForm(
              updatedShipment,
            ),
          );
        }

        setMessage(
          payload?.message ||
            "Shipment status updated successfully.",
        );

        window.dispatchEvent(
          new Event(
            "courier-shipments-updated",
          ),
        );
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to update shipment status.",
        );
      } finally {
        setIsSavingStatus(
          false,
        );
      }
    };

  /* =======================================================
     ASSIGN / CHANGE COURIER
  ======================================================= */

  const handleCourierAssign =
    async () => {
      if (
        !selectedCourierId ||
        !shipmentId
      ) {
        setError(
          "Please select a courier.",
        );

        return;
      }

      if (!selectedTenantId) {
        setError(
          "Please select a tenant before continuing.",
        );

        return;
      }

      if (!courierChanged) {
        setMessage(
          "The selected courier is already assigned to this shipment.",
        );

        return;
      }

      setIsAssigningCourier(
        true,
      );

      setError(null);
      setMessage(null);

      try {
        const response =
          await tenantFetch(
            `/api/courier-shipments/${encodeURIComponent(
              shipmentId,
            )}/courier`,
            {
              method: "PATCH",

              body:
                JSON.stringify(
                  {
                    courierId:
                      selectedCourierId,

                    reason:
                      courierChangeReason.trim() ||
                      "Courier changed by admin",
                  },
                ),
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
              "Unable to assign courier.",
            ),
          );
        }

        const updatedShipment =
          payload?.data
            ?.shipment;

        if (updatedShipment) {
          setShipment(
            updatedShipment,
          );

          const courierId =
            resolveCourierId(
              updatedShipment.courier,
            );

          setOriginalCourierId(
            courierId,
          );

          setSelectedCourierId(
            courierId,
          );
        }

        setCourierChangeReason(
          "",
        );

        setMessage(
          payload?.message ||
            "Courier assigned successfully.",
        );

        window.dispatchEvent(
          new Event(
            "courier-shipments-updated",
          ),
        );
      } catch (assignError) {
        setError(
          assignError instanceof Error
            ? assignError.message
            : "Unable to assign courier.",
        );
      } finally {
        setIsAssigningCourier(
          false,
        );
      }
    };

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

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

  if (
    !shipment ||
    !formData
  ) {
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

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-6">
          <Link
            href={`/admin/courier-shipments/${shipmentId}`}
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
          >
            <ArrowLeft size={17} />
            Back to Shipment
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg shadow-orange-500/20">
              <PackageCheck
                size={24}
              />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Manage Shipment
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {shipment.shipmentNumber ||
                  shipmentId}{" "}
                · Order{" "}
                {shipment.orderNumber ||
                  "-"}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* STATUS UPDATE */}

          <form
            onSubmit={
              handleStatusSubmit
            }
            className="rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-black text-gray-900">
                Shipment Status
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Update booking, delivery, tracking and collection information.
              </p>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <SelectField
                label="Booking Status"
                value={
                  formData.bookingStatus
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "bookingStatus",
                    value as BookingStatus,
                  )
                }
                options={BOOKING_OPTIONS.map(
                  (
                    value,
                  ) => ({
                    value,
                    label:
                      formatLabel(
                        value,
                      ),
                  }),
                )}
              />

              <SelectField
                label="Delivery Status"
                value={
                  formData.deliveryStatus
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "deliveryStatus",
                    value as DeliveryStatus,
                  )
                }
                options={DELIVERY_OPTIONS.map(
                  (
                    value,
                  ) => ({
                    value,
                    label:
                      formatLabel(
                        value,
                      ),
                  }),
                )}
              />

              <TextField
                label="Courier Status"
                value={
                  formData.courierStatus
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "courierStatus",
                    value,
                  )
                }
              />

              <TextField
                label="Tracking Number"
                value={
                  formData.trackingNumber
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "trackingNumber",
                    value,
                  )
                }
              />

              <TextField
                label="Consignment ID"
                value={
                  formData.consignmentId
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "consignmentId",
                    value,
                  )
                }
              />

              <TextField
                label="Booking ID"
                value={
                  formData.bookingId
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "bookingId",
                    value,
                  )
                }
              />

              <TextField
                label="Courier Reference"
                value={
                  formData.courierReference
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "courierReference",
                    value,
                  )
                }
              />

              <TextField
                label="Current Location"
                value={
                  formData.currentLocation
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "currentLocation",
                    value,
                  )
                }
              />

              <NumberField
                label="Delivery Attempts"
                value={
                  formData.deliveryAttempts
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "deliveryAttempts",
                    value,
                  )
                }
              />

              <NumberField
                label="Collected Amount"
                value={
                  formData.collectedAmount
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "collectedAmount",
                    value,
                  )
                }
              />

              <label className="block">
                <span className="text-sm font-extrabold text-gray-800">
                  Expected Delivery
                </span>

                <input
                  type="datetime-local"
                  value={
                    formData.expectedDeliveryAt
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "expectedDeliveryAt",
                      event.target.value,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Status Message"
                  value={
                    formData.statusMessage
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "statusMessage",
                      value,
                    )
                  }
                />
              </div>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Failure Reason"
                  value={
                    formData.failureReason
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "failureReason",
                      value,
                    )
                  }
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 px-5 py-4">
              <button
                type="submit"
                disabled={
                  isSavingStatus
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-6 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingStatus ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save
                      size={18}
                    />
                    Save Status
                  </>
                )}
              </button>
            </div>
          </form>

          {/* COURIER ASSIGNMENT */}

          <section className="h-fit rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                  <Truck size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Courier Assignment
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Change the assigned courier before the shipment is booked.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <SelectField
                label="Assigned Courier"
                value={
                  selectedCourierId
                }
                onChange={(
                  value,
                ) => {
                  setSelectedCourierId(
                    value,
                  );

                  setError(null);
                  setMessage(null);
                }}
                options={[
                  {
                    value: "",
                    label:
                      "Select a courier",
                  },

                  ...couriers.map(
                    (
                      courier,
                    ) => ({
                      value:
                        courier.id,

                      label:
                        `${courier.name} (${courier.code})${
                          courier.isDefault
                            ? " · Default"
                            : ""
                        }`,
                    }),
                  ),
                ]}
              />

              <TextAreaField
                label="Change Reason"
                value={
                  courierChangeReason
                }
                onChange={(
                  value,
                ) => {
                  setCourierChangeReason(
                    value,
                  );

                  setError(null);
                  setMessage(null);
                }}
              />

              <button
                type="button"
                onClick={() =>
                  void handleCourierAssign()
                }
                disabled={
                  isAssigningCourier ||
                  !courierChanged
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17181d] px-5 text-sm font-extrabold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAssigningCourier ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Truck size={18} />
                    Change Courier
                  </>
                )}
              </button>

              <p className="text-xs leading-5 text-gray-400">
                The backend will block courier changes for already booked or completed shipments.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/admin/courier-shipments/${shipmentId}`,
              )
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900]"
          >
            Done
          </button>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   PRESENTATION COMPONENTS
========================================================= */

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <select
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      >
        {options.map(
          (
            option,
          ) => (
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
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <textarea
        rows={4}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}
