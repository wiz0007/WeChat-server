import mongoose from "mongoose";
import Notification from "../models/Notification.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const unreadOnly = req.query.unreadOnly === "true";
    const filter = { userId: req.user._id };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actorId", "name username avatar")
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};
