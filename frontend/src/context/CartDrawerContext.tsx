"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type CartUpdatedEventDetail = {
  source?:
    | "add-to-cart"
    | "buy-now";
  openDrawer?: boolean;
};

type CartDrawerContextValue = {
  isCartDrawerOpen: boolean;
  cartRefreshKey: number;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  refreshCartDrawer: () => void;
};

type CartDrawerProviderProps = {
  children: ReactNode;
};

const CartDrawerContext =
  createContext<CartDrawerContextValue | null>(
    null,
  );

export function CartDrawerProvider({
  children,
}: CartDrawerProviderProps) {
  const [
    isCartDrawerOpen,
    setIsCartDrawerOpen,
  ] = useState(false);

  const [
    cartRefreshKey,
    setCartRefreshKey,
  ] = useState(0);

  const openCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(true);
  }, []);

  const closeCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(false);
  }, []);

  const toggleCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(
      (currentValue) => !currentValue,
    );
  }, []);

  const refreshCartDrawer = useCallback(() => {
    setCartRefreshKey(
      (currentValue) => currentValue + 1,
    );
  }, []);

  useEffect(() => {
    /*
      Every cart-updated event refreshes the
      Header cart number and Cart Drawer data.

      Default behavior:
      open the Cart Drawer.

      Buy Now behavior:
      when openDrawer is false or source is
      "buy-now", refresh the cart number but
      keep the Cart Drawer closed.
    */
    const handleCartUpdated = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<CartUpdatedEventDetail>;

      refreshCartDrawer();

      const shouldKeepDrawerClosed =
        customEvent.detail
          ?.openDrawer === false ||
        customEvent.detail?.source ===
          "buy-now";

      if (shouldKeepDrawerClosed) {
        closeCartDrawer();
        return;
      }

      openCartDrawer();
    };

    const handleOpenCartDrawer = () => {
      openCartDrawer();
    };

    const handleCloseCartDrawer = () => {
      closeCartDrawer();
    };

    window.addEventListener(
      "cart-updated",
      handleCartUpdated,
    );

    window.addEventListener(
      "open-cart-drawer",
      handleOpenCartDrawer,
    );

    window.addEventListener(
      "close-cart-drawer",
      handleCloseCartDrawer,
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        handleCartUpdated,
      );

      window.removeEventListener(
        "open-cart-drawer",
        handleOpenCartDrawer,
      );

      window.removeEventListener(
        "close-cart-drawer",
        handleCloseCartDrawer,
      );
    };
  }, [
    closeCartDrawer,
    openCartDrawer,
    refreshCartDrawer,
  ]);

  useEffect(() => {
    const handleEscapeKey = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        isCartDrawerOpen
      ) {
        closeCartDrawer();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscapeKey,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscapeKey,
      );
    };
  }, [
    closeCartDrawer,
    isCartDrawerOpen,
  ]);

  const contextValue: CartDrawerContextValue = {
    isCartDrawerOpen,
    cartRefreshKey,
    openCartDrawer,
    closeCartDrawer,
    toggleCartDrawer,
    refreshCartDrawer,
  };

  return (
    <CartDrawerContext.Provider
      value={contextValue}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const context = useContext(
    CartDrawerContext,
  );

  if (!context) {
    throw new Error(
      "useCartDrawer must be used inside CartDrawerProvider.",
    );
  }

  return context;
}