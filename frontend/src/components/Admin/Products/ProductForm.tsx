"use client";


import {
  ImagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

import type {
  CategoriesApiResponse,
  Category,
  FormState,
  ProductApiResponse,
  ProductFormProps,
} from "./types/productForm";

export type {
  ProductFormInitialData,
} from "./types/productForm";

import {
  createInitialFormState,
  createSlug,
  normalizeStringList,
} from "./utils/productFormHelpers";

import ProductAlerts from "./components/ProductAlerts";
import ProductFeaturesSection from "./components/ProductFeaturesSection";
import BasicInformationSection from "./components/BasicInformationSection";
import PricingInventorySection from "./components/PricingInventorySection";
import MainImageSection from "./components/MainImageSection";
import AdditionalImagesSection from "./components/AdditionalImagesSection";
import OptionalVariantsSection from "./components/OptionalVariantsSection";
import ProductFormActions from "./components/ProductFormActions";

/* =========================================================
   PRODUCT FORM
========================================================= */

export default function ProductForm({
  mode = "create",
  productId,
  initialData,
}: ProductFormProps) {
  const router = useRouter();

  const {
    selectedTenantId,
  } = useTenant();

  const [
    form,
    setForm,
  ] = useState<FormState>(
    createInitialFormState(
      initialData,
    ),
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    isCategoriesLoading,
    setIsCategoriesLoading,
  ] = useState(true);

  const [
    features,
    setFeatures,
  ] = useState<string[]>(
    initialData?.features?.length
      ? initialData.features
      : [""],
  );

  const [
    additionalImages,
    setAdditionalImages,
  ] = useState<string[]>(
    initialData?.images?.length
      ? initialData.images
      : [""],
  );

  const [
    sizes,
    setSizes,
  ] = useState<string[]>(
    normalizeStringList(
      initialData?.sizes || [],
    ),
  );

  const [
    colors,
    setColors,
  ] = useState<string[]>(
    normalizeStringList(
      initialData?.colors || [],
    ),
  );

  const [
    sizeInput,
    setSizeInput,
  ] = useState("");

  const [
    colorInput,
    setColorInput,
  ] = useState("");

  const [
    slugWasEdited,
    setSlugWasEdited,
  ] = useState(
    Boolean(initialData?.slug),
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  const loadCategories =
    useCallback(async () => {
      try {
        setIsCategoriesLoading(true);

        const response =
          await tenantFetch(
            "/api/categories",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data:
          CategoriesApiResponse =
          await response.json();

        if (!response.ok) {
          const message =
            Array.isArray(data)
              ? undefined
              : data.message;

          throw new Error(
            message ||
              "Categories could not be loaded.",
          );
        }

        const categoryList =
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data.categories,
                )
              ? data.categories
              : [];

        setCategories(
          categoryList,
        );
      } catch (error) {
        console.error(
          "Product form category error:",
          error,
        );

        setCategories([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Categories could not be loaded.",
        );
      } finally {
        setIsCategoriesLoading(
          false,
        );
      }
    }, [selectedTenantId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /* =======================================================
     FORM FIELD UPDATE
  ======================================================= */

  const updateField = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleNameChange = (
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      name: value,

      slug: slugWasEdited
        ? current.slug
        : createSlug(value),
    }));
  };

  /* =======================================================
     FEATURE MANAGEMENT
  ======================================================= */

  const updateFeature = (
    index: number,
    value: string,
  ) => {
    setFeatures((current) =>
      current.map(
        (feature, featureIndex) =>
          featureIndex === index
            ? value
            : feature,
      ),
    );
  };

  const addFeature = () => {
    setFeatures((current) => [
      ...current,
      "",
    ]);
  };

  const removeFeature = (
    index: number,
  ) => {
    setFeatures((current) => {
      const nextFeatures =
        current.filter(
          (_, featureIndex) =>
            featureIndex !== index,
        );

      return nextFeatures.length
        ? nextFeatures
        : [""];
    });
  };

  /* =======================================================
     ADDITIONAL IMAGE MANAGEMENT
  ======================================================= */

  const updateAdditionalImage = (
    index: number,
    value: string,
  ) => {
    setAdditionalImages(
      (current) =>
        current.map(
          (
            image,
            imageIndex,
          ) =>
            imageIndex === index
              ? value
              : image,
        ),
    );
  };

  const addAdditionalImage = () => {
    setAdditionalImages(
      (current) => [
        ...current,
        "",
      ],
    );
  };

  const removeAdditionalImage = (
    index: number,
  ) => {
    setAdditionalImages(
      (current) => {
        const nextImages =
          current.filter(
            (_, imageIndex) =>
              imageIndex !== index,
          );

        return nextImages.length
          ? nextImages
          : [""];
      },
    );
  };

  /* =======================================================
     SIZE MANAGEMENT
  ======================================================= */

  const addSize = () => {
    const normalizedSize =
      sizeInput.trim();

    if (!normalizedSize) {
      return;
    }

    setSizes((current) =>
      normalizeStringList([
        ...current,
        normalizedSize,
      ]),
    );

    setSizeInput("");
  };

  const removeSize = (
    sizeToRemove: string,
  ) => {
    setSizes((current) =>
      current.filter(
        (size) =>
          size !== sizeToRemove,
      ),
    );
  };

  /* =======================================================
     COLOR MANAGEMENT
  ======================================================= */

  const addColor = () => {
    const normalizedColor =
      colorInput.trim();

    if (!normalizedColor) {
      return;
    }

    setColors((current) =>
      normalizeStringList([
        ...current,
        normalizedColor,
      ]),
    );

    setColorInput("");
  };

  const removeColor = (
    colorToRemove: string,
  ) => {
    setColors((current) =>
      current.filter(
        (color) =>
          color !== colorToRemove,
      ),
    );
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = () => {
    const cleanName =
      form.name.trim();

    const cleanSlug =
      form.slug.trim();

    const cleanDescription =
      form.description.trim();

    const cleanImage =
      form.image.trim();

    const price =
      Number(form.price);

    const oldPrice =
      form.oldPrice.trim()
        ? Number(form.oldPrice)
        : 0;

    const stock =
      Number(form.stock);

    if (!cleanName) {
      return "Product name is required.";
    }

    if (!cleanSlug) {
      return "Product slug is required.";
    }

    if (
      !form.price.trim() ||
      Number.isNaN(price) ||
      price < 0
    ) {
      return "Please enter a valid product price.";
    }

    if (
      form.oldPrice.trim() &&
      (Number.isNaN(oldPrice) ||
        oldPrice < 0)
    ) {
      return "Please enter a valid old price.";
    }

    if (
      oldPrice > 0 &&
      oldPrice <= price
    ) {
      return "Old price should be greater than the current price.";
    }

    if (
      !form.stock.trim() ||
      Number.isNaN(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    ) {
      return "Stock must be a non-negative whole number.";
    }

    if (!form.category) {
      return "Please select a product category.";
    }

    if (!cleanImage) {
      return "Main product image is required.";
    }

    if (!cleanDescription) {
      return "Product description is required.";
    }

    return "";
  };

  /* =======================================================
     SUBMIT PRODUCT
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (validationMessage) {
      setErrorMessage(
        validationMessage,
      );

      setSuccessMessage("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (
      mode === "edit" &&
      !productId
    ) {
      setErrorMessage(
        "Product ID is required for edit mode.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const endpoint =
        mode === "edit"
          ? `/api/products/${productId}`
          : "/api/products";

      const method =
        mode === "edit"
          ? "PUT"
          : "POST";

      const payload = {
        name:
          form.name.trim(),

        slug:
          createSlug(form.slug),

        price:
          Number(form.price),

        oldPrice:
          form.oldPrice.trim()
            ? Number(
                form.oldPrice,
              )
            : 0,

        stock:
          Number(form.stock),

        category:
          form.category,

        image:
          form.image.trim(),

        description:
          form.description.trim(),

        features:
          normalizeStringList(
            features,
          ),

        images:
          normalizeStringList(
            additionalImages,
          ),

        sizes:
          normalizeStringList(
            sizes,
          ),

        colors:
          normalizeStringList(
            colors,
          ),
      };

      const response =
        await tenantFetch(
          endpoint,
          {
            method,

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const data:
        ProductApiResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            `Product could not be ${
              mode === "edit"
                ? "updated"
                : "created"
            }.`,
        );
      }

      setSuccessMessage(
        data.message ||
          `Product ${
            mode === "edit"
              ? "updated"
              : "created"
          } successfully.`,
      );

      window.dispatchEvent(
        new Event(
          "products-updated",
        ),
      );

      window.setTimeout(() => {
        router.push(
          "/admin/products",
        );

        router.refresh();
      }, 800);
    } catch (error) {
      console.error(
        "Product form submit error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the product.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ===================================================
          MESSAGES
      =================================================== */}

      <ProductAlerts
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

{/* ===================================================
    BASIC INFORMATION
=================================================== */}

<BasicInformationSection
  name={form.name}
  slug={form.slug}
  description={form.description}
  isSubmitting={isSubmitting}
  onNameChange={handleNameChange}
  onSlugChange={(value) => {
    setSlugWasEdited(true);
    updateField(
      "slug",
      createSlug(value),
    );
  }}
  onDescriptionChange={(value) =>
    updateField(
      "description",
      value,
    )
  }
/>

    {/* ===================================================
    PRICE, STOCK AND CATEGORY
=================================================== */}

<PricingInventorySection
  price={form.price}
  oldPrice={form.oldPrice}
  stock={form.stock}
  category={form.category}
  categories={categories}
  isSubmitting={isSubmitting}
  isCategoriesLoading={isCategoriesLoading}
  onPriceChange={(value) =>
    updateField("price", value)
  }
  onOldPriceChange={(value) =>
    updateField("oldPrice", value)
  }
  onStockChange={(value) =>
    updateField("stock", value)
  }
  onCategoryChange={(value) =>
    updateField("category", value)
  }
/>  

{/* ===================================================
    MAIN IMAGE
=================================================== */}

<MainImageSection
  image={form.image}
  productName={form.name}
  isSubmitting={isSubmitting}
  onImageChange={(value) =>
    updateField("image", value)
  }
/>

 {/* ===================================================
    ADDITIONAL IMAGES
=================================================== */}

<AdditionalImagesSection
  images={additionalImages}
  isSubmitting={isSubmitting}
  onAddImage={addAdditionalImage}
  onUpdateImage={updateAdditionalImage}
  onRemoveImage={removeAdditionalImage}
/>    

{/* ===================================================
    PRODUCT FEATURES
=================================================== */}

<ProductFeaturesSection
  features={features}
  isSubmitting={isSubmitting}
  onAddFeature={addFeature}
  onUpdateFeature={updateFeature}
  onRemoveFeature={removeFeature}
/>

{/* ===================================================
    OPTIONAL VARIANTS
=================================================== */}

<OptionalVariantsSection
  sizes={sizes}
  colors={colors}
  sizeInput={sizeInput}
  colorInput={colorInput}
  isSubmitting={isSubmitting}
  onSizeInputChange={setSizeInput}
  onColorInputChange={setColorInput}
  onAddSize={addSize}
  onAddColor={addColor}
  onRemoveSize={removeSize}
  onRemoveColor={removeColor}
/>

{/* ===================================================
    ACTIONS
=================================================== */}

<ProductFormActions
  mode={mode}
  isSubmitting={isSubmitting}
/>
    </form>
  );
}