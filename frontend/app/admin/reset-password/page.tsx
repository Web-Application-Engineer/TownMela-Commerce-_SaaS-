"use client";

import Link from "next/link";

import {
  ArrowLeft,
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

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type ResetPasswordResponse = {
  success?: boolean;
  message?: string;
};

/* =========================================================
   RESET SUPER ADMIN PASSWORD PAGE
========================================================= */

export default function ResetAdminPasswordPage() {
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
    isLoading,
    setIsLoading,
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
        "This password reset link is invalid or incomplete. Please request a new reset link.",
      );

      return;
    }

    if (!password) {
      setSuccessMessage("");
      setErrorMessage(
        "Please enter your new password.",
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

    if (!confirmPassword) {
      setSuccessMessage("");
      setErrorMessage(
        "Please confirm your new password.",
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
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/reset-password`,
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
          "Super Admin password has been reset successfully",
      );
    } catch (error) {
      console.error(
        "Reset Super Admin password error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while resetting your password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F5F8] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1200px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* =================================================
              BRAND PANEL
          ================================================= */}

          <section className="relative hidden overflow-hidden bg-[#17181d] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              className="
                absolute
                -right-24
                -top-24
                h-72
                w-72
                rounded-full
                bg-[#FF6900]/20
                blur-3xl
              "
            />

            <div
              className="
                absolute
                -bottom-20
                -left-20
                h-64
                w-64
                rounded-full
                bg-blue-500/10
                blur-3xl
              "
            />

            <div className="relative z-10">
              <Link
                href="/login"
                className="inline-flex text-4xl font-black tracking-tight"
              >
                Town

                <span className="text-[#FF6900]">
                  Mela
                </span>
              </Link>

              <span className="ml-4 border-l border-white/20 pl-4 text-sm text-gray-300">
                SUPER ADMIN
              </span>

              <div className="mt-16 max-w-lg">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                  <ShieldCheck
                    size={17}
                  />

                  Secure Password Reset
                </span>

                <h1 className="mt-6 text-4xl font-black leading-tight">
                  Set a new password for your TownMela Super Admin account.
                </h1>

                <p className="mt-5 text-base leading-8 text-gray-300">
                  Use the secure reset link from your email to choose
                  a new password and restore access to the platform dashboard.
                </p>
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-bold text-white">
                Secure reset link
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Reset links expire automatically. If this link has expired,
                request a new one from the Forgot Password page.
              </p>
            </div>
          </section>

          {/* =================================================
              RESET PASSWORD PANEL
          ================================================= */}

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="lg:hidden">
                <Link
                  href="/"
                  className="text-3xl font-black tracking-tight text-[#17181d]"
                >
                  Town

                  <span className="text-[#FF6900]">
                    Mela
                  </span>
                </Link>
              </div>

              <div className="mt-8 lg:mt-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                  <KeyRound
                    size={27}
                  />
                </div>

                <h2 className="mt-6 text-3xl font-black text-[#0B1F3A]">
                  Reset Password
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Enter and confirm your new Super Admin password.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-600"
                >
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-semibold leading-6 text-green-700"
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
                  className="mt-7 space-y-5"
                >
                  {/* New Password */}

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                    >
                      New Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        disabled={
                          isLoading ||
                          !tokenReady ||
                          !token
                        }
                        className="
                          w-full
                          rounded-xl
                          border
                          border-gray-300
                          bg-white
                          py-3.5
                          pl-12
                          pr-12
                          text-sm
                          font-semibold
                          text-[#0B1F3A]
                          outline-none
                          transition
                          placeholder:font-normal
                          placeholder:text-gray-400
                          focus:border-[#FF6900]
                          focus:ring-2
                          focus:ring-[#FF6900]/10
                          disabled:cursor-not-allowed
                          disabled:bg-gray-100
                        "
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
                          isLoading ||
                          !token
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#FF6900] disabled:cursor-not-allowed"
                      >
                        {showPassword ? (
                          <EyeOff
                            size={19}
                          />
                        ) : (
                          <Eye
                            size={19}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                    >
                      Confirm New Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        id="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          confirmPassword
                        }
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value,
                          )
                        }
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        disabled={
                          isLoading ||
                          !tokenReady ||
                          !token
                        }
                        className="
                          w-full
                          rounded-xl
                          border
                          border-gray-300
                          bg-white
                          py-3.5
                          pl-12
                          pr-12
                          text-sm
                          font-semibold
                          text-[#0B1F3A]
                          outline-none
                          transition
                          placeholder:font-normal
                          placeholder:text-gray-400
                          focus:border-[#FF6900]
                          focus:ring-2
                          focus:ring-[#FF6900]/10
                          disabled:cursor-not-allowed
                          disabled:bg-gray-100
                        "
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
                          isLoading ||
                          !token
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#FF6900] disabled:cursor-not-allowed"
                      >
                        {showConfirmPassword ? (
                          <EyeOff
                            size={19}
                          />
                        ) : (
                          <Eye
                            size={19}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !tokenReady ||
                      !token
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#FF6900]
                      px-5
                      py-3.5
                      text-sm
                      font-extrabold
                      text-white
                      transition
                      hover:bg-[#E85F00]
                      disabled:cursor-not-allowed
                      disabled:opacity-70
                    "
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle
                          size={19}
                          className="animate-spin"
                        />

                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <KeyRound
                          size={19}
                        />

                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-7 space-y-4 border-t border-gray-200 pt-6 text-center">
                {successMessage ? (
                  <Link
                    href="/admin/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#132D50]"
                  >
                    Back to Super Admin Login
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/admin/forgot-password"
                      className="block text-sm font-bold text-[#FF6900] transition hover:text-[#E85F00]"
                    >
                      Request a new reset link
                    </Link>

                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-[#FF6900]"
                    >
                      <ArrowLeft
                        size={16}
                      />

                      Back to Super Admin Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
