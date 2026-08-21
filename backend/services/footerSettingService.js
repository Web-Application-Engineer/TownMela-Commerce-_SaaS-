"use strict";

const mongoose = require("mongoose");
const FooterSetting = require("../models/FooterSetting");

const DEFAULT_FOOTER_SETTINGS = {
  businessName: "",
  logo: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  facebook: "",
  instagram: "",
  youtube: "",
  linkedin: "",
  additionalSocialLinks: [],
  backgroundImage: "/images/real-dhaka.webp",
  popularCategoryHeading: "Popular Category",
  popularCategoryLinks: [],
  showPopularCategory: true,
  customerInfoHeading: "Customer Info",
  customerInfoLinks: [],
  showCustomerInfo: true,
  quickNavigationHeading: "Quick Navigation",
  quickNavigationLinks: [],
  showQuickNavigation: true,
  googleMapHeading: "Find us on Google Map",
  googleMapCtaText: "Find us on Google map",
  googleMapUrl: "",
  showGoogleMap: true,
  copyrightText: "",
  isActive: true,
};

const createError = (
  message,
  statusCode = 400,
  code = "FOOTER_SETTING_ERROR"
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const ensureTenantId = (tenantId) => {
  if (
    !tenantId ||
    !mongoose.Types.ObjectId.isValid(tenantId)
  ) {
    throw createError(
      "Valid tenant ID is required",
      400,
      "INVALID_TENANT_ID"
    );
  }

  return tenantId;
};

const normalizeString = (value) =>
  typeof value === "string"
    ? value.trim()
    : "";

const normalizeFooterLinks = (links) => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((item, index) => ({
      label: normalizeString(item?.label),
      url: normalizeString(item?.url),
      enabled: item?.enabled !== false,
      order:
        Number.isFinite(Number(item?.order))
          ? Number(item.order)
          : index + 1,
    }))
    .filter((item) => item.label && item.url)
    .sort((a, b) => a.order - b.order);
};

const normalizeAdditionalSocialLinks = (links) => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((item, index) => ({
      label: normalizeString(item?.label),
      url: normalizeString(item?.url),
      iconText:
        normalizeString(item?.iconText).slice(0, 12) ||
        "•",
      enabled: item?.enabled !== false,
      order:
        Number.isFinite(Number(item?.order))
          ? Number(item.order)
          : index + 1,
    }))
    .filter((item) => item.label && item.url)
    .sort((a, b) => a.order - b.order);
};

const buildUpdatePayload = (
  payload = {},
  userId = null
) => {
  const update = {};

  const stringFields = [
    "businessName",
    "logo",
    "description",
    "phone",
    "email",
    "address",
    "facebook",
    "instagram",
    "youtube",
    "linkedin",
    "backgroundImage",
    "popularCategoryHeading",
    "customerInfoHeading",
    "quickNavigationHeading",
    "googleMapHeading",
    "googleMapCtaText",
    "googleMapUrl",
    "copyrightText",
  ];

  for (const field of stringFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      update[field] =
        normalizeString(payload[field]);
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      update,
      "email"
    )
  ) {
    update.email = update.email.toLowerCase();
  }

  for (const field of [
    "popularCategoryLinks",
    "customerInfoLinks",
    "quickNavigationLinks",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      update[field] =
        normalizeFooterLinks(payload[field]);
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "additionalSocialLinks"
    )
  ) {
    update.additionalSocialLinks =
      normalizeAdditionalSocialLinks(
        payload.additionalSocialLinks
      );
  }

  for (const field of [
    "showPopularCategory",
    "showCustomerInfo",
    "showQuickNavigation",
    "showGoogleMap",
    "isActive",
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      update[field] = Boolean(payload[field]);
    }
  }

  if (
    userId &&
    mongoose.Types.ObjectId.isValid(userId)
  ) {
    update.updatedBy = userId;
  }

  return update;
};

const getFooterSetting = async ({ tenantId }) => {
  ensureTenantId(tenantId);

  const setting =
    await FooterSetting.findOne({
      tenant: tenantId,
    }).lean();

  if (!setting) {
    return {
      tenant: tenantId,
      ...DEFAULT_FOOTER_SETTINGS,
    };
  }

  return {
    ...DEFAULT_FOOTER_SETTINGS,
    ...setting,
    additionalSocialLinks:
      Array.isArray(setting.additionalSocialLinks)
        ? setting.additionalSocialLinks
        : [],
    popularCategoryLinks:
      Array.isArray(setting.popularCategoryLinks)
        ? setting.popularCategoryLinks
        : [],
    customerInfoLinks:
      Array.isArray(setting.customerInfoLinks)
        ? setting.customerInfoLinks
        : [],
    quickNavigationLinks:
      Array.isArray(setting.quickNavigationLinks)
        ? setting.quickNavigationLinks
        : [],
  };
};

const updateFooterSetting = async ({
  tenantId,
  userId = null,
  payload = {},
}) => {
  ensureTenantId(tenantId);

  return FooterSetting.findOneAndUpdate(
    { tenant: tenantId },
    {
      $set:
        buildUpdatePayload(payload, userId),
      $setOnInsert: {
        tenant: tenantId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
};

module.exports = {
  getFooterSetting,
  updateFooterSetting,
};
