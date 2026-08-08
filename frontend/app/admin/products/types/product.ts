export type ProductCategory = {
  _id?: string;
  name?: string;
  slug?: string;
};

export type AdminProduct = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  image?: string;
  stock: number;

  category?:
    | ProductCategory
    | string
    | null;
};

export type ProductsApiResponse =
  | AdminProduct[]
  | {
      success?: boolean;
      products?: AdminProduct[];
      message?: string;
    };

export type DeleteProductResponse = {
  success?: boolean;
  message?: string;
};