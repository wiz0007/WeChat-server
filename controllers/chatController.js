import Chat from "../models/Chat.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import {
  canOpenDirectChat,
  getAccessibleUserIds,
} from "../services/chatPermissionService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getAllUsers = async (req, res) => {
  try {
    const accessibleUserIds = await getAccessibleUserIds(req.user._id);

    if (accessibleUserIds.length === 0) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      _id: { $in: accessibleUserIds },
      isVerified: true,
    })
      .select("name username email avatar about headline isOnline lastSeen")
      .sort({ isOnline: -1, name: 1 });
    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get or create a chat between two users
export const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({ message: "You cannot open a chat with yourself" });
    }

    const targetUser = await User.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowed = await canOpenDirectChat(currentUserId, userId);
    if (!allowed) {
      return res.status(403).json({
        message: "You need an accepted connection or chat request before messaging this user",
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] },
    })
      .populate("participants", "name username email avatar about isOnline lastSeen")
      .populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({
        participants: [currentUserId, userId],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "name username email avatar about isOnline lastSeen")
        .populate("lastMessage");
    }

    res.json(chat);
  } catch (error) {
    console.error("Access chat error:", error);
    res.status(500).json({ message: error.message });
  }
};
