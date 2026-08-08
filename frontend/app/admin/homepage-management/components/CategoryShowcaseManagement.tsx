"use client";

import { Fragment, useState } from "react";

import {
  Check,
  Grid3X3,
  ImageIcon,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";

import type {
  CategoryShowcase,
  CategoryShowcasePosition,
} from "../types/homepage";

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

type CategoryShowcaseManagementProps = {
  categoryShowcases: CategoryShowcase[];
  activeCategories: ActiveCategory[];
  isSaving?: boolean;
  errorMessage?: string;
  onUpdateCategoryShowcase: (
    updatedShowcase: CategoryShowcase,
  ) => void | Promise<void>;
};

/* =========================================================
   CATEGORY SHOWCASE MANAGEMENT
========================================================= */

export default function CategoryShowcaseManagement({
  categoryShowcases,
  activeCategories,
  isSaving = false,
  errorMessage = "",
  onUpdateCategoryShowcase,
}: CategoryShowcaseManagementProps) {
  const [editingPosition, setEditingPosition] = useState<{
    showcaseId: CategoryShowcase["id"];
    position: CategoryShowcasePosition;
  } | null>(null);

  const [editingTitle, setEditingTitle] = useState<{
    showcaseId: CategoryShowcase["id"];
    value: string;
  } | null>(null);

  /* =======================================================
     HELPERS
  ======================================================= */

  const findShowcase = (showcaseId: CategoryShowcase["id"]) =>
    categoryShowcases.find((showcase) => showcase.id === showcaseId);

  const handleCategorySelection = (categoryId: string) => {
    const selectedCategory = activeCategories.find(
      (category) => category._id === categoryId,
    );

    setEditingPosition((currentPosition) => {
      if (!currentPosition) {
        return currentPosition;
      }

      return {
        ...currentPosition,
        position: {
          ...currentPosition.position,
          categoryId: selectedCategory?._id ?? "",
          categoryName: selectedCategory?.name ?? "Select Category",
          categorySlug: selectedCategory?.slug ?? "",
          thumbnail: selectedCategory?.thumbnail ?? "",
        },
      };
    });
  };

  const handleStartPositionEdit = (
    showcaseId: CategoryShowcase["id"],
    position: CategoryShowcasePosition,
  ) => {
    setEditingPosition({
      showcaseId,
      position: { ...position },
    });
  };

  const handleCancelPositionEdit = () => {
    setEditingPosition(null);
  };

  const handlePositionStatusChange = (active: boolean) => {
    setEditingPosition((currentPosition) => {
      if (!currentPosition) {
        return currentPosition;
      }

      return {
        ...currentPosition,
        position: {
          ...currentPosition.position,
          active,
        },
      };
    });
  };

  const handleStartTitleEdit = (showcase: CategoryShowcase) => {
    setEditingTitle({
      showcaseId: showcase.id,
      value: showcase.sectionTitle,
    });
  };

  const handleCancelTitleEdit = () => {
    setEditingTitle(null);
  };

  /* =======================================================
     SAVE TITLE
  ======================================================= */

  const handleSaveTitle = async () => {
    if (!editingTitle || isSaving) {
      return;
    }

    const showcase = findShowcase(editingTitle.showcaseId);

    if (!showcase) {
      return;
    }

    const cleanTitle = editingTitle.value.trim();

    if (!cleanTitle) {
      window.alert("Showcase title is required.");
      return;
    }

    if (cleanTitle.length > 120) {
      window.alert("Showcase title cannot exceed 120 characters.");
      return;
    }

    await onUpdateCategoryShowcase({
      ...showcase,
      sectionTitle: cleanTitle,
    });

    setEditingTitle(null);
  };

  /* =======================================================
     SAVE POSITION
  ======================================================= */

  const handleSavePosition = async () => {
    if (!editingPosition || isSaving) {
      return;
    }

    const showcase = findShowcase(editingPosition.showcaseId);

    if (!showcase) {
      return;
    }

    const selectedCategory = activeCategories.find(
      (category) => category._id === editingPosition.position.categoryId,
    );

    if (editingPosition.position.active && !selectedCategory) {
      window.alert("Please select an active category.");
      return;
    }

    const updatedPosition: CategoryShowcasePosition = {
      ...editingPosition.position,
      categoryId: selectedCategory?._id ?? "",
      categoryName: selectedCategory?.name ?? "No category selected",
      categorySlug: selectedCategory?.slug ?? "",
      thumbnail: selectedCategory?.thumbnail?.trim() ?? "",
      active: Boolean(selectedCategory) && editingPosition.position.active,
    };

    const updatedShowcase: CategoryShowcase = {
      ...showcase,
      positions: showcase.positions.map((position) =>
        position.position === updatedPosition.position
          ? updatedPosition
          : position,
      ),
    };

    await onUpdateCategoryShowcase(updatedShowcase);
    setEditingPosition(null);
  };

  /* =======================================================
     DELETE/CLEAR POSITION
  ======================================================= */

  const handleClearPosition = async (
    showcase: CategoryShowcase,
    position: CategoryShowcasePosition,
  ) => {
    const shouldDelete = window.confirm(
      `Clear position ${position.position} from "${showcase.sectionTitle}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    const clearedPosition: CategoryShowcasePosition = {
      ...position,
      categoryId: "",
      categoryName: "No category selected",
      categorySlug: "",
      thumbnail: "",
      active: false,
    };

    await onUpdateCategoryShowcase({
      ...showcase,
      positions: showcase.positions.map((currentPosition) =>
        currentPosition.position === clearedPosition.position
          ? clearedPosition
          : currentPosition,
      ),
    });

    if (
      editingPosition?.showcaseId === showcase.id &&
      editingPosition.position.position === position.position
    ) {
      setEditingPosition(null);
    }
  };

  /* =======================================================
     COMPONENT UI
  ======================================================= */

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
            <Grid3X3 size={22} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#0B1F3A]">
              Category Placement Management
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
              Manage each homepage showcase title and its three fixed category
              positions.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#FF6900]">
          3 Showcases
        </span>
      </div>

      {errorMessage && (
        <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 sm:mx-6">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
        {categoryShowcases.map((showcase) => {
          const isEditingThisTitle = editingTitle?.showcaseId === showcase.id;

          return (
            <article
              key={showcase.key}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70"
            >
              <div className="border-b border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#FF6900]">
                    Showcase #{showcase.order}
                  </span>

                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                    Dynamic
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black text-[#0B1F3A]">
                  {showcase.title}
                </h3>

                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  {showcase.description}
                </p>

                <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs font-black text-[#0B1F3A]">
                        Homepage Section Title
                      </label>

                      {isEditingThisTitle && editingTitle ? (
                        <input
                          type="text"
                          value={editingTitle.value}
                          onChange={(event) =>
                            setEditingTitle((currentTitle) =>
                              currentTitle
                                ? {
                                    ...currentTitle,
                                    value: event.target.value,
                                  }
                                : currentTitle,
                            )
                          }
                          maxLength={120}
                          autoFocus
                          disabled={isSaving}
                          placeholder="Enter homepage showcase title"
                          className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      ) : (
                        <div className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-extrabold text-[#0B1F3A]">
                          {showcase.sectionTitle}
                        </div>
                      )}

                      <p className="mt-1.5 text-[11px] text-gray-500">
                        This title will be displayed above this category
                        showcase on the customer homepage.
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isEditingThisTitle ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCancelTitleEdit}
                            disabled={isSaving}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <X size={14} aria-hidden="true" />
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveTitle();
                            }}
                            disabled={isSaving}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6900] px-3 text-xs font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Save size={14} aria-hidden="true" />
                            )}
                            {isSaving ? "Saving..." : "Save Title"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTitleEdit(showcase)}
                          disabled={isSaving}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-xs font-bold text-[#FF6900] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Edit Title
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
                <p className="text-sm font-black text-[#0B1F3A]">
                  Category Positions
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  3 fixed positions
                </p>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {showcase.positions.map((position) => {
                  const isEditing =
                    editingPosition?.showcaseId === showcase.id &&
                    editingPosition.position.position === position.position;

                  return (
                    <Fragment key={`${showcase.key}-${position.position}`}>
                      <div className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-[#FF6900]">
                              {position.position}
                            </span>

                            {position.thumbnail ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                <img
                                  src={position.thumbnail}
                                  alt={position.categoryName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-300">
                                <ImageIcon size={18} aria-hidden="true" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-[#0B1F3A]">
                                {position.categoryName || "No category selected"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                            <span
                              className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                                position.active && position.categoryId
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {position.active && position.categoryId
                                ? "Active"
                                : "Empty"}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleStartPositionEdit(showcase.id, position)
                              }
                              disabled={isSaving}
                              className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleClearPosition(showcase, position);
                              }}
                              disabled={isSaving || !position.categoryId}
                              className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>

                      {isEditing && editingPosition && (
                        <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
                          <div className="flex items-center justify-between gap-3 border-b border-orange-100 pb-3">
                            <div>
                              <p className="text-sm font-black text-[#0B1F3A]">
                                Edit Category Position
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Select a category for this fixed position.
                              </p>
                            </div>

                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#FF6900]">
                              Position {editingPosition.position.position}
                            </span>
                          </div>

                          <div className="mt-4">
                            <label className="mb-1.5 block text-xs font-bold text-[#0B1F3A]">
                              Category
                            </label>

                            <select
                              value={editingPosition.position.categoryId}
                              onChange={(event) =>
                                handleCategorySelection(event.target.value)
                              }
                              className="min-h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-orange-100"
                            >
                              <option value="">Select Category</option>

                              {activeCategories.map((category) => (
                                <option key={category._id} value={category._id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                            <div>
                              <p className="text-xs font-bold text-[#0B1F3A]">
                                Position Status
                              </p>
                              <p className="mt-0.5 text-[11px] text-gray-400">
                                Inactive positions are not displayed.
                              </p>
                            </div>

                            <input
                              type="checkbox"
                              checked={editingPosition.position.active}
                              onChange={(event) =>
                                handlePositionStatusChange(event.target.checked)
                              }
                              className="h-4 w-4 cursor-pointer accent-[#FF6900]"
                            />
                          </label>

                          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={handleCancelPositionEdit}
                              disabled={isSaving}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              <X size={15} aria-hidden="true" />
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                void handleSavePosition();
                              }}
                              disabled={isSaving}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF6900] px-4 text-xs font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSaving ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Check size={15} aria-hidden="true" />
                              )}
                              {isSaving ? "Saving..." : "Save Position"}
                            </button>
                          </div>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}