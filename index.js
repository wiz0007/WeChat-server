import express from "express";
import http from "http";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import chatRequestRoutes from "./routes/chatRequestRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import safetyRoutes from "./routes/safetyRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import socketSetup from "./socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const parseAllowedOrigins = (value = "") =>
  value
    .split(",")
    .map((origin) => origin.split("#")[0].trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = new Set([
  ...parseAllowedOrigins(process.env.CLIENT_URL),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return (
    allowedOrigins.has(normalizedOrigin) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalizedOrigin)
  );
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/chat-requests", chatRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

socketSetup(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
