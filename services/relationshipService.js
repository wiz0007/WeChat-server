import Block from "../models/Block.js";
import Connection from "../models/Connection.js";
import { buildPairKey } from "../utils/social.js";

export const getRelationshipStatus = async (viewerId, targetId) => {
  if (!viewerId || !targetId) return "none";
  if (String(viewerId) === String(targetId)) return "self";

  const [block, connection] = await Promise.all([
    Block.findOne({
      $or: [
        { blockerId: viewerId, blockedId: targetId },
        { blockerId: targetId, blockedId: viewerId },
      ],
    }),
    Connection.findOne({ pairKey: buildPairKey(viewerId, targetId) }),
  ]);

  if (block) return "blocked";
  if (!connection) return "none";
  if (connection.status === "accepted") return "connected";
  if (connection.status === "pending") {
    return String(connection.requesterId) === String(viewerId)
      ? "connection_request_sent"
      : "connection_request_received";
  }

  return connection.status;
};
