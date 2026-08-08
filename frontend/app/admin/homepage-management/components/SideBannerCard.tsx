"use client";

import Image from "next/image";

import {
  type ChangeEvent,
  useRef,
  useState,
} from "react";

import {
  Check,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import type {
  HomepageBanner,
} from "../types/homepage";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type SideBannerCardProps = {
  title: string;
  description: string;
  addButtonLabel: string;
  banners: HomepageBanner[];

  onAddBanner: () => void;

  onUpdateBanner: (
    updatedBanner: HomepageBanner,
  ) => void;

  onDeleteBanner: (
    bannerId: HomepageBanner["id"],
  ) => void;
};

type UploadApiResponse = {
  success?: boolean;
  message?: string;
  imageUrl?: string;
  publicId?: string;
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
   SIDE BANNER CARD
========================================================= */

export default function SideBannerCard({
  title,
  description,
  addButtonLabel,
  banners,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
}: SideBannerCardProps) {
  const fileInputRefs =
    useRef<
      Record<
        string,
        HTMLInputElement | null
      >
    >({});

  /* =======================================================
     EDIT STATE
  ======================================================= */

  const [
    editingBanner,
    setEditingBanner,
  ] = useState<HomepageBanner | null>(
    null,
  );

  const [
    uploadingBannerId,
    setUploadingBannerId,
  ] = useState<
    HomepageBanner["id"] | null
  >(null);

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  const [
    selectedFileName,
    setSelectedFileName,
  ] = useState("");

  /* =======================================================
     START EDIT
  ======================================================= */

  const handleStartEdit = (
    banner: HomepageBanner,
  ) => {
    setEditingBanner({
      ...banner,
    });

    setUploadError("");
    setSelectedFileName("");
  };

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  const handleCancelEdit = () => {
    if (
      uploadingBannerId !== null
    ) {
      return;
    }

    setEditingBanner(null);
    setUploadError("");
    setSelectedFileName("");
  };

  /* =======================================================
     UPDATE EDIT FIELD
  ======================================================= */

  const handleEditFieldChange = <
    Key extends keyof HomepageBanner,
  >(
    field: Key,
    value: HomepageBanner[Key],
  ) => {
    setEditingBanner(
      (currentBanner) => {
        if (!currentBanner) {
          return currentBanner;
        }

        return {
          ...currentBanner,
          [field]: value,
        };
      },
    );
  };

  /* =======================================================
     UPLOAD BANNER IMAGE
  ======================================================= */

  const uploadBannerImage = async (
    file: File,
    bannerId: HomepageBanner["id"],
  ) => {
    try {
      setUploadingBannerId(
        bannerId,
      );

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
            "Banner image could not be uploaded.",
        );
      }

      handleEditFieldChange(
        "image",
        data.imageUrl,
      );
    } catch (error) {
      console.error(
        "Side banner image upload error:",
        error,
      );

      setSelectedFileName("");

      setUploadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the banner image.",
      );

      const input =
        fileInputRefs.current[
          String(bannerId)
        ];

      if (input) {
        input.value = "";
      }
    } finally {
      setUploadingBannerId(null);
    }
  };

  /* =======================================================
     SELECT BANNER IMAGE
  ======================================================= */

  const handleBannerImageChange =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
      bannerId: HomepageBanner["id"],
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
          "The banner image size must not exceed 5 MB.",
        );

        event.target.value = "";

        return;
      }

      setSelectedFileName(
        file.name,
      );

      await uploadBannerImage(
        file,
        bannerId,
      );
    };

  /* =======================================================
     REMOVE BANNER IMAGE
  ======================================================= */

  const handleRemoveBannerImage = (
    bannerId: HomepageBanner["id"],
  ) => {
    if (
      uploadingBannerId !== null
    ) {
      return;
    }

    handleEditFieldChange(
      "image",
      "",
    );

    setSelectedFileName("");
    setUploadError("");

    const input =
      fileInputRefs.current[
        String(bannerId)
      ];

    if (input) {
      input.value = "";
    }
  };

  /* =======================================================
     SAVE EDIT
  ======================================================= */

  const handleSaveEdit = () => {
    if (
      !editingBanner ||
      uploadingBannerId !== null
    ) {
      return;
    }

    const cleanTitle =
      editingBanner.title.trim();

    if (!cleanTitle) {
      window.alert(
        "Banner title is required.",
      );

      return;
    }

    const cleanImage =
      editingBanner.image.trim();

    if (!cleanImage) {
      window.alert(
        "Please upload a banner image.",
      );

      return;
    }

    onUpdateBanner({
      ...editingBanner,

      title:
        cleanTitle,

      image:
        cleanImage,

      link:
        editingBanner.link.trim() ||
        "/shop",

      order:
        Math.max(
          1,
          Number(
            editingBanner.order,
          ) || 1,
        ),
    });

    setEditingBanner(null);
    setUploadError("");
    setSelectedFileName("");
  };

  /* =======================================================
     DELETE BANNER
  ======================================================= */

  const handleDeleteBanner = (
    banner: HomepageBanner,
  ) => {
    const shouldDelete =
      window.confirm(
        `Are you sure you want to delete "${banner.title}"?`,
      );

    if (!shouldDelete) {
      return;
    }

    onDeleteBanner(
      banner.id,
    );

    if (
      editingBanner?.id ===
      banner.id
    ) {
      setEditingBanner(null);
    }
  };

  /* =======================================================
     COMPONENT UI
  ======================================================= */
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70">
      {/* ===================================================
          CARD HEADER
      =================================================== */}

      <div className="flex min-h-[106px] flex-col gap-4 border-b border-gray-200 bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <Sparkles
              size={19}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h3 className="font-black text-[#0B1F3A]">
              {title}
            </h3>

            <p className="mt-1 max-w-[420px] text-xs leading-5 text-gray-500">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <span className="inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
            {banners.length}{" "}
            {banners.length === 1
              ? "Banner"
              : "Banners"}
          </span>

          <button
            type="button"
            onClick={onAddBanner}
            disabled={
              uploadingBannerId !== null
            }
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A]/80 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#132f52] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Plus
              size={15}
              aria-hidden="true"
            />

            {addButtonLabel}
          </button>
        </div>
      </div>

      {/* ===================================================
          BANNER LIST
      =================================================== */}

      <div className="space-y-3 p-4 sm:p-5">
        {banners.length > 0 ? (
          banners.map(
            (banner, index) => {
              const isEditing =
                editingBanner?.id ===
                banner.id;

              const isUploading =
                uploadingBannerId ===
                banner.id;

              const inputId =
                `side-banner-image-${banner.id}`;

              const cleanEditingImage =
                isEditing &&
                editingBanner
                  ? editingBanner.image.trim()
                  : "";

              return (
                <div
                  key={`${banner.type}-${banner.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-sm"
                >
                  {/* =======================================
                      BANNER INFORMATION
                  ======================================= */}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-black text-[#FF6900]">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#0B1F3A]">
                          {banner.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                          <span>
                            Display order:{" "}
                            {banner.order}
                          </span>

                          <span className="hidden text-gray-300 sm:inline">
                            •
                          </span>

                          <span className="max-w-[260px] truncate">
                            {banner.link ||
                              "No target link"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      <span
                        className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                          banner.active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {banner.active
                          ? "Active"
                          : "Inactive"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleStartEdit(
                            banner,
                          )
                        }
                        disabled={
                          uploadingBannerId !==
                          null
                        }
                        aria-label={`Edit ${banner.title}`}
                        className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pencil
                          size={14}
                          aria-hidden="true"
                        />

                        <span className="hidden lg:inline">
                          Edit
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteBanner(
                            banner,
                          )
                        }
                        disabled={
                          uploadingBannerId !==
                          null
                        }
                        aria-label={`Delete ${banner.title}`}
                        className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2
                          size={14}
                          aria-hidden="true"
                        />

                        <span className="hidden lg:inline">
                          Delete
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* =======================================
                      EDIT FORM
                  ======================================= */}

                  {isEditing &&
                    editingBanner && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* TITLE */}

                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold text-[#0B1F3A]">
                              Banner Title
                            </label>

                            <input
                              type="text"
                              value={
                                editingBanner.title
                              }
                              onChange={(
                                event,
                              ) =>
                                handleEditFieldChange(
                                  "title",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isUploading
                              }
                              placeholder="Enter banner title"
                              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                          </div>

                          {/* IMAGE UPLOAD */}

                          <div className="sm:col-span-2">
                            <p className="mb-1.5 text-xs font-bold text-[#0B1F3A]">
                              Banner Image
                            </p>

                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                              <label
                                htmlFor={
                                  inputId
                                }
                                className={`
                                  flex min-h-[180px]
                                  flex-col items-center
                                  justify-center rounded-xl
                                  border-2 border-dashed
                                  px-5 py-7 text-center
                                  transition
                                  ${
                                    isUploading
                                      ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70"
                                      : "cursor-pointer border-gray-300 bg-gray-50 hover:border-[#FF6900] hover:bg-orange-50/40"
                                  }
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
                                    ? "Uploading banner..."
                                    : cleanEditingImage
                                      ? "Click to replace image"
                                      : "Click to choose image"}
                                </p>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                  JPG, JPEG, PNG
                                  or WEBP. Maximum
                                  file size 5 MB.
                                </p>

                                {selectedFileName && (
                                  <p className="mt-3 max-w-full truncate rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
                                    {
                                      selectedFileName
                                    }
                                  </p>
                                )}
                              </label>

                              <input
                                ref={(
                                  element,
                                ) => {
                                  fileInputRefs.current[
                                    String(
                                      banner.id,
                                    )
                                  ] = element;
                                }}
                                id={inputId}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                disabled={
                                  isUploading
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleBannerImageChange(
                                    event,
                                    banner.id,
                                  )
                                }
                                className="sr-only"
                              />

                              <div>
                                <p className="mb-1.5 text-xs font-bold text-[#0B1F3A]">
                                  Image Preview
                                </p>

                                <div className="relative aspect-[360/269] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                                  {cleanEditingImage ? (
                                    <>
                                      <Image
                                        src={
                                          cleanEditingImage
                                        }
                                        alt={
                                          editingBanner.title.trim() ||
                                          "Side banner preview"
                                        }
                                        fill
                                        unoptimized
                                        sizes="260px"
                                        className="object-cover"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveBannerImage(
                                            banner.id,
                                          )
                                        }
                                        disabled={
                                          isUploading
                                        }
                                        aria-label="Remove side banner image"
                                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <Trash2
                                          size={16}
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-gray-400">
                                      {isUploading ? (
                                        <LoaderCircle
                                          size={28}
                                          className="animate-spin text-[#FF6900]"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <ImagePlus
                                          size={28}
                                          aria-hidden="true"
                                        />
                                      )}

                                      <p className="mt-2 text-xs font-bold">
                                        {isUploading
                                          ? "Uploading..."
                                          : "No image selected"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {uploadError && (
                              <p className="mt-2 text-sm font-semibold text-red-600">
                                {uploadError}
                              </p>
                            )}
                          </div>

                          {/* TARGET LINK */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#0B1F3A]">
                              Target Link
                            </label>

                            <input
                              type="text"
                              value={
                                editingBanner.link
                              }
                              onChange={(
                                event,
                              ) =>
                                handleEditFieldChange(
                                  "link",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isUploading
                              }
                              placeholder="/shop"
                              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                          </div>

                          {/* DISPLAY ORDER */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#0B1F3A]">
                              Display Order
                            </label>

                            <input
                              type="number"
                              min={1}
                              value={
                                editingBanner.order
                              }
                              onChange={(
                                event,
                              ) =>
                                handleEditFieldChange(
                                  "order",
                                  Number(
                                    event.target
                                      .value,
                                  ),
                                )
                              }
                              disabled={
                                isUploading
                              }
                              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                          </div>

                          {/* ACTIVE STATUS */}

                          <div className="sm:col-span-2">
                            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                              <div>
                                <p className="text-xs font-bold text-[#0B1F3A]">
                                  Banner Status
                                </p>

                                <p className="mt-0.5 text-[11px] text-gray-400">
                                  Enable or disable
                                  this banner.
                                </p>
                              </div>

                              <input
                                type="checkbox"
                                checked={
                                  editingBanner.active
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleEditFieldChange(
                                    "active",
                                    event.target
                                      .checked,
                                  )
                                }
                                disabled={
                                  isUploading
                                }
                                className="h-4 w-4 cursor-pointer accent-[#FF6900] disabled:cursor-not-allowed"
                              />
                            </label>
                          </div>
                        </div>

                        {/* EDIT ACTIONS */}

                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={
                              handleCancelEdit
                            }
                            disabled={
                              isUploading
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X
                              size={15}
                              aria-hidden="true"
                            />

                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleSaveEdit
                            }
                            disabled={
                              isUploading
                            }
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6900] px-4 text-xs font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isUploading ? (
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check
                                size={15}
                                aria-hidden="true"
                              />
                            )}

                            {isUploading
                              ? "Uploading..."
                              : "Update Banner"}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              );
            },
          )
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
            <Sparkles
              size={24}
              className="text-gray-300"
              aria-hidden="true"
            />

            <p className="mt-3 text-sm font-bold text-gray-500">
              No banners added yet
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Use the add button to create
              a new banner.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
