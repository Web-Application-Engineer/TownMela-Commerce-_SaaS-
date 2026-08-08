"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  useFooterSettings,
} from "@/src/context/FooterSettingsContext";

/* =========================================================
   FOOTER
========================================================= */

export default function Footer() {
  const {
    settings,
    isLoading,
  } = useFooterSettings();

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formMessage,
    setFormMessage,
  ] = useState("");

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
    settings.googleMapUrl?.trim() ||
    "";

  const copyrightText =
    settings.copyrightText?.trim() ||
    "";

  /* =======================================================
     SOCIAL LINKS
  ======================================================= */

  const socialLinks =
    useMemo(
      () =>
        [
          phone
            ? {
                icon: "📞",
                link: `tel:${phone.replace(
                  /\s+/g,
                  "",
                )}`,
                name: "Phone",
              }
            : null,

          settings.facebook
            ?.trim()
            ? {
                icon: "f",
                link:
                  settings.facebook.trim(),
                name: "Facebook",
              }
            : null,

          settings.instagram
            ?.trim()
            ? {
                icon: "◎",
                link:
                  settings.instagram.trim(),
                name: "Instagram",
              }
            : null,

          settings.linkedin
            ?.trim()
            ? {
                icon: "in",
                link:
                  settings.linkedin.trim(),
                name: "LinkedIn",
              }
            : null,

          settings.youtube
            ?.trim()
            ? {
                icon: "▶",
                link:
                  settings.youtube.trim(),
                name: "YouTube",
              }
            : null,
        ].filter(
          (
            item,
          ): item is {
            icon: string;
            link: string;
            name: string;
          } =>
            Boolean(item),
        ),
      [
        phone,
        settings.facebook,
        settings.instagram,
        settings.linkedin,
        settings.youtube,
      ],
    );

  /* =======================================================
     FOOTER LINKS
  ======================================================= */

  const footerLinks =
    useMemo(
      () =>
        settings.footerLinks
          .filter(
            (item) =>
              item.enabled &&
              item.label?.trim() &&
              item.url?.trim(),
          )
          .sort(
            (
              first,
              second,
            ) =>
              Number(
                first.order ||
                  0,
              ) -
              Number(
                second.order ||
                  0,
              ),
          ),
      [
        settings.footerLinks,
      ],
    );

  /* =======================================================
     CONTACT FORM
  ======================================================= */

  const handleChange = (
    event:
      React.ChangeEvent<
        | HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (
        previous,
      ) => ({
        ...previous,
        [name]: value,
      }),
    );
  };

  const handleSubmit =
    async (
      event:
        React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      try {
        setIsSubmitting(
          true,
        );

        setFormMessage(
          "",
        );

        const response =
          await fetch(
            "/api/contact",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    formData.name,

                  email:
                    formData.email,

                  phone:
                    formData.phone,

                  subject:
                    "Footer Quick Contact",

                  details:
                    formData.message,
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          setFormMessage(
            data.message ||
              "Something went wrong. Please try again.",
          );

          return;
        }

        setFormMessage(
          "Message sent successfully!",
        );

        setFormData({
          name: "",
          email: "",
          phone: "",
          message: "",
        });
      } catch (error) {
        console.error(
          "Footer contact form error:",
          error,
        );

        setFormMessage(
          "Failed to send message. Please try again.",
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const handleReset =
    () => {
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });

      setFormMessage(
        "",
      );
    };

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
    <footer className="relative ml-2 mr-2 overflow-hidden bg-black text-white">
      <div
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/images/real-dhaka.webp')",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 mx-auto grid max-w-[1450px] grid-cols-1 gap-12 py-[54px] md:grid-cols-2 lg:grid-cols-[300px_360px_360px] lg:justify-between">
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

            <h3 className="mb-6 text-[18px]">
              Contact info
            </h3>

            <div className="space-y-4 text-[14px] leading-[1.65]">
              {address && (
                <div>
                  <h4 className="font-bold">
                    Address
                  </h4>

                  <p>
                    {
                      address
                    }
                  </p>
                </div>
              )}

              {email && (
                <div>
                  <h4 className="font-bold">
                    Email
                  </h4>

                  <Link
                    href={`mailto:${email}`}
                    className="transition hover:text-[#f7931a]"
                  >
                    {
                      email
                    }
                  </Link>
                </div>
              )}

              {phone && (
                <div>
                  <h4 className="font-bold">
                    Mobile
                  </h4>

                  <Link
                    href={`tel:${phone.replace(
                      /\s+/g,
                      "",
                    )}`}
                    className="transition hover:text-[#f7931a]"
                  >
                    {
                      phone
                    }
                  </Link>
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
                        item.name ===
                        "Phone"
                          ? undefined
                          : "_blank"
                      }
                      rel={
                        item.name ===
                        "Phone"
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
                      {
                        item.icon
                      }
                    </Link>
                  ),
                )}
              </div>
            )}

            {/* ===============================================
                DYNAMIC FOOTER LINKS
            =============================================== */}

            {footerLinks.length >
              0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-bold">
                  Useful Links
                </h4>

                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {footerLinks.map(
                    (
                      item,
                    ) => (
                      <Link
                        key={`${item.label}-${item.url}`}
                        href={
                          item.url
                        }
                        className="text-[13px] text-white/75 transition hover:text-[#f7931a]"
                      >
                        {
                          item.label
                        }
                      </Link>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              QUICK CONTACT
          ================================================= */}

          <div>
            <h3 className="mb-6 text-[18px]">
              Quick Contact
            </h3>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4 rounded-[10px] border border-[#524702] p-2"
            >
              <input
                required
                type="text"
                name="name"
                value={
                  formData.name
                }
                onChange={
                  handleChange
                }
                placeholder="Name *"
                className="w-full border-b border-[#927800] bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-white/90"
              />

              <input
                type="email"
                name="email"
                value={
                  formData.email
                }
                onChange={
                  handleChange
                }
                placeholder="E-mail"
                className="w-full border-b border-[#927800] bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-white/90"
              />

              <input
                required
                type="tel"
                name="phone"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                placeholder="Phone *"
                className="w-full border-b border-[#927800] bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-white/90"
              />

              <textarea
                rows={4}
                name="message"
                value={
                  formData.message
                }
                onChange={
                  handleChange
                }
                placeholder="Message"
                className="w-full resize-none border-b border-[#927800] bg-transparent px-4 py-4 text-[13px] outline-none placeholder:text-white/90"
              />

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="cursor-pointer rounded-[3px] bg-amber-300 px-4 py-2 text-[12px] font-bold text-[#122855] transition duration-300 hover:bg-[#D3222E] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Sending..."
                    : "Submit"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleReset
                  }
                  className="text-[12px] text-white/60"
                >
                  clear ✖
                </button>
              </div>

              {formMessage && (
                <p
                  className={`px-1 text-[12px] ${
                    formMessage ===
                    "Message sent successfully!"
                      ? "text-green-300"
                      : "text-red-300"
                  }`}
                >
                  {
                    formMessage
                  }
                </p>
              )}
            </form>
          </div>

          {/* =================================================
              GOOGLE MAP
          ================================================= */}

          <div>
            <h3 className="mb-5 text-[18px]">
              Find us on Google Map
            </h3>

            {googleMapUrl ? (
              <Link
                href={
                  googleMapUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-[350px] overflow-hidden rounded-[5px] bg-[#bd9700]"
              >
                <div className="absolute inset-0 opacity-45">
                  <div className="h-full w-full bg-[radial-gradient(circle,#111_1.4px,transparent_1.7px)] [background-size:8px_8px]" />
                </div>

                <div className="relative z-10 mx-auto mt-[62px] flex h-[88px] w-[70px] rotate-45 items-center justify-center rounded-t-full rounded-br-full bg-[#ffdf00]">
                  <div className="-rotate-45 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#2b2b2b] text-[18px] font-black">
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

                <div className="absolute bottom-8 left-7 right-7 rounded-[14px] bg-[#f3c600] px-6 py-5 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[22px] font-medium leading-[1.05] text-black lg:text-[26px]">
                        Find us on
                        <br />
                        Google map
                      </h4>
                    </div>

                    <div className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full border-[5px] border-black">
                      <span className="text-[36px] font-light leading-none text-black">
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
              <div className="flex h-[350px] items-center justify-center rounded-[5px] border border-white/10 bg-white/5 px-6 text-center">
                <p className="text-sm leading-6 text-white/55">
                  Google Map
                  information will be
                  available soon.
                </p>
              </div>
            )}
          </div>
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
  );
}