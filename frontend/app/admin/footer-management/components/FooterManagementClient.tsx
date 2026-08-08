"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
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

type FooterLink = {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
};

type FooterSettings = {
  businessName: string;
  logo: string;
  description: string;

  phone: string;
  email: string;
  address: string;

  facebook: string;
  instagram: string;
  youtube: string;
  linkedin: string;

  googleMapUrl: string;

  footerLinks: FooterLink[];

  copyrightText: string;

  isActive: boolean;
};

type FooterSettingsResponse = {
  success: boolean;
  message?: string;
  data?: Partial<FooterSettings>;
};

type ImageUploadResponse = {
  success?: boolean;
  message?: string;
  imageUrl?: string;
};

/* =========================================================
   DEFAULTS
========================================================= */

const defaultFooterSettings: FooterSettings = {
  businessName: "",
  logo: "",
  description: "",

  phone: "",
  email: "",
  address: "",

  facebook: "",
  instagram: "",
  youtube: "",
  linkedin: "",

  googleMapUrl: "",

  footerLinks: [],

  copyrightText: "",

  isActive: true,
};

/* =========================================================
   HELPERS
========================================================= */

const getStoredValue = (
  keys: string[],
) => {
  for (const key of keys) {
    const value =
      localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "";
};

/* =========================================================
   FOOTER MANAGEMENT CLIENT
========================================================= */

export default function FooterManagementClient() {
  const {
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    settings,
    setSettings,
  ] =
    useState<FooterSettings>(
      defaultFooterSettings,
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
    isUploadingLogo,
    setIsUploadingLogo,
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
     LOAD FOOTER SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      if (loadingTenants) {
        return;
      }

      if (!selectedTenantId) {
        setSettings(
          defaultFooterSettings,
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
         * Clear previous tenant data before
         * loading the newly selected tenant.
         */
        setSettings(
          defaultFooterSettings,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/footer-settings`,
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
            | FooterSettingsResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load footer settings.",
          );
        }

        const data =
          payload.data ?? {};

        setSettings({
          ...defaultFooterSettings,
          ...data,

          footerLinks:
            Array.isArray(
              data.footerLinks,
            )
              ? data.footerLinks
              : [],
        });
      } catch (error) {
        console.error(
          "Footer settings load error:",
          error,
        );

        setSettings(
          defaultFooterSettings,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load footer settings.",
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
     AUTO RELOAD ON TENANT CHANGE
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
    K extends keyof FooterSettings,
  >(
    field: K,
    value: FooterSettings[K],
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
     UPLOAD FOOTER LOGO
  ======================================================= */

  async function uploadFooterLogo(
    file: File,
  ) {
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

          body:
            formData,
        },
      );

    const payload =
      (await response
        .json()
        .catch(
          () => null,
        )) as
        | ImageUploadResponse
        | null;

    if (
      !response.ok ||
      !payload?.success ||
      !payload.imageUrl
    ) {
      throw new Error(
        payload?.message ||
          "Footer logo upload failed.",
      );
    }

    return payload.imageUrl;
  }

  /* =======================================================
     FOOTER LOGO CHANGE
  ======================================================= */

  async function handleFooterLogoChange(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setErrorMessage(
        "Only JPG, PNG and WEBP images are allowed.",
      );

      event.target.value = "";

      return;
    }

    const maxFileSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxFileSize
    ) {
      setErrorMessage(
        "Footer logo must not exceed 5 MB.",
      );

      event.target.value = "";

      return;
    }

    try {
      setIsUploadingLogo(true);

      setErrorMessage("");
      setSuccessMessage("");

      const imageUrl =
        await uploadFooterLogo(
          file,
        );

      updateSetting(
        "logo",
        imageUrl,
      );

      setSuccessMessage(
        "Footer logo uploaded successfully. Click Save Settings to save it.",
      );
    } catch (error) {
      console.error(
        "Footer logo upload error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Footer logo upload failed.",
      );
    } finally {
      setIsUploadingLogo(false);

      event.target.value = "";
    }
  }

  /* =======================================================
     REMOVE FOOTER LOGO
  ======================================================= */

  function removeFooterLogo() {
    updateSetting(
      "logo",
      "",
    );

    setSuccessMessage(
      "Footer logo removed. Click Save Settings to save the change.",
    );
  }

  /* =======================================================
     FOOTER LINKS
  ======================================================= */

  function addFooterLink() {
    updateSetting(
      "footerLinks",
      [
        ...settings.footerLinks,

        {
          label: "",
          url: "",
          enabled: true,
          order:
            settings.footerLinks.length +
            1,
        },
      ],
    );
  }

  function updateFooterLink(
    index: number,
    field: keyof FooterLink,
    value:
      | string
      | boolean
      | number,
  ) {
    const updatedLinks =
      settings.footerLinks.map(
        (
          item,
          itemIndex,
        ) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
      );

    updateSetting(
      "footerLinks",
      updatedLinks,
    );
  }

  function removeFooterLink(
    index: number,
  ) {
    const updatedLinks =
      settings.footerLinks
        .filter(
          (
            _,
            itemIndex,
          ) =>
            itemIndex !== index,
        )
        .map(
          (
            item,
            itemIndex,
          ) => ({
            ...item,
            order:
              itemIndex + 1,
          }),
        );

    updateSetting(
      "footerLinks",
      updatedLinks,
    );
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  async function saveSettings() {
    if (!selectedTenantId) {
      setErrorMessage(
        "Please select a tenant before saving footer settings.",
      );

      return;
    }

    try {
      setIsSaving(true);

      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await fetch(
          `${API_BASE_URL}/api/footer-settings`,
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
          | FooterSettingsResponse
          | null;

      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
            "Failed to save footer settings.",
        );
      }

      if (payload.data) {
        setSettings(
          (current) => ({
            ...current,
            ...payload.data,

            footerLinks:
              Array.isArray(
                payload.data
                  ?.footerLinks,
              )
                ? payload.data
                    .footerLinks
                : current.footerLinks,
          }),
        );
      }

      setSuccessMessage(
        payload.message ||
          "Footer settings saved successfully.",
      );

      window.dispatchEvent(
        new CustomEvent(
          "footer-settings-updated",
        ),
      );
    } catch (error) {
      console.error(
        "Footer settings save error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save footer settings.",
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

          Loading footer settings...
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
            Manage the business information shown in the footer.
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* BUSINESS NAME */}

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Business Name
            </label>

            <input
              type="text"
              value={
                settings.businessName
              }
              onChange={(event) =>
                updateSetting(
                  "businessName",
                  event.target.value,
                )
              }
              placeholder="Enter business name"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
            />
          </div>

          {/* FOOTER LOGO */}

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Footer Logo
            </label>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
                {settings.logo ? (
                  <img
                    src={
                      settings.logo
                    }
                    alt={
                      settings.businessName
                        ? `${settings.businessName} footer logo`
                        : "Footer logo"
                    }
                    className="max-h-[110px] max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon
                      size={34}
                      className="mx-auto"
                    />

                    <p className="mt-2 text-sm font-bold">
                      No footer logo uploaded
                    </p>

                    <p className="mt-1 text-xs">
                      JPG, PNG or WEBP
                    </p>
                  </div>
                )}
              </div>

              <input
                id="footer-logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={
                  isUploadingLogo
                }
                onChange={
                  handleFooterLogoChange
                }
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <label
                  htmlFor="footer-logo-upload"
                  className={`inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#102B50] ${
                    isUploadingLogo
                      ? "pointer-events-none opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  {isUploadingLogo ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Upload
                      size={16}
                    />
                  )}

                  {isUploadingLogo
                    ? "Uploading..."
                    : settings.logo
                      ? "Change Footer Logo"
                      : "Upload Footer Logo"}
                </label>

                {settings.logo && (
                  <button
                    type="button"
                    disabled={
                      isUploadingLogo
                    }
                    onClick={
                      removeFooterLogo
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2
                      size={16}
                    />

                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Short Description
          </label>

          <textarea
            rows={3}
            value={
              settings.description
            }
            onChange={(event) =>
              updateSetting(
                "description",
                event.target.value,
              )
            }
            placeholder="Write a short description about your business."
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
          />
        </div>
      </section>

      {/* ===================================================
          CONTACT INFORMATION
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Contact Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add the contact details shown in the storefront footer.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Phone
            </label>

            <input
              type="text"
              value={
                settings.phone
              }
              onChange={(event) =>
                updateSetting(
                  "phone",
                  event.target.value,
                )
              }
              placeholder="+8801XXXXXXXXX"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={
                settings.email
              }
              onChange={(event) =>
                updateSetting(
                  "email",
                  event.target.value,
                )
              }
              placeholder="info@example.com"
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Address
          </label>

          <textarea
            rows={3}
            value={
              settings.address
            }
            onChange={(event) =>
              updateSetting(
                "address",
                event.target.value,
              )
            }
            placeholder="Enter business address"
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-orange-300"
          />
        </div>
      </section>

      {/* ===================================================
          SOCIAL LINKS
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Social Links
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add the social pages for this tenant.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            {
              label:
                "Facebook",
              field:
                "facebook" as const,
            },

            {
              label:
                "Instagram",
              field:
                "instagram" as const,
            },

            {
              label:
                "YouTube",
              field:
                "youtube" as const,
            },

            {
              label:
                "LinkedIn",
              field:
                "linkedin" as const,
            },
          ].map(
            (item) => (
              <div
                key={
                  item.field
                }
              >
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {
                    item.label
                  }
                </label>

                <input
                  type="text"
                  value={
                    settings[
                      item.field
                    ]
                  }
                  onChange={(event) =>
                    updateSetting(
                      item.field,
                      event.target.value,
                    )
                  }
                  placeholder={`${item.label} link`}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
                />
              </div>
            ),
          )}
        </div>
      </section>

      {/* ===================================================
          GOOGLE MAP
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Google Map
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add the Google Map link for this business.
          </p>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Google Map Link
          </label>

          <input
            type="text"
            value={
              settings.googleMapUrl
            }
            onChange={(event) =>
              updateSetting(
                "googleMapUrl",
                event.target.value,
              )
            }
            placeholder="https://maps.google.com/..."
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
          />
        </div>
      </section>

      {/* ===================================================
          FOOTER LINKS
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Footer Links
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add simple useful links to the footer.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addFooterLink
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus
              size={16}
            />

            Add Link
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {settings.footerLinks
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
              No footer link added yet.
            </div>
          ) : (
            settings.footerLinks.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <input
                    type="text"
                    value={
                      item.label
                    }
                    onChange={(event) =>
                      updateFooterLink(
                        index,
                        "label",
                        event.target.value,
                      )
                    }
                    placeholder="About Us"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <input
                    type="text"
                    value={
                      item.url
                    }
                    onChange={(event) =>
                      updateFooterLink(
                        index,
                        "url",
                        event.target.value,
                      )
                    }
                    placeholder="/about"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <input
                      type="checkbox"
                      checked={
                        item.enabled
                      }
                      onChange={(event) =>
                        updateFooterLink(
                          index,
                          "enabled",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-[#FF6900]"
                    />

                    Show
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      removeFooterLink(
                        index,
                      )
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    aria-label="Remove footer link"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>
              ),
            )
          )}
        </div>
      </section>

      {/* ===================================================
          COPYRIGHT
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Copyright
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set the copyright text shown at the bottom of the footer.
          </p>
        </div>

        <div className="mt-5">
          <input
            type="text"
            value={
              settings.copyrightText
            }
            onChange={(event) =>
              updateSetting(
                "copyrightText",
                event.target.value,
              )
            }
            placeholder="© 2026 Your Business. All rights reserved."
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
          />
        </div>
      </section>

      {/* ===================================================
          SAVE
      =================================================== */}

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-[#0B1F3A]">
            Save Footer Settings
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
              isUploadingLogo ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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
              isUploadingLogo ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
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