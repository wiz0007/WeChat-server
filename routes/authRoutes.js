import express from "express";
import {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/login", loginUser);
router.post("/google-login", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;


