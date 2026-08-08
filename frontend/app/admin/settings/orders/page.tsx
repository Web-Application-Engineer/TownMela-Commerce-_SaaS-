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

/* =========================================================
   TYPES
========================================================= */

type OrderNumberFormat =
  | "sequential"
  | "timestamp"
  | "random";

type OrderSettings = {
  orderPrefix: string;
  orderNumberFormat: OrderNumberFormat;
  orderNumberPadding: number;
  startingOrderNumber: number;

  allowGuestCheckout: boolean;
  requirePhoneNumber: boolean;
  requireEmailAddress: boolean;
  autoConfirmOrders: boolean;

  allowOrderCancellation: boolean;
  cancellationWindowMinutes: number;
  allowOrderNotes: boolean;

  defaultOrderStatus: string;
  defaultPaymentStatus: string;

  minimumOrderAmount: number;
  maximumOrderAmount: number;

  taxIncludedInPrice: boolean;
  defaultTaxRate: number;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

type BooleanField =
  | "allowGuestCheckout"
  | "requirePhoneNumber"
  | "requireEmailAddress"
  | "autoConfirmOrders"
  | "allowOrderCancellation"
  | "allowOrderNotes"
  | "taxIncludedInPrice";

type NumberField =
  | "orderNumberPadding"
  | "startingOrderNumber"
  | "cancellationWindowMinutes"
  | "minimumOrderAmount"
  | "maximumOrderAmount"
  | "defaultTaxRate";

type TextField =
  | "orderPrefix"
  | "defaultOrderStatus"
  | "defaultPaymentStatus";

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  orderPrefix: "ORD",
  orderNumberFormat: "sequential",
  orderNumberPadding: 6,
  startingOrderNumber: 1001,

  allowGuestCheckout: true,
  requirePhoneNumber: true,
  requireEmailAddress: false,
  autoConfirmOrders: false,

  allowOrderCancellation: true,
  cancellationWindowMinutes: 30,
  allowOrderNotes: true,

  defaultOrderStatus: "pending",
  defaultPaymentStatus: "unpaid",

  minimumOrderAmount: 0,
  maximumOrderAmount: 0,

  taxIncludedInPrice: false,
  defaultTaxRate: 0,
};

/* =========================================================
   OPTIONS
========================================================= */

const ORDER_NUMBER_FORMAT_OPTIONS: Array<{
  value: OrderNumberFormat;
  label: string;
  description: string;
}> = [
  {
    value: "sequential",
    label: "Sequential",
    description:
      "Uses an increasing order number such as ORD-001001.",
  },
  {
    value: "timestamp",
    label: "Timestamp",
    description:
      "Generates the order number from the current date and time.",
  },
  {
    value: "random",
    label: "Random",
    description:
      "Generates a random order identifier for each order.",
  },
];

const ORDER_STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUS_OPTIONS = [
  "unpaid",
  "pending",
  "paid",
  "partially_paid",
  "failed",
  "refunded",
  "partially_refunded",
];

/* =========================================================
   HELPERS
========================================================= */

const mergeOrderSettings = (
  settings?: Partial<OrderSettings> | null
): OrderSettings => ({
  ...DEFAULT_ORDER_SETTINGS,
  ...(settings || {}),
});

const toFiniteNumber = (
  value: unknown,
  fallback = 0
): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const clampNumber = (
  value: number,
  minimum: number,
  maximum?: number
): number => {
  const safeValue = Math.max(
    minimum,
    value
  );

  if (
    typeof maximum === "number"
  ) {
    return Math.min(
      maximum,
      safeValue
    );
  }

  return safeValue;
};

const formatDateTime = (
  value: string
): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-US"
  );
};

const formatStatusLabel = (
  value: string
): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

/* =========================================================
   PAGE
========================================================= */

export default function OrderSettingsPage() {
  const [formData, setFormData] =
    useState<OrderSettings>(
      DEFAULT_ORDER_SETTINGS
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
          await getSettingsSection<OrderSettings>(
            "orders"
          );

        setFormData(
          mergeOrderSettings(
            response.data.settings
          )
        );

        setVersion(
          response.data.version
        );

        setUpdatedAt(
          response.data.updatedAt ||
            ""
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

const handleTextChange = (
  event: ChangeEvent<
    HTMLInputElement | HTMLSelectElement
  >
) => {
  const field =
    event.target.name as TextField;

  let value = event.target.value;

  if (field === "orderPrefix") {
    value = value
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 20);
  }

  setFormData((current) => ({
    ...current,
    [field]: value,
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
        : toFiniteNumber(
            event.target.value,
            0
          );

    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setStatusMessage(null);
  };

  const handleBooleanChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as BooleanField;

    setFormData((current) => ({
      ...current,
      [field]:
        event.target.checked,
    }));

    setStatusMessage(null);
  };

  const handleOrderFormatChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setFormData((current) => ({
      ...current,
      orderNumberFormat:
        event.target
          .value as OrderNumberFormat,
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     NORMALIZE DATA
  ======================================================= */

  const createNormalizedData =
    (): OrderSettings => ({
      orderPrefix:
        formData.orderPrefix
          .trim()
          .toUpperCase() ||
        "ORD",

      orderNumberFormat:
        formData.orderNumberFormat,

      orderNumberPadding:
        clampNumber(
          Math.trunc(
            toFiniteNumber(
              formData.orderNumberPadding,
              6
            )
          ),
          3,
          12
        ),

      startingOrderNumber:
        clampNumber(
          Math.trunc(
            toFiniteNumber(
              formData.startingOrderNumber,
              1001
            )
          ),
          1
        ),

      allowGuestCheckout:
        formData.allowGuestCheckout,

      requirePhoneNumber:
        formData.requirePhoneNumber,

      requireEmailAddress:
        formData.requireEmailAddress,

      autoConfirmOrders:
        formData.autoConfirmOrders,

      allowOrderCancellation:
        formData.allowOrderCancellation,

      cancellationWindowMinutes:
        clampNumber(
          Math.trunc(
            toFiniteNumber(
              formData.cancellationWindowMinutes,
              30
            )
          ),
          0,
          10080
        ),

      allowOrderNotes:
        formData.allowOrderNotes,

      defaultOrderStatus:
        formData.defaultOrderStatus
          .trim()
          .toLowerCase() ||
        "pending",

      defaultPaymentStatus:
        formData.defaultPaymentStatus
          .trim()
          .toLowerCase() ||
        "unpaid",

      minimumOrderAmount:
        clampNumber(
          toFiniteNumber(
            formData.minimumOrderAmount,
            0
          ),
          0
        ),

      maximumOrderAmount:
        clampNumber(
          toFiniteNumber(
            formData.maximumOrderAmount,
            0
          ),
          0
        ),

      taxIncludedInPrice:
        formData.taxIncludedInPrice,

      defaultTaxRate:
        clampNumber(
          toFiniteNumber(
            formData.defaultTaxRate,
            0
          ),
          0,
          100
        ),
    });

  /* =======================================================
     CLIENT VALIDATION
  ======================================================= */

  const validateForm = (
    settings: OrderSettings
  ): string => {
    if (
      !settings.orderPrefix
    ) {
      return "Order prefix is required.";
    }

    if (
      settings.orderPrefix.length >
      20
    ) {
      return "Order prefix cannot exceed 20 characters.";
    }

    if (
      settings.maximumOrderAmount >
        0 &&
      settings.maximumOrderAmount <
        settings.minimumOrderAmount
    ) {
      return "Maximum order amount must be greater than or equal to the minimum order amount.";
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
          OrderSettings &
            Record<string, unknown>
        >(
          "orders",
          normalizedData,
          version
        );

      setFormData(
        mergeOrderSettings(
          response.data.settings
        )
      );

      setVersion(
        response.data.version
      );

      setUpdatedAt(
        response.data.updatedAt ||
          ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Order settings saved successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(
          error
        )
      ) {
        setStatusMessage({
          type: "error",
          text:
            "Order settings were updated from another session. The latest settings are being loaded.",
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
        "Are you sure you want to reset all Order settings to their default values?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<OrderSettings>(
          "orders",
          version
        );

      setFormData(
        mergeOrderSettings(
          response.data.settings
        )
      );

      setVersion(
        response.data.version
      );

      setUpdatedAt(
        response.data.updatedAt ||
          ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Order settings reset successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(
          error
        )
      ) {
        setStatusMessage({
          type: "error",
          text:
            "Order settings were updated from another session. The latest settings are being loaded.",
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
     PREVIEW
  ======================================================= */

  const orderNumberPreview =
    useMemo(() => {
      const prefix =
        formData.orderPrefix ||
        "ORD";

      if (
        formData.orderNumberFormat ===
        "timestamp"
      ) {
        return `${prefix}-20260727163045`;
      }

      if (
        formData.orderNumberFormat ===
        "random"
      ) {
        return `${prefix}-A7K92M`;
      }

      const padding =
        clampNumber(
          Math.trunc(
            toFiniteNumber(
              formData.orderNumberPadding,
              6
            )
          ),
          3,
          12
        );

      const orderNumber =
        clampNumber(
          Math.trunc(
            toFiniteNumber(
              formData.startingOrderNumber,
              1001
            )
          ),
          1
        );

      return `${prefix}-${String(
        orderNumber
      ).padStart(padding, "0")}`;
    }, [
      formData.orderPrefix,
      formData.orderNumberFormat,
      formData.orderNumberPadding,
      formData.startingOrderNumber,
    ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <OrderPageSkeleton />;
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
              Order configuration
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Order Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Configure order numbering,
              checkout requirements,
              cancellation rules, tax and
              order value limits.
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
                  {formatDateTime(
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
        {/* Order Number */}

        <SectionCard
          title="Order Number"
          description="Configure how customer order numbers are generated."
        >
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Order number preview
            </p>

            <p className="mt-2 break-all font-mono text-xl font-bold text-blue-950">
              {orderNumberPreview}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Order Prefix"
              htmlFor="orderPrefix"
              required
              hint="Maximum 20 characters"
            >
              <input
                id="orderPrefix"
                name="orderPrefix"
                type="text"
                value={
                  formData.orderPrefix
                }
                onChange={
                  handleTextChange
                }
                placeholder="ORD"
                maxLength={20}
                required
                className={
                  inputClassName
                }
              />
            </FormField>

            <FormField
              label="Number Format"
              htmlFor="orderNumberFormat"
            >
              <select
                id="orderNumberFormat"
                value={
                  formData.orderNumberFormat
                }
                onChange={
                  handleOrderFormatChange
                }
                className={
                  inputClassName
                }
              >
                {ORDER_NUMBER_FORMAT_OPTIONS.map(
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
                  ORDER_NUMBER_FORMAT_OPTIONS.find(
                    (option) =>
                      option.value ===
                      formData.orderNumberFormat
                  )?.description
                }
              </p>
            </FormField>

            <FormField
              label="Number Padding"
              htmlFor="orderNumberPadding"
              hint="Between 3 and 12"
            >
              <input
                id="orderNumberPadding"
                name="orderNumberPadding"
                type="number"
                value={
                  formData.orderNumberPadding
                }
                onChange={
                  handleNumberChange
                }
                min={3}
                max={12}
                step={1}
                disabled={
                  formData.orderNumberFormat !==
                  "sequential"
                }
                className={
                  inputClassName
                }
              />
            </FormField>

            <FormField
              label="Starting Order Number"
              htmlFor="startingOrderNumber"
              hint="Minimum 1"
            >
              <input
                id="startingOrderNumber"
                name="startingOrderNumber"
                type="number"
                value={
                  formData.startingOrderNumber
                }
                onChange={
                  handleNumberChange
                }
                min={1}
                step={1}
                disabled={
                  formData.orderNumberFormat !==
                  "sequential"
                }
                className={
                  inputClassName
                }
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Checkout */}

        <SectionCard
          title="Checkout Requirements"
          description="Control what information customers must provide during checkout."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ToggleField
              name="allowGuestCheckout"
              title="Allow guest checkout"
              description="Customers can place orders without creating an account."
              checked={
                formData.allowGuestCheckout
              }
              onChange={
                handleBooleanChange
              }
            />

            <ToggleField
              name="requirePhoneNumber"
              title="Require phone number"
              description="Customers must provide a phone number during checkout."
              checked={
                formData.requirePhoneNumber
              }
              onChange={
                handleBooleanChange
              }
            />

            <ToggleField
              name="requireEmailAddress"
              title="Require email address"
              description="Customers must provide an email address during checkout."
              checked={
                formData.requireEmailAddress
              }
              onChange={
                handleBooleanChange
              }
            />

            <ToggleField
              name="allowOrderNotes"
              title="Allow order notes"
              description="Customers can add special instructions to their order."
              checked={
                formData.allowOrderNotes
              }
              onChange={
                handleBooleanChange
              }
            />
          </div>
        </SectionCard>

        {/* Processing */}

        <SectionCard
          title="Order Processing"
          description="Configure automatic confirmation and default statuses."
        >
          <div className="space-y-5">
            <ToggleField
              name="autoConfirmOrders"
              title="Automatically confirm orders"
              description="New orders will be confirmed immediately without manual approval."
              checked={
                formData.autoConfirmOrders
              }
              onChange={
                handleBooleanChange
              }
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField
                label="Default Order Status"
                htmlFor="defaultOrderStatus"
              >
                <select
                  id="defaultOrderStatus"
                  name="defaultOrderStatus"
                  value={
                    formData.defaultOrderStatus
                  }
                  onChange={
                    handleTextChange
                  }
                  className={
                    inputClassName
                  }
                >
                  {ORDER_STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatStatusLabel(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField
                label="Default Payment Status"
                htmlFor="defaultPaymentStatus"
              >
                <select
                  id="defaultPaymentStatus"
                  name="defaultPaymentStatus"
                  value={
                    formData.defaultPaymentStatus
                  }
                  onChange={
                    handleTextChange
                  }
                  className={
                    inputClassName
                  }
                >
                  {PAYMENT_STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {formatStatusLabel(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Cancellation */}

        <SectionCard
          title="Order Cancellation"
          description="Configure whether customers can cancel orders and for how long."
        >
          <div className="space-y-5">
            <ToggleField
              name="allowOrderCancellation"
              title="Allow order cancellation"
              description="Customers can cancel eligible orders within the configured time limit."
              checked={
                formData.allowOrderCancellation
              }
              onChange={
                handleBooleanChange
              }
            />

            <div className="max-w-xl">
              <FormField
                label="Cancellation Window"
                htmlFor="cancellationWindowMinutes"
                hint="Minutes, maximum 10,080"
              >
                <input
                  id="cancellationWindowMinutes"
                  name="cancellationWindowMinutes"
                  type="number"
                  value={
                    formData.cancellationWindowMinutes
                  }
                  onChange={
                    handleNumberChange
                  }
                  min={0}
                  max={10080}
                  step={1}
                  disabled={
                    !formData.allowOrderCancellation
                  }
                  className={
                    inputClassName
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  {formData.cancellationWindowMinutes ===
                  0
                    ? "Cancellation is available only before processing starts."
                    : `Customers can cancel within ${formData.cancellationWindowMinutes} minute(s) after placing an order.`}
                </p>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Limits */}

        <SectionCard
          title="Order Value Limits"
          description="Set optional minimum and maximum order amounts. Use 0 for no limit."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              label="Minimum Order Amount"
              htmlFor="minimumOrderAmount"
              hint="0 means no minimum"
            >
              <input
                id="minimumOrderAmount"
                name="minimumOrderAmount"
                type="number"
                value={
                  formData.minimumOrderAmount
                }
                onChange={
                  handleNumberChange
                }
                min={0}
                step="0.01"
                className={
                  inputClassName
                }
              />
            </FormField>

            <FormField
              label="Maximum Order Amount"
              htmlFor="maximumOrderAmount"
              hint="0 means no maximum"
            >
              <input
                id="maximumOrderAmount"
                name="maximumOrderAmount"
                type="number"
                value={
                  formData.maximumOrderAmount
                }
                onChange={
                  handleNumberChange
                }
                min={0}
                step="0.01"
                className={
                  inputClassName
                }
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Tax */}

        <SectionCard
          title="Tax Configuration"
          description="Configure how product prices and default tax calculations work."
        >
          <div className="space-y-5">
            <ToggleField
              name="taxIncludedInPrice"
              title="Tax included in product price"
              description="Product prices already include tax and should not have tax added again."
              checked={
                formData.taxIncludedInPrice
              }
              onChange={
                handleBooleanChange
              }
            />

            <div className="max-w-xl">
              <FormField
                label="Default Tax Rate"
                htmlFor="defaultTaxRate"
                hint="Between 0% and 100%"
              >
                <div className="relative">
                  <input
                    id="defaultTaxRate"
                    name="defaultTaxRate"
                    type="number"
                    value={
                      formData.defaultTaxRate
                    }
                    onChange={
                      handleNumberChange
                    }
                    min={0}
                    max={100}
                    step="0.01"
                    className={`${inputClassName} pr-12`}
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">
                    %
                  </span>
                </div>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Actions */}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Order settings apply only
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
   TOGGLE FIELD
========================================================= */

function ToggleField({
  name,
  title,
  description,
  checked,
  onChange,
}: {
  name: BooleanField;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100/70">
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
          className="peer sr-only"
        />

        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20" />

        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function OrderPageSkeleton() {
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
            <div className="h-20 rounded-xl bg-slate-100" />

            <div className="h-20 rounded-xl bg-slate-100" />
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