"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Phone,
  MessageCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";

import RelatedProductsCarousel from "@/src/components/Products/RelatedProductsCarousel";
import { getOrCreateGuestId } from "@/src/utils/guestCart";

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
   PRODUCT TYPE
========================================================= */

type Product = {
  _id: string;
  name: string;
  slug: string;

  price: number;
  oldPrice?: number;

  rating?: number;

  description?: string;
  features?: string[];

  image: string;
  images?: string[];

  sizes?: string[];
  colors?: string[];

  stock?: number;

  category?:
    | string
    | {
        _id: string;
        name: string;
        slug?: string;
      };
};

/* =========================================================
   COMPONENT PROPS
========================================================= */

type ProductDetailsClientProps = {
  product: Product;

  /*
    Parent page থেকে একই category-এর products
    current product বাদ দিয়ে পাঠানো হবে।
  */
  relatedProducts?: Product[];
};

/* =========================================================
   CART API RESPONSE
========================================================= */

type CartApiResponse = {
  success?: boolean;
  message?: string;

  cart?: {
    _id?: string;
    guestId?: string;
    items?: unknown[];
  };
};

/* =========================================================
   PRODUCT TAB TYPE
========================================================= */

type ProductTab =
  | "description"
  | "specification"
  | "reviews"
  | "questions";

/* =========================================================
   PRICE FORMATTER
========================================================= */

function formatPrice(price: number) {
  return `Tk. ${price.toLocaleString(
    "en-US"
  )}`;
}

/* =========================================================
   RATING COMPONENT
========================================================= */

function RatingStars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <Star
            key={index}
            size={14}
            className={
              index < Math.round(rating)
                ? "fill-[#F4C018] text-[#F4C018]"
                : "fill-gray-200 text-gray-200"
            }
          />
        ))}
      </div>

      <span className="text-sm font-medium text-[#111827]">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

/* =========================================================
   NORMALIZE PRODUCT OPTIONS
========================================================= */

function normalizeProductOptions(
  options?: string[]
) {
  if (!Array.isArray(options)) {
    return [];
  }

  return Array.from(
    new Set(
      options
        .filter(
          (option) =>
            typeof option === "string"
        )
        .map((option) =>
          option.trim()
        )
        .filter(Boolean)
    )
  );
}


/* =========================================================
   PRODUCT COLOR SWATCH
========================================================= */

const PRODUCT_COLOR_SWATCHES: Record<
  string,
  string
> = {
  black: "#000000",
  white: "#FFFFFF",
  blue: "#2563EB",
  navy: "#172554",
  "navy blue": "#172554",
  "sky blue": "#38BDF8",
  red: "#DC2626",
  green: "#16A34A",
  yellow: "#FACC15",
  orange: "#F97316",
  pink: "#EC4899",
  purple: "#9333EA",
  violet: "#7C3AED",
  gray: "#6B7280",
  grey: "#6B7280",
  silver: "#C0C0C0",
  gold: "#D4AF37",
  brown: "#92400E",
  beige: "#D6C6A5",
  cream: "#FFFDD0",
  maroon: "#800000",
  teal: "#0F766E",
  cyan: "#06B6D4",
  olive: "#808000",
  lime: "#84CC16",
  indigo: "#4F46E5",
  coral: "#FF7F50",
  khaki: "#C3B091",
  "rose gold": "#B76E79",
};

function getProductColorSwatch(
  color: string
) {
  const cleanColor = color.trim();

  const normalizedColor =
    cleanColor.toLocaleLowerCase();

  return (
    PRODUCT_COLOR_SWATCHES[
      normalizedColor
    ] ?? cleanColor
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ProductDetailsClient({
  product,
  relatedProducts = [],
}: ProductDetailsClientProps) {
  const router = useRouter();

  /* =======================================================
     MAIN PRODUCT QUANTITY
  ======================================================= */

  const [quantity, setQuantity] =
    useState(1);

  /* =======================================================
     SELECTED PRODUCT SIZE
  ======================================================= */

  const [selectedSize, setSelectedSize] =
    useState("");

  /* =======================================================
     SELECTED PRODUCT COLOR
  ======================================================= */

  const [selectedColor, setSelectedColor] =
    useState("");

  /* =======================================================
     MAIN PRODUCT CART STATES
  ======================================================= */

  const [isAdding, setIsAdding] =
    useState(false);

  const [isAdded, setIsAdded] =
    useState(false);

  const [isBuyingNow, setIsBuyingNow] =
    useState(false);

  /* =======================================================
     DELIVERY ACCORDION
  ======================================================= */

  const [
    isDeliveryOpen,
    setIsDeliveryOpen,
  ] = useState(true);

  /* =======================================================
     ACTIVE PRODUCT TAB
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState<ProductTab>("description");

  /* =======================================================
     PRODUCT IMAGE ZOOM STATES
  ======================================================= */

  const [isZooming, setIsZooming] =
    useState(false);

  const [zoomPosition, setZoomPosition] =
    useState({
      x: 50,
      y: 50,
    });

  /* =======================================================
     PRODUCT GALLERY STATE
  ======================================================= */

  const productImages = Array.from(
    new Set([
      product.image,
      ...(product.images ?? []),
    ])
  );

  const [activeImage, setActiveImage] =
    useState(product.image);

  useEffect(() => {
    setActiveImage(product.image);
    setQuantity(1);
    setSelectedSize("");
    setSelectedColor("");
    setIsZooming(false);
    setZoomPosition({
      x: 50,
      y: 50,
    });
  }, [product._id, product.image]);

  /* =======================================================
     PRODUCT VALUES
  ======================================================= */

  const rating =
    product.rating ?? 5;

  const categoryName =
    typeof product.category === "object"
      ? product.category.name
      : "Product";

  const discount =
    product.oldPrice &&
    product.oldPrice > product.price
      ? Math.round(
          ((product.oldPrice -
            product.price) /
            product.oldPrice) *
            100
        )
      : 0;

  const isInStock =
    (product.stock ?? 0) > 0;

  const availableSizes =
    normalizeProductOptions(
      product.sizes
    );

  const availableColors =
    normalizeProductOptions(
      product.colors
    );

  const hasSizes =
    availableSizes.length > 0;

  const hasColors =
    availableColors.length > 0;

  /* =======================================================
     PRODUCT SPECIFICATION ROWS
  ======================================================= */

  const specificationRows: Array<
    [string, string]
  > = [
    ["Product Name", product.name],
    ["Category", categoryName],
    [
      "Price",
      formatPrice(product.price),
    ],
    ...(hasSizes
      ? [
          [
            "Available Sizes",
            availableSizes.join(", ") ||
              "Not available",
          ] as [string, string],
        ]
      : []),
    ...(hasColors
      ? [
          [
            "Available Colors",
            availableColors.join(", ") ||
              "Not available",
          ] as [string, string],
        ]
      : []),
    [
      "Stock",
      `${product.stock ?? 0} items`,
    ],
    [
      "Availability",
      isInStock
        ? "In Stock"
        : "Out of Stock",
    ],
  ];

  /* =======================================================
     QUANTITY FUNCTIONS
  ======================================================= */

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  };

  const increaseQuantity = () => {
    const maxStock =
      product.stock ?? 99;

    setQuantity((current) =>
      Math.min(
        current + 1,
        maxStock
      )
    );
  };

  /* =======================================================
     VALIDATE REQUIRED PRODUCT OPTIONS
  ======================================================= */

  const validateRequiredOptions = () => {
    const missingOptions: string[] = [];

    if (hasSizes && !selectedSize) {
      missingOptions.push("size");
    }

    if (hasColors && !selectedColor) {
      missingOptions.push("color");
    }

    if (missingOptions.length === 0) {
      return true;
    }

    if (missingOptions.length === 2) {
      alert(
        "Please select a product size and color."
      );
    } else {
      alert(
        `Please select a product ${missingOptions[0]}.`
      );
    }

    return false;
  };

  /* =======================================================
     ADD PRODUCT TO GUEST CART
  ======================================================= */

  const addProductToGuestCart = async (
    redirectToCheckout = false
  ) => {
    if (
      isAdding ||
      isBuyingNow ||
      !isInStock
    ) {
      return false;
    }

    if (!validateRequiredOptions()) {
      return false;
    }

    const guestId =
      getOrCreateGuestId();

    if (!guestId) {
      alert(
        "Guest cart could not be initialized. Please refresh the page and try again."
      );

      return false;
    }

    try {
      if (redirectToCheckout) {
        setIsBuyingNow(true);
      } else {
        setIsAdding(true);
        setIsAdded(false);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/cart`,
        {
          method: "POST",

          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
            "X-Tenant-Id": TENANT_ID,
          },

          body: JSON.stringify({
            guestId,
            productId: product._id,
            quantity,
            selectedSize:
              hasSizes
                ? selectedSize
                : null,
            selectedColor:
              hasColors
                ? selectedColor
                : null,
          }),
        }
      );

      const data: CartApiResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to add product to cart."
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "cart-updated",
          {
            detail: {
              guestId,
              productId:
                product._id,
              selectedSize:
                hasSizes
                  ? selectedSize
                  : null,
              selectedColor:
                hasColors
                  ? selectedColor
                  : null,
              cart: data.cart,
            },
          }
        )
      );

      if (redirectToCheckout) {
        router.push("/checkout");
        return true;
      }

      setIsAdded(true);

      window.setTimeout(() => {
        setIsAdded(false);
      }, 1500);

      return true;
    } catch (error) {
      console.error(
        redirectToCheckout
          ? "Buy now error:"
          : "Add to guest cart error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Product could not be added to cart."
      );

      return false;
    } finally {
      if (redirectToCheckout) {
        setIsBuyingNow(false);
      } else {
        setIsAdding(false);
      }
    }
  };

  /* =======================================================
     MAIN PRODUCT ADD TO CART
  ======================================================= */

  const handleAddToCart = async (
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.preventDefault();

    await addProductToGuestCart(false);
  };

  /* =======================================================
     PRODUCT IMAGE ZOOM
  ======================================================= */

  const handleZoomMove = (
    event: MouseEvent<HTMLDivElement>
  ) => {
    const bounds =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - bounds.left) /
        bounds.width) *
      100;

    const y =
      ((event.clientY - bounds.top) /
        bounds.height) *
      100;

    setZoomPosition({
      x: Math.max(
        0,
        Math.min(100, x)
      ),
      y: Math.max(
        0,
        Math.min(100, y)
      ),
    });
  };

  /* =======================================================
     BUY NOW

     Product cart-এ যোগ হবে এবং তারপর
     Checkout page খুলবে।
  ======================================================= */

  const handleBuyNow = async () => {
    await addProductToGuestCart(true);
  };

  /* =======================================================
     PRODUCT TABS
  ======================================================= */

  const tabs: {
    id: ProductTab;
    label: string;
  }[] = [
    {
      id: "description",
      label: "Description",
    },
    {
      id: "specification",
      label: "Specification",
    },
    {
      id: "reviews",
      label: "Reviews",
    },
    {
      id: "questions",
      label: "Questions & Answers",
    },
  ];

  return (
    <main className="min-h-screen w-full bg-white">
      {/* ===================================================
          BREADCRUMB
      =================================================== */}

      <section className="border-b border-gray-200 bg-white">
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[1450px]
            items-center
            gap-1.5
            overflow-hidden
            px-4
            py-3
            text-xs
            text-gray-500
            sm:px-5
            lg:px-6
          "
        >
          <Link
            href="/"
            className="
              shrink-0
              transition-colors
              hover:text-[#FF6900]
            "
          >
            Home
          </Link>

          <ChevronRight
            size={13}
            className="shrink-0"
          />

          <span className="shrink-0">
            {categoryName}
          </span>

          <ChevronRight
            size={13}
            className="shrink-0"
          />

          <span
            className="
              truncate
              font-medium
              text-[#0B1F3A]
            "
          >
            {product.name}
          </span>
        </div>
      </section>

      {/* ===================================================
          PRODUCT AREA
      =================================================== */}

      <section
        className="
          w-full
          px-4
          py-5
          sm:px-5
          lg:px-6
          lg:py-7
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1450px]
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-6
              lg:grid-cols-2
              lg:gap-8
              xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_330px]
              xl:gap-7
            "
          >
            {/* =============================================
                PRODUCT IMAGE
            ============================================= */}

            <div>
              {/* ===========================================
                  ZOOM IMAGE WRAPPER
              =========================================== */}

              <div className="relative">
                {/* MAIN IMAGE */}

                <div
                  onMouseEnter={() =>
                    setIsZooming(true)
                  }
                  onMouseLeave={() =>
                    setIsZooming(false)
                  }
                  onMouseMove={
                    handleZoomMove
                  }
                  className="
                    relative
                    aspect-square
                    w-full
                    cursor-crosshair
                    overflow-hidden
                    rounded-xl
                    bg-[#f4f4f4]
                  "
                >
                  <Image
                    src={activeImage}
                    alt={product.name}
                    fill
                    priority
                    sizes="
                      (max-width: 767px) 100vw,
                      (max-width: 1279px) 50vw,
                      33vw
                    "
                    className="
                      object-contain
                      p-5
                      sm:p-8
                      lg:p-6
                      xl:p-8
                    "
                  />

                  {/* ZOOM LENS */}

                  {isZooming && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        hidden
                        h-32
                        w-32
                        -translate-x-1/2
                        -translate-y-1/2
                        border
                        border-[#FF6900]
                        bg-white/20
                        xl:block
                      "
                      style={{
                        left: `${zoomPosition.x}%`,
                        top: `${zoomPosition.y}%`,
                      }}
                    />
                  )}

                  {/* DISCOUNT LABEL */}

                  {discount > 0 && (
                    <div
                      className="
                        absolute
                        left-3
                        top-3
                        z-20
                        flex
                        h-12
                        w-12
                        flex-col
                        items-center
                        justify-center
                        rounded-full
                        bg-red-500
                        text-center
                        text-white
                        shadow-md
                        sm:h-14
                        sm:w-14
                      "
                    >
                      <span className="text-xs font-bold leading-none sm:text-sm">
                        {discount}%
                      </span>

                      <span className="mt-1 text-[8px] font-semibold leading-none sm:text-[9px]">
                        OFF
                      </span>
                    </div>
                  )}
                </div>

                {/* ===========================================
                    ZOOM PREVIEW BOX
                =========================================== */}

                {isZooming && (
                  <div
                    className="
                      pointer-events-none
                      absolute
                      left-[calc(100%+16px)]
                      top-0
                      z-30
                      hidden
                      aspect-square
                      w-full
                      overflow-hidden
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      shadow-xl
                      xl:block
                    "
                    style={{
                      backgroundImage: `url("${activeImage}")`,
                      backgroundRepeat:
                        "no-repeat",
                      backgroundSize:
                        "220% 220%",
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* PRODUCT GALLERY THUMBNAILS */}

              <div
                className="
                  mt-3
                  flex
                  flex-wrap
                  items-center
                  gap-3
                "
              >
                {productImages.map(
                  (image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveImage(image);
                        setIsZooming(false);
                        setZoomPosition({
                          x: 50,
                          y: 50,
                        });
                      }}
                      aria-label={`View ${product.name} image ${
                        index + 1
                      }`}
                      className={`
                        relative
                        h-16
                        w-16
                        overflow-hidden
                        rounded-md
                        border-2
                        bg-white
                        transition-all
                        duration-300
                        sm:h-20
                        sm:w-20

                        ${
                          activeImage === image
                            ? "border-[#FF6900] shadow-sm"
                            : "border-gray-200 hover:border-[#FF6900]"
                        }
                      `}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} image ${
                          index + 1
                        }`}
                        fill
                        sizes="80px"
                        className="object-contain p-1.5"
                      />
                    </button>
                  )
                )}
              </div>
            </div>

            {/* =============================================
                PRODUCT INFORMATION
            ============================================= */}

            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#FF6900]
                "
              >
                {categoryName}
              </p>

              <h1
                className="
                  mt-1.5
                  text-2xl
                  font-bold
                  leading-tight
                  text-[#0B1F3A]
                  sm:text-3xl
                  xl:text-[32px]
                "
              >
                {product.name}
              </h1>

              {/* RATING */}

              <div
                className="
                  mt-3
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <RatingStars
                  rating={rating}
                />
              </div>

              <div className="my-4 h-px bg-gray-200" />

              {/* PRICE */}

              <div
                className="
                  flex
                  flex-wrap
                  items-end
                  gap-3
                "
              >
                <span
                  className="
                    text-2xl
                    font-bold
                    text-[#FF6900]
                    sm:text-3xl
                  "
                >
                  {formatPrice(
                    product.price
                  )}
                </span>

                {product.oldPrice !==
                  undefined &&
                  product.oldPrice >
                    product.price && (
                    <span className="pb-0.5 text-sm text-gray-400 line-through sm:text-base">
                      {formatPrice(
                        product.oldPrice
                      )}
                    </span>
                  )}

                {discount > 0 && (
                  <span
                    className="
                      mb-1
                      rounded
                      bg-orange-50
                      px-2
                      py-1
                      text-xs
                      font-bold
                      text-[#FF6900]
                    "
                  >
                    {discount}% OFF
                  </span>
                )}
              </div>

              {/* STOCK */}

              <div className="mt-4">
                {isInStock ? (
                  <div
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      bg-green-50
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-green-700
                    "
                  >
                    <CheckCircle2
                      size={15}
                    />

                    In Stock
                  </div>
                ) : (
                  <div className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                    Out of Stock
                  </div>
                )}
              </div>

              {/* =================================================
                  PRODUCT FEATURES
              ================================================= */}

              {product.features &&
                product.features.length >
                  0 && (
                  <div className="mt-4">
                    <ul className="mt-2 space-y-1.5">
                      {product.features.map(
                        (
                          feature,
                          index
                        ) => (
                          <li
                            key={`${feature}-${index}`}
                            className="
                              flex
                              items-start
                              gap-2
                              text-sm
                              leading-6
                              text-gray-600
                            "
                          >
                            <CheckCircle2
                              size={15}
                              className="
                                mt-1
                                shrink-0
                                text-[#FF6900]
                              "
                            />

                            <span>
                              {feature}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* =================================================
                  MODERN PRODUCT VARIANT ROWS
              ================================================= */}

              {(hasSizes || hasColors) && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-orange-50/40 shadow-sm">
                  {/* SIZE ROW */}

                  {hasSizes && (
                    <div className="flex min-w-0 items-center gap-1 px-4 py-4 sm:px-5">
                      <div className="flex w-[72px] shrink-0 items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-[#0B1F3A]">
                          Size
                        </p>

                        {selectedSize && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSize("")
                            }
                            className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-[#FF6900]"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-x-auto">
                        <div className="flex w-max items-center gap-2 pr-1">
                          {availableSizes.map(
                            (size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() =>
                                  setSelectedSize(size)
                                }
                                aria-pressed={
                                  selectedSize === size
                                }
                                className={`
                                  flex
                                  h-10
                                  min-w-11
                                  items-center
                                  justify-center
                                  rounded-xl
                                  border
                                  px-3.5
                                  text-sm
                                  font-semibold
                                  transition-all
                                  duration-300

                                  ${
                                    selectedSize === size
                                      ? "border-[#FF6900] bg-[#FF6900] text-white"
                                      : "border-gray-200 bg-white text-[#0B1F3A] hover:border-[#FF6900] hover:text-[#FF6900]"
                                  }
                                `}
                              >
                                {size}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COLOR ROW */}

                  {hasColors && (
                    <div className="flex min-w-0 items-center gap-1 px-4 py-4 sm:px-5">
                      <div className="flex w-[72px] shrink-0 items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-[#0B1F3A]">
                          Color
                        </p>

                        {selectedColor && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedColor("")
                            }
                            className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-[#FF6900]"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-x-auto">
                        <div className="flex w-max items-center gap-2 pr-1">
                          {availableColors.map(
                            (color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() =>
                                  setSelectedColor(color)
                                }
                                aria-pressed={
                                  selectedColor === color
                                }
                                className={`
                                  group
                                  flex
                                  h-11
                                  min-w-max
                                  items-center
                                  justify-center
                                  gap-2.5
                                  rounded-xl
                                  border
                                  px-3.5                          
                                  text-sm
                                  font-semibold
                                  transition-all
                                  duration-300

                                  ${
                                    selectedColor === color
                                      ? "border-[#FF6900] bg-orange-50 text-[#FF6900]"
                                      : "border-gray-200 bg-white text-[#0B1F3A] hover:border-[#FF6900] hover:text-[#FF6900]"
                                  }
                                `}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`
                                    relative
                                    h-6
                                    w-6
                                    shrink-0
                                    rounded-full
                                    border
                                    shadow-sm
                                    transition-transform
                                    duration-300
                                    group-hover:scale-110

                                    ${
                                      selectedColor === color
                                        ? "border-white ring-2 ring-[#FF6900]"
                                        : "border-black/15 ring-1 ring-black/5"
                                    }
                                  `}
                                  style={{
                                    backgroundColor:
                                      getProductColorSwatch(
                                        color
                                      ),
                                  }}
                                >
                                  {selectedColor === color && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                      <Check
                                        size={13}
                                        className={
                                          color
                                            .trim()
                                            .toLocaleLowerCase() ===
                                          "white"
                                            ? "text-[#0B1F3A]"
                                            : "text-white"
                                        }
                                      />
                                    </span>
                                  )}
                                </span>

                                <span>
                                  {color}
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  PRODUCT ACTIONS
              ================================================= */}

              {/* ACTION ROW */}

              <div
                className="
                  mt-5
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  sm:items-center
                "
              >
                {/* QUANTITY */}

                <div
                  className="
                    flex
                    h-11
                    w-full
                    items-center
                    overflow-hidden
                    rounded-md
                    border
                    border-gray-300
                    sm:w-fit
                    sm:shrink-0
                  "
                >
                  <button
                    type="button"
                    onClick={
                      decreaseQuantity
                    }
                    className="
                      flex
                      h-full
                      w-12
                      items-center
                      justify-center
                      transition-colors
                      hover:bg-gray-100
                      sm:w-10
                    "
                  >
                    <Minus size={16} />
                  </button>

                  <span
                    className="
                      flex
                      h-full
                      flex-1
                      items-center
                      justify-center
                      border-x
                      border-gray-300
                      px-3
                      text-sm
                      font-bold
                      sm:min-w-12
                      sm:flex-none
                    "
                  >
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={
                      increaseQuantity
                    }
                    className="
                      flex
                      h-full
                      w-12
                      items-center
                      justify-center
                      transition-colors
                      hover:bg-gray-100
                      sm:w-10
                    "
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* ADD CART */}

                <button
                  type="button"
                  onClick={
                    handleAddToCart
                  }
                  disabled={
                    isAdding ||
                    isBuyingNow ||
                    !isInStock
                  }
                  className="
                    flex
                    h-11
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-md
                    bg-[#FF6900]
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    transition-colors
                    hover:bg-[#e85f00]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {isAdding ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                      Adding...
                    </>
                  ) : isAdded ? (
                    <>
                      <Check size={18} />

                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart
                        size={18}
                      />

                      Add to Cart
                    </>
                  )}
                </button>

                {/* BUY NOW */}

                <button
                  type="button"
                  onClick={
                    handleBuyNow
                  }
                  disabled={
                    isBuyingNow ||
                    isAdding ||
                    !isInStock
                  }
                  className="
                    flex
                    h-11
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-md
                    border
                    border-[#FF6900]
                    px-4
                    text-sm
                    font-semibold
                    text-[#FF6900]
                    transition-colors
                    hover:bg-[#FF6900]
                    hover:text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isBuyingNow ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                      Processing...
                    </>
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>

              {/* =================================================
                  CALL AND WHATSAPP
              ================================================= */}

              <div
  className="
    mt-4
    grid
    grid-cols-1
    gap-3
    sm:grid-cols-2
  "
>
  {/* CALL */}

  <a
    href="tel:+8801786373379"
    className="
      group
      flex
      items-center
      gap-3
      rounded-lg
      border
      border-gray-200
      bg-white
      px-4
      py-3
      transition-all
      duration-300
      hover:border-[#FF6900]
      hover:shadow-sm
    "
  >
    <div
      className="
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-full
        bg-orange-50
        text-[#FF6900]
        transition-colors
        group-hover:bg-[#FF6900]
        group-hover:text-white
      "
    >
      <Phone size={18} />
    </div>

    <span
      className="
        text-sm
        font-bold
        text-[#0B1F3A]
        transition-colors
        group-hover:text-[#FF6900]
      "
    >
      +880 1786373379
    </span>
  </a>

  {/* WHATSAPP */}

  <a
    href="https://wa.me/8801786373379"
    target="_blank"
    rel="noopener noreferrer"
    className="
      group
      flex
      items-center
      gap-3
      rounded-lg
      border
      border-gray-200
      bg-white
      px-4
      py-3
      transition-all
      duration-300
      hover:border-green-500
      hover:shadow-sm
    "
  >
    <div
      className="
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-full
        bg-green-50
        text-green-600
        transition-colors
        group-hover:bg-green-600
        group-hover:text-white
      "
    >
      <MessageCircle size={19} />
    </div>

    <span
      className="
        text-sm
        font-bold
        text-[#0B1F3A]
        transition-colors
        group-hover:text-green-600
      "
    >
      +880 1786373379
    </span>
  </a>
              </div>

              {/* ORDER INFO */}

              <div
                className="
                  mt-4
                  rounded-md
                  bg-[#234f76]
                  px-4
                  py-4
                  text-center
                  text-white
                "
              >
                <p className="text-sm font-medium leading-8 sm:text-base text-justify">
                  অর্ডার করতে Buy Now-এ ক্লিক করুন অথবা
                  সরাসরি WhatsApp-এ যোগাযোগ করে আপনার
                  কাঙ্ক্ষিত প্রোডাক্ট নিশ্চিত করুন।
                </p>
              </div>

              {/* DELIVERY INFO */}

              <div
                className="
                  mt-4
                  overflow-hidden
                  rounded-md
                  border
                  border-gray-200
                  bg-white
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsDeliveryOpen(
                      (current) =>
                        !current
                    )
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    px-4
                    py-3
                    text-left
                  "
                >
                  <span className="text-base font-bold text-[#FF6900] sm:text-lg">
                    ডেলিভারি সম্পর্কে তথ্য
                  </span>

                  <ChevronDown
                    size={20}
                    className={`
                      transition-transform
                      duration-300

                      ${
                        isDeliveryOpen
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  />
                </button>

                {isDeliveryOpen && (
                  <div className="border-t border-gray-200 px-4 py-4">
                    <p className="text-sm font-medium leading-7 text-[#333333] sm:text-[15px] sm:leading-8">
                      ডেলিভারির জন্য ঢাকার ভিতরে সাধারণত ১ - ২
                      কর্মদিবস এবং ঢাকার বাইরে ২ - ৩ কর্মদিবস
                      সময় লাগতে পারে। তবে লোকেশন, কুরিয়ার
                      সার্ভিস এবং নিকটবর্তী হাবের কার্যক্রমের
                      ওপর নির্ভর করে-সময়সীমা কিছুটা পরিবর্তিত
                      হতে পারে।
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* =============================================
                SIDEBAR
            ============================================= */}

            <aside
              className="
                space-y-4
                lg:col-span-2
                xl:col-span-1
              "
            >
              {/* DELIVERY */}

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="border-b border-gray-200 pb-3 text-base font-bold text-[#0B1F3A]">
                  Delivery Options
                </h2>

                <div className="mt-4 space-y-4">
                  <div className="flex gap-3">
                    <MapPin
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Available Delivery Area
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        All over Bangladesh
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Truck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Delivery Time
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Dhaka: 1-2 working days
                        <br />
                        Outside Dhaka: 2-3 working days
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CircleDollarSign
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Cash on Delivery
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        COD service available
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <PackageCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Collection Point
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Store pickup option can be added later
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* WARRANTY */}

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="border-b border-gray-200 pb-3 text-base font-bold text-[#0B1F3A]">
                  Item & Warranty
                </h2>

                <div className="mt-4 space-y-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Authentic Product
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Quality checked item
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <RotateCcw
                      size={19}
                      className="mt-0.5 shrink-0 text-[#FF6900]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#0B1F3A]">
                        Return Policy
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Easy return process
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SELLER */}

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-[#FF6900]">
                    <Store size={21} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Sold by
                    </p>

                    <p className="font-bold text-[#0B1F3A]">
                      TownMela
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* =================================================
              TABS
          ================================================= */}

          <section className="mt-8">
            <div className="border-b border-gray-200">
              <div className="flex gap-5 overflow-x-auto sm:gap-7">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`
                      shrink-0
                      border-b-2
                      pb-3
                      text-sm
                      transition-colors

                      ${
                        activeTab === tab.id
                          ? "border-[#FF6900] font-bold text-[#0B1F3A]"
                          : "border-transparent font-medium text-gray-500 hover:text-[#FF6900]"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT */}

            <div className="min-h-[220px] py-6 lg:max-w-[950px]">
              {activeTab ===
                "description" && (
                <div>
                  <h2 className="text-xl font-bold text-[#0B1F3A]">
                    Product Description
                  </h2>

                  <div className="mt-2 h-1 w-12 rounded-full bg-[#FF6900]" />

                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-600">
                    {product.description ||
                      "Product details will be added soon."}
                  </p>
                </div>
              )}

              {activeTab ===
                "specification" && (
                <div>
                  <h2 className="text-xl font-bold text-[#0B1F3A]">
                    Product Specification
                  </h2>

                  <div className="mt-2 h-1 w-12 rounded-full bg-[#FF6900]" />

                  <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                    {specificationRows.map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={label}
                          className={`
                            grid
                            grid-cols-[130px_1fr]
                            sm:grid-cols-[200px_1fr]

                            border-b
                            border-gray-200
                            last:border-b-0
                          `}
                        >
                          <div className="bg-gray-50 p-3 text-sm font-semibold text-[#0B1F3A]">
                            {label}
                          </div>

                          <div className="p-3 text-sm text-gray-600">
                            {value}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {activeTab ===
                "reviews" && (
                <div>
                  <h2 className="text-xl font-bold text-[#0B1F3A]">
                    Customer Reviews
                  </h2>

                  <div className="mt-2 h-1 w-12 rounded-full bg-[#FF6900]" />

                  <div className="mt-5 flex flex-col gap-5 rounded-xl border border-gray-200 p-5 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-orange-50">
                      <span className="text-3xl font-bold text-[#FF6900]">
                        {rating.toFixed(1)}
                      </span>

                      <span className="text-xs text-gray-500">
                        out of 5
                      </span>
                    </div>

                    <div>
                      <RatingStars
                        rating={rating}
                      />

                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        Detailed customer reviews will appear here when the
                        review system is connected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab ===
                "questions" && (
                <div>
                  <h2 className="text-xl font-bold text-[#0B1F3A]">
                    Questions & Answers
                  </h2>

                  <div className="mt-2 h-1 w-12 rounded-full bg-[#FF6900]" />

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="font-semibold text-[#0B1F3A]">
                      Have a question about this product?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Ask about product availability, delivery time,
                      specifications, stock or other information.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Write your question..."
                        className="
                          h-11
                          flex-1
                          rounded-md
                          border
                          border-gray-300
                          bg-white
                          px-4
                          text-sm
                          outline-none
                          transition
                          focus:border-[#FF6900]
                          focus:ring-1
                          focus:ring-[#FF6900]
                        "
                      />

                      <button
                        type="button"
                        className="
                          h-11
                          rounded-md
                          bg-[#FF6900]
                          px-6
                          text-sm
                          font-semibold
                          text-white
                          transition-colors
                          hover:bg-[#e85f00]
                        "
                      >
                        Ask Question
                      </button>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                      No questions have been submitted for this product yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              RELATED PRODUCTS
          ================================================= */}

          {relatedProducts.length > 0 && (
            <RelatedProductsCarousel
              products={relatedProducts}
              title="Related Products"
              showAllText="Show All"
              showAllLink="/shop"
              autoSlide
              autoSlideInterval={4000}
            />
          )}
        </div>
      </section>
    </main>
  );
}