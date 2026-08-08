import {
  PackageSearch,
} from "lucide-react";

type EmptyStateProps = {
  hasFilters: boolean;
  onClearFilters: () => void;
};

export default function EmptyState({
  hasFilters,
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
        <PackageSearch size={32} />
      </div>

      <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
        No products found
      </h2>

      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-gray-500">
        {hasFilters
          ? "No products match your current search or stock filter."
          : "There are no products available yet."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#e85f00]"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}