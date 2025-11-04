import express from "express";
import { sendOtp, verifyOtp, verifyTokenEndpoint } from "../controllers/authController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/verify-token", verifyTokenEndpoint); // optional route for frontend to check auth

export default router;


