"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Truck,
  Undo2,
  Workflow,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type DeliveryType =
  | "regular"
  | "express"
  | "same_day";

type AutoBookStatus =
  | "confirmed"
  | "processing"
  | "ready_to_ship";

type CodFeeType =
  | "none"
  | "fixed"
  | "percentage";

type CourierApiRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

type CourierOption = {
  id: string;
  name: string;
  code: string;
  providerType: string;
  isActive: boolean;
  isDefault: boolean;
};

type DefaultCourierValue =
  | string
  | CourierApiRecord
  | null;

type AutomationSettings = {
  autoBookShipment: boolean;
  autoBookOnStatus: AutoBookStatus;
  preventDuplicateBooking: boolean;
  fallbackToDefaultCourier: boolean;
  autoPrintLabel: boolean;
};

type StatusSyncSettings = {
  enabled: boolean;
  intervalMinutes: number;
  updateOrderStatus: boolean;
  markDeliveredOrdersPaid: boolean;
  syncOnlyActiveShipments: boolean;
};

type CodSettings = {
  enabled: boolean;
  includeDeliveryChargeInCod: boolean;
  allowZeroCodAmount: boolean;
  maximumCodAmount: number;
  codFeeType: CodFeeType;
  codFeeValue: number;
};

type DeliveryChargeSettings = {
  enabled: boolean;
  insideDhaka: number;
  dhakaSubArea: number;
  outsideDhaka: number;
  sameDaySurcharge: number;
  expressSurcharge: number;
  freeDeliveryThreshold: number;
  chargeCustomer: boolean;
};

type ReturnChargeSettings = {
  enabled: boolean;
  reverseDeliveryCharge: number;
  redeliveryCharge: number;
  deductFromRefund: boolean;
  recordAsBusinessExpense: boolean;
};

type AddressValidationSettings = {
  requireDistrict: boolean;
  requireArea: boolean;
  requirePostalCode: boolean;
  requireCustomerPhone: boolean;
  normalizeBangladeshPhone: boolean;
};

type NotificationSettings = {
  notifyOnBookingFailure: boolean;
  notifyOnStatusSyncFailure: boolean;
  notifyOnDelivery: boolean;
  notifyOnReturn: boolean;
};

type CourierSettings = {
  id: string;
  tenant: string;
  defaultCourier: string;
  defaultDeliveryType: DeliveryType;
  isActive: boolean;
  automation: AutomationSettings;
  statusSync: StatusSyncSettings;
  cod: CodSettings;
  deliveryCharge: DeliveryChargeSettings;
  returnCharge: ReturnChargeSettings;
  addressValidation: AddressValidationSettings;
  notifications: NotificationSettings;
};

type CourierSettingsApiRecord = {
  _id?: string;
  tenant?: string;
  defaultCourier?: DefaultCourierValue;
  defaultDeliveryType?: string;
  isActive?: boolean;
  automation?: Partial<AutomationSettings>;
  statusSync?: Partial<StatusSyncSettings>;
  cod?: Partial<CodSettings>;
  deliveryCharge?: Partial<DeliveryChargeSettings>;
  returnCharge?: Partial<ReturnChargeSettings>;
  addressValidation?: Partial<AddressValidationSettings>;
  notifications?: Partial<NotificationSettings>;
};

type CourierSettingsResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    settings?: CourierSettingsApiRecord;
  };
};

type CouriersResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    couriers?: CourierApiRecord[];
  };
};

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_SETTINGS: CourierSettings = {
  id: "",
  tenant: "",
  defaultCourier: "",
  defaultDeliveryType: "regular",
  isActive: true,

  automation: {
    autoBookShipment: false,
    autoBookOnStatus: "ready_to_ship",
    preventDuplicateBooking: true,
    fallbackToDefaultCourier: true,
    autoPrintLabel: false,
  },

  statusSync: {
    enabled: false,
    intervalMinutes: 30,
    updateOrderStatus: true,
    markDeliveredOrdersPaid: false,
    syncOnlyActiveShipments: true,
  },

  cod: {
    enabled: true,
    includeDeliveryChargeInCod: true,
    allowZeroCodAmount: false,
    maximumCodAmount: 0,
    codFeeType: "none",
    codFeeValue: 0,
  },

  deliveryCharge: {
    enabled: false,
    insideDhaka: 0,
    dhakaSubArea: 0,
    outsideDhaka: 0,
    sameDaySurcharge: 0,
    expressSurcharge: 0,
    freeDeliveryThreshold: 0,
    chargeCustomer: true,
  },

  returnCharge: {
    enabled: true,
    reverseDeliveryCharge: 0,
    redeliveryCharge: 0,
    deductFromRefund: false,
    recordAsBusinessExpense: true,
  },

  addressValidation: {
    requireDistrict: true,
    requireArea: true,
    requirePostalCode: false,
    requireCustomerPhone: true,
    normalizeBangladeshPhone: true,
  },

  notifications: {
    notifyOnBookingFailure: true,
    notifyOnStatusSyncFailure: true,
    notifyOnDelivery: false,
    notifyOnReturn: true,
  },
};

/* =========================================================
   API HELPERS
========================================================= */

function getErrorMessage(
  payload:
    | {
        message?: string;
        error?: string;
      }
    | null,
  fallback: string,
): string {
  return (
    payload?.message ||
    payload?.error ||
    fallback
  );
}

/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

function toBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function toNonNegativeNumber(
  value: unknown,
  fallback: number,
): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) &&
    parsedValue >= 0
    ? parsedValue
    : fallback;
}

function normalizeDefaultCourier(
  value: DefaultCourierValue | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return value._id || value.id || "";
  }

  return "";
}

function normalizeDeliveryType(
  value: unknown,
): DeliveryType {
  return value === "express" ||
    value === "same_day"
    ? value
    : "regular";
}

function normalizeAutoBookStatus(
  value: unknown,
): AutoBookStatus {
  return value === "confirmed" ||
    value === "processing"
    ? value
    : "ready_to_ship";
}

function normalizeCodFeeType(
  value: unknown,
): CodFeeType {
  return value === "fixed" ||
    value === "percentage"
    ? value
    : "none";
}

function normalizeSettings(
  record?: CourierSettingsApiRecord,
): CourierSettings {
  if (!record) {
    return structuredClone(
      DEFAULT_SETTINGS,
    );
  }

  return {
    id: record._id || "",
    tenant: record.tenant || "",
    defaultCourier:
      normalizeDefaultCourier(
        record.defaultCourier,
      ),
    defaultDeliveryType:
      normalizeDeliveryType(
        record.defaultDeliveryType,
      ),
    isActive: toBoolean(
      record.isActive,
      DEFAULT_SETTINGS.isActive,
    ),

    automation: {
      autoBookShipment: toBoolean(
        record.automation
          ?.autoBookShipment,
        DEFAULT_SETTINGS.automation
          .autoBookShipment,
      ),
      autoBookOnStatus:
        normalizeAutoBookStatus(
          record.automation
            ?.autoBookOnStatus,
        ),
      preventDuplicateBooking:
        toBoolean(
          record.automation
            ?.preventDuplicateBooking,
          DEFAULT_SETTINGS.automation
            .preventDuplicateBooking,
        ),
      fallbackToDefaultCourier:
        toBoolean(
          record.automation
            ?.fallbackToDefaultCourier,
          DEFAULT_SETTINGS.automation
            .fallbackToDefaultCourier,
        ),
      autoPrintLabel: toBoolean(
        record.automation?.autoPrintLabel,
        DEFAULT_SETTINGS.automation
          .autoPrintLabel,
      ),
    },

    statusSync: {
      enabled: toBoolean(
        record.statusSync?.enabled,
        DEFAULT_SETTINGS.statusSync
          .enabled,
      ),
      intervalMinutes:
        toNonNegativeNumber(
          record.statusSync
            ?.intervalMinutes,
          DEFAULT_SETTINGS.statusSync
            .intervalMinutes,
        ),
      updateOrderStatus: toBoolean(
        record.statusSync
          ?.updateOrderStatus,
        DEFAULT_SETTINGS.statusSync
          .updateOrderStatus,
      ),
      markDeliveredOrdersPaid:
        toBoolean(
          record.statusSync
            ?.markDeliveredOrdersPaid,
          DEFAULT_SETTINGS.statusSync
            .markDeliveredOrdersPaid,
        ),
      syncOnlyActiveShipments:
        toBoolean(
          record.statusSync
            ?.syncOnlyActiveShipments,
          DEFAULT_SETTINGS.statusSync
            .syncOnlyActiveShipments,
        ),
    },

    cod: {
      enabled: toBoolean(
        record.cod?.enabled,
        DEFAULT_SETTINGS.cod.enabled,
      ),
      includeDeliveryChargeInCod:
        toBoolean(
          record.cod
            ?.includeDeliveryChargeInCod,
          DEFAULT_SETTINGS.cod
            .includeDeliveryChargeInCod,
        ),
      allowZeroCodAmount: toBoolean(
        record.cod?.allowZeroCodAmount,
        DEFAULT_SETTINGS.cod
          .allowZeroCodAmount,
      ),
      maximumCodAmount:
        toNonNegativeNumber(
          record.cod?.maximumCodAmount,
          DEFAULT_SETTINGS.cod
            .maximumCodAmount,
        ),
      codFeeType: normalizeCodFeeType(
        record.cod?.codFeeType,
      ),
      codFeeValue:
        toNonNegativeNumber(
          record.cod?.codFeeValue,
          DEFAULT_SETTINGS.cod
            .codFeeValue,
        ),
    },

    deliveryCharge: {
      enabled: toBoolean(
        record.deliveryCharge?.enabled,
        DEFAULT_SETTINGS.deliveryCharge
          .enabled,
      ),
      insideDhaka:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.insideDhaka,
          DEFAULT_SETTINGS.deliveryCharge
            .insideDhaka,
        ),
      dhakaSubArea:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.dhakaSubArea,
          DEFAULT_SETTINGS.deliveryCharge
            .dhakaSubArea,
        ),
      outsideDhaka:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.outsideDhaka,
          DEFAULT_SETTINGS.deliveryCharge
            .outsideDhaka,
        ),
      sameDaySurcharge:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.sameDaySurcharge,
          DEFAULT_SETTINGS.deliveryCharge
            .sameDaySurcharge,
        ),
      expressSurcharge:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.expressSurcharge,
          DEFAULT_SETTINGS.deliveryCharge
            .expressSurcharge,
        ),
      freeDeliveryThreshold:
        toNonNegativeNumber(
          record.deliveryCharge
            ?.freeDeliveryThreshold,
          DEFAULT_SETTINGS.deliveryCharge
            .freeDeliveryThreshold,
        ),
      chargeCustomer: toBoolean(
        record.deliveryCharge
          ?.chargeCustomer,
        DEFAULT_SETTINGS.deliveryCharge
          .chargeCustomer,
      ),
    },

    returnCharge: {
      enabled: toBoolean(
        record.returnCharge?.enabled,
        DEFAULT_SETTINGS.returnCharge
          .enabled,
      ),
      reverseDeliveryCharge:
        toNonNegativeNumber(
          record.returnCharge
            ?.reverseDeliveryCharge,
          DEFAULT_SETTINGS.returnCharge
            .reverseDeliveryCharge,
        ),
      redeliveryCharge:
        toNonNegativeNumber(
          record.returnCharge
            ?.redeliveryCharge,
          DEFAULT_SETTINGS.returnCharge
            .redeliveryCharge,
        ),
      deductFromRefund: toBoolean(
        record.returnCharge
          ?.deductFromRefund,
        DEFAULT_SETTINGS.returnCharge
          .deductFromRefund,
      ),
      recordAsBusinessExpense:
        toBoolean(
          record.returnCharge
            ?.recordAsBusinessExpense,
          DEFAULT_SETTINGS.returnCharge
            .recordAsBusinessExpense,
        ),
    },

    addressValidation: {
      requireDistrict: toBoolean(
        record.addressValidation
          ?.requireDistrict,
        DEFAULT_SETTINGS
          .addressValidation
          .requireDistrict,
      ),
      requireArea: toBoolean(
        record.addressValidation
          ?.requireArea,
        DEFAULT_SETTINGS
          .addressValidation.requireArea,
      ),
      requirePostalCode: toBoolean(
        record.addressValidation
          ?.requirePostalCode,
        DEFAULT_SETTINGS
          .addressValidation
          .requirePostalCode,
      ),
      requireCustomerPhone:
        toBoolean(
          record.addressValidation
            ?.requireCustomerPhone,
          DEFAULT_SETTINGS
            .addressValidation
            .requireCustomerPhone,
        ),
      normalizeBangladeshPhone:
        toBoolean(
          record.addressValidation
            ?.normalizeBangladeshPhone,
          DEFAULT_SETTINGS
            .addressValidation
            .normalizeBangladeshPhone,
        ),
    },

    notifications: {
      notifyOnBookingFailure:
        toBoolean(
          record.notifications
            ?.notifyOnBookingFailure,
          DEFAULT_SETTINGS.notifications
            .notifyOnBookingFailure,
        ),
      notifyOnStatusSyncFailure:
        toBoolean(
          record.notifications
            ?.notifyOnStatusSyncFailure,
          DEFAULT_SETTINGS.notifications
            .notifyOnStatusSyncFailure,
        ),
      notifyOnDelivery: toBoolean(
        record.notifications
          ?.notifyOnDelivery,
        DEFAULT_SETTINGS.notifications
          .notifyOnDelivery,
      ),
      notifyOnReturn: toBoolean(
        record.notifications
          ?.notifyOnReturn,
        DEFAULT_SETTINGS.notifications
          .notifyOnReturn,
      ),
    },
  };
}

function normalizeCourier(
  record: CourierApiRecord,
): CourierOption | null {
  const id = record._id || record.id || "";

  if (!id) {
    return null;
  }

  return {
    id,
    name:
      record.name?.trim() ||
      "Unnamed Courier",
    code: record.code?.trim() || "-",
    providerType:
      record.providerType?.trim() ||
      "manual",
    isActive:
      record.isActive !== false,
    isDefault:
      Boolean(record.isDefault),
  };
}

function createUpdatePayload(
  settings: CourierSettings,
) {
  return {
    defaultCourier:
      settings.defaultCourier || null,
    defaultDeliveryType:
      settings.defaultDeliveryType,
    isActive: settings.isActive,
    automation: settings.automation,
    statusSync: settings.statusSync,
    cod: settings.cod,
    deliveryCharge:
      settings.deliveryCharge,
    returnCharge:
      settings.returnCharge,
    addressValidation:
      settings.addressValidation,
    notifications:
      settings.notifications,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function CourierSettingsPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const [
    settings,
    setSettings,
  ] = useState<CourierSettings>(
    structuredClone(DEFAULT_SETTINGS),
  );

  const [
    savedSettings,
    setSavedSettings,
  ] = useState<CourierSettings>(
    structuredClone(DEFAULT_SETTINGS),
  );

  const [
    couriers,
    setCouriers,
  ] = useState<CourierOption[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isResetting,
    setIsResetting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const mountedRef =
    useRef(false);

  useEffect(() => {
    /*
      React Strict Mode runs effect setup/cleanup twice in
      development. Resetting this flag during every setup
      prevents the page from remaining in its loading state.
    */
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPageData = useCallback(
    async (
      showRefreshState = false,
    ) => {
      if (!selectedTenantId) {
        setSettings(
          structuredClone(
            DEFAULT_SETTINGS,
          ),
        );

        setSavedSettings(
          structuredClone(
            DEFAULT_SETTINGS,
          ),
        );

        setCouriers([]);
        setIsLoading(false);
        setIsRefreshing(false);

        setError(
          "Please select a tenant before continuing.",
        );

        return;
      }

      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const [
          settingsResponse,
          couriersResponse,
        ] = await Promise.all([
          tenantFetch(
            "/api/courier-settings",
            {
              method: "GET",
              cache: "no-store",
            },
          ),

          tenantFetch(
            "/api/couriers?limit=100",
            {
              method: "GET",
              cache: "no-store",
            },
          ),
        ]);

        const settingsPayload =
          (await settingsResponse
            .json()
            .catch(
              () => null,
            )) as CourierSettingsResponse | null;

        const couriersPayload =
          (await couriersResponse
            .json()
            .catch(
              () => null,
            )) as CouriersResponse | null;

        if (!settingsResponse.ok) {
          throw new Error(
            getErrorMessage(
              settingsPayload,
              "Unable to load courier settings.",
            ),
          );
        }

        if (!couriersResponse.ok) {
          throw new Error(
            getErrorMessage(
              couriersPayload,
              "Unable to load courier providers.",
            ),
          );
        }

        const normalizedSettings =
          normalizeSettings(
            settingsPayload?.data
              ?.settings,
          );

        const normalizedCouriers =
          (
            couriersPayload?.data
              ?.couriers || []
          )
            .map(normalizeCourier)
            .filter(
              (
                courier,
              ): courier is CourierOption =>
                Boolean(courier),
            );

        if (!mountedRef.current) {
          return;
        }

        setSettings(
          normalizedSettings,
        );
        setSavedSettings(
          structuredClone(
            normalizedSettings,
          ),
        );
        setCouriers(
          normalizedCouriers,
        );

        if (showRefreshState) {
          setMessage(
            "Courier settings refreshed successfully.",
          );
        }
      } catch (loadError) {
        if (!mountedRef.current) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong while loading courier settings.",
        );
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [selectedTenantId],
  );

  useEffect(() => {
    setSettings(
      structuredClone(
        DEFAULT_SETTINGS,
      ),
    );

    setSavedSettings(
      structuredClone(
        DEFAULT_SETTINGS,
      ),
    );

    setCouriers([]);
    setError(null);
    setMessage(null);

    void loadPageData();
  }, [
    loadPageData,
    selectedTenantId,
  ]);

  useEffect(() => {
    const handleCourierSettingsUpdated =
      () => {
        void loadPageData(true);
      };

    window.addEventListener(
      "couriers-updated",
      handleCourierSettingsUpdated,
    );

    window.addEventListener(
      "courier-settings-updated",
      handleCourierSettingsUpdated,
    );

    return () => {
      window.removeEventListener(
        "couriers-updated",
        handleCourierSettingsUpdated,
      );

      window.removeEventListener(
        "courier-settings-updated",
        handleCourierSettingsUpdated,
      );
    };
  }, [loadPageData]);

  const hasUnsavedChanges =
    useMemo(
      () =>
        JSON.stringify(settings) !==
        JSON.stringify(savedSettings),
      [settings, savedSettings],
    );

  const activeCouriers =
    useMemo(
      () =>
        couriers.filter(
          (courier) =>
            courier.isActive,
        ),
      [couriers],
    );

  const selectedCourier =
    useMemo(
      () =>
        couriers.find(
          (courier) =>
            courier.id ===
            settings.defaultCourier,
        ) || null,
      [
        couriers,
        settings.defaultCourier,
      ],
    );

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [hasUnsavedChanges]);

  const updateTopLevel = <
    K extends keyof CourierSettings,
  >(
    field: K,
    value: CourierSettings[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
    setMessage(null);
  };

  const updateSection = <
    K extends
      | "automation"
      | "statusSync"
      | "cod"
      | "deliveryCharge"
      | "returnCharge"
      | "addressValidation"
      | "notifications",
  >(
    section: K,
    patch: Partial<
      CourierSettings[K]
    >,
  ) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }));

    setError(null);
    setMessage(null);
  };

  const validateSettings =
    (): string | null => {
      if (
        settings.automation
          .autoBookShipment &&
        !settings.defaultCourier
      ) {
        return "Select a default courier before enabling automatic shipment booking.";
      }

      if (
        settings.statusSync.enabled &&
        !settings.isActive
      ) {
        return "Courier settings must be active before status sync can be enabled.";
      }

      if (
        settings.statusSync
          .intervalMinutes < 5 ||
        settings.statusSync
          .intervalMinutes > 1440
      ) {
        return "Status sync interval must be between 5 and 1440 minutes.";
      }

      if (
        settings.cod.codFeeType ===
          "percentage" &&
        settings.cod.codFeeValue >
          100
      ) {
        return "Percentage-based COD fee cannot exceed 100.";
      }

      return null;
    };

  const handleSave = async () => {
    if (!selectedTenantId) {
      setError(
        "Please select a tenant before continuing.",
      );

      setMessage(null);

      return;
    }

    const validationError =
      validateSettings();

    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await tenantFetch(
          "/api/courier-settings",
          {
            method: "PUT",

            body: JSON.stringify(
              createUpdatePayload(
                settings,
              ),
            ),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as CourierSettingsResponse | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            "Unable to save courier settings.",
          ),
        );
      }

      const normalizedSettings =
        normalizeSettings(
          payload?.data?.settings,
        );

      if (!mountedRef.current) {
        return;
      }

      setSettings(
        normalizedSettings,
      );
      setSavedSettings(
        structuredClone(
          normalizedSettings,
        ),
      );

      setMessage(
        payload?.message ||
          "Courier settings saved successfully.",
      );

      window.dispatchEvent(
        new Event(
          "courier-settings-updated",
        ),
      );

      /*
        Setting a default courier also synchronizes Courier.isDefault
        on the backend. Refresh the provider list to reflect it.
      */
      const couriersResponse =
        await tenantFetch(
          "/api/couriers?limit=100",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const couriersPayload =
        (await couriersResponse
          .json()
          .catch(
            () => null,
          )) as CouriersResponse | null;

      if (
        couriersResponse.ok &&
        mountedRef.current
      ) {
        setCouriers(
          (
            couriersPayload?.data
              ?.couriers || []
          )
            .map(normalizeCourier)
            .filter(
              (
                courier,
              ): courier is CourierOption =>
                Boolean(courier),
            ),
        );
      }
    } catch (saveError) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save courier settings.",
      );
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleDiscard = () => {
    setSettings(
      structuredClone(
        savedSettings,
      ),
    );
    setError(null);
    setMessage(
      "Unsaved changes discarded.",
    );
  };

  const handleReset = async () => {
    if (!selectedTenantId) {
      setError(
        "Please select a tenant before continuing.",
      );

      setMessage(null);

      return;
    }

    const confirmed =
      window.confirm(
        "Reset all courier business settings to their defaults? This action will replace the current configuration.",
      );

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await tenantFetch(
          "/api/courier-settings/reset",
          {
            method: "POST",
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as CourierSettingsResponse | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            "Unable to reset courier settings.",
          ),
        );
      }

      const normalizedSettings =
        normalizeSettings(
          payload?.data?.settings,
        );

      if (!mountedRef.current) {
        return;
      }

      setSettings(
        normalizedSettings,
      );
      setSavedSettings(
        structuredClone(
          normalizedSettings,
        ),
      );
      setMessage(
        payload?.message ||
          "Courier settings reset successfully.",
      );

      window.dispatchEvent(
        new Event(
          "courier-settings-updated",
        ),
      );
    } catch (resetError) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset courier settings.",
      );
    } finally {
      if (mountedRef.current) {
        setIsResetting(false);
      }
    }
  };

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg shadow-orange-500/20">
              <Settings2 size={24} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  Courier Settings
                </h1>

                <StatusPill
                  active={
                    settings.isActive
                  }
                />

                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-700">
                    <AlertTriangle
                      size={13}
                    />
                    Unsaved changes
                  </span>
                )}
              </div>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                Configure courier automation, status synchronization, COD,
                delivery costs, returns, notifications and address validation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/couriers"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900]"
            >
              <ArrowLeft size={17} />
              Couriers
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadPageData(true)
              }
              disabled={
                isRefreshing ||
                isSaving ||
                isResetting
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              disabled={
                !hasUnsavedChanges ||
                isSaving ||
                isResetting
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 size={17} />
              Discard
            </button>

            <button
              type="button"
              onClick={() =>
                void handleReset()
              }
              disabled={
                isSaving ||
                isResetting
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw
                size={17}
                className={
                  isResetting
                    ? "animate-spin"
                    : ""
                }
              />
              {isResetting
                ? "Resetting..."
                : "Reset"}
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSave()
              }
              disabled={
                !hasUnsavedChanges ||
                isSaving ||
                isResetting
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save
                size={18}
                className={
                  isSaving
                    ? "animate-pulse"
                    : ""
                }
              />
              {isSaving
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span>{message}</span>
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Default Courier"
            value={
              selectedCourier?.name ||
              "Not selected"
            }
            subtitle={
              selectedCourier
                ? `${selectedCourier.code} · ${selectedCourier.providerType}`
                : "Required for automatic booking"
            }
            icon={<Truck size={22} />}
          />

          <SummaryCard
            title="Automatic Booking"
            value={
              settings.automation
                .autoBookShipment
                ? "Enabled"
                : "Disabled"
            }
            subtitle={`Trigger: ${settings.automation.autoBookOnStatus.replaceAll(
              "_",
              " ",
            )}`}
            icon={
              <Workflow size={22} />
            }
          />

          <SummaryCard
            title="Status Sync"
            value={
              settings.statusSync
                .enabled
                ? "Enabled"
                : "Disabled"
            }
            subtitle={`Every ${settings.statusSync.intervalMinutes} minutes`}
            icon={<Clock3 size={22} />}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <SettingsSection
            title="General Settings"
            description="Select the primary courier and default delivery workflow."
            icon={<Settings2 size={20} />}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Default Courier"
                value={
                  settings.defaultCourier
                }
                onChange={(value) =>
                  updateTopLevel(
                    "defaultCourier",
                    value,
                  )
                }
                hint={
                  activeCouriers.length
                    ? "Only active couriers are available."
                    : "No active courier is currently available."
                }
                options={[
                  {
                    value: "",
                    label:
                      "Select a courier",
                  },
                  ...activeCouriers.map(
                    (courier) => ({
                      value: courier.id,
                      label: `${courier.name} (${courier.code})`,
                    }),
                  ),
                ]}
              />

              <SelectField
                label="Default Delivery Type"
                value={
                  settings.defaultDeliveryType
                }
                onChange={(value) =>
                  updateTopLevel(
                    "defaultDeliveryType",
                    value as DeliveryType,
                  )
                }
                options={[
                  {
                    value: "regular",
                    label: "Regular",
                  },
                  {
                    value: "express",
                    label: "Express",
                  },
                  {
                    value: "same_day",
                    label: "Same Day",
                  },
                ]}
              />
            </div>

            <div className="mt-5">
              <SwitchRow
                label="Courier Settings Active"
                description="Disabling this prevents courier automation and status synchronization."
                checked={
                  settings.isActive
                }
                onChange={(checked) => {
                  updateTopLevel(
                    "isActive",
                    checked,
                  );

                  if (!checked) {
                    updateSection(
                      "statusSync",
                      {
                        enabled: false,
                      },
                    );
                  }
                }}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Automation"
            description="Control when and how courier shipments are booked."
            icon={<Workflow size={20} />}
          >
            <div className="space-y-3">
              <SwitchRow
                label="Automatic Shipment Booking"
                description="Book a courier shipment automatically when an order reaches the selected status."
                checked={
                  settings.automation
                    .autoBookShipment
                }
                onChange={(checked) =>
                  updateSection(
                    "automation",
                    {
                      autoBookShipment:
                        checked,
                    },
                  )
                }
              />

              <SelectField
                label="Auto-book Order Status"
                value={
                  settings.automation
                    .autoBookOnStatus
                }
                onChange={(value) =>
                  updateSection(
                    "automation",
                    {
                      autoBookOnStatus:
                        value as AutoBookStatus,
                    },
                  )
                }
                disabled={
                  !settings.automation
                    .autoBookShipment
                }
                options={[
                  {
                    value: "confirmed",
                    label: "Confirmed",
                  },
                  {
                    value: "processing",
                    label: "Processing",
                  },
                  {
                    value:
                      "ready_to_ship",
                    label:
                      "Ready to Ship",
                  },
                ]}
              />

              <SwitchRow
                label="Prevent Duplicate Booking"
                description="Stop the same order from being booked more than once."
                checked={
                  settings.automation
                    .preventDuplicateBooking
                }
                onChange={(checked) =>
                  updateSection(
                    "automation",
                    {
                      preventDuplicateBooking:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Fallback to Default Courier"
                description="Use the selected default courier when no provider is assigned to an order."
                checked={
                  settings.automation
                    .fallbackToDefaultCourier
                }
                onChange={(checked) =>
                  updateSection(
                    "automation",
                    {
                      fallbackToDefaultCourier:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Auto-print Shipping Label"
                description="Request label printing immediately after successful booking."
                checked={
                  settings.automation
                    .autoPrintLabel
                }
                onChange={(checked) =>
                  updateSection(
                    "automation",
                    {
                      autoPrintLabel:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Status Synchronization"
            description="Configure courier tracking updates and order status behavior."
            icon={<RefreshCw size={20} />}
          >
            <div className="space-y-3">
              <SwitchRow
                label="Enable Status Sync"
                description="Periodically synchronize active shipment statuses from courier providers."
                checked={
                  settings.statusSync
                    .enabled
                }
                onChange={(checked) =>
                  updateSection(
                    "statusSync",
                    {
                      enabled: checked,
                    },
                  )
                }
                disabled={
                  !settings.isActive
                }
              />

              <NumberField
                label="Sync Interval"
                value={
                  settings.statusSync
                    .intervalMinutes
                }
                onChange={(value) =>
                  updateSection(
                    "statusSync",
                    {
                      intervalMinutes:
                        value,
                    },
                  )
                }
                min={5}
                max={1440}
                suffix="minutes"
                disabled={
                  !settings.statusSync
                    .enabled
                }
                hint="Allowed range: 5–1440 minutes."
              />

              <SwitchRow
                label="Update Order Status"
                description="Apply mapped courier statuses to the related order."
                checked={
                  settings.statusSync
                    .updateOrderStatus
                }
                onChange={(checked) =>
                  updateSection(
                    "statusSync",
                    {
                      updateOrderStatus:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Mark Delivered COD Orders Paid"
                description="Automatically mark eligible COD orders as paid after confirmed delivery."
                checked={
                  settings.statusSync
                    .markDeliveredOrdersPaid
                }
                onChange={(checked) =>
                  updateSection(
                    "statusSync",
                    {
                      markDeliveredOrdersPaid:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Sync Only Active Shipments"
                description="Exclude completed and archived shipments from regular synchronization."
                checked={
                  settings.statusSync
                    .syncOnlyActiveShipments
                }
                onChange={(checked) =>
                  updateSection(
                    "statusSync",
                    {
                      syncOnlyActiveShipments:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Cash on Delivery"
            description="Control COD collection rules, limits and fees."
            icon={
              <CircleDollarSign
                size={20}
              />
            }
          >
            <div className="space-y-3">
              <SwitchRow
                label="Enable COD"
                description="Allow courier shipments to collect payment from customers."
                checked={
                  settings.cod.enabled
                }
                onChange={(checked) =>
                  updateSection("cod", {
                    enabled: checked,
                  })
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="COD Fee Type"
                  value={
                    settings.cod
                      .codFeeType
                  }
                  onChange={(value) =>
                    updateSection("cod", {
                      codFeeType:
                        value as CodFeeType,
                      ...(value === "none"
                        ? {
                            codFeeValue: 0,
                          }
                        : {}),
                    })
                  }
                  disabled={
                    !settings.cod.enabled
                  }
                  options={[
                    {
                      value: "none",
                      label: "No Fee",
                    },
                    {
                      value: "fixed",
                      label:
                        "Fixed Amount",
                    },
                    {
                      value:
                        "percentage",
                      label: "Percentage",
                    },
                  ]}
                />

                <NumberField
                  label="COD Fee Value"
                  value={
                    settings.cod
                      .codFeeValue
                  }
                  onChange={(value) =>
                    updateSection("cod", {
                      codFeeValue: value,
                    })
                  }
                  min={0}
                  max={
                    settings.cod
                      .codFeeType ===
                    "percentage"
                      ? 100
                      : undefined
                  }
                  suffix={
                    settings.cod
                      .codFeeType ===
                    "percentage"
                      ? "%"
                      : "৳"
                  }
                  disabled={
                    !settings.cod
                      .enabled ||
                    settings.cod
                      .codFeeType ===
                      "none"
                  }
                />

                <NumberField
                  label="Maximum COD Amount"
                  value={
                    settings.cod
                      .maximumCodAmount
                  }
                  onChange={(value) =>
                    updateSection("cod", {
                      maximumCodAmount:
                        value,
                    })
                  }
                  min={0}
                  suffix="৳"
                  disabled={
                    !settings.cod.enabled
                  }
                  hint="Use 0 for no maximum limit."
                />
              </div>

              <SwitchRow
                label="Include Delivery Charge in COD"
                description="Add the customer-facing delivery charge to the amount collected."
                checked={
                  settings.cod
                    .includeDeliveryChargeInCod
                }
                onChange={(checked) =>
                  updateSection("cod", {
                    includeDeliveryChargeInCod:
                      checked,
                  })
                }
              />

              <SwitchRow
                label="Allow Zero COD Amount"
                description="Permit COD shipments with no collectible amount."
                checked={
                  settings.cod
                    .allowZeroCodAmount
                }
                onChange={(checked) =>
                  updateSection("cod", {
                    allowZeroCodAmount:
                      checked,
                  })
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Delivery Charges"
            description="Define customer-facing delivery rates and delivery-type surcharges."
            icon={<Truck size={20} />}
          >
            <div className="space-y-4">
              <SwitchRow
                label="Enable Delivery Charge Rules"
                description="Use these rates when calculating delivery charges."
                checked={
                  settings.deliveryCharge
                    .enabled
                }
                onChange={(checked) =>
                  updateSection(
                    "deliveryCharge",
                    {
                      enabled: checked,
                    },
                  )
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Inside Dhaka"
                  value={
                    settings.deliveryCharge
                      .insideDhaka
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        insideDhaka:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Dhaka Sub-area"
                  value={
                    settings.deliveryCharge
                      .dhakaSubArea
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        dhakaSubArea:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Outside Dhaka"
                  value={
                    settings.deliveryCharge
                      .outsideDhaka
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        outsideDhaka:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Express Surcharge"
                  value={
                    settings.deliveryCharge
                      .expressSurcharge
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        expressSurcharge:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Same-day Surcharge"
                  value={
                    settings.deliveryCharge
                      .sameDaySurcharge
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        sameDaySurcharge:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Free Delivery Threshold"
                  value={
                    settings.deliveryCharge
                      .freeDeliveryThreshold
                  }
                  onChange={(value) =>
                    updateSection(
                      "deliveryCharge",
                      {
                        freeDeliveryThreshold:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                  hint="Use 0 to disable free delivery by order value."
                />
              </div>

              <SwitchRow
                label="Charge Customer"
                description="Include the configured delivery amount in the customer's payable total."
                checked={
                  settings.deliveryCharge
                    .chargeCustomer
                }
                onChange={(checked) =>
                  updateSection(
                    "deliveryCharge",
                    {
                      chargeCustomer:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Return & Redelivery"
            description="Record return logistics costs and refund deductions."
            icon={<RotateCcw size={20} />}
          >
            <div className="space-y-4">
              <SwitchRow
                label="Enable Return Charge Rules"
                description="Track reverse delivery and redelivery costs."
                checked={
                  settings.returnCharge
                    .enabled
                }
                onChange={(checked) =>
                  updateSection(
                    "returnCharge",
                    {
                      enabled: checked,
                    },
                  )
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Reverse Delivery Charge"
                  value={
                    settings.returnCharge
                      .reverseDeliveryCharge
                  }
                  onChange={(value) =>
                    updateSection(
                      "returnCharge",
                      {
                        reverseDeliveryCharge:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />

                <NumberField
                  label="Redelivery Charge"
                  value={
                    settings.returnCharge
                      .redeliveryCharge
                  }
                  onChange={(value) =>
                    updateSection(
                      "returnCharge",
                      {
                        redeliveryCharge:
                          value,
                      },
                    )
                  }
                  min={0}
                  suffix="৳"
                />
              </div>

              <SwitchRow
                label="Deduct Return Cost from Refund"
                description="Reduce eligible customer refunds by the configured return cost."
                checked={
                  settings.returnCharge
                    .deductFromRefund
                }
                onChange={(checked) =>
                  updateSection(
                    "returnCharge",
                    {
                      deductFromRefund:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Record as Business Expense"
                description="Make return logistics costs available to financial reporting and profit calculations."
                checked={
                  settings.returnCharge
                    .recordAsBusinessExpense
                }
                onChange={(checked) =>
                  updateSection(
                    "returnCharge",
                    {
                      recordAsBusinessExpense:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Address Validation"
            description="Set minimum address requirements before booking a shipment."
            icon={<MapPin size={20} />}
          >
            <div className="space-y-3">
              <SwitchRow
                label="Require Customer Phone"
                description="A customer phone number must be present before courier booking."
                checked={
                  settings.addressValidation
                    .requireCustomerPhone
                }
                onChange={(checked) =>
                  updateSection(
                    "addressValidation",
                    {
                      requireCustomerPhone:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Normalize Bangladesh Phone"
                description="Normalize valid Bangladesh mobile numbers before sending them to courier providers."
                checked={
                  settings.addressValidation
                    .normalizeBangladeshPhone
                }
                onChange={(checked) =>
                  updateSection(
                    "addressValidation",
                    {
                      normalizeBangladeshPhone:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Require District"
                description="District information must be available in the delivery address."
                checked={
                  settings.addressValidation
                    .requireDistrict
                }
                onChange={(checked) =>
                  updateSection(
                    "addressValidation",
                    {
                      requireDistrict:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Require Area"
                description="Area information must be available in the delivery address."
                checked={
                  settings.addressValidation
                    .requireArea
                }
                onChange={(checked) =>
                  updateSection(
                    "addressValidation",
                    {
                      requireArea:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Require Postal Code"
                description="Postal code must be supplied before shipment booking."
                checked={
                  settings.addressValidation
                    .requirePostalCode
                }
                onChange={(checked) =>
                  updateSection(
                    "addressValidation",
                    {
                      requirePostalCode:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            description="Choose which courier events should notify administrators."
            icon={<Bell size={20} />}
          >
            <div className="space-y-3">
              <SwitchRow
                label="Booking Failure"
                description="Notify administrators when courier shipment booking fails."
                checked={
                  settings.notifications
                    .notifyOnBookingFailure
                }
                onChange={(checked) =>
                  updateSection(
                    "notifications",
                    {
                      notifyOnBookingFailure:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Status Sync Failure"
                description="Notify administrators when a scheduled courier sync fails."
                checked={
                  settings.notifications
                    .notifyOnStatusSyncFailure
                }
                onChange={(checked) =>
                  updateSection(
                    "notifications",
                    {
                      notifyOnStatusSyncFailure:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Successful Delivery"
                description="Notify administrators when a shipment is confirmed as delivered."
                checked={
                  settings.notifications
                    .notifyOnDelivery
                }
                onChange={(checked) =>
                  updateSection(
                    "notifications",
                    {
                      notifyOnDelivery:
                        checked,
                    },
                  )
                }
              />

              <SwitchRow
                label="Shipment Return"
                description="Notify administrators when a shipment enters a returned state."
                checked={
                  settings.notifications
                    .notifyOnReturn
                }
                onChange={(checked) =>
                  updateSection(
                    "notifications",
                    {
                      notifyOnReturn:
                        checked,
                    },
                  )
                }
              />
            </div>
          </SettingsSection>
        </div>

        <section className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900]">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h2 className="font-black text-gray-900">
                  Configuration Safety
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
                  Changes are tenant-isolated and validated by the backend.
                  Automatic booking requires an active default courier.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void handleSave()
              }
              disabled={
                !hasUnsavedChanges ||
                isSaving ||
                isResetting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17181d] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving
                ? "Saving..."
                : "Save All Changes"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   PRESENTATION COMPONENTS
========================================================= */

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-black text-gray-900">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>
          <p className="mt-2 truncate text-xl font-black text-gray-900">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-semibold capitalize text-gray-400">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {active ? (
        <CheckCircle2 size={13} />
      ) : (
        <AlertTriangle size={13} />
      )}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition ${
        disabled
          ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
          : "cursor-pointer border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-gray-900">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>

      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.checked,
            )
          }
          className="peer sr-only"
        />

        <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-[#FF6900] peer-focus-visible:ring-4 peer-focus-visible:ring-orange-100 peer-disabled:cursor-not-allowed">
          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
        </span>
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {hint && (
        <span className="mt-1.5 block text-xs leading-5 text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  hint,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (
    value: number,
  ) => void;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <span className="relative mt-2 block">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => {
            const parsedValue =
              Number(
                event.target.value,
              );

            onChange(
              Number.isFinite(
                parsedValue,
              )
                ? Math.max(
                    min ?? 0,
                    max === undefined
                      ? parsedValue
                      : Math.min(
                          parsedValue,
                          max,
                        ),
                  )
                : 0,
            );
          }}
          className={`h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60 ${
            suffix ? "pr-20" : ""
          }`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gray-400">
            {suffix}
          </span>
        )}
      </span>

      {hint && (
        <span className="mt-1.5 block text-xs leading-5 text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function SettingsPageSkeleton() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] animate-pulse">
        <div className="mb-7 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gray-200" />
          <div>
            <div className="h-7 w-64 rounded bg-gray-200" />
            <div className="mt-3 h-4 w-96 max-w-full rounded bg-gray-100" />
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="h-28 rounded-2xl border border-gray-200 bg-white"
              />
            ),
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {[
            1, 2, 3, 4, 5, 6,
            7, 8,
          ].map((item) => (
            <div
              key={item}
              className="h-80 rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
