"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export const COURIER_PROVIDER_TYPES = [
  "manual",
  "pathao",
  "steadfast",
  "redx",
  "paperfly",
  "custom",
] as const;

export const COURIER_DELIVERY_TYPES = [
  "regular",
  "express",
  "same_day",
] as const;

export type CourierProviderType = (typeof COURIER_PROVIDER_TYPES)[number];
export type CourierDeliveryType = (typeof COURIER_DELIVERY_TYPES)[number];

export interface CourierCredentials {
  apiKey: string;
  apiSecret: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface CourierSettings {
  merchantStoreId: string;
  defaultDeliveryType: CourierDeliveryType;
  autoBookShipment: boolean;
  enableStatusSync: boolean;
}

export interface CourierFormValues {
  name: string;
  code: string;
  providerType: CourierProviderType;
  logo: string;
  website: string;
  supportPhone: string;
  supportEmail: string;
  apiBaseUrl: string;
  credentials: CourierCredentials;
  settings: CourierSettings;
  isActive: boolean;
  isDefault: boolean;
}

export type CourierFormPayload = {
  name: string;
  code: string;
  providerType: CourierProviderType;
  logo: string;
  website: string;
  supportPhone: string;
  supportEmail: string;
  apiBaseUrl: string;
  credentials?: Partial<CourierCredentials>;
  settings: CourierSettings;
  isActive: boolean;
  isDefault: boolean;
};

export interface CourierFormProps {
  mode?: "create" | "edit";
  initialValues?: Partial<CourierFormValues>;
  isSubmitting?: boolean;
  serverError?: string | null;
  submitLabel?: string;
  onSubmit: (
    payload: CourierFormPayload,
    values: CourierFormValues,
  ) => void | Promise<void>;
  onCancel?: () => void;
}

type FieldErrors = Partial<
  Record<
    | "name"
    | "code"
    | "providerType"
    | "supportEmail"
    | "website"
    | "apiBaseUrl"
    | "defaultDeliveryType"
    | "isDefault",
    string
  >
>;

const EMPTY_CREDENTIALS: CourierCredentials = {
  apiKey: "",
  apiSecret: "",
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
};

const DEFAULT_SETTINGS: CourierSettings = {
  merchantStoreId: "",
  defaultDeliveryType: "regular",
  autoBookShipment: false,
  enableStatusSync: true,
};

export const DEFAULT_COURIER_FORM_VALUES: CourierFormValues = {
  name: "",
  code: "",
  providerType: "manual",
  logo: "",
  website: "",
  supportPhone: "",
  supportEmail: "",
  apiBaseUrl: "",
  credentials: EMPTY_CREDENTIALS,
  settings: DEFAULT_SETTINGS,
  isActive: true,
  isDefault: false,
};

const mergeInitialValues = (
  initialValues?: Partial<CourierFormValues>,
): CourierFormValues => ({
  ...DEFAULT_COURIER_FORM_VALUES,
  ...initialValues,
  credentials: {
    ...EMPTY_CREDENTIALS,
    ...(initialValues?.credentials ?? {}),
  },
  settings: {
    ...DEFAULT_SETTINGS,
    ...(initialValues?.settings ?? {}),
  },
});

const normalizeCourierCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

const isValidOptionalUrl = (value: string) => {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidOptionalEmail = (value: string) => {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const removeEmptyCredentials = (
  credentials: CourierCredentials,
): Partial<CourierCredentials> | undefined => {
  const entries = Object.entries(credentials)
    .map(([key, value]) => [key, value.trim()])
    .filter(([, value]) => Boolean(value));

  return entries.length
    ? (Object.fromEntries(entries) as Partial<CourierCredentials>)
    : undefined;
};

const buildPayload = (values: CourierFormValues): CourierFormPayload => {
  const credentials = removeEmptyCredentials(values.credentials);

  return {
    name: values.name.trim(),
    code: normalizeCourierCode(values.code),
    providerType: values.providerType,
    logo: values.logo.trim(),
    website: values.website.trim(),
    supportPhone: values.supportPhone.trim(),
    supportEmail: values.supportEmail.trim().toLowerCase(),
    apiBaseUrl: values.apiBaseUrl.trim(),
    ...(credentials ? { credentials } : {}),
    settings: {
      merchantStoreId: values.settings.merchantStoreId.trim(),
      defaultDeliveryType: values.settings.defaultDeliveryType,
      autoBookShipment: values.settings.autoBookShipment,
      enableStatusSync: values.settings.enableStatusSync,
    },
    isActive: values.isActive,
    isDefault: values.isDefault,
  };
};

const inputClassName =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const errorInputClassName =
  "border-red-400 focus:border-red-500 focus:ring-red-100";
const labelClassName = "block text-sm font-medium text-slate-700";
const helpTextClassName = "mt-1 text-xs leading-5 text-slate-500";
const errorTextClassName = "mt-1 text-xs font-medium text-red-600";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 rounded-lg border p-4 transition ${
        checked ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span>
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2" />
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function CourierForm({
  mode = "create",
  initialValues,
  isSubmitting = false,
  serverError,
  submitLabel,
  onSubmit,
  onCancel,
}: CourierFormProps) {
  const mergedInitialValues = useMemo(
    () => mergeInitialValues(initialValues),
    [initialValues],
  );

  const [values, setValues] = useState<CourierFormValues>(mergedInitialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showCredentials, setShowCredentials] = useState(
    Object.values(mergedInitialValues.credentials).some(Boolean),
  );

  useEffect(() => {
    setValues(mergedInitialValues);
    setErrors({});
    setShowCredentials(
      Object.values(mergedInitialValues.credentials).some(Boolean),
    );
  }, [mergedInitialValues]);

  const setField = <Key extends keyof CourierFormValues>(
    key: Key,
    value: CourierFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const setCredentialField = (key: keyof CourierCredentials, value: string) => {
    setValues((current) => ({
      ...current,
      credentials: { ...current.credentials, [key]: value },
    }));
  };

  const setSettingField = <Key extends keyof CourierSettings>(
    key: Key,
    value: CourierSettings[Key],
  ) => {
    setValues((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!values.name.trim()) nextErrors.name = "Courier name is required.";
    if (!normalizeCourierCode(values.code)) {
      nextErrors.code = "Courier code is required.";
    }
    if (!COURIER_PROVIDER_TYPES.includes(values.providerType)) {
      nextErrors.providerType = "Select a valid provider type.";
    }
    if (!isValidOptionalEmail(values.supportEmail)) {
      nextErrors.supportEmail = "Enter a valid email address.";
    }
    if (!isValidOptionalUrl(values.website)) {
      nextErrors.website = "Enter a valid HTTP or HTTPS URL.";
    }
    if (!isValidOptionalUrl(values.apiBaseUrl)) {
      nextErrors.apiBaseUrl = "Enter a valid HTTP or HTTPS URL.";
    }
    if (!COURIER_DELIVERY_TYPES.includes(values.settings.defaultDeliveryType)) {
      nextErrors.defaultDeliveryType = "Select a valid delivery type.";
    }
    if (values.isDefault && !values.isActive) {
      nextErrors.isDefault = "An inactive courier cannot be set as default.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(buildPayload(values), values);
  };

  const handleActiveChange = (isActive: boolean) => {
    setValues((current) => ({
      ...current,
      isActive,
      isDefault: isActive ? current.isDefault : false,
    }));
    setErrors((current) => ({ ...current, isDefault: undefined }));
  };

  const resolvedSubmitLabel =
    submitLabel ?? (mode === "edit" ? "Save Changes" : "Create Courier");

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      ) : null}

      <Section
        title="Basic Information"
        description="Configure the courier identity and public support details."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="courier-name" className={labelClassName}>
              Courier Name <span className="text-red-600">*</span>
            </label>
            <input
              id="courier-name"
              value={values.name}
              disabled={isSubmitting}
              placeholder="e.g. Pathao Courier"
              className={`${inputClassName} ${
                errors.name ? errorInputClassName : ""
              }`}
              onChange={(event) => setField("name", event.target.value)}
            />
            {errors.name ? (
              <p className={errorTextClassName}>{errors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="courier-code" className={labelClassName}>
              Courier Code <span className="text-red-600">*</span>
            </label>
            <input
              id="courier-code"
              value={values.code}
              disabled={isSubmitting || mode === "edit"}
              placeholder="e.g. pathao"
              className={`${inputClassName} ${
                errors.code ? errorInputClassName : ""
              }`}
              onBlur={() =>
                mode === "create" &&
                setField("code", normalizeCourierCode(values.code))
              }
              onChange={(event) => setField("code", event.target.value)}
            />
            {errors.code ? (
              <p className={errorTextClassName}>{errors.code}</p>
            ) : (
              <p className={helpTextClassName}>
                Lowercase identifier. It cannot be changed after creation.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="provider-type" className={labelClassName}>
              Provider Type <span className="text-red-600">*</span>
            </label>
            <select
              id="provider-type"
              value={values.providerType}
              disabled={isSubmitting}
              className={inputClassName}
              onChange={(event) =>
                setField(
                  "providerType",
                  event.target.value as CourierProviderType,
                )
              }
            >
              {COURIER_PROVIDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {[
            ["logo", "Logo URL", "url", "https://..."],
            ["website", "Website", "url", "https://example.com"],
            ["supportPhone", "Support Phone", "tel", "+880..."],
            ["supportEmail", "Support Email", "email", "support@example.com"],
            ["apiBaseUrl", "API Base URL", "url", "https://api.example.com"],
          ].map(([field, label, type, placeholder]) => (
            <div key={field}>
              <label htmlFor={field} className={labelClassName}>
                {label}
              </label>
              <input
                id={field}
                type={type}
                value={values[field as keyof CourierFormValues] as string}
                disabled={isSubmitting}
                placeholder={placeholder}
                className={`${inputClassName} ${
                  errors[field as keyof FieldErrors] ? errorInputClassName : ""
                }`}
                onChange={(event) =>
                  setField(
                    field as
                      | "logo"
                      | "website"
                      | "supportPhone"
                      | "supportEmail"
                      | "apiBaseUrl",
                    event.target.value,
                  )
                }
              />
              {errors[field as keyof FieldErrors] ? (
                <p className={errorTextClassName}>
                  {errors[field as keyof FieldErrors]}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Credentials"
        description="Sensitive values are sent only when a field contains a value."
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            {showCredentials
              ? "Credential fields are visible."
              : "Credential fields are currently hidden."}
          </p>
          <button
            type="button"
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={() => setShowCredentials((current) => !current)}
          >
            {showCredentials ? "Hide Credentials" : "Configure Credentials"}
          </button>
        </div>

        {showCredentials ? (
          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                ["apiKey", "API Key"],
                ["apiSecret", "API Secret"],
                ["clientId", "Client ID"],
                ["clientSecret", "Client Secret"],
                ["username", "Username"],
                ["password", "Password"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label
                  htmlFor={`credential-${field}`}
                  className={labelClassName}
                >
                  {label}
                </label>
                <input
                  id={`credential-${field}`}
                  type={field === "username" ? "text" : "password"}
                  value={values.credentials[field]}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  placeholder={
                    mode === "edit"
                      ? "Leave blank to keep unchanged"
                      : `Enter ${label.toLowerCase()}`
                  }
                  className={inputClassName}
                  onChange={(event) =>
                    setCredentialField(field, event.target.value)
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section
        title="Shipment Settings"
        description="Set the default operational behaviour for this courier."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="merchant-store-id" className={labelClassName}>
              Merchant Store ID
            </label>
            <input
              id="merchant-store-id"
              value={values.settings.merchantStoreId}
              disabled={isSubmitting}
              placeholder="Provider store or merchant ID"
              className={inputClassName}
              onChange={(event) =>
                setSettingField("merchantStoreId", event.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="delivery-type" className={labelClassName}>
              Default Delivery Type
            </label>
            <select
              id="delivery-type"
              value={values.settings.defaultDeliveryType}
              disabled={isSubmitting}
              className={inputClassName}
              onChange={(event) =>
                setSettingField(
                  "defaultDeliveryType",
                  event.target.value as CourierDeliveryType,
                )
              }
            >
              {COURIER_DELIVERY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ToggleField
            id="auto-book-shipment"
            label="Auto Book Shipment"
            description="Automatically submit eligible shipments to this courier."
            checked={values.settings.autoBookShipment}
            disabled={isSubmitting}
            onChange={(checked) => setSettingField("autoBookShipment", checked)}
          />
          <ToggleField
            id="enable-status-sync"
            label="Enable Status Sync"
            description="Synchronize shipment status updates from the provider."
            checked={values.settings.enableStatusSync}
            disabled={isSubmitting}
            onChange={(checked) => setSettingField("enableStatusSync", checked)}
          />
        </div>
      </Section>

      <Section
        title="Status"
        description="Control whether this courier is available and selected by default."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            id="courier-active"
            label="Active"
            description="Allow this courier to be used for shipment operations."
            checked={values.isActive}
            disabled={isSubmitting}
            onChange={handleActiveChange}
          />
          <ToggleField
            id="courier-default"
            label="Default Courier"
            description="Use this courier as the primary option for new shipments."
            checked={values.isDefault}
            disabled={isSubmitting || !values.isActive}
            onChange={(checked) => setField("isDefault", checked)}
          />
        </div>
        {errors.isDefault ? (
          <p className={errorTextClassName}>{errors.isDefault}</p>
        ) : null}
      </Section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            disabled={isSubmitting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}