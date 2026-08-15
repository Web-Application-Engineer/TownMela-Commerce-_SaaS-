"use strict";

const HomepageProductSectionSetting = require(
  "../models/HomepageProductSectionSetting"
);

/* =========================================================
   DEFAULT SECTIONS
========================================================= */

const DEFAULT_SECTIONS = [
  {
    key: "topSelling",
    title: "Top Selling",
    active: true,
    order: 1,
  },
  {
    key: "exclusive",
    title: "Exclusive",
    active: true,
    order: 2,
  },
  {
    key: "newArrival",
    title: "New Arrival",
    active: true,
    order: 3,
  },
  {
    key: "fashionStyle",
    title: "Fashion & Style",
    active: true,
    order: 4,
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getTenantId = (req) =>
  req.tenantId ||
  req.tenant?._id ||
  null;

const getUserId = (req) =>
  req.user?.id ||
  req.user?._id ||
  null;

const createError = (
  message,
  statusCode = 400,
  code = "HOMEPAGE_PRODUCT_SECTION_SETTING_ERROR"
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

const sendError = (
  res,
  error
) => {
  const statusCode =
    Number(error?.statusCode) ||
    500;

  return res
    .status(statusCode)
    .json({
      success: false,

      message:
        error?.message ||
        "Something went wrong.",

      code:
        error?.code ||
        "HOMEPAGE_PRODUCT_SECTION_SETTING_ERROR",
    });
};

/* =========================================================
   SECTION NORMALIZATION
========================================================= */

const createSectionKey = (
  value,
  fallback
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    normalized ||
    fallback
  );
};

const normalizeSection = (
  section,
  index
) => {
  const title =
    String(
      section?.title ||
      ""
    ).trim();

  if (!title) {
    throw createError(
      `Section ${index + 1} title is required.`,
      400,
      "SECTION_TITLE_REQUIRED"
    );
  }

  const key =
    createSectionKey(
      section?.key ||
        title,
      `section-${index + 1}`
    );

  return {
    key,

    title,

    active:
      section?.active !==
      false,

    order:
      Math.max(
        1,
        Number(
          section?.order
        ) ||
          index + 1
      ),
  };
};

const normalizeSections = (
  sections
) => {
  if (
    !Array.isArray(
      sections
    )
  ) {
    throw createError(
      "Sections must be an array.",
      400,
      "INVALID_SECTIONS"
    );
  }

  const normalizedSections =
    sections.map(
      normalizeSection
    );

  const seenKeys =
    new Set();

  for (
    const section of
    normalizedSections
  ) {
    if (
      seenKeys.has(
        section.key
      )
    ) {
      throw createError(
        `Duplicate section key: ${section.key}`,
        400,
        "DUPLICATE_SECTION_KEY"
      );
    }

    seenKeys.add(
      section.key
    );
  }

  return normalizedSections
    .sort(
      (
        firstSection,
        secondSection
      ) =>
        firstSection.order -
        secondSection.order
    )
    .map(
      (
        section,
        index
      ) => ({
        ...section,

        order:
          index + 1,
      })
    );
};

/* =========================================================
   RESPONSE MAPPER
========================================================= */

const mapSettingResponse = (
  setting
) => {
  const sections =
    Array.isArray(
      setting?.sections
    )
      ? setting.sections
      : DEFAULT_SECTIONS;

  return {
    sections:
      sections
        .map(
          (
            section,
            index
          ) => ({
            id:
              section?._id
                ? String(
                    section._id
                  )
                : undefined,

            key:
              String(
                section?.key ||
                ""
              ).trim(),

            title:
              String(
                section?.title ||
                ""
              ).trim(),

            active:
              section?.active !==
              false,

            order:
              Math.max(
                1,
                Number(
                  section?.order
                ) ||
                  index + 1
              ),
          })
        )
        .filter(
          (section) =>
            section.key &&
            section.title
        )
        .sort(
          (
            firstSection,
            secondSection
          ) =>
            firstSection.order -
            secondSection.order
        ),

    isActive:
      setting?.isActive !==
      false,
  };
};

/* =========================================================
   GET HOMEPAGE PRODUCT SECTION SETTINGS
========================================================= */

const getHomepageProductSectionSetting =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getTenantId(req);

      if (!tenantId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Tenant ID is required.",

            code:
              "TENANT_ID_REQUIRED",
          });
      }

      const setting =
        await HomepageProductSectionSetting
          .findOne({
            tenant:
              tenantId,
          })
          .lean();

      /*
       * Public GET does not need to create a document.
       * If no record exists yet, safe default sections
       * are returned.
       */

      const data =
        setting
          ? mapSettingResponse(
              setting
            )
          : {
              sections:
                DEFAULT_SECTIONS.map(
                  (
                    section
                  ) => ({
                    ...section,
                  })
                ),

              isActive:
                true,
            };

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Homepage product section settings loaded successfully.",

          data,
        });
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  };

/* =========================================================
   UPDATE HOMEPAGE PRODUCT SECTION SETTINGS
========================================================= */

const updateHomepageProductSectionSetting =
  async (
    req,
    res
  ) => {
    try {
      const tenantId =
        getTenantId(req);

      const userId =
        getUserId(req);

      if (!tenantId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Tenant ID is required.",

            code:
              "TENANT_ID_REQUIRED",
          });
      }

      const payload =
        req.body || {};

      const normalizedSections =
        normalizeSections(
          payload.sections
        );

      const isActive =
        payload.isActive !==
        false;

      const setting =
        await HomepageProductSectionSetting
          .findOneAndUpdate(
            {
              tenant:
                tenantId,
            },

            {
              $set: {
                sections:
                  normalizedSections,

                isActive,

                updatedBy:
                  userId ||
                  null,
              },
            },

            {
              new: true,

              upsert: true,

              runValidators:
                true,

              setDefaultsOnInsert:
                true,
            }
          );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Homepage product section settings saved successfully.",

          data:
            mapSettingResponse(
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
  getHomepageProductSectionSetting,
  updateHomepageProductSectionSetting,
};