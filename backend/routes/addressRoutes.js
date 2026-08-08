const express = require("express");
const {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");

const router = express.Router();

// Add new address
router.post("/", addAddress);

// Get user's addresses
router.get("/:userId", getAddresses);

// Update address
router.put("/:addressId", updateAddress);

// Delete address
router.delete("/:addressId", deleteAddress);

module.exports = router;