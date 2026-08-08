import {
  Plus,
  X,
} from "lucide-react";

type OptionalVariantsSectionProps = {
  sizes: string[];
  colors: string[];
  sizeInput: string;
  colorInput: string;
  isSubmitting: boolean;

  onSizeInputChange: (
    value: string,
  ) => void;

  onColorInputChange: (
    value: string,
  ) => void;

  onAddSize: () => void;
  onAddColor: () => void;

  onRemoveSize: (
    size: string,
  ) => void;

  onRemoveColor: (
    color: string,
  ) => void;
};

export default function OptionalVariantsSection({
  sizes,
  colors,
  sizeInput,
  colorInput,
  isSubmitting,
  onSizeInputChange,
  onColorInputChange,
  onAddSize,
  onAddColor,
  onRemoveSize,
  onRemoveColor,
}: OptionalVariantsSectionProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      {/* Sizes */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-[#0B1F3A]">
          Sizes
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Optional. Leave empty when the
          product has no sizes.
        </p>

        <div className="mt-5 flex gap-3">
          <input
            type="text"
            value={sizeInput}
            onChange={(event) =>
              onSizeInputChange(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                event.preventDefault();
                onAddSize();
              }
            }}
            placeholder="S, M, L or 42"
            disabled={isSubmitting}
            className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />

          <button
            type="button"
            onClick={onAddSize}
            disabled={
              isSubmitting ||
              !sizeInput.trim()
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-4 text-sm font-extrabold text-white transition hover:bg-[#16345c] disabled:opacity-50"
          >
            <Plus
              size={17}
              aria-hidden="true"
            />

            Add
          </button>
        </div>

        <div className="mt-4 flex min-h-10 flex-wrap gap-2">
          {sizes.length > 0 ? (
            sizes.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-sm font-extrabold text-[#FF6900]"
              >
                {size}

                <button
                  type="button"
                  onClick={() =>
                    onRemoveSize(size)
                  }
                  disabled={isSubmitting}
                  aria-label={`Remove size ${size}`}
                >
                  <X
                    size={15}
                    aria-hidden="true"
                  />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              No sizes added.
            </p>
          )}
        </div>
      </div>

      {/* Colors */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-[#0B1F3A]">
          Colors
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Optional. Leave empty when the
          product has no colors.
        </p>

        <div className="mt-5 flex gap-3">
          <input
            type="text"
            value={colorInput}
            onChange={(event) =>
              onColorInputChange(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                event.preventDefault();
                onAddColor();
              }
            }}
            placeholder="Black, White or Blue"
            disabled={isSubmitting}
            className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0B1F3A] outline-none transition focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/10 disabled:bg-gray-100"
          />

          <button
            type="button"
            onClick={onAddColor}
            disabled={
              isSubmitting ||
              !colorInput.trim()
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-4 text-sm font-extrabold text-white transition hover:bg-[#16345c] disabled:opacity-50"
          >
            <Plus
              size={17}
              aria-hidden="true"
            />

            Add
          </button>
        </div>

        <div className="mt-4 flex min-h-10 flex-wrap gap-2">
          {colors.length > 0 ? (
            colors.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-extrabold text-[#0B1F3A]"
              >
                {color}

                <button
                  type="button"
                  onClick={() =>
                    onRemoveColor(color)
                  }
                  disabled={isSubmitting}
                  aria-label={`Remove color ${color}`}
                >
                  <X
                    size={15}
                    aria-hidden="true"
                  />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              No colors added.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}