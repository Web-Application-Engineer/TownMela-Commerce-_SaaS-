import Image from "next/image";
import Link from "next/link";

import {
  Edit3,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import type {
  AdminProduct,
} from "../types/product";

import {
  formatPrice,
  getCategoryName,
} from "../utils/productHelpers";

type ProductsTableProps = {
  products: AdminProduct[];
  deletingProductId: string;
  onDelete: (
    product: AdminProduct,
  ) => void;
};

export default function ProductsTable({
  products,
  deletingProductId,
  onDelete,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
              Product
            </th>

            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
              Category
            </th>

            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
              Price
            </th>

            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-gray-500">
              Stock
            </th>

            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-gray-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {products.map((product) => {
            const isDeleting =
              deletingProductId ===
              product._id;

            const hasDiscount =
              Number(product.oldPrice || 0) >
              Number(product.price || 0);

            return (
              <tr
                key={product._id}
                className="transition hover:bg-gray-50/80"
              >
                <td className="px-5 py-4">
                  <div className="flex min-w-[300px] items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-black leading-6 text-[#0B1F3A]">
                        {product.name}
                      </p>

                      <p className="mt-1 truncate text-xs font-semibold text-gray-400">
                        {product.slug}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">
                    {getCategoryName(
                      product.category,
                    )}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-[#0B1F3A]">
                      {formatPrice(
                        product.price,
                      )}
                    </p>

                    {hasDiscount && (
                      <p className="mt-1 text-xs font-bold text-gray-400 line-through">
                        {formatPrice(
                          product.oldPrice,
                        )}
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {product.stock > 0 ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                      {product.stock} in stock
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700">
                      Out of stock
                    </span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
<Link
  href={`/admin/products/${product._id}/edit`}
  className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
  aria-label={`Edit ${product.name}`}
>
  <Edit3 size={17} />
</Link>

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(product)
                      }
                      disabled={isDeleting}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Delete ${product.name}`}
                    >
                      {isDeleting ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}