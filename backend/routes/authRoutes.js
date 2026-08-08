const express = require("express");

const {
  registerUser,
  loginUser,
  loginAdmin,
  getUserProfile,
  getAdminProfile,
} = require("../controllers/authController");

const {
  protect,
  adminOnly,
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
  Admin Login

  Supports:
  - Email
  - Phone

  Only users with role = admin
  can log in.

  POST /api/auth/admin/login
*/

router.post(
  "/admin/login",
  loginAdmin,
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
  Logged-in Admin Profile

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