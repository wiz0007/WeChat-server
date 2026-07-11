import Chat from "../models/Chat.js";
import ChatRequest from "../models/ChatRequest.js";
import Connection from "../models/Connection.js";
import Block from "../models/Block.js";
import { buildPairKey } from "../utils/social.js";

export const canOpenDirectChat = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (String(currentUserId) === String(targetUserId)) return false;

  const pairKey = buildPairKey(currentUserId, targetUserId);

  const [block, connection, acceptedRequest] = await Promise.all([
    Block.findOne({
      $or: [
        { blockerId: currentUserId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: currentUserId },
      ],
    }).select("_id"),
    Connection.findOne({ pairKey, status: "accepted" }).select("_id"),
    ChatRequest.findOne({ pairKey, status: "accepted" }).select("_id"),
  ]);

  if (block) return false;
  return Boolean(connection || acceptedRequest);
};

export const getAccessibleUserIds = async (currentUserId) => {
  const [connections, chatRequests, blocks] = await Promise.all([
    Connection.find({
      status: "accepted",
      $or: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
    }).select("requesterId recipientId"),
    ChatRequest.find({
      status: "accepted",
      $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
    }).select("fromUserId toUserId"),
    Block.find({
      $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
    }).select("blockerId blockedId"),
  ]);

  const ids = new Set();
  const blockedIds = new Set();

  for (const block of blocks) {
    blockedIds.add(
      String(block.blockerId) === String(currentUserId)
        ? String(block.blockedId)
        : String(block.blockerId)
    );
  }

  for (const connection of connections) {
    ids.add(
      String(connection.requesterId) === String(currentUserId)
        ? String(connection.recipientId)
        : String(connection.requesterId)
    );
  }

  for (const request of chatRequests) {
    ids.add(
      String(request.fromUserId) === String(currentUserId)
        ? String(request.toUserId)
        : String(request.fromUserId)
    );
  }

  return [...ids].filter((id) => !blockedIds.has(id));
};

export const getChatForParticipant = async (chatId, userId) =>
  Chat.findOne({
    _id: chatId,
    participants: userId,
    status: { $ne: "restricted" },
  });
