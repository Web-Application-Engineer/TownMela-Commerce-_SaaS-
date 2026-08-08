/* =========================================================
   HEADER SHARED TYPES
========================================================= */

/* =========================================================
   CART TYPES
========================================================= */

export type CartItem = {
  quantity: number;
};

export type CartResponse = {
  success?: boolean;

  cart?: {
    items?: CartItem[];
  };

  message?: string;
};

/* =========================================================
   CATEGORY TYPES
========================================================= */

export type Category = {
  _id: string;
  name: string;
  slug?: string;
};

export type CategoriesResponse =
  | Category[]
  | {
      success?: boolean;
      categories?: Category[];
      message?: string;
    };

/* =========================================================
   SEARCH PRODUCT TYPES
========================================================= */

export type SearchSuggestionProduct = {
  _id: string;
  name: string;
  slug?: string;
  image?: string;

  price: number;
  oldPrice?: number;

  stock?: number;

  category?: {
    _id?: string;
    name?: string;
    slug?: string;
  };
};

export type SearchProductsResponse =
  | SearchSuggestionProduct[]
  | {
      success?: boolean;
      totalProducts?: number;
      products?: SearchSuggestionProduct[];
      message?: string;
    };