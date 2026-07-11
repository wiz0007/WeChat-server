import mongoose from "mongoose";

const chatRequestSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, index: true },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messagePreview: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "blocked"],
      default: "pending",
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);
chatRequestSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
chatRequestSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });

const ChatRequest = mongoose.model("ChatRequest", chatRequestSchema);
export default ChatRequest;
