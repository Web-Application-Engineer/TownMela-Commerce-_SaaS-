"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
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

type UserData = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  tenantId?: string;
};

type RegisterApiResponse = {
  success?: boolean;
  message?: string;
  user?: UserData;
};

type LoginApiResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  tenantId?: string;
  user?: UserData;
};

/* =========================================================
   ICONS
========================================================= */

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M4 6.5h16v11H4v-11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="m5 7.5 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M7.3 3.8 10 7.1 8.2 9.4c1.2 2.4 3 4.2 5.4 5.4l2.3-1.8 3.3 2.7c.6.5.8 1.3.4 2-1 2-3.2 2.9-5.3 2.1A17.2 17.2 0 0 1 4.2 9.7c-.8-2.1.1-4.3 2.1-5.3.7-.4 1.5-.2 2 .4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function getSafeRedirect(
  value: string | null,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

function getSafeReturnDepth(
  value: string | null,
) {
  const parsedValue =
    Number.parseInt(value ?? "0", 10);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 5
  ) {
    return 0;
  }

  return parsedValue;
}

/* =========================================================
   REGISTER PAGE
========================================================= */

export default function RegisterPage() {
  const router = useRouter();

  const [
    redirectPath,
    setRedirectPath,
  ] = useState("/");

  const [
    returnDepth,
    setReturnDepth,
  ] = useState(0);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search,
      );

    setRedirectPath(
      getSafeRedirect(
        searchParams.get(
          "redirect",
        ),
      ),
    );

    setReturnDepth(
      getSafeReturnDepth(
        searchParams.get(
          "returnDepth",
        ),
      ),
    );
  }, []);

  const failedLoginParams =
    new URLSearchParams();

  if (redirectPath !== "/") {
    failedLoginParams.set(
      "redirect",
      redirectPath,
    );
  }

  if (returnDepth > 0) {
    failedLoginParams.set(
      "returnDepth",
      String(returnDepth),
    );
  }

  const failedLoginQuery =
    failedLoginParams.toString();

  const failedLoginHref =
    failedLoginQuery
      ? `/login?${failedLoginQuery}`
      : "/login";

  const manualLoginParams =
    new URLSearchParams();

  if (redirectPath !== "/") {
    manualLoginParams.set(
      "redirect",
      redirectPath,
    );
  }

  if (returnDepth > 0) {
    manualLoginParams.set(
      "returnDepth",
      String(returnDepth + 1),
    );
  }

  const manualLoginQuery =
    manualLoginParams.toString();

  const manualLoginHref =
    manualLoginQuery
      ? `/login?${manualLoginQuery}`
      : "/login";

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      normalizePhone(phone);

    if (!normalizedName) {
      setErrorMessage(
        "Please enter your full name.",
      );

      return;
    }

    if (
      !normalizedEmail &&
      !normalizedPhone
    ) {
      setErrorMessage(
        "Please enter an email address or phone number.",
      );

      return;
    }

    if (
      normalizedEmail &&
      !isValidEmail(normalizedEmail)
    ) {
      setErrorMessage(
        "Please enter a valid email address.",
      );

      return;
    }

    if (
      normalizedPhone &&
      !/^01\d{9}$/.test(
        normalizedPhone,
      )
    ) {
      setErrorMessage(
        "Please enter a valid 11-digit phone number.",
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters.",
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match.",
      );

      return;
    }

    if (!TENANT_ID) {
      setErrorMessage("Tenant configuration is missing. Please contact support.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const registerResponse =
        await fetch(
          `${API_BASE_URL}/api/auth/register`,
          {
            method: "POST",

            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
              "X-Tenant-Id":
                TENANT_ID,
            },

            body: JSON.stringify({
              name: normalizedName,
              email:
                normalizedEmail ||
                undefined,
              phone:
                normalizedPhone ||
                undefined,
              password,
            }),
          },
        );

      const registerData:
        RegisterApiResponse =
        await registerResponse
          .json()
          .catch(() => ({
            success: false,
            message:
              "An unexpected server response was received.",
          }));

      if (
        !registerResponse.ok ||
        !registerData.user?._id
      ) {
        throw new Error(
          registerData.message ||
            "Unable to create your account.",
        );
      }

      /*
        Register API token দেয় না।
        তাই account তৈরি হওয়ার পর একই তথ্য দিয়ে
        automatic login করা হচ্ছে।
      */
      const loginIdentifier =
        normalizedPhone ||
        normalizedEmail;

      const loginResponse =
        await fetch(
          `${API_BASE_URL}/api/auth/login`,
          {
            method: "POST",

            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
              "X-Tenant-Id":
                TENANT_ID,
            },

            body: JSON.stringify({
              identifier:
                loginIdentifier,
              password,
            }),
          },
        );

      const loginData:
        LoginApiResponse =
        await loginResponse
          .json()
          .catch(() => ({
            success: false,
            message:
              "Your account was created, but automatic sign-in failed.",
          }));

      if (
        !loginResponse.ok ||
        !loginData.token ||
        !loginData.user?._id
      ) {
        router.replace(
          failedLoginHref,
        );

        return;
      }

      localStorage.setItem(
        "token",
        loginData.token,
      );

      localStorage.setItem(
        "userId",
        loginData.user._id,
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          loginData.user,
        ),
      );

      const authenticatedTenantId =
        loginData.tenantId ??
        loginData.user.tenantId ??
        TENANT_ID;

      localStorage.setItem(
        "tenantId",
        authenticatedTenantId,
      );

      window.dispatchEvent(
        new CustomEvent(
          "auth-updated",
        ),
      );

      if (
        returnDepth > 0 &&
        window.history.length >
          returnDepth
      ) {
        window.history.go(
          -returnDepth,
        );

        return;
      }

      router.replace(
        redirectPath,
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Registration error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again.",
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

          <div className="relative hidden min-h-[780px] overflow-hidden bg-[#172033] p-12 text-white lg:flex lg:flex-col lg:justify-between">
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
                Join TownMela
              </span>

              <h1 className="mt-6 text-[30px] font-black leading-[1.15] xl:text-[45px]">
                Create your account
                and start shopping.
              </h1>

              <p className="mt-5 max-w-[440px] text-base leading-8 text-white/65">
                Register once to manage
                your cart, place secure
                orders and receive order
                updates.
              </p>

              <div className="mt-9 space-y-4">
                {[
                  "Quick and secure registration",
                  "Easy checkout experience",
                  "Manage orders in one place",
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
              REGISTER FORM
          ================================================= */}

          <div className="flex min-h-[700px] items-center p-5 sm:p-8 md:p-12 lg:min-h-[780px] lg:p-14">
            <div className="mx-auto w-full max-w-[430px]">
              {/* Mobile Logo */}

              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-3 lg:hidden"
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
                  Create Account
                </span>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#172033] sm:text-4xl">
                  Get started
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
                  Enter your details to
                  create your TownMela
                  account.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-4"
              >
                {/* Full Name */}

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-bold text-[#172033]"
                  >
                    Full Name
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <UserIcon />
                    </span>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => {
                        setName(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="Enter your full name"
                      className="h-13 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] py-3.5 pl-12 pr-4 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />
                  </div>
                </div>

                {/* Email */}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-[#172033]"
                  >
                    Email Address

                    <span className="ml-1 font-medium text-gray-400">
                      (Optional)
                    </span>
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <EmailIcon />
                    </span>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="name@example.com"
                      className="h-13 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] py-3.5 pl-12 pr-4 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />
                  </div>
                </div>

                {/* Phone */}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-[#172033]"
                  >
                    Phone Number

                    <span className="ml-1 font-medium text-gray-400">
                      (Optional)
                    </span>
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <PhoneIcon />
                    </span>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      value={phone}
                      onChange={(event) => {
                        setPhone(
                          normalizePhone(
                            event.target.value,
                          ),
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="01XXXXXXXXX"
                      className="h-13 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] py-3.5 pl-12 pr-4 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />
                  </div>

                  <p className="mt-1.5 text-xs leading-5 text-gray-400">
                    Enter at least an email
                    address or phone number.
                  </p>
                </div>

                {/* Password */}

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-[#172033]"
                  >
                    Password
                  </label>

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
                      autoComplete="new-password"
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
                      placeholder="Minimum 6 characters"
                      className="h-13 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] py-3.5 pl-12 pr-12 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
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

                {/* Confirm Password */}

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-bold text-[#172033]"
                  >
                    Confirm Password
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]">
                      <LockIcon />
                    </span>

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={
                        confirmPassword
                      }
                      onChange={(event) => {
                        setConfirmPassword(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      placeholder="Enter your password again"
                      className="h-13 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] py-3.5 pl-12 pr-12 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            currentValue,
                          ) =>
                            !currentValue,
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#FF6900]"
                    >
                      <EyeIcon
                        hidden={
                          showConfirmPassword
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
                        Creating Account...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Create Account
                      </span>

                      <span className="transition group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Already have an Account?{" "}

                  <Link
                    href={manualLoginHref}
                    className="font-bold text-[#FF6900] transition hover:text-[#e55f00]"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}