import express from "express";
import { getAllUsers } from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/users", verifyToken, getAllUsers);

export default router;
