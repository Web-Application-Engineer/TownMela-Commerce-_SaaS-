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

const StockClearanceCampaign = require(
  "../../models/StockClearanceCampaign"
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

const SocialContactSetting = require(
  "../../models/SocialContactSetting"
);

const HeaderSetting = require(
  "../../models/HeaderSetting"
);

/*
 * Footer settings already exist in the project, but older
 * project snapshots used slightly different filename casing.
 *
 * Resolve the existing Mongoose model safely at runtime so
 * this provisioning service does not create a second model
 * or duplicate footer-settings schema.
 */
const FOOTER_SETTING_MODEL_CANDIDATES = [
  "../../models/FooterSetting",
  "../../models/footerSetting",
  "../../models/FooterSettings",
  "../../models/footerSettings",
  "../../models/FooterSettingModel",
  "../../models/footerSettingModel",
];

const findRegisteredFooterSettingModel =
  () =>
    Object.values(
      mongoose.models
    ).find((model) => {
      const modelName =
        String(
          model?.modelName || ""
        );

      const hasTenantPath =
        Boolean(
          model?.schema?.path(
            "tenant"
          ) ||
            model?.schema?.path(
              "tenantId"
            )
        );

      return (
        /footer.*setting/i.test(
          modelName
        ) &&
        hasTenantPath
      );
    }) || null;

const resolveFooterSettingModel = (
  {
    required = true,
  } = {}
) => {
  const registeredModel =
    findRegisteredFooterSettingModel();

  if (registeredModel) {
    return registeredModel;
  }

  for (
    const candidate of
    FOOTER_SETTING_MODEL_CANDIDATES
  ) {
    try {
      const candidateModel =
        require(candidate);

      if (
        candidateModel &&
        typeof candidateModel.findOne ===
          "function" &&
        candidateModel.schema
      ) {
        return candidateModel;
      }
    } catch (error) {
      const isMissingCandidate =
        error?.code ===
          "MODULE_NOT_FOUND" &&
        String(
          error?.message || ""
        ).includes(candidate);

      if (!isMissingCandidate) {
        throw error;
      }
    }
  }

  const modelAfterRequires =
    findRegisteredFooterSettingModel();

  if (modelAfterRequires) {
    return modelAfterRequires;
  }

  if (!required) {
    return null;
  }

  throw createProvisioningError(
    "Footer settings model could not be resolved",
    "FOOTER_SETTING_MODEL_NOT_FOUND"
  );
};

const getFooterSettingTenantField =
  (FooterSetting) => {
    if (
      FooterSetting?.schema?.path(
        "tenant"
      )
    ) {
      return "tenant";
    }

    if (
      FooterSetting?.schema?.path(
        "tenantId"
      )
    ) {
      return "tenantId";
    }

    throw createProvisioningError(
      "Footer settings model does not contain a tenant field",
      "FOOTER_SETTING_TENANT_FIELD_NOT_FOUND"
    );
  };

/*
 * Some settings models have used slightly different filename
 * casing across project revisions. Resolve them from already
 * registered Mongoose models first, then try known filenames.
 *
 * These are optional only for backward compatibility with old
 * deployments. On the current TownMela build they are expected
 * to resolve and will be copied automatically.
 */
const OPTIONAL_TENANT_MODEL_CONFIGS = {
  homepageProductSections: {
    label:
      "Homepage product section settings",
    registeredPattern:
      /homepage.*product.*section.*setting/i,
    candidates: [
      "../../models/HomepageProductSectionSetting",
      "../../models/homepageProductSectionSetting",
      "../../models/HomepageProductSectionSettings",
      "../../models/homepageProductSectionSettings",
      "../../models/HomepageProductSectionSettingModel",
      "../../models/homepageProductSectionSettingModel",
    ],
  },

  checkoutSettings: {
    label:
      "Checkout settings",
    registeredPattern:
      /checkout.*setting/i,
    candidates: [
      "../../models/CheckoutSetting",
      "../../models/checkoutSetting",
      "../../models/CheckoutSettings",
      "../../models/checkoutSettings",
      "../../models/CheckoutSettingModel",
      "../../models/checkoutSettingModel",
    ],
  },
};

const modelHasTenantField = (
  model
) =>
  Boolean(
    model?.schema?.path(
      "tenant"
    ) ||
      model?.schema?.path(
        "tenantId"
      )
  );

const resolveOptionalTenantModel = (
  config
) => {
    const registeredModel =
      Object.values(
        mongoose.models
      ).find((model) => {
        const modelName =
          String(
            model?.modelName ||
              ""
          );

        return (
          config.registeredPattern.test(
            modelName
          ) &&
          modelHasTenantField(
            model
          )
        );
      }) || null;

    if (registeredModel) {
      return registeredModel;
    }

    for (
      const candidate of
      config.candidates
    ) {
      try {
        const candidateModel =
          require(candidate);

        if (
          candidateModel &&
          typeof candidateModel.findOne ===
            "function" &&
          candidateModel.schema &&
          modelHasTenantField(
            candidateModel
          )
        ) {
          return candidateModel;
        }
      } catch (error) {
        const isMissingCandidate =
          error?.code ===
            "MODULE_NOT_FOUND" &&
          String(
            error?.message || ""
          ).includes(
            candidate
          );

        if (!isMissingCandidate) {
          throw error;
        }
      }
    }

    return (
      Object.values(
        mongoose.models
      ).find((model) => {
        const modelName =
          String(
            model?.modelName ||
              ""
          );

        return (
          config.registeredPattern.test(
            modelName
          ) &&
          modelHasTenantField(
            model
          )
        );
      }) || null
    );
  };

const getModelTenantField = (
  model,
  label =
    "Tenant settings"
) => {
    if (
      model?.schema?.path(
        "tenant"
      )
    ) {
      return "tenant";
    }

    if (
      model?.schema?.path(
        "tenantId"
      )
    ) {
      return "tenantId";
    }

    throw createProvisioningError(
      `${label} model does not contain a tenant field`,
      "TENANT_SETTING_FIELD_NOT_FOUND"
    );
  };

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
  delete result.tenantId;

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

  const remappedSection = {
    ...plainSection,
  };

  /*
   * Let Mongoose generate independent subdocument IDs for
   * the destination tenant.
   */
  delete remappedSection._id;
  delete remappedSection.id;

  if (
    Object.prototype.hasOwnProperty.call(
      plainSection,
      "categoryOne"
    )
  ) {
    remappedSection.categoryOne =
      remapCategoryId(
        plainSection.categoryOne,
        categoryIdMap
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      plainSection,
      "categoryTwo"
    )
  ) {
    remappedSection.categoryTwo =
      remapCategoryId(
        plainSection.categoryTwo,
        categoryIdMap
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      plainSection,
      "categoryThree"
    )
  ) {
    remappedSection.categoryThree =
      remapCategoryId(
        plainSection.categoryThree,
        categoryIdMap
      );
  }

  return remappedSection;
};

const copySingleTenantSettingSnapshot =
  async ({
    Model,
    masterTenantId,
    newTenantId,
    label,
    duplicateCode,
  }) => {
    if (!Model) {
      logCopyStep(
        `${label} model not found; copy skipped`
      );

      return 0;
    }

    const tenantField =
      getModelTenantField(
        Model,
        label
      );

    const masterSetting =
      await Model.findOne({
        [tenantField]:
          masterTenantId,
      }).lean();

    if (!masterSetting) {
      logCopyStep(
        `Master ${label.toLowerCase()} not found; copy skipped`
      );

      return 0;
    }

    const existingCount =
      await Model.countDocuments({
        [tenantField]:
          newTenantId,
      });

    if (existingCount > 0) {
      throw createProvisioningError(
        `Destination tenant already contains ${label.toLowerCase()}`,
        duplicateCode,
        {
          existingCount,
        }
      );
    }

    const snapshot =
      removeDocumentFields(
        masterSetting
      );

    delete snapshot[
      tenantField
    ];

    /*
     * Audit metadata belongs to the master admin and must not
     * be transferred as ownership metadata.
     */
    delete snapshot.createdBy;
    delete snapshot.updatedBy;
    delete snapshot.lastModifiedBy;

    await Model.create({
      ...snapshot,

      [tenantField]:
        newTenantId,
    });

    return 1;
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
      stockClearanceCampaigns: 0,
      homepageBanners: 0,
      homepageCategoryShowcases: 0,
      popularCategories: 0,
      footerContentPages: 0,
      headerSettings: 0,
      footerSettings: 0,
      checkoutSettings: 0,
      socialContactSettings: 0,
      homepageProductSectionSettings: 0,
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
         * New tenants start with the exact TownMela master
         * storefront branding snapshot.
         */
        storeTitle:
          masterBranding.storeTitle ||
          masterTenant.storeName ||
          "",

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

         Functional pages such as Cart, Checkout and
         Track Orders are intentionally NOT copied or
         modified here.
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
         COPY HEADER SETTINGS

         Copy the master header's layout/menu/toggles as a
         one-time snapshot. The existing tenantService
         ensure_header_setting step runs immediately after this
         template copy and intentionally replaces identity fields
         such as Business Name, logo, phone and email with the
         new tenant's own values while preserving copied menus
         and header behavior.
      ===================================================== */

      currentStage =
        "copy_header_settings";

      copySummary.headerSettings =
        await copySingleTenantSettingSnapshot(
          {
            Model:
              HeaderSetting,

            masterTenantId,

            newTenantId,

            label:
              "Header settings",

            duplicateCode:
              "DESTINATION_HEADER_SETTING_EXISTS",
          }
        );

      logCopyStep(
        "Header settings copied",
        {
          count:
            copySummary.headerSettings,
        }
      );

      /* =====================================================
         COPY FOOTER SETTINGS + FOOTER MENUS

         This copies the complete saved footer-settings
         document from the master tenant as a one-time
         snapshot for the new tenant.

         That includes the settings already supported by the
         existing FooterSetting model, such as:
         - logo / description / contact information
         - social links and WhatsApp additionalSocialLinks
         - background image
         - Popular Category menu
         - Customer Information menu
         - Quick Navigation menu
         - Digital Presence link and its enabled state
         - Google Map settings
         - copyright / active state
         - any future footer fields already present in the
           same FooterSetting schema/document

         No live relationship is created with the master.
      ===================================================== */

      currentStage =
        "copy_footer_settings";

      const FooterSetting =
        resolveFooterSettingModel();

      const footerTenantField =
        getFooterSettingTenantField(
          FooterSetting
        );

      const masterFooterSetting =
        await FooterSetting.findOne({
          [footerTenantField]:
            masterTenantId,
        }).lean();

      if (masterFooterSetting) {
        const footerSnapshot =
          removeDocumentFields(
            masterFooterSetting
          );

        /*
         * removeDocumentFields() removes "tenant".
         * Also remove whichever tenant field the existing
         * FooterSetting model actually uses.
         */
        delete footerSnapshot[
          footerTenantField
        ];

        /*
         * Do not carry master-admin audit ownership into the
         * new tenant. These are metadata, not footer content.
         */
        delete footerSnapshot.createdBy;
        delete footerSnapshot.updatedBy;
        delete footerSnapshot.lastModifiedBy;

        await FooterSetting.findOneAndUpdate(
          {
            [footerTenantField]:
              newTenantId,
          },
          {
            $set: {
              ...footerSnapshot,

              [footerTenantField]:
                newTenantId,
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

        copySummary.footerSettings =
          1;

        logCopyStep(
          "Footer settings copied",
          {
            count:
              copySummary.footerSettings,
          }
        );
      } else {
        logCopyStep(
          "Master footer settings not found; footer settings copy skipped"
        );
      }

      /* =====================================================
         COPY CHECKOUT SETTINGS

         Checkout configuration is storefront configuration,
         not transactional data. Copy it as a one-time snapshot
         so new tenants start with the same checkout behavior.
      ===================================================== */

      currentStage =
        "copy_checkout_settings";

      const CheckoutSetting =
        resolveOptionalTenantModel(
          OPTIONAL_TENANT_MODEL_CONFIGS
            .checkoutSettings
        );

      copySummary.checkoutSettings =
        await copySingleTenantSettingSnapshot(
          {
            Model:
              CheckoutSetting,

            masterTenantId,

            newTenantId,

            label:
              "Checkout settings",

            duplicateCode:
              "DESTINATION_CHECKOUT_SETTING_EXISTS",
          }
        );

      logCopyStep(
        "Checkout settings copy completed",
        {
          count:
            copySummary.checkoutSettings,
        }
      );

      /* =====================================================
         COPY SOCIAL CONTACT SETTINGS

         A new tenant receives a complete one-time snapshot
         of the TownMela master tenant's Social Contact
         configuration.

         This includes:
         - Messenger / WhatsApp / Phone
         - Facebook / Instagram / YouTube
         - individual enable / disable states
         - individual social colors
         - panel / border / main button colors
         - label / hover / pulse colors
         - main widget active state and label text

         The destination record belongs only to the new tenant.
         No live relationship is created with the master tenant.
      ===================================================== */

      currentStage =
        "copy_social_contact_settings";

      /*
       * Ensure the master tenant always has a complete Social
       * Contact record. On the first installation this creates
       * the master record from the model defaults that mirror
       * the existing Easy Contact WordPress widget.
       */
      const masterSocialContactSetting =
        await SocialContactSetting.findOneAndUpdate(
          {
            tenant:
              masterTenantId,
          },
          {
            $setOnInsert: {
              tenant:
                masterTenantId,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true,
          }
        ).lean();

      const existingSocialContactSettingCount =
        await SocialContactSetting.countDocuments(
          {
            tenant:
              newTenantId,
          }
        );

      if (
        existingSocialContactSettingCount >
        0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains social contact settings",
          "DESTINATION_SOCIAL_CONTACT_SETTING_EXISTS",
          {
            existingSocialContactSettingCount,
          }
        );
      }

      if (
        masterSocialContactSetting
      ) {
        const socialContactSnapshot =
          removeDocumentFields(
            masterSocialContactSetting
          );

        delete socialContactSnapshot.updatedBy;
        delete socialContactSnapshot.createdBy;
        delete socialContactSnapshot.lastModifiedBy;

        await SocialContactSetting.create({
          ...socialContactSnapshot,

          tenant:
            newTenantId,

          updatedBy:
            null,
        });

        copySummary.socialContactSettings =
          1;

        logCopyStep(
          "Social contact settings copied",
          {
            count:
              copySummary.socialContactSettings,
          }
        );
      }

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

                // Preserve master category ordering for copied tenants.
                createdAt:
                  category.createdAt,
                updatedAt:
                  category.updatedAt,
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

        /*
         * Category.parent / parentCategory contains IDs from
         * the master tenant. Remap those references after all
         * destination category IDs are known so subcategories
         * remain attached to the correct copied parent.
         */
        currentStage =
          "remap_category_parents";

        const parentUpdateTasks =
          [];

        copiedCategories.forEach(
          (
            copiedCategory,
            index
          ) => {
            const masterCategory =
              masterCategories[
                index
              ];

            const updateFields =
              {};

            if (
              Category.schema.path(
                "parent"
              ) &&
              masterCategory
                ?.parent
            ) {
              updateFields.parent =
                remapCategoryId(
                  masterCategory.parent,
                  categoryIdMap
                );
            }

            if (
              Category.schema.path(
                "parentCategory"
              ) &&
              masterCategory
                ?.parentCategory
            ) {
              updateFields.parentCategory =
                remapCategoryId(
                  masterCategory
                    .parentCategory,
                  categoryIdMap
                );
            }

            if (
              Object.keys(
                updateFields
              ).length >
              0
            ) {
              parentUpdateTasks.push(
                Category.updateOne(
                  {
                    _id:
                      copiedCategory._id,

                    tenant:
                      newTenantId,
                  },
                  {
                    $set:
                      updateFields,
                  }
                )
              );
            }
          }
        );

        if (
          parentUpdateTasks.length >
          0
        ) {
          await Promise.all(
            parentUpdateTasks
          );
        }

        logCopyStep(
          "Categories copied",
          {
            count:
              copiedCategories.length,

            parentLinksRemapped:
              parentUpdateTasks.length,
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

      const productIdMap =
        new Map();

      const productDocuments =
        masterProducts.map(
          (product) => {
            const hasSourceCategory =
              Boolean(
                product.category
              );

            const mappedCategoryId =
              hasSourceCategory
                ? remapCategoryId(
                    product.category,
                    categoryIdMap
                  )
                : null;

            /*
             * A real category reference must always map to the
             * copied tenant category. If it does not, fail loudly
             * instead of silently dropping the product.
             *
             * Legacy master products with category:null are kept
             * exactly as they are.
             */
            if (
              hasSourceCategory &&
              !mappedCategoryId
            ) {
              throw createProvisioningError(
                `Unable to map category for product "${product.name || product.slug || product._id}"`,
                "PRODUCT_CATEGORY_MAPPING_FAILED",
                {
                  productId:
                    String(
                      product._id
                    ),
                  categoryId:
                    String(
                      product.category
                    ),
                }
              );
            }

            return {
              ...removeDocumentFields(
                product
              ),

              tenant:
                newTenantId,

              category:
                mappedCategoryId,

              // Preserve master storefront product ordering.
              createdAt:
                product.createdAt,

              updatedAt:
                product.updatedAt,
            };
          }
        );

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

        const normalProductDocuments =
          productDocuments.filter(
            (product) =>
              Boolean(
                product.category
              )
          );

        const legacyProductDocuments =
          productDocuments.filter(
            (product) =>
              !product.category
          );

        const copiedProducts = [];

        if (
          normalProductDocuments.length >
          0
        ) {
          const insertedProducts =
            await Product.insertMany(
              normalProductDocuments,
              {
                ordered: true,
              }
            );

          copiedProducts.push(
            ...insertedProducts
          );
        }

        /*
         * Some legacy master products were created before category
         * became required and therefore legitimately have category:null.
         * Preserve those records without weakening the Product schema
         * for new products.
         */
        for (
          const legacyProductDocument
          of legacyProductDocuments
        ) {
          const legacyProduct =
            new Product(
              legacyProductDocument
            );

          await legacyProduct.save({
            validateBeforeSave:
              false,

            timestamps:
              false,
          });

          copiedProducts.push(
            legacyProduct
          );
        }

        copySummary.products =
          copiedProducts.length;

        /*
         * Build master-product -> copied-product ID mapping.
         * Stock Clearance uses product references, so those
         * references must point to the new tenant's own products.
         */
        const sourceProductBySlug =
          new Map(
            masterProducts.map(
              (product) => [
                String(
                  product.slug || ""
                ),
                product,
              ]
            )
          );

        copiedProducts.forEach(
          (
            copiedProduct,
            index
          ) => {
            const sourceProduct =
              sourceProductBySlug.get(
                String(
                  copiedProduct.slug ||
                    ""
                )
              ) ||
              masterProducts[index];

            if (sourceProduct) {
              productIdMap.set(
                String(
                  sourceProduct._id
                ),
                copiedProduct._id
              );
            }
          }
        );

        logCopyStep(
          "Products copied",
          {
            count:
              copiedProducts.length,
          }
        );
      }

      /* =====================================================
         COPY STOCK CLEARANCE CAMPAIGN
      ===================================================== */

      currentStage =
        "load_master_stock_clearance_campaign";

      const masterStockClearanceCampaign =
        await StockClearanceCampaign.findOne({
          tenant: masterTenantId,
        }).lean();

      currentStage =
        "check_destination_stock_clearance_campaign";

      const existingStockClearanceCampaignCount =
        await StockClearanceCampaign.countDocuments({
          tenant: newTenantId,
        });

      if (
        existingStockClearanceCampaignCount >
        0
      ) {
        throw createProvisioningError(
          "Destination tenant already contains stock clearance campaign data",
          "DESTINATION_STOCK_CLEARANCE_DATA_EXISTS",
          {
            existingStockClearanceCampaignCount,
          }
        );
      }

      if (
        masterStockClearanceCampaign
      ) {
        currentStage =
          "copy_stock_clearance_campaign";

        const remappedCampaignProducts =
          (
            Array.isArray(
              masterStockClearanceCampaign.products
            )
              ? masterStockClearanceCampaign.products
              : []
          )
            .map((productId) =>
              productIdMap.get(
                String(productId)
              )
            )
            .filter(Boolean);

        const stockClearanceDocument = {
          ...removeDocumentFields(
            masterStockClearanceCampaign
          ),

          tenant:
            newTenantId,

          products:
            remappedCampaignProducts,

          /*
           * Never copy the master tenant's admin/user reference.
           */
          updatedBy:
            null,
        };

        await StockClearanceCampaign.create(
          stockClearanceDocument
        );

        copySummary.stockClearanceCampaigns =
          1;

        logCopyStep(
          "Stock clearance campaign copied",
          {
            count: 1,

            products:
              remappedCampaignProducts.length,

            masterProducts:
              Array.isArray(
                masterStockClearanceCampaign.products
              )
                ? masterStockClearanceCampaign.products.length
                : 0,
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

        const showcaseSnapshot =
          removeDocumentFields(
            masterShowcase
          );

        const remappedShowcase = {
          ...showcaseSnapshot,

          tenant:
            newTenantId,
        };

        /*
         * Current TownMela supports dynamic `showcases[]`
         * plus legacy showcaseOne/Two/Three compatibility.
         * Preserve both while remapping category ObjectIds.
         */
        if (
          Array.isArray(
            masterShowcase.showcases
          )
        ) {
          remappedShowcase.showcases =
            masterShowcase.showcases.map(
              (section) =>
                remapShowcaseSection(
                  section,
                  categoryIdMap
                )
            );
        }

        for (
          const legacyKey of
          [
            "showcaseOne",
            "showcaseTwo",
            "showcaseThree",
          ]
        ) {
          if (
            masterShowcase[
              legacyKey
            ]
          ) {
            remappedShowcase[
              legacyKey
            ] =
              remapShowcaseSection(
                masterShowcase[
                  legacyKey
                ],
                categoryIdMap
              );
          }
        }

        await HomepageCategoryShowcase.create(
          remappedShowcase
        );

        copySummary.homepageCategoryShowcases =
          1;

        logCopyStep(
          "Homepage category showcase copied"
        );
      }

      /* =====================================================
         COPY HOMEPAGE PRODUCT SECTION SETTINGS

         Product documents already carry their stable
         homepageSection keys. Copying the matching section
         settings preserves titles, enabled states and layout
         order for the new tenant.
      ===================================================== */

      currentStage =
        "copy_homepage_product_section_settings";

      const HomepageProductSectionSetting =
        resolveOptionalTenantModel(
          OPTIONAL_TENANT_MODEL_CONFIGS
            .homepageProductSections
        );

      copySummary.homepageProductSectionSettings =
        await copySingleTenantSettingSnapshot(
          {
            Model:
              HomepageProductSectionSetting,

            masterTenantId,

            newTenantId,

            label:
              "Homepage product section settings",

            duplicateCode:
              "DESTINATION_HOMEPAGE_PRODUCT_SECTION_SETTING_EXISTS",
          }
        );

      logCopyStep(
        "Homepage product section settings copy completed",
        {
          count:
            copySummary.homepageProductSectionSettings,
        }
      );

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

    const cleanupTasks = [
      Product.deleteMany({
        tenant: tenantId,
      }),

      StockClearanceCampaign.deleteMany({
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

      SocialContactSetting.deleteMany({
        tenant: tenantId,
      }),

      HeaderSetting.deleteMany({
        tenant: tenantId,
      }),
    ];

    /*
     * Optional copied settings use the same runtime resolver
     * as provisioning so rollback remains compatible with
     * filename/model-name differences.
     */
    for (
      const config of
      [
        OPTIONAL_TENANT_MODEL_CONFIGS
          .checkoutSettings,
        OPTIONAL_TENANT_MODEL_CONFIGS
          .homepageProductSections,
      ]
    ) {
      try {
        const Model =
          resolveOptionalTenantModel(
            config
          );

        if (Model) {
          const tenantField =
            getModelTenantField(
              Model,
              config.label
            );

          cleanupTasks.push(
            Model.deleteMany({
              [tenantField]:
                tenantId,
            })
          );
        }
      } catch (error) {
        console.error(
          `Tenant ${config.label.toLowerCase()} rollback preparation error:`,
          error
        );
      }
    }

    /*
     * FooterSetting is resolved dynamically so rollback also
     * cleans a copied footer-settings document without making
     * this helper dependent on a particular filename casing.
     */
    try {
      const FooterSetting =
        resolveFooterSettingModel({
          required: false,
        });

      if (FooterSetting) {
        const footerTenantField =
          getFooterSettingTenantField(
            FooterSetting
          );

        cleanupTasks.push(
          FooterSetting.deleteMany({
            [footerTenantField]:
              tenantId,
          })
        );
      }
    } catch (error) {
      console.error(
        "Tenant footer settings rollback preparation error:",
        error
      );
    }

    await Promise.all(
      cleanupTasks
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  copyMasterTemplateToTenant,
  removeTenantTemplateData,
};
