import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function socketSetup(server) {
  const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:3000", // frontend URL (from .env)
    "https://we-chat-app-rho.vercel.app",              // your deployed frontend
    "http://localhost:3000",                           // local dev
  ];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error("❌ Invalid Token in socket:", err.message);
      next(new Error("Invalid Token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.userId);

    // Join room
    socket.on("joinRoom", ({ chatId }) => {
      socket.join(chatId);
      console.log(`👥 User ${socket.userId} joined room ${chatId}`);
    });

    // Leave room
    socket.on("leaveRoom", ({ chatId }) => {
      socket.leave(chatId);
      console.log(`🚪 User ${socket.userId} left room ${chatId}`);
    });

    // Send message to room
    socket.on("sendMessage", (message) => {
      if (!message.chatId || !message.senderId) return;
      io.to(message.chatId).emit("message", {
        ...message,
        createdAt: new Date(),
        readBy: [message.senderId],
      });
      console.log(`💬 Message sent in room ${message.chatId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.userId);
    });
  });

  return io;
}
