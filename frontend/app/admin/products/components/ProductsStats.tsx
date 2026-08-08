type ProductsStatsProps = {
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  discountedProducts: number;
};

export default function ProductsStats({
  totalProducts,
  inStockProducts,
  outOfStockProducts,
  discountedProducts,
}: ProductsStatsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          Total Products
        </p>

        <p className="mt-3 text-2xl font-black text-[#0B1F3A]">
          {totalProducts}
        </p>
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          In Stock
        </p>

        <p className="mt-3 text-2xl font-black text-emerald-600">
          {inStockProducts}
        </p>
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          Out of Stock
        </p>

        <p className="mt-3 text-2xl font-black text-red-600">
          {outOfStockProducts}
        </p>
      </article>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-gray-500">
          Discounted Products
        </p>

        <p className="mt-3 text-2xl font-black text-[#FF6900]">
          {discountedProducts}
        </p>
      </article>
    </section>
  );
}