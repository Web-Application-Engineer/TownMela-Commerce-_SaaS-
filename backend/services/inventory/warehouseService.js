"use strict";

const mongoose = require("mongoose");

const Warehouse = require(
  "../../models/Warehouse"
);

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const DEFAULT_SORT_FIELD =
  "createdAt";

const DEFAULT_SORT_ORDER =
  "desc";

const ALLOWED_SORT_FIELDS =
  new Set([
    "name",
    "code",
    "warehouseType",
    "status",
    "isDefault",
    "isActive",
    "createdAt",
    "updatedAt",
  ]);

const STATUS_ACTIVE = "Active";
const STATUS_INACTIVE = "Inactive";
const STATUS_MAINTENANCE =
  "Maintenance";
const STATUS_CLOSED = "Closed";

/* =========================================================
   ERROR HELPERS
========================================================= */

const createServiceError = (
  message,
  {
    statusCode = 400,
    code = "WAREHOUSE_SERVICE_ERROR",
    details = null,
  } = {}
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
};

const throwNotFound = (
  warehouseId = null
) => {
  throw createServiceError(
    "Warehouse not found",
    {
      statusCode: 404,
      code: "WAREHOUSE_NOT_FOUND",
      details: warehouseId
        ? {
            warehouseId:
              String(warehouseId),
          }
        : null,
    }
  );
};

const throwInvalidTenant = () => {
  throw createServiceError(
    "Tenant context is required",
    {
      statusCode: 400,
      code: "TENANT_CONTEXT_REQUIRED",
    }
  );
};

const throwInvalidUser = () => {
  throw createServiceError(
    "Authenticated user context is required",
    {
      statusCode: 400,
      code: "USER_CONTEXT_REQUIRED",
    }
  );
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const hasOwn = (
  object,
  key
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    key
  );
};

const normalizeString = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeCode = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(
      /[^A-Z0-9_-]/g,
      ""
    );
};

const normalizeBoolean = (
  value
) => {
  if (
    value === true ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false"
  ) {
    return false;
  }

  return undefined;
};

const normalizePositiveInteger = (
  value,
  fallback,
  maximum = null
) => {
  const parsedValue =
    Number.parseInt(value, 10);

  if (
    !Number.isInteger(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  if (
    maximum !== null &&
    parsedValue > maximum
  ) {
    return maximum;
  }

  return parsedValue;
};

const escapeRegex = (
  value
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const isValidObjectId = (
  value
) => {
  return (
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const toObjectId = (
  value,
  fieldName
) => {
  if (!isValidObjectId(value)) {
    throw createServiceError(
      `${fieldName} must be a valid identifier`,
      {
        statusCode: 400,
        code: "INVALID_OBJECT_ID",
        details: {
          field: fieldName,
          value:
            value === undefined
              ? null
              : String(value),
        },
      }
    );
  }

  return new mongoose.Types.ObjectId(
    value
  );
};

const ensureTenantId = (
  tenantId
) => {
  if (!tenantId) {
    throwInvalidTenant();
  }

  return toObjectId(
    tenantId,
    "tenantId"
  );
};

const ensureUserId = (
  userId
) => {
  if (!userId) {
    throwInvalidUser();
  }

  return toObjectId(
    userId,
    "userId"
  );
};

const normalizeSessionOptions = (
  session
) => {
  return session
    ? { session }
    : {};
};

/* =========================================================
   DATABASE ERROR NORMALIZATION
========================================================= */

const normalizeDatabaseError = (
  error
) => {
  if (
    error &&
    error.code === 11000
  ) {
    const duplicateFields =
      error.keyValue ||
      error.keyPattern ||
      {};

    if (
      hasOwn(
        duplicateFields,
        "code"
      )
    ) {
      throw createServiceError(
        "A warehouse with this code already exists for the tenant",
        {
          statusCode: 409,
          code:
            "WAREHOUSE_CODE_ALREADY_EXISTS",
          details: {
            code:
              duplicateFields.code ||
              null,
          },
        }
      );
    }

    throw createServiceError(
      "Duplicate warehouse record",
      {
        statusCode: 409,
        code:
          "WAREHOUSE_DUPLICATE_RECORD",
        details: duplicateFields,
      }
    );
  }

  if (
    error?.name ===
    "ValidationError"
  ) {
    const fields =
      Object.values(
        error.errors || {}
      ).map(
        (validationError) => ({
          field:
            validationError.path,
          message:
            validationError.message,
        })
      );

    throw createServiceError(
      "Warehouse validation failed",
      {
        statusCode: 400,
        code:
          "WAREHOUSE_VALIDATION_ERROR",
        details: {
          fields,
        },
      }
    );
  }

  if (
    error?.name ===
    "CastError"
  ) {
    throw createServiceError(
      `Invalid value for ${error.path}`,
      {
        statusCode: 400,
        code: "INVALID_FIELD_VALUE",
        details: {
          field: error.path,
          value: error.value,
        },
      }
    );
  }

  throw error;
};

/* =========================================================
   QUERY BUILDER
========================================================= */

const buildWarehouseFilter = ({
  tenantId,
  query = {},
}) => {
  const filter = {
    tenant: ensureTenantId(
      tenantId
    ),
  };

  const includeDeleted =
    normalizeBoolean(
      query.includeDeleted
    );

  if (includeDeleted !== true) {
    filter.isDeleted = false;
  }

  if (
    normalizeString(
      query.search
    )
  ) {
    const searchExpression =
      new RegExp(
        escapeRegex(
          normalizeString(
            query.search
          )
        ),
        "i"
      );

    filter.$or = [
      {
        name:
          searchExpression,
      },
      {
        code:
          searchExpression,
      },
      {
        description:
          searchExpression,
      },
      {
        managerName:
          searchExpression,
      },
      {
        phone:
          searchExpression,
      },
      {
        email:
          searchExpression,
      },
      {
        "address.addressLine1":
          searchExpression,
      },
      {
        "address.area":
          searchExpression,
      },
      {
        "address.city":
          searchExpression,
      },
      {
        "address.district":
          searchExpression,
      },
    ];
  }

  if (
    normalizeString(
      query.code
    )
  ) {
    filter.code =
      normalizeCode(query.code);
  }

  if (
    normalizeString(
      query.warehouseType
    )
  ) {
    filter.warehouseType =
      query.warehouseType;
  }

  if (
    normalizeString(
      query.status
    )
  ) {
    filter.status =
      query.status;
  }

  if (query.manager) {
    filter.manager =
      toObjectId(
        query.manager,
        "manager"
      );
  }

  [
    "isDefault",
    "isActive",
    "allowPurchasing",
    "allowSalesFulfillment",
    "allowTransfers",
    "allowReturns",
  ].forEach((field) => {
    const booleanValue =
      normalizeBoolean(
        query[field]
      );

    if (
      booleanValue !==
      undefined
    ) {
      filter[field] =
        booleanValue;
    }
  });

  return filter;
};

const buildWarehouseSort = (
  query = {}
) => {
  const requestedSortField =
    normalizeString(
      query.sortBy
    );

  const sortField =
    ALLOWED_SORT_FIELDS.has(
      requestedSortField
    )
      ? requestedSortField
      : DEFAULT_SORT_FIELD;

  const sortOrder =
    normalizeString(
      query.sortOrder
    ).toLowerCase() === "asc"
      ? 1
      : -1;

  const sort = {
    [sortField]: sortOrder,
  };

  if (
    sortField !==
    "_id"
  ) {
    sort._id = -1;
  }

  return sort;
};

/* =========================================================
   PAYLOAD NORMALIZATION
========================================================= */

const normalizeWarehousePayload = (
  payload = {}
) => {
  if (!isPlainObject(payload)) {
    throw createServiceError(
      "Warehouse payload must be an object",
      {
        statusCode: 400,
        code:
          "INVALID_WAREHOUSE_PAYLOAD",
      }
    );
  }

  const normalizedPayload = {
    ...payload,
  };

  if (
    hasOwn(
      normalizedPayload,
      "name"
    ) &&
    normalizedPayload.name !== null
  ) {
    normalizedPayload.name =
      normalizeString(
        normalizedPayload.name
      );
  }

  if (
    hasOwn(
      normalizedPayload,
      "code"
    ) &&
    normalizedPayload.code !== null
  ) {
    normalizedPayload.code =
      normalizeCode(
        normalizedPayload.code
      );
  }

  if (
    hasOwn(
      normalizedPayload,
      "email"
    ) &&
    normalizedPayload.email !== null
  ) {
    normalizedPayload.email =
      normalizeString(
        normalizedPayload.email
      ).toLowerCase();
  }

  [
    "description",
    "phone",
    "alternatePhone",
    "managerName",
    "managerPhone",
  ].forEach((field) => {
    if (
      hasOwn(
        normalizedPayload,
        field
      ) &&
      normalizedPayload[field] !==
        null
    ) {
      const normalizedValue =
        normalizeString(
          normalizedPayload[field]
        );

      normalizedPayload[field] =
        normalizedValue || null;
    }
  });

  if (
    isPlainObject(
      normalizedPayload.address
    )
  ) {
    normalizedPayload.address = {
      ...normalizedPayload.address,
    };

    Object.keys(
      normalizedPayload.address
    ).forEach((field) => {
      if (
        typeof normalizedPayload
          .address[field] ===
        "string"
      ) {
        const normalizedValue =
          normalizeString(
            normalizedPayload
              .address[field]
          );

        normalizedPayload.address[
          field
        ] =
          normalizedValue || null;
      }
    });
  }

  if (
    Array.isArray(
      normalizedPayload
        .operatingHours
    )
  ) {
    normalizedPayload.operatingHours =
      normalizedPayload.operatingHours.map(
        (item) => {
          if (!isPlainObject(item)) {
            return item;
          }

          return {
            ...item,
            day:
              normalizeString(
                item.day
              ),
            openingTime:
              normalizeString(
                item.openingTime
              ) || null,
            closingTime:
              normalizeString(
                item.closingTime
              ) || null,
          };
        }
      );
  }

  if (
    isPlainObject(
      normalizedPayload
        .storageConfiguration
    )
  ) {
    normalizedPayload.storageConfiguration =
      {
        ...normalizedPayload
          .storageConfiguration,
      };

    if (
      hasOwn(
        normalizedPayload
          .storageConfiguration,
        "capacityUnit"
      )
    ) {
      const capacityUnit =
        normalizeString(
          normalizedPayload
            .storageConfiguration
            .capacityUnit
        );

      normalizedPayload.storageConfiguration.capacityUnit =
        capacityUnit || null;
    }
  }

  return normalizedPayload;
};

/* =========================================================
   INTERNAL LOOKUP HELPERS
========================================================= */

const findWarehouseDocument = async ({
  tenantId,
  warehouseId,
  includeDeleted = false,
  session = null,
}) => {
  const filter = {
    _id: toObjectId(
      warehouseId,
      "warehouseId"
    ),
    tenant: ensureTenantId(
      tenantId
    ),
  };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  const query =
    Warehouse.findOne(filter);

  if (session) {
    query.session(session);
  }

  const warehouse =
    await query.exec();

  if (!warehouse) {
    throwNotFound(
      warehouseId
    );
  }

  return warehouse;
};

const unsetOtherDefaultWarehouses =
  async ({
    tenantId,
    warehouseId = null,
    userId,
    session = null,
  }) => {
    const filter = {
      tenant: ensureTenantId(
        tenantId
      ),
      isDefault: true,
      isDeleted: false,
    };

    if (warehouseId) {
      filter._id = {
        $ne: toObjectId(
          warehouseId,
          "warehouseId"
        ),
      };
    }

    await Warehouse.updateMany(
      filter,
      {
        $set: {
          isDefault: false,
          updatedBy:
            ensureUserId(
              userId
            ),
        },
      },
      normalizeSessionOptions(
        session
      )
    );
  };

const ensureDefaultWarehouseExists =
  async ({
    tenantId,
    userId,
    session = null,
  }) => {
    const tenantObjectId =
      ensureTenantId(
        tenantId
      );

    const existingDefaultQuery =
      Warehouse.findOne({
        tenant: tenantObjectId,
        isDefault: true,
        isActive: true,
        status: STATUS_ACTIVE,
        isDeleted: false,
      });

    if (session) {
      existingDefaultQuery.session(
        session
      );
    }

    const existingDefault =
      await existingDefaultQuery.exec();

    if (existingDefault) {
      return existingDefault;
    }

    const replacementQuery =
      Warehouse.findOne({
        tenant: tenantObjectId,
        isActive: true,
        status: STATUS_ACTIVE,
        isDeleted: false,
      }).sort({
        createdAt: 1,
      });

    if (session) {
      replacementQuery.session(
        session
      );
    }

    const replacement =
      await replacementQuery.exec();

    if (!replacement) {
      return null;
    }

    replacement.isDefault = true;
    replacement.updatedBy =
      ensureUserId(userId);

    await replacement.save({
      session,
    });

    return replacement;
  };

/* =========================================================
   CREATE WAREHOUSE
========================================================= */

const createWarehouse = async ({
  tenantId,
  userId,
  payload,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const normalizedPayload =
    normalizeWarehousePayload(
      payload
    );

  const session =
    await mongoose.startSession();

  try {
    let createdWarehouse = null;

    await session.withTransaction(
      async () => {
        const duplicateWarehouse =
          await Warehouse.findOne({
            tenant: tenantObjectId,
            code:
              normalizedPayload.code,
            isDeleted: false,
          })
            .session(session)
            .lean();

        if (duplicateWarehouse) {
          throw createServiceError(
            "A warehouse with this code already exists for the tenant",
            {
              statusCode: 409,
              code:
                "WAREHOUSE_CODE_ALREADY_EXISTS",
              details: {
                code:
                  normalizedPayload.code,
              },
            }
          );
        }

        let isDefault =
          normalizeBoolean(
            normalizedPayload.isDefault
          );

        const warehouseCount =
          await Warehouse.countDocuments(
            {
              tenant:
                tenantObjectId,
              isDeleted: false,
            }
          ).session(session);

        /*
         * The first warehouse becomes
         * the default automatically.
         */
        if (warehouseCount === 0) {
          isDefault = true;
        }

        if (isDefault === true) {
          await unsetOtherDefaultWarehouses(
            {
              tenantId:
                tenantObjectId,
              userId:
                userObjectId,
              session,
            }
          );
        }

        const warehouseData = {
          ...normalizedPayload,

          tenant:
            tenantObjectId,

          createdBy:
            userObjectId,

          updatedBy:
            userObjectId,

          isDefault:
            isDefault === true,

          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        };

        if (
          warehouseData.status ===
          STATUS_ACTIVE
        ) {
          warehouseData.isActive =
            true;
        }

        if (
          [
            STATUS_INACTIVE,
            STATUS_CLOSED,
          ].includes(
            warehouseData.status
          )
        ) {
          warehouseData.isActive =
            false;
          warehouseData.isDefault =
            false;
        }

        const createdDocuments =
          await Warehouse.create(
            [warehouseData],
            {
              session,
            }
          );

        createdWarehouse =
          createdDocuments[0];
      }
    );

    return createdWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   LIST WAREHOUSES
========================================================= */

const getWarehouses = async ({
  tenantId,
  query = {},
}) => {
  const page =
    normalizePositiveInteger(
      query.page,
      DEFAULT_PAGE
    );

  const limit =
    normalizePositiveInteger(
      query.limit,
      DEFAULT_LIMIT,
      MAX_LIMIT
    );

  const skip =
    (page - 1) * limit;

  const filter =
    buildWarehouseFilter({
      tenantId,
      query,
    });

  const sort =
    buildWarehouseSort(query);

  const [
    warehouses,
    total,
  ] = await Promise.all([
    Warehouse.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(
        "manager",
        "name email phone role"
      )
      .populate(
        "createdBy",
        "name email"
      )
      .populate(
        "updatedBy",
        "name email"
      )
      .lean({
        virtuals: true,
      }),

    Warehouse.countDocuments(
      filter
    ),
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(total / limit)
    );

  return {
    warehouses,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage:
        page < totalPages,
      hasPreviousPage:
        page > 1,
    },
  };
};

/* =========================================================
   GET SINGLE WAREHOUSE
========================================================= */

const getWarehouseById = async ({
  tenantId,
  warehouseId,
  includeDeleted = false,
}) => {
  const filter = {
    _id: toObjectId(
      warehouseId,
      "warehouseId"
    ),
    tenant: ensureTenantId(
      tenantId
    ),
  };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  const warehouse =
    await Warehouse.findOne(
      filter
    )
      .populate(
        "manager",
        "name email phone role"
      )
      .populate(
        "createdBy",
        "name email"
      )
      .populate(
        "updatedBy",
        "name email"
      )
      .populate(
        "deletedBy",
        "name email"
      )
      .lean({
        virtuals: true,
      });

  if (!warehouse) {
    throwNotFound(
      warehouseId
    );
  }

  return warehouse;
};

/* =========================================================
   GET DEFAULT WAREHOUSE
========================================================= */

const getDefaultWarehouse = async ({
  tenantId,
}) => {
  const warehouse =
    await Warehouse.findOne({
      tenant: ensureTenantId(
        tenantId
      ),
      isDefault: true,
      isActive: true,
      status: STATUS_ACTIVE,
      isDeleted: false,
    })
      .populate(
        "manager",
        "name email phone role"
      )
      .lean({
        virtuals: true,
      });

  return warehouse;
};

/* =========================================================
   GET ACTIVE WAREHOUSES
========================================================= */

const getActiveWarehouses = async ({
  tenantId,
  allowPurchasing,
  allowSalesFulfillment,
  allowTransfers,
  allowReturns,
}) => {
  const filter = {
    tenant: ensureTenantId(
      tenantId
    ),
    isActive: true,
    status: STATUS_ACTIVE,
    isDeleted: false,
  };

  const optionalPermissions = {
    allowPurchasing,
    allowSalesFulfillment,
    allowTransfers,
    allowReturns,
  };

  Object.entries(
    optionalPermissions
  ).forEach(
    ([field, value]) => {
      const booleanValue =
        normalizeBoolean(value);

      if (
        booleanValue !==
        undefined
      ) {
        filter[field] =
          booleanValue;
      }
    }
  );

  return Warehouse.find(filter)
    .sort({
      isDefault: -1,
      name: 1,
    })
    .select(
      "name code warehouseType address isDefault status isActive allowPurchasing allowSalesFulfillment allowTransfers allowReturns"
    )
    .lean({
      virtuals: true,
    });
};

/* =========================================================
   UPDATE WAREHOUSE
========================================================= */

const updateWarehouse = async ({
  tenantId,
  warehouseId,
  userId,
  payload,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const normalizedPayload =
    normalizeWarehousePayload(
      payload
    );

  const session =
    await mongoose.startSession();

  try {
    let updatedWarehouse = null;

    await session.withTransaction(
      async () => {
        const warehouse =
          await findWarehouseDocument({
            tenantId:
              tenantObjectId,
            warehouseId,
            session,
          });

        if (
          normalizedPayload.code &&
          normalizedPayload.code !==
            warehouse.code
        ) {
          const duplicateWarehouse =
            await Warehouse.findOne({
              tenant:
                tenantObjectId,
              code:
                normalizedPayload.code,
              _id: {
                $ne: warehouse._id,
              },
              isDeleted: false,
            })
              .session(session)
              .lean();

          if (duplicateWarehouse) {
            throw createServiceError(
              "A warehouse with this code already exists for the tenant",
              {
                statusCode: 409,
                code:
                  "WAREHOUSE_CODE_ALREADY_EXISTS",
                details: {
                  code:
                    normalizedPayload.code,
                },
              }
            );
          }
        }

        const requestedDefault =
          normalizeBoolean(
            normalizedPayload.isDefault
          );

        if (
          requestedDefault ===
          true
        ) {
          const nextStatus =
            normalizedPayload.status ||
            warehouse.status;

          const nextIsActive =
            hasOwn(
              normalizedPayload,
              "isActive"
            )
              ? normalizeBoolean(
                  normalizedPayload.isActive
                )
              : warehouse.isActive;

          if (
            nextStatus !==
              STATUS_ACTIVE ||
            nextIsActive === false
          ) {
            throw createServiceError(
              "The default warehouse must be active",
              {
                statusCode: 400,
                code:
                  "DEFAULT_WAREHOUSE_MUST_BE_ACTIVE",
              }
            );
          }

          await unsetOtherDefaultWarehouses(
            {
              tenantId:
                tenantObjectId,
              warehouseId:
                warehouse._id,
              userId:
                userObjectId,
              session,
            }
          );
        }

        Object.entries(
          normalizedPayload
        ).forEach(
          ([field, value]) => {
            warehouse[field] =
              value;
          }
        );

        warehouse.updatedBy =
          userObjectId;

        if (
          warehouse.status ===
          STATUS_ACTIVE
        ) {
          warehouse.isActive =
            true;
        }

        if (
          [
            STATUS_INACTIVE,
            STATUS_CLOSED,
          ].includes(
            warehouse.status
          )
        ) {
          warehouse.isActive =
            false;
          warehouse.isDefault =
            false;
        }

        if (
          warehouse.isActive ===
          false
        ) {
          warehouse.isDefault =
            false;
        }

        updatedWarehouse =
          await warehouse.save({
            session,
          });

        if (
          !updatedWarehouse
            .isDefault
        ) {
          await ensureDefaultWarehouseExists(
            {
              tenantId:
                tenantObjectId,
              userId:
                userObjectId,
              session,
            }
          );
        }
      }
    );

    return updatedWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   SET DEFAULT WAREHOUSE
========================================================= */

const setDefaultWarehouse = async ({
  tenantId,
  warehouseId,
  userId,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const session =
    await mongoose.startSession();

  try {
    let updatedWarehouse = null;

    await session.withTransaction(
      async () => {
        const warehouse =
          await findWarehouseDocument({
            tenantId:
              tenantObjectId,
            warehouseId,
            session,
          });

        if (
          warehouse.status !==
            STATUS_ACTIVE ||
          warehouse.isActive !==
            true
        ) {
          throw createServiceError(
            "Only an active warehouse can be set as default",
            {
              statusCode: 400,
              code:
                "WAREHOUSE_NOT_ACTIVE",
            }
          );
        }

        await unsetOtherDefaultWarehouses(
          {
            tenantId:
              tenantObjectId,
            warehouseId:
              warehouse._id,
            userId:
              userObjectId,
            session,
          }
        );

        warehouse.isDefault =
          true;
        warehouse.updatedBy =
          userObjectId;

        updatedWarehouse =
          await warehouse.save({
            session,
          });
      }
    );

    return updatedWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   CHANGE WAREHOUSE STATUS
========================================================= */

const changeWarehouseStatus = async ({
  tenantId,
  warehouseId,
  userId,
  status,
  reason = null,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const session =
    await mongoose.startSession();

  try {
    let updatedWarehouse = null;

    await session.withTransaction(
      async () => {
        const warehouse =
          await findWarehouseDocument({
            tenantId:
              tenantObjectId,
            warehouseId,
            session,
          });

        warehouse.status =
          status;

        warehouse.updatedBy =
          userObjectId;

        if (
          status ===
          STATUS_ACTIVE
        ) {
          warehouse.isActive =
            true;
        }

        if (
          status ===
          STATUS_MAINTENANCE
        ) {
          warehouse.isActive =
            true;
        }

        if (
          [
            STATUS_INACTIVE,
            STATUS_CLOSED,
          ].includes(status)
        ) {
          warehouse.isActive =
            false;
          warehouse.isDefault =
            false;
        }

        /*
         * Optional audit-style reason.
         * The current Warehouse model has
         * no status history field, so it is
         * stored only when the schema later
         * adds statusReason.
         */
        if (
          warehouse.schema.path(
            "statusReason"
          )
        ) {
          warehouse.statusReason =
            normalizeString(reason) ||
            null;
        }

        updatedWarehouse =
          await warehouse.save({
            session,
          });

        if (
          !updatedWarehouse
            .isDefault
        ) {
          await ensureDefaultWarehouseExists(
            {
              tenantId:
                tenantObjectId,
              userId:
                userObjectId,
              session,
            }
          );
        }
      }
    );

    return updatedWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   SOFT DELETE WAREHOUSE
========================================================= */

const deleteWarehouse = async ({
  tenantId,
  warehouseId,
  userId,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const session =
    await mongoose.startSession();

  try {
    let deletedWarehouse = null;

    await session.withTransaction(
      async () => {
        const warehouse =
          await findWarehouseDocument({
            tenantId:
              tenantObjectId,
            warehouseId,
            session,
          });

        const wasDefault =
          warehouse.isDefault;

        warehouse.isDeleted =
          true;
        warehouse.isActive =
          false;
        warehouse.status =
          STATUS_INACTIVE;
        warehouse.isDefault =
          false;

        warehouse.deletedAt =
          new Date();
        warehouse.deletedBy =
          userObjectId;
        warehouse.updatedBy =
          userObjectId;

        deletedWarehouse =
          await warehouse.save({
            session,
          });

        if (wasDefault) {
          await ensureDefaultWarehouseExists(
            {
              tenantId:
                tenantObjectId,
              userId:
                userObjectId,
              session,
            }
          );
        }
      }
    );

    return deletedWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   RESTORE WAREHOUSE
========================================================= */

const restoreWarehouse = async ({
  tenantId,
  warehouseId,
  userId,
  makeDefault = false,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const userObjectId =
    ensureUserId(userId);

  const session =
    await mongoose.startSession();

  try {
    let restoredWarehouse = null;

    await session.withTransaction(
      async () => {
        const warehouse =
          await findWarehouseDocument({
            tenantId:
              tenantObjectId,
            warehouseId,
            includeDeleted: true,
            session,
          });

        if (
          warehouse.isDeleted !==
          true
        ) {
          throw createServiceError(
            "Warehouse is not deleted",
            {
              statusCode: 409,
              code:
                "WAREHOUSE_NOT_DELETED",
            }
          );
        }

        const duplicateWarehouse =
          await Warehouse.findOne({
            tenant:
              tenantObjectId,
            code:
              warehouse.code,
            _id: {
              $ne: warehouse._id,
            },
            isDeleted: false,
          })
            .session(session)
            .lean();

        if (duplicateWarehouse) {
          throw createServiceError(
            "Warehouse cannot be restored because another active record uses the same code",
            {
              statusCode: 409,
              code:
                "WAREHOUSE_CODE_ALREADY_EXISTS",
              details: {
                code:
                  warehouse.code,
              },
            }
          );
        }

        warehouse.isDeleted =
          false;
        warehouse.deletedAt =
          null;
        warehouse.deletedBy =
          null;

        warehouse.status =
          STATUS_ACTIVE;
        warehouse.isActive =
          true;

        warehouse.updatedBy =
          userObjectId;

        const shouldMakeDefault =
          normalizeBoolean(
            makeDefault
          ) === true;

        if (
          shouldMakeDefault
        ) {
          await unsetOtherDefaultWarehouses(
            {
              tenantId:
                tenantObjectId,
              warehouseId:
                warehouse._id,
              userId:
                userObjectId,
              session,
            }
          );

          warehouse.isDefault =
            true;
        } else {
          warehouse.isDefault =
            false;
        }

        restoredWarehouse =
          await warehouse.save({
            session,
          });

        await ensureDefaultWarehouseExists(
          {
            tenantId:
              tenantObjectId,
            userId:
              userObjectId,
            session,
          }
        );
      }
    );

    return restoredWarehouse;
  } catch (error) {
    normalizeDatabaseError(
      error
    );
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   WAREHOUSE CODE AVAILABILITY
========================================================= */

const checkWarehouseCodeAvailability =
  async ({
    tenantId,
    code,
    excludeWarehouseId = null,
  }) => {
    const normalizedCode =
      normalizeCode(code);

    if (!normalizedCode) {
      throw createServiceError(
        "Warehouse code is required",
        {
          statusCode: 400,
          code:
            "WAREHOUSE_CODE_REQUIRED",
        }
      );
    }

    const filter = {
      tenant: ensureTenantId(
        tenantId
      ),
      code: normalizedCode,
      isDeleted: false,
    };

    if (excludeWarehouseId) {
      filter._id = {
        $ne: toObjectId(
          excludeWarehouseId,
          "excludeWarehouseId"
        ),
      };
    }

    const exists =
      await Warehouse.exists(
        filter
      );

    return {
      code: normalizedCode,
      available: !exists,
    };
  };

/* =========================================================
   WAREHOUSE SUMMARY
========================================================= */

const getWarehouseSummary = async ({
  tenantId,
}) => {
  const tenantObjectId =
    ensureTenantId(tenantId);

  const [
    total,
    active,
    inactive,
    maintenance,
    closed,
    purchasingEnabled,
    fulfillmentEnabled,
    defaultWarehouse,
  ] = await Promise.all([
    Warehouse.countDocuments({
      tenant: tenantObjectId,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      status: STATUS_ACTIVE,
      isActive: true,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      status: STATUS_INACTIVE,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      status:
        STATUS_MAINTENANCE,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      status: STATUS_CLOSED,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      allowPurchasing: true,
      isActive: true,
      isDeleted: false,
    }),

    Warehouse.countDocuments({
      tenant: tenantObjectId,
      allowSalesFulfillment:
        true,
      isActive: true,
      isDeleted: false,
    }),

    Warehouse.findOne({
      tenant: tenantObjectId,
      isDefault: true,
      isActive: true,
      status: STATUS_ACTIVE,
      isDeleted: false,
    })
      .select(
        "name code warehouseType"
      )
      .lean(),
  ]);

  return {
    total,
    active,
    inactive,
    maintenance,
    closed,
    purchasingEnabled,
    fulfillmentEnabled,
    defaultWarehouse,
  };
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  getDefaultWarehouse,
  getActiveWarehouses,
  updateWarehouse,
  setDefaultWarehouse,
  changeWarehouseStatus,
  deleteWarehouse,
  restoreWarehouse,
  checkWarehouseCodeAvailability,
  getWarehouseSummary,

  /*
   * Exported for controller tests
   * and future service reuse.
   */
  buildWarehouseFilter,
  buildWarehouseSort,
  normalizeWarehousePayload,
};