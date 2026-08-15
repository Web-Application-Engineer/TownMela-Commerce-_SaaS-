"use strict";

const mongoose = require("mongoose");
const Product = require("../models/product");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const PUBLIC_FILTER = { isDeleted: false, isActive: true };

const sendError = (res, status, message, code = "REQUEST_FAILED") =>
  res.status(status).json({ success: false, code, message });

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const getTenantId = (req) => {
  const tenantId =
    req.tenantId ||
    req.user?.tenant?._id ||
    req.user?.tenant ||
    req.get("X-Tenant-Id");

  return tenantId ? String(tenantId).trim() : "";
};

const requireTenantId = (req, res) => {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    sendError(
      res,
      400,
      "Tenant context is required",
      "TENANT_CONTEXT_REQUIRED"
    );
    return null;
  }

  if (!isValidObjectId(tenantId)) {
    sendError(res, 400, "Invalid tenant ID", "INVALID_TENANT_ID");
    return null;
  }

  return tenantId;
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeStringArray = (values) => {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
};

const parseArrayField = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return normalizeStringArray(value);
  if (typeof value !== "string") return [];

  const cleanValue = value.trim();
  if (!cleanValue) return [];

  try {
    const parsed = JSON.parse(cleanValue);
    if (Array.isArray(parsed)) return normalizeStringArray(parsed);
  } catch {
    // Treat non-JSON strings as comma-separated values.
  }

  return normalizeStringArray(cleanValue.split(","));
};

const getUploadedMainImage = (req) =>
  req.files?.image?.[0]?.path || "";

const getUploadedAdditionalImages = (req) =>
  normalizeStringArray(
    (req.files?.images || [])
      .map((file) => file.path)
      .filter(Boolean)
  );

const getPagination = (req) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const requestedLimit =
    Number.parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);

  return { page, limit, skip: (page - 1) * limit };
};

const buildKeywordQuery = (keyword) => {
  const clean = String(keyword || "").trim();
  if (!clean) return {};

  const regex = new RegExp(escapeRegExp(clean), "i");
  return {
    $or: [
      { name: regex },
      { description: regex },
      { slug: regex },
    ],
  };
};

const buildSort = (sort) => {
  if (sort === "price-low-to-high") return { price: 1, createdAt: -1 };
  if (sort === "price-high-to-low") return { price: -1, createdAt: -1 };
  return { createdAt: -1 };
};

const parsePriceRange = (min, max) => {
  const minPrice = min === undefined || min === "" ? 0 : Number(min);
  const maxPrice =
    max === undefined || max === "" ? Number.MAX_SAFE_INTEGER : Number(max);

  if (
    !Number.isFinite(minPrice) ||
    !Number.isFinite(maxPrice) ||
    minPrice < 0 ||
    maxPrice < 0
  ) {
    return { error: "Price values must be valid non-negative numbers" };
  }

  if (minPrice > maxPrice) {
    return { error: "Minimum price cannot be greater than maximum price" };
  }

  return { minPrice, maxPrice };
};

const UPDATE_FIELDS = new Set([
  "name",
  "slug",
  "price",
  "oldPrice",
  "description",
  "features",
  "image",
  "images",
  "sizes",
  "colors",
  "category",
  "homepageSection",
  "stock",
  "isActive",
]);

const prepareProductUpdate = (req) => {
  const updateData = {};

  for (const [key, value] of Object.entries(req.body || {})) {
    if (UPDATE_FIELDS.has(key)) updateData[key] = value;
  }

  for (const field of ["features", "images", "sizes", "colors"]) {
    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      updateData[field] = parseArrayField(updateData[field]);
    }
  }

  for (const field of [
    "name",
    "slug",
    "description",
    "image",
    "homepageSection",
  ]) {
    if (typeof updateData[field] === "string") {
      updateData[field] = updateData[field].trim();
    }
  }

  if (updateData.slug) {
    updateData.slug = updateData.slug.toLowerCase();
  }

  if (updateData.homepageSection) {
    updateData.homepageSection =
      updateData.homepageSection.toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "isActive")) {
    updateData.isActive =
      typeof updateData.isActive === "string"
        ? updateData.isActive.toLowerCase() === "true"
        : Boolean(updateData.isActive);
  }

  const mainImage = getUploadedMainImage(req);
  if (mainImage) updateData.image = mainImage;
  else if (updateData.image === "") delete updateData.image;

  const additionalImages = getUploadedAdditionalImages(req);
  if (additionalImages.length) updateData.images = additionalImages;

  return updateData;
};

const createProduct = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { name, slug, price, oldPrice, description, category, stock } =
      req.body;

    const mainImage =
      getUploadedMainImage(req) || String(req.body.image || "").trim();

    if (
      !String(name || "").trim() ||
      !String(slug || "").trim() ||
      price === undefined ||
      !mainImage ||
      !category
    ) {
      return sendError(
        res,
        400,
        "Name, slug, price, image and category are required",
        "PRODUCT_REQUIRED_FIELDS_MISSING"
      );
    }

    if (!isValidObjectId(category)) {
      return sendError(res, 400, "Invalid category ID", "INVALID_CATEGORY_ID");
    }

    const normalizedSlug = String(slug).trim().toLowerCase();

    const duplicate = await Product.findOne({
      tenant: tenantId,
      slug: normalizedSlug,
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return sendError(
        res,
        409,
        "A product with this slug already exists",
        "PRODUCT_SLUG_ALREADY_EXISTS"
      );
    }

    const uploadedImages = getUploadedAdditionalImages(req);

    const product = await Product.create({
      tenant: tenantId,
      name: String(name).trim(),
      slug: normalizedSlug,
      price,
      oldPrice: oldPrice === undefined || oldPrice === "" ? 0 : oldPrice,
      description: String(description || "").trim(),
      features: parseArrayField(req.body.features),
      image: mainImage,
      images: uploadedImages.length
        ? uploadedImages
        : parseArrayField(req.body.images),
      sizes: parseArrayField(req.body.sizes),
      colors: parseArrayField(req.body.colors),
      category,

      homepageSection:
        String(
          req.body.homepageSection || ""
        )
          .trim()
          .toLowerCase(),

      stock: stock === undefined || stock === "" ? 0 : stock,
      isActive: true,
      isDeleted: false,
    });

    await product.populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "Product slug already exists",
        "PRODUCT_SLUG_ALREADY_EXISTS"
      );
    }

    if (error.name === "ValidationError") {
      return sendError(
        res,
        400,
        error.message,
        "PRODUCT_VALIDATION_FAILED"
      );
    }

    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const getProducts = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const products = await Product.find({
      tenant: tenantId,
      ...PUBLIC_FILTER,
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get products error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const searchProducts = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const keyword = String(req.query.keyword || "").trim();
    if (!keyword) {
      return res.status(200).json({
        success: true,
        totalProducts: 0,
        products: [],
      });
    }

    const products = await Product.find({
      tenant: tenantId,
      ...PUBLIC_FILTER,
      ...buildKeywordQuery(keyword),
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.error("Search products error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    if (!isValidObjectId(req.params.categoryId)) {
      return sendError(res, 400, "Invalid category ID", "INVALID_CATEGORY_ID");
    }

    const products = await Product.find({
      tenant: tenantId,
      category: req.params.categoryId,
      ...PUBLIC_FILTER,
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get products by category error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const filterProductsByPrice = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const range = parsePriceRange(req.query.min, req.query.max);
    if (range.error) {
      return sendError(res, 400, range.error, "INVALID_PRICE_RANGE");
    }

    const products = await Product.find({
      tenant: tenantId,
      ...PUBLIC_FILTER,
      price: { $gte: range.minPrice, $lte: range.maxPrice },
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Filter products by price error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const sortProducts = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const products = await Product.find({
      tenant: tenantId,
      ...PUBLIC_FILTER,
    })
      .populate("category", "name slug")
      .sort(buildSort(req.query.sort))
      .lean();

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Sort products error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const getPaginatedProducts = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { page, limit, skip } = getPagination(req);
    const query = { tenant: tenantId, ...PUBLIC_FILTER };

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      products,
    });
  } catch (error) {
    console.error("Pagination products error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const getFilteredProducts = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { keyword, category, min, max, sort } = req.query;
    const { page, limit, skip } = getPagination(req);

    const query = {
      tenant: tenantId,
      ...PUBLIC_FILTER,
      ...buildKeywordQuery(keyword),
    };

    if (category) {
      if (!isValidObjectId(category)) {
        return sendError(res, 400, "Invalid category ID", "INVALID_CATEGORY_ID");
      }
      query.category = category;
    }

    if (min !== undefined || max !== undefined) {
      const range = parsePriceRange(min, max);
      if (range.error) {
        return sendError(res, 400, range.error, "INVALID_PRICE_RANGE");
      }
      query.price = { $gte: range.minPrice, $lte: range.maxPrice };
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate("category", "name slug")
        .sort(buildSort(sort))
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      products,
    });
  } catch (error) {
    console.error("Combined filter products error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const getProduct = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid product ID", "INVALID_PRODUCT_ID");
    }

    const product = await Product.findOne({
      _id: req.params.id,
      tenant: tenantId,
      ...PUBLIC_FILTER,
    })
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return sendError(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Get product error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const updateProduct = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid product ID", "INVALID_PRODUCT_ID");
    }

    const updateData = prepareProductUpdate(req);
    if (!Object.keys(updateData).length) {
      return sendError(
        res,
        400,
        "No valid product fields were provided",
        "NO_PRODUCT_UPDATE_FIELDS"
      );
    }

    if (updateData.category && !isValidObjectId(updateData.category)) {
      return sendError(res, 400, "Invalid category ID", "INVALID_CATEGORY_ID");
    }

    if (updateData.slug) {
      const duplicate = await Product.findOne({
        tenant: tenantId,
        slug: updateData.slug,
        _id: { $ne: req.params.id },
      })
        .select("_id")
        .lean();

      if (duplicate) {
        return sendError(
          res,
          409,
          "A product with this slug already exists",
          "PRODUCT_SLUG_ALREADY_EXISTS"
        );
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: tenantId,
        isDeleted: false,
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).populate("category", "name slug");

    if (!product) {
      return sendError(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "Product slug already exists",
        "PRODUCT_SLUG_ALREADY_EXISTS"
      );
    }

    if (error.name === "ValidationError") {
      return sendError(
        res,
        400,
        error.message,
        "PRODUCT_VALIDATION_FAILED"
      );
    }

    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid product ID", "INVALID_PRODUCT_ID");
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant: tenantId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return sendError(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return sendError(res, 500, "Server error", "INTERNAL_SERVER_ERROR");
  }
};

module.exports = {
  createProduct,
  getProducts,
  searchProducts,
  getProductsByCategory,
  filterProductsByPrice,
  sortProducts,
  getPaginatedProducts,
  getFilteredProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
