"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";

import type {
  Product,
  ProductCategory,
} from "@/src/types/product";

import {
  getOrCreateGuestId,
} from "@/src/utils/guestCart";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

/* =========================================================
   TYPES
========================================================= */

type CartProduct = Pick<
  Product,
  | "_id"
  | "name"
  | "slug"
  | "image"
  | "price"
  | "stock"
  | "category"
>;

type CartItem = {
  _id?: string;

  product:
    | CartProduct
    | string
    | null;

  quantity: number;

  /*
    শুধু size থাকা product-এর জন্য value থাকবে।

    Size ছাড়া product:
    selectedSize = null
  */
  selectedSize?: string | null;

  selectedColor?: string | null;
};

type HydratedCartItem =
  CartItem & {
    product: CartProduct;
  };

type CartData = {
  _id?: string;
  guestId?: string;
  items?: CartItem[];
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: CartData;
};

type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      message?: string;
    };

/* =========================================================
   HELPERS
========================================================= */

function isHydratedCartItem(
  item: CartItem
): item is HydratedCartItem {
  return (
    typeof item.product === "object" &&
    item.product !== null &&
    typeof item.product._id ===
      "string"
  );
}

function getHydratedItems(
  cart?: CartData
): HydratedCartItem[] {
  return (
    cart?.items?.filter(
      isHydratedCartItem
    ) ?? []
  );
}

function getCategoryId(
  category:
    | ProductCategory
    | undefined
) {
  if (!category) {
    return null;
  }

  if (
    typeof category === "string"
  ) {
    return category;
  }

  return category._id;
}

function normalizeSelectedSize(
  selectedSize:
    | string
    | null
    | undefined
) {
  if (
    typeof selectedSize !== "string"
  ) {
    return null;
  }

  const cleanSize =
    selectedSize.trim();

  return cleanSize || null;
}

function normalizeSelectedColor(
  selectedColor:
    | string
    | null
    | undefined
) {
  if (
    typeof selectedColor !== "string"
  ) {
    return null;
  }

  const cleanColor =
    selectedColor.trim();

  return cleanColor || null;
}

function getCartVariantKey(
  item: HydratedCartItem
) {
  if (item._id) {
    return item._id;
  }

  const selectedSize =
    normalizeSelectedSize(
      item.selectedSize
    )?.toLowerCase() ??
    "no-size";

  const selectedColor =
    normalizeSelectedColor(
      item.selectedColor
    )?.toLowerCase() ??
    "no-color";

  return `${item.product._id}::${selectedSize}::${selectedColor}`;
}

function getProductCartQuantity(
  cartItems: HydratedCartItem[],
  productId: string
) {
  return cartItems.reduce(
    (totalQuantity, item) => {
      if (
        item.product._id !== productId
      ) {
        return totalQuantity;
      }

      return (
        totalQuantity +
        Number(item.quantity || 0)
      );
    },
    0
  );
}

function formatPrice(price: number) {
  return `৳${price.toLocaleString(
    "en-BD"
  )}`;
}

function notifyCartUpdated(
  cart?: CartData
) {
  window.dispatchEvent(
    new CustomEvent("cart-updated", {
      detail: {
        cart,
        source: "cart-page",
        openDrawer: false,
      },
    })
  );
}

/* =========================================================
   CART PAGE
========================================================= */

export default function CartPageClient() {
  const [
    cartItems,
    setCartItems,
  ] = useState<HydratedCartItem[]>(
    []
  );

  const [
    relatedProducts,
    setRelatedProducts,
  ] = useState<Product[]>(
    []
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /*
    Product ID নয়, exact Cart Item বা
    Product + Size variant key রাখা হচ্ছে।
  */

  const [
    processingVariantKey,
    setProcessingVariantKey,
  ] = useState("");

  /* =======================================================
     LOAD GUEST CART DATA
  ======================================================= */

  const loadCart = useCallback(
    async (
      showLoadingState = true
    ) => {
      try {
        if (showLoadingState) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const guestId =
          getOrCreateGuestId();

        if (!guestId) {
          throw new Error(
            "Guest cart could not be initialized."
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/api/cart/${guestId}`,
          {
            method: "GET",
            cache: "no-store",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              "X-Tenant-Id":
                TENANT_ID,
            },
          }
        );

        const data: CartApiResponse =
          await response.json();

        /*
          নতুন Guest-এর Cart document
          তৈরি না হলে backend 404 দিতে পারে।

          এটিকে Empty Cart হিসেবে ধরা হবে।
        */

        if (response.status === 404) {
          setCartItems([]);
          setRelatedProducts([]);
          setErrorMessage("");

          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Cart could not be loaded."
          );
        }

        const actualCartItems =
          getHydratedItems(
            data.cart
          );

        setCartItems(
          actualCartItems
        );

        setErrorMessage("");
      } catch (error) {
        console.error(
          "Guest cart page loading error:",
          error
        );

        setCartItems([]);
        setRelatedProducts([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "কার্ট লোড করা যায়নি।"
        );
      } finally {
        if (showLoadingState) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadCart(true);
  }, [loadCart]);

  /* =======================================================
     REFRESH AFTER GLOBAL CART UPDATE
  ======================================================= */

  useEffect(() => {
    const handleCartUpdated =
      () => {
        void loadCart(false);
      };

    window.addEventListener(
      "cart-updated",
      handleCartUpdated
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        handleCartUpdated
      );
    };
  }, [loadCart]);

  /* =======================================================
     LOAD SAME-CATEGORY RELATED PRODUCTS
  ======================================================= */

  useEffect(() => {
    let isComponentActive = true;

    const loadRelatedProducts =
      async () => {
        if (
          cartItems.length === 0
        ) {
          setRelatedProducts([]);
          return;
        }

        const cartCategoryIds =
          new Set(
            cartItems
              .map((item) =>
                getCategoryId(
                  item.product.category
                )
              )
              .filter(
                (
                  categoryId
                ): categoryId is string =>
                  Boolean(categoryId)
              )
          );

        if (
          cartCategoryIds.size === 0
        ) {
          setRelatedProducts([]);
          return;
        }

        /*
          একই product ভিন্ন size-এ Cart-এ
          থাকলেও Related Products থেকে
          product একবারই বাদ যাবে।
        */

        const cartProductIds =
          new Set(
            cartItems.map(
              (item) =>
                item.product._id
            )
          );

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/products`,
              {
                method: "GET",
                cache: "no-store",

                headers: {
                  Accept:
                    "application/json",

                  "Content-Type":
                    "application/json",

                  "X-Tenant-Id":
                    TENANT_ID,
                },
              }
            );

          const data:
            ProductsApiResponse =
            await response.json();

          if (!response.ok) {
            const apiMessage =
              Array.isArray(data)
                ? undefined
                : data.message;

            throw new Error(
              apiMessage ||
                "Related products could not be loaded."
            );
          }

          const allProducts =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data.products
                  )
                ? data.products
                : [];

          const sameCategoryProducts =
            allProducts.filter(
              (product) => {
                const categoryId =
                  getCategoryId(
                    product.category
                  );

                if (!categoryId) {
                  return false;
                }

                const hasSameCategory =
                  cartCategoryIds.has(
                    categoryId
                  );

                const isAlreadyInCart =
                  cartProductIds.has(
                    product._id
                  );

                return (
                  hasSameCategory &&
                  !isAlreadyInCart
                );
              }
            );

          if (isComponentActive) {
            setRelatedProducts(
              sameCategoryProducts
            );
          }
        } catch (error) {
          console.error(
            "Related products loading error:",
            error
          );

          if (isComponentActive) {
            setRelatedProducts([]);
          }
        }
      };

    void loadRelatedProducts();

    return () => {
      isComponentActive = false;
    };
  }, [cartItems]);

  /* =======================================================
     UPDATE CART VARIANT QUANTITY
  ======================================================= */

  const updateQuantity = async (
    item: HydratedCartItem,
    nextQuantity: number
  ) => {
    if (
      nextQuantity < 1 ||
      processingVariantKey
    ) {
      return;
    }

    const productId =
      item.product._id;

    const currentProductQuantity =
      getProductCartQuantity(
        cartItems,
        productId
      );

    const otherVariantQuantity =
      currentProductQuantity -
      item.quantity;

    const nextTotalProductQuantity =
      otherVariantQuantity +
      nextQuantity;

    /*
      একই product-এর M, L, XL সব variant
      মিলিয়ে stock validation।
    */

    if (
      item.product.stock !==
        undefined &&
      nextTotalProductQuantity >
        item.product.stock
    ) {
      setErrorMessage(
        "Requested quantity exceeds available stock."
      );

      return;
    }

    const guestId =
      getOrCreateGuestId();

    if (!guestId) {
      setErrorMessage(
        "Guest cart could not be initialized."
      );

      return;
    }

    const variantKey =
      getCartVariantKey(item);

    try {
      setProcessingVariantKey(
        variantKey
      );

      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/cart`,
        {
          method: "PATCH",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "X-Tenant-Id":
              TENANT_ID,
          },

          body: JSON.stringify({
            guestId,

            productId,

            quantity: nextQuantity,

            /*
              Size থাকলে value যাবে।
              Size না থাকলে null যাবে।
            */

            selectedSize:
              normalizeSelectedSize(
                item.selectedSize
              ),

            selectedColor:
              normalizeSelectedColor(
                item.selectedColor
              ),

          }),
        }
      );

      const data: CartApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Cart quantity could not be updated."
        );
      }

      /*
        Backend response-এর updated cart
        সরাসরি UI-তে apply হচ্ছে।
      */

      setCartItems(
        getHydratedItems(
          data.cart
        )
      );

      notifyCartUpdated(
        data.cart
      );
    } catch (error) {
      console.error(
        "Guest cart quantity update error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "কার্টের quantity পরিবর্তন করা যায়নি।"
      );
    } finally {
      setProcessingVariantKey("");
    }
  };

  /* =======================================================
     REMOVE EXACT PRODUCT VARIANT
  ======================================================= */

  const removeItem = async (
    item: HydratedCartItem
  ) => {
    if (processingVariantKey) {
      return;
    }

    const guestId =
      getOrCreateGuestId();

    if (!guestId) {
      setErrorMessage(
        "Guest cart could not be initialized."
      );

      return;
    }

    const variantKey =
      getCartVariantKey(item);

    try {
      setProcessingVariantKey(
        variantKey
      );

      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/cart`,
        {
          method: "DELETE",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "X-Tenant-Id":
              TENANT_ID,
          },

          body: JSON.stringify({
            guestId,

            productId:
              item.product._id,

            /*
              শুধু নির্দিষ্ট size variant
              remove করার জন্য।
            */

            selectedSize:
              normalizeSelectedSize(
                item.selectedSize
              ),

            selectedColor:
              normalizeSelectedColor(
                item.selectedColor
              ),
          }),
        }
      );

      const data: CartApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Product could not be removed."
        );
      }

      setCartItems(
        getHydratedItems(
          data.cart
        )
      );

      notifyCartUpdated(
        data.cart
      );
    } catch (error) {
      console.error(
        "Remove guest cart product error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "কার্ট থেকে পণ্য সরানো যায়নি।"
      );
    } finally {
      setProcessingVariantKey("");
    }
  };

  /* =======================================================
     CART CALCULATIONS
  ======================================================= */

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (totalAmount, item) =>
        totalAmount +
        item.product.price *
          item.quantity,
      0
    );
  }, [cartItems]);

  const totalProductQuantity =
    useMemo(() => {
      return cartItems.reduce(
        (totalQuantity, item) =>
          totalQuantity +
          item.quantity,
        0
      );
    }, [cartItems]);

  const deliveryCharge =
    cartItems.length > 0
      ? 80
      : 0;

  const total =
    subtotal + deliveryCharge;

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#F7F8FA_0%,#FFFFFF_48%,#F7F8FA_100%)] py-5 sm:py-7 lg:py-10">
      <section className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
        {/* =================================================
            MODERN PAGE HEADER
        ================================================= */}

        <header className="relative mb-6 overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-7 sm:py-7 lg:mb-8 lg:px-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-orange-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FF6900]"
              >
                <ArrowLeft
                  size={15}
                  className="text-[#FF6900]"
                />

                Continue Shopping
              </Link>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B1F3A] text-white shadow-lg shadow-slate-900/10 sm:h-14 sm:w-14">
                  <ShoppingBag
                    size={24}
                  />
                </div>

                <div className="min-w-0">

                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-3xl lg:text-[36px] lg:leading-[1.15]">
                    Your Orders
                  </h1>

                </div>
              </div>
            </div>

            {!isLoading &&
              cartItems.length > 0 && (
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[310px]">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Total Items
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-lg font-extrabold text-[#FF6900]">
                      <ShoppingBag
                        size={17}
                      />

                      {totalProductQuantity}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-[#F8F9FB] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      Cart Total
                    </p>

                    <p className="mt-1 text-lg font-extrabold text-[#0B1F3A]">
                      {formatPrice(total)}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </header>

        {/* =================================================
            LOADING STATE
        ================================================= */}

        {isLoading ? (
          <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="grid min-h-[390px] place-items-center px-5 py-16 text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-[#FF6900]"
                  />
                </div>

                <p className="mt-5 text-base font-bold text-[#0B1F3A]">
                  Loading your cart
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  আপনার পণ্যগুলো প্রস্তুত করা হচ্ছে...
                </p>
              </div>
            </div>
          </div>
        ) : errorMessage &&
          cartItems.length === 0 ? (
          /* ===============================================
             ERROR STATE
          =============================================== */

          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[28px] border border-red-100 bg-white px-5 py-16 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500">
              <ShoppingBag
                size={35}
              />
            </div>

            <h2 className="mt-6 text-xl font-extrabold text-[#0B1F3A] sm:text-2xl">
              Cart could not be loaded
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
              {errorMessage}
            </p>

            <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  void loadCart(true)
                }
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#FF6900] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#E85F00] hover:shadow-lg"
              >
                Try Again
              </button>

              <Link
                href="/shop"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 px-6 text-sm font-bold text-gray-700 transition-all hover:border-[#FF6900] hover:bg-orange-50 hover:text-[#FF6900]"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          /* ===============================================
             EMPTY CART
          =============================================== */

          <div className="relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-gray-200 bg-white px-5 py-16 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-orange-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-slate-100 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border border-orange-100 bg-orange-50 text-[#FF6900] shadow-sm">
                <ShoppingBag
                  size={40}
                />
              </div>

              <h2 className="mt-7 text-2xl font-extrabold text-[#0B1F3A] sm:text-3xl">
                Your Cart is Empty
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
                এখনো কোনো পণ্য যোগ করা হয়নি। পছন্দের পণ্য খুঁজে কার্টে যোগ করুন।
              </p>

              <Link
                href="/shop"
                className="mt-7 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-7 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E85F00] hover:shadow-xl"
              >
                Start Shopping

                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        ) : (
          /* ===============================================
             ACTUAL CART
          =============================================== */

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            {/* =============================================
                CART PRODUCTS
            ============================================= */}

            <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">

              <div className="space-y-3 bg-[#F8F9FB] p-3 sm:p-4">
                {cartItems.map(
                  (item) => {
                    const variantKey =
                      getCartVariantKey(
                        item
                      );

                    const itemSubtotal =
                      item.product.price *
                      item.quantity;

                    const isProcessing =
                      processingVariantKey ===
                      variantKey;

                    const selectedSize =
                      normalizeSelectedSize(
                        item.selectedSize
                      );

                    const selectedColor =
                      normalizeSelectedColor(
                        item.selectedColor
                      );

                    const productLink =
                      item.product.slug
                        ? `/product/${item.product.slug}`
                        : `/product/${item.product._id}`;

                    const currentProductQuantity =
                      getProductCartQuantity(
                        cartItems,
                        item.product._id
                      );

                    const reachedMaximumStock =
                      item.product.stock !==
                        undefined &&
                      currentProductQuantity >=
                        item.product.stock;

                    return (
                      <article
                        key={variantKey}
                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:p-5"
                      >
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_140px_160px_130px_44px] lg:items-center">
                          {/* PRODUCT INFORMATION */}

                          <div className="flex min-w-0 items-center gap-4 pr-11 lg:pr-0">
                            <Link
                              href={productLink}
                              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#F8F9FB] transition-all duration-300 group-hover:border-orange-200 sm:h-28 sm:w-28"
                            >
                              {item.product
                                .image ? (
                                <Image
                                  src={
                                    item
                                      .product
                                      .image
                                  }
                                  alt={
                                    item
                                      .product
                                      .name
                                  }
                                  fill
                                  sizes="112px"
                                  className="object-contain p-2.5 transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-medium text-gray-400">
                                  No Image
                                </div>
                              )}
                            </Link>

                            <div className="min-w-0">
                              <Link
                                href={productLink}
                                className="line-clamp-2 text-base font-extrabold leading-6 text-[#0B1F3A] transition-colors hover:text-[#FF6900] sm:text-lg"
                              >
                                {
                                  item.product
                                    .name
                                }
                              </Link>

                              {(selectedSize ||
                                selectedColor) && (
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                  {selectedSize && (
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-600">
                                      Size:{" "}
                                      {
                                        selectedSize
                                      }
                                    </span>
                                  )}

                                  {selectedColor && (
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-600">
                                      Color:{" "}
                                      {
                                        selectedColor
                                      }
                                    </span>
                                  )}
                                </div>
                              )}

                              {item.product
                                .stock !==
                                undefined && (
                                <p
                                  className={`mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold ${
                                    item.product
                                      .stock > 0
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      item.product
                                        .stock > 0
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                                    }`}
                                  />

                                  {item.product
                                    .stock > 0
                                    ? "In Stock"
                                    : "Out of Stock"}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* PRODUCT PRICE */}

                          <div className="flex items-center justify-between border-t border-gray-100 pt-4 lg:block lg:border-0 lg:pt-0">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 lg:hidden">
                              Price
                            </span>

                            <div>
                              <p className="hidden text-[10px] font-bold uppercase tracking-wide text-gray-400 lg:block">
                                Unit Price
                              </p>

                              <p className="mt-0.5 text-sm font-extrabold text-[#0B1F3A] sm:text-base">
                                {formatPrice(
                                  item.product
                                    .price
                                )}
                              </p>
                            </div>
                          </div>

                          {/* QUANTITY CONTROL */}

                          <div className="flex items-center justify-between lg:justify-center">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 lg:hidden">
                              Quantity
                            </span>

                            <div className="inline-flex h-11 items-center overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity -
                                      1
                                  )
                                }
                                disabled={
                                  isProcessing ||
                                  item.quantity <=
                                    1
                                }
                                className="flex h-full w-10 items-center justify-center text-gray-500 transition hover:bg-orange-50 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label={`Decrease quantity of ${item.product.name}`}
                              >
                                <Minus
                                  size={16}
                                />
                              </button>

                              <span className="flex h-full min-w-11 items-center justify-center border-x border-gray-300 px-2 text-sm font-extrabold text-[#0B1F3A]">
                                {isProcessing ? (
                                  <LoaderCircle
                                    size={16}
                                    className="animate-spin text-[#FF6900]"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity +
                                      1
                                  )
                                }
                                disabled={
                                  isProcessing ||
                                  reachedMaximumStock
                                }
                                className="flex h-full w-10 items-center justify-center text-gray-500 transition hover:bg-orange-50 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label={`Increase quantity of ${item.product.name}`}
                              >
                                <Plus
                                  size={16}
                                />
                              </button>
                            </div>
                          </div>

                          {/* PRODUCT SUBTOTAL */}

                          <div className="flex items-center justify-between lg:block lg:text-right">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 lg:hidden">
                              Subtotal
                            </span>

                            <div>
                              <p className="hidden text-[10px] font-bold uppercase tracking-wide text-gray-400 lg:block">
                                Subtotal
                              </p>

                              <p className="mt-0.5 text-base font-extrabold text-[#FF6900]">
                                {formatPrice(
                                  itemSubtotal
                                )}
                              </p>
                            </div>
                          </div>

                          {/* REMOVE EXACT VARIANT */}

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(item)
                            }
                            disabled={
                              isProcessing
                            }
                            aria-label={`Remove ${item.product.name}${
                              selectedSize
                                ? ` size ${selectedSize}`
                                : ""
                            }${
                              selectedColor
                                ? ` color ${selectedColor}`
                                : ""
                            }`}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:right-5 sm:top-5 lg:static lg:justify-self-end"
                          >
                            {isProcessing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={17}
                              />
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </div>

            {/* =============================================
                MODERN ORDER SUMMARY
            ============================================= */}

            <aside className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)] xl:sticky xl:top-5">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#FF6900] via-[#FF8A3D] to-[#FFB17A]" />

              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
                      Checkout Details
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-[#0B1F3A]">
                      Order Summary
                    </h2>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                    <ShoppingBag
                      size={21}
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-[#FAFBFC] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Total Products
                    </span>

                    <span className="font-extrabold text-[#0B1F3A]">
                      {
                        totalProductQuantity
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span className="font-extrabold text-[#0B1F3A]">
                      {formatPrice(
                        subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Delivery Charge
                    </span>

                    <span className="font-extrabold text-[#0B1F3A]">
                      {formatPrice(
                        deliveryCharge
                      )}
                    </span>
                  </div>
                </div>

                <div className="my-6 border-t border-dashed border-gray-300" />

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-500">
                      Total Amount
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      Delivery charge included
                    </p>
                  </div>

                  <span className="text-2xl font-black tracking-tight text-[#FF6900] sm:text-[28px]">
                    {formatPrice(total)}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 text-center text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E85F00] hover:shadow-xl sm:text-base"
                >
                  Proceed to Checkout

                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/shop"
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 text-sm font-bold text-gray-700 transition-all duration-300 hover:border-[#FF6900] hover:bg-orange-50 hover:text-[#FF6900]"
                >
                  <ArrowLeft size={17} />

                  Continue Shopping
                </Link>

                {/* CHECKOUT INFORMATION */}

                <div className="mt-6 grid gap-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                      <ShieldCheck
                        size={19}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-[#0B1F3A]">
                        Secure Checkout
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-gray-500">
                        Your information is processed securely.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                      <Truck
                        size={19}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-[#0B1F3A]">
                        Cash on Delivery
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-gray-500">
                        Pay after receiving your order.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* =================================================
            NON-BLOCKING ERROR
        ================================================= */}

        {errorMessage &&
          cartItems.length > 0 && (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 shadow-sm"
            >
              {errorMessage}
            </p>
          )}

        {/* =================================================
            RELATED PRODUCTS
        ================================================= */}

        {!isLoading &&
          cartItems.length > 0 &&
          relatedProducts.length > 0 && (
            <RelatedProductsCarousel
              products={
                relatedProducts
              }
              title="Related Products"
              showAllText="Show All"
              showAllLink="/shop"
              autoSlide
              autoSlideInterval={
                4000
              }
            />
          )}
      </section>
    </main>
  );
}