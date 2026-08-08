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
  getSettingsErrorMessage,
  getSettingsSection,
  isSettingsVersionConflict,
  resetSettingsSection,
  updateSettingsSection,
} from "../_lib/settingsApi";

type NotificationChannel = {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
};

type NotificationEventKey =
  | "orderCreated"
  | "orderConfirmed"
  | "orderCancelled"
  | "orderDelivered"
  | "paymentReceived"
  | "paymentFailed"
  | "lowStock"
  | "goodsReceived"
  | "vendorInvoiceDue"
  | "securityAlert";

type NotificationChannelKey = keyof NotificationChannel;

type NotificationSettings = Record<
  NotificationEventKey,
  NotificationChannel
> & {
  senderName: string;
  replyToEmail: string;
};

type NotificationEventDefinition = {
  key: NotificationEventKey;
  title: string;
  description: string;
  group: "orders" | "payments" | "inventory" | "security";
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

const DEFAULT_CHANNELS: NotificationChannel = {
  email: true,
  sms: false,
  push: false,
  inApp: true,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  orderCreated: { ...DEFAULT_CHANNELS },
  orderConfirmed: { ...DEFAULT_CHANNELS },
  orderCancelled: { ...DEFAULT_CHANNELS },
  orderDelivered: { ...DEFAULT_CHANNELS },
  paymentReceived: { ...DEFAULT_CHANNELS },
  paymentFailed: { email: true, sms: false, push: true, inApp: true },
  lowStock: { email: true, sms: false, push: false, inApp: true },
  goodsReceived: { email: true, sms: false, push: false, inApp: true },
  vendorInvoiceDue: { email: true, sms: false, push: false, inApp: true },
  securityAlert: { email: true, sms: false, push: true, inApp: true },
  senderName: "TownMela",
  replyToEmail: "",
};

const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  { key: "orderCreated", title: "Order Created", description: "Notify when a new customer order is created.", group: "orders" },
  { key: "orderConfirmed", title: "Order Confirmed", description: "Notify when an order is confirmed for processing.", group: "orders" },
  { key: "orderCancelled", title: "Order Cancelled", description: "Notify when an order is cancelled.", group: "orders" },
  { key: "orderDelivered", title: "Order Delivered", description: "Notify when an order is marked as delivered.", group: "orders" },
  { key: "paymentReceived", title: "Payment Received", description: "Notify when a payment is successfully received.", group: "payments" },
  { key: "paymentFailed", title: "Payment Failed", description: "Notify when a payment attempt fails.", group: "payments" },
  { key: "lowStock", title: "Low Stock", description: "Notify when a product reaches its low-stock threshold.", group: "inventory" },
  { key: "goodsReceived", title: "Goods Received", description: "Notify when a goods-received record is created or completed.", group: "inventory" },
  { key: "vendorInvoiceDue", title: "Vendor Invoice Due", description: "Notify when a vendor invoice is approaching or passes its due date.", group: "inventory" },
  { key: "securityAlert", title: "Security Alert", description: "Notify administrators about important security-related events.", group: "security" },
];

const CHANNELS: Array<{
  key: NotificationChannelKey;
  label: string;
  description: string;
}> = [
  { key: "email", label: "Email", description: "Send notifications through email." },
  { key: "sms", label: "SMS", description: "Send notifications through SMS." },
  { key: "push", label: "Push", description: "Send browser or mobile push notifications." },
  { key: "inApp", label: "In-app", description: "Show notifications inside the admin application." },
];

const GROUPS = [
  { key: "orders", title: "Order Notifications", description: "Configure notifications for important order lifecycle events." },
  { key: "payments", title: "Payment Notifications", description: "Configure notifications for successful and failed payment events." },
  { key: "inventory", title: "Inventory & Purchasing Notifications", description: "Configure stock, goods-received and vendor invoice notifications." },
  { key: "security", title: "Security Notifications", description: "Configure alerts for important account and security events." },
] as const;

const mergeChannel = (
  value?: Partial<NotificationChannel> | null,
  fallback: NotificationChannel = DEFAULT_CHANNELS
): NotificationChannel => ({
  email: typeof value?.email === "boolean" ? value.email : fallback.email,
  sms: typeof value?.sms === "boolean" ? value.sms : fallback.sms,
  push: typeof value?.push === "boolean" ? value.push : fallback.push,
  inApp: typeof value?.inApp === "boolean" ? value.inApp : fallback.inApp,
});

const mergeNotificationSettings = (
  settings?: Partial<NotificationSettings> | null
): NotificationSettings => {
  const nextSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
  };

  for (const event of NOTIFICATION_EVENTS) {
    nextSettings[event.key] = mergeChannel(
      settings?.[event.key],
      DEFAULT_NOTIFICATION_SETTINGS[event.key]
    );
  }

  nextSettings.senderName =
    typeof settings?.senderName === "string"
      ? settings.senderName
      : DEFAULT_NOTIFICATION_SETTINGS.senderName;

  nextSettings.replyToEmail =
    typeof settings?.replyToEmail === "string"
      ? settings.replyToEmail
      : DEFAULT_NOTIFICATION_SETTINGS.replyToEmail;

  return nextSettings;
};

const formatUpdatedAt = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US");
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function NotificationSettingsPage() {
  const [formData, setFormData] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [version, setVersion] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      const response =
        await getSettingsSection<NotificationSettings>("notifications");

      setFormData(mergeNotificationSettings(response.data.settings));
      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: getSettingsErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const enabledChannelCount = useMemo(() => {
    let count = 0;
    for (const event of NOTIFICATION_EVENTS) {
      for (const channel of CHANNELS) {
        if (formData[event.key][channel.key]) count += 1;
      }
    }
    return count;
  }, [formData]);

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as "senderName" | "replyToEmail";
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
    setStatusMessage(null);
  };

  const handleChannelChange = (
    eventKey: NotificationEventKey,
    channelKey: NotificationChannelKey,
    checked: boolean
  ) => {
    setFormData((current) => ({
      ...current,
      [eventKey]: {
        ...current[eventKey],
        [channelKey]: checked,
      },
    }));
    setStatusMessage(null);
  };

  const handleEventToggle = (
    eventKey: NotificationEventKey,
    enabled: boolean
  ) => {
    setFormData((current) => ({
      ...current,
      [eventKey]: { email: enabled, sms: enabled, push: enabled, inApp: enabled },
    }));
    setStatusMessage(null);
  };

  const handleChannelColumnToggle = (
    channelKey: NotificationChannelKey,
    enabled: boolean
  ) => {
    setFormData((current) => {
      const next: NotificationSettings = { ...current };
      for (const event of NOTIFICATION_EVENTS) {
        next[event.key] = {
          ...next[event.key],
          [channelKey]: enabled,
        };
      }
      return next;
    });
    setStatusMessage(null);
  };

  const handleGroupToggle = (
    group: NotificationEventDefinition["group"],
    enabled: boolean
  ) => {
    setFormData((current) => {
      const next: NotificationSettings = { ...current };
      for (const event of NOTIFICATION_EVENTS) {
        if (event.group !== group) continue;
        next[event.key] = { email: enabled, sms: enabled, push: enabled, inApp: enabled };
      }
      return next;
    });
    setStatusMessage(null);
  };

  const createNormalizedData = (): NotificationSettings => {
    const normalized = mergeNotificationSettings(formData);
    normalized.senderName = normalized.senderName.trim();
    normalized.replyToEmail = normalized.replyToEmail.trim().toLowerCase();
    return normalized;
  };

  const validateForm = (settings: NotificationSettings): string => {
    if (!settings.senderName) return "Sender name is required.";
    if (settings.senderName.length > 100) {
      return "Sender name cannot exceed 100 characters.";
    }
    if (settings.replyToEmail && !isValidEmail(settings.replyToEmail)) {
      return "Please enter a valid reply-to email address.";
    }
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedData = createNormalizedData();
    const validationError = validateForm(normalizedData);

    if (validationError) {
      setStatusMessage({ type: "error", text: validationError });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);

      const response = await updateSettingsSection<
        NotificationSettings & Record<string, unknown>
      >("notifications", normalizedData, version);

      setFormData(mergeNotificationSettings(response.data.settings));
      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");
      setStatusMessage({
        type: "success",
        text: response.message || "Notification settings saved successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text: "Notification settings were updated from another session. Loading the latest version...",
        });
        await loadSettings();
        return;
      }

      setStatusMessage({
        type: "error",
        text: getSettingsErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all Notification settings to their default values?"
    );
    if (!confirmed) return;

    try {
      setResetting(true);
      setStatusMessage(null);

      const response = await resetSettingsSection<NotificationSettings>(
        "notifications",
        version
      );

      setFormData(mergeNotificationSettings(response.data.settings));
      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");
      setStatusMessage({
        type: "success",
        text: response.message || "Notification settings reset successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text: "Notification settings were updated from another session. Loading the latest version...",
        });
        await loadSettings();
        return;
      }

      setStatusMessage({
        type: "error",
        text: getSettingsErrorMessage(error),
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <NotificationPageSkeleton />;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Communication preferences
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Notification Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure which business events generate email, SMS, push and in-app notifications.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <HeaderBadge label="Version" value={String(version ?? 0)} />
            <HeaderBadge label="Enabled" value={`${enabledChannelCount}/40`} />
            {updatedAt ? (
              <HeaderBadge label="Updated" value={formatUpdatedAt(updatedAt)} />
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          title="Sender Configuration"
          description="Configure the sender details used for outgoing notifications."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="Sender Name" htmlFor="senderName" required>
              <input
                id="senderName"
                name="senderName"
                type="text"
                value={formData.senderName}
                onChange={handleTextChange}
                maxLength={100}
                placeholder="TownMela"
                className={inputClassName}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This name may appear as the sender of outgoing notifications.
              </p>
            </FormField>

            <FormField label="Reply-To Email" htmlFor="replyToEmail" hint="Optional">
              <input
                id="replyToEmail"
                name="replyToEmail"
                type="email"
                value={formData.replyToEmail}
                onChange={handleTextChange}
                placeholder="support@example.com"
                className={inputClassName}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Customer replies to notification emails will be sent to this address.
              </p>
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Global Channel Controls"
          description="Enable or disable a notification channel for every event."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CHANNELS.map((channel) => {
              const enabledCount = NOTIFICATION_EVENTS.filter(
                (event) => formData[event.key][channel.key]
              ).length;
              const allEnabled = enabledCount === NOTIFICATION_EVENTS.length;

              return (
                <ChannelControlCard
                  key={channel.key}
                  title={channel.label}
                  description={channel.description}
                  enabledCount={enabledCount}
                  totalCount={NOTIFICATION_EVENTS.length}
                  checked={allEnabled}
                  onChange={(checked) =>
                    handleChannelColumnToggle(channel.key, checked)
                  }
                />
              );
            })}
          </div>
        </SectionCard>

        {GROUPS.map((group) => {
          const groupEvents = NOTIFICATION_EVENTS.filter(
            (event) => event.group === group.key
          );
          const groupFullyEnabled = groupEvents.every((event) =>
            CHANNELS.every((channel) => formData[event.key][channel.key])
          );

          return (
            <SectionCard
              key={group.key}
              title={group.title}
              description={group.description}
              action={
                <ToggleButton
                  checked={groupFullyEnabled}
                  onChange={(checked) => handleGroupToggle(group.key, checked)}
                  label={groupFullyEnabled ? "Disable group" : "Enable group"}
                />
              }
            >
              <div className="space-y-4">
                {groupEvents.map((notificationEvent) => (
                  <NotificationEventCard
                    key={notificationEvent.key}
                    event={notificationEvent}
                    value={formData[notificationEvent.key]}
                    onChannelChange={(channel, checked) =>
                      handleChannelChange(notificationEvent.key, channel, checked)
                    }
                    onEventToggle={(checked) =>
                      handleEventToggle(notificationEvent.key, checked)
                    }
                  />
                ))}
              </div>
            </SectionCard>
          );
        })}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Notification preferences apply only to the active tenant.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || resetting}
                className={secondaryButtonClassName}
              >
                {resetting ? "Resetting..." : "Reset to defaults"}
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

function NotificationEventCard({
  event,
  value,
  onChannelChange,
  onEventToggle,
}: {
  event: NotificationEventDefinition;
  value: NotificationChannel;
  onChannelChange: (channel: NotificationChannelKey, checked: boolean) => void;
  onEventToggle: (checked: boolean) => void;
}) {
  const enabledCount = CHANNELS.filter((channel) => value[channel.key]).length;
  const allEnabled = enabledCount === CHANNELS.length;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              {enabledCount}/4 enabled
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {event.description}
          </p>
        </div>

        <ToggleButton
          checked={allEnabled}
          onChange={onEventToggle}
          label={allEnabled ? "Disable all" : "Enable all"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CHANNELS.map((channel) => (
          <ChannelToggle
            key={channel.key}
            channel={channel}
            checked={value[channel.key]}
            onChange={(checked) => onChannelChange(channel.key, checked)}
          />
        ))}
      </div>
    </article>
  );
}

function ChannelToggle({
  channel,
  checked,
  onChange,
}: {
  channel: (typeof CHANNELS)[number];
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition",
        checked
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{channel.label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {checked ? "Enabled" : "Disabled"}
        </p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function ChannelControlCard({
  title,
  description,
  enabledCount,
  totalCount,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  enabledCount: number;
  totalCount: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <Switch checked={checked} onChange={onChange} />
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs font-semibold text-slate-600">
          {enabledCount} of {totalCount} events enabled
        </p>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20 peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />
      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </span>
  );
}

function ToggleButton({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-5 py-6 sm:px-7">{children}</div>
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
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function HeaderBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
      {label}: <strong className="text-slate-700">{value}</strong>
    </span>
  );
}

function NotificationPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="h-5 w-56 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, itemIndex) => (
              <div key={itemIndex} className="h-24 rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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