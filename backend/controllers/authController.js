"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

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
  getUserProfile,
  getAdminProfile,
};
