import express from "express";
import {
  createChatRequest,
  getChatRequests,
  respondToChatRequest,
} from "../controllers/chatRequestController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getChatRequests);
router.post("/", protect, createChatRequest);
router.patch("/:id/respond", protect, respondToChatRequest);

export default router;
