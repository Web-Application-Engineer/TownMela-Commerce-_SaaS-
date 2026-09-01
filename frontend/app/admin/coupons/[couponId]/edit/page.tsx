"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CircleCheckBig,
  LoaderCircle,
  Save,
  TicketPercent,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
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

/* =========================================================
   TYPES
========================================================= */

type DiscountType =
  | "percentage"
  | "fixed";

type CouponFormData = {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  isActive: boolean;
  expiresAt: string;
};

type Coupon = {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount:
    | number
    | null;
  isActive: boolean;
  expiresAt: string;
};

type CouponResponse = {
  success: boolean;
  message?: string;
  coupon?: Coupon;
};

/* =========================================================
   INITIAL DATA
========================================================= */

const INITIAL_FORM_DATA: CouponFormData = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  isActive: true,
  expiresAt: "",
};

/* =========================================================
   DATE HELPER
========================================================= */

const formatDateTimeLocal = (
  value: string,
) => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000,
    );

  return localDate
    .toISOString()
    .slice(0, 16);
};

/* =========================================================
   EDIT COUPON PAGE
========================================================= */

export default function EditCouponPage() {
  const router = useRouter();

  const params = useParams<{
    couponId: string;
  }>();

  const couponId =
    params.couponId;

  const [
    formData,
    setFormData,
  ] =
    useState<CouponFormData>(
      INITIAL_FORM_DATA,
    );

  const [
    loading,
    setLoading,
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
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /* =========================================================
     LOAD SINGLE COUPON
  ========================================================= */

  useEffect(() => {
    const loadCoupon =
      async () => {
        try {
          setLoading(true);
          setError("");

          const token =
            localStorage.getItem(
              "townmelaAdminToken",
            );

          if (!token) {
            throw new Error(
              "Admin authentication token not found. Please login again.",
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/coupons/${couponId}`,
              {
                method: "GET",

                headers: {
                  Authorization: `Bearer ${token}`,
                },

                cache:
                  "no-store",
              },
            );

          const data =
            (await response.json()) as CouponResponse;

          if (
            !response.ok ||
            !data.success ||
            !data.coupon
          ) {
            throw new Error(
              data.message ??
                "Failed to load coupon",
            );
          }

          const coupon =
            data.coupon;

          setFormData({
            code: coupon.code,

            discountType:
              coupon.discountType,

            discountValue:
              String(
                coupon.discountValue,
              ),

            minOrderAmount:
              String(
                coupon.minOrderAmount ??
                  0,
              ),

            maxDiscountAmount:
              coupon.maxDiscountAmount !==
              null
                ? String(
                    coupon.maxDiscountAmount,
                  )
                : "",

            isActive:
              coupon.isActive,

            expiresAt:
              formatDateTimeLocal(
                coupon.expiresAt,
              ),
          });
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Failed to load coupon",
          );
        } finally {
          setLoading(false);
        }
      };

    if (couponId) {
      loadCoupon();
    }
  }, [couponId]);

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleInputChange = (
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (
        previousData,
      ) => ({
        ...previousData,

        [name]:
          type === "checkbox"
            ? checked
            : name === "code"
              ? value.toUpperCase()
              : value,
      }),
    );
  };

  const handleDiscountTypeChange = (
    event:
      React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value =
      event.target
        .value as DiscountType;

    setFormData(
      (
        previousData,
      ) => ({
        ...previousData,

        discountType:
          value,

        maxDiscountAmount:
          value === "fixed"
            ? ""
            : previousData.maxDiscountAmount,
      }),
    );
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateForm = () => {
    const cleanCode =
      formData.code.trim();

    const discountValue =
      Number(
        formData.discountValue,
      );

    const minOrderAmount =
      Number(
        formData.minOrderAmount ||
          0,
      );

    const maxDiscountAmount =
      formData.maxDiscountAmount
        ? Number(
            formData.maxDiscountAmount,
          )
        : null;

    if (!cleanCode) {
      return "Coupon code is required";
    }

    if (
      !/^[A-Z0-9_-]+$/.test(
        cleanCode,
      )
    ) {
      return "Coupon code can contain only letters, numbers, underscore and hyphen";
    }

    if (
      !Number.isFinite(
        discountValue,
      ) ||
      discountValue <= 0
    ) {
      return "Discount value must be greater than 0";
    }

    if (
      formData.discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      return "Percentage discount cannot exceed 100";
    }

    if (
      !Number.isFinite(
        minOrderAmount,
      ) ||
      minOrderAmount < 0
    ) {
      return "Minimum order amount cannot be negative";
    }

    if (
      maxDiscountAmount !==
        null &&
      (
        !Number.isFinite(
          maxDiscountAmount,
        ) ||
        maxDiscountAmount < 0
      )
    ) {
      return "Maximum discount amount cannot be negative";
    }

    if (
      !formData.expiresAt
    ) {
      return "Coupon expiry date is required";
    }

    const expiryDate =
      new Date(
        formData.expiresAt,
      );

    if (
      Number.isNaN(
        expiryDate.getTime(),
      )
    ) {
      return "Invalid coupon expiry date";
    }

    return "";
  };

  /* =========================================================
     SUBMIT UPDATE
  ========================================================= */

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );

      setSuccessMessage("");

      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const token =
        localStorage.getItem(
          "townmelaAdminToken",
        );

      if (!token) {
        throw new Error(
          "Admin authentication token not found. Please login again.",
        );
      }

      const response =
        await fetch(
          `${API_BASE_URL}/api/coupons/${couponId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(
              {
                code:
                  formData.code.trim(),

                discountType:
                  formData.discountType,

                discountValue:
                  Number(
                    formData.discountValue,
                  ),

                minOrderAmount:
                  Number(
                    formData.minOrderAmount ||
                      0,
                  ),

                maxDiscountAmount:
                  formData.discountType ===
                    "percentage" &&
                  formData.maxDiscountAmount
                    ? Number(
                        formData.maxDiscountAmount,
                      )
                    : null,

                isActive:
                  formData.isActive,

                expiresAt:
                  new Date(
                    formData.expiresAt,
                  ).toISOString(),
              },
            ),
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
            "Failed to update coupon",
        );
      }

      setSuccessMessage(
        data.message ??
          "Coupon updated successfully",
      );

      setTimeout(() => {
        router.push(
          "/admin/coupons",
        );

        router.refresh();
      }, 800);
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
        Error
          ? submitError.message
          : "Failed to update coupon",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     LOADING UI
  ========================================================= */

  if (loading) {
    return (
      <main className="w-full">
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <LoaderCircle
            size={38}
            className="animate-spin text-[#FF6900]"
          />

          <p className="mt-4 text-sm font-extrabold text-gray-600">
            Loading coupon...
          </p>
        </section>
      </main>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="w-full">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <TicketPercent
                size={23}
              />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Edit Coupon
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Update coupon code,
                discount conditions,
                expiry date and
                availability.
              </p>
            </div>
          </div>

          <Link
            href="/admin/coupons"
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
            "
          >
            <ArrowLeft size={17} />

            Back to Coupons
          </Link>
        </div>

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
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <CircleCheckBig
              size={18}
              className="mt-0.5 shrink-0"
            />

            {successMessage}
          </div>
        )}
      </section>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Coupon Code
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="code"
                type="text"
                name="code"
                value={
                  formData.code
                }
                onChange={
                  handleInputChange
                }
                required
                maxLength={40}
                autoComplete="off"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-sm
                  font-bold
                  uppercase
                  text-gray-800
                  outline-none
                  transition
                  focus:border-[#FF6900]
                  focus:ring-4
                  focus:ring-orange-100
                "
              />
            </div>

            <div>
              <label
                htmlFor="discountType"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Discount Type
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="discountType"
                name="discountType"
                value={
                  formData.discountType
                }
                onChange={
                  handleDiscountTypeChange
                }
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-sm
                  font-bold
                  text-gray-800
                  outline-none
                  transition
                  focus:border-[#FF6900]
                  focus:ring-4
                  focus:ring-orange-100
                "
              >
                <option value="percentage">
                  Percentage
                </option>

                <option value="fixed">
                  Fixed Amount
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="discountValue"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Discount Value
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <input
                  id="discountValue"
                  type="number"
                  name="discountValue"
                  value={
                    formData.discountValue
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                  min="0.01"
                  max={
                    formData.discountType ===
                    "percentage"
                      ? "100"
                      : undefined
                  }
                  step="0.01"
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    pr-14
                    text-sm
                    font-bold
                    text-gray-800
                    outline-none
                    transition
                    focus:border-[#FF6900]
                    focus:ring-4
                    focus:ring-orange-100
                  "
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
                  {formData.discountType ===
                  "percentage"
                    ? "%"
                    : "৳"}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="minOrderAmount"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Minimum Order Amount
              </label>

              <div className="relative">
                <input
                  id="minOrderAmount"
                  type="number"
                  name="minOrderAmount"
                  value={
                    formData.minOrderAmount
                  }
                  onChange={
                    handleInputChange
                  }
                  min="0"
                  step="0.01"
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    pr-12
                    text-sm
                    font-bold
                    text-gray-800
                    outline-none
                    transition
                    focus:border-[#FF6900]
                    focus:ring-4
                    focus:ring-orange-100
                  "
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
                  ৳
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="maxDiscountAmount"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Maximum Discount
              </label>

              <div className="relative">
                <input
                  id="maxDiscountAmount"
                  type="number"
                  name="maxDiscountAmount"
                  value={
                    formData.maxDiscountAmount
                  }
                  onChange={
                    handleInputChange
                  }
                  min="0"
                  step="0.01"
                  disabled={
                    formData.discountType ===
                    "fixed"
                  }
                  placeholder={
                    formData.discountType ===
                    "fixed"
                      ? "Not applicable"
                      : "Leave empty for no limit"
                  }
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    pr-12
                    text-sm
                    font-bold
                    text-gray-800
                    outline-none
                    transition
                    focus:border-[#FF6900]
                    focus:ring-4
                    focus:ring-orange-100
                    disabled:cursor-not-allowed
                    disabled:bg-gray-100
                    disabled:text-gray-400
                  "
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
                  ৳
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="expiresAt"
                className="mb-2 block text-sm font-extrabold text-gray-700"
              >
                Expiry Date and Time
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="expiresAt"
                  type="datetime-local"
                  name="expiresAt"
                  value={
                    formData.expiresAt
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    pl-11
                    pr-4
                    text-sm
                    font-bold
                    text-gray-800
                    outline-none
                    transition
                    focus:border-[#FF6900]
                    focus:ring-4
                    focus:ring-orange-100
                  "
                />
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-extrabold text-gray-700">
                Coupon Status
              </span>

              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-extrabold text-gray-800">
                    Active Coupon
                  </p>

                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Customers can use
                    this coupon while
                    it is active and
                    valid.
                  </p>
                </div>

                <input
                  type="checkbox"
                  name="isActive"
                  checked={
                    formData.isActive
                  }
                  onChange={
                    handleInputChange
                  }
                  className="h-5 w-5 cursor-pointer accent-[#FF6900]"
                />
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/coupons"
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
                rounded-xl
                border
                border-gray-200
                bg-white
                px-6
                text-sm
                font-extrabold
                text-gray-700
                transition
                hover:bg-gray-50
              "
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting
              }
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#FF6900]
                px-6
                text-sm
                font-extrabold
                text-white
                shadow-sm
                transition
                hover:bg-[#e85f00]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />

                  Updating Coupon...
                </>
              ) : (
                <>
                  <Save size={18} />

                  Update Coupon
                </>
              )}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}