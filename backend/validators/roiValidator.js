"use strict";

/**
 * ROI Validator
 * Lightweight validation helpers for ROI endpoints.
 */

const ALLOWED_CURRENCIES = [
  "BDT",
  "USD",
  "EUR",
];

const boolFields = [
  "includeCourierCost",
  "includePackagingCost",
  "includeGatewayFee",
  "includeAdvertisingCost",
  "includeTransportCost",
  "includeOverheadCost",
  "includeHandlingCost",
  "includeProcessingCost",
  "includeOtherCost",
  "includeDiscount",
  "includeRefund",
  "isActive",
];

const numberFields = [
  "packagingCostPerOrder",
  "advertisingCostPerOrder",
  "transportCostPerOrder",
  "overheadCostPerOrder",
  "handlingCostPerOrder",
  "processingCostPerOrder",
  "otherCostPerOrder",
  "gatewayFeePercent",
];

const validateSettings = (
  payload = {}
) => {
  const errors = [];

  if ("currency" in payload) {
    const currency =
      String(
        payload.currency || ""
      )
        .trim()
        .toUpperCase();

    if (
      !ALLOWED_CURRENCIES.includes(
        currency
      )
    ) {
      errors.push(
        "currency must be one of: " +
          ALLOWED_CURRENCIES.join(", ")
      );
    }
  }

  for (const field of numberFields) {
    if (field in payload) {
      const value =
        Number(payload[field]);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        errors.push(
          `${field} must be a non-negative number`
        );
      }
    }
  }

  if ("gatewayFeePercent" in payload) {
    const value =
      Number(
        payload.gatewayFeePercent
      );

    if (value > 100) {
      errors.push(
        "gatewayFeePercent cannot exceed 100"
      );
    }
  }

  for (const field of boolFields) {
    if (
      field in payload &&
      typeof payload[field] !==
        "boolean"
    ) {
      errors.push(
        `${field} must be boolean`
      );
    }
  }

  if (
    "eligibleOrderStatuses" in
    payload
  ) {
    if (
      !Array.isArray(
        payload
          .eligibleOrderStatuses
      )
    ) {
      errors.push(
        "eligibleOrderStatuses must be an array"
      );
    } else if (
      payload
        .eligibleOrderStatuses
        .some(
          (status) =>
            typeof status !==
              "string" ||
            !status.trim()
        )
    ) {
      errors.push(
        "eligibleOrderStatuses must contain non-empty strings"
      );
    }
  }

  return {
    valid:
      errors.length === 0,
    errors,
  };
};

const validateQuery = (
  query = {}
) => {
  const errors = [];

  ["page", "limit"].forEach(
    (field) => {
      if (field in query) {
        const value =
          Number(query[field]);

        if (
          !Number.isInteger(
            value
          ) ||
          value < 1
        ) {
          errors.push(
            `${field} must be a positive integer`
          );
        }
      }
    }
  );

  ["startDate", "endDate"].forEach(
    (field) => {
      if (query[field]) {
        const date =
          new Date(
            query[field]
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          errors.push(
            `${field} is not a valid date`
          );
        }
      }
    }
  );

  return {
    valid:
      errors.length === 0,
    errors,
  };
};

module.exports = {
  validateSettings,
  validateQuery,
};
