"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";

import type {
  Product,
  ProductCategory,
} from "@/src/types/product";

import { getOrCreateGuestId } from "@/src/utils/guestCart";

import {
  bangladeshDistricts,
  getDistrictById,
  getDivisionById,
  getPoliceStationById,
  getPoliceStationsByDistrict,
  type BilingualLocation,
  type DistrictLocation,
  type PoliceStationLocation,
} from "@/src/data/bangladeshLocations";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "";

const getStorefrontApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return API_BASE_URL;
  }

  const hostname =
    window.location.hostname;

  const isLocalRequest =
    [
      "localhost",
      "127.0.0.1",
      "::1",
    ].includes(hostname);

  return isLocalRequest
    ? API_BASE_URL
    : window.location.origin;
};

const getStorefrontTenantHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return TENANT_ID
      ? {
          "X-Tenant-Id":
            TENANT_ID,
        }
      : {};
  }

  const hostname =
    window.location.hostname;

  const isLocalRequest =
    [
      "localhost",
      "127.0.0.1",
      "::1",
    ].includes(hostname);

  return isLocalRequest &&
    TENANT_ID
    ? {
        "X-Tenant-Id":
          TENANT_ID,
      }
    : {};
};

const DELIVERY_CHARGE =
  Number(process.env.NEXT_PUBLIC_DELIVERY_CHARGE ?? 80) || 0;

const CHECKOUT_CART_SNAPSHOT_KEY =
  "townmela_checkout_cart_snapshot";

const CHECKOUT_CART_SNAPSHOT_MAX_AGE =
  30_000;

/* =========================================================
   TYPES
========================================================= */

type CheckoutFormData = {
  fullName: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  policeStation: string;
  area: string;
  address: string;
};

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

  product: CartProduct | string | null;

  quantity: number;

  selectedSize?: string | null;
  selectedColor?: string | null;
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

type CheckoutCartSnapshot = {
  guestId: string;
  savedAt: number;
  expiresAt?: number;
  cart: CartData;
};

type CartUpdatedEventDetail = {
  guestId?: string;
  cart?: CartData;
  openDrawer?: boolean;
  source?: string;
};

type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      message?: string;
    };

type OrderApiResponse = {
  success?: boolean;
  message?: string;

  order?: {
    _id: string;
    orderNumber?: string;

    subtotalAmount?: number;
    deliveryCharge?: number;
    discountAmount?: number;
    totalAmount?: number;

    paymentMethod?: string;
    paymentStatus?: string;
    orderStatus?: string;

    [key: string]: unknown;
  };
};

type LocationErrors = {
  district: string;
  policeStation: string;
};

type SearchableDropdownProps<T extends BilingualLocation> = {
  id: string;
  label: string;
  options: readonly T[];
  searchText: string;
  selectedId: string;
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  error?: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: T) => void;
};

/* =========================================================
   INITIAL DATA
========================================================= */

const initialFormData: CheckoutFormData = {
  fullName: "",
  phone: "",
  email: "",
  division: "",
  district: "",
  policeStation: "",
  area: "",
  address: "",
};

const initialLocationErrors: LocationErrors = {
  district: "",
  policeStation: "",
};

/* =========================================================
   GUEST CART HELPERS
========================================================= */

function isHydratedCartItem(item: CartItem): item is HydratedCartItem {
  return (
    typeof item.product === "object" &&
    item.product !== null &&
    typeof item.product._id === "string"
  );
}

function getCartItemKey(item: HydratedCartItem) {
  return (
    item._id ??
    [item.product._id, item.selectedSize ?? "", item.selectedColor ?? ""].join(
      "::",
    )
  );
}

function getCategoryId(category: ProductCategory | undefined) {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    return category;
  }

  return category._id;
}

function formatPrice(price: number) {
  return `৳${price.toLocaleString("en-BD")}`;
}

function notifyCartUpdated(
  guestId?: string,
  cart?: CartData,
) {
  window.dispatchEvent(
    new CustomEvent("cart-updated", {
      detail: {
        guestId,
        cart,
        source: "checkout",
        openDrawer: false,
      },
    }),
  );
}

/* =========================================================
   FAST CHECKOUT CART SNAPSHOT
========================================================= */

function getHydratedItems(
  cart?: CartData,
) {
  return (
    cart?.items?.filter(
      isHydratedCartItem,
    ) ?? []
  );
}

function readCheckoutCartSnapshot(
  guestId: string,
) {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const rawSnapshot =
      window.sessionStorage.getItem(
        CHECKOUT_CART_SNAPSHOT_KEY,
      );

    if (!rawSnapshot) {
      return null;
    }

    const snapshot =
      JSON.parse(
        rawSnapshot,
      ) as CheckoutCartSnapshot;

    const expiresAt =
      snapshot.expiresAt ??
      snapshot.savedAt +
        CHECKOUT_CART_SNAPSHOT_MAX_AGE;

    if (
      snapshot.guestId !==
        guestId ||
      Date.now() > expiresAt
    ) {
      window.sessionStorage.removeItem(
        CHECKOUT_CART_SNAPSHOT_KEY,
      );

      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
}

function saveCheckoutCartSnapshot(
  guestId: string,
  cart?: CartData,
) {
  if (
    typeof window === "undefined" ||
    !cart
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      CHECKOUT_CART_SNAPSHOT_KEY,
      JSON.stringify({
        guestId,
        savedAt: Date.now(),
        expiresAt:
          Date.now() +
          CHECKOUT_CART_SNAPSHOT_MAX_AGE,
        cart,
      } satisfies CheckoutCartSnapshot),
    );
  } catch {
    /*
      Snapshot fail হলেও API cart load
      স্বাভাবিকভাবে কাজ করবে।
    */
  }
}

function clearCheckoutCartSnapshot() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      CHECKOUT_CART_SNAPSHOT_KEY,
    );
  } catch {
    // No action required.
  }
}


/* =========================================================
   SEARCH HELPERS
========================================================= */

function getLocationLabel(location: BilingualLocation) {
  return `${location.bn} (${location.en})`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

/*
  Search priority:

  1. Exact match
  2. নামের শুরুতে match
  3. কোনো word-এর শুরুতে match
  4. নামের মাঝখানে match
*/
function getLocationMatchRank(location: BilingualLocation, searchText: string) {
  const query = normalizeSearchText(searchText);

  if (!query) {
    return 0;
  }

  const banglaName = normalizeSearchText(location.bn);

  const englishName = normalizeSearchText(location.en);

  const names = [banglaName, englishName];

  if (names.some((name) => name === query)) {
    return 0;
  }

  if (names.some((name) => name.startsWith(query))) {
    return 1;
  }

  if (
    names.some((name) => name.split(" ").some((word) => word.startsWith(query)))
  ) {
    return 2;
  }

  if (names.some((name) => name.includes(query))) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function filterLocations<T extends BilingualLocation>(
  locations: readonly T[],
  searchText: string,
  selectedId: string,
) {
  const selectedLocation = locations.find(
    (location) => location.id === selectedId,
  );

  /*
    Selected item input-এ থাকলে focus করার সময়
    সম্পূর্ণ list দেখাবে।
  */
  if (selectedLocation && searchText === getLocationLabel(selectedLocation)) {
    return [...locations];
  }

  const query = normalizeSearchText(searchText);

  if (!query) {
    return [...locations];
  }

  return locations
    .map((location) => ({
      location,
      rank: getLocationMatchRank(location, query),
    }))
    .filter((result) => result.rank !== Number.POSITIVE_INFINITY)
    .sort((firstResult, secondResult) => {
      if (firstResult.rank !== secondResult.rank) {
        return firstResult.rank - secondResult.rank;
      }

      return firstResult.location.bn.localeCompare(
        secondResult.location.bn,
        "bn",
      );
    })
    .map((result) => result.location);
}

/* =========================================================
   SEARCHABLE LOCATION DROPDOWN
========================================================= */

function SearchableLocationDropdown<T extends BilingualLocation>({
  id,
  label,
  options,
  searchText,
  selectedId,
  placeholder,
  emptyMessage,
  disabled = false,
  disabledPlaceholder = "",
  error = "",
  onSearchChange,
  onSelect,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filteredOptions = useMemo(() => {
    return filterLocations(options, searchText, selectedId);
  }, [options, searchText, selectedId]);

  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(-1);
  }, [filteredOptions, isOpen]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const clickedElement = event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(clickedElement)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleOptionSelect = (option: T) => {
    onSelect(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyboardNavigation = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setActiveIndex((currentIndex) => {
        if (filteredOptions.length === 0) {
          return -1;
        }

        return Math.min(currentIndex + 1, filteredOptions.length - 1);
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setActiveIndex((currentIndex) => {
        if (filteredOptions.length === 0) {
          return -1;
        }

        return Math.max(currentIndex - 1, 0);
      });

      return;
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      const activeOption = filteredOptions[activeIndex];

      if (activeOption) {
        event.preventDefault();

        handleOptionSelect(activeOption);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-[#172033]"
      >
        {label}

        <span className="ml-1 text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={searchText}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-options`}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onClick={(event) => {
            if (disabled) {
              return;
            }

            setIsOpen(true);

            if (selectedId) {
              event.currentTarget.select();
            }
          }}
          onChange={(event) => {
            onSearchChange(event.target.value);

            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyboardNavigation}
          placeholder={disabled ? disabledPlaceholder : placeholder}
          className={`h-12 w-full rounded-xl border bg-white px-4 pr-11 text-sm text-[#222222] outline-none transition placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
              : "border-[#cbd5e1] focus:border-[#e11d48] focus:ring-[#e11d48]/10"
          }`}
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
          ▾
        </span>
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      )}

      {isOpen && !disabled && (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, optionIndex) => {
              const isSelected = option.id === selectedId;

              const isActive = optionIndex === activeIndex;

              return (
                <button
                  key={option.id}
                  ref={(element) => {
                    optionRefs.current[optionIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => handleOptionSelect(option)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left transition ${
                    isSelected
                      ? "bg-red-50 text-[#e11d48]"
                      : isActive
                        ? "bg-gray-100 text-[#222222]"
                        : "text-[#222222] hover:bg-gray-100"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.bn}</span>

                  <span className="mt-0.5 block text-xs text-gray-500">
                    {option.en}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-5 text-center text-sm text-gray-500">
              {emptyMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CHECKOUT PAGE
========================================================= */

export default function CheckoutPageClient() {
  const router = useRouter();

  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);

  const [checkoutItems, setCheckoutItems] = useState<HydratedCartItem[]>([]);

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const [isCartLoading, setIsCartLoading] = useState(true);

  const [cartErrorMessage, setCartErrorMessage] = useState("");

  const [processingCartItemKey, setProcessingCartItemKey] = useState("");

  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);

  const [orderErrorMessage, setOrderErrorMessage] = useState("");

  const [selectedDistrictId, setSelectedDistrictId] = useState("");

  const [selectedPoliceStationId, setSelectedPoliceStationId] = useState("");

  const [districtSearch, setDistrictSearch] = useState("");

  const [policeStationSearch, setPoliceStationSearch] = useState("");

  const [locationErrors, setLocationErrors] = useState<LocationErrors>(
    initialLocationErrors,
  );

  /* =======================================================
     LOAD ACTUAL GUEST CART DATA
  ======================================================= */

  const loadCart = useCallback(async (showLoadingState = true) => {
    const guestId = getOrCreateGuestId();

    if (!guestId) {
      setCheckoutItems([]);
      setRelatedProducts([]);

      setCartErrorMessage(
        "Guest cart চালু করা যায়নি। Page refresh করে আবার চেষ্টা করুন।",
      );

      setIsCartLoading(false);

      return;
    }

    try {
      if (showLoadingState) {
        setIsCartLoading(true);
      }

      setCartErrorMessage("");

      const response = await fetch(
        `${getStorefrontApiBaseUrl()}/api/cart/${encodeURIComponent(guestId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...getStorefrontTenantHeaders(),
          },
        },
      );

      const data: CartApiResponse = await response.json();

      if (response.status === 404) {
        setCheckoutItems([]);
        setRelatedProducts([]);
        setCartErrorMessage("");
        clearCheckoutCartSnapshot();

        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Cart could not be loaded.");
      }

      const actualCartItems =
        getHydratedItems(
          data.cart,
        );

      setCheckoutItems(
        actualCartItems,
      );

      saveCheckoutCartSnapshot(
        guestId,
        data.cart,
      );
    } catch (error) {
      console.error("Checkout guest cart loading error:", error);

      /*
        Initial load fail করলে error দেখাবে।
        Background revalidation fail করলে আগে
        দেখানো snapshot/cart UI অক্ষত থাকবে।
      */
      if (showLoadingState) {
        setCheckoutItems([]);
        setRelatedProducts([]);

        setCartErrorMessage(
          error instanceof Error ? error.message : "কার্ট লোড করা যায়নি।",
        );
      }
    } finally {
      if (showLoadingState) {
        setIsCartLoading(false);
      }
    }
  }, []);

  /* =======================================================
     INITIAL GUEST CART LOAD
  ======================================================= */

  useEffect(() => {
    const guestId =
      getOrCreateGuestId();

    if (!guestId) {
      void loadCart(true);
      return;
    }

    const snapshot =
      readCheckoutCartSnapshot(
        guestId,
      );

    if (snapshot) {
      /*
        Buy Now-এর product Order Summary-তে
        instantly দেখাবে। Loading box-এর জন্য
        customer-কে অপেক্ষা করতে হবে না।
      */
      setCheckoutItems(
        getHydratedItems(
          snapshot.cart,
        ),
      );

      setIsCartLoading(false);
      setCartErrorMessage("");

      /*
        Order Summary প্রথমে instant render হবে।
        Server verification কিছুক্ষণ পরে
        background-এ চলবে, তাই opening smooth থাকবে।
      */
      const revalidationTimer =
        window.setTimeout(() => {
          void loadCart(false);
        }, 1200);

      return () => {
        window.clearTimeout(
          revalidationTimer,
        );
      };
    }

    void loadCart(true);
  }, [loadCart]);

  /* =======================================================
     REFRESH CHECKOUT CART AFTER GLOBAL UPDATE
  ======================================================= */

  useEffect(() => {
    const handleCartUpdated = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<CartUpdatedEventDetail>;

      const guestId =
        customEvent.detail?.guestId ??
        getOrCreateGuestId();

      const eventCart =
        customEvent.detail?.cart;

      if (
        guestId &&
        eventCart
      ) {
        setCheckoutItems(
          getHydratedItems(
            eventCart,
          ),
        );

        setIsCartLoading(false);
        setCartErrorMessage("");

        saveCheckoutCartSnapshot(
          guestId,
          eventCart,
        );

        return;
      }

      void loadCart(false);
    };

    window.addEventListener(
      "cart-updated",
      handleCartUpdated,
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        handleCartUpdated,
      );
    };
  }, [loadCart]);

  /* =======================================================
     LOAD SAME-CATEGORY RELATED PRODUCTS
  ======================================================= */

  useEffect(() => {
    let isComponentActive = true;

    const loadRelatedProducts = async () => {
      if (checkoutItems.length === 0) {
        setRelatedProducts([]);
        return;
      }

      const checkoutCategoryIds = new Set(
        checkoutItems
          .map((item) => getCategoryId(item.product.category))
          .filter((categoryId): categoryId is string => Boolean(categoryId)),
      );

      if (checkoutCategoryIds.size === 0) {
        setRelatedProducts([]);
        return;
      }

      const checkoutProductIds = new Set(
        checkoutItems.map((item) => item.product._id),
      );

      try {
        const response = await fetch(`${getStorefrontApiBaseUrl()}/api/products`, {
          method: "GET",
          cache: "no-store",

          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...getStorefrontTenantHeaders(),
          },
        });

        const data: ProductsApiResponse = await response.json();

        if (!response.ok) {
          const apiMessage = Array.isArray(data) ? undefined : data.message;

          throw new Error(
            apiMessage || "Related products could not be loaded.",
          );
        }

        const allProducts = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : [];

        const sameCategoryProducts = allProducts.filter((product) => {
          const categoryId = getCategoryId(product.category);

          if (!categoryId) {
            return false;
          }

          const hasSameCategory = checkoutCategoryIds.has(categoryId);

          const isAlreadyInCheckout = checkoutProductIds.has(product._id);

          return hasSameCategory && !isAlreadyInCheckout;
        });

        if (isComponentActive) {
          setRelatedProducts(sameCategoryProducts);
        }
      } catch (error) {
        console.error("Checkout related products loading error:", error);

        if (isComponentActive) {
          setRelatedProducts([]);
        }
      }
    };

    const timeoutId =
      window.setTimeout(() => {
        void loadRelatedProducts();
      }, 1200);

    return () => {
      isComponentActive = false;
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [checkoutItems]);

  /* =======================================================
     ORDER CALCULATIONS
  ======================================================= */

  const subtotal = useMemo(() => {
    return checkoutItems.reduce(
      (totalAmount, item) => totalAmount + item.product.price * item.quantity,
      0,
    );
  }, [checkoutItems]);

  /*
    Backend order controller বর্তমানে DELIVERY_CHARGE
    environment value ব্যবহার করে। Frontend-এ একই
    value রাখতে NEXT_PUBLIC_DELIVERY_CHARGE ব্যবহার করুন।
  */
  const deliveryCharge = checkoutItems.length === 0 ? 0 : DELIVERY_CHARGE;

  const deliveryLabel = "Delivery Charge";

  const total = subtotal + deliveryCharge;

  /* =======================================================
     UPDATE CHECKOUT QUANTITY
  ======================================================= */

  const updateCheckoutQuantity = async (
    item: HydratedCartItem,
    nextQuantity: number,
  ) => {
    if (nextQuantity < 1 || processingCartItemKey) {
      return;
    }

    if (item.product.stock !== undefined && nextQuantity > item.product.stock) {
      return;
    }

    const guestId = getOrCreateGuestId();

    if (!guestId) {
      setCartErrorMessage("Guest cart চালু করা যায়নি।");

      return;
    }

    const itemKey = getCartItemKey(item);

    try {
      setProcessingCartItemKey(itemKey);

      setCartErrorMessage("");

      const response = await fetch(`${getStorefrontApiBaseUrl()}/api/cart`, {
        method: "PATCH",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...getStorefrontTenantHeaders(),
        },

        body: JSON.stringify({
          guestId,
          productId: item.product._id,
          quantity: nextQuantity,
          selectedSize: item.selectedSize ?? null,
          selectedColor: item.selectedColor ?? null,
        }),
      });

      const data: CartApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cart quantity could not be updated.");
      }

      if (data.cart) {
        const updatedItems =
          getHydratedItems(
            data.cart,
          );

        setCheckoutItems(
          updatedItems,
        );

        saveCheckoutCartSnapshot(
          guestId,
          data.cart,
        );
      } else {
        setCheckoutItems((currentItems) =>
          currentItems.map((currentItem) =>
            getCartItemKey(currentItem) === itemKey
              ? {
                  ...currentItem,
                  quantity: nextQuantity,
                }
              : currentItem,
          ),
        );
      }

      notifyCartUpdated(
        guestId,
        data.cart,
      );
    } catch (error) {
      console.error("Checkout quantity update error:", error);

      setCartErrorMessage(
        error instanceof Error
          ? error.message
          : "কার্টের quantity পরিবর্তন করা যায়নি।",
      );
    } finally {
      setProcessingCartItemKey("");
    }
  };

  /* =======================================================
     REMOVE CHECKOUT PRODUCT VARIANT
  ======================================================= */

  const removeCheckoutItem = async (item: HydratedCartItem) => {
    if (processingCartItemKey) {
      return;
    }

    const guestId = getOrCreateGuestId();

    if (!guestId) {
      setCartErrorMessage("Guest cart চালু করা যায়নি।");

      return;
    }

    const itemKey = getCartItemKey(item);

    try {
      setProcessingCartItemKey(itemKey);

      setCartErrorMessage("");

      const response = await fetch(`${getStorefrontApiBaseUrl()}/api/cart`, {
        method: "DELETE",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...getStorefrontTenantHeaders(),
        },

        body: JSON.stringify({
          guestId,
          productId: item.product._id,
          selectedSize: item.selectedSize ?? null,
          selectedColor: item.selectedColor ?? null,
        }),
      });

      const data: CartApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Product could not be removed.");
      }

      if (data.cart) {
        const updatedItems =
          getHydratedItems(
            data.cart,
          );

        setCheckoutItems(
          updatedItems,
        );

        saveCheckoutCartSnapshot(
          guestId,
          data.cart,
        );
      } else {
        setCheckoutItems((currentItems) =>
          currentItems.filter(
            (currentItem) => getCartItemKey(currentItem) !== itemKey,
          ),
        );
      }

      notifyCartUpdated(
        guestId,
        data.cart,
      );
    } catch (error) {
      console.error("Checkout product removal error:", error);

      setCartErrorMessage(
        error instanceof Error ? error.message : "কার্ট থেকে পণ্য সরানো যায়নি।",
      );
    } finally {
      setProcessingCartItemKey("");
    }
  };

  /*
    শুধু নির্বাচিত জেলার উপজেলা এবং
    Metropolitan police station list আসবে।
  */
  const districtPoliceStations = useMemo(() => {
    return getPoliceStationsByDistrict(selectedDistrictId);
  }, [selectedDistrictId]);

  /* =======================================================
     DISTRICT FUNCTIONS
  ======================================================= */

  const handleDistrictSelect = (district: DistrictLocation) => {
    const selectedDivision = getDivisionById(district.divisionId);

    setSelectedDistrictId(district.id);

    setDistrictSearch(getLocationLabel(district));

    setSelectedPoliceStationId("");

    setPoliceStationSearch("");

    setLocationErrors({
      district: "",
      policeStation: "",
    });

    setFormData((currentData) => ({
      ...currentData,
      division: selectedDivision?.bn ?? "",
      district: district.bn,
      policeStation: "",
      area: "",
    }));
  };

  const handleDistrictSearchChange = (value: string) => {
    setDistrictSearch(value);

    setSelectedDistrictId("");
    setSelectedPoliceStationId("");

    setPoliceStationSearch("");

    setLocationErrors({
      district: "",
      policeStation: "",
    });

    setFormData((currentData) => ({
      ...currentData,
      division: "",
      district: "",
      policeStation: "",
      area: "",
    }));
  };

  /* =======================================================
     POLICE STATION FUNCTIONS
  ======================================================= */

  const handlePoliceStationSelect = (policeStation: PoliceStationLocation) => {
    if (policeStation.districtId !== selectedDistrictId) {
      setSelectedPoliceStationId("");

      setPoliceStationSearch("");

      setLocationErrors((currentErrors) => ({
        ...currentErrors,
        policeStation: "এই থানা/উপজেলাটি নির্বাচিত জেলার অন্তর্ভুক্ত নয়।",
      }));

      return;
    }

    setSelectedPoliceStationId(policeStation.id);

    setPoliceStationSearch(getLocationLabel(policeStation));

    setLocationErrors((currentErrors) => ({
      ...currentErrors,
      policeStation: "",
    }));

    setFormData((currentData) => ({
      ...currentData,
      policeStation: policeStation.bn,
      area: policeStation.bn,
    }));
  };

  const handlePoliceStationSearchChange = (value: string) => {
    setPoliceStationSearch(value);

    setSelectedPoliceStationId("");

    setLocationErrors((currentErrors) => ({
      ...currentErrors,
      policeStation: "",
    }));

    setFormData((currentData) => ({
      ...currentData,
      policeStation: "",
      area: "",
    }));
  };

  /* =======================================================
     GUEST COD CHECKOUT SUBMIT
  ======================================================= */

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isOrderSubmitting) {
      return;
    }

    setOrderErrorMessage("");

    const selectedDistrict = getDistrictById(selectedDistrictId);

    const selectedPoliceStation = getPoliceStationById(
      selectedDistrictId,
      selectedPoliceStationId,
    );

    const nextErrors: LocationErrors = {
      district: "",
      policeStation: "",
    };

    if (!selectedDistrict) {
      nextErrors.district = "তালিকা থেকে একটি সঠিক জেলা নির্বাচন করুন।";
    }

    if (!selectedPoliceStation) {
      nextErrors.policeStation =
        "তালিকা থেকে একটি সঠিক থানা/উপজেলা নির্বাচন করুন।";
    } else if (selectedPoliceStation.districtId !== selectedDistrictId) {
      nextErrors.policeStation =
        "নির্বাচিত থানা/উপজেলাটি এই জেলার অন্তর্ভুক্ত নয়।";
    }

    setLocationErrors(nextErrors);

    if (
      nextErrors.district ||
      nextErrors.policeStation ||
      checkoutItems.length === 0 ||
      isCartLoading
    ) {
      return;
    }

    const fullName = formData.fullName.trim();

    const phone = formData.phone.trim();

    const email = formData.email.trim();

    const deliveryAddress = formData.address.trim();

    if (!fullName || !phone || !deliveryAddress) {
      setOrderErrorMessage("নাম, ফোন নম্বর এবং ডেলিভারি ঠিকানা পূরণ করুন।");

      return;
    }

    if (!/^01\d{9}$/.test(phone)) {
      setOrderErrorMessage("সঠিক ১১ সংখ্যার বাংলাদেশি ফোন নম্বর লিখুন।");

      return;
    }

    const guestId = getOrCreateGuestId();

    if (!guestId) {
      setOrderErrorMessage(
        "Guest checkout চালু করা যায়নি। Page refresh করে আবার চেষ্টা করুন।",
      );

      return;
    }

    try {
      setIsOrderSubmitting(true);
      setOrderErrorMessage("");

      const orderResponse = await fetch(`${getStorefrontApiBaseUrl()}/api/orders`, {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...getStorefrontTenantHeaders(),
        },

        body: JSON.stringify({
          guestId,

          customer: {
            fullName,
            phone,
            email: email || undefined,
          },

          shippingAddress: {
            division: formData.division,
            district: formData.district,
            area: formData.area || formData.policeStation,
            address: deliveryAddress,
          },

          paymentMethod: "COD",
        }),
      });

      const orderData = (await orderResponse.json()) as OrderApiResponse;

      if (!orderResponse.ok) {
        throw new Error(orderData.message || "অর্ডার তৈরি করা যায়নি।");
      }

      const successfulOrder = orderData.order ?? null;

      const orderId = successfulOrder?._id;

      const orderNumber = successfulOrder?.orderNumber;

      /*
        Order Success Page-এ order response এবং
        checkout summary fallback হিসেবে রাখা হচ্ছে।
      */
      localStorage.setItem(
        "lastSuccessfulOrder",
        JSON.stringify({
          order: successfulOrder,

          customer: {
            fullName,
            phone,
            email,

            division: formData.division,
            district: formData.district,
            policeStation: formData.policeStation,
            address: deliveryAddress,
          },

          shippingAddress: {
            division: formData.division,
            district: formData.district,
            area: formData.area || formData.policeStation,
            address: deliveryAddress,
          },

          items: checkoutItems.map((item) => ({
            productId: item.product._id,
            name: item.product.name,
            image: item.product.image ?? "",
            price: item.product.price,
            quantity: item.quantity,

            selectedSize: item.selectedSize ?? "",
            selectedColor: item.selectedColor ?? "",

            /*
                পুরোনো success page compatibility।
              */
            size: item.selectedSize ?? "",
            color: item.selectedColor ?? "",
          })),

          subtotal: successfulOrder?.subtotalAmount ?? subtotal,

          deliveryCharge: successfulOrder?.deliveryCharge ?? deliveryCharge,

          totalAmount: successfulOrder?.totalAmount ?? total,

          paymentMethod: "COD",
          guestId,
          orderId,
          orderNumber,
        }),
      );

      setCheckoutItems([]);
      setRelatedProducts([]);
      clearCheckoutCartSnapshot();

      notifyCartUpdated(
        guestId,
        {
          guestId,
          items: [],
        },
      );

      if (orderNumber) {
        router.push(
          `/order-success?orderNumber=${encodeURIComponent(orderNumber)}`,
        );

        return;
      }

      if (orderId) {
        router.push(`/order-success?orderId=${encodeURIComponent(orderId)}`);

        return;
      }

      router.push("/order-success");
    } catch (error) {
      console.error("Guest COD checkout error:", error);

      setOrderErrorMessage(
        error instanceof Error
          ? error.message
          : "অর্ডার সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#f7f7f7] py-6 sm:py-8 lg:py-10">
      <section className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]"
        >
          {/* =================================================
              DELIVERY INFORMATION
          ================================================= */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <h2 className="text-xl font-bold text-[#111827] sm:text-[22px]">
              Delivery Information
            </h2>

            <div className="mt-7 grid grid-cols-1 gap-5">
              {/* Full Name */}

              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  আপনার নাম
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={(event) =>
                    setFormData((currentData) => ({
                      ...currentData,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="আপনার নাম লিখুন"
                  className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-sm text-[#222222] outline-none transition placeholder:text-gray-400 focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10"
                />
              </div>

              {/* Phone */}

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  ফোন
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  minLength={11}
                  maxLength={11}
                  value={formData.phone}
                  onChange={(event) => {
                    const phoneNumber = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 11);

                    setFormData((currentData) => ({
                      ...currentData,
                      phone: phoneNumber,
                    }));
                  }}
                  placeholder="ফোন নম্বর ইংরেজিতে লিখুন"
                  className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-sm text-[#222222] outline-none transition placeholder:text-gray-400 focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10"
                />
              </div>

              {/* Email Address */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  ই-মেইল এড্রেস
                  <span className="ml-1 font-medium text-gray-400">
                    (Optional)
                  </span>
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((currentData) => ({
                      ...currentData,
                      email: event.target.value,
                    }))
                  }
                  placeholder="অর্ডারের আপডেট আপনি ই-মেইলের মাধ্যমে পাবেন"
                  className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-sm text-[#222222] outline-none transition placeholder:text-gray-400 focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10"
                />
              </div>

              {/* Searchable District */}

              <SearchableLocationDropdown
                id="districtSearch"
                label="জেলা"
                options={bangladeshDistricts}
                searchText={districtSearch}
                selectedId={selectedDistrictId}
                placeholder="বাংলা বা ইংরেজিতে জেলা খুঁজুন"
                emptyMessage="কোনো জেলা পাওয়া যায়নি"
                error={locationErrors.district}
                onSearchChange={handleDistrictSearchChange}
                onSelect={handleDistrictSelect}
              />

              {/* Searchable Police Station */}

              <SearchableLocationDropdown
                key={`police-station-${selectedDistrictId || "empty"}`}
                id="policeStationSearch"
                label="থানা/উপজেলা"
                options={districtPoliceStations}
                searchText={policeStationSearch}
                selectedId={selectedPoliceStationId}
                disabled={!selectedDistrictId}
                placeholder="বাংলা বা ইংরেজিতে থানা/উপজেলা খুঁজুন"
                disabledPlaceholder="প্রথমে জেলা নির্বাচন করুন"
                emptyMessage="এই জেলার কোনো matching থানা/উপজেলা পাওয়া যায়নি"
                error={locationErrors.policeStation}
                onSearchChange={handlePoliceStationSearchChange}
                onSelect={handlePoliceStationSelect}
              />

              {/* Delivery Address */}

              <div className="w-full">
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-bold text-[#172033]"
                >
                  ডেলিভারি ঠিকানা
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <textarea
                  id="address"
                  name="address"
                  rows={4}
                  required
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={(event) =>
                    setFormData((currentData) => ({
                      ...currentData,
                      address: event.target.value,
                    }))
                  }
                  placeholder="যেখানে আপনি ডেলিভারি নিতে চান তার সম্পূর্ণ ঠিকানা লিখুন"
                  className="min-h-[110px] w-full resize-none rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#222222] outline-none transition placeholder:text-gray-400 focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/10"
                />
              </div>

              {/* Delivery Instruction */}

              <div className="w-full">
                <div className="w-full rounded-2xl border border-[#e11d48]/20 bg-gradient-to-r from-[#fff4f6] via-[#fff9fa] to-white px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e11d48]/10 text-lg font-bold text-[#e11d48]">
                      ✓
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-7 text-[#172033] sm:text-lg">
                        দ্রুত ও নির্ভুল ডেলিভারি নিশ্চিত করতে আপনার তথ্য
                        সঠিকভাবে পূরণ করুন।
                      </h3>

                      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-gray-500">
                        অর্ডার নিশ্চিত করার আগে ফোন নম্বর, জেলা, থানা/উপজেলা এবং
                        ডেলিভারি ঠিকানা পুনরায় যাচাই করুন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-5">
            <div className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-[#222222]">
                Order Summary
              </h2>

              {/* Product Table Header */}

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_100px] gap-3 border-b border-gray-200 pb-4 text-xs font-bold uppercase tracking-wide text-[#222222]">
                <span>Product</span>

                <span className="text-right">Subtotal</span>
              </div>

              {/* Ordered Products */}

              {isCartLoading ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center border-b border-gray-200 py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#e11d48]" />

                  <p className="mt-3 text-sm font-semibold text-gray-500">
                    Loading your cart...
                  </p>
                </div>
              ) : cartErrorMessage && checkoutItems.length === 0 ? (
                <div className="border-b border-gray-200 py-10 text-center">
                  <p className="text-sm font-semibold leading-6 text-red-500">
                    {cartErrorMessage}
                  </p>

                  <Link
                    href="/shop"
                    className="mt-3 inline-block text-sm font-bold text-[#e11d48]"
                  >
                    Continue Shopping
                  </Link>
                </div>
              ) : checkoutItems.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {checkoutItems.map((item) => {
                    const itemSubtotal = item.product.price * item.quantity;

                    const itemKey = getCartItemKey(item);

                    const isProcessing = processingCartItemKey === itemKey;

                    return (
                      <article
                        key={itemKey}
                        className="grid grid-cols-[minmax(0,1fr)_100px] gap-3 py-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Remove Product */}

                          <button
                            type="button"
                            onClick={() => removeCheckoutItem(item)}
                            disabled={isProcessing}
                            aria-label={`Remove ${item.product.name}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-gray-500 transition hover:bg-red-50 hover:text-[#e11d48] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? "..." : "×"}
                          </button>

                          {/* Product Image */}

                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            {item.product.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                fill
                                sizes="56px"
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>

                          {/* Product Information */}

                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#222222]">
                              {item.product.name}
                            </h3>

                            {(item.selectedSize || item.selectedColor) && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.selectedSize && (
                                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                    Size: {item.selectedSize}
                                  </span>
                                )}

                                {item.selectedColor && (
                                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                    Color: {item.selectedColor}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Quantity */}

                            <div className="mt-3 inline-flex h-8 items-center overflow-hidden rounded-md border border-gray-300">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckoutQuantity(
                                    item,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={isProcessing || item.quantity <= 1}
                                className="flex h-full w-8 items-center justify-center text-base text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>

                              <span className="flex h-full min-w-8 items-center justify-center border-x border-gray-300 px-2 text-xs font-bold text-[#222222]">
                                {isProcessing ? "..." : item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckoutQuantity(
                                    item,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={
                                  isProcessing ||
                                  (item.product.stock !== undefined &&
                                    item.quantity >= item.product.stock)
                                }
                                className="flex h-full w-8 items-center justify-center text-base text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Product Subtotal */}

                        <div className="pt-1 text-right">
                          <span className="text-sm font-semibold text-[#222222]">
                            {formatPrice(itemSubtotal)}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="border-b border-gray-200 py-10 text-center">
                  <p className="text-sm font-semibold text-gray-500">
                    আপনার অর্ডারে কোনো পণ্য নেই।
                  </p>

                  <Link
                    href="/shop"
                    className="mt-3 inline-block text-sm font-bold text-[#e11d48]"
                  >
                    Continue Shopping
                  </Link>
                </div>
              )}

              {/* Cart Error */}

              {cartErrorMessage && checkoutItems.length > 0 && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-500">
                  {cartErrorMessage}
                </p>
              )}

              {/* Price Summary */}

              <div className="border-t border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 py-4 text-sm">
                  <span className="font-semibold text-[#222222]">Subtotal</span>

                  <span className="font-bold text-[#e11d48]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-gray-200 py-4 text-sm">
                  <span className="font-semibold text-[#222222]">Shipping</span>

                  <span className="text-right font-semibold text-[#222222]">
                    {deliveryLabel}:{" "}
                    <span className="text-[#e11d48]">
                      {formatPrice(deliveryCharge)}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-5">
                  <span className="text-base font-bold text-[#222222]">
                    Total
                  </span>

                  <span className="text-xl font-bold text-[#e11d48]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}

              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-lg font-bold text-[#222222]">
                  Payment Method
                </h3>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[#e11d48] bg-[#e11d48]/5 p-4">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    defaultChecked
                    required
                    className="h-4 w-4 shrink-0 accent-[#e11d48]"
                  />

                  <div>
                    <p className="font-bold text-[#222222]">Cash On Delivery</p>

                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      পণ্য হাতে পাওয়ার পরে মূল্য পরিশোধ করুন।
                    </p>
                  </div>
                </label>
              </div>

              {orderErrorMessage && (
                <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-600">
                  {orderErrorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  isCartLoading ||
                  isOrderSubmitting ||
                  checkoutItems.length === 0
                }
                className="mt-5 w-full rounded-xl bg-[#e11d48] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#be123c] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base"
              >
                {isOrderSubmitting ? "অর্ডার প্রসেস হচ্ছে..." : "Confirm Order"}
              </button>

              <Link
                href="/cart"
                className="mt-3 block w-full rounded-xl border border-gray-300 px-5 py-3.5 text-center text-sm font-semibold text-gray-700 transition hover:border-[#e11d48] hover:text-[#e11d48]"
              >
                Back To Cart
              </Link>
            </div>
          </aside>
        </form>

        {/* =================================================
            SAME-CATEGORY RELATED PRODUCTS
        ================================================= */}

        {!isCartLoading &&
          checkoutItems.length > 0 &&
          relatedProducts.length > 0 && (
            <RelatedProductsCarousel
              products={relatedProducts}
              title="Related Products"
              showAllText="Show All"
              showAllLink="/shop"
              autoSlide
              autoSlideInterval={4000}
            />
          )}
      </section>
    </main>
  );
}