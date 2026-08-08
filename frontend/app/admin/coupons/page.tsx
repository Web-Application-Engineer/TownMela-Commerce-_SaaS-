"use client";

import Link from "next/link";

import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  CircleOff,
  Clock3,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Tag,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
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

type CouponStatus =
  | "active"
  | "inactive"
  | "expired";

type CouponDiscountType =
  | "percentage"
  | "fixed";

type Coupon = {
  _id: string;
  id?: string;

  code: string;

  discountType:
    CouponDiscountType;

  discountValue: number;

  minOrderAmount: number;

  maxDiscountAmount:
    | number
    | null;

  isActive: boolean;

  expiresAt: string;

  createdAt: string;

  updatedAt: string;

  status?: CouponStatus;
};

type CouponSummary = {
  totalCoupons: number;
  activeCoupons: number;
  inactiveCoupons: number;
  expiredCoupons: number;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type CouponResponse = {
  success: boolean;
  message?: string;
  coupons?: Coupon[];
  summary?: CouponSummary;
  pagination?: Pagination;
};

type DeleteCouponResponse = {
  success: boolean;
  message?: string;
};

type DeleteModalState = {
  open: boolean;
  coupon: Coupon | null;
};

/* =========================================================
   DEFAULT VALUES
========================================================= */

const DEFAULT_SUMMARY: CouponSummary = {
  totalCoupons: 0,
  activeCoupons: 0,
  inactiveCoupons: 0,
  expiredCoupons: 0,
};

const DEFAULT_PAGINATION: Pagination = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  limit: 10,
  hasNextPage: false,
  hasPreviousPage: false,
};

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const formatCurrency = (
  amount: number,
) => {
  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    },
  ).format(amount);
};

const formatDate = (
  dateValue: string,
) => {
  const date = new Date(
    dateValue,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Invalid date";
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

const getCouponStatus = (
  coupon: Coupon,
): CouponStatus => {
  const expiryDate =
    new Date(
      coupon.expiresAt,
    );

  if (
    expiryDate.getTime() <=
    Date.now()
  ) {
    return "expired";
  }

  if (!coupon.isActive) {
    return "inactive";
  }

  return "active";
};

const getStatusLabel = (
  status: CouponStatus,
) => {
  if (status === "active") {
    return "Active";
  }

  if (
    status === "inactive"
  ) {
    return "Inactive";
  }

  return "Expired";
};

const getDiscountText = (
  coupon: Coupon,
) => {
  if (
    coupon.discountType ===
    "percentage"
  ) {
    return `${coupon.discountValue}%`;
  }

  return formatCurrency(
    coupon.discountValue,
  );
};

/* =========================================================
   SUMMARY CARD COMPONENT
========================================================= */

type SummaryCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  iconClassName: string;
  iconBackgroundClassName: string;
};

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  iconBackgroundClassName,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black text-[#0B1F3A]">
            {value}
          </p>

          <p className="mt-2 text-xs font-medium text-gray-400">
            {description}
          </p>
        </div>

        <div
          className={`
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${iconBackgroundClassName}
            ${iconClassName}
          `}
        >
          <Icon size={22} />
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   STATUS BADGE COMPONENT
========================================================= */

function StatusBadge({
  status,
}: {
  status: CouponStatus;
}) {
  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status ===
          "inactive"
        ? "border-gray-200 bg-gray-100 text-gray-600"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-3
        py-1.5
        text-xs
        font-extrabold
        ${className}
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${
            status ===
            "active"
              ? "bg-emerald-500"
              : status ===
                  "inactive"
                ? "bg-gray-500"
                : "bg-red-500"
          }
        `}
      />

      {getStatusLabel(
        status,
      )}
    </span>
  );
}

/* =========================================================
   COUPONS PAGE
========================================================= */

export default function AdminCouponsPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const [
    coupons,
    setCoupons,
  ] = useState<Coupon[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<CouponSummary>(
      DEFAULT_SUMMARY,
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<Pagination>(
      DEFAULT_PAGINATION,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    discountTypeFilter,
    setDiscountTypeFilter,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    deleteModal,
    setDeleteModal,
  ] =
    useState<DeleteModalState>({
      open: false,
      coupon: null,
    });

  /* =========================================================
     LOAD COUPONS
  ========================================================= */

  const loadCoupons =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const query =
          new URLSearchParams();

        query.set(
          "page",
          String(currentPage),
        );

        query.set(
          "limit",
          "10",
        );

        if (searchQuery) {
          query.set(
            "search",
            searchQuery,
          );
        }

        if (
          statusFilter !==
          "all"
        ) {
          query.set(
            "status",
            statusFilter,
          );
        }

        if (
          discountTypeFilter !==
          "all"
        ) {
          query.set(
            "discountType",
            discountTypeFilter,
          );
        }

        const response =
          await tenantFetch(
            `/api/coupons?${query.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as CouponResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ??
              "Failed to load coupons",
          );
        }

        setCoupons(
          Array.isArray(
            data.coupons,
          )
            ? data.coupons
            : [],
        );

        setSummary(
          data.summary ??
            DEFAULT_SUMMARY,
        );

        setPagination(
          data.pagination ??
            DEFAULT_PAGINATION,
        );
      } catch (loadError) {
        setCoupons([]);

        setSummary(
          DEFAULT_SUMMARY,
        );

        setPagination(
          DEFAULT_PAGINATION,
        );

        setError(
          loadError instanceof
          Error
            ? loadError.message
            : "Failed to load coupons",
        );
      } finally {
        setLoading(false);
      }
    }, [
      currentPage,
      discountTypeFilter,
      searchQuery,
      selectedTenantId,
      statusFilter,
    ]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    setCurrentPage(1);
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("all");
    setDiscountTypeFilter("all");
    setSuccessMessage("");
    setError("");
  }, [selectedTenantId]);

  useEffect(() => {
    const handleCouponsUpdated =
      () => {
        void loadCoupons();
      };

    window.addEventListener(
      "coupons-updated",
      handleCouponsUpdated,
    );

    return () => {
      window.removeEventListener(
        "coupons-updated",
        handleCouponsUpdated,
      );
    };
  }, [loadCoupons]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearch = (
    event:
      React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setCurrentPage(1);

    setSearchQuery(
      searchInput.trim(),
    );
  };

  const handleClearSearch =
    () => {
      setSearchInput("");
      setSearchQuery("");
      setCurrentPage(1);
    };

  /* =========================================================
     DELETE
  ========================================================= */

  const openDeleteModal = (
    coupon: Coupon,
  ) => {
    setDeleteModal({
      open: true,
      coupon,
    });
  };

  const closeDeleteModal =
    () => {
      if (deleting) {
        return;
      }

      setDeleteModal({
        open: false,
        coupon: null,
      });
    };

  const handleDeleteCoupon =
    async () => {
      const coupon =
        deleteModal.coupon;

      if (!coupon) {
        return;
      }

      try {
        setDeleting(true);
        setError("");
        setSuccessMessage("");

        const response =
          await tenantFetch(
            `/api/coupons/${coupon._id}`,
            {
              method:
                "DELETE",
            },
          );

        const data =
          (await response.json()) as DeleteCouponResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ??
              "Failed to delete coupon",
          );
        }

        setDeleteModal({
          open: false,
          coupon: null,
        });

        setSuccessMessage(
          data.message ??
            "Coupon deleted successfully",
        );

        if (
          coupons.length ===
            1 &&
          currentPage > 1
        ) {
          setCurrentPage(
            (
              previousPage,
            ) =>
              previousPage -
              1,
          );
        } else {
          await loadCoupons();
        }
      } catch (
        deleteError
      ) {
        setError(
          deleteError instanceof
          Error
            ? deleteError.message
            : "Failed to delete coupon",
        );
      } finally {
        setDeleting(false);
      }
    };

  /* =========================================================
     FILTER CHANGE
  ========================================================= */

  const handleStatusChange = (
    value: string,
  ) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDiscountTypeChange =
    (value: string) => {
      setDiscountTypeFilter(
        value,
      );

      setCurrentPage(1);
    };

  /* =========================================================
     PAGE NUMBERS
  ========================================================= */

  const pageNumbers =
    Array.from(
      {
        length:
          pagination.totalPages,
      },
      (
        _,
        index,
      ) => index + 1,
    ).filter((page) => {
      return (
        page === 1 ||
        page ===
          pagination.totalPages ||
        Math.abs(
          page -
            pagination.currentPage,
        ) <= 1
      );
    });

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="w-full">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        {/* ================================================
            PAGE HEADER
        ================================================= */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <TicketPercent
                size={23}
              />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Coupon Management
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Create, manage,
                activate and monitor
                discount coupons for
                customer orders.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                loadCoupons()
              }
              disabled={loading}
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-extrabold
                text-gray-700
                transition
                hover:border-[#FF6900]
                hover:text-[#FF6900]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <Link
              href="/admin/coupons/new"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#FF6900]
                px-5
                py-2.5
                text-sm
                font-extrabold
                text-white
                shadow-sm
                transition
                hover:bg-[#e85f00]
              "
            >
              <Plus size={18} />

              Add New Coupon
            </Link>
          </div>
        </div>

        {/* ================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span className="flex items-start gap-2">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="Close error message"
              className="shrink-0 text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <span className="flex items-start gap-2">
              <CircleCheckBig
                size={18}
                className="mt-0.5 shrink-0"
              />

              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  "",
                )
              }
              aria-label="Close success message"
              className="shrink-0 text-emerald-500 hover:text-emerald-700"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </section>

      {/* =================================================
          SUMMARY CARDS
      ================================================== */}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Coupons"
          value={
            summary.totalCoupons
          }
          description="All created coupons"
          icon={TicketPercent}
          iconClassName="text-blue-700"
          iconBackgroundClassName="bg-blue-50"
        />

        <SummaryCard
          title="Active Coupons"
          value={
            summary.activeCoupons
          }
          description="Currently available"
          icon={CircleCheckBig}
          iconClassName="text-emerald-700"
          iconBackgroundClassName="bg-emerald-50"
        />

        <SummaryCard
          title="Inactive Coupons"
          value={
            summary.inactiveCoupons
          }
          description="Manually disabled"
          icon={CircleOff}
          iconClassName="text-gray-700"
          iconBackgroundClassName="bg-gray-100"
        />

        <SummaryCard
          title="Expired Coupons"
          value={
            summary.expiredCoupons
          }
          description="Past expiry date"
          icon={Clock3}
          iconClassName="text-red-700"
          iconBackgroundClassName="bg-red-50"
        />
      </section>

      {/* =================================================
          FILTERS AND TABLE
      ================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* ================================================
            FILTER AREA
        ================================================= */}

        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_220px]">
            <form
              onSubmit={
                handleSearch
              }
              className="flex min-w-0 gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
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
                  placeholder="Search coupon code..."
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    pl-10
                    pr-10
                    text-sm
                    font-semibold
                    text-gray-800
                    outline-none
                    transition
                    placeholder:font-medium
                    placeholder:text-gray-400
                    focus:border-[#FF6900]
                    focus:ring-4
                    focus:ring-orange-100
                  "
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={
                      handleClearSearch
                    }
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    <X
                      size={17}
                    />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="
                  inline-flex
                  h-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#17181d]
                  px-4
                  text-sm
                  font-extrabold
                  text-white
                  transition
                  hover:bg-[#FF6900]
                "
              >
                Search
              </button>
            </form>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                handleStatusChange(
                  event.target
                    .value,
                )
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-gray-200
                bg-white
                px-3
                text-sm
                font-bold
                text-gray-700
                outline-none
                transition
                focus:border-[#FF6900]
                focus:ring-4
                focus:ring-orange-100
              "
            >
              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="expired">
                Expired
              </option>
            </select>

            <select
              value={
                discountTypeFilter
              }
              onChange={(
                event,
              ) =>
                handleDiscountTypeChange(
                  event.target
                    .value,
                )
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-gray-200
                bg-white
                px-3
                text-sm
                font-bold
                text-gray-700
                outline-none
                transition
                focus:border-[#FF6900]
                focus:ring-4
                focus:ring-orange-100
              "
            >
              <option value="all">
                All Discount Types
              </option>

              <option value="percentage">
                Percentage
              </option>

              <option value="fixed">
                Fixed Amount
              </option>
            </select>
          </div>
        </div>

        {/* ================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
            <LoaderCircle
              size={36}
              className="animate-spin text-[#FF6900]"
            />

            <p className="text-sm font-bold text-gray-600">
              Loading coupons...
            </p>
          </div>
        )}

        {/* ================================================
            EMPTY STATE
        ================================================= */}

        {!loading &&
          coupons.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                <TicketPercent
                  size={30}
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
                No coupons found
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Create your first
                coupon or change
                the current search
                and filter options.
              </p>

              <Link
                href="/admin/coupons/new"
                className="
                  mt-5
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#FF6900]
                  px-5
                  py-3
                  text-sm
                  font-extrabold
                  text-white
                  transition
                  hover:bg-[#e85f00]
                "
              >
                <Plus size={18} />

                Create First Coupon
              </Link>
            </div>
          )}

        {/* ================================================
            DESKTOP TABLE
        ================================================= */}

        {!loading &&
          coupons.length > 0 && (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Coupon
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Discount
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Conditions
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Expiry
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {coupons.map(
                      (
                        coupon,
                      ) => {
                        const status =
                          getCouponStatus(
                            coupon,
                          );

                        return (
                          <tr
                            key={
                              coupon._id
                            }
                            className="transition hover:bg-gray-50/80"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                                  <Tag
                                    size={
                                      18
                                    }
                                  />
                                </div>

                                <div>
                                  <p className="font-black text-[#0B1F3A]">
                                    {
                                      coupon.code
                                    }
                                  </p>

                                  <p className="mt-1 text-xs font-medium text-gray-400">
                                    Created{" "}
                                    {formatDate(
                                      coupon.createdAt,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-black text-[#0B1F3A]">
                                {getDiscountText(
                                  coupon,
                                )}
                              </p>

                              <p className="mt-1 text-xs font-semibold capitalize text-gray-500">
                                {
                                  coupon.discountType
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-gray-700">
                                Min:{" "}
                                {formatCurrency(
                                  coupon.minOrderAmount,
                                )}
                              </p>

                              <p className="mt-1 text-xs font-medium text-gray-500">
                                Max discount:{" "}
                                {coupon.maxDiscountAmount !==
                                null
                                  ? formatCurrency(
                                      coupon.maxDiscountAmount,
                                    )
                                  : "No limit"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <CalendarDays
                                  size={
                                    16
                                  }
                                  className="text-gray-400"
                                />

                                {formatDate(
                                  coupon.expiresAt,
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={
                                  status
                                }
                              />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/admin/coupons/${coupon._id}/edit`}
                                  aria-label={`Edit ${coupon.code}`}
                                  className="
                                    inline-flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    border
                                    border-blue-200
                                    bg-blue-50
                                    text-blue-700
                                    transition
                                    hover:border-blue-300
                                    hover:bg-blue-100
                                  "
                                >
                                  <Edit3
                                    size={
                                      17
                                    }
                                  />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openDeleteModal(
                                      coupon,
                                    )
                                  }
                                  aria-label={`Delete ${coupon.code}`}
                                  className="
                                    inline-flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-red-50
                                    text-red-700
                                    transition
                                    hover:border-red-300
                                    hover:bg-red-100
                                  "
                                >
                                  <Trash2
                                    size={
                                      17
                                    }
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* ==========================================
                  MOBILE CARDS
              =========================================== */}

              <div className="divide-y divide-gray-100 lg:hidden">
                {coupons.map(
                  (coupon) => {
                    const status =
                      getCouponStatus(
                        coupon,
                      );

                    return (
                      <article
                        key={
                          coupon._id
                        }
                        className="p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                              <Tag
                                size={
                                  18
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="break-all font-black text-[#0B1F3A]">
                                {
                                  coupon.code
                                }
                              </p>

                              <p className="mt-1 text-xs font-medium text-gray-400">
                                Created{" "}
                                {formatDate(
                                  coupon.createdAt,
                                )}
                              </p>
                            </div>
                          </div>

                          <StatusBadge
                            status={
                              status
                            }
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4">
                          <div>
                            <p className="text-xs font-bold text-gray-400">
                              Discount
                            </p>

                            <p className="mt-1 font-black text-[#0B1F3A]">
                              {getDiscountText(
                                coupon,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-400">
                              Type
                            </p>

                            <p className="mt-1 text-sm font-black capitalize text-[#0B1F3A]">
                              {
                                coupon.discountType
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-400">
                              Minimum Order
                            </p>

                            <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                              {formatCurrency(
                                coupon.minOrderAmount,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-400">
                              Maximum Discount
                            </p>

                            <p className="mt-1 text-sm font-black text-[#0B1F3A]">
                              {coupon.maxDiscountAmount !==
                              null
                                ? formatCurrency(
                                    coupon.maxDiscountAmount,
                                  )
                                : "No limit"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-600">
                          <CalendarDays
                            size={16}
                            className="text-gray-400"
                          />

                          Expires:{" "}
                          {formatDate(
                            coupon.expiresAt,
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <Link
                            href={`/admin/coupons/${coupon._id}/edit`}
                            className="
                              inline-flex
                              min-h-10
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-blue-200
                              bg-blue-50
                              px-4
                              text-sm
                              font-extrabold
                              text-blue-700
                              transition
                              hover:bg-blue-100
                            "
                          >
                            <Edit3
                              size={16}
                            />

                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteModal(
                                coupon,
                              )
                            }
                            className="
                              inline-flex
                              min-h-10
                              items-center
                              justify-center
                              gap-2
                              rounded-xl
                              border
                              border-red-200
                              bg-red-50
                              px-4
                              text-sm
                              font-extrabold
                              text-red-700
                              transition
                              hover:bg-red-100
                            "
                          >
                            <Trash2
                              size={16}
                            />

                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              {/* ==========================================
                  PAGINATION
              =========================================== */}

              <div className="flex flex-col gap-4 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <p className="text-sm font-semibold text-gray-500">
                  Showing page{" "}
                  <span className="font-black text-gray-800">
                    {
                      pagination.currentPage
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-black text-gray-800">
                    {
                      pagination.totalPages
                    }
                  </span>

                  <span className="ml-2">
                    (
                    {
                      pagination.totalItems
                    }{" "}
                    total)
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage,
                        ) =>
                          Math.max(
                            previousPage -
                              1,
                            1,
                          ),
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-1
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-3
                      text-sm
                      font-extrabold
                      text-gray-700
                      transition
                      hover:border-[#FF6900]
                      hover:text-[#FF6900]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    <ChevronLeft
                      size={17}
                    />

                    Previous
                  </button>

                  {pageNumbers.map(
                    (
                      page,
                      index,
                    ) => {
                      const previousPage =
                        pageNumbers[
                          index -
                            1
                        ];

                      const showDots =
                        previousPage &&
                        page -
                          previousPage >
                          1;

                      return (
                        <div
                          key={
                            page
                          }
                          className="flex items-center gap-2"
                        >
                          {showDots && (
                            <span className="px-1 text-gray-400">
                              ...
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage(
                                page,
                              )
                            }
                            className={`
                              inline-flex
                              h-10
                              min-w-10
                              items-center
                              justify-center
                              rounded-xl
                              border
                              px-3
                              text-sm
                              font-extrabold
                              transition

                              ${
                                pagination.currentPage ===
                                page
                                  ? "border-[#FF6900] bg-[#FF6900] text-white"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-[#FF6900] hover:text-[#FF6900]"
                              }
                            `}
                          >
                            {
                              page
                            }
                          </button>
                        </div>
                      );
                    },
                  )}

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage,
                        ) =>
                          Math.min(
                            previousPage +
                              1,
                            pagination.totalPages,
                          ),
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-1
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-3
                      text-sm
                      font-extrabold
                      text-gray-700
                      transition
                      hover:border-[#FF6900]
                      hover:text-[#FF6900]
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    Next

                    <ChevronRight
                      size={17}
                    />
                  </button>
                </div>
              </div>
            </>
          )}
      </section>

      {/* =================================================
          DELETE CONFIRMATION MODAL
      ================================================== */}

      {deleteModal.open &&
        deleteModal.coupon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
            <button
              type="button"
              aria-label="Close delete modal"
              onClick={
                closeDeleteModal
              }
              className="absolute inset-0"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2
                  size={26}
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
                Delete Coupon?
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Are you sure you
                want to delete coupon{" "}
                <span className="font-black text-gray-800">
                  {
                    deleteModal
                      .coupon.code
                  }
                </span>
                ? This action cannot
                be undone.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    closeDeleteModal
                  }
                  disabled={
                    deleting
                  }
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    text-sm
                    font-extrabold
                    text-gray-700
                    transition
                    hover:bg-gray-50
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteCoupon
                  }
                  disabled={
                    deleting
                  }
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-600
                    px-4
                    text-sm
                    font-extrabold
                    text-white
                    transition
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {deleting ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />

                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2
                        size={17}
                      />

                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}