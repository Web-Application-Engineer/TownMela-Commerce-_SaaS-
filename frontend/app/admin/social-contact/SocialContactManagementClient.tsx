"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

/* =========================================================
   API
========================================================= */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

/* =========================================================
   TYPES
========================================================= */

type UrlContactChannel = {
  enabled: boolean;
  url: string;
  color: string;
};

type PhoneContactChannel = {
  enabled: boolean;
  number: string;
  color: string;
};

type LabelAnimationStyle =
  | "none"
  | "typing"
  | "wave"
  | "flip"
  | "fade"
  | "bounce";

type SocialContactSettings = {
  isActive: boolean;
  labelText: string;
  labelAnimationStyle: LabelAnimationStyle;

  contacts: {
    messenger: UrlContactChannel;
    whatsapp: UrlContactChannel;
    phone: PhoneContactChannel;
    facebook: UrlContactChannel;
    instagram: UrlContactChannel;
    youtube: UrlContactChannel;
  };

  appearance: {
    panelBackground: string;
    borderColor: string;
    mainButtonColor: string;
    mainButtonHoverColor: string;
    labelBackground: string;
    labelHoverColor: string;
    labelTextColor: string;
    pulseColor: string;
  };
};

type SocialContactSettingsResponse = {
  success: boolean;
  message?: string;
  data?: Partial<SocialContactSettings>;
};

type UrlChannelName =
  | "messenger"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "youtube";

type PreviewDevice =
  | "desktop"
  | "mobile";

/* =========================================================
   DEFAULTS
========================================================= */

const defaultSettings: SocialContactSettings = {
  isActive: true,
  labelText: "Hello Me",
  labelAnimationStyle: "typing",

  contacts: {
    messenger: {
      enabled: true,
      url: "https://m.me/160255357179177",
      color: "#1b8cff",
    },

    whatsapp: {
      enabled: true,
      url: "https://wa.link/ux0yw0",
      color: "#2db742",
    },

    phone: {
      enabled: true,
      number: "+8801786373379",
      color: "#5f88f5",
    },

    facebook: {
      enabled: true,
      url: "https://facebook.com/",
      color: "#1877f2",
    },

    instagram: {
      enabled: true,
      url: "https://instagram.com/",
      color: "#e4405f",
    },

    youtube: {
      enabled: true,
      url: "https://youtube.com/",
      color: "#ff0000",
    },
  },

  appearance: {
    panelBackground: "#dddcdc",
    borderColor: "#b6252a",
    mainButtonColor: "#b6252a",
    mainButtonHoverColor: "#D15741",
    labelBackground: "#2C2F72",
    labelHoverColor: "#1DAA61",
    labelTextColor: "#ffffff",
    pulseColor: "#b6252a",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const LABEL_ANIMATION_OPTIONS: Array<{
  value: LabelAnimationStyle;
  label: string;
  description: string;
}> = [
  {
    value: "typing",
    label: "Typing",
    description:
      "Types and deletes the label like a typewriter.",
  },
  {
    value: "wave",
    label: "Letter Wave",
    description:
      "Moves each letter one after another.",
  },
  {
    value: "flip",
    label: "Flip",
    description:
      "Smooth 3D flip effect.",
  },
  {
    value: "fade",
    label: "Fade",
    description:
      "Soft fade in and out.",
  },
  {
    value: "bounce",
    label: "Bounce",
    description:
      "Gentle up-and-down bounce.",
  },
  {
    value: "none",
    label: "No Animation",
    description:
      "Keeps the label completely static.",
  },
];

function cloneDefaults(): SocialContactSettings {
  return JSON.parse(
    JSON.stringify(defaultSettings),
  ) as SocialContactSettings;
}

function getStoredValue(
  keys: string[],
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  for (const key of keys) {
    const value =
      window.localStorage.getItem(
        key,
      );

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeSettings(
  data?: Partial<SocialContactSettings>,
): SocialContactSettings {
  const source = data || {};

  const labelAnimationStyle =
    LABEL_ANIMATION_OPTIONS.some(
      (option) =>
        option.value ===
        source.labelAnimationStyle,
    )
      ? source.labelAnimationStyle!
      : defaultSettings.labelAnimationStyle;

  return {
    ...cloneDefaults(),
    ...source,
    labelAnimationStyle,

    contacts: {
      messenger: {
        ...defaultSettings.contacts.messenger,
        ...(source.contacts?.messenger || {}),
      },

      whatsapp: {
        ...defaultSettings.contacts.whatsapp,
        ...(source.contacts?.whatsapp || {}),
      },

      phone: {
        ...defaultSettings.contacts.phone,
        ...(source.contacts?.phone || {}),
      },

      facebook: {
        ...defaultSettings.contacts.facebook,
        ...(source.contacts?.facebook || {}),
      },

      instagram: {
        ...defaultSettings.contacts.instagram,
        ...(source.contacts?.instagram || {}),
      },

      youtube: {
        ...defaultSettings.contacts.youtube,
        ...(source.contacts?.youtube || {}),
      },
    },

    appearance: {
      ...defaultSettings.appearance,
      ...(source.appearance || {}),
    },
  };
}

function getSafeColor(
  value: string,
  fallback: string,
) {
  const normalized =
    String(value || "").trim();

  return HEX_COLOR_PATTERN.test(
    normalized,
  )
    ? normalized
    : fallback;
}

function validateSettings(
  settings: SocialContactSettings,
) {
  const colorValues = [
    settings.contacts.messenger.color,
    settings.contacts.whatsapp.color,
    settings.contacts.phone.color,
    settings.contacts.facebook.color,
    settings.contacts.instagram.color,
    settings.contacts.youtube.color,
    settings.appearance.panelBackground,
    settings.appearance.borderColor,
    settings.appearance.mainButtonColor,
    settings.appearance.mainButtonHoverColor,
    settings.appearance.labelBackground,
    settings.appearance.labelHoverColor,
    settings.appearance.labelTextColor,
    settings.appearance.pulseColor,
  ];

  if (
    colorValues.some(
      (color) =>
        !HEX_COLOR_PATTERN.test(
          String(color || "").trim(),
        ),
    )
  ) {
    throw new Error(
      "Please enter valid HEX colors, for example #FF6900.",
    );
  }

  if (
    settings.labelText.trim().length >
    40
  ) {
    throw new Error(
      "Contact label must not exceed 40 characters.",
    );
  }

  if (
    !LABEL_ANIMATION_OPTIONS.some(
      (option) =>
        option.value ===
        settings.labelAnimationStyle,
    )
  ) {
    throw new Error(
      "Please select a valid label animation style.",
    );
  }
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() =>
        onChange(!checked)
      }
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-[#FF6900]"
          : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked
            ? "translate-x-6"
            : "translate-x-1"
        }`}
      />
    </button>
  );
}

function BrandIcon({
  name,
}: {
  name:
    | UrlChannelName
    | "phone";
}) {
  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M13.5 8H15V5h-1.5C10.46 5 9 6.79 9 9.5V11H7v3h2v5h3v-5h2.25l.75-3H12V9.5c0-.86.14-1.5 1.5-1.5z" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.51 5.51 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.75-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M23 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.5.3A3 3 0 0 0 1.4 7.4C1 8.9 1 12 1 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.5-.3a3 3 0 0 0 2.1-2.1C23 15.1 23 12 23 12zm-14 3.8V8.2l6.5 3.8L9 15.8z" />
      </svg>
    );
  }

  if (name === "messenger") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.92 1.46 5.52 3.74 7.21V22l3.21-1.77c.96.26 1.98.4 3.05.4 5.52 0 10-4.14 10-9.25S17.52 2 12 2zm.99 8.78-2.55 2.71-1.95-1.53-3.44 1.88 4.9-5.2 2.04 1.53 1.86-1.53 3.55-1.94-4.41 4.08z" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M20.52 3.48A11.8 11.8 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.08.54 4.1 1.57 5.88L0 24l6.42-1.68a11.9 11.9 0 0 0 5.65 1.44h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.46-8.38zM12.08 21.74h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81 1 1.02-3.71-.23-.38a9.86 9.86 0 0 1-1.52-5.27c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.89a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.87 9.88zm5.42-7.39c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.28-.47-2.43-1.49-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51 0 1.47 1.08 2.9 1.23 3.1.15.2 2.11 3.23 5.12 4.54.71.31 1.27.49 1.7.62.72.23 1.38.2 1.9.12.58-.09 1.8-.74 2.05-1.46.26-.72.26-1.34.18-1.46-.08-.12-.28-.2-.58-.35z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M6.62 10.79a15.07 15.07 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.08 21 3 13.92 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[1fr_190px] sm:items-center">
      <label className="text-sm font-bold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={getSafeColor(
            value,
            fallback,
          )}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
          aria-label={`${label} color picker`}
        />

        <input
          type="text"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function AnimatedLabelText({
  text,
  animationStyle,
}: {
  text: string;
  animationStyle: LabelAnimationStyle;
}) {
  const safeText =
    text.trim() || "Hello Me";

  const [
    typedText,
    setTypedText,
  ] = useState(
    animationStyle === "typing"
      ? ""
      : safeText,
  );

  useEffect(() => {
    if (
      animationStyle !==
      "typing"
    ) {
      setTypedText(safeText);
      return;
    }

    let index = 0;
    let deleting = false;
    let timeoutId:
      | ReturnType<typeof setTimeout>
      | undefined;

    const run = () => {
      if (!deleting) {
        index += 1;
        setTypedText(
          safeText.slice(0, index),
        );

        if (index >= safeText.length) {
          deleting = true;
          timeoutId =
            setTimeout(run, 1300);
          return;
        }

        timeoutId =
          setTimeout(run, 105);
        return;
      }

      index -= 1;
      setTypedText(
        safeText.slice(
          0,
          Math.max(0, index),
        ),
      );

      if (index <= 0) {
        deleting = false;
        timeoutId =
          setTimeout(run, 450);
        return;
      }

      timeoutId =
        setTimeout(run, 60);
    };

    setTypedText("");
    timeoutId =
      setTimeout(run, 300);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [safeText, animationStyle]);

  if (animationStyle === "typing") {
    return (
      <span className="flex min-w-0 items-center overflow-hidden whitespace-nowrap">
        <span className="truncate">
          {typedText}
        </span>
        <span className="tm-social-typing-cursor" />
      </span>
    );
  }

  if (animationStyle === "wave") {
    return (
      <span className="inline-flex min-w-0 overflow-hidden whitespace-nowrap">
        {Array.from(safeText).map(
          (character, index) => (
            <span
              key={`${character}-${index}`}
              className="tm-social-letter-wave"
              style={{
                animationDelay:
                  `${index * 85}ms`,
              }}
            >
              {character === " "
                ? "\u00A0"
                : character}
            </span>
          ),
        )}
      </span>
    );
  }

  if (animationStyle === "flip") {
    return (
      <span className="tm-social-label-flip inline-block truncate">
        {safeText}
      </span>
    );
  }

  if (animationStyle === "fade") {
    return (
      <span className="tm-social-label-fade inline-block truncate">
        {safeText}
      </span>
    );
  }

  if (animationStyle === "bounce") {
    return (
      <span className="tm-social-label-bounce inline-block truncate">
        {safeText}
      </span>
    );
  }

  return (
    <span className="inline-block truncate">
      {safeText}
    </span>
  );
}

/* =========================================================
   PAGE CLIENT
========================================================= */

export default function SocialContactManagementClient() {
  const {
    selectedTenant,
    selectedTenantId,
    loadingTenants,
  } = useTenant();

  const [
    settings,
    setSettings,
  ] = useState<SocialContactSettings>(
    cloneDefaults(),
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    previewDevice,
    setPreviewDevice,
  ] = useState<PreviewDevice>(
    "desktop",
  );

  const [
    isMainHovered,
    setIsMainHovered,
  ] = useState(false);

  const [
    isLabelHovered,
    setIsLabelHovered,
  ] = useState(false);

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
    }, [selectedTenantId]);

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
          cloneDefaults(),
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
            `${API_BASE_URL}/api/social-contact-settings`,
            {
              method: "GET",
              headers:
                buildHeaders(),
              credentials:
                "include",
              cache: "no-store",
            },
          );

        const payload =
          (await response
            .json()
            .catch(() =>
              null,
            )) as
            | SocialContactSettingsResponse
            | null;

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            payload?.message ||
              "Failed to load Social Contact settings.",
          );
        }

        setSettings(
          normalizeSettings(
            payload.data,
          ),
        );
      } catch (error) {
        console.error(
          "Social Contact settings load error:",
          error,
        );

        setSettings(
          cloneDefaults(),
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load Social Contact settings.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      buildHeaders,
      loadingTenants,
      selectedTenantId,
    ]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /* =======================================================
     UPDATE HELPERS
  ======================================================= */

  function updateUrlChannel(
    channelName: UrlChannelName,
    field: keyof UrlContactChannel,
    value: string | boolean,
  ) {
    setSettings(
      (current) => ({
        ...current,
        contacts: {
          ...current.contacts,
          [channelName]: {
            ...current.contacts[
              channelName
            ],
            [field]: value,
          },
        },
      }),
    );

    setSuccessMessage("");
  }

  function updatePhoneChannel(
    field: keyof PhoneContactChannel,
    value: string | boolean,
  ) {
    setSettings(
      (current) => ({
        ...current,
        contacts: {
          ...current.contacts,
          phone: {
            ...current.contacts.phone,
            [field]: value,
          },
        },
      }),
    );

    setSuccessMessage("");
  }

  function updateAppearance(
    field:
      keyof SocialContactSettings["appearance"],
    value: string,
  ) {
    setSettings(
      (current) => ({
        ...current,
        appearance: {
          ...current.appearance,
          [field]: value,
        },
      }),
    );

    setSuccessMessage("");
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveSettings() {
    if (!selectedTenantId) {
      setErrorMessage(
        "Please select a tenant before saving Social Contact settings.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      validateSettings(
        settings,
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/social-contact-settings`,
          {
            method: "PATCH",
            headers:
              buildHeaders(),
            credentials:
              "include",
            body: JSON.stringify(
              settings,
            ),
          },
        );

      const payload =
        (await response
          .json()
          .catch(() =>
            null,
          )) as
          | SocialContactSettingsResponse
          | null;

      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
            "Failed to save Social Contact settings.",
        );
      }

      setSettings(
        normalizeSettings(
          payload.data,
        ),
      );

      setSuccessMessage(
        payload.message ||
          "Social Contact settings saved successfully.",
      );

      window.dispatchEvent(
        new CustomEvent(
          "social-contact-settings-updated",
        ),
      );
    } catch (error) {
      console.error(
        "Social Contact settings save error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save Social Contact settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =======================================================
     RESET LOCAL FORM
  ======================================================= */

  function resetToDefaults() {
    if (
      typeof window !==
        "undefined" &&
      !window.confirm(
        "Reset all Social Contact fields to the default values? You must click Save Changes to store them.",
      )
    ) {
      return;
    }

    setSettings(
      cloneDefaults(),
    );
    setErrorMessage("");
    setSuccessMessage(
      "Default values loaded. Click Save Changes to apply them to this tenant.",
    );
  }

  /* =======================================================
     VIEW DATA
  ======================================================= */

  const tenantName =
    selectedTenant?.storeName?.trim() ||
    selectedTenant?.businessName?.trim() ||
    "Selected Tenant";

  const enabledPreviewItems = [
    {
      key: "facebook" as const,
      enabled:
        settings.contacts.facebook.enabled,
      color:
        settings.contacts.facebook.color,
    },
    {
      key: "instagram" as const,
      enabled:
        settings.contacts.instagram.enabled,
      color:
        settings.contacts.instagram.color,
    },
    {
      key: "youtube" as const,
      enabled:
        settings.contacts.youtube.enabled,
      color:
        settings.contacts.youtube.color,
    },
    {
      key: "messenger" as const,
      enabled:
        settings.contacts.messenger.enabled,
      color:
        settings.contacts.messenger.color,
    },
    {
      key: "whatsapp" as const,
      enabled:
        settings.contacts.whatsapp.enabled,
      color:
        settings.contacts.whatsapp.color,
    },
    {
      key: "phone" as const,
      enabled:
        settings.contacts.phone.enabled,
      color:
        settings.contacts.phone.color,
    },
  ].filter(
    (item) => item.enabled,
  );

  /* =======================================================
     LOADING / TENANT STATE
  ======================================================= */

  if (
    loadingTenants ||
    isLoading
  ) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            size={34}
            className="mx-auto animate-spin text-[#FF6900]"
          />

          <p className="mt-3 text-sm font-semibold text-slate-500">
            Loading Social Contact settings...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedTenantId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        Please select a tenant first to manage Social Contact settings.
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1560px] pb-10">
      <style>{`
        @keyframes tmSocialTypingCursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        @keyframes tmSocialLetterWave {
          0%, 70%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          80% {
            transform: translateY(-3px);
            opacity: 0.78;
          }
          90% {
            transform: translateY(1px);
            opacity: 1;
          }
        }

        @keyframes tmSocialLabelFlip {
          0%, 70%, 100% {
            transform: rotateX(0deg);
            opacity: 1;
          }
          82% {
            transform: rotateX(90deg);
            opacity: 0.25;
          }
          92% {
            transform: rotateX(0deg);
            opacity: 1;
          }
        }

        @keyframes tmSocialLabelFade {
          0%, 70%, 100% { opacity: 1; }
          82% { opacity: 0.2; }
          92% { opacity: 1; }
        }

        @keyframes tmSocialLabelBounce {
          0%, 72%, 100% {
            transform: translateY(0);
          }
          82% {
            transform: translateY(-4px);
          }
          90% {
            transform: translateY(1px);
          }
        }

        .tm-social-typing-cursor {
          display: inline-block;
          width: 1px;
          height: 1em;
          margin-left: 2px;
          flex-shrink: 0;
          background: currentColor;
          animation: tmSocialTypingCursor 0.8s steps(1, end) infinite;
        }

        .tm-social-letter-wave {
          display: inline-block;
          animation: tmSocialLetterWave 2.8s ease-in-out infinite;
        }

        .tm-social-label-flip {
          transform-origin: center;
          animation: tmSocialLabelFlip 3s ease-in-out infinite;
        }

        .tm-social-label-fade {
          animation: tmSocialLabelFade 3s ease-in-out infinite;
        }

        .tm-social-label-bounce {
          animation: tmSocialLabelBounce 2.8s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .tm-social-typing-cursor,
          .tm-social-letter-wave,
          .tm-social-label-flip,
          .tm-social-label-fade,
          .tm-social-label-bounce {
            animation: none;
          }
        }
      `}</style>
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#FF6900]">
            Storefront Communication
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Social Contact
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage contact links, channel visibility and floating widget colors for {tenantName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Widget Status
              </p>
              <p className={`mt-0.5 text-sm font-extrabold ${
                settings.isActive
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}>
                {settings.isActive
                  ? "Active"
                  : "Disabled"}
              </p>
            </div>

            <Toggle
              checked={
                settings.isActive
              }
              onChange={(checked) => {
                setSettings(
                  (current) => ({
                    ...current,
                    isActive: checked,
                  }),
                );
                setSuccessMessage("");
              }}
              label="Toggle Social Contact widget"
            />
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      {errorMessage && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(420px,560px)]">
        {/* =================================================
            CONTACT LINKS
        ================================================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-black text-slate-900">
              Contact Links
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Enable or disable each contact method and update its destination.
            </p>
          </div>

          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {/* LABEL */}
            <div className="py-5">
              <label className="text-sm font-bold text-slate-700">
                Main Label Text
              </label>
              <input
                type="text"
                maxLength={40}
                value={settings.labelText}
                onChange={(event) => {
                  setSettings(
                    (current) => ({
                      ...current,
                      labelText:
                        event.target.value,
                    }),
                  );
                  setSuccessMessage("");
                }}
                placeholder="Hello Me"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Maximum 40 characters.
              </p>

              <div className="mt-4">
                <label className="text-sm font-bold text-slate-700">
                  Label Text Animation
                </label>

                <select
                  value={
                    settings.labelAnimationStyle
                  }
                  onChange={(event) => {
                    setSettings(
                      (current) => ({
                        ...current,
                        labelAnimationStyle:
                          event.target.value as LabelAnimationStyle,
                      }),
                    );
                    setSuccessMessage("");
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                >
                  {LABEL_ANIMATION_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {
                    LABEL_ANIMATION_OPTIONS.find(
                      (option) =>
                        option.value ===
                        settings.labelAnimationStyle,
                    )?.description
                  }
                </p>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Animation Preview
                  </p>
                  <div className="mt-2 flex min-h-7 items-center overflow-hidden text-sm font-black text-[#0B1F3A]">
                    <AnimatedLabelText
                      text={settings.labelText}
                      animationStyle={
                        settings.labelAnimationStyle
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {([
              {
                key: "messenger" as const,
                label: "Messenger",
                placeholder:
                  "https://m.me/yourpageid",
              },
              {
                key: "whatsapp" as const,
                label: "WhatsApp",
                placeholder:
                  "https://wa.me/8801XXXXXXX",
              },
              {
                key: "facebook" as const,
                label: "Facebook",
                placeholder:
                  "https://facebook.com/yourpage",
              },
              {
                key: "instagram" as const,
                label: "Instagram",
                placeholder:
                  "https://instagram.com/yourusername",
              },
              {
                key: "youtube" as const,
                label: "YouTube",
                placeholder:
                  "https://youtube.com/@yourchannel",
              },
            ]).map((channel) => {
              const channelData =
                settings.contacts[
                  channel.key
                ];

              return (
                <div
                  key={channel.key}
                  className="py-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm"
                        style={{
                          backgroundColor:
                            getSafeColor(
                              channelData.color,
                              defaultSettings.contacts[
                                channel.key
                              ].color,
                            ),
                        }}
                      >
                        <BrandIcon
                          name={channel.key}
                        />
                      </span>

                      <div>
                        <p className="text-sm font-extrabold text-slate-800">
                          {channel.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {channelData.enabled
                            ? "Visible on widget"
                            : "Hidden from widget"}
                        </p>
                      </div>
                    </div>

                    <Toggle
                      checked={
                        channelData.enabled
                      }
                      onChange={(checked) =>
                        updateUrlChannel(
                          channel.key,
                          "enabled",
                          checked,
                        )
                      }
                      label={`Enable ${channel.label}`}
                    />
                  </div>

                  <input
                    type="url"
                    value={
                      channelData.url
                    }
                    onChange={(event) =>
                      updateUrlChannel(
                        channel.key,
                        "url",
                        event.target.value,
                      )
                    }
                    placeholder={
                      channel.placeholder
                    }
                    className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
                  />
                </div>
              );
            })}

            {/* PHONE */}
            <div className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm"
                    style={{
                      backgroundColor:
                        getSafeColor(
                          settings.contacts.phone.color,
                          defaultSettings.contacts.phone.color,
                        ),
                    }}
                  >
                    <BrandIcon name="phone" />
                  </span>

                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      Phone
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {settings.contacts.phone.enabled
                        ? "Visible on widget"
                        : "Hidden from widget"}
                    </p>
                  </div>
                </div>

                <Toggle
                  checked={
                    settings.contacts.phone.enabled
                  }
                  onChange={(checked) =>
                    updatePhoneChannel(
                      "enabled",
                      checked,
                    )
                  }
                  label="Enable Phone"
                />
              </div>

              <input
                type="text"
                value={
                  settings.contacts.phone.number
                }
                onChange={(event) =>
                  updatePhoneChannel(
                    "number",
                    event.target.value,
                  )
                }
                placeholder="+8801786373379"
                className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            COLOR SETTINGS
        ================================================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-black text-slate-900">
              Color Settings
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Customize the floating widget colors to match the tenant brand.
            </p>
          </div>

          <div className="px-5 sm:px-6">
            <ColorField
              label="Panel Background"
              value={settings.appearance.panelBackground}
              fallback={defaultSettings.appearance.panelBackground}
              onChange={(value) =>
                updateAppearance(
                  "panelBackground",
                  value,
                )
              }
            />

            <ColorField
              label="Panel Border Color"
              value={settings.appearance.borderColor}
              fallback={defaultSettings.appearance.borderColor}
              onChange={(value) =>
                updateAppearance(
                  "borderColor",
                  value,
                )
              }
            />

            <ColorField
              label="Main Button Color"
              value={settings.appearance.mainButtonColor}
              fallback={defaultSettings.appearance.mainButtonColor}
              onChange={(value) =>
                updateAppearance(
                  "mainButtonColor",
                  value,
                )
              }
            />

            <ColorField
              label="Main Button Hover Color"
              value={settings.appearance.mainButtonHoverColor}
              fallback={defaultSettings.appearance.mainButtonHoverColor}
              onChange={(value) =>
                updateAppearance(
                  "mainButtonHoverColor",
                  value,
                )
              }
            />

            <ColorField
              label="Messenger Color"
              value={settings.contacts.messenger.color}
              fallback={defaultSettings.contacts.messenger.color}
              onChange={(value) =>
                updateUrlChannel(
                  "messenger",
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="WhatsApp Color"
              value={settings.contacts.whatsapp.color}
              fallback={defaultSettings.contacts.whatsapp.color}
              onChange={(value) =>
                updateUrlChannel(
                  "whatsapp",
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="Phone Color"
              value={settings.contacts.phone.color}
              fallback={defaultSettings.contacts.phone.color}
              onChange={(value) =>
                updatePhoneChannel(
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="Facebook Color"
              value={settings.contacts.facebook.color}
              fallback={defaultSettings.contacts.facebook.color}
              onChange={(value) =>
                updateUrlChannel(
                  "facebook",
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="Instagram Color"
              value={settings.contacts.instagram.color}
              fallback={defaultSettings.contacts.instagram.color}
              onChange={(value) =>
                updateUrlChannel(
                  "instagram",
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="YouTube Color"
              value={settings.contacts.youtube.color}
              fallback={defaultSettings.contacts.youtube.color}
              onChange={(value) =>
                updateUrlChannel(
                  "youtube",
                  "color",
                  value,
                )
              }
            />

            <ColorField
              label="Label Background Color"
              value={settings.appearance.labelBackground}
              fallback={defaultSettings.appearance.labelBackground}
              onChange={(value) =>
                updateAppearance(
                  "labelBackground",
                  value,
                )
              }
            />

            <ColorField
              label="Label Hover Color"
              value={settings.appearance.labelHoverColor}
              fallback={defaultSettings.appearance.labelHoverColor}
              onChange={(value) =>
                updateAppearance(
                  "labelHoverColor",
                  value,
                )
              }
            />

            <ColorField
              label="Label Text Color"
              value={settings.appearance.labelTextColor}
              fallback={defaultSettings.appearance.labelTextColor}
              onChange={(value) =>
                updateAppearance(
                  "labelTextColor",
                  value,
                )
              }
            />

          </div>
        </section>

        {/* =================================================
            LIVE PREVIEW
        ================================================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm 2xl:sticky 2xl:top-6">
          <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-black text-slate-900">
              Preview Screen
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Live responsive preview of the floating contact widget.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPreviewDevice(
                    "desktop",
                  )
                }
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
                  previewDevice ===
                  "desktop"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Monitor size={15} />
                Desktop
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewDevice(
                    "mobile",
                  )
                }
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
                  previewDevice ===
                  "mobile"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Smartphone size={15} />
                Mobile
              </button>
            </div>

            <span className="text-xs font-semibold text-slate-400">
              Updates as you type
            </span>
          </div>

          <div className="bg-slate-100 p-4 sm:p-6">
            <div
              className={`relative mx-auto overflow-hidden rounded-xl border-2 border-red-300 bg-[#efefef] transition-all duration-300 ${
                previewDevice ===
                "mobile"
                  ? "min-h-[560px] max-w-[360px]"
                  : "min-h-[620px] max-w-[560px]"
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-300">
                Preview Screen
              </div>

              {!settings.isActive ? (
                <div className="absolute inset-x-4 bottom-6 rounded-xl border border-slate-200 bg-white/95 p-4 text-center shadow-lg">
                  <p className="text-sm font-black text-slate-700">
                    Social Contact Widget Disabled
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Turn Widget Status on to display it on the storefront.
                  </p>
                </div>
              ) : (
                <div
                  className="absolute right-3 z-10 font-sans"
                  style={{
                    bottom:
                      previewDevice ===
                      "mobile"
                        ? 14
                        : 20,
                  }}
                >
                  <div
                    className={`relative ${
                      previewDevice ===
                      "mobile"
                        ? "min-h-[330px] w-[82px]"
                        : "min-h-[360px] w-[90px]"
                    }`}
                  >
                    {enabledPreviewItems.length >
                      0 && (
                      <div
                        className="absolute flex flex-col items-center gap-2 rounded-[30px] border-2 p-1.5 shadow-[0_2px_10px_rgba(73,73,73,0.14)]"
                        style={{
                          right:
                            previewDevice ===
                            "mobile"
                              ? 8
                              : 10,
                          bottom:
                            previewDevice ===
                            "mobile"
                              ? 66
                              : 72,
                          width:
                            previewDevice ===
                            "mobile"
                              ? 60
                              : 64,
                          backgroundColor:
                            getSafeColor(
                              settings.appearance.panelBackground,
                              defaultSettings.appearance.panelBackground,
                            ),
                          borderColor:
                            getSafeColor(
                              settings.appearance.borderColor,
                              defaultSettings.appearance.borderColor,
                            ),
                        }}
                      >
                        {enabledPreviewItems.map(
                          (item) => (
                            <span
                              key={item.key}
                              className={`flex items-center justify-center rounded-full border border-white text-white shadow-sm ${
                                previewDevice ===
                                "mobile"
                                  ? "h-11 w-11"
                                  : "h-[46px] w-[46px]"
                              }`}
                              style={{
                                backgroundColor:
                                  getSafeColor(
                                    item.color,
                                    defaultSettings.contacts[
                                      item.key
                                    ].color,
                                  ),
                              }}
                            >
                              <BrandIcon
                                name={
                                  item.key
                                }
                              />
                            </span>
                          ),
                        )}
                      </div>
                    )}

                    <div
                      className="absolute flex items-center justify-end"
                      style={{
                        right:
                          previewDevice ===
                          "mobile"
                            ? 8
                            : 5,
                        bottom:
                          previewDevice ===
                          "mobile"
                            ? 8
                            : 10,
                        height:
                          previewDevice ===
                          "mobile"
                            ? 52
                            : 54,
                      }}
                    >
                      <div
                        className="absolute top-1/2 z-[1] flex -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full px-3.5 shadow-[0_2px_10px_rgba(73,73,73,0.14)]"
                        onMouseEnter={() =>
                          setIsLabelHovered(
                            true,
                          )
                        }
                        onMouseLeave={() =>
                          setIsLabelHovered(
                            false,
                          )
                        }
                        style={{
                          right: "calc(100% - 12px)",
                          width:
                            previewDevice ===
                            "mobile"
                              ? 118
                              : 128,
                          height:
                            previewDevice ===
                            "mobile"
                              ? 36
                              : 38,
                          color:
                            getSafeColor(
                              settings.appearance.labelTextColor,
                              defaultSettings.appearance.labelTextColor,
                            ),
                          backgroundColor:
                            getSafeColor(
                              isLabelHovered
                                ? settings.appearance.labelHoverColor
                                : settings.appearance.labelBackground,
                              isLabelHovered
                                ? defaultSettings.appearance.labelHoverColor
                                : defaultSettings.appearance.labelBackground,
                            ),
                        }}
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black leading-none sm:text-xs">
                          <svg viewBox="0 0 25 25" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                            <path d="M12 1a10 10 0 0 0-10 10v3a3 3 0 0 0 3 3h1v-8H5a7 7 0 0 1 14 0h-1v8h1a3 3 0 0 0 3-3v-3A10 10 0 0 0 12 1zm-4 14a2 2 0 0 1-2-2v-3a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2zm8 0a2 2 0 0 1-2-2v-3a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2z" />
                          </svg>
                          <span className="max-w-[92px] overflow-hidden whitespace-nowrap">
                            <AnimatedLabelText
                              text={settings.labelText}
                              animationStyle={
                                settings.labelAnimationStyle
                              }
                            />
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label="Contact widget preview button"
                        onMouseEnter={() =>
                          setIsMainHovered(
                            true,
                          )
                        }
                        onMouseLeave={() =>
                          setIsMainHovered(
                            false,
                          )
                        }
                        className={`relative z-[2] flex items-center justify-center rounded-full border border-white text-white shadow-[0_2px_10px_rgba(73,73,73,0.14)] ${
                          previewDevice ===
                          "mobile"
                            ? "h-[52px] w-[52px]"
                            : "h-[54px] w-[54px]"
                        }`}
                        style={{
                          backgroundColor:
                            getSafeColor(
                              isMainHovered
                                ? settings.appearance.mainButtonHoverColor
                                : settings.appearance.mainButtonColor,
                              isMainHovered
                                ? defaultSettings.appearance.mainButtonHoverColor
                                : defaultSettings.appearance.mainButtonColor,
                            ),
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
                          <path d="M12 2C6.48 2 2 5.58 2 10c0 2.39 1.4 4.52 3.6 5.99L5 22l4.27-2.28c.88.18 1.8.28 2.73.28 5.52 0 10-3.58 10-8s-4.48-8-10-8zm-4 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm4 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm4 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-5 py-4 text-xs leading-5 text-slate-400 sm:px-6">
            Desktop and Mobile buttons only change this preview frame. The storefront widget itself will be connected in the next step.
          </div>
        </section>
      </div>

      {/* ACTION BAR */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-800">
            Tenant-specific settings
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Changes are saved only for {tenantName} and do not modify other tenants.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={17} />
            Reset
          </button>

          <button
            type="button"
            onClick={() =>
              void saveSettings()
            }
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {isSaving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
