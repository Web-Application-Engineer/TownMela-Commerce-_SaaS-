"use strict";

const express = require("express");

const settingController = require(
  "../controllers/settingController"
);

const {
  validateGetSettingsQuery,
  validateSettingsSectionParam,
  validatePublicSettingsSectionParam,
  validateUpdateSettings,
  validateUpdateSettingsSection,
  validateUpdateOwnerOnlySettings,
} = require(
  "../validators/settingValidator"
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const requireTenant = require(
  "../middleware/requireTenant"
);

const router = express.Router();

/* =========================================================
   GLOBAL SETTINGS ROUTE PROTECTION

   Every route below requires:

   1. Authenticated user
   2. Valid tenant context
   3. Tenant administration access
========================================================= */

router.use(
  protect,
  requireTenant,
  adminOnly
);

/* =========================================================
   GET SETTINGS STATUS

   GET /api/settings/status

   Must remain above "/:section" so that "status" is not
   interpreted as a settings section.
========================================================= */

router.get(
  "/status",
  settingController.getSettingsStatus
);

/* =========================================================
   OWNER-ONLY SETTINGS

   Authorization is enforced again inside the service layer.

   GET   /api/settings/owner-only
   PATCH /api/settings/owner-only
========================================================= */

router.get(
  "/owner-only",
  settingController.getOwnerOnlySettings
);

router.patch(
  "/owner-only",
  validateUpdateOwnerOnlySettings,
  settingController.updateOwnerOnlySettings
);

/* =========================================================
   SETTINGS ARCHIVE AND RESTORE

   These endpoints are protected by Tenant Owner validation
   inside the service layer.

   PATCH /api/settings/archive
   PATCH /api/settings/restore

   Must remain above "/:section".
========================================================= */

router.patch(
  "/archive",
  settingController.archiveTenantSettings
);

router.patch(
  "/restore",
  settingController.restoreTenantSettings
);

/* =========================================================
   GET ALL PUBLIC SETTINGS

   GET /api/settings

   Optional query:

   GET /api/settings?section=general
========================================================= */

router.get(
  "/",
  validateGetSettingsQuery,
  settingController.getSettings
);

/* =========================================================
   UPDATE MULTIPLE PUBLIC SETTINGS SECTIONS

   PATCH /api/settings

   Example body:

   {
     "general": {
       "storeName": "TownMela"
     },
     "orders": {
       "allowGuestCheckout": true
     }
   }
========================================================= */

router.patch(
  "/",
  validateUpdateSettings,
  settingController.updateSettings
);

/* =========================================================
   RESET A SETTINGS SECTION

   POST /api/settings/:section/reset

   Examples:

   POST /api/settings/general/reset
   POST /api/settings/branding/reset
   POST /api/settings/owner-only/reset

   Owner-only reset is additionally protected by the service.
========================================================= */

router.post(
  "/:section/reset",
  validateSettingsSectionParam,
  settingController.resetSettingsSection
);

/* =========================================================
   GET SINGLE PUBLIC SETTINGS SECTION

   GET /api/settings/:section

   Examples:

   GET /api/settings/general
   GET /api/settings/branding
   GET /api/settings/orders
========================================================= */

router.get(
  "/:section",
  validatePublicSettingsSectionParam,
  settingController.getSettingsSection
);

/* =========================================================
   UPDATE SINGLE PUBLIC SETTINGS SECTION

   PATCH /api/settings/:section

   Example:

   PATCH /api/settings/general

   {
     "storeName": "TownMela",
     "currency": "BDT"
   }
========================================================= */

router.patch(
  "/:section",
  validatePublicSettingsSectionParam,
  validateUpdateSettingsSection,
  settingController.updateSettingsSection
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;