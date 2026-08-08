"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import CourierForm, {
  type CourierFormPayload,
  type CourierFormValues,
} from "@/app/admin/couriers/CourierForm";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

const getErrorMessage = (
  responseData: ApiErrorResponse | null,
  fallbackMessage: string,
) =>
  responseData?.message ||
  responseData?.error ||
  fallbackMessage;

export default function NewCourierPage() {
  const router =
    useRouter();

  const {
    selectedTenantId,
  } = useTenant();

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    serverError,
    setServerError,
  ] =
    useState<string | null>(
      null,
    );

  const handleSubmit = async (
    payload: CourierFormPayload,
    _values: CourierFormValues,
  ) => {
    if (!selectedTenantId) {
      setServerError(
        "Please select a tenant before continuing.",
      );

      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response =
        await tenantFetch(
          "/api/couriers",
          {
            method: "POST",

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const responseData =
        (await response
          .json()
          .catch(
            () => null,
          )) as
          | ApiErrorResponse
          | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseData,
            "Unable to create courier.",
          ),
        );
      }

      window.dispatchEvent(
        new Event(
          "couriers-updated",
        ),
      );

      router.push(
        "/admin/couriers?created=true",
      );

      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the courier.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel =
    () => {
      router.push(
        "/admin/couriers",
      );
    };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={
              handleCancel
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <span aria-hidden="true">
              ←
            </span>

            Back to Couriers
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Add New Courier
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Configure courier information,
              credentials, shipment settings and
              availability.
            </p>
          </div>
        </div>

        <CourierForm
          mode="create"
          isSubmitting={
            isSubmitting
          }
          serverError={
            serverError
          }
          submitLabel="Create Courier"
          onSubmit={
            handleSubmit
          }
          onCancel={
            handleCancel
          }
        />
      </div>
    </main>
  );
}
