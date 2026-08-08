const multer = require("multer");
const {
  CloudinaryStorage,
} = require(
  "multer-storage-cloudinary"
);

const cloudinary = require(
  "../config/cloudinary"
);

/* =========================================================
   CLOUDINARY STORAGE CONFIGURATION
========================================================= */

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: async (
      req,
      file
    ) => {
      return {
        folder:
          "townmela/products",

        allowed_formats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ],

        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      };
    },
  });

/* =========================================================
   FILE FILTER
========================================================= */

const fileFilter = (
  req,
  file,
  callback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    callback(null, true);
    return;
  }

  callback(
    new Error(
      "Only JPG, JPEG, PNG and WEBP images are allowed"
    ),
    false
  );
};

/* =========================================================
   MULTER UPLOAD
========================================================= */

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },
});

module.exports = upload;
