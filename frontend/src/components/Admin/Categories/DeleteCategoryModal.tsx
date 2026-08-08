"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type DeleteCategoryModalProps = {
  open: boolean;
  categoryName: string;
  loading?: boolean;
  onClose: () => void;
  onDelete: () => void;
};

/* =========================================================
   DELETE CATEGORY MODAL
========================================================= */

export default function DeleteCategoryModal({
  open,
  categoryName,
  loading = false,
  onClose,
  onDelete,
}: DeleteCategoryModalProps) {
  /* =======================================================
     ESCAPE KEY AND BODY LOCK
  ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    loading,
    onClose,
    open,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        overflow-y-auto
        bg-black/55
        p-3
        backdrop-blur-sm
        sm:p-5
      "
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-description"
        className="
          my-auto
          w-full
          max-w-lg
          overflow-hidden
          rounded-2xl
          border
          border-white/20
          bg-white
          shadow-2xl
          sm:rounded-3xl
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-gray-200
            px-4
            py-4
            sm:px-6
            sm:py-5
          "
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-red-50
                text-red-600
                sm:h-12
                sm:w-12
              "
            >
              <AlertTriangle
                size={24}
              />
            </div>

            <div className="min-w-0">
              <h2
                id="delete-category-title"
                className="
                  break-words
                  text-lg
                  font-black
                  text-[#0B1F3A]
                  sm:text-xl
                "
              >
                Delete Category
              </h2>

              <p
                id="delete-category-description"
                className="mt-1 text-sm leading-6 text-gray-500"
              >
                This action cannot be
                undone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close delete category modal"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-gray-500
              transition
              hover:bg-gray-100
              hover:text-red-600
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-sm leading-7 text-gray-600">
            You are about to permanently
            delete the following category:
          </p>

          <div
            className="
              mt-4
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-4
            "
          >
            <p
              className="
                text-[11px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-red-500
              "
            >
              Category Name
            </p>

            <h3
              className="
                mt-2
                break-words
                text-base
                font-black
                text-red-700
                sm:text-lg
              "
            >
              {categoryName}
            </h3>
          </div>

          <div
            className="
              mt-5
              rounded-2xl
              border
              border-amber-200
              bg-amber-50
              p-4
              text-sm
              leading-6
              text-amber-800
            "
          >
            Make sure no products are still
            using this category before
            deleting it. Otherwise product
            category references may become
            invalid.
          </div>
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            border-t
            border-gray-200
            px-4
            py-4
            sm:flex-row
            sm:justify-end
            sm:px-6
            sm:py-5
          "
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              inline-flex
              h-12
              w-full
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
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:w-auto
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="
              inline-flex
              h-12
              w-full
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
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:w-auto
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

                Delete Category
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}