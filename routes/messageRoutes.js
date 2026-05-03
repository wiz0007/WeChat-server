import express from "express";
import {
  getMessages,
  markMessagesAsDelivered,
  markMessagesAsRead,
  sendMessage,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

router.get("/:chatId", protect, getMessages);
router.post("/:chatId/delivered", protect, markMessagesAsDelivered);
router.post("/:chatId/read", protect, markMessagesAsRead);
router.post("/", protect, upload.single("file"), sendMessage);

export default router;
