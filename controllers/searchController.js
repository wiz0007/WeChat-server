import User from "../models/User.js";
import { getRelationshipStatus } from "../services/relationshipService.js";
import { normalizeUsername, serializeUserPreview } from "../utils/social.js";

export const searchUsers = async (req, res) => {
  try {
    const query = normalizeUsername(req.query.username || req.query.q || "");
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { usernameLower: { $regex: `^${escapedQuery}` } },
        { username: { $regex: `^${escapedQuery}`, $options: "i" } },
      ],
      isVerified: true,
    })
      .select("name username avatar about headline location profileVisibility privacy isOnline lastSeen")
      .limit(10)
      .sort({ usernameLower: 1 });

    const results = await Promise.all(
      users.map(async (user) => {
        const relationshipStatus = await getRelationshipStatus(req.user._id, user._id);
        if (relationshipStatus === "blocked") return null;
        return serializeUserPreview(user, relationshipStatus);
      })
    );

    return res.json({ users: results.filter(Boolean) });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Failed to search users" });
  }
};
