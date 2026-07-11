import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: ["spam", "harassment", "impersonation", "inappropriate", "other"],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "dismissed", "actioned"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ reportedUserId: 1, status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
