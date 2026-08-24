"use client";

import {
  Boxes,
  Grid3X3,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import type {
  CategoryShowcase,
} from "../types/homepage";

export type HomepageProductSectionBuilderItem = {
  id?: string;
  key: string;
  title: string;
  active: boolean;
  order: number;
  layoutOrder: number;
};

type SectionType = "product" | "category";

type HomepageSectionBuilderProps = {
  productSections: HomepageProductSectionBuilderItem[];
  categoryShowcases: CategoryShowcase[];
  productSectionsActive: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string;
  onToggleProductSectionsActive: () => void;
  onAddProductSection: () => void;
  onAddCategoryShowcase: () => void;
  onUpdateProductSection: (
    key: string,
    changes: Partial<HomepageProductSectionBuilderItem>,
  ) => void;
  onUpdateCategoryShowcase: (
    key: string,
    changes: Partial<CategoryShowcase>,
  ) => void;
  onMoveSection: (
    type: SectionType,
    key: string,
    direction: "up" | "down",
  ) => void;
  onDeleteSection: (
    type: SectionType,
    key: string,
  ) => void;
  onSave: () => void | Promise<void>;
};

export default function HomepageSectionBuilder({
  productSections,
  categoryShowcases,
  productSectionsActive,
  isLoading = false,
  isSaving = false,
  errorMessage = "",
  onToggleProductSectionsActive,
  onAddProductSection,
  onAddCategoryShowcase,
  onUpdateProductSection,
  onUpdateCategoryShowcase,
  onMoveSection,
  onDeleteSection,
  onSave,
}: HomepageSectionBuilderProps) {
  const items = [
    ...productSections.map((section) => ({
      type: "product" as const,
      key: section.key,
      title: section.title,
      active: section.active,
      layoutOrder: section.layoutOrder,
    })),
    ...categoryShowcases.map((showcase) => ({
      type: "category" as const,
      key: showcase.key,
      title: showcase.sectionTitle,
      active: showcase.active,
      layoutOrder: showcase.layoutOrder,
    })),
  ].sort((a, b) => a.layoutOrder - b.layoutOrder);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Homepage Section Builder
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Add, remove, rename, hide and reorder product sections and category
            showcases for the active tenant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleProductSectionsActive}
            disabled={isLoading || isSaving}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
              productSectionsActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }`}
          >
            {productSectionsActive
              ? "Products Active"
              : "Products Inactive"}
          </button>

          <button
            type="button"
            onClick={onAddProductSection}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-[#FF6900] bg-white px-3 py-2 text-sm font-bold text-[#FF6900] disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            Product Section
          </button>

          <button
            type="button"
            onClick={onAddCategoryShowcase}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-[#0B1F3A] bg-white px-3 py-2 text-sm font-bold text-[#0B1F3A] disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            Category Showcase
          </button>

          <button
            type="button"
            onClick={() => void onSave()}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F1B33] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            {isSaving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="px-5 py-8 text-sm font-semibold text-[#FF6900]">
          Loading homepage sections...
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">
          No homepage content sections found. Add a Product Section or Category
          Showcase.
        </div>
      ) : (
        <div className="space-y-3 p-5">
          {items.map((item, index) => {
            const isProduct = item.type === "product";

            return (
              <div
                key={`${item.type}-${item.key}`}
                className="grid items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[150px_180px_minmax(0,1fr)_130px_210px]"
              >
                <div className="text-sm font-black text-slate-500">
                  Position {index + 1}
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-[#0B1F3A]">
                  {isProduct ? (
                    <Boxes size={14} aria-hidden="true" />
                  ) : (
                    <Grid3X3 size={14} aria-hidden="true" />
                  )}
                  {isProduct ? "Product Section" : "Category Showcase"}
                </div>

                <input
                  type="text"
                  value={item.title}
                  maxLength={120}
                  onChange={(event) => {
                    if (isProduct) {
                      onUpdateProductSection(item.key, {
                        title: event.target.value,
                      });
                    } else {
                      onUpdateCategoryShowcase(item.key, {
                        sectionTitle: event.target.value,
                      });
                    }
                  }}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#FF6900]"
                  placeholder="Enter section title"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (isProduct) {
                      onUpdateProductSection(item.key, {
                        active: !item.active,
                      });
                    } else {
                      onUpdateCategoryShowcase(item.key, {
                        active: !item.active,
                      });
                    }
                  }}
                  className={`h-11 w-full rounded-lg border text-sm font-bold ${
                    item.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  {item.active ? "Active" : "Inactive"}
                </button>

                <div className="flex h-11 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onMoveSection(item.type, item.key, "up")
                    }
                    disabled={index === 0}
                    className="flex-1 rounded-lg border border-slate-300 bg-white font-bold disabled:opacity-40"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onMoveSection(item.type, item.key, "down")
                    }
                    disabled={index === items.length - 1}
                    className="flex-1 rounded-lg border border-slate-300 bg-white font-bold disabled:opacity-40"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const shouldDelete = window.confirm(
                        `Delete \"${item.title}\" from the homepage layout?`,
                      );

                      if (shouldDelete) {
                        onDeleteSection(item.type, item.key);
                      }
                    }}
                    className="flex-[1.4] rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Trash2 size={14} aria-hidden="true" />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
