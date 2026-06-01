import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import dotenv from "dotenv";

dotenv.config();

const generateJWT = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const normalizeUsername = (username = "") => username.trim().toLowerCase();

const getClientUrl = () => {
  const rawValue = process.env.CLIENT_URL?.split("#")[0].trim();
  return (rawValue || "http://localhost:5173").replace(/\/+$/, "");
};

const generateUsernameFromName = (name = "user") =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "user"}${Math.floor(
    1000 + Math.random() * 9000
  )}`;

const buildAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  about: user.about,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
});

export const registerUser = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const existingByUsername = await User.findOne({ username });
    if (existingByUsername && normalizeEmail(existingByUsername.email) !== email) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      username,
      email,
      password,
      isVerified: true,
    });

    res.status(201).json({
      message: "Account created successfully",
      userId: user._id,
    });
  } catch (err) {
    console.error("Register Error:", err);
    if (err?.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      const fieldMessage =
        duplicateField === "username"
          ? "Username already exists"
          : "User already exists";
      return res.status(400).json({ message: fieldMessage });
    }

    res.status(500).json({ message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    user.isVerified = true;
    await user.save();

    const token = generateJWT({ id: user._id }, "7d");

    res.json({
      token,
      user: buildAuthUser(user),
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save();

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    res.json({
      user: buildAuthUser(req.user),
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const avatar =
      req.file
        ? `/uploads/${req.file.filename}`
        : req.body.avatar?.trim() || req.user.avatar || "";
    const about = req.body.about?.trim() || "";

    if (!name || !username || !email) {
      return res.status(400).json({ message: "Name, username, and email are required" });
    }

    const usernameOwner = await User.findOne({ username });
    if (usernameOwner && String(usernameOwner._id) !== String(req.user._id)) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const emailOwner = await User.findOne({ email });
    if (emailOwner && String(emailOwner._id) !== String(req.user._id)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    req.user.name = name;
    req.user.username = username;
    req.user.email = email;
    req.user.avatar = avatar;
    req.user.about = about || "Available on WeChat";
    await req.user.save();

    res.json({
      message: "Profile updated successfully",
      user: buildAuthUser(req.user),
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = req.body.name?.trim();
    const { googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      let username = normalizeUsername(req.body.username);
      if (!username) {
        username = generateUsernameFromName(name);
      }

      while (await User.findOne({ username })) {
        username = generateUsernameFromName(name);
      }

      user = await User.create({
        name,
        email,
        username,
        googleId,
        password: `GOOGLE_${googleId || crypto.randomBytes(8).toString("hex")}`,
        isVerified: true,
        isOnline: true,
        lastSeen: new Date(),
      });
    } else {
      user.isOnline = true;
      user.lastSeen = new Date();
      user.isVerified = true;
      await user.save();
    }

    const token = generateJWT({ id: user._id }, "7d");

    res.json({
      token,
      user: buildAuthUser(user),
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}&id=${user._id}`;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Valid for 1 hour.</p>`,
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (
      user.resetPasswordToken !== tokenHash ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};
