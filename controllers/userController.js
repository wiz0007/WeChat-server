import User from "../models/User.js";
import { getRelationshipStatus } from "../services/relationshipService.js";
import { normalizeUsername, serializeUserPreview } from "../utils/social.js";

export const getUserByUsername = async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({
      $or: [{ usernameLower: username }, { username: new RegExp(`^${username}$`, "i") }],
    }).select("name username avatar about headline location profileVisibility privacy isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const relationshipStatus = await getRelationshipStatus(req.user._id, user._id);
    if (relationshipStatus === "blocked") {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user: serializeUserPreview(user, relationshipStatus),
    });
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

export const updatePrivacySettings = async (req, res) => {
  try {
    const allowedVisibility = ["public", "private"];
    const allowedAudience = ["everyone", "connections", "none"];
    const allowedRequestAudience = ["everyone", "none"];
    const allowedChatAudience = ["everyone", "connections", "none"];

    const nextPrivacy = { ...(req.user.privacy?.toObject?.() || req.user.privacy || {}) };

    if (req.body.profileVisibility !== undefined) {
      if (!allowedVisibility.includes(req.body.profileVisibility)) {
        return res.status(400).json({ message: "Invalid profile visibility" });
      }
      req.user.profileVisibility = req.body.profileVisibility;
    }

    for (const key of ["showAvatarTo", "showAboutTo", "showOnlineStatusTo", "showLastSeenTo"]) {
      if (req.body[key] !== undefined) {
        if (!allowedAudience.includes(req.body[key])) {
          return res.status(400).json({ message: `Invalid value for ${key}` });
        }
        nextPrivacy[key] = req.body[key];
      }
    }

    if (req.body.allowConnectionRequestsFrom !== undefined) {
      if (!allowedRequestAudience.includes(req.body.allowConnectionRequestsFrom)) {
        return res.status(400).json({ message: "Invalid connection request setting" });
      }
      nextPrivacy.allowConnectionRequestsFrom = req.body.allowConnectionRequestsFrom;
    }

    if (req.body.allowChatRequestsFrom !== undefined) {
      if (!allowedChatAudience.includes(req.body.allowChatRequestsFrom)) {
        return res.status(400).json({ message: "Invalid chat request setting" });
      }
      nextPrivacy.allowChatRequestsFrom = req.body.allowChatRequestsFrom;
    }

    req.user.privacy = nextPrivacy;
    await req.user.save();

    return res.json({
      message: "Privacy settings updated",
      privacy: req.user.privacy,
      profileVisibility: req.user.profileVisibility,
    });
  } catch (err) {
    console.error("Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};
