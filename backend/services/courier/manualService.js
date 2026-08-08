"use strict";

const { randomUUID } = require("crypto");

/* =========================================================
   MANUAL COURIER SERVICE

   Used when shipments are managed internally without a
   third-party courier API.
========================================================= */

const PROVIDER_CODE = "manual";
const DEFAULT_CURRENCY = "BDT";

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeNonNegativeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(numberValue, 0);
};

class ManualCourierService {
  /* =====================================================
     INTERNAL HELPERS
  ===================================================== */

  createServiceError(message, statusCode = 400, code = "MANUAL_COURIER_ERROR") {
    const error = new Error(message);

    error.name = "ManualCourierServiceError";
    error.code = code;
    error.statusCode = statusCode;
    error.provider = PROVIDER_CODE;

    return error;
  }

  getShipmentReference(shipment) {
    return normalizeString(
      shipment?.shipmentNumber ||
        shipment?.trackingNumber ||
        shipment?.consignmentId ||
        shipment?.orderNumber ||
        shipment?._id?.toString?.()
    );
  }

  generateBookingId() {
    return `MAN-${Date.now()}-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`;
  }

  /* =====================================================
     VALIDATE SHIPMENT
  ===================================================== */

  async validateShipment(shipment) {
    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const errors = [];
    const recipient = shipment.recipient || {};
    const orderNumber = normalizeString(shipment.orderNumber);
    const recipientName = normalizeString(recipient.name);
    const recipientPhone = normalizeString(recipient.phone);
    const recipientAddress = normalizeString(
      recipient.addressLine || recipient.address
    );

    if (!orderNumber) {
      errors.push("Order number is required");
    }

    if (!recipientName) {
      errors.push("Recipient name is required");
    }

    if (!recipientPhone) {
      errors.push("Recipient phone is required");
    }

    if (!recipientAddress) {
      errors.push("Recipient address is required");
    }

    if (errors.length > 0) {
      const error = this.createServiceError(
        errors.join(", "),
        400,
        "SHIPMENT_VALIDATION_FAILED"
      );

      error.validationErrors = errors;

      throw error;
    }

    return {
      success: true,
      provider: PROVIDER_CODE,
      message: "Shipment validation successful",
      normalized: {
        orderNumber,
        recipientName,
        recipientPhone,
        recipientAddress,
      },
    };
  }

  /* =====================================================
     CREATE SHIPMENT
  ===================================================== */

  async createShipment(shipment) {
    await this.validateShipment(shipment);

    const reference = this.getShipmentReference(shipment);
    const bookingId = this.generateBookingId();
    const bookedAt = new Date();

    return {
      success: true,
      provider: PROVIDER_CODE,

      shipment: {
        bookingStatus: "booked",
        deliveryStatus: "booked",
        bookingId,
        trackingNumber: reference || bookingId,
        consignmentId: reference || bookingId,
        courierReference: reference || bookingId,
        courierStatus: "booked",
        statusMessage: "Shipment booked manually",
        bookedAt,
      },

      raw: null,
      apiLog: null,
    };
  }

  /* =====================================================
     CANCEL SHIPMENT
  ===================================================== */

  async cancelShipment(shipment, courier = null, options = {}) {
    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    if (shipment.deliveryStatus === "delivered") {
      throw this.createServiceError(
        "Delivered shipment cannot be cancelled",
        409,
        "DELIVERED_SHIPMENT_CANNOT_BE_CANCELLED"
      );
    }

    const reason =
      normalizeString(options.reason) ||
      normalizeString(shipment.cancellationReason) ||
      "Shipment cancelled manually";

    return {
      success: true,
      provider: PROVIDER_CODE,
      remoteCancellation: false,

      shipment: {
        bookingStatus: "cancelled",
        deliveryStatus: "cancelled",
        courierStatus: "cancelled",
        statusMessage: reason,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },

      raw: null,
      apiLog: null,
    };
  }

  /* =====================================================
     TRACK SHIPMENT
  ===================================================== */

  async trackShipment(shipment) {
    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const reference = this.getShipmentReference(shipment);
    const checkedAt = new Date();

    return {
      success: true,
      provider: PROVIDER_CODE,

      tracking: {
        trackingNumber: shipment.trackingNumber || reference || null,
        consignmentId: shipment.consignmentId || reference || null,
        bookingStatus: shipment.bookingStatus || "pending",
        deliveryStatus: shipment.deliveryStatus || "pending",
        courierStatus:
          shipment.courierStatus ||
          shipment.deliveryStatus ||
          shipment.bookingStatus ||
          "pending",
        currentLocation: shipment.currentLocation || null,
        statusMessage:
          shipment.statusMessage ||
          "Shipment is managed manually",
        trackingUrl: null,
        checkedAt,
      },

      raw: null,
      apiLog: null,
    };
  }

  /* =====================================================
     SYNC SHIPMENT
  ===================================================== */

  async syncShipment(shipment) {
    const result = await this.trackShipment(shipment);
    const lastSyncedAt = new Date();

    return {
      success: true,
      provider: PROVIDER_CODE,

      shipment: {
        bookingStatus: result.tracking.bookingStatus,
        deliveryStatus: result.tracking.deliveryStatus,
        courierStatus: result.tracking.courierStatus,
        currentLocation: result.tracking.currentLocation,
        statusMessage: result.tracking.statusMessage,
        trackingNumber: result.tracking.trackingNumber,
        consignmentId: result.tracking.consignmentId,
        lastSyncedAt,
      },

      raw: null,
      apiLog: null,
    };
  }

  /* =====================================================
     CALCULATE CHARGE
  ===================================================== */

  async calculateCharge(shipment) {
    if (!shipment || typeof shipment !== "object") {
      throw this.createServiceError(
        "Shipment is required",
        400,
        "SHIPMENT_REQUIRED"
      );
    }

    const pricing = shipment.pricing || {};

    return {
      success: true,
      provider: PROVIDER_CODE,

      charge: {
        shippingCharge: normalizeNonNegativeNumber(
          pricing.shippingCharge
        ),
        courierCharge: normalizeNonNegativeNumber(
          pricing.courierCharge
        ),
        codAmount: normalizeNonNegativeNumber(
          pricing.codAmount ??
            shipment.codAmount ??
            shipment.collectionAmount
        ),
        currency:
          normalizeString(pricing.currency).toUpperCase() ||
          DEFAULT_CURRENCY,
        calculatedBy: "stored_pricing",
      },
    };
  }

  /* =====================================================
     HEALTH CHECK
  ===================================================== */

  async health() {
    return {
      success: true,
      provider: PROVIDER_CODE,
      status: "healthy",
      mode: "local",
      timestamp: new Date(),
    };
  }
}

/* =========================================================
   EXPORT SINGLETON
========================================================= */

module.exports = new ManualCourierService();
