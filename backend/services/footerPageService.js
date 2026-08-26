"use strict";

const mongoose = require("mongoose");
const Tenant = require("../models/tenantModel");

/* =====================================================
   CONSTANTS
===================================================== */

const FOOTER_PAGE_FIELDS = {
  "about-us": "aboutPage",
  "contact-us": "contactPage",
  "privacy-policy": "privacyPolicyPage",
  "terms-and-conditions": "termsConditionsPage",
  "return-refund-policy": "returnRefundPage",
  "customer-support": "customerSupportPage",
};

const FOOTER_PAGE_SELECT = [
  "aboutPage",
  "contactPage",
  "privacyPolicyPage",
  "termsConditionsPage",
  "returnRefundPage",
  "customerSupportPage",
].join(" ");

/* =====================================================
   HELPERS
===================================================== */

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeTenantId = (value) =>
  String(value || "").trim();

const normalizePageKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isPlainObject = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );

const toPlainObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value.toObject === "function") {
    return value.toObject({
      depopulate: true,
      versionKey: false,
    });
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return {};
};

/*
 * Recursively merges objects while replacing arrays.
 *
 * This lets Admin Dashboard PATCH only the fields being edited
 * without clearing other working About/Footer page sections.
 */
const mergePageData = (currentValue, incomingValue) => {
  if (!isPlainObject(incomingValue)) {
    return incomingValue;
  }

  const currentObject = isPlainObject(currentValue)
    ? currentValue
    : {};

  const result = {
    ...currentObject,
  };

  for (const [key, value] of Object.entries(incomingValue)) {
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }

    if (isPlainObject(value)) {
      result[key] = mergePageData(
        isPlainObject(result[key]) ? result[key] : {},
        value
      );
      continue;
    }

    result[key] = value;
  }

  return result;
};

const findTenantForFooterPages = async (tenantId) => {
  const normalizedTenantId =
    normalizeTenantId(tenantId);

  if (
    !normalizedTenantId ||
    !mongoose.isValidObjectId(normalizedTenantId)
  ) {
    throw createServiceError(
      "A valid tenant ID is required",
      400
    );
  }

  const tenant = await Tenant.findOne({
    _id: normalizedTenantId,
    isDeleted: false,
  }).select(FOOTER_PAGE_SELECT);

  if (!tenant) {
    throw createServiceError(
      "Tenant not found",
      404
    );
  }

  return tenant;
};

/* =====================================================
   GET FOOTER MANAGEMENT PAGES
===================================================== */

const getFooterPages = async (tenantId) => {
  const tenant =
    await findTenantForFooterPages(tenantId);

  return {
    aboutUs: toPlainObject(
      tenant.aboutPage
    ),
    contactUs: toPlainObject(
      tenant.contactPage
    ),
    privacyPolicy: toPlainObject(
      tenant.privacyPolicyPage
    ),
    termsAndConditions: toPlainObject(
      tenant.termsConditionsPage
    ),
    returnAndRefundPolicy: toPlainObject(
      tenant.returnRefundPage
    ),
    customerSupport: toPlainObject(
      tenant.customerSupportPage
    ),
  };
};

/* =====================================================
   GET ONE PUBLIC FOOTER PAGE
===================================================== */

const getFooterPage = async (
  tenantId,
  pageKey
) => {
  const normalizedPageKey =
    normalizePageKey(pageKey);

  const modelField =
    FOOTER_PAGE_FIELDS[
      normalizedPageKey
    ];

  if (!modelField) {
    throw createServiceError(
      "Invalid footer page key",
      400
    );
  }

  const tenant =
    await findTenantForFooterPages(tenantId);

  return {
    pageKey:
      normalizedPageKey,
    page:
      toPlainObject(
        tenant[modelField]
      ),
  };
};

/* =====================================================
   UPDATE ONE FOOTER MANAGEMENT PAGE
===================================================== */

const updateFooterPage = async (
  tenantId,
  pageKey,
  payload = {}
) => {
  const normalizedPageKey =
    normalizePageKey(pageKey);

  const modelField =
    FOOTER_PAGE_FIELDS[
      normalizedPageKey
    ];

  if (!modelField) {
    throw createServiceError(
      "Invalid footer page key",
      400
    );
  }

  if (!isPlainObject(payload)) {
    throw createServiceError(
      "Footer page data must be an object",
      400
    );
  }

  const tenant =
    await findTenantForFooterPages(tenantId);

  const currentPage =
    toPlainObject(
      tenant[modelField]
    );

  const mergedPage =
    mergePageData(
      currentPage,
      payload
    );

  tenant.set(
    modelField,
    mergedPage
  );

  await tenant.save();

  return {
    pageKey:
      normalizedPageKey,
    page:
      toPlainObject(
        tenant[modelField]
      ),
  };
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  FOOTER_PAGE_FIELDS,
  getFooterPages,
  getFooterPage,
  updateFooterPage,
};
