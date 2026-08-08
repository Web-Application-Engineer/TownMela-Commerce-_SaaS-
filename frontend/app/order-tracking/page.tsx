"use client";

import Image from "next/image";

import {
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  LoaderCircle,
  Mail,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  Search,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

/* =========================================================
   ORDER STATUS CONFIGURATION
========================================================= */

const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
] as const;

type OrderStatus =
  | (typeof ORDER_STATUSES)[number]
  | "Cancelled";

/* =========================================================
   TYPES
========================================================= */

type OrderCustomer = {
  fullName?: string;
  phone?: string;
  email?: string | null;
};

type ShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  postalCode?: string | null;
};

type OrderItem = {
  _id?: string;
  product?: string;

  name: string;

  slug?: string | null;
  image?: string;

  quantity: number;
  price: number;
  lineTotal: number;

  selectedSize?: string | null;
  selectedColor?: string | null;
};

type StatusHistoryItem = {
  status: string;

  note?: string | null;

  changedAt: string;
};

type TrackedOrder = {
  _id: string;

  orderNumber: string;

  guestId?: string;

  customer?: OrderCustomer;

  shippingAddress?: ShippingAddress;

  items?: OrderItem[];

  subtotalAmount?: number;
  deliveryCharge?: number;
  discountAmount?: number;

  couponCode?: string | null;

  totalAmount: number;

  paymentMethod: string;
  paymentStatus: string;

  orderStatus: OrderStatus;

  statusHistory?: StatusHistoryItem[];

  customerNote?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type TrackOrderApiResponse = {
  success?: boolean;
  message?: string;
  order?: TrackedOrder;
};

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(
  value?: number,
) {
  return `৳${Number(
    value || 0,
  ).toLocaleString("en-BD")}`;
}

function formatDateTime(
  value?: string,
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getStatusIndex(
  status: OrderStatus,
) {
  return ORDER_STATUSES.indexOf(
    status as
      (typeof ORDER_STATUSES)[number],
  );
}

function getStatusIcon(
  status: string,
) {
  switch (status) {
    case "Pending":
      return Clock3;

    case "Processing":
      return PackageOpen;

    case "Shipped":
      return Truck;

    case "Delivered":
      return PackageCheck;

    case "Cancelled":
      return XCircle;

    default:
      return History;
  }
}

/* =========================================================
   ORDER TRACKING PAGE
========================================================= */

export default function OrderTrackingPage() {
  const [
    orderNumber,
    setOrderNumber,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    order,
    setOrder,
  ] =
    useState<TrackedOrder | null>(
      null,
    );

  /* =======================================================
     LOAD ORDER NUMBER FROM URL
  ======================================================= */

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search,
      );

    const orderNumberFromUrl =
      searchParams.get(
        "orderNumber",
      );

    if (orderNumberFromUrl) {
      setOrderNumber(
        orderNumberFromUrl
          .trim()
          .toUpperCase(),
      );
    }
  }, []);

  /* =======================================================
     TRACK ORDER
  ======================================================= */

  const handleTrackOrder =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const normalizedOrderNumber =
        orderNumber
          .trim()
          .toUpperCase();

      const normalizedPhone =
        phone
          .trim()
          .replace(
            /[\s\-()]/g,
            "",
          );

      if (
        !normalizedOrderNumber
      ) {
        setErrorMessage(
          "Please enter your order number.",
        );

        setOrder(null);

        return;
      }

      if (!normalizedPhone) {
        setErrorMessage(
          "Please enter your phone number.",
        );

        setOrder(null);

        return;
      }

      if (
        !/^\+?[0-9]{7,15}$/.test(
          normalizedPhone,
        )
      ) {
        setErrorMessage(
          "Please enter a valid phone number.",
        );

        setOrder(null);

        return;
      }

      try {
        setIsLoading(true);

        setErrorMessage("");

        setOrder(null);

        /*
         * IMPORTANT:
         *
         * Public storefront does NOT send tenantId from
         * localStorage.
         *
         * Backend must resolve the tenant from the current
         * store domain / host using the public tenant resolver.
         *
         * This prevents one tenant's browser data from being
         * used to access another tenant's orders.
         */
        const response =
          await fetch(
            `${API_BASE_URL}/api/orders/track`,
            {
              method: "POST",

              cache:
                "no-store",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  orderNumber:
                    normalizedOrderNumber,

                  phone:
                    normalizedPhone,
                }),
            },
          );

        const data =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | TrackOrderApiResponse
            | null;

        if (
          !response.ok ||
          !data?.order
        ) {
          throw new Error(
            data?.message ||
              "Order tracking information could not be loaded.",
          );
        }

        setOrder(
          data.order,
        );
      } catch (error) {
        console.error(
          "Order tracking error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while tracking your order.",
        );
      } finally {
        setIsLoading(false);
      }
    };

  /* =======================================================
     STATUS
  ======================================================= */

  const currentStatusIndex =
    order
      ? getStatusIndex(
          order.orderStatus,
        )
      : -1;

  const isCancelled =
    order?.orderStatus ===
    "Cancelled";

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen w-full bg-[#F7F8FA]">
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px]">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="mb-6 flex w-full flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#FF6900]">
              TownMela
            </span>

            <span className="text-sm font-semibold text-blue-500">
              /
            </span>

            <h1 className="rounded-full border border-orange-500 bg-[#4C5B6F] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
              Order Tracking
            </h1>
          </div>

          {/* =================================================
              TRACKING FORM
          ================================================= */}

          <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 shadow-sm">
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#FF6900]">
                Track Your Order
              </span>

              <h2 className="mt-4 text-2xl font-extrabold leading-tight text-[#0B1F3A] sm:text-3xl">
                Check Your Order Status
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                Enter your order number
                and customer phone number
                to view the latest order
                status, products and
                shipping information.
              </p>

              <form
                onSubmit={
                  handleTrackOrder
                }
                className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                {/* ORDER NUMBER */}

                <div>
                  <label
                    htmlFor="orderNumber"
                    className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                  >
                    Order Number
                  </label>

                  <div className="relative">
                    <PackageOpen
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="orderNumber"
                      type="text"
                      value={
                        orderNumber
                      }
                      onChange={(
                        event,
                      ) =>
                        setOrderNumber(
                          event.target
                            .value,
                        )
                      }
                      placeholder="TM-20260714-A913AA"
                      autoComplete="off"
                      disabled={
                        isLoading
                      }
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* PHONE */}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="phone"
                      type="tel"
                      value={
                        phone
                      }
                      onChange={(
                        event,
                      ) =>
                        setPhone(
                          event.target
                            .value,
                        )
                      }
                      placeholder="017XXXXXXXX"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={
                        isLoading
                      }
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* BUTTON */}

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={
                      isLoading
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle
                          size={18}
                          className="animate-spin"
                        />

                        Tracking...
                      </>
                    ) : (
                      <>
                        <Search
                          size={18}
                        />

                        Track Order
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {errorMessage && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600"
            >
              <XCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="text-sm font-extrabold">
                  Order Not Found
                </p>

                <p className="mt-1 text-sm leading-6">
                  {
                    errorMessage
                  }
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              ORDER RESULT
          ================================================= */}

          {order && (
            <div className="mt-7 space-y-5">
              {/* =============================================
                  ORDER OVERVIEW
              ============================================= */}

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={21}
                        className="text-emerald-600"
                      />

                      <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                        Order Found
                      </h2>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Order Number:{" "}
                      <span className="font-extrabold text-[#0B1F3A]">
                        {
                          order.orderNumber
                        }
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Placed on{" "}
                      {formatDateTime(
                        order.createdAt,
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide ${
                      isCancelled
                        ? "bg-red-50 text-red-600"
                        : order.orderStatus ===
                            "Delivered"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-[#FF6900]"
                    }`}
                  >
                    {
                      order.orderStatus
                    }
                  </span>
                </div>

                {/* ===========================================
                    STATUS TIMELINE
                =========================================== */}

                <div className="px-5 py-7 sm:px-6 lg:px-8">
                  <div className="mb-6 flex items-center gap-2">
                    <Truck
                      size={20}
                      className="text-[#FF6900]"
                    />

                    <h3 className="font-extrabold text-[#0B1F3A]">
                      Delivery Progress
                    </h3>
                  </div>

                  {isCancelled ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-7 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <XCircle
                          size={26}
                        />
                      </div>

                      <h4 className="mt-3 text-lg font-extrabold text-red-600">
                        Order Cancelled
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-red-500">
                        This order has been
                        cancelled and will
                        not proceed to
                        delivery.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-4">
                      {ORDER_STATUSES.map(
                        (
                          status,
                          index,
                        ) => {
                          const isCompleted =
                            index <
                            currentStatusIndex;

                          const isCurrent =
                            index ===
                            currentStatusIndex;

                          const isActive =
                            isCompleted ||
                            isCurrent;

                          return (
                            <div
                              key={
                                status
                              }
                              className="relative flex gap-4 pb-7 last:pb-0 sm:block sm:pb-0 sm:text-center"
                            >
                              {index <
                                ORDER_STATUSES.length -
                                  1 && (
                                <>
                                  <div
                                    className={`absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-0.5 sm:hidden ${
                                      isCompleted
                                        ? "bg-[#FF6900]"
                                        : "bg-gray-200"
                                    }`}
                                  />

                                  <div
                                    className={`absolute left-1/2 top-5 hidden h-0.5 w-full sm:block ${
                                      isCompleted
                                        ? "bg-[#FF6900]"
                                        : "bg-gray-200"
                                    }`}
                                  />
                                </>
                              )}

                              <div
                                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold sm:mx-auto ${
                                  isCompleted
                                    ? "border-[#FF6900] bg-[#FF6900] text-white"
                                    : isCurrent
                                      ? "border-[#FF6900] bg-orange-50 text-[#FF6900]"
                                      : "border-gray-200 bg-white text-gray-400"
                                }`}
                              >
                                {isCompleted ? (
                                  <Check
                                    size={
                                      18
                                    }
                                  />
                                ) : (
                                  index +
                                  1
                                )}
                              </div>

                              <div className="pt-1 sm:mt-3 sm:pt-0">
                                <p
                                  className={`text-sm font-extrabold ${
                                    isActive
                                      ? "text-[#0B1F3A]"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {
                                    status
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  {isCompleted
                                    ? "Completed"
                                    : isCurrent
                                      ? "Current Status"
                                      : "Waiting"}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* =============================================
                  CUSTOMER AND SHIPPING
              ============================================= */}

              <div className="grid gap-5 lg:grid-cols-2">
                {/* CUSTOMER */}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <UserRound
                      size={19}
                      className="text-[#FF6900]"
                    />

                    <h3 className="font-extrabold text-[#0B1F3A]">
                      Customer Information
                    </h3>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <UserRound
                        size={18}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Full Name
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                          {order
                            .customer
                            ?.fullName ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone
                        size={18}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Phone
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                          {order
                            .customer
                            ?.phone ||
                            "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail
                        size={18}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Email
                        </p>

                        <p className="mt-1 break-all text-sm font-bold text-[#0B1F3A]">
                          {order
                            .customer
                            ?.email ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SHIPPING */}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <MapPin
                      size={19}
                      className="text-[#FF6900]"
                    />

                    <h3 className="font-extrabold text-[#0B1F3A]">
                      Shipping Address
                    </h3>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Division
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                        {order
                          .shippingAddress
                          ?.division ||
                          "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        District
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                        {order
                          .shippingAddress
                          ?.district ||
                          "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Area
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                        {order
                          .shippingAddress
                          ?.area ||
                          "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Postal Code
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                        {order
                          .shippingAddress
                          ?.postalCode ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Full Address
                      </p>

                      <p className="mt-1 text-sm font-bold leading-6 text-[#0B1F3A]">
                        {order
                          .shippingAddress
                          ?.address ||
                          "Not available"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =============================================
                  PRODUCTS AND SUMMARY
              ============================================= */}

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* PRODUCTS */}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <PackageCheck
                        size={19}
                        className="text-[#FF6900]"
                      />

                      <h3 className="font-extrabold text-[#0B1F3A]">
                        Ordered Products
                      </h3>
                    </div>

                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-[#FF6900]">
                      {order.items
                        ?.length ||
                        0}{" "}
                      Items
                    </span>
                  </div>

                  {order.items &&
                  order.items.length >
                    0 ? (
                    <div className="divide-y divide-gray-200">
                      {order.items.map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={
                              item._id ||
                              `${item.product}-${index}`
                            }
                            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
                          >
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                              {item.image ? (
                                <Image
                                  src={
                                    item.image
                                  }
                                  alt={
                                    item.name
                                  }
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                                  No Image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-extrabold leading-6 text-[#0B1F3A] sm:text-base">
                                {
                                  item.name
                                }
                              </h4>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.selectedSize && (
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                    Size:{" "}
                                    {
                                      item.selectedSize
                                    }
                                  </span>
                                )}

                                {item.selectedColor && (
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                    Color:{" "}
                                    {
                                      item.selectedColor
                                    }
                                  </span>
                                )}

                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                  Quantity:{" "}
                                  {
                                    item.quantity
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:block sm:min-w-[130px] sm:text-right">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                  Unit Price
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#0B1F3A]">
                                  {formatPrice(
                                    item.price,
                                  )}
                                </p>
                              </div>

                              <div className="sm:mt-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                  Line Total
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#FF6900]">
                                  {formatPrice(
                                    item.lineTotal,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-500">
                      No product information
                      is available.
                    </div>
                  )}
                </div>

                {/* SUMMARY */}

                <div className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                    <CreditCard
                      size={19}
                      className="text-[#FF6900]"
                    />

                    <h3 className="font-extrabold text-[#0B1F3A]">
                      Order Summary
                    </h3>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">
                        Subtotal
                      </span>

                      <span className="font-bold text-[#0B1F3A]">
                        {formatPrice(
                          order.subtotalAmount,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">
                        Delivery Charge
                      </span>

                      <span className="font-bold text-[#0B1F3A]">
                        {formatPrice(
                          order.deliveryCharge,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">
                        Discount
                      </span>

                      <span className="font-bold text-emerald-600">
                        -
                        {formatPrice(
                          order.discountAmount,
                        )}
                      </span>
                    </div>

                    {order.couponCode && (
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-500">
                          Coupon
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                          {
                            order.couponCode
                          }
                        </span>
                      </div>
                    )}

                    <div className="border-t border-dashed border-gray-300 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-extrabold text-[#0B1F3A]">
                          Total Amount
                        </span>

                        <span className="text-xl font-black text-[#FF6900]">
                          {formatPrice(
                            order.totalAmount,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-500">
                          Payment Method
                        </span>

                        <span className="font-extrabold text-[#0B1F3A]">
                          {
                            order.paymentMethod
                          }
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-500">
                          Payment Status
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            order.paymentStatus ===
                            "Paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-orange-50 text-[#FF6900]"
                          }`}
                        >
                          {
                            order.paymentStatus
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* =============================================
                  STATUS HISTORY
              ============================================= */}

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 sm:px-6">
                  <History
                    size={19}
                    className="text-[#FF6900]"
                  />

                  <h3 className="font-extrabold text-[#0B1F3A]">
                    Status History
                  </h3>
                </div>

                {order.statusHistory &&
                order.statusHistory
                  .length > 0 ? (
                  <div className="p-5 sm:p-6">
                    <div className="space-y-0">
                      {[...order.statusHistory]
                        .sort(
                          (
                            first,
                            second,
                          ) =>
                            new Date(
                              first.changedAt,
                            ).getTime() -
                            new Date(
                              second.changedAt,
                            ).getTime(),
                        )
                        .map(
                          (
                            historyItem,
                            index,
                            historyItems,
                          ) => {
                            const StatusIcon =
                              getStatusIcon(
                                historyItem.status,
                              );

                            const isLast =
                              index ===
                              historyItems.length -
                                1;

                            return (
                              <div
                                key={`${historyItem.status}-${historyItem.changedAt}-${index}`}
                                className="relative flex gap-4 pb-7 last:pb-0"
                              >
                                {!isLast && (
                                  <div className="absolute left-5 top-10 h-[calc(100%-1.5rem)] w-0.5 bg-orange-100" />
                                )}

                                <div
                                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                    historyItem.status ===
                                    "Cancelled"
                                      ? "bg-red-50 text-red-600"
                                      : "bg-orange-50 text-[#FF6900]"
                                  }`}
                                >
                                  <StatusIcon
                                    size={
                                      19
                                    }
                                  />
                                </div>

                                <div className="min-w-0 flex-1 pt-0.5">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="font-extrabold text-[#0B1F3A]">
                                      {
                                        historyItem.status
                                      }
                                    </p>

                                    <time className="text-xs font-semibold text-gray-400">
                                      {formatDateTime(
                                        historyItem.changedAt,
                                      )}
                                    </time>
                                  </div>

                                  <p className="mt-2 text-sm leading-6 text-gray-500">
                                    {historyItem.note ||
                                      "Order status updated."}
                                  </p>
                                </div>
                              </div>
                            );
                          },
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No status history is
                    available.
                  </div>
                )}
              </div>

              {/* =============================================
                  CUSTOMER NOTE
              ============================================= */}

              {order.customerNote && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#FF6900]">
                    Customer Note
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#0B1F3A]">
                    {
                      order.customerNote
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =================================================
              INITIAL EMPTY STATE
          ================================================= */}

          {!order &&
            !errorMessage &&
            !isLoading && (
              <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                  <PackageOpen
                    size={26}
                  />
                </div>

                <h3 className="mt-4 text-lg font-extrabold text-[#0B1F3A]">
                  Track Your Order
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  Enter the order number
                  and phone number used
                  during checkout to view
                  your latest tracking
                  information.
                </p>
              </div>
            )}
        </div>
      </section>
    </main>
  );
}