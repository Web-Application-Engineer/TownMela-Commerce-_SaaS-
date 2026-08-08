type Category = {
  _id: string;
  name: string;
};

type PricingInventorySectionProps = {
  price: string;
  oldPrice: string;
  stock: string;
  category: string;

  categories: Category[];

  isSubmitting: boolean;
  isCategoriesLoading: boolean;

  onPriceChange: (value: string) => void;
  onOldPriceChange: (value: string) => void;
  onStockChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

export default function PricingInventorySection({
  price,
  oldPrice,
  stock,
  category,

  categories,

  isSubmitting,
  isCategoriesLoading,

  onPriceChange,
  onOldPriceChange,
  onStockChange,
  onCategoryChange,
}: PricingInventorySectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black text-[#0B1F3A]">
          Pricing and Inventory
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Configure pricing, stock and product category.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label
            htmlFor="productPrice"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Current Price
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="productPrice"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) =>
              onPriceChange(event.target.value)
            }
            placeholder="1500"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="productOldPrice"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Old Price
          </label>

          <input
            id="productOldPrice"
            type="number"
            min="0"
            step="0.01"
            value={oldPrice}
            onChange={(event) =>
              onOldPriceChange(event.target.value)
            }
            placeholder="2100"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="productStock"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Stock Quantity
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="productStock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(event) =>
              onStockChange(event.target.value)
            }
            placeholder="10"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="productCategory"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Category
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <select
            id="productCategory"
            value={category}
            onChange={(event) =>
              onCategoryChange(event.target.value)
            }
            disabled={
              isSubmitting ||
              isCategoriesLoading
            }
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          >
            <option value="">
              {isCategoriesLoading
                ? "Loading categories..."
                : "Select category"}
            </option>

            {categories.map((categoryItem) => (
              <option
                key={categoryItem._id}
                value={categoryItem._id}
              >
                {categoryItem.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}