const Wishlist = require("../models/Wishlist");
const Product = require("../models/product");
const User = require("../models/User");

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    const [user, product] = await Promise.all([
      User.findOne({
        _id: userId,
        tenant: req.tenantId,
        isDeleted: { $ne: true },
      }),

      Product.findOne({
        _id: productId,
        tenant: req.tenantId,
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let wishlist = await Wishlist.findOne({
      tenant: req.tenantId,
      user: userId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        tenant: req.tenantId,
        user: userId,
        products: [productId],
      });
    } else {
      const exists = wishlist.products.some(
        (item) => item.toString() === productId
      );

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Product already exists in wishlist",
        });
      }

      wishlist.products.push(productId);
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist successfully",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({
      _id: userId,
      tenant: req.tenantId,
      isDeleted: { $ne: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wishlist = await Wishlist.findOne({
      tenant: req.tenantId,
      user: userId,
    }).populate("products");

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    const user = await User.findOne({
      _id: userId,
      tenant: req.tenantId,
      isDeleted: { $ne: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wishlist = await Wishlist.findOne({
      tenant: req.tenantId,
      user: userId,
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.products = wishlist.products.filter(
      (item) => item.toString() !== productId
    );

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully",
      wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};
