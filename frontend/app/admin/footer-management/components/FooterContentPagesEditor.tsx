"use client";

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
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

type AboutValueItem = {
  title: string;
  description: string;
  icon: string;
};

type AboutJourneyStep = {
  title: string;
  description: string;
};

type AboutPage = {
  menuTitle: string;

  banner: {
    image: string;
    altText: string;
    label: string;
  };

  hero: {
    badge: string;
    title: string;
    highlightedTitle: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };

  intro: {
    eyebrow: string;
    title: string;
    paragraphOne: string;
    paragraphTwo: string;
  };

  values: {
    eyebrow: string;
    title: string;
    description: string;
    items: AboutValueItem[];
  };

  commitment: {
    eyebrow: string;
    title: string;
    description: string;
    items: string[];
  };

  journey: {
    eyebrow: string;
    title: string;
    description: string;
    steps: AboutJourneyStep[];
  };

  notice: {
    title: string;
    description: string;
  };

  cta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };

  seo: {
    metaTitle: string;
    metaDescription: string;
  };
};

type SimpleContentPage = {
  menuTitle: string;
  pageTitle: string;
  subtitle: string;

  banner: {
    image: string;
    altText: string;
  };

  content: string;

  seo: {
    metaTitle: string;
    metaDescription: string;
  };
};

type FooterContentPages = {
  aboutUs: AboutPage;
  contactUs: SimpleContentPage;
  privacyPolicy: SimpleContentPage;
  termsAndConditions: SimpleContentPage;
  returnAndRefundPolicy: SimpleContentPage;
  customerSupport: SimpleContentPage;
};

type FooterPagesResponse = {
  success?: boolean;
  message?: string;
  data?: {
    pages?: Partial<FooterContentPages>;
    pageKey?: string;
    page?: AboutPage | SimpleContentPage;
  };
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  imageUrl?: string;
};

type PageKey =
  | "about-us"
  | "contact-us"
  | "privacy-policy"
  | "terms-and-conditions"
  | "return-refund-policy"
  | "customer-support";

type StatePageKey =
  keyof FooterContentPages;

/* =========================================================
   DEFAULTS
========================================================= */

const defaultAboutPage: AboutPage = {
  menuTitle: "About Us",

  banner: {
    image: "",
    altText: "",
    label: "",
  },

  hero: {
    badge: "",
    title: "",
    highlightedTitle: "",
    description: "",
    primaryButtonText: "",
    primaryButtonLink: "",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },

  intro: {
    eyebrow: "",
    title: "",
    paragraphOne: "",
    paragraphTwo: "",
  },

  values: {
    eyebrow: "",
    title: "",
    description: "",
    items: [],
  },

  commitment: {
    eyebrow: "",
    title: "",
    description: "",
    items: [],
  },

  journey: {
    eyebrow: "",
    title: "",
    description: "",
    steps: [],
  },

  notice: {
    title: "",
    description: "",
  },

  cta: {
    eyebrow: "",
    title: "",
    description: "",
    primaryButtonText: "",
    primaryButtonLink: "",
    secondaryButtonText: "",
    secondaryButtonLink: "",
  },

  seo: {
    metaTitle: "",
    metaDescription: "",
  },
};

function createDefaultSimplePage(
  menuTitle: string,
): SimpleContentPage {
  return {
    menuTitle,
    pageTitle: "",
    subtitle: "",

    banner: {
      image: "",
      altText: "",
    },

    content: "",

    seo: {
      metaTitle: "",
      metaDescription: "",
    },
  };
}

const defaultPages: FooterContentPages = {
  aboutUs: defaultAboutPage,

  contactUs:
    createDefaultSimplePage(
      "Contact Us",
    ),

  privacyPolicy:
    createDefaultSimplePage(
      "Privacy Policy",
    ),

  termsAndConditions:
    createDefaultSimplePage(
      "Terms & Conditions",
    ),

  returnAndRefundPolicy:
    createDefaultSimplePage(
      "Return & Refund Policy",
    ),

  customerSupport:
    createDefaultSimplePage(
      "Customer Support",
    ),
};

const PAGE_CONFIG: Array<{
  pageKey: PageKey;
  stateKey: StatePageKey;
  label: string;
  group:
    | "Customer Info"
    | "Quick Navigation";
}> = [
  {
    pageKey: "about-us",
    stateKey: "aboutUs",
    label: "About Us",
    group: "Customer Info",
  },
  {
    pageKey: "contact-us",
    stateKey: "contactUs",
    label: "Contact Us",
    group: "Customer Info",
  },
  {
    pageKey: "privacy-policy",
    stateKey: "privacyPolicy",
    label: "Privacy Policy",
    group: "Customer Info",
  },
  {
    pageKey: "terms-and-conditions",
    stateKey: "termsAndConditions",
    label: "Terms & Conditions",
    group: "Customer Info",
  },
  {
    pageKey: "return-refund-policy",
    stateKey: "returnAndRefundPolicy",
    label: "Return & Refund Policy",
    group: "Customer Info",
  },
  {
    pageKey: "customer-support",
    stateKey: "customerSupport",
    label: "Customer Support",
    group: "Quick Navigation",
  },
];

/* =========================================================
   HELPERS
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

function mergeAboutPage(
  value?: Partial<AboutPage>,
): AboutPage {
  return {
    ...defaultAboutPage,
    ...value,

    banner: {
      ...defaultAboutPage.banner,
      ...value?.banner,
    },

    hero: {
      ...defaultAboutPage.hero,
      ...value?.hero,
    },

    intro: {
      ...defaultAboutPage.intro,
      ...value?.intro,
    },

    values: {
      ...defaultAboutPage.values,
      ...value?.values,
      items:
        Array.isArray(
          value?.values?.items,
        )
          ? value.values.items
          : [],
    },

    commitment: {
      ...defaultAboutPage.commitment,
      ...value?.commitment,
      items:
        Array.isArray(
          value?.commitment?.items,
        )
          ? value.commitment.items
          : [],
    },

    journey: {
      ...defaultAboutPage.journey,
      ...value?.journey,
      steps:
        Array.isArray(
          value?.journey?.steps,
        )
          ? value.journey.steps
          : [],
    },

    notice: {
      ...defaultAboutPage.notice,
      ...value?.notice,
    },

    cta: {
      ...defaultAboutPage.cta,
      ...value?.cta,
    },

    seo: {
      ...defaultAboutPage.seo,
      ...value?.seo,
    },
  };
}

function mergeSimplePage(
  defaultValue: SimpleContentPage,
  value?: Partial<SimpleContentPage>,
): SimpleContentPage {
  return {
    ...defaultValue,
    ...value,

    banner: {
      ...defaultValue.banner,
      ...value?.banner,
    },

    seo: {
      ...defaultValue.seo,
      ...value?.seo,
    },
  };
}

function normalizePages(
  value?: Partial<FooterContentPages>,
): FooterContentPages {
  return {
    aboutUs:
      mergeAboutPage(
        value?.aboutUs,
      ),

    contactUs:
      mergeSimplePage(
        defaultPages.contactUs,
        value?.contactUs,
      ),

    privacyPolicy:
      mergeSimplePage(
        defaultPages.privacyPolicy,
        value?.privacyPolicy,
      ),

    termsAndConditions:
      mergeSimplePage(
        defaultPages.termsAndConditions,
        value?.termsAndConditions,
      ),

    returnAndRefundPolicy:
      mergeSimplePage(
        defaultPages.returnAndRefundPolicy,
        value?.returnAndRefundPolicy,
      ),

    customerSupport:
      mergeSimplePage(
        defaultPages.customerSupport,
        value?.customerSupport,
      ),
  };
}

/* =========================================================
   FOOTER CONTENT PAGES EDITOR
========================================================= */

export default function FooterContentPagesEditor() {
  const {
    selectedTenant,
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    pages,
    setPages,
  ] =
    useState<FooterContentPages>(
      defaultPages,
    );

  const [
    activePageKey,
    setActivePageKey,
  ] =
    useState<PageKey>(
      "about-us",
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
    isUploading,
    setIsUploading,
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

  const loadRequestIdRef =
    useRef(0);

  const activeConfig =
    PAGE_CONFIG.find(
      (item) =>
        item.pageKey ===
        activePageKey,
    ) ??
    PAGE_CONFIG[0];

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
     LOAD PAGE CONTENT
  ======================================================= */

  const loadPages =
    useCallback(async () => {
      const requestId =
        ++loadRequestIdRef.current;

      if (loadingTenants) {
        return;
      }

      if (!selectedTenantId) {
        setPages(
          defaultPages,
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

        const response =
          await fetch(
            `${API_BASE_URL}/api/tenants/footer-pages`,
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
            | FooterPagesResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load storefront page content.",
          );
        }

        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

        setPages(
          normalizePages(
            payload.data?.pages,
          ),
        );
      } catch (error) {
        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

        console.error(
          "Footer content pages load error:",
          error,
        );

        setPages(
          defaultPages,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load storefront page content.",
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

  useEffect(() => {
    void loadPages();
  }, [
    loadPages,
  ]);

  /* =======================================================
     SAVE ACTIVE PAGE
  ======================================================= */

  async function saveActivePage() {
    if (!selectedTenantId) {
      setErrorMessage(
        "Please select a tenant before saving page content.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const currentPage =
        pages[
          activeConfig.stateKey
        ];

      const response =
        await fetch(
          `${API_BASE_URL}/api/tenants/footer-pages/${activeConfig.pageKey}`,
          {
            method: "PATCH",
            headers:
              buildHeaders(),
            credentials:
              "include",
            body:
              JSON.stringify(
                currentPage,
              ),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as
          | FooterPagesResponse
          | null;

      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
            "Failed to save storefront page content.",
        );
      }

      const savedPage =
        payload.data?.page;

      if (savedPage) {
        setPages(
          (current) => ({
            ...current,
            [activeConfig.stateKey]:
              activeConfig.stateKey ===
              "aboutUs"
                ? mergeAboutPage(
                    savedPage as AboutPage,
                  )
                : mergeSimplePage(
                    defaultPages[
                      activeConfig.stateKey
                    ] as SimpleContentPage,
                    savedPage as SimpleContentPage,
                  ),
          }),
        );
      }

      setSuccessMessage(
        `${activeConfig.label} saved successfully for this tenant.`,
      );
    } catch (error) {
      console.error(
        "Footer content page save error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save storefront page content.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =======================================================
     BANNER UPLOAD
  ======================================================= */

  async function uploadImage(
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

    const headers:
      Record<string, string> = {
        Authorization:
          `Bearer ${token}`,
      };

    if (selectedTenantId) {
      headers[
        "X-Tenant-Id"
      ] =
        selectedTenantId;
    }

    const response =
      await fetch(
        `${API_BASE_URL}/api/uploads/image`,
        {
          method: "POST",
          headers,
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
        | UploadResponse
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

    return payload.imageUrl;
  }

  async function handleBannerUpload(
    file: File,
  ) {
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
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setErrorMessage(
        "Banner image must not exceed 5 MB.",
      );
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const imageUrl =
        await uploadImage(
          file,
        );

      if (
        activeConfig.stateKey ===
        "aboutUs"
      ) {
        setPages(
          (current) => ({
            ...current,
            aboutUs: {
              ...current.aboutUs,
              banner: {
                ...current.aboutUs.banner,
                image:
                  imageUrl,
              },
            },
          }),
        );
      } else {
        const stateKey =
          activeConfig.stateKey as Exclude<
            StatePageKey,
            "aboutUs"
          >;

        setPages(
          (current) => ({
            ...current,
            [stateKey]: {
              ...current[stateKey],
              banner: {
                ...current[stateKey].banner,
                image:
                  imageUrl,
              },
            },
          }),
        );
      }

      setSuccessMessage(
        "Banner uploaded. Click Save Page to save the change.",
      );
    } catch (error) {
      console.error(
        "Footer page banner upload error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Image upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function removeBanner() {
    if (
      activeConfig.stateKey ===
      "aboutUs"
    ) {
      setPages(
        (current) => ({
          ...current,
          aboutUs: {
            ...current.aboutUs,
            banner: {
              ...current.aboutUs.banner,
              image: "",
            },
          },
        }),
      );
    } else {
      const stateKey =
        activeConfig.stateKey as Exclude<
          StatePageKey,
          "aboutUs"
        >;

      setPages(
        (current) => ({
          ...current,
          [stateKey]: {
            ...current[stateKey],
            banner: {
              ...current[stateKey].banner,
              image: "",
            },
          },
        }),
      );
    }

    setSuccessMessage(
      "Banner removed. Click Save Page to save the change.",
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-[220px] items-center justify-center">
          <div className="inline-flex items-center gap-3 text-sm font-bold text-gray-500">
            <LoaderCircle
              size={20}
              className="animate-spin text-[#FF6900]"
            />
            Loading storefront page content...
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            Storefront Content
          </p>

          <h2 className="mt-1 text-xl font-black text-[#0B1F3A]">
            Footer Linked Pages
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Manage the content opened from Customer Info and Customer Support.
            Footer link labels, visibility and order remain managed in the menu
            editors above. Cart, Checkout, My Account and Track Orders are not
            changed here.
          </p>
        </div>

        <div className="text-xs font-semibold text-gray-500">
          {selectedTenantId
            ? `Editing ${selectedTenant?.storeName || selectedTenant?.businessName || "selected tenant"}`
            : "Select a tenant first"}
        </div>
      </div>

      {/* PAGE TABS */}
      <div className="mt-6 space-y-4">
        {(
          [
            "Customer Info",
            "Quick Navigation",
          ] as const
        ).map(
          (group) => (
            <div
              key={group}
            >
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                {group}
              </p>

              <div className="flex flex-wrap gap-2">
                {PAGE_CONFIG
                  .filter(
                    (item) =>
                      item.group ===
                      group,
                  )
                  .map(
                    (item) => {
                      const active =
                        item.pageKey ===
                        activePageKey;

                      return (
                        <button
                          key={
                            item.pageKey
                          }
                          type="button"
                          onClick={() => {
                            setActivePageKey(
                              item.pageKey,
                            );
                            setErrorMessage("");
                            setSuccessMessage("");
                          }}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-extrabold transition ${
                            active
                              ? "border-[#FF6900] bg-[#FF6900] text-white"
                              : "border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    },
                  )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* STATUS */}
      {errorMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />
          <p className="text-sm font-semibold">
            {errorMessage}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />
          <p className="text-sm font-semibold">
            {successMessage}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-6">
        {activeConfig.stateKey ===
        "aboutUs" ? (
          <AboutPageEditor
            value={
              pages.aboutUs
            }
            onChange={(
              value,
            ) =>
              setPages(
                (current) => ({
                  ...current,
                  aboutUs:
                    value,
                }),
              )
            }
            isUploading={
              isUploading
            }
            onBannerUpload={
              handleBannerUpload
            }
            onBannerRemove={
              removeBanner
            }
          />
        ) : (
          <SimplePageEditor
            label={
              activeConfig.label
            }
            value={
              pages[
                activeConfig.stateKey
              ] as SimpleContentPage
            }
            onChange={(
              value,
            ) =>
              setPages(
                (current) => ({
                  ...current,
                  [activeConfig.stateKey]:
                    value,
                }),
              )
            }
            isUploading={
              isUploading
            }
            onBannerUpload={
              handleBannerUpload
            }
            onBannerRemove={
              removeBanner
            }
          />
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-[#0B1F3A]">
            Save {activeConfig.label}
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            This updates only the currently selected tenant.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadPages()
            }
            disabled={
              isSaving ||
              isUploading ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw
              size={16}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              void saveActivePage()
            }
            disabled={
              isSaving ||
              isUploading ||
              loadingTenants ||
              !selectedTenantId
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save
                size={16}
              />
            )}

            {isSaving
              ? "Saving..."
              : "Save Page"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   ABOUT PAGE EDITOR
========================================================= */

function AboutPageEditor({
  value,
  onChange,
  isUploading,
  onBannerUpload,
  onBannerRemove,
}: {
  value: AboutPage;
  onChange: (
    value: AboutPage,
  ) => void;
  isUploading: boolean;
  onBannerUpload: (
    file: File,
  ) => Promise<void>;
  onBannerRemove: () => void;
}) {
  function setSection<
    K extends keyof AboutPage,
  >(
    key: K,
    nextValue:
      AboutPage[K],
  ) {
    onChange({
      ...value,
      [key]:
        nextValue,
    });
  }

  return (
    <div className="space-y-5">
      <EditorHeading
        title="About Us"
        description="Manage the complete tenant-specific About Us storefront page."
      />

      <BannerEditor
        image={
          value.banner.image
        }
        altText={
          value.banner.altText
        }
        onAltTextChange={(
          altText,
        ) =>
          setSection(
            "banner",
            {
              ...value.banner,
              altText,
            },
          )
        }
        isUploading={
          isUploading
        }
        onUpload={
          onBannerUpload
        }
        onRemove={
          onBannerRemove
        }
      >
        <TextField
          label="Banner Label"
          value={
            value.banner.label
          }
          onChange={(
            label,
          ) =>
            setSection(
              "banner",
              {
                ...value.banner,
                label,
              },
            )
          }
          placeholder="Better Shopping Experience"
        />
      </BannerEditor>

      <EditorCard
        title="Hero Section"
      >
        <TwoColumn>
          <TextField
            label="Badge"
            value={
              value.hero.badge
            }
            onChange={(
              badge,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  badge,
                },
              )
            }
          />

          <TextField
            label="Main Title"
            value={
              value.hero.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  title,
                },
              )
            }
          />

          <TextField
            label="Highlighted Title"
            value={
              value.hero.highlightedTitle
            }
            onChange={(
              highlightedTitle,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  highlightedTitle,
                },
              )
            }
          />

          <TextAreaField
            label="Description"
            value={
              value.hero.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  description,
                },
              )
            }
          />

          <TextField
            label="Primary Button Text"
            value={
              value.hero.primaryButtonText
            }
            onChange={(
              primaryButtonText,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  primaryButtonText,
                },
              )
            }
          />

          <TextField
            label="Primary Button Link"
            value={
              value.hero.primaryButtonLink
            }
            onChange={(
              primaryButtonLink,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  primaryButtonLink,
                },
              )
            }
            placeholder="/shop"
          />

          <TextField
            label="Secondary Button Text"
            value={
              value.hero.secondaryButtonText
            }
            onChange={(
              secondaryButtonText,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  secondaryButtonText,
                },
              )
            }
          />

          <TextField
            label="Secondary Button Link"
            value={
              value.hero.secondaryButtonLink
            }
            onChange={(
              secondaryButtonLink,
            ) =>
              setSection(
                "hero",
                {
                  ...value.hero,
                  secondaryButtonLink,
                },
              )
            }
            placeholder="/contact-us"
          />
        </TwoColumn>
      </EditorCard>

      <EditorCard
        title="Who We Are / Intro"
      >
        <TwoColumn>
          <TextField
            label="Eyebrow"
            value={
              value.intro.eyebrow
            }
            onChange={(
              eyebrow,
            ) =>
              setSection(
                "intro",
                {
                  ...value.intro,
                  eyebrow,
                },
              )
            }
          />

          <TextField
            label="Title"
            value={
              value.intro.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "intro",
                {
                  ...value.intro,
                  title,
                },
              )
            }
          />
        </TwoColumn>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextAreaField
            label="Paragraph One"
            value={
              value.intro.paragraphOne
            }
            onChange={(
              paragraphOne,
            ) =>
              setSection(
                "intro",
                {
                  ...value.intro,
                  paragraphOne,
                },
              )
            }
            rows={5}
          />

          <TextAreaField
            label="Paragraph Two"
            value={
              value.intro.paragraphTwo
            }
            onChange={(
              paragraphTwo,
            ) =>
              setSection(
                "intro",
                {
                  ...value.intro,
                  paragraphTwo,
                },
              )
            }
            rows={5}
          />
        </div>
      </EditorCard>

      <EditorCard
        title="Values / What Matters To Us"
        action={
          <button
            type="button"
            onClick={() =>
              setSection(
                "values",
                {
                  ...value.values,
                  items: [
                    ...value.values.items,
                    {
                      title: "",
                      description: "",
                      icon: "",
                    },
                  ],
                },
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-3 py-2 text-xs font-extrabold text-white"
          >
            <Plus size={14} />
            Add Value
          </button>
        }
      >
        <TwoColumn>
          <TextField
            label="Eyebrow"
            value={
              value.values.eyebrow
            }
            onChange={(
              eyebrow,
            ) =>
              setSection(
                "values",
                {
                  ...value.values,
                  eyebrow,
                },
              )
            }
          />

          <TextField
            label="Section Title"
            value={
              value.values.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "values",
                {
                  ...value.values,
                  title,
                },
              )
            }
          />
        </TwoColumn>

        <div className="mt-4">
          <TextAreaField
            label="Section Description"
            value={
              value.values.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "values",
                {
                  ...value.values,
                  description,
                },
              )
            }
          />
        </div>

        <div className="mt-4 space-y-3">
          {value.values.items.length ===
          0 ? (
            <EmptyState
              text="No value card added yet."
            />
          ) : (
            value.values.items.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_auto]">
                    <TextField
                      label="Title"
                      value={
                        item.title
                      }
                      onChange={(
                        title,
                      ) => {
                        const items = [
                          ...value.values.items,
                        ];

                        items[index] = {
                          ...items[index],
                          title,
                        };

                        setSection(
                          "values",
                          {
                            ...value.values,
                            items,
                          },
                        );
                      }}
                    />

                    <TextAreaField
                      label="Description"
                      value={
                        item.description
                      }
                      onChange={(
                        description,
                      ) => {
                        const items = [
                          ...value.values.items,
                        ];

                        items[index] = {
                          ...items[index],
                          description,
                        };

                        setSection(
                          "values",
                          {
                            ...value.values,
                            items,
                          },
                        );
                      }}
                      rows={3}
                    />

                    <TextField
                      label="Icon Key"
                      value={
                        item.icon
                      }
                      onChange={(
                        icon,
                      ) => {
                        const items = [
                          ...value.values.items,
                        ];

                        items[index] = {
                          ...items[index],
                          icon,
                        };

                        setSection(
                          "values",
                          {
                            ...value.values,
                            items,
                          },
                        );
                      }}
                      placeholder="shield"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSection(
                          "values",
                          {
                            ...value.values,
                            items:
                              value.values.items.filter(
                                (
                                  _,
                                  itemIndex,
                                ) =>
                                  itemIndex !==
                                  index,
                              ),
                          },
                        )
                      }
                      className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                      aria-label="Remove value"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </EditorCard>

      <EditorCard
        title="Commitment Section"
        action={
          <button
            type="button"
            onClick={() =>
              setSection(
                "commitment",
                {
                  ...value.commitment,
                  items: [
                    ...value.commitment.items,
                    "",
                  ],
                },
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-3 py-2 text-xs font-extrabold text-white"
          >
            <Plus size={14} />
            Add Item
          </button>
        }
      >
        <TwoColumn>
          <TextField
            label="Eyebrow"
            value={
              value.commitment.eyebrow
            }
            onChange={(
              eyebrow,
            ) =>
              setSection(
                "commitment",
                {
                  ...value.commitment,
                  eyebrow,
                },
              )
            }
          />

          <TextField
            label="Title"
            value={
              value.commitment.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "commitment",
                {
                  ...value.commitment,
                  title,
                },
              )
            }
          />
        </TwoColumn>

        <div className="mt-4">
          <TextAreaField
            label="Description"
            value={
              value.commitment.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "commitment",
                {
                  ...value.commitment,
                  description,
                },
              )
            }
          />
        </div>

        <div className="mt-4 space-y-3">
          {value.commitment.items.map(
            (
              item,
              index,
            ) => (
              <div
                key={index}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={item}
                  onChange={(
                    event,
                  ) => {
                    const items = [
                      ...value.commitment.items,
                    ];

                    items[index] =
                      event.target.value;

                    setSection(
                      "commitment",
                      {
                        ...value.commitment,
                        items,
                      },
                    );
                  }}
                  placeholder="Commitment item"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-orange-300"
                />

                <button
                  type="button"
                  onClick={() =>
                    setSection(
                      "commitment",
                      {
                        ...value.commitment,
                        items:
                          value.commitment.items.filter(
                            (
                              _,
                              itemIndex,
                            ) =>
                              itemIndex !==
                              index,
                          ),
                      },
                    )
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600"
                  aria-label="Remove commitment item"
                >
                  <Trash2
                    size={16}
                  />
                </button>
              </div>
            ),
          )}

          {value.commitment.items.length ===
            0 && (
            <EmptyState
              text="No commitment item added yet."
            />
          )}
        </div>
      </EditorCard>

      <EditorCard
        title="Shopping Journey"
        action={
          <button
            type="button"
            onClick={() =>
              setSection(
                "journey",
                {
                  ...value.journey,
                  steps: [
                    ...value.journey.steps,
                    {
                      title: "",
                      description: "",
                    },
                  ],
                },
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-3 py-2 text-xs font-extrabold text-white"
          >
            <Plus size={14} />
            Add Step
          </button>
        }
      >
        <TwoColumn>
          <TextField
            label="Eyebrow"
            value={
              value.journey.eyebrow
            }
            onChange={(
              eyebrow,
            ) =>
              setSection(
                "journey",
                {
                  ...value.journey,
                  eyebrow,
                },
              )
            }
          />

          <TextField
            label="Section Title"
            value={
              value.journey.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "journey",
                {
                  ...value.journey,
                  title,
                },
              )
            }
          />
        </TwoColumn>

        <div className="mt-4">
          <TextAreaField
            label="Section Description"
            value={
              value.journey.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "journey",
                {
                  ...value.journey,
                  description,
                },
              )
            }
          />
        </div>

        <div className="mt-4 space-y-3">
          {value.journey.steps.length ===
          0 ? (
            <EmptyState
              text="No journey step added yet."
            />
          ) : (
            value.journey.steps.map(
              (
                step,
                index,
              ) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:grid-cols-[1fr_1.5fr_auto]"
                >
                  <TextField
                    label={`Step ${index + 1} Title`}
                    value={
                      step.title
                    }
                    onChange={(
                      title,
                    ) => {
                      const steps = [
                        ...value.journey.steps,
                      ];

                      steps[index] = {
                        ...steps[index],
                        title,
                      };

                      setSection(
                        "journey",
                        {
                          ...value.journey,
                          steps,
                        },
                      );
                    }}
                  />

                  <TextAreaField
                    label="Description"
                    value={
                      step.description
                    }
                    onChange={(
                      description,
                    ) => {
                      const steps = [
                        ...value.journey.steps,
                      ];

                      steps[index] = {
                        ...steps[index],
                        description,
                      };

                      setSection(
                        "journey",
                        {
                          ...value.journey,
                          steps,
                        },
                      );
                    }}
                    rows={3}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setSection(
                        "journey",
                        {
                          ...value.journey,
                          steps:
                            value.journey.steps.filter(
                              (
                                _,
                                stepIndex,
                              ) =>
                                stepIndex !==
                                index,
                            ),
                        },
                      )
                    }
                    className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    aria-label="Remove journey step"
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
      </EditorCard>

      <EditorCard
        title="Important Notice"
      >
        <TextField
          label="Title"
          value={
            value.notice.title
          }
          onChange={(
            title,
          ) =>
            setSection(
              "notice",
              {
                ...value.notice,
                title,
              },
            )
          }
        />

        <div className="mt-4">
          <TextAreaField
            label="Description"
            value={
              value.notice.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "notice",
                {
                  ...value.notice,
                  description,
                },
              )
            }
            rows={4}
          />
        </div>
      </EditorCard>

      <EditorCard
        title="Final CTA"
      >
        <TwoColumn>
          <TextField
            label="Eyebrow"
            value={
              value.cta.eyebrow
            }
            onChange={(
              eyebrow,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  eyebrow,
                },
              )
            }
          />

          <TextField
            label="Title"
            value={
              value.cta.title
            }
            onChange={(
              title,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  title,
                },
              )
            }
          />
        </TwoColumn>

        <div className="mt-4">
          <TextAreaField
            label="Description"
            value={
              value.cta.description
            }
            onChange={(
              description,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  description,
                },
              )
            }
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextField
            label="Primary Button Text"
            value={
              value.cta.primaryButtonText
            }
            onChange={(
              primaryButtonText,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  primaryButtonText,
                },
              )
            }
          />

          <TextField
            label="Primary Button Link"
            value={
              value.cta.primaryButtonLink
            }
            onChange={(
              primaryButtonLink,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  primaryButtonLink,
                },
              )
            }
            placeholder="/contact-us"
          />

          <TextField
            label="Secondary Button Text"
            value={
              value.cta.secondaryButtonText
            }
            onChange={(
              secondaryButtonText,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  secondaryButtonText,
                },
              )
            }
          />

          <TextField
            label="Secondary Button Link"
            value={
              value.cta.secondaryButtonLink
            }
            onChange={(
              secondaryButtonLink,
            ) =>
              setSection(
                "cta",
                {
                  ...value.cta,
                  secondaryButtonLink,
                },
              )
            }
            placeholder="/shop"
          />
        </div>
      </EditorCard>

      <SeoEditor
        value={
          value.seo
        }
        onChange={(
          seo,
        ) =>
          setSection(
            "seo",
            seo,
          )
        }
      />
    </div>
  );
}

/* =========================================================
   SIMPLE CONTENT PAGE EDITOR
========================================================= */

function SimplePageEditor({
  label,
  value,
  onChange,
  isUploading,
  onBannerUpload,
  onBannerRemove,
}: {
  label: string;
  value: SimpleContentPage;
  onChange: (
    value: SimpleContentPage,
  ) => void;
  isUploading: boolean;
  onBannerUpload: (
    file: File,
  ) => Promise<void>;
  onBannerRemove: () => void;
}) {
  return (
    <div className="space-y-5">
      <EditorHeading
        title={label}
        description={`Manage the tenant-specific ${label} storefront page.`}
      />

      <EditorCard
        title="Page Heading"
      >
        <TextField
          label="Page Title"
          value={
            value.pageTitle
          }
          onChange={(
            pageTitle,
          ) =>
            onChange({
              ...value,
              pageTitle,
            })
          }
          placeholder={label}
        />

        <div className="mt-4">
          <TextAreaField
            label="Subtitle / Introduction"
            value={
              value.subtitle
            }
            onChange={(
              subtitle,
            ) =>
              onChange({
                ...value,
                subtitle,
              })
            }
            rows={3}
          />
        </div>
      </EditorCard>

      <BannerEditor
        image={
          value.banner.image
        }
        altText={
          value.banner.altText
        }
        onAltTextChange={(
          altText,
        ) =>
          onChange({
            ...value,
            banner: {
              ...value.banner,
              altText,
            },
          })
        }
        isUploading={
          isUploading
        }
        onUpload={
          onBannerUpload
        }
        onRemove={
          onBannerRemove
        }
      />

      <EditorCard
        title="Page Content"
      >
        <TextAreaField
          label="Content"
          value={
            value.content
          }
          onChange={(
            content,
          ) =>
            onChange({
              ...value,
              content,
            })
          }
          rows={14}
          placeholder="Write the complete page content here. Plain text or the HTML generated by your editor can be stored."
        />

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Footer link label, visibility and order are managed separately in the
          Customer Info / Quick Navigation menu editor.
        </p>
      </EditorCard>

      <SeoEditor
        value={
          value.seo
        }
        onChange={(
          seo,
        ) =>
          onChange({
            ...value,
            seo,
          })
        }
      />
    </div>
  );
}

/* =========================================================
   SHARED EDITOR UI
========================================================= */

function EditorHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-black text-[#0B1F3A]">
        {title}
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

function EditorCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children:
    ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-black text-[#0B1F3A]">
          {title}
        </h4>

        {action}
      </div>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

function TwoColumn({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
      />
    </div>
  );
}

function BannerEditor({
  image,
  altText,
  onAltTextChange,
  isUploading,
  onUpload,
  onRemove,
  children,
}: {
  image: string;
  altText: string;
  onAltTextChange: (
    value: string,
  ) => void;
  isUploading: boolean;
  onUpload: (
    file: File,
  ) => Promise<void>;
  onRemove: () => void;
  children?:
    ReactNode;
}) {
  return (
    <EditorCard
      title="Banner"
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex min-h-[190px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white">
            {image ? (
              <img
                src={image}
                alt={
                  altText ||
                  "Page banner preview"
                }
                className="h-[220px] w-full object-cover"
              />
            ) : (
              <div className="px-4 text-center text-gray-400">
                <ImageIcon
                  size={34}
                  className="mx-auto"
                />

                <p className="mt-2 text-sm font-bold">
                  No banner uploaded
                </p>

                <p className="mt-1 text-xs">
                  JPG, PNG or WEBP — max 5 MB
                </p>
              </div>
            )}
          </div>

          <input
            id="footer-content-page-banner"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={
              isUploading
            }
            onChange={(
              event,
            ) => {
              const file =
                event.target.files?.[0];

              if (file) {
                void onUpload(
                  file,
                );
              }

              event.target.value =
                "";
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <label
              htmlFor="footer-content-page-banner"
              className={`inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white ${
                isUploading
                  ? "pointer-events-none opacity-60"
                  : "cursor-pointer"
              }`}
            >
              {isUploading ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Upload
                  size={16}
                />
              )}

              {isUploading
                ? "Uploading..."
                : image
                  ? "Change Banner"
                  : "Upload Banner"}
            </label>

            {image && (
              <button
                type="button"
                onClick={
                  onRemove
                }
                disabled={
                  isUploading
                }
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 disabled:opacity-50"
              >
                <Trash2
                  size={16}
                />
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <TextField
            label="Banner Alt Text"
            value={
              altText
            }
            onChange={
              onAltTextChange
            }
            placeholder="Describe the banner image"
          />

          {children}
        </div>
      </div>
    </EditorCard>
  );
}

function SeoEditor({
  value,
  onChange,
}: {
  value: {
    metaTitle: string;
    metaDescription: string;
  };
  onChange: (
    value: {
      metaTitle: string;
      metaDescription: string;
    },
  ) => void;
}) {
  return (
    <EditorCard
      title="SEO"
    >
      <TextField
        label="Meta Title"
        value={
          value.metaTitle
        }
        onChange={(
          metaTitle,
        ) =>
          onChange({
            ...value,
            metaTitle,
          })
        }
      />

      <div className="mt-4">
        <TextAreaField
          label="Meta Description"
          value={
            value.metaDescription
          }
          onChange={(
            metaDescription,
          ) =>
            onChange({
              ...value,
              metaDescription,
            })
          }
          rows={3}
        />
      </div>
    </EditorCard>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
