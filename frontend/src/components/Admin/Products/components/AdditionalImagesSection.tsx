"use client";

import Image from "next/image";

import {
  ImagePlus,
  Loader2,
  Plus,
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

type AdditionalImagesSectionProps = {
  images: string[];
  isSubmitting: boolean;

  onAddImage: () => void;

  onUpdateImage: (
    index: number,
    value: string,
  ) => void;

  onRemoveImage: (
    index: number,
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
   CONFIGURATION
========================================================= */

const MAX_IMAGES = 4;

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* =========================================================
   COMPONENT
========================================================= */

export default function AdditionalImagesSection({
  images,
  isSubmitting,
  onAddImage,
  onUpdateImage,
  onRemoveImage,
}: AdditionalImagesSectionProps) {
  const fileInputRefs =
    useRef<
      Record<
        number,
        HTMLInputElement | null
      >
    >({});

  const [
    uploadingIndex,
    setUploadingIndex,
  ] = useState<number | null>(
    null,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     UPLOAD IMAGE
  ======================================================= */

  const uploadImage = async (
    file: File,
    index: number,
  ) => {
    try {
      setUploadingIndex(index);
      setErrorMessage("");

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
            "Additional image could not be uploaded.",
        );
      }

      onUpdateImage(
        index,
        uploadedImageUrl,
      );
    } catch (error) {
      console.error(
        "Additional image upload error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the image.",
      );

      const input =
        fileInputRefs.current[
          index
        ];

      if (input) {
        input.value = "";
      }
    } finally {
      setUploadingIndex(null);
    }
  };

  /* =======================================================
     SELECT IMAGE
  ======================================================= */

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file =
      event.target.files?.[0];

    setErrorMessage("");

    if (!file) {
      return;
    }

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setErrorMessage(
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      setErrorMessage(
        "Each image must not exceed 5 MB.",
      );

      event.target.value = "";

      return;
    }

    await uploadImage(
      file,
      index,
    );
  };

  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  const handleRemoveImage = (
    index: number,
  ) => {
    if (
      isSubmitting ||
      uploadingIndex !== null
    ) {
      return;
    }

    onRemoveImage(index);
    setErrorMessage("");

    const input =
      fileInputRefs.current[index];

    if (input) {
      input.value = "";
    }
  };

  /* =======================================================
     ADD IMAGE SLOT
  ======================================================= */

  const handleAddImage = () => {
    if (
      isSubmitting ||
      uploadingIndex !== null ||
      images.length >= MAX_IMAGES
    ) {
      return;
    }

    onAddImage();
    setErrorMessage("");
  };

  const isBusy =
    isSubmitting ||
    uploadingIndex !== null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <ImagePlus
              size={21}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Additional Images
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Upload up to{" "}
              {MAX_IMAGES} additional
              product images.
            </p>
          </div>
        </div>

        {images.length <
          MAX_IMAGES && (
          <button
            type="button"
            onClick={
              handleAddImage
            }
            disabled={isBusy}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-[#FF6900] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus
              size={18}
              aria-hidden="true"
            />

            Add Image
          </button>
        )}
      </div>

      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ===================================================
          IMAGE SLOTS
      =================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {images.map(
          (image, index) => {
            const cleanImage =
              image.trim();

            const isUploading =
              uploadingIndex ===
              index;

            const inputId =
              `additional-image-${index}`;

            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {cleanImage ? (
                    <>
                      <Image
                        src={cleanImage}
                        alt={`Additional product image ${
                          index + 1
                        }`}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveImage(
                            index,
                          )
                        }
                        disabled={
                          isBusy
                        }
                        aria-label={`Remove additional image ${
                          index + 1
                        }`}
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2
                          size={17}
                          aria-hidden="true"
                        />
                      </button>
                    </>
                  ) : (
                    <label
                      htmlFor={
                        inputId
                      }
                      className={`
                        flex h-full w-full
                        flex-col items-center
                        justify-center px-4
                        text-center transition
                        ${
                          isBusy
                            ? "cursor-not-allowed bg-gray-100 opacity-70"
                            : "cursor-pointer hover:bg-orange-50"
                        }
                      `}
                    >
                      {isUploading ? (
                        <>
                          <Loader2
                            size={30}
                            aria-hidden="true"
                            className="animate-spin text-[#FF6900]"
                          />

                          <p className="mt-3 text-sm font-extrabold text-[#0B1F3A]">
                            Uploading...
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                            <UploadCloud
                              size={23}
                              aria-hidden="true"
                            />
                          </div>

                          <p className="mt-3 text-sm font-extrabold text-[#0B1F3A]">
                            Choose Image
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            JPG, PNG or
                            WEBP
                          </p>

                          <p className="text-xs text-gray-500">
                            Maximum 5 MB
                          </p>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <input
                  ref={(element) => {
                    fileInputRefs.current[
                      index
                    ] = element;
                  }}
                  id={inputId}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  disabled={isBusy}
                  onChange={(event) =>
                    handleFileChange(
                      event,
                      index,
                    )
                  }
                  className="sr-only"
                />

                <div className="flex items-center justify-between px-3 py-3">
                  <p className="text-xs font-bold text-gray-500">
                    Image {index + 1}
                  </p>

                  {cleanImage && (
                    <label
                      htmlFor={
                        inputId
                      }
                      className={`
                        text-xs font-extrabold
                        text-[#FF6900]
                        ${
                          isBusy
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:underline"
                        }
                      `}
                    >
                      Replace
                    </label>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* ===================================================
          EMPTY STATE
      =================================================== */}

      {images.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
            <ImagePlus
              size={28}
              aria-hidden="true"
            />
          </div>

          <h3 className="mt-4 text-base font-black text-[#0B1F3A]">
            No Additional Images
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
            Create an image slot
            and upload a product
            gallery image.
          </p>

          <button
            type="button"
            onClick={
              handleAddImage
            }
            disabled={isBusy}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#e55d00] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus
              size={18}
              aria-hidden="true"
            />

            Add First Image
          </button>
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-gray-500">
        {images.length} of{" "}
        {MAX_IMAGES} image slots
        added.
      </p>
    </section>
  );
}