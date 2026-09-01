"use client";

import Image from "next/image";

import {
  ImagePlus,
  Loader2,
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
  typeof window !== "undefined"
    ? window.location.origin
    : (
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:5000"
      );

/* =========================================================
   TYPES
========================================================= */

type MainImageSectionProps = {
  image: string;
  productName: string;
  isSubmitting: boolean;

  onImageChange: (
    value: string,
  ) => void;
};

type UploadResponse = {
  success?: boolean;
  message?: string;

  imageUrl?: string;
  url?: string;
  secure_url?: string;

  image?: {
    url?: string;
    secure_url?: string;
  };
};

/* =========================================================
   IMAGE CONFIGURATION
========================================================= */

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* =========================================================
   MAIN IMAGE SECTION
========================================================= */

export default function MainImageSection({
  image,
  productName,
  isSubmitting,
  onImageChange,
}: MainImageSectionProps) {
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

      const data: UploadResponse =
        await response.json();

      const uploadedImageUrl =
        data.imageUrl ||
        data.url ||
        data.secure_url ||
        data.image?.url ||
        data.image?.secure_url ||
        "";

      if (
        !response.ok ||
        !uploadedImageUrl
      ) {
        throw new Error(
          data.message ||
            "Main image could not be uploaded.",
        );
      }

      onImageChange(
        uploadedImageUrl,
      );
    } catch (error) {
      console.error(
        "Main image upload error:",
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
    event: ChangeEvent<HTMLInputElement>,
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
      file.size > MAX_FILE_SIZE
    ) {
      setUploadError(
        "The image size must not exceed 5 MB.",
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
    if (
      isSubmitting ||
      isUploading
    ) {
      return;
    }

    onImageChange("");
    setSelectedFileName("");
    setUploadError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  const cleanImage =
    image.trim();

  const isDisabled =
    isSubmitting ||
    isUploading;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {/* ===================================================
          SECTION HEADER
      =================================================== */}

      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          <ImagePlus
            size={21}
            aria-hidden="true"
          />
        </div>

        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Main Product Image
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Upload the primary product
            image shown across the store.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        {/* =================================================
            IMAGE UPLOAD
        ================================================= */}

        <div>
          <label
            htmlFor="mainImage"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Main Image

            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <label
            htmlFor="mainImage"
            className={`
              flex min-h-40 flex-col
              items-center justify-center
              rounded-2xl border-2
              border-dashed px-5 py-8
              text-center transition
              ${
                isDisabled
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70"
                  : "cursor-pointer border-gray-300 bg-gray-50 hover:border-[#FF6900] hover:bg-orange-50/40"
              }
            `}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
              {isUploading ? (
                <Loader2
                  size={23}
                  aria-hidden="true"
                  className="animate-spin"
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
                  : "Click to select an image"}
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              JPG, JPEG, PNG or WEBP.
              Maximum file size 5 MB.
            </p>

            {selectedFileName && (
              <p className="mt-3 max-w-full truncate rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
                {selectedFileName}
              </p>
            )}
          </label>

          <input
            ref={fileInputRef}
            id="mainImage"
            name="mainImage"
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
                Cloudinary. Please do
                not close this page.
              </p>
            </div>
          )}

          {uploadError && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              {uploadError}
            </p>
          )}
        </div>

        {/* =================================================
            IMAGE PREVIEW
        ================================================= */}

        <div>
          <p className="mb-2 text-sm font-bold text-[#0B1F3A]">
            Image Preview
          </p>

          <div className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50">
            {cleanImage ? (
              <>
                <Image
                  src={cleanImage}
                  alt={
                    productName.trim() ||
                    "Product preview"
                  }
                  fill
                  unoptimized
                  sizes="220px"
                  className="object-cover"
                />

                <button
                  type="button"
                  onClick={
                    handleRemoveImage
                  }
                  disabled={isDisabled}
                  aria-label="Remove main product image"
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
                  <>
                    <Loader2
                      size={30}
                      aria-hidden="true"
                      className="animate-spin text-[#FF6900]"
                    />

                    <p className="mt-2 text-xs font-bold">
                      Uploading image
                    </p>
                  </>
                ) : (
                  <>
                    <ImagePlus
                      size={30}
                      aria-hidden="true"
                    />

                    <p className="mt-2 text-xs font-bold">
                      No image selected
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {cleanImage && (
            <p className="mt-2 text-center text-xs font-semibold text-green-600">
              Image uploaded
              successfully
            </p>
          )}
        </div>
      </div>
    </section>
  );
}