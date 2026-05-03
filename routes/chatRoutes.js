import express from "express";
import { accessChat, getAllUsers } from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/users", verifyToken, getAllUsers);
router.post("/access", verifyToken, accessChat);

export default router;
