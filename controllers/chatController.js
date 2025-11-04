import Chat from "../models/Chat.js";
import User from "../models/User.js";


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      "name email avatar"
    );
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

    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] },
    })
      .populate("participants", "name email")
      .populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({
        participants: [currentUserId, userId],
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
