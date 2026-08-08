const express = require("express");

const resolvePublicTenant =
  require(
    "../middleware/resolvePublicTenant"
  );

const {
  getHomepageBanners,
  getSingleHomepageBanner,
  createHomepageBanner,
  updateHomepageBanner,
  deleteHomepageBanner,
} = require(
  "../controllers/homepageBannerController"
);

const {
  protect,
  requireTenant,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   PUBLIC ROUTES
========================================================= */

/*
  Get all homepage banners

  GET /api/homepage-banners

  Optional examples:
  GET /api/homepage-banners?active=true
  GET /api/homepage-banners?type=main
  GET /api/homepage-banners?type=sideTop&active=true
*/

router.get(
  "/",
  resolvePublicTenant,
  getHomepageBanners
);

/*
  Get one homepage banner

  GET /api/homepage-banners/:id
*/

router.get(
  "/:id",
  resolvePublicTenant,
  getSingleHomepageBanner
);

/* =========================================================
   ADMIN ROUTES
========================================================= */

/*
  Create homepage banner

  POST /api/homepage-banners
*/

router.post(
  "/",
  protect,
  requireTenant,
  adminOnly,
  createHomepageBanner
);

/*
  Update homepage banner

  PUT /api/homepage-banners/:id
*/

router.put(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  updateHomepageBanner
);

/*
  Delete homepage banner

  DELETE /api/homepage-banners/:id
*/

router.delete(
  "/:id",
  protect,
  requireTenant,
  adminOnly,
  deleteHomepageBanner
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;