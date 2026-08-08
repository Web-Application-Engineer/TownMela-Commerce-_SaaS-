const mongoose = require("mongoose");

/* =========================================================
   CART ITEM SCHEMA
========================================================= */

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    /*
      Size না থাকা product-এর ক্ষেত্রে selectedSize হবে null।

      Examples:
      null
      "S"
      "M"
      "L"
      "XL"
      "42"
      "Free Size"
    */

    selectedSize: {
      type: String,
      default: null,
      trim: true,

      set(value) {
        if (typeof value !== "string") {
          return null;
        }

        const cleanValue =
          value.trim();

        return cleanValue || null;
      },
    },

    /*
      Color না থাকা product-এর ক্ষেত্রে selectedColor হবে null।

      Examples:
      null
      "Black"
      "White"
      "Blue"
      "Red"
      "Navy Blue"
    */

    selectedColor: {
      type: String,
      default: null,
      trim: true,

      set(value) {
        if (typeof value !== "string") {
          return null;
        }

        const cleanValue =
          value.trim();

        return cleanValue || null;
      },
    },
  },
  {
    _id: true,
  }
);

/* =========================================================
   GUEST CART SCHEMA
========================================================= */

const cartSchema = new mongoose.Schema(
  {
    /*
      প্রতিটি browser/device-এর জন্য একটি unique guestId থাকবে।

      Example:
      guest_87f20bfa4fdc4de397ba82d3a5370d71
    */

    guestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,

      match: [
        /^guest_[a-zA-Z0-9_-]{8,120}$/,
        "Invalid guest ID format",
      ],
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   UNIQUE GUEST CART INDEX
========================================================= */

cartSchema.index(
  {
    guestId: 1,
  },
  {
    unique: true,
    name: "unique_guest_cart",
  }
);

/* =========================================================
   EXPORT CART MODEL
========================================================= */

module.exports = mongoose.model(
  "Cart",
  cartSchema
);