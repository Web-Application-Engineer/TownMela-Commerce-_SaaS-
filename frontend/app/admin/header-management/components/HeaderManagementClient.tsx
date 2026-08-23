"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  Truck,
} from "lucide-react";

import {
  useTenant,
} from "@/src/context/TenantContext";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type HeaderMenuItem = {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

type HeaderSettings = {
  businessName: string;
  logo: string;
  mobileLogo: string;

  phone: string;
  email: string;

  announcementText: string;
  announcementEnabled: boolean;

  menus: HeaderMenuItem[];

  searchEnabled: boolean;
  wishlistEnabled: boolean;
  accountEnabled: boolean;
  cartEnabled: boolean;

  isActive: boolean;
};

type HeaderSettingsResponse = {
  success: boolean;
  message?: string;
  data?: Partial<HeaderSettings>;
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultHeaderSettings: HeaderSettings = {
  businessName: "",
  logo: "",
  mobileLogo: "",

  phone: "",
  email: "",

  announcementText: "",
  announcementEnabled: false,

  menus: [],

  searchEnabled: true,
  wishlistEnabled: true,
  accountEnabled: true,
  cartEnabled: true,

  isActive: true,
};

/* =========================================================
   HELPER
========================================================= */

function getStoredValue(
  keys: string[],
) {
  for (const key of keys) {
    const value =
      localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "";
}

/* =========================================================
   HEADER MANAGEMENT CLIENT
========================================================= */

export default function HeaderManagementClient() {
  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    settings,
    setSettings,
  ] =
    useState<HeaderSettings>(
      defaultHeaderSettings,
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
     HEADERS
  ======================================================= */

  const buildHeaders =
    useCallback((): HeadersInit => {
      const token =
        getStoredValue([
          "townmelaAdminToken",
          "accessToken",
          "token",
          "authToken",
          "jwt",
        ]);

      if (!token) {
        throw new Error(
          "Admin session was not found.",
        );
      }

      if (!selectedTenantId) {
        throw new Error(
          "Please select a tenant first.",
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
      selectedTenantId,
    ]);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      if (loadingTenants) {
        return;
      }

      if (!selectedTenantId) {
        setSettings(
          defaultHeaderSettings,
        );

        setErrorMessage("");
        setSuccessMessage("");
        setIsLoading(false);

        return;
      }

      try {
        setIsLoading(true);

        setErrorMessage("");
        setSuccessMessage("");

        /*
         * Clear previous tenant data first.
         */
        setSettings(
          defaultHeaderSettings,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/header-settings`,
            {
              method: "GET",

              headers:
                buildHeaders(),

              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | HeaderSettingsResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load header settings.",
          );
        }

        const data =
          payload.data ?? {};

        setSettings({
          ...defaultHeaderSettings,
          ...data,

          menus:
            Array.isArray(
              data.menus,
            )
              ? data.menus
              : [],
        });
      } catch (error) {
        console.error(
          "Header settings load error:",
          error,
        );

        setSettings(
          defaultHeaderSettings,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load header settings.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      buildHeaders,
      loadingTenants,
      selectedTenantId,
    ]);

  /* =======================================================
     TENANT CHANGE
  ======================================================= */

  useEffect(() => {
    void loadSettings();
  }, [
    loadSettings,
  ]);

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  function updateSetting<
    K extends keyof HeaderSettings,
  >(
    field: K,
    value: HeaderSettings[K],
  ) {
    setSettings(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setSuccessMessage("");
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  async function saveSettings() {
    if (!selectedTenantId) {
      setErrorMessage(
        "Please select a tenant before saving header settings.",
      );

      return;
    }

    try {
      setIsSaving(true);

      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await fetch(
          `${API_BASE_URL}/api/header-settings`,
          {
            method: "PATCH",

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

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as
          | HeaderSettingsResponse
          | null;

      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
            "Failed to save header settings.",
        );
      }

      if (payload.data) {
        setSettings(
          (current) => ({
            ...current,
            ...payload.data,

            menus:
              Array.isArray(
                payload.data
                  ?.menus,
              )
                ? payload.data
                    .menus
                : current.menus,
          }),
        );
      }

      setSuccessMessage(
        payload.message ||
          "Header settings saved successfully.",
      );

      window.dispatchEvent(
        new CustomEvent(
          "header-settings-updated",
        ),
      );
    } catch (error) {
      console.error(
        "Header settings save error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save header settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="inline-flex items-center gap-3 text-sm font-bold text-gray-500">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#FF6900]"
          />

          Loading header settings...
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* ===================================================
          ERROR / SUCCESS
      =================================================== */}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm font-semibold">
            {errorMessage}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm font-semibold">
            {successMessage}
          </p>
        </div>
      )}

      {/* ===================================================
          BUSINESS INFORMATION
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
  <div>
    <h2 className="text-lg font-black text-[#0B1F3A]">
      Business Information
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      Manage your business name and logo.
    </p>
  </div>

  {/* =====================================================
      BUSINESS NAME
  ===================================================== */}

  <div className="mt-5">
    <label className="mb-2 block text-sm font-bold text-gray-700">
      Business Name
    </label>

    <input
      type="text"
      value={settings.businessName}
      onChange={(event) =>
        updateSetting(
          "businessName",
          event.target.value,
        )
      }
      placeholder="Enter business name"
      className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
    />
  </div>

  {/* =====================================================
      LOGO UPLOADS
  ===================================================== */}

  <div className="mt-5 grid gap-5 lg:grid-cols-2">
    {/* ===================================================
        BUSINESS LOGO
    =================================================== */}

    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <h3 className="font-extrabold text-[#0B1F3A]">
          Business Logo
        </h3>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Upload your main storefront logo.
        </p>
      </div>

      <div className="mt-4 flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
        {settings.logo ? (
          <img
            src={settings.logo}
            alt={
              settings.businessName
                ? `${settings.businessName} logo`
                : "Business logo"
            }
            className="max-h-[120px] max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold text-gray-400">
              No logo uploaded
            </p>

            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG or WEBP
            </p>
          </div>
        )}
      </div>

      <input
        id="business-logo-upload"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file =
            event.target.files?.[0];

          if (!file) {
            return;
          }

          try {
            setErrorMessage("");
            setSuccessMessage("");

            const token =
              getStoredValue([
                "townmelaAdminToken",
                "accessToken",
                "token",
                "authToken",
                "jwt",
              ]);

            if (!token) {
              throw new Error(
                "Admin session was not found.",
              );
            }

            const formData =
              new FormData();

            formData.append(
              "image",
              file,
            );

            const response =
              await fetch(
                `${API_BASE_URL}/api/uploads/image`,
                {
                  method: "POST",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  body: formData,
                },
              );

            const payload =
              await response
                .json()
                .catch(() => null);

            if (
              !response.ok ||
              !payload?.success ||
              !payload?.imageUrl
            ) {
              throw new Error(
                payload?.message ||
                  "Logo upload failed.",
              );
            }

            updateSetting(
              "logo",
              payload.imageUrl,
            );

            setSuccessMessage(
              "Business logo uploaded successfully.",
            );
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Logo upload failed.",
            );
          } finally {
            event.target.value = "";
          }
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <label
          htmlFor="business-logo-upload"
          className="cursor-pointer rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#102B50]"
        >
          {settings.logo
            ? "Change Logo"
            : "Upload Logo"}
        </label>

        {settings.logo && (
          <button
            type="button"
            onClick={() =>
              updateSetting(
                "logo",
                "",
              )
            }
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
          >
            Remove
          </button>
        )}
      </div>
    </div>

    {/* ===================================================
        MOBILE LOGO
    =================================================== */}

    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <h3 className="font-extrabold text-[#0B1F3A]">
          Mobile Logo
        </h3>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Optional logo for mobile devices.
        </p>
      </div>

      <div className="mt-4 flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
        {settings.mobileLogo ? (
          <img
            src={settings.mobileLogo}
            alt={
              settings.businessName
                ? `${settings.businessName} mobile logo`
                : "Mobile logo"
            }
            className="max-h-[120px] max-w-full object-contain"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold text-gray-400">
              No mobile logo uploaded
            </p>

            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG or WEBP
            </p>
          </div>
        )}
      </div>

      <input
        id="mobile-logo-upload"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file =
            event.target.files?.[0];

          if (!file) {
            return;
          }

          try {
            setErrorMessage("");
            setSuccessMessage("");

            const token =
              getStoredValue([
                "townmelaAdminToken",
                "accessToken",
                "token",
                "authToken",
                "jwt",
              ]);

            if (!token) {
              throw new Error(
                "Admin session was not found.",
              );
            }

            const formData =
              new FormData();

            formData.append(
              "image",
              file,
            );

            const response =
              await fetch(
                `${API_BASE_URL}/api/uploads/image`,
                {
                  method: "POST",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  body: formData,
                },
              );

            const payload =
              await response
                .json()
                .catch(() => null);

            if (
              !response.ok ||
              !payload?.success ||
              !payload?.imageUrl
            ) {
              throw new Error(
                payload?.message ||
                  "Mobile logo upload failed.",
              );
            }

            updateSetting(
              "mobileLogo",
              payload.imageUrl,
            );

            setSuccessMessage(
              "Mobile logo uploaded successfully.",
            );
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Mobile logo upload failed.",
            );
          } finally {
            event.target.value = "";
          }
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <label
          htmlFor="mobile-logo-upload"
          className="cursor-pointer rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#102B50]"
        >
          {settings.mobileLogo
            ? "Change Mobile Logo"
            : "Upload Mobile Logo"}
        </label>

        {settings.mobileLogo && (
          <button
            type="button"
            onClick={() =>
              updateSetting(
                "mobileLogo",
                "",
              )
            }
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  </div>
</section>

      {/* ===================================================
          ANNOUNCEMENT BAR
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Announcement Bar
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage the phone, announcement text and email shown in the storefront top bar.
            </p>
          </div>

          <label className="inline-flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600">
              Enable
            </span>

            <input
              type="checkbox"
              checked={settings.announcementEnabled}
              onChange={(event) =>
                updateSetting(
                  "announcementEnabled",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-[#FF6900]"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Phone
            </label>

            <input
              type="text"
              value={settings.phone}
              onChange={(event) =>
                updateSetting(
                  "phone",
                  event.target.value,
                )
              }
              placeholder="+8801XXXXXXXXX"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={settings.email}
              onChange={(event) =>
                updateSetting(
                  "email",
                  event.target.value,
                )
              }
              placeholder="info@yourstore.com"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Announcement Text
          </label>

          <textarea
            rows={3}
            value={settings.announcementText}
            disabled={!settings.announcementEnabled}
            onChange={(event) =>
              updateSetting(
                "announcementText",
                event.target.value,
              )
            }
            placeholder="Example: Free delivery on orders over ৳1000"
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-[#0B1F3A] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
      </section>

      {/* ===================================================
          STOREFRONT HEADER PREVIEW
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Preview
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Live preview of the selected tenant logo and announcement bar.
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-[#17181d] text-white shadow-sm">
          {settings.isActive &&
            settings.announcementEnabled &&
            Boolean(
              settings.phone.trim() ||
                settings.announcementText.trim() ||
                settings.email.trim(),
            ) && (
              <div className="w-full bg-[#FF6900]">
                <div className="grid w-full grid-cols-1 items-center gap-1 px-3 py-1.5 text-xs font-bold text-white sm:grid-cols-3 sm:gap-3 sm:px-4">
                  <div className="flex min-w-0 items-center justify-center sm:justify-start">
                    {settings.phone.trim() ? (
                      <span className="inline-flex min-h-[26px] min-w-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#17181d] shadow-sm">
                        <Phone
                          size={15}
                          className="shrink-0 text-[#FF6900]"
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {settings.phone}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 items-center justify-center text-center">
                    {settings.announcementText.trim() ? (
                      <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
                        <Truck
                          size={15}
                          className="shrink-0"
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {settings.announcementText}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 items-center justify-center sm:justify-end">
                    {settings.email.trim() ? (
                      <span className="inline-flex min-h-[26px] min-w-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#17181d] shadow-sm">
                        <Mail
                          size={15}
                          className="shrink-0 text-[#FF6900]"
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {settings.email}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

          <div className="flex items-center px-4 py-4">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={
                  settings.businessName ||
                  "Business logo"
                }
                className="h-10 max-w-[150px] object-contain"
              />
            ) : (
              <span className="text-lg font-black">
                {settings.businessName ||
                  "Business Name"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          SAVE
      =================================================== */}      {/* ===================================================
          SAVE
      =================================================== */}

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-[#0B1F3A]">
            Save Header Settings
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Save changes for the currently selected tenant.
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
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 disabled:opacity-50"
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"
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

            {isSaving
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}