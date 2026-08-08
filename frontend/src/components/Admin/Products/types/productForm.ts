
/* =========================================================
   PRODUCT FORM TYPES
========================================================= */

export type ProductFormMode =
  | "create"
  | "edit";

export type Category = {
  _id: string;
  name: string;
  slug?: string;
};

export type CategoriesApiResponse =
  | Category[]
  | {
      success?: boolean;
      categories?: Category[];
      message?: string;
    };

export type ProductFormInitialData = {
  _id?: string;
  name?: string;
  slug?: string;
  price?: number;
  oldPrice?: number;
  description?: string;
  features?: string[];
  image?: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];

  category?:
    | string
    | {
        _id?: string;
        name?: string;
        slug?: string;
      }
    | null;

  stock?: number;
};

export type ProductFormProps = {
  mode?: ProductFormMode;
  productId?: string;
  initialData?: ProductFormInitialData;
};

export type ProductApiResponse = {
  success?: boolean;
  message?: string;

  product?: {
    _id: string;
    name: string;
    slug: string;
  };
};

export type FormState = {
  name: string;
  slug: string;
  price: string;
  oldPrice: string;
  stock: string;
  category: string;
  image: string;
  description: string;
};