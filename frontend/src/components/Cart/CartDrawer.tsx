"use client";

import Image from "next/image";
import Link from "next/link";

import {
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useCartDrawer,
} from "@/src/context/CartDrawerContext";

import {
  getOrCreateGuestId,
} from "@/src/utils/guestCart";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type CartProduct = {
  _id: string;
  name: string;
  slug?: string;
  price: number;
  image?: string;
  stock?: number;
  sizes?: string[];
};

type CartItem = {
  _id?: string;

  product:
    | CartProduct
    | string
    | null;

  quantity: number;

  /*
    Product-এর selected size শুধু size option থাকলে থাকবে।
    Size ছাড়া product-এর জন্য এটি null/undefined থাকবে।
  */
  selectedSize?: string | null;
};

type HydratedCartItem = CartItem & {
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

/* =========================================================
   HELPERS
========================================================= */

function isHydratedCartItem(
  item: CartItem
): item is HydratedCartItem {
  return (
    typeof item.product === "object" &&
    item.product !== null &&
    typeof item.product._id === "string"
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

function getCartItemKey(
  item: HydratedCartItem
) {
  return (
    item._id ||
    `${item.product._id}::${
      item.selectedSize?.trim() ||
      "no-size"
    }`
  );
}

function formatPrice(price: number) {
  return `৳${price.toLocaleString(
    "en-BD"
  )}`;
}

/* =========================================================
   CART DRAWER
========================================================= */

export default function CartDrawer() {
  const {
    isCartDrawerOpen,
    cartRefreshKey,
    closeCartDrawer,
  } = useCartDrawer();

  const [
    cartItems,
    setCartItems,
  ] = useState<HydratedCartItem[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    processingItemKey,
    setProcessingItemKey,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     LOAD GUEST CART
  ======================================================= */

  useEffect(() => {
    if (!isCartDrawerOpen) {
      return;
    }

    let isComponentActive = true;

    const loadCart = async () => {
      try {
        if (isComponentActive) {
          setIsLoading(true);
          setErrorMessage("");
        }

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
              "Content-Type":
                "application/json",
            },
          }
        );

        const data: CartApiResponse =
          await response.json();

        /*
          Guest-এর জন্য এখনও cart document তৈরি না
          হয়ে থাকলে backend 404 পাঠাতে পারে।

          এটিকে error না দেখিয়ে empty cart হিসেবে
          গ্রহণ করা হচ্ছে।
        */

        if (response.status === 404) {
          if (isComponentActive) {
            setCartItems([]);
            setErrorMessage("");
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Cart could not be loaded."
          );
        }

        if (isComponentActive) {
          setCartItems(
            getHydratedItems(data.cart)
          );

          setErrorMessage("");
        }
      } catch (error) {
        console.error(
          "Guest cart loading error:",
          error
        );

        if (isComponentActive) {
          setCartItems([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "কার্ট লোড করা যায়নি।"
          );
        }
      } finally {
        if (isComponentActive) {
          setIsLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      isComponentActive = false;
    };
  }, [
    isCartDrawerOpen,
    cartRefreshKey,
  ]);

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

  /* =======================================================
     UPDATE GUEST CART QUANTITY
  ======================================================= */

  const updateQuantity = async (
    item: HydratedCartItem,
    nextQuantity: number
  ) => {
    if (
      nextQuantity < 1 ||
      processingItemKey
    ) {
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

    try {
      setProcessingItemKey(
        getCartItemKey(item)
      );

      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/cart`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            guestId,

            productId:
              item.product._id,

            quantity: nextQuantity,

            selectedSize:
              item.selectedSize ??
              null,
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
        API response-এর updated cart সরাসরি
        Drawer-এ দেখানো হচ্ছে।
      */

      setCartItems(
        getHydratedItems(data.cart)
      );

      /*
        Header cart count এবং অন্যান্য cart
        component refresh করার signal।
      */

      window.dispatchEvent(
        new CustomEvent("cart-updated", {
          detail: {
            guestId,
            productId:
              item.product._id,
            selectedSize:
              item.selectedSize ??
              null,
            cart: data.cart,
          },
        })
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
      setProcessingItemKey("");
    }
  };

  /* =======================================================
     REMOVE PRODUCT FROM GUEST CART
  ======================================================= */

  const removeProduct = async (
    item: HydratedCartItem
  ) => {
    if (processingItemKey) {
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

    try {
      setProcessingItemKey(
        getCartItemKey(item)
      );

      setErrorMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/cart`,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            guestId,

            productId:
              item.product._id,

            selectedSize:
              item.selectedSize ??
              null,
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

      /*
        Updated cart response সরাসরি UI-তে
        apply করা হচ্ছে।
      */

      setCartItems(
        getHydratedItems(data.cart)
      );

      window.dispatchEvent(
        new CustomEvent("cart-updated", {
          detail: {
            guestId,
            productId:
              item.product._id,
            selectedSize:
              item.selectedSize ??
              null,
            cart: data.cart,
          },
        })
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
      setProcessingItemKey("");
    }
  };

  return (
    <>
      {/* ===================================================
          DARK OVERLAY
      =================================================== */}

      <button
        type="button"
        aria-label="Close shopping cart"
        onClick={closeCartDrawer}
        className={`fixed inset-0 z-[90] bg-black/60 transition-opacity duration-300 ${
          isCartDrawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ===================================================
          DRAWER
      =================================================== */}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isCartDrawerOpen}
        className={`fixed bottom-0 right-0 top-0 z-[100] flex w-full max-w-[430px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isCartDrawerOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        {/* =================================================
            DRAWER HEADER
        ================================================= */}

        <div className="flex h-[66px] shrink-0 items-center justify-between border-b border-gray-200 px-5 sm:px-6">
          <h2 className="text-lg font-bold text-[#0B1F3A]">
            Shopping Cart
          </h2>

          <button
            type="button"
            onClick={closeCartDrawer}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition hover:text-[#FF6900]"
          >
            <X size={20} />

            <span>Close</span>
          </button>
        </div>

        {/* =================================================
            DRAWER CONTENT
        ================================================= */}

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isLoading ? (
            /* =============================================
               LOADING
            ============================================= */

            <div className="flex min-h-[260px] items-center justify-center">
              <LoaderCircle
                size={30}
                className="animate-spin text-[#FF6900]"
              />
            </div>
          ) : errorMessage &&
            cartItems.length === 0 ? (
            /* =============================================
               ERROR
            ============================================= */

            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <ShoppingBag size={28} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-[#0B1F3A]">
                Cart could not be loaded
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(
                      "cart-updated"
                    )
                  );
                }}
                className="mt-5 rounded-full bg-[#FF6900] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#e85f00]"
              >
                Try Again
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            /* =============================================
               EMPTY CART
            ============================================= */

            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                <ShoppingBag size={28} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-[#0B1F3A]">
                Your Cart is Empty
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                পছন্দের Product সমূহ Cart এ যোগ করে
                shopping শুরু করুন।
              </p>

              <Link
                href="/shop"
                onClick={closeCartDrawer}
                className="mt-5 rounded-full bg-[#FF6900] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#e85f00]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            /* =============================================
               CART ITEMS
            ============================================= */

            <div className="divide-y divide-gray-200">
              {cartItems.map((item) => {
                const itemKey =
                  getCartItemKey(item);

                const isProcessing =
                  processingItemKey ===
                  itemKey;

                const productLink =
                  item.product.slug
                    ? `/product/${item.product.slug}`
                    : `/product/${item.product._id}`;

                /*
                  একই product-এর ভিন্ন size variant থাকলেও
                  সব variant-এর quantity যোগ করে stock limit
                  হিসাব করা হচ্ছে।
                */
                const totalProductQuantity =
                  cartItems.reduce(
                    (
                      totalQuantity,
                      cartItem
                    ) => {
                      if (
                        cartItem.product._id !==
                        item.product._id
                      ) {
                        return totalQuantity;
                      }

                      return (
                        totalQuantity +
                        cartItem.quantity
                      );
                    },
                    0
                  );

                const reachedMaximumStock =
                  item.product.stock !==
                    undefined &&
                  totalProductQuantity >=
                    item.product.stock;

                return (
                  <article
                    key={itemKey}
                    className="py-5 first:pt-0"
                  >
                    <div className="flex items-start gap-3">
                      {/* ===================================
                          PRODUCT IMAGE
                      =================================== */}

                      <Link
                        href={productLink}
                        onClick={closeCartDrawer}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                      >
                        {item.product.image ? (
                          <Image
                            src={
                              item.product.image
                            }
                            alt={
                              item.product.name
                            }
                            fill
                            sizes="80px"
                            className="object-contain p-1.5"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <ShoppingBag
                              size={24}
                            />
                          </div>
                        )}
                      </Link>

                      {/* ===================================
                          PRODUCT DETAILS
                      =================================== */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={productLink}
                            onClick={
                              closeCartDrawer
                            }
                            className="line-clamp-2 text-sm font-bold leading-5 text-[#0B1F3A] transition hover:text-[#FF6900]"
                          >
                            {item.product.name}
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              removeProduct(item)
                            }
                            disabled={
                              isProcessing
                            }
                            aria-label={`Remove ${item.product.name}${
                              item.selectedSize
                                ? `, size ${item.selectedSize}`
                                : ""
                            }`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}
                          </button>
                        </div>

                        {item.selectedSize && (
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            Size:{" "}
                            <span className="text-[#0B1F3A]">
                              {item.selectedSize}
                            </span>
                          </p>
                        )}

                        <p className="mt-1 text-sm font-bold text-[#FF6900]">
                          {formatPrice(
                            item.product.price
                          )}
                        </p>

                        {/* =================================
                            QUANTITY
                        ================================= */}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-gray-300">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item,
                                  item.quantity - 1
                                )
                              }
                              disabled={
                                isProcessing ||
                                item.quantity <= 1
                              }
                              className="flex h-full w-9 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={15} />
                            </button>

                            <span className="flex h-full min-w-9 items-center justify-center border-x border-gray-300 px-2 text-sm font-bold text-[#0B1F3A]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                isProcessing ||
                                reachedMaximumStock
                              }
                              className="flex h-full w-9 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <p className="text-sm font-bold text-[#0B1F3A]">
                            {formatPrice(
                              item.product.price *
                                item.quantity
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* =================================================
              NON-BLOCKING ERROR MESSAGE
          ================================================= */}

          {errorMessage &&
            cartItems.length > 0 && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {errorMessage}
              </p>
            )}
        </div>

        {/* =================================================
            DRAWER FOOTER
        ================================================= */}

        {cartItems.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-base font-bold text-[#0B1F3A]">
                Subtotal
              </span>

              <span className="text-lg font-bold text-[#FF6900]">
                {formatPrice(subtotal)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Link
                href="/cart"
                onClick={closeCartDrawer}
                className="flex h-12 items-center justify-center rounded-lg border border-[#FF6900] text-sm font-bold text-[#FF6900] transition hover:bg-orange-50"
              >
                VIEW CART
              </Link>

              <Link
                href="/checkout"
                onClick={closeCartDrawer}
                className="flex h-12 items-center justify-center rounded-lg bg-[#FF6900] text-sm font-bold text-white transition hover:bg-[#e85f00]"
              >
                CHECKOUT
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}