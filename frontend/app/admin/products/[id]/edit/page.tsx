"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  PencilLine,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import ProductForm from "@/src/components/Admin/Products/ProductForm";

import type {
  ProductFormInitialData,
} from "@/src/components/Admin/Products/ProductForm";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type ProductApiResponse = {
  success?: boolean;
  message?: string;
  product?: ProductFormInitialData;
};

/* =========================================================
   EDIT PRODUCT PAGE
========================================================= */

export default function EditProductPage() {
  const params = useParams<{
    id: string;
  }>();

  const {
    selectedTenantId,
  } = useTenant();

  const productId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [
    product,
    setProduct,
  ] =
    useState<ProductFormInitialData | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     LOAD PRODUCT
  ======================================================= */

  const loadProduct =
    useCallback(async () => {
      if (!productId) {
        setErrorMessage(
          "Invalid product ID.",
        );

        setIsLoading(false);

        return;
      }

      if (!selectedTenantId) {
        setProduct(null);

        setErrorMessage(
          "Please select a tenant before loading the product.",
        );

        setIsLoading(false);

        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const response =
          await tenantFetch(
            `/api/products/${productId}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data:
          ProductApiResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.product
        ) {
          throw new Error(
            data.message ||
              "Product could not be loaded.",
          );
        }

        setProduct(
          data.product,
        );
      } catch (error) {
        console.error(
          "Edit product loading error:",
          error,
        );

        setProduct(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the product.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      productId,
      selectedTenantId,
    ]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  /* =======================================================
     LOADING UI
  ======================================================= */

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[520px] w-full max-w-[1450px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <LoaderCircle
          size={42}
          className="animate-spin text-[#FF6900]"
        />

        <h1 className="mt-5 text-xl font-black text-[#0B1F3A]">
          Loading Product
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Please wait while the product
          information is being loaded.
        </p>
      </div>
    );
  }

  /* =======================================================
     ERROR UI
  ======================================================= */

  if (
    errorMessage ||
    !product
  ) {
    return (
      <div className="mx-auto w-full max-w-[1450px]">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle
              size={30}
            />
          </div>

          <h1 className="mt-5 text-xl font-black text-[#0B1F3A]">
            Product Could Not Be Loaded
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-600">
            {errorMessage ||
              "The requested product was not found."}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void loadProduct()
              }
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#FF6900] px-6 text-sm font-extrabold text-white transition hover:bg-[#E85F00]"
            >
              Try Again
            </button>

            <Link
              href="/admin/products"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-sm font-extrabold text-[#0B1F3A] transition hover:border-[#FF6900] hover:text-[#FF6900]"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      <div className="mb-7">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
        >
          <ArrowLeft size={17} />

          Back to Products
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
            <PencilLine size={24} />
          </div>

          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
              Product Management
            </span>

            <h1 className="mt-2 text-2xl font-black text-[#0B1F3A] sm:text-3xl">
              Edit Product
            </h1>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Update product information,
          pricing, stock, category,
          images, features, sizes and
          colors.
        </p>
      </div>

      <ProductForm
        key={`${selectedTenantId}-${productId}`}
        mode="edit"
        productId={productId}
        initialData={product}
      />
    </div>
  );
}