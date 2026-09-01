const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index(
  {
    tenant: 1,
    user: 1,
  },
  {
    unique: true,
    name: "unique_tenant_user_wishlist",
  }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);