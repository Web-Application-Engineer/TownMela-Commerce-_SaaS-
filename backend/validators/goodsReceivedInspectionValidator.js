"use strict";

const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const QUALITY_GRADES = [
  "Not Graded",
  "A",
  "B",
  "C",
  "Rejected",
];

const MAX_REMARK_LENGTH = 2000;
const MAX_REASON_LENGTH = 2000;
const QUANTITY_DECIMAL_PLACES = 4;

/* =========================================================
   ERROR HELPERS
========================================================= */

const createValidationError = (
  field,
  message,
  value = undefined
) => {
  const error = {
    field,
    message,
  };

  if (value !== undefined) {
    error.value = value;
  }

  return error;
};

const sendValidationError = (
  res,
  errors
) => {
  return res.status(400).json({
    success: false,
    message:
      "Inspection validation failed",
    code:
      "GOODS_RECEIVED_INSPECTION_VALIDATION_FAILED",
    errors,
  });
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

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

const isValidObjectId = (value) => {
  return (
    typeof value === "string" &&
    mongoose.Types.ObjectId.isValid(
      value.trim()
    )
  );
};

const isFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue);
};

const isNonNegativeNumber = (
  value
) => {
  return (
    isFiniteNumber(value) &&
    Number(value) >= 0
  );
};

const hasMaximumDecimals = (
  value,
  maximumDecimals
) => {
  if (!isFiniteNumber(value)) {
    return false;
  }

  const valueAsString =
    String(value);

  if (
    valueAsString.includes("e") ||
    valueAsString.includes("E")
  ) {
    return true;
  }

  const decimalPart =
    valueAsString.split(".")[1];

  return (
    !decimalPart ||
    decimalPart.length <=
      maximumDecimals
  );
};

const quantitiesEqual = (
  firstValue,
  secondValue
) => {
  return (
    Math.abs(
      Number(firstValue) -
        Number(secondValue)
    ) < 0.0001
  );
};

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
};

const normalizeInspectionItem = (
  item
) => {
  const normalizedItem = {
    ...item,
  };

  normalizedItem.goodsReceivedItemId =
    item.goodsReceivedItemId ||
    item.itemId ||
    item._id ||
    null;

  if (
    isFiniteNumber(
      item.inspectedQuantity
    )
  ) {
    normalizedItem.inspectedQuantity =
      Number(
        item.inspectedQuantity
      );
  }

  if (
    isFiniteNumber(
      item.passedQuantity
    )
  ) {
    normalizedItem.passedQuantity =
      Number(item.passedQuantity);
  }

  if (
    isFiniteNumber(
      item.failedQuantity
    )
  ) {
    normalizedItem.failedQuantity =
      Number(item.failedQuantity);
  }

  if (
    item.damagedQuantity ===
      undefined ||
    item.damagedQuantity === null ||
    item.damagedQuantity === ""
  ) {
    normalizedItem.damagedQuantity =
      0;
  } else if (
    isFiniteNumber(
      item.damagedQuantity
    )
  ) {
    normalizedItem.damagedQuantity =
      Number(item.damagedQuantity);
  }

  normalizedItem.qualityGrade =
    normalizeOptionalString(
      item.qualityGrade
    ) || "Not Graded";

  normalizedItem.rejectionReason =
    normalizeOptionalString(
      item.rejectionReason
    );

  normalizedItem.damageDescription =
    normalizeOptionalString(
      item.damageDescription
    );

  normalizedItem.remarks =
    normalizeOptionalString(
      item.remarks
    );

  return normalizedItem;
};

/* =========================================================
   PARAM VALIDATION

   Validates:
   :goodsReceivedId
========================================================= */

const validateGoodsReceivedInspectionId =
  (req, res, next) => {
    const goodsReceivedId =
      req.params?.goodsReceivedId;

    if (
      !isValidObjectId(
        goodsReceivedId
      )
    ) {
      return sendValidationError(
        res,
        [
          createValidationError(
            "goodsReceivedId",
            "A valid goods received ID is required",
            goodsReceivedId
          ),
        ]
      );
    }

    req.params.goodsReceivedId =
      goodsReceivedId.trim();

    return next();
  };

/* =========================================================
   START INSPECTION VALIDATION

   PATCH
   /:goodsReceivedId/inspection/start

   Optional body:
   {
     "remarks": "...",
     "note": "..."
   }
========================================================= */

const validateStartGoodsReceivedInspection =
  (req, res, next) => {
    const body = req.body ?? {};

    if (!isPlainObject(body)) {
      return sendValidationError(
        res,
        [
          createValidationError(
            "body",
            "Request body must be an object"
          ),
        ]
      );
    }

    const errors = [];

    if (
      body.remarks !== undefined &&
      body.remarks !== null &&
      typeof body.remarks !==
        "string"
    ) {
      errors.push(
        createValidationError(
          "remarks",
          "Remarks must be a string",
          body.remarks
        )
      );
    }

    if (
      typeof body.remarks ===
        "string" &&
      body.remarks.trim().length >
        MAX_REMARK_LENGTH
    ) {
      errors.push(
        createValidationError(
          "remarks",
          `Remarks cannot exceed ${MAX_REMARK_LENGTH} characters`
        )
      );
    }

    if (
      body.note !== undefined &&
      body.note !== null &&
      typeof body.note !==
        "string"
    ) {
      errors.push(
        createValidationError(
          "note",
          "Note must be a string",
          body.note
        )
      );
    }

    if (
      typeof body.note ===
        "string" &&
      body.note.trim().length >
        MAX_REMARK_LENGTH
    ) {
      errors.push(
        createValidationError(
          "note",
          `Note cannot exceed ${MAX_REMARK_LENGTH} characters`
        )
      );
    }

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors
      );
    }

    req.body = {
      ...body,
      remarks:
        normalizeOptionalString(
          body.remarks
        ),
      note:
        normalizeOptionalString(
          body.note
        ),
    };

    return next();
  };

/* =========================================================
   COMPLETE INSPECTION ITEM VALIDATION
========================================================= */

const validateInspectionItem = (
  item,
  index
) => {
  const errors = [];
  const prefix = `items.${index}`;

  if (!isPlainObject(item)) {
    errors.push(
      createValidationError(
        prefix,
        "Inspection item must be an object"
      )
    );

    return errors;
  }

  const goodsReceivedItemId =
    item.goodsReceivedItemId ||
    item.itemId ||
    item._id;

  if (
    !isValidObjectId(
      goodsReceivedItemId
    )
  ) {
    errors.push(
      createValidationError(
        `${prefix}.goodsReceivedItemId`,
        "A valid goods received item ID is required",
        goodsReceivedItemId
      )
    );
  }

  const quantityFields = [
    "inspectedQuantity",
    "passedQuantity",
    "failedQuantity",
  ];

  quantityFields.forEach(
    (fieldName) => {
      const value =
        item[fieldName];

      if (
        !isNonNegativeNumber(
          value
        )
      ) {
        errors.push(
          createValidationError(
            `${prefix}.${fieldName}`,
            `${fieldName} must be a non-negative number`,
            value
          )
        );

        return;
      }

      if (
        !hasMaximumDecimals(
          value,
          QUANTITY_DECIMAL_PLACES
        )
      ) {
        errors.push(
          createValidationError(
            `${prefix}.${fieldName}`,
            `${fieldName} cannot have more than ${QUANTITY_DECIMAL_PLACES} decimal places`,
            value
          )
        );
      }
    }
  );

  if (
    item.damagedQuantity !==
      undefined &&
    item.damagedQuantity !==
      null &&
    item.damagedQuantity !== ""
  ) {
    if (
      !isNonNegativeNumber(
        item.damagedQuantity
      )
    ) {
      errors.push(
        createValidationError(
          `${prefix}.damagedQuantity`,
          "Damaged quantity must be a non-negative number",
          item.damagedQuantity
        )
      );
    } else if (
      !hasMaximumDecimals(
        item.damagedQuantity,
        QUANTITY_DECIMAL_PLACES
      )
    ) {
      errors.push(
        createValidationError(
          `${prefix}.damagedQuantity`,
          `Damaged quantity cannot have more than ${QUANTITY_DECIMAL_PLACES} decimal places`,
          item.damagedQuantity
        )
      );
    }
  }

  const inspectedQuantity =
    Number(
      item.inspectedQuantity
    );

  const passedQuantity =
    Number(item.passedQuantity);

  const failedQuantity =
    Number(item.failedQuantity);

  const damagedQuantity =
    Number(
      item.damagedQuantity || 0
    );

  if (
    isNonNegativeNumber(
      item.inspectedQuantity
    ) &&
    inspectedQuantity <= 0
  ) {
    errors.push(
      createValidationError(
        `${prefix}.inspectedQuantity`,
        "Inspected quantity must be greater than zero",
        item.inspectedQuantity
      )
    );
  }

  if (
    isNonNegativeNumber(
      item.inspectedQuantity
    ) &&
    isNonNegativeNumber(
      item.passedQuantity
    ) &&
    isNonNegativeNumber(
      item.failedQuantity
    ) &&
    !quantitiesEqual(
      passedQuantity +
        failedQuantity,
      inspectedQuantity
    )
  ) {
    errors.push(
      createValidationError(
        prefix,
        "Passed and failed quantities must equal inspected quantity",
        {
          inspectedQuantity,
          passedQuantity,
          failedQuantity,
        }
      )
    );
  }

  if (
    isNonNegativeNumber(
      item.failedQuantity
    ) &&
    isNonNegativeNumber(
      damagedQuantity
    ) &&
    damagedQuantity >
      failedQuantity
  ) {
    errors.push(
      createValidationError(
        `${prefix}.damagedQuantity`,
        "Damaged quantity cannot exceed failed quantity",
        damagedQuantity
      )
    );
  }

  const qualityGrade =
    item.qualityGrade ||
    "Not Graded";

  if (
    !QUALITY_GRADES.includes(
      qualityGrade
    )
  ) {
    errors.push(
      createValidationError(
        `${prefix}.qualityGrade`,
        `Quality grade must be one of: ${QUALITY_GRADES.join(
          ", "
        )}`,
        qualityGrade
      )
    );
  }

  if (
    isNonNegativeNumber(
      item.failedQuantity
    ) &&
    failedQuantity > 0 &&
    !isNonEmptyString(
      item.rejectionReason
    )
  ) {
    errors.push(
      createValidationError(
        `${prefix}.rejectionReason`,
        "Rejection reason is required when failed quantity is greater than zero"
      )
    );
  }

  if (
    isNonNegativeNumber(
      damagedQuantity
    ) &&
    damagedQuantity > 0 &&
    !isNonEmptyString(
      item.damageDescription
    )
  ) {
    errors.push(
      createValidationError(
        `${prefix}.damageDescription`,
        "Damage description is required when damaged quantity is greater than zero"
      )
    );
  }

  const stringFields = [
    {
      name: "rejectionReason",
      maximumLength:
        MAX_REASON_LENGTH,
    },
    {
      name: "damageDescription",
      maximumLength:
        MAX_REASON_LENGTH,
    },
    {
      name: "remarks",
      maximumLength:
        MAX_REMARK_LENGTH,
    },
  ];

  stringFields.forEach(
    ({
      name,
      maximumLength,
    }) => {
      const value = item[name];

      if (
        value !== undefined &&
        value !== null &&
        typeof value !== "string"
      ) {
        errors.push(
          createValidationError(
            `${prefix}.${name}`,
            `${name} must be a string`,
            value
          )
        );

        return;
      }

      if (
        typeof value ===
          "string" &&
        value.trim().length >
          maximumLength
      ) {
        errors.push(
          createValidationError(
            `${prefix}.${name}`,
            `${name} cannot exceed ${maximumLength} characters`
          )
        );
      }
    }
  );

  return errors;
};

/* =========================================================
   COMPLETE INSPECTION VALIDATION

   PATCH
   /:goodsReceivedId/inspection/complete
========================================================= */

const validateCompleteGoodsReceivedInspection =
  (req, res, next) => {
    const body = req.body;

    if (!isPlainObject(body)) {
      return sendValidationError(
        res,
        [
          createValidationError(
            "body",
            "Request body must be an object"
          ),
        ]
      );
    }

    const errors = [];

    if (
      !Array.isArray(
        body.items
      )
    ) {
      errors.push(
        createValidationError(
          "items",
          "Inspection items must be an array"
        )
      );
    } else if (
      body.items.length === 0
    ) {
      errors.push(
        createValidationError(
          "items",
          "At least one inspection item is required"
        )
      );
    } else {
      const submittedIds =
        new Set();

      body.items.forEach(
        (item, index) => {
          errors.push(
            ...validateInspectionItem(
              item,
              index
            )
          );

          if (
            isPlainObject(item)
          ) {
            const itemId =
              item.goodsReceivedItemId ||
              item.itemId ||
              item._id;

            if (
              isValidObjectId(
                itemId
              )
            ) {
              const normalizedId =
                String(
                  itemId
                ).trim();

              if (
                submittedIds.has(
                  normalizedId
                )
              ) {
                errors.push(
                  createValidationError(
                    `items.${index}.goodsReceivedItemId`,
                    "Duplicate goods received item ID was submitted",
                    itemId
                  )
                );
              }

              submittedIds.add(
                normalizedId
              );
            }
          }
        }
      );
    }

    const optionalStringFields = [
      {
        name: "remarks",
        maximumLength:
          MAX_REMARK_LENGTH,
      },
      {
        name: "note",
        maximumLength:
          MAX_REMARK_LENGTH,
      },
      {
        name:
          "rejectionReason",
        maximumLength:
          MAX_REASON_LENGTH,
      },
    ];

    optionalStringFields.forEach(
      ({
        name,
        maximumLength,
      }) => {
        const value = body[name];

        if (
          value !== undefined &&
          value !== null &&
          typeof value !==
            "string"
        ) {
          errors.push(
            createValidationError(
              name,
              `${name} must be a string`,
              value
            )
          );

          return;
        }

        if (
          typeof value ===
            "string" &&
          value.trim().length >
            maximumLength
        ) {
          errors.push(
            createValidationError(
              name,
              `${name} cannot exceed ${maximumLength} characters`
            )
          );
        }
      }
    );

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors
      );
    }

    req.body = {
      ...body,

      items: body.items.map(
        normalizeInspectionItem
      ),

      remarks:
        normalizeOptionalString(
          body.remarks
        ),

      note:
        normalizeOptionalString(
          body.note
        ),

      rejectionReason:
        normalizeOptionalString(
          body.rejectionReason
        ),
    };

    return next();
  };

/* =========================================================
   RESET INSPECTION VALIDATION

   PATCH
   /:goodsReceivedId/inspection/reset

   Optional body:
   {
     "reason": "...",
     "note": "...",
     "remarks": "..."
   }
========================================================= */

const validateResetGoodsReceivedInspection =
  (req, res, next) => {
    const body = req.body ?? {};

    if (!isPlainObject(body)) {
      return sendValidationError(
        res,
        [
          createValidationError(
            "body",
            "Request body must be an object"
          ),
        ]
      );
    }

    const errors = [];

    const optionalStringFields = [
      {
        name: "reason",
        maximumLength:
          MAX_REASON_LENGTH,
      },
      {
        name: "note",
        maximumLength:
          MAX_REMARK_LENGTH,
      },
      {
        name: "remarks",
        maximumLength:
          MAX_REMARK_LENGTH,
      },
    ];

    optionalStringFields.forEach(
      ({
        name,
        maximumLength,
      }) => {
        const value = body[name];

        if (
          value !== undefined &&
          value !== null &&
          typeof value !==
            "string"
        ) {
          errors.push(
            createValidationError(
              name,
              `${name} must be a string`,
              value
            )
          );

          return;
        }

        if (
          typeof value ===
            "string" &&
          value.trim().length >
            maximumLength
        ) {
          errors.push(
            createValidationError(
              name,
              `${name} cannot exceed ${maximumLength} characters`
            )
          );
        }
      }
    );

    if (errors.length > 0) {
      return sendValidationError(
        res,
        errors
      );
    }

    req.body = {
      ...body,

      reason:
        normalizeOptionalString(
          body.reason
        ),

      note:
        normalizeOptionalString(
          body.note
        ),

      remarks:
        normalizeOptionalString(
          body.remarks
        ),
    };

    return next();
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  validateGoodsReceivedInspectionId,

  validateStartGoodsReceivedInspection,

  validateCompleteGoodsReceivedInspection,

  validateResetGoodsReceivedInspection,
};