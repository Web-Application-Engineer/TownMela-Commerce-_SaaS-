"use strict";

const dns = require("dns");
const mongoose = require("mongoose");

require("dotenv").config();

const connectDB = require(
  "../config/db"
);

const Tenant = require(
  "../models/tenantModel"
);

const Category = require(
  "../models/Category"
);

const HomepageBanner = require(
  "../models/HomepageBanner"
);

const HomepageCategoryShowcase =
  require(
    "../models/HomepageCategoryShowcase"
  );

const PopularCategory = require(
  "../models/PopularCategory"
);

/* =========================================================
   DNS CONFIGURATION
========================================================= */

const configureDns = () => {
  const configuredServers = String(
    process.env.DNS_SERVERS || ""
  )
    .split(",")
    .map((server) =>
      server.trim()
    )
    .filter(Boolean);

  if (
    configuredServers.length > 0
  ) {
    dns.setServers(
      configuredServers
    );

    console.log(
      "Custom DNS servers configured:",
      configuredServers
    );
  }
};

/* =========================================================
   CONFIGURATION
========================================================= */

const TOWNMELA_MASTER_TENANT_ID = (
  process.env
    .TOWNMELA_MASTER_TENANT_ID ||
  "6a5fcb5d54ae1ee9930c0a13"
).trim();

/* =========================================================
   HELPERS
========================================================= */

const getMissingTenantFilter =
  () => ({
    $or: [
      {
        tenant: {
          $exists: false,
        },
      },
      {
        tenant: null,
      },
    ],
  });

const migrateModel = async ({
  label,
  model,
  tenantObjectId,
}) => {
  const filter =
    getMissingTenantFilter();

  const beforeCount =
    await model.countDocuments(
      filter
    );

  if (beforeCount === 0) {
    return {
      label,
      matchedCount: 0,
      modifiedCount: 0,
      remainingCount: 0,
    };
  }

  const result =
    await model.updateMany(
      filter,
      {
        $set: {
          tenant:
            tenantObjectId,
          updatedAt:
            new Date(),
        },
      },
      {
        runValidators: false,
      }
    );

  const remainingCount =
    await model.countDocuments(
      filter
    );

  return {
    label,

    matchedCount:
      result.matchedCount ??
      result.n ??
      beforeCount,

    modifiedCount:
      result.modifiedCount ??
      result.nModified ??
      0,

    remainingCount,
  };
};

/* =========================================================
   MIGRATION
========================================================= */

const runMigration = async () => {
  if (
    !mongoose.Types.ObjectId.isValid(
      TOWNMELA_MASTER_TENANT_ID
    )
  ) {
    throw new Error(
      "TOWNMELA_MASTER_TENANT_ID is not a valid MongoDB ObjectId."
    );
  }

  /*
   * Match the normal server startup sequence:
   *
   * 1. Configure DNS
   * 2. Connect to MongoDB with config/db.js
   */

  configureDns();

  await connectDB();

  const tenantObjectId =
    new mongoose.Types.ObjectId(
      TOWNMELA_MASTER_TENANT_ID
    );

  const townMelaTenant =
    await Tenant.findOne({
      _id: tenantObjectId,
      isDeleted: {
        $ne: true,
      },
    })
      .select(
        "_id businessName storeName tenantCode"
      )
      .lean();

  if (!townMelaTenant) {
    throw new Error(
      `TownMela master tenant was not found: ${TOWNMELA_MASTER_TENANT_ID}`
    );
  }

  console.log(
    "TownMela master tenant:",
    {
      id: String(
        townMelaTenant._id
      ),

      businessName:
        townMelaTenant.businessName,

      storeName:
        townMelaTenant.storeName,

      tenantCode:
        townMelaTenant.tenantCode,
    }
  );

  /*
   * Only documents with a missing or null tenant are updated.
   * Existing tenant-aware documents are never changed.
   */

  const results = [];

  results.push(
    await migrateModel({
      label: "Categories",
      model: Category,
      tenantObjectId,
    })
  );

  results.push(
    await migrateModel({
      label:
        "Homepage Banners",
      model:
        HomepageBanner,
      tenantObjectId,
    })
  );

  results.push(
    await migrateModel({
      label:
        "Homepage Category Showcase",
      model:
        HomepageCategoryShowcase,
      tenantObjectId,
    })
  );

  results.push(
    await migrateModel({
      label:
        "Popular Categories",
      model:
        PopularCategory,
      tenantObjectId,
    })
  );

  console.table(results);

  const failedResult =
    results.find(
      (item) =>
        item.remainingCount > 0
    );

  if (failedResult) {
    throw new Error(
      "Migration completed with one or more records still missing tenant context."
    );
  }

  console.log(
    "TownMela template tenant migration completed successfully."
  );
};

/* =========================================================
   EXECUTION
========================================================= */

runMigration()
  .catch((error) => {
    console.error(
      "TownMela template tenant migration failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    if (
      mongoose.connection
        .readyState !== 0
    ) {
      await mongoose.disconnect();
    }
  });
