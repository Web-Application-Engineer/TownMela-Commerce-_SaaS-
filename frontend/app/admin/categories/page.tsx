"use client";

import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  FolderTree,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

import DeleteCategoryModal from "@/src/components/Admin/Categories/DeleteCategoryModal";

/* =========================================================
   TYPES
========================================================= */

type Category = {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  featured?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

type CategoriesApiResponse =
  | Category[]
  | {
      success?: boolean;
      categories?: Category[];
      message?: string;
    };

type DeleteCategoryResponse = {
  success?: boolean;
  message?: string;
};

/* =========================================================
   ADMIN CATEGORIES PAGE
========================================================= */

export default function AdminCategoriesPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<Category | null>(
    null,
  );

  const [
    isDeleteModalOpen,
    setIsDeleteModalOpen,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response =
          await tenantFetch(
            "/api/categories",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data:
          CategoriesApiResponse =
          await response.json();

        if (!response.ok) {
          const apiMessage =
            Array.isArray(data)
              ? undefined
              : data.message;

          throw new Error(
            apiMessage ||
              "Categories could not be loaded.",
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

        setCategories(categoryList);
      } catch (error) {
        console.error(
          "Admin categories loading error:",
          error,
        );

        setCategories([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading categories.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [selectedTenantId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const handleCategoriesUpdated =
      () => {
        void loadCategories();
      };

    window.addEventListener(
      "categories-updated",
      handleCategoriesUpdated,
    );

    return () => {
      window.removeEventListener(
        "categories-updated",
        handleCategoriesUpdated,
      );
    };
  }, [loadCategories]);

  /* =======================================================
     DELETE MODAL
  ======================================================= */

  const openDeleteModal = (
    category: Category,
  ) => {
    setSelectedCategory(
      category,
    );

    setIsDeleteModalOpen(true);

    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalOpen(false);
    setSelectedCategory(null);
  };

  /* =======================================================
     DELETE CATEGORY
  ======================================================= */

  const handleDeleteCategory =
    async () => {
      if (
        !selectedCategory?._id ||
        isDeleting
      ) {
        return;
      }

      try {
        setIsDeleting(true);
        setErrorMessage("");
        setSuccessMessage("");


        const response =
          await tenantFetch(
            `/api/categories/${selectedCategory._id}`,
            {
              method: "DELETE",
            },
          );

        const data:
          DeleteCategoryResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Category could not be deleted.",
          );
        }

        const deletedCategoryName =
          selectedCategory.name;

        setCategories((current) =>
          current.filter(
            (category) =>
              category._id !==
              selectedCategory._id,
          ),
        );

        setIsDeleteModalOpen(false);
        setSelectedCategory(null);

        setSuccessMessage(
          data.message ||
            `${deletedCategoryName} deleted successfully.`,
        );

        window.dispatchEvent(
          new Event(
            "categories-updated",
          ),
        );

        await loadCategories();
      } catch (error) {
        console.error(
          "Delete category error:",
          error,
        );

        setIsDeleteModalOpen(false);
        setSelectedCategory(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while deleting the category.",
        );
      } finally {
        setIsDeleting(false);
      }
    };

  /* =======================================================
     FILTERED CATEGORIES
  ======================================================= */

  const filteredCategories =
    useMemo(() => {
      const keyword =
        searchKeyword
          .trim()
          .toLowerCase();

      if (!keyword) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(keyword) ||
          category.slug
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      categories,
      searchKeyword,
    ]);

  return (
    <>
      <div className="mx-auto w-full max-w-[1450px]">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div
          className="
            mb-6
            flex
            flex-col
            gap-4
            sm:mb-7
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
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
                py-1.5
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-[#FF6900]
                sm:text-xs
                sm:tracking-[0.14em]
              "
            >
              Category Management
            </span>

            <h1
              className="
                mt-3
                break-words
                text-2xl
                font-black
                text-[#0B1F3A]
                sm:text-3xl
              "
            >
              Categories
            </h1>

            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-gray-500
                sm:text-[15px]
              "
            >
              Create, organize and manage
              product categories used across
              the TownMela storefront.
            </p>
          </div>

          <Link
            href="/admin/categories/new"
            className="
              inline-flex
              h-12
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#FF6900]
              px-5
              text-sm
              font-extrabold
              text-white
              transition
              hover:bg-[#E85F00]
              sm:w-fit
            "
          >
            <Plus size={18} />

            Add New Category
          </Link>
        </div>

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {successMessage && (
          <div
            role="status"
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-4
              text-emerald-700
              sm:px-5
            "
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

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {errorMessage && (
          <div
            role="alert"
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-4
              text-red-600
              sm:px-5
            "
          >
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p className="text-sm font-extrabold">
                Operation failed
              </p>

              <p className="mt-1 break-words text-sm leading-6">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <article
            className="
              rounded-2xl
              border
              border-gray-200
              bg-white
              p-4
              shadow-sm
              sm:p-5
            "
          >
            <p className="text-sm font-bold text-gray-500">
              Total Categories
            </p>

            <p className="mt-3 text-2xl font-black text-[#0B1F3A]">
              {categories.length}
            </p>
          </article>

          <article
            className="
              rounded-2xl
              border
              border-gray-200
              bg-white
              p-4
              shadow-sm
              sm:p-5
            "
          >
            <p className="text-sm font-bold text-gray-500">
              Search Results
            </p>

            <p className="mt-3 text-2xl font-black text-[#FF6900]">
              {
                filteredCategories.length
              }
            </p>
          </article>
        </section>

        {/* =================================================
            SEARCH AND REFRESH
        ================================================= */}

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            sm:p-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              lg:flex-row
              lg:items-center
            "
          >
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="search"
                value={searchKeyword}
                onChange={(event) =>
                  setSearchKeyword(
                    event.target.value,
                  )
                }
                placeholder="Search by category name or slug"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  pl-11
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
                "
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void loadCategories()
              }
              disabled={
                isLoading ||
                isDeleting
              }
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-gray-300
                bg-white
                px-5
                text-sm
                font-extrabold
                text-[#0B1F3A]
                transition
                hover:border-[#FF6900]
                hover:text-[#FF6900]
                disabled:cursor-not-allowed
                disabled:opacity-60
                lg:w-auto
              "
            >
              <RefreshCcw
                size={17}
                className={
                  isLoading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </section>

        {/* =================================================
            CATEGORY TABLE
        ================================================= */}

        <section
          className="
            mt-6
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              border-b
              border-gray-200
              px-4
              py-5
              sm:px-6
            "
          >
            <h2 className="text-lg font-black text-[#0B1F3A]">
              Category List
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Showing{" "}
              <span className="font-bold text-[#0B1F3A]">
                {
                  filteredCategories.length
                }
              </span>{" "}
              of{" "}
              <span className="font-bold text-[#0B1F3A]">
                {categories.length}
              </span>{" "}
              categories.
            </p>
          </div>

          {isLoading ? (
            <div
              className="
                flex
                min-h-[340px]
                flex-col
                items-center
                justify-center
                px-4
                py-12
                text-center
                sm:px-5
              "
            >
              <LoaderCircle
                size={38}
                className="animate-spin text-[#FF6900]"
              />

              <p className="mt-4 text-sm font-bold text-gray-500">
                Loading categories...
              </p>
            </div>
          ) : filteredCategories.length >
            0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-gray-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-gray-500">
                      Slug
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-extrabold uppercase tracking-wide text-gray-500">
                      Order
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-gray-500">
                      Created
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-extrabold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCategories.map(
                    (category) => (
                      <tr
                        key={category._id}
                        className="
                          border-b
                          border-gray-100
                          transition
                          hover:bg-gray-50/70
                          last:border-b-0
                        "
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
<div
  className="
    flex
    h-12
    w-12
    shrink-0
    items-center
    justify-center
    overflow-hidden
    rounded-xl
    border
    border-gray-200
    bg-orange-50
    text-[#FF6900]
  "
>
  {category.thumbnail ? (
    <img
      src={category.thumbnail}
      alt={`${category.name} thumbnail`}
      className="
        h-full
        w-full
        object-cover
      "
      onError={(event) => {
        event.currentTarget.style.display =
          "none";

        const fallback =
          event.currentTarget
            .nextElementSibling;

        if (
          fallback instanceof HTMLElement
        ) {
          fallback.style.display =
            "flex";
        }
      }}
    />
  ) : null}

  <div
    className={`
      h-full
      w-full
      items-center
      justify-center
      ${
        category.thumbnail
          ? "hidden"
          : "flex"
      }
    `}
  >
    <FolderTree
      size={21}
    />
  </div>
</div>

                            <p className="max-w-[260px] truncate font-extrabold text-[#0B1F3A]">
                              {category.name}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className="
                              inline-flex
                              max-w-[240px]
                              truncate
                              rounded-full
                              bg-gray-100
                              px-3
                              py-1.5
                              text-xs
                              font-bold
                              text-gray-600
                            "
                          >
                            {category.slug}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex min-w-[42px] items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-blue-700">
                            {category.displayOrder ?? 0}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-500">
                          {category.createdAt
                            ? new Date(
                                category.createdAt,
                              ).toLocaleDateString(
                                "en-BD",
                                {
                                  year:
                                    "numeric",
                                  month:
                                    "short",
                                  day:
                                    "numeric",
                                },
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/admin/categories/${category._id}/edit`}
                              className="
                                rounded-lg
                                border
                                border-gray-200
                                px-3
                                py-2
                                text-xs
                                font-extrabold
                                text-[#0B1F3A]
                                transition
                                hover:border-[#FF6900]
                                hover:text-[#FF6900]
                              "
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteModal(
                                  category,
                                )
                              }
                              disabled={
                                isDeleting
                              }
                              className="
                                rounded-lg
                                border
                                border-red-200
                                px-3
                                py-2
                                text-xs
                                font-extrabold
                                text-red-600
                                transition
                                hover:bg-red-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[340px]
                flex-col
                items-center
                justify-center
                px-4
                py-12
                text-center
                sm:px-5
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-orange-50
                  text-[#FF6900]
                "
              >
                <FolderTree
                  size={29}
                />
              </div>

              <h3 className="mt-5 text-xl font-black text-[#0B1F3A]">
                No Categories Found
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                No categories matched your
                current search.
              </p>

              <Link
                href="/admin/categories/new"
                className="
                  mt-5
                  inline-flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#FF6900]
                  px-5
                  text-sm
                  font-extrabold
                  text-white
                  transition
                  hover:bg-[#E85F00]
                  sm:w-fit
                "
              >
                <Plus size={18} />

                Add New Category
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ===================================================
          DELETE CATEGORY MODAL
      =================================================== */}

      <DeleteCategoryModal
        open={isDeleteModalOpen}
        categoryName={
          selectedCategory?.name ?? ""
        }
        loading={isDeleting}
        onClose={closeDeleteModal}
        onDelete={() =>
          void handleDeleteCategory()
        }
      />
    </>
  );
}