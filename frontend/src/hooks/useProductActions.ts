"use client";

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import type {
  CartApiResponse,
  CartUpdateSource,
  Product,
} from "../types/product";

import {
  getProductLink,
  isProductInStock,
  requiresVariantSelection,
} from "@/src/utils/productHelpers";

import {
  getOrCreateGuestId,
} from "@/src/utils/guestCart";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

const CHECKOUT_CART_SNAPSHOT_KEY =
  "townmela_checkout_cart_snapshot";

const CHECKOUT_CART_SNAPSHOT_MAX_AGE =
  30_000;

/*
  একাধিক ProductCard render হলেও Checkout route
  শুধু একবার prefetch হবে।
*/
let checkoutRoutePrefetched = false;

/* =========================================================
   CART RESPONSE ITEM TYPE
========================================================= */

type CartResponseItem =
  NonNullable<
    NonNullable<
      CartApiResponse["cart"]
    >["items"]
  >[number];

/* =========================================================
   GET PRODUCT ID FROM CART ITEM
========================================================= */

function getCartItemProductId(
  item:
    | CartResponseItem
    | undefined,
) {
  if (!item?.product) {
    return null;
  }

  if (
    typeof item.product ===
    "string"
  ) {
    return item.product;
  }

  return item.product._id;
}

/* =========================================================
   CHECK WHETHER CART WAS EMPTY BEFORE BUY NOW

   POST response-এর পরে যদি cart-এ শুধু নতুন product
   quantity 1 হিসেবে থাকে, তাহলে বোঝা যাবে cart আগে
   empty ছিল।
========================================================= */

function wasCartEmptyBeforeAdd(
  cart: CartApiResponse["cart"],
  productId: string,
) {
  const cartItems =
    cart?.items ?? [];

  if (cartItems.length !== 1) {
    return false;
  }

  const [cartItem] =
    cartItems;

  return (
    getCartItemProductId(
      cartItem,
    ) === productId &&
    Number(
      cartItem?.quantity ?? 0,
    ) === 1 &&
    !cartItem?.selectedSize &&
    !cartItem?.selectedColor
  );
}

/* =========================================================
   DISPATCH CART UPDATED EVENT
========================================================= */

function dispatchCartUpdated({
  guestId,
  productId,
  cart,
  source,
  openDrawer,
}: {
  guestId: string;
  productId: string;
  cart: CartApiResponse["cart"];
  source: CartUpdateSource;
  openDrawer: boolean;
}) {
  window.dispatchEvent(
    new CustomEvent(
      "cart-updated",
      {
        detail: {
          guestId,
          productId,
          cart,
          source,
          openDrawer,
        },
      },
    ),
  );
}

/* =========================================================
   SAVE CHECKOUT CART SNAPSHOT

   Empty cart থেকে Buy Now হলে Checkout page দ্রুত
   product দেখানোর জন্য updated cart সাময়িকভাবে
   sessionStorage-এ রাখা হবে।
========================================================= */

function saveCheckoutCartSnapshot(
  guestId: string,
  cart: CartApiResponse["cart"],
) {
  if (
    typeof window ===
      "undefined" ||
    !cart
  ) {
    return;
  }

  try {
    const currentTime =
      Date.now();

    window.sessionStorage.setItem(
      CHECKOUT_CART_SNAPSHOT_KEY,
      JSON.stringify({
        guestId,
        savedAt: currentTime,
        expiresAt:
          currentTime +
          CHECKOUT_CART_SNAPSHOT_MAX_AGE,
        cart,
      }),
    );
  } catch {
    /*
      sessionStorage unavailable হলেও Checkout
      page normal Cart API ব্যবহার করে কাজ করবে।
    */
  }
}

/* =========================================================
   SHARED PRODUCT ACTION HOOK
========================================================= */

export function useProductActions(
  product: Product,
) {
  const router = useRouter();

  const [
    isAdding,
    setIsAdding,
  ] = useState(false);

  const [
    isBuying,
    setIsBuying,
  ] = useState(false);

  const [
    isAdded,
    setIsAdded,
  ] = useState(false);

  const addedResetTimeoutRef =
    useRef<number | null>(null);

  const productLink =
    getProductLink(product);

  const needsOptions =
    requiresVariantSelection(
      product,
    );

  const isOutOfStock =
    !isProductInStock(product);

  /* =======================================================
     PREFETCH CHECKOUT ROUTE
  ======================================================= */

  useEffect(() => {
    if (checkoutRoutePrefetched) {
      return;
    }

    router.prefetch("/checkout");

    checkoutRoutePrefetched =
      true;
  }, [router]);

  /* =======================================================
     CLEAR TIMEOUT ON UNMOUNT
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        addedResetTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          addedResetTimeoutRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     SHOW TEMPORARY ADDED STATE
  ======================================================= */

  const showAddedState =
    useCallback(() => {
      setIsAdded(true);

      if (
        addedResetTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          addedResetTimeoutRef.current,
        );
      }

      addedResetTimeoutRef.current =
        window.setTimeout(() => {
          setIsAdded(false);

          addedResetTimeoutRef.current =
            null;
        }, 1500);
    }, []);

  /* =======================================================
     ADD NON-VARIANT PRODUCT TO GUEST CART
  ======================================================= */

  const addProductToGuestCart =
    useCallback(
      async (
        guestId: string,
      ) => {
        const response =
          await fetch(
            `${API_BASE_URL}/api/cart`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                guestId,
                productId:
                  product._id,
                quantity: 1,
                selectedSize: null,
                selectedColor: null,
              }),
            },
          );

        const data: CartApiResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to add product to cart.",
          );
        }

        return data;
      },
      [product._id],
    );

  /* =======================================================
     CART ICON ACTION

     Size অথবা Color থাকলে:
     Product Details page খুলবে।

     Size এবং Color না থাকলে:
     Product সরাসরি Guest Cart-এ যোগ হবে এবং
     Cart Drawer খুলবে।
  ======================================================= */

  const handleCartButtonClick =
    useCallback(
      async (
        event: MouseEvent<HTMLButtonElement>,
      ) => {
        event.preventDefault();
        event.stopPropagation();

        if (needsOptions) {
          router.push(productLink);
          return;
        }

        if (
          isAdding ||
          isBuying ||
          isOutOfStock
        ) {
          return;
        }

        const guestId =
          getOrCreateGuestId();

        if (!guestId) {
          window.alert(
            "Guest cart could not be initialized. Please refresh the page and try again.",
          );

          return;
        }

        try {
          setIsAdding(true);
          setIsAdded(false);

          const cartData =
            await addProductToGuestCart(
              guestId,
            );

          dispatchCartUpdated({
            guestId,
            productId:
              product._id,
            cart: cartData.cart,
            source: "add-to-cart",
            openDrawer: true,
          });

          showAddedState();
        } catch (error) {
          console.error(
            "Add to guest cart error:",
            error,
          );

          window.alert(
            error instanceof Error
              ? error.message
              : "Product could not be added to cart.",
          );
        } finally {
          setIsAdding(false);
        }
      },
      [
        addProductToGuestCart,
        isAdding,
        isBuying,
        isOutOfStock,
        needsOptions,
        product._id,
        productLink,
        router,
        showAddedState,
      ],
    );

  /* =======================================================
     BUY NOW ACTION

     Size অথবা Color থাকলে:
     Product Details page খুলবে।

     Size এবং Color না থাকলে:
     একটি Cart POST request হবে।

     Cart আগে empty থাকলে:
     Header cart count update হবে, Drawer বন্ধ থাকবে,
     snapshot save হবে এবং Checkout page খুলবে।

     Cart আগে empty না থাকলে:
     Header cart count update হবে এবং Cart Drawer খুলবে।
  ======================================================= */

  const handleBuyNow =
    useCallback(
      async (
        event: MouseEvent<HTMLButtonElement>,
      ) => {
        event.preventDefault();
        event.stopPropagation();

        if (needsOptions) {
          router.push(productLink);
          return;
        }

        if (
          isAdding ||
          isBuying ||
          isOutOfStock
        ) {
          return;
        }

        const guestId =
          getOrCreateGuestId();

        if (!guestId) {
          window.alert(
            "Guest cart could not be initialized. Please refresh the page and try again.",
          );

          return;
        }

        try {
          setIsBuying(true);

          const cartData =
            await addProductToGuestCart(
              guestId,
            );

          const cartWasEmpty =
            wasCartEmptyBeforeAdd(
              cartData.cart,
              product._id,
            );

          if (cartWasEmpty) {
            saveCheckoutCartSnapshot(
              guestId,
              cartData.cart,
            );

            dispatchCartUpdated({
              guestId,
              productId:
                product._id,
              cart: cartData.cart,
              source: "buy-now",
              openDrawer: false,
            });

            router.push(
              "/checkout",
            );

            return;
          }

          dispatchCartUpdated({
            guestId,
            productId:
              product._id,
            cart: cartData.cart,
            source: "add-to-cart",
            openDrawer: true,
          });

          showAddedState();
        } catch (error) {
          console.error(
            "Buy Now error:",
            error,
          );

          window.alert(
            error instanceof Error
              ? error.message
              : "Product could not be prepared.",
          );
        } finally {
          setIsBuying(false);
        }
      },
      [
        addProductToGuestCart,
        isAdding,
        isBuying,
        isOutOfStock,
        needsOptions,
        product._id,
        productLink,
        router,
        showAddedState,
      ],
    );

  return {
    productLink,

    needsOptions,
    isOutOfStock,

    isAdding,
    isBuying,
    isAdded,

    handleCartButtonClick,
    handleBuyNow,
  };
}