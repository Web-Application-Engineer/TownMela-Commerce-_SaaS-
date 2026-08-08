"use client";

import {
  ChangeEvent,
  FormEvent,
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

type SocialLinks = {
  facebook: string;
  instagram: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
  twitter: string;
};

type BrandingSettings = {
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  invoiceLogoUrl: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  storeTagline: string;
  footerText: string;
  invoiceFooterText: string;

  socialLinks: SocialLinks;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

type BrandingImageField =
  | "logoUrl"
  | "darkLogoUrl"
  | "faviconUrl"
  | "invoiceLogoUrl";

type BrandingTextField =
  | "storeTagline"
  | "footerText"
  | "invoiceFooterText";

type BrandingColorField =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor";

type SocialLinkField = keyof SocialLinks;

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  logoUrl: "",
  darkLogoUrl: "",
  faviconUrl: "",
  invoiceLogoUrl: "",

  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  accentColor: "#f59e0b",

  storeTagline: "",
  footerText: "",
  invoiceFooterText: "",

  socialLinks: {
    facebook: "",
    instagram: "",
    youtube: "",
    linkedin: "",
    tiktok: "",
    twitter: "",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const mergeBrandingSettings = (
  settings?: Partial<BrandingSettings> | null
): BrandingSettings => ({
  ...DEFAULT_BRANDING_SETTINGS,
  ...(settings || {}),

  socialLinks: {
    ...DEFAULT_BRANDING_SETTINGS.socialLinks,
    ...(settings?.socialLinks || {}),
  },
});

const isValidHexColor = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(value);

const normalizeHexColor = (
  value: string,
  fallback: string
): string => {
  const normalized = value.trim();

  return isValidHexColor(normalized)
    ? normalized.toLowerCase()
    : fallback;
};

const formatUpdatedAt = (value: string): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-US");
};

/* =========================================================
   PAGE
========================================================= */

export default function BrandingSettingsPage() {
  const [formData, setFormData] =
    useState<BrandingSettings>(
      DEFAULT_BRANDING_SETTINGS
    );

  const [version, setVersion] = useState<
    number | null
  >(null);

  const [updatedAt, setUpdatedAt] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState<StatusMessage>(null);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    useCallback(async () => {
      try {
        setLoading(true);
        setStatusMessage(null);

        const response =
          await getSettingsSection<BrandingSettings>(
            "branding"
          );

        setFormData(
          mergeBrandingSettings(
            response.data.settings
          )
        );

        setVersion(response.data.version);
        setUpdatedAt(
          response.data.updatedAt || ""
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
     FORM CHANGE HANDLERS
  ======================================================= */

  const handleImageUrlChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as BrandingImageField;

    const value = event.target.value;

    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setStatusMessage(null);
  };

  const handleTextChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const field =
      event.target.name as BrandingTextField;

    const value = event.target.value;

    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setStatusMessage(null);
  };

  const handleColorPickerChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as BrandingColorField;

    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setStatusMessage(null);
  };

  const handleColorTextChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as BrandingColorField;

    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setStatusMessage(null);
  };

  const handleColorBlur = (
    field: BrandingColorField
  ) => {
    setFormData((current) => ({
      ...current,

      [field]: normalizeHexColor(
        current[field],
        DEFAULT_BRANDING_SETTINGS[field]
      ),
    }));
  };

  const handleSocialLinkChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const field =
      event.target.name as SocialLinkField;

    const value = event.target.value;

    setFormData((current) => ({
      ...current,

      socialLinks: {
        ...current.socialLinks,
        [field]: value,
      },
    }));

    setStatusMessage(null);
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const normalizedData: BrandingSettings = {
      ...formData,

      logoUrl: formData.logoUrl.trim(),
      darkLogoUrl:
        formData.darkLogoUrl.trim(),
      faviconUrl:
        formData.faviconUrl.trim(),
      invoiceLogoUrl:
        formData.invoiceLogoUrl.trim(),

      primaryColor: normalizeHexColor(
        formData.primaryColor,
        DEFAULT_BRANDING_SETTINGS.primaryColor
      ),

      secondaryColor: normalizeHexColor(
        formData.secondaryColor,
        DEFAULT_BRANDING_SETTINGS.secondaryColor
      ),

      accentColor: normalizeHexColor(
        formData.accentColor,
        DEFAULT_BRANDING_SETTINGS.accentColor
      ),

      storeTagline:
        formData.storeTagline.trim(),

      footerText:
        formData.footerText.trim(),

      invoiceFooterText:
        formData.invoiceFooterText.trim(),

      socialLinks: {
        facebook:
          formData.socialLinks.facebook.trim(),

        instagram:
          formData.socialLinks.instagram.trim(),

        youtube:
          formData.socialLinks.youtube.trim(),

        linkedin:
          formData.socialLinks.linkedin.trim(),

        tiktok:
          formData.socialLinks.tiktok.trim(),

        twitter:
          formData.socialLinks.twitter.trim(),
      },
    };

    try {
      setSaving(true);
      setStatusMessage(null);

      const response =
        await updateSettingsSection<
          BrandingSettings &
            Record<string, unknown>
        >(
          "branding",
          normalizedData,
          version
        );

      setFormData(
        mergeBrandingSettings(
          response.data.settings
        )
      );

      setVersion(response.data.version);
      setUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Branding settings saved successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(error)
      ) {
        setStatusMessage({
          type: "error",
          text:
            "These settings were updated from another session. Reloading the latest settings...",
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
        "Are you sure you want to reset Branding settings to their default values?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setStatusMessage(null);

      const response =
        await resetSettingsSection<BrandingSettings>(
          "branding",
          version
        );

      setFormData(
        mergeBrandingSettings(
          response.data.settings
        )
      );

      setVersion(response.data.version);
      setUpdatedAt(
        response.data.updatedAt || ""
      );

      setStatusMessage({
        type: "success",
        text:
          response.message ||
          "Branding settings reset successfully.",
      });
    } catch (error) {
      if (
        isSettingsVersionConflict(error)
      ) {
        setStatusMessage({
          type: "error",
          text:
            "These settings were updated from another session. Reloading the latest settings...",
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
     PREVIEW VALUES
  ======================================================= */

  const previewPrimaryColor = useMemo(
    () =>
      normalizeHexColor(
        formData.primaryColor,
        DEFAULT_BRANDING_SETTINGS.primaryColor
      ),
    [formData.primaryColor]
  );

  const previewSecondaryColor = useMemo(
    () =>
      normalizeHexColor(
        formData.secondaryColor,
        DEFAULT_BRANDING_SETTINGS.secondaryColor
      ),
    [formData.secondaryColor]
  );

  const previewAccentColor = useMemo(
    () =>
      normalizeHexColor(
        formData.accentColor,
        DEFAULT_BRANDING_SETTINGS.accentColor
      ),
    [formData.accentColor]
  );

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (loading) {
    return <BrandingPageSkeleton />;
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
              Store appearance
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Branding Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your store logos,
              brand colors, tagline, footer
              content and social media links.
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
                  {formatUpdatedAt(
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
        {/* Live Preview */}

        <SectionCard
          title="Brand Preview"
          description="Preview how the selected logo and colors may appear in your storefront."
        >
          <div
            className="overflow-hidden rounded-2xl border border-slate-200"
            style={{
              backgroundColor:
                previewSecondaryColor,
            }}
          >
            <div className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LogoPreview
                    src={
                      formData.logoUrl
                    }
                    alt="Store logo preview"
                    fallback="TM"
                    compact
                  />

                  <div>
                    <p className="text-lg font-bold text-white">
                      TownMela
                    </p>

                    <p className="text-sm text-white/70">
                      {formData.storeTagline ||
                        "Your store tagline"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                  style={{
                    backgroundColor:
                      previewPrimaryColor,
                  }}
                >
                  Shop now
                </button>
              </div>

              <div className="rounded-xl bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Featured product
                </p>

                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  TownMela Product
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This preview uses your selected
                  primary, secondary and accent
                  colors.
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold text-slate-900"
                    style={{
                      backgroundColor:
                        previewAccentColor,
                    }}
                  >
                    New arrival
                  </span>

                  <span
                    className="text-sm font-bold"
                    style={{
                      color:
                        previewPrimaryColor,
                    }}
                  >
                    View product
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Logo Settings */}

        <SectionCard
          title="Logo and Icons"
          description="Add publicly accessible image URLs for storefront and document branding."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ImageUrlField
              title="Primary Logo"
              description="Displayed on light backgrounds."
              name="logoUrl"
              value={formData.logoUrl}
              onChange={
                handleImageUrlChange
              }
              recommendedSize="Recommended: 320 × 100 px"
              previewAlt="Primary logo"
              fallback="Logo"
            />

            <ImageUrlField
              title="Dark Logo"
              description="Displayed on dark backgrounds."
              name="darkLogoUrl"
              value={
                formData.darkLogoUrl
              }
              onChange={
                handleImageUrlChange
              }
              recommendedSize="Recommended: 320 × 100 px"
              previewAlt="Dark logo"
              fallback="Dark"
              darkPreview
            />

            <ImageUrlField
              title="Favicon"
              description="Displayed in the browser tab."
              name="faviconUrl"
              value={
                formData.faviconUrl
              }
              onChange={
                handleImageUrlChange
              }
              recommendedSize="Recommended: 64 × 64 px"
              previewAlt="Favicon"
              fallback="F"
              square
            />

            <ImageUrlField
              title="Invoice Logo"
              description="Displayed on invoices and printable documents."
              name="invoiceLogoUrl"
              value={
                formData.invoiceLogoUrl
              }
              onChange={
                handleImageUrlChange
              }
              recommendedSize="Recommended: 300 × 100 px"
              previewAlt="Invoice logo"
              fallback="Invoice"
            />
          </div>
        </SectionCard>

        {/* Brand Colors */}

        <SectionCard
          title="Brand Colors"
          description="Configure the main colors used across the storefront."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <ColorField
              label="Primary Color"
              name="primaryColor"
              value={
                formData.primaryColor
              }
              description="Buttons, links and primary actions."
              onPickerChange={
                handleColorPickerChange
              }
              onTextChange={
                handleColorTextChange
              }
              onBlur={() =>
                handleColorBlur(
                  "primaryColor"
                )
              }
            />

            <ColorField
              label="Secondary Color"
              name="secondaryColor"
              value={
                formData.secondaryColor
              }
              description="Headers, navigation and dark sections."
              onPickerChange={
                handleColorPickerChange
              }
              onTextChange={
                handleColorTextChange
              }
              onBlur={() =>
                handleColorBlur(
                  "secondaryColor"
                )
              }
            />

            <ColorField
              label="Accent Color"
              name="accentColor"
              value={
                formData.accentColor
              }
              description="Badges, highlights and promotional elements."
              onPickerChange={
                handleColorPickerChange
              }
              onTextChange={
                handleColorTextChange
              }
              onBlur={() =>
                handleColorBlur(
                  "accentColor"
                )
              }
            />
          </div>
        </SectionCard>

        {/* Content */}

        <SectionCard
          title="Brand Content"
          description="Configure text shown throughout the storefront and business documents."
        >
          <div className="grid grid-cols-1 gap-5">
            <FormField
              label="Store Tagline"
              htmlFor="storeTagline"
              hint={`${formData.storeTagline.length}/160`}
            >
              <input
                id="storeTagline"
                name="storeTagline"
                type="text"
                value={
                  formData.storeTagline
                }
                onChange={
                  handleTextChange
                }
                placeholder="Everything you need, all in one place."
                maxLength={160}
                className={inputClassName}
              />
            </FormField>

            <FormField
              label="Storefront Footer Text"
              htmlFor="footerText"
              hint={`${formData.footerText.length}/500`}
            >
              <textarea
                id="footerText"
                name="footerText"
                value={
                  formData.footerText
                }
                onChange={
                  handleTextChange
                }
                placeholder="Add copyright information or a short business description."
                rows={4}
                maxLength={500}
                className={`${inputClassName} resize-y`}
              />
            </FormField>

            <FormField
              label="Invoice Footer Text"
              htmlFor="invoiceFooterText"
              hint={`${formData.invoiceFooterText.length}/500`}
            >
              <textarea
                id="invoiceFooterText"
                name="invoiceFooterText"
                value={
                  formData.invoiceFooterText
                }
                onChange={
                  handleTextChange
                }
                placeholder="Thank you for shopping with us."
                rows={4}
                maxLength={500}
                className={`${inputClassName} resize-y`}
              />
            </FormField>
          </div>
        </SectionCard>

        {/* Social Links */}

        <SectionCard
          title="Social Media"
          description="Add the full URLs of your official social media profiles."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SocialUrlField
              label="Facebook"
              name="facebook"
              value={
                formData.socialLinks
                  .facebook
              }
              placeholder="https://facebook.com/townmela"
              onChange={
                handleSocialLinkChange
              }
            />

            <SocialUrlField
              label="Instagram"
              name="instagram"
              value={
                formData.socialLinks
                  .instagram
              }
              placeholder="https://instagram.com/townmela"
              onChange={
                handleSocialLinkChange
              }
            />

            <SocialUrlField
              label="YouTube"
              name="youtube"
              value={
                formData.socialLinks
                  .youtube
              }
              placeholder="https://youtube.com/@townmela"
              onChange={
                handleSocialLinkChange
              }
            />

            <SocialUrlField
              label="LinkedIn"
              name="linkedin"
              value={
                formData.socialLinks
                  .linkedin
              }
              placeholder="https://linkedin.com/company/townmela"
              onChange={
                handleSocialLinkChange
              }
            />

            <SocialUrlField
              label="TikTok"
              name="tiktok"
              value={
                formData.socialLinks
                  .tiktok
              }
              placeholder="https://tiktok.com/@townmela"
              onChange={
                handleSocialLinkChange
              }
            />

            <SocialUrlField
              label="X / Twitter"
              name="twitter"
              value={
                formData.socialLinks
                  .twitter
              }
              placeholder="https://x.com/townmela"
              onChange={
                handleSocialLinkChange
              }
            />
          </div>
        </SectionCard>

        {/* Actions */}

        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Branding changes apply only to
              the active tenant.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                disabled={
                  saving || resetting
                }
                className={secondaryButtonClassName}
              >
                {resetting
                  ? "Resetting..."
                  : "Reset to defaults"}
              </button>

              <button
                type="submit"
                disabled={
                  saving || resetting
                }
                className={primaryButtonClassName}
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
  children: React.ReactNode;
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
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
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
   IMAGE URL FIELD
========================================================= */

function ImageUrlField({
  title,
  description,
  name,
  value,
  onChange,
  recommendedSize,
  previewAlt,
  fallback,
  darkPreview = false,
  square = false,
}: {
  title: string;
  description: string;
  name: BrandingImageField;
  value: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  recommendedSize: string;
  previewAlt: string;
  fallback: string;
  darkPreview?: boolean;
  square?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div
        className={[
          "flex min-h-36 items-center justify-center rounded-xl border border-dashed p-5",
          darkPreview
            ? "border-slate-600 bg-slate-900"
            : "border-slate-300 bg-slate-50",
        ].join(" ")}
      >
        <LogoPreview
          src={value}
          alt={previewAlt}
          fallback={fallback}
          square={square}
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor={name}
          className="text-sm font-semibold text-slate-800"
        >
          {title}
        </label>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>

        <input
          id={name}
          name={name}
          type="url"
          value={value}
          onChange={onChange}
          placeholder="https://example.com/logo.png"
          maxLength={1000}
          className={`${inputClassName} mt-3`}
        />

        <p className="mt-2 text-xs text-slate-400">
          {recommendedSize}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   LOGO PREVIEW
========================================================= */

function LogoPreview({
  src,
  alt,
  fallback,
  compact = false,
  square = false,
}: {
  src: string;
  alt: string;
  fallback: string;
  compact?: boolean;
  square?: boolean;
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return (
      <div
        className={[
          "flex items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-500 shadow-sm",
          compact
            ? "h-12 w-12 text-xs"
            : square
              ? "h-20 w-20 text-lg"
              : "h-20 w-40 text-sm",
        ].join(" ")}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() =>
        setImageFailed(true)
      }
      className={[
        "object-contain",
        compact
          ? "h-12 w-12 rounded-lg"
          : square
            ? "h-20 w-20 rounded-xl"
            : "h-20 max-w-full",
      ].join(" ")}
    />
  );
}

/* =========================================================
   COLOR FIELD
========================================================= */

function ColorField({
  label,
  name,
  value,
  description,
  onPickerChange,
  onTextChange,
  onBlur,
}: {
  label: string;
  name: BrandingColorField;
  value: string;
  description: string;
  onPickerChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onTextChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onBlur: () => void;
}) {
  const pickerValue = isValidHexColor(
    value
  )
    ? value
    : DEFAULT_BRANDING_SETTINGS[name];

  return (
    <div>
      <label
        htmlFor={`${name}-text`}
        className="text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-3 flex gap-3">
        <input
          aria-label={`${label} picker`}
          name={name}
          type="color"
          value={pickerValue}
          onChange={onPickerChange}
          className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
        />

        <input
          id={`${name}-text`}
          name={name}
          type="text"
          value={value}
          onChange={onTextChange}
          onBlur={onBlur}
          placeholder="#2563eb"
          maxLength={7}
          className={inputClassName}
        />
      </div>
    </div>
  );
}

/* =========================================================
   SOCIAL URL FIELD
========================================================= */

function SocialUrlField({
  label,
  name,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  name: SocialLinkField;
  value: string;
  placeholder: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <FormField
      label={label}
      htmlFor={`social-${name}`}
    >
      <input
        id={`social-${name}`}
        name={name}
        type="url"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={1000}
        className={inputClassName}
      />
    </FormField>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function BrandingPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-36 rounded bg-slate-100" />

        <div className="mt-3 h-8 w-64 max-w-full rounded bg-slate-200" />

        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>

      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="h-5 w-44 rounded bg-slate-200" />

          <div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-100" />

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="h-32 rounded-xl bg-slate-100" />
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const inputClassName =
  "block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const successAlertClassName =
  "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800";

const errorAlertClassName =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800";