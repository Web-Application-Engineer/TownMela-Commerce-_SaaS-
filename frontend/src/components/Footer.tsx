"use client";

import Link from "next/link";

import {
  ChevronRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { useMemo } from "react";

import {
  useFooterSettings,
} from "@/src/context/FooterSettingsContext";

/* =========================================================
   GOOGLE MAP URL HELPERS
========================================================= */

function extractGoogleMapUrl(
  value: string,
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  /*
   * Footer Management may contain either:
   * - a normal Google Maps URL
   * - the full iframe embed code copied from Google Maps
   *
   * If iframe code is supplied, read only its src value.
   */
  const iframeSrcMatch =
    trimmed.match(
      /<iframe[^>]+src=["']([^"']+)["']/i,
    );

  return (
    iframeSrcMatch?.[1] ||
    trimmed
  );
}

function getGoogleMapOpenUrl(
  mapValue: string,
  businessName: string,
  address: string,
) {
  const normalizedUrl =
    extractGoogleMapUrl(
      mapValue,
    );

  if (!normalizedUrl) {
    return "";
  }

  /*
   * Google /maps/embed URLs must stay inside an iframe.
   * For our existing yellow card, open a normal Google Maps
   * search page instead so the previous layout stays unchanged.
   */
  if (
    normalizedUrl.includes(
      "google.com/maps/embed",
    )
  ) {
    let placeName = "";

    try {
      const decoded =
        decodeURIComponent(
          normalizedUrl,
        );

      const placeMatch =
        decoded.match(
          /!2s([^!]+)/,
        );

      placeName =
        placeMatch?.[1]?.trim() ||
        "";
    } catch {
      placeName = "";
    }

    const query =
      placeName ||
      businessName ||
      address ||
      "Google Maps";

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query,
    )}`;
  }

  return normalizedUrl;
}

/* =========================================================
   SOCIAL ICONS
========================================================= */

function SocialIcon({
  name,
  fallback,
}: {
  name: string;
  fallback: string;
}) {
  const normalizedName =
    name.trim().toLowerCase();

  if (normalizedName === "phone") {
    return (
      <Phone
        size={18}
        strokeWidth={2}
        className="text-[#22C55E]"
      />
    );
  }

  if (normalizedName === "facebook") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path
          fill="#1877F2"
          d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6h1.7V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.3v3h2.8v8h3.4Z"
        />
      </svg>
    );
  }

  if (normalizedName === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <defs>
          <linearGradient
            id="footerInstagramGradient"
            x1="2"
            y1="22"
            x2="22"
            y2="2"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFDC80" />
            <stop offset="28%" stopColor="#F77737" />
            <stop offset="52%" stopColor="#E1306C" />
            <stop offset="76%" stopColor="#C13584" />
            <stop offset="100%" stopColor="#5851DB" />
          </linearGradient>
        </defs>

        <path
          fill="url(#footerInstagramGradient)"
          d="M7.2 2h9.6A5.2 5.2 0 0 1 22 7.2v9.6a5.2 5.2 0 0 1-5.2 5.2H7.2A5.2 5.2 0 0 1 2 16.8V7.2A5.2 5.2 0 0 1 7.2 2Zm0 2A3.2 3.2 0 0 0 4 7.2v9.6A3.2 3.2 0 0 0 7.2 20h9.6a3.2 3.2 0 0 0 3.2-3.2V7.2A3.2 3.2 0 0 0 16.8 4H7.2Zm10.3 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        />
      </svg>
    );
  }

  if (normalizedName === "linkedin") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path
          fill="#0A66C2"
          d="M6.5 8.2H3.2V21h3.3V8.2ZM4.9 3A1.9 1.9 0 1 0 4.9 6.8 1.9 1.9 0 0 0 4.9 3ZM21 13.7c0-3.9-2.1-5.8-4.9-5.8-2.3 0-3.3 1.3-3.9 2.2V8.2H8.9V21h3.3v-6.3c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21H20v-7.3h1Z"
        />
      </svg>
    );
  }

  if (normalizedName === "youtube") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[19px] w-[19px]"
      >
        <path
          fill="#FF0000"
          d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2A29.5 29.5 0 0 0 2 12a29.5 29.5 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2A29.5 29.5 0 0 0 22 12a29.5 29.5 0 0 0-.4-4.8ZM10 15.4V8.6l6 3.4-6 3.4Z"
        />
      </svg>
    );
  }

  return (
    <span className="text-[12px] font-bold leading-none">
      {fallback}
    </span>
  );
}

/* =========================================================
   FOOTER
========================================================= */

export default function Footer() {
  const {
    settings,
    isLoading,
  } = useFooterSettings();




  /* =======================================================
     DYNAMIC FOOTER DATA
  ======================================================= */

  const businessName =
    settings.businessName?.trim() ||
    "";

  const footerLogo =
    settings.logo?.trim() ||
    "";

  const description =
    settings.description?.trim() ||
    "";

  const phone =
    settings.phone?.trim() ||
    "";

  const email =
    settings.email?.trim() ||
    "";

  const address =
    settings.address?.trim() ||
    "";

  const googleMapUrl =
    getGoogleMapOpenUrl(
      settings.googleMapUrl || "",
      businessName,
      address,
    );

  const copyrightText =
    settings.copyrightText?.trim() ||
    "";

  /* =======================================================
     SOCIAL LINKS
  ======================================================= */

  const socialLinks =
    useMemo(
      () => {
        const builtInLinks = [
          phone
            ? {
                icon: "Phone",
                link: `tel:${phone.replace(
                  /\s+/g,
                  "",
                )}`,
                name: "Phone",
                order: 1,
              }
            : null,

          settings.facebook?.trim()
            ? {
                icon: "Facebook",
                link:
                  settings.facebook.trim(),
                name: "Facebook",
                order: 2,
              }
            : null,

          settings.instagram?.trim()
            ? {
                icon: "Instagram",
                link:
                  settings.instagram.trim(),
                name: "Instagram",
                order: 3,
              }
            : null,

          settings.linkedin?.trim()
            ? {
                icon: "LinkedIn",
                link:
                  settings.linkedin.trim(),
                name: "LinkedIn",
                order: 4,
              }
            : null,

          settings.youtube?.trim()
            ? {
                icon: "YouTube",
                link:
                  settings.youtube.trim(),
                name: "YouTube",
                order: 5,
              }
            : null,
        ].filter(
          (
            item,
          ): item is {
            icon: string;
            link: string;
            name: string;
            order: number;
          } =>
            Boolean(item),
        );

        const extraLinks =
          Array.isArray(
            settings.additionalSocialLinks,
          )
            ? settings.additionalSocialLinks
                .filter(
                  (item) =>
                    item.enabled &&
                    item.label?.trim() &&
                    item.url?.trim(),
                )
                .map(
                  (item) => ({
                    icon:
                      item.iconText?.trim() ||
                      "•",
                    link:
                      item.url.trim(),
                    name:
                      item.label.trim(),
                    order:
                      Number(
                        item.order || 0,
                      ) + 5,
                  }),
                )
            : [];

        return [
          ...builtInLinks,
          ...extraLinks,
        ].sort(
          (a, b) =>
            a.order - b.order,
        );
      },
      [
        phone,
        settings.facebook,
        settings.instagram,
        settings.linkedin,
        settings.youtube,
        settings.additionalSocialLinks,
      ],
    );



  /* =======================================================
     DYNAMIC FOOTER MENU LINKS
  ======================================================= */

  const popularCategories =
    useMemo(
      () =>
        settings.popularCategoryLinks
          .filter(
            (item) =>
              item.enabled &&
              item.label?.trim() &&
              item.url?.trim(),
          )
          .sort(
            (a, b) =>
              Number(a.order || 0) -
              Number(b.order || 0),
          ),
      [
        settings.popularCategoryLinks,
      ],
    );

  const customerInfoLinks =
    useMemo(
      () =>
        settings.customerInfoLinks
          .filter(
            (item) =>
              item.enabled &&
              item.label?.trim() &&
              item.url?.trim(),
          )
          .sort(
            (a, b) =>
              Number(a.order || 0) -
              Number(b.order || 0),
          ),
      [
        settings.customerInfoLinks,
      ],
    );

  const quickNavigationLinks =
    useMemo(
      () =>
        settings.quickNavigationLinks
          .filter(
            (item) =>
              item.enabled &&
              item.label?.trim() &&
              item.url?.trim(),
          )
          .sort(
            (a, b) =>
              Number(a.order || 0) -
              Number(b.order || 0),
          ),
      [
        settings.quickNavigationLinks,
      ],
    );

  /* =======================================================
     INACTIVE FOOTER
  ======================================================= */

  if (
    !isLoading &&
    !settings.isActive
  ) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <style jsx>{`
        @keyframes footerUnderlineLeftRight {
          0% {
            transform: translateX(-100%);
            opacity: 0.35;
          }

          15% {
            opacity: 1;
          }

          50% {
            transform: translateX(600%);
            opacity: 1;
          }

          85% {
            opacity: 1;
          }

          100% {
            transform: translateX(-100%);
            opacity: 0.35;
          }
        }

        .footer-heading-underline {
          animation: footerUnderlineLeftRight 5.4s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      <footer className="relative ml-2 mr-2 overflow-hidden bg-black text-white">
      <div
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            settings.backgroundImage?.trim()
              ? `url("${settings.backgroundImage.trim()}")`
              : "url('/images/real-dhaka.webp')",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 mx-auto grid max-w-[1450px] grid-cols-1 gap-y-10 py-[54px] md:grid-cols-2 md:gap-x-10 lg:grid-cols-3 xl:grid-cols-[350px_220px_200px_200px_280px] xl:gap-x-0 xl:justify-between">
          {/* =================================================
              CONTACT / BUSINESS INFORMATION
          ================================================= */}

          <div>
            {footerLogo && (
              <div className="mb-5">
                <img
                  src={
                    footerLogo
                  }
                  alt={
                    businessName
                      ? `${businessName} logo`
                      : "Business logo"
                  }
                  className="max-h-[70px] max-w-[190px] object-contain"
                />
              </div>
            )}

            {businessName && (
              <h3 className="mb-3 text-[18px] font-bold">
                {
                  businessName
                }
              </h3>
            )}

            {description && (
              <p className="mb-6 text-[13px] leading-[1.7] text-white/75">
                {
                  description
                }
              </p>
            )}


            <div className="space-y-5 text-[14px] leading-[1.65]">
              {address && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f7931a]/70 bg-black/30 text-[#f7931a]">
                    <MapPin
                      size={16}
                      strokeWidth={2.2}
                    />
                  </span>

                  <p className="pt-1 text-white/90">
                    {address}
                  </p>
                </div>
              )}

              {email && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f7931a]/70 bg-black/30 text-[#f7931a]">
                    <Mail
                      size={16}
                      strokeWidth={2.2}
                    />
                  </span>

                  <div className="min-w-0 pt-1">
                    <Link
                      href={`mailto:${email}`}
                      className="break-all text-white/90 transition hover:text-[#f7931a]"
                    >
                      {email}
                    </Link>
                  </div>
                </div>
              )}

              {phone && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f7931a]/70 bg-black/30 text-[#f7931a]">
                    <Phone
                      size={16}
                      strokeWidth={2.2}
                    />
                  </span>

                  <div className="min-w-0 pt-1">
                    <Link
                      href={`tel:${phone.replace(
                        /\s+/g,
                        "",
                      )}`}
                      className="text-white/90 transition hover:text-[#f7931a]"
                    >
                      {phone}
                    </Link>
                  </div>
                </div>
              )}

              {!isLoading &&
                !address &&
                !email &&
                !phone && (
                  <p className="text-white/55">
                    Contact information
                    will be available
                    soon.
                  </p>
                )}
            </div>

            {/* ===============================================
                SOCIAL LINKS
            =============================================== */}

            {socialLinks.length >
              0 && (
              <div className="mt-5 flex flex-nowrap items-center gap-2 overflow-x-auto">
                {socialLinks.map(
                  (
                    item,
                  ) => (
                    <Link
                      key={
                        item.name
                      }
                      href={
                        item.link
                      }
                      target={
                        item.link.startsWith(
                          "tel:",
                        ) ||
                        item.link.startsWith(
                          "mailto:",
                        )
                          ? undefined
                          : "_blank"
                      }
                      rel={
                        item.link.startsWith(
                          "tel:",
                        ) ||
                        item.link.startsWith(
                          "mailto:",
                        )
                          ? undefined
                          : "noopener noreferrer"
                      }
                      aria-label={
                        item.name
                      }
                      title={
                        item.name
                      }
                      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-[#f7931a] bg-black/25 text-[13px] font-bold text-white transition duration-300 hover:bg-[#f7931a]"
                    >
                      <SocialIcon
                        name={
                          item.name
                        }
                        fallback={
                          item.icon
                        }
                      />
                    </Link>
                  ),
                )}
              </div>
            )}

          </div>

          {/* =================================================
              POPULAR CATEGORY
          ================================================= */}

          {settings.showPopularCategory && (
          <div>
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold">
                {settings.popularCategoryHeading}
              </h3>

              <div className="mt-2 h-[1px] w-30 overflow-hidden rounded-full bg-white/15">
                <div className="footer-heading-underline h-full w-5 rounded-full bg-[#f7931a]" />
              </div>
            </div>

            <nav className="space-y-3">
              {popularCategories.map(
                (item) => (
                  <Link
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    className="group flex items-center gap-2.5 text-[14px] text-white/80 transition hover:text-[#f7931a]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[#f7931a] transition group-hover:border-[#f7931a] group-hover:bg-[#f7931a] group-hover:text-black">
                      <ChevronRight
                        size={12}
                        strokeWidth={2.4}
                      />
                    </span>

                    <span>
                      {item.label}
                    </span>
                  </Link>
                ),
              )}
            </nav>
          </div>
          )}

          {/* =================================================
              CUSTOMER INFO
          ================================================= */}

          {settings.showCustomerInfo && (
          <div>
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold">
                {settings.customerInfoHeading}
              </h3>

              <div className="mt-2 h-[1px] w-30 overflow-hidden rounded-full bg-white/15">
                <div className="footer-heading-underline h-full w-5 rounded-full bg-[#f7931a]" />
              </div>
            </div>

            <nav className="space-y-3">
              {customerInfoLinks.map(
                (item) => (
                  <Link
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    className="group flex items-center gap-2.5 text-[14px] text-white/80 transition hover:text-[#f7931a]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[#f7931a] transition group-hover:border-[#f7931a] group-hover:bg-[#f7931a] group-hover:text-black">
                      <ChevronRight
                        size={12}
                        strokeWidth={2.4}
                      />
                    </span>

                    <span>
                      {item.label}
                    </span>
                  </Link>
                ),
              )}
            </nav>
          </div>
          )}

          {/* =================================================
              QUICK NAVIGATION
          ================================================= */}

          {settings.showQuickNavigation && (
          <div>
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold">
                {settings.quickNavigationHeading}
              </h3>

              <div className="mt-2 h-[1px] w-30 overflow-hidden rounded-full bg-white/15">
                <div className="footer-heading-underline h-full w-5 rounded-full bg-[#f7931a]" />
              </div>
            </div>

            <nav className="space-y-3">
              {quickNavigationLinks.map(
                (item) => {
                  const isExternalLink =
                    /^https?:\/\//i.test(
                      item.url.trim(),
                    );

                  return (
                  <Link
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    target={
                      isExternalLink
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      isExternalLink
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="group flex items-center gap-2.5 text-[14px] text-white/80 transition hover:text-[#f7931a]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[#f7931a] transition group-hover:border-[#f7931a] group-hover:bg-[#f7931a] group-hover:text-black">
                      <ChevronRight
                        size={12}
                        strokeWidth={2.4}
                      />
                    </span>

                    <span>
                      {item.label}
                    </span>
                  </Link>
                  );
                },
              )}
            </nav>
          </div>
          )}

          {/* =================================================
              GOOGLE MAP
          ================================================= */}

          {settings.showGoogleMap && (
          <div>
            <div className="mb-5">
              <h3 className="text-[18px] font-semibold">
                {settings.googleMapHeading}
              </h3>

              <div className="mt-2 h-[1px] w-30 overflow-hidden rounded-full bg-white/15">
                <div className="footer-heading-underline h-full w-5 rounded-full bg-[#f7931a]" />
              </div>
            </div>

            {googleMapUrl ? (
              <Link
                href={
                  googleMapUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-[265px] w-full max-w-[280px] overflow-hidden rounded-[5px] bg-[#bd9700]"
              >
                <div className="absolute inset-0 opacity-45">
                  <div className="h-full w-full bg-[radial-gradient(circle,#111_1.4px,transparent_1.7px)] [background-size:8px_8px]" />
                </div>

                <div className="relative z-10 mx-auto mt-[40px] flex h-[72px] w-[58px] rotate-45 items-center justify-center rounded-t-full rounded-br-full bg-[#ffdf00]">
                  <div className="-rotate-45 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#2b2b2b] text-[16px] font-black">
                    {businessName
                      ? businessName
                          .slice(
                            0,
                            2,
                          )
                          .toUpperCase()
                      : "TM"}
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 rounded-[12px] bg-[#f3c600] px-4 py-4 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[18px] font-medium leading-[1.05] text-black lg:text-[20px]">
                        {settings.googleMapCtaText}
                      </h4>
                    </div>

                    <div className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full border-[4px] border-black">
                      <span className="text-[30px] font-light leading-none text-black">
                        →
                      </span>

                      <div className="absolute -right-3 -top-3 h-[32px] w-[32px] opacity-30">
                        <div className="h-full w-full bg-[radial-gradient(circle,#000_1.3px,transparent_1.6px)] [background-size:6px_6px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex h-[265px] w-full max-w-[280px] items-center justify-center rounded-[5px] border border-white/10 bg-white/5 px-6 text-center">
                <p className="text-sm leading-6 text-white/55">
                  Google Map
                  information will be
                  available soon.
                </p>
              </div>
            )}
          </div>
          )}

        </div>
      </div>

      {/* ===================================================
          FOOTER BOTTOM
      =================================================== */}

      <div className="relative bg-[#17181D]">
        <div className="mx-auto flex max-w-[1450px] flex-col items-center justify-between gap-4 py-5 text-[13px] text-white/60 md:flex-row">
          <div className="flex items-center gap-1.5">
            <p>
              {copyrightText ||
                (businessName
                  ? `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`
                  : `© ${new Date().getFullYear()}. All rights reserved.`)}
            </p>
          </div>

          <div>
            <Link
              href="https://anwarhosain.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Developed by{" "}
              <span className="font-bold text-yellow-300 transition hover:text-white">
                Anwar Hosain
              </span>
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-label="Back to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="absolute right-7 top-1/2 -translate-y-1/2 text-[32px] text-white"
        >
          ↑
        </button>
      </div>
      </footer>
    </>
  );
}