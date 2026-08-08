const Address = require("../models/Address");

// Add new address
const addAddress = async (req, res) => {
  try {
    const {
      userId,
      fullName,
      phone,
      division,
      district,
      area,
      address,
      isDefault,
    } = req.body;

    if (
      !userId ||
      !fullName ||
      !phone ||
      !division ||
      !district ||
      !area ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (isDefault) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = await Address.create({
      user: userId,
      fullName,
      phone,
      division,
      district,
      area,
      address,
      isDefault: isDefault || false,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get user's addresses
const getAddresses = async (req, res) => {
  try {
    const { userId } = req.params;

    const addresses = await Address.find({ user: userId });

    return res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const {
      fullName,
      phone,
      division,
      district,
      area,
      address,
      isDefault,
      userId,
    } = req.body;

    if (isDefault && userId) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      {
        fullName,
        phone,
        division,
        district,
        area,
        address,
        isDefault,
      },
      {
        new: true,
      }
    );

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const deletedAddress = await Address.findByIdAndDelete(addressId);

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
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
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
};