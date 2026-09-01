const express = require("express");

const resolvePublicTenant = require(
  "../middleware/resolvePublicTenant"
);
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

router.use(resolvePublicTenant);

// Add product to wishlist
router.post("/", addToWishlist);

// Get user's wishlist
router.get("/:userId", getWishlist);

// Remove product from wishlist
router.delete("/", removeFromWishlist);

module.exports = router;