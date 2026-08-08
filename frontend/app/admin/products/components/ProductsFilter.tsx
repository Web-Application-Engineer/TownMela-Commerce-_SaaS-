import {
  Filter,
  RefreshCcw,
  Search,
} from "lucide-react";

type ProductsFilterProps = {
  searchKeyword: string;
  stockFilter: string;
  isLoading: boolean;
  isDeleting: boolean;
  onSearchChange: (
    value: string,
  ) => void;
  onStockFilterChange: (
    value: string,
  ) => void;
  onRefresh: () => void;
};

export default function ProductsFilter({
  searchKeyword,
  stockFilter,
  isLoading,
  isDeleting,
  onSearchChange,
  onStockFilterChange,
  onRefresh,
}: ProductsFilterProps) {
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            value={searchKeyword}
            onChange={(event) =>
              onSearchChange(
                event.target.value,
              )
            }
            placeholder="Search by product name, slug or category"
            className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10"
          />
        </div>

        <div className="relative min-w-[210px]">
          <Filter
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <select
            value={stockFilter}
            onChange={(event) =>
              onStockFilterChange(
                event.target.value,
              )
            }
            className="h-12 w-full appearance-none rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-sm font-bold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10"
          >
            <option value="all">
              All Stock Status
            </option>

            <option value="in-stock">
              In Stock
            </option>

            <option value="out-of-stock">
              Out of Stock
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={
            isLoading ||
            isDeleting
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}