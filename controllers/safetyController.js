import mongoose from "mongoose";
import Block from "../models/Block.js";
import Chat from "../models/Chat.js";
import ChatRequest from "../models/ChatRequest.js";
import Connection from "../models/Connection.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { buildPairKey, serializeUserPreview } from "../utils/social.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const target = await User.findById(userId).select("_id");
    if (!target) return res.status(404).json({ message: "User not found" });

    await Block.updateOne(
      { blockerId: req.user._id, blockedId: userId },
      { $setOnInsert: { blockerId: req.user._id, blockedId: userId } },
      { upsert: true }
    );

    const pairKey = buildPairKey(req.user._id, userId);
    await Promise.all([
      Connection.updateMany({ pairKey, status: "pending" }, { status: "rejected", respondedAt: new Date() }),
      ChatRequest.updateMany({ pairKey, status: "pending" }, { status: "blocked", respondedAt: new Date() }),
      Chat.updateMany({ participants: { $all: [req.user._id, userId] } }, { status: "restricted" }),
    ]);

    return res.json({ message: "User blocked" });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ message: "Failed to block user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    await Block.deleteOne({ blockerId: req.user._id, blockedId: userId });
    return res.json({ message: "User unblocked" });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const blocks = await Block.find({ blockerId: req.user._id })
      .populate("blockedId", "name username avatar about headline profileVisibility privacy isOnline lastSeen")
      .sort({ createdAt: -1 });

    return res.json({
      blocks: blocks.map((block) => ({
        _id: block._id,
        createdAt: block.createdAt,
        user: serializeUserPreview(block.blockedId, "blocked"),
      })),
    });
  } catch (err) {
    console.error("Get blocked users error:", err);
    res.status(500).json({ message: "Failed to load blocked users" });
  }
};

export const reportUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, details = "" } = req.body;
    const allowedReasons = ["spam", "harassment", "impersonation", "inappropriate", "other"];

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({ message: "Invalid report reason" });
    }

    const target = await User.findById(userId).select("_id");
    if (!target) return res.status(404).json({ message: "User not found" });

    const report = await Report.create({
      reporterId: req.user._id,
      reportedUserId: userId,
      reason,
      details: String(details).trim().slice(0, 1000),
    });

    return res.status(201).json({ message: "Report submitted", reportId: report._id });
  } catch (err) {
    console.error("Report user error:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};
