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
  getSettingsErrorMessage,
  getSettingsSection,
  isSettingsVersionConflict,
  resetSettingsSection,
  updateSettingsSection,
} from "../_lib/settingsApi";

/* =========================================================
   TYPES
========================================================= */

type StockPolicy =
  | "deny"
  | "allow"
  | "warn";

type InventorySettings = {
  trackInventory: boolean;
  stockPolicy: StockPolicy;

  lowStockThreshold: number;
  outOfStockThreshold: number;

  showStockQuantityToCustomers: boolean;
  allowBackorders: boolean;

  reserveStockOnOrder: boolean;
  releaseStockOnCancellation: boolean;

  autoPostGoodsReceived: boolean;
  requireGoodsReceivedInspection: boolean;
  requireInventoryPostingApproval: boolean;

  defaultWarehouseId: string | null;

  stockAdjustmentRequiresReason: boolean;
};

type BooleanField =
  | "trackInventory"
  | "showStockQuantityToCustomers"
  | "allowBackorders"
  | "reserveStockOnOrder"
  | "releaseStockOnCancellation"
  | "autoPostGoodsReceived"
  | "requireGoodsReceivedInspection"
  | "requireInventoryPostingApproval"
  | "stockAdjustmentRequiresReason";

type NumberField =
  | "lowStockThreshold"
  | "outOfStockThreshold";

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  trackInventory: true,
  stockPolicy: "deny",

  lowStockThreshold: 5,
  outOfStockThreshold: 0,

  showStockQuantityToCustomers: false,
  allowBackorders: false,

  reserveStockOnOrder: true,
  releaseStockOnCancellation: true,

  autoPostGoodsReceived: false,
  requireGoodsReceivedInspection: true,
  requireInventoryPostingApproval: true,

  defaultWarehouseId: null,

  stockAdjustmentRequiresReason: true,
};

/* =========================================================
   OPTIONS
========================================================= */

const STOCK_POLICY_OPTIONS: Array<{
  value: StockPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "deny",
    label: "Deny purchase",
    description:
      "Customers cannot purchase products when available stock is insufficient.",
  },
  {
    value: "warn",
    label: "Allow with warning",
    description:
      "The system allows the action but shows an inventory warning.",
  },
  {
    value: "allow",
    label: "Allow purchase",
    description:
      "Customers can purchase products even when available stock is insufficient.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const mergeInventorySettings = (
  settings?: Partial<InventorySettings> | null
): InventorySettings => ({
  ...DEFAULT_INVENTORY_SETTINGS,
  ...(settings || {}),

  defaultWarehouseId:
    settings?.defaultWarehouseId || null,
});

const toSafeNumber = (
  value: unknown,
  fallback = 0
): number => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
};

const normalizeNonNegativeInteger = (
  value: unknown,
  fallback = 0
): number =>
  Math.max(
    0,
    Math.trunc(
      toSafeNumber(value, fallback)
    )
  );

const isValidMongoObjectId = (
  value: string
): boolean =>
  /^[a-f\d]{24}$/i.test(value);

const formatUpdatedAt = (
  value: string
): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-US");
};

/* =========================================================
   PAGE
========================================================= */

export default function InventorySettingsPage() {
  const [formData, setFormData] =
    useState<InventorySettings>(
      DEFAULT_INVENTORY_SETTINGS
    );

  const [version, setVersion] =
    useState<number | null>(null);

  const [updatedAt, setUpdatedAt] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState<StatusMessage>(null);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      try {
        setLoading(true);
        setStatusMessage(null);

        const response =
          await getSettingsSection<InventorySettings>(
            "inventory"
          );

        setFormData(
          mergeInventorySettings(
            response.data.settings
          )
        );

        setVersion(
          response.data.version
        );

        setUpdatedAt(
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
     CHANGE HANDLERS
  ======================================================= */

  const handleBooleanChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as BooleanField;

    setFormData((current) => ({
      ...current,
      [field]: event.target.checked,
    }));

    setStatusMessage(null);
  };

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as NumberField;

    const value =
      event.target.value === ""
        ? 0
        : toSafeNumber(
            event.target.value,
            0
          );

    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setStatusMessage(null);
  };

  const handleStockPolicyChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setFormData((current) => ({
      ...current,
      stockPolicy:
        event.target.value as StockPolicy,
    }));

    setStatusMessage(null);
  };

  const handleWarehouseChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value.trim();

    setFormData((current) => ({
      ...current,
      defaultWarehouseId:
        value || null,
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     NORMALIZATION
  ======================================================= */

  const createNormalizedData =
    (): InventorySettings => ({
      trackInventory:
        formData.trackInventory,

      stockPolicy:
        formData.stockPolicy,

      lowStockThreshold:
        normalizeNonNegativeInteger(
          formData.lowStockThreshold,
          5
        ),

      outOfStockThreshold:
        normalizeNonNegativeInteger(
          formData.outOfStockThreshold,
          0
        ),

      showStockQuantityToCustomers:
        formData.showStockQuantityToCustomers,

      allowBackorders:
        formData.allowBackorders,

      reserveStockOnOrder:
        formData.reserveStockOnOrder,

      releaseStockOnCancellation:
        formData.releaseStockOnCancellation,

      autoPostGoodsReceived:
        formData.autoPostGoodsReceived,

      requireGoodsReceivedInspection:
        formData.requireGoodsReceivedInspection,

      requireInventoryPostingApproval:
        formData.requireInventoryPostingApproval,

      defaultWarehouseId:
        formData.defaultWarehouseId
          ?.trim() || null,

      stockAdjustmentRequiresReason:
        formData.stockAdjustmentRequiresReason,
    });

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = (
    settings: InventorySettings
  ): string => {
    if (
      settings.defaultWarehouseId &&
      !isValidMongoObjectId(
        settings.defaultWarehouseId
      )
    ) {
      return "Default warehouse ID must be a valid 24-character MongoDB ObjectId.";
    }

    if (
      settings.outOfStockThreshold >
      settings.lowStockThreshold
    ) {
      return "Out-of-stock threshold cannot be greater than the low-stock threshold.";
    }

    if (
      !settings.trackInventory &&
      settings.reserveStockOnOrder
    ) {
      return "Stock reservation cannot be enabled when inventory tracking is disabled.";
    }

    if (
      settings.autoPostGoodsReceived &&
      settings.requireInventoryPostingApproval
    ) {
      return "Automatic goods-received posting cannot be enabled while inventory posting approval is required.";
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

    const normalizedData =
      createNormalizedData();

    const validationError =
      validateForm(normalizedData);

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
        await updateSettingsSection<
          InventorySettings &
            Record<string, unknown>
        >(
          "inventory",
          normalizedData,
          version
        );

      setFormData(
        mergeInventorySettings(
          response.data.settings
        )
      );

      setVersion(
        response.data.version
      );

      setUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Inventory settings saved successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(error)
      ) {
        setStatusMessage({
          type: "error",
          text:
            "Inventory settings were updated from another session. Loading the latest version...",
        });

        await loadSettings();
        return;
      }

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
        "Are you sure you want to reset all Inventory settings to their default values?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<InventorySettings>(
          "inventory",
          version
        );

      setFormData(
        mergeInventorySettings(
          response.data.settings
        )
      );

      setVersion(
        response.data.version
      );

      setUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Inventory settings reset successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(error)
      ) {
        setStatusMessage({
          type: "error",
          text:
            "Inventory settings were updated from another session. Loading the latest version...",
        });

        await loadSettings();
        return;
      }

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
     LOADING
  ======================================================= */

  if (loading) {
    return <InventoryPageSkeleton />;
  }

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* Header */}

      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Stock configuration
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Inventory Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure stock tracking,
              inventory policies, stock
              reservation and goods-received
              processing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Version:{" "}
              <strong className="text-slate-700">
                {version ?? 0}
              </strong>
            </span>

            {updatedAt ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                Updated:{" "}
                <strong className="text-slate-700">
                  {formatUpdatedAt(
                    updatedAt
                  )}
                </strong>
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Alert */}

      {statusMessage ? (
        <div
          role="alert"
          className={
            statusMessage.type ===
            "success"
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
        {/* Inventory Tracking */}

        <SectionCard
          title="Inventory Tracking"
          description="Configure whether TownMela tracks product stock and how insufficient stock is handled."
        >
          <div className="space-y-5">
            <ToggleField
              name="trackInventory"
              title="Track inventory"
              description="Track available, reserved and sold quantities for products."
              checked={
                formData.trackInventory
              }
              onChange={
                handleBooleanChange
              }
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Stock Policy"
                htmlFor="stockPolicy"
              >
                <select
                  id="stockPolicy"
                  name="stockPolicy"
                  value={
                    formData.stockPolicy
                  }
                  onChange={
                    handleStockPolicyChange
                  }
                  disabled={
                    !formData.trackInventory
                  }
                  className={
                    inputClassName
                  }
                >
                  {STOCK_POLICY_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {
                    STOCK_POLICY_OPTIONS.find(
                      (option) =>
                        option.value ===
                        formData.stockPolicy
                    )?.description
                  }
                </p>
              </FormField>

              <FormField
                label="Default Warehouse ID"
                htmlFor="defaultWarehouseId"
                hint="Optional"
              >
                <input
                  id="defaultWarehouseId"
                  name="defaultWarehouseId"
                  type="text"
                  value={
                    formData.defaultWarehouseId ||
                    ""
                  }
                  onChange={
                    handleWarehouseChange
                  }
                  placeholder="MongoDB warehouse ObjectId"
                  maxLength={24}
                  className={
                    inputClassName
                  }
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Leave empty when no default
                  warehouse is configured.
                </p>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Stock Thresholds */}

        <SectionCard
          title="Stock Thresholds"
          description="Define when products are considered low-stock or out-of-stock."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Low-Stock Threshold"
              htmlFor="lowStockThreshold"
              hint="Minimum 0"
            >
              <input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                value={
                  formData.lowStockThreshold
                }
                onChange={
                  handleNumberChange
                }
                min={0}
                step={1}
                disabled={
                  !formData.trackInventory
                }
                className={
                  inputClassName
                }
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Products at or below this
                quantity are marked as low
                stock.
              </p>
            </FormField>

            <FormField
              label="Out-of-Stock Threshold"
              htmlFor="outOfStockThreshold"
              hint="Minimum 0"
            >
              <input
                id="outOfStockThreshold"
                name="outOfStockThreshold"
                type="number"
                value={
                  formData.outOfStockThreshold
                }
                onChange={
                  handleNumberChange
                }
                min={0}
                step={1}
                disabled={
                  !formData.trackInventory
                }
                className={
                  inputClassName
                }
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Products at or below this
                quantity are considered out
                of stock.
              </p>
            </FormField>
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Current threshold preview
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Out of stock at{" "}
              <strong>
                {formData.outOfStockThreshold}
              </strong>
              , low stock at{" "}
              <strong>
                {formData.lowStockThreshold}
              </strong>{" "}
              or below.
            </p>
          </div>
        </SectionCard>

        {/* Customer Stock Behaviour */}

        <SectionCard
          title="Storefront Stock Behaviour"
          description="Control how stock information and backorders work for customers."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ToggleField
              name="showStockQuantityToCustomers"
              title="Show stock quantity"
              description="Display the available product quantity to customers."
              checked={
                formData.showStockQuantityToCustomers
              }
              onChange={
                handleBooleanChange
              }
              disabled={
                !formData.trackInventory
              }
            />

            <ToggleField
              name="allowBackorders"
              title="Allow backorders"
              description="Allow customers to order products when current stock is unavailable."
              checked={
                formData.allowBackorders
              }
              onChange={
                handleBooleanChange
              }
              disabled={
                !formData.trackInventory
              }
            />
          </div>
        </SectionCard>

        {/* Stock Reservation */}

        <SectionCard
          title="Stock Reservation"
          description="Configure when stock is reserved and released during the order lifecycle."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ToggleField
              name="reserveStockOnOrder"
              title="Reserve stock on order"
              description="Reserve product quantities immediately after an order is placed."
              checked={
                formData.reserveStockOnOrder
              }
              onChange={
                handleBooleanChange
              }
              disabled={
                !formData.trackInventory
              }
            />

            <ToggleField
              name="releaseStockOnCancellation"
              title="Release stock on cancellation"
              description="Return reserved quantities when an order is cancelled."
              checked={
                formData.releaseStockOnCancellation
              }
              onChange={
                handleBooleanChange
              }
              disabled={
                !formData.trackInventory
              }
            />
          </div>
        </SectionCard>

        {/* Goods Received */}

        <SectionCard
          title="Goods Received Processing"
          description="Configure inspection, approval and inventory posting for received goods."
        >
          <div className="space-y-4">
            <ToggleField
              name="requireGoodsReceivedInspection"
              title="Require goods-received inspection"
              description="Received products must complete inspection before inventory posting."
              checked={
                formData.requireGoodsReceivedInspection
              }
              onChange={
                handleBooleanChange
              }
            />

            <ToggleField
              name="requireInventoryPostingApproval"
              title="Require inventory posting approval"
              description="An authorized user must approve goods-received inventory posting."
              checked={
                formData.requireInventoryPostingApproval
              }
              onChange={
                handleBooleanChange
              }
            />

            <ToggleField
              name="autoPostGoodsReceived"
              title="Automatically post goods received"
              description="Automatically update inventory after goods are received."
              checked={
                formData.autoPostGoodsReceived
              }
              onChange={
                handleBooleanChange
              }
              disabled={
                formData.requireInventoryPostingApproval
              }
            />

            {formData.requireInventoryPostingApproval ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Automatic posting is unavailable
                while inventory posting approval
                is required.
              </div>
            ) : null}
          </div>
        </SectionCard>

        {/* Stock Adjustment */}

        <SectionCard
          title="Stock Adjustment Control"
          description="Configure safeguards for manual stock adjustments."
        >
          <ToggleField
            name="stockAdjustmentRequiresReason"
            title="Require an adjustment reason"
            description="Users must provide a reason whenever stock quantity is manually adjusted."
            checked={
              formData.stockAdjustmentRequiresReason
            }
            onChange={
              handleBooleanChange
            }
          />
        </SectionCard>

        {/* Actions */}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Inventory settings apply only
              to the active tenant.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleReset
                }
                disabled={
                  saving ||
                  resetting
                }
                className={
                  secondaryButtonClassName
                }
              >
                {resetting
                  ? "Resetting..."
                  : "Reset to defaults"}
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  resetting
                }
                className={
                  primaryButtonClassName
                }
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
   SECTION CARD
========================================================= */

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

/* =========================================================
   FORM FIELD
========================================================= */

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

/* =========================================================
   TOGGLE FIELD
========================================================= */

function ToggleField({
  name,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  name: BooleanField;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        "flex items-start justify-between gap-4 rounded-xl border p-4 transition",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
          : "cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/70",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-sm leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <span className="relative mt-1 inline-flex shrink-0">
        <input
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />

        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20 peer-disabled:cursor-not-allowed" />

        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function InventoryPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-36 rounded bg-slate-100" />

        <div className="mt-3 h-8 w-64 max-w-full rounded bg-slate-200" />

        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="h-5 w-48 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" />

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="h-24 rounded-xl bg-slate-100" />

            <div className="h-24 rounded-xl bg-slate-100" />
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