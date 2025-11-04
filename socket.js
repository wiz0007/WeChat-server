import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function socketSetup(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
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
      next(new Error("Invalid Token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.userId);

    socket.on("joinRoom", ({ chatId }) => socket.join(chatId));
    socket.on("leaveRoom", ({ chatId }) => socket.leave(chatId));

    socket.on("sendMessage", (message) => {
      io.to(message.chatId).emit("message", {
        ...message,
        createdAt: new Date(),
        readBy: [message.senderId],
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.userId);
    });
  });

  return io;
}

