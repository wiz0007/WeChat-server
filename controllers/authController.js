import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

dotenv.config();

const otps = {}; // temporary in-memory storage (move to Redis in production)

// -----------------------------------------
// 🔐 Helper functions
// -----------------------------------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// -----------------------------------------
// ✉️ Setup nodemailer
// -----------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

// -----------------------------------------
// 📤 SEND OTP
// -----------------------------------------
export const sendOtp = async (req, res) => {
  try {
    const { email, mode } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });

    if (mode === "login" && !user) {
      return res.status(400).json({ success: false, message: "User not found. Please register first." });
    }

    if (mode === "register" && user) {
      return res.status(400).json({ success: false, message: "User already registered." });
    }

    const otp = generateOtp();
    otps[email] = { code: otp, expires: Date.now() + 2 * 60 * 1000 };

    await transporter.sendMail({
      from: `"WeChat Auth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "WeChat OTP Verification",
      text: `Your verification code is ${otp}. It will expire in 2 minutes.`,
    });

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP Send Error:", err);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// -----------------------------------------
// ✅ VERIFY OTP
// -----------------------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name, username } = req.body;

    const record = otps[email];
    if (!record) return res.status(400).json({ success: false, message: "OTP not found or expired" });

    if (Date.now() > record.expires) {
      delete otps[email];
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (record.code !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    let user = await User.findOne({ email });

    // 🧍 Register new user
    if (name && username) {
      if (user)
        return res.status(400).json({ success: false, message: "User already registered" });
      user = await User.create({ name, username, email });
    } else {
      // 🔑 Login mode
      if (!user)
        return res.status(400).json({ success: false, message: "User not found. Please register first." });
    }

    const token = generateToken(user._id);
    delete otps[email];

    // 🧾 Send back cleaned user data
    const cleanUser = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    return res.json({ success: true, user: cleanUser, token });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// -----------------------------------------
// 🔍 TOKEN VALIDATION ENDPOINT (Optional)
// -----------------------------------------
export const verifyTokenEndpoint = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: "Invalid token" });

    const user = await User.findById(decoded.id).select("-__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("Token Verify Error:", err);
    return res.status(500).json({ success: false, message: "Token verification failed" });
  }
};

