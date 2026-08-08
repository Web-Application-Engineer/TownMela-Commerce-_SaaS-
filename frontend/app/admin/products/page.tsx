"use client";

import Link from "next/link";

import {
  Plus,
  RefreshCcw,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import DeleteProductModal from "@/src/components/Admin/Products/DeleteProductModal";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

import EmptyState from "./components/EmptyState";
import ErrorAlert from "./components/ErrorAlert";
import LoadingState from "./components/LoadingState";
import ProductsFilter from "./components/ProductsFilter";
import ProductsStats from "./components/ProductsStats";
import ProductsTable from "./components/ProductsTable";
import SuccessAlert from "./components/SuccessAlert";

import type {
  AdminProduct,
  DeleteProductResponse,
  ProductsApiResponse,
} from "./types/product";

import {
  getCategoryName,
} from "./utils/productHelpers";

/* =========================================================
   SESSION HELPERS
========================================================= */

const clearAdminSession = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  [
    "townmelaAdminToken",
    "townmelaAdminUser",
    "accessToken",
    "token",
    "authToken",
    "jwt",
  ].forEach(
    (key) =>
      localStorage.removeItem(
        key,
      ),
  );
};

const getApiMessage = (
  payload: unknown,
  fallback: string,
) => {
  if (
    payload &&
    typeof payload ===
      "object" &&
    "message" in payload &&
    typeof (
      payload as {
        message?: unknown;
      }
    ).message === "string"
  ) {
    return (
      payload as {
        message: string;
      }
    ).message;
  }

  return fallback;
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const extractProducts = (
  payload:
    | ProductsApiResponse
    | null,
): AdminProduct[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(
      payload.products,
    )
  ) {
    return payload.products;
  }

  if (
    "data" in payload &&
    payload.data &&
    typeof payload.data ===
      "object" &&
    Array.isArray(
      (
        payload.data as {
          products?: AdminProduct[];
        }
      ).products,
    )
  ) {
    return (
      payload.data as {
        products: AdminProduct[];
      }
    ).products;
  }

  return [];
};

/* =========================================================
   ADMIN PRODUCTS PAGE
========================================================= */

export default function AdminProductsPage() {
  const router =
    useRouter();

  const {
    selectedTenant,
    selectedTenantId,
    loadingTenants,
    tenantError,
  } = useTenant();

  const [
    products,
    setProducts,
  ] = useState<
    AdminProduct[]
  >([]);

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    stockFilter,
    setStockFilter,
  ] = useState("all");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<AdminProduct | null>(
      null,
    );

  const [
    isDeleteModalOpen,
    setIsDeleteModalOpen,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const loadProducts =
    useCallback(
      async () => {
        if (
          loadingTenants
        ) {
          return;
        }

        if (
          !selectedTenantId
        ) {
          setProducts(
            [],
          );

          setIsLoading(
            false,
          );

          return;
        }

        try {
          setIsLoading(
            true,
          );

          setErrorMessage(
            "",
          );

          const response =
            await tenantFetch(
              "/api/products",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              },
            );

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | ProductsApiResponse
              | null;

          if (
            response.status ===
            401
          ) {
            clearAdminSession();

            router.replace(
              "/admin/login",
            );

            return;
          }

          if (
            !response.ok
          ) {
            throw new Error(
              getApiMessage(
                payload,
                "Products could not be loaded.",
              ),
            );
          }

          setProducts(
            extractProducts(
              payload,
            ),
          );
        } catch (
          error
        ) {
          console.error(
            "Admin products loading error:",
            error,
          );

          setProducts(
            [],
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Something went wrong while loading products.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        loadingTenants,
        router,
        selectedTenantId,
      ],
    );

  /* =======================================================
     AUTO RELOAD WHEN GLOBAL TENANT CHANGES
  ======================================================= */

  useEffect(() => {
    setProducts([]);
    setSearchKeyword("");
    setStockFilter("all");
    setSuccessMessage("");
    setErrorMessage("");

    void loadProducts();
  }, [
    loadProducts,
    selectedTenantId,
  ]);

  useEffect(() => {
    const handleProductsUpdated =
      () => {
        void loadProducts();
      };

    window.addEventListener(
      "products-updated",
      handleProductsUpdated,
    );

    return () => {
      window.removeEventListener(
        "products-updated",
        handleProductsUpdated,
      );
    };
  }, [loadProducts]);

  /* =======================================================
     DELETE MODAL
  ======================================================= */

  const openDeleteModal = (
    product: AdminProduct,
  ) => {
    setSelectedProduct(
      product,
    );

    setIsDeleteModalOpen(
      true,
    );

    setErrorMessage(
      "",
    );

    setSuccessMessage(
      "",
    );
  };

  const closeDeleteModal =
    () => {
      if (
        isDeleting
      ) {
        return;
      }

      setIsDeleteModalOpen(
        false,
      );

      setSelectedProduct(
        null,
      );
    };

  /* =======================================================
     DELETE PRODUCT
  ======================================================= */

  const handleDeleteProduct =
    async () => {
      if (
        !selectedProduct?._id ||
        !selectedTenantId ||
        isDeleting
      ) {
        return;
      }

      try {
        setIsDeleting(
          true,
        );

        setErrorMessage(
          "",
        );

        setSuccessMessage(
          "",
        );

        const response =
          await tenantFetch(
            `/api/products/${selectedProduct._id}`,
            {
              method:
                "DELETE",
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () =>
                null,
            )) as
            | DeleteProductResponse
            | null;

        if (
          response.status ===
          401
        ) {
          clearAdminSession();

          router.replace(
            "/admin/login",
          );

          return;
        }

        if (
          !response.ok ||
          !payload?.success
        ) {
          throw new Error(
            getApiMessage(
              payload,
              "Product could not be deleted.",
            ),
          );
        }

        const deletedProductName =
          selectedProduct.name;

        setProducts(
          (
            currentProducts,
          ) =>
            currentProducts.filter(
              (
                product,
              ) =>
                product._id !==
                selectedProduct._id,
            ),
        );

        setIsDeleteModalOpen(
          false,
        );

        setSelectedProduct(
          null,
        );

        setSuccessMessage(
          payload.message ||
            `${deletedProductName} deleted successfully.`,
        );

        window.dispatchEvent(
          new Event(
            "products-updated",
          ),
        );

        await loadProducts();
      } catch (
        error
      ) {
        console.error(
          "Delete product error:",
          error,
        );

        setIsDeleteModalOpen(
          false,
        );

        setSelectedProduct(
          null,
        );

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Something went wrong while deleting the product.",
        );
      } finally {
        setIsDeleting(
          false,
        );
      }
    };

  /* =======================================================
     SUMMARY VALUES
  ======================================================= */

  const totalProducts =
    products.length;

  const inStockProducts =
    products.filter(
      (product) =>
        Number(
          product.stock,
        ) > 0,
    ).length;

  const outOfStockProducts =
    products.filter(
      (product) =>
        Number(
          product.stock,
        ) <= 0,
    ).length;

  const discountedProducts =
    products.filter(
      (product) =>
        Number(
          product.oldPrice ||
            0,
        ) >
        Number(
          product.price ||
            0,
        ),
    ).length;

  /* =======================================================
     FILTERED PRODUCTS
  ======================================================= */

  const filteredProducts =
    useMemo(
      () => {
        const keyword =
          searchKeyword
            .trim()
            .toLowerCase();

        return products.filter(
          (
            product,
          ) => {
            const productName =
              product.name?.toLowerCase() ||
              "";

            const productSlug =
              product.slug?.toLowerCase() ||
              "";

            const categoryName =
              getCategoryName(
                product.category,
              ).toLowerCase();

            const matchesSearch =
              !keyword ||
              productName.includes(
                keyword,
              ) ||
              productSlug.includes(
                keyword,
              ) ||
              categoryName.includes(
                keyword,
              );

            const stock =
              Number(
                product.stock ||
                  0,
              );

            const matchesStock =
              stockFilter ===
                "all" ||
              (stockFilter ===
                "in-stock" &&
                stock > 0) ||
              (stockFilter ===
                "out-of-stock" &&
                stock <= 0);

            return (
              matchesSearch &&
              matchesStock
            );
          },
        );
      },
      [
        products,
        searchKeyword,
        stockFilter,
      ],
    );

  const hasActiveFilters =
    Boolean(
      searchKeyword.trim(),
    ) ||
    stockFilter !==
      "all";

  const clearFilters =
    () => {
      setSearchKeyword(
        "",
      );

      setStockFilter(
        "all",
      );
    };

  const tenantName =
    selectedTenant?.storeName ||
    selectedTenant?.businessName ||
    "selected tenant";

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1450px]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
              Product Management
            </span>

            <h1 className="mt-3 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
              Products
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Manage product information,
              pricing, stock, images,
              variants and categories.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            aria-disabled={
              !selectedTenantId
            }
            onClick={(
              event,
            ) => {
              if (
                !selectedTenantId
              ) {
                event.preventDefault();

                setErrorMessage(
                  "Please select a tenant from the header before adding a product.",
                );
              }
            }}
            className={`inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white transition ${
              selectedTenantId
                ? "bg-[#FF6900] hover:bg-[#E85F00]"
                : "cursor-not-allowed bg-gray-400"
            }`}
          >
            <Plus
              size={18}
            />

            Add New Product
          </Link>
        </div>

        {(successMessage ||
          errorMessage ||
          tenantError) && (
          <div className="mb-6 space-y-4">
            <SuccessAlert
              message={
                successMessage
              }
              onClose={() =>
                setSuccessMessage(
                  "",
                )
              }
            />

            <ErrorAlert
              message={
                errorMessage ||
                tenantError
              }
              onClose={() =>
                setErrorMessage(
                  "",
                )
              }
            />
          </div>
        )}

        {!loadingTenants &&
        !selectedTenantId ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-orange-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
              <Plus
                size={30}
              />
            </div>

            <h2 className="mt-5 text-xl font-black text-[#0B1F3A]">
              Select a tenant from the header
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
              Choose an active tenant
              from the Global Tenant
              Switcher before viewing
              or managing products.
            </p>
          </section>
        ) : (
          <>
            <ProductsStats
              totalProducts={
                totalProducts
              }
              inStockProducts={
                inStockProducts
              }
              outOfStockProducts={
                outOfStockProducts
              }
              discountedProducts={
                discountedProducts
              }
            />

            <ProductsFilter
              searchKeyword={
                searchKeyword
              }
              stockFilter={
                stockFilter
              }
              isLoading={
                isLoading
              }
              isDeleting={
                isDeleting
              }
              onSearchChange={
                setSearchKeyword
              }
              onStockFilterChange={
                setStockFilter
              }
              onRefresh={() =>
                void loadProducts()
              }
            />

            <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-lg font-black text-[#0B1F3A]">
                    Product List
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Showing{" "}
                    <span className="font-bold text-[#0B1F3A]">
                      {
                        filteredProducts.length
                      }
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-[#0B1F3A]">
                      {
                        products.length
                      }
                    </span>{" "}
                    products for{" "}
                    <span className="font-bold text-[#0B1F3A]">
                      {
                        tenantName
                      }
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadProducts()
                  }
                  disabled={
                    isLoading
                  }
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-600 transition hover:border-orange-200 hover:text-[#FF6900] disabled:opacity-60"
                >
                  <RefreshCcw
                    size={16}
                    className={
                      isLoading
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>
              </div>

              {isLoading ? (
                <LoadingState />
              ) : filteredProducts.length >
                0 ? (
                <ProductsTable
                  products={
                    filteredProducts
                  }
                  deletingProductId={
                    isDeleting
                      ? selectedProduct?._id ??
                        ""
                      : ""
                  }
                  onDelete={
                    openDeleteModal
                  }
                />
              ) : (
                <EmptyState
                  hasFilters={
                    hasActiveFilters
                  }
                  onClearFilters={
                    clearFilters
                  }
                />
              )}
            </section>
          </>
        )}
      </div>

      <DeleteProductModal
        open={
          isDeleteModalOpen
        }
        productName={
          selectedProduct?.name ??
          ""
        }
        loading={
          isDeleting
        }
        onClose={
          closeDeleteModal
        }
        onDelete={() =>
          void handleDeleteProduct()
        }
      />
    </>
  );
}