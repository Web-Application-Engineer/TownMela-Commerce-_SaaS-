"use client";

import Link from "next/link";

import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  type FormEvent,
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

type AdminUser = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "superadmin";
  tenantId?: string | null;
};

type AdminLoginResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  tenantId?: string | null;
  user?: AdminUser;
};

/* =========================================================
   ADMIN LOGIN PAGE
========================================================= */

export default function AdminLoginPage() {
  const [
    identifier,
    setIdentifier,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     ADMIN LOGIN
  ======================================================= */

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanIdentifier =
      identifier.trim();

    if (!cleanIdentifier) {
      setErrorMessage(
        "Please enter your admin email or phone number.",
      );

      return;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password.",
      );

      return;
    }

    try {
      setIsLoading(true);
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
          },

          body: JSON.stringify({
            identifier:
              cleanIdentifier,

            password,

            loginAs:
              "superadmin",
          }),
        },
      );

      const data:
        AdminLoginResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.token ||
        !data.user
      ) {
        throw new Error(
          data.message ||
            "Admin login failed.",
        );
      }

      if (
        data.user.role !== "superadmin"
      ) {
        throw new Error(
          "Access denied. Super Admin account required.",
        );
      }

      const serializedUser =
        JSON.stringify({
          ...data.user,
          tenantId: null,
        });

      /*
        Store both the current admin-specific keys and the
        legacy keys used by existing dashboard/API code.
        This prevents an immediate redirect back to login
        while the admin area is migrated to one key format.
      */

      localStorage.setItem(
        "townmelaAdminToken",
        data.token,
      );

      localStorage.setItem(
        "townmelaAdminUser",
        serializedUser,
      );

      localStorage.setItem(
        "token",
        data.token,
      );

      localStorage.setItem(
        "user",
        serializedUser,
      );

      localStorage.setItem(
        "userId",
        data.user._id,
      );

      localStorage.removeItem(
        "tenantId",
      );

      localStorage.removeItem(
        "tenant_id",
      );

      localStorage.removeItem(
        "activeTenantId",
      );

      localStorage.removeItem(
        "selectedTenantId",
      );

      localStorage.setItem(
        "accessToken",
        data.token,
      );

      /*
        A hard navigation ensures the dashboard and its
        client-side authentication checks read the newly
        stored values from a fresh page lifecycle.
      */

      window.location.assign(
        "/admin/dashboard",
      );
    } catch (error) {
      console.error(
        "Admin login error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while logging in.",
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

                  Platform Administration
                </span>

                <h1 className="mt-6 text-4xl font-black leading-tight">
                  Manage TownMela tenants from one secure dashboard.
                </h1>

                <p className="mt-5 text-base leading-8 text-gray-300">
                  Create tenants, manage trial access,
                  monitor subscriptions and switch
                  between tenant stores.
                </p>
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-bold text-white">
                Platform owner access only
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                This login is reserved for
                the TownMela Super Admin.
              </p>
            </div>
          </section>

          {/* =================================================
              LOGIN PANEL
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
                  <LockKeyhole
                    size={27}
                  />
                </div>

                <h2 className="mt-6 text-3xl font-black text-[#0B1F3A]">
                  Super Admin Login
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Sign in using your authorized
                  TownMela platform-owner
                  email or phone number.
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

              <form
                onSubmit={handleLogin}
                className="mt-7 space-y-5"
              >
                {/* Identifier */}

                <div>
                  <label
                    htmlFor="identifier"
                    className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                  >
                    Email or Phone Number
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) =>
                        setIdentifier(
                          event.target
                            .value,
                        )
                      }
                      placeholder="contacttownmela@gmail.com"
                      autoComplete="username"
                      disabled={
                        isLoading
                      }
                      className="
                        h-13
                        w-full
                        rounded-xl
                        border
                        border-gray-300
                        bg-white
                        py-3.5
                        pl-12
                        pr-4
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
                  </div>
                </div>

                {/* Password */}

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-[#0B1F3A]"
                  >
                    Password
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={
                        isLoading
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
                        isLoading
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

                {/* Login Button */}

                <button
                  type="submit"
                  disabled={isLoading}
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

                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn
                        size={19}
                      />

                      Sign In as Super Admin
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-gray-200 pt-6 text-center">
                <Link
                  href="/"
                  className="text-sm font-bold text-gray-500 transition hover:text-[#FF6900]"
                >
                  Tenant Admin Login
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}