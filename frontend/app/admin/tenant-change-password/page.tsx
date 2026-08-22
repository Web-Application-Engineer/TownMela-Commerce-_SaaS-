"use client";

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
  useState,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

type ChangePasswordResponse = {
  success?: boolean;
  message?: string;
  mustChangePassword?: boolean;
};

type StoredAdminUser = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  tenantId?: string | null;
  mustChangePassword?: boolean;
};

const getAdminToken = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    localStorage.getItem(
      "townmelaAdminToken",
    ) ||
    localStorage.getItem(
      "accessToken",
    ) ||
    localStorage.getItem(
      "token",
    ) ||
    localStorage.getItem(
      "authToken",
    ) ||
    localStorage.getItem(
      "jwt",
    ) ||
    ""
  );
};

const markStoredPasswordChangeComplete =
  () => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    [
      "townmelaAdminUser",
      "user",
    ].forEach((key) => {
      const raw =
        localStorage.getItem(
          key
        );

      if (!raw) {
        return;
      }

      try {
        const currentUser =
          JSON.parse(
            raw
          ) as StoredAdminUser;

        localStorage.setItem(
          key,
          JSON.stringify({
            ...currentUser,
            mustChangePassword:
              false,
          }),
        );
      } catch {
        /*
          Ignore malformed legacy storage values.
          Authentication remains controlled by the token.
        */
      }
    });
  };

export default function TenantAdminChangePasswordPage() {
  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!currentPassword) {
      setSuccessMessage("");
      setErrorMessage(
        "Please enter your current or temporary password.",
      );

      return;
    }

    if (!newPassword) {
      setSuccessMessage("");
      setErrorMessage(
        "Please enter your new password.",
      );

      return;
    }

    if (newPassword.length < 6) {
      setSuccessMessage("");
      setErrorMessage(
        "New password must be at least 6 characters.",
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
      newPassword !==
      confirmPassword
    ) {
      setSuccessMessage("");
      setErrorMessage(
        "New passwords do not match.",
      );

      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setSuccessMessage("");
      setErrorMessage(
        "New password must be different from the current password.",
      );

      return;
    }

    const token =
      getAdminToken();

    if (!token) {
      setSuccessMessage("");
      setErrorMessage(
        "Your Tenant Admin session is not available. Please sign in again.",
      );

      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/tenant-admin/change-password`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const data:
        ChangePasswordResponse =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to change your password.",
        );
      }

      markStoredPasswordChangeComplete();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        data.message ||
          "Tenant Admin password changed successfully",
      );

      window.setTimeout(
        () => {
          window.location.assign(
            "/admin/dashboard",
          );
        },
        900,
      );
    } catch (error) {
      console.error(
        "Change Tenant Admin password error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while changing your password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-[#0B1F3A] px-6 py-7 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white">
              <KeyRound
                size={24}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-orange-300">
                <ShieldCheck
                  size={15}
                />

                Tenant Admin Security
              </div>

              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                Change Password
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
                If this is your first login, enter the temporary password
                provided by TownMela as your current password, then create
                your own new password.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-600"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-semibold leading-6 text-green-700"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  {successMessage}
                  {" "}
                  Redirecting to your dashboard...
                </span>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-2 block text-sm font-bold text-[#0B1F3A]"
              >
                Current / Temporary Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="currentPassword"
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter current or temporary password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-12 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#FF6900] disabled:cursor-not-allowed"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
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
                  id="newPassword"
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-12 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#FF6900] disabled:cursor-not-allowed"
                >
                  {showNewPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

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
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-12 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#FF6900] disabled:cursor-not-allowed"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-[#714018]">
              New Tenant Admin accounts should replace the temporary
              password on first login. After a successful change,
              the temporary-password requirement is cleared.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />

                  Changing Password...
                </>
              ) : (
                <>
                  <KeyRound size={19} />

                  Change Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
