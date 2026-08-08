"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

type DeleteProductModalProps = {
  open: boolean;
  productName: string;
  loading?: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export default function DeleteProductModal({
  open,
  productName,
  loading = false,
  onClose,
  onDelete,
}: DeleteProductModalProps) {
  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <div
        className="
          w-full
          max-w-lg
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-red-50
                text-red-600
              "
            >
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#0B1F3A]">
                Delete Product
              </h2>

              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              rounded-xl
              p-2
              text-gray-500
              transition
              hover:bg-gray-100
              disabled:opacity-40
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}

        <div className="px-6 py-6">
          <p className="text-sm leading-7 text-gray-600">
            You are about to permanently delete
            the following product:
          </p>

          <div
            className="
              mt-5
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-4
            "
          >
            <p className="text-xs font-bold uppercase tracking-wider text-red-500">
              Product Name
            </p>

            <h3 className="mt-2 text-lg font-black text-red-700 break-words">
              {productName}
            </h3>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            After deleting this product,
            customers will no longer be able to
            purchase it and the action cannot be
            recovered.
          </p>
        </div>

        {/* Footer */}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              inline-flex
              h-12
              items-center
              justify-center
              rounded-xl
              border
              border-gray-300
              bg-white
              px-6
              text-sm
              font-extrabold
              text-[#0B1F3A]
              transition
              hover:border-[#FF6900]
              hover:text-[#FF6900]
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onDelete}
            className="
              inline-flex
              h-12
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-red-600
              px-6
              text-sm
              font-extrabold
              text-white
              transition
              hover:bg-red-700
              disabled:opacity-60
            "
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />

                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} />

                Delete Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}