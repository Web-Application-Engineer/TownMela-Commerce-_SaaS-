/* =========================================================
   PRODUCT FORM TYPES
========================================================= */

export type ProductFormMode =
  | "create"
  | "edit";

/* =========================================================
   CATEGORY
========================================================= */

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

/* =========================================================
   HOMEPAGE PRODUCT SECTION
========================================================= */

export type HomepageProductSectionOption = {
  key: string;
  title: string;
  active: boolean;
  order: number;
};

export type HomepageProductSectionSettingsApiResponse = {
  success?: boolean;
  message?: string;

  data?: {
    sections?: HomepageProductSectionOption[];
    isActive?: boolean;
  };
};

/* =========================================================
   PRODUCT INITIAL DATA
========================================================= */

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

  /*
   * Stable homepage section key.
   *
   * Example:
   * "topselling"
   * "exclusive"
   * "newarrival"
   * "fashionstyle"
   */
  homepageSection?: string;

  stock?: number;
};

/* =========================================================
   PRODUCT FORM PROPS
========================================================= */

export type ProductFormProps = {
  mode?: ProductFormMode;
  productId?: string;
  initialData?: ProductFormInitialData;
};

/* =========================================================
   PRODUCT API RESPONSE
========================================================= */

export type ProductApiResponse = {
  success?: boolean;
  message?: string;

  product?: {
    _id: string;
    name: string;
    slug: string;
  };
};

/* =========================================================
   FORM STATE
========================================================= */

export type FormState = {
  name: string;
  slug: string;

  price: string;
  oldPrice: string;

  stock: string;

  category: string;

  /*
   * Homepage section key selected
   * during product create/edit.
   */
  homepageSection: string;

  image: string;

  description: string;
};