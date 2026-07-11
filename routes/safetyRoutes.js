import express from "express";
import {
  blockUser,
  getBlockedUsers,
  reportUser,
  unblockUser,
} from "../controllers/safetyController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/blocks", protect, getBlockedUsers);
router.post("/blocks/:userId", protect, blockUser);
router.delete("/blocks/:userId", protect, unblockUser);
router.post("/reports/:userId", protect, reportUser);

export default router;
