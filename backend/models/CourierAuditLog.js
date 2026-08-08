"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const auditErrorSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: null,
    },

    code: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    statusCode: {
      type: Number,
      min: 100,
      max: 599,
      default: null,
    },

    provider: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: null,
    },

    stack: {
      type: String,
      maxlength: 12000,
      default: null,
      select: false,
    },

    details: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
    id: false,
  }
);

const removeSensitiveAuditFields = (_document, returnedObject) => {
  delete returnedObject.request;
  delete returnedObject.response;

  if (returnedObject.error) {
    delete returnedObject.error.stack;
  }

  return returnedObject;
};

const courierAuditLogSchema = new Schema(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      index: true,
    },

    level: {
      type: String,
      required: true,
      immutable: true,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
      index: true,
    },

    source: {
      type: String,
      required: true,
      immutable: true,
      enum: [
        "api",
        "webhook",
        "scheduler",
        "retry_queue",
        "bulk_operation",
        "system",
        "manual",
      ],
      default: "system",
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      immutable: true,
      default: null,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      immutable: true,
      default: null,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      immutable: true,
      default: null,
      index: true,
    },

    actorType: {
      type: String,
      immutable: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: "system",
    },

    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "CourierShipment",
      immutable: true,
      default: null,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      immutable: true,
      default: null,
      index: true,
    },

    courierCode: {
      type: String,
      immutable: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: null,
      index: true,
    },

    operation: {
      type: String,
      immutable: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: null,
      index: true,
    },

    status: {
      type: String,
      immutable: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: null,
      index: true,
    },

    success: {
      type: Boolean,
      immutable: true,
      default: null,
      index: true,
    },

    message: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 4000,
      default: null,
    },

    correlationId: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 200,
      default: null,
      index: true,
    },

    requestId: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 200,
      default: null,
      index: true,
    },

    webhookId: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 200,
      default: null,
      index: true,
    },

    retryJobId: {
      type: Schema.Types.ObjectId,
      ref: "CourierRetryJob",
      immutable: true,
      default: null,
      index: true,
    },

    bulkOperationId: {
      type: Schema.Types.ObjectId,
      ref: "CourierBulkOperation",
      immutable: true,
      default: null,
      index: true,
    },

    ipAddress: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 100,
      default: null,
    },

    userAgent: {
      type: String,
      immutable: true,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    before: {
      type: Schema.Types.Mixed,
      immutable: true,
      default: null,
    },

    after: {
      type: Schema.Types.Mixed,
      immutable: true,
      default: null,
    },

    request: {
      type: Schema.Types.Mixed,
      immutable: true,
      default: null,
      select: false,
    },

    response: {
      type: Schema.Types.Mixed,
      immutable: true,
      default: null,
      select: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
      immutable: true,
      default: null,
    },

    error: {
      type: auditErrorSchema,
      immutable: true,
      default: null,
    },

    occurredAt: {
      type: Date,
      required: true,
      immutable: true,
      default: Date.now,
      index: true,
    },

    createdAt: {
      type: Date,
      required: true,
      immutable: true,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "courier_audit_logs",
    timestamps: false,
    versionKey: false,
    minimize: false,
    strict: true,
    autoIndex: process.env.NODE_ENV !== "production",

    toJSON: {
      virtuals: false,
      getters: false,
      transform: removeSensitiveAuditFields,
    },

    toObject: {
      virtuals: false,
      getters: false,
      transform: removeSensitiveAuditFields,
    },
  }
);

/* =========================================================
   INDEXES
========================================================= */

courierAuditLogSchema.index(
  {
    tenantId: 1,
    occurredAt: -1,
    _id: -1,
  },
  {
    name: "tenant_timeline_idx",
  }
);

courierAuditLogSchema.index(
  {
    tenantId: 1,
    shipmentId: 1,
    occurredAt: 1,
    _id: 1,
  },
  {
    name: "tenant_shipment_timeline_idx",
    partialFilterExpression: {
      shipmentId: {
        $type: "objectId",
      },
    },
  }
);

courierAuditLogSchema.index(
  {
    tenantId: 1,
    orderId: 1,
    occurredAt: -1,
  },
  {
    name: "tenant_order_timeline_idx",
    partialFilterExpression: {
      orderId: {
        $type: "objectId",
      },
    },
  }
);

courierAuditLogSchema.index(
  {
    tenantId: 1,
    courierCode: 1,
    eventType: 1,
    occurredAt: -1,
  },
  {
    name: "tenant_courier_event_idx",
    partialFilterExpression: {
      courierCode: {
        $type: "string",
      },
    },
  }
);

courierAuditLogSchema.index(
  {
    tenantId: 1,
    level: 1,
    success: 1,
    occurredAt: -1,
  },
  {
    name: "tenant_level_success_idx",
  }
);

courierAuditLogSchema.index(
  {
    correlationId: 1,
    occurredAt: -1,
  },
  {
    name: "correlation_timeline_idx",
    partialFilterExpression: {
      correlationId: {
        $type: "string",
      },
    },
  }
);

courierAuditLogSchema.index(
  {
    webhookId: 1,
    occurredAt: -1,
  },
  {
    name: "webhook_timeline_idx",
    partialFilterExpression: {
      webhookId: {
        $type: "string",
      },
    },
  }
);

/* =========================================================
   IMMUTABILITY
========================================================= */

courierAuditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"],
  function preventAuditMutation(next) {
    const error = new Error(
      "Courier audit logs are immutable and cannot be updated"
    );

    error.code = "COURIER_AUDIT_IMMUTABLE";

    return next(error);
  }
);

courierAuditLogSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete"],
  function allowControlledDeletion(next) {
    const options = this.getOptions
      ? this.getOptions()
      : {};

    if (options.allowAuditDeletion === true) {
      return next();
    }

    const error = new Error(
      "Courier audit logs cannot be deleted without allowAuditDeletion"
    );

    error.code = "COURIER_AUDIT_DELETE_FORBIDDEN";

    return next(error);
  }
);

/* =========================================================
   STATICS
========================================================= */

courierAuditLogSchema.statics.deleteExpiredBefore =
  function deleteExpiredBefore(cutoff) {
    if (
      !(cutoff instanceof Date) ||
      Number.isNaN(cutoff.getTime())
    ) {
      throw new TypeError(
        "A valid cutoff Date is required"
      );
    }

    return this.deleteMany(
      {
        occurredAt: {
          $lt: cutoff,
        },
      },
      {
        allowAuditDeletion: true,
      }
    );
  };

courierAuditLogSchema.statics.findShipmentTimeline =
  function findShipmentTimeline({
    tenantId,
    shipmentId,
    limit = 250,
  }) {
    if (!shipmentId) {
      throw new TypeError(
        "shipmentId is required"
      );
    }

    const safeLimit = Math.min(
      Math.max(Number(limit) || 1, 1),
      1000
    );

    const query = {
      shipmentId,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    return this.find(query)
      .sort({
        occurredAt: 1,
        _id: 1,
      })
      .limit(safeLimit)
      .lean();
  };

/* =========================================================
   MODEL
========================================================= */

const CourierAuditLog =
  mongoose.models.CourierAuditLog ||
  mongoose.model(
    "CourierAuditLog",
    courierAuditLogSchema
  );

module.exports = CourierAuditLog;
