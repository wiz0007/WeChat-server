import express from "express";
import {
  getConnections,
  removeConnection,
  requestConnection,
  respondToConnection,
} from "../controllers/connectionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getConnections);
router.post("/request/:userId", protect, requestConnection);
router.patch("/:id/respond", protect, respondToConnection);
router.delete("/:id", protect, removeConnection);

export default router;
