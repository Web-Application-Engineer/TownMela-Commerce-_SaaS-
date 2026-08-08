const mongoose = require("mongoose");

const tenantCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const TenantCounter =
  mongoose.models.TenantCounter ||
  mongoose.model("TenantCounter", tenantCounterSchema);

module.exports = TenantCounter;