"use strict";

const mongoose = require("mongoose");

const SUPPLIER_TYPES = [
  "Local",
  "International",
  "Manufacturer",
  "Distributor",
  "Wholesaler",
  "Other",
];

const SUPPLIER_STATUSES = [
  "Active",
  "Inactive",
  "Blocked",
];

const PAYMENT_TERMS = [
  "Immediate",
  "Advance",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Custom",
];

const MOBILE_BANKING_PROVIDERS = [
  "bKash",
  "Nagad",
  "Rocket",
  "Upay",
  "Other",
];

const ALLOWED_UPDATE_FIELDS = new Set([
  "businessName",
  "displayName",
  "supplierType",
  "contactPerson",
  "designation",
  "phone",
  "alternatePhone",
  "email",
  "website",
  "address",
  "taxIdentificationNumber",
  "businessIdentificationNumber",
  "tradeLicenseNumber",
  "currency",
  "paymentTerm",
  "customPaymentTermDays",
  "creditLimit",
  "bankAccount",
  "mobileBanking",
  "notes",
  "tags",
  "status",
]);

const createValidationError = (
  field,
  message
) => ({
  field,
  message,
});

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const isNonEmptyString = (value) => {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
};

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value).trim()
  );
};

const isValidCurrency = (value) => {
  return /^[A-Za-z]{3}$/.test(
    String(value).trim()
  );
};

const isValidNumber = (value) => {
  return (
    value !== "" &&
    Number.isFinite(Number(value))
  );
};

const validateStringLength = ({
  errors,
  field,
  value,
  maximum,
  required = false,
}) => {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      errors.push(
        createValidationError(
          field,
          `${field} is required`
        )
      );
    }

    return;
  }

  if (typeof value !== "string") {
    errors.push(
      createValidationError(
        field,
        `${field} must be a string`
      )
    );

    return;
  }

  const normalizedValue = value.trim();

  if (
    required &&
    !normalizedValue
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} is required`
      )
    );

    return;
  }

  if (
    normalizedValue.length > maximum
  ) {
    errors.push(
      createValidationError(
        field,
        `${field} cannot exceed ${maximum} characters`
      )
    );
  }
};

const validateAddress = (
  address,
  errors
) => {
  if (address === undefined) {
    return;
  }

  if (!isPlainObject(address)) {
    errors.push(
      createValidationError(
        "address",
        "Address must be an object"
      )
    );

    return;
  }

  const allowedFields = new Set([
    "addressLine1",
    "addressLine2",
    "area",
    "district",
    "division",
    "postalCode",
    "country",
  ]);

  Object.keys(address).forEach(
    (field) => {
      if (!allowedFields.has(field)) {
        errors.push(
          createValidationError(
            `address.${field}`,
            `Unsupported address field: ${field}`
          )
        );
      }
    }
  );

  Object.entries(address).forEach(
    ([field, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== "string"
      ) {
        errors.push(
          createValidationError(
            `address.${field}`,
            `${field} must be a string`
          )
        );
      }
    }
  );
};

const validateBankAccount = (
  bankAccount,
  errors
) => {
  if (bankAccount === undefined) {
    return;
  }

  if (!isPlainObject(bankAccount)) {
    errors.push(
      createValidationError(
        "bankAccount",
        "Bank account must be an object"
      )
    );

    return;
  }

  const allowedFields = new Set([
    "accountName",
    "accountNumber",
    "bankName",
    "branchName",
    "routingNumber",
    "swiftCode",
  ]);

  Object.keys(bankAccount).forEach(
    (field) => {
      if (!allowedFields.has(field)) {
        errors.push(
          createValidationError(
            `bankAccount.${field}`,
            `Unsupported bank account field: ${field}`
          )
        );
      }
    }
  );

  Object.entries(bankAccount).forEach(
    ([field, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== "string"
      ) {
        errors.push(
          createValidationError(
            `bankAccount.${field}`,
            `${field} must be a string`
          )
        );
      }
    }
  );
};

const validateMobileBanking = (
  mobileBanking,
  errors
) => {
  if (mobileBanking === undefined) {
    return;
  }

  if (!isPlainObject(mobileBanking)) {
    errors.push(
      createValidationError(
        "mobileBanking",
        "Mobile banking must be an object"
      )
    );

    return;
  }

  const allowedFields = new Set([
    "provider",
    "accountName",
    "accountNumber",
  ]);

  Object.keys(mobileBanking).forEach(
    (field) => {
      if (!allowedFields.has(field)) {
        errors.push(
          createValidationError(
            `mobileBanking.${field}`,
            `Unsupported mobile banking field: ${field}`
          )
        );
      }
    }
  );

  if (
    mobileBanking.provider !== undefined &&
    mobileBanking.provider !== null &&
    !MOBILE_BANKING_PROVIDERS.includes(
      mobileBanking.provider
    )
  ) {
    errors.push(
      createValidationError(
        "mobileBanking.provider",
        "Invalid mobile banking provider"
      )
    );
  }

  if (
    mobileBanking.accountName !== undefined &&
    mobileBanking.accountName !== null &&
    typeof mobileBanking.accountName !==
      "string"
  ) {
    errors.push(
      createValidationError(
        "mobileBanking.accountName",
        "Mobile banking account name must be a string"
      )
    );
  }

  if (
    mobileBanking.accountNumber !== undefined &&
    mobileBanking.accountNumber !== null &&
    typeof mobileBanking.accountNumber !==
      "string"
  ) {
    errors.push(
      createValidationError(
        "mobileBanking.accountNumber",
        "Mobile banking account number must be a string"
      )
    );
  }
};

const validateTags = (
  tags,
  errors
) => {
  if (tags === undefined) {
    return;
  }

  if (!Array.isArray(tags)) {
    errors.push(
      createValidationError(
        "tags",
        "Tags must be an array"
      )
    );

    return;
  }

  if (tags.length > 50) {
    errors.push(
      createValidationError(
        "tags",
        "A supplier cannot have more than 50 tags"
      )
    );
  }

  tags.forEach((tag, index) => {
    if (
      typeof tag !== "string" ||
      !tag.trim()
    ) {
      errors.push(
        createValidationError(
          `tags.${index}`,
          "Each tag must be a non-empty string"
        )
      );

      return;
    }

    if (tag.trim().length > 50) {
      errors.push(
        createValidationError(
          `tags.${index}`,
          "Each tag cannot exceed 50 characters"
        )
      );
    }
  });
};

const validateSupplierPayload = ({
  payload,
  isUpdate = false,
}) => {
  const errors = [];

  if (!isPlainObject(payload)) {
    return [
      createValidationError(
        "body",
        "A valid request body is required"
      ),
    ];
  }

  const forbiddenFields = [
    "tenant",
    "tenantId",
    "createdBy",
    "updatedBy",
    "deletedBy",
    "deletedAt",
    "isDeleted",
    "currentBalance",
    "totalPurchaseAmount",
    "totalPaidAmount",
    "totalReturnAmount",
  ];

  forbiddenFields.forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        field
      )
    ) {
      errors.push(
        createValidationError(
          field,
          `${field} cannot be provided by the client`
        )
      );
    }
  });

  if (isUpdate) {
    Object.keys(payload).forEach(
      (field) => {
        if (
          !ALLOWED_UPDATE_FIELDS.has(field)
        ) {
          errors.push(
            createValidationError(
              field,
              `Unsupported supplier update field: ${field}`
            )
          );
        }
      }
    );

    if (!Object.keys(payload).length) {
      errors.push(
        createValidationError(
          "body",
          "At least one update field is required"
        )
      );
    }
  }

  validateStringLength({
    errors,
    field: "businessName",
    value: payload.businessName,
    maximum: 180,
    required: !isUpdate,
  });

  validateStringLength({
    errors,
    field: "displayName",
    value: payload.displayName,
    maximum: 180,
  });

  validateStringLength({
    errors,
    field: "contactPerson",
    value: payload.contactPerson,
    maximum: 120,
  });

  validateStringLength({
    errors,
    field: "designation",
    value: payload.designation,
    maximum: 100,
  });

  validateStringLength({
    errors,
    field: "phone",
    value: payload.phone,
    maximum: 30,
    required: !isUpdate,
  });

  validateStringLength({
    errors,
    field: "alternatePhone",
    value: payload.alternatePhone,
    maximum: 30,
  });

  validateStringLength({
    errors,
    field: "website",
    value: payload.website,
    maximum: 300,
  });

  validateStringLength({
    errors,
    field: "notes",
    value: payload.notes,
    maximum: 2000,
  });

  if (
    payload.email !== undefined &&
    payload.email !== null &&
    payload.email !== ""
  ) {
    if (
      typeof payload.email !== "string" ||
      !isValidEmail(payload.email)
    ) {
      errors.push(
        createValidationError(
          "email",
          "A valid supplier email is required"
        )
      );
    }
  }

  if (
    payload.supplierType !== undefined &&
    !SUPPLIER_TYPES.includes(
      payload.supplierType
    )
  ) {
    errors.push(
      createValidationError(
        "supplierType",
        "Invalid supplier type"
      )
    );
  }

  if (
    payload.status !== undefined &&
    !SUPPLIER_STATUSES.includes(
      payload.status
    )
  ) {
    errors.push(
      createValidationError(
        "status",
        "Invalid supplier status"
      )
    );
  }

  if (
    payload.paymentTerm !== undefined &&
    !PAYMENT_TERMS.includes(
      payload.paymentTerm
    )
  ) {
    errors.push(
      createValidationError(
        "paymentTerm",
        "Invalid payment term"
      )
    );
  }

  if (
    payload.currency !== undefined &&
    !isValidCurrency(payload.currency)
  ) {
    errors.push(
      createValidationError(
        "currency",
        "Currency must be a valid 3-letter code"
      )
    );
  }

  if (
    payload.creditLimit !== undefined
  ) {
    if (
      !isValidNumber(
        payload.creditLimit
      ) ||
      Number(payload.creditLimit) < 0
    ) {
      errors.push(
        createValidationError(
          "creditLimit",
          "Credit limit must be zero or a positive number"
        )
      );
    }
  }

  if (
    !isUpdate &&
    payload.openingBalance !== undefined &&
    !isValidNumber(
      payload.openingBalance
    )
  ) {
    errors.push(
      createValidationError(
        "openingBalance",
        "Opening balance must be a valid number"
      )
    );
  }

  if (
    isUpdate &&
    payload.openingBalance !== undefined
  ) {
    errors.push(
      createValidationError(
        "openingBalance",
        "Opening balance cannot be changed from the supplier update endpoint"
      )
    );
  }

  const effectivePaymentTerm =
    payload.paymentTerm;

  if (
    effectivePaymentTerm === "Custom"
  ) {
    if (
      !isValidNumber(
        payload.customPaymentTermDays
      ) ||
      Number(
        payload.customPaymentTermDays
      ) < 0 ||
      Number(
        payload.customPaymentTermDays
      ) > 3650
    ) {
      errors.push(
        createValidationError(
          "customPaymentTermDays",
          "Custom payment term days must be between 0 and 3650"
        )
      );
    }
  }

  if (
    payload.customPaymentTermDays !==
      undefined &&
    payload.paymentTerm !== "Custom" &&
    !isUpdate
  ) {
    errors.push(
      createValidationError(
        "customPaymentTermDays",
        "Custom payment term days require paymentTerm to be Custom"
      )
    );
  }

  validateAddress(
    payload.address,
    errors
  );

  validateBankAccount(
    payload.bankAccount,
    errors
  );

  validateMobileBanking(
    payload.mobileBanking,
    errors
  );

  validateTags(
    payload.tags,
    errors
  );

  return errors;
};

const sendValidationErrors = (
  req,
  res,
  errors
) => {
  return res.status(400).json({
    success: false,
    code: "VALIDATION_ERROR",
    message:
      "Supplier request validation failed",
    errors,
    requestId: req.requestId,
  });
};

const validateCreateSupplier = (
  req,
  res,
  next
) => {
  const errors =
    validateSupplierPayload({
      payload: req.body,
      isUpdate: false,
    });

  if (errors.length) {
    return sendValidationErrors(
      req,
      res,
      errors
    );
  }

  return next();
};

const validateUpdateSupplier = (
  req,
  res,
  next
) => {
  const errors =
    validateSupplierPayload({
      payload: req.body,
      isUpdate: true,
    });

  if (errors.length) {
    return sendValidationErrors(
      req,
      res,
      errors
    );
  }

  return next();
};

const validateSupplierId = (
  req,
  res,
  next
) => {
  const { supplierId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(
      supplierId
    )
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_SUPPLIER_ID",
      message:
        "Invalid supplier identifier",
      requestId: req.requestId,
    });
  }

  return next();
};

module.exports = {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateSupplierId,
};