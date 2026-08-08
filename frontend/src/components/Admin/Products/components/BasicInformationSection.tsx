type BasicInformationSectionProps = {
  name: string;
  slug: string;
  description: string;

  isSubmitting: boolean;

  onNameChange: (value: string) => void;

  onSlugChange: (value: string) => void;

  onDescriptionChange: (
    value: string,
  ) => void;
};

export default function BasicInformationSection({
  name,
  slug,
  description,

  isSubmitting,

  onNameChange,

  onSlugChange,

  onDescriptionChange,
}: BasicInformationSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black text-[#0B1F3A]">
          Basic Information
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter the product name,
          slug and description.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label
            htmlFor="productName"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Product Name
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="productName"
            type="text"
            value={name}
            onChange={(event) =>
              onNameChange(
                event.target.value,
              )
            }
            placeholder="Premium Smart Watch"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="productSlug"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Product Slug
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <input
            id="productSlug"
            type="text"
            value={slug}
            onChange={(event) =>
              onSlugChange(
                event.target.value,
              )
            }
            placeholder="premium-smart-watch"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="productDescription"
            className="mb-2 block text-sm font-bold text-[#0B1F3A]"
          >
            Description
            <span className="text-red-500">
              {" "}
              *
            </span>
          </label>

          <textarea
            id="productDescription"
            value={description}
            onChange={(event) =>
              onDescriptionChange(
                event.target.value,
              )
            }
            placeholder="Write a complete product description..."
            rows={7}
            disabled={isSubmitting}
            className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium leading-7 text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />
        </div>
      </div>
    </section>
  );
}