"use client";

import {
  Fragment,
  useState,
} from "react";

import {
  Check,
  ImageIcon,
  Layers3,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import type {
  PopularCategoryItem,
} from "../types/homepage";

/* =========================================================
   HOMEPAGE SYNC

   Call this helper after a successful Add operation from the
   parent component. Update and Delete already call it here.
========================================================= */

export const POPULAR_CATEGORIES_UPDATED_EVENT =
  "homepage:popular-categories-updated";

const POPULAR_CATEGORIES_STORAGE_KEY =
  "townmela:popular-categories-updated";

const POPULAR_CATEGORIES_CHANNEL =
  "townmela-homepage-management";

export function notifyPopularCategoriesUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  /* Same browser tab */

  window.dispatchEvent(
    new CustomEvent(
      POPULAR_CATEGORIES_UPDATED_EVENT,
      {
        detail: {
          updatedAt: Date.now(),
        },
      },
    ),
  );

  /* Other browser tabs */

  try {
    window.localStorage.setItem(
      POPULAR_CATEGORIES_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    // Storage may be unavailable in private/restricted mode.
  }

  /* Modern cross-tab communication */

  if ("BroadcastChannel" in window) {
    const channel =
      new BroadcastChannel(
        POPULAR_CATEGORIES_CHANNEL,
      );

    channel.postMessage({
      type:
        POPULAR_CATEGORIES_UPDATED_EVENT,
      updatedAt: Date.now(),
    });

    channel.close();
  }
}

/* =========================================================
   TYPES
========================================================= */

type ActiveCategory = {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  featured: boolean;
  homepageSection: number;
  displayOrder: number;
  status: boolean;
};

/* =========================================================
   PROPS
========================================================= */

type PopularCategoryManagementProps = {
  popularCategories:
    PopularCategoryItem[];

  activeCategories:
    ActiveCategory[];

  onAddPopularCategory: () => void;

  onUpdatePopularCategory: (
    updatedCategory:
      PopularCategoryItem,
  ) => void | Promise<void>;

  onDeletePopularCategory: (
    categoryId:
      PopularCategoryItem["id"],
  ) => void | Promise<void>;
};

/* =========================================================
   POPULAR CATEGORY MANAGEMENT
========================================================= */

export default function PopularCategoryManagement({
  popularCategories,
  activeCategories,
  onAddPopularCategory,
  onUpdatePopularCategory,
  onDeletePopularCategory,
}: PopularCategoryManagementProps) {
  /* =======================================================
     EDITING STATE
  ======================================================= */

  const [
    editingCategory,
    setEditingCategory,
  ] =
    useState<PopularCategoryItem | null>(
      null,
    );

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    deletingCategoryId,
    setDeletingCategoryId,
  ] = useState<
    PopularCategoryItem["id"] | null
  >(null);

  /* =======================================================
     CATEGORY HELPERS
  ======================================================= */

  const getSelectedCategoryId = (
    category:
      PopularCategoryItem,
  ) => {
    if (category.categoryId) {
      return category.categoryId;
    }

    const matchingCategory =
      activeCategories.find(
        (activeCategory) =>
          activeCategory.name
            .trim()
            .toLowerCase() ===
          category.categoryName
            .trim()
            .toLowerCase(),
      );

    return matchingCategory?._id ?? "";
  };

  const handleCategorySelection = (
    categoryId: string,
  ) => {
    const selectedCategory =
      activeCategories.find(
        (category) =>
          category._id === categoryId,
      );

    setEditingCategory(
      (currentCategory) => {
        if (!currentCategory) {
          return currentCategory;
        }

        return {
          ...currentCategory,

          categoryId:
            selectedCategory?._id ?? "",

          categoryName:
            selectedCategory?.name ??
            "Select Category",

          displayName:
            selectedCategory?.name ??
            "",

          thumbnail:
            selectedCategory?.thumbnail ?? "",
        };
      },
    );
  };

  /* =======================================================
     START EDIT
  ======================================================= */

  const handleStartEdit = (
    category:
      PopularCategoryItem,
  ) => {
    setEditingCategory({
      ...category,

      categoryId:
        getSelectedCategoryId(
          category,
        ),
    });
  };

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  /* =======================================================
     CHANGE EDIT FIELD
  ======================================================= */

  const handleEditFieldChange = <
    Key extends keyof PopularCategoryItem,
  >(
    field: Key,
    value:
      PopularCategoryItem[Key],
  ) => {
    setEditingCategory(
      (currentCategory) => {
        if (!currentCategory) {
          return currentCategory;
        }

        return {
          ...currentCategory,
          [field]: value,
        };
      },
    );
  };

  /* =======================================================
     SAVE UPDATED CATEGORY
  ======================================================= */

  const handleSaveEdit =
    async () => {
      if (
        !editingCategory ||
        isSaving
      ) {
        return;
      }

      const selectedCategoryId =
        getSelectedCategoryId(
          editingCategory,
        );

      const selectedCategory =
        activeCategories.find(
          (category) =>
            category._id ===
            selectedCategoryId,
        );

      if (!selectedCategory) {
        window.alert(
          "Please select an active category.",
        );

        return;
      }

      const updatedCategory:
        PopularCategoryItem = {
          ...editingCategory,

          displayName:
            selectedCategory.name,

          categoryId:
            selectedCategory._id,

          categoryName:
            selectedCategory.name,

          thumbnail:
            selectedCategory.thumbnail?.trim() ??
            "",

          order:
            Math.max(
              1,
              Number(
                editingCategory.order,
              ) || 1,
            ),
        };

      try {
        setIsSaving(true);

        await onUpdatePopularCategory(
          updatedCategory,
        );

        notifyPopularCategoriesUpdated();

        setEditingCategory(null);
      } catch (error) {
        console.error(
          "Popular category update failed:",
          error,
        );

        window.alert(
          error instanceof Error
            ? error.message
            : "Popular category update failed.",
        );
      } finally {
        setIsSaving(false);
      }
    };

  /* =======================================================
     DELETE CATEGORY
  ======================================================= */

  const handleDeleteCategory =
    async (
      category:
        PopularCategoryItem,
    ) => {
      if (
        deletingCategoryId !== null
      ) {
        return;
      }

      const shouldDelete =
        window.confirm(
          `Are you sure you want to delete "${category.categoryName}"?`,
        );

      if (!shouldDelete) {
        return;
      }

      try {
        setDeletingCategoryId(
          category.id,
        );

        await onDeletePopularCategory(
          category.id,
        );

        notifyPopularCategoriesUpdated();

        if (
          editingCategory?.id ===
          category.id
        ) {
          setEditingCategory(null);
        }
      } catch (error) {
        console.error(
          "Popular category delete failed:",
          error,
        );

        window.alert(
          error instanceof Error
            ? error.message
            : "Popular category delete failed.",
        );
      } finally {
        setDeletingCategoryId(null);
      }
    };

  /* =======================================================
     COMPONENT UI
  ======================================================= */

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ===================================================
          SECTION HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <Layers3
              size={22}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#0B1F3A]">
              Popular Moving Category
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
              Manage the categories
              displayed inside the
              homepage popular category
              section.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
            {popularCategories.length}
            {" "}
            {popularCategories.length ===
            1
              ? "Category"
              : "Categories"}
          </span>

          <button
            type="button"
            onClick={
              onAddPopularCategory
            }
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#132f52] sm:w-auto"
          >
            <Plus
              size={16}
              aria-hidden="true"
            />

            Add Popular Category
          </button>
        </div>
      </div>

      {/* ===================================================
          CATEGORY TABLE
      =================================================== */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Category
              </th>

              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Thumbnail
              </th>

              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Order
              </th>

              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                Edit
              </th>

              <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                Delete
              </th>
            </tr>
          </thead>

          <tbody>
            {popularCategories.length >
            0 ? (
              popularCategories.map(
                (item) => {
                  const isEditing =
                    editingCategory?.id ===
                    item.id;

                  return (
                    <Fragment
                      key={`popular-category-${item.id}`}
                    >
                      {/* ===================================
                          CATEGORY INFORMATION ROW
                      =================================== */}

                      <tr className="border-t border-gray-100 transition-colors hover:bg-orange-50/30">
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            item.categoryName
                          }
                        </td>

                        <td className="px-5 py-4">
                          {item.thumbnail ? (
                            <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                              <img
                                src={
                                  item.thumbnail
                                }
                                alt={
                                  item.categoryName
                                }
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-300">
                              <ImageIcon
                                size={19}
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-orange-50 px-2 text-xs font-black text-[#FF6900]">
                            {item.order}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              item.active
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleStartEdit(
                                item,
                              )
                            }
                            aria-label={`Edit ${item.categoryName}`}
                            className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
                          >
                            <Pencil
                              size={14}
                              aria-hidden="true"
                            />

                            <span className="hidden xl:inline">
                              Edit
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteCategory(
                                item,
                              );
                            }}
                            disabled={
                              deletingCategoryId ===
                              item.id
                            }
                            aria-label={`Delete ${item.categoryName}`}
                            className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2
                              size={14}
                              aria-hidden="true"
                            />

                            <span className="hidden xl:inline">
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* ===================================
                          INLINE EDIT FORM ROW
                      =================================== */}

                      {isEditing &&
                        editingCategory && (
                          <tr className="border-t border-orange-100 bg-orange-50/30">
                            <td
                              colSpan={6}
                              className="px-5 py-5"
                            >
                              <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="text-sm font-black text-[#0B1F3A]">
                                      Edit Popular
                                      Category
                                    </h3>

                                    <p className="mt-1 text-xs text-gray-500">
                                      Update category,
                                      thumbnail and
                                      display settings.
                                    </p>
                                  </div>

                                  <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-[#FF6900]">
                                    Editing
                                  </span>
                                </div>

                                {/* =================================
                                    BASIC INFORMATION
                                ================================= */}

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                  {/* CATEGORY NAME */}

                                  <div>
                                    <label className="mb-1.5 block text-xs font-bold text-[#0B1F3A]">
                                      Category
                                    </label>

                                    <select
                                      value={
                                        getSelectedCategoryId(
                                          editingCategory,
                                        )
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleCategorySelection(
                                          event.target.value,
                                        )
                                      }
                                      className="min-h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100"
                                    >
                                      <option value="">
                                        Select Category
                                      </option>

                                      {activeCategories.map(
                                        (category) => (
                                          <option
                                            key={
                                              category._id
                                            }
                                            value={
                                              category._id
                                            }
                                          >
                                            {
                                              category.name
                                            }
                                          </option>
                                        ),
                                      )}
                                    </select>

                                    {activeCategories.length ===
                                      0 && (
                                      <p className="mt-1.5 text-[11px] font-medium text-red-500">
                                        No active categories
                                        are available.
                                      </p>
                                    )}
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
                                        editingCategory.order
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleEditFieldChange(
                                          "order",
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ),
                                        )
                                      }
                                      className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100"
                                    />
                                  </div>
                                </div>

                                {/* =================================
                                    AUTOMATIC CATEGORY THUMBNAIL
                                ================================= */}

                                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                                  <label className="mb-2 block text-xs font-bold text-[#0B1F3A]">
                                    Category Thumbnail
                                  </label>

                                  <div className="flex min-h-24 items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
                                    {editingCategory.thumbnail ? (
                                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                        <img
                                          src={
                                            editingCategory.thumbnail
                                          }
                                          alt={
                                            editingCategory.categoryName ===
                                            "Select Category"
                                              ? "Category thumbnail"
                                              : `${editingCategory.categoryName} thumbnail`
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-300">
                                        <ImageIcon
                                          size={22}
                                          aria-hidden="true"
                                        />
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#0B1F3A]">
                                        {editingCategory.categoryName ===
                                          "Select Category" ||
                                        !editingCategory.categoryName
                                          ? "Select a category"
                                          : editingCategory.categoryName}
                                      </p>

                                      <p className="mt-1 text-[11px] leading-5 text-gray-400">
                                        Thumbnail is filled
                                        automatically from the
                                        selected active category.
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* =================================
                                    ACTIVE STATUS
                                ================================= */}

                                <div className="mt-4">
                                  <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                                    <div>
                                      <p className="text-xs font-bold text-[#0B1F3A]">
                                        Category
                                        Status
                                      </p>

                                      <p className="mt-0.5 text-[11px] text-gray-400">
                                        Enable or
                                        disable this
                                        popular
                                        category.
                                      </p>
                                    </div>

                                    <input
                                      type="checkbox"
                                      checked={
                                        editingCategory.active
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleEditFieldChange(
                                          "active",
                                          event
                                            .target
                                            .checked,
                                        )
                                      }
                                      className="h-4 w-4 cursor-pointer accent-[#FF6900]"
                                    />
                                  </label>
                                </div>

                                {/* =================================
                                    FORM ACTIONS
                                ================================= */}

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                  <button
                                    type="button"
                                    onClick={
                                      handleCancelEdit
                                    }
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                  >
                                    <X
                                      size={15}
                                      aria-hidden="true"
                                    />

                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSaveEdit();
                                    }}
                                    disabled={
                                      isSaving
                                    }
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6900] px-4 text-xs font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Check
                                      size={15}
                                      aria-hidden="true"
                                    />

                                    {isSaving
                                      ? "Updating..."
                                      : "Update Category"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </Fragment>
                  );
                },
              )
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center"
                >
                  <Layers3
                    size={28}
                    className="mx-auto text-gray-300"
                    aria-hidden="true"
                  />

                  <p className="mt-3 text-sm font-bold text-gray-500">
                    No popular
                    categories added yet
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Use the add button
                    to create the first
                    popular category.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}