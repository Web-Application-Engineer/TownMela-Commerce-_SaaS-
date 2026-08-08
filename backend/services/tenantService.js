const mongoose = require("mongoose");
const Tenant = require("../models/tenantModel");
const TenantCounter = require("../models/tenantCounterModel");
const User = require("../models/User");

const {
  copyMasterTemplateToTenant,
  removeTenantTemplateData,
} = require(
  "./tenant/copyMasterTemplateToTenant"
);

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_PLAN = "Standard";
const DEFAULT_TRIAL_DAYS = 7;

const TENANT_CODE_PREFIX = "SRESTE_202609";
const TENANT_COUNTER_KEY = "tenantCode";

const ALLOWED_TENANT_STATUSES = [
  "active",
  "inactive",
  "suspended",
];

const ALLOWED_SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "expired",
  "suspended",
  "cancelled",
];

/* =====================================================
   SERVICE ERROR
===================================================== */

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/* =====================================================
   BASIC HELPERS
===================================================== */

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeEmail = (value) =>
  normalizeText(value).toLowerCase();

const normalizePhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const normalizeDomain = (value) => {
  const domain = normalizeText(value).toLowerCase();

  if (!domain) {
    return null;
  }

  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .trim();
};

const normalizeSlug = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const addDays = (date, days) => {
  const result = new Date(date);

  if (Number.isNaN(result.getTime())) {
    throw createServiceError("Invalid date provided");
  }

  result.setUTCDate(result.getUTCDate() + Number(days));

  return result;
};

const setTenantUsersActiveState = async (
  tenantId,
  isActive
) => {
  if (!tenantId) {
    return;
  }

  await User.updateMany(
    {
      tenant: tenantId,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isActive: Boolean(isActive),
      },
    }
  );
};

/* =====================================================
   TENANT CODE GENERATOR
===================================================== */

/**
 * Reads the highest existing SRESTE tenant sequence.
 *
 * Example:
 * SRESTE_2026090011 -> 11
 */
const getHighestExistingTenantSequence = async () => {
  const tenants = await Tenant.find({
    tenantCode: {
      $regex: /^SRESTE_202609\d{4,}$/,
    },
  })
    .select("tenantCode")
    .lean();

  let highestSequence = 0;

  for (const tenant of tenants) {
    const sequenceText = String(tenant.tenantCode || "").slice(
      TENANT_CODE_PREFIX.length
    );

    const sequence = Number.parseInt(sequenceText, 10);

    if (
      Number.isInteger(sequence) &&
      sequence > highestSequence
    ) {
      highestSequence = sequence;
    }
  }

  return highestSequence;
};

/**
 * Creates the counter only once.
 *
 * If SRESTE tenant IDs already exist, the counter starts from the
 * highest existing sequence so that old IDs are not duplicated.
 */
const initializeTenantCounter = async () => {
  const existingCounter = await TenantCounter.findOne({
    key: TENANT_COUNTER_KEY,
  })
    .select("_id")
    .lean();

  if (existingCounter) {
    return;
  }

  const highestExistingSequence =
    await getHighestExistingTenantSequence();

  try {
    await TenantCounter.updateOne(
      {
        key: TENANT_COUNTER_KEY,
      },
      {
        $setOnInsert: {
          sequence: highestExistingSequence,
        },
      },
      {
        upsert: true,
      }
    );
  } catch (error) {
    /*
     * Another request may create the same counter at the same time.
     * Duplicate key means the counter now exists, so generation can
     * safely continue.
     */
    if (error?.code !== 11000) {
      throw error;
    }
  }
};

/**
 * Atomically increments the counter and generates:
 *
 * SRESTE_2026090001
 * SRESTE_2026090002
 * SRESTE_2026090003
 */
const generateTenantCode = async () => {
  await initializeTenantCounter();

  const counter = await TenantCounter.findOneAndUpdate(
    {
      key: TENANT_COUNTER_KEY,
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!counter || !Number.isInteger(counter.sequence)) {
    throw createServiceError(
      "Unable to generate tenant ID",
      500
    );
  }

  return `${TENANT_CODE_PREFIX}${String(
    counter.sequence
  ).padStart(4, "0")}`;
};

/* =====================================================
   TENANT EXISTENCE HELPERS
===================================================== */

const findTenantByIdOrFail = async (
  tenantId,
  { includeDeleted = false } = {}
) => {
  if (!isValidObjectId(tenantId)) {
    throw createServiceError("Invalid tenant ID", 400);
  }

  const query = { _id: tenantId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const tenant = await Tenant.findOne(query);

  if (!tenant) {
    throw createServiceError("Tenant not found", 404);
  }

  return tenant;
};

const ensureUniqueTenantFields = async ({
  slug,
  tenantCode,
  ownerEmail,
  customDomain,
  excludeTenantId = null,
}) => {
  const checks = [];

  if (slug) {
    checks.push({
      label: "Tenant slug",
      query: { slug, isDeleted: false },
    });
  }

  if (tenantCode) {
    checks.push({
      label: "Tenant ID",
      query: { tenantCode },
    });
  }

  if (ownerEmail) {
    checks.push({
      label: "Owner email",
      query: { ownerEmail, isDeleted: false },
    });
  }

  if (customDomain) {
    checks.push({
      label: "Custom domain",
      query: { customDomain, isDeleted: false },
    });
  }

  for (const check of checks) {
    if (excludeTenantId) {
      check.query._id = { $ne: excludeTenantId };
    }

    const exists = await Tenant.exists(check.query);

    if (exists) {
      throw createServiceError(
        `${check.label} is already being used by another tenant`,
        409
      );
    }
  }
};

/* =====================================================
   DATABASE ERROR HANDLER
===================================================== */

const throwFriendlyDatabaseError = (error) => {
  if (error?.code !== 11000) {
    throw error;
  }

  const duplicateField = Object.keys(
    error.keyPattern || error.keyValue || {}
  )[0];

  const duplicateMessages = {
    tenantCode: "Tenant ID already exists",
    slug: "Tenant slug is already being used",
    ownerEmail: "Owner email is already being used",
    customDomain: "Custom domain is already being used",
  };

  throw createServiceError(
    duplicateMessages[duplicateField] ||
      "A tenant with the same unique information already exists",
    409
  );
};

/* =====================================================
   TRIAL / SUBSCRIPTION STATUS
===================================================== */

const synchronizeSubscriptionStatus = async (tenant) => {
  if (!tenant?.subscription || tenant.isDeleted) {
    return tenant;
  }

  const now = new Date();
  const subscription = tenant.subscription;

  const trialEndsAt = subscription.trialEndsAt
    ? new Date(subscription.trialEndsAt)
    : null;

  const expiresAt = subscription.expiresAt
    ? new Date(subscription.expiresAt)
    : null;

  const trialExpired =
    subscription.status === "trial" &&
    trialEndsAt &&
    trialEndsAt <= now;

  const paidSubscriptionExpired =
    subscription.status === "active" &&
    expiresAt &&
    expiresAt <= now;

  if (trialExpired || paidSubscriptionExpired) {
    subscription.status = "expired";
    tenant.status = "suspended";

    await tenant.save();
    await setTenantUsersActiveState(
      tenant._id,
      false
    );
  }

  return tenant;
};

const suspendExpiredTenants = async () => {
  const now = new Date();

  const expiredTenants = await Tenant.find({
    isDeleted: false,
    status: { $ne: "suspended" },
    $or: [
      {
        "subscription.status": "trial",
        "subscription.trialEndsAt": { $lte: now },
      },
      {
        "subscription.status": "active",
        "subscription.expiresAt": { $lte: now },
      },
    ],
  }).select("_id");

  if (expiredTenants.length === 0) {
    return {
      matchedCount: 0,
      modifiedCount: 0,
      checkedAt: now,
    };
  }

  const tenantIds = expiredTenants.map(
    (tenant) => tenant._id
  );

  const result = await Tenant.updateMany(
    {
      _id: { $in: tenantIds },
    },
    {
      $set: {
        status: "suspended",
        "subscription.status": "expired",
      },
    }
  );

  await User.updateMany(
    {
      tenant: { $in: tenantIds },
      isDeleted: { $ne: true },
    },
    {
      $set: {
        isActive: false,
      },
    }
  );

  return {
    matchedCount:
      result.matchedCount ?? result.n ?? tenantIds.length,
    modifiedCount:
      result.modifiedCount ?? result.nModified ?? 0,
    checkedAt: now,
  };
};

/* =====================================================
   CREATE TENANT
===================================================== */

const createTenant = async (payload = {}, createdBy = null) => {
  const businessName = normalizeText(payload.businessName);

  const storeName = normalizeText(
    payload.storeName || payload.businessName
  );

  const ownerName = normalizeText(payload.ownerName);
  const ownerEmail = normalizeEmail(payload.ownerEmail);
  const ownerPhone = normalizePhone(payload.ownerPhone);

  const temporaryPassword = String(
    payload.temporaryPassword || ""
  );

  if (!businessName) {
    throw createServiceError("Business name is required");
  }

  if (!storeName) {
    throw createServiceError("Store name is required");
  }

  if (!ownerName) {
    throw createServiceError("Owner name is required");
  }

  if (!ownerEmail) {
    throw createServiceError("Owner email is required");
  }

  if (!ownerPhone) {
    throw createServiceError("Owner phone is required");
  }

  if (!/^01\d{9}$/.test(ownerPhone)) {
    throw createServiceError(
      "Please enter a valid 11-digit owner phone number"
    );
  }

  if (temporaryPassword.length < 6) {
    throw createServiceError(
      "Temporary password must contain at least 6 characters"
    );
  }

  const slug = normalizeSlug(
    payload.slug || storeName || businessName
  );

  if (!slug) {
    throw createServiceError(
      "A valid tenant slug is required"
    );
  }

  /*
   * tenantCode from req.body is intentionally ignored.
   * Tenant ID is always generated by the backend.
   */
  const tenantCode = await generateTenantCode();

  const customDomain = normalizeDomain(
    payload.customDomain
  );

  await ensureUniqueTenantFields({
    slug,
    tenantCode,
    ownerEmail,
    customDomain,
  });

  const trialStartsAt = new Date();

  const trialEndsAt = addDays(
    trialStartsAt,
    DEFAULT_TRIAL_DAYS
  );

  let tenant = null;
  let tenantAdminUser = null;
  let provisioningStage = "create_tenant";

  try {
    tenant = await Tenant.create({
      businessName,
      storeName,
      slug,
      tenantCode,

      ownerName,
      ownerEmail,
      ownerPhone,

      customDomain,
      domainVerified: false,

      branding: {
        logo: normalizeText(payload.branding?.logo),
        favicon: normalizeText(
          payload.branding?.favicon
        ),
        primaryColor:
          normalizeText(payload.branding?.primaryColor) ||
          "#16a34a",
        secondaryColor:
          normalizeText(
            payload.branding?.secondaryColor
          ) || "#111827",
        storeTitle:
          normalizeText(payload.branding?.storeTitle) ||
          storeName,
        storeTagline: normalizeText(
          payload.branding?.storeTagline
        ),
      },

      storeContact: {
        email:
          normalizeEmail(payload.storeContact?.email) ||
          ownerEmail,
        phone:
          normalizePhone(payload.storeContact?.phone) ||
          ownerPhone,
        address: normalizeText(
          payload.storeContact?.address
        ),
        city: normalizeText(payload.storeContact?.city),
        country:
          normalizeText(payload.storeContact?.country) ||
          "Bangladesh",
      },

      subscription: {
        plan: DEFAULT_PLAN,
        isTrial: true,
        trialDays: DEFAULT_TRIAL_DAYS,
        trialEndsAt,
        status: "trial",
        startsAt: trialStartsAt,
        expiresAt: trialEndsAt,
        autoRenew: false,
      },

      status: "active",
      setupCompleted: false,
      isDeleted: false,
      deletedAt: null,
      createdBy:
        createdBy && isValidObjectId(createdBy)
          ? createdBy
          : null,
    });

    /*
     * User model hashes this password automatically.
     * Do not hash it manually here.
     */
    provisioningStage =
      "create_tenant_admin";

    tenantAdminUser =
      await User.create({
        tenant: tenant._id,
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        password: temporaryPassword,
        role: "admin",
        isActive: true,
        isDeleted: false,
      });

    /*
     * Copy tenant-safe TownMela starter content.
     *
     * Included:
     * - Categories
     * - Homepage banners
     * - Homepage category showcase
     * - Popular categories
     * - Branding defaults
     *
     * Orders, customers, payments, inventory and other
     * business transactions are intentionally not copied.
     */

    provisioningStage =
      "copy_master_template";

    await copyMasterTemplateToTenant(
      tenant._id
    );

    provisioningStage =
      "completed";

    return tenant;
  } catch (error) {
    console.error(
      "CREATE TENANT EXACT ERROR:",
      {
        provisioningStage,
        code: error?.code,
        name: error?.name,
        message: error?.message,
        keyPattern:
          error?.keyPattern,
        keyValue:
          error?.keyValue,
        index:
          error?.index,
        tenantId:
          tenant?._id
            ? String(tenant._id)
            : null,
        adminUserId:
          tenantAdminUser?._id
            ? String(
                tenantAdminUser._id
              )
            : null,
        stack:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error?.stack,
      }
    );

    /*
     * Avoid leaving a tenant without an admin account.
     * This rollback also works when MongoDB transactions
     * are unavailable on a standalone local server.
     */
    if (tenant?._id) {
      await removeTenantTemplateData(
        tenant._id
      ).catch((rollbackError) => {
        console.error(
          "Tenant template rollback error:",
          rollbackError
        );
      });

      await User.deleteMany({
        tenant: tenant._id,
      }).catch((rollbackError) => {
        console.error(
          "Tenant admin rollback error:",
          rollbackError
        );
      });

      await Tenant.findByIdAndDelete(
        tenant._id
      ).catch((rollbackError) => {
        console.error(
          "Tenant creation rollback error:",
          rollbackError
        );
      });
    }

    if (error?.name === "ValidationError") {
      throw createServiceError(
        error.message,
        400
      );
    }

    if (error?.code === 11000) {
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};

      let message =
        provisioningStage ===
        "copy_master_template"
          ? "Master template data could not be copied because duplicate tenant data already exists"
          : provisioningStage ===
              "create_tenant_admin"
            ? "Tenant admin account information already exists"
            : "Tenant information already exists";

      if (
        keyPattern.email ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "email"
        )
      ) {
        message =
          "An admin account already exists with this email address for this tenant";
      } else if (
        keyPattern.phone ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "phone"
        )
      ) {
        message =
          "An admin account already exists with this phone number for this tenant";
      } else if (
        keyPattern.username ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "username"
        )
      ) {
        message =
          "Tenant admin username already exists";
      } else if (
        keyPattern.tenantCode ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "tenantCode"
        )
      ) {
        message = "Tenant ID already exists";
      } else if (
        keyPattern.slug ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "slug"
        )
      ) {
        message =
          "Tenant slug is already being used";
      } else if (
        keyPattern.ownerEmail ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "ownerEmail"
        )
      ) {
        message =
          "Owner email is already being used";
      } else if (
        keyPattern.customDomain ||
        Object.prototype.hasOwnProperty.call(
          keyValue,
          "customDomain"
        )
      ) {
        message =
          "Custom domain is already being used";
      }

      throw createServiceError(
        message,
        409
      );
    }

    throw error;
  }
};

/* =====================================================
   GET TENANT LIST
===================================================== */

const getTenants = async (queryParams = {}) => {
  await suspendExpiredTenants();

  const page = Math.max(
    Number.parseInt(queryParams.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(queryParams.limit, 10) || 20,
      1
    ),
    100
  );

  const skip = (page - 1) * limit;
  const query = { isDeleted: false };

  const search = normalizeText(queryParams.search);

  if (search) {
    const searchRegex = new RegExp(
      escapeRegExp(search),
      "i"
    );

    query.$or = [
      { businessName: searchRegex },
      { storeName: searchRegex },
      { tenantCode: searchRegex },
      { ownerName: searchRegex },
      { ownerEmail: searchRegex },
      { ownerPhone: searchRegex },
      { customDomain: searchRegex },
    ];
  }

  if (
    queryParams.status &&
    ALLOWED_TENANT_STATUSES.includes(queryParams.status)
  ) {
    query.status = queryParams.status;
  }

  if (
    queryParams.subscriptionStatus &&
    ALLOWED_SUBSCRIPTION_STATUSES.includes(
      queryParams.subscriptionStatus
    )
  ) {
    query["subscription.status"] =
      queryParams.subscriptionStatus;
  }

  if (queryParams.plan) {
    query["subscription.plan"] = DEFAULT_PLAN;
  }

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "businessName",
    "storeName",
    "tenantCode",
    "subscription.expiresAt",
  ];

  const sortBy = allowedSortFields.includes(
    queryParams.sortBy
  )
    ? queryParams.sortBy
    : "createdAt";

  const sortOrder =
    String(queryParams.sortOrder).toLowerCase() === "asc"
      ? 1
      : -1;

  const [tenants, total] = await Promise.all([
    Tenant.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),

    Tenant.countDocuments(query),
  ]);

  return {
    tenants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
};

/* =====================================================
   GET TENANT BY ID
===================================================== */

const getTenantById = async (tenantId) => {
  const tenant = await findTenantByIdOrFail(tenantId);

  await synchronizeSubscriptionStatus(tenant);

  return tenant;
};

/* =====================================================
   UPDATE TENANT
===================================================== */

const updateTenant = async (tenantId, payload = {}) => {
  /*
   * Tenant ID is permanent. Even if a client sends tenantCode,
   * the update is rejected explicitly.
   */
  if (payload.tenantCode !== undefined) {
    throw createServiceError(
      "Tenant ID is permanent and cannot be changed",
      400
    );
  }

  const tenant = await findTenantByIdOrFail(tenantId);

  await synchronizeSubscriptionStatus(tenant);

  const nextSlug =
    payload.slug !== undefined
      ? normalizeSlug(payload.slug)
      : tenant.slug;

  const nextOwnerEmail =
    payload.ownerEmail !== undefined
      ? normalizeEmail(payload.ownerEmail)
      : tenant.ownerEmail;

  const nextCustomDomain =
    payload.customDomain !== undefined
      ? normalizeDomain(payload.customDomain)
      : tenant.customDomain;

  if (!nextSlug) {
    throw createServiceError(
      "A valid tenant slug is required"
    );
  }

  if (!nextOwnerEmail) {
    throw createServiceError("Owner email is required");
  }

  await ensureUniqueTenantFields({
    slug: nextSlug,
    ownerEmail: nextOwnerEmail,
    customDomain: nextCustomDomain,
    excludeTenantId: tenant._id,
  });

  if (payload.businessName !== undefined) {
    const businessName = normalizeText(
      payload.businessName
    );

    if (!businessName) {
      throw createServiceError(
        "Business name cannot be empty"
      );
    }

    tenant.businessName = businessName;
  }

  if (payload.storeName !== undefined) {
    const storeName = normalizeText(payload.storeName);

    if (!storeName) {
      throw createServiceError(
        "Store name cannot be empty"
      );
    }

    tenant.storeName = storeName;
  }

  if (payload.slug !== undefined) {
    tenant.slug = nextSlug;
  }

  if (payload.ownerName !== undefined) {
    const ownerName = normalizeText(payload.ownerName);

    if (!ownerName) {
      throw createServiceError(
        "Owner name cannot be empty"
      );
    }

    tenant.ownerName = ownerName;
  }

  if (payload.ownerEmail !== undefined) {
    tenant.ownerEmail = nextOwnerEmail;
  }

  if (payload.ownerPhone !== undefined) {
    const ownerPhone = normalizePhone(payload.ownerPhone);

    if (!ownerPhone) {
      throw createServiceError(
        "Owner phone cannot be empty"
      );
    }

    if (!/^01\d{9}$/.test(ownerPhone)) {
      throw createServiceError(
        "Please enter a valid 11-digit owner phone number"
      );
    }

    tenant.ownerPhone = ownerPhone;
  }

  if (payload.customDomain !== undefined) {
    const previousDomain = tenant.customDomain || null;

    tenant.customDomain = nextCustomDomain;

    if (previousDomain !== nextCustomDomain) {
      tenant.domainVerified = false;
    }
  }

  if (payload.domainVerified !== undefined) {
    tenant.domainVerified = Boolean(
      payload.domainVerified
    );
  }

  if (payload.branding) {
    const currentBranding =
      typeof tenant.branding?.toObject === "function"
        ? tenant.branding.toObject()
        : tenant.branding || {};

    tenant.branding = {
      ...currentBranding,
      ...payload.branding,
    };

    if (payload.branding.logo !== undefined) {
      tenant.branding.logo = normalizeText(
        payload.branding.logo
      );
    }

    if (payload.branding.favicon !== undefined) {
      tenant.branding.favicon = normalizeText(
        payload.branding.favicon
      );
    }

    if (payload.branding.primaryColor !== undefined) {
      tenant.branding.primaryColor =
        normalizeText(
          payload.branding.primaryColor
        ) || "#16a34a";
    }

    if (
      payload.branding.secondaryColor !== undefined
    ) {
      tenant.branding.secondaryColor =
        normalizeText(
          payload.branding.secondaryColor
        ) || "#111827";
    }

    if (payload.branding.storeTitle !== undefined) {
      tenant.branding.storeTitle = normalizeText(
        payload.branding.storeTitle
      );
    }

    if (
      payload.branding.storeTagline !== undefined
    ) {
      tenant.branding.storeTagline = normalizeText(
        payload.branding.storeTagline
      );
    }
  }

  if (payload.storeContact) {
    const currentStoreContact =
      typeof tenant.storeContact?.toObject === "function"
        ? tenant.storeContact.toObject()
        : tenant.storeContact || {};

    tenant.storeContact = {
      ...currentStoreContact,
      ...payload.storeContact,
    };

    if (payload.storeContact.email !== undefined) {
      tenant.storeContact.email = normalizeEmail(
        payload.storeContact.email
      );
    }

    if (payload.storeContact.phone !== undefined) {
      tenant.storeContact.phone = normalizePhone(
        payload.storeContact.phone
      );
    }

    if (payload.storeContact.address !== undefined) {
      tenant.storeContact.address = normalizeText(
        payload.storeContact.address
      );
    }

    if (payload.storeContact.city !== undefined) {
      tenant.storeContact.city = normalizeText(
        payload.storeContact.city
      );
    }

    if (payload.storeContact.country !== undefined) {
      tenant.storeContact.country =
        normalizeText(
          payload.storeContact.country
        ) || "Bangladesh";
    }
  }

  if (payload.setupCompleted !== undefined) {
    tenant.setupCompleted = Boolean(
      payload.setupCompleted
    );
  }

  try {
    await tenant.save();
    return tenant;
  } catch (error) {
    return throwFriendlyDatabaseError(error);
  }
};

/* =====================================================
   UPDATE TENANT STATUS
===================================================== */

const updateTenantStatus = async (tenantId, status) => {
  const normalizedStatus = normalizeText(
    status
  ).toLowerCase();

  if (
    !ALLOWED_TENANT_STATUSES.includes(normalizedStatus)
  ) {
    throw createServiceError(
      "Tenant status must be active, inactive, or suspended"
    );
  }

  const tenant = await findTenantByIdOrFail(tenantId);

  await synchronizeSubscriptionStatus(tenant);

  if (normalizedStatus === "active") {
    const now = new Date();

    const trialEndsAt = tenant.subscription.trialEndsAt
      ? new Date(tenant.subscription.trialEndsAt)
      : null;

    const expiresAt = tenant.subscription.expiresAt
      ? new Date(tenant.subscription.expiresAt)
      : null;

    const trialIsValid =
      tenant.subscription.isTrial &&
      trialEndsAt &&
      trialEndsAt > now;

    const paidSubscriptionIsValid =
      !tenant.subscription.isTrial &&
      expiresAt &&
      expiresAt > now;

    if (!trialIsValid && !paidSubscriptionIsValid) {
      throw createServiceError(
        "Tenant trial or subscription has expired. Renew it before activation.",
        400
      );
    }

    tenant.subscription.status = trialIsValid
      ? "trial"
      : "active";
  }

  if (normalizedStatus === "suspended") {
    tenant.subscription.status = "suspended";
  }

  tenant.status = normalizedStatus;

  await tenant.save();

  await setTenantUsersActiveState(
    tenant._id,
    normalizedStatus === "active"
  );

  return tenant;
};

/* =====================================================
   RENEW SUBSCRIPTION
===================================================== */

const renewSubscription = async (
  tenantId,
  payload = {}
) => {
  const tenant = await findTenantByIdOrFail(tenantId);

  const startsAt = payload.startsAt
    ? new Date(payload.startsAt)
    : new Date();

  if (Number.isNaN(startsAt.getTime())) {
    throw createServiceError(
      "Invalid subscription start date"
    );
  }

  let expiresAt;

  if (payload.expiresAt) {
    expiresAt = new Date(payload.expiresAt);
  } else {
    const durationDays = Number.parseInt(
      payload.durationDays,
      10
    );

    if (
      !Number.isInteger(durationDays) ||
      durationDays < 1
    ) {
      throw createServiceError(
        "Subscription expiry date or valid durationDays is required"
      );
    }

    expiresAt = addDays(startsAt, durationDays);
  }

  if (Number.isNaN(expiresAt.getTime())) {
    throw createServiceError(
      "Invalid subscription expiry date"
    );
  }

  if (expiresAt <= startsAt) {
    throw createServiceError(
      "Subscription expiry date must be after the start date"
    );
  }

  tenant.subscription.plan = DEFAULT_PLAN;
  tenant.subscription.isTrial = false;
  tenant.subscription.trialDays =
    DEFAULT_TRIAL_DAYS;
  tenant.subscription.status = "active";
  tenant.subscription.startsAt = startsAt;
  tenant.subscription.expiresAt = expiresAt;
  tenant.subscription.autoRenew = Boolean(
    payload.autoRenew
  );

  tenant.status = "active";

  await tenant.save();
  await setTenantUsersActiveState(
    tenant._id,
    true
  );

  return tenant;
};

/* =====================================================
   SUSPEND TENANT
===================================================== */

const suspendTenant = async (tenantId) => {
  const tenant = await findTenantByIdOrFail(tenantId);

  tenant.status = "suspended";
  tenant.subscription.status = "suspended";

  await tenant.save();
  await setTenantUsersActiveState(
    tenant._id,
    false
  );

  return tenant;
};

/* =====================================================
   ACTIVATE TENANT
===================================================== */

const activateTenant = async (tenantId) => {
  const tenant = await findTenantByIdOrFail(tenantId);

  await synchronizeSubscriptionStatus(tenant);

  const now = new Date();

  const trialEndsAt = tenant.subscription.trialEndsAt
    ? new Date(tenant.subscription.trialEndsAt)
    : null;

  const expiresAt = tenant.subscription.expiresAt
    ? new Date(tenant.subscription.expiresAt)
    : null;

  if (
    tenant.subscription.isTrial &&
    trialEndsAt &&
    trialEndsAt > now
  ) {
    tenant.subscription.status = "trial";
    tenant.status = "active";
  } else if (
    !tenant.subscription.isTrial &&
    expiresAt &&
    expiresAt > now
  ) {
    tenant.subscription.status = "active";
    tenant.status = "active";
  } else {
    tenant.subscription.status = "expired";
    tenant.status = "suspended";

    await tenant.save();

    throw createServiceError(
      "Tenant trial or subscription has expired. Renew it before activation.",
      400
    );
  }

  await tenant.save();
  await setTenantUsersActiveState(
    tenant._id,
    true
  );

  return tenant;
};

/* =====================================================
   SOFT DELETE TENANT
===================================================== */

const softDeleteTenant = async (tenantId) => {
  const tenant = await findTenantByIdOrFail(tenantId);

  tenant.isDeleted = true;
  tenant.deletedAt = new Date();
  tenant.status = "inactive";
  tenant.subscription.status = "cancelled";

  await tenant.save();
  await setTenantUsersActiveState(
    tenant._id,
    false
  );

  return tenant;
};

/* =====================================================
   GET TENANT BY DOMAIN
===================================================== */

const getTenantByDomain = async (domain) => {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    throw createServiceError(
      "A valid domain is required",
      400
    );
  }

  const tenant = await Tenant.findOne({
    customDomain: normalizedDomain,
    isDeleted: false,
  });

  if (!tenant) {
    throw createServiceError(
      "No tenant was found for this domain",
      404
    );
  }

  await synchronizeSubscriptionStatus(tenant);

  if (tenant.status !== "active") {
    throw createServiceError(
      "This tenant store is currently suspended or unavailable",
      403
    );
  }

  if (
    !["trial", "active"].includes(
      tenant.subscription.status
    )
  ) {
    throw createServiceError(
      "This tenant subscription is not active",
      403
    );
  }

  return tenant;
};

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  updateTenantStatus,
  renewSubscription,
  suspendTenant,
  activateTenant,
  softDeleteTenant,
  getTenantByDomain,
  synchronizeSubscriptionStatus,
  suspendExpiredTenants,
};
