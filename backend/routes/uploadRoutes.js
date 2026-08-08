const express = require("express");

const upload = require(
  "../middleware/uploadMiddleware",
);

const {
  uploadSingleImage,
} = require(
  "../controllers/uploadController",
);

const router =
  express.Router();

/* =========================================================
   UPLOAD SINGLE IMAGE
========================================================= */

router.post(
  "/image",
  upload.single("image"),
  uploadSingleImage,
);

module.exports = router;