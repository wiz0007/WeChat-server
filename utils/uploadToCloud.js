import cloudinary from "cloudinary";
import fs from "fs-extra";
import dotenv from "dotenv";

dotenv.config();

// ✅ Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a local file to Cloudinary and return its URL.
 * @param {string} localFilePath - The path to the local file (from multer)
 * @param {string} folder - Optional Cloudinary folder name
 */
const uploadToCloud = async (localFilePath, folder = "wechat_uploads") => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.v2.uploader.upload(localFilePath, {
      folder,
      resource_type: "auto", // handles images, videos, etc.
    });

    // delete temp file
    await fs.remove(localFilePath);

    return result.secure_url;
  } catch (error) {
    console.error("Cloud upload error:", error);
    await fs.remove(localFilePath);
    return null;
  }
};

export default uploadToCloud;
