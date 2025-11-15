import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js"; // if created
import { protect } from "./middleware/authMiddleware.js";
import socketSetup from "./socket.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ✅ CORS Configuration (important for Vercel frontend)
app.use(
  cors({
    origin: [
      "https://we-chat-app-rho.vercel.app", // your deployed frontend
      "http://localhost:5173",               // for local testing
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", protect, chatRoutes);
app.use("/api/messages", protect, messageRoutes);
app.use("/api/users", protect, userRoutes); // ✅ optional but recommended

// ✅ Socket.io setup with CORS for Render + Vercel
socketSetup(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
