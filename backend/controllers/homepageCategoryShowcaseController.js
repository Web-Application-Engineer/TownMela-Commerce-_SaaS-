const mongoose = require("mongoose");

const HomepageCategoryShowcase = require(
  "../models/HomepageCategoryShowcase"
);

const Category = require(
  "../models/Category"
);

const resolveTenantId = (req) =>
  String(
    req.tenantId ||
      req.tenant?._id ||
      req.tenant?.id ||
      req.auth?.tenantId ||
      req.user?.tenantId ||
      req.user?.tenant?._id ||
      req.user?.tenant ||
      "",
  ).trim();

const ensureTenantId = (req, res) => {
  const tenantId =
    resolveTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      success: false,
      message:
        "Tenant context is required",
    });

    return "";
  }

  return tenantId;
};

/* =========================================================
   CONSTANTS
========================================================= */

const SHOWCASE_CONFIG_KEY =
  "homepage-category-showcase";

const CATEGORY_SELECT_FIELDS =
  "name slug thumbnail featured status";

const MAX_SHOWCASE_TITLE_LENGTH = 120;

const DEFAULT_SHOWCASE_TITLES = {
  showcaseOne: "Explore Categories",
  showcaseTwo: "Featured Categories",
  showcaseThree: "More Categories",
};

const CATEGORY_SLOT_KEYS = [
  "categoryOne",
  "categoryTwo",
  "categoryThree",
];

/* =========================================================
   CUSTOM VALIDATION ERROR
========================================================= */

class ShowcaseValidationError extends Error {
  constructor(message) {
    super(message);

    this.name =
      "ShowcaseValidationError";

    this.statusCode = 400;
  }
}

/* =========================================================
   HELPER: POPULATE CATEGORY SLOTS
========================================================= */

const populateCategorySlots = (
  query
) => {
  return query.populate([
    {
      path:
        "showcaseOne.categoryOne",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseOne.categoryTwo",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseOne.categoryThree",
      select:
        CATEGORY_SELECT_FIELDS,
    },

    {
      path:
        "showcaseTwo.categoryOne",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseTwo.categoryTwo",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseTwo.categoryThree",
      select:
        CATEGORY_SELECT_FIELDS,
    },

    {
      path:
        "showcaseThree.categoryOne",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseThree.categoryTwo",
      select:
        CATEGORY_SELECT_FIELDS,
    },
    {
      path:
        "showcaseThree.categoryThree",
      select:
        CATEGORY_SELECT_FIELDS,
    },
  ]);
};

/* =========================================================
   HELPER: NORMALIZE TITLE
========================================================= */

const normalizeShowcaseTitle = (
  title,
  showcaseName
) => {
  const defaultTitle =
    DEFAULT_SHOWCASE_TITLES[
      showcaseName
    ];

  if (
    title === null ||
    title === undefined
  ) {
    return defaultTitle;
  }

  if (
    typeof title !== "string"
  ) {
    throw new ShowcaseValidationError(
      `${showcaseName}.title must be a string.`
    );
  }

  const cleanTitle =
    title.trim();

  if (!cleanTitle) {
    return defaultTitle;
  }

  if (
    cleanTitle.length >
    MAX_SHOWCASE_TITLE_LENGTH
  ) {
    throw new ShowcaseValidationError(
      `${showcaseName}.title cannot exceed ${MAX_SHOWCASE_TITLE_LENGTH} characters.`
    );
  }

  return cleanTitle;
};

/* =========================================================
   HELPER: NORMALIZE CATEGORY ID

   Supported values:
   - Valid MongoDB ObjectId
   - null
   - undefined
   - Empty string
========================================================= */

const normalizeCategoryId = (
  categoryId,
  fieldName
) => {
  if (
    categoryId === null ||
    categoryId === undefined ||
    categoryId === ""
  ) {
    return null;
  }

  /*
    Populated category object পাঠানো হলেও
    এর _id গ্রহণ করা হবে।
  */

  const rawCategoryId =
    categoryId &&
    typeof categoryId === "object" &&
    !Array.isArray(categoryId)
      ? categoryId._id
      : categoryId;

  if (
    rawCategoryId === null ||
    rawCategoryId === undefined ||
    rawCategoryId === ""
  ) {
    return null;
  }

  const cleanCategoryId =
    typeof rawCategoryId === "string"
      ? rawCategoryId.trim()
      : rawCategoryId;

  if (cleanCategoryId === "") {
    return null;
  }

  if (
    !mongoose.isValidObjectId(
      cleanCategoryId
    )
  ) {
    throw new ShowcaseValidationError(
      `${fieldName} contains an invalid category ID.`
    );
  }

  return cleanCategoryId.toString();
};

/* =========================================================
   HELPER: NORMALIZE ONE SHOWCASE

   প্রতিটি showcase-এ থাকবে:
   - Individual title
   - Fixed 3 category slots
========================================================= */

const normalizeShowcase = (
  showcase,
  showcaseName
) => {
  const safeShowcase =
    showcase &&
    typeof showcase === "object" &&
    !Array.isArray(showcase)
      ? showcase
      : {};

  return {
    title:
      normalizeShowcaseTitle(
        safeShowcase.title,
        showcaseName
      ),

    categoryOne:
      normalizeCategoryId(
        safeShowcase.categoryOne,
        `${showcaseName}.categoryOne`
      ),

    categoryTwo:
      normalizeCategoryId(
        safeShowcase.categoryTwo,
        `${showcaseName}.categoryTwo`
      ),

    categoryThree:
      normalizeCategoryId(
        safeShowcase.categoryThree,
        `${showcaseName}.categoryThree`
      ),
  };
};

/* =========================================================
   HELPER: NORMALIZE COMPLETE REQUEST BODY
========================================================= */

const normalizeShowcasePayload = (
  body
) => {
  const safeBody =
    body &&
    typeof body === "object" &&
    !Array.isArray(body)
      ? body
      : {};

  return {
    showcaseOne:
      normalizeShowcase(
        safeBody.showcaseOne,
        "showcaseOne"
      ),

    showcaseTwo:
      normalizeShowcase(
        safeBody.showcaseTwo,
        "showcaseTwo"
      ),

    showcaseThree:
      normalizeShowcase(
        safeBody.showcaseThree,
        "showcaseThree"
      ),
  };
};

/* =========================================================
   HELPER: COLLECT UNIQUE CATEGORY IDS

   title field category ID নয়।
   তাই শুধু নির্দিষ্ট category slot collect করা হবে।
========================================================= */

const collectCategoryIds = (
  showcasePayload
) => {
  const categoryIds = [];

  Object.values(
    showcasePayload
  ).forEach((showcase) => {
    CATEGORY_SLOT_KEYS.forEach(
      (slotKey) => {
        const categoryId =
          showcase[slotKey];

        if (categoryId) {
          categoryIds.push(
            categoryId.toString()
          );
        }
      }
    );
  });

  return [
    ...new Set(categoryIds),
  ];
};

/* =========================================================
   HELPER: VALIDATE CATEGORY EXISTENCE
========================================================= */

const validateCategoryIds = async (
  showcasePayload,
  tenantId
) => {
  const categoryIds =
    collectCategoryIds(
      showcasePayload
    );

  if (
    categoryIds.length === 0
  ) {
    return;
  }

  const existingCategories =
    await Category.find({
      tenant: tenantId,

      _id: {
        $in: categoryIds,
      },
    })
      .select("_id")
      .lean();

  const existingCategoryIds =
    new Set(
      existingCategories.map(
        (category) =>
          category._id.toString()
      )
    );

  const missingCategoryIds =
    categoryIds.filter(
      (categoryId) =>
        !existingCategoryIds.has(
          categoryId
        )
    );

  if (
    missingCategoryIds.length > 0
  ) {
    throw new ShowcaseValidationError(
      "One or more selected categories do not exist."
    );
  }
};

/* =========================================================
   HELPER: ENSURE OLD DOCUMENT TITLES

   পুরোনো database document-এ title field না থাকলে
   এখানে default title save করা হবে।
========================================================= */

const ensureShowcaseTitles =
  async (showcaseConfig) => {
    let hasChanges = false;

    if (
      !showcaseConfig
        .showcaseOne
        ?.title
        ?.trim()
    ) {
      showcaseConfig.showcaseOne.title =
        DEFAULT_SHOWCASE_TITLES
          .showcaseOne;

      hasChanges = true;
    }

    if (
      !showcaseConfig
        .showcaseTwo
        ?.title
        ?.trim()
    ) {
      showcaseConfig.showcaseTwo.title =
        DEFAULT_SHOWCASE_TITLES
          .showcaseTwo;

      hasChanges = true;
    }

    if (
      !showcaseConfig
        .showcaseThree
        ?.title
        ?.trim()
    ) {
      showcaseConfig.showcaseThree.title =
        DEFAULT_SHOWCASE_TITLES
          .showcaseThree;

      hasChanges = true;
    }

    if (hasChanges) {
      await showcaseConfig.save();
    }

    return showcaseConfig;
  };

/* =========================================================
   HELPER: GET OR CREATE CONFIGURATION
========================================================= */

const getOrCreateShowcaseConfig =
  async (tenantId) => {
    let showcaseConfig =
      await HomepageCategoryShowcase.findOne(
        {
          tenant: tenantId,

          key:
            SHOWCASE_CONFIG_KEY,
        }
      );

    if (!showcaseConfig) {
      showcaseConfig =
        await HomepageCategoryShowcase.create(
          {
            tenant: tenantId,

            key:
              SHOWCASE_CONFIG_KEY,

            showcaseOne: {
              title:
                DEFAULT_SHOWCASE_TITLES
                  .showcaseOne,
            },

            showcaseTwo: {
              title:
                DEFAULT_SHOWCASE_TITLES
                  .showcaseTwo,
            },

            showcaseThree: {
              title:
                DEFAULT_SHOWCASE_TITLES
                  .showcaseThree,
            },
          }
        );
    }

    await ensureShowcaseTitles(
      showcaseConfig
    );

    return populateCategorySlots(
      HomepageCategoryShowcase.findOne({
        _id: showcaseConfig._id,
        tenant: tenantId,
      })
    );
  };

/* =========================================================
   GET HOMEPAGE CATEGORY SHOWCASES

   Public route:
   GET /api/homepage-category-showcases
========================================================= */

const getHomepageCategoryShowcases =
  async (req, res) => {
    try {
      const tenantId =
        ensureTenantId(req, res);

      if (!tenantId) {
        return;
      }

      const showcaseConfig =
        await getOrCreateShowcaseConfig(
          tenantId
        );

      return res
        .status(200)
        .json({
          success: true,
          showcaseConfig,
        });
    } catch (error) {
      console.error(
        "Get homepage category showcases error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Could not load homepage category showcases.",
        });
    }
  };

/* =========================================================
   UPDATE HOMEPAGE CATEGORY SHOWCASES

   Admin route:
   PUT /api/homepage-category-showcases
========================================================= */

const updateHomepageCategoryShowcases =
  async (req, res) => {
    try {
      const tenantId =
        ensureTenantId(req, res);

      if (!tenantId) {
        return;
      }

      const showcasePayload =
        normalizeShowcasePayload(
          req.body
        );

      await validateCategoryIds(
        showcasePayload,
        tenantId
      );

      const query =
        HomepageCategoryShowcase.findOneAndUpdate(
          {
            tenant: tenantId,

            key:
              SHOWCASE_CONFIG_KEY,
          },
          {
            $set: {
              "showcaseOne.title":
                showcasePayload
                  .showcaseOne
                  .title,

              "showcaseOne.categoryOne":
                showcasePayload
                  .showcaseOne
                  .categoryOne,

              "showcaseOne.categoryTwo":
                showcasePayload
                  .showcaseOne
                  .categoryTwo,

              "showcaseOne.categoryThree":
                showcasePayload
                  .showcaseOne
                  .categoryThree,

              "showcaseTwo.title":
                showcasePayload
                  .showcaseTwo
                  .title,

              "showcaseTwo.categoryOne":
                showcasePayload
                  .showcaseTwo
                  .categoryOne,

              "showcaseTwo.categoryTwo":
                showcasePayload
                  .showcaseTwo
                  .categoryTwo,

              "showcaseTwo.categoryThree":
                showcasePayload
                  .showcaseTwo
                  .categoryThree,

              "showcaseThree.title":
                showcasePayload
                  .showcaseThree
                  .title,

              "showcaseThree.categoryOne":
                showcasePayload
                  .showcaseThree
                  .categoryOne,

              "showcaseThree.categoryTwo":
                showcasePayload
                  .showcaseThree
                  .categoryTwo,

              "showcaseThree.categoryThree":
                showcasePayload
                  .showcaseThree
                  .categoryThree,
            },

            $setOnInsert: {
              tenant: tenantId,

              key:
                SHOWCASE_CONFIG_KEY,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      const showcaseConfig =
        await populateCategorySlots(
          query
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Homepage category showcases updated successfully.",

          showcaseConfig,
        });
    } catch (error) {
      console.error(
        "Update homepage category showcases error:",
        error
      );

      const statusCode =
        error.statusCode === 400 ||
        error.name ===
          "ValidationError"
          ? 400
          : 500;

      return res
        .status(statusCode)
        .json({
          success: false,

          message:
            statusCode === 400
              ? error.message
              : "Could not update homepage category showcases.",
        });
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getHomepageCategoryShowcases,
  updateHomepageCategoryShowcases,
};