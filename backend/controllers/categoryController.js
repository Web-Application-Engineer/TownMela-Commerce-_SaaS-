const Category = require("../models/Category");

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
   HELPER FUNCTIONS
========================================================= */

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parseDisplayOrder = (
  value,
  fallback = 0,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0
  ) {
    return null;
  }

  return parsedValue;
};

const parseHomepageSection = (
  value,
  fallback = 1,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    ![1, 2, 3].includes(parsedValue)
  ) {
    return null;
  }

  return parsedValue;
};

/* =========================================================
   CREATE CATEGORY
========================================================= */

const createCategory = async (
  req,
  res,
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const {
      name,
      slug,
      thumbnail = "",
      featured = false,
      homepageSection = 1,
      displayOrder = 0,
      status = true,
    } = req.body;

    const cleanName =
      typeof name === "string"
        ? name.trim()
        : "";

    const cleanSlug =
      typeof slug === "string"
        ? slug
            .trim()
            .toLowerCase()
        : "";

    const cleanThumbnail =
      typeof thumbnail === "string"
        ? thumbnail.trim()
        : "";

    const parsedHomepageSection =
      parseHomepageSection(
        homepageSection,
        1,
      );

    const parsedDisplayOrder =
      parseDisplayOrder(
        displayOrder,
        0,
      );

    if (!cleanName || !cleanSlug) {
      return res.status(400).json({
        success: false,
        message:
          "Category name and slug are required",
      });
    }

    if (parsedHomepageSection === null) {
      return res.status(400).json({
        success: false,
        message:
          "Homepage section must be 1, 2 or 3",
      });
    }

    if (parsedDisplayOrder === null) {
      return res.status(400).json({
        success: false,
        message:
          "Display order must be a non-negative whole number",
      });
    }

    const escapedName =
      escapeRegex(cleanName);

    const existingCategory =
      await Category.findOne({
        tenant: tenantId,

        $or: [
          {
            name: {
              $regex: `^${escapedName}$`,
              $options: "i",
            },
          },
          {
            slug: cleanSlug,
          },
        ],
      });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Category name or slug already exists",
      });
    }

    const category =
      await Category.create({
        tenant: tenantId,
        name: cleanName,
        slug: cleanSlug,
        thumbnail:
          cleanThumbnail,

        featured:
          typeof featured === "boolean"
            ? featured
            : false,

        homepageSection:
          parsedHomepageSection,

        displayOrder:
          parsedDisplayOrder,

        status:
          typeof status === "boolean"
            ? status
            : true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Category created successfully",
      category,
    });
  } catch (error) {
    console.error(
      "Create category error:",
      error,
    );

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Category name or slug already exists",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Category validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   GET CATEGORIES
========================================================= */

const getCategories = async (
  req,
  res,
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const filter = {
      tenant: tenantId,
    };

    if (req.query.featured === "true") {
      filter.featured = true;
    }

    if (req.query.featured === "false") {
      filter.featured = false;
    }

    if (req.query.status === "true") {
      filter.status = true;
    }

    if (req.query.status === "false") {
      filter.status = false;
    }

    if (
      req.query.homepageSection !==
      undefined
    ) {
      const parsedHomepageSection =
        parseHomepageSection(
          req.query.homepageSection,
        );

      if (
        parsedHomepageSection === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Homepage section must be 1, 2 or 3",
        });
      }

      filter.homepageSection =
        parsedHomepageSection;
    }

    const categories =
      await Category.find(filter).sort({
        homepageSection: 1,
        displayOrder: 1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Get categories error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   GET SINGLE CATEGORY
========================================================= */

const getSingleCategory = async (
  req,
  res,
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { id } = req.params;

    const category =
      await Category.findOne({
        _id: id,
        tenant: tenantId,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(
      "Get single category error:",
      error,
    );

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   UPDATE CATEGORY
========================================================= */

const updateCategory = async (
  req,
  res,
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { id } = req.params;

    const existingCategory =
      await Category.findOne({
        _id: id,
        tenant: tenantId,
      });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const cleanName =
      typeof req.body.name === "string"
        ? req.body.name.trim()
        : existingCategory.name;

    const cleanSlug =
      typeof req.body.slug === "string"
        ? req.body.slug
            .trim()
            .toLowerCase()
        : existingCategory.slug;

    const cleanThumbnail =
      typeof req.body.thumbnail ===
      "string"
        ? req.body.thumbnail.trim()
        : existingCategory.thumbnail;

    const parsedHomepageSection =
      parseHomepageSection(
        req.body.homepageSection,
        existingCategory.homepageSection ??
          1,
      );

    const parsedDisplayOrder =
      parseDisplayOrder(
        req.body.displayOrder,
        existingCategory.displayOrder ??
          0,
      );

    if (!cleanName || !cleanSlug) {
      return res.status(400).json({
        success: false,
        message:
          "Category name and slug are required",
      });
    }

    if (parsedHomepageSection === null) {
      return res.status(400).json({
        success: false,
        message:
          "Homepage section must be 1, 2 or 3",
      });
    }

    if (parsedDisplayOrder === null) {
      return res.status(400).json({
        success: false,
        message:
          "Display order must be a non-negative whole number",
      });
    }

    const escapedName =
      escapeRegex(cleanName);

    const duplicateCategory =
      await Category.findOne({
        tenant: tenantId,

        _id: {
          $ne: id,
        },

        $or: [
          {
            name: {
              $regex: `^${escapedName}$`,
              $options: "i",
            },
          },
          {
            slug: cleanSlug,
          },
        ],
      });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message:
          "Category name or slug already exists",
      });
    }

    existingCategory.name =
      cleanName;

    existingCategory.slug =
      cleanSlug;

    existingCategory.thumbnail =
      cleanThumbnail;

    existingCategory.homepageSection =
      parsedHomepageSection;

    existingCategory.displayOrder =
      parsedDisplayOrder;

    if (
      typeof req.body.featured ===
      "boolean"
    ) {
      existingCategory.featured =
        req.body.featured;
    }

    if (
      typeof req.body.status ===
      "boolean"
    ) {
      existingCategory.status =
        req.body.status;
    }

    const updatedCategory =
      await existingCategory.save();

    return res.status(200).json({
      success: true,
      message:
        "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error(
      "Update category error:",
      error,
    );

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category ID",
      });
    }

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Category name or slug already exists",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Category validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   DELETE CATEGORY
========================================================= */

const deleteCategory = async (
  req,
  res,
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const category =
      await Category.findOneAndDelete({
        _id: req.params.id,
        tenant: tenantId,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete category error:",
      error,
    );

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};