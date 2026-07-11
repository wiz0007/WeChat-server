import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  usernameLower: { type: String, unique: true, sparse: true, index: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  avatar: { type: String, default: "" },
  about: { type: String, default: "Available on WeChat" },
  headline: { type: String, default: "" },
  location: { type: String, default: "" },
  profileVisibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  privacy: {
    showAvatarTo: {
      type: String,
      enum: ["everyone", "connections", "none"],
      default: "everyone",
    },
    showAboutTo: {
      type: String,
      enum: ["everyone", "connections", "none"],
      default: "everyone",
    },
    showOnlineStatusTo: {
      type: String,
      enum: ["everyone", "connections", "none"],
      default: "connections",
    },
    showLastSeenTo: {
      type: String,
      enum: ["everyone", "connections", "none"],
      default: "connections",
    },
    allowConnectionRequestsFrom: {
      type: String,
      enum: ["everyone", "none"],
      default: "everyone",
    },
    allowChatRequestsFrom: {
      type: String,
      enum: ["everyone", "connections", "none"],
      default: "everyone",
    },
  },

  // For password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  googleId: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre("validate", function (next) {
  if (this.username) {
    this.usernameLower = this.username.trim().toLowerCase();
  }

  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
