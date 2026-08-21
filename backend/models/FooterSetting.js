"use strict";

const mongoose = require("mongoose");

const footerLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const additionalSocialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    iconText: {
      type: String,
      trim: true,
      maxlength: 12,
      default: "•",
    },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const footerSettingSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },

    businessName: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },

    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },

    facebook: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    youtube: { type: String, trim: true, default: "" },
    linkedin: { type: String, trim: true, default: "" },

    additionalSocialLinks: {
      type: [additionalSocialLinkSchema],
      default: [],
    },

    backgroundImage: {
      type: String,
      trim: true,
      default: "/images/real-dhaka.webp",
    },

    popularCategoryHeading: {
      type: String,
      trim: true,
      default: "Popular Category",
    },
    popularCategoryLinks: {
      type: [footerLinkSchema],
      default: [],
    },
    showPopularCategory: { type: Boolean, default: true },

    customerInfoHeading: {
      type: String,
      trim: true,
      default: "Customer Info",
    },
    customerInfoLinks: {
      type: [footerLinkSchema],
      default: [],
    },
    showCustomerInfo: { type: Boolean, default: true },

    quickNavigationHeading: {
      type: String,
      trim: true,
      default: "Quick Navigation",
    },
    quickNavigationLinks: {
      type: [footerLinkSchema],
      default: [],
    },
    showQuickNavigation: { type: Boolean, default: true },

    googleMapHeading: {
      type: String,
      trim: true,
      default: "Find us on Google Map",
    },
    googleMapCtaText: {
      type: String,
      trim: true,
      default: "Find us on Google map",
    },
    googleMapUrl: { type: String, trim: true, default: "" },
    showGoogleMap: { type: Boolean, default: true },

    copyrightText: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FooterSetting ||
  mongoose.model("FooterSetting", footerSettingSchema);
