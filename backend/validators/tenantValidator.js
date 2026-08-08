/**
 * =====================================================
 * Tenant Validator
 * =====================================================
 * Startup-friendly validation for TownMela multi-tenant SaaS.
 */

const createValidationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const isEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const validateCreateTenant = (req, res, next) => {
  try {
    const {
      businessName,
      storeName,
      ownerName,
      ownerEmail,
      ownerPhone,
    } = req.body;

    if (!businessName?.trim()) createValidationError("Business name is required");
    if (!storeName?.trim()) createValidationError("Store name is required");
    if (!ownerName?.trim()) createValidationError("Owner name is required");
    if (!ownerEmail?.trim()) createValidationError("Owner email is required");
    if (!isEmail(ownerEmail)) createValidationError("Owner email is invalid");
    if (!ownerPhone?.trim()) createValidationError("Owner phone is required");

    next();
  } catch (err) {
    next(err);
  }
};

const validateUpdateTenant = (req, res, next) => {
  try {
    if (
      req.body.ownerEmail !== undefined &&
      req.body.ownerEmail &&
      !isEmail(req.body.ownerEmail)
    ) {
      createValidationError("Owner email is invalid");
    }
    next();
  } catch (err) {
    next(err);
  }
};

const validateStatusUpdate = (req, res, next) => {
  try {
    const allowed = ["active", "inactive", "suspended"];
    if (!allowed.includes(req.body.status)) {
      createValidationError("Status must be active, inactive or suspended");
    }
    next();
  } catch (err) {
    next(err);
  }
};

const validateRenewSubscription = (req, res, next) => {
  try {
    const { durationDays, startsAt, expiresAt } = req.body;

    if (!durationDays && !(startsAt && expiresAt)) {
      createValidationError(
        "Provide durationDays or both startsAt and expiresAt"
      );
    }

    if (durationDays && Number(durationDays) < 1) {
      createValidationError("durationDays must be greater than zero");
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  validateCreateTenant,
  validateUpdateTenant,
  validateStatusUpdate,
  validateRenewSubscription,
};
