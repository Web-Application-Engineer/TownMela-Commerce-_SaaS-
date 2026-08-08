"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  Save,
  Settings2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

type ROISettings = {
  currency: string;
  packagingCostPerOrder: number;
  advertisingCostPerOrder: number;
  transportCostPerOrder: number;
  overheadCostPerOrder: number;
  handlingCostPerOrder: number;
  processingCostPerOrder: number;
  otherCostPerOrder: number;
  gatewayFeePercent: number;
  includeCourierCost: boolean;
  includePackagingCost: boolean;
  includeGatewayFee: boolean;
  includeAdvertisingCost: boolean;
  includeTransportCost: boolean;
  includeOverheadCost: boolean;
  includeHandlingCost: boolean;
  includeProcessingCost: boolean;
  includeOtherCost: boolean;
  includeDiscount: boolean;
  includeRefund: boolean;
  eligibleOrderStatuses: string[];
  isActive: boolean;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: Partial<ROISettings>;
};

const defaults: ROISettings = {
  currency: "BDT",
  packagingCostPerOrder: 0,
  advertisingCostPerOrder: 0,
  transportCostPerOrder: 0,
  overheadCostPerOrder: 0,
  handlingCostPerOrder: 0,
  processingCostPerOrder: 0,
  otherCostPerOrder: 0,
  gatewayFeePercent: 0,
  includeCourierCost: true,
  includePackagingCost: true,
  includeGatewayFee: true,
  includeAdvertisingCost: true,
  includeTransportCost: true,
  includeOverheadCost: true,
  includeHandlingCost: true,
  includeProcessingCost: true,
  includeOtherCost: true,
  includeDiscount: true,
  includeRefund: true,
  eligibleOrderStatuses: [
    "Delivered",
    "Completed",
  ],
  isActive: true,
};

const numberValue = (
  value: unknown,
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? Math.max(
        parsed,
        0,
      )
    : 0;
};

const getStoredValue = (
  keys: string[],
) => {
  for (
    const key of keys
  ) {
    const value =
      localStorage.getItem(
        key,
      );

    if (value) {
      return value;
    }
  }

  return "";
};

const formatCurrency = (
  value: number,
  currency: string,
) =>
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    numberValue(value),
  );

export default function ROISettingsPage() {
  const router =
    useRouter();

  /* =======================================================
     GLOBAL TENANT
  ======================================================= */

  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    settings,
    setSettings,
  ] =
    useState<ROISettings>(
      defaults,
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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /* =======================================================
     BUILD HEADERS
  ======================================================= */

  const buildHeaders =
    useCallback(() => {
      const token =
        getStoredValue([
          "townmelaAdminToken",
          "accessToken",
          "token",
          "authToken",
          "jwt",
        ]);

      if (!token) {
        router.replace(
          "/admin/login",
        );

        throw new Error(
          "Admin session was not found.",
        );
      }

      if (
        !selectedTenantId
      ) {
        throw new Error(
          "Tenant ID was not found. Please select a tenant.",
        );
      }

      return {
        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,

        "X-Tenant-Id":
          selectedTenantId,
      };
    }, [
      router,
      selectedTenantId,
    ]);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      if (
        loadingTenants
      ) {
        return;
      }

      if (
        !selectedTenantId
      ) {
        setSettings(
          defaults,
        );

        setErrorMessage(
          "",
        );

        setSuccessMessage(
          "",
        );

        setIsLoading(
          false,
        );

        return;
      }

      try {
        setIsLoading(
          true,
        );

        setErrorMessage(
          "",
        );

        setSuccessMessage(
          "",
        );

        /*
         * Clear previous tenant values before
         * loading the newly selected tenant.
         */
        setSettings(
          defaults,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/roi/settings`,
            {
              method:
                "GET",

              headers:
                buildHeaders(),

              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          localStorage.removeItem(
            "townmelaAdminToken",
          );

          localStorage.removeItem(
            "townmelaAdminUser",
          );

          router.replace(
            "/admin/login",
          );

          return;
        }

        const payload =
          (await response
            .json()
            .catch(
              () =>
                null,
            )) as
            | ApiResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load ROI settings.",
          );
        }

        const data =
          payload.data ||
          {};

        setSettings({
          ...defaults,
          ...data,

          packagingCostPerOrder:
            numberValue(
              data
                .packagingCostPerOrder,
            ),

          advertisingCostPerOrder:
            numberValue(
              data
                .advertisingCostPerOrder,
            ),

          transportCostPerOrder:
            numberValue(
              data
                .transportCostPerOrder,
            ),

          overheadCostPerOrder:
            numberValue(
              data
                .overheadCostPerOrder,
            ),

          handlingCostPerOrder:
            numberValue(
              data
                .handlingCostPerOrder,
            ),

          processingCostPerOrder:
            numberValue(
              data
                .processingCostPerOrder,
            ),

          otherCostPerOrder:
            numberValue(
              data
                .otherCostPerOrder,
            ),

          gatewayFeePercent:
            numberValue(
              data
                .gatewayFeePercent,
            ),

          eligibleOrderStatuses:
            Array.isArray(
              data
                .eligibleOrderStatuses,
            ) &&
            data
              .eligibleOrderStatuses
              .length >
              0
              ? data
                  .eligibleOrderStatuses
              : defaults
                  .eligibleOrderStatuses,
        });
      } catch (
        error
      ) {
        setSettings(
          defaults,
        );

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Failed to load ROI settings.",
        );
      } finally {
        setIsLoading(
          false,
        );
      }
    }, [
      buildHeaders,
      loadingTenants,
      router,
      selectedTenantId,
    ]);

  /* =======================================================
     AUTO LOAD / TENANT CHANGE
  ======================================================= */

  useEffect(() => {
    void loadSettings();
  }, [
    loadSettings,
  ]);

  /* =======================================================
     FIXED COST PREVIEW
  ======================================================= */

  const fixedCostTotal =
    useMemo(() => {
      const values = [
        settings
          .includePackagingCost
          ? settings
              .packagingCostPerOrder
          : 0,

        settings
          .includeAdvertisingCost
          ? settings
              .advertisingCostPerOrder
          : 0,

        settings
          .includeTransportCost
          ? settings
              .transportCostPerOrder
          : 0,

        settings
          .includeOverheadCost
          ? settings
              .overheadCostPerOrder
          : 0,

        settings
          .includeHandlingCost
          ? settings
              .handlingCostPerOrder
          : 0,

        settings
          .includeProcessingCost
          ? settings
              .processingCostPerOrder
          : 0,

        settings
          .includeOtherCost
          ? settings
              .otherCostPerOrder
          : 0,
      ];

      return values.reduce(
        (
          total,
          value,
        ) =>
          total +
          numberValue(
            value,
          ),
        0,
      );
    }, [
      settings,
    ]);

  /* =======================================================
     UPDATE NUMBER
  ======================================================= */

  const updateNumber = (
    field:
      | "packagingCostPerOrder"
      | "advertisingCostPerOrder"
      | "transportCostPerOrder"
      | "overheadCostPerOrder"
      | "handlingCostPerOrder"
      | "processingCostPerOrder"
      | "otherCostPerOrder"
      | "gatewayFeePercent",

    value: string,
  ) => {
    setSettings(
      (
        current,
      ) => ({
        ...current,

        [field]:
          numberValue(
            value,
          ),
      }),
    );
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const saveSettings =
    async () => {
      if (
        loadingTenants ||
        !selectedTenantId
      ) {
        setErrorMessage(
          "Please select a tenant before saving ROI settings.",
        );

        return;
      }

      try {
        setIsSaving(
          true,
        );

        setErrorMessage(
          "",
        );

        setSuccessMessage(
          "",
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/roi/settings`,
            {
              method:
                "PATCH",

              headers:
                buildHeaders(),

              credentials:
                "include",

              body:
                JSON.stringify(
                  settings,
                ),
            },
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          localStorage.removeItem(
            "townmelaAdminToken",
          );

          localStorage.removeItem(
            "townmelaAdminUser",
          );

          router.replace(
            "/admin/login",
          );

          return;
        }

        const payload =
          (await response
            .json()
            .catch(
              () =>
                null,
            )) as
            | ApiResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to save ROI settings.",
          );
        }

        setSuccessMessage(
          payload.message ||
            "ROI cost settings saved successfully.",
        );

        if (
          payload.data
        ) {
          setSettings(
            (
              current,
            ) => ({
              ...current,
              ...payload.data,
            }),
          );
        }
      } catch (
        error
      ) {
        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Failed to save ROI settings.",
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  /* =======================================================
     COST FIELDS
  ======================================================= */

  const costFields = [
    {
      label:
        "Packaging Cost",

      description:
        "Packaging materials and order preparation.",

      field:
        "packagingCostPerOrder" as const,

      toggle:
        "includePackagingCost" as const,
    },

    {
      label:
        "Advertising Cost",

      description:
        "Average advertising cost allocated per order.",

      field:
        "advertisingCostPerOrder" as const,

      toggle:
        "includeAdvertisingCost" as const,
    },

    {
      label:
        "Transport Cost",

      description:
        "Transport from supplier, warehouse or hub.",

      field:
        "transportCostPerOrder" as const,

      toggle:
        "includeTransportCost" as const,
    },

    {
      label:
        "Overhead Cost",

      description:
        "Rent, utilities, salaries and administrative overhead.",

      field:
        "overheadCostPerOrder" as const,

      toggle:
        "includeOverheadCost" as const,
    },

    {
      label:
        "Handling Cost",

      description:
        "Picking, packing and handling labour.",

      field:
        "handlingCostPerOrder" as const,

      toggle:
        "includeHandlingCost" as const,
    },

    {
      label:
        "Processing Cost",

      description:
        "Order processing and operational fees.",

      field:
        "processingCostPerOrder" as const,

      toggle:
        "includeProcessingCost" as const,
    },

    {
      label:
        "Other Cost",

      description:
        "Any miscellaneous fixed cost per eligible order.",

      field:
        "otherCostPerOrder" as const,

      toggle:
        "includeOtherCost" as const,
    },
  ];

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="inline-flex items-center gap-3 text-sm font-bold text-gray-500">
          <LoaderCircle className="animate-spin text-[#FF6900]" />

          Loading ROI settings...
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/admin/roi"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 hover:text-[#FF6900]"
          >
            <ArrowLeft
              size={17}
            />

            ROI Overview
          </Link>

          <span className="mt-4 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            ROI & Profitability
          </span>

          <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
            Cost Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Configure the fixed and percentage costs used in profitability calculations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void loadSettings()
            }
            disabled={
              isSaving ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={17}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              void saveSettings()
            }
            disabled={
              isSaving ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save
                size={17}
              />
            )}

            Save Settings
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            className="mt-0.5 shrink-0"
            size={20}
          />

          <p className="text-sm font-semibold">
            {
              errorMessage
            }
          </p>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2
            className="mt-0.5 shrink-0"
            size={20}
          />

          <p className="text-sm font-semibold">
            {
              successMessage
            }
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
              <Settings2
                size={21}
              />
            </div>

            <div>
              <h2 className="text-lg font-black text-[#0B1F3A]">
                Per-order Costs
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Costs are applied to every eligible delivered order.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {costFields.map(
              (
                item,
              ) => (
                <div
                  key={
                    item.field
                  }
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-[#0B1F3A]">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {
                          item.description
                        }
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        settings[
                          item.toggle
                        ]
                      }
                      onChange={(
                        event,
                      ) =>
                        setSettings(
                          (
                            current,
                          ) => ({
                            ...current,

                            [item.toggle]:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                      className="h-5 w-5 accent-[#FF6900]"
                    />
                  </div>

                  <div className="mt-4 flex items-center rounded-xl border border-gray-200 bg-white">
                    <span className="border-r border-gray-200 px-3 text-xs font-extrabold text-gray-500">
                      {
                        settings.currency
                      }
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        settings[
                          item.field
                        ]
                      }
                      disabled={
                        !settings[
                          item.toggle
                        ]
                      }
                      onChange={(
                        event,
                      ) =>
                        updateNumber(
                          item.field,
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-11 w-full rounded-r-xl px-3 text-sm font-bold text-[#0B1F3A] outline-none disabled:bg-gray-100"
                    />
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[#0B1F3A]">
                    Gateway Fee
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Percentage applied to the order&apos;s net collected revenue.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    settings
                      .includeGatewayFee
                  }
                  onChange={(
                    event,
                  ) =>
                    setSettings(
                      (
                        current,
                      ) => ({
                        ...current,

                        includeGatewayFee:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                  className="h-5 w-5 accent-[#FF6900]"
                />
              </div>

              <div className="mt-4 flex items-center rounded-xl border border-gray-200 bg-white">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    settings
                      .gatewayFeePercent
                  }
                  disabled={
                    !settings
                      .includeGatewayFee
                  }
                  onChange={(
                    event,
                  ) =>
                    updateNumber(
                      "gatewayFeePercent",
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-l-xl px-3 text-sm font-bold text-[#0B1F3A] outline-none disabled:bg-gray-100"
                />

                <span className="border-l border-gray-200 px-3 text-sm font-extrabold text-gray-500">
                  %
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="font-extrabold text-[#0B1F3A]">
                Courier Cost
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Uses the actual courier shipment charge when available.
              </p>

              <label className="mt-4 flex h-11 items-center justify-between rounded-xl border border-gray-200 bg-white px-4">
                <span className="text-sm font-bold text-gray-600">
                  Include courier charge
                </span>

                <input
                  type="checkbox"
                  checked={
                    settings
                      .includeCourierCost
                  }
                  onChange={(
                    event,
                  ) =>
                    setSettings(
                      (
                        current,
                      ) => ({
                        ...current,

                        includeCourierCost:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                  className="h-5 w-5 accent-[#FF6900]"
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-5">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Cost Preview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current fixed cost settings per eligible order.
            </p>
          </div>

          <div className="space-y-2 p-5">
            {costFields.map(
              (
                item,
              ) => (
                <div
                  key={
                    item.field
                  }
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
                >
                  <span className="text-sm font-bold text-gray-600">
                    {item.label.replace(
                      " Cost",
                      "",
                    )}
                  </span>

                  <span className="text-sm font-black text-[#0B1F3A]">
                    {formatCurrency(
                      settings[
                        item.toggle
                      ]
                        ? settings[
                            item.field
                          ]
                        : 0,
                      settings.currency,
                    )}
                  </span>
                </div>
              ),
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-bold text-gray-600">
                Gateway Fee
              </span>

              <span className="text-sm font-black text-[#0B1F3A]">
                {settings
                  .includeGatewayFee
                  ? `${numberValue(
                      settings
                        .gatewayFeePercent,
                    ).toFixed(
                      2,
                    )}%`
                  : "Disabled"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-bold text-gray-600">
                Courier Cost
              </span>

              <span className="text-right text-xs font-extrabold text-[#0B1F3A]">
                {settings
                  .includeCourierCost
                  ? "Actual shipment"
                  : "Disabled"}
              </span>
            </div>

            <div className="my-3 border-t border-dashed border-gray-300" />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
              <span className="text-sm font-black text-blue-700">
                Total Fixed Cost / Order
              </span>

              <span className="text-base font-black text-blue-700">
                {formatCurrency(
                  fixedCostTotal,
                  settings.currency,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3">
              <span className="text-sm font-extrabold text-[#FF6900]">
                Module
              </span>

              <button
                type="button"
                onClick={() =>
                  setSettings(
                    (
                      current,
                    ) => ({
                      ...current,

                      isActive:
                        !current
                          .isActive,
                    }),
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                  settings.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {settings.isActive
                  ? "Active"
                  : "Inactive"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}