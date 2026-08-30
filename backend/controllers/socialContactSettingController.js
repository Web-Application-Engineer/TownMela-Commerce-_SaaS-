"use strict";

const mongoose = require("mongoose");

const SocialContactSetting = require(
  "../models/SocialContactSetting"
);

/* =========================================================
   CONSTANTS
========================================================= */

const URL_CHANNELS = [
  "messenger",
  "whatsapp",
  "facebook",
  "instagram",
  "youtube",
];

const LABEL_ANIMATION_STYLES = [
  "none",
  "typing",
  "wave",
  "flip",
  "fade",
  "bounce",
];

const APPEARANCE_FIELDS = [
  "panelBackground",
  "borderColor",
  "mainButtonColor",
  "mainButtonHoverColor",
  "labelBackground",
  "labelHoverColor",
  "labelTextColor",
  "pulseColor",
];

const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const PHONE_PATTERN =
  /^[+0-9()\-\s]{3,50}$/;

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const sendSuccess = (
  res,
  {
    statusCode = 200,
    message =
      "Request completed successfully",
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

const sendError = (
  res,
  error
) => {
  const statusCode =
    Number.isInteger(
      error?.statusCode
    ) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : error?.name ===
          "ValidationError"
        ? 400
        : 500;

  if (statusCode === 500) {
    console.error(
      "Social contact settings controller error:",
      error
    );
  }

  return res
    .status(statusCode)
    .json({
      success: false,
      message:
        statusCode === 500
          ? "Internal server error"
          : error?.message ||
            "Request failed",
    });
};

const createHttpError = (
  statusCode,
  message
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/* =========================================================
   TENANT HELPERS
========================================================= */

const normalizeTenantId = (
  value
) =>
  String(value || "").trim();

const validateTenantId = (
  value
) => {
  const tenantId =
    normalizeTenantId(value);

  if (
    !tenantId ||
    !mongoose.Types.ObjectId.isValid(
      tenantId
    )
  ) {
    throw createHttpError(
      400,
      "A valid tenant ID is required."
    );
  }

  return tenantId;
};

const getAdminTenantId = (
  req
) =>
  validateTenantId(
    req.tenantId ||
      req.tenant?._id ||
      req.tenant?.id
  );

const getPublicTenantId = (
  req
) =>
  validateTenantId(
    req.get("X-Tenant-Id")
  );

/* =========================================================
   DATA HELPERS
========================================================= */

const isPlainObject = (
  value
) =>
  Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );

const toPlainObject = (
  value
) => {
  if (!value) {
    return {};
  }

  if (
    typeof value.toObject ===
    "function"
  ) {
    return value.toObject({
      depopulate: true,
      versionKey: false,
    });
  }

  return {
    ...value,
  };
};

const normalizeSettingsForResponse = (
  setting
) => {
  const defaults =
    SocialContactSetting.getDefaultSettings();

  const plain =
    toPlainObject(setting);

  const contacts =
    isPlainObject(
      plain.contacts
    )
      ? plain.contacts
      : {};

  const appearance =
    isPlainObject(
      plain.appearance
    )
      ? plain.appearance
      : {};

  return {
    isActive:
      typeof plain.isActive ===
      "boolean"
        ? plain.isActive
        : defaults.isActive,

    labelText:
      typeof plain.labelText ===
      "string"
        ? plain.labelText
        : defaults.labelText,

    labelAnimationStyle:
      LABEL_ANIMATION_STYLES.includes(
        plain.labelAnimationStyle
      )
        ? plain.labelAnimationStyle
        : defaults.labelAnimationStyle,

    contacts: {
      messenger: {
        ...defaults.contacts
          .messenger,
        ...toPlainObject(
          contacts.messenger
        ),
      },

      whatsapp: {
        ...defaults.contacts
          .whatsapp,
        ...toPlainObject(
          contacts.whatsapp
        ),
      },

      phone: {
        ...defaults.contacts
          .phone,
        ...toPlainObject(
          contacts.phone
        ),
      },

      facebook: {
        ...defaults.contacts
          .facebook,
        ...toPlainObject(
          contacts.facebook
        ),
      },

      instagram: {
        ...defaults.contacts
          .instagram,
        ...toPlainObject(
          contacts.instagram
        ),
      },

      youtube: {
        ...defaults.contacts
          .youtube,
        ...toPlainObject(
          contacts.youtube
        ),
      },
    },

    appearance: {
      ...defaults.appearance,
      ...appearance,
    },
  };
};

const getOrCreateTenantSetting =
  async (
    tenantId
  ) =>
    SocialContactSetting.findOneAndUpdate(
      {
        tenant: tenantId,
      },
      {
        $setOnInsert: {
          tenant: tenantId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert:
          true,
      }
    );

/* =========================================================
   INPUT SANITIZERS
========================================================= */

const normalizeBoolean = (
  value,
  fieldName
) => {
  if (
    typeof value !==
    "boolean"
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be true or false.`
    );
  }

  return value;
};

const normalizeColor = (
  value,
  fieldName
) => {
  const color =
    String(value || "").trim();

  if (
    !HEX_COLOR_PATTERN.test(
      color
    )
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be a valid hex color.`
    );
  }

  return color;
};

const normalizeUrl = (
  value,
  fieldName
) => {
  const url =
    String(value || "").trim();

  if (!url) {
    return "";
  }

  if (url.length > 2000) {
    throw createHttpError(
      400,
      `${fieldName} is too long.`
    );
  }

  try {
    const parsedUrl =
      new URL(url);

    if (
      ![
        "http:",
        "https:",
      ].includes(
        parsedUrl.protocol
      )
    ) {
      throw new Error(
        "Unsupported protocol"
      );
    }
  } catch {
    throw createHttpError(
      400,
      `${fieldName} must be a valid http or https URL.`
    );
  }

  return url;
};

const normalizePhone = (
  value
) => {
  const phone =
    String(value || "").trim();

  if (!phone) {
    return "";
  }

  if (
    !PHONE_PATTERN.test(
      phone
    )
  ) {
    throw createHttpError(
      400,
      "Phone number contains invalid characters."
    );
  }

  return phone;
};

const normalizeLabelText = (
  value
) => {
  const labelText =
    String(value || "").trim();

  if (
    labelText.length > 40
  ) {
    throw createHttpError(
      400,
      "Contact label must not exceed 40 characters."
    );
  }

  return labelText;
};

const normalizeLabelAnimationStyle = (
  value
) => {
  const animationStyle =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    !LABEL_ANIMATION_STYLES.includes(
      animationStyle
    )
  ) {
    throw createHttpError(
      400,
      "A valid label animation style is required."
    );
  }

  return animationStyle;
};

/* =========================================================
   PATCH BUILDER

   Only supported Social Contact fields are accepted. Tenant,
   audit fields and unrelated document data can never be
   changed from the request body.
========================================================= */

const buildUpdate = (
  payload = {}
) => {
  if (
    !isPlainObject(payload)
  ) {
    throw createHttpError(
      400,
      "Social contact settings must be an object."
    );
  }

  const update = {};

  if (
    payload.isActive !==
    undefined
  ) {
    update.isActive =
      normalizeBoolean(
        payload.isActive,
        "isActive"
      );
  }

  if (
    payload.labelText !==
    undefined
  ) {
    update.labelText =
      normalizeLabelText(
        payload.labelText
      );
  }

  if (
    payload.labelAnimationStyle !==
    undefined
  ) {
    update.labelAnimationStyle =
      normalizeLabelAnimationStyle(
        payload.labelAnimationStyle
      );
  }

  if (
    payload.contacts !==
    undefined
  ) {
    if (
      !isPlainObject(
        payload.contacts
      )
    ) {
      throw createHttpError(
        400,
        "contacts must be an object."
      );
    }

    for (
      const channelName of
      URL_CHANNELS
    ) {
      const channel =
        payload.contacts[
          channelName
        ];

      if (
        channel ===
        undefined
      ) {
        continue;
      }

      if (
        !isPlainObject(
          channel
        )
      ) {
        throw createHttpError(
          400,
          `contacts.${channelName} must be an object.`
        );
      }

      if (
        channel.enabled !==
        undefined
      ) {
        update[
          `contacts.${channelName}.enabled`
        ] = normalizeBoolean(
          channel.enabled,
          `contacts.${channelName}.enabled`
        );
      }

      if (
        channel.url !==
        undefined
      ) {
        update[
          `contacts.${channelName}.url`
        ] = normalizeUrl(
          channel.url,
          `contacts.${channelName}.url`
        );
      }

      if (
        channel.color !==
        undefined
      ) {
        update[
          `contacts.${channelName}.color`
        ] = normalizeColor(
          channel.color,
          `contacts.${channelName}.color`
        );
      }
    }

    const phoneChannel =
      payload.contacts.phone;

    if (
      phoneChannel !==
      undefined
    ) {
      if (
        !isPlainObject(
          phoneChannel
        )
      ) {
        throw createHttpError(
          400,
          "contacts.phone must be an object."
        );
      }

      if (
        phoneChannel.enabled !==
        undefined
      ) {
        update[
          "contacts.phone.enabled"
        ] = normalizeBoolean(
          phoneChannel.enabled,
          "contacts.phone.enabled"
        );
      }

      if (
        phoneChannel.number !==
        undefined
      ) {
        update[
          "contacts.phone.number"
        ] = normalizePhone(
          phoneChannel.number
        );
      }

      if (
        phoneChannel.color !==
        undefined
      ) {
        update[
          "contacts.phone.color"
        ] = normalizeColor(
          phoneChannel.color,
          "contacts.phone.color"
        );
      }
    }
  }

  if (
    payload.appearance !==
    undefined
  ) {
    if (
      !isPlainObject(
        payload.appearance
      )
    ) {
      throw createHttpError(
        400,
        "appearance must be an object."
      );
    }

    for (
      const field of
      APPEARANCE_FIELDS
    ) {
      if (
        payload.appearance[
          field
        ] === undefined
      ) {
        continue;
      }

      update[
        `appearance.${field}`
      ] = normalizeColor(
        payload.appearance[
          field
        ],
        `appearance.${field}`
      );
    }
  }

  return update;
};

/* =========================================================
   PUBLIC GET

   GET /api/social-contact-settings/public

   This route intentionally exposes only storefront-safe
   contact/appearance values. No authentication is required.
========================================================= */

const getPublicSocialContactSettings =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getPublicTenantId(req);

      const setting =
        await SocialContactSetting.findOne(
          {
            tenant: tenantId,
          }
        ).lean();

      return sendSuccess(res, {
        message:
          "Social contact settings fetched successfully",
        data:
          normalizeSettingsForResponse(
            setting ||
              SocialContactSetting.getDefaultSettings()
          ),
      });
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   ADMIN GET

   GET /api/social-contact-settings
========================================================= */

const getSocialContactSettings =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getAdminTenantId(req);

      const setting =
        await getOrCreateTenantSetting(
          tenantId
        );

      return sendSuccess(res, {
        message:
          "Social contact settings fetched successfully",
        data:
          normalizeSettingsForResponse(
            setting
          ),
      });
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   ADMIN UPDATE

   PATCH /api/social-contact-settings
========================================================= */

const updateSocialContactSettings =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getAdminTenantId(req);

      const update =
        buildUpdate(
          req.body || {}
        );

      const userId =
        req.user?._id ||
        req.auth?.userId ||
        null;

      if (userId) {
        update.updatedBy =
          userId;
      }

      const setting =
        await SocialContactSetting.findOneAndUpdate(
          {
            tenant: tenantId,
          },
          {
            $set: update,
            $setOnInsert: {
              tenant: tenantId,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true,
          }
        );

      return sendSuccess(res, {
        message:
          "Social contact settings saved successfully",
        data:
          normalizeSettingsForResponse(
            setting
          ),
      });
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getPublicSocialContactSettings,
  getSocialContactSettings,
  updateSocialContactSettings,
};
