const express = require("express");

const {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const router = express.Router();

/* =========================================================
   GUEST CART ROUTES
========================================================= */

// Add product to guest cart
router.post("/", addToCart);

// Get guest cart
router.get("/:guestId", getCart);

// Update guest cart quantity
router.patch("/", updateCartQuantity);

// Remove product from guest cart
router.delete("/", removeFromCart);

// Clear guest cart
// Order সফল হওয়ার পরে ব্যবহার হবে।
router.delete("/clear/:guestId", clearCart);

module.exports = router;