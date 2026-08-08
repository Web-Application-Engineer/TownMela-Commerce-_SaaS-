"use strict";

const mongoose = require("mongoose");

const automationSchema = new mongoose.Schema(
  {
    autoBookShipment: { type: Boolean, default: false },
    autoBookOnStatus: {
      type: String,
      enum: ["confirmed", "processing", "ready_to_ship"],
      default: "ready_to_ship",
    },
    preventDuplicateBooking: { type: Boolean, default: true },
    fallbackToDefaultCourier: { type: Boolean, default: true },
    autoPrintLabel: { type: Boolean, default: false },
  },
  { _id: false, id: false }
);

const statusSyncSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    intervalMinutes: {
      type: Number,
      min: [5, "Status sync interval cannot be less than 5 minutes"],
      max: [1440, "Status sync interval cannot exceed 1440 minutes"],
      default: 30,
    },
    updateOrderStatus: { type: Boolean, default: true },
    markDeliveredOrdersPaid: { type: Boolean, default: false },
    syncOnlyActiveShipments: { type: Boolean, default: true },
  },
  { _id: false, id: false }
);

const codSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    includeDeliveryChargeInCod: { type: Boolean, default: true },
    allowZeroCodAmount: { type: Boolean, default: false },
    maximumCodAmount: {
      type: Number,
      min: [0, "Maximum COD amount cannot be negative"],
      default: 0,
    },
    codFeeType: {
      type: String,
      enum: ["none", "fixed", "percentage"],
      default: "none",
    },
    codFeeValue: {
      type: Number,
      min: [0, "COD fee cannot be negative"],
      default: 0,
    },
  },
  { _id: false, id: false }
);

const deliveryChargeSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    insideDhaka: {
      type: Number,
      min: [0, "Inside Dhaka delivery charge cannot be negative"],
      default: 0,
    },
    dhakaSubArea: {
      type: Number,
      min: [0, "Dhaka sub-area delivery charge cannot be negative"],
      default: 0,
    },
    outsideDhaka: {
      type: Number,
      min: [0, "Outside Dhaka delivery charge cannot be negative"],
      default: 0,
    },
    sameDaySurcharge: {
      type: Number,
      min: [0, "Same-day surcharge cannot be negative"],
      default: 0,
    },
    expressSurcharge: {
      type: Number,
      min: [0, "Express surcharge cannot be negative"],
      default: 0,
    },
    freeDeliveryThreshold: {
      type: Number,
      min: [0, "Free delivery threshold cannot be negative"],
      default: 0,
    },
    chargeCustomer: { type: Boolean, default: true },
  },
  { _id: false, id: false }
);

const returnChargeSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    reverseDeliveryCharge: {
      type: Number,
      min: [0, "Reverse delivery charge cannot be negative"],
      default: 0,
    },
    redeliveryCharge: {
      type: Number,
      min: [0, "Redelivery charge cannot be negative"],
      default: 0,
    },
    deductFromRefund: { type: Boolean, default: false },
    recordAsBusinessExpense: { type: Boolean, default: true },
  },
  { _id: false, id: false }
);

const addressValidationSchema = new mongoose.Schema(
  {
    requireDistrict: { type: Boolean, default: true },
    requireArea: { type: Boolean, default: true },
    requirePostalCode: { type: Boolean, default: false },
    requireCustomerPhone: { type: Boolean, default: true },
    normalizeBangladeshPhone: { type: Boolean, default: true },
  },
  { _id: false, id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    notifyOnBookingFailure: { type: Boolean, default: true },
    notifyOnStatusSyncFailure: { type: Boolean, default: true },
    notifyOnDelivery: { type: Boolean, default: false },
    notifyOnReturn: { type: Boolean, default: true },
  },
  { _id: false, id: false }
);

const courierSettingSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
      unique: true,
      immutable: true,
      index: true,
    },
    defaultCourier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Courier",
      default: null,
    },
    defaultDeliveryType: {
      type: String,
      enum: ["regular", "express", "same_day"],
      default: "regular",
    },
    automation: { type: automationSchema, default: () => ({}) },
    statusSync: { type: statusSyncSchema, default: () => ({}) },
    cod: { type: codSchema, default: () => ({}) },
    deliveryCharge: { type: deliveryChargeSchema, default: () => ({}) },
    returnCharge: { type: returnChargeSchema, default: () => ({}) },
    addressValidation: {
      type: addressValidationSchema,
      default: () => ({}),
    },
    notifications: { type: notificationSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  }
);

courierSettingSchema.index(
  { tenant: 1, isActive: 1 },
  { name: "courier_setting_tenant_active" }
);

courierSettingSchema.pre("validate", function validateCourierSetting() {
  if (
    this.cod?.codFeeType === "percentage" &&
    this.cod.codFeeValue > 100
  ) {
    this.invalidate(
      "cod.codFeeValue",
      "Percentage-based COD fee cannot exceed 100"
    );
  }
});

const CourierSetting =
  mongoose.models.CourierSetting ||
  mongoose.model("CourierSetting", courierSettingSchema);

module.exports = CourierSetting;
