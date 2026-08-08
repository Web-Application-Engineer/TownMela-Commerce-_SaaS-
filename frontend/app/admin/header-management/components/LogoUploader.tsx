"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import {
  ImageIcon,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type LogoUploaderProps = {
  businessName: string;
  logo: string;
  mobileLogo: string;

  onBusinessNameChange: (
    value: string,
  ) => void;

  onLogoChange: (
    value: string,
  ) => void;

  onMobileLogoChange: (
    value: string,
  ) => void;
};

type ImageUploadResponse = {
  success?: boolean;
  message?: string;
  imageUrl?: string;
};

/* =========================================================
   CONFIG
========================================================= */

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/* =========================================================
   LOGO UPLOADER
========================================================= */

export default function LogoUploader({
  businessName,
  logo,
  mobileLogo,
  onBusinessNameChange,
  onLogoChange,
  onMobileLogoChange,
}: LogoUploaderProps) {
  const logoInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const mobileLogoInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    isUploadingLogo,
    setIsUploadingLogo,
  ] =
    useState(false);

  const [
    isUploadingMobileLogo,
    setIsUploadingMobileLogo,
  ] =
    useState(false);

  const [
    logoError,
    setLogoError,
  ] =
    useState("");

  const [
    mobileLogoError,
    setMobileLogoError,
  ] =
    useState("");

  /* =======================================================
     GET ADMIN TOKEN
  ======================================================= */

  const getToken =
    () => {
      const keys = [
        "townmelaAdminToken",
        "accessToken",
        "token",
        "authToken",
        "jwt",
      ];

      for (const key of keys) {
        const value =
          localStorage.getItem(
            key,
          );

        if (value) {
          return value;
        }
      }

      return "";
    };

  /* =======================================================
     VALIDATE IMAGE
  ======================================================= */

  const validateImage = (
    file: File,
  ) => {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      return "Only JPG, JPEG, PNG and WEBP images are allowed.";
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return "Image size must not exceed 5 MB.";
    }

    return "";
  };

  /* =======================================================
     UPLOAD IMAGE
  ======================================================= */

  const uploadImage =
    async (
      file: File,
    ) => {
      const token =
        getToken();

      if (!token) {
        throw new Error(
          "Admin session was not found.",
        );
      }

      const formData =
        new FormData();

      formData.append(
        "image",
        file,
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/uploads/image`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body:
              formData,
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => null,
          )) as
          | ImageUploadResponse
          | null;

      if (
        !response.ok ||
        !data?.success ||
        !data.imageUrl
      ) {
        throw new Error(
          data?.message ||
            "Image could not be uploaded.",
        );
      }

      return data.imageUrl;
    };

  /* =======================================================
     BUSINESS LOGO
  ======================================================= */

  const handleLogoChange =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      setLogoError("");

      if (!file) {
        return;
      }

      const validationError =
        validateImage(file);

      if (validationError) {
        setLogoError(
          validationError,
        );

        event.target.value =
          "";

        return;
      }

      try {
        setIsUploadingLogo(
          true,
        );

        const imageUrl =
          await uploadImage(
            file,
          );

        onLogoChange(
          imageUrl,
        );
      } catch (error) {
        setLogoError(
          error instanceof Error
            ? error.message
            : "Logo upload failed.",
        );

        if (
          logoInputRef.current
        ) {
          logoInputRef.current.value =
            "";
        }
      } finally {
        setIsUploadingLogo(
          false,
        );
      }
    };

  /* =======================================================
     MOBILE LOGO
  ======================================================= */

  const handleMobileLogoChange =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      setMobileLogoError("");

      if (!file) {
        return;
      }

      const validationError =
        validateImage(file);

      if (validationError) {
        setMobileLogoError(
          validationError,
        );

        event.target.value =
          "";

        return;
      }

      try {
        setIsUploadingMobileLogo(
          true,
        );

        const imageUrl =
          await uploadImage(
            file,
          );

        onMobileLogoChange(
          imageUrl,
        );
      } catch (error) {
        setMobileLogoError(
          error instanceof Error
            ? error.message
            : "Mobile logo upload failed.",
        );

        if (
          mobileLogoInputRef.current
        ) {
          mobileLogoInputRef.current.value =
            "";
        }
      } finally {
        setIsUploadingMobileLogo(
          false,
        );
      }
    };

  /* =======================================================
     REMOVE LOGO
  ======================================================= */

  const removeLogo =
    () => {
      if (isUploadingLogo) {
        return;
      }

      onLogoChange("");

      setLogoError("");

      if (
        logoInputRef.current
      ) {
        logoInputRef.current.value =
          "";
      }
    };

  /* =======================================================
     REMOVE MOBILE LOGO
  ======================================================= */

  const removeMobileLogo =
    () => {
      if (
        isUploadingMobileLogo
      ) {
        return;
      }

      onMobileLogoChange("");

      setMobileLogoError("");

      if (
        mobileLogoInputRef.current
      ) {
        mobileLogoInputRef.current.value =
          "";
      }
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-black text-[#0B1F3A]">
          Business Information
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage your business name and store logo.
        </p>
      </div>

      {/* ===================================================
          BUSINESS NAME
      =================================================== */}

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-gray-700">
          Business Name
        </label>

        <input
          type="text"
          value={
            businessName
          }
          onChange={(
            event,
          ) =>
            onBusinessNameChange(
              event.target.value,
            )
          }
          placeholder="Enter business name"
          className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-50"
        />
      </div>

      {/* ===================================================
          LOGOS
      =================================================== */}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* BUSINESS LOGO */}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="font-extrabold text-[#0B1F3A]">
              Business Logo
            </p>

            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG or WEBP. Maximum 5 MB.
            </p>
          </div>

          <div className="mt-4 flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
            {logo ? (
              <img
                src={logo}
                alt={
                  businessName ||
                  "Business logo"
                }
                className="max-h-[110px] max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon
                  size={34}
                  className="mx-auto"
                />

                <p className="mt-2 text-xs font-bold">
                  No logo uploaded
                </p>
              </div>
            )}
          </div>

          {logoError && (
            <p className="mt-3 text-xs font-semibold text-red-600">
              {logoError}
            </p>
          )}

          <input
            ref={
              logoInputRef
            }
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={
              handleLogoChange
            }
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                isUploadingLogo
              }
              onClick={() =>
                logoInputRef.current?.click()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingLogo ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Upload
                  size={16}
                />
              )}

              {isUploadingLogo
                ? "Uploading..."
                : logo
                  ? "Change Logo"
                  : "Upload Logo"}
            </button>

            {logo && (
              <button
                type="button"
                disabled={
                  isUploadingLogo
                }
                onClick={
                  removeLogo
                }
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 disabled:opacity-60"
              >
                <Trash2
                  size={16}
                />

                Remove
              </button>
            )}
          </div>
        </div>

        {/* MOBILE LOGO */}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="font-extrabold text-[#0B1F3A]">
              Mobile Logo
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Optional logo for mobile devices.
            </p>
          </div>

          <div className="mt-4 flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
            {mobileLogo ? (
              <img
                src={
                  mobileLogo
                }
                alt={
                  businessName
                    ? `${businessName} mobile logo`
                    : "Mobile logo"
                }
                className="max-h-[110px] max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon
                  size={34}
                  className="mx-auto"
                />

                <p className="mt-2 text-xs font-bold">
                  No mobile logo uploaded
                </p>
              </div>
            )}
          </div>

          {mobileLogoError && (
            <p className="mt-3 text-xs font-semibold text-red-600">
              {
                mobileLogoError
              }
            </p>
          )}

          <input
            ref={
              mobileLogoInputRef
            }
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={
              handleMobileLogoChange
            }
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                isUploadingMobileLogo
              }
              onClick={() =>
                mobileLogoInputRef.current?.click()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingMobileLogo ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Upload
                  size={16}
                />
              )}

              {isUploadingMobileLogo
                ? "Uploading..."
                : mobileLogo
                  ? "Change Mobile Logo"
                  : "Upload Mobile Logo"}
            </button>

            {mobileLogo && (
              <button
                type="button"
                disabled={
                  isUploadingMobileLogo
                }
                onClick={
                  removeMobileLogo
                }
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 disabled:opacity-60"
              >
                <Trash2
                  size={16}
                />

                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}