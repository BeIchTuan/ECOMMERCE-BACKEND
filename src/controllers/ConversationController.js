// controllers/conversationController.js
const Conversation = require("../models/ConversationModel");

class ConversationController {
  async createConversation(req, res) {
    try {
      const { members } = req.body;

      // Tạo cuộc hội thoại mới
      const newConversation = new Conversation({ members });
      await newConversation.save();

      return res.status(200).json({
        status: "success",
        conversationId: newConversation._id,
        message: "Conversation created successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to create conversation",
      });
    }
  }

  async getUserConversations(req, res) {
    try {
      const userId = req.id;

      console.log(userId)
      // Tìm tất cả các cuộc hội thoại mà user là thành viên
      const conversations = await Conversation.find({
        members: { $in: [userId] },
      });

      return res.status(200).json({
        status: "success",
        conversations,
        message: "Conversations retrieved successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to retrieve conversations",
      });
    }
  }
}

module.exports = new ConversationController()
