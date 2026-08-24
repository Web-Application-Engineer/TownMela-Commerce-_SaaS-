"use client";

import {
  useCallback,
  useEffect,
  useRef,
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

type AdditionalSocialLink = {
  label: string;
  url: string;
  iconText: string;
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

  additionalSocialLinks:
    AdditionalSocialLink[];

  backgroundImage: string;

  popularCategoryHeading: string;
  popularCategoryLinks: FooterLink[];
  showPopularCategory: boolean;

  customerInfoHeading: string;
  customerInfoLinks: FooterLink[];
  showCustomerInfo: boolean;

  quickNavigationHeading: string;
  quickNavigationLinks: FooterLink[];
  showQuickNavigation: boolean;

  googleMapHeading: string;
  googleMapCtaText: string;
  googleMapUrl: string;
  showGoogleMap: boolean;

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

type CategoryApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  label?: string;
  categoryName?: string;
  slug?: string;
  isActive?: boolean;
  enabled?: boolean;
  status?: string;
};

type CategoriesResponse =
  | CategoryApiItem[]
  | {
      success?: boolean;
      message?: string;
      categories?: CategoryApiItem[];
      data?:
        | CategoryApiItem[]
        | {
            categories?: CategoryApiItem[];
          };
    };

type CategoryOption = {
  id: string;
  label: string;
  slug: string;
  url: string;
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

  additionalSocialLinks: [],

  backgroundImage:
    "/images/real-dhaka.webp",

  popularCategoryHeading:
    "Popular Category",

  popularCategoryLinks:
    [
    { label: "Smart Gadgets", url: "/shop?category=smart-gadgets", enabled: true, order: 1 },
    { label: "Gents Fashion", url: "/shop?category=gents-fashion", enabled: true, order: 2 },
    { label: "Phone Accessories", url: "/shop?category=phone-accessories", enabled: true, order: 3 },
    { label: "Women Fashion", url: "/shop?category=women-fashion", enabled: true, order: 4 },
    { label: "Watches", url: "/shop?category=watches", enabled: true, order: 5 },
    { label: "Electronics", url: "/shop?category=electronics", enabled: true, order: 6 },
  ],

  showPopularCategory: true,

  customerInfoHeading:
    "Customer Info",

  customerInfoLinks:
    [
    { label: "Shop", url: "/shop", enabled: true, order: 1 },
    { label: "About Us", url: "/about-us", enabled: true, order: 2 },
    { label: "Contact Us", url: "/contact-us", enabled: true, order: 3 },
    { label: "Privacy Policy", url: "/privacy-policy", enabled: true, order: 4 },
    { label: "Terms & Conditions", url: "/terms-and-conditions", enabled: true, order: 5 },
    { label: "Return & Refund Policy", url: "/return-refund-policy", enabled: true, order: 6 },
  ],

  showCustomerInfo: true,

  quickNavigationHeading:
    "Quick Navigation",

  quickNavigationLinks:
    [
    { label: "Track Orders", url: "/order-tracking", enabled: true, order: 1 },
    { label: "Cart", url: "/cart", enabled: true, order: 2 },
    { label: "Checkout", url: "/checkout", enabled: true, order: 3 },
    { label: "My Account", url: "/my-account", enabled: true, order: 4 },
    { label: "Customer Complaint", url: "/customer-complaint", enabled: true, order: 5 },
  ],

  showQuickNavigation: true,

  googleMapHeading:
    "Find us on Google Map",

  googleMapCtaText:
    "Find us on Google map",

  googleMapUrl: "",

  showGoogleMap: true,

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

function normalizeCategorySlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createCategoryOption(
  item: CategoryApiItem,
): CategoryOption | null {
  const label =
    String(
      item.name ||
        item.title ||
        item.label ||
        item.categoryName ||
        "",
    ).trim();

  const slug =
    String(item.slug || "").trim() ||
    normalizeCategorySlug(label);

  if (!label || !slug) {
    return null;
  }

  if (
    item.isActive === false ||
    item.enabled === false
  ) {
    return null;
  }

  const status =
    String(item.status || "")
      .trim()
      .toLowerCase();

  if (
    [
      "inactive",
      "disabled",
      "deleted",
    ].includes(status)
  ) {
    return null;
  }

  return {
    id: String(
      item._id ||
        item.id ||
        slug,
    ),
    label,
    slug,
    url: `/shop?category=${encodeURIComponent(
      slug,
    )}`,
  };
}


function createFooterMenuUrl(
  label: string,
) {
  const normalizedLabel =
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const knownRoutes:
    Record<string, string> = {
      shop: "/shop",
      "about us": "/about-us",
      "contact us": "/contact-us",
      "privacy policy": "/privacy-policy",
      "terms & conditions":
        "/terms-and-conditions",
      "terms and conditions":
        "/terms-and-conditions",
      "return & refund policy":
        "/return-refund-policy",
      "return and refund policy":
        "/return-refund-policy",
      "track orders":
        "/order-tracking",
      "order tracking":
        "/order-tracking",
      cart: "/cart",
      checkout: "/checkout",
      "my account":
        "/my-account",
      "customer complaint":
        "/customer-complaint",
    };

  if (!normalizedLabel) {
    return "";
  }

  if (
    knownRoutes[
      normalizedLabel
    ]
  ) {
    return knownRoutes[
      normalizedLabel
    ];
  }

  const slug =
    normalizedLabel
      .replace(/&/g, " and ")
      .replace(
        /['’]/g,
        "",
      )
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

  return slug
    ? `/${slug}`
    : "";
}

/* =========================================================
   FOOTER MANAGEMENT CLIENT
========================================================= */

export default function FooterManagementClient() {
  const {
    selectedTenant,
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

  const [
    categoryOptions,
    setCategoryOptions,
  ] =
    useState<CategoryOption[]>(
      [],
    );

  const [
    isCategoriesLoading,
    setIsCategoriesLoading,
  ] =
    useState(false);

  const [
    categoriesError,
    setCategoriesError,
  ] =
    useState("");

  /*
   * Prevent an older tenant request from overwriting
   * the newly selected tenant's footer data.
   */
  const loadRequestIdRef =
    useRef(0);

  const categoryRequestIdRef =
    useRef(0);

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
     LOAD CREATED CATEGORIES
  ======================================================= */

  const loadCategories =
    useCallback(async () => {
      const requestId =
        ++categoryRequestIdRef.current;

      if (loadingTenants) {
        return;
      }

      if (!selectedTenantId) {
        setCategoryOptions([]);
        setCategoriesError("");
        setIsCategoriesLoading(false);
        return;
      }

      try {
        setIsCategoriesLoading(true);
        setCategoriesError("");

        const response =
          await fetch(
            `${API_BASE_URL}/api/categories`,
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
            | CategoriesResponse
            | null;

        if (!response.ok) {
          const message =
            !Array.isArray(payload)
              ? payload?.message
              : "";

          throw new Error(
            message ||
              "Failed to load categories.",
          );
        }

        let categoryList:
          CategoryApiItem[] = [];

        if (Array.isArray(payload)) {
          categoryList = payload;
        } else if (
          Array.isArray(
            payload?.categories,
          )
        ) {
          categoryList =
            payload.categories;
        } else if (
          Array.isArray(
            payload?.data,
          )
        ) {
          categoryList =
            payload.data;
        } else if (
          payload?.data &&
          !Array.isArray(
            payload.data,
          ) &&
          Array.isArray(
            payload.data.categories,
          )
        ) {
          categoryList =
            payload.data.categories;
        }

        const seenSlugs =
          new Set<string>();

        const nextOptions =
          categoryList
            .map(
              createCategoryOption,
            )
            .filter(
              (
                option,
              ): option is CategoryOption =>
                Boolean(option),
            )
            .filter((option) => {
              if (
                seenSlugs.has(
                  option.slug,
                )
              ) {
                return false;
              }

              seenSlugs.add(
                option.slug,
              );

              return true;
            });

        if (
          requestId !==
          categoryRequestIdRef.current
        ) {
          return;
        }

        setCategoryOptions(
          nextOptions,
        );
      } catch (error) {
        if (
          requestId !==
          categoryRequestIdRef.current
        ) {
          return;
        }

        console.error(
          "Footer category loading error:",
          error,
        );

        setCategoryOptions([]);

        setCategoriesError(
          error instanceof Error
            ? error.message
            : "Failed to load categories.",
        );
      } finally {
        if (
          requestId ===
          categoryRequestIdRef.current
        ) {
          setIsCategoriesLoading(
            false,
          );
        }
      }
    }, [
      buildHeaders,
      loadingTenants,
      selectedTenantId,
    ]);

  /* =======================================================
     LOAD FOOTER SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      const requestId =
        ++loadRequestIdRef.current;

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

        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

        setSettings({
          ...defaultFooterSettings,
          ...data,

          additionalSocialLinks:
            Array.isArray(
              data.additionalSocialLinks,
            )
              ? data.additionalSocialLinks
              : [],

          popularCategoryLinks:
            Array.isArray(
              data.popularCategoryLinks,
            )
              ? data.popularCategoryLinks
              : defaultFooterSettings
                  .popularCategoryLinks,

          customerInfoLinks:
            Array.isArray(
              data.customerInfoLinks,
            )
              ? data.customerInfoLinks
              : defaultFooterSettings
                  .customerInfoLinks,

          quickNavigationLinks:
            Array.isArray(
              data.quickNavigationLinks,
            )
              ? data.quickNavigationLinks
              : defaultFooterSettings
                  .quickNavigationLinks,
        });
      } catch (error) {
        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

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
        if (
          requestId ===
          loadRequestIdRef.current
        ) {
          setIsLoading(false);
        }
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

  useEffect(() => {
    void loadCategories();
  }, [
    loadCategories,
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
     ADDITIONAL SOCIAL LINKS
  ======================================================= */

  function addAdditionalSocialLink() {
    updateSetting(
      "additionalSocialLinks",
      [
        ...settings.additionalSocialLinks,
        {
          label: "",
          url: "",
          iconText: "•",
          enabled: true,
          order:
            settings.additionalSocialLinks.length +
            1,
        },
      ],
    );
  }

  function updateAdditionalSocialLink(
    index: number,
    field:
      keyof AdditionalSocialLink,
    value:
      | string
      | boolean
      | number,
  ) {
    updateSetting(
      "additionalSocialLinks",
      settings.additionalSocialLinks.map(
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
      ),
    );
  }

  function removeAdditionalSocialLink(
    index: number,
  ) {
    updateSetting(
      "additionalSocialLinks",
      settings.additionalSocialLinks
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
        ),
    );
  }

  /* =======================================================
     FOOTER MENU GROUPS
  ======================================================= */

  type FooterLinkGroupField =
    | "popularCategoryLinks"
    | "customerInfoLinks"
    | "quickNavigationLinks";

  function addLinkToGroup(
    field: FooterLinkGroupField,
  ) {
    const currentLinks =
      settings[field];

    updateSetting(
      field,
      [
        ...currentLinks,
        {
          label: "",
          url: "",
          enabled: true,
          order:
            currentLinks.length + 1,
        },
      ],
    );
  }

  function updateLinkInGroup(
    field: FooterLinkGroupField,
    index: number,
    key: keyof FooterLink,
    value:
      | string
      | boolean
      | number,
  ) {
    setSettings(
      (current) => ({
        ...current,

        [field]:
          current[field].map(
            (
              item,
              itemIndex,
            ) => {
              if (
                itemIndex !== index
              ) {
                return item;
              }

              if (
                key === "label"
              ) {
                const label =
                  String(value);

                const previousAutoUrl =
                  createFooterMenuUrl(
                    item.label,
                  );

                const shouldUpdateUrl =
                  !item.url.trim() ||
                  item.url ===
                    previousAutoUrl;

                return {
                  ...item,
                  label,
                  url:
                    shouldUpdateUrl
                      ? createFooterMenuUrl(
                          label,
                        )
                      : item.url,
                };
              }

              return {
                ...item,
                [key]: value,
              };
            },
          ),
      }),
    );

    setSuccessMessage("");
  }

  function updatePopularCategorySelection(
    index: number,
    categoryUrl: string,
  ) {
    const category =
      categoryOptions.find(
        (option) =>
          option.url ===
          categoryUrl,
      );

    setSettings(
      (current) => ({
        ...current,

        popularCategoryLinks:
          current.popularCategoryLinks.map(
            (
              item,
              itemIndex,
            ) =>
              itemIndex === index
                ? {
                    ...item,
                    label:
                      category?.label ||
                      "",
                    url:
                      category?.url ||
                      "",
                  }
                : item,
          ),
      }),
    );

    setSuccessMessage("");
  }

  function removeLinkFromGroup(
    field: FooterLinkGroupField,
    index: number,
  ) {
    updateSetting(
      field,
      settings[field]
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
        ),
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

            additionalSocialLinks:
              Array.isArray(
                payload.data
                  ?.additionalSocialLinks,
              )
                ? payload.data
                    .additionalSocialLinks
                : current
                    .additionalSocialLinks,

            popularCategoryLinks:
              Array.isArray(
                payload.data
                  ?.popularCategoryLinks,
              )
                ? payload.data
                    .popularCategoryLinks
                : current
                    .popularCategoryLinks,

            customerInfoLinks:
              Array.isArray(
                payload.data
                  ?.customerInfoLinks,
              )
                ? payload.data
                    .customerInfoLinks
                : current
                    .customerInfoLinks,

            quickNavigationLinks:
              Array.isArray(
                payload.data
                  ?.quickNavigationLinks,
              )
                ? payload.data
                    .quickNavigationLinks
                : current
                    .quickNavigationLinks,
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
          ACTIVE TENANT
      =================================================== */}

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            Editing Footer For
          </p>

          <p className="mt-1 text-base font-black text-[#0B1F3A]">
            {selectedTenant?.storeName ||
              selectedTenant?.businessName ||
              "No tenant selected"}
          </p>
        </div>

        <div className="text-xs font-semibold text-gray-500">
          {selectedTenantId
            ? "Changes are saved only to this tenant."
            : "Select a tenant from the header first."}
        </div>
      </section>

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
          ADDITIONAL SOCIAL LINKS
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Additional Social Links
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add extra social profiles for this tenant.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addAdditionalSocialLink
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={16} />
            Add Social Link
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {settings.additionalSocialLinks
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
              No additional social link added yet.
            </div>
          ) : (
            settings.additionalSocialLinks.map(
              (
                item,
                index,
              ) => (
                <div
                  key={`${item.label}-${index}`}
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[150px_100px_1fr_90px_auto_auto]"
                >
                  <input
                    type="text"
                    value={item.label}
                    onChange={(event) =>
                      updateAdditionalSocialLink(
                        index,
                        "label",
                        event.target.value,
                      )
                    }
                    placeholder="TikTok"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <input
                    type="text"
                    value={item.iconText}
                    onChange={(event) =>
                      updateAdditionalSocialLink(
                        index,
                        "iconText",
                        event.target.value,
                      )
                    }
                    placeholder="♪"
                    maxLength={12}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <input
                    type="text"
                    value={item.url}
                    onChange={(event) =>
                      updateAdditionalSocialLink(
                        index,
                        "url",
                        event.target.value,
                      )
                    }
                    placeholder="https://..."
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <input
                    type="number"
                    min={1}
                    value={item.order}
                    onChange={(event) =>
                      updateAdditionalSocialLink(
                        index,
                        "order",
                        Number(
                          event.target.value,
                        ) || 1,
                      )
                    }
                    title="Order"
                    aria-label="Social link order"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        updateAdditionalSocialLink(
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
                      removeAdditionalSocialLink(
                        index,
                      )
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    aria-label="Remove additional social link"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            )
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          Example: TikTok, X, Pinterest, Telegram or another profile. Use a short icon text such as ♪, X, P or ✈.
        </p>
      </section>

      {/* ===================================================
          FOOTER APPEARANCE
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Footer Appearance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage the tenant-specific footer background image.
          </p>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Background Image URL / Path
          </label>

          <input
            type="text"
            value={
              settings.backgroundImage
            }
            onChange={(event) =>
              updateSetting(
                "backgroundImage",
                event.target.value,
              )
            }
            placeholder="/images/real-dhaka.webp"
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
          />
        </div>
      </section>

      {/* ===================================================
          POPULAR CATEGORY
      =================================================== */}

      <PopularCategoryEditor
        heading={settings.popularCategoryHeading}
        enabled={settings.showPopularCategory}
        links={settings.popularCategoryLinks}
        categories={categoryOptions}
        isCategoriesLoading={
          isCategoriesLoading
        }
        categoriesError={
          categoriesError
        }
        onHeadingChange={(value) =>
          updateSetting(
            "popularCategoryHeading",
            value,
          )
        }
        onEnabledChange={(value) =>
          updateSetting(
            "showPopularCategory",
            value,
          )
        }
        onAdd={() =>
          addLinkToGroup(
            "popularCategoryLinks",
          )
        }
        onCategoryChange={(
          index,
          categoryUrl,
        ) =>
          updatePopularCategorySelection(
            index,
            categoryUrl,
          )
        }
        onChange={(
          index,
          field,
          value,
        ) =>
          updateLinkInGroup(
            "popularCategoryLinks",
            index,
            field,
            value,
          )
        }
        onRemove={(index) =>
          removeLinkFromGroup(
            "popularCategoryLinks",
            index,
          )
        }
      />

      {/* ===================================================
          CUSTOMER INFO
      =================================================== */}

      <FooterMenuEditor
        title="Customer Info"
        description="Manage the Customer Info heading and links shown in the footer."
        heading={settings.customerInfoHeading}
        enabled={settings.showCustomerInfo}
        links={settings.customerInfoLinks}
        onHeadingChange={(value) =>
          updateSetting(
            "customerInfoHeading",
            value,
          )
        }
        onEnabledChange={(value) =>
          updateSetting(
            "showCustomerInfo",
            value,
          )
        }
        onAdd={() =>
          addLinkToGroup(
            "customerInfoLinks",
          )
        }
        onChange={(
          index,
          field,
          value,
        ) =>
          updateLinkInGroup(
            "customerInfoLinks",
            index,
            field,
            value,
          )
        }
        onRemove={(index) =>
          removeLinkFromGroup(
            "customerInfoLinks",
            index,
          )
        }
      />

      {/* ===================================================
          QUICK NAVIGATION
      =================================================== */}

      <FooterMenuEditor
        title="Quick Navigation"
        description="Manage the Quick Navigation heading and links shown in the footer."
        heading={settings.quickNavigationHeading}
        enabled={settings.showQuickNavigation}
        links={settings.quickNavigationLinks}
        onHeadingChange={(value) =>
          updateSetting(
            "quickNavigationHeading",
            value,
          )
        }
        onEnabledChange={(value) =>
          updateSetting(
            "showQuickNavigation",
            value,
          )
        }
        onAdd={() =>
          addLinkToGroup(
            "quickNavigationLinks",
          )
        }
        onChange={(
          index,
          field,
          value,
        ) =>
          updateLinkInGroup(
            "quickNavigationLinks",
            index,
            field,
            value,
          )
        }
        onRemove={(index) =>
          removeLinkFromGroup(
            "quickNavigationLinks",
            index,
          )
        }
      />

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

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Section Heading
            </label>

            <input
              type="text"
              value={
                settings.googleMapHeading
              }
              onChange={(event) =>
                updateSetting(
                  "googleMapHeading",
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Map CTA Text
            </label>

            <input
              type="text"
              value={
                settings.googleMapCtaText
              }
              onChange={(event) =>
                updateSetting(
                  "googleMapCtaText",
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-700">
          <input
            type="checkbox"
            checked={
              settings.showGoogleMap
            }
            onChange={(event) =>
              updateSetting(
                "showGoogleMap",
                event.target.checked,
              )
            }
            className="h-4 w-4 accent-[#FF6900]"
          />

          Show Google Map section
        </label>

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

/* =========================================================
   POPULAR CATEGORY EDITOR
========================================================= */

function PopularCategoryEditor({
  heading,
  enabled,
  links,
  categories,
  isCategoriesLoading,
  categoriesError,
  onHeadingChange,
  onEnabledChange,
  onAdd,
  onCategoryChange,
  onChange,
  onRemove,
}: {
  heading: string;
  enabled: boolean;
  links: FooterLink[];
  categories: CategoryOption[];
  isCategoriesLoading: boolean;
  categoriesError: string;
  onHeadingChange: (
    value: string,
  ) => void;
  onEnabledChange: (
    value: boolean,
  ) => void;
  onAdd: () => void;
  onCategoryChange: (
    index: number,
    categoryUrl: string,
  ) => void;
  onChange: (
    index: number,
    field: keyof FooterLink,
    value:
      | string
      | boolean
      | number,
  ) => void;
  onRemove: (
    index: number,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Popular Category
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select only categories already created for the current tenant.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              onEnabledChange(
                event.target.checked,
              )
            }
            className="h-4 w-4 accent-[#FF6900]"
          />

          Show section
        </label>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-gray-700">
          Section Heading
        </label>

        <input
          type="text"
          value={heading}
          onChange={(event) =>
            onHeadingChange(
              event.target.value,
            )
          }
          className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-700">
            Menu Links
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            Category name and URL are generated automatically from Product Categories.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={
            isCategoriesLoading ||
            categories.length === 0
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCategoriesLoading ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <Plus size={16} />
          )}

          Add Category
        </button>
      </div>

      {categoriesError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {categoriesError}
        </div>
      )}

      {!categoriesError &&
        !isCategoriesLoading &&
        categories.length === 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            No created categories are available. Create a Product Category first.
          </div>
        )}

      <div className="mt-4 space-y-3">
        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            No popular category selected yet.
          </div>
        ) : (
          links.map(
            (
              item,
              index,
            ) => {
              const matchedCategory =
                categories.find(
                  (category) =>
                    category.url ===
                      item.url ||
                    category.label
                      .trim()
                      .toLowerCase() ===
                      item.label
                        .trim()
                        .toLowerCase(),
                );

              const selectedValue =
                matchedCategory?.url ||
                item.url ||
                "";

              const unavailableSelection =
                Boolean(
                  item.url &&
                    !matchedCategory,
                );

              return (
                <div
                  key={`${item.url}-${index}`}
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[minmax(0,1fr)_100px_auto_auto]"
                >
                  <select
                    value={selectedValue}
                    onChange={(event) =>
                      onCategoryChange(
                        index,
                        event.target.value,
                      )
                    }
                    disabled={
                      isCategoriesLoading
                    }
                    aria-label={`Popular category ${index + 1}`}
                    className="h-10 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-[#0B1F3A] outline-none focus:border-orange-300 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">
                      Select Category
                    </option>

                    {unavailableSelection && (
                      <option
                        value={item.url}
                        disabled
                      >
                        {item.label ||
                          "Previously selected category"}{" "}
                        (Unavailable)
                      </option>
                    )}

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.url
                          }
                        >
                          {
                            category.label
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={item.order}
                    onChange={(event) =>
                      onChange(
                        index,
                        "order",
                        Number(
                          event.target.value,
                        ) || 1,
                      )
                    }
                    aria-label="Popular category order"
                    title="Order"
                    placeholder="Order"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                  />

                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        onChange(
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
                      onRemove(index)
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    aria-label="Remove popular category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            },
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   REUSABLE FOOTER MENU EDITOR
========================================================= */

function FooterMenuEditor({
  title,
  description,
  heading,
  enabled,
  links,
  onHeadingChange,
  onEnabledChange,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  description: string;
  heading: string;
  enabled: boolean;
  links: FooterLink[];
  onHeadingChange: (
    value: string,
  ) => void;
  onEnabledChange: (
    value: boolean,
  ) => void;
  onAdd: () => void;
  onChange: (
    index: number,
    field: keyof FooterLink,
    value:
      | string
      | boolean
      | number,
  ) => void;
  onRemove: (
    index: number,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            {title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              onEnabledChange(
                event.target.checked,
              )
            }
            className="h-4 w-4 accent-[#FF6900]"
          />

          Show section
        </label>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-gray-700">
          Section Heading
        </label>

        <input
          type="text"
          value={heading}
          onChange={(event) =>
            onHeadingChange(
              event.target.value,
            )
          }
          className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-700">
            Menu Links
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Enter the menu name. The menu link is generated automatically, but you can customize it if needed.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            No link added yet.
          </div>
        ) : (
          links.map(
            (
              item,
              index,
            ) => (
              <div
                key={`${title}-${index}`}
                className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_1fr_100px_auto_auto]"
              >
                <input
                  type="text"
                  value={item.label}
                  onChange={(event) =>
                    onChange(
                      index,
                      "label",
                      event.target.value,
                    )
                  }
                  placeholder="Link label"
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                />

                <input
                  type="text"
                  value={item.url}
                  onChange={(event) =>
                    onChange(
                      index,
                      "url",
                      event.target.value,
                    )
                  }
                  aria-label="Menu link"
                  title="Generated automatically from the menu name, but you can customize it."
                  placeholder="Auto-generated link"
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                />

                <input
                  type="number"
                  min={1}
                  value={item.order}
                  onChange={(event) =>
                    onChange(
                      index,
                      "order",
                      Number(
                        event.target.value,
                      ) || 1,
                    )
                  }
                  aria-label="Menu order"
                  title="Order"
                  placeholder="Order"
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none"
                />

                <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      onChange(
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
                    onRemove(index)
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                  aria-label="Remove footer menu link"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}