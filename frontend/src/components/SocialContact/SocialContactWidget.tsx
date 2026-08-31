"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useStorefrontTenant,
} from "@/src/context/StorefrontTenantContext";

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
  success?: boolean;
  message?: string;
  data?: Partial<SocialContactSettings>;
};

type BrandName =
  | "facebook"
  | "instagram"
  | "youtube"
  | "messenger"
  | "whatsapp"
  | "phone";

type ContactItem = {
  key: BrandName;
  label: string;
  href: string;
  color: string;
  external: boolean;
};

/* =========================================================
   DEFAULTS

   Used only for shape/color normalization after a successful
   tenant API response. If the API fails, the widget stays
   hidden so another tenant's/default contacts are never shown.
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

function getSafeColor(
  value: string | undefined,
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

function normalizeSettings(
  data?: Partial<SocialContactSettings>,
): SocialContactSettings {
  const source = data || {};

  const validAnimationStyles: LabelAnimationStyle[] = [
    "none",
    "typing",
    "wave",
    "flip",
    "fade",
    "bounce",
  ];

  const labelAnimationStyle =
    validAnimationStyles.includes(
      source.labelAnimationStyle as LabelAnimationStyle,
    )
      ? (source.labelAnimationStyle as LabelAnimationStyle)
      : defaultSettings.labelAnimationStyle;

  return {
    ...defaultSettings,
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

function normalizePhoneHref(
  value: string,
) {
  const phone =
    String(value || "")
      .trim()
      .replace(
        /[^\d+]/g,
        "",
      );

  return phone
    ? `tel:${phone}`
    : "";
}

/* =========================================================
   BRAND ICON
========================================================= */

function BrandIcon({
  name,
}: {
  name: BrandName;
}) {
  if (name === "facebook") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M13.5 8H15V5h-1.5C10.46 5 9 6.79 9 9.5V11H7v3h2v5h3v-5h2.25l.75-3H12V9.5c0-.86.14-1.5 1.5-1.5z" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.51 5.51 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.75-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M23 12s0-3.1-.4-4.6a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.5.3A3 3 0 0 0 1.4 7.4C1 8.9 1 12 1 12s0 3.1.4 4.6a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.5-.3a3 3 0 0 0 2.1-2.1C23 15.1 23 12 23 12zm-14 3.8V8.2l6.5 3.8L9 15.8z" />
      </svg>
    );
  }

  if (name === "messenger") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.92 1.46 5.52 3.74 7.21V22l3.21-1.77c.96.26 1.98.4 3.05.4 5.52 0 10-4.14 10-9.25S17.52 2 12 2zm.99 8.78-2.55 2.71-1.95-1.53-3.44 1.88 4.9-5.2 2.04 1.53 1.86-1.53 3.55-1.94-4.41 4.08z" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M20.52 3.48A11.8 11.8 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.08.54 4.1 1.57 5.88L0 24l6.42-1.68a11.9 11.9 0 0 0 5.65 1.44h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.46-8.38zM12.08 21.74h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81 1 1.02-3.71-.23-.38a9.86 9.86 0 0 1-1.52-5.27c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.89a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.87 9.88zm5.42-7.39c-.3-.15-1.8-.88-2.08-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.28-.47-2.43-1.49-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51 0 1.47 1.08 2.9 1.23 3.1.15.2 2.11 3.23 5.12 4.54.71.31 1.27.49 1.7.62.72.23 1.38.2 1.9.12.58-.09 1.8-.74 2.05-1.46.26-.72.26-1.34.18-1.46-.08-.12-.28-.2-.58-.35z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-current"
      aria-hidden="true"
    >
      <path d="M6.62 10.79a15.07 15.07 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.08 21 3 13.92 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
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
    if (animationStyle !== "typing") {
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
   SOCIAL CONTACT WIDGET
========================================================= */

export default function SocialContactWidget() {
  const {
    tenantId,
    isLoading: isTenantLoading,
  } = useStorefrontTenant();

  const widgetRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * Desktop/tablet hover handoff timer.
   *
   * There is a small visual gap between the bottom trigger and
   * the social icon panel. Closing immediately on mouse leave
   * makes the panel disappear before the pointer can reach an icon.
   * A short delay keeps the panel open long enough to cross that gap.
   */
  const hoverCloseTimerRef =
    useRef<
      ReturnType<typeof setTimeout> |
      null
    >(null);

  const [
    settings,
    setSettings,
  ] =
    useState<SocialContactSettings | null>(
      null,
    );

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    isMainHovered,
    setIsMainHovered,
  ] = useState(false);

  const [
    isLabelHovered,
    setIsLabelHovered,
  ] = useState(false);

  /* =======================================================
     DESKTOP / TABLET HOVER HELPERS
  ======================================================= */

  const clearHoverCloseTimer =
    () => {
      if (
        hoverCloseTimerRef.current
      ) {
        clearTimeout(
          hoverCloseTimerRef.current,
        );

        hoverCloseTimerRef.current =
          null;
      }
    };

  const openOnDesktopHover =
    () => {
      if (
        !window.matchMedia(
          "(min-width: 768px)",
        ).matches
      ) {
        return;
      }

      clearHoverCloseTimer();
      setIsOpen(true);
    };

  const closeOnDesktopHoverLeave =
    () => {
      if (
        !window.matchMedia(
          "(min-width: 768px)",
        ).matches
      ) {
        return;
      }

      clearHoverCloseTimer();

      hoverCloseTimerRef.current =
        setTimeout(
          () => {
            setIsOpen(false);

            hoverCloseTimerRef.current =
              null;
          },
          260,
        );
    };

  /*
   * Clear any pending close timer when the widget unmounts.
   */
  useEffect(() => {
    return () => {
      if (
        hoverCloseTimerRef.current
      ) {
        clearTimeout(
          hoverCloseTimerRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     LOAD TENANT-SPECIFIC PUBLIC SETTINGS
  ======================================================= */

  useEffect(() => {
    if (
      isTenantLoading ||
      !tenantId
    ) {
      return;
    }

    let isActive = true;

    const loadSettings =
      async () => {
        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/social-contact-settings/public`,
              {
                method: "GET",
                cache: "no-store",

                headers: {
                  Accept:
                    "application/json",

                  "X-Tenant-Id":
                    tenantId,
                },
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () => null,
              )) as
              | SocialContactSettingsResponse
              | null;

          if (
            !response.ok ||
            !payload?.success ||
            !payload.data
          ) {
            throw new Error(
              payload?.message ||
                "Social contact settings could not be loaded.",
            );
          }

          if (isActive) {
            setSettings(
              normalizeSettings(
                payload.data,
              ),
            );
          }
        } catch (error) {
          console.error(
            "Social contact storefront loading error:",
            error,
          );

          if (isActive) {
            /*
             * Do not show generic/default contact links when
             * tenant-specific settings fail to load.
             */
            setSettings(null);
          }
        }
      };

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, [
    tenantId,
    isTenantLoading,
  ]);

  /* =======================================================
     CLOSE ON OUTSIDE CLICK / MOBILE SCROLL
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeIfOutside = (
      event: MouseEvent | TouchEvent,
    ) => {
      const target =
        event.target as Node | null;

      if (
        target &&
        widgetRef.current &&
        !widgetRef.current.contains(
          target,
        )
      ) {
        setIsOpen(false);
      }
    };

    const closeOnMobileScroll =
      () => {
        if (
          window.matchMedia(
            "(max-width: 767px)",
          ).matches
        ) {
          setIsOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      closeIfOutside,
    );

    document.addEventListener(
      "touchstart",
      closeIfOutside,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "scroll",
      closeOnMobileScroll,
      {
        passive: true,
      },
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeIfOutside,
      );

      document.removeEventListener(
        "touchstart",
        closeIfOutside,
      );

      window.removeEventListener(
        "scroll",
        closeOnMobileScroll,
      );
    };
  }, [
    isOpen,
  ]);

  const contactItems =
    useMemo<ContactItem[]>(
      () => {
        if (!settings) {
          return [];
        }

        const {
          contacts,
        } = settings;

        return [
          {
            key: "facebook",
            label: "Facebook",
            href:
              contacts.facebook.url.trim(),
            color:
              contacts.facebook.color,
            external: true,
            enabled:
              contacts.facebook.enabled,
          },

          {
            key: "instagram",
            label: "Instagram",
            href:
              contacts.instagram.url.trim(),
            color:
              contacts.instagram.color,
            external: true,
            enabled:
              contacts.instagram.enabled,
          },

          {
            key: "youtube",
            label: "YouTube",
            href:
              contacts.youtube.url.trim(),
            color:
              contacts.youtube.color,
            external: true,
            enabled:
              contacts.youtube.enabled,
          },

          {
            key: "messenger",
            label: "Messenger",
            href:
              contacts.messenger.url.trim(),
            color:
              contacts.messenger.color,
            external: true,
            enabled:
              contacts.messenger.enabled,
          },

          {
            key: "whatsapp",
            label: "WhatsApp",
            href:
              contacts.whatsapp.url.trim(),
            color:
              contacts.whatsapp.color,
            external: true,
            enabled:
              contacts.whatsapp.enabled,
          },

          {
            key: "phone",
            label: "Call now",
            href:
              normalizePhoneHref(
                contacts.phone.number,
              ),
            color:
              contacts.phone.color,
            external: false,
            enabled:
              contacts.phone.enabled,
          },
        ]
          .filter(
            (
              item,
            ): item is ContactItem & {
              enabled: boolean;
            } =>
              item.enabled &&
              Boolean(item.href),
          )
          .map(
            ({
              enabled: _enabled,
              ...item
            }) => item,
          );
      },
      [
        settings,
      ],
    );

  if (
    !settings ||
    !settings.isActive
  ) {
    return null;
  }

  const appearance =
    settings.appearance;

  const panelBackground =
    getSafeColor(
      appearance.panelBackground,
      defaultSettings.appearance
        .panelBackground,
    );

  const borderColor =
    getSafeColor(
      appearance.borderColor,
      defaultSettings.appearance
        .borderColor,
    );

  const mainButtonColor =
    getSafeColor(
      isMainHovered
        ? appearance.mainButtonHoverColor
        : appearance.mainButtonColor,
      isMainHovered
        ? defaultSettings.appearance
            .mainButtonHoverColor
        : defaultSettings.appearance
            .mainButtonColor,
    );

  const labelBackground =
    getSafeColor(
      isLabelHovered
        ? appearance.labelHoverColor
        : appearance.labelBackground,
      isLabelHovered
        ? defaultSettings.appearance
            .labelHoverColor
        : defaultSettings.appearance
            .labelBackground,
    );

  const labelTextColor =
    getSafeColor(
      appearance.labelTextColor,
      defaultSettings.appearance
        .labelTextColor,
    );

  const labelText =
    settings.labelText.trim() ||
    "Hello Me";

  return (
    <div
      ref={widgetRef}
      className="
        pointer-events-none
        fixed
        right-2
        bottom-[65px]
        z-[90]
        h-[340px]
        w-[210px]
        font-sans
        md:right-4
        md:bottom-7
        md:h-[370px]
      "
      onMouseEnter={
        openOnDesktopHover
      }
      onMouseLeave={
        closeOnDesktopHoverLeave
      }
    >
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

      {/* ===================================================
          SOCIAL ICON STACK
      =================================================== */}

      <div
        className={`
          pointer-events-auto
          absolute
          right-0
          bottom-[66px]
          flex
          w-[60px]
          flex-col
          items-center
          gap-2
          rounded-[30px]
          border-2
          p-1.5
          shadow-[0_2px_10px_rgba(73,73,73,0.14)]
          transition-all
          duration-300
          md:bottom-[72px]
          md:w-16

          ${
            isOpen &&
            contactItems.length > 0
              ? "visible translate-y-0 opacity-100"
              : "invisible translate-y-2 opacity-0 pointer-events-none"
          }
        `}
        style={{
          backgroundColor:
            panelBackground,
          borderColor,
        }}
        aria-hidden={
          !isOpen
        }
        onMouseEnter={() => {
          if (
            window.matchMedia(
              "(min-width: 768px)",
            ).matches
          ) {
            clearHoverCloseTimer();
            setIsOpen(true);
          }
        }}
        onMouseLeave={
          closeOnDesktopHoverLeave
        }
      >
        {contactItems.map(
          (item) => (
            <a
              key={item.key}
              href={item.href}
              target={
                item.external
                  ? "_blank"
                  : undefined
              }
              rel={
                item.external
                  ? "noopener noreferrer"
                  : undefined
              }
              aria-label={
                item.label
              }
              title={
                item.label
              }
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-white
                text-white
                shadow-[0_2px_10px_rgba(73,73,73,0.14)]
                transition-transform
                duration-200
                hover:scale-105
                md:h-[46px]
                md:w-[46px]
              "
              style={{
                backgroundColor:
                  getSafeColor(
                    item.color,
                    defaultSettings.contacts[
                      item.key
                    ].color,
                  ),
              }}
              onClick={() =>
                setIsOpen(false)
              }
            >
              <BrandIcon
                name={
                  item.key
                }
              />
            </a>
          ),
        )}
      </div>

      {/* ===================================================
          LABEL + MAIN BUTTON
      =================================================== */}

      <div
        className="
          pointer-events-auto
          absolute
          right-0
          bottom-0
          flex
          h-[54px]
          items-center
          justify-end
        "
      >
        {/* LABEL */}

        <button
          type="button"
          onClick={() =>
            setIsOpen(
              (current) =>
                !current,
            )
          }
          onMouseEnter={() => {
            clearHoverCloseTimer();

            setIsLabelHovered(
              true,
            );
          }}
          onMouseLeave={() =>
            setIsLabelHovered(
              false,
            )
          }
          aria-label={`${labelText} - ${
            isOpen
              ? "close contact links"
              : "open contact links"
          }`}
          aria-expanded={
            isOpen
          }
          className="
            absolute
            right-[42px]
            top-1/2
            z-[1]
            flex
            h-9
            w-[118px]
            -translate-y-1/2
            items-center
            justify-center
            whitespace-nowrap
            rounded-full
            px-3
            shadow-[0_2px_10px_rgba(73,73,73,0.14)]
            transition
            duration-200
            md:h-[38px]
            md:w-32
            md:right-[44px]
          "
          style={{
            backgroundColor:
              labelBackground,
            color:
              labelTextColor,
          }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-black leading-none md:text-xs">
            <svg
              viewBox="0 0 25 25"
              className="h-3.5 w-3.5 fill-current"
              aria-hidden="true"
            >
              <path d="M12 1a10 10 0 0 0-10 10v3a3 3 0 0 0 3 3h1v-8H5a7 7 0 0 1 14 0h-1v8h1a3 3 0 0 0 3-3v-3A10 10 0 0 0 12 1zm-4 14a2 2 0 0 1-2-2v-3a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2zm8 0a2 2 0 0 1-2-2v-3a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2z" />
            </svg>

            <span className="max-w-[88px] overflow-hidden whitespace-nowrap md:max-w-[96px]">
              <AnimatedLabelText
                text={labelText}
                animationStyle={
                  settings.labelAnimationStyle
                }
              />
            </span>
          </span>
        </button>

        {/* MAIN BUTTON */}

        <button
          type="button"
          aria-label={
            isOpen
              ? "Close social contact links"
              : "Open social contact links"
          }
          aria-expanded={
            isOpen
          }
          onClick={() =>
            setIsOpen(
              (current) =>
                !current,
            )
          }
          onMouseEnter={() => {
            clearHoverCloseTimer();

            setIsMainHovered(
              true,
            );
          }}
          onMouseLeave={() =>
            setIsMainHovered(
              false,
            )
          }
          className="
            relative
            z-[2]
            flex
            h-[52px]
            w-[52px]
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-white
            text-white
            shadow-[0_2px_10px_rgba(73,73,73,0.14)]
            transition
            duration-200
            md:h-[54px]
            md:w-[54px]
          "
          style={{
            backgroundColor:
              mainButtonColor,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 fill-current"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.39 1.4 4.52 3.6 5.99L5 22l4.27-2.28c.88.18 1.8.28 2.73.28 5.52 0 10-3.58 10-8s-4.48-8-10-8zm-4 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm4 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm4 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
