"use client";

import Link from "next/link";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

type ResetPasswordResponse = {
  success?: boolean;
  message?: string;
  mustChangePassword?: boolean;
};

export default function TenantAdminResetPasswordPage() {
  const [
    token,
    setToken,
  ] = useState("");

  const [
    tokenReady,
    setTokenReady,
  ] = useState(false);

  const [
    password,
    setPassword,
  ] = useState("");

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

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const resetToken =
      String(
        params.get("token") || "",
      ).trim();

    setToken(resetToken);
    setTokenReady(true);

    if (!resetToken) {
      setErrorMessage(
        "This password reset link is invalid or incomplete. Please request a new reset link.",
      );
    }
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!token) {
      setSuccessMessage("");
      setErrorMessage(
        "This password reset link is invalid or incomplete.",
      );

      return;
    }

    if (password.length < 6) {
      setSuccessMessage("");
      setErrorMessage(
        "Password must be at least 6 characters.",
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setSuccessMessage("");
      setErrorMessage(
        "Passwords do not match.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/tenant-admin/reset-password`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        },
      );

      const data:
        ResetPasswordResponse =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to reset your password.",
        );
      }

      setPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        data.message ||
          "Tenant Admin password has been reset successfully",
      );
    } catch (error) {
      console.error(
        "Tenant Admin reset password error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f6f7fb]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#FF6900]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#172033]/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1450px] items-center px-3 py-8 sm:px-4 sm:py-12 lg:px-5">
        <div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.14)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[650px] overflow-hidden bg-[#172033] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FF6900]/30 blur-3xl" />

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
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                <ShieldCheck
                  size={16}
                />

                Secure Password Reset
              </span>

              <h1 className="mt-6 text-[30px] font-black leading-[1.15] xl:text-[45px]">
                Create a new password for your Tenant Admin account.
              </h1>

              <p className="mt-5 max-w-[440px] text-base leading-8 text-white/65">
                This reset link is time-limited. After a successful
                reset, use the new password on the Tenant Admin login page.
              </p>
            </div>

            <p className="relative z-10 text-xs leading-6 text-white/45">
              © {new Date().getFullYear()}{" "}
              TownMela. All rights reserved.
            </p>
          </div>

          <div className="flex min-h-[620px] items-center p-5 sm:p-8 md:p-12 lg:min-h-[650px] lg:p-14">
            <div className="mx-auto w-full max-w-[430px]">
              <div>
                <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FF6900]">
                  Tenant Admin
                </span>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#172033] sm:text-4xl">
                  Reset Password
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">
                  Enter and confirm your new Tenant Admin password.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold leading-6 text-red-600"
                >
                  {errorMessage}
                </div>
              )}

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

              {!successMessage && (
                <form
                  onSubmit={handleSubmit}
                  className="mt-8 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2.5 block text-sm font-bold text-[#172033]"
                    >
                      New Password
                    </label>

                    <div className="group relative">
                      <LockKeyhole
                        size={20}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]"
                      />

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Enter new password"
                        disabled={
                          isSubmitting ||
                          !tokenReady ||
                          !token
                        }
                        className="h-14 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] pl-12 pr-12 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current,
                          )
                        }
                        disabled={
                          isSubmitting ||
                          !token
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#FF6900] disabled:cursor-not-allowed"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={20}
                          />
                        ) : (
                          <Eye
                            size={20}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2.5 block text-sm font-bold text-[#172033]"
                    >
                      Confirm New Password
                    </label>

                    <div className="group relative">
                      <LockKeyhole
                        size={20}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition group-focus-within:text-[#FF6900]"
                      />

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Confirm new password"
                        disabled={
                          isSubmitting ||
                          !tokenReady ||
                          !token
                        }
                        className="h-14 w-full rounded-2xl border border-[#d8dee8] bg-[#fafbfc] pl-12 pr-12 text-sm font-medium text-[#172033] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) =>
                              !current,
                          )
                        }
                        disabled={
                          isSubmitting ||
                          !token
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmed password"
                            : "Show confirmed password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#FF6900] disabled:cursor-not-allowed"
                      >
                        {showConfirmPassword ? (
                          <EyeOff
                            size={20}
                          />
                        ) : (
                          <Eye
                            size={20}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !tokenReady ||
                      !token
                    }
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:bg-[#e55f00] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle
                          size={20}
                          className="animate-spin"
                        />

                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <KeyRound
                          size={20}
                        />

                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-7 space-y-3 text-center">
                {!successMessage && (
                  <Link
                    href="/tenant-admin/forgot-password"
                    className="block text-sm font-bold text-[#FF6900] transition hover:text-[#e55f00]"
                  >
                    Request a new reset link
                  </Link>
                )}

                <Link
                  href="/login"
                  className="block text-sm font-bold text-gray-500 transition hover:text-[#FF6900]"
                >
                  Back to Tenant Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
