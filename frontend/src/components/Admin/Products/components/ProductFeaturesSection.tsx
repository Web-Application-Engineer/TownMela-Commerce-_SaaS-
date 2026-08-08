import {
  Plus,
  Trash2,
} from "lucide-react";

type ProductFeaturesSectionProps = {
  features: string[];
  isSubmitting: boolean;

  onAddFeature: () => void;

  onUpdateFeature: (
    index: number,
    value: string,
  ) => void;

  onRemoveFeature: (
    index: number,
  ) => void;
};

export default function ProductFeaturesSection({
  features,
  isSubmitting,
  onAddFeature,
  onUpdateFeature,
  onRemoveFeature,
}: ProductFeaturesSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#0B1F3A]">
            Product Features
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add important product
            benefits or specifications.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddFeature}
          disabled={isSubmitting}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-[#FF6900] transition hover:bg-orange-100 disabled:opacity-60"
        >
          <Plus
            size={17}
            aria-hidden="true"
          />

          Add Feature
        </button>
      </div>

      <div className="space-y-3">
        {features.map(
          (feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={feature}
                onChange={(event) =>
                  onUpdateFeature(
                    index,
                    event.target.value,
                  )
                }
                placeholder="Advanced heart rate monitoring"
                disabled={isSubmitting}
                className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={() =>
                  onRemoveFeature(index)
                }
                disabled={isSubmitting}
                aria-label={`Remove feature ${index + 1}`}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2
                  size={18}
                  aria-hidden="true"
                />
              </button>
            </div>
          ),
        )}
      </div>
    </section>
  );
}