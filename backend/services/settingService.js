"use strict";

const mongoose = require("mongoose");

const TenantSetting = require(
  "../models/tenantSettingModel"
);

/* =========================================================
   CONSTANTS
========================================================= */

const PUBLIC_SETTINGS_SECTIONS =
  Object.freeze([
    "general",
    "branding",
    "orders",
    "inventory",
    "notifications",
    "security",
    "users",
    "billing",
    "integrations",
  ]);

const OWNER_ONLY_SECTION =
  "ownerOnly";

const ALL_SETTINGS_SECTIONS =
  Object.freeze([
    ...PUBLIC_SETTINGS_SECTIONS,
    OWNER_ONLY_SECTION,
  ]);

const TENANT_OWNER_ROLES =
  Object.freeze([
    "tenant_owner",
    "tenant-owner",
    "tenantowner",
    "owner",
  ]);

const FORBIDDEN_UPDATE_FIELDS =
  Object.freeze([
    "_id",
    "id",
    "tenant",
    "tenantId",
    "schemaVersion",
    "audit",
    "isActive",
    "archivedAt",
    "createdAt",
    "updatedAt",
    "__v",
  ]);

const FORBIDDEN_OBJECT_KEYS =
  Object.freeze([
    "__proto__",
    "prototype",
    "constructor",
  ]);

/* =========================================================
   ERROR HELPERS
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code,
  details = null
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  if (details !== null) {
    error.details =
      details;
  }

  return error;
};

const createValidationError = (
  message,
  details = null
) =>
  createHttpError(
    422,
    message,
    "SETTINGS_VALIDATION_FAILED",
    details
  );

const createNotFoundError = (
  message =
    "Tenant settings were not found"
) =>
  createHttpError(
    404,
    message,
    "TENANT_SETTINGS_NOT_FOUND"
  );

const createConflictError = (
  message,
  code =
    "SETTINGS_UPDATE_CONFLICT"
) =>
  createHttpError(
    409,
    message,
    code
  );

/* =========================================================
   GENERAL HELPERS
========================================================= */

const isPlainObject = (
  value
) =>
  Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(
        value
      ) === Object.prototype
  );

const hasOwn = (
  object,
  key
) =>
  Object.prototype
    .hasOwnProperty
    .call(
      object,
      key
    );

const normalizeString = (
  value
) =>
  String(value || "")
    .trim();

const normalizeRole = (
  role
) =>
  normalizeString(role)
    .toLowerCase();

const normalizeSection = (
  section
) =>
  normalizeString(section)
    .replace(
      /[-_\s]+(.)?/g,
      (
        match,
        character
      ) =>
        character
          ? character.toUpperCase()
          : ""
    );

const normalizeObjectId = (
  value,
  fieldName =
    "ObjectId"
) => {
  if (
    value &&
    typeof value ===
      "object"
  ) {
    if (value._id) {
      value =
        value._id;
    } else if (value.id) {
      value =
        value.id;
    }
  }

  const normalizedValue =
    normalizeString(value);

  if (
    !normalizedValue ||
    !mongoose.isValidObjectId(
      normalizedValue
    )
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be a valid MongoDB ObjectId`,
      "INVALID_OBJECT_ID",
      {
        field:
          fieldName,
      }
    );
  }

  return new mongoose.Types.ObjectId(
    normalizedValue
  );
};

const cloneValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    value instanceof Date
  ) {
    return new Date(
      value.getTime()
    );
  }

  if (
    mongoose.isValidObjectId(
      value
    ) &&
    (
      value instanceof
        mongoose.Types.ObjectId ||
      typeof value ===
        "string"
    )
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      cloneValue
    );
  }

  if (
    isPlainObject(value)
  ) {
    const clonedObject =
      {};

    for (
      const [
        key,
        childValue,
      ] of Object.entries(
        value
      )
    ) {
      clonedObject[key] =
        cloneValue(
          childValue
        );
    }

    return clonedObject;
  }

  return value;
};

/* =========================================================
   SECURITY HELPERS
========================================================= */

const assertSafeKey = (
  key,
  path
) => {
  if (
    FORBIDDEN_OBJECT_KEYS.includes(
      key
    ) ||
    key.startsWith("$") ||
    key.includes(".")
  ) {
    throw createValidationError(
      "Unsafe settings property is not allowed",
      {
        field:
          path ||
          key,
      }
    );
  }
};

const assertSafeObject = (
  value,
  path = "settings"
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    Array.isArray(value)
  ) {
    value.forEach(
      (
        item,
        index
      ) => {
        assertSafeObject(
          item,
          `${path}[${index}]`
        );
      }
    );

    return;
  }

  if (
    !isPlainObject(value)
  ) {
    return;
  }

  for (
    const [
      key,
      childValue,
    ] of Object.entries(
      value
    )
  ) {
    const currentPath =
      `${path}.${key}`;

    assertSafeKey(
      key,
      currentPath
    );

    assertSafeObject(
      childValue,
      currentPath
    );
  }
};

const removeForbiddenFields = (
  value
) => {
  if (
    !isPlainObject(value)
  ) {
    return value;
  }

  const sanitized =
    {};

  for (
    const [
      key,
      childValue,
    ] of Object.entries(
      value
    )
  ) {
    if (
      FORBIDDEN_UPDATE_FIELDS.includes(
        key
      )
    ) {
      continue;
    }

    assertSafeKey(
      key,
      key
    );

    if (
      isPlainObject(
        childValue
      )
    ) {
      sanitized[key] =
        removeForbiddenFields(
          childValue
        );
    } else if (
      Array.isArray(
        childValue
      )
    ) {
      sanitized[key] =
        childValue.map(
          (
            item
          ) =>
            isPlainObject(
              item
            )
              ? removeForbiddenFields(
                  item
                )
              : cloneValue(
                  item
                )
        );
    } else {
      sanitized[key] =
        cloneValue(
          childValue
        );
    }
  }

  return sanitized;
};

/* =========================================================
   SECTION HELPERS
========================================================= */

const assertPublicSection = (
  section
) => {
  const normalizedSection =
    normalizeSection(
      section
    );

  if (
    !PUBLIC_SETTINGS_SECTIONS.includes(
      normalizedSection
    )
  ) {
    throw createHttpError(
      400,
      `Invalid settings section: ${section}`,
      "INVALID_SETTINGS_SECTION",
      {
        allowedSections:
          PUBLIC_SETTINGS_SECTIONS,
      }
    );
  }

  return normalizedSection;
};

const assertAnySection = (
  section
) => {
  const normalizedSection =
    normalizeSection(
      section
    );

  if (
    !ALL_SETTINGS_SECTIONS.includes(
      normalizedSection
    )
  ) {
    throw createHttpError(
      400,
      `Invalid settings section: ${section}`,
      "INVALID_SETTINGS_SECTION",
      {
        allowedSections:
          ALL_SETTINGS_SECTIONS,
      }
    );
  }

  return normalizedSection;
};

const assertNonEmptyObject = (
  value,
  fieldName =
    "settings"
) => {
  if (
    !isPlainObject(value)
  ) {
    throw createHttpError(
      400,
      `${fieldName} must be a JSON object`,
      "INVALID_SETTINGS_PAYLOAD",
      {
        field:
          fieldName,
      }
    );
  }

  if (
    Object.keys(value)
      .length === 0
  ) {
    throw createValidationError(
      `${fieldName} update cannot be empty`,
      {
        field:
          fieldName,
      }
    );
  }
};

/* =========================================================
   ROLE AND PERMISSION HELPERS
========================================================= */

const isTenantOwner = ({
  actorRole,
  actorIsTenantOwner =
    false,
} = {}) => {
  if (
    actorIsTenantOwner ===
    true
  ) {
    return true;
  }

  const normalizedRole =
    normalizeRole(
      actorRole
    );

  return TENANT_OWNER_ROLES.includes(
    normalizedRole
  );
};

const assertTenantOwner = (
  actorContext = {}
) => {
  if (
    !isTenantOwner(
      actorContext
    )
  ) {
    throw createHttpError(
      403,
      "Only the Tenant Owner can manage owner-only settings",
      "TENANT_OWNER_REQUIRED"
    );
  }
};

/* =========================================================
   DEEP MERGE

   Existing nested fields remain unchanged when a partial
   nested object is supplied.
========================================================= */

const deepMerge = (
  existingValue,
  incomingValue
) => {
  if (
    incomingValue ===
    undefined
  ) {
    return cloneValue(
      existingValue
    );
  }

  if (
    incomingValue ===
    null
  ) {
    return null;
  }

  if (
    Array.isArray(
      incomingValue
    )
  ) {
    return incomingValue.map(
      cloneValue
    );
  }

  if (
    !isPlainObject(
      incomingValue
    )
  ) {
    return cloneValue(
      incomingValue
    );
  }

  const base =
    isPlainObject(
      existingValue
    )
      ? cloneValue(
          existingValue
        )
      : {};

  for (
    const [
      key,
      incomingChild,
    ] of Object.entries(
      incomingValue
    )
  ) {
    assertSafeKey(
      key,
      key
    );

    const existingChild =
      base[key];

    if (
      isPlainObject(
        incomingChild
      )
    ) {
      base[key] =
        deepMerge(
          existingChild,
          incomingChild
        );
    } else if (
      Array.isArray(
        incomingChild
      )
    ) {
      base[key] =
        incomingChild.map(
          cloneValue
        );
    } else {
      base[key] =
        cloneValue(
          incomingChild
        );
    }
  }

  return base;
};

/* =========================================================
   DOCUMENT CONVERSION HELPERS
========================================================= */

const convertSubdocumentToObject = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value.toObject ===
    "function"
  ) {
    return value.toObject({
      virtuals: false,
      getters: false,
      versionKey: false,
    });
  }

  return cloneValue(
    value
  );
};

const buildPublicSettingsObject = (
  settingsDocument
) => {
  if (!settingsDocument) {
    return null;
  }

  const settings =
    settingsDocument.toObject({
      virtuals: true,
      versionKey: false,
    });

  delete settings.ownerOnly;
  delete settings.__v;

  return settings;
};

const buildOwnerSettingsObject = (
  settingsDocument
) => {
  if (!settingsDocument) {
    return null;
  }

  return settingsDocument.toObject({
    virtuals: true,
    versionKey: false,
  });
};

/* =========================================================
   AUDIT HELPERS
========================================================= */

const normalizeAuditContext = ({
  actorId = null,
  actorRole = "",
  requestId = "",
  section = "",
} = {}) => {
  let normalizedActorId =
    null;

  if (actorId) {
    normalizedActorId =
      normalizeObjectId(
        actorId,
        "actorId"
      );
  }

  return {
    userId:
      normalizedActorId,

    role:
      normalizeRole(
        actorRole
      ),

    section:
      normalizeSection(
        section
      ),

    requestId:
      normalizeString(
        requestId
      ).slice(
        0,
        200
      ),
  };
};

const applyAuditMetadata = (
  settingsDocument,
  auditContext
) => {
  if (
    typeof settingsDocument
      .markUpdated ===
    "function"
  ) {
    settingsDocument.markUpdated(
      auditContext
    );

    return;
  }

  settingsDocument.audit = {
    ...convertSubdocumentToObject(
      settingsDocument.audit
    ),

    lastUpdatedBy:
      auditContext.userId ||
      null,

    lastUpdatedRole:
      auditContext.role,

    lastUpdatedSection:
      auditContext.section,

    lastRequestId:
      auditContext.requestId,

    migrationVersion:
      settingsDocument
        .schemaVersion ||
      1,
  };
};

/* =========================================================
   MONGOOSE ERROR NORMALIZATION
========================================================= */

const normalizeMongooseError = (
  error
) => {
  if (
    error?.name ===
    "VersionError"
  ) {
    return createConflictError(
      "Settings were changed by another request. Reload the latest settings and try again.",
      "SETTINGS_VERSION_CONFLICT"
    );
  }

  if (
    error?.code ===
    11000
  ) {
    return createConflictError(
      "A settings document already exists for this tenant",
      "TENANT_SETTINGS_ALREADY_EXISTS"
    );
  }

  if (
    error?.name ===
    "ValidationError"
  ) {
    const errors =
      Object.values(
        error.errors || {}
      ).map(
        (
          validationError
        ) => ({
          field:
            validationError.path,

          message:
            validationError.message,

          kind:
            validationError.kind,
        })
      );

    return createValidationError(
      "Settings data failed model validation",
      errors
    );
  }

  if (
    error?.name ===
    "CastError"
  ) {
    return createHttpError(
      400,
      `Invalid value for ${error.path}`,
      "INVALID_SETTINGS_VALUE",
      {
        field:
          error.path,

        value:
          error.value,
      }
    );
  }

  return error;
};

/* =========================================================
   SETTINGS DOCUMENT LOADERS
========================================================= */

const findSettingsDocument = async ({
  tenantId,
  includeOwnerOnly =
    false,
  includeInactive =
    false,
  session = null,
} = {}) => {
  const normalizedTenantId =
    normalizeObjectId(
      tenantId,
      "tenantId"
    );

  const queryFilter = {
    tenant:
      normalizedTenantId,
  };

  if (
    includeInactive !==
    true
  ) {
    queryFilter.isActive =
      true;

    queryFilter.archivedAt =
      null;
  }

  const query =
    TenantSetting.findOne(
      queryFilter
    );

  if (
    includeOwnerOnly ===
    true
  ) {
    query.select(
      "+ownerOnly"
    );
  }

  if (session) {
    query.session(
      session
    );
  }

  return query.exec();
};

const createDefaultSettingsDocument =
  async ({
    tenantId,
    session = null,
  } = {}) => {
    const normalizedTenantId =
      normalizeObjectId(
        tenantId,
        "tenantId"
      );

    try {
      const settingsDocument =
        new TenantSetting({
          tenant:
            normalizedTenantId,
        });

      return await settingsDocument.save({
        session:
          session ||
          undefined,
      });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        const existingDocument =
          await findSettingsDocument({
            tenantId:
              normalizedTenantId,
            includeOwnerOnly:
              false,
            includeInactive:
              false,
            session,
          });

        if (
          existingDocument
        ) {
          return existingDocument;
        }
      }

      throw normalizeMongooseError(
        error
      );
    }
  };

const getOrCreateSettingsDocument =
  async ({
    tenantId,
    includeOwnerOnly =
      false,
    session = null,
  } = {}) => {
    const normalizedTenantId =
      normalizeObjectId(
        tenantId,
        "tenantId"
      );

    let settingsDocument =
      await findSettingsDocument({
        tenantId:
          normalizedTenantId,
        includeOwnerOnly,
        includeInactive:
          false,
        session,
      });

    if (
      settingsDocument
    ) {
      return settingsDocument;
    }

    const inactiveDocument =
      await findSettingsDocument({
        tenantId:
          normalizedTenantId,
        includeOwnerOnly:
          true,
        includeInactive:
          true,
        session,
      });

    if (
      inactiveDocument &&
      (
        inactiveDocument
          .isActive === false ||
        inactiveDocument
          .archivedAt
      )
    ) {
      throw createHttpError(
        409,
        "Tenant settings are archived and cannot be recreated automatically",
        "TENANT_SETTINGS_ARCHIVED"
      );
    }

    settingsDocument =
      await createDefaultSettingsDocument({
        tenantId:
          normalizedTenantId,
        session,
      });

    if (
      includeOwnerOnly ===
      true
    ) {
      return findSettingsDocument({
        tenantId:
          normalizedTenantId,
        includeOwnerOnly:
          true,
        includeInactive:
          false,
        session,
      });
    }

    return settingsDocument;
  };

/* =========================================================
   EXPECTED VERSION CHECK

   Mongoose optimisticConcurrency handles concurrent save
   conflicts automatically. This optional check provides an
   earlier and clearer response when the client sends a
   document version.
========================================================= */

const assertExpectedVersion = (
  settingsDocument,
  expectedVersion
) => {
  if (
    expectedVersion ===
      undefined ||
    expectedVersion ===
      null ||
    expectedVersion ===
      ""
  ) {
    return;
  }

  const normalizedVersion =
    Number(
      expectedVersion
    );

  if (
    !Number.isInteger(
      normalizedVersion
    ) ||
    normalizedVersion < 0
  ) {
    throw createHttpError(
      400,
      "Expected settings version must be a non-negative integer",
      "INVALID_SETTINGS_VERSION"
    );
  }

  if (
    settingsDocument.__v !==
    normalizedVersion
  ) {
    throw createConflictError(
      "The settings document has changed since it was loaded",
      "SETTINGS_VERSION_CONFLICT"
    );
  }
};

/* =========================================================
   READ SERVICES
========================================================= */

const getSettings = async ({
  tenantId,
  section = null,
  includeOwnerOnly =
    false,
  actorRole = "",
  actorIsTenantOwner =
    false,
} = {}) => {
  try {
    if (
      includeOwnerOnly ===
      true
    ) {
      assertTenantOwner({
        actorRole,
        actorIsTenantOwner,
      });
    }

    const settingsDocument =
      await getOrCreateSettingsDocument({
        tenantId,
        includeOwnerOnly,
      });

    if (section) {
      const normalizedSection =
        includeOwnerOnly
          ? assertAnySection(
              section
            )
          : assertPublicSection(
              section
            );

      if (
        normalizedSection ===
          OWNER_ONLY_SECTION &&
        includeOwnerOnly !==
          true
      ) {
        throw createHttpError(
          403,
          "Owner-only settings cannot be accessed from this request",
          "OWNER_ONLY_SETTINGS_RESTRICTED"
        );
      }

      return {
        tenant:
          settingsDocument.tenant,

        section:
          normalizedSection,

        settings:
          convertSubdocumentToObject(
            settingsDocument[
              normalizedSection
            ]
          ),

        schemaVersion:
          settingsDocument
            .schemaVersion,

        version:
          settingsDocument.__v,

        updatedAt:
          settingsDocument
            .updatedAt,
      };
    }

    const settings =
      includeOwnerOnly
        ? buildOwnerSettingsObject(
            settingsDocument
          )
        : buildPublicSettingsObject(
            settingsDocument
          );

    settings.version =
      settingsDocument.__v;

    return settings;
  } catch (error) {
    throw normalizeMongooseError(
      error
    );
  }
};

const getSettingsSection =
  async ({
    tenantId,
    section,
  } = {}) =>
    getSettings({
      tenantId,
      section,
      includeOwnerOnly:
        false,
    });

const getOwnerOnlySettings =
  async ({
    tenantId,
    actorRole,
    actorIsTenantOwner =
      false,
  } = {}) =>
    getSettings({
      tenantId,
      section:
        OWNER_ONLY_SECTION,
      includeOwnerOnly:
        true,
      actorRole,
      actorIsTenantOwner,
    });

/* =========================================================
   UPDATE HELPERS
========================================================= */

const setSectionValue = (
  settingsDocument,
  section,
  incomingSection
) => {
  const existingSection =
    convertSubdocumentToObject(
      settingsDocument[
        section
      ]
    ) || {};

  const mergedSection =
    deepMerge(
      existingSection,
      incomingSection
    );

  settingsDocument.set(
    section,
    mergedSection
  );

  settingsDocument.markModified(
    section
  );
};

const saveSettingsDocument =
  async (
    settingsDocument,
    {
      validateModifiedOnly =
        true,
      session = null,
    } = {}
  ) => {
    try {
      return await settingsDocument.save({
        validateModifiedOnly,
        session:
          session ||
          undefined,
      });
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   UPDATE MULTIPLE PUBLIC SECTIONS

   Expected updates:

   {
     general: {},
     branding: {},
     orders: {}
   }
========================================================= */

const updateSettings = async ({
  tenantId,
  updates,
  actorId = null,
  actorRole = "",
  requestId = "",
  expectedVersion = null,
} = {}) => {
  try {
    assertNonEmptyObject(
      updates,
      "settings"
    );

    assertSafeObject(
      updates,
      "settings"
    );

    const sanitizedUpdates =
      removeForbiddenFields(
        updates
      );

    const sections =
      Object.keys(
        sanitizedUpdates
      );

    if (
      sections.length ===
      0
    ) {
      throw createValidationError(
        "At least one settings section must be provided"
      );
    }

    for (
      const section of sections
    ) {
      assertPublicSection(
        section
      );

      assertNonEmptyObject(
        sanitizedUpdates[
          section
        ],
        section
      );
    }

    const settingsDocument =
      await getOrCreateSettingsDocument({
        tenantId,
        includeOwnerOnly:
          false,
      });

    assertExpectedVersion(
      settingsDocument,
      expectedVersion
    );

    for (
      const section of sections
    ) {
      setSectionValue(
        settingsDocument,
        section,
        sanitizedUpdates[
          section
        ]
      );
    }

    const auditSection =
      sections.length === 1
        ? sections[0]
        : "multiple";

    applyAuditMetadata(
      settingsDocument,
      normalizeAuditContext({
        actorId,
        actorRole,
        requestId,
        section:
          auditSection,
      })
    );

    const savedSettings =
      await saveSettingsDocument(
        settingsDocument
      );

    const response =
      buildPublicSettingsObject(
        savedSettings
      );

    response.version =
      savedSettings.__v;

    response.updatedSections =
      sections;

    return response;
  } catch (error) {
    throw normalizeMongooseError(
      error
    );
  }
};

/* =========================================================
   UPDATE SINGLE PUBLIC SECTION
========================================================= */

const updateSettingsSection =
  async ({
    tenantId,
    section,
    updates,
    actorId = null,
    actorRole = "",
    requestId = "",
    expectedVersion = null,
  } = {}) => {
    try {
      const normalizedSection =
        assertPublicSection(
          section
        );

      assertNonEmptyObject(
        updates,
        normalizedSection
      );

      assertSafeObject(
        updates,
        normalizedSection
      );

      const sanitizedUpdates =
        removeForbiddenFields(
          updates
        );

      assertNonEmptyObject(
        sanitizedUpdates,
        normalizedSection
      );

      const settingsDocument =
        await getOrCreateSettingsDocument({
          tenantId,
          includeOwnerOnly:
            false,
        });

      assertExpectedVersion(
        settingsDocument,
        expectedVersion
      );

      setSectionValue(
        settingsDocument,
        normalizedSection,
        sanitizedUpdates
      );

      applyAuditMetadata(
        settingsDocument,
        normalizeAuditContext({
          actorId,
          actorRole,
          requestId,
          section:
            normalizedSection,
        })
      );

      const savedSettings =
        await saveSettingsDocument(
          settingsDocument
        );

      return {
        tenant:
          savedSettings.tenant,

        section:
          normalizedSection,

        settings:
          convertSubdocumentToObject(
            savedSettings[
              normalizedSection
            ]
          ),

        schemaVersion:
          savedSettings
            .schemaVersion,

        version:
          savedSettings.__v,

        updatedAt:
          savedSettings
            .updatedAt,
      };
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   UPDATE OWNER-ONLY SETTINGS

   Route/controller must also apply owner authorization.
   Service-level authorization is repeated as defense in depth.
========================================================= */

const updateOwnerOnlySettings =
  async ({
    tenantId,
    updates,
    actorId = null,
    actorRole = "",
    actorIsTenantOwner =
      false,
    requestId = "",
    expectedVersion = null,
  } = {}) => {
    try {
      assertTenantOwner({
        actorRole,
        actorIsTenantOwner,
      });

      assertNonEmptyObject(
        updates,
        OWNER_ONLY_SECTION
      );

      assertSafeObject(
        updates,
        OWNER_ONLY_SECTION
      );

      const normalizedUpdates =
        isPlainObject(
          updates.ownerOnly
        )
          ? updates.ownerOnly
          : updates;

      const sanitizedUpdates =
        removeForbiddenFields(
          normalizedUpdates
        );

      assertNonEmptyObject(
        sanitizedUpdates,
        OWNER_ONLY_SECTION
      );

      const settingsDocument =
        await getOrCreateSettingsDocument({
          tenantId,
          includeOwnerOnly:
            true,
        });

      if (
        !settingsDocument
      ) {
        throw createNotFoundError();
      }

      assertExpectedVersion(
        settingsDocument,
        expectedVersion
      );

      setSectionValue(
        settingsDocument,
        OWNER_ONLY_SECTION,
        sanitizedUpdates
      );

      applyAuditMetadata(
        settingsDocument,
        normalizeAuditContext({
          actorId,
          actorRole,
          requestId,
          section:
            OWNER_ONLY_SECTION,
        })
      );

      const savedSettings =
        await saveSettingsDocument(
          settingsDocument
        );

      return {
        tenant:
          savedSettings.tenant,

        section:
          OWNER_ONLY_SECTION,

        settings:
          convertSubdocumentToObject(
            savedSettings
              .ownerOnly
          ),

        schemaVersion:
          savedSettings
            .schemaVersion,

        version:
          savedSettings.__v,

        updatedAt:
          savedSettings
            .updatedAt,
      };
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   RESET SINGLE SECTION TO MODEL DEFAULTS

   This is useful for a future reset endpoint. It is included
   in the service but does not become publicly accessible until
   a protected route/controller explicitly uses it.
========================================================= */

const createDefaultSectionValue = (
  section
) => {
  const temporaryDocument =
    new TenantSetting({
      tenant:
        new mongoose.Types.ObjectId(),
    });

  return convertSubdocumentToObject(
    temporaryDocument[
      section
    ]
  );
};

const resetSettingsSection =
  async ({
    tenantId,
    section,
    actorId = null,
    actorRole = "",
    actorIsTenantOwner =
      false,
    requestId = "",
    expectedVersion = null,
  } = {}) => {
    try {
      const normalizedSection =
        assertAnySection(
          section
        );

      if (
        normalizedSection ===
        OWNER_ONLY_SECTION
      ) {
        assertTenantOwner({
          actorRole,
          actorIsTenantOwner,
        });
      }

      const settingsDocument =
        await getOrCreateSettingsDocument({
          tenantId,
          includeOwnerOnly:
            normalizedSection ===
            OWNER_ONLY_SECTION,
        });

      assertExpectedVersion(
        settingsDocument,
        expectedVersion
      );

      const defaultSection =
        createDefaultSectionValue(
          normalizedSection
        );

      settingsDocument.set(
        normalizedSection,
        defaultSection
      );

      settingsDocument.markModified(
        normalizedSection
      );

      applyAuditMetadata(
        settingsDocument,
        normalizeAuditContext({
          actorId,
          actorRole,
          requestId,
          section:
            normalizedSection,
        })
      );

      const savedSettings =
        await saveSettingsDocument(
          settingsDocument,
          {
            validateModifiedOnly:
              false,
          }
        );

      return {
        tenant:
          savedSettings.tenant,

        section:
          normalizedSection,

        settings:
          convertSubdocumentToObject(
            savedSettings[
              normalizedSection
            ]
          ),

        schemaVersion:
          savedSettings
            .schemaVersion,

        version:
          savedSettings.__v,

        updatedAt:
          savedSettings
            .updatedAt,
      };
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   SETTINGS EXISTENCE CHECK
========================================================= */

const tenantSettingsExist =
  async ({
    tenantId,
  } = {}) => {
    try {
      const normalizedTenantId =
        normalizeObjectId(
          tenantId,
          "tenantId"
        );

      return Boolean(
        await TenantSetting.exists({
          tenant:
            normalizedTenantId,
          isActive:
            true,
          archivedAt:
            null,
        })
      );
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   ARCHIVE SETTINGS

   This must only be called from a Tenant deletion or Platform
   administration workflow—not from normal Settings pages.
========================================================= */

const archiveTenantSettings =
  async ({
    tenantId,
    actorId = null,
    actorRole = "",
    actorIsTenantOwner =
      false,
    requestId = "",
  } = {}) => {
    try {
      assertTenantOwner({
        actorRole,
        actorIsTenantOwner,
      });

      const settingsDocument =
        await findSettingsDocument({
          tenantId,
          includeOwnerOnly:
            true,
          includeInactive:
            false,
        });

      if (
        !settingsDocument
      ) {
        throw createNotFoundError();
      }

      settingsDocument.isActive =
        false;

      settingsDocument.archivedAt =
        new Date();

      applyAuditMetadata(
        settingsDocument,
        normalizeAuditContext({
          actorId,
          actorRole,
          requestId,
          section:
            "archive",
        })
      );

      const savedSettings =
        await saveSettingsDocument(
          settingsDocument
        );

      return {
        tenant:
          savedSettings.tenant,

        isActive:
          savedSettings.isActive,

        archivedAt:
          savedSettings.archivedAt,

        version:
          savedSettings.__v,
      };
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   RESTORE ARCHIVED SETTINGS

   This is reserved for an owner/platform administration flow.
========================================================= */

const restoreTenantSettings =
  async ({
    tenantId,
    actorId = null,
    actorRole = "",
    actorIsTenantOwner =
      false,
    requestId = "",
  } = {}) => {
    try {
      assertTenantOwner({
        actorRole,
        actorIsTenantOwner,
      });

      const settingsDocument =
        await findSettingsDocument({
          tenantId,
          includeOwnerOnly:
            true,
          includeInactive:
            true,
        });

      if (
        !settingsDocument
      ) {
        throw createNotFoundError();
      }

      settingsDocument.isActive =
        true;

      settingsDocument.archivedAt =
        null;

      applyAuditMetadata(
        settingsDocument,
        normalizeAuditContext({
          actorId,
          actorRole,
          requestId,
          section:
            "restore",
        })
      );

      const savedSettings =
        await saveSettingsDocument(
          settingsDocument
        );

      const response =
        buildPublicSettingsObject(
          savedSettings
        );

      response.version =
        savedSettings.__v;

      return response;
    } catch (error) {
      throw normalizeMongooseError(
        error
      );
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  PUBLIC_SETTINGS_SECTIONS,
  OWNER_ONLY_SECTION,
  ALL_SETTINGS_SECTIONS,

  getSettings,
  getSettingsSection,
  getOwnerOnlySettings,

  updateSettings,
  updateSettingsSection,
  updateOwnerOnlySettings,

  resetSettingsSection,
  tenantSettingsExist,
  archiveTenantSettings,
  restoreTenantSettings,

  isTenantOwner,
};