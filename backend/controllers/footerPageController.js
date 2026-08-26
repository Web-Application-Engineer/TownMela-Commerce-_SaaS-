"use strict";

const footerPageService = require(
  "../services/footerPageService"
);

/* =====================================================
   RESPONSE HELPERS
===================================================== */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
  } = {}
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res
    .status(statusCode)
    .json(response);
};

const sendError = (res, error) => {
  const statusCode =
    Number.isInteger(
      error?.statusCode
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const message =
    statusCode === 500
      ? "Internal server error"
      : error?.message ||
        "Request failed";

  if (statusCode === 500) {
    console.error(
      "Footer page controller error:",
      error
    );
  }

  return res
    .status(statusCode)
    .json({
      success: false,
      message,
    });
};

/* =====================================================
   GET FOOTER MANAGEMENT PAGES
===================================================== */

/**
 * GET /api/tenants/footer-pages
 *
 * Tenant Admin:
 * - req.tenantId resolves to their own tenant.
 *
 * Super Admin:
 * - req.tenantId resolves from selected X-Tenant-Id.
 */
const getFooterPages = async (
  req,
  res
) => {
  try {
    const pages =
      await footerPageService.getFooterPages(
        req.tenantId
      );

    return sendSuccess(res, {
      message:
        "Footer management pages fetched successfully",
      data: {
        pages,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error
    );
  }
};

/* =====================================================
   GET ONE PUBLIC STOREFRONT PAGE
===================================================== */

/**
 * GET /api/tenants/footer-pages/public/:pageKey
 *
 * Public storefront route.
 * resolvePublicTenant sets req.tenantId before this handler.
 */
const getPublicFooterPage = async (
  req,
  res
) => {
  try {
    const result =
      await footerPageService.getFooterPage(
        req.tenantId,
        req.params.pageKey
      );

    return sendSuccess(res, {
      message:
        "Storefront content page fetched successfully",
      data: result,
    });
  } catch (error) {
    return sendError(
      res,
      error
    );
  }
};

/* =====================================================
   UPDATE ONE FOOTER MANAGEMENT PAGE
===================================================== */

/**
 * PATCH /api/tenants/footer-pages/:pageKey
 *
 * Supported pageKey values:
 * - about-us
 * - contact-us
 * - privacy-policy
 * - terms-and-conditions
 * - return-refund-policy
 * - customer-support
 */
const updateFooterPage = async (
  req,
  res
) => {
  try {
    const result =
      await footerPageService.updateFooterPage(
        req.tenantId,
        req.params.pageKey,
        req.body || {}
      );

    return sendSuccess(res, {
      message:
        "Footer page updated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(
      res,
      error
    );
  }
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  getFooterPages,
  getPublicFooterPage,
  updateFooterPage,
};
