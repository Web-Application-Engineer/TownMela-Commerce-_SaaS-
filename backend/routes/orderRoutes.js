const express = require("express");

const {
  placeOrder,
  getMyOrders,
  getGuestOrders,
  getAllOrders,
  getSingleOrder,
  trackOrder,
  updateOrderStatus,
} = require(
  "../controllers/orderController"
);

const {
  protect,
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   PUBLIC ORDER ROUTES

   এই routes ব্যবহার করতে login অথবা JWT token
   প্রয়োজন হবে না।
========================================================= */

/* =========================================================
   PLACE ORDER

   POST /api/orders

   Guest customer এবং authenticated customer—
   controller-এর বর্তমান logic অনুযায়ী order করতে পারবে।
========================================================= */

router.post(
  "/",
  placeOrder
);

/* =========================================================
   TRACK ORDER

   POST /api/orders/track

   Expected body example:

   {
     "orderNumber": "TM-20260714-001",
     "phone": "01XXXXXXXXX"
   }

   Dynamic /:orderId route-এর আগে এটি রাখতে হবে।
========================================================= */

router.post(
  "/track",
  trackOrder
);

/* =========================================================
   GET GUEST ORDERS BY GUEST ID

   GET /api/orders/guest/:guestId
========================================================= */

router.get(
  "/guest/:guestId",
  getGuestOrders
);

/* =========================================================
   GET MY ORDERS

   GET /api/orders/my-orders

   Backward-compatible example:

   GET /api/orders/my-orders?guestId=guest_xxxxxxxx

   Dynamic /:orderId route-এর আগে এটি রাখতে হবে।
========================================================= */

router.get(
  "/my-orders",
  getMyOrders
);

/* =========================================================
   ADMIN ORDER ROUTES

   নিচের সব routes ব্যবহার করতে প্রয়োজন:

   1. Valid JWT token
   2. Admin role
========================================================= */

/* =========================================================
   GET ALL ORDERS

   GET /api/orders

   Optional query examples:

   ?status=Pending
   ?search=TM-20260714
   ?page=1
   ?limit=20
========================================================= */

router.get(
  "/",
  protect,
  adminOnly,
  getAllOrders
);

/* =========================================================
   UPDATE ORDER STATUS

   PATCH /api/orders/:orderId/status

   :orderId হতে পারে MongoDB document ID।

   Expected body example:

   {
     "status": "Processing",
     "note": "Order confirmed"
   }

   এটি dynamic GET /:orderId route-এর আগে থাকবে।
========================================================= */

router.patch(
  "/:orderId/status",
  protect,
  adminOnly,
  updateOrderStatus
);

/* =========================================================
   GET SINGLE ORDER

   GET /api/orders/:orderId

   Controller support করলে :orderId হতে পারে:

   - MongoDB order ID
   - Order number

   এই generic dynamic route সবসময় file-এর শেষে থাকবে।
========================================================= */

router.get(
  "/:orderId",
  protect,
  adminOnly,
  getSingleOrder
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;