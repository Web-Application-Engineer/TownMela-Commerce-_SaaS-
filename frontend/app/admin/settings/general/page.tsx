"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getSettingsErrorMessage,
  getSettingsSection,
  resetSettingsSection,
  updateSettingsSection,
} from "../_lib/settingsApi";

/* =========================================================
   TYPES
========================================================= */

type GeneralAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type GeneralSettings = {
  storeName: string;
  legalBusinessName: string;
  email: string;
  phone: string;
  supportEmail: string;
  supportPhone: string;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  address: GeneralAddress;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  storeName: "",
  legalBusinessName: "",
  email: "",
  phone: "",
  supportEmail: "",
  supportPhone: "",
  country: "BD",
  currency: "BDT",
  timezone: "Asia/Dhaka",
  locale: "en-BD",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12-hour",

  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "BD",
  },

  maintenanceMode: false,

  maintenanceMessage:
    "Our store is temporarily unavailable. Please check again later.",
};

const COUNTRY_OPTIONS = [
  {
    value: "BD",
    label: "Bangladesh",
  },
  {
    value: "IN",
    label: "India",
  },
  {
    value: "US",
    label: "United States",
  },
  {
    value: "GB",
    label: "United Kingdom",
  },
  {
    value: "AE",
    label: "United Arab Emirates",
  },
  {
    value: "SA",
    label: "Saudi Arabia",
  },
];

const CURRENCY_OPTIONS = [
  {
    value: "BDT",
    label: "BDT — Bangladeshi Taka",
  },
  {
    value: "USD",
    label: "USD — US Dollar",
  },
  {
    value: "EUR",
    label: "EUR — Euro",
  },
  {
    value: "GBP",
    label: "GBP — British Pound",
  },
  {
    value: "INR",
    label: "INR — Indian Rupee",
  },
  {
    value: "AED",
    label: "AED — UAE Dirham",
  },
  {
    value: "SAR",
    label: "SAR — Saudi Riyal",
  },
];

const TIMEZONE_OPTIONS = [
  {
    value: "Asia/Dhaka",
    label: "Asia/Dhaka",
  },
  {
    value: "Asia/Kolkata",
    label: "Asia/Kolkata",
  },
  {
    value: "Asia/Dubai",
    label: "Asia/Dubai",
  },
  {
    value: "Asia/Riyadh",
    label: "Asia/Riyadh",
  },
  {
    value: "Europe/London",
    label: "Europe/London",
  },
  {
    value: "America/New_York",
    label: "America/New_York",
  },
  {
    value: "America/Los_Angeles",
    label: "America/Los_Angeles",
  },
  {
    value: "UTC",
    label: "UTC",
  },
];

const DATE_FORMAT_OPTIONS = [
  {
    value: "DD/MM/YYYY",
    label: "DD/MM/YYYY",
  },
  {
    value: "MM/DD/YYYY",
    label: "MM/DD/YYYY",
  },
  {
    value: "YYYY-MM-DD",
    label: "YYYY-MM-DD",
  },
];

const TIME_FORMAT_OPTIONS = [
  {
    value: "12-hour",
    label: "12-hour",
  },
  {
    value: "24-hour",
    label: "24-hour",
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function GeneralSettingsPage() {
  const [formData, setFormData] =
    useState<GeneralSettings>(
      DEFAULT_GENERAL_SETTINGS
    );

  const [version, setVersion] = useState<
    number | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState<StatusMessage>(null);

  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<string>("");

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      try {
        setLoading(true);
        setStatusMessage(null);

        const response =
          await getSettingsSection<GeneralSettings>(
            "general"
          );

        setFormData({
          ...DEFAULT_GENERAL_SETTINGS,
          ...response.data.settings,

          address: {
            ...DEFAULT_GENERAL_SETTINGS.address,
            ...response.data.settings.address,
          },
        });

        setVersion(response.data.version);

        setLastUpdatedAt(
          response.data.updatedAt || ""
        );
      } catch (error) {
        setStatusMessage({
          type: "error",
          text: getSettingsErrorMessage(
            error
          ),
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = event.target;

    const checked =
      event.target instanceof
      HTMLInputElement
        ? event.target.checked
        : false;

    setFormData((current) => ({
      ...current,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setStatusMessage(null);
  };

  const handleTextareaChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } =
      event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setStatusMessage(null);
  };

  const handleAddressChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } =
      event.target;

    setFormData((current) => ({
      ...current,

      address: {
        ...current.address,
        [name]: value,
      },
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setStatusMessage(null);

      const response =
        await updateSettingsSection<
          GeneralSettings &
            Record<string, unknown>
        >(
          "general",
          {
            ...formData,
          },
          version
        );

      setFormData({
        ...DEFAULT_GENERAL_SETTINGS,
        ...response.data.settings,

        address: {
          ...DEFAULT_GENERAL_SETTINGS.address,
          ...response.data.settings.address,
        },
      });

      setVersion(response.data.version);

      setLastUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "General settings saved successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: getSettingsErrorMessage(
          error
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  const handleReset = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to reset all General settings to their default values?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<GeneralSettings>(
          "general",
          version
        );

      setFormData({
        ...DEFAULT_GENERAL_SETTINGS,
        ...response.data.settings,

        address: {
          ...DEFAULT_GENERAL_SETTINGS.address,
          ...response.data.settings.address,
        },
      });

      setVersion(response.data.version);

      setLastUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "General settings reset successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: getSettingsErrorMessage(
          error
        ),
      });
    } finally {
      setResetting(false);
    }
  };

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200" />

          <div className="h-4 w-96 max-w-full rounded bg-slate-100" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="space-y-2"
              >
                <div className="h-4 w-32 rounded bg-slate-100" />

                <div className="h-11 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Store configuration
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              General Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your store identity,
              contact information, regional
              preferences and maintenance mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Version:{" "}
              <strong className="text-slate-700">
                {version ?? 0}
              </strong>
            </span>

            {lastUpdatedAt ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                Updated:{" "}
                <strong className="text-slate-700">
                  {new Date(
                    lastUpdatedAt
                  ).toLocaleString()}
                </strong>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div
          role="alert"
          className={
            statusMessage.type ===
            "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          }
        >
          {statusMessage.text}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* =================================================
            STORE INFORMATION
        ================================================= */}

        <SectionCard
          title="Store Information"
          description="Basic identity and contact information for your store."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Store Name"
              htmlFor="storeName"
              required
            >
              <input
                id="storeName"
                name="storeName"
                type="text"
                value={formData.storeName}
                onChange={handleInputChange}
                placeholder="TownMela"
                maxLength={150}
                required
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Legal Business Name"
              htmlFor="legalBusinessName"
            >
              <input
                id="legalBusinessName"
                name="legalBusinessName"
                type="text"
                value={
                  formData.legalBusinessName
                }
                onChange={handleInputChange}
                placeholder="TownMela Limited"
                maxLength={200}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Business Email"
              htmlFor="email"
            >
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contact@example.com"
                maxLength={254}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Business Phone"
              htmlFor="phone"
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+8801700000000"
                maxLength={30}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Support Email"
              htmlFor="supportEmail"
            >
              <input
                id="supportEmail"
                name="supportEmail"
                type="email"
                value={formData.supportEmail}
                onChange={handleInputChange}
                placeholder="support@example.com"
                maxLength={254}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Support Phone"
              htmlFor="supportPhone"
            >
              <input
                id="supportPhone"
                name="supportPhone"
                type="tel"
                value={formData.supportPhone}
                onChange={handleInputChange}
                placeholder="+8801800000000"
                maxLength={30}
                className={inputClassName}
              />
            </FormField>
          </div>
        </SectionCard>

        {/* =================================================
            REGIONAL SETTINGS
        ================================================= */}

        <SectionCard
          title="Regional Preferences"
          description="Configure country, currency, timezone and formatting."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              label="Country"
              htmlFor="country"
            >
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className={inputClassName}
              >
                {COUNTRY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>

            <FormField
              label="Currency"
              htmlFor="currency"
            >
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className={inputClassName}
              >
                {CURRENCY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>

            <FormField
              label="Timezone"
              htmlFor="timezone"
            >
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className={inputClassName}
              >
                {TIMEZONE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>

            <FormField
              label="Locale"
              htmlFor="locale"
              hint="Example: en-BD"
            >
              <input
                id="locale"
                name="locale"
                type="text"
                value={formData.locale}
                onChange={handleInputChange}
                placeholder="en-BD"
                maxLength={20}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Date Format"
              htmlFor="dateFormat"
            >
              <select
                id="dateFormat"
                name="dateFormat"
                value={formData.dateFormat}
                onChange={handleInputChange}
                className={inputClassName}
              >
                {DATE_FORMAT_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>

            <FormField
              label="Time Format"
              htmlFor="timeFormat"
            >
              <select
                id="timeFormat"
                name="timeFormat"
                value={formData.timeFormat}
                onChange={handleInputChange}
                className={inputClassName}
              >
                {TIME_FORMAT_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>
          </div>
        </SectionCard>

        {/* =================================================
            BUSINESS ADDRESS
        ================================================= */}

        <SectionCard
          title="Business Address"
          description="This address can be used on invoices and business documents."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField
                label="Address Line 1"
                htmlFor="line1"
              >
                <input
                  id="line1"
                  name="line1"
                  type="text"
                  value={
                    formData.address.line1
                  }
                  onChange={
                    handleAddressChange
                  }
                  placeholder="House, road or street"
                  maxLength={250}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField
                label="Address Line 2"
                htmlFor="line2"
                hint="Optional"
              >
                <input
                  id="line2"
                  name="line2"
                  type="text"
                  value={
                    formData.address.line2
                  }
                  onChange={
                    handleAddressChange
                  }
                  placeholder="Apartment, suite or landmark"
                  maxLength={250}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField
              label="City"
              htmlFor="city"
            >
              <input
                id="city"
                name="city"
                type="text"
                value={formData.address.city}
                onChange={handleAddressChange}
                placeholder="Dhaka"
                maxLength={100}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="State / Division"
              htmlFor="state"
            >
              <input
                id="state"
                name="state"
                type="text"
                value={
                  formData.address.state
                }
                onChange={handleAddressChange}
                placeholder="Dhaka"
                maxLength={100}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Postal Code"
              htmlFor="postalCode"
            >
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={
                  formData.address
                    .postalCode
                }
                onChange={handleAddressChange}
                placeholder="1207"
                maxLength={30}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Address Country"
              htmlFor="addressCountry"
            >
              <select
                id="addressCountry"
                name="country"
                value={
                  formData.address.country
                }
                onChange={handleAddressChange}
                className={inputClassName}
              >
                {COUNTRY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </FormField>
          </div>
        </SectionCard>

        {/* =================================================
            MAINTENANCE MODE
        ================================================= */}

        <SectionCard
          title="Maintenance Mode"
          description="Temporarily disable access to the storefront while maintenance is in progress."
        >
          <div className="space-y-5">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Enable maintenance mode
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Customers will see the
                  maintenance message instead of
                  the normal storefront.
                </p>
              </div>

              <input
                name="maintenanceMode"
                type="checkbox"
                checked={
                  formData.maintenanceMode
                }
                onChange={handleInputChange}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <FormField
              label="Maintenance Message"
              htmlFor="maintenanceMessage"
            >
              <textarea
                id="maintenanceMessage"
                name="maintenanceMessage"
                value={
                  formData.maintenanceMessage
                }
                onChange={
                  handleTextareaChange
                }
                rows={4}
                maxLength={500}
                placeholder="Our store is temporarily unavailable."
                className={`${inputClassName} resize-y`}
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {
                  formData
                    .maintenanceMessage.length
                }
                /500
              </p>
            </FormField>
          </div>
        </SectionCard>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Changes apply only to the active
              tenant.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                disabled={
                  saving || resetting
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting
                  ? "Resetting..."
                  : "Reset to defaults"}
              </button>

              <button
                type="submit"
                disabled={
                  saving || resetting
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   REUSABLE UI COMPONENTS
========================================================= */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <h2 className="text-base font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {children}
      </div>
    </section>
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-slate-700"
        >
          {label}

          {required ? (
            <span className="ml-1 text-red-500">
              *
            </span>
          ) : null}
        </label>

        {hint ? (
          <span className="text-xs text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   SHARED INPUT STYLE
========================================================= */

const inputClassName =
  "block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";