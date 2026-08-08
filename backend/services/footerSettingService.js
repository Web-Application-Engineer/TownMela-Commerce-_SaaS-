"use strict";

const mongoose = require("mongoose");

const FooterSetting = require(
  "../models/FooterSetting"
);

/* =========================================================
   DEFAULT FOOTER SETTINGS
========================================================= */

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

  googleMapUrl: "",

  footerLinks: [],

  copyrightText: "",

  isActive: true,
};

/* =========================================================
   ERROR HELPER
========================================================= */

const createError = (
  message,
  statusCode = 400,
  code = "FOOTER_SETTING_ERROR"
) => {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

/* =========================================================
   HELPERS
========================================================= */

const ensureTenantId = (
  tenantId
) => {
  if (
    !tenantId ||
    !mongoose.Types.ObjectId.isValid(
      tenantId
    )
  ) {
    throw createError(
      "Valid tenant ID is required",
      400,
      "INVALID_TENANT_ID"
    );
  }

  return tenantId;
};

const normalizeString = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
};

const normalizeFooterLinks = (
  links
) => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map(
      (
        item,
        index
      ) => ({
        label:
          normalizeString(
            item?.label
          ),

        url:
          normalizeString(
            item?.url
          ),

        enabled:
          item?.enabled !== false,

        order:
          Number.isFinite(
            Number(item?.order)
          )
            ? Number(
                item.order
              )
            : index + 1,
      })
    )
    .filter(
      (item) =>
        item.label &&
        item.url
    )
    .sort(
      (a, b) =>
        a.order - b.order
    );
};

/* =========================================================
   BUILD UPDATE PAYLOAD
========================================================= */

const buildUpdatePayload = (
  payload = {},
  userId = null
) => {
  const update = {};

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "businessName"
    )
  ) {
    update.businessName =
      normalizeString(
        payload.businessName
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "logo"
    )
  ) {
    update.logo =
      normalizeString(
        payload.logo
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "description"
    )
  ) {
    update.description =
      normalizeString(
        payload.description
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "phone"
    )
  ) {
    update.phone =
      normalizeString(
        payload.phone
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "email"
    )
  ) {
    update.email =
      normalizeString(
        payload.email
      ).toLowerCase();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "address"
    )
  ) {
    update.address =
      normalizeString(
        payload.address
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "facebook"
    )
  ) {
    update.facebook =
      normalizeString(
        payload.facebook
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "instagram"
    )
  ) {
    update.instagram =
      normalizeString(
        payload.instagram
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "youtube"
    )
  ) {
    update.youtube =
      normalizeString(
        payload.youtube
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "linkedin"
    )
  ) {
    update.linkedin =
      normalizeString(
        payload.linkedin
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "googleMapUrl"
    )
  ) {
    update.googleMapUrl =
      normalizeString(
        payload.googleMapUrl
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "footerLinks"
    )
  ) {
    update.footerLinks =
      normalizeFooterLinks(
        payload.footerLinks
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "copyrightText"
    )
  ) {
    update.copyrightText =
      normalizeString(
        payload.copyrightText
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "isActive"
    )
  ) {
    update.isActive =
      Boolean(
        payload.isActive
      );
  }

  if (
    userId &&
    mongoose.Types.ObjectId.isValid(
      userId
    )
  ) {
    update.updatedBy =
      userId;
  }

  return update;
};

/* =========================================================
   GET FOOTER SETTINGS
========================================================= */

const getFooterSetting =
  async ({
    tenantId,
  }) => {
    ensureTenantId(
      tenantId
    );

    const setting =
      await FooterSetting.findOne({
        tenant:
          tenantId,
      }).lean();

    if (!setting) {
      return {
        tenant:
          tenantId,

        ...DEFAULT_FOOTER_SETTINGS,
      };
    }

    return {
      ...DEFAULT_FOOTER_SETTINGS,
      ...setting,

      footerLinks:
        Array.isArray(
          setting.footerLinks
        )
          ? setting.footerLinks
          : [],
    };
  };

/* =========================================================
   UPDATE / CREATE FOOTER SETTINGS
========================================================= */

const updateFooterSetting =
  async ({
    tenantId,
    userId = null,
    payload = {},
  }) => {
    ensureTenantId(
      tenantId
    );

    const updatePayload =
      buildUpdatePayload(
        payload,
        userId
      );

    const setting =
      await FooterSetting.findOneAndUpdate(
        {
          tenant:
            tenantId,
        },

        {
          $set:
            updatePayload,

          $setOnInsert: {
            tenant:
              tenantId,
          },
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

    return setting;
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getFooterSetting,
  updateFooterSetting,
};