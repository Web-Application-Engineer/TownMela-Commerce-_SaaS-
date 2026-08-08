"use strict";

const mongoose = require("mongoose");

const Supplier = require("../../models/Supplier");

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =========================================================
   ERROR HELPER
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

/* =========================================================
   NORMALIZERS
========================================================= */

const normalizeOptionalString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue || null;
};

const normalizeRequiredString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizePhone = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/[\s\-()]/g, "");
};

const normalizeEmail = (value) => {
  const normalizedValue =
    normalizeOptionalString(value);

  return normalizedValue
    ? normalizedValue.toLowerCase()
    : null;
};

const normalizeSupplierCode = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "");

  return cleanValue || null;
};

const normalizePositiveNumber = (
  value,
  defaultValue = 0
) => {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return defaultValue;
  }

  return parsedValue;
};

const normalizeSignedNumber = (
  value,
  defaultValue = 0
) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return defaultValue;
  }

  return parsedValue;
};

const escapeRegExp = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

/* =========================================================
   VALIDATION HELPERS
========================================================= */

const validateObjectId = (
  value,
  fieldName
) => {
  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    throw createHttpError(
      400,
      `Invalid ${fieldName}`,
      "INVALID_OBJECT_ID"
    );
  }

  return new mongoose.Types.ObjectId(value);
};

const validateTenantId = (tenantId) => {
  return validateObjectId(
    tenantId,
    "tenant context"
  );
};

const validateUserId = (userId) => {
  return validateObjectId(
    userId,
    "user context"
  );
};

const validateSupplierId = (supplierId) => {
  return validateObjectId(
    supplierId,
    "supplier ID"
  );
};

/* =========================================================
   SUPPLIER CODE GENERATION

   Example:
   SUP-000001
========================================================= */

const generateSupplierCode = async ({
  tenantId,
  session = null,
}) => {
  const validTenantId =
    validateTenantId(tenantId);

  /*
    সর্বশেষ supplierCode দেখে পরবর্তী serial তৈরি করা হচ্ছে।

    Unique compound index final protection দেবে:
    tenant + supplierCode
  */

  const latestSupplier =
    await Supplier.findOne({
      tenant: validTenantId,

      supplierCode: {
        $regex: /^SUP-\d{6}$/,
      },
    })
      .sort({
        supplierCode: -1,
      })
      .select({
        supplierCode: 1,
      })
      .session(session)
      .lean();

  let nextSerial = 1;

  if (latestSupplier?.supplierCode) {
    const currentSerial = Number(
      latestSupplier.supplierCode.replace(
        "SUP-",
        ""
      )
    );

    if (
      Number.isInteger(currentSerial) &&
      currentSerial >= 1
    ) {
      nextSerial = currentSerial + 1;
    }
  }

  /*
    Concurrent request-এর জন্য কয়েকটি candidate চেষ্টা করা হবে।
  */

  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const candidateSerial =
      nextSerial + attempt;

    const supplierCode =
      `SUP-${String(candidateSerial).padStart(
        6,
        "0"
      )}`;

    const exists =
      await Supplier.exists({
        tenant: validTenantId,
        supplierCode,
      }).session(session);

    if (!exists) {
      return supplierCode;
    }
  }

  throw createHttpError(
    500,
    "Could not generate a unique supplier code",
    "SUPPLIER_CODE_GENERATION_FAILED"
  );
};

/* =========================================================
   DUPLICATE CHECK
========================================================= */

const checkDuplicateSupplier = async ({
  tenantId,
  businessName,
  phone,
  email = null,
  excludeSupplierId = null,
  session = null,
}) => {
  const validTenantId =
    validateTenantId(tenantId);

  const normalizedBusinessName =
    normalizeRequiredString(businessName);

  const normalizedPhone =
    normalizePhone(phone);

  const normalizedEmail =
    normalizeEmail(email);

  const duplicateConditions = [];

  if (normalizedPhone) {
    duplicateConditions.push({
      phone: normalizedPhone,
    });
  }

  if (normalizedEmail) {
    duplicateConditions.push({
      email: normalizedEmail,
    });
  }

  if (normalizedBusinessName) {
    duplicateConditions.push({
      businessName: {
        $regex: `^${escapeRegExp(
          normalizedBusinessName
        )}$`,
        $options: "i",
      },
    });
  }

  if (!duplicateConditions.length) {
    return null;
  }

  const query = {
    tenant: validTenantId,
    isDeleted: false,
    $or: duplicateConditions,
  };

  if (excludeSupplierId) {
    query._id = {
      $ne: validateSupplierId(
        excludeSupplierId
      ),
    };
  }

  return Supplier.findOne(query)
    .select({
      supplierCode: 1,
      businessName: 1,
      phone: 1,
      email: 1,
    })
    .session(session)
    .lean();
};

/* =========================================================
   CREATE SUPPLIER
========================================================= */

const createSupplier = async ({
  tenantId,
  userId,
  payload,
  session = null,
}) => {
  const validTenantId =
    validateTenantId(tenantId);

  const validUserId =
    validateUserId(userId);

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw createHttpError(
      400,
      "Supplier information is required",
      "SUPPLIER_PAYLOAD_REQUIRED"
    );
  }

  const businessName =
    normalizeRequiredString(
      payload.businessName
    );

  const phone = normalizePhone(
    payload.phone
  );

  const email = normalizeEmail(
    payload.email
  );

  if (!businessName) {
    throw createHttpError(
      400,
      "Supplier business name is required",
      "SUPPLIER_BUSINESS_NAME_REQUIRED"
    );
  }

  if (!phone) {
    throw createHttpError(
      400,
      "Supplier phone number is required",
      "SUPPLIER_PHONE_REQUIRED"
    );
  }

  const duplicateSupplier =
    await checkDuplicateSupplier({
      tenantId: validTenantId,
      businessName,
      phone,
      email,
      session,
    });

  if (duplicateSupplier) {
    throw createHttpError(
      409,
      "A supplier with the same business name, phone or email already exists",
      "SUPPLIER_DUPLICATE"
    );
  }

  let supplierCode =
    normalizeSupplierCode(
      payload.supplierCode
    );

  /*
    Client custom code পাঠাতে পারবে, কিন্তু tenant কখনো পাঠাতে পারবে না।
    Code না থাকলে server generate করবে।
  */

  if (!supplierCode) {
    supplierCode =
      await generateSupplierCode({
        tenantId: validTenantId,
        session,
      });
  }

  const codeExists =
    await Supplier.exists({
      tenant: validTenantId,
      supplierCode,
    }).session(session);

  if (codeExists) {
    throw createHttpError(
      409,
      "Supplier code already exists",
      "SUPPLIER_CODE_EXISTS"
    );
  }

  const openingBalance =
    normalizeSignedNumber(
      payload.openingBalance,
      0
    );

  const supplier = new Supplier({
    tenant: validTenantId,
    supplierCode,

    businessName,

    displayName:
      normalizeOptionalString(
        payload.displayName
      ) || businessName,

    supplierType:
      payload.supplierType || "Local",

    contactPerson:
      normalizeOptionalString(
        payload.contactPerson
      ),

    designation:
      normalizeOptionalString(
        payload.designation
      ),

    phone,

    alternatePhone:
      normalizeOptionalString(
        payload.alternatePhone
      ),

    email,

    website:
      normalizeOptionalString(
        payload.website
      ),

    address: {
      addressLine1:
        normalizeOptionalString(
          payload.address?.addressLine1
        ),

      addressLine2:
        normalizeOptionalString(
          payload.address?.addressLine2
        ),

      area:
        normalizeOptionalString(
          payload.address?.area
        ),

      district:
        normalizeOptionalString(
          payload.address?.district
        ),

      division:
        normalizeOptionalString(
          payload.address?.division
        ),

      postalCode:
        normalizeOptionalString(
          payload.address?.postalCode
        ),

      country:
        normalizeOptionalString(
          payload.address?.country
        ) || "Bangladesh",
    },

    taxIdentificationNumber:
      normalizeOptionalString(
        payload.taxIdentificationNumber
      ),

    businessIdentificationNumber:
      normalizeOptionalString(
        payload.businessIdentificationNumber
      ),

    tradeLicenseNumber:
      normalizeOptionalString(
        payload.tradeLicenseNumber
      ),

    currency:
      payload.currency || "BDT",

    paymentTerm:
      payload.paymentTerm ||
      "Immediate",

    customPaymentTermDays:
      payload.paymentTerm === "Custom"
        ? normalizePositiveNumber(
            payload.customPaymentTermDays,
            null
          )
        : null,

    creditLimit:
      normalizePositiveNumber(
        payload.creditLimit,
        0
      ),

    openingBalance,

    /*
      Supplier Ledger চালু হওয়ার আগে opening balance
      cached balance হিসেবে initialize করা হচ্ছে।
    */

    currentBalance: openingBalance,

    bankAccount: {
      accountName:
        normalizeOptionalString(
          payload.bankAccount?.accountName
        ),

      accountNumber:
        normalizeOptionalString(
          payload.bankAccount?.accountNumber
        ),

      bankName:
        normalizeOptionalString(
          payload.bankAccount?.bankName
        ),

      branchName:
        normalizeOptionalString(
          payload.bankAccount?.branchName
        ),

      routingNumber:
        normalizeOptionalString(
          payload.bankAccount?.routingNumber
        ),

      swiftCode:
        normalizeOptionalString(
          payload.bankAccount?.swiftCode
        ),
    },

    mobileBanking: {
      provider:
        payload.mobileBanking?.provider ||
        null,

      accountName:
        normalizeOptionalString(
          payload.mobileBanking?.accountName
        ),

      accountNumber:
        normalizeOptionalString(
          payload.mobileBanking?.accountNumber
        ),
    },

    notes:
      normalizeOptionalString(
        payload.notes
      ),

    tags: Array.isArray(payload.tags)
      ? payload.tags
      : [],

    status:
      payload.status || "Active",

    createdBy: validUserId,
  });

  await supplier.save({
    session,
  });

  return supplier;
};

/* =========================================================
   GET SUPPLIERS
========================================================= */

const getSuppliers = async ({
  tenantId,
  queryParams = {},
}) => {
  const validTenantId =
    validateTenantId(tenantId);

  const page = Math.max(
    Number(queryParams.page) ||
      DEFAULT_PAGE,
    1
  );

  const limit = Math.min(
    Math.max(
      Number(queryParams.limit) ||
        DEFAULT_LIMIT,
      1
    ),
    MAX_LIMIT
  );

  const skip = (page - 1) * limit;

  const query = {
    tenant: validTenantId,
    isDeleted: false,
  };

  const status =
    normalizeOptionalString(
      queryParams.status
    );

  if (status) {
    const allowedStatuses =
      Supplier.SUPPLIER_STATUSES || [
        "Active",
        "Inactive",
        "Blocked",
      ];

    if (!allowedStatuses.includes(status)) {
      throw createHttpError(
        400,
        "Invalid supplier status",
        "INVALID_SUPPLIER_STATUS"
      );
    }

    query.status = status;
  }

  const supplierType =
    normalizeOptionalString(
      queryParams.supplierType
    );

  if (supplierType) {
    query.supplierType = supplierType;
  }

  const search =
    normalizeOptionalString(
      queryParams.search
    );

  if (search) {
    const safeSearch =
      escapeRegExp(search);

    query.$or = [
      {
        supplierCode: {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        businessName: {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        displayName: {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        contactPerson: {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        phone: {
          $regex: safeSearch,
          $options: "i",
        },
      },

      {
        email: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  const sortBy =
    [
      "createdAt",
      "updatedAt",
      "businessName",
      "supplierCode",
      "currentBalance",
    ].includes(queryParams.sortBy)
      ? queryParams.sortBy
      : "createdAt";

  const sortOrder =
    String(queryParams.sortOrder)
      .toLowerCase() === "asc"
      ? 1
      : -1;

  const [suppliers, totalSuppliers] =
    await Promise.all([
      Supplier.find(query)
        .sort({
          [sortBy]: sortOrder,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Supplier.countDocuments(query),
    ]);

  return {
    suppliers,
    pagination: {
      page,
      limit,
      totalSuppliers,

      totalPages: Math.ceil(
        totalSuppliers / limit
      ),

      hasNextPage:
        page * limit <
        totalSuppliers,

      hasPreviousPage:
        page > 1,
    },
  };
};

/* =========================================================
   GET SINGLE SUPPLIER
========================================================= */

const getSupplierById = async ({
  tenantId,
  supplierId,
  includeDeleted = false,
  session = null,
}) => {
  const validTenantId =
    validateTenantId(tenantId);

  const validSupplierId =
    validateSupplierId(supplierId);

  const query = {
    _id: validSupplierId,
    tenant: validTenantId,
  };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const supplier =
    await Supplier.findOne(query)
      .session(session);

  if (!supplier) {
    throw createHttpError(
      404,
      "Supplier not found",
      "SUPPLIER_NOT_FOUND"
    );
  }

  return supplier;
};

/* =========================================================
   UPDATE SUPPLIER
========================================================= */

const updateSupplier = async ({
  tenantId,
  supplierId,
  userId,
  payload,
  session = null,
}) => {
  const validUserId =
    validateUserId(userId);

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw createHttpError(
      400,
      "Supplier update information is required",
      "SUPPLIER_UPDATE_PAYLOAD_REQUIRED"
    );
  }

  const supplier =
    await getSupplierById({
      tenantId,
      supplierId,
      session,
    });

  const businessName =
    payload.businessName !== undefined
      ? normalizeRequiredString(
          payload.businessName
        )
      : supplier.businessName;

  const phone =
    payload.phone !== undefined
      ? normalizePhone(payload.phone)
      : supplier.phone;

  const email =
    payload.email !== undefined
      ? normalizeEmail(payload.email)
      : supplier.email;

  if (!businessName) {
    throw createHttpError(
      400,
      "Supplier business name is required",
      "SUPPLIER_BUSINESS_NAME_REQUIRED"
    );
  }

  if (!phone) {
    throw createHttpError(
      400,
      "Supplier phone number is required",
      "SUPPLIER_PHONE_REQUIRED"
    );
  }

  const duplicateSupplier =
    await checkDuplicateSupplier({
      tenantId,
      businessName,
      phone,
      email,
      excludeSupplierId:
        supplier._id,
      session,
    });

  if (duplicateSupplier) {
    throw createHttpError(
      409,
      "Another supplier with the same business name, phone or email already exists",
      "SUPPLIER_DUPLICATE"
    );
  }

  /*
    tenant, supplierCode, financial summary এবং audit creation
    fields এই update service থেকে পরিবর্তন করা যাবে না।
  */

  supplier.businessName =
    businessName;

  supplier.phone = phone;
  supplier.email = email;

  if (
    payload.displayName !== undefined
  ) {
    supplier.displayName =
      normalizeOptionalString(
        payload.displayName
      ) || businessName;
  }

  if (
    payload.supplierType !== undefined
  ) {
    supplier.supplierType =
      payload.supplierType;
  }

  if (
    payload.contactPerson !== undefined
  ) {
    supplier.contactPerson =
      normalizeOptionalString(
        payload.contactPerson
      );
  }

  if (
    payload.designation !== undefined
  ) {
    supplier.designation =
      normalizeOptionalString(
        payload.designation
      );
  }

  if (
    payload.alternatePhone !==
    undefined
  ) {
    supplier.alternatePhone =
      normalizeOptionalString(
        payload.alternatePhone
      );
  }

  if (payload.website !== undefined) {
    supplier.website =
      normalizeOptionalString(
        payload.website
      );
  }

  if (payload.address !== undefined) {
    supplier.address = {
      ...supplier.address?.toObject?.(),
      ...payload.address,
    };
  }

  if (
    payload.taxIdentificationNumber !==
    undefined
  ) {
    supplier.taxIdentificationNumber =
      normalizeOptionalString(
        payload.taxIdentificationNumber
      );
  }

  if (
    payload.businessIdentificationNumber !==
    undefined
  ) {
    supplier.businessIdentificationNumber =
      normalizeOptionalString(
        payload.businessIdentificationNumber
      );
  }

  if (
    payload.tradeLicenseNumber !==
    undefined
  ) {
    supplier.tradeLicenseNumber =
      normalizeOptionalString(
        payload.tradeLicenseNumber
      );
  }

  if (payload.currency !== undefined) {
    supplier.currency =
      payload.currency;
  }

  if (
    payload.paymentTerm !== undefined
  ) {
    supplier.paymentTerm =
      payload.paymentTerm;
  }

  if (
    payload.customPaymentTermDays !==
    undefined
  ) {
    supplier.customPaymentTermDays =
      payload.customPaymentTermDays;
  }

  if (
    payload.creditLimit !== undefined
  ) {
    supplier.creditLimit =
      normalizePositiveNumber(
        payload.creditLimit,
        0
      );
  }

  if (
    payload.bankAccount !== undefined
  ) {
    supplier.bankAccount = {
      ...supplier.bankAccount?.toObject?.(),
      ...payload.bankAccount,
    };
  }

  if (
    payload.mobileBanking !== undefined
  ) {
    supplier.mobileBanking = {
      ...supplier.mobileBanking?.toObject?.(),
      ...payload.mobileBanking,
    };
  }

  if (payload.notes !== undefined) {
    supplier.notes =
      normalizeOptionalString(
        payload.notes
      );
  }

  if (payload.tags !== undefined) {
    supplier.tags =
      Array.isArray(payload.tags)
        ? payload.tags
        : [];
  }

  if (payload.status !== undefined) {
    supplier.status =
      payload.status;
  }

  supplier.updatedBy =
    validUserId;

  await supplier.save({
    session,
  });

  return supplier;
};

/* =========================================================
   SOFT DELETE SUPPLIER
========================================================= */

const deleteSupplier = async ({
  tenantId,
  supplierId,
  userId,
  session = null,
}) => {
  const validUserId =
    validateUserId(userId);

  const supplier =
    await getSupplierById({
      tenantId,
      supplierId,
      session,
    });

  /*
    Purchase Order চালু হলে এখানে active purchase dependency
    validation যোগ করা হবে।
  */

  await supplier.softDelete({
    userId: validUserId,
    session,
  });

  return supplier;
};

/* =========================================================
   RESTORE SUPPLIER
========================================================= */

const restoreSupplier = async ({
  tenantId,
  supplierId,
  userId,
  session = null,
}) => {
  const validUserId =
    validateUserId(userId);

  const supplier =
    await getSupplierById({
      tenantId,
      supplierId,
      includeDeleted: true,
      session,
    });

  if (!supplier.isDeleted) {
    throw createHttpError(
      400,
      "Supplier is not deleted",
      "SUPPLIER_NOT_DELETED"
    );
  }

  supplier.isDeleted = false;
  supplier.deletedAt = null;
  supplier.deletedBy = null;
  supplier.status = "Active";
  supplier.updatedBy = validUserId;

  await supplier.save({
    session,
  });

  return supplier;
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  createHttpError,

  generateSupplierCode,
  checkDuplicateSupplier,

  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
};