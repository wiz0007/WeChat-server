import Chat from "../models/Chat.js";
import User from "../models/User.js";


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
      isVerified: true,
    })
      .select("name username email avatar about isOnline lastSeen")
      .sort({ isOnline: -1, name: 1 });
    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get or create a chat between two users
export const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] },
    })
      .populate("participants", "name username email avatar about isOnline lastSeen")
      .populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({
        participants: [currentUserId, userId],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "name username email avatar about isOnline lastSeen")
        .populate("lastMessage");
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
