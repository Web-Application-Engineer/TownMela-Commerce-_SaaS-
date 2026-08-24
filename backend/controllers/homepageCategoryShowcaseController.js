"use strict";

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
  const tenantId = resolveTenantId(req);

  if (!tenantId) {
    res.status(403).json({
      success: false,
      message: "Tenant context is required",
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

const CATEGORY_SLOT_KEYS = [
  "categoryOne",
  "categoryTwo",
  "categoryThree",
];

const DEFAULT_SHOWCASES = [
  {
    key: "showcaseOne",
    title: "Explore Categories",
    active: true,
    order: 1,
    layoutOrder: 2,
    categoryOne: null,
    categoryTwo: null,
    categoryThree: null,
  },
  {
    key: "showcaseTwo",
    title: "Featured Categories",
    active: true,
    order: 2,
    layoutOrder: 4,
    categoryOne: null,
    categoryTwo: null,
    categoryThree: null,
  },
  {
    key: "showcaseThree",
    title: "More Categories",
    active: true,
    order: 3,
    layoutOrder: 6,
    categoryOne: null,
    categoryTwo: null,
    categoryThree: null,
  },
];

/* =========================================================
   CUSTOM VALIDATION ERROR
========================================================= */

class ShowcaseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShowcaseValidationError";
    this.statusCode = 400;
  }
}

/* =========================================================
   HELPERS
========================================================= */

const populateCategorySlots = (query) =>
  query.populate([
    {
      path: "showcases.categoryOne",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcases.categoryTwo",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcases.categoryThree",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseOne.categoryOne",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseOne.categoryTwo",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseOne.categoryThree",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseTwo.categoryOne",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseTwo.categoryTwo",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseTwo.categoryThree",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseThree.categoryOne",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseThree.categoryTwo",
      select: CATEGORY_SELECT_FIELDS,
    },
    {
      path: "showcaseThree.categoryThree",
      select: CATEGORY_SELECT_FIELDS,
    },
  ]);

const createSectionKey = (value, fallback) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
};

const normalizeShowcaseTitle = (title, fallbackTitle) => {
  if (title === null || title === undefined) {
    return fallbackTitle;
  }

  if (typeof title !== "string") {
    throw new ShowcaseValidationError(
      "Showcase title must be a string."
    );
  }

  const cleanTitle = title.trim();

  if (!cleanTitle) {
    return fallbackTitle;
  }

  if (cleanTitle.length > MAX_SHOWCASE_TITLE_LENGTH) {
    throw new ShowcaseValidationError(
      `Showcase title cannot exceed ${MAX_SHOWCASE_TITLE_LENGTH} characters.`
    );
  }

  return cleanTitle;
};

const normalizeCategoryId = (categoryId, fieldName) => {
  if (
    categoryId === null ||
    categoryId === undefined ||
    categoryId === ""
  ) {
    return null;
  }

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

  if (!mongoose.isValidObjectId(cleanCategoryId)) {
    throw new ShowcaseValidationError(
      `${fieldName} contains an invalid category ID.`
    );
  }

  return cleanCategoryId.toString();
};

const normalizeShowcase = (showcase, index) => {
  const safeShowcase =
    showcase &&
    typeof showcase === "object" &&
    !Array.isArray(showcase)
      ? showcase
      : {};

  const fallbackTitle =
    DEFAULT_SHOWCASES[index]?.title ||
    `Category Showcase ${index + 1}`;

  return {
    key: createSectionKey(
      safeShowcase.key,
      `showcase-${index + 1}`,
    ),
    title: normalizeShowcaseTitle(
      safeShowcase.title,
      fallbackTitle,
    ),
    active: safeShowcase.active !== false,
    order: Math.max(1, Number(safeShowcase.order) || index + 1),
    layoutOrder: Math.max(
      1,
      Number(safeShowcase.layoutOrder) || index * 2 + 2,
    ),
    categoryOne: normalizeCategoryId(
      safeShowcase.categoryOne,
      `showcases[${index}].categoryOne`,
    ),
    categoryTwo: normalizeCategoryId(
      safeShowcase.categoryTwo,
      `showcases[${index}].categoryTwo`,
    ),
    categoryThree: normalizeCategoryId(
      safeShowcase.categoryThree,
      `showcases[${index}].categoryThree`,
    ),
  };
};

const normalizeLegacyPayload = (body) =>
  DEFAULT_SHOWCASES.map((defaults, index) =>
    normalizeShowcase(
      {
        ...defaults,
        ...(body?.[defaults.key] || {}),
        key: defaults.key,
        order: index + 1,
        layoutOrder: defaults.layoutOrder,
      },
      index,
    ),
  );

const normalizeShowcasePayload = (body) => {
  const safeBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? body
      : {};

  const inputShowcases = Array.isArray(safeBody.showcases)
    ? safeBody.showcases
    : normalizeLegacyPayload(safeBody);

  const showcases = inputShowcases.map(normalizeShowcase);
  const seenKeys = new Set();

  for (const showcase of showcases) {
    const comparableKey = showcase.key.toLowerCase();

    if (seenKeys.has(comparableKey)) {
      throw new ShowcaseValidationError(
        `Duplicate category showcase key: ${showcase.key}`
      );
    }

    seenKeys.add(comparableKey);
  }

  return showcases
    .sort((a, b) => a.order - b.order)
    .map((showcase, index) => ({
      ...showcase,
      order: index + 1,
    }));
};

const collectCategoryIds = (showcases) => {
  const categoryIds = [];

  showcases.forEach((showcase) => {
    CATEGORY_SLOT_KEYS.forEach((slotKey) => {
      const categoryId = showcase[slotKey];

      if (categoryId) {
        categoryIds.push(categoryId.toString());
      }
    });
  });

  return [...new Set(categoryIds)];
};

const validateCategoryIds = async (showcases, tenantId) => {
  const categoryIds = collectCategoryIds(showcases);

  if (categoryIds.length === 0) {
    return;
  }

  const existingCategories = await Category.find({
    tenant: tenantId,
    _id: { $in: categoryIds },
  })
    .select("_id")
    .lean();

  const existingCategoryIds = new Set(
    existingCategories.map((category) =>
      category._id.toString()
    )
  );

  const missingCategoryIds = categoryIds.filter(
    (categoryId) => !existingCategoryIds.has(categoryId)
  );

  if (missingCategoryIds.length > 0) {
    throw new ShowcaseValidationError(
      "One or more selected categories do not exist."
    );
  }
};

const buildLegacySection = (showcases, key, fallback) => {
  const showcase = showcases.find((item) => item.key === key);

  if (!showcase) {
    return {
      ...fallback,
      active: false,
      categoryOne: null,
      categoryTwo: null,
      categoryThree: null,
    };
  }

  return {
    key: showcase.key,
    title: showcase.title,
    active: showcase.active,
    order: showcase.order,
    layoutOrder: showcase.layoutOrder,
    categoryOne: showcase.categoryOne,
    categoryTwo: showcase.categoryTwo,
    categoryThree: showcase.categoryThree,
  };
};

const ensureDynamicShowcases = async (showcaseConfig) => {
  if (
    Array.isArray(showcaseConfig.showcases) &&
    showcaseConfig.showcases.length > 0
  ) {
    return showcaseConfig;
  }

  const legacySections = DEFAULT_SHOWCASES.map((defaults) => {
    const legacy = showcaseConfig[defaults.key] || {};

    return {
      key: defaults.key,
      title: legacy.title?.trim() || defaults.title,
      active: legacy.active !== false,
      order: defaults.order,
      layoutOrder: defaults.layoutOrder,
      categoryOne: legacy.categoryOne || null,
      categoryTwo: legacy.categoryTwo || null,
      categoryThree: legacy.categoryThree || null,
    };
  });

  showcaseConfig.showcases = legacySections;
  await showcaseConfig.save();

  return showcaseConfig;
};

const getOrCreateShowcaseConfig = async (tenantId) => {
  let showcaseConfig =
    await HomepageCategoryShowcase.findOne({
      tenant: tenantId,
      key: SHOWCASE_CONFIG_KEY,
    });

  if (!showcaseConfig) {
    showcaseConfig = await HomepageCategoryShowcase.create({
      tenant: tenantId,
      key: SHOWCASE_CONFIG_KEY,
      showcases: DEFAULT_SHOWCASES,
    });
  }

  await ensureDynamicShowcases(showcaseConfig);

  return populateCategorySlots(
    HomepageCategoryShowcase.findOne({
      _id: showcaseConfig._id,
      tenant: tenantId,
    })
  );
};

/* =========================================================
   GET HOMEPAGE CATEGORY SHOWCASES
========================================================= */

const getHomepageCategoryShowcases = async (req, res) => {
  try {
    const tenantId = ensureTenantId(req, res);

    if (!tenantId) return;

    const showcaseConfig =
      await getOrCreateShowcaseConfig(tenantId);

    return res.status(200).json({
      success: true,
      showcaseConfig,
    });
  } catch (error) {
    console.error(
      "Get homepage category showcases error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Could not load homepage category showcases.",
    });
  }
};

/* =========================================================
   UPDATE HOMEPAGE CATEGORY SHOWCASES
========================================================= */

const updateHomepageCategoryShowcases = async (req, res) => {
  try {
    const tenantId = ensureTenantId(req, res);

    if (!tenantId) return;

    const showcases = normalizeShowcasePayload(req.body);

    await validateCategoryIds(showcases, tenantId);

    const legacyOne = buildLegacySection(
      showcases,
      "showcaseOne",
      DEFAULT_SHOWCASES[0],
    );
    const legacyTwo = buildLegacySection(
      showcases,
      "showcaseTwo",
      DEFAULT_SHOWCASES[1],
    );
    const legacyThree = buildLegacySection(
      showcases,
      "showcaseThree",
      DEFAULT_SHOWCASES[2],
    );

    const query = HomepageCategoryShowcase.findOneAndUpdate(
      {
        tenant: tenantId,
        key: SHOWCASE_CONFIG_KEY,
      },
      {
        $set: {
          showcases,
          showcaseOne: legacyOne,
          showcaseTwo: legacyTwo,
          showcaseThree: legacyThree,
        },
        $setOnInsert: {
          tenant: tenantId,
          key: SHOWCASE_CONFIG_KEY,
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
      await populateCategorySlots(query);

    return res.status(200).json({
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
      error.name === "ValidationError"
        ? 400
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 400
          ? error.message
          : "Could not update homepage category showcases.",
    });
  }
};

module.exports = {
  getHomepageCategoryShowcases,
  updateHomepageCategoryShowcases,
};
