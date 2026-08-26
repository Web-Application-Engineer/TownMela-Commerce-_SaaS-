"use strict";

const mongoose = require("mongoose");

const Tenant = require(
  "../../models/tenantModel"
);

const Category = require(
  "../../models/Category"
);

const Product = require(
  "../../models/product"
);

const HomepageBanner = require(
  "../../models/HomepageBanner"
);

const HomepageCategoryShowcase =
  require(
    "../../models/HomepageCategoryShowcase"
  );

const PopularCategory = require(
  "../../models/PopularCategory"
);

/* =========================================================
   CONFIGURATION
========================================================= */

const DEFAULT_MASTER_TENANT_ID =
  "6a5fcb5d54ae1ee9930c0a13";

const getMasterTenantId = () =>
  String(
    process.env
      .TOWNMELA_MASTER_TENANT_ID ||
      DEFAULT_MASTER_TENANT_ID
  ).trim();

/* =========================================================
   HELPERS
========================================================= */

const createProvisioningError = (
  message,
  code =
    "TENANT_TEMPLATE_COPY_FAILED",
  details = null
) => {
  const error = new Error(message);

  error.statusCode = 500;
  error.code = code;

  if (details) {
    error.details = details;
  }

  return error;
};

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

const removeDocumentFields = (
  document
) => {
  const result =
    toPlainObject(document);

  delete result._id;
  delete result.id;
  delete result.__v;
  delete result.createdAt;
  delete result.updatedAt;
  delete result.tenant;

  return result;
};

const remapCategoryId = (
  categoryId,
  categoryIdMap
) => {
  if (!categoryId) {
    return null;
  }

  return (
    categoryIdMap.get(
      String(categoryId)
    ) || null
  );
};

const remapShowcaseSection = (
  section,
  categoryIdMap
) => {
  const plainSection =
    toPlainObject(section);

  return {
    title:
      typeof plainSection.title ===
      "string"
        ? plainSection.title.trim()
        : "",

    categoryOne:
      remapCategoryId(
        plainSection.categoryOne,
        categoryIdMap
      ),

    categoryTwo:
      remapCategoryId(
        plainSection.categoryTwo,
        categoryIdMap
      ),

    categoryThree:
      remapCategoryId(
        plainSection.categoryThree,
        categoryIdMap
      ),
  };
};

const logCopyStep = (
  label,
  details = {}
) => {
  console.log(
    `[Tenant Template] ${label}`,
    details
  );
};

const logCopyError = (
  error,
  stage,
  context = {}
) => {
  console.error(
    "COPY MASTER TEMPLATE EXACT ERROR:",
    {
      stage,

      code:
        error?.code,

      name:
        error?.name,

      message:
        error?.message,

      keyPattern:
        error?.keyPattern,

      keyValue:
        error?.keyValue,

      index:
        error?.index,

      collection:
        error?.collection,

      namespace:
        error?.namespace,

      context,

      stack:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error?.stack,
    }
  );
};

/* =========================================================
   COPY MASTER TEMPLATE
========================================================= */

const copyMasterTemplateToTenant =
  async (newTenantId) => {
    const masterTenantId =
      getMasterTenantId();

    let currentStage =
      "validate_tenant_ids";

    const copySummary = {
      categories: 0,
      products: 0,
      homepageBanners: 0,
      homepageCategoryShowcases: 0,
      popularCategories: 0,
      footerContentPages: 0,
    };

    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          masterTenantId
        )
      ) {
        throw createProvisioningError(
          "TownMela master tenant ID is invalid",
          "INVALID_MASTER_TENANT_ID"
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          newTenantId
        )
      ) {
        throw createProvisioningError(
          "New tenant ID is invalid",
          "INVALID_NEW_TENANT_ID"
        );
      }

      if (
        String(masterTenantId) ===
        String(newTenantId)
      ) {
        return copySummary;
      }

      currentStage =
        "load_master_and_destination_tenants";

      const [
        masterTenant,
        destinationTenant,
      ] = await Promise.all([
        Tenant.findOne({
          _id: masterTenantId,
          isDeleted: {
            $ne: true,
          },
        }),

        Tenant.findOne({
          _id: newTenantId,
          isDeleted: {
            $ne: true,
          },
        }),
      ]);

      if (!masterTenant) {
        throw createProvisioningError(
          "TownMela master tenant was not found",
          "MASTER_TENANT_NOT_FOUND"
        );
      }

      if (!destinationTenant) {
        throw createProvisioningError(
          "Destination tenant was not found",
          "DESTINATION_TENANT_NOT_FOUND"
        );
      }

      logCopyStep(
        "Template copy started",
        {
          masterTenantId:
            String(masterTenantId),

          newTenantId:
            String(newTenantId),
        }
      );

      /* =====================================================
         COPY BRANDING DEFAULTS
      ===================================================== */

      currentStage =
        "copy_branding_defaults";

      const masterBranding =
        toPlainObject(
          masterTenant.branding
        );

      destinationTenant.branding = {
        ...toPlainObject(
          destinationTenant.branding
        ),

        logo:
          masterBranding.logo || "",

        favicon:
          masterBranding.favicon ||
          "",

        primaryColor:
          masterBranding.primaryColor ||
          "#16a34a",

        secondaryColor:
          masterBranding.secondaryColor ||
          "#111827",

        /*
         * Keep the new tenant's own store title.
         */
        storeTitle:
          destinationTenant.storeName,

        storeTagline:
          masterBranding.storeTagline ||
          "",
      };

      await destinationTenant.save();

      logCopyStep(
        "Branding defaults copied"
      );

      /* =====================================================
         COPY FOOTER MANAGEMENT CONTENT PAGES

         These are tenant-owned content pages. A new tenant
         receives an independent snapshot of the master
         TownMela content at provisioning time.

         Customer Info:
         - About Us
         - Contact Us
         - Privacy Policy
         - Terms & Conditions
         - Return & Refund Policy

         Quick Navigation:
         - Customer Support

         Functional pages such as Cart, Checkout,
         My Account and Track Orders are intentionally
         NOT copied or modified here.
      ===================================================== */

      currentStage =
        "copy_footer_content_pages";

      destinationTenant.aboutPage =
        toPlainObject(
          masterTenant.aboutPage
        );

      destinationTenant.contactPage =
        toPlainObject(
          masterTenant.contactPage
        );

      destinationTenant.privacyPolicyPage =
        toPlainObject(
          masterTenant.privacyPolicyPage
        );

      destinationTenant.termsConditionsPage =
        toPlainObject(
          masterTenant.termsConditionsPage
        );

      destinationTenant.returnRefundPage =
        toPlainObject(
          masterTenant.returnRefundPage
        );

      destinationTenant.customerSupportPage =
        toPlainObject(
          masterTenant.customerSupportPage
        );

      await destinationTenant.save();

      copySummary.footerContentPages =
        6;

      logCopyStep(
        "Footer content pages copied",
        {
          count:
            copySummary.footerContentPages,
        }
      );

      /* =====================================================
         COPY CATEGORIES
      ===================================================== */

      currentStage =
        "load_master_categories";

      const masterCategories =
        await Category.find({
          tenant: masterTenantId,
        })
          .sort({
            createdAt: 1,
          })
          .lean();

      const categoryIdMap =
        new Map();

      currentStage =
        "check_destination_categories";

      const existingCategoryCount =
        await Category.countDocuments({
          tenant: newTenantId,
        });

      if (
        existingCategoryCount > 0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains category data",
          "DESTINATION_CATEGORY_DATA_EXISTS",
          {
            existingCategoryCount,
          }
        );
      }

      if (
        masterCategories.length > 0
      ) {
        currentStage =
          "insert_categories";

        logCopyStep(
          "Copying categories",
          {
            count:
              masterCategories.length,
          }
        );

        const copiedCategories =
          await Category.insertMany(
            masterCategories.map(
              (category) => ({
                ...removeDocumentFields(
                  category
                ),

                tenant:
                  newTenantId,
              })
            ),
            {
              ordered: true,
            }
          );

        copiedCategories.forEach(
          (
            copiedCategory,
            index
          ) => {
            categoryIdMap.set(
              String(
                masterCategories[index]
                  ._id
              ),
              copiedCategory._id
            );
          }
        );

        copySummary.categories =
          copiedCategories.length;

        logCopyStep(
          "Categories copied",
          {
            count:
              copiedCategories.length,
          }
        );
      }

      /* =====================================================
         COPY PRODUCTS
      ===================================================== */

      currentStage =
        "load_master_products";

      const masterProducts =
        await Product.find({
          tenant: masterTenantId,
        })
          .select(
            "+tenant +isDeleted +deletedAt"
          )
          .sort({
            createdAt: 1,
          })
          .lean();

      currentStage =
        "check_destination_products";

      const existingProductCount =
        await Product.countDocuments({
          tenant: newTenantId,
        });

      if (
        existingProductCount > 0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains product data",
          "DESTINATION_PRODUCT_DATA_EXISTS",
          {
            existingProductCount,
          }
        );
      }

      const productDocuments =
        masterProducts
          .map((product) => {
            const mappedCategoryId =
              remapCategoryId(
                product.category,
                categoryIdMap
              );

            if (!mappedCategoryId) {
              return null;
            }

            return {
              ...removeDocumentFields(
                product
              ),

              tenant:
                newTenantId,

              category:
                mappedCategoryId,
            };
          })
          .filter(Boolean);

      if (
        productDocuments.length > 0
      ) {
        currentStage =
          "insert_products";

        logCopyStep(
          "Copying products",
          {
            count:
              productDocuments.length,
          }
        );

        const copiedProducts =
          await Product.insertMany(
            productDocuments,
            {
              ordered: true,
            }
          );

        copySummary.products =
          copiedProducts.length;

        logCopyStep(
          "Products copied",
          {
            count:
              copiedProducts.length,
          }
        );
      }

      /* =====================================================
         COPY HOMEPAGE BANNERS
      ===================================================== */

      currentStage =
        "load_master_homepage_banners";

      const masterBanners =
        await HomepageBanner.find({
          tenant: masterTenantId,
        })
          .sort({
            type: 1,
            order: 1,
            createdAt: 1,
          })
          .lean();

      currentStage =
        "check_destination_homepage_banners";

      const existingBannerCount =
        await HomepageBanner.countDocuments({
          tenant: newTenantId,
        });

      if (
        existingBannerCount > 0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains homepage banner data",
          "DESTINATION_HOMEPAGE_BANNER_DATA_EXISTS",
          {
            existingBannerCount,
          }
        );
      }

      if (
        masterBanners.length > 0
      ) {
        currentStage =
          "insert_homepage_banners";

        logCopyStep(
          "Copying homepage banners",
          {
            count:
              masterBanners.length,
          }
        );

        const copiedBanners =
          await HomepageBanner.insertMany(
            masterBanners.map(
              (banner) => ({
                ...removeDocumentFields(
                  banner
                ),

                tenant:
                  newTenantId,
              })
            ),
            {
              ordered: true,
            }
          );

        copySummary.homepageBanners =
          copiedBanners.length;

        logCopyStep(
          "Homepage banners copied",
          {
            count:
              copiedBanners.length,
          }
        );
      }

      /* =====================================================
         COPY HOMEPAGE CATEGORY SHOWCASE
      ===================================================== */

      currentStage =
        "load_master_homepage_showcase";

      const masterShowcase =
        await HomepageCategoryShowcase.findOne(
          {
            tenant:
              masterTenantId,
          }
        ).lean();

      currentStage =
        "check_destination_homepage_showcase";

      const existingShowcaseCount =
        await HomepageCategoryShowcase.countDocuments(
          {
            tenant:
              newTenantId,
          }
        );

      if (
        existingShowcaseCount > 0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains homepage showcase data",
          "DESTINATION_HOMEPAGE_SHOWCASE_DATA_EXISTS",
          {
            existingShowcaseCount,
          }
        );
      }

      if (masterShowcase) {
        currentStage =
          "insert_homepage_showcase";

        logCopyStep(
          "Copying homepage category showcase"
        );

        await HomepageCategoryShowcase.create({
          tenant:
            newTenantId,

          key:
            masterShowcase.key,

          showcaseOne:
            remapShowcaseSection(
              masterShowcase.showcaseOne,
              categoryIdMap
            ),

          showcaseTwo:
            remapShowcaseSection(
              masterShowcase.showcaseTwo,
              categoryIdMap
            ),

          showcaseThree:
            remapShowcaseSection(
              masterShowcase.showcaseThree,
              categoryIdMap
            ),
        });

        copySummary.homepageCategoryShowcases =
          1;

        logCopyStep(
          "Homepage category showcase copied"
        );
      }

      /* =====================================================
         COPY POPULAR CATEGORIES
      ===================================================== */

      currentStage =
        "load_master_popular_categories";

      const masterPopularCategories =
        await PopularCategory.find({
          tenant: masterTenantId,
        })
          .sort({
            order: 1,
            createdAt: 1,
          })
          .lean();

      currentStage =
        "check_destination_popular_categories";

      const existingPopularCategoryCount =
        await PopularCategory.countDocuments({
          tenant: newTenantId,
        });

      if (
        existingPopularCategoryCount >
        0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains popular category data",
          "DESTINATION_POPULAR_CATEGORY_DATA_EXISTS",
          {
            existingPopularCategoryCount,
          }
        );
      }

      const popularCategoryDocuments =
        masterPopularCategories
          .map(
            (
              popularCategory
            ) => {
              const mappedCategoryId =
                remapCategoryId(
                  popularCategory.category,
                  categoryIdMap
                );

              if (
                !mappedCategoryId
              ) {
                return null;
              }

              return {
                ...removeDocumentFields(
                  popularCategory
                ),

                tenant:
                  newTenantId,

                category:
                  mappedCategoryId,
              };
            }
          )
          .filter(Boolean);

      if (
        popularCategoryDocuments.length >
        0
      ) {
        currentStage =
          "insert_popular_categories";

        logCopyStep(
          "Copying popular categories",
          {
            count:
              popularCategoryDocuments.length,
          }
        );

        const copiedPopularCategories =
          await PopularCategory.insertMany(
            popularCategoryDocuments,
            {
              ordered: true,
            }
          );

        copySummary.popularCategories =
          copiedPopularCategories.length;

        logCopyStep(
          "Popular categories copied",
          {
            count:
              copiedPopularCategories.length,
          }
        );
      }

      logCopyStep(
        "Template copy completed",
        copySummary
      );

      return copySummary;
    } catch (error) {
      logCopyError(
        error,
        currentStage,
        {
          masterTenantId:
            String(masterTenantId),

          newTenantId:
            String(newTenantId),

          copySummary,

          details:
            error?.details || null,
        }
      );

      throw error;
    }
  };

/* =========================================================
   CLEANUP PARTIAL TEMPLATE DATA
========================================================= */

const removeTenantTemplateData =
  async (tenantId) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        tenantId
      )
    ) {
      return;
    }

    await Promise.all([
      Product.deleteMany({
        tenant: tenantId,
      }),

      Category.deleteMany({
        tenant: tenantId,
      }),

      HomepageBanner.deleteMany({
        tenant: tenantId,
      }),

      HomepageCategoryShowcase.deleteMany(
        {
          tenant: tenantId,
        }
      ),

      PopularCategory.deleteMany({
        tenant: tenantId,
      }),
    ]);
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  copyMasterTemplateToTenant,
  removeTenantTemplateData,
};
