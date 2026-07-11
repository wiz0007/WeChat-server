import express from "express";
import {
  getUserByUsername,
  updatePrivacySettings,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/username/:username", protect, getUserByUsername);
router.patch("/me/privacy", protect, updatePrivacySettings);

export default router;
