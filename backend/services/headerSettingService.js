"use strict";

const mongoose = require("mongoose");

const HeaderSetting = require(
  "../models/HeaderSetting"
);

/* =========================================================
   DEFAULT HEADER SETTINGS
========================================================= */

const DEFAULT_HEADER_SETTINGS = {
  businessName: "",
  logo: "",
  mobileLogo: "",
  phone: "",
  email: "",

  announcementText: "",
  announcementEnabled: false,

  menus: [],

  searchEnabled: true,
  wishlistEnabled: true,
  accountEnabled: true,
  cartEnabled: true,

  isActive: true,
};

/* =========================================================
   ERROR HELPER
========================================================= */

const createError = (
  message,
  statusCode = 400,
  code = "HEADER_SETTING_ERROR"
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

/* =========================================================
   TENANT VALIDATION
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

/* =========================================================
   STRING NORMALIZER
========================================================= */

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

/* =========================================================
   MENU NORMALIZER
========================================================= */

const normalizeMenus = (
  menus
) => {
  if (!Array.isArray(menus)) {
    return [];
  }

  return menus
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
      "mobileLogo"
    )
  ) {
    update.mobileLogo =
      normalizeString(
        payload.mobileLogo
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
      "announcementText"
    )
  ) {
    update.announcementText =
      normalizeString(
        payload.announcementText
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "announcementEnabled"
    )
  ) {
    update.announcementEnabled =
      Boolean(
        payload.announcementEnabled
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "menus"
    )
  ) {
    update.menus =
      normalizeMenus(
        payload.menus
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "searchEnabled"
    )
  ) {
    update.searchEnabled =
      Boolean(
        payload.searchEnabled
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "wishlistEnabled"
    )
  ) {
    update.wishlistEnabled =
      Boolean(
        payload.wishlistEnabled
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "accountEnabled"
    )
  ) {
    update.accountEnabled =
      Boolean(
        payload.accountEnabled
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "cartEnabled"
    )
  ) {
    update.cartEnabled =
      Boolean(
        payload.cartEnabled
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
   GET HEADER SETTINGS
========================================================= */

const getHeaderSetting =
  async ({
    tenantId,
  }) => {
    ensureTenantId(
      tenantId
    );

    const setting =
      await HeaderSetting.findOne({
        tenant:
          tenantId,
      }).lean();

    /*
     * If the tenant does not have saved
     * settings yet, return safe defaults.
     */
    if (!setting) {
      return {
        tenant:
          tenantId,

        ...DEFAULT_HEADER_SETTINGS,
      };
    }

    return {
      ...DEFAULT_HEADER_SETTINGS,

      ...setting,

      menus:
        Array.isArray(
          setting.menus
        )
          ? setting.menus
          : [],
    };
  };

/* =========================================================
   UPDATE / CREATE HEADER SETTINGS
========================================================= */

const updateHeaderSetting =
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

    /*
     * IMPORTANT:
     *
     * $set contains the fields supplied by the user.
     *
     * $setOnInsert contains ONLY tenant.
     *
     * Schema defaults will automatically populate the
     * remaining fields when a new document is created.
     *
     * This prevents MongoDB update conflicts such as:
     *
     * "Updating the path 'businessName' would create
     * a conflict at 'businessName'"
     */
    const setting =
      await HeaderSetting.findOneAndUpdate(
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
  getHeaderSetting,
  updateHeaderSetting,
};