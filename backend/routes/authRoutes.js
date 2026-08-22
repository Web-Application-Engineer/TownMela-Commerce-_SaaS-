const express = require("express");

const {
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
} = require("../controllers/authController");

const {
  protect,
  adminOnly,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   PUBLIC AUTH ROUTES
========================================================= */

/*
  Register New User

  POST /api/auth/register
*/

router.post(
  "/register",
  registerUser,
);

/*
  User Login

  Supports:
  - Email
  - Phone

  POST /api/auth/login
*/

router.post(
  "/login",
  loginUser,
);

/*
  Admin / Super Admin Login

  Supports:
  - Email
  - Phone
  - loginAs = admin
  - loginAs = superadmin

  POST /api/auth/admin/login
*/

router.post(
  "/admin/login",
  loginAdmin,
);

/*
  Forgot Super Admin Password

  Public route.

  Sends a secure password reset link
  to the authorized Super Admin email.

  POST /api/auth/admin/forgot-password
*/

router.post(
  "/admin/forgot-password",
  forgotAdminPassword,
);

/*
  Reset Super Admin Password

  Public route.

  Validates the secure reset token
  before updating the password.

  POST /api/auth/admin/reset-password
*/

router.post(
  "/admin/reset-password",
  resetAdminPassword,
);

/* =========================================================
   PUBLIC TENANT ADMIN PASSWORD RESET ROUTES
========================================================= */

/*
  Forgot Tenant Admin Password

  POST /api/auth/tenant-admin/forgot-password
*/

router.post(
  "/tenant-admin/forgot-password",
  forgotTenantAdminPassword,
);

/*
  Reset Tenant Admin Password

  POST /api/auth/tenant-admin/reset-password
*/

router.post(
  "/tenant-admin/reset-password",
  resetTenantAdminPassword,
);

/* =========================================================
   PROTECTED SUPER ADMIN ROUTES
========================================================= */

/*
  Change Super Admin Password

  Requires:
  - valid authentication token
  - role = superadmin

  POST /api/auth/admin/change-password
*/

router.post(
  "/admin/change-password",
  protect,
  allowRoles("superadmin"),
  changeAdminPassword,
);

/* =========================================================
   PROTECTED TENANT ADMIN ROUTES
========================================================= */

/*
  Change Tenant Admin Password

  Requires:
  - valid authentication token
  - role = admin
  - authenticated user's own tenant

  POST /api/auth/tenant-admin/change-password
*/

router.post(
  "/tenant-admin/change-password",
  protect,
  allowRoles("admin"),
  changeTenantAdminPassword,
);

/* =========================================================
   PROTECTED USER ROUTES
========================================================= */

/*
  Logged-in User Profile

  GET /api/auth/profile
*/

router.get(
  "/profile",
  protect,
  getUserProfile,
);

/* =========================================================
   PROTECTED ADMIN ROUTES
========================================================= */

/*
  Logged-in Admin / Super Admin Profile

  GET /api/auth/admin/profile
*/

router.get(
  "/admin/profile",
  protect,
  adminOnly,
  getAdminProfile,
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;
