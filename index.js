import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import socketSetup from "./socket.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// --- CORS Fix ---
app.use(
  cors({
    origin: [
      "https://we-chat-app-rho.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("/", cors()); // <-- Fixes preflight requests

// --- Body Parsing Fix ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", protect, chatRoutes);
app.use("/api/messages", protect, messageRoutes);
app.use("/api/users", protect, userRoutes);

socketSetup(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
