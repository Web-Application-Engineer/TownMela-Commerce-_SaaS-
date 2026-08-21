"use strict";

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

/* =========================================================
   ROUTE IMPORTS
========================================================= */

/**
 * Loads an Express router and provides a clear startup error when a route
 * file exports the wrong value.
 *
 * Supported route exports:
 *   module.exports = router;
 *   module.exports = { router };
 *   exports.default = router;
 *   module.exports = { someNamedRoute: router };
 */
const loadRouter = (
  modulePath,
  namedExport = null
) => {
  const importedModule = require(modulePath);

  const router =
    importedModule?.default ||
    importedModule?.router ||
    (namedExport
      ? importedModule?.[namedExport]
      : null) ||
    importedModule;

  if (typeof router !== "function") {
    const exportedKeys =
      importedModule &&
      typeof importedModule === "object"
        ? Object.keys(importedModule)
        : [];

    throw new TypeError(
      [
        `Invalid Express router export from ${modulePath}.`,
        "Expected the route file to export an Express router function.",
        exportedKeys.length
          ? `Received object keys: ${exportedKeys.join(", ")}`
          : `Received type: ${typeof importedModule}`,
        "Recommended route-file ending: module.exports = router;",
      ].join(" ")
    );
  }

  return router;
};

const authRoutes = loadRouter(
  "./routes/authRoutes"
);

const tenantRoutes = loadRouter(
  "./routes/tenantRoutes"
);

const categoryRoutes = loadRouter(
  "./routes/categoryRoutes"
);

const productRoutes = loadRouter(
  "./routes/productRoutes"
);

const cartRoutes = loadRouter(
  "./routes/cartRoutes"
);

const wishlistRoutes = loadRouter(
  "./routes/wishlistRoutes"
);

const addressRoutes = loadRouter(
  "./routes/addressRoutes"
);

const orderRoutes = loadRouter(
  "./routes/orderRoutes"
);

const courierSettingRoutes = loadRouter(
  "./routes/courierSettingRoutes"
);

const courierRoutes = loadRouter(
  "./routes/courierRoutes"
);

const courierShipmentRoutes = loadRouter(
  "./routes/courierShipmentRoutes"
);

const courierWebhookRoute = loadRouter(
  "./routes/courierWebhookRoute"
);

const customerRoutes = loadRouter(
  "./routes/customerRoutes"
);

const dashboardRoutes = loadRouter(
  "./routes/dashboardRoutes"
);

const couponRoutes = loadRouter(
  "./routes/couponRoutes"
);

const uploadRoutes = loadRouter(
  "./routes/uploadRoutes"
);

const homepageBannerRoutes = loadRouter(
  "./routes/homepageBannerRoutes"
);

const homepageCategoryShowcaseRoutes = loadRouter(
  "./routes/homepageCategoryShowcaseRoutes"
);

const popularCategoryRoutes = loadRouter(
  "./routes/popularCategoryRoutes"
);

const homepageProductSectionSettingRoutes = loadRouter(
  "./routes/homepageProductSectionSettingRoutes"
);

const supplierRoutes = loadRouter(
  "./routes/supplierRoutes"
);

const purchaseOrderRoutes = loadRouter(
  "./routes/purchaseOrderRoutes"
);

const warehouseRoutes = loadRouter(
  "./routes/warehouseRoutes"
);

const goodsReceivedRoutes = loadRouter(
  "./routes/goodsReceivedRoutes"
);

const goodsReceivedInventoryPostingRoutes = loadRouter(
  "./routes/goodsReceivedInventoryPostingRoutes",
  "goodsReceivedInventoryPostingRoutes"
);

const goodsReceivedInspectionRoutes = loadRouter(
  "./routes/goodsReceivedInspectionRoutes"
);

const vendorInvoiceRoutes = loadRouter(
  "./routes/vendorInvoiceRoutes"
);

const roiRoutes = loadRouter(
  "./routes/roiRoutes"
);

const headerSettingRoutes = require(
  "./routes/headerSettingRoutes"
);

const footerSettingRoutes = require(
  "./routes/footerSettingRoutes"
);


const checkoutSettingRoutes = loadRouter(
  "./routes/checkoutSettingRoutes"
);

/* =========================================================
   EXPRESS APPLICATION
========================================================= */

const app = express();

app.disable("x-powered-by");

if (process.env.TRUST_PROXY) {
  const trustProxyValue = /^\d+$/.test(
    process.env.TRUST_PROXY
  )
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY;

  app.set(
    "trust proxy",
    trustProxyValue
  );
}

/* =========================================================
   APPLICATION CONFIGURATION
========================================================= */

const normalizeOrigin = (value) => {
  const origin = String(
    value || ""
  ).trim();

  if (!origin) {
    return "";
  }

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(
      /\/+$/,
      ""
    );
  }
};

const configuredOrigins = new Set(
  (
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  )
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean)
);

const JSON_BODY_LIMIT =
  process.env.JSON_BODY_LIMIT ||
  "2mb";

const URLENCODED_BODY_LIMIT =
  process.env.URLENCODED_BODY_LIMIT ||
  "2mb";

const URLENCODED_PARAMETER_LIMIT = (() => {
  const parsed = Number(
    process.env.URLENCODED_PARAMETER_LIMIT ||
      1000
  );

  return Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= 10000
    ? parsed
    : 1000;
})();

/* =========================================================
   REQUEST CONTEXT
========================================================= */

app.use((req, res, next) => {
  const incomingRequestId = String(
    req.get("X-Request-Id") || ""
  ).trim();

  req.requestId =
    incomingRequestId.slice(0, 200) ||
    crypto.randomUUID();

  res.setHeader(
    "X-Request-Id",
    req.requestId
  );

  next();
});

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      const normalizedRequestOrigin =
        normalizeOrigin(origin);

      if (
        configuredOrigins.has(
          normalizedRequestOrigin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      const error = new Error(
        "Request origin is not allowed by CORS"
      );

      error.statusCode = 403;
      error.code =
        "CORS_ORIGIN_NOT_ALLOWED";

      return callback(error);
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Tenant-Id",
      "X-Webhook-Secret",
      "X-Courier-Webhook-Secret",
      "X-Webhook-Id",
      "X-Event-Id",
      "X-API-Key",
    ],

    exposedHeaders: [
      "X-Request-Id",
    ],

    maxAge: 86400,
  })
);

/* =========================================================
   COURIER WEBHOOK ROUTES
========================================================= */

app.use(
  "/api/webhooks/courier",
  courierWebhookRoute
);

/* =========================================================
   GLOBAL BODY PARSERS
========================================================= */

app.use(
  express.json({
    limit: JSON_BODY_LIMIT,
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: URLENCODED_BODY_LIMIT,
    parameterLimit:
      URLENCODED_PARAMETER_LIMIT,
  })
);

/* =========================================================
   HEALTH AND TEST ROUTES
========================================================= */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "TownMela Ecommerce API running",
    requestId: req.requestId,
  });
});

app.get("/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Server test working",
    requestId: req.requestId,
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "TownMela API is healthy",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

/* =========================================================
   AUTHENTICATION ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

/* =========================================================
   PLATFORM TENANT MANAGEMENT ROUTES
========================================================= */

/**
 * Base endpoint:
 * /api/tenants
 *
 * New tenants receive the Standard plan with a 7-day trial.
 * Expired trials are changed to:
 *
 * tenant.status = "suspended"
 * subscription.status = "expired"
 *
 * Platform-management authorization is handled inside
 * tenantRoutes.js.
 */
app.use(
  "/api/tenants",
  tenantRoutes
);

/* =========================================================
   CATALOG ROUTES
========================================================= */

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/products",
  productRoutes
);

/* =========================================================
   CUSTOMER SHOPPING ROUTES
========================================================= */

app.use(
  "/api/cart",
  cartRoutes
);

app.use(
  "/api/wishlist",
  wishlistRoutes
);

app.use(
  "/api/address",
  addressRoutes
);

app.use(
  "/api/addresses",
  addressRoutes
);

/* =========================================================
   ORDER ROUTES
========================================================= */

app.use(
  "/api/orders",
  orderRoutes
);

/* =========================================================
   COURIER ROUTES
========================================================= */

app.use(
  "/api/courier-settings",
  courierSettingRoutes
);

app.use(
  "/api/couriers",
  courierRoutes
);

app.use(
  "/api/courier-shipments",
  courierShipmentRoutes
);

/* =========================================================
   CUSTOMER MANAGEMENT ROUTES
========================================================= */

app.use(
  "/api/customers",
  customerRoutes
);

/* =========================================================
   ADMIN DASHBOARD ROUTES
========================================================= */

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* =========================================================
   COUPON ROUTES
========================================================= */

app.use(
  "/api/coupons",
  couponRoutes
);

/* =========================================================
   FILE UPLOAD ROUTES
========================================================= */

app.use(
  "/api/uploads",
  uploadRoutes
);

/* =========================================================
   HOMEPAGE MANAGEMENT ROUTES
========================================================= */

app.use(
  "/api/homepage-banners",
  homepageBannerRoutes
);

app.use(
  "/api/homepage-category-showcases",
  homepageCategoryShowcaseRoutes
);

app.use(
  "/api/popular-categories",
  popularCategoryRoutes
);

app.use(
  "/api/homepage-product-section-settings",
  homepageProductSectionSettingRoutes
);


/* =========================================================
   SUPPLIER AND PURCHASE ROUTES
========================================================= */

app.use(
  "/api/suppliers",
  supplierRoutes
);

app.use(
  "/api/purchase-orders",
  purchaseOrderRoutes
);

app.use(
  "/api/warehouses",
  warehouseRoutes
);

app.use(
  "/api/goods-received",
  goodsReceivedRoutes
);

app.use(
  "/api/goods-received",
  goodsReceivedInspectionRoutes
);

app.use(
  "/api/goods-received-inventory-posting",
  goodsReceivedInventoryPostingRoutes
);

app.use(
  "/api/vendor-invoices",
  vendorInvoiceRoutes
);

/* =========================================================
   ROI & PROFITABILITY ROUTES
========================================================= */

app.use(
  "/api/roi",
  roiRoutes
);

app.use(
  "/api/header-settings",
  headerSettingRoutes
);

app.use(
  "/api/footer-settings",
  footerSettingRoutes
);


app.use(
  "/api/checkout-settings",
  checkoutSettingRoutes
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.requestId,
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (res.headersSent) {
      return next(error);
    }

    const isMalformedJson =
      error instanceof SyntaxError &&
      error.status === 400 &&
      Object.prototype.hasOwnProperty.call(
        error,
        "body"
      );

    const statusCode =
      isMalformedJson
        ? 400
        : Number.isInteger(
              error.statusCode
            ) &&
            error.statusCode >= 400 &&
            error.statusCode <= 599
          ? error.statusCode
          : Number.isInteger(
                error.status
              ) &&
              error.status >= 400 &&
              error.status <= 599
            ? error.status
            : 500;

    const isProduction =
      process.env.NODE_ENV ===
      "production";

    const errorCode =
      isMalformedJson
        ? "INVALID_JSON_BODY"
        : typeof error.code ===
              "string" &&
            error.code.length <= 100
          ? error.code
          : statusCode === 500
            ? "INTERNAL_SERVER_ERROR"
            : "REQUEST_FAILED";

    console.error(
      "Unhandled server error:",
      {
        requestId:
          req.requestId,
        name:
          error.name,
        code:
          errorCode,
        message:
          error.message,
        statusCode,
        method:
          req.method,
        path:
          req.originalUrl,
        ip:
          req.ip,
        stack:
          isProduction
            ? undefined
            : error.stack,
      }
    );

    const response = {
      success: false,
      code: errorCode,
      message:
        isMalformedJson
          ? "Invalid JSON request body"
          : statusCode === 500 &&
              isProduction
            ? "Internal server error"
            : error.message ||
              "Internal server error",
      requestId:
        req.requestId,
    };

    if (
      !isProduction &&
      Array.isArray(
        error.validationErrors
      )
    ) {
      response.errors =
        error.validationErrors;
    }

    return res
      .status(statusCode)
      .json(response);
  }
);

/* =========================================================
   EXPORT APPLICATION
========================================================= */

module.exports = app;
