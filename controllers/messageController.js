import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import { getChatForParticipant } from "../services/chatPermissionService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat id" });
    }

    const chat = await getChatForParticipant(chatId, req.user._id);
    if (!chat) {
      return res.status(403).json({ success: false, message: "Not allowed to read this chat" });
    }

    const messages = await Message.find({ chatId })
      .populate("senderId", "name username email")
      .sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

export const markMessagesAsDelivered = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = String(req.user._id);
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat id" });
    }

    const chat = await getChatForParticipant(chatId, req.user._id);
    if (!chat) {
      return res.status(403).json({ success: false, message: "Not allowed to update this chat" });
    }

    const undeliveredMessages = await Message.find({
      chatId,
      senderId: { $ne: req.user._id },
      deliveredTo: { $ne: req.user._id },
    }).select("_id deliveredTo");

    if (undeliveredMessages.length === 0) {
      return res.json({ success: true, updatedIds: [] });
    }

    const updatedIds = undeliveredMessages.map((message) => message._id);

    await Message.updateMany(
      { _id: { $in: updatedIds } },
      { $addToSet: { deliveredTo: req.user._id } }
    );

    return res.json({
      success: true,
      updatedIds,
      deliveredToUserId: currentUserId,
    });
  } catch (err) {
    console.error("Delivery receipt error:", err);
    res.status(500).json({ success: false, message: "Failed to update delivery receipts" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = String(req.user._id);
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: "Invalid chat id" });
    }

    const chat = await getChatForParticipant(chatId, req.user._id);
    if (!chat) {
      return res.status(403).json({ success: false, message: "Not allowed to update this chat" });
    }

    const unreadMessages = await Message.find({
      chatId,
      senderId: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    }).select("_id readBy");

    if (unreadMessages.length === 0) {
      return res.json({ success: true, updatedIds: [] });
    }

    const updatedIds = unreadMessages.map((message) => message._id);

    await Message.updateMany(
      { _id: { $in: updatedIds } },
      { $addToSet: { readBy: req.user._id } }
    );

    return res.json({
      success: true,
      updatedIds,
      readByUserId: currentUserId,
    });
  } catch (err) {
    console.error("Read receipt error:", err);
    res.status(500).json({ success: false, message: "Failed to update read receipts" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const senderId = req.user._id;

    if (!chatId || !isValidObjectId(chatId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid chatId is required" });
    }

    const chat = await getChatForParticipant(chatId, senderId);
    if (!chat) {
      return res.status(403).json({ success: false, message: "Not allowed to send to this chat" });
    }

    if (!text?.trim() && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    const message = await Message.create({
      chatId,
      senderId,
      text: text?.trim() || "",
      fileUrl,
      fileName,
      deliveredTo: [senderId],
      readBy: [senderId],
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const populated = await Message.findById(message._id).populate(
      "senderId",
      "name username email"
    );
    res.json({ success: true, message: populated });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

