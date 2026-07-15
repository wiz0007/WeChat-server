import Notification from "../models/Notification.js";
import { emitToUser } from "../socket.js";

export const createNotification = async ({
  userId,
  actorId = null,
  type,
  title,
  body = "",
  entityType = "none",
  entityId = null,
}) => {
  if (!userId || !type || !title) return null;

  const notification = await Notification.create({
    userId,
    actorId,
    type,
    title,
    body,
    entityType,
    entityId,
  });

  const [populatedNotification, unreadCount] = await Promise.all([
    Notification.findById(notification._id).populate("actorId", "name username avatar"),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  emitToUser(userId, "notification:new", {
    notification: populatedNotification,
    unreadCount,
  });

  return notification;
};

export const notifyConnectionRequest = (connection) =>
  createNotification({
    userId: connection.recipientId,
    actorId: connection.requesterId,
    type: "connection_request",
    title: "New connection request",
    body: "Someone wants to connect with you.",
    entityType: "connection",
    entityId: connection._id,
  });

export const notifyConnectionResponse = (connection, accepted) =>
  createNotification({
    userId: connection.requesterId,
    actorId: connection.recipientId,
    type: accepted ? "connection_accepted" : "connection_rejected",
    title: accepted ? "Connection accepted" : "Connection rejected",
    body: accepted
      ? "Your connection request was accepted."
      : "Your connection request was rejected.",
    entityType: "connection",
    entityId: connection._id,
  });

export const notifyChatRequest = (request) =>
  createNotification({
    userId: request.toUserId,
    actorId: request.fromUserId,
    type: "chat_request",
    title: "New chat request",
    body: request.messagePreview || "Someone wants to chat with you.",
    entityType: "chat_request",
    entityId: request._id,
  });

export const notifyChatRequestResponse = (request, accepted) =>
  createNotification({
    userId: request.fromUserId,
    actorId: request.toUserId,
    type: accepted ? "chat_request_accepted" : "chat_request_declined",
    title: accepted ? "Chat request accepted" : "Chat request declined",
    body: accepted
      ? "Your chat request was accepted."
      : "Your chat request was declined.",
    entityType: "chat_request",
    entityId: request._id,
  });

