"use client";

import { PackageSearch } from "lucide-react";

type EmptyStateProps = {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

export default function EmptyState({
  hasActiveFilters,
  onResetFilters,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm sm:py-20">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <PackageSearch className="h-8 w-8 text-[#FF6900]" />
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-950">
        কোনো order পাওয়া যায়নি
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        Search অথবা selected filter অনুযায়ী কোনো order পাওয়া যায়নি।
        Filter পরিবর্তন করে আবার চেষ্টা করুন।
      </p>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FF6900] px-5 text-sm font-bold text-white transition hover:bg-[#e85f00]"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}