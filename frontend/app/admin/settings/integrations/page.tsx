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

type IntegrationItem = {
  enabled: boolean;
  configured: boolean;
  provider: string;
  configurationReference: string | null;
};

type IntegrationSettings = {
  paymentGateway: IntegrationItem;
  emailProvider: IntegrationItem;
  smsProvider: IntegrationItem;
  analyticsProvider: IntegrationItem;
  accountingProvider: IntegrationItem;
  customApi: IntegrationItem;
};

type IntegrationKey = keyof IntegrationSettings;

type IntegrationField =
  | "enabled"
  | "configured"
  | "provider"
  | "configurationReference";

type StatusMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type IntegrationDefinition = {
  key: IntegrationKey;
  title: string;
  description: string;
  providerPlaceholder: string;
  category: string;
};

/* =========================================================
   DEFAULTS
========================================================= */

const EMPTY_INTEGRATION_ITEM: IntegrationItem = {
  enabled: false,
  configured: false,
  provider: "",
  configurationReference: null,
};

const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  paymentGateway: { ...EMPTY_INTEGRATION_ITEM },
  emailProvider: { ...EMPTY_INTEGRATION_ITEM },
  smsProvider: { ...EMPTY_INTEGRATION_ITEM },
  analyticsProvider: { ...EMPTY_INTEGRATION_ITEM },
  accountingProvider: { ...EMPTY_INTEGRATION_ITEM },
  customApi: { ...EMPTY_INTEGRATION_ITEM },
};

const INTEGRATIONS: IntegrationDefinition[] = [
  {
    key: "paymentGateway",
    title: "Payment Gateway",
    description:
      "Control the payment provider available to the active tenant.",
    providerPlaceholder: "sslcommerz, stripe, paypal",
    category: "Payments",
  },
  {
    key: "emailProvider",
    title: "Email Provider",
    description:
      "Manage the provider used for transactional and notification email.",
    providerPlaceholder: "sendgrid, mailgun, ses",
    category: "Messaging",
  },
  {
    key: "smsProvider",
    title: "SMS Provider",
    description:
      "Manage the tenant SMS delivery provider and connection state.",
    providerPlaceholder: "twilio, bulksms, local-provider",
    category: "Messaging",
  },
  {
    key: "analyticsProvider",
    title: "Analytics Provider",
    description:
      "Enable analytics tracking through an approved provider configuration.",
    providerPlaceholder: "google-analytics, plausible",
    category: "Analytics",
  },
  {
    key: "accountingProvider",
    title: "Accounting Provider",
    description:
      "Connect the tenant to an external accounting or bookkeeping service.",
    providerPlaceholder: "quickbooks, xero",
    category: "Finance",
  },
  {
    key: "customApi",
    title: "Custom API",
    description:
      "Enable a tenant-specific custom API integration stored outside this document.",
    providerPlaceholder: "custom, internal-api",
    category: "Custom",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBoolean = (
  source: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean => {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
};

const readString = (
  source: Record<string, unknown>,
  key: string,
  fallback: string
): string => {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
};

const readNullableString = (
  source: Record<string, unknown>,
  key: string
): string | null => {
  const value = source[key];

  if (typeof value === "string") {
    return value;
  }

  return null;
};

const mergeIntegrationItem = (
  value: unknown
): IntegrationItem => {
  const source = isRecord(value) ? value : {};

  return {
    enabled: readBoolean(source, "enabled", false),
    configured: readBoolean(source, "configured", false),
    provider: readString(source, "provider", ""),
    configurationReference: readNullableString(
      source,
      "configurationReference"
    ),
  };
};

const mergeIntegrationSettings = (
  value?: Partial<IntegrationSettings> | null
): IntegrationSettings => {
  const source = isRecord(value) ? value : {};

  return {
    paymentGateway: mergeIntegrationItem(
      source.paymentGateway
    ),
    emailProvider: mergeIntegrationItem(
      source.emailProvider
    ),
    smsProvider: mergeIntegrationItem(
      source.smsProvider
    ),
    analyticsProvider: mergeIntegrationItem(
      source.analyticsProvider
    ),
    accountingProvider: mergeIntegrationItem(
      source.accountingProvider
    ),
    customApi: mergeIntegrationItem(
      source.customApi
    ),
  };
};

const normalizeProvider = (value: string): string =>
  value.trim().toLowerCase();

const normalizeObjectId = (
  value: string | null
): string | null => {
  const normalized = value?.trim() || "";
  return normalized || null;
};

const isValidObjectId = (value: string): boolean =>
  /^[a-fA-F0-9]{24}$/.test(value);

const formatUpdatedAt = (value: string): string => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-US");
};

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

export default function IntegrationsSettingsPage() {
  const [formData, setFormData] =
    useState<IntegrationSettings>(
      DEFAULT_INTEGRATION_SETTINGS
    );

  const [version, setVersion] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] =
    useState<StatusMessage>(null);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      const response =
        await getSettingsSection<IntegrationSettings>(
          "integrations"
        );

      setFormData(
        mergeIntegrationSettings(
          response.data.settings
        )
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
     DERIVED STATS
  ======================================================= */

  const statistics = useMemo(() => {
    const items = Object.values(formData);

    return {
      enabled: items.filter((item) => item.enabled).length,
      configured: items.filter(
        (item) => item.configured
      ).length,
      ready: items.filter(
        (item) => item.enabled && item.configured
      ).length,
    };
  }, [formData]);

  /* =======================================================
     CHANGE HANDLERS
  ======================================================= */

  const updateIntegration = (
    key: IntegrationKey,
    field: IntegrationField,
    value: boolean | string | null
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));

    setStatusMessage(null);
  };

  const handleProviderChange = (
    key: IntegrationKey,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    updateIntegration(
      key,
      "provider",
      event.target.value
    );
  };

  const handleReferenceChange = (
    key: IntegrationKey,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    updateIntegration(
      key,
      "configurationReference",
      event.target.value
    );
  };

  /* =======================================================
     NORMALIZE & VALIDATE
  ======================================================= */

  const createNormalizedData =
    (): IntegrationSettings => {
      const normalized =
        {} as IntegrationSettings;

      for (const definition of INTEGRATIONS) {
        const item = formData[definition.key];

        normalized[definition.key] = {
          enabled: item.enabled,
          configured: item.configured,
          provider: normalizeProvider(item.provider),
          configurationReference: normalizeObjectId(
            item.configurationReference
          ),
        };
      }

      return normalized;
    };

  const validateSettings = (
    settings: IntegrationSettings
  ): string => {
    for (const definition of INTEGRATIONS) {
      const item = settings[definition.key];

      if (item.provider.length > 100) {
        return `${definition.title} provider cannot exceed 100 characters.`;
      }

      if (item.enabled && !item.provider) {
        return `${definition.title} requires a provider before it can be enabled.`;
      }

      if (
        item.configurationReference &&
        !isValidObjectId(
          item.configurationReference
        )
      ) {
        return `${definition.title} configuration reference must be a valid 24-character MongoDB ObjectId.`;
      }

      if (
        item.configured &&
        !item.configurationReference
      ) {
        return `${definition.title} cannot be marked configured without a configuration reference.`;
      }

      if (
        item.enabled &&
        !item.configured
      ) {
        return `${definition.title} must be configured before it can be enabled.`;
      }
    }

    return "";
  };

  /* =======================================================
     SAVE
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
        await updateSettingsSection<IntegrationSettings>(
          "integrations",
          normalizedData,
          version
        );

      setFormData(
        mergeIntegrationSettings(
          response.data.settings
        )
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Integration settings saved successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Integration settings were updated from another session. Loading the latest version...",
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
     RESET
  ======================================================= */

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all Integration settings to their default values?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<IntegrationSettings>(
          "integrations",
          version
        );

      setFormData(
        mergeIntegrationSettings(
          response.data.settings
        )
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Integration settings reset successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Integration settings were updated from another session. Loading the latest version...",
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
    return <IntegrationsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              External services
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Integration Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage public provider configuration and feature
              status for tenant integrations. Secret credentials
              remain in separate encrypted storage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <HeaderBadge
              label="Version"
              value={String(version ?? 0)}
            />

            <HeaderBadge
              label="Enabled"
              value={`${statistics.enabled}/6`}
            />

            <HeaderBadge
              label="Configured"
              value={`${statistics.configured}/6`}
            />

            <HeaderBadge
              label="Ready"
              value={`${statistics.ready}/6`}
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

      <SecurityNotice />

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {INTEGRATIONS.map((definition) => (
            <IntegrationCard
              key={definition.key}
              definition={definition}
              value={formData[definition.key]}
              onEnabledChange={(checked) =>
                updateIntegration(
                  definition.key,
                  "enabled",
                  checked
                )
              }
              onConfiguredChange={(checked) =>
                updateIntegration(
                  definition.key,
                  "configured",
                  checked
                )
              }
              onProviderChange={(event) =>
                handleProviderChange(
                  definition.key,
                  event
                )
              }
              onReferenceChange={(event) =>
                handleReferenceChange(
                  definition.key,
                  event
                )
              }
            />
          ))}
        </section>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Integration settings apply only to the active tenant.
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

function IntegrationCard({
  definition,
  value,
  onEnabledChange,
  onConfiguredChange,
  onProviderChange,
  onReferenceChange,
}: {
  definition: IntegrationDefinition;
  value: IntegrationItem;
  onEnabledChange: (checked: boolean) => void;
  onConfiguredChange: (checked: boolean) => void;
  onProviderChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onReferenceChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  const status = getIntegrationStatus(value);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {definition.title}
              </h2>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {definition.category}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {definition.description}
            </p>
          </div>

          <StatusBadge
            label={status.label}
            tone={status.tone}
          />
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ToggleBlock
            title="Enabled"
            description="Allow this tenant to use the integration."
            checked={value.enabled}
            onChange={onEnabledChange}
          />

          <ToggleBlock
            title="Configured"
            description="The external encrypted configuration is ready."
            checked={value.configured}
            onChange={onConfiguredChange}
          />
        </div>

        <FormField
          label="Provider"
          htmlFor={`${definition.key}-provider`}
          hint="Maximum 100 characters"
        >
          <input
            id={`${definition.key}-provider`}
            type="text"
            value={value.provider}
            onChange={onProviderChange}
            maxLength={100}
            placeholder={definition.providerPlaceholder}
            className={inputClassName}
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Saved in lowercase. Example provider names should be
            stable identifiers rather than display labels.
          </p>
        </FormField>

        <FormField
          label="Configuration reference"
          htmlFor={`${definition.key}-configurationReference`}
          hint="MongoDB ObjectId"
        >
          <input
            id={`${definition.key}-configurationReference`}
            type="text"
            value={value.configurationReference || ""}
            onChange={onReferenceChange}
            maxLength={24}
            placeholder="64f1a2b3c4d5e6f7890abcde"
            className={inputClassName}
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Reference only. Sensitive credentials must stay in
            separate encrypted storage.
          </p>
        </FormField>
      </div>
    </article>
  );
}

function ToggleBlock({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4 transition",
        checked
          ? "border-blue-200 bg-blue-50/70"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <Switch
          checked={checked}
          onChange={onChange}
        />
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
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
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
    </label>
  );
}

function SecurityNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="text-sm font-bold text-amber-900">
        Secret credentials are not stored here
      </p>

      <p className="mt-1 text-xs leading-5 text-amber-800">
        This page stores only provider names, status flags and
        configuration references. API keys, passwords, tokens and
        private credentials must remain in your encrypted integration
        credential storage.
      </p>
    </div>
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

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "slate";
}) {
  const className =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function getIntegrationStatus(
  item: IntegrationItem
): {
  label: string;
  tone: "green" | "amber" | "slate";
} {
  if (item.enabled && item.configured) {
    return {
      label: "Active",
      tone: "green",
    };
  }

  if (item.configured) {
    return {
      label: "Configured",
      tone: "amber",
    };
  }

  if (item.enabled) {
    return {
      label: "Needs configuration",
      tone: "amber",
    };
  }

  return {
    label: "Disabled",
    tone: "slate",
  };
}

/* =========================================================
   SKELETON
========================================================= */

function IntegrationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full rounded bg-slate-100" />

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="h-24 rounded-xl bg-slate-100" />
              <div className="h-24 rounded-xl bg-slate-100" />
            </div>

            <div className="mt-5 h-11 rounded-xl bg-slate-100" />
            <div className="mt-5 h-11 rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
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