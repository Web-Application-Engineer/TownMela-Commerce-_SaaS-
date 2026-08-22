"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const Tenant = require(
  "../models/tenantModel"
);

const sendEmail = require(
  "../utils/sendEmail"
);

/* =========================================================
   GENERAL HELPERS
========================================================= */

const normalizePhone = (phone = "") =>
  String(phone)
    .replace(/\D/g, "")
    .trim();

const normalizeEmail = (email = "") =>
  String(email)
    .trim()
    .toLowerCase();

const normalizeRole = (role = "") =>
  String(role)
    .trim()
    .toLowerCase();

const getFrontendBaseUrl = () =>
  String(
    process.env.FRONTEND_URL ||
      "http://localhost:3000"
  )
    .trim()
    .replace(/\/+$/, "");

const getJwtSecret = () => {
  const secret = String(
    process.env.JWT_SECRET || ""
  ).trim();

  if (!secret) {
    const error = new Error(
      "JWT_SECRET is not configured"
    );

    error.code =
      "JWT_SECRET_MISSING";

    throw error;
  }

  return secret;
};

const generateToken = ({
  userId,
  tenantId = null,
  role = "",
}) => {
  const payload = {
    id: String(userId),
  };

  if (tenantId) {
    payload.tenantId =
      String(tenantId);
  }

  if (role) {
    payload.role =
      normalizeRole(role);
  }

  return jwt.sign(
    payload,
    getJwtSecret(),
    {
      expiresIn:
        process.env
          .JWT_EXPIRES_IN ||
        "7d",

      algorithm: "HS256",
    }
  );
};

/* =========================================================
   CREATE LOGIN QUERY
========================================================= */

const createLoginQuery = (
  loginValue
) => {
  const value = String(
    loginValue || ""
  ).trim();

  if (value.includes("@")) {
    return {
      isEmail: true,

      query: {
        email:
          normalizeEmail(value),
      },
    };
  }

  return {
    isEmail: false,

    query: {
      phone:
        normalizePhone(value),
    },
  };
};

const getRequestedLoginRole = (
  value
) => {
  const loginAs =
    normalizeRole(value);

  if (
    ![
      "user",
      "admin",
      "superadmin",
    ].includes(loginAs)
  ) {
    return "";
  }

  return loginAs;
};

const getRequestTenantId = (
  req
) =>
  String(
    req.headers[
      "x-tenant-id"
    ] ||
      req.body?.tenantId ||
      ""
  ).trim();

/* =========================================================
   SAFE USER RESPONSE
========================================================= */

const sanitizeUser = (user) => {
  const userObject =
    typeof user?.toObject ===
    "function"
      ? user.toObject()
      : {
          ...(user || {}),
        };

  delete userObject.password;
  delete userObject
    .resetPasswordToken;
  delete userObject
    .resetPasswordExpire;
  delete userObject.isDeleted;

  return userObject;
};

const getObjectIdString = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return value.trim();
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return String(
      value._id
    ).trim();
  }

  if (
    typeof value === "object" &&
    value.id
  ) {
    return String(
      value.id
    ).trim();
  }

  try {
    return String(value).trim();
  } catch {
    return "";
  }
};

const resolveTenantId = (
  user
) => {
  const candidates = [
    user?.activeTenantId,
    user?.tenantId,
    user?.tenant_id,
    user?.tenant,
    user?.organizationId,
    user?.organization,
    user?.companyId,
    user?.company,
  ];

  for (
    const candidate
    of candidates
  ) {
    const tenantId =
      getObjectIdString(
        candidate
      );

    if (tenantId) {
      return tenantId;
    }
  }

  return "";
};

/* =========================================================
   COMMON ACCOUNT VALIDATION
========================================================= */

const validateAccountState = (
  user,
  res
) => {
  if (
    user.isDeleted === true
  ) {
    res.status(401).json({
      success: false,

      message:
        "This account is no longer available",
    });

    return false;
  }

  if (
    user.isActive === false
  ) {
    res.status(403).json({
      success: false,

      message:
        "This account has been disabled",
    });

    return false;
  }

  return true;
};

/* =========================================================
   LOAD USER FOR LOGIN
========================================================= */

const findUserForLogin =
  async ({
    query,
    expectedRole,
    tenantId = "",
  }) => {
    const selection = [
      "+password",
    ];

    const optionalSelectedFields =
      [
        "tenant",
        "tenantId",
        "tenant_id",
        "activeTenantId",
        "organization",
        "organizationId",
        "company",
        "companyId",
        "isDeleted",
        "isActive",
        "role",
      ];

    for (
      const field
      of optionalSelectedFields
    ) {
      if (
        User.schema.path(field)
      ) {
        selection.push(
          `+${field}`
        );
      }
    }

    const scopedQuery = {
      ...query,
      role: expectedRole,
    };

    /*
      Super Admin never belongs to a tenant.

      Tenant Admin login must not depend on X-Tenant-Id.
      The tenant is resolved from the matched admin user
      after the email/phone and password are verified.

      Customer login may still be scoped to the current
      storefront tenant when X-Tenant-Id is available.
    */

    if (
      expectedRole ===
      "superadmin"
    ) {
      scopedQuery.tenant = null;
    } else if (
      expectedRole ===
        "user" &&
      tenantId
    ) {
      scopedQuery.tenant =
        tenantId;
    }

    return User.findOne(
      scopedQuery
    ).select(
      selection.join(" ")
    );
  };

/* =========================================================
   REGISTER USER
========================================================= */

const registerUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body || {};

    const normalizedName =
      String(
        name || ""
      ).trim();

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedPhone =
      normalizePhone(phone);

    if (
      !normalizedName ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Name and password are required",
        });
    }

    if (
      !normalizedEmail &&
      !normalizedPhone
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Email address or phone number is required",
        });
    }

    if (
      normalizedPhone &&
      !/^01\d{9}$/.test(
        normalizedPhone
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please enter a valid 11-digit phone number",
        });
    }

    if (
      String(
        password
      ).length < 6
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Password must be at least 6 characters",
        });
    }

    const duplicateConditions =
      [];

    if (normalizedEmail) {
      duplicateConditions.push({
        email:
          normalizedEmail,
      });
    }

    if (normalizedPhone) {
      duplicateConditions.push({
        phone:
          normalizedPhone,
      });
    }

    const existingUser =
      await User.findOne({
        $or:
          duplicateConditions,
      });

    if (existingUser) {
      let message =
        "User already exists";

      if (
        normalizedEmail &&
        existingUser.email ===
          normalizedEmail
      ) {
        message =
          "An account already exists with this email address";
      }

      if (
        normalizedPhone &&
        existingUser.phone ===
          normalizedPhone
      ) {
        message =
          "An account already exists with this phone number";
      }

      return res
        .status(400)
        .json({
          success: false,
          message,
        });
    }

    const userData = {
      name:
        normalizedName,

      password:
        String(password),

      role: "user",
    };

    if (normalizedEmail) {
      userData.email =
        normalizedEmail;
    }

    if (normalizedPhone) {
      userData.phone =
        normalizedPhone;
    }

    const user =
      await User.create(
        userData
      );

    return res
      .status(201)
      .json({
        success: true,

        message:
          "User registered successfully",

        user:
          sanitizeUser(user),
      });
  } catch (error) {
    console.error(
      "Register user error:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "An account already exists with this email or phone number",
        });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Server error",
      });
  }
};

/* =========================================================
   SHARED LOGIN PROCESS
========================================================= */

const performLogin = async ({
  req,
  res,
  expectedRole,
}) => {
  const {
    identifier,
    email,
    phone,
    password,
  } = req.body || {};

  const loginValue =
    String(
      identifier ||
        email ||
        phone ||
        ""
    ).trim();

  if (
    !loginValue ||
    !password
  ) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          "Phone or email and password are required",
      });
  }

  const {
    isEmail,
    query,
  } =
    createLoginQuery(
      loginValue
    );

  if (
    !isEmail &&
    !/^01\d{9}$/.test(
      query.phone
    )
  ) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          "Please enter a valid phone number or email address",
      });
  }

  const requestTenantId =
    getRequestTenantId(req);

  const user =
    await findUserForLogin({
      query,
      expectedRole,

      /*
        Tenant Admin tenant context comes from the matched
        User document—not from browser localStorage/header.
      */
      tenantId:
        expectedRole === "user"
          ? requestTenantId
          : "",
    });

  if (
    !user ||
    !user.password
  ) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          "Invalid phone/email or password",
      });
  }

  if (
    !validateAccountState(
      user,
      res
    )
  ) {
    return null;
  }

  const isPasswordMatch =
    typeof user
      .comparePassword ===
    "function"
      ? await user
          .comparePassword(
            String(password)
          )
      : await bcrypt.compare(
          String(password),
          user.password
        );

  if (!isPasswordMatch) {
    return res
      .status(400)
      .json({
        success: false,

        message:
          "Invalid phone/email or password",
      });
  }

  const normalizedUserRole =
    normalizeRole(
      user.role
    );

  if (
    normalizedUserRole !==
    expectedRole
  ) {
    return res
      .status(403)
      .json({
        success: false,

        message:
          expectedRole ===
          "superadmin"
            ? "Access denied. Super Admin account required."
            : expectedRole ===
                "admin"
              ? "Access denied. Tenant Admin account required."
              : "Access denied. Customer account required.",
      });
  }

  const tenantId =
    resolveTenantId(user);

  if (
    expectedRole ===
      "admin" &&
    !tenantId
  ) {
    return res
      .status(403)
      .json({
        success: false,

        message:
          "No tenant is assigned to this admin account.",
      });
  }

  if (
    expectedRole ===
      "user" &&
    requestTenantId &&
    tenantId !==
      requestTenantId
  ) {
    return res
      .status(403)
      .json({
        success: false,

        message:
          "This account does not belong to the current store.",
      });
  }

  const token =
    generateToken({
      userId:
        user._id,

      tenantId:
        tenantId || null,

      role:
        normalizedUserRole,
    });

  const safeUser =
    sanitizeUser(user);

  safeUser.tenantId =
    tenantId || null;

  return res
    .status(200)
    .json({
      success: true,

      message:
        expectedRole ===
        "superadmin"
          ? "Super Admin login successful"
          : expectedRole ===
              "admin"
            ? "Tenant Admin login successful"
            : "Login successful",

      token,

      tenantId:
        tenantId || null,

      user:
        safeUser,
    });
};

/* =========================================================
   LOGIN CUSTOMER
========================================================= */

const loginUser = async (
  req,
  res
) => {
  try {
    return await performLogin({
      req,
      res,
      expectedRole: "user",
    });
  } catch (error) {
    console.error(
      "Login user error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Server error",
      });
  }
};

/* =========================================================
   LOGIN ADMIN / SUPER ADMIN
========================================================= */

const loginAdmin = async (
  req,
  res
) => {
  try {
    const loginAs =
      getRequestedLoginRole(
        req.body?.loginAs
      );

    if (
      ![
        "admin",
        "superadmin",
      ].includes(loginAs)
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "loginAs must be admin or superadmin",
        });
    }

    return await performLogin({
      req,
      res,
      expectedRole:
        loginAs,
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Server error",
      });
  }
};

/* =========================================================
   FORGOT SUPER ADMIN PASSWORD
========================================================= */

const forgotAdminPassword = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(
      req.body?.email ||
        req.body?.identifier
    );

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please enter a valid email address",
        });
    }

    /*
      Super Admin password recovery only accepts the
      registered email address of the active Super Admin
      account.
    */

    const user =
      await User.findOne({
        email,
        role: "superadmin",
        tenant: null,
      }).select(
        "+isDeleted +isActive"
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "This Super Admin account email is wrong.",
        });
    }

    if (
      user.isDeleted === true ||
      user.isActive === false
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "This Super Admin account email is wrong.",
        });
    }

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const hashedResetToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const resetPasswordExpire =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          resetPasswordToken:
            hashedResetToken,

          resetPasswordExpire,
        },
      }
    );

    const resetUrl =
      `${getFrontendBaseUrl()}` +
      `/admin/reset-password` +
      `?token=${encodeURIComponent(
        resetToken
      )}`;

    try {
      await sendEmail({
        to: user.email,

        subject:
          "Reset your TownMela Super Admin password",

        text:
          `A password reset was requested for your TownMela Super Admin account.\n\n` +
          `Reset your password using this link:\n${resetUrl}\n\n` +
          `This link will expire in 10 minutes.\n\n` +
          `If you did not request this reset, you can ignore this email.`,

        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
            <h2 style="color:#0B1F3A">
              TownMela Super Admin Password Reset
            </h2>

            <p>
              A password reset was requested for your TownMela Super Admin account.
            </p>

            <p>
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#FF6900;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:700;
                "
              >
                Reset Password
              </a>
            </p>

            <p>
              This link will expire in 10 minutes.
            </p>

            <p>
              If you did not request this reset, you can ignore this email.
            </p>
          </div>
        `,
      });
    } catch (mailError) {
      /*
        Remove the reset token if the email
        could not be delivered.
      */

      await User.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            resetPasswordToken:
              null,

            resetPasswordExpire:
              null,
          },
        }
      );

      throw mailError;
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "A password reset link has been sent to your Super Admin email address.",
      });
  } catch (error) {
    console.error(
      "Forgot Super Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to process password reset request",
      });
  }
};

/* =========================================================
   RESET SUPER ADMIN PASSWORD
========================================================= */

const resetAdminPassword = async (
  req,
  res
) => {
  try {
    const token = String(
      req.body?.token || ""
    ).trim();

    const password = String(
      req.body?.password || ""
    );

    const confirmPassword =
      String(
        req.body?.confirmPassword ||
          ""
      );

    if (
      !token ||
      !password ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Reset token, new password and password confirmation are required",
        });
    }

    if (
      password !==
      confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Passwords do not match",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Password must be at least 6 characters",
        });
    }

    const hashedResetToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
      await User.findOne({
        role: "superadmin",

        tenant: null,

        resetPasswordToken:
          hashedResetToken,

        resetPasswordExpire: {
          $gt: new Date(),
        },
      }).select(
        "+isDeleted +isActive"
      );

    if (!user) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Password reset link is invalid or has expired",
        });
    }

    if (
      !validateAccountState(
        user,
        res
      )
    ) {
      return null;
    }

    /*
      Use a targeted update so unrelated user fields
      and existing account structure remain untouched.
    */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          password:
            hashedPassword,

          resetPasswordToken:
            null,

          resetPasswordExpire:
            null,
        },
      }
    );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Super Admin password has been reset successfully",
      });
  } catch (error) {
    console.error(
      "Reset Super Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to reset password",
      });
  }
};

/* =========================================================
   CHANGE SUPER ADMIN PASSWORD
========================================================= */

const changeAdminPassword = async (
  req,
  res
) => {
  try {
    const currentPassword =
      String(
        req.body?.currentPassword ||
          ""
      );

    const newPassword =
      String(
        req.body?.newPassword ||
          ""
      );

    const confirmPassword =
      String(
        req.body?.confirmPassword ||
          ""
      );

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Current password, new password and password confirmation are required",
        });
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New passwords do not match",
        });
    }

    if (
      newPassword.length < 6
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New password must be at least 6 characters",
        });
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New password must be different from the current password",
        });
    }

    const userId =
      String(
        req.user?._id ||
          req.auth?.userId ||
          ""
      ).trim();

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication is required",
        });
    }

    /*
      Query the authenticated Super Admin directly and
      explicitly include the password field.

      Use a targeted update instead of user.save()
      so unrelated user fields and current project
      behavior remain untouched.
    */

    const user =
      await User.findOne({
        _id: userId,
        role: "superadmin",
        tenant: null,
      }).select(
        "+password +isDeleted +isActive"
      );

    if (
      !user ||
      !user.password
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Super Admin account is not available",
        });
    }

    if (
      !validateAccountState(
        user,
        res
      )
    ) {
      return null;
    }

    const isPasswordMatch =
      typeof user
        .comparePassword ===
        "function"
        ? await user
            .comparePassword(
              currentPassword
            )
        : await bcrypt.compare(
            currentPassword,
            user.password
          );

    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Current password is incorrect",
        });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          password:
            hashedPassword,

          resetPasswordToken:
            null,

          resetPasswordExpire:
            null,
        },
      }
    );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Super Admin password changed successfully",
      });
  } catch (error) {
    console.error(
      "Change Super Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to change password",
      });
  }
};

/* =========================================================
   CHANGE TENANT ADMIN PASSWORD
========================================================= */

const changeTenantAdminPassword = async (
  req,
  res
) => {
  try {
    const currentPassword =
      String(
        req.body?.currentPassword ||
          ""
      );

    const newPassword =
      String(
        req.body?.newPassword ||
          ""
      );

    const confirmPassword =
      String(
        req.body?.confirmPassword ||
          ""
      );

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Current password, new password and password confirmation are required",
        });
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New passwords do not match",
        });
    }

    if (
      newPassword.length < 6
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New password must be at least 6 characters",
        });
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "New password must be different from the current password",
        });
    }

    const userId =
      String(
        req.user?._id ||
          req.auth?.userId ||
          ""
      ).trim();

    const tenantId =
      resolveTenantId(
        req.user
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication is required",
        });
    }

    if (!tenantId) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "No tenant is assigned to this admin account",
        });
    }

    /*
      The authenticated user ID and the tenant stored on
      that user are both required. This keeps the password
      change fully tenant-isolated.
    */

    const user =
      await User.findOne({
        _id: userId,
        tenant: tenantId,
        role: "admin",
      }).select(
        "+password +isDeleted +isActive"
      );

    if (
      !user ||
      !user.password
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Tenant Admin account is not available",
        });
    }

    if (
      !validateAccountState(
        user,
        res
      )
    ) {
      return null;
    }

    const isPasswordMatch =
      typeof user
        .comparePassword ===
        "function"
        ? await user
            .comparePassword(
              currentPassword
            )
        : await bcrypt.compare(
            currentPassword,
            user.password
          );

    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Current password is incorrect",
        });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    await User.updateOne(
      {
        _id: user._id,
        tenant: tenantId,
        role: "admin",
      },
      {
        $set: {
          password:
            hashedPassword,

          mustChangePassword:
            false,

          resetPasswordToken:
            null,

          resetPasswordExpire:
            null,
        },
      }
    );

    return res
      .status(200)
      .json({
        success: true,

        mustChangePassword:
          false,

        message:
          "Tenant Admin password changed successfully",
      });
  } catch (error) {
    console.error(
      "Change Tenant Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to change password",
      });
  }
};

/* =========================================================
   FORGOT TENANT ADMIN PASSWORD
========================================================= */

const forgotTenantAdminPassword = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(
      req.body?.email ||
        req.body?.identifier
    );

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please enter a valid email address",
        });
    }

    /*
      Tenant Admin password recovery must use the exact
      email address assigned to the Tenant Admin account
      when the tenant was created.
    */

    const user =
      await User.findOne({
        email,
        role: "admin",

        tenant: {
          $ne: null,
        },
      }).select(
        "+tenant +isDeleted +isActive"
      );

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "This email does not match any Tenant Admin account.",
        });
    }

    if (
      user.isDeleted === true ||
      user.isActive === false
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "This Tenant Admin account email is wrong.",
        });
    }

    /*
      Tenant Admin recovery emails use the tenant's own
      Store Name as the visible sender display name.

      The actual authenticated SMTP email address remains
      unchanged so SMTP authentication and delivery stay
      under the TownMela mail account.
    */

    const tenant =
      user.tenant
        ? await Tenant.findById(
            user.tenant
          ).select(
            "storeName businessName"
          )
        : null;

    const tenantStoreName =
      String(
        tenant?.storeName ||
          tenant?.businessName ||
          "TownMela"
      ).trim() ||
      "TownMela";

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const hashedResetToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const resetPasswordExpire =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    await User.updateOne(
      {
        _id: user._id,
        role: "admin",
      },
      {
        $set: {
          resetPasswordToken:
            hashedResetToken,

          resetPasswordExpire,
        },
      }
    );

    const resetUrl =
      `${getFrontendBaseUrl()}` +
      `/tenant-admin/reset-password` +
      `?token=${encodeURIComponent(
        resetToken
      )}`;

    try {
      await sendEmail({
        to: user.email,

        fromName:
          tenantStoreName,

        subject:
          `${tenantStoreName} Password Reset`,

        text:
          `Hello,\n\n` +
          `We received a request to reset the password for your ${tenantStoreName} Tenant Admin account.\n\n` +
          `Use the secure link below to set a new password:\n${resetUrl}\n\n` +
          `This link expires in 10 minutes.\n\n` +
          `If you did not request this password reset, you can safely ignore this email.\n\n` +
          `${tenantStoreName}`,

        html: `
          <div
            style="
              max-width:560px;
              margin:0 auto;
              padding:24px;
              font-family:Arial,sans-serif;
              line-height:1.6;
              color:#1f2937;
              background:#ffffff;
            "
          >
            <h2
              style="
                margin:0 0 16px;
                color:#0B1F3A;
                font-size:22px;
              "
            >
              ${tenantStoreName} Password Reset
            </h2>

            <p style="margin:0 0 16px;">
              Hello,
            </p>

            <p style="margin:0 0 20px;">
              We received a request to reset the password for your ${tenantStoreName} Tenant Admin account.
            </p>

            <p style="margin:0 0 24px;">
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#FF6900;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:8px;
                  font-weight:700;
                "
              >
                Reset Password
              </a>
            </p>

            <p style="margin:0 0 12px;">
              This link expires in 10 minutes.
            </p>

            <p style="margin:0 0 20px;">
              If you did not request this password reset, you can safely ignore this email.
            </p>

            <p
              style="
                margin:0;
                color:#6b7280;
                font-size:13px;
              "
            >
              ${tenantStoreName}
            </p>
          </div>
        `,
      });
    } catch (mailError) {
      await User.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            resetPasswordToken:
              null,

            resetPasswordExpire:
              null,
          },
        }
      );

      throw mailError;
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "A password reset link has been sent to your Tenant Admin email address.",
      });
  } catch (error) {
    console.error(
      "Forgot Tenant Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to process password reset request",
      });
  }
};

/* =========================================================
   RESET TENANT ADMIN PASSWORD
========================================================= */

const resetTenantAdminPassword = async (
  req,
  res
) => {
  try {
    const token = String(
      req.body?.token || ""
    ).trim();

    const password = String(
      req.body?.password || ""
    );

    const confirmPassword =
      String(
        req.body?.confirmPassword ||
          ""
      );

    if (
      !token ||
      !password ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Reset token, new password and password confirmation are required",
        });
    }

    if (
      password !==
      confirmPassword
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Passwords do not match",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Password must be at least 6 characters",
        });
    }

    const hashedResetToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
      await User.findOne({
        role: "admin",

        tenant: {
          $ne: null,
        },

        resetPasswordToken:
          hashedResetToken,

        resetPasswordExpire: {
          $gt: new Date(),
        },
      }).select(
        "+isDeleted +isActive"
      );

    if (!user) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Password reset link is invalid or has expired",
        });
    }

    if (
      !validateAccountState(
        user,
        res
      )
    ) {
      return null;
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    await User.updateOne(
      {
        _id: user._id,
        role: "admin",
      },
      {
        $set: {
          password:
            hashedPassword,

          mustChangePassword:
            false,

          resetPasswordToken:
            null,

          resetPasswordExpire:
            null,
        },
      }
    );

    return res
      .status(200)
      .json({
        success: true,

        mustChangePassword:
          false,

        message:
          "Tenant Admin password has been reset successfully",
      });
  } catch (error) {
    console.error(
      "Reset Tenant Admin password error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to reset password",
      });
  }
};

/* =========================================================
   PROFILE CONTROLLERS
========================================================= */

const getUserProfile = async (
  req,
  res
) =>
  res.status(200).json({
    success: true,

    user:
      sanitizeUser(
        req.user
      ),
  });

const getAdminProfile = async (
  req,
  res
) =>
  res.status(200).json({
    success: true,

    user:
      sanitizeUser(
        req.user
      ),
  });

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  changeAdminPassword,
  changeTenantAdminPassword,
  forgotTenantAdminPassword,
  resetTenantAdminPassword,
  getUserProfile,
  getAdminProfile,
};
