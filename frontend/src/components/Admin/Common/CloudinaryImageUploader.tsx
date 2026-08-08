"use client";

import Image from "next/image";

import {
  ImagePlus,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  type ChangeEvent,
  useRef,
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

type CloudinaryImageUploaderProps = {
  image: string;

  onChange: (
    imageUrl: string,
  ) => void;

  label?: string;
  helperText?: string;
  previewLabel?: string;
  emptyPreviewText?: string;
  altText?: string;

  disabled?: boolean;
  required?: boolean;

  maxFileSizeMb?: number;

  previewAspectRatio?: string;
  previewSizes?: string;

  uploadAreaClassName?: string;
  previewClassName?: string;
};

type UploadApiResponse = {
  success?: boolean;
  message?: string;
  imageUrl?: string;
  publicId?: string;
};

/* =========================================================
   DEFAULT CONFIGURATION
========================================================= */

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* =========================================================
   CLOUDINARY IMAGE UPLOADER
========================================================= */

export default function CloudinaryImageUploader({
  image,
  onChange,

  label = "Image",
  helperText = "JPG, JPEG, PNG or WEBP.",
  previewLabel = "Image Preview",
  emptyPreviewText = "No image selected",
  altText = "Image preview",

  disabled = false,
  required = false,

  maxFileSizeMb = 5,

  previewAspectRatio =
    "aspect-square",

  previewSizes = "220px",

  uploadAreaClassName = "",
  previewClassName = "",
}: CloudinaryImageUploaderProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  const [
    selectedFileName,
    setSelectedFileName,
  ] = useState("");

  const cleanImage =
    image.trim();

  const maxFileSize =
    maxFileSizeMb *
    1024 *
    1024;

  const isDisabled =
    disabled ||
    isUploading;

  /* =======================================================
     UPLOAD IMAGE
  ======================================================= */

  const uploadImage = async (
    file: File,
  ) => {
    try {
      setIsUploading(true);
      setUploadError("");

      const formData =
        new FormData();

      formData.append(
        "image",
        file,
      );

      const token =
        localStorage.getItem(
          "townmelaAdminToken",
        );

      const response = await fetch(
        `${API_BASE_URL}/api/uploads/image`,
        {
          method: "POST",

          headers: {
            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: formData,
        },
      );

      const data:
        UploadApiResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.imageUrl
      ) {
        throw new Error(
          data.message ||
            "Image could not be uploaded.",
        );
      }

      onChange(
        data.imageUrl,
      );
    } catch (error) {
      console.error(
        "Cloudinary image upload error:",
        error,
      );

      setSelectedFileName("");

      setUploadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the image.",
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    } finally {
      setIsUploading(false);
    }
  };

  /* =======================================================
     SELECT IMAGE
  ======================================================= */

  const handleFileChange = async (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    setUploadError("");

    if (!file) {
      return;
    }

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setUploadError(
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      maxFileSize
    ) {
      setUploadError(
        `The image size must not exceed ${maxFileSizeMb} MB.`,
      );

      event.target.value = "";

      return;
    }

    setSelectedFileName(
      file.name,
    );

    await uploadImage(file);
  };

  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  const handleRemoveImage = () => {
    if (isDisabled) {
      return;
    }

    onChange("");
    setUploadError("");
    setSelectedFileName("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
      {/* ===================================================
          UPLOAD AREA
      =================================================== */}

      <div className="min-w-0">
        <label
          htmlFor="cloudinaryImageUploader"
          className="mb-2 block text-sm font-bold text-[#0B1F3A]"
        >
          {label}

          {required && (
            <span className="text-red-500">
              {" "}
              *
            </span>
          )}
        </label>

        <label
          htmlFor="cloudinaryImageUploader"
          className={`
            flex min-h-[180px]
            flex-col items-center
            justify-center rounded-2xl
            border-2 border-dashed
            px-5 py-8 text-center
            transition
            ${
              isDisabled
                ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70"
                : "cursor-pointer border-gray-300 bg-gray-50 hover:border-[#FF6900] hover:bg-orange-50/40"
            }
            ${uploadAreaClassName}
          `}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
            {isUploading ? (
              <LoaderCircle
                size={23}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <UploadCloud
                size={23}
                aria-hidden="true"
              />
            )}
          </div>

          <p className="mt-3 text-sm font-extrabold text-[#0B1F3A]">
            {isUploading
              ? "Uploading image..."
              : cleanImage
                ? "Click to replace image"
                : "Click to choose image"}
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            {helperText}
            {" "}
            Maximum file size
            {" "}
            {maxFileSizeMb}
            {" "}
            MB.
          </p>

          {selectedFileName && (
            <p className="mt-3 max-w-full truncate rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
              {selectedFileName}
            </p>
          )}
        </label>

        <input
          ref={fileInputRef}
          id="cloudinaryImageUploader"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          disabled={isDisabled}
          onChange={
            handleFileChange
          }
          className="sr-only"
        />

        {isUploading && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#FF6900]" />
            </div>

            <p className="mt-2 text-sm font-semibold text-gray-500">
              Uploading to
              Cloudinary. Please wait.
            </p>
          </div>
        )}

        {uploadError && (
          <p className="mt-2 text-sm font-semibold text-red-600">
            {uploadError}
          </p>
        )}
      </div>

      {/* ===================================================
          PREVIEW
      =================================================== */}

      <div className="min-w-0">
        <p className="mb-2 text-sm font-bold text-[#0B1F3A]">
          {previewLabel}
        </p>

        <div
          className={`
            relative w-full
            max-w-[220px]
            overflow-hidden rounded-2xl
            border border-dashed
            border-gray-300
            bg-gray-50
            ${previewAspectRatio}
            ${previewClassName}
          `}
        >
          {cleanImage ? (
            <>
              <Image
                src={cleanImage}
                alt={altText}
                fill
                unoptimized
                sizes={previewSizes}
                className="object-cover"
              />

              <button
                type="button"
                onClick={
                  handleRemoveImage
                }
                disabled={isDisabled}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2
                  size={17}
                  aria-hidden="true"
                />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-gray-400">
              {isUploading ? (
                <LoaderCircle
                  size={30}
                  className="animate-spin text-[#FF6900]"
                  aria-hidden="true"
                />
              ) : (
                <ImagePlus
                  size={30}
                  aria-hidden="true"
                />
              )}

              <p className="mt-2 text-xs font-bold">
                {isUploading
                  ? "Uploading image..."
                  : emptyPreviewText}
              </p>
            </div>
          )}
        </div>

        {cleanImage && (
          <p className="mt-2 text-center text-xs font-semibold text-emerald-600">
            Image uploaded
            successfully
          </p>
        )}
      </div>
    </div>
  );
}