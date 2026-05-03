import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.post("/google-login", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;


