"use client";

import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  ImageIcon,
  LoaderCircle,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createTenantHeaders,
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type CategoryFormMode =
  | "create"
  | "edit";

type CategoryParentValue =
  | string
  | {
      _id?: string;
      name?: string;
      slug?: string;
    }
  | null;

type ParentCategoryOption = {
  _id: string;
  name: string;
  slug: string;
  parent?: CategoryParentValue;
  status?: boolean;
};

type CategoriesApiResponse =
  | ParentCategoryOption[]
  | {
      success?: boolean;
      categories?: ParentCategoryOption[];
      message?: string;
    };

export type CategoryFormInitialData = {
  _id?: string;
  name?: string;
  slug?: string;
  parent?: CategoryParentValue;
  thumbnail?: string;
  featured?: boolean;
  homepageSection?: 1 | 2 | 3;
  status?: boolean;
};

type CategoryFormProps = {
  mode?: CategoryFormMode;
  categoryId?: string;
  initialData?: CategoryFormInitialData;
};

type CategoryApiResponse = {
  success?: boolean;
  message?: string;

  category?: {
    _id: string;
    name: string;
    slug: string;
    parent?: CategoryParentValue;
    thumbnail?: string;
    featured?: boolean;
    homepageSection?: 1 | 2 | 3;
    status?: boolean;
  };
};

type ImageUploadApiResponse = {
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
   HELPERS
========================================================= */

function createSlug(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getParentCategoryId(
  value?: CategoryParentValue,
) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value._id?.trim() ?? "";
}

/* =========================================================
   CATEGORY FORM
========================================================= */

export default function CategoryForm({
  mode = "create",
  categoryId,
  initialData,
}: CategoryFormProps) {
  const router = useRouter();

  const thumbnailInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    name,
    setName,
  ] = useState(
    initialData?.name ?? "",
  );

  const [
    slug,
    setSlug,
  ] = useState(
    initialData?.slug ?? "",
  );

  const [
    parentCategoryId,
    setParentCategoryId,
  ] = useState(
    getParentCategoryId(
      initialData?.parent,
    ),
  );

  const [
    parentCategories,
    setParentCategories,
  ] = useState<ParentCategoryOption[]>(
    [],
  );

  const [
    isLoadingParentCategories,
    setIsLoadingParentCategories,
  ] = useState(false);

  const [
    parentCategoryLoadError,
    setParentCategoryLoadError,
  ] = useState("");

  const [
    thumbnail,
    setThumbnail,
  ] = useState(
    initialData?.thumbnail ?? "",
  );

  const [
    featured,
    setFeatured,
  ] = useState(
    initialData?.featured ?? false,
  );

  const [
    homepageSection,
    setHomepageSection,
  ] = useState<1 | 2 | 3>(
    initialData?.homepageSection ?? 1,
  );

  const [
    thumbnailLoadError,
    setThumbnailLoadError,
  ] = useState(false);

  const [
    isUploadingThumbnail,
    setIsUploadingThumbnail,
  ] = useState(false);

  const [
    thumbnailUploadError,
    setThumbnailUploadError,
  ] = useState("");

  const [
    selectedThumbnailName,
    setSelectedThumbnailName,
  ] = useState("");

  const [
    slugWasEdited,
    setSlugWasEdited,
  ] = useState(
    Boolean(initialData?.slug),
  );

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

  /* =======================================================
     SYNC INITIAL DATA
  ======================================================= */

  useEffect(() => {
    setName(
      initialData?.name ?? "",
    );

    setSlug(
      initialData?.slug ?? "",
    );

    setParentCategoryId(
      getParentCategoryId(
        initialData?.parent,
      ),
    );

    setThumbnail(
      initialData?.thumbnail ?? "",
    );

    setFeatured(
      initialData?.featured ?? false,
    );

    setHomepageSection(
      initialData?.homepageSection ?? 1,
    );

    setThumbnailLoadError(false);
    setThumbnailUploadError("");
    setSelectedThumbnailName("");

    setSlugWasEdited(
      Boolean(initialData?.slug),
    );
  }, [initialData]);

  /* =======================================================
     LOAD AVAILABLE PARENT CATEGORIES

     Only active main categories can be selected as a parent.
     The current category is excluded while editing.
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    const loadParentCategories =
      async () => {
        try {
          setIsLoadingParentCategories(
            true,
          );

          setParentCategoryLoadError("");

          const response =
            await tenantFetch(
              "/api/categories?status=true",
              {
                method: "GET",
                cache: "no-store",
                signal:
                  controller.signal,
              },
            );

          const data =
            (await response.json()) as CategoriesApiResponse;

          if (!response.ok) {
            const apiMessage =
              Array.isArray(data)
                ? ""
                : data.message || "";

            throw new Error(
              apiMessage ||
                "Parent categories could not be loaded.",
            );
          }

          const categoryList =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data.categories,
                  )
                ? data.categories
                : [];

          const mainCategories =
            categoryList
              .filter((category) => {
                const parentId =
                  getParentCategoryId(
                    category.parent,
                  );

                return (
                  Boolean(
                    category?._id,
                  ) &&
                  Boolean(
                    category?.name?.trim(),
                  ) &&
                  Boolean(
                    category?.slug?.trim(),
                  ) &&
                  category.status !==
                    false &&
                  !parentId &&
                  category._id !==
                    categoryId
                );
              })
              .sort(
                (
                  firstCategory,
                  secondCategory,
                ) =>
                  firstCategory.name.localeCompare(
                    secondCategory.name,
                  ),
              );

          setParentCategories(
            mainCategories,
          );
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Parent category loading error:",
            error,
          );

          setParentCategories([]);

          setParentCategoryLoadError(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading parent categories.",
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setIsLoadingParentCategories(
              false,
            );
          }
        }
      };

    void loadParentCategories();

    return () => {
      controller.abort();
    };
  }, [categoryId]);

  /* =======================================================
     NAME CHANGE
  ======================================================= */

  const handleNameChange = (
    value: string,
  ) => {
    setName(value);

    if (!slugWasEdited) {
      setSlug(
        createSlug(value),
      );
    }
  };

  /* =======================================================
     UPLOAD CATEGORY THUMBNAIL
  ======================================================= */

  const uploadThumbnail = async (
    file: File,
  ) => {
    try {
      setIsUploadingThumbnail(
        true,
      );

      setThumbnailUploadError("");
      setErrorMessage("");
      setSuccessMessage("");

      const formData =
        new FormData();

      formData.append(
        "image",
        file,
      );

      const {
        ["Content-Type"]:
          _contentType,
        ...uploadHeaders
      } = createTenantHeaders();

      const response = await fetch(
        `${API_BASE_URL}/api/uploads/image`,
        {
          method: "POST",

          credentials:
            "include",

          headers:
            uploadHeaders,

          body: formData,
        },
      );

      const data:
        ImageUploadApiResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.imageUrl
      ) {
        throw new Error(
          data.message ||
            "Category thumbnail could not be uploaded.",
        );
      }

      setThumbnail(
        data.imageUrl,
      );

      setThumbnailLoadError(
        false,
      );
    } catch (error) {
      console.error(
        "Category thumbnail upload error:",
        error,
      );

      setThumbnail("");
      setSelectedThumbnailName("");

      setThumbnailUploadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the thumbnail.",
      );

      if (
        thumbnailInputRef.current
      ) {
        thumbnailInputRef.current.value =
          "";
      }
    } finally {
      setIsUploadingThumbnail(
        false,
      );
    }
  };

  /* =======================================================
     SELECT CATEGORY THUMBNAIL
  ======================================================= */

  const handleThumbnailFileChange =
    async (
      event:
        ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      setThumbnailUploadError("");

      if (!file) {
        return;
      }

      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type,
        )
      ) {
        setThumbnailUploadError(
          "Only JPG, JPEG, PNG and WEBP images are allowed.",
        );

        event.target.value = "";

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        setThumbnailUploadError(
          "The thumbnail size must not exceed 5 MB.",
        );

        event.target.value = "";

        return;
      }

      setSelectedThumbnailName(
        file.name,
      );

      await uploadThumbnail(file);
    };

  /* =======================================================
     REMOVE CATEGORY THUMBNAIL
  ======================================================= */

  const handleRemoveThumbnail =
    () => {
      if (
        isSubmitting ||
        isUploadingThumbnail
      ) {
        return;
      }

      setThumbnail("");
      setThumbnailLoadError(false);
      setThumbnailUploadError("");
      setSelectedThumbnailName("");

      if (
        thumbnailInputRef.current
      ) {
        thumbnailInputRef.current.value =
          "";
      }
    };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    const cleanName =
      name.trim();

    const cleanSlug =
      createSlug(slug);

    if (!cleanName) {
      return "Category name is required.";
    }

    if (!cleanSlug) {
      return "Category slug is required.";
    }

    if (
      categoryId &&
      parentCategoryId === categoryId
    ) {
      return "A category cannot be its own parent.";
    }

    if (
      ![1, 2, 3].includes(
        homepageSection,
      )
    ) {
      return "Please select a valid category showcase.";
    }

    return "";
  };

  /* =======================================================
     SUBMIT CATEGORY
  ======================================================= */

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      isUploadingThumbnail
    ) {
      setErrorMessage(
        "Please wait until the thumbnail upload is complete.",
      );

      setSuccessMessage("");

      return;
    }

    const validationMessage =
      validateForm();

    if (validationMessage) {
      setErrorMessage(
        validationMessage,
      );

      setSuccessMessage("");

      return;
    }

    if (
      mode === "edit" &&
      !categoryId
    ) {
      setErrorMessage(
        "Category ID is required for edit mode.",
      );

      setSuccessMessage("");

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const endpoint =
        mode === "edit"
          ? `${API_BASE_URL}/api/categories/${categoryId}`
          : `${API_BASE_URL}/api/categories`;

      const method =
        mode === "edit"
          ? "PUT"
          : "POST";

      const response = await tenantFetch(
        endpoint.replace(
          API_BASE_URL,
          "",
        ),
        {
          method,

          body: JSON.stringify({
            name:
              name.trim(),

            slug:
              createSlug(slug),

            parent:
              parentCategoryId || null,

            thumbnail:
              thumbnail.trim(),

            featured,

            homepageSection,
          }),
        },
      );

      const data:
        CategoryApiResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            `Category could not be ${
              mode === "edit"
                ? "updated"
                : "created"
            }.`,
        );
      }

      setSuccessMessage(
        data.message ||
          `Category ${
            mode === "edit"
              ? "updated"
              : "created"
          } successfully.`,
      );

      window.dispatchEvent(
        new Event(
          "categories-updated",
        ),
      );

      window.setTimeout(() => {
        router.push(
          "/admin/categories",
        );

        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "Category form submit error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the category.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isThumbnailBusy =
    isSubmitting ||
    isUploadingThumbnail;

  const cleanThumbnail =
    thumbnail.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 sm:space-y-6"
    >
      {/* ===================================================
          ERROR MESSAGE
      =================================================== */}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-600 sm:px-5"
        >
          <AlertCircle
            size={21}
            className="mt-0.5 shrink-0"
          />

          <div className="min-w-0">
            <p className="text-sm font-extrabold">
              Category could not be saved
            </p>

            <p className="mt-1 break-words text-sm leading-6">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================
          SUCCESS MESSAGE
      =================================================== */}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-700 sm:px-5"
        >
          <CheckCircle2
            size={21}
            className="mt-0.5 shrink-0"
          />

          <div className="min-w-0">
            <p className="text-sm font-extrabold">
              Success
            </p>

            <p className="mt-1 break-words text-sm leading-6">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ===================================================
          CATEGORY INFORMATION
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-5 flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <FolderPlus
              size={21}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Category Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Enter the category name,
              slug and thumbnail used
              across the storefront.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="categoryName"
              className="mb-2 block text-sm font-bold text-[#0B1F3A]"
            >
              Category Name

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="categoryName"
              type="text"
              value={name}
              onChange={(event) =>
                handleNameChange(
                  event.target.value,
                )
              }
              placeholder="Watches"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="categorySlug"
              className="mb-2 block text-sm font-bold text-[#0B1F3A]"
            >
              Category Slug

              <span className="text-red-500">
                {" "}
                *
              </span>
            </label>

            <input
              id="categorySlug"
              type="text"
              value={slug}
              onChange={(event) => {
                setSlugWasEdited(
                  true,
                );

                setSlug(
                  createSlug(
                    event.target.value,
                  ),
                );
              }}
              placeholder="watches"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-2 break-all text-xs leading-5 text-gray-400">
              Storefront URL:
              {" "}
              /category/
              {createSlug(slug) ||
                "category-slug"}
            </p>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <label
              htmlFor="parentCategory"
              className="mb-2 block text-sm font-bold text-[#0B1F3A]"
            >
              Parent Category
            </label>

            <select
              id="parentCategory"
              value={parentCategoryId}
              onChange={(event) =>
                setParentCategoryId(
                  event.target.value,
                )
              }
              disabled={
                isSubmitting ||
                isLoadingParentCategories
              }
              className="h-12 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">
                None / Main Category
              </option>

              {parentCategories.map(
                (category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              Choose None to create a main
              category. Select an existing
              main category to create this
              category as its subcategory.
            </p>

            {isLoadingParentCategories && (
              <p className="mt-2 text-xs font-semibold text-gray-500">
                Loading main categories...
              </p>
            )}

            {parentCategoryLoadError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {parentCategoryLoadError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          CATEGORY THUMBNAIL
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-5 flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <ImageIcon
              size={21}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Category Thumbnail
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Upload a category thumbnail
              from your computer or mobile
              device.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <div className="min-w-0">
            <p className="mb-2 block text-sm font-bold text-[#0B1F3A]">
              Thumbnail Image
            </p>

            <label
              htmlFor="categoryThumbnail"
              className={`
                flex min-h-[190px]
                flex-col items-center
                justify-center rounded-2xl
                border-2 border-dashed
                px-5 py-8 text-center
                transition
                ${
                  isThumbnailBusy
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-70"
                    : "cursor-pointer border-gray-300 bg-gray-50 hover:border-[#FF6900] hover:bg-orange-50/40"
                }
              `}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                {isUploadingThumbnail ? (
                  <LoaderCircle
                    size={23}
                    className="animate-spin"
                  />
                ) : (
                  <UploadCloud
                    size={23}
                  />
                )}
              </div>

              <p className="mt-3 text-sm font-extrabold text-[#0B1F3A]">
                {isUploadingThumbnail
                  ? "Uploading thumbnail..."
                  : cleanThumbnail
                    ? "Click to replace image"
                    : "Click to choose image"}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                JPG, JPEG, PNG or WEBP.
                Maximum file size 5 MB.
              </p>

              {selectedThumbnailName && (
                <p className="mt-3 max-w-full truncate rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
                  {selectedThumbnailName}
                </p>
              )}
            </label>

            <input
              ref={thumbnailInputRef}
              id="categoryThumbnail"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={isThumbnailBusy}
              onChange={
                handleThumbnailFileChange
              }
              className="sr-only"
            />

            {isUploadingThumbnail && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#FF6900]" />
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-500">
                  Uploading to Cloudinary.
                  Please wait.
                </p>
              </div>
            )}

            {thumbnailUploadError && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {thumbnailUploadError}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-2 text-sm font-bold text-[#0B1F3A]">
              Thumbnail Preview
            </p>

            <div className="relative flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50">
              {cleanThumbnail &&
              !thumbnailLoadError ? (
                <>
                  <img
                    src={cleanThumbnail}
                    alt={
                      name.trim()
                        ? `${name.trim()} category thumbnail`
                        : "Category thumbnail preview"
                    }
                    onLoad={() =>
                      setThumbnailLoadError(
                        false,
                      )
                    }
                    onError={() =>
                      setThumbnailLoadError(
                        true,
                      )
                    }
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={
                      handleRemoveThumbnail
                    }
                    disabled={
                      isThumbnailBusy
                    }
                    aria-label="Remove category thumbnail"
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2
                      size={17}
                    />
                  </button>
                </>
              ) : (
                <div className="px-4 text-center">
                  {isUploadingThumbnail ? (
                    <LoaderCircle
                      size={34}
                      className="mx-auto animate-spin text-[#FF6900]"
                    />
                  ) : (
                    <ImageIcon
                      size={34}
                      className="mx-auto text-gray-300"
                    />
                  )}

                  <p className="mt-3 text-xs font-semibold leading-5 text-gray-400">
                    {isUploadingThumbnail
                      ? "Uploading thumbnail..."
                      : thumbnailLoadError
                        ? "Thumbnail could not be loaded."
                        : "Thumbnail preview will appear here."}
                  </p>
                </div>
              )}
            </div>

            {cleanThumbnail &&
              !thumbnailLoadError && (
                <p className="mt-2 text-center text-xs font-semibold text-emerald-600">
                  Thumbnail uploaded
                  successfully
                </p>
              )}
          </div>
        </div>
      </section>

      {/* ===================================================
          CATEGORY SHOWCASE
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-5 flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <FolderPlus
              size={21}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Category Showcase
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Select the homepage category
              showcase where this category
              should appear.
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <label
            htmlFor="categoryHomepageSection"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Select Category Showcase

            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <select
            id="categoryHomepageSection"
            value={homepageSection}
            onChange={(event) =>
              setHomepageSection(
                Number(
                  event.target.value,
                ) as 1 | 2 | 3,
              )
            }
            disabled={isSubmitting}
            className="h-12 w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value={1}>
              Category Showcase - 1
            </option>

            <option value={2}>
              Category Showcase - 2
            </option>

            <option value={3}>
              Category Showcase - 3
            </option>
          </select>

          <p className="mt-2 text-xs leading-5 text-gray-400">
            The current category will
            appear only inside the
            selected category showcase
            when Featured Category is
            enabled.
          </p>
        </div>
      </section>

      {/* ===================================================
          FEATURED CATEGORY
      =================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
                <CheckCircle2
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-black text-[#0B1F3A]">
                  Featured Category
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Enable this category to
                  display it in the
                  selected category
                  showcase.
                </p>
              </div>
            </div>

            <div
              className={`
                mt-4 inline-flex
                rounded-full px-3
                py-1.5 text-xs
                font-extrabold
                ${
                  featured
                    ? "bg-orange-50 text-[#FF6900]"
                    : "bg-gray-100 text-gray-500"
                }
              `}
            >
              {featured
                ? "Shown on Homepage"
                : "Hidden from Homepage"}
            </div>
          </div>

          <label
            className={`
              inline-flex shrink-0
              items-center gap-3
              ${
                isSubmitting
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }
            `}
          >
            <span className="text-sm font-extrabold text-[#0B1F3A]">
              {featured
                ? "Featured On"
                : "Featured Off"}
            </span>

            <input
              type="checkbox"
              checked={featured}
              onChange={(event) =>
                setFeatured(
                  event.target.checked,
                )
              }
              disabled={isSubmitting}
              className="peer sr-only"
            />

            <span className="relative h-7 w-12 rounded-full bg-gray-300 transition-colors duration-200 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:bg-[#FF6900] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6900]/30 peer-focus-visible:ring-offset-2" />
          </label>
        </div>
      </section>

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <section className="flex flex-col-reverse gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/admin/categories"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] sm:w-auto"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            isUploadingThumbnail
          }
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-7 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                size={19}
                className="animate-spin"
              />

              {mode === "edit"
                ? "Updating Category..."
                : "Creating Category..."}
            </>
          ) : (
            <>
              <Save
                size={19}
              />

              {mode === "edit"
                ? "Update Category"
                : "Save Category"}
            </>
          )}
        </button>
      </section>
    </form>
  );
}