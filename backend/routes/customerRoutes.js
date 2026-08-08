const express = require(
  "express"
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const {
  getAllCustomers,
  getSingleCustomer,
  getCustomerSummary,
} = require(
  "../controllers/customerController"
);

const router =
  express.Router();

/* =========================================================
   ADMIN CUSTOMER ROUTES

   সব Customer route শুধু Admin access করতে পারবে।
========================================================= */

/* =========================================================
   GET CUSTOMER SUMMARY

   GET /api/customers/summary
========================================================= */

router.get(
  "/summary",
  protect,
  adminOnly,
  getCustomerSummary
);

/* =========================================================
   GET ALL CUSTOMERS

   GET /api/customers

   Query examples:

   /api/customers?page=1&limit=10

   /api/customers?search=017

   /api/customers?orderStatus=Delivered

   /api/customers?sortBy=spent&sortOrder=desc
========================================================= */

router.get(
  "/",
  protect,
  adminOnly,
  getAllCustomers
);

/* =========================================================
   GET SINGLE CUSTOMER

   GET /api/customers/:customerId

   Important:
   customerId route-এর আগে /summary route রাখতে হবে।
========================================================= */

router.get(
  "/:customerId",
  protect,
  adminOnly,
  getSingleCustomer
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;