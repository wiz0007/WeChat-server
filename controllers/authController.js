import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import dotenv from "dotenv";
dotenv.config();

// ----------------------
// HELPERS
// ----------------------
const generateOTP = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const generateJWT = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const emailTemplate = (heading, message) => `
  <div style="font-family: Arial; padding: 20px;">
    <div style="background: #f4f4f4; padding: 20px; border-radius: 10px;">
      <h2 style="color: #333;">${heading}</h2>
      <p style="font-size: 16px; color: #555;">${message}</p>
      <br/>
      <p style="color: #888;">— WeChat Team</p>
    </div>
  </div>
`;


// ======================================================
// REGISTER USER + SEND OTP
// ======================================================
export const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    if (!email.includes("@"))
      return res.status(400).json({ message: "Invalid email format." });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists." });

    user = await User.create({ name, username, email, password });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    user.lastOtpSent = Date.now();
    await user.save();

    await sendEmail({
      to: email,
      subject: "Verify Your Email — WeChat",
      html: emailTemplate(
        "Verify Your Email",
        `Your OTP is <strong>${otp}</strong>. This OTP expires in 10 minutes.`
      ),
    });

    return res
      .status(201)
      .json({ message: "OTP sent to email.", userId: user._id });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error. Try again later." });
  }
};


// ======================================================
// RESEND OTP (Rate-limited: 1 per 60 seconds)
// ======================================================
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.isVerified)
      return res.status(400).json({ message: "User already verified." });

    // Rate-limit — 60 seconds
    if (user.lastOtpSent && Date.now() - user.lastOtpSent < 60 * 1000) {
      return res.status(429).json({
        message: "You can request another OTP after 60 seconds.",
      });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    user.lastOtpSent = Date.now();
    await user.save();

    await sendEmail({
      to: email,
      subject: "Resend OTP — WeChat",
      html: emailTemplate(
        "Your New OTP",
        `Your new OTP is <strong>${otp}</strong>. It expires in 10 minutes.`
      ),
    });

    return res.json({ message: "New OTP sent to email." });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ======================================================
// VERIFY OTP
// ======================================================
export const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!otp || !userId)
      return res.status(400).json({ message: "OTP and userId required." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Incorrect OTP." });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP has expired." });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ======================================================
// LOGIN USER
// ======================================================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials." });

    if (!user.isVerified)
      return res.status(400).json({ message: "Email not verified." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials." });

    const token = generateJWT({ id: user._id }, "7d");

    return res.json({
      message: "Login successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ======================================================
// GOOGLE LOGIN
// ======================================================
export const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    if (!email || !googleId)
      return res.status(400).json({ message: "Invalid Google data." });

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        isVerified: true,
        password: "GOOGLE",
      });
    }

    const token = generateJWT({ id: user._id }, "7d");

    return res.json({
      message: "Google login successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ======================================================
// FORGOT PASSWORD
// ======================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    await sendEmail({
      to: email,
      subject: "Reset Your Password — WeChat",
      html: emailTemplate(
        "Password Reset Request",
        `Click <a href="${resetUrl}">here</a> to reset your password. Valid for 1 hour.`
      ),
    });

    return res.json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ======================================================
// RESET PASSWORD
// ======================================================
export const resetPassword = async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword)
      return res.status(400).json({ message: "Missing fields." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    if (
      user.resetPasswordToken !== hashedToken ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Token invalid or expired." });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
