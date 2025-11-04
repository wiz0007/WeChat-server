import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId }).populate("senderId", "name email avatar").sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const senderId = req.user._id;

    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    const message = await Message.create({
      chatId,
      senderId,
      text,
      fileUrl,
      fileName,
      readBy: [senderId]
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: new Date() });

    const populated = await Message.findById(message._id).populate("senderId", "name email avatar");
    res.json({ success: true, message: populated });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

