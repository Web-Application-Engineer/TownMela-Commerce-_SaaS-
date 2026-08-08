"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
} from "react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ??
  "";

/* =========================================================
   TYPES
========================================================= */

type LoginApiResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  tenantId?: string;

  user?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    tenantId?: string;
  };
};

/* =========================================================
   ICONS
========================================================= */

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M4 5.5h16v13H4v-13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="m5 7 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M7.5 16h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M8 10V7a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({
  hidden,
}: {
  hidden: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      {hidden && (
        <path
          d="m4 4 16 16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeIdentifier(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.includes("@")) {
    return trimmedValue.toLowerCase();
  }

  return trimmedValue.replace(/\D/g, "");
}

function isValidIdentifier(value: string) {
  const normalizedValue =
    normalizeIdentifier(value);

  const isEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedValue,
    );

  const isBangladeshPhone =
    /^01\d{9}$/.test(normalizedValue);

  return isEmail || isBangladeshPhone;
}


/* =========================================================
   LOGIN PAGE
========================================================= */

export default function LoginPage() {


  const [
    identifier,
    setIdentifier,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");



  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedIdentifier =
      normalizeIdentifier(identifier);

    if (
      !isValidIdentifier(
        normalizedIdentifier,
      )
    ) {
      setErrorMessage(
        "Enter a valid email address or 11-digit phone number.",
      );

      return;
    }


    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/login`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
            ...(TENANT_ID
              ? {
                  "X-Tenant-Id":
                    TENANT_ID,
                }
              : {}),
          },

          body: JSON.stringify({
            identifier:
              normalizedIdentifier,
            password,
            loginAs: "admin",
          }),
        },
      );

      const data: LoginApiResponse =
        await response
          .json()
          .catch(() => ({
            success: false,
            message:
              "An unexpected server response was received.",
          }));

      if (
        !response.ok ||
        !data.success ||
        !data.token ||
        !data.user?._id
      ) {
        throw new Error(
          data.message ||
            "Unable to sign in. Please check your credentials.",
        );
      }

      if (
        String(data.user.role || "")
          .trim()
          .toLowerCase() !== "admin"
      ) {
        throw new Error(
          "Access denied. A tenant admin account is required.",
        );
      }

      const authenticatedTenantId =
        data.tenantId ??
        data.user.tenantId ??
        TENANT_ID;

      if (!authenticatedTenantId) {
        throw new Error(
          "No tenant is assigned to this admin account.",
        );
      }

      /*
       * Clear storefront/customer authentication keys so they
       * cannot conflict with the tenant admin session.
       */
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("jwt");

      localStorage.setItem(
        "townmelaAdminToken",
        data.token,
      );

      localStorage.setItem(
        "townmelaAdminUser",
        JSON.stringify({
          ...data.user,
          tenantId:
            authenticatedTenantId,
        }),
      );

      localStorage.setItem(
        "tenantId",
        authenticatedTenantId,
      );

      localStorage.setItem(
        "tenant_id",
        authenticatedTenantId,
      );

      localStorage.setItem(
        "activeTenantId",
        authenticatedTenantId,
      );

      localStorage.setItem(
        "selectedTenantId",
        authenticatedTenantId,
      );

      window.dispatchEvent(
        new CustomEvent(
          "admin-auth-updated",
        ),
      );

      window.location.assign(
        "/admin/dashboard",
      );
    } catch (error) {
      console.error(
        "Login error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f6f7fb]">
      {/* Background Decoration */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#FF6900]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#172033]/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1450px] items-center px-3 py-8 sm:px-4 sm:py-12 lg:px-5">
        <div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.14)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* =================================================
              LEFT CONTENT
          ================================================= */}

          <div className="relative hidden min-h-[700px] overflow-hidden bg-[#172033] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FF6900]/30 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6900] text-xl font-black shadow-lg shadow-[#FF6900]/30">
                  T
                </span>

                <span className="text-2xl font-black tracking-tight">
                  TownMela
                </span>
              </Link>
            </div>

            <div className="relative z-10 max-w-[500px]">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                Welcome Back
              </span>

              <h1 className="mt-6 text-[30px] font-black leading-[1.15] xl:text-[45px]">
                Everything you love,
                all in one place.
              </h1>

              <p className="mt-5 max-w-[440px] text-base leading-8 text-white/65">
                Sign in to manage your
                store, products, orders
                and business operations
                securely.
              </p>

              <div className="mt-9 space-y-4">
                {[
                  "Secure tenant administration",
                  "Real-time order management",
                  "Tenant-isolated business data",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm font-semibold text-white/85"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6900] text-white">
                      <CheckIcon />
                    </span>

                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="relative z-10 text-xs leading-6 text-white/45">
              © {new Date().getFullYear()}{" "}
              TownMela. All rights reserved.
            </p>
          </div>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <div className="flex min-h-[620px] items-center p-5 sm:p-8 md:p-12 lg:min-h-[700px] lg:p-14">
            <div className="mx-auto w-full max-w-[430px]">
              {/* Mobile Logo */}

              <Link
                href="/"
                className="mb-10 inline-flex items-center gap-3 lg:hidden"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6900] text-lg font-black text-white shadow-lg shadow-[#FF6900]/20">
                  T
                </span>

                <span className="text-xl font-black tracking-tight text-[#172033]">
                  TownMela
                </span>
              </Link>

              <div>
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FF6900]">
                  Tenant Admin Login
                </span>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#172033] sm:text-4xl">
                  Welcome Back
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
                  Sign in with your tenant admin email
                  address or phone number
                  to continue.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-9 space-y-5"
              >
                {/* Phone or Email */}

                <div>
                  <label
                    htmlFor="identifier"
                    className="mb-2.5 block text-sm font-bold text-[#172033]"
                  >
                    Phone or Email
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <AccountIcon />
                    </span>

                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(event) => {
                        setIdentifier(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="01XXXXXXXXX or name@example.com"
                      className="h-14 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] pl-12 pr-4 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />
                  </div>
                </div>

                {/* Password */}

                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-[#172033]"
                    >
                      Password
                    </label>
                  </div>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <LockIcon />
                    </span>

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="Enter your password"
                      className="h-14 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] pl-12 pr-12 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (currentValue) =>
                            !currentValue,
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#FF6900]"
                    >
                      <EyeIcon
                        hidden={
                          showPassword
                        }
                      />
                    </button>
                  </div>
                </div>

                {/* Error */}

                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold leading-6 text-red-600"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Submit */}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#e55f00] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-gray-300 sm:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                      <span>
                        Signing in...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Sign in Securely
                      </span>

                      <span className="transition group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 text-center">
                <p className="text-sm text-gray-500">
                  Tenant admin access is created by the
                  TownMela platform owner.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                <LockIcon />

                <span>
                  Your information is
                  protected and secure.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}