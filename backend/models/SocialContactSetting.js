"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =========================================================
   DEFAULTS

   These defaults mirror the existing WordPress Easy Contact
   widget so the TownMela master tenant starts with the same
   complete contact/appearance configuration.
========================================================= */

const DEFAULT_SOCIAL_CONTACT_SETTINGS = Object.freeze({
  isActive: true,
  labelText: "Hello Me",
  labelAnimationStyle: "typing",

  contacts: {
    messenger: {
      enabled: true,
      url: "https://m.me/160255357179177",
      color: "#1b8cff",
    },

    whatsapp: {
      enabled: true,
      url: "https://wa.link/ux0yw0",
      color: "#2db742",
    },

    phone: {
      enabled: true,
      number: "+8801786373379",
      color: "#5f88f5",
    },

    facebook: {
      enabled: true,
      url: "https://facebook.com/",
      color: "#1877f2",
    },

    instagram: {
      enabled: true,
      url: "https://instagram.com/",
      color: "#e4405f",
    },

    youtube: {
      enabled: true,
      url: "https://youtube.com/",
      color: "#ff0000",
    },
  },

  appearance: {
    panelBackground: "#dddcdc",
    borderColor: "#b6252a",
    mainButtonColor: "#b6252a",
    mainButtonHoverColor: "#D15741",
    labelBackground: "#2C2F72",
    labelHoverColor: "#1DAA61",
    labelTextColor: "#ffffff",
    pulseColor: "#b6252a",
  },
});

const cloneDefaults = () =>
  JSON.parse(
    JSON.stringify(
      DEFAULT_SOCIAL_CONTACT_SETTINGS
    )
  );

/* =========================================================
   VALIDATORS
========================================================= */

const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const PHONE_PATTERN =
  /^[+0-9()\-\s]{3,50}$/;

const colorField = (defaultValue) => ({
  type: String,
  trim: true,
  default: defaultValue,
  maxlength: 20,
  validate: {
    validator(value) {
      return HEX_COLOR_PATTERN.test(
        String(value || "")
      );
    },
    message:
      "A valid hex color is required",
  },
});

const urlChannelSchema = (
  defaultUrl,
  defaultColor
) =>
  new Schema(
    {
      enabled: {
        type: Boolean,
        default: true,
      },

      url: {
        type: String,
        trim: true,
        default: defaultUrl,
        maxlength: 2000,
      },

      color: colorField(
        defaultColor
      ),
    },
    {
      _id: false,
    }
  );

const phoneChannelSchema =
  new Schema(
    {
      enabled: {
        type: Boolean,
        default: true,
      },

      number: {
        type: String,
        trim: true,
        default:
          DEFAULT_SOCIAL_CONTACT_SETTINGS
            .contacts.phone.number,
        maxlength: 50,
        validate: {
          validator(value) {
            const normalized =
              String(value || "").trim();

            return (
              !normalized ||
              PHONE_PATTERN.test(
                normalized
              )
            );
          },
          message:
            "A valid phone number is required",
        },
      },

      color: colorField(
        DEFAULT_SOCIAL_CONTACT_SETTINGS
          .contacts.phone.color
      ),
    },
    {
      _id: false,
    }
  );

/* =========================================================
   SCHEMA
========================================================= */

const socialContactSettingSchema =
  new Schema(
    {
      tenant: {
        type:
          Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
        unique: true,
        index: true,
        immutable: true,
      },

      isActive: {
        type: Boolean,
        default:
          DEFAULT_SOCIAL_CONTACT_SETTINGS
            .isActive,
      },

      labelText: {
        type: String,
        trim: true,
        maxlength: 40,
        default:
          DEFAULT_SOCIAL_CONTACT_SETTINGS
            .labelText,
      },

      labelAnimationStyle: {
        type: String,
        trim: true,
        lowercase: true,
        enum: [
          "none",
          "typing",
          "wave",
          "flip",
          "fade",
          "bounce",
        ],
        default:
          DEFAULT_SOCIAL_CONTACT_SETTINGS
            .labelAnimationStyle,
      },

      contacts: {
        messenger:
          urlChannelSchema(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.messenger.url,
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.messenger.color
          ),

        whatsapp:
          urlChannelSchema(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.whatsapp.url,
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.whatsapp.color
          ),

        phone:
          phoneChannelSchema,

        facebook:
          urlChannelSchema(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.facebook.url,
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.facebook.color
          ),

        instagram:
          urlChannelSchema(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.instagram.url,
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.instagram.color
          ),

        youtube:
          urlChannelSchema(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.youtube.url,
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .contacts.youtube.color
          ),
      },

      appearance: {
        panelBackground:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.panelBackground
          ),

        borderColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.borderColor
          ),

        mainButtonColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.mainButtonColor
          ),

        mainButtonHoverColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.mainButtonHoverColor
          ),

        labelBackground:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.labelBackground
          ),

        labelHoverColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.labelHoverColor
          ),

        labelTextColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.labelTextColor
          ),

        pulseColor:
          colorField(
            DEFAULT_SOCIAL_CONTACT_SETTINGS
              .appearance.pulseColor
          ),
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      minimize: false,
    }
  );

/* =========================================================
   STATICS
========================================================= */

socialContactSettingSchema.statics.getDefaultSettings =
  function getDefaultSettings() {
    return cloneDefaults();
  };

/* =========================================================
   MODEL
========================================================= */

const SocialContactSetting =
  mongoose.models
    .SocialContactSetting ||
  mongoose.model(
    "SocialContactSetting",
    socialContactSettingSchema
  );

/*
 * Expose a safe clone helper for public fallbacks and tenant
 * provisioning without duplicating default values elsewhere.
 */
SocialContactSetting.getDefaultSettings =
  () => cloneDefaults();

module.exports =
  SocialContactSetting;
