import mongoose from "mongoose";
import Connection from "../models/Connection.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import {
  notifyConnectionRequest,
  notifyConnectionResponse,
} from "../services/notificationService.js";
import { buildPairKey, serializeUserPreview } from "../utils/social.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateConnection = (query) =>
  query
    .populate("requesterId", "name username avatar about headline profileVisibility privacy isOnline lastSeen")
    .populate("recipientId", "name username avatar about headline profileVisibility privacy isOnline lastSeen");

export const requestConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot connect with yourself" });
    }

    const target = await User.findById(userId).select("privacy");
    if (!target) return res.status(404).json({ message: "User not found" });

    const block = await Block.findOne({
      $or: [
        { blockerId: req.user._id, blockedId: userId },
        { blockerId: userId, blockedId: req.user._id },
      ],
    });
    if (block) {
      return res.status(403).json({ message: "Connection request is not available" });
    }

    if (target.privacy?.allowConnectionRequestsFrom === "none") {
      return res.status(403).json({ message: "This user is not accepting connection requests" });
    }

    const pairKey = buildPairKey(req.user._id, userId);
    const existing = await Connection.findOne({ pairKey });
    if (existing) {
      return res.status(409).json({ message: `Connection is already ${existing.status}` });
    }

    const connection = await Connection.create({
      pairKey,
      requesterId: req.user._id,
      recipientId: userId,
    });
    await notifyConnectionRequest(connection);

    return res.status(201).json({ message: "Connection request sent", connection });
  } catch (err) {
    console.error("Connection request error:", err);
    res.status(500).json({ message: "Failed to send connection request" });
  }
};

export const getConnections = async (req, res) => {
  try {
    const status = req.query.status || "accepted";
    const connections = await populateConnection(
      Connection.find({
        status,
        $or: [{ requesterId: req.user._id }, { recipientId: req.user._id }],
      }).sort({ updatedAt: -1 })
    );

    const items = connections.map((connection) => {
      const otherUser =
        String(connection.requesterId._id) === String(req.user._id)
          ? connection.recipientId
          : connection.requesterId;

      return {
        _id: connection._id,
        status: connection.status,
        direction:
          String(connection.requesterId._id) === String(req.user._id) ? "sent" : "received",
        user: serializeUserPreview(
          otherUser,
          connection.status === "accepted" ? "connected" : "none"
        ),
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      };
    });

    return res.json({ connections: items });
  } catch (err) {
    console.error("Get connections error:", err);
    res.status(500).json({ message: "Failed to load connections" });
  }
};

export const respondToConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid connection id" });
    }
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept or reject" });
    }

    const connection = await Connection.findById(id);
    if (!connection) return res.status(404).json({ message: "Connection request not found" });
    if (String(connection.recipientId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the recipient can respond" });
    }
    if (connection.status !== "pending") {
      return res.status(409).json({ message: `Connection is already ${connection.status}` });
    }

    connection.status = action === "accept" ? "accepted" : "rejected";
    connection.respondedAt = new Date();
    await connection.save();
    await notifyConnectionResponse(connection, action === "accept");

    return res.json({ message: `Connection ${connection.status}`, connection });
  } catch (err) {
    console.error("Respond to connection error:", err);
    res.status(500).json({ message: "Failed to update connection" });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid connection id" });
    }

    const connection = await Connection.findById(id);
    if (!connection) return res.status(404).json({ message: "Connection not found" });
    if (
      String(connection.requesterId) !== String(req.user._id) &&
      String(connection.recipientId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Not allowed to remove this connection" });
    }

    connection.status = "removed";
    await connection.save();
    return res.json({ message: "Connection removed" });
  } catch (err) {
    console.error("Remove connection error:", err);
    res.status(500).json({ message: "Failed to remove connection" });
  }
};
