"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSettingsSection,
  isSettingsVersionConflict,
  resetSettingsSection,
  updateSettingsSection,
} from "../_lib/settingsApi";

/* =========================================================
   TYPES
========================================================= */

type BillingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type BillingSettings = {
  billingEmail: string;
  invoiceName: string;
  taxIdentificationNumber: string;
  billingAddress: BillingAddress;
  receiveBillingNotifications: boolean;
  receiveUsageWarnings: boolean;
};

type BillingTextField =
  | "billingEmail"
  | "invoiceName"
  | "taxIdentificationNumber";

type BillingAddressField = keyof BillingAddress;

type BillingBooleanField =
  | "receiveBillingNotifications"
  | "receiveUsageWarnings";

type StatusMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  billingEmail: "",
  invoiceName: "",
  taxIdentificationNumber: "",
  billingAddress: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "BD",
  },
  receiveBillingNotifications: true,
  receiveUsageWarnings: true,
};

const COUNTRY_OPTIONS = [
  { value: "BD", label: "Bangladesh" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
];

/* =========================================================
   HELPERS
========================================================= */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (
  source: Record<string, unknown>,
  key: string,
  fallback: string
): string => {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
};

const readBoolean = (
  source: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean => {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
};

const mergeBillingSettings = (
  value?: Partial<BillingSettings> | null
): BillingSettings => {
  const source = isRecord(value) ? value : {};
  const addressSource = isRecord(source.billingAddress)
    ? source.billingAddress
    : {};

  return {
    billingEmail: readString(
      source,
      "billingEmail",
      DEFAULT_BILLING_SETTINGS.billingEmail
    ),

    invoiceName: readString(
      source,
      "invoiceName",
      DEFAULT_BILLING_SETTINGS.invoiceName
    ),

    taxIdentificationNumber: readString(
      source,
      "taxIdentificationNumber",
      DEFAULT_BILLING_SETTINGS.taxIdentificationNumber
    ),

    billingAddress: {
      line1: readString(
        addressSource,
        "line1",
        DEFAULT_BILLING_SETTINGS.billingAddress.line1
      ),

      line2: readString(
        addressSource,
        "line2",
        DEFAULT_BILLING_SETTINGS.billingAddress.line2
      ),

      city: readString(
        addressSource,
        "city",
        DEFAULT_BILLING_SETTINGS.billingAddress.city
      ),

      state: readString(
        addressSource,
        "state",
        DEFAULT_BILLING_SETTINGS.billingAddress.state
      ),

      postalCode: readString(
        addressSource,
        "postalCode",
        DEFAULT_BILLING_SETTINGS.billingAddress.postalCode
      ),

      country: readString(
        addressSource,
        "country",
        DEFAULT_BILLING_SETTINGS.billingAddress.country
      ),
    },

    receiveBillingNotifications: readBoolean(
      source,
      "receiveBillingNotifications",
      DEFAULT_BILLING_SETTINGS.receiveBillingNotifications
    ),

    receiveUsageWarnings: readBoolean(
      source,
      "receiveUsageWarnings",
      DEFAULT_BILLING_SETTINGS.receiveUsageWarnings
    ),
  };
};

const formatUpdatedAt = (value: string): string => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-US");
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidCountryCode = (value: string): boolean =>
  /^[A-Z]{2}$/.test(value);

const getErrorMessage = (error: unknown): string => {
  if (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

/* =========================================================
   PAGE
========================================================= */

export default function BillingSettingsPage() {
  const [formData, setFormData] = useState<BillingSettings>(
    DEFAULT_BILLING_SETTINGS
  );

  const [version, setVersion] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] =
    useState<StatusMessage>(null);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      const response =
        await getSettingsSection<BillingSettings>("billing");

      setFormData(
        mergeBillingSettings(response.data.settings)
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const billingProfileCompletion = useMemo(() => {
    const fields = [
      formData.billingEmail,
      formData.invoiceName,
      formData.taxIdentificationNumber,
      formData.billingAddress.line1,
      formData.billingAddress.city,
      formData.billingAddress.state,
      formData.billingAddress.postalCode,
      formData.billingAddress.country,
    ];

    const completed = fields.filter(
      (value) => value.trim() !== ""
    ).length;

    return Math.round((completed / fields.length) * 100);
  }, [formData]);

  /* =======================================================
     CHANGE HANDLERS
  ======================================================= */

  const handleTextChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field = event.target.name as BillingTextField;

    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setStatusMessage(null);
  };

  const handleAddressChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const field = event.target.name as BillingAddressField;

    setFormData((current) => ({
      ...current,
      billingAddress: {
        ...current.billingAddress,
        [field]: event.target.value,
      },
    }));

    setStatusMessage(null);
  };

  const handleBooleanChange = (
    field: BillingBooleanField,
    checked: boolean
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: checked,
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     NORMALIZE & VALIDATE
  ======================================================= */

  const createNormalizedData = (): BillingSettings => ({
    billingEmail: formData.billingEmail.trim().toLowerCase(),
    invoiceName: formData.invoiceName.trim(),
    taxIdentificationNumber:
      formData.taxIdentificationNumber.trim(),

    billingAddress: {
      line1: formData.billingAddress.line1.trim(),
      line2: formData.billingAddress.line2.trim(),
      city: formData.billingAddress.city.trim(),
      state: formData.billingAddress.state.trim(),
      postalCode: formData.billingAddress.postalCode.trim(),
      country: formData.billingAddress.country
        .trim()
        .toUpperCase(),
    },

    receiveBillingNotifications:
      formData.receiveBillingNotifications,

    receiveUsageWarnings:
      formData.receiveUsageWarnings,
  });

  const validateSettings = (
    settings: BillingSettings
  ): string => {
    if (
      settings.billingEmail &&
      !isValidEmail(settings.billingEmail)
    ) {
      return "Please enter a valid billing email address.";
    }

    if (settings.billingEmail.length > 254) {
      return "Billing email cannot exceed 254 characters.";
    }

    if (settings.invoiceName.length > 200) {
      return "Invoice name cannot exceed 200 characters.";
    }

    if (
      settings.taxIdentificationNumber.length > 100
    ) {
      return "Tax identification number cannot exceed 100 characters.";
    }

    if (settings.billingAddress.line1.length > 250) {
      return "Billing address line 1 cannot exceed 250 characters.";
    }

    if (settings.billingAddress.line2.length > 250) {
      return "Billing address line 2 cannot exceed 250 characters.";
    }

    if (settings.billingAddress.city.length > 100) {
      return "City cannot exceed 100 characters.";
    }

    if (settings.billingAddress.state.length > 100) {
      return "State or region cannot exceed 100 characters.";
    }

    if (settings.billingAddress.postalCode.length > 30) {
      return "Postal code cannot exceed 30 characters.";
    }

    if (
      !isValidCountryCode(
        settings.billingAddress.country
      )
    ) {
      return "Country must be a valid 2-letter ISO country code.";
    }

    return "";
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const normalizedData = createNormalizedData();
    const validationError =
      validateSettings(normalizedData);

    if (validationError) {
      setStatusMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);

      const response =
        await updateSettingsSection<BillingSettings>(
          "billing",
          normalizedData,
          version
        );

      setFormData(
        mergeBillingSettings(response.data.settings)
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Billing settings saved successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Billing settings were updated from another session. Loading the latest version...",
        });

        await loadSettings();
        return;
      }

      setStatusMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all Billing settings to their default values?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<BillingSettings>(
          "billing",
          version
        );

      setFormData(
        mergeBillingSettings(response.data.settings)
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Billing settings reset successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Billing settings were updated from another session. Loading the latest version...",
        });

        await loadSettings();
        return;
      }

      setStatusMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <BillingPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Subscription billing profile
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Billing Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure the tenant billing identity, invoice
              address and billing notification preferences.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <HeaderBadge
              label="Version"
              value={String(version ?? 0)}
            />

            <HeaderBadge
              label="Profile"
              value={`${billingProfileCompletion}% complete`}
            />

            <HeaderBadge
              label="Country"
              value={
                formData.billingAddress.country || "Not set"
              }
            />

            {updatedAt ? (
              <HeaderBadge
                label="Updated"
                value={formatUpdatedAt(updatedAt)}
              />
            ) : null}
          </div>
        </div>
      </header>

      {statusMessage ? (
        <div
          role="alert"
          className={
            statusMessage.type === "success"
              ? successAlertClassName
              : errorAlertClassName
          }
        >
          {statusMessage.text}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <SectionCard
          title="Billing Identity"
          description="Information used for subscription billing and invoice communication."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Billing email"
              htmlFor="billingEmail"
              hint="Optional"
            >
              <input
                id="billingEmail"
                name="billingEmail"
                type="email"
                value={formData.billingEmail}
                onChange={handleTextChange}
                maxLength={254}
                placeholder="billing@example.com"
                className={inputClassName}
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Billing invoices, subscription notices and payment
                updates may be sent to this address.
              </p>
            </FormField>

            <FormField
              label="Invoice name"
              htmlFor="invoiceName"
              hint="Maximum 200 characters"
            >
              <input
                id="invoiceName"
                name="invoiceName"
                type="text"
                value={formData.invoiceName}
                onChange={handleTextChange}
                maxLength={200}
                placeholder="TownMela"
                className={inputClassName}
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Business or legal name displayed on billing
                invoices.
              </p>
            </FormField>

            <FormField
              label="Tax identification number"
              htmlFor="taxIdentificationNumber"
              hint="Optional"
            >
              <input
                id="taxIdentificationNumber"
                name="taxIdentificationNumber"
                type="text"
                value={
                  formData.taxIdentificationNumber
                }
                onChange={handleTextChange}
                maxLength={100}
                placeholder="TIN, VAT or tax registration number"
                className={inputClassName}
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                This value may appear on billing documents where
                applicable.
              </p>
            </FormField>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                Sensitive billing data
              </p>

              <p className="mt-2 text-xs leading-5 text-amber-800">
                Card details, gateway secrets and private API keys
                must not be stored in this settings document.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Billing Address"
          description="Address displayed on billing records and subscription invoices."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField
                label="Address line 1"
                htmlFor="line1"
                hint="Maximum 250 characters"
              >
                <input
                  id="line1"
                  name="line1"
                  type="text"
                  value={formData.billingAddress.line1}
                  onChange={handleAddressChange}
                  maxLength={250}
                  placeholder="Street address, building or office"
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField
                label="Address line 2"
                htmlFor="line2"
                hint="Optional"
              >
                <input
                  id="line2"
                  name="line2"
                  type="text"
                  value={formData.billingAddress.line2}
                  onChange={handleAddressChange}
                  maxLength={250}
                  placeholder="Suite, floor, area or additional address"
                  className={inputClassName}
                />
              </FormField>
            </div>

            <FormField
              label="City"
              htmlFor="city"
              hint="Maximum 100 characters"
            >
              <input
                id="city"
                name="city"
                type="text"
                value={formData.billingAddress.city}
                onChange={handleAddressChange}
                maxLength={100}
                placeholder="Dhaka"
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="State or region"
              htmlFor="state"
              hint="Maximum 100 characters"
            >
              <input
                id="state"
                name="state"
                type="text"
                value={formData.billingAddress.state}
                onChange={handleAddressChange}
                maxLength={100}
                placeholder="Dhaka Division"
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Postal code"
              htmlFor="postalCode"
              hint="Maximum 30 characters"
            >
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={
                  formData.billingAddress.postalCode
                }
                onChange={handleAddressChange}
                maxLength={30}
                placeholder="1207"
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Country"
              htmlFor="country"
              hint="2-letter ISO code"
            >
              <select
                id="country"
                name="country"
                value={formData.billingAddress.country}
                onChange={handleAddressChange}
                className={inputClassName}
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option
                    key={country.value}
                    value={country.value}
                  >
                    {country.label} ({country.value})
                  </option>
                ))}

                {!COUNTRY_OPTIONS.some(
                  (country) =>
                    country.value ===
                    formData.billingAddress.country
                ) &&
                formData.billingAddress.country ? (
                  <option
                    value={
                      formData.billingAddress.country
                    }
                  >
                    {
                      formData.billingAddress.country
                    }
                  </option>
                ) : null}
              </select>
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Billing Notifications"
          description="Choose which subscription and usage-related messages should be delivered."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingToggleCard
              title="Receive billing notifications"
              description="Receive subscription invoices, billing updates and payment-related notices."
              checked={
                formData.receiveBillingNotifications
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "receiveBillingNotifications",
                  checked
                )
              }
              badge="Billing"
            />

            <SettingToggleCard
              title="Receive usage warnings"
              description="Receive warnings when tenant usage approaches a subscription plan limit."
              checked={formData.receiveUsageWarnings}
              onChange={(checked) =>
                handleBooleanChange(
                  "receiveUsageWarnings",
                  checked
                )
              }
              badge="Usage"
            />
          </div>
        </SectionCard>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Billing settings apply only to the active tenant.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || resetting}
                className={secondaryButtonClassName}
              >
                {resetting
                  ? "Resetting..."
                  : "Reset to defaults"}
              </button>

              <button
                type="submit"
                disabled={saving || resetting}
                className={primaryButtonClassName}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SettingToggleCard({
  title,
  description,
  checked,
  onChange,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition sm:p-5",
        checked
          ? "border-blue-200 bg-blue-50/70"
          : "border-slate-200 bg-slate-50/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {title}
            </h3>

            {badge ? (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {badge}
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <Switch
          checked={checked}
          onChange={onChange}
        />
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-3">
        <p className="text-xs font-semibold text-slate-600">
          {checked ? "Enabled" : "Disabled"}
        </p>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="peer sr-only"
      />

      <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20" />

      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
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
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
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

function HeaderBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
      {label}:{" "}
      <strong className="text-slate-700">
        {value}
      </strong>
    </span>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="h-5 w-56 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map(
              (_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="h-24 rounded-xl bg-slate-100"
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   SHARED STYLES
========================================================= */

const inputClassName =
  "block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const successAlertClassName =
  "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800";

const errorAlertClassName =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800";