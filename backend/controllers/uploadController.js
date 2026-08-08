/* =========================================================
   UPLOAD SINGLE IMAGE
========================================================= */

const uploadSingleImage = async (
  req,
  res,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select an image to upload.",
      });
    }

    const imageUrl =
      req.file.path ||
      req.file.secure_url ||
      "";

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message:
          "Image was uploaded, but the image URL could not be found.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Image uploaded successfully.",
      imageUrl,
      publicId:
        req.file.filename || "",
    });
  } catch (error) {
    console.error(
      "Upload single image error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Image upload failed.",
    });
  }
};

module.exports = {
  uploadSingleImage,
};