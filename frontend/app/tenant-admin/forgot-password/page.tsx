"use client";

import Link from "next/link";

import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  type FormEvent,
  useState,
} from "react";

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

type ForgotPasswordResponse = {
  success?: boolean;
  message?: string;
};

export default function TenantAdminForgotPasswordPage() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setSuccessMessage("");

      setErrorMessage(
        "Please enter a valid Tenant Admin email address.",
      );

      return;
    }

    try {
      setIsSubmitting(true);

      setErrorMessage("");

      setSuccessMessage("");

      const response =
        await fetch(
          `${API_BASE_URL}/api/auth/tenant-admin/forgot-password`,
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  normalizedEmail,
              }),
          },
        );

      const data:
        ForgotPasswordResponse =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to send the reset link.",
        );
      }

      setSuccessMessage(
        data.message ||
          "If an active Tenant Admin account exists with this email, a password reset link has been sent.",
      );
    } catch (error) {
      console.error(
        "Tenant Admin forgot password error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to process the password reset request.",
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
              LEFT PANEL
          ================================================= */}

          <div className="relative hidden min-h-[650px] overflow-hidden bg-[#172033] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FF6900]/30 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10">
              <Link
                href="/login"
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
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                <ShieldCheck
                  size={16}
                />

                Tenant Admin Recovery
              </span>

              <h1 className="mt-6 text-[30px] font-black leading-[1.15] xl:text-[45px]">
                Recover access to your tenant dashboard securely.
              </h1>

              <p className="mt-5 max-w-[440px] text-base leading-8 text-white/65">
                Enter the email address assigned to your Tenant Admin
                account and TownMela will send a time-limited reset link.
              </p>
            </div>

            <p className="relative z-10 text-xs leading-6 text-white/45">
              © {new Date().getFullYear()}{" "}
              TownMela. All rights reserved.
            </p>
          </div>

          {/* =================================================
              FORGOT PASSWORD PANEL
          ================================================= */}

          <div className="flex min-h-[620px] items-center p-5 sm:p-8 md:p-12 lg:min-h-[650px] lg:p-14">
            <div className="mx-auto w-full max-w-[430px]">
              {/* Mobile Logo */}

              <Link
                href="/login"
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
                  Tenant Admin
                </span>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#172033] sm:text-4xl">
                  Forgot Password
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
                  Enter your Tenant Admin email address to request
                  a secure password reset link.
                </p>
              </div>

              {/* Error Message */}

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold leading-6 text-red-600"
                >
                  {errorMessage}
                </div>
              )}

              {/* Success Message */}

              {successMessage && (
                <div
                  role="status"
                  className="mt-7 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-semibold leading-6 text-green-700"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {successMessage}
                    </span>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2.5 block text-sm font-bold text-[#172033]"
                  >
                    Tenant Admin Email
                  </label>

                  <div className="group relative">
                    <Mail
                      size={20}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value,
                        );

                        if (errorMessage) {
                          setErrorMessage("");
                        }

                        if (successMessage) {
                          setSuccessMessage("");
                        }
                      }}
                      placeholder="name@example.com"
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] pl-12 pr-4 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#e55f00] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-gray-300 sm:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle
                        size={20}
                        className="animate-spin"
                      />

                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Mail
                        size={20}
                      />

                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-gray-200 pt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm font-bold text-[#FF6900] transition hover:text-[#e55f00]"
                >
                  Back to Tenant Admin Login
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                <ShieldCheck
                  size={15}
                />

                <span>
                  Your password reset request is protected and secure.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}