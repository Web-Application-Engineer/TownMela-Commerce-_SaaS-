"use strict";

const settingService = require(
  "../services/settingService"
);

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message,
    data = null,
  }
) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

/* =========================================================
   REQUEST CONTEXT HELPERS
========================================================= */

const getTenantId = (req) =>
  req.tenantId ||
  req.tenant?._id ||
  req.tenant?.id ||
  req.auth?.tenantId ||
  req.user?.tenant ||
  null;

const getActorId = (req) =>
  req.user?._id ||
  req.user?.id ||
  req.auth?.userId ||
  req.auth?.id ||
  null;

const getActorRole = (req) =>
  req.auth?.role ||
  req.user?.role ||
  req.user?.userRole ||
  "";

const getRequestId = (req) =>
  req.id ||
  req.requestId ||
  req.headers?.["x-request-id"] ||
  "";

const isActorTenantOwner = (req) => {
  if (
    req.auth?.isTenantOwner === true ||
    req.user?.isTenantOwner === true
  ) {
    return true;
  }

  return settingService.isTenantOwner({
    actorRole: getActorRole(req),
  });
};

const getExpectedVersion = (req) => {
  const headerVersion =
    req.headers?.["if-match"];

  const bodyVersion =
    req.body?.version ??
    req.body?.expectedVersion;

  const queryVersion =
    req.query?.version ??
    req.query?.expectedVersion;

  const rawVersion =
    headerVersion ??
    bodyVersion ??
    queryVersion;

  if (
    rawVersion === undefined ||
    rawVersion === null ||
    rawVersion === ""
  ) {
    return null;
  }

  return String(rawVersion)
    .replace(/^W\//, "")
    .replace(/^"/, "")
    .replace(/"$/, "")
    .trim();
};

const buildActorContext = (req) => ({
  actorId: getActorId(req),
  actorRole: getActorRole(req),
  actorIsTenantOwner:
    isActorTenantOwner(req),
  requestId: getRequestId(req),
});

/* =========================================================
   GET ALL PUBLIC SETTINGS

   GET /api/settings
========================================================= */

const getSettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const section =
      req.query?.section || null;

    const settings =
      await settingService.getSettings({
        tenantId,
        section,
        includeOwnerOnly: false,
      });

    return sendSuccess(res, {
      message: section
        ? `${section} settings retrieved successfully`
        : "Tenant settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET SINGLE PUBLIC SECTION

   GET /api/settings/:section
========================================================= */

const getSettingsSection = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const section =
      req.params.section;

    const settings =
      await settingService.getSettingsSection({
        tenantId,
        section,
      });

    return sendSuccess(res, {
      message:
        `${section} settings retrieved successfully`,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE MULTIPLE PUBLIC SECTIONS

   PATCH /api/settings

   Example:
   {
     "general": {},
     "branding": {}
   }
========================================================= */

const updateSettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const {
      version,
      expectedVersion,
      ...updates
    } = req.body;

    const settings =
      await settingService.updateSettings({
        tenantId,
        updates,
        expectedVersion:
          getExpectedVersion(req),
        actorId: getActorId(req),
        actorRole: getActorRole(req),
        requestId: getRequestId(req),
      });

    return sendSuccess(res, {
      message:
        "Tenant settings updated successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE SINGLE PUBLIC SECTION

   PATCH /api/settings/:section
========================================================= */

const updateSettingsSection = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const section =
      req.params.section;

    const {
      version,
      expectedVersion,
      ...updates
    } = req.body;

    const settings =
      await settingService
        .updateSettingsSection({
          tenantId,
          section,
          updates,
          expectedVersion:
            getExpectedVersion(req),
          actorId:
            getActorId(req),
          actorRole:
            getActorRole(req),
          requestId:
            getRequestId(req),
        });

    return sendSuccess(res, {
      message:
        `${section} settings updated successfully`,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET OWNER-ONLY SETTINGS

   GET /api/settings/owner-only
========================================================= */

const getOwnerOnlySettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const actorContext =
      buildActorContext(req);

    const settings =
      await settingService
        .getOwnerOnlySettings({
          tenantId,
          actorRole:
            actorContext.actorRole,
          actorIsTenantOwner:
            actorContext.actorIsTenantOwner,
        });

    return sendSuccess(res, {
      message:
        "Owner-only settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE OWNER-ONLY SETTINGS

   PATCH /api/settings/owner-only
========================================================= */

const updateOwnerOnlySettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const actorContext =
      buildActorContext(req);

    const {
      version,
      expectedVersion,
      ...updates
    } = req.body;

    const settings =
      await settingService
        .updateOwnerOnlySettings({
          tenantId,
          updates,
          expectedVersion:
            getExpectedVersion(req),
          ...actorContext,
        });

    return sendSuccess(res, {
      message:
        "Owner-only settings updated successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   RESET PUBLIC OR OWNER-ONLY SECTION

   POST /api/settings/:section/reset
========================================================= */

const resetSettingsSection = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const section =
      req.params.section;

    const actorContext =
      buildActorContext(req);

    const settings =
      await settingService
        .resetSettingsSection({
          tenantId,
          section,
          expectedVersion:
            getExpectedVersion(req),
          ...actorContext,
        });

    return sendSuccess(res, {
      message:
        `${section} settings reset successfully`,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CHECK SETTINGS EXISTENCE

   GET /api/settings/status
========================================================= */

const getSettingsStatus = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const exists =
      await settingService
        .tenantSettingsExist({
          tenantId,
        });

    return sendSuccess(res, {
      message:
        "Tenant settings status retrieved successfully",
      data: {
        exists,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   ARCHIVE SETTINGS

   PATCH /api/settings/archive

   Keep this route restricted to Tenant Owner or Platform
   administration.
========================================================= */

const archiveTenantSettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const actorContext =
      buildActorContext(req);

    const result =
      await settingService
        .archiveTenantSettings({
          tenantId,
          ...actorContext,
        });

    return sendSuccess(res, {
      message:
        "Tenant settings archived successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   RESTORE SETTINGS

   PATCH /api/settings/restore
========================================================= */

const restoreTenantSettings = async (
  req,
  res,
  next
) => {
  try {
    const tenantId =
      getTenantId(req);

    const actorContext =
      buildActorContext(req);

    const settings =
      await settingService
        .restoreTenantSettings({
          tenantId,
          ...actorContext,
        });

    return sendSuccess(res, {
      message:
        "Tenant settings restored successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getSettings,
  getSettingsSection,

  updateSettings,
  updateSettingsSection,

  getOwnerOnlySettings,
  updateOwnerOnlySettings,

  resetSettingsSection,
  getSettingsStatus,

  archiveTenantSettings,
  restoreTenantSettings,
};