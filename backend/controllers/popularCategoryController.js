const PopularCategory = require(
  "../models/PopularCategory"
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
   CREATE POPULAR CATEGORY
========================================================= */

const createPopularCategory = async (
  req,
  res
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const {
      categoryId,
      order = 1,
      active = true,
    } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category =
      await Category.findOne({
        _id: categoryId,
        tenant: tenantId,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.status !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Only active categories can be added",
      });
    }

    const existingPopularCategory =
      await PopularCategory.findOne({
        tenant: tenantId,
        category: category._id,
      });

    if (existingPopularCategory) {
      return res.status(400).json({
        success: false,
        message:
          "This category is already added",
      });
    }

    const parsedOrder = Math.max(
      1,
      Number(order) || 1
    );

    const popularCategory =
      await PopularCategory.create({
        tenant: tenantId,
        category: category._id,
        categoryName: category.name,
        slug: category.slug,
        thumbnail: category.thumbnail || "",
        order: parsedOrder,
        active:
          typeof active === "boolean"
            ? active
            : true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Popular category created successfully",
      popularCategory,
    });
  } catch (error) {
    console.error(
      "Create popular category error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "This category is already added",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Popular category validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   GET POPULAR CATEGORIES
========================================================= */

const getPopularCategories = async (
  req,
  res
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

    if (req.query.active === "true") {
      filter.active = true;
    }

    if (req.query.active === "false") {
      filter.active = false;
    }

    const popularCategories =
      await PopularCategory.find(filter)
        .populate({
          path: "category",
          select:
            "name slug thumbnail status",
        })
        .sort({
          order: 1,
          createdAt: -1,
        });

    const syncedCategories =
      popularCategories.map(
        (popularCategory) => {
          const category =
            popularCategory.category;

          return {
            ...popularCategory.toObject(),

            categoryName:
              category?.name ??
              popularCategory.categoryName,

            slug:
              category?.slug ??
              popularCategory.slug,

            thumbnail:
              category?.thumbnail ??
              popularCategory.thumbnail,
          };
        }
      );

    return res.status(200).json({
      success: true,
      popularCategories:
        syncedCategories,
    });
  } catch (error) {
    console.error(
      "Get popular categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   UPDATE POPULAR CATEGORY
========================================================= */

const updatePopularCategory = async (
  req,
  res
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const { id } = req.params;

    const {
      categoryId,
      order,
      active,
    } = req.body;

    const popularCategory =
      await PopularCategory.findOne({
        _id: id,
        tenant: tenantId,
      });

    if (!popularCategory) {
      return res.status(404).json({
        success: false,
        message:
          "Popular category not found",
      });
    }

    let selectedCategory = null;

    if (categoryId) {
      selectedCategory =
        await Category.findOne({
          _id: categoryId,
          tenant: tenantId,
        });

      if (!selectedCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (
        selectedCategory.status !== true
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only active categories can be selected",
        });
      }

      const duplicateCategory =
        await PopularCategory.findOne({
          tenant: tenantId,

          _id: {
            $ne: id,
          },

          category:
            selectedCategory._id,
        });

      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message:
            "This category is already added",
        });
      }

      popularCategory.category =
        selectedCategory._id;

      popularCategory.categoryName =
        selectedCategory.name;

      popularCategory.slug =
        selectedCategory.slug;

      popularCategory.thumbnail =
        selectedCategory.thumbnail || "";
    } else {
      selectedCategory =
        await Category.findOne({
          _id: popularCategory.category,
          tenant: tenantId,
        });

      if (selectedCategory) {
        popularCategory.categoryName =
          selectedCategory.name;

        popularCategory.slug =
          selectedCategory.slug;

        popularCategory.thumbnail =
          selectedCategory.thumbnail || "";
      }
    }

    if (
      order !== undefined &&
      order !== null &&
      order !== ""
    ) {
      popularCategory.order =
        Math.max(
          1,
          Number(order) || 1
        );
    }

    if (
      typeof active === "boolean"
    ) {
      popularCategory.active =
        active;
    }

    const updatedPopularCategory =
      await popularCategory.save();

    return res.status(200).json({
      success: true,
      message:
        "Popular category updated successfully",
      popularCategory:
        updatedPopularCategory,
    });
  } catch (error) {
    console.error(
      "Update popular category error:",
      error
    );

    if (
      error?.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid popular category ID",
      });
    }

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "This category is already added",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Popular category validation failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   DELETE POPULAR CATEGORY
========================================================= */

const deletePopularCategory = async (
  req,
  res
) => {
  try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

    const popularCategory =
      await PopularCategory.findByIdAndDelete(
        req.params.id
      );

    if (!popularCategory) {
      return res.status(404).json({
        success: false,
        message:
          "Popular category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Popular category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete popular category error:",
      error
    );

    if (
      error?.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid popular category ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   EXPORT CONTROLLERS
========================================================= */

module.exports = {
  createPopularCategory,
  getPopularCategories,
  updatePopularCategory,
  deletePopularCategory,
};