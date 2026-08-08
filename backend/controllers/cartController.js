const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");

/* =========================================================
   HELPERS
========================================================= */

const isValidGuestId = (guestId) => {
  return /^guest_[a-zA-Z0-9_-]{8,120}$/.test(
    String(guestId || "").trim()
  );
};

const normalizeQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 1
  ) {
    return null;
  }

  return parsedQuantity;
};

/* =========================================================
   NORMALIZE SELECTED VARIANT VALUE
========================================================= */

const normalizeSelectedValue = (
  selectedValue
) => {
  if (
    typeof selectedValue !== "string"
  ) {
    return null;
  }

  const cleanValue =
    selectedValue.trim();

  return cleanValue || null;
};

/* =========================================================
   NORMALIZE SIZE
========================================================= */

const normalizeSelectedSize = (
  selectedSize
) => {
  return normalizeSelectedValue(
    selectedSize
  );
};

const normalizeSizeForComparison = (
  selectedSize
) => {
  return (
    normalizeSelectedSize(
      selectedSize
    )?.toLowerCase() ?? null
  );
};

const isSameSelectedSize = (
  firstSize,
  secondSize
) => {
  return (
    normalizeSizeForComparison(
      firstSize
    ) ===
    normalizeSizeForComparison(
      secondSize
    )
  );
};

/* =========================================================
   NORMALIZE COLOR
========================================================= */

const normalizeSelectedColor = (
  selectedColor
) => {
  return normalizeSelectedValue(
    selectedColor
  );
};

const normalizeColorForComparison = (
  selectedColor
) => {
  return (
    normalizeSelectedColor(
      selectedColor
    )?.toLowerCase() ?? null
  );
};

const isSameSelectedColor = (
  firstColor,
  secondColor
) => {
  return (
    normalizeColorForComparison(
      firstColor
    ) ===
    normalizeColorForComparison(
      secondColor
    )
  );
};

/* =========================================================
   GET CART ITEM PRODUCT ID
========================================================= */

const getCartItemProductId = (
  cartItem
) => {
  if (
    cartItem?.product &&
    typeof cartItem.product ===
      "object" &&
    cartItem.product._id
  ) {
    return String(
      cartItem.product._id
    );
  }

  return String(
    cartItem?.product || ""
  );
};

const isSameProduct = (
  cartItem,
  productId
) => {
  return (
    getCartItemProductId(
      cartItem
    ) === String(productId)
  );
};

/* =========================================================
   POPULATE CART
========================================================= */

const populateCart = async (
  cartId
) => {
  return Cart.findById(
    cartId
  ).populate("items.product");
};

/* =========================================================
   GET AVAILABLE PRODUCT OPTIONS
========================================================= */

const getAvailableProductOptions = (
  product,
  fieldName
) => {
  if (
    !Array.isArray(
      product?.[fieldName]
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      product[fieldName]
        .filter(
          (value) =>
            typeof value ===
            "string"
        )
        .map((value) =>
          value.trim()
        )
        .filter(Boolean)
    ),
  ];
};

/* =========================================================
   PRODUCT SIZE VALIDATION

   Rules:

   1. Product-এর sizes থাকলে selectedSize বাধ্যতামূলক।
   2. Product-এর sizes না থাকলে selectedSize হবে null।
   3. পাঠানো size অবশ্যই product.sizes-এর মধ্যে থাকতে হবে।
========================================================= */

const resolveProductSelectedSize = (
  product,
  selectedSize
) => {
  const normalizedSize =
    normalizeSelectedSize(
      selectedSize
    );

  const availableSizes =
    getAvailableProductOptions(
      product,
      "sizes"
    );

  if (availableSizes.length > 0) {
    if (!normalizedSize) {
      return {
        selectedSize: null,

        error:
          "Please select a product size",
      };
    }

    const matchingSize =
      availableSizes.find(
        (size) =>
          size.toLowerCase() ===
          normalizedSize.toLowerCase()
      );

    if (!matchingSize) {
      return {
        selectedSize: null,

        error:
          "The selected product size is not available",
      };
    }

    return {
      selectedSize: matchingSize,
      error: null,
    };
  }

  if (normalizedSize) {
    return {
      selectedSize: null,

      error:
        "This product does not have size options",
    };
  }

  return {
    selectedSize: null,
    error: null,
  };
};

/* =========================================================
   PRODUCT COLOR VALIDATION

   Rules:

   1. Product-এর colors থাকলে selectedColor বাধ্যতামূলক।
   2. Product-এর colors না থাকলে selectedColor হবে null।
   3. পাঠানো color অবশ্যই product.colors-এর মধ্যে থাকতে হবে।
========================================================= */

const resolveProductSelectedColor = (
  product,
  selectedColor
) => {
  const normalizedColor =
    normalizeSelectedColor(
      selectedColor
    );

  const availableColors =
    getAvailableProductOptions(
      product,
      "colors"
    );

  if (
    availableColors.length > 0
  ) {
    if (!normalizedColor) {
      return {
        selectedColor: null,

        error:
          "Please select a product color",
      };
    }

    const matchingColor =
      availableColors.find(
        (color) =>
          color.toLowerCase() ===
          normalizedColor.toLowerCase()
      );

    if (!matchingColor) {
      return {
        selectedColor: null,

        error:
          "The selected product color is not available",
      };
    }

    return {
      selectedColor:
        matchingColor,

      error: null,
    };
  }

  if (normalizedColor) {
    return {
      selectedColor: null,

      error:
        "This product does not have color options",
    };
  }

  return {
    selectedColor: null,
    error: null,
  };
};

/* =========================================================
   FIND EXACT CART VARIANT

   Same Product
   + Same Size
   + Same Color
   = Same Cart Item

   Examples:

   Product A + M + Black
   Product A + M + White
   Product A + L + Black

   এগুলো তিনটি আলাদা Cart Item হবে।
========================================================= */

const findExactCartItem = (
  cart,
  productId,
  selectedSize,
  selectedColor
) => {
  return cart.items.find(
    (item) =>
      isSameProduct(
        item,
        productId
      ) &&
      isSameSelectedSize(
        item.selectedSize,
        selectedSize
      ) &&
      isSameSelectedColor(
        item.selectedColor,
        selectedColor
      )
  );
};

/* =========================================================
   FIND ITEM FOR UPDATE OR REMOVE

   Exact Product + Size + Color খুঁজবে।

   Variant value না পাঠালে:

   1. Null-size + null-color item থাকলে সেটি ব্যবহার করবে।
   2. Product-এর মাত্র একটি Cart Item থাকলে সেটি ব্যবহার করবে।
   3. একাধিক variant থাকলে ambiguous error দেবে।
========================================================= */

const findTargetCartItem = (
  cart,
  productId,
  selectedSize,
  selectedColor
) => {
  const normalizedSize =
    normalizeSelectedSize(
      selectedSize
    );

  const normalizedColor =
    normalizeSelectedColor(
      selectedColor
    );

  const productItems =
    cart.items.filter((item) =>
      isSameProduct(
        item,
        productId
      )
    );

  if (
    productItems.length === 0
  ) {
    return {
      item: null,
      isAmbiguous: false,
    };
  }

  /*
    প্রথমে exact Product + Size + Color
    combination খোঁজা হবে।
  */

  const exactItem =
    productItems.find(
      (item) =>
        isSameSelectedSize(
          item.selectedSize,
          normalizedSize
        ) &&
        isSameSelectedColor(
          item.selectedColor,
          normalizedColor
        )
    );

  if (exactItem) {
    return {
      item: exactItem,
      isAmbiguous: false,
    };
  }

  /*
    Size অথবা Color পাঠানো হয়েছে,
    কিন্তু exact variant পাওয়া যায়নি।
  */

  if (
    normalizedSize ||
    normalizedColor
  ) {
    return {
      item: null,
      isAmbiguous: false,
    };
  }

  /*
    পুরোনো Cart data support করার জন্য।

    Product-এর মাত্র একটি item থাকলে,
    selected variant না পাঠালেও সেটি
    update/remove করা যাবে।
  */

  if (
    productItems.length === 1
  ) {
    return {
      item: productItems[0],
      isAmbiguous: false,
    };
  }

  /*
    একই product-এর একাধিক variant আছে।
    সঠিক Size এবং Color ছাড়া কোন item
    update/remove করতে হবে তা নির্ধারণ করা যাবে না।
  */

  return {
    item: null,
    isAmbiguous: true,
  };
};

/* =========================================================
   GET TOTAL QUANTITY OF A PRODUCT

   একই product-এর সব Size এবং Color variant-এর
   quantity যোগ করবে।
========================================================= */

const getTotalProductQuantity = (
  cart,
  productId,
  excludedItemId = null
) => {
  return cart.items.reduce(
    (total, item) => {
      if (
        !isSameProduct(
          item,
          productId
        )
      ) {
        return total;
      }

      if (
        excludedItemId &&
        String(item._id) ===
          String(excludedItemId)
      ) {
        return total;
      }

      return (
        total +
        Number(item.quantity || 0)
      );
    },
    0
  );
};

/* =========================================================
   STOCK VALIDATION
========================================================= */

const exceedsAvailableStock = (
  product,
  requestedTotalQuantity
) => {
  return (
    typeof product.stock ===
      "number" &&
    requestedTotalQuantity >
      product.stock
  );
};

/* =========================================================
   ADD PRODUCT TO GUEST CART
========================================================= */

const addToCart = async (
  req,
  res
) => {
  try {
    const {
      guestId,
      productId,
      quantity = 1,
      selectedSize = null,
      selectedColor = null,
    } = req.body;

    const normalizedGuestId =
      String(
        guestId || ""
      ).trim();

    /* =====================================================
       VALIDATE GUEST ID
    ===================================================== */

    if (
      !isValidGuestId(
        normalizedGuestId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "A valid Guest ID is required",
      });
    }

    /* =====================================================
       VALIDATE PRODUCT ID
    ===================================================== */

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "A valid Product ID is required",
      });
    }

    /* =====================================================
       VALIDATE QUANTITY
    ===================================================== */

    const requestedQuantity =
      normalizeQuantity(quantity);

    if (!requestedQuantity) {
      return res.status(400).json({
        success: false,

        message:
          "Quantity must be a positive integer",
      });
    }

    /* =====================================================
       FIND PRODUCT
    ===================================================== */

    const product =
      await Product.findById(
        productId
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* =====================================================
       CHECK PRODUCT STOCK
    ===================================================== */

    if (
      typeof product.stock ===
        "number" &&
      product.stock < 1
    ) {
      return res.status(400).json({
        success: false,

        message:
          "This product is out of stock",
      });
    }

    /* =====================================================
       VALIDATE SELECTED SIZE
    ===================================================== */

    const sizeResult =
      resolveProductSelectedSize(
        product,
        selectedSize
      );

    if (sizeResult.error) {
      return res.status(400).json({
        success: false,
        message: sizeResult.error,
      });
    }

    /* =====================================================
       VALIDATE SELECTED COLOR
    ===================================================== */

    const colorResult =
      resolveProductSelectedColor(
        product,
        selectedColor
      );

    if (colorResult.error) {
      return res.status(400).json({
        success: false,
        message: colorResult.error,
      });
    }

    const resolvedSelectedSize =
      sizeResult.selectedSize;

    const resolvedSelectedColor =
      colorResult.selectedColor;

    /* =====================================================
       FIND GUEST CART
    ===================================================== */

    let cart =
      await Cart.findOne({
        guestId:
          normalizedGuestId,
      });

    /* =====================================================
       CREATE NEW CART
    ===================================================== */

    if (!cart) {
      if (
        exceedsAvailableStock(
          product,
          requestedQuantity
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Requested quantity exceeds available stock",
        });
      }

      cart = await Cart.create({
        guestId:
          normalizedGuestId,

        items: [
          {
            product: productId,

            quantity:
              requestedQuantity,

            selectedSize:
              resolvedSelectedSize,

            selectedColor:
              resolvedSelectedColor,
          },
        ],
      });
    } else {
      /* ===================================================
         EXISTING CART

         একই product-এর সব Size এবং Color variant-এর
         total quantity stock validation-এ ধরা হবে।
      =================================================== */

      const currentTotalQuantity =
        getTotalProductQuantity(
          cart,
          productId
        );

      const nextTotalQuantity =
        currentTotalQuantity +
        requestedQuantity;

      if (
        exceedsAvailableStock(
          product,
          nextTotalQuantity
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Requested quantity exceeds available stock",
        });
      }

      const existingItem =
        findExactCartItem(
          cart,
          productId,
          resolvedSelectedSize,
          resolvedSelectedColor
        );

      /*
        Same Product + Same Size + Same Color হলে
        existing Cart Item-এর quantity বাড়বে।
      */

      if (existingItem) {
        existingItem.quantity +=
          requestedQuantity;
      } else {
        /*
          Size অথবা Color আলাদা হলে
          নতুন Cart Item তৈরি হবে।
        */

        cart.items.push({
          product: productId,

          quantity:
            requestedQuantity,

          selectedSize:
            resolvedSelectedSize,

          selectedColor:
            resolvedSelectedColor,
        });
      }

      await cart.save();
    }

    /* =====================================================
       RETURN POPULATED CART
    ===================================================== */

    const populatedCart =
      await populateCart(
        cart._id
      );

    return res.status(200).json({
      success: true,

      message:
        "Product added to cart successfully",

      cart: populatedCart,
    });
  } catch (error) {
    console.error(
      "Add to cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/* =========================================================
   GET GUEST CART
========================================================= */

const getCart = async (
  req,
  res
) => {
  try {
    const normalizedGuestId =
      String(
        req.params.guestId ||
          ""
      ).trim();

    if (
      !isValidGuestId(
        normalizedGuestId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "A valid Guest ID is required",
      });
    }

    const cart =
      await Cart.findOne({
        guestId:
          normalizedGuestId,
      }).populate(
        "items.product"
      );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error(
      "Get cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE GUEST CART QUANTITY
========================================================= */

const updateCartQuantity =
  async (req, res) => {
    try {
      const {
        guestId,
        productId,
        quantity,
        selectedSize = null,
        selectedColor = null,
      } = req.body;

      const normalizedGuestId =
        String(
          guestId || ""
        ).trim();

      /* ===================================================
         VALIDATE GUEST ID
      =================================================== */

      if (
        !isValidGuestId(
          normalizedGuestId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A valid Guest ID is required",
          });
      }

      /* ===================================================
         VALIDATE PRODUCT ID
      =================================================== */

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A valid Product ID is required",
          });
      }

      /* ===================================================
         VALIDATE QUANTITY
      =================================================== */

      const nextQuantity =
        normalizeQuantity(
          quantity
        );

      if (!nextQuantity) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Quantity must be a positive integer",
          });
      }

      /* ===================================================
         FIND CART AND PRODUCT
      =================================================== */

      const [cart, product] =
        await Promise.all([
          Cart.findOne({
            guestId:
              normalizedGuestId,
          }),

          Product.findById(
            productId
          ),
        ]);

      if (!cart) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Cart not found",
          });
      }

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Product not found",
          });
      }

      /* ===================================================
         FIND EXACT CART VARIANT
      =================================================== */

      const targetResult =
        findTargetCartItem(
          cart,
          productId,
          selectedSize,
          selectedColor
        );

      if (
        targetResult.isAmbiguous
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Selected size and color are required because this product has multiple cart variants",
          });
      }

      const item =
        targetResult.item;

      if (!item) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Product variant not found in cart",
          });
      }

      /* ===================================================
         STOCK VALIDATION

         অন্য Size/Color variant-এর quantity
         + current item-এর নতুন quantity।
      =================================================== */

      const otherVariantQuantity =
        getTotalProductQuantity(
          cart,
          productId,
          item._id
        );

      const nextTotalQuantity =
        otherVariantQuantity +
        nextQuantity;

      if (
        exceedsAvailableStock(
          product,
          nextTotalQuantity
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Requested quantity exceeds available stock",
          });
      }

      /* ===================================================
         UPDATE QUANTITY
      =================================================== */

      item.quantity =
        nextQuantity;

      await cart.save();

      const populatedCart =
        await populateCart(
          cart._id
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Cart quantity updated successfully",

          cart: populatedCart,
        });
    } catch (error) {
      console.error(
        "Update cart quantity error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message: "Server error",
          error: error.message,
        });
    }
  };

/* =========================================================
   REMOVE PRODUCT VARIANT FROM GUEST CART
========================================================= */

const removeFromCart =
  async (req, res) => {
    try {
      const {
        guestId,
        productId,
        selectedSize = null,
        selectedColor = null,
      } = req.body;

      const normalizedGuestId =
        String(
          guestId || ""
        ).trim();

      /* ===================================================
         VALIDATE GUEST ID
      =================================================== */

      if (
        !isValidGuestId(
          normalizedGuestId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A valid Guest ID is required",
          });
      }

      /* ===================================================
         VALIDATE PRODUCT ID
      =================================================== */

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A valid Product ID is required",
          });
      }

      /* ===================================================
         FIND CART
      =================================================== */

      const cart =
        await Cart.findOne({
          guestId:
            normalizedGuestId,
        });

      if (!cart) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Cart not found",
          });
      }

      /* ===================================================
         FIND EXACT CART VARIANT
      =================================================== */

      const targetResult =
        findTargetCartItem(
          cart,
          productId,
          selectedSize,
          selectedColor
        );

      if (
        targetResult.isAmbiguous
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Selected size and color are required because this product has multiple cart variants",
          });
      }

      const itemToRemove =
        targetResult.item;

      if (!itemToRemove) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Product variant not found in cart",
          });
      }

      /* ===================================================
         REMOVE EXACT PRODUCT VARIANT

         শুধু নির্দিষ্ট:
         Product + Size + Color
         variant remove হবে।
      =================================================== */

      cart.items.pull(
        itemToRemove._id
      );

      await cart.save();

      const populatedCart =
        await populateCart(
          cart._id
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Product removed from cart successfully",

          cart: populatedCart,
        });
    } catch (error) {
      console.error(
        "Remove from cart error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message: "Server error",
          error: error.message,
        });
    }
  };

/* =========================================================
   CLEAR GUEST CART

   Order successful হলে এই function ব্যবহার হবে।
========================================================= */

const clearCart = async (
  req,
  res
) => {
  try {
    const normalizedGuestId =
      String(
        req.params.guestId ||
          ""
      ).trim();

    if (
      !isValidGuestId(
        normalizedGuestId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "A valid Guest ID is required",
      });
    }

    const cart =
      await Cart.findOne({
        guestId:
          normalizedGuestId,
      });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      success: true,

      message:
        "Cart cleared successfully",

      cart,
    });
  } catch (error) {
    console.error(
      "Clear cart error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
};