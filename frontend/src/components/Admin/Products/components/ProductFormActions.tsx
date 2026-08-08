import Link from "next/link";
import {
  LoaderCircle,
  PackagePlus,
  Save,
} from "lucide-react";

type ProductFormActionsProps = {
  mode: "create" | "edit";
  isSubmitting: boolean;
};

export default function ProductFormActions({
  mode,
  isSubmitting,
}: ProductFormActionsProps) {
  return (
    <section className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-end">
      <Link
        href="/admin/products"
        className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
      >
        Cancel
      </Link>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-7 text-sm font-extrabold text-white transition hover:bg-[#E85F00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle
              size={19}
              className="animate-spin"
              aria-hidden="true"
            />

            {mode === "edit"
              ? "Updating Product..."
              : "Creating Product..."}
          </>
        ) : (
          <>
            {mode === "edit" ? (
              <Save
                size={19}
                aria-hidden="true"
              />
            ) : (
              <PackagePlus
                size={19}
                aria-hidden="true"
              />
            )}

            {mode === "edit"
              ? "Update Product"
              : "Save Product"}
          </>
        )}
      </button>
    </section>
  );
}