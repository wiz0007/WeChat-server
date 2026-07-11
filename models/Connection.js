import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true, index: true },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "removed"],
      default: "pending",
      index: true,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

connectionSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
connectionSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

const Connection = mongoose.model("Connection", connectionSchema);
export default Connection;
