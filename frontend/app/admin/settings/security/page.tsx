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

type SecuritySettings = {
  requireTwoFactorForOwner: boolean;
  requireTwoFactorForAdmins: boolean;

  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  loginLockDurationMinutes: number;

  passwordMinimumLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;

  allowConcurrentSessions: boolean;
  notifyOnNewLogin: boolean;
  auditSensitiveActions: boolean;
};

type NumericFieldName =
  | "sessionTimeoutMinutes"
  | "maxLoginAttempts"
  | "loginLockDurationMinutes"
  | "passwordMinimumLength";

type BooleanFieldName = {
  [Key in keyof SecuritySettings]: SecuritySettings[Key] extends boolean
    ? Key
    : never;
}[keyof SecuritySettings];

type StatusMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type NumericFieldDefinition = {
  name: NumericFieldName;
  label: string;
  description: string;
  min: number;
  max: number;
  suffix?: string;
};

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  requireTwoFactorForOwner: false,
  requireTwoFactorForAdmins: false,

  sessionTimeoutMinutes: 1440,
  maxLoginAttempts: 5,
  loginLockDurationMinutes: 30,

  passwordMinimumLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,

  allowConcurrentSessions: true,
  notifyOnNewLogin: true,
  auditSensitiveActions: true,
};

/* =========================================================
   FIELD CONFIGURATION
========================================================= */

const LOGIN_PROTECTION_FIELDS: NumericFieldDefinition[] = [
  {
    name: "maxLoginAttempts",
    label: "Maximum login attempts",
    description:
      "Number of failed login attempts allowed before the account is temporarily locked.",
    min: 1,
    max: 20,
  },
  {
    name: "loginLockDurationMinutes",
    label: "Login lock duration",
    description:
      "How long a locked account remains blocked before another login attempt is allowed.",
    min: 1,
    max: 1440,
    suffix: "minutes",
  },
];

const SESSION_FIELDS: NumericFieldDefinition[] = [
  {
    name: "sessionTimeoutMinutes",
    label: "Session timeout",
    description:
      "Users will need to sign in again after this session duration expires.",
    min: 5,
    max: 10080,
    suffix: "minutes",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readBoolean = (
  source: Record<string, unknown>,
  key: BooleanFieldName,
  fallback: boolean
): boolean => {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
};

const readNumber = (
  source: Record<string, unknown>,
  key: NumericFieldName,
  fallback: number
): number => {
  const value = source[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const mergeSecuritySettings = (
  value?: Partial<SecuritySettings> | null
): SecuritySettings => {
  const source = isRecord(value) ? value : {};

  return {
    requireTwoFactorForOwner: readBoolean(
      source,
      "requireTwoFactorForOwner",
      DEFAULT_SECURITY_SETTINGS.requireTwoFactorForOwner
    ),

    requireTwoFactorForAdmins: readBoolean(
      source,
      "requireTwoFactorForAdmins",
      DEFAULT_SECURITY_SETTINGS.requireTwoFactorForAdmins
    ),

    sessionTimeoutMinutes: readNumber(
      source,
      "sessionTimeoutMinutes",
      DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes
    ),

    maxLoginAttempts: readNumber(
      source,
      "maxLoginAttempts",
      DEFAULT_SECURITY_SETTINGS.maxLoginAttempts
    ),

    loginLockDurationMinutes: readNumber(
      source,
      "loginLockDurationMinutes",
      DEFAULT_SECURITY_SETTINGS.loginLockDurationMinutes
    ),

    passwordMinimumLength: readNumber(
      source,
      "passwordMinimumLength",
      DEFAULT_SECURITY_SETTINGS.passwordMinimumLength
    ),

    passwordRequireUppercase: readBoolean(
      source,
      "passwordRequireUppercase",
      DEFAULT_SECURITY_SETTINGS.passwordRequireUppercase
    ),

    passwordRequireLowercase: readBoolean(
      source,
      "passwordRequireLowercase",
      DEFAULT_SECURITY_SETTINGS.passwordRequireLowercase
    ),

    passwordRequireNumber: readBoolean(
      source,
      "passwordRequireNumber",
      DEFAULT_SECURITY_SETTINGS.passwordRequireNumber
    ),

    passwordRequireSymbol: readBoolean(
      source,
      "passwordRequireSymbol",
      DEFAULT_SECURITY_SETTINGS.passwordRequireSymbol
    ),

    allowConcurrentSessions: readBoolean(
      source,
      "allowConcurrentSessions",
      DEFAULT_SECURITY_SETTINGS.allowConcurrentSessions
    ),

    notifyOnNewLogin: readBoolean(
      source,
      "notifyOnNewLogin",
      DEFAULT_SECURITY_SETTINGS.notifyOnNewLogin
    ),

    auditSensitiveActions: readBoolean(
      source,
      "auditSensitiveActions",
      DEFAULT_SECURITY_SETTINGS.auditSensitiveActions
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

const clampInteger = (
  value: number,
  minimum: number,
  maximum: number
): number => Math.min(maximum, Math.max(minimum, Math.round(value)));

/* =========================================================
   PAGE
========================================================= */

export default function SecuritySettingsPage() {
  const [formData, setFormData] = useState<SecuritySettings>(
    DEFAULT_SECURITY_SETTINGS
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
        await getSettingsSection<SecuritySettings>("security");

      setFormData(
        mergeSecuritySettings(response.data.settings)
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
     DERIVED INFORMATION
  ======================================================= */

  const passwordStrengthScore = useMemo(() => {
    let score = 0;

    if (formData.passwordMinimumLength >= 8) score += 1;
    if (formData.passwordMinimumLength >= 12) score += 1;
    if (formData.passwordRequireUppercase) score += 1;
    if (formData.passwordRequireLowercase) score += 1;
    if (formData.passwordRequireNumber) score += 1;
    if (formData.passwordRequireSymbol) score += 1;

    return score;
  }, [formData]);

  const passwordStrengthLabel = useMemo(() => {
    if (passwordStrengthScore >= 6) return "Strong";
    if (passwordStrengthScore >= 4) return "Good";
    return "Basic";
  }, [passwordStrengthScore]);

  const activeSecurityControls = useMemo(() => {
    const booleanFields: BooleanFieldName[] = [
      "requireTwoFactorForOwner",
      "requireTwoFactorForAdmins",
      "passwordRequireUppercase",
      "passwordRequireLowercase",
      "passwordRequireNumber",
      "passwordRequireSymbol",
      "allowConcurrentSessions",
      "notifyOnNewLogin",
      "auditSensitiveActions",
    ];

    return booleanFields.filter((field) => formData[field]).length;
  }, [formData]);

  /* =======================================================
     CHANGE HANDLERS
  ======================================================= */

  const handleBooleanChange = (
    field: BooleanFieldName,
    checked: boolean
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: checked,
    }));

    setStatusMessage(null);
  };

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field = event.target.name as NumericFieldName;
    const value = Number(event.target.value);

    setFormData((current) => ({
      ...current,
      [field]: Number.isFinite(value) ? value : 0,
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     NORMALIZE & VALIDATE
  ======================================================= */

  const createNormalizedData = (): SecuritySettings => ({
    ...formData,

    sessionTimeoutMinutes: clampInteger(
      formData.sessionTimeoutMinutes,
      5,
      10080
    ),

    maxLoginAttempts: clampInteger(
      formData.maxLoginAttempts,
      1,
      20
    ),

    loginLockDurationMinutes: clampInteger(
      formData.loginLockDurationMinutes,
      1,
      1440
    ),

    passwordMinimumLength: clampInteger(
      formData.passwordMinimumLength,
      8,
      128
    ),
  });

  const validateSettings = (
    settings: SecuritySettings
  ): string => {
    if (
      settings.sessionTimeoutMinutes < 5 ||
      settings.sessionTimeoutMinutes > 10080
    ) {
      return "Session timeout must be between 5 and 10,080 minutes.";
    }

    if (
      settings.maxLoginAttempts < 1 ||
      settings.maxLoginAttempts > 20
    ) {
      return "Maximum login attempts must be between 1 and 20.";
    }

    if (
      settings.loginLockDurationMinutes < 1 ||
      settings.loginLockDurationMinutes > 1440
    ) {
      return "Login lock duration must be between 1 and 1,440 minutes.";
    }

    if (
      settings.passwordMinimumLength < 8 ||
      settings.passwordMinimumLength > 128
    ) {
      return "Minimum password length must be between 8 and 128 characters.";
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
        await updateSettingsSection<SecuritySettings>(
          "security",
          normalizedData,
          version
        );

      setFormData(
        mergeSecuritySettings(response.data.settings)
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Security settings saved successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Security settings were updated from another session. Loading the latest version...",
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
      "Are you sure you want to reset all Security settings to their default values?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<SecuritySettings>(
          "security",
          version
        );

      setFormData(
        mergeSecuritySettings(response.data.settings)
      );

      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Security settings reset successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "Security settings were updated from another session. Loading the latest version...",
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
    return <SecurityPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Access protection
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Security Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Control authentication, password requirements,
              account lockouts, sessions and security auditing
              for the active tenant.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <HeaderBadge
              label="Version"
              value={String(version ?? 0)}
            />

            <HeaderBadge
              label="Controls active"
              value={`${activeSecurityControls}/9`}
            />

            <HeaderBadge
              label="Password policy"
              value={passwordStrengthLabel}
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
          title="Two-Factor Authentication"
          description="Require an additional verification step for privileged users."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingToggleCard
              title="Require 2FA for owner"
              description="The tenant owner must complete two-factor authentication during sign-in."
              checked={formData.requireTwoFactorForOwner}
              onChange={(checked) =>
                handleBooleanChange(
                  "requireTwoFactorForOwner",
                  checked
                )
              }
              badge="Owner"
            />

            <SettingToggleCard
              title="Require 2FA for administrators"
              description="All tenant administrators must use two-factor authentication."
              checked={
                formData.requireTwoFactorForAdmins
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "requireTwoFactorForAdmins",
                  checked
                )
              }
              badge="Admins"
            />
          </div>

          <InfoNotice>
            Enabling this option requires the corresponding
            authentication flow to be available in your login
            system.
          </InfoNotice>
        </SectionCard>

        <SectionCard
          title="Password Policy"
          description="Define minimum password requirements for tenant users."
          action={
            <StrengthBadge
              label={passwordStrengthLabel}
              score={passwordStrengthScore}
            />
          }
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <FormField
              label="Minimum password length"
              htmlFor="passwordMinimumLength"
              hint="8–128 characters"
            >
              <NumberInput
                id="passwordMinimumLength"
                name="passwordMinimumLength"
                value={formData.passwordMinimumLength}
                min={8}
                max={128}
                suffix="characters"
                onChange={handleNumberChange}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompactToggleCard
                title="Require uppercase"
                description="At least one A–Z character."
                checked={
                  formData.passwordRequireUppercase
                }
                onChange={(checked) =>
                  handleBooleanChange(
                    "passwordRequireUppercase",
                    checked
                  )
                }
              />

              <CompactToggleCard
                title="Require lowercase"
                description="At least one a–z character."
                checked={
                  formData.passwordRequireLowercase
                }
                onChange={(checked) =>
                  handleBooleanChange(
                    "passwordRequireLowercase",
                    checked
                  )
                }
              />

              <CompactToggleCard
                title="Require number"
                description="At least one numeric character."
                checked={
                  formData.passwordRequireNumber
                }
                onChange={(checked) =>
                  handleBooleanChange(
                    "passwordRequireNumber",
                    checked
                  )
                }
              />

              <CompactToggleCard
                title="Require symbol"
                description="At least one special character."
                checked={
                  formData.passwordRequireSymbol
                }
                onChange={(checked) =>
                  handleBooleanChange(
                    "passwordRequireSymbol",
                    checked
                  )
                }
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Login Protection"
          description="Limit repeated failed authentication attempts and temporarily lock accounts."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {LOGIN_PROTECTION_FIELDS.map((field) => (
              <FormField
                key={field.name}
                label={field.label}
                htmlFor={field.name}
                hint={`${field.min}–${field.max}`}
              >
                <NumberInput
                  id={field.name}
                  name={field.name}
                  value={formData[field.name]}
                  min={field.min}
                  max={field.max}
                  suffix={field.suffix}
                  onChange={handleNumberChange}
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {field.description}
                </p>
              </FormField>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Session Management"
          description="Configure how long sessions remain valid and whether users may sign in from multiple devices."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {SESSION_FIELDS.map((field) => (
              <FormField
                key={field.name}
                label={field.label}
                htmlFor={field.name}
                hint={`${field.min}–${field.max}`}
              >
                <NumberInput
                  id={field.name}
                  name={field.name}
                  value={formData[field.name]}
                  min={field.min}
                  max={field.max}
                  suffix={field.suffix}
                  onChange={handleNumberChange}
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {field.description}
                </p>

                <SessionDurationPreview
                  minutes={
                    formData.sessionTimeoutMinutes
                  }
                />
              </FormField>
            ))}

            <SettingToggleCard
              title="Allow concurrent sessions"
              description="Permit the same user account to remain signed in on multiple browsers or devices."
              checked={
                formData.allowConcurrentSessions
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "allowConcurrentSessions",
                  checked
                )
              }
              badge={
                formData.allowConcurrentSessions
                  ? "Allowed"
                  : "Blocked"
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Security Monitoring"
          description="Choose which important security activities are recorded or communicated."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingToggleCard
              title="Notify on new login"
              description="Send a notification when a user signs in from a new browser, device or session."
              checked={formData.notifyOnNewLogin}
              onChange={(checked) =>
                handleBooleanChange(
                  "notifyOnNewLogin",
                  checked
                )
              }
              badge="Notification"
            />

            <SettingToggleCard
              title="Audit sensitive actions"
              description="Record important administrative and security-related actions for audit review."
              checked={
                formData.auditSensitiveActions
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "auditSensitiveActions",
                  checked
                )
              }
              badge="Audit log"
            />
          </div>
        </SectionCard>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Security settings apply only to the active tenant.
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

function CompactToggleCard({
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
    <label
      className={[
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition",
        checked
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <Switch
        checked={checked}
        onChange={onChange}
      />
    </label>
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
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="peer sr-only"
      />

      <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20 peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />

      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </span>
  );
}

function NumberInput({
  id,
  name,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  id: string;
  name: NumericFieldName;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={onChange}
        className={[
          inputClassName,
          suffix ? "pr-24" : "",
        ].join(" ")}
      />

      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function SessionDurationPreview({
  minutes,
}: {
  minutes: number;
}) {
  const label = useMemo(() => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return "Invalid duration";
    }

    if (minutes < 60) {
      return `${Math.round(minutes)} minute${
        Math.round(minutes) === 1 ? "" : "s"
      }`;
    }

    if (minutes < 1440) {
      const hours = minutes / 60;
      const rounded =
        Number.isInteger(hours) ? hours : Number(hours.toFixed(1));

      return `${rounded} hour${rounded === 1 ? "" : "s"}`;
    }

    const days = minutes / 1440;
    const rounded =
      Number.isInteger(days) ? days : Number(days.toFixed(1));

    return `${rounded} day${rounded === 1 ? "" : "s"}`;
  }, [minutes]);

  return (
    <p className="mt-2 text-xs font-semibold text-blue-600">
      Current duration: {label}
    </p>
  );
}

function StrengthBadge({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Policy strength
      </p>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm font-bold text-slate-800">
          {label}
        </span>

        <span className="text-xs text-slate-500">
          {score}/6
        </span>
      </div>
    </div>
  );
}

function InfoNotice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
      {children}
    </div>
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
          <h2 className="text-base font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {action}
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

function SecurityPageSkeleton() {
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

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map(
              (_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="h-28 rounded-xl bg-slate-100"
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