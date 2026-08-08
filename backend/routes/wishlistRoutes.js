const express = require("express");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

// Add product to wishlist
router.post("/", addToWishlist);

// Get user's wishlist
router.get("/:userId", getWishlist);

// Remove product from wishlist
router.delete("/", removeFromWishlist);

module.exports = router;