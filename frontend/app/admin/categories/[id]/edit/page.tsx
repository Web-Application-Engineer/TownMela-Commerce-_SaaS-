"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  FolderPen,
  LoaderCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import CategoryForm from "@/src/components/Admin/Categories/CategoryForm";

import type {
  CategoryFormInitialData,
} from "@/src/components/Admin/Categories/CategoryForm";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type CategoryApiResponse = {
  success?: boolean;
  message?: string;
  category?: CategoryFormInitialData;
};

/* =========================================================
   EDIT CATEGORY PAGE
========================================================= */

export default function EditCategoryPage() {
  const params = useParams<{
    id: string;
  }>();

  const categoryId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [
    category,
    setCategory,
  ] =
    useState<CategoryFormInitialData | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     LOAD CATEGORY
  ======================================================= */

  const loadCategory =
    useCallback(async () => {
      if (!categoryId) {
        setErrorMessage(
          "Invalid category ID.",
        );

        setIsLoading(false);

        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_BASE_URL}/api/categories/${categoryId}`,
          {
            method: "GET",
            cache: "no-store",

            headers: {
              Accept:
                "application/json",
            },
          },
        );

        const data:
          CategoryApiResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.category
        ) {
          throw new Error(
            data.message ||
              "Category could not be loaded.",
          );
        }

        setCategory(
          data.category,
        );
      } catch (error) {
        console.error(
          "Edit category loading error:",
          error,
        );

        setCategory(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the category.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [categoryId]);

  useEffect(() => {
    void loadCategory();
  }, [loadCategory]);

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (isLoading) {
    return (
      <div
        className="
          mx-auto
          flex
          min-h-[420px]
          w-full
          max-w-[1450px]
          flex-col
          items-center
          justify-center
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-6
          text-center
          shadow-sm
          sm:p-8
        "
      >
        <LoaderCircle
          size={42}
          className="animate-spin text-[#FF6900]"
        />

        <h1 className="mt-5 text-xl font-black text-[#0B1F3A]">
          Loading Category
        </h1>

        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
          Please wait while the category
          information is being loaded.
        </p>
      </div>
    );
  }

  /* =======================================================
     ERROR UI
  ======================================================= */

  if (
    errorMessage ||
    !category
  ) {
    return (
      <div className="mx-auto w-full max-w-[1450px]">
        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-white
            p-6
            text-center
            shadow-sm
            sm:p-8
          "
        >
          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              bg-red-50
              text-red-600
            "
          >
            <AlertCircle size={30} />
          </div>

          <h1 className="mt-5 text-xl font-black text-[#0B1F3A]">
            Category Could Not Be Loaded
          </h1>

          <p className="mx-auto mt-3 max-w-lg break-words text-sm leading-6 text-red-600">
            {errorMessage ||
              "The requested category was not found."}
          </p>

          <div
            className="
              mt-6
              flex
              flex-col
              items-center
              justify-center
              gap-3
              sm:flex-row
            "
          >
            <button
              type="button"
              onClick={() =>
                void loadCategory()
              }
              className="
                inline-flex
                h-12
                w-full
                items-center
                justify-center
                rounded-xl
                bg-[#FF6900]
                px-6
                text-sm
                font-extrabold
                text-white
                transition
                hover:bg-[#E85F00]
                sm:w-auto
              "
            >
              Try Again
            </button>

            <Link
              href="/admin/categories"
              className="
                inline-flex
                h-12
                w-full
                items-center
                justify-center
                rounded-xl
                border
                border-gray-300
                bg-white
                px-6
                text-sm
                font-extrabold
                text-[#0B1F3A]
                transition
                hover:border-[#FF6900]
                hover:text-[#FF6900]
                sm:w-auto
              "
            >
              Back to Categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      <div className="mb-6 sm:mb-7">
        <Link
          href="/admin/categories"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-extrabold
            text-gray-500
            transition
            hover:text-[#FF6900]
          "
        >
          <ArrowLeft
            size={17}
            className="shrink-0"
          />

          Back to Categories
        </Link>

        <div className="mt-4 flex items-start gap-3 sm:items-center">
          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-orange-50
              text-[#FF6900]
              sm:h-12
              sm:w-12
            "
          >
            <FolderPen size={24} />
          </div>

          <div className="min-w-0">
            <span
              className="
                inline-flex
                max-w-full
                rounded-full
                border
                border-orange-200
                bg-orange-50
                px-3
                py-1
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-[#FF6900]
                sm:text-[11px]
                sm:tracking-[0.14em]
              "
            >
              Category Management
            </span>

            <h1
              className="
                mt-2
                break-words
                text-2xl
                font-black
                text-[#0B1F3A]
                sm:text-3xl
              "
            >
              Edit Category
            </h1>
          </div>
        </div>

        <p
          className="
            mt-3
            max-w-2xl
            text-sm
            leading-6
            text-gray-500
            sm:text-[15px]
          "
        >
          Update the category name and slug
          used across product pages,
          navigation and storefront filters.
        </p>
      </div>

      <CategoryForm
        key={categoryId}
        mode="edit"
        categoryId={categoryId}
        initialData={category}
      />
    </div>
  );
}