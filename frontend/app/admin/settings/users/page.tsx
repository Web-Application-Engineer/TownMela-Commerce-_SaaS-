"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
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

type UserSettings = {
  allowTenantAdminToInviteUsers: boolean;
  allowTenantAdminToManageRoles: boolean;
  requireOwnerApprovalForNewAdmins: boolean;
  defaultNewUserRole: string;
  invitationExpiryHours: number;
};

type BooleanFieldName =
  | "allowTenantAdminToInviteUsers"
  | "allowTenantAdminToManageRoles"
  | "requireOwnerApprovalForNewAdmins";

type StatusMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const DEFAULT_USER_SETTINGS: UserSettings = {
  allowTenantAdminToInviteUsers: true,
  allowTenantAdminToManageRoles: true,
  requireOwnerApprovalForNewAdmins: false,
  defaultNewUserRole: "tenant_admin",
  invitationExpiryHours: 72,
};

const ROLE_OPTIONS = [
  {
    value: "tenant_admin",
    label: "Tenant Admin",
    description: "Full tenant administration access.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Operational management access.",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Standard day-to-day access.",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access.",
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

const readString = (
  source: Record<string, unknown>,
  key: keyof UserSettings,
  fallback: string
): string => {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
};

const readNumber = (
  source: Record<string, unknown>,
  key: keyof UserSettings,
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

const mergeUserSettings = (
  value?: Partial<UserSettings> | null
): UserSettings => {
  const source = isRecord(value) ? value : {};

  return {
    allowTenantAdminToInviteUsers: readBoolean(
      source,
      "allowTenantAdminToInviteUsers",
      DEFAULT_USER_SETTINGS.allowTenantAdminToInviteUsers
    ),

    allowTenantAdminToManageRoles: readBoolean(
      source,
      "allowTenantAdminToManageRoles",
      DEFAULT_USER_SETTINGS.allowTenantAdminToManageRoles
    ),

    requireOwnerApprovalForNewAdmins: readBoolean(
      source,
      "requireOwnerApprovalForNewAdmins",
      DEFAULT_USER_SETTINGS.requireOwnerApprovalForNewAdmins
    ),

    defaultNewUserRole: readString(
      source,
      "defaultNewUserRole",
      DEFAULT_USER_SETTINGS.defaultNewUserRole
    ),

    invitationExpiryHours: readNumber(
      source,
      "invitationExpiryHours",
      DEFAULT_USER_SETTINGS.invitationExpiryHours
    ),
  };
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

const formatUpdatedAt = (value: string): string => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-US");
};

const normalizeRole = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const clampInteger = (
  value: number,
  minimum: number,
  maximum: number
): number => Math.min(maximum, Math.max(minimum, Math.round(value)));

const formatExpiryPreview = (hours: number): string => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "Invalid duration";
  }

  if (hours < 24) {
    return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  }

  const days = hours / 24;
  const rounded = Number.isInteger(days)
    ? days
    : Number(days.toFixed(1));

  return `${rounded} day${rounded === 1 ? "" : "s"}`;
};

/* =========================================================
   PAGE
========================================================= */

export default function UserSettingsPage() {
  const [formData, setFormData] = useState<UserSettings>(
    DEFAULT_USER_SETTINGS
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
        await getSettingsSection<UserSettings>("users");

      setFormData(mergeUserSettings(response.data.settings));
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

  const handleRoleChange = (
    event: ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    setFormData((current) => ({
      ...current,
      defaultNewUserRole: event.target.value,
    }));

    setStatusMessage(null);
  };

  const handleInvitationExpiryChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);

    setFormData((current) => ({
      ...current,
      invitationExpiryHours: Number.isFinite(value) ? value : 0,
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     NORMALIZE & VALIDATE
  ======================================================= */

  const createNormalizedData = (): UserSettings => ({
    ...formData,
    defaultNewUserRole: normalizeRole(formData.defaultNewUserRole),
    invitationExpiryHours: clampInteger(
      formData.invitationExpiryHours,
      1,
      720
    ),
  });

  const validateSettings = (
    settings: UserSettings
  ): string => {
    if (!settings.defaultNewUserRole) {
      return "Default new user role is required.";
    }

    if (settings.defaultNewUserRole.length > 100) {
      return "Default new user role cannot exceed 100 characters.";
    }

    if (
      settings.invitationExpiryHours < 1 ||
      settings.invitationExpiryHours > 720
    ) {
      return "Invitation expiry must be between 1 and 720 hours.";
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
    const validationError = validateSettings(normalizedData);

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

      const response = await updateSettingsSection<UserSettings>(
        "users",
        normalizedData,
        version
      );

      setFormData(mergeUserSettings(response.data.settings));
      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "User and role settings saved successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "User settings were updated from another session. Loading the latest version...",
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
      "Are you sure you want to reset all User and Role settings to their default values?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<UserSettings>(
          "users",
          version
        );

      setFormData(mergeUserSettings(response.data.settings));
      setVersion(response.data.version);
      setUpdatedAt(response.data.updatedAt || "");

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "User and role settings reset successfully.",
      });
    } catch (error) {
      if (isSettingsVersionConflict(error)) {
        setStatusMessage({
          type: "error",
          text:
            "User settings were updated from another session. Loading the latest version...",
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
    return <UserSettingsSkeleton />;
  }

  const activeControls = [
    formData.allowTenantAdminToInviteUsers,
    formData.allowTenantAdminToManageRoles,
    formData.requireOwnerApprovalForNewAdmins,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Team administration
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              User & Role Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Control tenant administrator permissions, default
              roles and invitation security for the active tenant.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <HeaderBadge
              label="Version"
              value={String(version ?? 0)}
            />

            <HeaderBadge
              label="Controls active"
              value={`${activeControls}/3`}
            />

            <HeaderBadge
              label="Default role"
              value={formData.defaultNewUserRole || "Not set"}
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
          title="Tenant Administrator Permissions"
          description="Choose which user-management actions tenant administrators may perform."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SettingToggleCard
              title="Allow tenant admins to invite users"
              description="Tenant administrators may send new user invitations for this tenant."
              checked={
                formData.allowTenantAdminToInviteUsers
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "allowTenantAdminToInviteUsers",
                  checked
                )
              }
              badge="Invitations"
            />

            <SettingToggleCard
              title="Allow tenant admins to manage roles"
              description="Tenant administrators may assign or update roles within the tenant."
              checked={
                formData.allowTenantAdminToManageRoles
              }
              onChange={(checked) =>
                handleBooleanChange(
                  "allowTenantAdminToManageRoles",
                  checked
                )
              }
              badge="Role management"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Administrative Approval"
          description="Add an owner-level approval step before new administrators become active."
        >
          <SettingToggleCard
            title="Require owner approval for new admins"
            description="New administrator invitations or promotions require approval from the tenant owner."
            checked={
              formData.requireOwnerApprovalForNewAdmins
            }
            onChange={(checked) =>
              handleBooleanChange(
                "requireOwnerApprovalForNewAdmins",
                checked
              )
            }
            badge="Owner approval"
          />

          <InfoNotice>
            This setting should be enforced by your user invitation
            and role-assignment backend flow.
          </InfoNotice>
        </SectionCard>

        <SectionCard
          title="Default New User Role"
          description="Select the role automatically assigned to newly invited tenant users."
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField
              label="Default role"
              htmlFor="defaultNewUserRole"
              hint="Stored in lowercase"
            >
              <select
                id="defaultNewUserRole"
                name="defaultNewUserRole"
                value={formData.defaultNewUserRole}
                onChange={handleRoleChange}
                className={inputClassName}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </option>
                ))}

                {!ROLE_OPTIONS.some(
                  (role) =>
                    role.value ===
                    formData.defaultNewUserRole
                ) &&
                formData.defaultNewUserRole ? (
                  <option value={formData.defaultNewUserRole}>
                    {formData.defaultNewUserRole}
                  </option>
                ) : null}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                The saved value will be normalized to lowercase
                and spaces will be replaced with underscores.
              </p>
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((role) => {
                const selected =
                  formData.defaultNewUserRole === role.value;

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        defaultNewUserRole: role.value,
                      }))
                    }
                    className={[
                      "rounded-xl border p-4 text-left transition",
                      selected
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">
                        {role.label}
                      </p>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {selected ? "Selected" : "Choose"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {role.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Invitation Expiry"
          description="Set how long a new user invitation remains valid before it must be resent."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <FormField
              label="Invitation expiry"
              htmlFor="invitationExpiryHours"
              hint="1–720 hours"
            >
              <div className="relative">
                <input
                  id="invitationExpiryHours"
                  name="invitationExpiryHours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={720}
                  step={1}
                  value={formData.invitationExpiryHours}
                  onChange={handleInvitationExpiryChange}
                  className={`${inputClassName} pr-20`}
                />

                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                  hours
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Current expiry:{" "}
                <strong className="text-blue-600">
                  {formatExpiryPreview(
                    formData.invitationExpiryHours
                  )}
                </strong>
              </p>
            </FormField>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                Recommended ranges
              </h3>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <RecommendationRow
                  label="High security"
                  value="24 hours"
                />

                <RecommendationRow
                  label="Balanced"
                  value="72 hours"
                />

                <RecommendationRow
                  label="Extended"
                  value="168 hours"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              User and role settings apply only to the active tenant.
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

function RecommendationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span>{label}</span>
      <strong className="text-slate-800">
        {value}
      </strong>
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

/* =========================================================
   LOADING SKELETON
========================================================= */

function UserSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
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