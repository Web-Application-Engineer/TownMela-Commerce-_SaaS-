/* =========================================================
   PRODUCT CATEGORY TYPE
========================================================= */

export type ProductCategory =
  | string
  | {
      _id: string;
      name?: string;
      slug?: string;
    };

/* =========================================================
   SHARED PRODUCT TYPE

   Shop, Category, Exclusive, Related Products,
   New Arrival, Top Selling—সব জায়গায় এই একই
   Product type ব্যবহার হবে।
========================================================= */

export type Product = {
  _id: string;

  name: string;
  slug?: string;

  price: number;
  oldPrice?: number;

  rating?: number;

  description?: string;

  image?: string;
  images?: string[];

  stock?: number;

  sizes?: string[];
  colors?: string[];

  category?: ProductCategory;

  /* =====================================================
     HOMEPAGE PRODUCT SECTION
  ===================================================== */

  homepageSection?: string;

  features?: string[];

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
   PRODUCTS API RESPONSE
========================================================= */

export type ProductsApiResponse =
  | Product[]
  | {
      success?: boolean;
      products?: Product[];
      message?: string;
    };

/* =========================================================
   CART API RESPONSE
========================================================= */

export type CartApiResponse = {
  success?: boolean;
  message?: string;

  cart?: {
    _id?: string;
    guestId?: string;

    items?: Array<{
      _id?: string;

      product?:
        | Product
        | string
        | null;

      quantity?: number;

      selectedSize?:
        | string
        | null;

      selectedColor?:
        | string
        | null;
    }>;
  };
};

/* =========================================================
   CART UPDATE SOURCE
========================================================= */

export type CartUpdateSource =
  | "add-to-cart"
  | "buy-now";

/* =========================================================
   PRODUCT CARD PROPS
========================================================= */

export type ProductCardProps = {
  product: Product;

  priority?: boolean;

  imageSizes?: string;

  className?: string;
};

/* =========================================================
   PRODUCT GRID PROPS
========================================================= */

export type ProductGridProps = {
  products: Product[];

  emptyMessage?: string;

  className?: string;
};