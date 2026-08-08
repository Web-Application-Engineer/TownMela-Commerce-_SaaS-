"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const RETRY_STATUSES = [
  "pending",
  "processing",
  "completed",
  "dead_letter",
];

const RETRY_OPERATIONS = [
  "create_shipment",
  "sync_shipment",
  "track_shipment",
  "cancel_shipment",
  "calculate_charge",
];

const retryErrorSchema = new Schema(
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

    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
    id: false,
  }
);

const courierRetryJobSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "CourierShipment",
      required: true,
      index: true,
    },

    courierCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },

    operation: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: RETRY_OPERATIONS,
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },

    deduplicationKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      required: true,
      enum: RETRY_STATUSES,
      default: "pending",
      index: true,
    },

    retryCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    maxRetries: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },

    availableAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    lockedBy: {
      type: String,
      trim: true,
      maxlength: 250,
      default: null,
      index: true,
    },

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    runId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
      index: true,
    },

    lastError: {
      type: retryErrorSchema,
      default: null,
    },

    lastResult: {
      type: Schema.Types.Mixed,
      default: null,
    },

    deadLetterReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    deadLetteredAt: {
      type: Date,
      default: null,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "courier_retry_jobs",
    timestamps: true,
    versionKey: false,
    minimize: false,
    strict: true,
    autoIndex: process.env.NODE_ENV !== "production",

    toJSON: {
      virtuals: true,
      getters: false,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      virtuals: true,
      getters: false,
    },
  }
);

/* =========================================================
   INDEXES
========================================================= */

courierRetryJobSchema.index(
  {
    status: 1,
    availableAt: 1,
    retryCount: 1,
    createdAt: 1,
    _id: 1,
  },
  {
    name: "retry_claim_queue_idx",
  }
);

courierRetryJobSchema.index(
  {
    tenantId: 1,
    status: 1,
    availableAt: 1,
  },
  {
    name: "tenant_retry_queue_idx",
  }
);

courierRetryJobSchema.index(
  {
    tenantId: 1,
    shipmentId: 1,
    createdAt: -1,
  },
  {
    name: "tenant_shipment_retry_history_idx",
  }
);

/*
  Enqueue uses an upsert. Without a unique active-job index, two concurrent
  requests can both insert the same pending retry job. Completed and
  dead-letter jobs are intentionally excluded so a later retry cycle may
  reuse the same deduplication key.
*/
courierRetryJobSchema.index(
  {
    deduplicationKey: 1,
  },
  {
    unique: true,
    name: "uniq_active_retry_deduplication_key",
    partialFilterExpression: {
      status: {
        $in: ["pending", "processing"],
      },
    },
  }
);

courierRetryJobSchema.index(
  {
    deduplicationKey: 1,
    status: 1,
    updatedAt: -1,
  },
  {
    name: "retry_deduplication_lookup_idx",
  }
);

courierRetryJobSchema.index(
  {
    courierCode: 1,
    operation: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name: "courier_operation_retry_idx",
  }
);

courierRetryJobSchema.index(
  {
    status: 1,
    completedAt: 1,
  },
  {
    name: "completed_retention_idx",
    partialFilterExpression: {
      status: "completed",
      completedAt: {
        $type: "date",
      },
    },
  }
);

courierRetryJobSchema.index(
  {
    status: 1,
    deadLetteredAt: -1,
  },
  {
    name: "dead_letter_history_idx",
    partialFilterExpression: {
      status: "dead_letter",
      deadLetteredAt: {
        $type: "date",
      },
    },
  }
);

courierRetryJobSchema.index(
  {
    status: 1,
    lockedAt: 1,
  },
  {
    name: "stale_processing_lock_idx",
    partialFilterExpression: {
      status: "processing",
      lockedAt: {
        $type: "date",
      },
    },
  }
);

/* =========================================================
   VIRTUALS
========================================================= */

courierRetryJobSchema.virtual("isTerminal").get(function isTerminal() {
  return (
    this.status === "completed" ||
    this.status === "dead_letter"
  );
});

courierRetryJobSchema.virtual("hasRetriesRemaining").get(
  function hasRetriesRemaining() {
    return this.retryCount < this.maxRetries;
  }
);

/* =========================================================
   NORMALIZATION AND STATE CONSISTENCY
========================================================= */

courierRetryJobSchema.pre("validate", function normalizeRetryJob() {
  if (typeof this.courierCode === "string") {
    this.courierCode = this.courierCode.trim().toLowerCase();
  }

  if (typeof this.operation === "string") {
    this.operation = this.operation
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  if (typeof this.status === "string") {
    this.status = this.status.trim().toLowerCase();
  }
});

courierRetryJobSchema.pre("save", function enforceStateConsistency() {
  if (this.status === "pending") {
    this.lockedBy = null;
    this.lockedAt = null;
    this.completedAt = null;
  }

  if (
    this.status === "processing" &&
    (!this.lockedBy || !this.lockedAt)
  ) {
    const error = new Error(
      "Processing retry jobs require lockedBy and lockedAt"
    );

    error.code = "COURIER_RETRY_LOCK_REQUIRED";
    throw error;
  }

  if (this.status === "completed") {
    this.completedAt = this.completedAt || new Date();
    this.lockedBy = null;
    this.lockedAt = null;
    this.deadLetteredAt = null;
    this.deadLetterReason = null;
  }

  if (this.status === "dead_letter") {
    this.deadLetteredAt = this.deadLetteredAt || new Date();
    this.lockedBy = null;
    this.lockedAt = null;
  }
});

/* =========================================================
   STATICS
========================================================= */

courierRetryJobSchema.statics.findDueJobs =
  function findDueJobs({
    limit = 50,
    now = new Date(),
  } = {}) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 1, 1),
      500
    );

    return this.find({
      status: "pending",
      availableAt: {
        $lte: now,
      },
      $expr: {
        $lt: ["$retryCount", "$maxRetries"],
      },
    })
      .sort({
        availableAt: 1,
        createdAt: 1,
        _id: 1,
      })
      .limit(safeLimit)
      .lean();
  };

courierRetryJobSchema.statics.findDeadLetters =
  function findDeadLetters({
    tenantId,
    courierCode,
    page = 1,
    limit = 50,
  } = {}) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Number(limit) || 1, 1),
      250
    );

    const query = {
      status: "dead_letter",
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (courierCode) {
      query.courierCode = String(courierCode)
        .trim()
        .toLowerCase();
    }

    return this.find(query)
      .sort({
        deadLetteredAt: -1,
        _id: -1,
      })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean();
  };

courierRetryJobSchema.statics.releaseStaleLocks =
  function releaseStaleLocks({
    staleBefore,
    availableAt = new Date(),
  }) {
    if (
      !(staleBefore instanceof Date) ||
      Number.isNaN(staleBefore.getTime())
    ) {
      throw new TypeError(
        "A valid staleBefore Date is required"
      );
    }

    return this.updateMany(
      {
        status: "processing",
        lockedAt: {
          $lte: staleBefore,
        },
      },
      {
        $set: {
          status: "pending",
          availableAt,
          lockedBy: null,
          lockedAt: null,
          runId: null,
        },
      }
    );
  };

courierRetryJobSchema.statics.deleteCompletedBefore =
  function deleteCompletedBefore(cutoff) {
    if (
      !(cutoff instanceof Date) ||
      Number.isNaN(cutoff.getTime())
    ) {
      throw new TypeError(
        "A valid cutoff Date is required"
      );
    }

    return this.deleteMany({
      status: "completed",
      completedAt: {
        $lt: cutoff,
      },
    });
  };

/* =========================================================
   METHODS
========================================================= */

courierRetryJobSchema.methods.resetForRetry =
  function resetForRetry() {
    this.status = "pending";
    this.retryCount = 0;
    this.availableAt = new Date();
    this.lockedBy = null;
    this.lockedAt = null;
    this.runId = null;
    this.completedAt = null;
    this.deadLetteredAt = null;
    this.deadLetterReason = null;

    return this;
  };

/* =========================================================
   MODEL
========================================================= */

const CourierRetryJob =
  mongoose.models.CourierRetryJob ||
  mongoose.model(
    "CourierRetryJob",
    courierRetryJobSchema
  );

module.exports = CourierRetryJob;
