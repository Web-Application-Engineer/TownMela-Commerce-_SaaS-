"use strict";

const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const headerSettingSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },

    businessName: {
      type: String,
      trim: true,
      default: "",
    },

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    mobileLogo: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    announcementText: {
      type: String,
      trim: true,
      default: "",
    },

    announcementEnabled: {
      type: Boolean,
      default: false,
    },

    menus: {
      type: [menuItemSchema],
      default: [],
    },

    searchEnabled: {
      type: Boolean,
      default: true,
    },

    wishlistEnabled: {
      type: Boolean,
      default: true,
    },

    accountEnabled: {
      type: Boolean,
      default: true,
    },

    cartEnabled: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.HeaderSetting ||
  mongoose.model(
    "HeaderSetting",
    headerSettingSchema
  );