import mongoose from "mongoose";
import Chat from "../models/Chat.js";
import Block from "../models/Block.js";
import ChatRequest from "../models/ChatRequest.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import {
  notifyChatRequest,
  notifyChatRequestResponse,
} from "../services/notificationService.js";
import { buildPairKey, serializeUserPreview } from "../utils/social.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const canSendChatRequest = async (fromUserId, toUser) => {
  const setting = toUser.privacy?.allowChatRequestsFrom || "everyone";
  if (setting === "everyone") return true;
  if (setting === "none") return false;

  const connection = await Connection.findOne({
    pairKey: buildPairKey(fromUserId, toUser._id),
    status: "accepted",
  });
  return Boolean(connection);
};

export const createChatRequest = async (req, res) => {
  try {
    const { userId, messagePreview = "" } = req.body;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot send a chat request to yourself" });
    }

    const toUser = await User.findById(userId).select("privacy");
    if (!toUser) return res.status(404).json({ message: "User not found" });

    const block = await Block.findOne({
      $or: [
        { blockerId: req.user._id, blockedId: userId },
        { blockerId: userId, blockedId: req.user._id },
      ],
    });
    if (block) {
      return res.status(403).json({ message: "Chat request is not available" });
    }

    const allowed = await canSendChatRequest(req.user._id, toUser);
    if (!allowed) {
      return res.status(403).json({ message: "This user is not accepting chat requests" });
    }

    const request = await ChatRequest.create({
      pairKey: buildPairKey(req.user._id, userId),
      fromUserId: req.user._id,
      toUserId: userId,
      messagePreview: String(messagePreview).trim().slice(0, 300),
    });
    await notifyChatRequest(request);

    return res.status(201).json({ message: "Chat request sent", request });
  } catch (err) {
    console.error("Create chat request error:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: "A pending chat request already exists" });
    }
    res.status(500).json({ message: "Failed to send chat request" });
  }
};

export const getChatRequests = async (req, res) => {
  try {
    const box = req.query.box === "sent" ? "sent" : "inbox";
    const filter =
      box === "sent"
        ? { fromUserId: req.user._id }
        : { toUserId: req.user._id };

    const requests = await ChatRequest.find(filter)
      .populate("fromUserId", "name username avatar about headline profileVisibility privacy isOnline lastSeen")
      .populate("toUserId", "name username avatar about headline profileVisibility privacy isOnline lastSeen")
      .sort({ createdAt: -1 });

    const items = requests.map((request) => {
      const otherUser = box === "sent" ? request.toUserId : request.fromUserId;
      return {
        _id: request._id,
        status: request.status,
        box,
        messagePreview: request.messagePreview,
        conversationId: request.conversationId,
        user: serializeUserPreview(
          otherUser,
          request.status === "accepted" ? "connected" : "none"
        ),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      };
    });

    return res.json({ requests: items });
  } catch (err) {
    console.error("Get chat requests error:", err);
    res.status(500).json({ message: "Failed to load chat requests" });
  }
};

export const respondToChatRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid chat request id" });
    }
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or decline" });
    }

    const request = await ChatRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Chat request not found" });
    if (String(request.toUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the recipient can respond" });
    }
    if (request.status !== "pending") {
      return res.status(409).json({ message: `Chat request is already ${request.status}` });
    }

    request.status = action === "accept" ? "accepted" : "declined";
    request.respondedAt = new Date();

    if (action === "accept") {
      let chat = await Chat.findOne({
        participants: { $all: [request.fromUserId, request.toUserId] },
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [request.fromUserId, request.toUserId],
        });
      }

      request.conversationId = chat._id;
    }

    await request.save();
    await notifyChatRequestResponse(request, action === "accept");

    return res.json({
      message: `Chat request ${request.status}`,
      request,
      conversationId: request.conversationId,
    });
  } catch (err) {
    console.error("Respond to chat request error:", err);
    res.status(500).json({ message: "Failed to update chat request" });
  }
};
