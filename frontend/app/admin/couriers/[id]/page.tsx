"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CourierForm, {
  type CourierDeliveryType,
  type CourierFormPayload,
  type CourierFormValues,
  type CourierProviderType,
} from "@/app/admin/couriers/CourierForm";

import { useTenant } from "@/src/context/TenantContext";
import { tenantFetch } from "@/src/lib/tenantApi";

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

type CourierApiRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
  logo?: string;
  website?: string;
  supportPhone?: string;
  supportEmail?: string;
  apiBaseUrl?: string;
  isActive?: boolean;
  isDefault?: boolean;
  settings?: Partial<{
    merchantStoreId: string;
    defaultDeliveryType: string;
    autoBookShipment: boolean;
    enableStatusSync: boolean;
  }>;
};

type GetCourierResponse = ApiErrorResponse & {
  data?: { courier?: CourierApiRecord };
  courier?: CourierApiRecord;
};

const getErrorMessage = (
  data: ApiErrorResponse | null,
  fallback: string,
): string => data?.message || data?.error || fallback;

function isProviderType(
  value?: string,
): value is CourierProviderType {
  return [
    "manual",
    "pathao",
    "steadfast",
    "redx",
    "paperfly",
    "custom",
  ].includes(value ?? "");
}

function isDeliveryType(
  value?: string,
): value is CourierDeliveryType {
  return ["regular", "express", "same_day"].includes(
    value ?? "",
  );
}

function mapCourierToForm(
  courier: CourierApiRecord,
): CourierFormValues {
  const providerType = isProviderType(courier.providerType)
    ? courier.providerType
    : "manual";

  const defaultDeliveryType = isDeliveryType(
    courier.settings?.defaultDeliveryType,
  )
    ? courier.settings.defaultDeliveryType
    : "regular";

  return {
    name: courier.name ?? "",
    code: courier.code ?? "",
    providerType,
    logo: courier.logo ?? "",
    website: courier.website ?? "",
    supportPhone: courier.supportPhone ?? "",
    supportEmail: courier.supportEmail ?? "",
    apiBaseUrl: courier.apiBaseUrl ?? "",
    credentials: {
      apiKey: "",
      apiSecret: "",
      clientId: "",
      clientSecret: "",
      username: "",
      password: "",
    },
    settings: {
      merchantStoreId: courier.settings?.merchantStoreId ?? "",
      defaultDeliveryType,
      autoBookShipment:
        courier.settings?.autoBookShipment ?? false,
      enableStatusSync:
        courier.settings?.enableStatusSync ?? true,
    },
    isActive: courier.isActive ?? true,
    isDefault: courier.isDefault ?? false,
  };
}

export default function EditCourierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { selectedTenantId } = useTenant();

  const courierId =
    typeof params.id === "string" ? params.id : "";

  const [initialValues, setInitialValues] =
    useState<CourierFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] =
    useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!courierId || !selectedTenantId) {
      setInitialValues(null);
      setNotFound(false);
      setIsLoading(false);
      setServerError(
        !selectedTenantId
          ? "Please select a tenant before continuing."
          : "Courier ID is missing.",
      );
      return;
    }

    const controller = new AbortController();

    async function loadCourier() {
      setIsLoading(true);
      setServerError(null);
      setNotFound(false);
      setInitialValues(null);

      try {
        const response = await tenantFetch(
          `/api/couriers/${courierId}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = (await response
          .json()
          .catch(() => null)) as GetCourierResponse | null;

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to load courier."),
          );
        }

        const courier = data?.data?.courier ?? data?.courier;

        if (!courier) {
          throw new Error(
            "Courier data was not found in the server response.",
          );
        }

        setInitialValues(mapCourierToForm(courier));
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setServerError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the courier.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourier();

    return () => controller.abort();
  }, [courierId, selectedTenantId]);

  async function handleSubmit(
    payload: CourierFormPayload,
    _values: CourierFormValues,
  ) {
    if (!selectedTenantId) {
      setServerError(
        "Please select a tenant before continuing.",
      );
      return;
    }

    if (!courierId) {
      setServerError("Courier ID is missing.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await tenantFetch(
        `/api/couriers/${courierId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as ApiErrorResponse | null;

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to update courier."),
        );
      }

      window.dispatchEvent(new Event("couriers-updated"));

      router.push("/admin/couriers?updated=true");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the courier.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleBack = () => router.push("/admin/couriers");

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-[520px] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-[#FF6900]" />
            <h1 className="mt-5 text-xl font-black text-slate-900">
              Loading Courier
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Please wait while the courier information is being loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-[520px] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">
              Courier Not Found
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              The courier may have been removed, belongs to another tenant, or the URL is invalid.
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6900] px-5 text-sm font-extrabold text-white transition hover:bg-orange-600"
            >
              Back to Couriers
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!initialValues) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-[520px] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">
              Unable to Load Courier
            </h1>
            <p className="mt-3 text-sm text-red-600">
              {serverError ??
                "Courier information could not be loaded."}
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6900] px-5 text-sm font-extrabold text-white transition hover:bg-orange-600"
            >
              Back to Couriers
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <span aria-hidden="true">←</span>
            Back to Couriers
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Edit Courier
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Update courier information, integration settings and availability.
            </p>
          </div>
        </div>

        <CourierForm
          key={`${selectedTenantId}-${courierId}`}
          mode="edit"
          initialValues={initialValues}
          isSubmitting={isSubmitting}
          serverError={serverError}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={handleBack}
        />
      </div>
    </main>
  );
}
