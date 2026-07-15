import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

let ioInstance = null;

const parseAllowedOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.split("#")[0].trim().replace(/\/+$/, ""))
    .filter(Boolean);

export default function socketSetup(server) {
  const allowedOrigins = [
    ...parseAllowedOrigins(process.env.CLIENT_URL),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.includes(origin.replace(/\/+$/, "")) ||
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          return callback(null, true);
        }

        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error("Invalid socket token:", err.message);
      next(new Error("Invalid Token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.userId);
    socket.join(`user:${socket.userId}`);

    User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date(),
    }).catch((err) => console.error("Presence update error:", err.message));

    socket.on("joinRoom", ({ chatId }) => {
      if (!chatId) return;
      socket.join(chatId);
      console.log(`User ${socket.userId} joined room ${chatId}`);
    });

    socket.on("leaveRoom", ({ chatId }) => {
      if (!chatId) return;
      socket.leave(chatId);
      console.log(`User ${socket.userId} left room ${chatId}`);
    });

    socket.on("typing", ({ chatId, userId }) => {
      if (!chatId) return;
      socket.to(chatId).emit("typing", { chatId, userId });
    });

    socket.on("sendMessage", (message) => {
      if (!message?.chatId || !message?.senderId) return;
      socket.to(message.chatId).emit("message", message);
      console.log(`Message sent in room ${message.chatId}`);
    });

    socket.on("messagesDelivered", ({ chatId, updatedIds, deliveredToUserId }) => {
      if (!chatId || !updatedIds?.length) return;
      socket.to(chatId).emit("messagesDelivered", {
        chatId,
        updatedIds,
        deliveredToUserId,
      });
    });

    socket.on("messagesRead", ({ chatId, updatedIds, readByUserId }) => {
      if (!chatId || !updatedIds?.length) return;
      socket.to(chatId).emit("messagesRead", {
        chatId,
        updatedIds,
        readByUserId,
      });
    });

    socket.on("disconnect", () => {
      User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      }).catch((err) => console.error("Presence update error:", err.message));
      console.log("Socket disconnected:", socket.userId);
    });
  });

  return io;
}
export const emitToUser = (userId, eventName, payload) => {
  if (!ioInstance || !userId || !eventName) return;
  ioInstance.to(`user:${userId}`).emit(eventName, payload);
};


