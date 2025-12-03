import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js"; // MailerSend
import dotenv from "dotenv";
dotenv.config();

// Generate 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Generate JWT
const generateJWT = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// ------------------------------
// REGISTER + SEND OTP
// ------------------------------
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = await User.create({ name, username, email, password });

    // OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // MailerSend send
    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });

    res.status(201).json({ message: "OTP sent to email", userId: user._id });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------
// RESEND OTP
// ------------------------------
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "Already verified" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: email,
      subject: "Resend OTP - Verify Email",
      html: `<p>Your new OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });

    res.json({ message: "New OTP sent to email" });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------
// VERIFY OTP
// ------------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.otp) !== String(otp))
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};


// ------------------------------
// LOGIN
// ------------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified)
      return res.status(400).json({ message: "Email not verified" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateJWT({ id: user._id }, "7d");

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------
// GOOGLE LOGIN
// ------------------------------
export const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        password: "GOOGLE",
        isVerified: true,
      });
    }

    const token = generateJWT({ id: user._id }, "7d");

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------
// FORGOT PASSWORD
// ------------------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

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

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&id=${user._id}`;

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

// ------------------------------
// RESET PASSWORD
// ------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    if (
      user.resetPasswordToken !== tokenHash ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    user.password = newPassword; // hashed automatically
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: err.message });
  }
};
