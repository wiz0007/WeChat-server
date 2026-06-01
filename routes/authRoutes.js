import express from "express";
import {
  getCurrentUser,
  registerUser,
  loginUser,
  logoutUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);
router.post("/logout", protect, logoutUser);
router.put("/profile", protect, upload.single("avatarFile"), updateProfile);
router.post("/google-login", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;


