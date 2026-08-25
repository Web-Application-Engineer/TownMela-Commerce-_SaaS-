"use client";

import Image from "next/image";

import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Save,
  Search,
  XCircle,
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
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

type AdminProduct = {
  _id: string;
  name: string;
  image?: string;
  stock?: number;
};

type CampaignStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "closed";

type Campaign = {
  _id?: string;
  name: string;
  enabled: boolean;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  discountType:
    | "percentage"
    | "fixed";
  discountValue: number;
  products: string[];
  timerEnabled: boolean;
  popupEnabled: boolean;
  popupBanner: string;
  popupAltText: string;
  campaignBanner: string;
};

type CampaignResponse = {
  success: boolean;
  campaign:
    | Campaign
    | null;
  message?: string;
};

type ProductsResponse = {
  success?: boolean;
  products?: AdminProduct[];
  message?: string;
};

const TOKEN_KEYS = [
  "townmelaAdminToken",
  "accessToken",
  "token",
  "authToken",
  "adminToken",
  "jwt",
] as const;

const defaultForm = {
  name:
    "Stock Clearance Discount",
  enabled:
    false,
  startsAt:
    "",
  endsAt:
    "",
  discountType:
    "percentage" as
      | "percentage"
      | "fixed",
  discountValue:
    "0",
  products:
    [] as string[],
  timerEnabled:
    true,
  popupEnabled:
    true,
  popupBanner:
    "",
  popupAltText:
    "Stock Clearance Discount",
  campaignBanner:
    "",
};

const getToken = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (
    const key of
    TOKEN_KEYS
  ) {
    const value =
      window.localStorage
        .getItem(key)
        ?.trim() ||
      "";

    if (value) {
      return value;
    }
  }

  return "";
};

const toLocalInputValue = (
  value:
    | string
    | null
    | undefined,
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
      offset,
  )
    .toISOString()
    .slice(
      0,
      16,
    );
};

const toIsoValue = (
  value: string,
) => {
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? ""
    : date.toISOString();
};

export default function StockClearanceAdminPage() {
  const {
    selectedTenantId,
    loadingTenants,
  } =
    useTenant();

  const [
    form,
    setForm,
  ] =
    useState(
      defaultForm,
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      CampaignStatus
    >(
      "closed",
    );

  const [
    products,
    setProducts,
  ] =
    useState<
      AdminProduct[]
    >(
      [],
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false,
    );

  const [
    uploading,
    setUploading,
  ] =
    useState<
      "popupBanner" |
      "campaignBanner" |
      ""
    >(
      "",
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      "",
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      "",
    );

  const getHeaders =
    useCallback(
      (
        json =
          true,
      ): HeadersInit => {
        const token =
          getToken();

        if (!token) {
          throw new Error(
            "Admin session was not found.",
          );
        }

        if (
          !selectedTenantId
        ) {
          throw new Error(
            "Please select a tenant first.",
          );
        }

        return {
          Accept:
            "application/json",

          ...(json
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),

          Authorization:
            `Bearer ${token}`,

          "X-Tenant-Id":
            selectedTenantId,
        };
      },
      [
        selectedTenantId,
      ],
    );

  const loadData =
    useCallback(
      async (
        signal?:
          AbortSignal,
      ) => {
        if (
          loadingTenants
        ) {
          return;
        }

        if (
          !selectedTenantId
        ) {
          setForm(
            defaultForm,
          );
          setProducts(
            [],
          );
          setStatus(
            "closed",
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

          const headers =
            getHeaders();

          const [
            campaignResponse,
            productsResponse,
          ] =
            await Promise.all([
              fetch(
                `${API_BASE_URL}/api/stock-clearance/admin`,
                {
                  method:
                    "GET",
                  headers,
                  cache:
                    "no-store",
                  signal,
                },
              ),

              fetch(
                `${API_BASE_URL}/api/products`,
                {
                  method:
                    "GET",
                  headers,
                  cache:
                    "no-store",
                  signal,
                },
              ),
            ]);

          const campaignData =
            (await campaignResponse
              .json()
              .catch(
                () => null,
              )) as
              | CampaignResponse
              | null;

          const productsData =
            (await productsResponse
              .json()
              .catch(
                () => null,
              )) as
              | ProductsResponse
              | AdminProduct[]
              | null;

          if (
            !campaignResponse.ok ||
            !campaignData?.success
          ) {
            throw new Error(
              campaignData?.message ||
                "Campaign could not be loaded.",
            );
          }

          if (
            !productsResponse.ok
          ) {
            throw new Error(
              !Array.isArray(
                productsData,
              )
                ? productsData?.message ||
                    "Products could not be loaded."
                : "Products could not be loaded.",
            );
          }

          setProducts(
            Array.isArray(
              productsData,
            )
              ? productsData
              : Array.isArray(
                    productsData?.products,
                  )
                ? productsData.products
                : [],
          );

          const campaign =
            campaignData.campaign;

          if (!campaign) {
            setForm(
              defaultForm,
            );
            setStatus(
              "closed",
            );
            return;
          }

          setStatus(
            campaign.status,
          );

          setForm({
            name:
              campaign.name ||
              defaultForm.name,

            enabled:
              campaign.enabled ===
              true,

            startsAt:
              toLocalInputValue(
                campaign.startsAt,
              ),

            endsAt:
              toLocalInputValue(
                campaign.endsAt,
              ),

            discountType:
              campaign.discountType ===
              "fixed"
                ? "fixed"
                : "percentage",

            discountValue:
              String(
                campaign.discountValue ??
                  0,
              ),

            products:
              Array.isArray(
                campaign.products,
              )
                ? campaign.products
                : [],

            timerEnabled:
              campaign.timerEnabled !==
              false,

            popupEnabled:
              campaign.popupEnabled !==
              false,

            popupBanner:
              campaign.popupBanner ||
              "",

            popupAltText:
              campaign.popupAltText ||
              defaultForm.popupAltText,

            campaignBanner:
              campaign.campaignBanner ||
              "",
          });
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Campaign could not be loaded.",
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setIsLoading(
              false,
            );
          }
        }
      },
      [
        getHeaders,
        loadingTenants,
        selectedTenantId,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadData(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [
    loadData,
  ]);

  const filteredProducts =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return query
          ? products.filter(
              (
                product,
              ) =>
                product.name
                  ?.toLowerCase()
                  .includes(
                    query,
                  ),
            )
          : products;
      },
      [
        products,
        search,
      ],
    );

  const selectedIds =
    useMemo(
      () =>
        new Set(
          form.products,
        ),
      [
        form.products,
      ],
    );

  const toggleProduct = (
    productId: string,
  ) => {
    setForm(
      (
        current,
      ) => {
        const next =
          new Set(
            current.products,
          );

        if (
          next.has(
            productId,
          )
        ) {
          next.delete(
            productId,
          );
        } else {
          next.add(
            productId,
          );
        }

        return {
          ...current,
          products:
            Array.from(
              next,
            ),
        };
      },
    );
  };

  const uploadImage =
    async (
      field:
        | "popupBanner"
        | "campaignBanner",

      file:
        | File
        | undefined,
    ) => {
      if (!file) {
        return;
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type,
        )
      ) {
        setErrorMessage(
          "Only JPG, PNG and WEBP images are allowed.",
        );
        return;
      }

      if (
        file.size >
        5 *
          1024 *
          1024
      ) {
        setErrorMessage(
          "Image must not exceed 5 MB.",
        );
        return;
      }

      try {
        setUploading(
          field,
        );
        setErrorMessage(
          "",
        );

        const body =
          new FormData();

        body.append(
          "image",
          file,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/uploads/image`,
            {
              method:
                "POST",
              headers:
                getHeaders(
                  false,
                ),
              body,
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | {
                success?: boolean;
                imageUrl?: string;
                message?: string;
              }
            | null;

        if (
          !response.ok ||
          !payload?.success ||
          !payload.imageUrl
        ) {
          throw new Error(
            payload?.message ||
              "Image upload failed.",
          );
        }

        setForm(
          (
            current,
          ) => ({
            ...current,
            [field]:
              payload.imageUrl!,
          }),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Image upload failed.",
        );
      } finally {
        setUploading(
          "",
        );
      }
    };

  const handleSave =
    async () => {
      if (
        isSaving
      ) {
        return;
      }

      const startsAt =
        toIsoValue(
          form.startsAt,
        );

      const endsAt =
        toIsoValue(
          form.endsAt,
        );

      if (
        !startsAt ||
        !endsAt
      ) {
        setErrorMessage(
          "Start date/time and end date/time are required.",
        );
        return;
      }

      if (
        new Date(
          endsAt,
        ) <=
        new Date(
          startsAt,
        )
      ) {
        setErrorMessage(
          "End date/time must be after start date/time.",
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
            `${API_BASE_URL}/api/stock-clearance`,
            {
              method:
                "PUT",
              headers:
                getHeaders(),
              body:
                JSON.stringify({
                  name:
                    form.name
                      .trim() ||
                    defaultForm.name,

                  enabled:
                    form.enabled,

                  startsAt,
                  endsAt,

                  discountType:
                    form.discountType,

                  discountValue:
                    Number(
                      form.discountValue,
                    ) ||
                    0,

                  products:
                    form.products,

                  timerEnabled:
                    form.timerEnabled,

                  popupEnabled:
                    form.popupEnabled,

                  popupBanner:
                    form.popupBanner
                      .trim(),

                  popupAltText:
                    form.popupAltText
                      .trim() ||
                    form.name
                      .trim() ||
                    defaultForm.popupAltText,

                  campaignBanner:
                    form.campaignBanner
                      .trim(),
                }),
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | CampaignResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Campaign could not be saved.",
          );
        }

        setSuccessMessage(
          "Stock Clearance campaign saved successfully.",
        );

        await loadData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Campaign could not be saved.",
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  const handleClose =
    async () => {
      if (
        isSaving ||
        !window.confirm(
          "Close this Stock Clearance campaign now?",
        )
      ) {
        return;
      }

      try {
        setIsSaving(
          true,
        );
        setErrorMessage(
          "",
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/stock-clearance/close`,
            {
              method:
                "PATCH",
              headers:
                getHeaders(),
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | CampaignResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Campaign could not be closed.",
          );
        }

        setSuccessMessage(
          "Stock Clearance campaign closed.",
        );

        await loadData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Campaign could not be closed.",
        );
      } finally {
        setIsSaving(
          false,
        );
      }
    };

  const statusClass =
    status ===
    "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status ===
          "scheduled"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status ===
            "ended"
          ? "border-slate-200 bg-slate-100 text-slate-700"
          : "border-red-200 bg-red-50 text-red-700";

  if (
    isLoading ||
    loadingTenants
  ) {
    return (
      <main className="min-h-screen bg-[#F6F7F9]">
        <div className="flex min-h-[450px] items-center justify-center">
          <LoaderCircle
            size={34}
            className="animate-spin text-[#FF6900]"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F7F9] px-3 py-5 sm:px-5 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px] space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6900]">
                Campaign Management
              </p>

              <h1 className="mt-1 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
                Stock Clearance
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Configure campaign products, discount, timer and popup for the active tenant.
              </p>
            </div>

            <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-black capitalize ${statusClass}`}>
              <Clock3
                size={16}
              />

              {
                status
              }
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {
              errorMessage
            }
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {
              successMessage
            }
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Campaign Name
              </span>

              <input
                value={
                  form.name
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      }),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#FF6900]"
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-center justify-between self-end rounded-xl border border-slate-300 px-4">
              <span className="text-sm font-bold text-slate-800">
                Campaign Enabled
              </span>

              <input
                type="checkbox"
                checked={
                  form.enabled
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        enabled:
                          event.target
                            .checked,
                      }),
                    )
                }
                className="h-5 w-5 accent-[#FF6900]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Start Date & Time
              </span>

              <input
                type="datetime-local"
                value={
                  form.startsAt
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        startsAt:
                          event.target
                            .value,
                      }),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#FF6900]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-800">
                End Date & Time
              </span>

              <input
                type="datetime-local"
                value={
                  form.endsAt
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        endsAt:
                          event.target
                            .value,
                      }),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#FF6900]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Discount Type
              </span>

              <select
                value={
                  form.discountType
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        discountType:
                          event.target
                            .value ===
                          "fixed"
                            ? "fixed"
                            : "percentage",
                      }),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#FF6900]"
              >
                <option value="percentage">
                  Percentage
                </option>

                <option value="fixed">
                  Fixed Amount
                </option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-800">
                Discount Value
              </span>

              <input
                type="number"
                min={0}
                max={
                  form.discountType ===
                  "percentage"
                    ? 100
                    : undefined
                }
                step="0.01"
                value={
                  form.discountValue
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        discountValue:
                          event.target
                            .value,
                      }),
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#FF6900]"
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-300 px-4">
              <span className="text-sm font-bold text-slate-800">
                Show Timer
              </span>

              <input
                type="checkbox"
                checked={
                  form.timerEnabled
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        timerEnabled:
                          event.target
                            .checked,
                      }),
                    )
                }
                className="h-5 w-5 accent-[#FF6900]"
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-300 px-4">
              <span className="text-sm font-bold text-slate-800">
                Show Popup When Live
              </span>

              <input
                type="checkbox"
                checked={
                  form.popupEnabled
                }
                onChange={
                  (
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        popupEnabled:
                          event.target
                            .checked,
                      }),
                    )
                }
                className="h-5 w-5 accent-[#FF6900]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Campaign Images
          </h2>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {[
              {
                field:
                  "campaignBanner" as const,
                label:
                  "Stock Clearance Page Banner",
              },
              {
                field:
                  "popupBanner" as const,
                label:
                  "Popup Banner",
              },
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item.field
                  }
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800">
                      {
                        item.label
                      }
                    </p>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#FF6900]">
                      {uploading ===
                      item.field ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <ImagePlus
                          size={15}
                        />
                      )}

                      Upload

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={
                          Boolean(
                            uploading,
                          )
                        }
                        className="hidden"
                        onChange={
                          (
                            event,
                          ) =>
                            void uploadImage(
                              item.field,
                              event.target
                                .files?.[0],
                            )
                        }
                      />
                    </label>
                  </div>

                  {form[
                    item.field
                  ] ? (
                    <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-slate-100">
                      <Image
                        src={
                          form[
                            item.field
                          ]
                        }
                        alt={
                          item.label
                        }
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-400">
                      No image uploaded
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#0B1F3A]">
                Campaign Products
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selected: {
                  form.products
                    .length
                }
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={
                  search
                }
                onChange={
                  (
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                }
                placeholder="Search products..."
                className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#FF6900]"
              />
            </div>
          </div>

          <div className="mt-5 grid max-h-[520px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map(
              (
                product,
              ) => {
                const selected =
                  selectedIds.has(
                    product._id,
                  );

                return (
                  <button
                    key={
                      product._id
                    }
                    type="button"
                    onClick={() =>
                      toggleProduct(
                        product._id,
                      )
                    }
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-[#FF6900] bg-orange-50"
                        : "border-slate-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {product.image ? (
                        <Image
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-slate-800">
                        {
                          product.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Stock: {
                          Number(
                            product.stock,
                          ) ||
                          0
                        }
                      </p>
                    </div>

                    {selected ? (
                      <CheckCircle2
                        size={20}
                        className="shrink-0 text-[#FF6900]"
                      />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full border border-slate-300" />
                    )}
                  </button>
                );
              },
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() =>
              void handleClose()
            }
            disabled={
              isSaving ||
              status ===
                "closed"
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle
              size={18}
            />

            Close Campaign
          </button>

          <button
            type="button"
            onClick={() =>
              void handleSave()
            }
            disabled={
              isSaving ||
              !selectedTenantId
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-5 text-sm font-bold text-white transition hover:bg-[#132f55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save
                size={18}
              />
            )}

            Save Campaign
          </button>
        </section>
      </div>
    </main>
  );
}
