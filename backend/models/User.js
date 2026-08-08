"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
      select: false,
    },

    name: {
      type: String,
      required: [
        true,
        "User name is required",
      ],
      trim: true,
      maxlength: [
        100,
        "User name cannot exceed 100 characters",
      ],
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: [
        150,
        "Email address cannot exceed 150 characters",
      ],
      match: [
        /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [
        /^01\d{9}$/,
        "Please enter a valid 11-digit phone number",
      ],
    },

    password: {
      type: String,
      required: [
        true,
        "Password is required",
      ],
      minlength: [
        6,
        "Password must contain at least 6 characters",
      ],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      lowercase: true,
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({
  tenant: 1,
  role: 1,
  isActive: 1,
});

/* =========================================================
   NORMALIZATION
========================================================= */

userSchema.pre(
  "validate",
  function normalizeUser(next) {
    if (typeof this.name === "string") {
      this.name = this.name.trim();
    }

    if (typeof this.email === "string") {
      this.email = this.email
        .trim()
        .toLowerCase();

      if (!this.email) {
        this.email = undefined;
      }
    }

    if (typeof this.phone === "string") {
      this.phone = this.phone.trim();

      if (!this.phone) {
        this.phone = undefined;
      }
    }

    if (typeof this.role === "string") {
      this.role = this.role
        .trim()
        .toLowerCase();
    }

    if (!this.email && !this.phone) {
      return next(
        new Error(
          "Email address or phone number is required"
        )
      );
    }

    return next();
  }
);

/* =========================================================
   HASH PASSWORD BEFORE SAVING
========================================================= */

userSchema.pre(
  "save",
  async function hashPassword(next) {
    try {
      if (!this.isModified("password")) {
        return next();
      }

      const salt = await bcrypt.genSalt(10);

      this.password = await bcrypt.hash(
        this.password,
        salt
      );

      return next();
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   PASSWORD VERIFICATION
========================================================= */

userSchema.methods.comparePassword =
  async function comparePassword(
    candidatePassword
  ) {
    if (
      typeof candidatePassword !==
        "string" ||
      !candidatePassword ||
      !this.password
    ) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

/* =========================================================
   SAFE OUTPUT
========================================================= */

const removeSensitiveFields = (
  _document,
  returnedObject
) => {
  delete returnedObject.password;
  delete returnedObject.resetPasswordToken;
  delete returnedObject.resetPasswordExpire;
  delete returnedObject.isDeleted;

  return returnedObject;
};

userSchema.set("toJSON", {
  transform: removeSensitiveFields,
});

userSchema.set("toObject", {
  transform: removeSensitiveFields,
});

/* =========================================================
   MODEL
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

module.exports = User;
