"use client";

import Link from "next/link";

import {
  FolderTree,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

/* =========================================================
   TYPES
========================================================= */

type Category = {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  featured?: boolean;
  status?: boolean;
  productCount?: number;
};

type CategoriesApiResponse =
  | Category[]
  | {
      success?: boolean;
      categories?: Category[];
      message?: string;
    };

/* =========================================================
   RESPONSE HELPER
========================================================= */

const readJsonResponse = async <T,>(
  response: Response
): Promise<T> => {
  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    const responseText =
      await response.text();

    throw new Error(
      responseText ||
        `Unexpected server response (${response.status}).`
    );
  }

  return (await response.json()) as T;
};

/* =========================================================
   ALL CATEGORIES PAGE
========================================================= */

export default function CategoriesPage() {


  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    failedImages,
    setFailedImages,
  ] = useState<Record<string, boolean>>(
    {}
  );

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories =
    useCallback(
      async (
        signal?: AbortSignal
      ) => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const response =
       await fetch(`${API_BASE_URL}/api/categories`, {
  method: "GET",
  cache: "no-store",
  signal,
  headers: {
    Accept: "application/json",
    ...(TENANT_ID && {
      "X-Tenant-Id": TENANT_ID,
    }),
  },
});

          const data =
            await readJsonResponse<CategoriesApiResponse>(
              response
            );

          if (!response.ok) {
            const apiMessage =
              Array.isArray(data)
                ? ""
                : data.message || "";

            throw new Error(
              apiMessage ||
                "Categories could not be loaded."
            );
          }

          const categoryList =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data.categories
                  )
                ? data.categories
                : [];

          const visibleCategories =
            categoryList
              .filter(
                (
                  category
                ): category is Category =>
                  Boolean(
                    category?._id
                  ) &&
                  Boolean(
                    category?.name?.trim()
                  ) &&
                  Boolean(
                    category?.slug?.trim()
                  ) &&
                  category.status !== false
              )
              .sort(
                (
                  firstCategory,
                  secondCategory
                ) =>
                  firstCategory.name.localeCompare(
                    secondCategory.name
                  )
              );

          setCategories(
            visibleCategories
          );
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Categories page loading error:",
            error
          );

          setCategories([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading categories."
          );
        } finally {
          if (!signal?.aborted) {
            setIsLoading(false);
          }
        }
      },
      []
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadCategories(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [loadCategories]);

  useEffect(() => {
    const handleCategoriesUpdated =
      () => {
        void loadCategories();
      };

    window.addEventListener(
      "categories-updated",
      handleCategoriesUpdated
    );

    return () => {
      window.removeEventListener(
        "categories-updated",
        handleCategoriesUpdated
      );
    };
  }, [loadCategories]);

  /* =======================================================
     FILTERED CATEGORIES
  ======================================================= */

  const filteredCategories =
    useMemo(() => {
      const cleanSearch =
        searchText
          .trim()
          .toLowerCase();

      if (!cleanSearch) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(cleanSearch) ||
          category.slug
            .toLowerCase()
            .includes(cleanSearch)
      );
    }, [categories, searchText]);

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="flex min-h-[280px] flex-col items-center justify-center border border-gray-200 bg-[#E5E7EB] px-5 py-10 text-center">
              <LoaderCircle
                size={38}
                className="animate-spin text-[#FF6900]"
                aria-hidden="true"
              />

              <p className="mt-4 text-sm font-bold text-gray-500">
                Loading categories...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     ERROR STATE
  ======================================================= */

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-white">
        <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
          <div className="mx-auto w-full max-w-[1450px]">
            <div className="flex min-h-[280px] flex-col items-center justify-center border border-gray-200 bg-[#E5E7EB] px-5 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                <FolderTree
                  size={29}
                  aria-hidden="true"
                />
              </div>

              <h1 className="mt-5 text-xl font-black text-[#0B1F3A] sm:text-2xl">
                Categories Could Not Be Loaded
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => {
                  void loadCategories();
                }}
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border-2 border-[#FF6900] bg-[#334155] px-5 text-sm font-bold text-white transition-all duration-300 hover:border-[#64748B] hover:bg-[#FFF7E8] hover:text-[#FF6900]"
              >
                <RefreshCw
                  size={16}
                  aria-hidden="true"
                />

                Try Again
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full px-3 py-6 sm:px-4 lg:px-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1450px] rounded-[10px] bg-[#E5E7EB] p-4 sm:p-5 lg:p-6">
          {/* PAGE HEADER */}

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-black text-[#0B1F3A] sm:text-2xl lg:text-3xl">
                Explore All Categories
              </h1>

            </div>

<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
  <div className="relative w-full sm:min-w-[320px] lg:w-[380px]">
    <label
      htmlFor="category-search"
      className="sr-only"
    >
      Search categories
    </label>

    <Search
      size={18}
      aria-hidden="true"
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
    />

    <input
      id="category-search"
      type="search"
      value={searchText}
      onChange={(event) => {
        setSearchText(event.target.value);
      }}
      placeholder="Search categories..."
      className="h-10 w-full rounded-full border-2 border-gray-300 bg-white pl-11 pr-4 text-sm font-medium text-[#0B1F3A] outline-none transition-all duration-300 focus:border-[#FF6900] focus:ring-2 focus:ring-[#FF6900]/15"
    />
  </div>

  <div
    className="
      inline-flex
      h-10
      shrink-0
      items-center
      justify-center
      whitespace-nowrap
      rounded-full
      border-2
      border-[#FF6900]
      bg-[#FFF7E8]
      px-4
      text-sm
      font-bold
      text-[#FF6900]
    "
  >
    {filteredCategories.length}{" "}
    {filteredCategories.length === 1
      ? "Category"
      : "Categories"}
  </div>

  {searchText.trim() && (
    <button
      type="button"
      onClick={() => {
        setSearchText("");
      }}
      className="
        inline-flex
        h-10
        shrink-0
        items-center
        justify-center
        rounded-full
        border-2
        border-[#FF6900]
        bg-[#334155]
        px-4
        text-sm
        font-bold
        text-white
        transition-all
        duration-300
        hover:border-[#64748B]
        hover:bg-[#FFF7E8]
        hover:text-[#FF6900]
      "
    >
      Clear
    </button>
  )}
</div>
          </div>

          {/* CATEGORY GRID */}

          {filteredCategories.length >
          0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCategories.map(
                (category) => {
                  const showImage =
                    Boolean(
                      category.thumbnail?.trim()
                    ) &&
                    !failedImages[
                      category._id
                    ];

                  return (
                    <Link
                      key={category._id}
                      href={`/category/${encodeURIComponent(
                        category.slug
                      )}`}
                      aria-label={`View ${category.name} category`}
                      className="group relative block aspect-square w-full overflow-hidden bg-white"
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-50 text-[#FF6900]">
                        <FolderTree
                          size={48}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </div>

                      {showImage && (
                        <img
                          src={
                            category.thumbnail
                          }
                          alt={
                            category.name
                          }
                          loading="lazy"
                          onError={() => {
                            setFailedImages(
                              (
                                currentImages
                              ) => ({
                                ...currentImages,
                                [category._id]:
                                  true,
                              })
                            );
                          }}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-transparent" />

                      <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300" />

                      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-5 sm:pb-6">
                        <h2 className="text-center text-lg font-bold text-[#FF6900] transition-colors duration-300 group-hover:text-[#0B1F3A]">
                          {category.name}
                        </h2>
                      </div>

                      <div className="pointer-events-none absolute inset-0 border border-white/10 transition-colors duration-300 group-hover:border-[#0B1F3A]/25" />
                    </Link>
                  );
                }
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center bg-white px-5 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                <Search
                  size={29}
                  aria-hidden="true"
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
                No Matching Category
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Try searching with a different category name.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}