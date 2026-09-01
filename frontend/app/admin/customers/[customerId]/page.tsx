"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCcw,
  ShoppingBag,
  Truck,
  UserRound,
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
  useRouter,
} from "next/navigation";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : (
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:5000"
      );

const ADMIN_TOKEN_KEY =
  "townmelaAdminToken";

/* =========================================================
   TYPES
========================================================= */

type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

type PaymentStatus =
  | "Pending"
  | "Paid";

type ShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
  postalCode?: string | null;
  lastUsedAt?: string;
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
  status: OrderStatus;
  note?: string | null;
  changedAt: string;
};

type CustomerStatistics = {
  totalOrders: number;
  totalItems: number;
  totalSpent: number;
  averageOrderValue: number;

  deliveredOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
};

type LatestOrder = {
  _id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentMethod: "COD";
  paymentStatus: PaymentStatus;

  subtotalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  totalAmount: number;

  createdAt: string;
};

type CustomerDetails = {
  customerId: string;

  fullName: string;
  phone: string;
  email?: string | null;
  guestId?: string | null;

  firstOrderDate?: string;
  lastOrderDate?: string;

  latestShippingAddress?:
    | ShippingAddress
    | null;

  addresses: ShippingAddress[];

  statistics: CustomerStatistics;

  latestOrder: LatestOrder;
};

type CustomerOrder = {
  _id: string;
  orderNumber: string;

  items: OrderItem[];

  subtotalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode?: string | null;
  totalAmount: number;

  paymentMethod: "COD";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  shippingAddress:
    ShippingAddress;

  customerNote?: string | null;

  statusHistory:
    StatusHistoryItem[];

  createdAt: string;
  updatedAt: string;
};

type CustomerDetailsResponse = {
  success?: boolean;
  message?: string;

  customer?: CustomerDetails;
  orders?: CustomerOrder[];
};

/* =========================================================
   FORMAT HELPERS
========================================================= */

const formatCurrency = (
  value: number,
) => {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    },
  ).format(safeValue);
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

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

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatAddress = (
  address?:
    | ShippingAddress
    | null,
) => {
  if (!address) {
    return "No address available";
  }

  const parts = [
    address.address,
    address.area,
    address.district,
    address.division,
    address.postalCode,
  ].filter(Boolean);

  return (
    parts.join(", ") ||
    "No address available"
  );
};

/* =========================================================
   STATUS STYLES
========================================================= */

const getOrderStatusClassName = (
  status?: OrderStatus,
) => {
  switch (status) {
    case "Delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Processing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Shipped":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const getPaymentStatusClassName = (
  status?: PaymentStatus,
) => {
  if (status === "Paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

/* =========================================================
   STAT CARD
========================================================= */

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
};

function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black text-[#0B1F3A]">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold leading-5 text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   CUSTOMER DETAILS PAGE
========================================================= */

export default function CustomerDetailsPage() {
  const router = useRouter();

  const params = useParams<{
    customerId: string;
  }>();

  const [
    customer,
    setCustomer,
  ] =
    useState<CustomerDetails | null>(
      null,
    );

  const [
    orders,
    setOrders,
  ] = useState<CustomerOrder[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const customerId =
    useMemo(() => {
      const value =
        params?.customerId;

      if (
        typeof value !==
        "string"
      ) {
        return "";
      }

      try {
        return decodeURIComponent(
          value,
        );
      } catch {
        return value;
      }
    }, [params]);

  /* =======================================================
     AUTH
  ======================================================= */

  const getAdminToken =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "";
      }

      return (
        localStorage.getItem(
          ADMIN_TOKEN_KEY,
        ) ?? ""
      );
    }, []);

  const handleUnauthorized =
    useCallback(() => {
      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.removeItem(
          ADMIN_TOKEN_KEY,
        );

        localStorage.removeItem(
          "townmelaAdminUser",
        );
      }

      router.replace(
        "/admin/login",
      );
    }, [router]);

  /* =======================================================
     LOAD CUSTOMER
  ======================================================= */

  const loadCustomer =
    useCallback(
      async (
        showRefreshLoader =
          false,
      ) => {
        if (!customerId) {
          setErrorMessage(
            "Customer ID is missing.",
          );

          setIsLoading(false);

          return;
        }

        const token =
          getAdminToken();

        if (!token) {
          handleUnauthorized();
          return;
        }

        try {
          if (
            showRefreshLoader
          ) {
            setIsRefreshing(
              true,
            );
          } else {
            setIsLoading(true);
          }

          setErrorMessage("");

          const response =
            await fetch(
              `${API_BASE_URL}/api/customers/${encodeURIComponent(
                customerId,
              )}`,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                cache: "no-store",
              },
            );

          const data:
            CustomerDetailsResponse =
            await response.json();

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            handleUnauthorized();
            return;
          }

          if (
            !response.ok ||
            !data.success ||
            !data.customer
          ) {
            throw new Error(
              data.message ||
                "Failed to load customer details.",
            );
          }

          setCustomer(
            data.customer,
          );

          setOrders(
            Array.isArray(
              data.orders,
            )
              ? data.orders
              : [],
          );
        } catch (error) {
          console.error(
            "Load customer details error:",
            error,
          );

          setCustomer(null);
          setOrders([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading customer details.",
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        customerId,
        getAdminToken,
        handleUnauthorized,
      ],
    );

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <main className="w-full">
        <section className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoaderCircle
            size={38}
            className="animate-spin text-[#FF6900]"
          />

          <p className="mt-4 text-sm font-extrabold text-[#0B1F3A]">
            Loading customer details...
          </p>
        </section>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    errorMessage ||
    !customer
  ) {
    return (
      <main className="w-full">
        <section className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle
              size={30}
            />
          </div>

          <h1 className="mt-5 text-xl font-black text-[#0B1F3A]">
            Customer details unavailable
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            {errorMessage ||
              "The customer record could not be found."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
            >
              <ArrowLeft
                size={18}
              />

              Back to Customers
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadCustomer()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
            >
              <RefreshCcw
                size={18}
              />

              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="w-full">
      {/* =================================================
          HEADER
      ================================================= */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B1F3A] text-xl font-black text-white">
              {customer.fullName
                ?.charAt(0)
                .toUpperCase() ||
                "C"}
            </div>

            <div className="min-w-0">
              <Link
                href="/admin/customers"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-gray-400 transition hover:text-[#FF6900]"
              >
                <ArrowLeft
                  size={15}
                />

                Back to Customers
              </Link>

              <h1 className="mt-2 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                {customer.fullName}
              </h1>

              <p className="mt-2 text-sm font-semibold text-gray-500">
                Customer since{" "}
                {formatDate(
                  customer.firstOrderDate,
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadCustomer(
                true,
              )
            }
            disabled={
              isRefreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={18}
              className={
                isRefreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </section>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={String(
            customer.statistics
              .totalOrders,
          )}
          description={`${customer.statistics.totalItems} total items ordered`}
          icon={
            <ShoppingBag
              size={23}
            />
          }
        />

        <StatCard
          title="Total Spent"
          value={formatCurrency(
            customer.statistics
              .totalSpent,
          )}
          description="Cancelled orders excluded"
          icon={
            <CircleDollarSign
              size={23}
            />
          }
        />

        <StatCard
          title="Average Order"
          value={formatCurrency(
            customer.statistics
              .averageOrderValue,
          )}
          description="Average active order value"
          icon={
            <Package
              size={23}
            />
          }
        />

        <StatCard
          title="Delivered Orders"
          value={String(
            customer.statistics
              .deliveredOrders,
          )}
          description={`${customer.statistics.pendingOrders} orders pending`}
          icon={
            <CheckCircle2
              size={23}
            />
          }
        />
      </section>

      {/* =================================================
          CUSTOMER INFORMATION
      ================================================= */}

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <UserRound
                size={21}
              />
            </div>

            <h2 className="text-lg font-black text-[#0B1F3A]">
              Customer Information
            </h2>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Full Name
              </p>

              <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                {customer.fullName}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Phone Number
              </p>

              <a
                href={`tel:${customer.phone}`}
                className="mt-1 inline-flex items-center gap-2 text-sm font-black text-[#0B1F3A] transition hover:text-[#FF6900]"
              >
                <Phone
                  size={16}
                />

                {customer.phone}
              </a>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Email Address
              </p>

              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="mt-1 inline-flex items-center gap-2 text-sm font-black text-[#0B1F3A] transition hover:text-[#FF6900]"
                >
                  <Mail
                    size={16}
                  />

                  {customer.email}
                </a>
              ) : (
                <p className="mt-1 text-sm font-semibold text-gray-400">
                  No email provided
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Guest ID
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-gray-600">
                {customer.guestId ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Last Order Date
              </p>

              <p className="mt-1 inline-flex items-center gap-2 text-sm font-black text-[#0B1F3A]">
                <CalendarDays
                  size={16}
                />

                {formatDateTime(
                  customer.lastOrderDate,
                )}
              </p>
            </div>
          </div>
        </article>

        {/* Latest Order */}

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                <Package
                  size={21}
                />
              </div>

              <h2 className="text-lg font-black text-[#0B1F3A]">
                Latest Order
              </h2>
            </div>

            <Link
              href={`/admin/orders/${customer.latestOrder._id}`}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF6900] transition hover:text-[#E85F00]"
            >
              View Order

              <ExternalLink
                size={14}
              />
            </Link>
          </div>

          <div className="mt-6 rounded-2xl bg-[#F8F9FB] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Order Number
                </p>

                <p className="mt-1 text-lg font-black text-[#0B1F3A]">
                  {
                    customer.latestOrder
                      .orderNumber
                  }
                </p>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getOrderStatusClassName(
                  customer.latestOrder
                    .orderStatus,
                )}`}
              >
                {
                  customer.latestOrder
                    .orderStatus
                }
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Subtotal
                </p>

                <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                  {formatCurrency(
                    customer.latestOrder
                      .subtotalAmount,
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Delivery
                </p>

                <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                  {formatCurrency(
                    customer.latestOrder
                      .deliveryCharge,
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Discount
                </p>

                <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                  {formatCurrency(
                    customer.latestOrder
                      .discountAmount,
                  )}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Total
                </p>

                <p className="mt-1 text-sm font-black text-[#FF6900]">
                  {formatCurrency(
                    customer.latestOrder
                      .totalAmount,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${getPaymentStatusClassName(
                  customer.latestOrder
                    .paymentStatus,
                )}`}
              >
                Payment:{" "}
                {
                  customer.latestOrder
                    .paymentStatus
                }
              </span>

              <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-600">
                {
                  customer.latestOrder
                    .paymentMethod
                }
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-600">
                <Clock3
                  size={13}
                />

                {formatDateTime(
                  customer.latestOrder
                    .createdAt,
                )}
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* =================================================
          ORDER STATUS SUMMARY
      ================================================= */}

      <section className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Clock3
            size={20}
            className="text-amber-600"
          />

          <p className="mt-3 text-2xl font-black text-amber-700">
            {
              customer.statistics
                .pendingOrders
            }
          </p>

          <p className="mt-1 text-xs font-extrabold text-amber-600">
            Pending
          </p>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Package
            size={20}
            className="text-blue-600"
          />

          <p className="mt-3 text-2xl font-black text-blue-700">
            {
              customer.statistics
                .processingOrders
            }
          </p>

          <p className="mt-1 text-xs font-extrabold text-blue-600">
            Processing
          </p>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <Truck
            size={20}
            className="text-violet-600"
          />

          <p className="mt-3 text-2xl font-black text-violet-700">
            {
              customer.statistics
                .shippedOrders
            }
          </p>

          <p className="mt-1 text-xs font-extrabold text-violet-600">
            Shipped
          </p>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            size={20}
            className="text-emerald-600"
          />

          <p className="mt-3 text-2xl font-black text-emerald-700">
            {
              customer.statistics
                .deliveredOrders
            }
          </p>

          <p className="mt-1 text-xs font-extrabold text-emerald-600">
            Delivered
          </p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <XCircle
            size={20}
            className="text-red-600"
          />

          <p className="mt-3 text-2xl font-black text-red-700">
            {
              customer.statistics
                .cancelledOrders
            }
          </p>

          <p className="mt-1 text-xs font-extrabold text-red-600">
            Cancelled
          </p>
        </article>
      </section>

      {/* =================================================
          SHIPPING ADDRESSES
      ================================================= */}

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <MapPin
              size={21}
            />
          </div>

          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Shipping Addresses
            </h2>

            <p className="mt-1 text-xs font-semibold text-gray-400">
              {
                customer.addresses
                  .length
              }{" "}
              unique address
              {customer.addresses
                .length === 1
                ? ""
                : "es"}
            </p>
          </div>
        </div>

        {customer.addresses
          .length === 0 ? (
          <div className="mt-5 rounded-xl bg-gray-50 p-5 text-sm font-semibold text-gray-500">
            No shipping address
            available.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {customer.addresses.map(
              (
                address,
                index,
              ) => (
                <article
                  key={`${formatAddress(
                    address,
                  )}-${index}`}
                  className="rounded-2xl border border-gray-200 bg-[#F8F9FB] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                      <MapPin
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-[#FF6900]">
                        Address{" "}
                        {index + 1}
                      </p>

                      <p className="mt-2 text-sm font-bold leading-6 text-[#0B1F3A]">
                        {formatAddress(
                          address,
                        )}
                      </p>

                      {address.lastUsedAt && (
                        <p className="mt-2 text-xs font-semibold text-gray-400">
                          Last used:{" "}
                          {formatDateTime(
                            address.lastUsedAt,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {/* =================================================
          ORDER HISTORY
      ================================================= */}

      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Order History
          </h2>

          <p className="mt-1 text-xs font-semibold text-gray-400">
            {orders.length} customer
            order
            {orders.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-gray-500">
            No order history
            available.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map(
              (order) => (
                <article
                  key={order._id}
                  className="p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-[#0B1F3A]">
                          {
                            order.orderNumber
                          }
                        </h3>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getOrderStatusClassName(
                            order.orderStatus,
                          )}`}
                        >
                          {
                            order.orderStatus
                          }
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${getPaymentStatusClassName(
                            order.paymentStatus,
                          )}`}
                        >
                          {
                            order.paymentStatus
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-gray-400">
                        {formatDateTime(
                          order.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-left lg:text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Order Total
                        </p>

                        <p className="mt-1 text-lg font-black text-[#FF6900]">
                          {formatCurrency(
                            order.totalAmount,
                          )}
                        </p>
                      </div>

                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
                      >
                        View Order

                        <ExternalLink
                          size={15}
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {order.items.map(
                      (
                        item,
                        itemIndex,
                      ) => (
                        <div
                          key={
                            item._id ||
                            `${order._id}-${itemIndex}`
                          }
                          className="flex flex-col gap-3 rounded-xl bg-[#F8F9FB] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-black text-[#0B1F3A]">
                              {
                                item.name
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
                              <span>
                                Quantity:{" "}
                                {
                                  item.quantity
                                }
                              </span>

                              {item.selectedSize && (
                                <span>
                                  Size:{" "}
                                  {
                                    item.selectedSize
                                  }
                                </span>
                              )}

                              {item.selectedColor && (
                                <span>
                                  Color:{" "}
                                  {
                                    item.selectedColor
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-left sm:text-right">
                            <p className="text-xs font-semibold text-gray-400">
                              {formatCurrency(
                                item.price,
                              )}{" "}
                              ×{" "}
                              {
                                item.quantity
                              }
                            </p>

                            <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                              {formatCurrency(
                                item.lineTotal,
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Subtotal
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                        {formatCurrency(
                          order.subtotalAmount,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Delivery
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                        {formatCurrency(
                          order.deliveryCharge,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Discount
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                        {formatCurrency(
                          order.discountAmount,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Total
                      </p>

                      <p className="mt-1 text-sm font-black text-[#FF6900]">
                        {formatCurrency(
                          order.totalAmount,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#FF6900]">
                      Shipping Address
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[#0B1F3A]">
                      {formatAddress(
                        order.shippingAddress,
                      )}
                    </p>
                  </div>

                  {order.customerNote && (
                    <div className="mt-4 rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Customer Note
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                        {
                          order.customerNote
                        }
                      </p>
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}