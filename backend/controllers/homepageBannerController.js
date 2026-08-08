const mongoose = require("mongoose");

const HomepageBanner = require(
  "../models/HomepageBanner"
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
   HELPERS
========================================================= */

const VALID_BANNER_TYPES = [
  "main",
  "sideTop",
  "sideBottom",
];

const cleanString = (value) =>
  typeof value === "string"
    ? value.trim()
    : "";

const normalizeOrder = (value) => {
  const parsedOrder = Number(value);

  if (
    !Number.isFinite(parsedOrder) ||
    parsedOrder < 1
  ) {
    return 1;
  }

  return Math.floor(parsedOrder);
};

const parseBoolean = (
  value,
  fallback = true
) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
};

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/* =========================================================
   GET ALL HOMEPAGE BANNERS

   Public:
   GET /api/homepage-banners

   Optional query:
   ?active=true
   ?type=main
========================================================= */

const getHomepageBanners = async (
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

    const requestedType = cleanString(
      req.query.type
    );

    if (requestedType) {
      if (
        !VALID_BANNER_TYPES.includes(
          requestedType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid homepage banner type.",
        });
      }

      filter.type = requestedType;
    }

    if (
      typeof req.query.active !==
      "undefined"
    ) {
      filter.active = parseBoolean(
        req.query.active,
        true
      );
    }

    const homepageBanners =
      await HomepageBanner.find(filter)
        .sort({
          type: 1,
          order: 1,
          createdAt: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      homepageBanners,
    });
  } catch (error) {
    console.error(
      "Get homepage banners error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load homepage banners.",
    });
  }
};

/* =========================================================
   GET SINGLE HOMEPAGE BANNER

   Public:
   GET /api/homepage-banners/:id
========================================================= */

const getSingleHomepageBanner =
  async (req, res) => {
    try {
    const tenantId =
      ensureTenantId(req, res);

    if (!tenantId) {
      return;
    }

      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid homepage banner ID.",
        });
      }

      const homepageBanner =
        await HomepageBanner.findOne({
          _id: id,
          tenant: tenantId,
        }).lean();

      if (!homepageBanner) {
        return res.status(404).json({
          success: false,
          message:
            "Homepage banner not found.",
        });
      }

      return res.status(200).json({
        success: true,
        homepageBanner,
      });
    } catch (error) {
      console.error(
        "Get single homepage banner error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load homepage banner.",
      });
    }
  };

/* =========================================================
   CREATE HOMEPAGE BANNER

   Admin:
   POST /api/homepage-banners
========================================================= */

const createHomepageBanner = async (
  req,
  res
) => {
  try {
  const tenantId =
    ensureTenantId(req, res);

  if (!tenantId) {
    return;
  }

    const title = cleanString(
      req.body.title
    );

    const image = cleanString(
      req.body.image
    );

    const link =
      cleanString(req.body.link) ||
      "/shop";

    const altText = cleanString(
      req.body.altText
    );

    const type = cleanString(
      req.body.type
    );

    const order = normalizeOrder(
      req.body.order
    );

    const active = parseBoolean(
      req.body.active,
      true
    );

    if (!title) {
      return res.status(400).json({
        success: false,
        message:
          "Banner title is required.",
      });
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        message:
          "Banner image is required.",
      });
    }

    if (
      !VALID_BANNER_TYPES.includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid banner type is required.",
      });
    }

    const homepageBanner =
      await HomepageBanner.create({
        tenant: tenantId,
        title,
        image,
        link,
        altText:
          altText || title,
        type,
        order,
        active,
      });

    return res.status(201).json({
      success: true,
      message:
        "Homepage banner created successfully.",
      homepageBanner,
    });
  } catch (error) {
    console.error(
      "Create homepage banner error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create homepage banner.",
    });
  }
};

/* =========================================================
   UPDATE HOMEPAGE BANNER

   Admin:
   PUT /api/homepage-banners/:id
========================================================= */

const updateHomepageBanner = async (
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

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid homepage banner ID.",
      });
    }

    const existingBanner =
      await HomepageBanner.findOne({
        _id: id,
        tenant: tenantId,
      });

    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message:
          "Homepage banner not found.",
      });
    }

    if (
      typeof req.body.title !==
      "undefined"
    ) {
      const title = cleanString(
        req.body.title
      );

      if (!title) {
        return res.status(400).json({
          success: false,
          message:
            "Banner title cannot be empty.",
        });
      }

      existingBanner.title = title;
    }

    if (
      typeof req.body.image !==
      "undefined"
    ) {
      const image = cleanString(
        req.body.image
      );

      if (!image) {
        return res.status(400).json({
          success: false,
          message:
            "Banner image cannot be empty.",
        });
      }

      existingBanner.image = image;
    }

    if (
      typeof req.body.link !==
      "undefined"
    ) {
      existingBanner.link =
        cleanString(req.body.link) ||
        "/shop";
    }

    if (
      typeof req.body.altText !==
      "undefined"
    ) {
      existingBanner.altText =
        cleanString(
          req.body.altText
        ) || existingBanner.title;
    }

    if (
      typeof req.body.type !==
      "undefined"
    ) {
      const type = cleanString(
        req.body.type
      );

      if (
        !VALID_BANNER_TYPES.includes(
          type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid homepage banner type.",
        });
      }

      existingBanner.type = type;
    }

    if (
      typeof req.body.order !==
      "undefined"
    ) {
      existingBanner.order =
        normalizeOrder(req.body.order);
    }

    if (
      typeof req.body.active !==
      "undefined"
    ) {
      existingBanner.active =
        parseBoolean(
          req.body.active,
          existingBanner.active
        );
    }

    const homepageBanner =
      await existingBanner.save();

    return res.status(200).json({
      success: true,
      message:
        "Homepage banner updated successfully.",
      homepageBanner,
    });
  } catch (error) {
    console.error(
      "Update homepage banner error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update homepage banner.",
    });
  }
};

/* =========================================================
   DELETE HOMEPAGE BANNER

   Admin:
   DELETE /api/homepage-banners/:id
========================================================= */

const deleteHomepageBanner = async (
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

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid homepage banner ID.",
      });
    }

    const homepageBanner =
      await HomepageBanner.findOneAndDelete({
        _id: id,
        tenant: tenantId,
      });

    if (!homepageBanner) {
      return res.status(404).json({
        success: false,
        message:
          "Homepage banner not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Homepage banner deleted successfully.",
      homepageBanner,
    });
  } catch (error) {
    console.error(
      "Delete homepage banner error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete homepage banner.",
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getHomepageBanners,
  getSingleHomepageBanner,
  createHomepageBanner,
  updateHomepageBanner,
  deleteHomepageBanner,
};