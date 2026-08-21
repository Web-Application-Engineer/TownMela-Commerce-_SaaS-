"use client";

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingCart,
  Store,
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

type CheckoutSettingsForm = {
  supportPhone: string;
  whatsappNumber: string;
  deliveryArea: string;
  deliveryTime: string;
  codText: string;
  collectionPoint: string;
  orderInstruction: string;
  returnPolicy: string;
  warrantyText: string;
  soldByText: string;
  isActive: boolean;
};

type CheckoutSettingsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    settings?: Partial<CheckoutSettingsForm>;
    checkoutSettings?: Partial<CheckoutSettingsForm>;
  };
  settings?: Partial<CheckoutSettingsForm>;
  checkoutSettings?: Partial<CheckoutSettingsForm>;
};

/* =========================================================
   DEFAULT VALUES
========================================================= */

const defaultForm: CheckoutSettingsForm = {
  supportPhone: "",
  whatsappNumber: "",
  deliveryArea: "",
  deliveryTime: "",
  codText: "",
  collectionPoint: "",
  orderInstruction: "",
  returnPolicy: "",
  warrantyText: "",
  soldByText: "",
  isActive: true,
};

/* =========================================================
   HELPERS
========================================================= */

const extractSettings = (
  payload: CheckoutSettingsResponse | null,
): Partial<CheckoutSettingsForm> => {
  if (!payload) {
    return {};
  }

  return (
    payload.data?.settings ||
    payload.data?.checkoutSettings ||
    payload.settings ||
    payload.checkoutSettings ||
    {}
  );
};

/* =========================================================
   CHECKOUT MANAGEMENT PAGE
========================================================= */

export default function CheckoutManagementPage() {
  const {
    selectedTenant,
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    form,
    setForm,
  ] =
    useState<CheckoutSettingsForm>(
      defaultForm,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      if (loadingTenants) {
        return;
      }

      if (!selectedTenantId) {
        setForm(defaultForm);
        setErrorMessage(
          "Please select a tenant before managing checkout settings.",
        );
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const response =
          await tenantFetch(
            "/api/checkout-settings",
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
            )) as CheckoutSettingsResponse | null;

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              "Checkout settings could not be loaded.",
          );
        }

        const settings =
          extractSettings(
            payload,
          );

        setForm({
          ...defaultForm,
          ...settings,
          isActive:
            settings.isActive ===
            undefined
              ? true
              : Boolean(
                  settings.isActive,
                ),
        });
      } catch (error) {
        console.error(
          "Checkout settings load error:",
          error,
        );

        setForm(
          defaultForm,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Checkout settings could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      loadingTenants,
      selectedTenantId,
    ]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  const updateField = <
    Key extends keyof CheckoutSettingsForm,
  >(
    key: Key,
    value: CheckoutSettingsForm[Key],
  ) => {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const handleSave =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!selectedTenantId) {
        setErrorMessage(
          "Please select a tenant before saving checkout settings.",
        );
        return;
      }

      try {
        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        const response =
          await tenantFetch(
            "/api/checkout-settings",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                supportPhone:
                  form.supportPhone.trim(),

                whatsappNumber:
                  form.whatsappNumber.trim(),

                deliveryArea:
                  form.deliveryArea.trim(),

                deliveryTime:
                  form.deliveryTime.trim(),

                codText:
                  form.codText.trim(),

                collectionPoint:
                  form.collectionPoint.trim(),

                orderInstruction:
                  form.orderInstruction.trim(),

                returnPolicy:
                  form.returnPolicy.trim(),

                warrantyText:
                  form.warrantyText.trim(),

                soldByText:
                  form.soldByText.trim(),

                isActive:
                  form.isActive,
              }),
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as CheckoutSettingsResponse | null;

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              "Checkout settings could not be saved.",
          );
        }

        const savedSettings =
          extractSettings(
            payload,
          );

        setForm(
          (current) => ({
            ...current,
            ...savedSettings,
          }),
        );

        setSuccessMessage(
          "Checkout settings saved successfully.",
        );
      } catch (error) {
        console.error(
          "Checkout settings save error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Checkout settings could not be saved.",
        );
      } finally {
        setIsSaving(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingTenants ||
    isLoading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#FF6900]" />
          Loading checkout settings...
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      {/* PAGE HEADER */}

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            <ShoppingCart size={14} />
            Storefront
          </span>

          <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            Checkout Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Manage tenant-specific checkout, delivery, contact,
            collection, return and warranty information.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
            Active Tenant
          </p>

          <p className="mt-1 text-sm font-black text-[#0B1F3A]">
            {selectedTenant?.storeName ||
              selectedTenant?.businessName ||
              "Selected Tenant"}
          </p>
        </div>
      </div>

      {/* MESSAGES */}

      {successMessage ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <span>
            {successMessage}
          </span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form
        onSubmit={handleSave}
        className="space-y-6"
      >
        {/* CONTACT */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={Phone}
            title="Contact Information"
            description="Contact details shown around checkout and product purchase information."
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <InputField
              label="Support Phone"
              value={form.supportPhone}
              onChange={(value) =>
                updateField(
                  "supportPhone",
                  value,
                )
              }
              placeholder="Example: 017XXXXXXXX"
              icon={Phone}
            />

            <InputField
              label="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(value) =>
                updateField(
                  "whatsappNumber",
                  value,
                )
              }
              placeholder="Example: 017XXXXXXXX"
              icon={MessageCircle}
            />
          </div>
        </section>

        {/* DELIVERY */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={MapPin}
            title="Delivery & Payment"
            description="Manage delivery area, estimated delivery time and Cash on Delivery information."
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <TextAreaField
              label="Available Delivery Area"
              value={form.deliveryArea}
              onChange={(value) =>
                updateField(
                  "deliveryArea",
                  value,
                )
              }
              placeholder="Example: Delivery available all over Bangladesh."
              icon={MapPin}
            />

            <TextAreaField
              label="Delivery Time"
              value={form.deliveryTime}
              onChange={(value) =>
                updateField(
                  "deliveryTime",
                  value,
                )
              }
              placeholder="Example: Inside Dhaka 1-2 days, outside Dhaka 2-4 days."
              icon={Clock3}
            />

            <div className="sm:col-span-2">
              <TextAreaField
                label="Cash on Delivery Information"
                value={form.codText}
                onChange={(value) =>
                  updateField(
                    "codText",
                    value,
                  )
                }
                placeholder="Example: Cash on Delivery is available for eligible orders."
                icon={CreditCard}
              />
            </div>
          </div>
        </section>

        {/* COLLECTION & INSTRUCTIONS */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={PackageCheck}
            title="Collection & Order Instructions"
            description="Information customers should see before or during checkout."
          />

          <div className="grid gap-5 p-5 sm:p-6">
            <TextAreaField
              label="Collection Point"
              value={form.collectionPoint}
              onChange={(value) =>
                updateField(
                  "collectionPoint",
                  value,
                )
              }
              placeholder="Enter collection point or pickup instructions."
              icon={Store}
            />

            <TextAreaField
              label="Order Instruction / Notice"
              value={form.orderInstruction}
              onChange={(value) =>
                updateField(
                  "orderInstruction",
                  value,
                )
              }
              placeholder="Add any important order instructions for customers."
              icon={ShoppingCart}
            />
          </div>
        </section>

        {/* POLICY */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            icon={ShieldCheck}
            title="Return, Warranty & Seller Information"
            description="Tenant-specific policy and seller information shown to customers."
          />

          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <TextAreaField
              label="Return Policy"
              value={form.returnPolicy}
              onChange={(value) =>
                updateField(
                  "returnPolicy",
                  value,
                )
              }
              placeholder="Enter the tenant's return or replacement policy."
              icon={RotateCcw}
            />

            <TextAreaField
              label="Warranty / Authenticity Information"
              value={form.warrantyText}
              onChange={(value) =>
                updateField(
                  "warrantyText",
                  value,
                )
              }
              placeholder="Enter warranty, guarantee or authenticity information."
              icon={ShieldCheck}
            />

            <div className="sm:col-span-2">
              <InputField
                label="Sold By Display Text"
                value={form.soldByText}
                onChange={(value) =>
                  updateField(
                    "soldByText",
                    value,
                  )
                }
                placeholder="Leave blank to use the tenant store name automatically."
                icon={Store}
              />
            </div>
          </div>
        </section>

        {/* STATUS + SAVE */}

        <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                updateField(
                  "isActive",
                  event.target.checked,
                )
              }
              className="h-5 w-5 rounded border-gray-300 text-[#FF6900] focus:ring-[#FF6900]"
            />

            <span>
              <span className="block text-sm font-black text-[#0B1F3A]">
                Checkout information active
              </span>

              <span className="mt-1 block text-xs text-gray-500">
                Enable these tenant-specific checkout details on the storefront.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={
              isSaving ||
              !selectedTenantId
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Checkout Settings
              </>
            )}
          </button>
        </section>
      </form>
    </div>
  );
}

/* =========================================================
   REUSABLE UI
========================================================= */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-5 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
        <Icon size={19} />
      </div>

      <div>
        <h2 className="font-black text-[#0B1F3A]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
  icon: React.ElementType;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-[#0B1F3A] outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
  icon: React.ElementType;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <div className="relative">
        <Icon className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />

        <textarea
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          rows={4}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm leading-6 text-[#0B1F3A] outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
      </div>
    </div>
  );
}