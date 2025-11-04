import express from "express";
import multer from "multer";
import { getMessages, sendMessage } from "../controllers/messageController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    cb(null, unique);
  }
});
const upload = multer({ storage });

router.get("/:chatId", getMessages);
router.post("/", upload.single("file"), sendMessage);

export default router;
