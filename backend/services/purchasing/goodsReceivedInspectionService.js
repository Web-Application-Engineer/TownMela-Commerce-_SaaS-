"use strict";

const mongoose = require("mongoose");

const GoodsReceived = require(
  "../../models/GoodsReceived"
);

const GoodsReceivedItem = require(
  "../../models/GoodsReceivedItem"
);

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

const BLOCKED_POSTING_STATUSES = [
  "Partially Posted",
  "Posted",
];

/* =========================================================
   ERROR HELPER
========================================================= */

const createHttpError = (
  statusCode,
  message,
  code,
  details = null
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
};

/* =========================================================
   VALUE HELPERS
========================================================= */

const normalizeOptionalString = (
  value
) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue || null;
};

const roundQuantity = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return (
    Math.round(
      (parsedValue +
        Number.EPSILON) *
        10000
    ) / 10000
  );
};

const toNonNegativeQuantity = (
  value
) => {
  return roundQuantity(
    Math.max(
      Number(value) || 0,
      0
    )
  );
};

const quantitiesEqual = (
  firstValue,
  secondValue
) => {
  return (
    Math.abs(
      roundQuantity(firstValue) -
        roundQuantity(secondValue)
    ) < 0.0001
  );
};

/* =========================================================
   ID HELPERS
========================================================= */

const validateObjectId = (
  value,
  fieldName
) => {
  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    throw createHttpError(
      400,
      `${fieldName} is invalid`,
      "INVALID_OBJECT_ID",
      {
        field: fieldName,
      }
    );
  }

  return value;
};

const resolveInspectionItemId = (
  itemPayload
) => {
  return (
    itemPayload
      ?.goodsReceivedItemId ||
    itemPayload?.itemId ||
    itemPayload?._id ||
    null
  );
};

/* =========================================================
   RECEIPT HELPERS
========================================================= */

const findGoodsReceivedOrFail =
  async ({
    tenantId,
    goodsReceivedId,
  }) => {
    validateObjectId(
      tenantId,
      "tenantId"
    );

    validateObjectId(
      goodsReceivedId,
      "goodsReceivedId"
    );

    const goodsReceived =
      await GoodsReceived.findOne({
        _id: goodsReceivedId,
        tenant: tenantId,
        isDeleted: false,
      });

    if (!goodsReceived) {
      throw createHttpError(
        404,
        "Goods receipt was not found",
        "GOODS_RECEIVED_NOT_FOUND"
      );
    }

    return goodsReceived;
  };

const findReceiptItems =
  async ({
    tenantId,
    goodsReceivedId,
  }) => {
    return GoodsReceivedItem.find({
      tenant: tenantId,
      goodsReceived:
        goodsReceivedId,
      isDeleted: false,
    }).sort({
      lineNumber: 1,
      createdAt: 1,
    });
  };

/* =========================================================
   POSTING PROTECTION
========================================================= */

const ensureReceiptNotPosted = (
  goodsReceived,
  items = []
) => {
  if (
    BLOCKED_POSTING_STATUSES.includes(
      goodsReceived
        ?.inventoryPosting?.status
    )
  ) {
    throw createHttpError(
      409,
      "Inspection cannot be changed after inventory posting",
      "GOODS_RECEIVED_ALREADY_POSTED"
    );
  }

  const postedItem =
    items.find((item) =>
      BLOCKED_POSTING_STATUSES.includes(
        item.inventoryPosting
          ?.status
      )
    );

  if (postedItem) {
    throw createHttpError(
      409,
      "Inspection cannot be changed because one or more items are already posted",
      "GOODS_RECEIVED_ITEM_ALREADY_POSTED",
      {
        goodsReceivedItemId:
          postedItem._id,
      }
    );
  }
};

/* =========================================================
   INSPECTION STATUS HELPERS
========================================================= */

const determineItemInspectionStatus =
  ({
    inspectedQuantity,
    passedQuantity,
    failedQuantity,
  }) => {
    if (
      inspectedQuantity <= 0
    ) {
      return "Pending";
    }

    if (
      quantitiesEqual(
        passedQuantity,
        inspectedQuantity
      )
    ) {
      return "Passed";
    }

    if (
      quantitiesEqual(
        failedQuantity,
        inspectedQuantity
      )
    ) {
      return "Failed";
    }

    return "Partially Passed";
  };

const determineReceiptInspectionStatus =
  (items) => {
    if (!items.length) {
      return "Pending";
    }

    const statuses =
      items.map(
        (item) =>
          item.inspection?.status
      );

    if (
      statuses.every(
        (status) =>
          status === "Passed"
      )
    ) {
      return "Passed";
    }

    if (
      statuses.every(
        (status) =>
          status === "Failed"
      )
    ) {
      return "Failed";
    }

    return "Partially Passed";
  };

const determineReceiptStatus = (
  goodsReceived
) => {
  const receivedQuantity =
    toNonNegativeQuantity(
      goodsReceived
        .receivingSummary
        ?.totalReceivedQuantity
    );

  const acceptedQuantity =
    toNonNegativeQuantity(
      goodsReceived
        .receivingSummary
        ?.totalAcceptedQuantity
    );

  const rejectedQuantity =
    toNonNegativeQuantity(
      goodsReceived
        .receivingSummary
        ?.totalRejectedQuantity
    );

  if (
    receivedQuantity > 0 &&
    quantitiesEqual(
      rejectedQuantity,
      receivedQuantity
    )
  ) {
    return "Rejected";
  }

  if (
    receivedQuantity > 0 &&
    quantitiesEqual(
      acceptedQuantity,
      receivedQuantity
    )
  ) {
    return "Accepted";
  }

  if (
    acceptedQuantity > 0 ||
    rejectedQuantity > 0
  ) {
    return "Partially Accepted";
  }

  return "Pending Inspection";
};

/* =========================================================
   RESPONSE BUILDER
========================================================= */

const buildInspectionResponse = (
  goodsReceived,
  items
) => {
  return {
    goodsReceived,
    items,

    inspectionSummary: {
      goodsReceivedId:
        goodsReceived._id,

      goodsReceivedNumber:
        goodsReceived
          .goodsReceivedNumber,

      receiptStatus:
        goodsReceived.status,

      inspectionRequired:
        Boolean(
          goodsReceived
            .inspection?.required
        ),

      inspectionStatus:
        goodsReceived
          .inspection?.status ||
        "Not Required",

      startedAt:
        goodsReceived
          .inspection?.startedAt ||
        null,

      completedAt:
        goodsReceived
          .inspection?.completedAt ||
        null,

      inspectedBy:
        goodsReceived
          .inspection?.inspectedBy ||
        null,

      totalItems:
        items.length,

      totalReceivedQuantity:
        goodsReceived
          .receivingSummary
          ?.totalReceivedQuantity ||
        0,

      totalAcceptedQuantity:
        goodsReceived
          .receivingSummary
          ?.totalAcceptedQuantity ||
        0,

      totalRejectedQuantity:
        goodsReceived
          .receivingSummary
          ?.totalRejectedQuantity ||
        0,
    },
  };
};

/* =========================================================
   GET INSPECTION

   GET /api/goods-received/:goodsReceivedId/inspection
========================================================= */

const getGoodsReceivedInspection =
  async ({
    tenantId,
    goodsReceivedId,
  }) => {
    const goodsReceived =
      await findGoodsReceivedOrFail({
        tenantId,
        goodsReceivedId,
      });

    const items =
      await findReceiptItems({
        tenantId,
        goodsReceivedId,
      });

    return buildInspectionResponse(
      goodsReceived,
      items
    );
  };

/* =========================================================
   START INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/start
========================================================= */

const startGoodsReceivedInspection =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    payload = {},
  }) => {
    validateObjectId(
      userId,
      "userId"
    );

    const goodsReceived =
      await findGoodsReceivedOrFail({
        tenantId,
        goodsReceivedId,
      });

    const items =
      await findReceiptItems({
        tenantId,
        goodsReceivedId,
      });

    if (!items.length) {
      throw createHttpError(
        409,
        "Goods receipt has no items to inspect",
        "GOODS_RECEIVED_ITEMS_NOT_FOUND"
      );
    }

    ensureReceiptNotPosted(
      goodsReceived,
      items
    );

    if (
      goodsReceived.status ===
      "Cancelled"
    ) {
      throw createHttpError(
        409,
        "Cancelled goods receipts cannot be inspected",
        "GOODS_RECEIVED_CANCELLED"
      );
    }

    const now = new Date();

    for (const item of items) {
      item.inspection.required =
        true;

      item.inspection.status =
        "In Progress";

      item.inspection.qualityGrade =
        "Not Graded";

      item.inspection.inspectedQuantity =
        0;

      item.inspection.passedQuantity =
        0;

      item.inspection.failedQuantity =
        0;

      item.inspection.inspectedAt =
        null;

      item.inspection.inspectedBy =
        userId;

      item.inspection.remarks =
        null;

      /*
       * Accepted/rejected quantities must not be final
       * while inspection is still pending.
       */
      item.acceptedQuantity = 0;
      item.rejectedQuantity = 0;

      item.rejectionReason =
        null;

      item.updatedBy = userId;

      await item.save();
    }

    goodsReceived.inspection.required =
      true;

    goodsReceived.inspection.status =
      "In Progress";

    goodsReceived.inspection.startedAt =
      goodsReceived.inspection
        .startedAt || now;

    goodsReceived.inspection.completedAt =
      null;

    goodsReceived.inspection.inspectedBy =
      userId;

    goodsReceived.inspection.remarks =
      normalizeOptionalString(
        payload.remarks ||
          payload.note
      );

    goodsReceived.calculateReceivingSummary(
      items
    );

    goodsReceived.calculateFinancialSummary(
      items
    );

    if (
      goodsReceived.status !==
      "Pending Inspection"
    ) {
      goodsReceived.addStatusHistory({
        toStatus:
          "Pending Inspection",

        changedBy:
          userId,

        reason:
          "Goods received inspection started",

        note:
          normalizeOptionalString(
            payload.note
          ),
      });
    } else {
      goodsReceived.status =
        "Pending Inspection";
    }

    goodsReceived.updatedBy =
      userId;

    await goodsReceived.save();

    return buildInspectionResponse(
      goodsReceived,
      items
    );
  };

/* =========================================================
   COMPLETE INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/complete
========================================================= */

const completeGoodsReceivedInspection =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    payload = {},
  }) => {
    validateObjectId(
      userId,
      "userId"
    );

    const submittedItems =
      Array.isArray(payload.items)
        ? payload.items
        : [];

    if (!submittedItems.length) {
      throw createHttpError(
        400,
        "Inspection items are required",
        "INSPECTION_ITEMS_REQUIRED"
      );
    }

    const goodsReceived =
      await findGoodsReceivedOrFail({
        tenantId,
        goodsReceivedId,
      });

    const receiptItems =
      await findReceiptItems({
        tenantId,
        goodsReceivedId,
      });

    if (!receiptItems.length) {
      throw createHttpError(
        409,
        "Goods receipt has no items to inspect",
        "GOODS_RECEIVED_ITEMS_NOT_FOUND"
      );
    }

    ensureReceiptNotPosted(
      goodsReceived,
      receiptItems
    );

    if (
      goodsReceived.status ===
      "Cancelled"
    ) {
      throw createHttpError(
        409,
        "Cancelled goods receipts cannot be inspected",
        "GOODS_RECEIVED_CANCELLED"
      );
    }

    if (
      submittedItems.length !==
      receiptItems.length
    ) {
      throw createHttpError(
        400,
        "Inspection result must be submitted for every goods received item",
        "INCOMPLETE_INSPECTION_ITEMS",
        {
          expectedItemCount:
            receiptItems.length,

          submittedItemCount:
            submittedItems.length,
        }
      );
    }

    const receiptItemMap =
      new Map(
        receiptItems.map(
          (item) => [
            String(item._id),
            item,
          ]
        )
      );

    const processedItemIds =
      new Set();

    const now = new Date();

    for (
      const submittedItem of
      submittedItems
    ) {
      const itemId =
        resolveInspectionItemId(
          submittedItem
        );

      validateObjectId(
        itemId,
        "goodsReceivedItemId"
      );

      const normalizedItemId =
        String(itemId);

      if (
        processedItemIds.has(
          normalizedItemId
        )
      ) {
        throw createHttpError(
          400,
          "Duplicate inspection item was submitted",
          "DUPLICATE_INSPECTION_ITEM",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      const item =
        receiptItemMap.get(
          normalizedItemId
        );

      if (!item) {
        throw createHttpError(
          400,
          "One or more inspection items do not belong to this goods receipt",
          "INVALID_INSPECTION_ITEM",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      const receivedQuantity =
        toNonNegativeQuantity(
          item.receivedQuantity
        );

      const inspectedQuantity =
        toNonNegativeQuantity(
          submittedItem
            .inspectedQuantity
        );

      const passedQuantity =
        toNonNegativeQuantity(
          submittedItem
            .passedQuantity
        );

      const failedQuantity =
        toNonNegativeQuantity(
          submittedItem
            .failedQuantity
        );

      const damagedQuantity =
        toNonNegativeQuantity(
          submittedItem
            .damagedQuantity
        );

      if (
        receivedQuantity <= 0
      ) {
        throw createHttpError(
          409,
          "Received quantity must be greater than zero before inspection",
          "INVALID_RECEIVED_QUANTITY",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      if (
        !quantitiesEqual(
          inspectedQuantity,
          receivedQuantity
        )
      ) {
        throw createHttpError(
          400,
          "Inspected quantity must equal received quantity when completing inspection",
          "INSPECTED_QUANTITY_MISMATCH",
          {
            goodsReceivedItemId:
              itemId,

            receivedQuantity,
            inspectedQuantity,
          }
        );
      }

      if (
        !quantitiesEqual(
          passedQuantity +
            failedQuantity,
          inspectedQuantity
        )
      ) {
        throw createHttpError(
          400,
          "Passed and failed quantities must equal inspected quantity",
          "INSPECTION_QUANTITY_MISMATCH",
          {
            goodsReceivedItemId:
              itemId,

            inspectedQuantity,
            passedQuantity,
            failedQuantity,
          }
        );
      }

      if (
        damagedQuantity >
        failedQuantity
      ) {
        throw createHttpError(
          400,
          "Damaged quantity cannot exceed failed quantity",
          "INVALID_DAMAGED_QUANTITY",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      const qualityGrade =
        submittedItem
          .qualityGrade ||
        (failedQuantity ===
        inspectedQuantity
          ? "Rejected"
          : "Not Graded");

      if (
        !QUALITY_GRADES.includes(
          qualityGrade
        )
      ) {
        throw createHttpError(
          400,
          "Quality grade is invalid",
          "INVALID_QUALITY_GRADE",
          {
            goodsReceivedItemId:
              itemId,

            qualityGrade,
          }
        );
      }

      const rejectionReason =
        normalizeOptionalString(
          submittedItem
            .rejectionReason
        );

      const damageDescription =
        normalizeOptionalString(
          submittedItem
            .damageDescription
        );

      if (
        failedQuantity > 0 &&
        !rejectionReason
      ) {
        throw createHttpError(
          400,
          "Rejection reason is required when failed quantity is greater than zero",
          "REJECTION_REASON_REQUIRED",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      if (
        damagedQuantity > 0 &&
        !damageDescription
      ) {
        throw createHttpError(
          400,
          "Damage description is required when damaged quantity is greater than zero",
          "DAMAGE_DESCRIPTION_REQUIRED",
          {
            goodsReceivedItemId:
              itemId,
          }
        );
      }

      item.inspection.required =
        true;

      item.inspection.status =
        determineItemInspectionStatus({
          inspectedQuantity,
          passedQuantity,
          failedQuantity,
        });

      item.inspection.qualityGrade =
        qualityGrade;

      item.inspection.inspectedQuantity =
        inspectedQuantity;

      item.inspection.passedQuantity =
        passedQuantity;

      item.inspection.failedQuantity =
        failedQuantity;

      item.inspection.inspectedAt =
        now;

      item.inspection.inspectedBy =
        userId;

      item.inspection.remarks =
        normalizeOptionalString(
          submittedItem.remarks
        );

      item.acceptedQuantity =
        passedQuantity;

      item.rejectedQuantity =
        failedQuantity;

      item.damagedQuantity =
        damagedQuantity;

      item.rejectionReason =
        rejectionReason;

      item.damageDescription =
        damageDescription;

      item.updatedBy = userId;

      await item.save();

      processedItemIds.add(
        normalizedItemId
      );
    }

    const updatedItems =
      await findReceiptItems({
        tenantId,
        goodsReceivedId,
      });

    goodsReceived.calculateReceivingSummary(
      updatedItems
    );

    goodsReceived.calculateFinancialSummary(
      updatedItems
    );

    goodsReceived.inspection.required =
      true;

    goodsReceived.inspection.status =
      determineReceiptInspectionStatus(
        updatedItems
      );

    goodsReceived.inspection.startedAt =
      goodsReceived.inspection
        .startedAt || now;

    goodsReceived.inspection.completedAt =
      now;

    goodsReceived.inspection.inspectedBy =
      userId;

    goodsReceived.inspection.remarks =
      normalizeOptionalString(
        payload.remarks ||
          payload.note
      );

    const nextReceiptStatus =
      determineReceiptStatus(
        goodsReceived
      );

    if (
      goodsReceived.status !==
      nextReceiptStatus
    ) {
      goodsReceived.addStatusHistory({
        toStatus:
          nextReceiptStatus,

        changedBy:
          userId,

        reason:
          "Goods received inspection completed",

        note:
          normalizeOptionalString(
            payload.note
          ),
      });
    } else {
      goodsReceived.status =
        nextReceiptStatus;
    }

    if (
      nextReceiptStatus ===
      "Rejected"
    ) {
      goodsReceived.rejectionReason =
        normalizeOptionalString(
          payload.rejectionReason
        ) ||
        "All received quantities failed inspection";
    } else {
      goodsReceived.rejectionReason =
        null;
    }

    goodsReceived.updatedBy =
      userId;

    await goodsReceived.save();

    return buildInspectionResponse(
      goodsReceived,
      updatedItems
    );
  };

/* =========================================================
   RESET INSPECTION

   PATCH
   /api/goods-received/:goodsReceivedId/inspection/reset
========================================================= */

const resetGoodsReceivedInspection =
  async ({
    tenantId,
    goodsReceivedId,
    userId,
    payload = {},
  }) => {
    validateObjectId(
      userId,
      "userId"
    );

    const goodsReceived =
      await findGoodsReceivedOrFail({
        tenantId,
        goodsReceivedId,
      });

    const items =
      await findReceiptItems({
        tenantId,
        goodsReceivedId,
      });

    if (!items.length) {
      throw createHttpError(
        409,
        "Goods receipt has no items to reset",
        "GOODS_RECEIVED_ITEMS_NOT_FOUND"
      );
    }

    ensureReceiptNotPosted(
      goodsReceived,
      items
    );

    for (const item of items) {
      item.inspection.required =
        true;

      item.inspection.status =
        "Pending";

      item.inspection.qualityGrade =
        "Not Graded";

      item.inspection.inspectedQuantity =
        0;

      item.inspection.passedQuantity =
        0;

      item.inspection.failedQuantity =
        0;

      item.inspection.inspectedAt =
        null;

      item.inspection.inspectedBy =
        null;

      item.inspection.remarks =
        null;

      item.acceptedQuantity = 0;
      item.rejectedQuantity = 0;
      item.damagedQuantity = 0;

      item.rejectionReason =
        null;

      item.damageDescription =
        null;

      item.updatedBy = userId;

      await item.save();
    }

    goodsReceived.calculateReceivingSummary(
      items
    );

    goodsReceived.calculateFinancialSummary(
      items
    );

    goodsReceived.inspection.required =
      true;

    goodsReceived.inspection.status =
      "Pending";

    goodsReceived.inspection.startedAt =
      null;

    goodsReceived.inspection.completedAt =
      null;

    goodsReceived.inspection.inspectedBy =
      null;

    goodsReceived.inspection.remarks =
      normalizeOptionalString(
        payload.remarks
      );

    if (
      goodsReceived.status !==
      "Pending Inspection"
    ) {
      goodsReceived.addStatusHistory({
        toStatus:
          "Pending Inspection",

        changedBy:
          userId,

        reason:
          normalizeOptionalString(
            payload.reason
          ) ||
          "Goods received inspection reset",

        note:
          normalizeOptionalString(
            payload.note
          ),
      });
    } else {
      goodsReceived.status =
        "Pending Inspection";
    }

    goodsReceived.rejectionReason =
      null;

    goodsReceived.updatedBy =
      userId;

    await goodsReceived.save();

    return buildInspectionResponse(
      goodsReceived,
      items
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getGoodsReceivedInspection,

  startGoodsReceivedInspection,

  completeGoodsReceivedInspection,

  resetGoodsReceivedInspection,
};